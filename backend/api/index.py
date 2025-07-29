# --- JWT Utils ---
from fastapi import FastAPI, HTTPException, Depends, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel, Field
from typing import Optional, Dict, List
from datetime import datetime, timedelta
import hashlib
import base64
import os
import json
import jwt
import httpx
print("HTTPX VERSION:", httpx.__version__)
from jwt.exceptions import PyJWTError
try:
    from mistralai.client import MistralClient
    from mistralai.models import ChatMessage
    use_new_api = True
except ImportError:
    from mistralai import Mistral
    use_new_api = False
#from mistralai import Mistral
# Removed the unused ChatMessage import
from supabase import create_client, Client
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# --- FastAPI App ---
app = FastAPI(title="TerraformCoder AI API")

# --- CORS Middleware ---
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Change this to your frontend URL in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- Security ---
security = HTTPBearer()
SECRET_KEY = os.getenv("JWT_SECRET_KEY", "Srtm#356")  # Replace in prod
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60

# --- Supabase Client ---
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_ANON_KEY")

if not SUPABASE_URL or not SUPABASE_KEY:
    raise ValueError("SUPABASE_URL and SUPABASE_ANON_KEY must be set in environment variables")

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

# Debug: Print the key type (remove in production)
print(f"DEBUG: Using Supabase key starting with: {SUPABASE_KEY[:20]}...")
print(f"DEBUG: Key length: {len(SUPABASE_KEY)}")

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

# Add this to your create_user function to debug
async def create_user(email: str, name: str, password: str):
    """Create a new user in Supabase"""
    try:
        # Hash password
        password_hash = hashlib.sha256(password.encode()).hexdigest()
        
        # Debug: Print what we're trying to insert
        user_data = {
            "email": email.lower(),
            "name": name,
            "password_hash": password_hash
        }
        print(f"DEBUG: Attempting to insert user data: {user_data}")
        
        # Insert user into database
        result = supabase.table("users").insert(user_data).execute()
        
        print(f"DEBUG: Insert result: {result}")
        
        if result.data:
            return result.data[0]
        return None
    except Exception as e:
        print(f"Database error creating user: {e}")
        # Print more detailed error info
        if hasattr(e, 'details'):
            print(f"Error details: {e.details}")
        return None

# --- Mistral AI Client ---
# Ensure you set MISTRAL_API_KEY in your environment variables
#mistral_client = Mistral(api_key=os.getenv("MISTRAL_API_KEY"))
# Update your client initialization:
if use_new_api:
    mistral_client = MistralClient(api_key=os.getenv("MISTRAL_API_KEY"))
else:
    mistral_client = Mistral(api_key=os.getenv("MISTRAL_API_KEY"))
MISTRAL_MODEL = "codestral-latest"  # Using the latest Codestral model

# --- In-memory cache (consider Redis for production) ---
response_cache: Dict[str, Dict] = {}

# --- Pydantic Models ---
class RegisterRequest(BaseModel):
    email: str
    name: str
    password: str

class LoginRequest(BaseModel):
    email: str
    password: str

class AuthResponse(BaseModel):
    message: str
    user: Dict[str, str]
    access_token: str
    token_type: str = "bearer"

class GenerateRequest(BaseModel):
    description: str = Field(..., min_length=10, max_length=1000,
                           description="A detailed description of the Terraform code to generate.")
    provider: str = "aws"

class GenerateResponse(BaseModel):
    code: str
    explanation: str
    resources: List[str]
    estimated_cost: str
    provider: str
    generated_at: str
    cached_response: bool = False  # Minor Feature: Indicate if response was cached
    file_hierarchy: str = ""  # New: Tree-like file structure display

# --- Database Helper Functions ---
async def create_user(email: str, name: str, password: str):
    """Create a new user in Supabase"""
    try:
        # Hash password
        password_hash = hashlib.sha256(password.encode()).hexdigest()
        
        # Insert user into database
        result = supabase.table("users").insert({
            "email": email.lower(),
            "name": name,
            "password_hash": password_hash
        }).execute()
        
        if result.data:
            return result.data[0]
        return None
    except Exception as e:
        print(f"Database error creating user: {e}")
        return None

async def get_user_by_email(email: str):
    """Get user by email from Supabase"""
    try:
        result = supabase.table("users").select("*").eq("email", email.lower()).execute()
        if result.data:
            return result.data[0]
        return None
    except Exception as e:
        print(f"Database error getting user: {e}")
        return None

