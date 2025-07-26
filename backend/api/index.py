from fastapi import FastAPI, HTTPException, Depends, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from mangum import Mangum
from datetime import datetime, timedelta
import os, base64, hashlib, json
from openai import OpenAI
import jwt
from jwt.exceptions import PyJWTError

# Init
app = FastAPI(title="TerraformCoder AI")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_credentials=True, allow_methods=["*"], allow_headers=["*"])
security = HTTPBearer()
openai_client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
SECRET_KEY = os.getenv("JWT_SECRET_KEY", "dev-secret")
ALGORITHM = "HS256"

mock_users_db, mock_projects_db = {}, {}

def create_token(data: dict, expiry: Optional[timedelta] = None):
    to_encode = data.copy()
    expire = datetime.utcnow() + (expiry or timedelta(minutes=15))
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

def get_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    try:
        token = credentials.credentials
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id = payload.get("sub")
        if user_id not in mock_users_db:
            raise HTTPException(status_code=401, detail="User not found")
        return {"username": mock_users_db[user_id]["name"], "id": user_id}
    except PyJWTError:
        raise HTTPException(status_code=401, detail="Invalid token")

async def call_ai_model(description: str, provider: str = "aws") -> Dict[str, Any]:
    system_prompt = f"You are a Terraform expert. Generate .tf code for {provider}. Include only code and JSON metadata."
    user_message = f"Generate Terraform code for: {description}"
    res = openai_client.chat.completions.create(
        model="gpt-4",
        messages=[{"role": "system", "content": system_prompt}, {"role": "user", "content": user_message}],
        temperature=0.7,
        max_tokens=2048
    )
    content = res.choices[0].message.content.strip()
    code, meta = "", "{}"
    try:
        code = content.split("```terraform")[1].split("```")[0].strip()
        if "```json" in content:
            meta = content.split("```json")[1].split("```")[0].strip()
    except Exception:
        pass
    try:
        metadata = json.loads(meta)
    except:
        metadata = {"explanation": "Missing metadata", "resources": [], "estimated_cost": "Unknown"}
    return {
        "code": code,
        "explanation": metadata.get("explanation", ""),
        "resources": metadata.get("resources", []),
        "estimated_cost": metadata.get("estimated_cost", "")
    }

class GenerateRequest(BaseModel):
    description: str
    provider: str = "aws"

class GenerateResponse(BaseModel):
    code: str
    explanation: str
    resources: List[str]
    estimated_cost: str
    provider: str
    generated_at: str

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

@app.get("/")
async def root(): return {"message": "TerraformCoder AI is healthy"}

@app.post("/api/auth/register", response_model=AuthResponse)
async def register_user(request: RegisterUserRequest):
    for uid, u in mock_users_db.items():
        if u["email"].lower() == request.email.lower():
            raise HTTPException(status_code=409, detail="User already exists")
    user_id = base64.b64encode(request.email.encode()).decode()[:12]
    mock_users_db[user_id] = {
        "id": user_id, "email": request.email, "name": request.name,
        "password_hash": hashlib.sha256(request.password.encode()).hexdigest()
    }
    token = create_token({"sub": user_id, "email": request.email})
    return AuthResponse(message="Registered", user={"id": user_id, "email": request.email, "name": request.name}, access_token=token)

@app.post("/api/auth/login", response_model=AuthResponse)
async def login_user(request: LoginUserRequest):
    user = None
    for uid, data in mock_users_db.items():
        if data["email"].lower() == request.email.lower():
            user = data
            break
    if not user or user["password_hash"] != hashlib.sha256(request.password.encode()).hexdigest():
        raise HTTPException(status_code=401, detail="Invalid credentials")
    token = create_token({"sub": user["id"], "email": user["email"]})
    return AuthResponse(message="Login successful", user=user, access_token=token)

@app.post("/api/generate", response_model=GenerateResponse)
async def generate_code(request: GenerateRequest, current_user: Dict[str, Any] = Depends(get_user)):
    result = await call_ai_model(request.description, request.provider)
    return GenerateResponse(
        code=result["code"], explanation=result["explanation"],
        resources=result["resources"], estimated_cost=result["estimated_cost"],
        provider=request.provider, generated_at=datetime.utcnow().isoformat()
    )

