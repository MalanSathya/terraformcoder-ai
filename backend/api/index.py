from fastapi import FastAPI, HTTPException, Depends, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from mangum import Mangum # Import Mangum
import os
import json # For mock AI responses and data handling

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
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- Security (Mock/Placeholder) ---
# In a real app, integrate with a proper auth provider (e.g., Auth0, Cognito, or a robust JWT library)
security = HTTPBearer()

def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    # This is a mock implementation. In production, you would validate the JWT token
    # and retrieve user information from a database.
    token = credentials.credentials
    # For now, we'll just return a dummy user if a token is provided
    if token == "mock_token": # A simple mock token for testing
        return {"username": "testuser", "id": "123", "is_pro": True}
    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Invalid authentication credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )

# --- AI Integration (Mock/Placeholder) ---
# Replace with actual OpenAI or other LLM integration
# For now, it will return hardcoded responses for demonstration
def call_ai_model(prompt: str) -> str:
    openai_api_key = os.getenv("OPENAI_API_KEY")
    if openai_api_key:
        # Placeholder for actual OpenAI integration
        # from openai import OpenAI
        # client = OpenAI(api_key=openai_api_key)
        # try:
        #     response = client.chat.completions.create(
        #         model="gpt-3.5-turbo",
        #         messages=[{"role": "user", "content": prompt}]
        #     )
        #     return response.choices[0].message.content
        # except Exception as e:
        #     print(f"OpenAI API error: {e}")
        #     return f"Error calling AI: {e}. Using fallback."
        return generate_mock_terraform(prompt) # Use mock even if key exists, for simplicity now
    else:
        return generate_mock_terraform(prompt)

def generate_mock_terraform(description: str) -> str:
    description_lower = description.lower()
    if "vpc with subnets" in description_lower:
        return """resource "aws_vpc" "main" {
  cidr_block = "10.0.0.0/16"
  tags = {
    Name = "terraformcoder-ai-vpc"
  }
}

resource "aws_subnet" "public" {
  vpc_id     = aws_vpc.main.id
  cidr_block = "10.0.1.0/24"
  availability_zone = "us-east-1a" # Example AZ, customize as needed
  map_public_ip_on_launch = true
  tags = {
    Name = "terraformcoder-ai-public-subnet"
  }
}

resource "aws_subnet" "private" {
  vpc_id     = aws_vpc.main.id
  cidr_block = "10.0.2.0/24"
  availability_zone = "us-east-1b" # Example AZ, customize as needed
  tags = {
    Name = "terraformcoder-ai-private-subnet"
  }
}"""
    elif "ec2 instance" in description_lower or "web server" in description_lower:
        return """resource "aws_instance" "web" {
  ami           = "ami-0abcdef1234567890" # Replace with a valid AMI for your region
  instance_type = "t2.micro"
  key_name      = "my-key-pair" # Replace with your SSH key pair name
  tags = {
    Name = "terraformcoder-ai-web-server"
  }
}"""
    elif "s3 bucket" in description_lower or "storage" in description_lower:
        return """resource "aws_s3_bucket" "my_bucket" {
  bucket = "terraformcoder-ai-my-unique-bucket-name" # Must be globally unique
  acl    = "private"

  tags = {
    Name        = "My Terraform AI Bucket"
    Environment = "Dev"
  }
}"""
    else:
        return f"""# Terraform code for: {description}
# No specific template found for this description.
# Please refine your request or provide more details.

# Example placeholder:
resource "null_resource" "placeholder" {{
  triggers = {{
    "description" = "{description}"
  }}
}}"""

# --- Data Models ---
class GenerateRequest(BaseModel):
    description: str
    provider: str = "aws"
    context: Optional[str] = None

class CodeValidationResult(BaseModel):
    is_valid: bool
    warnings: List[str]
    errors: List[str]
    suggestions: List[str]
    security_score: float

class Project(BaseModel):
    id: str
    name: str
    terraform_code: str
    description: str
    provider: str
    created_at: str
    updated_at: str
    user_id: str # To link to a user

# --- Mock Data Storage (Replace with a real database like PostgreSQL in production) ---
mock_users_db = {} # username -> user_data
mock_projects_db: Dict[str, Project] = {} # project_id -> Project data
mock_stats = {
    "total_generations": 0,
    "successful_generations": 0,
    "failed_generations": 0,
    "top_providers": {"aws": 0, "azure": 0, "gcp": 0},
    "popular_templates": {}
}

# --- Utility Functions ---
def validate_terraform_code(code: str) -> CodeValidationResult:
    warnings = []
    errors = []
    suggestions = []
    security_score = 100.0 # Start with perfect score

    # Basic syntax check (very rudimentary, real validation would use `terraform validate`)
    if "resource \"" not in code or "{" not in code or "}" not in code:
        errors.append("Basic Terraform syntax might be incorrect. Missing 'resource', '{', or '}'.")
        security_score -= 10

    # Security checks
    if "0.0.0.0/0" in code and "security_group" in code.lower():
        warnings.append("Security group allows all inbound traffic (0.0.0.0/0). Consider restricting CIDR blocks.")
        security_score -= 20
    if "acl = \"public-read\"" in code and "s3_bucket" in code.lower():
        warnings.append("S3 bucket has public-read ACL. Ensure this is intentional and secured appropriately.")
        security_score -= 15
    if "password =" in code.lower() and "rds" in code.lower():
        warnings.append("Hardcoded database password found. Use secrets management (e.g., AWS Secrets Manager, Vault).")
        security_score -= 25

    # Best practices
    if "ami-" in code and not any(kw in code.lower() for kw in ["data \"aws_ami\"", "source_ami_filter"]):
        suggestions.append("Consider using data sources to dynamically fetch AMIs instead of hardcoding.")
        security_score -= 5
    if "tags" not in code:
        suggestions.append("Consider adding tags to your resources for better organization and cost tracking.")
        security_score -= 5

    if not warnings and not errors:
        is_valid = True
    else:
        is_valid = False

    return CodeValidationResult(
        is_valid=is_valid,
        warnings=warnings,
        errors=errors,
        suggestions=suggestions,
        security_score=max(0.0, security_score) # Score cannot go below 0
    )