async def get_user_by_id(user_id: str):
    """Get user by ID from Supabase"""
    try:
        result = supabase.table("users").select("*").eq("id", user_id).execute()
        if result.data:
            return result.data[0]
        return None
    except Exception as e:
        print(f"Database error getting user by ID: {e}")
        return None

async def save_generation(user_id: str, description: str, provider: str, result_data: dict):
    """Save generation history to Supabase"""
    try:
        generation_data = {
            "user_id": user_id,
            "description": description,
            "provider": provider,
            "code": result_data["code"],
            "explanation": result_data["explanation"],
            "resources": result_data["resources"],
            "estimated_cost": result_data["estimated_cost"],
            "file_hierarchy": result_data["file_hierarchy"]
        }
        
        result = supabase.table("generations").insert(generation_data).execute()
        return result.data[0] if result.data else None
    except Exception as e:
        print(f"Database error saving generation: {e}")
        return None

async def get_user_generations(user_id: str, limit: int = 10):
    """Get user's generation history from Supabase"""
    try:
        result = supabase.table("generations").select("*").eq("user_id", user_id).order("created_at", desc=True).limit(limit).execute()
        return result.data if result.data else []
    except Exception as e:
        print(f"Database error getting generations: {e}")
        return []

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    expire = datetime.utcnow() + (expires_delta or timedelta(minutes=15))
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    token = credentials.credentials
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id = payload.get("sub")
        if user_id is None:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token.")
        
        user = await get_user_by_id(user_id)
        if not user:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found.")
        
        return user
    except PyJWTError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid authentication credentials.")