# Required for Vercel
handler = Mangum(app)


# from fastapi import FastAPI, HTTPException, Depends, status
# from fastapi.middleware.cors import CORSMiddleware
# from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
# from pydantic import BaseModel, Field
# from typing import Optional, List, Dict, Any
# from mangum import Mangum
# from datetime import datetime, timedelta
# import hashlib, base64, os, jwt, openai

# # --- Configuration ---
# openai.api_key = os.getenv("OPENAI_API_KEY")
# JWT_SECRET = os.getenv("JWT_SECRET", "super-secret-key")
# JWT_ALGORITHM = "HS256"

# # --- FastAPI App Initialization ---
# app = FastAPI()
# app.add_middleware(
#     CORSMiddleware,
#     allow_origins=["*"],
#     allow_credentials=True,
#     allow_methods=["*"],
#     allow_headers=["*"],
# )

# # --- Security ---
# security = HTTPBearer()

# # --- Mock DBs ---
# mock_users_db = {}
# mock_projects_db = {}

# # --- JWT Helpers ---
# def create_jwt_token(user_id: str, email: str) -> str:
#     payload = {
#         "sub": user_id,
#         "email": email,
#         "exp": datetime.utcnow() + timedelta(days=1)
#     }
#     return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

# def verify_jwt_token(token: str) -> Dict[str, Any]:
#     try:
#         return jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
#     except jwt.ExpiredSignatureError:
#         raise HTTPException(status_code=401, detail="Token expired")
#     except jwt.InvalidTokenError:
#         raise HTTPException(status_code=401, detail="Invalid token")

# def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
#     token = credentials.credentials
#     payload = verify_jwt_token(token)
#     return {"username": payload["email"], "id": payload["sub"]}

# # --- OpenAI AI Terraform Generator ---
# def call_ai_model(description: str, provider: str = "aws") -> str:
#     prompt = f"""You are an expert DevOps engineer.
# Generate Terraform code using provider '{provider}' for the following task: '{description}'.
# Only return the code without any explanation. Include variables, provider, and outputs if relevant."""
#     try:
#         response = openai.chat.completions.create(
#             model="gpt-4",
#             messages=[{"role": "user", "content": prompt}],
#             temperature=0.5,
#             max_tokens=800,
#         )
#         return response.choices[0].message.content.strip()
#     except Exception as e:
#         return f"# Error generating code: {str(e)}"

# # --- Models ---
# class GenerateRequest(BaseModel):
#     description: str
#     provider: str = "aws"

# class GenerateResponse(BaseModel):
#     code: str
#     explanation: str
#     resources: List[str]
#     estimated_cost: str
#     provider: str
#     generated_at: str

# class RegisterUserRequest(BaseModel):
#     email: str
#     name: str
#     password: str

# class LoginUserRequest(BaseModel):
#     email: str
#     password: str

# class AuthResponse(BaseModel):
#     message: str
#     user: Dict[str, str]
#     access_token: str
#     token_type: str = "bearer"

# class ProjectCreateRequest(BaseModel):
#     name: str
#     description: Optional[str] = None
#     terraform_code: str

# class ProjectResponse(BaseModel):
#     id: str
#     name: str
#     description: Optional[str]
#     terraform_code: str
#     created_at: str
#     updated_at: str

# # --- Endpoints ---
# @app.get("/")
# def root(): return {"message": "TerraformCoder AI is live", "status": "healthy"}

# @app.post("/api/auth/register", response_model=AuthResponse)
# def register(request: RegisterUserRequest):
#     if request.email in mock_users_db:
#         raise HTTPException(status_code=409, detail="User already exists")
#     user_id = base64.b64encode(request.email.encode()).decode()[:12]
#     token = create_jwt_token(user_id, request.email)
#     mock_users_db[request.email] = {
#         "id": user_id,
#         "email": request.email,
#         "name": request.name,
#         "password_hash": hashlib.sha256(request.password.encode()).hexdigest()
#     }
#     return AuthResponse(message="Registered", user={"id": user_id, "email": request.email, "name": request.name}, access_token=token)

