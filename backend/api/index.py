# backend/api/index.py

from fastapi import FastAPI, HTTPException, Depends, status, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from mangum import Mangum
import os
import json
from datetime import datetime
import base64
import hashlib

# --- FastAPI App Initialization ---
app = FastAPI(
    title="TerraformCoder AI API",
    description="Generate, validate, and manage Terraform code with AI assistance.",
    version="1.0.0"
)

# --- CORS Configuration ---
# IMPORTANT: For production, replace "*" with your frontend's Vercel URL
# e.g., origins=["https://your-frontend-app.vercel.app"]
app.add_middleware(
    CORSMiddleware,
    allow_origins=["https://terraformcoder-ai.vercel.app/"],
    allow_credentials=True,
    allow_methods=["GET", "POST", "OPTIONS"], # Explicitly allow methods
    allow_headers=["*"],
)

# --- Security (Mock/Placeholder) ---
security = HTTPBearer()

# Mock user data (for demonstration only, not persistent)
mock_users_db = {}
mock_projects_db = {} # Stores Project objects
mock_stats = {
    "total_generations": 0,
    "successful_generations": 0,
    "failed_generations": 0,
    "top_providers": {"aws": 0, "azure": 0, "gcp": 0},
    "popular_templates": {}
}

# --- Mock Authentication Dependency ---
def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    # This is a mock implementation. In production, you would validate the JWT token
    # and retrieve user information from a database.
    token = credentials.credentials
    # For now, we'll just return a dummy user if a token exists
    # A more robust mock would check against registered users, but for now, assume valid if token is present
    if token.startswith("mock_token_"):
        user_id = token.replace("mock_token_", "")
        # In a real app, look up user by user_id
        # For this mock, just return some user info
        return {"username": f"user_{user_id}", "id": user_id, "is_pro": True}
    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Invalid authentication credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )

