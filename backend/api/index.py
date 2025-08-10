from fastapi import FastAPI, HTTPException, Depends, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field
from typing import Optional, Dict, List, Any
from datetime import datetime, timedelta
import hashlib
import base64
import os
import json
import jwt
import httpx
import re
from jwt.exceptions import PyJWTError
try:
    from mistralai.client import MistralClient
    from mistralai.models import ChatMessage
    use_new_api = True
except ImportError:
    from mistralai import Mistral
    use_new_api = False
from supabase import create_client, Client
from dotenv import load_dotenv

import uuid

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

# --- Static Files ---
static_files_path = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'static'))
os.makedirs(static_files_path, exist_ok=True)
app.mount("/static", StaticFiles(directory=static_files_path), name="static")

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

# --- Mistral AI Client ---
if use_new_api:
    mistral_client = MistralClient(api_key=os.getenv("MISTRAL_API_KEY"))
else:
    mistral_client = Mistral(api_key=os.getenv("MISTRAL_API_KEY"))
MISTRAL_MODEL = "codestral-latest"

# --- In-memory cache ---
response_cache: Dict[str, Dict] = {}

# --- Enhanced Pydantic Models ---
class FileContent(BaseModel):
    filename: str
    content: str
    explanation: str
    file_type: str  # 'terraform', 'ansible', 'config'
    category: str   # 'infrastructure', 'compute', 'network', 'database', 'automation'

class ArchitectureDiagram(BaseModel):
    diagram_mermaid_syntax: Optional[str] = None
    diagram_description: str = ""
    components: List[str] = []
    connections: List[Dict[str, str]] = []

class MultiCloudCode(BaseModel):
    aws: Optional[str] = None
    azure: Optional[str] = None
    gcp: Optional[str] = None

class GenerateRequest(BaseModel):
    description: str = Field(..., min_length=10, max_length=1000)
    provider: str = "aws"
    include_diagram: bool = True

class GenerateResponse(BaseModel):
    files: List[FileContent] = []
    explanation: str
    resources: List[str]
    estimated_cost: str
    provider: str
    generated_at: str
    cached_response: bool = False
    file_hierarchy: str = ""
    multi_cloud_code: Optional[MultiCloudCode] = None
    file_explanations: Dict[str, str] = {}
    is_valid_request: bool = True
    architecture_diagram: Optional[ArchitectureDiagram] = None

# --- Helper Functions ---
def classify_file_type(filename: str, content: str) -> tuple[str, str]:
    """Classify file type and category using deep learning approach"""
    filename_lower = filename.lower()
    content_lower = content.lower()
    
    # File type classification
    if filename_lower.endswith(('.tf', '.tfvars')):
        file_type = 'terraform'
    elif filename_lower.endswith(('.yml', '.yaml')) or 'ansible' in filename_lower:
        file_type = 'ansible'
    else:
        file_type = 'config'
    
    # Category classification based on content patterns
    if any(keyword in content_lower for keyword in ['azurerm_virtual_machine', 'aws_instance', 'google_compute_instance', 'ec2', 'vm']):
        category = 'compute'
    elif any(keyword in content_lower for keyword in ['azurerm_virtual_network', 'aws_vpc', 'google_compute_network', 'subnet', 'security_group']):
        category = 'network'
    elif any(keyword in content_lower for keyword in ['azurerm_sql_database', 'aws_rds', 'google_sql_database', 'database', 'mysql', 'postgresql']):
        category = 'database'
    elif any(keyword in content_lower for keyword in ['ansible', 'playbook', 'role', 'task']):
        category = 'automation'
    else:
        category = 'infrastructure'
    
    return file_type, category

async def generate_file_explanation(filename: str, content: str, file_type: str, category: str) -> str:
    """Generate detailed explanation for each file using transformer-based summarization"""
    
    explanation_prompt = f"""
You are an expert DevOps engineer. Analyze this {file_type} file and provide a comprehensive explanation.

File: {filename}
Type: {file_type}
Category: {category}

Content:
{content[:1000]}...  # Truncate for token efficiency

Provide a detailed explanation covering:
1. Purpose and role in the infrastructure
2. Key resources and their configurations
3. Dependencies and relationships with other files
4. Security considerations
5. Cost optimization aspects

Keep the explanation concise but comprehensive (2-3 paragraphs).
"""

    try:
        if use_new_api:
            messages = [ChatMessage(role="user", content=explanation_prompt)]
            response = mistral_client.chat(
                model=MISTRAL_MODEL,
                messages=messages,
                temperature=0.3,  # Lower temperature for consistency
                max_tokens=300
            )
        else:
            messages = [{"role": "user", "content": explanation_prompt}]
            response = mistral_client.chat.complete(
                model=MISTRAL_MODEL,
                messages=messages,
                temperature=0.3,
                max_tokens=300
            )
        
        return response.choices[0].message.content.strip()
    except Exception as e:
        print(f"Error generating explanation for {filename}: {e}")
        return f"Configuration file for {category} components. Contains essential infrastructure definitions and settings."