# --- Mistral AI Call ---
async def call_ai_model(description: str, provider: str):
    # Minor Feature: Simple caching based on description and provider
    cache_key = hashlib.sha256(f"{description}-{provider}".encode()).hexdigest()
    if cache_key in response_cache:
        print(f"DEBUG: Serving from cache for key: {cache_key}")
        cached_data = response_cache[cache_key]
        cached_data["cached_response"] = True
        return cached_data
    system_prompt = f"""
You are a highly experienced DevOps and Cloud Infrastructure Engineer specialized in writing production-grade, enterprise level modularity, and cost-efficient Terraform code for the {provider} cloud provider.

Your task is to generate ONLY valid and deployment-ready Terraform code and include ansible playbooks according to the user's infrastructure description.

## Follow these strict rules and conventions:
1. *Terraform Validity*:
   - The code must follow valid Terraform HCL2 syntax for {provider}.
   - Include required provider block(s) and version constraints.

2. *File Structure*:
   - Split code logically into:
     - `main.tf`: core resources and module instantiations
     - `variables.tf`: variable declarations with types and descriptions
     - `outputs.tf`: output blocks for key resource attributes
     - `terraform.tfvars.example`: example values
     - Additional files (`locals.tf`, `providers.tf`, `versions.tf`, `modules/*`) when complexity increases

3. *Resource Naming*:
   - Use **snake_case** and **descriptive naming** for all resources (e.g., `web_vm_linux_b1ms`, `$(var.hostname)_lb_backend_pool`)
   - Follow naming patterns from this reference repo: https://github.com/MalanSathya/ansible_terraform_project
   - Prefer using `local` values for naming prefixes/suffixes where possible.

4. *Tagging and Metadata*:
   - Apply standard tags to all resources:
     - `Name`, `Environment`, `Assignment`, `ExpirationDate`, `Owner`
   - Use `locals` block to define tag values to ensure consistency.

5. *Modular Approach*:
   - When applicable, recommend use of child modules (e.g., for compute, networking, databases).
   - Provide example module usage.
   - Enterprise level modularity
   - Conditionally generate the `module/` and `ansible/` folders only if the user's request warrants them — e.g., asking for automation tasks or reusable Terraform.

6. *Comments and Clarity*:
   - Add meaningful inline comments explaining purpose of each block and resource.
   - Include references to cost optimization (e.g., VM size: B1ms, storage type: LRS) if applicable.

7. *Security and Access*:
   - Ensure NSG/firewall/inbound rules are secure by default.
   - Use variables to parameterize sensitive values (e.g., admin_passwords, access_cidrs).
   - Never hardcode secrets or keys.

8. *Output Formatting*:
   - Include any explanations or markdown **outside** the code blocks.
   - Each block stays in its **own code fence** for parsing and visual clarity.
   - ALWAYS wrap each Terraform file in separate code blocks prefixed with its filename.
   - ALWAYS end the response with a structured JSON block providing metadata.

Return the response in this EXACT format:

```terraform:main.tf
# Main configuration
```

```terraform:variables.tf
# Variable declarations
```

```terraform:outputs.tf
# Output values
```

```terraform:terraform.tfvars.example
# Example values
```

```terraform:locals.tf
# Local variables for naming and tagging
```

Optionally include the following files if the user request demands modular Terraform or Ansible automation:

```terraform:module/
# Terraform child modules organized per resource (e.g., compute, networking, storage)
# Each module folder should contain main.tf, variables.tf, and outputs.tf
```

```terraform:ansible/
# Ansible automation structure:
# - roles/
#     - <role_name>/
#         - tasks/
#         - handlers/
#         - defaults/
#         - vars/
#         - meta/
# - playbooks/
#     - <use_case>.yml
# Follow industry standard directory structure and YAML formatting.
# Align with examples and patterns from this repo: https://github.com/MalanSathya/ansible_terraform_project
```

```json
{{
  "explanation": "This deployment includes modular Terraform and Ansible automation for provisioning and configuration.",
  "resources": [ "azurerm_virtual_network","azurerm_linux_virtual_machine", "ansible_role_install_nginx"],
  "estimated_cost": "Low",
  "file_hierarchy": "terraform-project/\n├── main.tf\n├── variables.tf\n├── outputs.tf\n├── terraform.tfvars.example\n├── locals.tf\n├── module/\n│   ├── compute/\n│   ├── networking/\n└── ansible/\n    ├── roles/\n    │   └── install_nginx/\n    └── playbooks/\n        └── webserver.yml"
}}
```
"""
    user_message = f"Generate Terraform code for {provider} to {description}."

    try:
        if use_new_api:
            # New API approach
            messages = [
                ChatMessage(role="system", content=system_prompt),
                ChatMessage(role="user", content=user_message)
            ]
            
            response = mistral_client.chat(
                model=MISTRAL_MODEL,
                messages=messages,
                temperature=0.7,
                max_tokens=2048
            )
        else:
            # Original API approach - try different methods
            messages = [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_message}
            ]
            
            # Try multiple possible method names
            try:
                response = mistral_client.chat.complete(
                    model=MISTRAL_MODEL,
                    messages=messages,
                    temperature=0.7,
                    max_tokens=2048
                )
            except AttributeError:
                try:
                    response = mistral_client.chat_completion(
                        model=MISTRAL_MODEL,
                        messages=messages,
                        temperature=0.7,
                        max_tokens=2048
                    )
                except AttributeError:
                    # Last resort - direct method call
                    response = mistral_client.completions.create(
                        model=MISTRAL_MODEL,
                        messages=messages,
                        temperature=0.7,
                        max_tokens=2048
                    )
        
        # Process the response
        content = response.choices[0].message.content.strip()

        code = ""
        metadata = {}
        file_hierarchy = ""
        
        # Extract multiple Terraform files with filenames
        import re
        terraform_pattern = r'```terraform:([^\n]+)\n(.*?)```'
        terraform_matches = re.findall(terraform_pattern, content, re.DOTALL)
        
        if terraform_matches:
            # If we have multiple files, combine them for the main code field
            all_code_parts = []
            filenames = []
            for filename, file_content in terraform_matches:
                filename = filename.strip()
                file_content = file_content.strip()
                filenames.append(filename)
                all_code_parts.append(f"# File: {filename}\n{file_content}")
            code = "\n\n# " + "="*50 + "\n\n".join(all_code_parts)
            
            # Generate tree structure from filenames if not provided by AI
            if filenames:
                file_hierarchy = "terraform-project/\n"
                for i, filename in enumerate(filenames):
                    if i == len(filenames) - 1:
                        file_hierarchy += f"└── {filename}"
                    else:
                        file_hierarchy += f"├── {filename}\n"
        else:
            # Fallback to old single-file format
            code_start_tag = "```terraform"
            code_end_tag = "```"
            if code_start_tag in content:
                parts = content.split(code_start_tag, 1)
                if len(parts) > 1:
                    code_block_potential = parts[1]
                    if code_end_tag in code_block_potential:
                        code = code_block_potential.split(code_end_tag, 1)[0].strip()
                        file_hierarchy = "terraform-project/\n└── main.tf"
        
        # Extract JSON metadata
        json_start_tag = "```json"
        if json_start_tag in content:
            parts = content.split(json_start_tag, 1)
            if len(parts) > 1:
                json_block_potential = parts[1]
                code_end_tag = "```"
                if code_end_tag in json_block_potential:
                    json_block = json_block_potential.split(code_end_tag, 1)[0].strip()
                    try:
                        metadata = json.loads(json_block)
                    except json.JSONDecodeError as e:
                        print(f"WARNING: Could not decode JSON from AI response: {e}. Raw JSON block: {json_block}")
                        metadata = {}  # Fallback to empty if JSON is malformed

        result = {
            "code": code,
            "explanation": metadata.get("explanation", "No explanation provided."),
            "resources": metadata.get("resources", []),
            "estimated_cost": metadata.get("estimated_cost", "Unknown"),
            "file_hierarchy": metadata.get("file_hierarchy", file_hierarchy)
        }
        
        response_cache[cache_key] = result.copy()  # Store a copy in cache
        result["cached_response"] = False  # Indicate it's a fresh response
        return result

    except Exception as e:
        # Minor Feature: Log the exact error for debugging
        print(f"ERROR: AI generation failed with Mistral AI: {e}")
        print(f"ERROR TYPE: {type(e)}")
        import traceback
        print(f"TRACEBACK: {traceback.format_exc()}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"AI generation failed: {str(e)}")

# --- Routes ---
@app.get("/")
def root():
    return {"message": "TerraformCoder AI API is running!"}

@app.post("/api/auth/register", response_model=AuthResponse)
async def register(request: RegisterRequest):
    # Check if user already exists
    existing_user = await get_user_by_email(request.email)
    if existing_user:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="User already exists.")

    # Create new user
    user = await create_user(request.email, request.name, request.password)
    if not user:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to create user.")

    # Generate token
    token = create_access_token({"sub": str(user["id"])})

    return AuthResponse(
        message="User registered successfully",
        user={"id": str(user["id"]), "email": user["email"], "name": user["name"]},
        access_token=token
    )

