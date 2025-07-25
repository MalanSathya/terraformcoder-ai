from fastapi import FastAPI
import os
from datetime import datetime

# Create the most minimal FastAPI app possible
app = FastAPI(title="TerraformCoder AI API")

@app.get("/")
async def root():
    return {
        "message": "Minimal API is working!",
        "timestamp": datetime.utcnow().isoformat(),
        "python_version": "3.9+",
        "environment": "vercel"
    }

@app.get("/test")
async def test():
    return {"status": "ok", "test": "passed"}

@app.get("/env-test")
async def env_test():
    return {
        "secret_key_exists": bool(os.getenv("SECRET_KEY")),
        "openai_key_exists": bool(os.getenv("OPENAI_API_KEY"))
    }

# Export handler for Vercel
handler = app