# --- AI Integration (Mock/Placeholder) ---
# This function will mimic your existing generate_terraform logic
def call_ai_model(description: str, provider: str = "aws") -> str:
    # Use the same logic as your BaseHTTPRequestHandler's generate_terraform
    description_lower = description.lower()

    if 'vpc' in description_lower or 'network' in description_lower:
        return '''# VPC Configuration
resource "aws_vpc" "main" {
  cidr_block          = var.vpc_cidr
  enable_dns_hostnames = true
  enable_dns_support  = true

  tags = {
    Name        = var.vpc_name
    Environment = var.environment
  }
}

# Internet Gateway
resource "aws_internet_gateway" "main" {
  vpc_id = aws_vpc.main.id

  tags = {
    Name = "${var.vpc_name}-igw"
  }
}

# Public Subnet
resource "aws_subnet" "public" {
  vpc_id                  = aws_vpc.main.id
  cidr_block              = var.public_subnet_cidr
  availability_zone       = var.availability_zone
  map_public_ip_on_launch = true

  tags = {
    Name = "${var.vpc_name}-public-subnet"
    Type = "Public"
  }
}

# Variables
variable "vpc_cidr" {
  description = "CIDR block for VPC"
  type        = string
  default     = "10.0.0.0/16"
}

variable "public_subnet_cidr" {
  description = "CIDR block for public subnet"
  type        = string
  default     = "10.0.1.0/24"
}

variable "vpc_name" {
  description = "Name for the VPC"
  type        = string
  default     = "main-vpc"
}

variable "environment" {
  description = "Environment name"
  type        = string
  default     = "dev"
}

variable "availability_zone" {
  description = "Availability zone"
  type        = string
  default     = "us-east-1a"
}

# Outputs
output "vpc_id" {
  description = "ID of the VPC"
  value       = aws_vpc.main.id
}

output "public_subnet_id" {
  description = "ID of the public subnet"
  value       = aws_subnet.public.id
}

output "internet_gateway_id" {
  description = "ID of the Internet Gateway"
  value       = aws_internet_gateway.main.id
}'''
    elif 'ec2' in description_lower or 'instance' in description_lower:
        return '''# Security Group
resource "aws_security_group" "web" {
  name_prefix = "${var.instance_name}-sg"
  vpc_id      = var.vpc_id

  ingress {
    from_port   = 22
    to_port     = 22
    protocol    = "tcp"
    cidr_blocks = var.allowed_ssh_cidr
  }

  ingress {
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name = "${var.instance_name}-sg"
  }
}

# EC2 Instance
resource "aws_instance" "main" {
  ami               = var.ami_id
  instance_type     = var.instance_type
  key_name          = var.key_name
  vpc_security_group_ids = [aws_security_group.web.id]
  subnet_id         = var.subnet_id

  tags = {
    Name        = var.instance_name
    Environment = var.environment
  }
}

# Variables
variable "ami_id" {
  description = "AMI ID for the instance"
  type        = string
  default     = "ami-0c02fb55956c7d316"  # Amazon Linux 2
}

variable "instance_type" {
  description = "EC2 instance type"
  type        = string
  default     = "t2.micro"
}

variable "key_name" {
  description = "EC2 Key Pair name"
  type        = string
}

variable "instance_name" {
  description = "Name for the instance"
  type        = string
  default     = "web-server"
}

variable "environment" {
  description = "Environment name"
  type        = string
  default     = "dev"
}

variable "vpc_id" {
  description = "VPC ID"
  type        = string
}

variable "subnet_id" {
  description = "Subnet ID"
  type        = string
}

variable "allowed_ssh_cidr" {
  description = "CIDR blocks allowed for SSH"
  type        = list(string)
  default     = ["0.0.0.0/0"]  # Restrict this in production!
}

# Outputs
output "instance_id" {
  description = "ID of the EC2 instance"
  value       = aws_instance.main.id
}

output "public_ip" {
  description = "Public IP address"
  value       = aws_instance.main.public_ip
}

output "security_group_id" {
  description = "ID of the security group"
  value       = aws_security_group.web.id
}'''
    elif 'rds' in description_lower or 'database' in description_lower:
        return '''# DB Subnet Group
resource "aws_db_subnet_group" "main" {
  name        = "${var.db_name}-subnet-group"
  subnet_ids = var.subnet_ids

  tags = {
    Name = "${var.db_name} DB subnet group"
  }
}

# Security Group for RDS
resource "aws_security_group" "rds" {
  name_prefix = "${var.db_name}-rds-sg"
  vpc_id      = var.vpc_id

  ingress {
    from_port   = 3306
    to_port     = 3306
    protocol    = "tcp"
    cidr_blocks = var.allowed_cidr_blocks
  }

  tags = {
    Name = "${var.db_name}-rds-sg"
  }
}

# RDS Instance
resource "aws_db_instance" "main" {
  identifier      = var.db_name
  engine          = "mysql"
  engine_version = "8.0"
  instance_class = var.db_instance_class
  
  allocated_storage       = var.allocated_storage
  max_allocated_storage = var.max_allocated_storage
  storage_type          = "gp2"
  storage_encrypted     = true

  db_name  = var.database_name
  username = var.db_username
  password = var.db_password

  vpc_security_group_ids = [aws_security_group.rds.id]
  db_subnet_group_name   = aws_db_subnet_group.main.name

  backup_retention_period = var.backup_retention_period
  backup_window           = "03:00-04:00"
  maintenance_window      = "sun:04:00-sun:05:00"

  skip_final_snapshot = true  # Set to false in production
  deletion_protection = false # Set to true in production

  tags = {
    Name        = var.db_name
    Environment = var.environment
  }
}

# Variables
variable "db_name" {
  description = "Database identifier"
  type        = string
  default     = "myapp-db"
}

variable "database_name" {
  description = "Database name"
  type        = string
  default     = "myapp"
}

variable "db_username" {
  description = "Database username"
  type        = string
  default     = "admin"
}

variable "db_password" {
  description = "Database password"
  type        = string
  sensitive   = true
}

variable "db_instance_class" {
  description = "RDS instance class"
  type        = string
  default     = "db.t3.micro"
}

variable "allocated_storage" {
  description = "Allocated storage in GB"
  type        = number
  default     = 20
}

variable "max_allocated_storage" {
  description = "Maximum allocated storage in GB"
  type        = number
  default     = 100
}

variable "backup_retention_period" {
  description = "Backup retention period in days"
  type        = number
  default     = 7
}

variable "vpc_id" {
  description = "VPC ID"
  type        = string
}

variable "subnet_ids" {
  description = "List of subnet IDs"
  type        = list(string)
}

variable "allowed_cidr_blocks" {
  description = "CIDR blocks allowed to access the database"
  type        = list(string)
  default     = ["10.0.0.0/16"]
}

variable "environment" {
  description = "Environment name"
  type        = string
  default     = "dev"
}

# Outputs
output "rds_endpoint" {
  description = "RDS instance endpoint"
  value       = aws_db_instance.main.endpoint
}

output "rds_port" {
  description = "RDS instance port"
  value       = aws_db_instance.main.port
}'''
    else:
        # Default/fallback template
        return f'''# Basic {provider} Configuration
terraform {{
  required_providers {{
    {provider} = {{
      source  = "hashicorp/{provider}"
      version = "~> 5.0"
    }}
  }}
}}

provider "{provider}" {{
  region = var.region
}}

variable "region" {{
  description = "Cloud region"
  type        = string
  default     = "us-east-1"
}}

variable "environment" {{
  description = "Environment name"
  type        = string
  default     = "dev"
}}

# Add your resources here based on: {description}
# Example:
# resource "{provider}_example" "main" {{
#    # Configuration goes here
#    tags = {{
#      Environment = var.environment
#    }}
# }}'''

