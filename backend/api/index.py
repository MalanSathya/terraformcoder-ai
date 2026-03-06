from fastapi import FastAPI, HTTPException, Depends, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.staticfiles import StaticFiles
from fastapi import Body
from fastapi.responses import Response, StreamingResponse
from pydantic import BaseModel, Field
from typing import Optional, Dict, List, Any
from datetime import datetime, timedelta
import hashlib
import base64
import os
import json
import re
import jwt
import zipfile
import io
import stripe
from jwt.exceptions import PyJWTError

stripe.api_key = os.getenv("STRIPE_API_KEY")
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
    allow_origins=["https://terraformcoder-ai.vercel.app", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

from starlette.requests import Request
from fastapi.responses import JSONResponse
import traceback

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    tb = traceback.format_exc()
    print(f"GLOBAL ERROR: {tb}")
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal Server Error", "error": str(exc), "traceback": tb}
    )




# --- Security ---
security = HTTPBearer()
SECRET_KEY = os.getenv("JWT_SECRET_KEY")  # Replace in prod
if not SECRET_KEY:
    raise ValueError("JWT_SECRET_KEY must be set in environment variables for token generation.")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60

# --- Supabase Client ---
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_ANON_KEY")
# Check for the user-provided key name first, then fall back to the previous name.
SUPABASE_SERVICE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY") or os.getenv("SUPABASE_SERVICE_KEY")

try:
    if not SUPABASE_URL or not SUPABASE_KEY:
        raise ValueError("SUPABASE_URL and SUPABASE_ANON_KEY must be set in environment variables")
    
    # Use service key for backend operations to bypass RLS for user creation
    if SUPABASE_SERVICE_KEY:
        print("Initializing Supabase client with service key.")
        supabase: Client = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)
    else:
        print("Initializing Supabase client with anon key.")
        supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)
except Exception as e:
    print(f"Error connecting to Supabase: {e}")
    supabase = None

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
    mermaid_chart_url: Optional[str] = None  # New field for mermaidchart.com URL

class MultiCloudCode(BaseModel):
    aws: Optional[str] = None
    azure: Optional[str] = None
    gcp: Optional[str] = None

class GenerateRequest(BaseModel):
    description: str = Field(..., min_length=10, max_length=1000)
    provider: str = "aws"
    include_diagram: bool = True

class GenerateResponse(BaseModel):
    id: Optional[str] = None
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

async def generate_file_hierarchy(files: List[FileContent]) -> str:
    """Generate a tree-like file hierarchy from the generated files"""
    if not files:
        return "No files generated"

    tree = {}
    for file in files:
        parts = file.filename.split('/')
        current_level = tree
        for part in parts:
            if part not in current_level:
                current_level[part] = {}
            current_level = current_level[part]

    def build_tree_lines(tree, prefix=""):
        lines = []
        entries = list(tree.keys())
        for i, entry in enumerate(entries):
            connector = "├── " if i < len(entries) - 1 else "└── "
            lines.append(f"{prefix}{connector}{entry}")
            if tree[entry]:
                new_prefix = "│   " if i < len(entries) - 1 else "    "
                lines.extend(build_tree_lines(tree[entry], prefix + new_prefix))
        return lines

    tree_lines = ["terraform-infrastructure/"]
    tree_lines.extend(build_tree_lines(tree))
    return "\n".join(tree_lines)

