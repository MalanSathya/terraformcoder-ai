from fastapi import FastAPI, HTTPException, Depends, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel
from typing import Optional, List
import os
from datetime import datetime, timedelta
import jwt
import openai
import re
import json
from dotenv import load_dotenv
load_dotenv()

app = FastAPI(
    title="TerraformCoder AI API",
    description="AI-powered Terraform code generator",
    version="1.0.0",
    root_path="/api"  # Important for Vercel
)

# CORS - Allow frontend domains
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "https://terraformcoder-ai.vercel.app",  # Update with your domain
        "https://*.vercel.app"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Environment variables
SECRET_KEY = os.getenv("SECRET_KEY", "dev-secret-key")
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")

if not OPENAI_API_KEY:
    raise RuntimeError("OPENAI_API_KEY not set. Set it in Vercel or a .env file")

# Initialize OpenAI
if OPENAI_API_KEY:
    openai.api_key = OPENAI_API_KEY

# Security
security = HTTPBearer()

# Pydantic models
class UserCreate(BaseModel):
    email: str
    password: str
    name: str

class UserLogin(BaseModel):
    email: str
    password: str

class TerraformRequest(BaseModel):
    description: str
    provider: str = "aws"
    additional_requirements: Optional[str] = None

class TerraformResponse(BaseModel):
    code: str
    explanation: str
    resources: List[str]
    estimated_cost: Optional[str] = None

class ProjectCreate(BaseModel):
    name: str
    description: str
    terraform_code: str

class Project(BaseModel):
    id: int
    name: str
    description: str
    terraform_code: str
    created_at: datetime
    updated_at: datetime

# Simple in-memory storage (replace with database for production)
users_db = {}
projects_db = {}
project_counter = 1

# Helper functions
def create_access_token(data: dict):
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(hours=24)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm="HS256")
    return encoded_jwt

def verify_token(credentials: HTTPAuthorizationCredentials = Depends(security)):
    try:
        payload = jwt.decode(credentials.credentials, SECRET_KEY, algorithms=["HS256"])
        email: str = payload.get("sub")
        if email is None:
            raise HTTPException(status_code=401, detail="Invalid authentication")
        return email
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.JWTError:
        raise HTTPException(status_code=401, detail="Invalid authentication")

# AI helper function with better error handling for Vercel
async def generate_terraform_with_ai(description: str, provider: str = "aws") -> dict:
    if not OPENAI_API_KEY:
        return {
            "code": generate_fallback_terraform(description, provider),
            "explanation": "Generated using fallback templates (OpenAI key not configured)",
            "resources": ["fallback_resource"]
        }
    
    try:
        prompt = f"""
        Generate Terraform code for: {description}
        Provider: {provider}
        
        Requirements:
        - Clean, production-ready code
        - Use variables appropriately
        - Follow security best practices
        - Include outputs
        
        Respond in valid JSON format:
        {{
            "code": "terraform code here",
            "explanation": "brief explanation",
            "resources": ["list", "of", "resources"]
        }}
        """
        
        # Using sync client for Vercel compatibility
        client = openai.OpenAI(api_key=OPENAI_API_KEY)
        response = client.chat.completions.create(
            model="gpt-3.5-turbo",
            messages=[
                {"role": "system", "content": "You are a Terraform expert. Generate clean, secure Terraform code. Always respond with valid JSON."},
                {"role": "user", "content": prompt}
            ],
            max_tokens=2000,
            temperature=0.3
        )
        
        content = response.choices[0].message.content.strip()
        
        # Clean up the response to ensure valid JSON
        if content.startswith("```json"):
            content = content.replace("```json", "").replace("```", "").strip()
        elif content.startswith("```"):
            content = content.replace("```", "").strip()
        
        result = json.loads(content)
        return result
        
    except Exception as e:
        return {
            "code": generate_fallback_terraform(description, provider),
            "explanation": f"AI generation failed, using template. Error: {str(e)}",
            "resources": ["template_resource"]
        }