# --- Data Models (using Pydantic) ---
class GenerateRequest(BaseModel):
    description: str = Field(..., example="create a VPC with public and private subnets")
    provider: str = Field("aws", example="aws")
    context: Optional[str] = None

class GenerateResponse(BaseModel):
    code: str
    explanation: str
    resources: List[str]
    estimated_cost: str
    provider: str
    generated_at: str

class CodeValidationResult(BaseModel):
    valid: bool
    issues: List[str]
    suggestions: List[str]
    security_score: float
    best_practices_score: float

class RegisterUserRequest(BaseModel):
    email: str
    name: str
    password: str

class LoginUserRequest(BaseModel):
    email: str
    password: str

class AuthResponse(BaseModel):
    message: str
    user: Dict[str, str]
    access_token: str
    token_type: str = "bearer"

class ProjectCreateRequest(BaseModel):
    name: str
    description: Optional[str] = None
    terraform_code: str
    # Assuming provider from generate step, can add to model if needed for saving
    # provider: str = "aws" 

class ProjectResponse(BaseModel):
    id: str
    name: str
    description: Optional[str] = None
    terraform_code: str
    created_at: str
    updated_at: str
    # Add user_id if needed for frontend

# --- Utility Functions (FastAPI friendly) ---

def validate_terraform_code_logic(code: str) -> CodeValidationResult:
    """Validate Terraform code and provide suggestions"""
    if not code.strip():
        return CodeValidationResult(
            valid=False,
            issues=['Code is empty'],
            suggestions=['Please provide Terraform code to validate'],
            security_score=0.0,
            best_practices_score=0.0
        )
    
    issues = []
    suggestions = []
    warnings = []
    
    # Basic syntax checks
    if 'resource' not in code and 'data' not in code and 'module' not in code:
        issues.append('No resources, data sources, or modules defined')
    
    # Security checks
    if '0.0.0.0/0' in code:
        warnings.append('⚠️ Security Warning: Found open CIDR block (0.0.0.0/0)')
        suggestions.append('Consider restricting CIDR blocks to specific IP ranges')
    
    if 'password' in code.lower() and '"' in code:
        warnings.append('⚠️ Security Warning: Possible hardcoded password detected')
        suggestions.append('Use variables or secret management for sensitive values')
    
    if 'access_key' in code.lower():
        warnings.append('⚠️ Security Warning: Possible hardcoded access key detected')
        suggestions.append('Use IAM roles instead of hardcoded credentials')
    
    # Best practices
    if 'tags' not in code:
        suggestions.append('💡 Add tags to resources for better organization and cost tracking')
    
    if 'variable' not in code and len(code) > 200:
        suggestions.append('💡 Consider using variables to make configuration more reusable')
    
    if 'output' not in code:
        suggestions.append('💡 Add outputs to expose important resource information')
    
    if code.count('resource') > 3 and 'module' not in code:
        suggestions.append('💡 Consider organizing resources into modules for better maintainability')
    
    # Combine issues and warnings
    all_issues = issues + warnings
    
    return CodeValidationResult(
        valid=len(issues) == 0,  # Only hard issues make it invalid
        issues=all_issues,
        suggestions=suggestions[:5],  # Limit suggestions
        security_score=max(0.0, 100 - len(warnings) * 20),
        best_practices_score=max(0.0, 100 - len([s for s in suggestions if '💡' in s]) * 15)
    )

# --- Endpoints ---

@app.get("/")
async def root():
    return {"message": "Welcome to TerraformCoder AI! Access API at /api", "status": "healthy"}

@app.get("/api")
async def api_root():
    """Returns basic API information."""
    return {
        'message': 'TerraformCoder AI API is working!',
        'version': '1.0.0',
        'status': 'healthy',
        'features': ['terraform_generation', 'templates', 'validation'],
        'openai_configured': bool(os.getenv('OPENAI_API_KEY')),
        'timestamp': datetime.utcnow().isoformat()
    }

@app.get("/api/health")
async def health_check():
    """Performs a health check of the API."""
    return {
        'status': 'healthy',
        'uptime': 'running',
        'timestamp': datetime.utcnow().isoformat(),
        'version': '1.0.0'
    }

@app.get("/api/templates")
async def get_templates():
    """Returns a list of available Terraform templates."""
    return {
        'templates': [
            {
                'id': 'vpc-basic',
                'name': 'VPC with Subnets',
                'description': 'Basic VPC with public and private subnets',
                'category': 'networking',
                'provider': 'aws',
                'complexity': 'beginner'
            },
            {
                'id': 'ec2-basic',
                'name': 'EC2 Instance',
                'description': 'EC2 instance with security group',
                'category': 'compute',
                'provider': 'aws',
                'complexity': 'beginner'
            },
            {
                'id': 'rds-mysql',
                'name': 'RDS MySQL Database',
                'description': 'MySQL RDS instance with backup',
                'category': 'database',
                'provider': 'aws',
                'complexity': 'intermediate'
            },
            {
                'id': 's3-website',
                'name': 'S3 Static Website',
                'description': 'S3 bucket for static website hosting',
                'category': 'storage',
                'provider': 'aws',
                'complexity': 'beginner'
            }
        ],
        'total': 4
    }