# @app.post("/api/auth/login", response_model=AuthResponse)
# def login(request: LoginUserRequest):
#     user = mock_users_db.get(request.email)
#     if not user or user["password_hash"] != hashlib.sha256(request.password.encode()).hexdigest():
#         raise HTTPException(status_code=401, detail="Invalid credentials")
#     token = create_jwt_token(user["id"], request.email)
#     return AuthResponse(message="Logged in", user=user, access_token=token)

# @app.post("/api/generate", response_model=GenerateResponse)
# def generate(request: GenerateRequest, current_user: Dict[str, Any] = Depends(get_current_user)):
#     code = call_ai_model(request.description, request.provider)
#     return GenerateResponse(
#         code=code,
#         explanation="Generated using OpenAI",
#         resources=["dynamic"],
#         estimated_cost="Pro-only",
#         provider=request.provider,
#         generated_at=datetime.utcnow().isoformat()
#     )

# @app.post("/api/projects", response_model=ProjectResponse)
# def create_project(request: ProjectCreateRequest, current_user: Dict[str, Any] = Depends(get_current_user)):
#     pid = hashlib.md5((request.name + datetime.utcnow().isoformat()).encode()).hexdigest()[:8]
#     now = datetime.utcnow().isoformat()
#     project = ProjectResponse(id=pid, name=request.name, description=request.description,
#                               terraform_code=request.terraform_code, created_at=now, updated_at=now)
#     mock_projects_db[pid] = project
#     return project

# # --- Vercel handler ---
# handler = Mangum(app)
# def application(scope, receive, send): return handler(scope, receive, send)
# __all__ = ['app', 'handler', 'application']

# # # backend/api/index.py

# # from fastapi import FastAPI, HTTPException, Depends, status, Request
# # from fastapi.middleware.cors import CORSMiddleware
# # from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
# # from pydantic import BaseModel, Field
# # from typing import Optional, List, Dict, Any
# # from mangum import Mangum
# # import os
# # import json
# # from datetime import datetime, timedelta
# # import base64
# # import hashlib

# # # --- OpenAI and JWT Imports ---
# # from openai import OpenAI
# # import jwt
# # from jwt.exceptions import PyJWTError

# # # --- FastAPI App Initialization ---
# # app = FastAPI(
# #     title="TerraformCoder AI API",
# #     description="Generate, validate, and manage Terraform code with AI assistance.",
# #     version="1.0.0"
# # )

# # # --- CORS Configuration ---
# # app.add_middleware(
# #     CORSMiddleware,
# #     allow_origins=["*"], # Adjust this in production to your frontend URL, e.g., "https://terraformcoder-ai.vercel.app"
# #     allow_credentials=True,
# #     allow_methods=["*"],
# #     allow_headers=["*"],
# # )

# # # --- Security Configuration ---
# # security = HTTPBearer()

# # # IMPORTANT: Set this as an environment variable in Vercel for production!
# # # Example: export JWT_SECRET_KEY="your-super-secret-key-that-is-long-and-random"
# # SECRET_KEY = os.getenv("JWT_SECRET_KEY", "your-insecure-dev-secret-key") # Change this for production!
# # ALGORITHM = "HS256"
# # ACCESS_TOKEN_EXPIRE_MINUTES = 60

# # # Mock user data (for demonstration only, not persistent; will be replaced by a database in a real app)
# # mock_users_db = {}
# # mock_projects_db = {}
# # mock_stats = {
# #     "total_generations": 0,
# #     "successful_generations": 0,
# #     "failed_generations": 0,
# #     "top_providers": {"aws": 0, "azure": 0, "gcp": 0},
# #     "popular_templates": {}
# # }

# # # --- OpenAI Client Initialization ---
# # # Ensure OPENAI_API_KEY is set in your Vercel environment variables
# # openai_client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

# # # --- Helper function for JWT creation ---
# # def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
# #     to_encode = data.copy()
# #     if expires_delta:
# #         expire = datetime.utcnow() + expires_delta
# #     else:
# #         expire = datetime.utcnow() + timedelta(minutes=15) # Default expiry
# #     to_encode.update({"exp": expire})
# #     encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
# #     return encoded_jwt