def generate_fallback_terraform(description: str, provider: str) -> str:
    """Fallback terraform generation when AI is not available"""
    if "vpc" in description.lower():
        return '''
# VPC Configuration
resource "aws_vpc" "main" {
  cidr_block           = var.vpc_cidr
  enable_dns_hostnames = true
  enable_dns_support   = true

  tags = {
    Name = var.vpc_name
  }
}

# Variables
variable "vpc_cidr" {
  description = "CIDR block for VPC"
  type        = string
  default     = "10.0.0.0/16"
}

variable "vpc_name" {
  description = "Name for the VPC"
  type        = string
  default     = "main-vpc"
}

# Outputs
output "vpc_id" {
  value = aws_vpc.main.id
}
'''
    elif "ec2" in description.lower() or "instance" in description.lower():
        return '''
# EC2 Instance
resource "aws_instance" "main" {
  ami           = var.ami_id
  instance_type = var.instance_type
  key_name      = var.key_name

  tags = {
    Name = var.instance_name
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
  default     = "main-instance"
}

# Outputs
output "instance_id" {
  value = aws_instance.main.id
}

output "public_ip" {
  value = aws_instance.main.public_ip
}
'''
    else:
        return f'''
# Generated Terraform configuration
# Description: {description}
# Provider: {provider}

# This is a basic template
# Please customize according to your needs

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

# Add your resources here
# resource "{provider}_example" "main" {{
#   # Configuration goes here
# }}
'''

# Routes - All with /api prefix for Vercel
@app.get("/")
async def root():
    return {"message": "TerraformCoder AI API is running on Vercel!", "version": "1.0.0"}

@app.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "openai_configured": bool(OPENAI_API_KEY),
        "timestamp": datetime.utcnow().isoformat()
    }

@app.post("/auth/register")
async def register(user: UserCreate):
    if user.email in users_db:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    # Simple password storage (hash in production!)
    users_db[user.email] = {
        "email": user.email,
        "name": user.name,
        "password": user.password,  # TODO: Hash this properly
        "created_at": datetime.utcnow()
    }
    
    token = create_access_token(data={"sub": user.email})
    return {
        "access_token": token, 
        "token_type": "bearer", 
        "user": {"email": user.email, "name": user.name}
    }

@app.post("/auth/login")
async def login(user: UserLogin):
    if user.email not in users_db or users_db[user.email]["password"] != user.password:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    token = create_access_token(data={"sub": user.email})
    db_user = users_db[user.email]
    return {
        "access_token": token, 
        "token_type": "bearer", 
        "user": {"email": db_user["email"], "name": db_user["name"]}
    }

@app.post("/generate", response_model=TerraformResponse)
async def generate_terraform(request: TerraformRequest, current_user: str = Depends(verify_token)):
    """Generate Terraform code using AI or templates"""
    
    # Generate code
    ai_result = await generate_terraform_with_ai(request.description, request.provider)
    
    return TerraformResponse(
        code=ai_result["code"],
        explanation=ai_result["explanation"],
        resources=ai_result["resources"],
        estimated_cost="Cost estimation available in Pro version"
    )

@app.post("/projects", response_model=Project)
async def create_project(project: ProjectCreate, current_user: str = Depends(verify_token)):
    """Save a Terraform project"""
    global project_counter
    
    new_project = Project(
        id=project_counter,
        name=project.name,
        description=project.description,
        terraform_code=project.terraform_code,
        created_at=datetime.utcnow(),
        updated_at=datetime.utcnow()
    )
    
    if current_user not in projects_db:
        projects_db[current_user] = []
    
    projects_db[current_user].append(new_project.dict())
    project_counter += 1
    
    return new_project

@app.get("/projects", response_model=List[Project])
async def get_projects(current_user: str = Depends(verify_token)):
    """Get user's saved projects"""
    if current_user not in projects_db:
        return []
    
    return [Project(**project) for project in projects_db[current_user]]