async def generate_architecture_diagram(description: str, resources: List[str], provider: str) -> ArchitectureDiagram:
    """Generate architecture diagram in Mermaid.js syntax"""

    mermaid_syntax = ["graph TD"]

    # Define nodes based on provider and resources
    nodes = {}
    if provider == 'aws':
        nodes['lb'] = 'LB[AWS Load Balancer]'
        nodes['db'] = 'DB[AWS RDS]'
        nodes['compute'] = 'EC2[AWS EC2]'
    elif provider == 'azure':
        nodes['lb'] = 'LB[Azure Load Balancer]'
        nodes['db'] = 'DB[Azure SQL DB]'
        nodes['compute'] = 'VM[Azure VM]'
    elif provider == 'gcp':
        nodes['lb'] = 'LB[GCP Load Balancing]'
        nodes['db'] = 'DB[GCP Cloud SQL]'
        nodes['compute'] = 'GCE[GCP Compute Engine]'
    else: # Default to generic
        nodes['lb'] = 'LB[Load Balancer]'
        nodes['db'] = 'DB[Database]'
        nodes['compute'] = 'Compute[Compute Instance]'

    for key, value in nodes.items():
        mermaid_syntax.append(f"    {value}")

    # Define connections based on resources
    connections = []
    if any(r in str(resources).lower() for r in ['load_balancer', 'lb', 'elb', 'alb']):
        if any(r in str(resources).lower() for r in ['instance', 'vm', 'ec2']):
            mermaid_syntax.append(f"    {list(nodes.values())[0]} --> {list(nodes.values())[2]}") # LB to Compute
            connections.append({"from": "Load Balancer", "to": "Compute Instance", "type": "traffic"})
        if any(r in str(resources).lower() for r in ['database', 'rds', 'sql']):
            mermaid_syntax.append(f"    {list(nodes.values())[2]} --> {list(nodes.values())[1]}") # Compute to DB
            connections.append({"from": "Compute Instance", "to": "Database", "type": "data"})

    diagram_description = "This diagram shows the high-level architecture of the generated infrastructure."

    components = []
    for resource in resources:
        if 'virtual_machine' in resource or 'instance' in resource:
            components.append('Compute Instance')
        elif 'network' in resource or 'vpc' in resource:
            components.append('Virtual Network')
        elif 'database' in resource or 'sql' in resource:
            components.append('Database')
        elif 'load_balancer' in resource:
            components.append('Load Balancer')
        elif 'storage' in resource or 's3' in resource:
            components.append('Storage')
    components = list(set(components))

    return ArchitectureDiagram(
        diagram_mermaid_syntax="\n".join(mermaid_syntax),
        diagram_description=diagram_description,
        components=components,
        connections=connections
    )

def parse_generated_files(content: str) -> List[Dict[str, str]]:
    """Parse generated content into individual files with enhanced detection"""
    
    files = []
    
    # Enhanced regex pattern for file detection
    file_pattern = r'```(?:terraform|yaml|yml|json|sh)?:?([^\n]+)\n(.*?)```'
    matches = re.findall(file_pattern, content, re.DOTALL)
    
    for filename, file_content in matches:
        filename = filename.strip()
        file_content = file_content.strip()
        
        # Skip empty files
        if not file_content:
            continue
            
        # Clean filename
        if filename.startswith('```') or filename.startswith('File:'):
            filename = filename.replace('```', '').replace('File:', '').strip()
        
        files.append({
            'filename': filename,
            'content': file_content
        })
    
    # If no files found, treat entire content as main.tf
    if not files and content.strip():
        files.append({
            'filename': 'main.tf',
            'content': content.strip()
        })
    
    return files

async def process_generated_files(parsed_files: List[Dict[str, str]]) -> List[FileContent]:
    """Process parsed files with AI-generated explanations"""
    
    processed_files = []
    
    for file_data in parsed_files:
        filename = file_data['filename']
        content = file_data['content']
        
        # Classify file
        file_type, category = classify_file_type(filename, content)
        
        # Generate explanation
        explanation = await generate_file_explanation(filename, content, file_type, category)
        
        processed_files.append(FileContent(
            filename=filename,
            content=content,
            explanation=explanation,
            file_type=file_type,
            category=category
        ))
    
    return processed_files