@app.get("/api/validate", response_model=CodeValidationResult)
async def validate_code_endpoint(code: str):
    """Validates Terraform code for syntax, security, and best practices."""
    return validate_terraform_code_logic(code)

@app.get("/api/stats")
async def get_app_stats():
    """Returns application usage statistics (mock data)."""
    return {
        'total_users': len(mock_users_db),  # More accurate mock
        'total_projects': len(mock_projects_db),
        'ai_enabled': bool(os.getenv('OPENAI_API_KEY')),
        'popular_templates': ['vpc-basic', 'ec2-basic'], # Simplified for mock
        'timestamp': datetime.utcnow().isoformat()
    }

@app.post("/api/generate", response_model=GenerateResponse)
async def generate_terraform_endpoint(request: GenerateRequest, current_user: Dict[str, Any] = Depends(get_current_user)):
    """Generates Terraform code based on natural language description."""
    generated_code = call_ai_model(request.description, request.provider)
    
    # This part mimics your old generate_terraform's return structure
    explanation = ""
    resources = []
    description_lower = request.description.lower()
    if 'vpc' in description_lower or 'network' in description_lower:
        explanation = "Created a VPC with public subnet, internet gateway, and proper tagging"
        resources = ["aws_vpc", "aws_internet_gateway", "aws_subnet"]
    elif 'ec2' in description_lower or 'instance' in description_lower:
        explanation = "Created EC2 instance with security group, SSH and HTTP access"
        resources = ["aws_instance", "aws_security_group"]
    elif 'rds' in description_lower or 'database' in description_lower:
        explanation = "Created RDS MySQL database with security group, backup configuration, and encryption"
        resources = ["aws_db_instance", "aws_db_subnet_group", "aws_security_group"]
    else:
        explanation = f"Basic {request.provider} provider configuration with common variables"
        resources = ["provider_configuration"]

    return GenerateResponse(
        code=generated_code,
        explanation=explanation,
        resources=resources,
        estimated_cost='Cost estimation available in Pro version', # Mock
        provider=request.provider,
        generated_at=datetime.utcnow().isoformat()
    )


@app.post("/api/auth/register", response_model=AuthResponse)
async def register_user_endpoint(request: RegisterUserRequest):
    """Registers a new user (mock implementation)."""
    if request.email in mock_users_db:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="User with this email already exists.")
    
    user_id = base64.b64encode(request.email.encode()).decode()[:12]
    mock_users_db[request.email] = {
        'id': user_id,
        'email': request.email,
        'name': request.name,
        'password_hash': hashlib.sha256(request.password.encode()).hexdigest(), # Hash password (mock)
        'access_token': f'mock_token_{user_id}' # Store mock token for easy retrieval
    }
    
    return AuthResponse(
        message='User registered successfully',
        user={'id': user_id, 'email': request.email, 'name': request.name},
        access_token=f'mock_token_{user_id}',
        token_type='bearer'
    )

@app.post("/api/auth/login", response_model=AuthResponse)
async def login_user_endpoint(request: LoginUserRequest):
    """Logs in a user and returns a mock token."""
    user_data = mock_users_db.get(request.email)
    if not user_data or user_data['password_hash'] != hashlib.sha256(request.password.encode()).hexdigest():
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials.")
    
    return AuthResponse(
        message='Login successful',
        user={'id': user_data['id'], 'email': user_data['email'], 'name': user_data['name']},
        access_token=user_data['access_token'],
        token_type='bearer'
    )

@app.post("/api/projects", response_model=ProjectResponse)
async def create_project_endpoint(request: ProjectCreateRequest, current_user: Dict[str, Any] = Depends(get_current_user)):
    """Creates a project (mock implementation)."""
    project_id = hashlib.md5(f"{request.name}{datetime.utcnow()}".encode()).hexdigest()[:8]
    project = ProjectResponse(
        id=project_id,
        name=request.name,
        description=request.description,
        terraform_code=request.terraform_code,
        created_at=datetime.utcnow().isoformat(),
        updated_at=datetime.utcnow().isoformat(),
        # user_id is implicit via current_user, but we could add it to the model if needed
    )
    mock_projects_db[project_id] = project
    return project

# CRITICAL: Export handler for Vercel
# This tells Vercel how to run your FastAPI application.
handler = Mangum(app)