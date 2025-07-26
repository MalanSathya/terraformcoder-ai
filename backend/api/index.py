# api/index.py

from fastapi import FastAPI, HTTPException, Depends, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from mangum import Mangum
from jose import JWTError, jwt
from datetime import datetime, timedelta
import os
import json
import base64
import hashlib
import openai

# --- Configuration ---
SECRET_KEY = os.getenv("JWT_SECRET_KEY", "Srtm#356")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30

# Initialize OpenAI
openai.api_key = os.getenv("OPENAI_API_KEY")

# --- FastAPI App Initialization ---
app = FastAPI(
    title="TerraformCoder AI API",
    description="Generate, validate, and manage Terraform code with AI assistance.",
    version="1.0.0"
)

# --- CORS Configuration ---
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Configure this more restrictively in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- Security ---
security = HTTPBearer()

# Mock data stores (in production, use a proper database)
mock_users_db = {}
mock_projects_db = {}

# --- Authentication ---
def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=15)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(credentials.credentials, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get("sub")
        if username is None:
            raise credentials_exception
        # In production, you'd fetch user from database
        user_data = mock_users_db.get(username)
        if user_data is None:
            raise credentials_exception
        return user_data
    except JWTError:
        raise credentials_exception

# --- AI Integration ---
async def call_openai_for_terraform(description: str, provider: str = "aws") -> Dict[str, Any]:
    """Generate Terraform code using OpenAI GPT"""
    if not openai.api_key:
        # Fallback to mock implementation if no API key
        return {
            "code": call_ai_model_fallback(description, provider),
            "explanation": f"Generated basic {provider} configuration (using fallback - no OpenAI key configured)",
            "resources": ["basic_configuration"]
        }
    
    try:
        # Create a detailed prompt for OpenAI
        prompt = f"""You are a Terraform expert. Generate clean, production-ready Terraform code for the following requirement:

Description: {description}
Cloud Provider: {provider}

Please generate:
1. Terraform configuration with proper resource definitions
2. Necessary variables with descriptions and defaults
3. Outputs for important resource attributes
4. Proper tags and naming conventions
5. Security best practices

Requirements:
- Use latest Terraform syntax
- Include provider configuration
- Add comprehensive variables
- Include meaningful outputs
- Follow {provider} best practices
- Add security considerations

Respond with only the Terraform code, no explanations outside the code comments."""

        response = openai.ChatCompletion.create(
            model="gpt-3.5-turbo",
            messages=[
                {"role": "system", "content": "You are an expert Terraform engineer who writes clean, secure, and well-documented infrastructure as code."},
                {"role": "user", "content": prompt}
            ],
            max_tokens=2000,
            temperature=0.3
        )
        
        generated_code = response.choices[0].message.content.strip()
        
        # Analyze the generated code to extract resources
        resources = []
        for line in generated_code.split('\n'):
            if line.strip().startswith('resource "'):
                resource_type = line.split('"')[1]
                resources.append(resource_type)
        
        # Generate explanation based on content
        explanation = f"Generated {provider} infrastructure with {len(resources)} resource types using OpenAI GPT-3.5-turbo"
        
        return {
            "code": generated_code,
            "explanation": explanation,
            "resources": list(set(resources))  # Remove duplicates
        }
        
    except Exception as e:
        print(f"OpenAI API error: {str(e)}")
        # Fallback to basic generation
        return {
            "code": call_ai_model_fallback(description, provider),
            "explanation": f"Generated basic {provider} configuration (OpenAI error: {str(e)[:100]}...)",
            "resources": ["fallback_configuration"]
        }

def call_ai_model_fallback(description: str, provider: str = "aws") -> str:
    """Generate Terraform code based on description and provider"""
    description_lower = description.lower()

    if 'vpc' in description_lower or 'network' in description_lower:
        return '''# VPC Configuration
resource "aws_vpc" "main" {
  cidr_block           = var.vpc_cidr
  enable_dns_hostnames = true
  enable_dns_support   = true

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
  ami                    = var.ami_id
  instance_type          = var.instance_type
  key_name              = var.key_name
  vpc_security_group_ids = [aws_security_group.web.id]
  subnet_id             = var.subnet_id

  tags = {
    Name        = var.instance_name
    Environment = var.environment
  }
}

# Variables
variable "ami_id" {
  description = "AMI ID for the instance"
  type        = string
  default     = "ami-0c02fb55956c7d316"
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
  default     = ["0.0.0.0/0"]
}

variable "environment" {
  description = "Environment name"
  type        = string
  default     = "dev"
}

# Outputs
output "instance_id" {
  value = aws_instance.main.id
}

output "public_ip" {
  value = aws_instance.main.public_ip
}'''

    else:
        return f'''# Basic {provider.upper()} Configuration
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
resource "{provider}_example" "main" {{
  # Configuration based on your requirements
  tags = {{
    Environment = var.environment
    Purpose     = "Generated by TerraformCoder AI"
  }}
}}'''

# --- Pydantic Models ---
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

class ProjectResponse(BaseModel):
    id: str
    name: str
    description: Optional[str] = None
    terraform_code: str
    created_at: str
    updated_at: str

# --- Utility Functions ---
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
    
    # Best practices
    if 'tags' not in code:
        suggestions.append('💡 Add tags to resources for better organization')
    
    if 'variable' not in code and len(code) > 200:
        suggestions.append('💡 Consider using variables for reusability')
    
    if 'output' not in code:
        suggestions.append('💡 Add outputs to expose important resource information')
    
    all_issues = issues + warnings
    
    return CodeValidationResult(
        valid=len(issues) == 0,
        issues=all_issues,
        suggestions=suggestions[:5],
        security_score=max(0.0, 100 - len(warnings) * 20),
        best_practices_score=max(0.0, 100 - len([s for s in suggestions if '💡' in s]) * 15)
    )

# --- API Endpoints ---
@app.get("/")
async def root():
    return {
        "message": "Welcome to TerraformCoder AI!",
        "status": "healthy",
        "api_endpoint": "/api"
    }

@app.get("/api")
async def api_root():
    return {
        'message': 'TerraformCoder AI API is working!',
        'version': '1.0.0',
        'status': 'healthy',
        'features': ['terraform_generation', 'templates', 'validation'],
        'openai_configured': bool(openai.api_key),
        'timestamp': datetime.utcnow().isoformat()
    }

@app.get("/api/health")
async def health_check():
    return {
        'status': 'healthy',
        'timestamp': datetime.utcnow().isoformat(),
        'version': '1.0.0'
    }

@app.get("/api/templates")
async def get_templates():
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
            }
        ],
        'total': 3
    }