@app.get("/validate")
async def validate_terraform(code: str, current_user: str = Depends(verify_token)):
    """Basic Terraform validation"""
    issues = []
    suggestions = []
    
    # Basic checks
    if not code.strip():
        issues.append("Code is empty")
        return {"valid": False, "issues": issues, "suggestions": []}
    
    if "resource" not in code and "data" not in code and "module" not in code:
        issues.append("No resources, data sources, or modules defined")
    
    # Security checks
    if "0.0.0.0/0" in code:
        issues.append("⚠️ Security Warning: Found open CIDR block (0.0.0.0/0)")
        suggestions.append("Consider restricting CIDR blocks to specific IP ranges")
    
    if re.search(r'password\s*=\s*"[^"]*"', code, re.IGNORECASE):
        issues.append("⚠️ Security Warning: Hardcoded password detected")
        suggestions.append("Use variables or AWS Secrets Manager for passwords")
    
    if re.search(r'access_key\s*=\s*"[^"]*"', code, re.IGNORECASE):
        issues.append("⚠️ Security Warning: Hardcoded access key detected")
        suggestions.append("Use AWS IAM roles instead of hardcoded keys")
    
    # Best practice suggestions
    if "tags" not in code:
        suggestions.append("Consider adding tags to your resources for better organization")
    
    if "variable" not in code:
        suggestions.append("Use variables to make your configuration more reusable")
    
    if "output" not in code:
        suggestions.append("Add outputs to expose important resource information")
    
    return {
        "valid": len([issue for issue in issues if not issue.startswith("⚠️")]) == 0,
        "issues": issues,
        "suggestions": suggestions[:3]  # Limit suggestions
    }

@app.get("/templates")
async def get_templates():
    """Get pre-built Terraform templates"""
    templates = [
        {
            "id": "vpc-basic",
            "name": "VPC with Subnets",
            "description": "Basic VPC with public and private subnets",
            "category": "networking",
            "provider": "aws",
            "complexity": "beginner"
        },
        {
            "id": "ec2-basic",
            "name": "EC2 with Security Group",
            "description": "EC2 instance with proper security group configuration",
            "category": "compute",
            "provider": "aws",
            "complexity": "beginner"
        },
        {
            "id": "rds-mysql",
            "name": "RDS MySQL Database",
            "description": "MySQL RDS instance with backup and monitoring",
            "category": "database",
            "provider": "aws",
            "complexity": "intermediate"
        },
        {
            "id": "s3-static-website",
            "name": "S3 Static Website",
            "description": "S3 bucket configured for static website hosting",
            "category": "storage",
            "provider": "aws",
            "complexity": "beginner"
        }
    ]
    return {"templates": templates}

@app.get("/stats")
async def get_stats(current_user: str = Depends(verify_token)):
    """Get user statistics"""
    user_projects = projects_db.get(current_user, [])
    
    return {
        "total_projects": len(user_projects),
        "total_users": len(users_db),
        "ai_enabled": bool(OPENAI_API_KEY),
        "latest_project": user_projects[-1]["name"] if user_projects else None
    }



# from fastapi import FastAPI, HTTPException, Depends, status
# from fastapi.middleware.cors import CORSMiddleware
# from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
# from pydantic import BaseModel
# from typing import Optional, List
# import os
# from datetime import datetime, timedelta
# import jwt
# import openai
# import re
# import json

# app = FastAPI(
#     title="TerraformCoder AI API",
#     description="AI-powered Terraform code generator",
#     version="1.0.0"
# )

# # CORS - Allow your frontend domain
# app.add_middleware(
#     CORSMiddleware,
#     allow_origins=[
#         "http://localhost:3000",
#         "https://your-frontend-domain.vercel.app",  # Update this
#         "https://*.vercel.app"
#     ],
#     allow_credentials=True,
#     allow_methods=["*"],
#     allow_headers=["*"],
# )

# # Environment variables from Vercel
# SECRET_KEY = os.getenv("SECRET_KEY")
# OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")

# # Initialize OpenAI
# openai.api_key = OPENAI_API_KEY

# # Security
# security = HTTPBearer()

# # [Include all your Pydantic models and helper functions here]

# # In-memory storage (will use database later)
# users_db = {}
# projects_db = {}
# project_counter = 1

# # [Include all your route handlers here]

# # Vercel requires this handler
# @app.get("/api")
# async def root():
#     return {"message": "TerraformCoder AI API is running on Vercel!"}

# # Make sure all routes start with /api for Vercel
# # Update all your existing routes to include /api prefix