# # # --- Authentication Dependency with PyJWT ---
# # def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
# #     token = credentials.credentials
# #     try:
# #         payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
# #         user_id: str = payload.get("sub") # 'sub' is standard for subject
# #         if user_id is None:
# #             raise HTTPException(
# #                 status_code=status.HTTP_401_UNAUTHORIZED,
# #                 detail="Could not validate credentials",
# #                 headers={"WWW-Authenticate": "Bearer"},
# #             )
# #         # In a real app, you would fetch user data from a DB using user_id
# #         user_data = mock_users_db.get(user_id)
# #         if user_data is None:
# #              raise HTTPException(
# #                 status_code=status.HTTP_401_UNAUTHORIZED,
# #                 detail="User not found",
# #                 headers={"WWW-Authenticate": "Bearer"},
# #             )
# #         return {"username": user_data['name'], "id": user_id, "is_pro": True} # Mimic your old mock user structure
# #     except PyJWTError:
# #         raise HTTPException(
# #             status_code=status.HTTP_401_UNAUTHORIZED,
# #             detail="Invalid authentication credentials",
# #             headers={"WWW-Authenticate": "Bearer"},
# #         )

# # # --- AI Integration (Actual OpenAI Call) ---
# # async def call_ai_model(description: str, provider: str = "aws") -> Dict[str, Any]:
# #     if not openai_client.api_key:
# #         raise HTTPException(
# #             status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
# #             detail="OpenAI API key not configured."
# #         )

# #     system_prompt = f"""You are an expert in Terraform code generation.
# # Generate ONLY the Terraform (.tf) code based on the user's request.
# # Follow these guidelines:
# # 1. Generate complete, valid, and production-ready Terraform code for the requested cloud {provider}.
# # 2. Include necessary providers, resources, variables, and outputs.
# # 3. Add comments to explain complex parts.
# # 4. Avoid any conversational text, explanations, or extraneous information outside of the Terraform code block itself.
# # 5. If the request implies sensitive data (like passwords), use `variable` blocks and mark them `sensitive = true`.
# # 6. For the given description, provide also a concise explanation of the generated code, list the main resources created, and an estimated cost (e.g., "Free Tier Eligible", "Low", "Medium", "High"). This metadata should be provided as a JSON object after the Terraform code, within a markdown code block, so it can be parsed by the application.

# # Example Format:
# # ```terraform
# # # Your Terraform code here
# # resource "aws_vpc" "example" {{ ... }}
# # ```json
# # {{
# #   "explanation": "This code creates an AWS VPC.",
# #   "resources": ["aws_vpc"],
# #   "estimated_cost": "Low"
# # }}
# # ```
# # """
# #     user_message = f"Generate Terraform code for {provider} to {description}."

# #     try:
# #         response = openai_client.chat.completions.create(
# #             model="gpt-4o", # Or "gpt-3.5-turbo", "gpt-4-turbo" depending on your needs and budget
# #             messages=[
# #                 {"role": "system", "content": system_prompt},
# #                 {"role": "user", "content": user_message}
# #             ],
# #             temperature=0.7, # Adjust creativity
# #             max_tokens=2048 # Adjust as needed for code length
# #         )

# #         full_response_content = response.choices[0].message.content.strip()

# #         # Parse the response to separate code and metadata
# #         code_start_tag = "```terraform"
# #         code_end_tag = "```"
# #         json_start_tag = "```json"

# #         code_block = ""
# #         metadata_block = "{}"

# #         parts = full_response_content.split(code_start_tag)
# #         if len(parts) > 1:
# #             code_and_rest = parts[1].split(code_end_tag, 1)
# #             code_block = code_and_rest[0].strip()