@app.post("/api/auth/login", response_model=AuthResponse)
async def login(request: LoginRequest):
    # Find user and validate password
    user = await get_user_by_email(request.email)
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials.")
    
    # Verify password
    hashed = hashlib.sha256(request.password.encode()).hexdigest()
    if user["password_hash"] != hashed:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials.")
    
    # Generate token
    token = create_access_token({"sub": str(user["id"])})
    
    return AuthResponse(
        message="Login successful",
        user={"id": str(user["id"]), "email": user["email"], "name": user["name"]},
        access_token=token
    )

@app.post("/api/generate", response_model=GenerateResponse)
async def generate(request: GenerateRequest, current_user: Dict = Depends(get_current_user)):
    # Minor Feature: More robust input validation with Pydantic Field
    if not request.description.strip():
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Description cannot be empty.")

    result = await call_ai_model(request.description, request.provider)

    # Save generation to database
    await save_generation(
        user_id=str(current_user["id"]),
        description=request.description,
        provider=request.provider,
        result_data=result
    )

    return GenerateResponse(
        code=result["code"],
        explanation=result["explanation"],
        resources=result["resources"],
        estimated_cost=result["estimated_cost"],
        provider=request.provider,
        generated_at=datetime.utcnow().isoformat(),
        cached_response=result.get("cached_response", False),  # Pass through cache status
        file_hierarchy=result["file_hierarchy"]
    )

# --- Additional Models ---
class GenerationHistory(BaseModel):
    id: str
    description: str
    provider: str
    code: str
    explanation: str
    resources: List[str]
    estimated_cost: str
    file_hierarchy: str
    created_at: str

@app.get("/api/history", response_model=List[GenerationHistory])
async def get_history(current_user: Dict = Depends(get_current_user), limit: int = 10):
    """Get user's generation history"""
    generations = await get_user_generations(str(current_user["id"]), limit)
    return [
        GenerationHistory(
            id=str(gen["id"]),
            description=gen["description"],
            provider=gen["provider"],
            code=gen["code"],
            explanation=gen["explanation"],
            resources=gen["resources"] or [],
            estimated_cost=gen["estimated_cost"],
            file_hierarchy=gen["file_hierarchy"] or "",
            created_at=gen["created_at"]
        )
        for gen in generations
    ]

# --- Health Check ---
@app.get("/health")
def health_check():
    return {"status": "healthy", "timestamp": datetime.utcnow().isoformat()}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)