# --- Endpoints ---

@app.get("/")
async def root():
    return {"message": "Welcome to TerraformCoder AI! Access API at /api", "status": "healthy"}

@app.get("/api")
async def api_root():
    return {"message": "TerraformCoder AI API is working!", "version": "1.0.0", "status": "healthy", "path": "/api"}

@app.post("/api/generate", response_model=Dict[str, str])
async def generate_terraform(request: GenerateRequest, user: Dict[str, Any] = Depends(get_current_user)):
    """
    Generates Terraform code based on natural language description.
    """
    print(f"User '{user.get('username')}' requested: {request.description} for {request.provider}")
    mock_stats["total_generations"] += 1
    mock_stats["top_providers"][request.provider] = mock_stats["top_providers"].get(request.provider, 0) + 1

    prompt = f"Generate Terraform code for {request.description} using {request.provider}. Context: {request.context or 'None'}."
    generated_code = call_ai_model(prompt)

    if generated_code:
        mock_stats["successful_generations"] += 1
        return {"terraform_code": generated_code}
    else:
        mock_stats["failed_generations"] += 1
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to generate Terraform code."
        )

@app.get("/api/templates", response_model=List[Dict[str, str]])
async def get_templates():
    """
    Returns a list of available Terraform templates.
    """
    templates = [
        {"name": "AWS VPC with Public/Private Subnets", "description": "Creates a standard AWS VPC with public and private subnets, internet gateway, and route tables.", "provider": "aws"},
        {"name": "AWS EC2 Web Server", "description": "Deploys a basic EC2 instance configured as a web server with a security group.", "provider": "aws"},
        {"name": "AWS S3 Private Bucket", "description": "Sets up a private S3 bucket for secure storage.", "provider": "aws"},
        {"name": "Azure Resource Group & Virtual Network", "description": "Creates an Azure Resource Group and a Virtual Network.", "provider": "azure"},
        {"name": "GCP Compute Engine Instance", "description": "Deploys a basic GCP Compute Engine VM instance.", "provider": "gcp"},
    ]
    for template in templates:
        mock_stats["popular_templates"][template["name"]] = mock_stats["popular_templates"].get(template["name"], 0) + 0.1 # Simulate popularity
    return templates

@app.get("/api/validate", response_model=CodeValidationResult)
async def validate_code(code: str):
    """
    Validates Terraform code for syntax, security, and best practices.
    """
    return validate_terraform_code(code)

@app.post("/api/projects", response_model=Project)
async def create_project(project: Project, user: Dict[str, Any] = Depends(get_current_user)):
    """
    Saves a generated Terraform project.
    """
    project.id = f"proj_{len(mock_projects_db) + 1}" # Simple ID generation
    project.created_at = datetime.now().isoformat()
    project.updated_at = datetime.now().isoformat()
    project.user_id = user["id"] # Link to the authenticated user
    mock_projects_db[project.id] = project
    return project

@app.get("/api/projects/{project_id}", response_model=Project)
async def get_project(project_id: str, user: Dict[str, Any] = Depends(get_current_user)):
    """
    Retrieves a saved Terraform project by ID.
    """
    project = mock_projects_db.get(project_id)
    if not project or project.user_id != user["id"]: # Ensure user owns project
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found or unauthorized.")
    return project

@app.get("/api/projects", response_model=List[Project])
async def list_projects(user: Dict[str, Any] = Depends(get_current_user)):
    """
    Lists all projects for the authenticated user.
    """
    user_projects = [p for p in mock_projects_db.values() if p.user_id == user["id"]]
    return user_projects

@app.post("/api/register")
async def register_user(user_data: Dict[str, str]):
    """
    Registers a new user (mock implementation).
    """
    username = user_data.get("username")
    password = user_data.get("password")
    if not username or not password:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Username and password are required.")
    if username in mock_users_db:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Username already exists.")
    mock_users_db[username] = {"username": username, "password": password, "id": f"user_{len(mock_users_db) + 1}"}
    return {"message": "User registered successfully", "user_id": mock_users_db[username]["id"]}

@app.post("/api/login")
async def login_user(user_data: Dict[str, str]):
    """
    Logs in a user and returns a mock token.
    """
    username = user_data.get("username")
    password = user_data.get("password")
    user = mock_users_db.get(username)
    if not user or user["password"] != password:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials.")
    # In a real app, generate a proper JWT
    return {"message": "Login successful", "token": "mock_token", "user_id": user["id"]}

@app.get("/api/stats")
async def get_app_stats(user: Dict[str, Any] = Depends(get_current_user)): # Example of protected route
    """
    Returns application usage statistics (mock data).
    """
    # For a real app, tailor stats based on user's role/permissions
    return mock_stats

# CRITICAL: Export handler for Vercel
# This tells Vercel how to run your FastAPI application.
handler = Mangum(app)