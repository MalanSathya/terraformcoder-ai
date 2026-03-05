import os
import traceback
from mistralai import Mistral

api_key = os.getenv("MISTRAL_API_KEY", "")
print("Initializing client...")
try:
    client = Mistral(api_key=api_key)
    print("Calling chat.complete...")
    res = client.chat.complete(
        model="codestral-latest",
        messages=[
            {"role": "system", "content": "You are a cloud helper"},
            {"role": "user", "content": "Make me a VM on AWS"}
        ],
        temperature=0.7,
        max_tokens=2048
    )
    print("SUCCESS")
    print(res.choices[0].message.content[:50])
except Exception as e:
    print("ERROR:")
    traceback.print_exc()
