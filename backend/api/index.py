from fastapi import FastAPI
from mangum import Mangum
import os
from openai import OpenAI

app = FastAPI()
handler = Mangum(app)  # ✅ Required for Vercel

client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

@app.get("/api")
async def root():
    return {
        "message": "TerraformCoder AI working!",
        "openai_api_set": bool(client.api_key)
    }