async def generate_file_explanation(filename: str, content: str, file_type: str, category: str) -> str:
    """Generate detailed explanation for each file using transformer-based summarization"""
    
    explanation_prompt = f"""
You are an expert DevOps engineer. Analyze this {file_type} file and provide a thorough, project-specific explanation.

File: {filename}
Type: {file_type}
Category: {category}

Content:
{content[:2000]}

Provide a detailed, project-specific explanation covering:
1. Purpose and role in the infrastructure — explain exactly what this file provisions and why it exists in this project
2. Key resources and their configurations — reference specific resource names, variable names, and configuration values from the code
3. Dependencies and relationships with other files — how this file connects to other modules, variables, and outputs
4. Security considerations — explain any security groups, IAM roles, encryption settings, or access controls defined here
5. Cost optimization aspects — identify any cost-related decisions like instance sizing, storage tiers, or reserved capacity
6. Best practices applied — mention any Terraform best practices like tagging, naming conventions, or modular design used here
7. How this file integrates with the overall deployment pipeline

Provide a thorough, project-specific explanation (4-5 paragraphs). Reference specific resource names, variable names, and configuration values from the code. Explain WHY each design decision was made, not just WHAT the code does.
"""

    try:
        if use_new_api:
            messages = [ChatMessage(role="user", content=explanation_prompt)]
            response = mistral_client.chat(
                model=MISTRAL_MODEL,
                messages=messages,
                temperature=0.3,
                max_tokens=800
            )
        else:
            messages = [{"role": "user", "content": explanation_prompt}]
            response = mistral_client.chat.complete(
                model=MISTRAL_MODEL,
                messages=messages,
                temperature=0.3,
                max_tokens=800
            )
        
        return response.choices[0].message.content.strip()
    except Exception as e:
        print(f"Error generating explanation for {filename}: {e}")
        return f"Configuration file for {category} components. Contains essential infrastructure definitions and settings."

#async def create_mermaid_chart(mermaid_syntax: str) -> Optional[str]:
    """Create a mermaidchart.com URL for the given Mermaid syntax"""
    try:
        # Prepare the data for mermaidchart.com
        chart_data = {
            "code": mermaid_syntax,
            "mermaid": {
                "theme": "light"
            },
            "autoSync": True,
            "updateEditor": False
        }
        
        # Create a shareable URL using mermaidchart.com API
        # Note: This is a simplified approach. In production, you might want to use their official API
        encoded_data = base64.urlsafe_b64encode(json.dumps(chart_data).encode()).decode()
        mermaid_url = f"https://mermaid.live/edit#{encoded_data}"
        
        return mermaid_url
    except Exception as e:
        print(f"Error creating mermaid chart URL: {e}")
        return None

