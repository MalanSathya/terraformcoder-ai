from fastapi import FastAPI, HTTPException, Depends, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel
from typing import Optional, Dict, List
from datetime import datetime, timedelta
import hashlib
import base64
import os
import json
import jwt
from jwt.exceptions import PyJWTError
from openai import OpenAI

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
SECRET_KEY = os.getenv("JWT_SECRET_KEY", "dev-secret-key")  # Replace in prod
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60

# --- OpenAI ---
openai_client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

# --- Mock Databases ---
mock_users_db = {}

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
    description: str
    provider: str = "aws"

class GenerateResponse(BaseModel):
    code: str
    explanation: str
    resources: List[str]
    estimated_cost: str
    provider: str
    generated_at: str

# --- JWT Utils ---
def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    expire = datetime.utcnow() + (expires_delta or timedelta(minutes=15))
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    token = credentials.credentials
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id = payload.get("sub")
        if user_id is None or user_id not in mock_users_db:
            raise HTTPException(status_code=401, detail="Invalid token or user.")
        return mock_users_db[user_id]
    except PyJWTError:
        raise HTTPException(status_code=401, detail="Invalid authentication credentials.")

# --- OpenAI Call ---
async def call_ai_model(description: str, provider: str = "aws"):
    system_prompt = f"""
You are an expert in Terraform code generation.
Generate ONLY the Terraform (.tf) code based on the user's request.
Follow these rules:
- Use provider: {provider}
- Include valid provider/resource blocks
- Use comments for clarity
- No extra text outside code

Return the response in this format:
```terraform
# terraform code here
```

```json
{{"explanation": "...", "resources": ["..."], "estimated_cost": "..."}}
```
"""

    user_message = f"Generate Terraform code to {description}."

    try:
        response = openai_client.chat.completions.create(
            model="gpt-3.5",
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_message}
            ],
            temperature=0.7,
            max_tokens=2048
        )
        content = response.choices[0].message.content.strip()

        code = ""
        metadata = {}
        
        # Extract Terraform code
        if "```terraform" in content:
            code = content.split("```terraform")[1].split("```")[0].strip()
        
        # Extract JSON metadata
        if "```json" in content:
            json_block = content.split("```json")[1].split("```")[0].strip()
            try:
                metadata = json.loads(json_block)
            except json.JSONDecodeError:
                metadata = {}

        return {
            "code": code,
            "explanation": metadata.get("explanation", ""),
            "resources": metadata.get("resources", []),
            "estimated_cost": metadata.get("estimated_cost", "Unknown")
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"AI generation failed: {str(e)}")

# --- Routes ---
@app.get("/")
def root():
    return {"message": "TerraformCoder AI API is running!"}

@app.post("/api/auth/register", response_model=AuthResponse)
def register(request: RegisterRequest):
    # Check if user already exists
    for user in mock_users_db.values():
        if user["email"].lower() == request.email.lower():
            raise HTTPException(status_code=409, detail="User already exists.")

    # Create new user
    user_id = base64.b64encode(request.email.encode()).decode()[:12]
    password_hash = hashlib.sha256(request.password.encode()).hexdigest()

    user_data = {
        "id": user_id,
        "email": request.email,
        "name": request.name,
        "password_hash": password_hash
    }
    mock_users_db[user_id] = user_data

    # Generate token
    token = create_access_token({"sub": user_id})
    
    return AuthResponse(
        message="User registered successfully",
        user={"id": user_id, "email": request.email, "name": request.name},
        access_token=token
    )

@app.post("/api/auth/login", response_model=AuthResponse)
def login(request: LoginRequest):
    # Find user and validate password
    for user_id, user in mock_users_db.items():
        if user["email"].lower() == request.email.lower():
            hashed = hashlib.sha256(request.password.encode()).hexdigest()
            if user["password_hash"] == hashed:
                token = create_access_token({"sub": user_id})
                return AuthResponse(
                    message="Login successful",
                    user={"id": user["id"], "email": user["email"], "name": user["name"]},
                    access_token=token
                )
            break
    
    raise HTTPException(status_code=401, detail="Invalid credentials.")

@app.post("/api/generate", response_model=GenerateResponse)
async def generate(request: GenerateRequest, current_user: Dict = Depends(get_current_user)):
    result = await call_ai_model(request.description, request.provider)
    
    return GenerateResponse(
        code=result["code"],
        explanation=result["explanation"],
        resources=result["resources"],
        estimated_cost=result["estimated_cost"],
        provider=request.provider,
        generated_at=datetime.utcnow().isoformat()
    )

# --- Health Check ---
@app.get("/health")
def health_check():
    return {"status": "healthy", "timestamp": datetime.utcnow().isoformat()}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)