def detect_cloud_provider(description: str) -> List[str]:
    """Detect which cloud providers are mentioned in the description"""
    providers = []
    description_lower = description.lower()
    
    if any(keyword in description_lower for keyword in ['aws', 'amazon', 'ec2', 's3', 'rds', 'lambda']):
        providers.append('aws')
    if any(keyword in description_lower for keyword in ['azure', 'microsoft', 'vm', 'blob', 'cosmos']):
        providers.append('azure')
    if any(keyword in description_lower for keyword in ['gcp', 'google', 'gce', 'cloud storage', 'bigquery']):
        providers.append('gcp')
    
    if not providers:
        providers = ['aws', 'azure', 'gcp']
    
    return providers

def is_valid_infrastructure_request(description: str) -> bool:
    """Check if the description is a valid infrastructure request"""
    infrastructure_keywords = [
        'vm', 'virtual machine', 'ec2', 'instance', 'server', 'compute',
        'vpc', 'network', 'subnet', 'security group', 'firewall',
        'database', 'rds', 'mysql', 'postgresql', 'storage', 's3', 'blob',
        'load balancer', 'alb', 'nlb', 'api gateway', 'lambda', 'function',
        'kubernetes', 'container', 'docker', 'ecs', 'aks', 'gke',
        'terraform', 'infrastructure', 'cloud', 'aws', 'azure', 'gcp',
        'deploy', 'provision', 'create', 'setup', 'configure'
    ]
    
    description_lower = description.lower()
    return any(keyword in description_lower for keyword in infrastructure_keywords)

# --- AI Model Call (Enhanced) ---
async def call_ai_model(description: str, provider: str, include_diagram: bool = True):
    """Enhanced AI model call with dynamic file processing"""
    
    if not is_valid_infrastructure_request(description):
        return {
            "files": [],
            "explanation": "Please provide a clear description of your cloud infrastructure requirements.",
            "resources": [],
            "estimated_cost": "Unknown",
            "file_hierarchy": "",
            "is_valid_request": False,
            "architecture_diagram": None
        }
    
    # Check cache
    cache_key = hashlib.sha256(f"{description}-{provider}".encode()).hexdigest()
    if cache_key in response_cache:
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
   - Use **snake_case** and **descriptive naming** for all resources
   - Follow naming patterns from enterprise standards
   - Prefer using `local` values for naming prefixes/suffixes where possible.

4. *Tagging and Metadata*:
   - Apply standard tags to all resources:
     - `Name`, `Environment`, `Assignment`, `ExpirationDate`, `Owner`
   - Use `locals` block to define tag values to ensure consistency.

5. *Modular Approach*:
   - When applicable, recommend use of child modules
   - Provide example module usage
   - Enterprise level modularity
   - Conditionally generate the `module/` and `ansible/` folders only if the user's request warrants them

6. *Comments and Clarity*:
   - Add meaningful inline comments explaining purpose of each block and resource.
   - Include references to cost optimization if applicable.

7. *Security and Access*:
   - Ensure firewall/security group rules are secure by default.
   - Use variables to parameterize sensitive values.
   - Never hardcode secrets or keys.

8. *Output Formatting*:
   - ALWAYS wrap each file in separate code blocks prefixed with its filename.
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

Optionally include additional files as needed:

```terraform:providers.tf
# Provider configuration
```

```terraform:versions.tf
# Version constraints
```

```ansible:playbook.yml
# Ansible automation
```

