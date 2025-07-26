from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from openai import OpenAI
import os
import jwt
from datetime import datetime, timedelta

# --- FastAPI setup ---
app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # You can lock this down later
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- Environment Config ---
SECRET_KEY = os.getenv("JWT_SECRET_KEY", "Srtm#356")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60

openai_client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

# --- Root Test ---
@app.get("/api")
def read_root():
    return {
        "message": "TerraformCoder AI API is running!",
        "openai_configured": bool(openai_client.api_key),
        "timestamp": datetime.utcnow().isoformat()
    }

# --- Token Test ---
@app.get("/api/token")
def generate_token():
    data = {"sub": "mock-user-id"}
    expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    data.update({"exp": expire})
    token = jwt.encode(data, SECRET_KEY, algorithm=ALGORITHM)
    return {"access_token": token}