async def generate_architecture_diagram(description: str, resources: List[str], provider: str) -> ArchitectureDiagram:
    """Generate architecture diagram in Mermaid.js syntax with enhanced AI generation"""

    # Use AI to generate a more sophisticated Mermaid diagram
    diagram_prompt = f"""
Generate a detailed Mermaid.js architecture diagram for the following infrastructure:

Description: {description}
Cloud Provider: {provider}
Resources: {', '.join(resources)}

Create a comprehensive Mermaid graph TD (top-down) diagram that shows:
1. All major infrastructure components
2. Network flow and connections
3. Data flow between components
4. Security boundaries (if applicable)
5. Load balancing and scaling components

Use appropriate Mermaid syntax with:
- Clear node labels. Ensure node labels are simple strings and do not contain special Mermaid syntax characters like '(', ')', '[', ']', '{{', '}}', '<', '>', ':', ';', '#', or numbers immediately following parentheses or brackets, unless they are part of a valid Mermaid node definition.
- Different node shapes for different component types
- Directional arrows showing data/traffic flow
- Subgraphs for logical groupings (VPC, subnets, etc.)

Provider-specific components:
- AWS: Use EC2, RDS, ALB, VPC, S3, Lambda, etc.
- Azure: Use VM, SQL Database, Load Balancer, VNet, Storage, etc.
- GCP: Use Compute Engine, Cloud SQL, Load Balancing, VPC, Cloud Storage, etc.

Return ONLY the Mermaid syntax starting with 'graph TD' or 'graph LR'.
"""

    try:
        if use_new_api:
            messages = [ChatMessage(role="user", content=diagram_prompt)]
            response = mistral_client.chat(
                model=MISTRAL_MODEL,
                messages=messages,
                temperature=0.3,
                max_tokens=800
            )
        else:
            messages = [{"role": "user", "content": diagram_prompt}]
            response = mistral_client.chat.complete(
                model=MISTRAL_MODEL,
                messages=messages,
                temperature=0.3,
                max_tokens=800
            )
        
        ai_generated_mermaid = response.choices[0].message.content.strip()

        # Clean up the response to extract only the Mermaid syntax
        mermaid_syntax = ai_generated_mermaid
        if "```mermaid" in ai_generated_mermaid:
            mermaid_syntax = ai_generated_mermaid.split("```mermaid")[1].split("```")[0].strip()
        elif "```" in ai_generated_mermaid:
            mermaid_syntax = ai_generated_mermaid.split("```")[1].strip()

        # Basic validation of Mermaid syntax
        if not (mermaid_syntax.startswith("graph TD") or mermaid_syntax.startswith("graph LR")) or "-->" not in mermaid_syntax:
            print(f"WARNING: AI generated invalid Mermaid syntax. Falling back to basic diagram. Invalid syntax: {mermaid_syntax}")
            mermaid_syntax = await generate_basic_mermaid_diagram(resources, provider)

    except Exception as e:
        print(f"Error generating AI diagram: {e}")
        # Fallback to basic diagram generation
        mermaid_syntax = await generate_basic_mermaid_diagram(resources, provider)

    # Generate components and connections from the mermaid syntax
    components = []
    connections = []
    
    # Parse the mermaid syntax to extract components
    lines = mermaid_syntax.split('\n')
    for line in lines:
        line = line.strip()
        if '-->' in line:
            parts = line.split('-->')
            if len(parts) == 2:
                from_node = parts[0].strip()
                to_node = parts[1].strip()
                try:
                    from_name = re.sub(r'\[(.*?)\]', r'\1', from_node)
                    to_name = re.sub(r'\[(.*?)\]', r'\1', to_node)
                except re.error as e:
                    print(f"Regex error: {e}")
                    from_name = from_node
                    to_name = to_node
                connections.append({
                    "from": from_name,
                    "to": to_name,
                    "type": "network"
                })
        elif '[' in line and ']' in line:
            # Extract component names from node definitions
            try:
                matches = re.findall(r'\[(.*?)\]', line)
            except re.error as e:
                print(f"Regex error: {e}")
                matches = []
            components.extend(matches)

    # Remove duplicates and clean up
    components = list(set([comp for comp in components if comp]))
    
    # Create mermaidchart.com URL
    #mermaid_chart_url = await create_mermaid_chart(mermaid_syntax)
    
    async def create_mermaid_chart(mermaid_syntax: str) -> Optional[str]:
        """Create Mermaid chart URL, preferring token API if available."""
        token = os.getenv("MERMAID_API_TOKEN")
        try:
            if token:
                async with httpx.AsyncClient(timeout=30.0) as client:
                    resp = await client.post(
                        "https://api.mermaidchart.com/v1/charts",
                        headers={
                            "Authorization": f"Bearer {token}",
                            "Content-Type": "application/json"
                        },
                        json={
                            "code": mermaid_syntax,
                            "theme": "light",
                            "autoSync": True
                        }
                    )
                if resp.status_code == 200:
                    data = resp.json()
                    return data.get("shareUrl") or data.get("url")
                else:
                    print("Mermaid API error:", resp.text)

            # Fallback to free live link
            chart_data = {"code": mermaid_syntax, "mermaid": {"theme": "dark"}}
            encoded_data = base64.urlsafe_b64encode(json.dumps(chart_data).encode()).decode()
            return f"https://mermaid.live/edit#{encoded_data}"

        except Exception as e:
            print(f"Error creating mermaid chart: {e}")
            return None


    diagram_description = f"Architecture diagram for {provider} infrastructure showing the relationships between {len(components)} main components including compute, storage, networking, and security layers."

    return ArchitectureDiagram(
        diagram_mermaid_syntax=mermaid_syntax,
        diagram_description=diagram_description,
        components=components[:10],  # Limit to top 10 components
        connections=connections[:10],  # Limit to top 10 connections
        #mermaid_chart_url=mermaid_chart_url
    )