# #             if len(code_and_rest) > 1:
# #                 # Check for JSON block
# #                 json_parts = code_and_rest[1].split(json_start_tag, 1)
# #                 if len(json_parts) > 1:
# #                     metadata_and_end = json_parts[1].split(code_end_tag, 1)
# #                     metadata_block = metadata_and_end[0].strip()
# #         else:
# #             # Fallback if AI doesn't use expected format strictly, try to find code/json blocks
# #             if code_start_tag in full_response_content:
# #                  code_block = full_response_content.split(code_start_tag, 1)[1].split(code_end_tag, 1)[0].strip()
# #             if json_start_tag in full_response_content:
# #                 metadata_block = full_response_content.split(json_start_tag, 1)[1].split(code_end_tag, 1)[0].strip()


# #         # Attempt to parse metadata JSON
# #         try:
# #             parsed_metadata = json.loads(metadata_block)
# #             explanation = parsed_metadata.get("explanation", "No explanation provided by AI.")
# #             resources = parsed_metadata.get("resources", [])
# #             estimated_cost = parsed_metadata.get("estimated_cost", "Not estimated by AI.")
# #         except json.JSONDecodeError:
# #             print(f"Warning: Could not decode JSON metadata from AI response: {metadata_block}")
# #             explanation = "Failed to extract explanation from AI."
# #             resources = []
# #             estimated_cost = "Failed to estimate cost."

# #         return {
# #             "code": code_block,
# #             "explanation": explanation,
# #             "resources": resources,
# #             "estimated_cost": estimated_cost
# #         }

# #     except Exception as e:
# #         print(f"Error calling OpenAI API: {e}")
# #         raise HTTPException(
# #             status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
# #             detail=f"Failed to generate Terraform code: {e}"
# #         )

# # # --- Data Models (using Pydantic) ---
# # class GenerateRequest(BaseModel):
# #     description: str = Field(..., example="create a VPC with public and private subnets")
# #     provider: str = Field("aws", example="aws")
# #     context: Optional[str] = None

# # class GenerateResponse(BaseModel):
# #     code: str
# #     explanation: str
# #     resources: List[str]
# #     estimated_cost: str
# #     provider: str
# #     generated_at: str

# # class CodeValidationResult(BaseModel):
# #     valid: bool
# #     issues: List[str]
# #     suggestions: List[str]
# #     security_score: float
# #     best_practices_score: float

# # class RegisterUserRequest(BaseModel):
# #     email: str
# #     name: str
# #     password: str

# # class LoginUserRequest(BaseModel):
# #     email: str
# #     password: str

# # class AuthResponse(BaseModel):
# #     message: str
# #     user: Dict[str, str]
# #     access_token: str
# #     token_type: str = "bearer"

# # class ProjectCreateRequest(BaseModel):
# #     name: str
# #     description: Optional[str] = None
# #     terraform_code: str

# # class ProjectResponse(BaseModel):
# #     id: str
# #     name: str
# #     description: Optional[str] = None
# #     terraform_code: str
# #     created_at: str
# #     updated_at: str

# # # --- Utility Functions ---
# # def validate_terraform_code_logic(code: str) -> CodeValidationResult:
# #     """Validate Terraform code and provide suggestions"""
# #     if not code.strip():
# #         return CodeValidationResult(
# #             valid=False,
# #             issues=['Code is empty'],
# #             suggestions=['Please provide Terraform code to validate'],
# #             security_score=0.0,
# #             best_practices_score=0.0
# #         )

# #     issues = []
# #     suggestions = []
# #     warnings = []

# #     # Basic syntax checks
# #     if 'resource' not in code and 'data' not in code and 'module' not in code:
# #         issues.append('No resources, data sources, or modules defined')

# #     # Security checks
# #     if '0.0.0.0/0' in code:
# #         warnings.append('⚠️ Security Warning: Found open CIDR block (0.0.0.0/0)')
# #         suggestions.append('Consider restricting CIDR blocks to specific IP ranges')

# #     if 'password' in code.lower() and '"' in code:
# #         warnings.append('⚠️ Security Warning: Possible hardcoded password detected')
# #         suggestions.append('Use variables or secret management for sensitive values')

# #     if 'access_key' in code.lower():
# #         warnings.append('⚠️ Security Warning: Possible hardcoded access key detected')
# #         suggestions.append('Use IAM roles instead of hardcoded credentials')

