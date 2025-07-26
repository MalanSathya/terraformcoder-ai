from fastapi import FastAPI, HTTPException, Depends, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel
from datetime import datetime, timedelta
from typing import Dict, Optional
import os, jwt, hashlib, base64

# --- App and Middleware Setup ---
app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- JWT Setup ---
SECRET_KEY = os.getenv("JWT_SECRET_KEY", "insecure-dev-key")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60
security = HTTPBearer()

# --- In-Memory Mock DB ---
mock_users_db: Dict[str, Dict] = {}

# --- Models ---
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

# --- Helpers ---
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
            raise HTTPException(status_code=401, detail="Invalid token or user")
        return mock_users_db[user_id]
    except jwt.PyJWTError:
        raise HTTPException(status_code=401, detail="Invalid token")

# --- Routes ---

@app.post("/api/auth/register", response_model=AuthResponse)
def register(request: RegisterUserRequest):
    # Check for duplicates
    for user in mock_users_db.values():
        if user['email'].lower() == request.email.lower():
            raise HTTPException(status_code=409, detail="Email already registered")

    user_id = base64.b64encode(request.email.encode()).decode()[:12]
    mock_users_db[user_id] = {
        "id": user_id,
        "email": request.email,
        "name": request.name,
        "password_hash": hashlib.sha256(request.password.encode()).hexdigest()
    }

    token = create_access_token({"sub": user_id})
    return AuthResponse(
        message="Registration successful",
        user={"id": user_id, "email": request.email, "name": request.name},
        access_token=token
    )

@app.post("/api/auth/login", response_model=AuthResponse)
def login(request: LoginUserRequest):
    user_id = None
    for uid, user in mock_users_db.items():
        if user["email"].lower() == request.email.lower():
            user_id = uid
            break

    if not user_id:
        raise HTTPException(status_code=401, detail="Invalid credentials")

    user = mock_users_db[user_id]
    if user["password_hash"] != hashlib.sha256(request.password.encode()).hexdigest():
        raise HTTPException(status_code=401, detail="Invalid credentials")

    token = create_access_token({"sub": user_id})
    return AuthResponse(
        message="Login successful",
        user={"id": user_id, "email": user["email"], "name": user["name"]},
        access_token=token
    )