async def generate_basic_mermaid_diagram(resources: List[str], provider: str) -> str:
    """Generate a basic Mermaid diagram as fallback"""
    mermaid_lines = ["graph TD"]
    
    # Define basic nodes based on provider
    if provider == 'aws':
        mermaid_lines.extend([
            "    A[User] --> B[Application Load Balancer]",
            "    B --> C[EC2 Instance]",
            "    C --> D[RDS Database]",
            "    C --> E[S3 Storage]"
        ])
    elif provider == 'azure':
        mermaid_lines.extend([
            "    A[User] --> B[Azure Load Balancer]",
            "    B --> C[Virtual Machine]",
            "    C --> D[Azure SQL Database]",
            "    C --> E[Blob Storage]"
        ])
    elif provider == 'gcp':
        mermaid_lines.extend([
            "    A[User] --> B[Load Balancing]",
            "    B --> C[Compute Engine]",
            "    C --> D[Cloud SQL]",
            "    C --> E[Cloud Storage]"
        ])
    
    return "\n".join(mermaid_lines)

def parse_generated_files(content: str) -> List[Dict[str, str]]:
    """Parse generated content into individual files with enhanced detection"""
    
    files = []
    
    # Enhanced regex pattern for file detection
    file_pattern = r'```(\w+):([^\n]+)\n(.*?)\n```'
    matches = re.findall(file_pattern, content, re.DOTALL)
    
    for lang, filename, file_content in matches:
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
        
        # Generate AI-powered explanation for each file
        try:
            explanation = await generate_file_explanation(filename, content, file_type, category)
        except Exception as e:
            print(f"Explanation generation failed for {filename}: {e}")
            explanation = f"Configuration file for {category} components. Contains essential infrastructure definitions and settings."
        
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
    print(f"Checking validity for description: {description}")
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
    is_valid = any(keyword in description_lower for keyword in infrastructure_keywords)
    print(f"Description is valid: {is_valid}")
    return is_valid

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
  "explanation": "A comprehensive summary of the generated infrastructure. List all generated files (e.g. main.tf, variables.tf, outputs.tf) and briefly describe what each file provisions. Include the cloud provider, key resources, estimated cost tier, and any security or best-practice considerations.",
  "resources": ["azurerm_virtual_network","azurerm_linux_virtual_machine", "ansible_role_install_nginx"],
  "estimated_cost": "Low"
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
        
        # Generate file hierarchy
        file_hierarchy = await generate_file_hierarchy(processed_files)
        
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
        
        # Generate architecture diagram (static fallback to avoid second Mistral call / timeout)
        architecture_diagram = None
        if include_diagram:
            resources = metadata.get("resources", [])
            try:
                architecture_diagram = await generate_architecture_diagram(description, resources, provider)
            except Exception as diag_err:
                print(f"WARNING: Diagram generation failed, skipping: {diag_err}")
                architecture_diagram = None
        
        result = {
            "files": processed_files,
            "explanation": metadata.get("explanation", "Infrastructure code generated successfully."),
            "resources": metadata.get("resources", []),
            "estimated_cost": metadata.get("estimated_cost", "Unknown"),
            "file_hierarchy": file_hierarchy,  # Now properly generated
            "is_valid_request": True,
            "architecture_diagram": architecture_diagram
        }
        
        response_cache[cache_key] = result.copy()
        result["cached_response"] = False
        return result

    except Exception as e:
        print(f"ERROR: AI generation failed: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, 
                          detail=f"AI generation failed: {str(e)}")

# --- Database Helper Functions (keeping existing ones) ---