# #     # Best practices
# #     if 'tags' not in code:
# #         suggestions.append('💡 Add tags to resources for better organization and cost tracking')

# #     if 'variable' not in code and len(code) > 200:
# #         suggestions.append('💡 Consider using variables to make configuration more reusable')

# #     if 'output' not in code:
# #         suggestions.append('💡 Add outputs to expose important resource information')

# #     if code.count('resource') > 3 and 'module' not in code:
# #         suggestions.append('💡 Consider organizing resources into modules for better maintainability')

# #     all_issues = issues + warnings

# #     return CodeValidationResult(
# #         valid=len(issues) == 0,
# #         issues=all_issues,
# #         suggestions=suggestions[:5],
# #         security_score=max(0.0, 100 - len(warnings) * 20),
# #         best_practices_score=max(0.0, 100 - len([s for s in suggestions if '💡' in s]) * 15)
# #     )
# # # --- Endpoints ---
# # @app.get("/")
# # async def root():
# #     return {"message": "Welcome to TerraformCoder AI! Access API at /api", "status": "healthy"}

# # @app.get("/api")
# # async def api_root():
# #     """Returns basic API information."""
# #     return {
# #         'message': 'TerraformCoder AI API is working!',
# #         'version': '1.0.0',
# #         'status': 'healthy',
# #         'features': ['terraform_generation', 'templates', 'validation'],
# #         'openai_configured': bool(os.getenv('OPENAI_API_KEY')),
# #         'timestamp': datetime.utcnow().isoformat()
# #     }

# # @app.get("/api/health")
# # async def health_check():
# #     """Performs a health check of the API."""
# #     return {
# #         'status': 'healthy',
# #         'uptime': 'running',
# #         'timestamp': datetime.utcnow().isoformat(),
# #         'version': '1.0.0'
# #     }

# # @app.get("/api/templates")
# # async def get_templates():
# #     """Returns a list of available Terraform templates."""
# #     return {
# #         'templates': [
# #             {
# #                 'id': 'vpc-basic',
# #                 'name': 'VPC with Subnets',
# #                 'description': 'Basic VPC with public and private subnets',
# #                 'category': 'networking',
# #                 'provider': 'aws',
# #                 'complexity': 'beginner'
# #             },
# #             {
# #                 'id': 'ec2-basic',
# #                 'name': 'EC2 Instance',
# #                 'description': 'EC2 instance with security group',
# #                 'category': 'compute',
# #                 'provider': 'aws',
# #                 'complexity': 'beginner'
# #             },
# #             {
# #                 'id': 'rds-mysql',
# #                 'name': 'RDS MySQL Database',
# #                 'description': 'MySQL RDS instance with backup',
# #                 'category': 'database',
# #                 'provider': 'aws',
# #                 'complexity': 'intermediate'
# #             },
# #             {
# #                 'id': 's3-website',
# #                 'name': 'S3 Static Website',
# #                 'description': 'S3 bucket for static website hosting',
# #                 'category': 'storage',
# #                 'provider': 'aws',
# #                 'complexity': 'beginner'
# #             }
# #         ],
# #         'total': 4
# #     }

# # @app.get("/api/validate", response_model=CodeValidationResult)
# # async def validate_code_endpoint(code: str):
# #     """Validates Terraform code for syntax, security, and best practices."""
# #     return validate_terraform_code_logic(code)

# # @app.get("/api/stats")
# # async def get_app_stats():
# #     """Returns application usage statistics (mock data)."""
# #     return {
# #         'total_users': len(mock_users_db),
# #         'total_projects': len(mock_projects_db),
# #         'ai_enabled': bool(os.getenv('OPENAI_API_KEY')),
# #         'popular_templates': ['vpc-basic', 'ec2-basic'],
# #         'timestamp': datetime.utcnow().isoformat()
# #     }

# # @app.post("/api/generate", response_model=GenerateResponse)
# # async def generate_terraform_endpoint(request: GenerateRequest, current_user: Dict[str, Any] = Depends(get_current_user)):
# #     """Generates Terraform code based on natural language description."""
# #     # The call_ai_model now returns a dict with code, explanation, resources, estimated_cost
# #     ai_response = await call_ai_model(request.description, request.provider)