@app.get("/api/validate")
async def validate_code_endpoint(code: str):
    return validate_terraform_code_logic(code)

@app.get("/api/stats")
async def get_app_stats():
    return {
        'total_users': len(mock_users_db),
        'total_projects': len(mock_projects_db),
        'popular_templates': ['vpc-basic', 'ec2-basic'],
        'timestamp': datetime.utcnow().isoformat()
    }

@app.post("/api/generate")
async def generate_terraform_endpoint(
    request: GenerateRequest,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    try:
        # Use OpenAI for generation
        ai_result = await call_openai_for_terraform(request.description, request.provider)
        
        return GenerateResponse(
            code=ai_result["code"],
            explanation=ai_result["explanation"],
            resources=ai_result["resources"],
            estimated_cost='Cost estimation available in Pro version',
            provider=request.provider,
            generated_at=datetime.utcnow().isoformat()
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Generation failed: {str(e)}")

@app.post("/api/auth/register")
async def register_user_endpoint(request: RegisterUserRequest):
    if request.email in mock_users_db:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="User with this email already exists"
        )
    
    user_id = base64.b64encode(request.email.encode()).decode()[:12]
    password_hash = hashlib.sha256(request.password.encode()).hexdigest()
    
    # Create JWT token
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": request.email}, expires_delta=access_token_expires
    )
    
    # Store user data
    mock_users_db[request.email] = {
        'id': user_id,
        'email': request.email,
        'name': request.name,
        'password_hash': password_hash,
        'created_at': datetime.utcnow().isoformat()
    }
    
    return AuthResponse(
        message='User registered successfully',
        user={'id': user_id, 'email': request.email, 'name': request.name},
        access_token=access_token,
        token_type='bearer'
    )

@app.post("/api/auth/login")
async def login_user_endpoint(request: LoginUserRequest):
    user_data = mock_users_db.get(request.email)
    expected_hash = hashlib.sha256(request.password.encode()).hexdigest()
    
    if not user_data or user_data['password_hash'] != expected_hash:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password"
        )
    
    # Create JWT token
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": request.email}, expires_delta=access_token_expires
    )
    
    return AuthResponse(
        message='Login successful',
        user={'id': user_data['id'], 'email': user_data['email'], 'name': user_data['name']},
        access_token=access_token,
        token_type='bearer'
    )

@app.post("/api/projects")
async def create_project_endpoint(
    request: ProjectCreateRequest,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    project_id = hashlib.md5(f"{request.name}{datetime.utcnow()}".encode()).hexdigest()[:8]
    project = ProjectResponse(
        id=project_id,
        name=request.name,
        description=request.description,
        terraform_code=request.terraform_code,
        created_at=datetime.utcnow().isoformat(),
        updated_at=datetime.utcnow().isoformat(),
    )
    mock_projects_db[project_id] = project
    return project

# --- Vercel Handler ---
# This is the key part for Vercel deployment
handler = Mangum(app)

# Export the handler - this is what Vercel will use
def lambda_handler(event, context):
    return handler(event, context)