# NOTE: For optimal performance, ensure the following schema optimizations are applied in your Supabase dashboard:
#
# 1. `users` table:
#    - Add a unique index on the `email` column.
#
# 2. `generations` table:
#    - Add a foreign key constraint from `generations.user_id` to `users.id`.
#    - Add a composite index on `(user_id, created_at)`.

async def create_user(email: str, name: str, password: str):
    """Create a new user in Supabase using admin privileges"""
    try:
        # Use Supabase's admin method to create a user.
        # This requires the Supabase client to be initialized with the service_role key.
        user = supabase.auth.admin.create_user({
            "email": email.lower(),
            "password": password,
            "email_confirm": True,  # Auto-confirm the user
            "user_metadata": {"name": name},
        })
        return user
    except Exception as e:
        print(f"Supabase admin create_user error: {e}")
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

async def check_quota(user_id: str) -> bool:
    """Check if the user has reached their monthly free generation limit."""
    try:
        # Check plan
        sub_result = supabase.table("subscriptions").select("plan").eq("user_id", user_id).execute()
        plan = "free"
        if sub_result.data:
            plan = sub_result.data[0].get("plan", "free")
            
        if plan != "free":
            return True # Pro users have no limit
            
        # Check usage for current month
        current_month = datetime.utcnow().strftime('%Y-%m')
        usage_result = supabase.table("usage").select("generation_count").eq("user_id", user_id).eq("month", current_month).execute()
        
        if usage_result.data and usage_result.data[0].get("generation_count", 0) >= 5:
            return False
            
        return True
    except Exception as e:
        print(f"Error checking quota: {e}")
        return True # Default to allow on error so we don't block users if DB fails briefly

async def increment_usage(user_id: str):
    """Increment the generation usage count for the current month."""
    try:
        current_month = datetime.utcnow().strftime('%Y-%m')
        # Use the RPC function created in the SQL schema
        supabase.rpc('increment_usage_count', {'p_user_id': user_id, 'p_month': current_month}).execute()
    except Exception as e:
        print(f"Error incrementing usage: {e}")

async def save_generation(user_id: str, request: GenerateRequest, response: GenerateResponse):
    """Save a generation to the database."""
    try:
        # Convert files list to JSON string for the 'code' column (matches DB schema)
        files_list = [file.dict() for file in response.files]
        files_as_json = json.dumps(files_list)
        generation_data = {
            "user_id": user_id,
            "description": request.description,
            "provider": request.provider,
            "estimated_cost": response.estimated_cost or "Unknown",
            "code": files_as_json,
            "files": files_list,
            "explanation": response.explanation,
            "resources": response.resources if response.resources else [],
            "file_hierarchy": response.file_hierarchy or "",
            "architecture_diagram": response.architecture_diagram.dict() if response.architecture_diagram else None,
        }
        print(f"Saving generation for user {user_id}...")
        result = supabase.table("generations").insert(generation_data).execute()
        print(f"Generation saved successfully: {result.data[0]['id'] if result.data else 'no data'}")
        if result.data:
            return result.data[0]
        return None
    except Exception as e:
        print(f"Database error saving generation: {e}")
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
    return {"message": "TerraformCoder AI API is running with enhanced features and Mermaid Chart integration!"}

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
    print(f"Attempting to register user: {request.email}")
    existing_user = await get_user_by_email(request.email)
    if existing_user:
        print(f"User {request.email} already exists.")
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="User already exists.")

    # 1. Create the user in Supabase Auth
    response = await create_user(request.email, request.name, request.password)
    if not response or not response.user:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to create auth user.")

    auth_user = response.user
    print(f"Auth user for {request.email} created successfully.")

    user_id = str(auth_user.id)

    # 2. Create access token
    token = create_access_token({"sub": user_id})

    # 3. Return response
    return AuthResponse(
        message="User registered successfully",
        user={"id": user_id, "email": request.email, "name": request.name},
        access_token=token
    )