# #     # Update stats (optional)
# #     mock_stats["total_generations"] += 1
# #     if ai_response["code"]:
# #         mock_stats["successful_generations"] += 1
# #         mock_stats["top_providers"][request.provider] = mock_stats["top_providers"].get(request.provider, 0) + 1
# #     else:
# #         mock_stats["failed_generations"] += 1


# #     return GenerateResponse(
# #         code=ai_response["code"],
# #         explanation=ai_response["explanation"],
# #         resources=ai_response["resources"],
# #         estimated_cost=ai_response["estimated_cost"],
# #         provider=request.provider,
# #         generated_at=datetime.utcnow().isoformat()
# #     )

# # @app.post("/api/auth/register", response_model=AuthResponse)
# # async def register_user_endpoint(request: RegisterUserRequest):
# #     """Registers a new user."""
# #     # Check if user already exists by email (case-insensitive for simplicity in mock)
# #     for uid, user_data in mock_users_db.items():
# #         if user_data.get('email', '').lower() == request.email.lower():
# #             raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="User with this email already exists.")

# #     user_id = base64.b64encode(request.email.encode()).decode()[:12] # Simple unique ID for mock
    
# #     # Store user in mock DB (in a real app, this would be a secure database)
# #     mock_users_db[user_id] = { # Store by user_id for easier retrieval from JWT
# #         'id': user_id,
# #         'email': request.email,
# #         'name': request.name,
# #         'password_hash': hashlib.sha256(request.password.encode()).hexdigest(), # Hashed password
# #         'is_pro': True # For mock
# #     }

# #     # Generate JWT
# #     access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
# #     access_token = create_access_token(
# #         data={"sub": user_id, "email": request.email, "is_pro": True},
# #         expires_delta=access_token_expires
# #     )
    
# #     return AuthResponse(
# #         message='User registered successfully',
# #         user={'id': user_id, 'email': request.email, 'name': request.name},
# #         access_token=access_token,
# #         token_type='bearer'
# #     )

# # @app.post("/api/auth/login", response_model=AuthResponse)
# # async def login_user_endpoint(request: LoginUserRequest):
# #     """Logs in a user and returns a JWT token."""
# #     user_id = None
# #     user_data = None
# #     for uid, data in mock_users_db.items():
# #         if data.get('email', '').lower() == request.email.lower():
# #             user_id = uid
# #             user_data = data
# #             break

# #     if not user_data or user_data['password_hash'] != hashlib.sha256(request.password.encode()).hexdigest():
# #         raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials.")
    
# #     # Generate JWT
# #     access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
# #     access_token = create_access_token(
# #         data={"sub": user_id, "email": user_data['email'], "is_pro": user_data['is_pro']},
# #         expires_delta=access_token_expires
# #     )
    
# #     return AuthResponse(
# #         message='Login successful',
# #         user={'id': user_data['id'], 'email': user_data['email'], 'name': user_data['name']},
# #         access_token=access_token,
# #         token_type='bearer'
# #     )

# # @app.post("/api/projects", response_model=ProjectResponse)
# # async def create_project_endpoint(request: ProjectCreateRequest, current_user: Dict[str, Any] = Depends(get_current_user)):
# #     """Creates a project (mock implementation)."""
# #     project_id = hashlib.md5(f"{request.name}{datetime.utcnow()}".encode()).hexdigest()[:8]
# #     project = ProjectResponse(
# #         id=project_id,
# #         name=request.name,
# #         description=request.description,
# #         terraform_code=request.terraform_code,
# #         created_at=datetime.utcnow().isoformat(),
# #         updated_at=datetime.utcnow().isoformat(),
# #     )
# #     mock_projects_db[project_id] = project
# #     return project

# # # Create the handler for Vercel
# # # This is the primary callable that Vercel will look for.
# # handler = Mangum(app)

# # # Removed the 'application' function and '__all__'
# # # to simplify the export and avoid potential conflicts
# # # with Vercel's auto-detection mechanisms.