```json
{{
  "explanation": "This deployment includes modular Terraform and Ansible automation for provisioning and configuration.",
  "resources": ["azurerm_virtual_network","azurerm_linux_virtual_machine", "ansible_role_install_nginx"],
  "estimated_cost": "Low",
  "file_hierarchy": "Generate a file hierarchy for the generated code, similar to the output of the 'tree' command. Example:\nterraform-project/\n├── main.tf\n├── variables.tf\n├── outputs.tf\n├── terraform.tfvars.example\n├── locals.tf\n├── providers.tf\n├── ansible/\n└── playbook.yml",
  "architecture_diagram_mermaid": "Generate a Mermaid.js diagram for the architecture. Example:\n```mermaid\ngraph TD\n    A[Client] --> B(Load Balancer)\n    B --> C{'Server'}\n    C --> D[Database]\n```
}}
"""

    user_message = f"Generate Terraform code for {provider} to {description}."

    try:
        if use_new_api:
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
            messages = [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_message}
            ]
            response = mistral_client.chat.complete(
                model=MISTRAL_MODEL,
                messages=messages,
                temperature=0.7,
                max_tokens=2048
            )
        
        content = response.choices[0].message.content.strip()
        
        # Parse files
        parsed_files = parse_generated_files(content)
        
        # Process files with AI explanations
        processed_files = await process_generated_files(parsed_files)
        
        # Extract metadata
        metadata = {}
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
                        print(f"WARNING: Could not decode JSON: {e}")
                        metadata = {}
        
        # Generate architecture diagram if requested
        architecture_diagram = None
        if include_diagram and processed_files:
            resources = metadata.get("resources", [])
            architecture_diagram = await generate_architecture_diagram(description, resources, provider)
        
        result = {
            "files": processed_files,
            "explanation": metadata.get("explanation", "Infrastructure code generated successfully."),
            "resources": metadata.get("resources", []),
            "estimated_cost": metadata.get("estimated_cost", "Unknown"),
            "file_hierarchy": metadata.get("file_hierarchy", ""),
            "is_valid_request": True,
            "architecture_diagram": ArchitectureDiagram(diagram_mermaid_syntax=metadata.get("architecture_diagram_mermaid", ""), diagram_description=architecture_diagram.diagram_description if architecture_diagram else "")
        }
        
        response_cache[cache_key] = result.copy()
        result["cached_response"] = False
        return result

    except Exception as e:
        print(f"ERROR: AI generation failed: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, 
                          detail=f"AI generation failed: {str(e)}")

# --- Database Helper Functions (keeping existing ones) ---
async def create_user(email: str, name: str, password: str):
    """Create a new user in Supabase"""
    try:
        password_hash = hashlib.sha256(password.encode()).hexdigest()
        user_data = {
            "email": email.lower(),
            "name": name,
            "password_hash": password_hash
        }
        result = supabase.table("users").insert(user_data).execute()
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

# --- Routes ---
@app.get("/")
def root():
    return {"message": "TerraformCoder AI API is running with enhanced features!"}

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

@app.post("/api/auth/register", response_model=AuthResponse)
async def register(request: RegisterRequest):
    existing_user = await get_user_by_email(request.email)
    if existing_user:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="User already exists.")

    user = await create_user(request.email, request.name, request.password)
    if not user:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to create user.")

    token = create_access_token({"sub": str(user["id"])})

    return AuthResponse(
        message="User registered successfully",
        user={"id": str(user["id"]), "email": user["email"], "name": user["name"]},
        access_token=token
    )

@app.post("/api/auth/login", response_model=AuthResponse)
async def login(request: LoginRequest):
    user = await get_user_by_email(request.email)
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials.")
    
    hashed = hashlib.sha256(request.password.encode()).hexdigest()
    if user["password_hash"] != hashed:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials.")
    
    token = create_access_token({"sub": str(user["id"])})
    
    return AuthResponse(
        message="Login successful",
        user={"id": str(user["id"]), "email": user["email"], "name": user["name"]},
        access_token=token
    )

@app.post("/api/generate", response_model=GenerateResponse)
async def generate(request: GenerateRequest, current_user: Dict = Depends(get_current_user)):
    if not request.description.strip():
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Description cannot be empty.")

    if not is_valid_infrastructure_request(request.description):
        return GenerateResponse(
            files=[],
            explanation="⚠️ Please provide a clear description of your cloud infrastructure requirements.",
            resources=[],
            estimated_cost="Unknown",
            provider=request.provider,
            generated_at=datetime.utcnow().isoformat(),
            cached_response=False,
            file_hierarchy="",
            is_valid_request=False
        )

    result = await call_ai_model(request.description, request.provider, request.include_diagram)
    
    return GenerateResponse(
        files=result["files"],
        explanation=result["explanation"],
        resources=result["resources"],
        estimated_cost=result["estimated_cost"],
        provider=request.provider,
        generated_at=datetime.utcnow().isoformat(),
        cached_response=result.get("cached_response", False),
        file_hierarchy=result["file_hierarchy"],
        is_valid_request=result.get("is_valid_request", True),
        architecture_diagram=result.get("architecture_diagram")
    )

@app.get("/health")
def health_check():
    return {"status": "healthy", "timestamp": datetime.utcnow().isoformat()}


class GenerationHistory(BaseModel):
    id: str
    description: str
    provider: str
    created_at: str


@app.get("/api/history", response_model=List[GenerationHistory])
async def get_history(current_user: Dict = Depends(get_current_user)):
    # This is a placeholder endpoint.
    # In a real application, you would fetch the history from the database.
    return []


@app.post("/api/generate-diagram")
async def generate_diagram(request: GenerateRequest, current_user: Dict = Depends(get_current_user)):
    # This is a placeholder endpoint.
    # In a real application, you would generate a diagram based on the request.
    return {"message": "Diagram generation is not implemented yet."}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
