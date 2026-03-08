import os
from dotenv import load_dotenv
from supabase import create_client, Client

load_dotenv()
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY") or os.getenv("SUPABASE_KEY")
supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

print("Fetching latest generations...")
response = supabase.table("generations").select("id, description, provider, estimated_cost, created_at, user_id, parent_id, org_id").order("created_at", desc=True).limit(5).execute()
print(f"Data: {response.data}")