@app.post("/api/auth/login", response_model=AuthResponse)
async def login(request: LoginRequest):
    """
    Logs in a user using Supabase Auth.
    """
    try:
        response = supabase.auth.sign_in_with_password({
            "email": request.email.lower(),
            "password": request.password,
        })

        if response.user and response.session:
            user_data = response.user.dict()
            # Supabase user metadata is in user_metadata
            user_name = user_data.get("user_metadata", {}).get("name", "User")
            
            token = create_access_token({"sub": str(user_data["id"])})

            return AuthResponse(
                message="Login successful",
                user={"id": str(user_data["id"]), "email": user_data["email"], "name": user_name},
                access_token=token
            )
        else:
            # Handle cases where sign_in_with_password doesn't return user/session but no exception
            print(f"Supabase sign_in_with_password response: {response}")
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials.")

    except Exception as e:
        print(f"Supabase Auth sign_in_with_password error: {e}")
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials.")

@app.post("/api/generate", response_model=GenerateResponse)
async def generate(request: GenerateRequest, current_user: Dict = Depends(get_current_user)):
    print(f"=== GENERATE START === user={current_user.get('id')} desc={request.description[:50]}")
    try:
        if not request.description.strip():
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Description cannot be empty.")

        if not is_valid_infrastructure_request(request.description):
            print("Invalid infrastructure request")
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

        # Enforce Quota
        print("Checking quota...")
        has_quota = await check_quota(current_user["id"])
        if not has_quota:
            raise HTTPException(status_code=429, detail="Monthly generation limit reached. Upgrade to Pro for unlimited generations.")
        print("Quota OK, calling AI model...")

        result = await call_ai_model(request.description, request.provider, request.include_diagram)
        print(f"AI model returned {len(result.get('files', []))} files")
        
        # Build the response object without the ID first
        response_obj = GenerateResponse(
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
        print("Response object built, saving to DB...")
        
        # Save the generation to Supabase
        saved_generation = await save_generation(current_user["id"], request, response_obj)
        
        # Increment usage count after successful generation
        await increment_usage(current_user["id"])
        
        # Add the ID to the response if it was successfully saved
        if saved_generation and "id" in saved_generation:
            response_obj.id = saved_generation["id"]
        
        print(f"=== GENERATE SUCCESS ===")
        return response_obj
    except HTTPException:
        raise
    except Exception as e:
        print(f"=== GENERATE CRASHED === {traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=f"Generation failed: {str(e)}")

@app.get("/health")
def health_check():
    return {"status": "healthy", "timestamp": datetime.utcnow().isoformat()}

class GenerationHistory(BaseModel):
    id: str
    description: str
    provider: str
    estimated_cost: str
    created_at: str

@app.get("/api/history", response_model=List[GenerationHistory])
async def get_history(limit: int = 20, offset: int = 0, current_user: Dict = Depends(get_current_user)):
    try:
        response = supabase.table("generations") \
            .select("id, description, provider, estimated_cost, created_at") \
            .eq("user_id", current_user["id"]) \
            .order("created_at", desc=True) \
            .range(offset, offset + limit - 1) \
            .execute()
        return response.data
    except Exception as e:
        print(f"Error fetching history: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch generation history.")

@app.get("/api/history/{generation_id}", response_model=GenerateResponse)
async def get_generation_by_id(generation_id: str, current_user: Dict = Depends(get_current_user)):
    try:
        response = supabase.table("generations") \
            .select("*") \
            .eq("id", generation_id) \
            .eq("user_id", current_user["id"]) \
            .execute()
            
        if not response.data:
            raise HTTPException(status_code=404, detail="Generation not found or access denied.")
            
        data = response.data[0]
        
        # Convert dictionary formats back to models
        architecture_diagram = None
        if data.get("architecture_diagram"):
            architecture_diagram = ArchitectureDiagram(**data["architecture_diagram"])
            
        files = []
        if data.get("files"):
            files = [FileContent(**f) for f in data["files"]]
            
        # Ensure we return valid JSON by removing any problematic data
        # Check resources
        resources = []
        if data.get("resources") and isinstance(data["resources"], list):
            resources = data["resources"]
            
        # Reconstruct GenerateResponse
        return GenerateResponse(
            id=data["id"],
            files=files,
            explanation=data.get("explanation", ""),
            resources=resources,
            estimated_cost=data.get("estimated_cost", "Unknown"),
            provider=data.get("provider", "aws"),
            generated_at=data.get("created_at", ""),
            cached_response=True, # Since we fetched it from DB, it's essentially cached
            file_hierarchy=data.get("file_hierarchy", ""),
            is_valid_request=True,
            architecture_diagram=architecture_diagram
        )
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error fetching generation {generation_id}: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch generation details.")

@app.get("/api/download/{generation_id}")
async def download_generation_zip(generation_id: str, current_user: Dict = Depends(get_current_user)):
    try:
        response = supabase.table("generations") \
            .select("files, code, description, provider") \
            .eq("id", generation_id) \
            .eq("user_id", current_user["id"]) \
            .execute()
            
        if not response.data:
            raise HTTPException(status_code=404, detail="Generation not found or access denied.")
            
        data = response.data[0]
        files = data.get("files") or []
        
        # Fallback: older generations stored files as JSON string in 'code' column
        if not files and data.get("code"):
            try:
                parsed = json.loads(data["code"]) if isinstance(data["code"], str) else data["code"]
                if isinstance(parsed, list):
                    files = parsed
            except Exception as parse_err:
                print(f"Warning: Could not parse code column: {parse_err}")
                files = []
        
        if not files:
            raise HTTPException(status_code=404, detail="No files found for this generation.")
        
        description = data.get("description", "No description provided.")
        provider = data.get("provider", "Unknown")
        
        # Build ZIP in memory
        zip_io = io.BytesIO()
        with zipfile.ZipFile(zip_io, mode='w', compression=zipfile.ZIP_DEFLATED) as zf:
            for file in files:
                if isinstance(file, dict) and file.get("filename") and file.get("content"):
                    zf.writestr(file["filename"], file["content"])
                    
            # Add README
            readme_content = f"# TerraformCoder AI Generation\n\n**Provider**: {provider}\n\n**Description**:\n{description}\n\nGenerated by AI. Please review the code before deployment."
            zf.writestr("README.md", readme_content)
            
        # Prepare response
        zip_io.seek(0)
        short_id = str(generation_id)[:8]
        headers = {
            'Content-Disposition': f'attachment; filename="terraform-{short_id}.zip"'
        }
        
        return StreamingResponse(
            zip_io, 
            media_type="application/zip", 
            headers=headers
        )
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error creating ZIP for generation {generation_id}: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to create ZIP file: {str(e)}")

@app.post("/api/billing/checkout")
async def create_checkout_session(current_user: Dict = Depends(get_current_user)):
    try:
        session = stripe.checkout.Session.create(
            payment_method_types=['card'],
            line_items=[{
                'price': os.getenv("STRIPE_PRO_PRICE_ID"),
                'quantity': 1,
            }],
            mode='subscription',
            success_url=f"https://terraformcoder-ai.vercel.app?session_id={{CHECKOUT_SESSION_ID}}",
            cancel_url=f"https://terraformcoder-ai.vercel.app",
            customer_email=current_user.get("email"),
            metadata={
                'user_id': current_user["id"]
            }
        )
        return {"checkout_url": session.url}
    except Exception as e:
        print(f"Stripe checkout error: {e}")
        raise HTTPException(status_code=500, detail="Failed to create checkout session.")

from fastapi import Request

@app.post("/api/billing/webhook")
async def stripe_webhook(request: Request):
    payload = await request.body()
    sig_header = request.headers.get("stripe-signature")
    endpoint_secret = os.getenv("STRIPE_WEBHOOK_SECRET")
    
    if not endpoint_secret:
        return Response(content="Webhook secret not configured.", status_code=400)

    try:
        event = stripe.Webhook.construct_event(
            payload, sig_header, endpoint_secret
        )
    except ValueError as e:
        print(f"Invalid payload: {e}")
        return Response(content="Invalid payload", status_code=400)
    except stripe.error.SignatureVerificationError as e:
        print(f"Invalid signature: {e}")
        return Response(content="Invalid signature", status_code=400)

    # Handle the checkout.session.completed event
    if event['type'] == 'checkout.session.completed':
        session = event['data']['object']
        
        user_id = session.get('metadata', {}).get('user_id')
        customer_id = session.get('customer')
        subscription_id = session.get('subscription')
        
        if user_id:
            try:
                # Upsert subscription
                supabase.table("subscriptions").upsert({
                    "user_id": user_id,
                    "stripe_customer_id": customer_id,
                    "stripe_subscription_id": subscription_id,
                    "plan": "pro",
                    "status": "active"
                }).execute()
                print(f"Successfully upgraded user {user_id} to pro.")
            except Exception as e:
                print(f"Error updating subscription in DB: {e}")
                
    return Response(content="success")

@app.get("/api/billing/status")
async def get_billing_status(current_user: Dict = Depends(get_current_user)):
    try:
        # Get plan
        sub_result = supabase.table("subscriptions").select("plan").eq("user_id", current_user["id"]).execute()
        plan = "free"
        if sub_result.data:
            plan = sub_result.data[0].get("plan", "free")
            
        # Get usage
        current_month = datetime.utcnow().strftime('%Y-%m')
        usage_result = supabase.table("usage").select("generation_count").eq("user_id", current_user["id"]).eq("month", current_month).execute()
        
        generation_count = 0
        if usage_result.data:
            generation_count = usage_result.data[0].get("generation_count", 0)
            
        return {
            "plan": plan,
            "generation_count": generation_count,
            "limit": 5 if plan == "free" else -1
        }
    except Exception as e:
        print(f"Error fetching billing status: {e}")
        # Default to free tier on error to be safe
        return {
            "plan": "free",
            "generation_count": 0,
            "limit": 5
        }

@app.post("/api/generate-diagram")
async def generate_diagram(request: GenerateRequest, current_user: Dict = Depends(get_current_user)):
    """Generate standalone architecture diagram with mermaidchart.com integration"""
    try:
        # Generate diagram using AI
        architecture_diagram = await generate_architecture_diagram(
            request.description, 
            [], 
            request.provider
        )
        
        return {
            "diagram": architecture_diagram.dict(),
            "message": "Architecture diagram generated successfully",
            "mermaid_chart_url": architecture_diagram.mermaid_chart_url,
            "generated_at": datetime.utcnow().isoformat()
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Diagram generation failed: {str(e)}"
        )

from fastapi import Body

@app.post("/api/mermaid/render")
async def render_mermaid(
    payload: dict = Body(...),
    current_user: Dict = Depends(get_current_user)
):
    token = os.getenv("MERMAID_API_TOKEN")
    api_url = os.getenv("MERMAID_API_URL", "https://api.mermaidchart.com/v1/render")

    if not token:
        raise HTTPException(status_code=500, detail="Mermaid API token not configured.")

    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            resp = await client.post(
                api_url,
                headers={
                    "Authorization": f"Bearer {token}",
                    "Content-Type": "application/json"
                },
                json={
                    "code": payload.get("code"),
                    "theme": payload.get("theme", "dark"),
                    "format": payload.get("format", "svg")
                }
            )

        if resp.status_code != 200:
            raise HTTPException(status_code=resp.status_code, detail=resp.text)

        # Return raw image
        if payload.get("format", "svg") == "svg":
            return Response(content=resp.content, media_type="image/svg+xml")
        return Response(content=resp.content, media_type="image/png")

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Mermaid render failed: {str(e)}")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)