import os
from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
from supabase import create_client, Client
from dotenv import load_dotenv

load_dotenv()

app = FastAPI(title="DormPulse API")

# Enable CORS for React frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # In production, replace with your frontend URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Supabase Setup
url: str = os.environ.get("SUPABASE_URL", "")
key: str = os.environ.get("SUPABASE_KEY", "")
supabase: Client = create_client(url, key)

# Data Models
class HousingUnit(BaseModel):
    name: str
    address: str
    lat: float
    lon: float
    price: float
    category: str
    description: Optional[str] = ""

class AuthData(BaseModel):
    email: str
    password: str
    name: Optional[str] = None

@app.get("/")
async def root():
    return {"status": "DormPulse Backend Active"}

# --- Housing Units ---

@app.get("/api/units")
async def get_units():
    try:
        response = supabase.table("housing_units").select("*").execute()
        return response.data
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/units")
async def create_unit(unit: HousingUnit):
    try:
        response = supabase.table("housing_units").insert(unit.dict()).execute()
        return response.data[0]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.delete("/api/units/{unit_id}")
async def delete_unit(unit_id: str):
    try:
        supabase.table("housing_units").delete().eq("id", unit_id).execute()
        return {"message": "Unit deleted successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# --- User Management ---

@app.get("/api/users")
async def get_users():
    try:
        response = supabase.table("profiles").select("*").execute()
        return response.data
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.put("/api/users/{user_id}/role")
async def update_user_role(user_id: str, role_data: dict):
    try:
        response = supabase.table("profiles").update({"role": role_data.get("role")}).eq("id", user_id).execute()
        return response.data[0]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.delete("/api/users/{user_id}")
async def delete_user(user_id: str):
    try:
        # Note: In a real app, you'd also need to delete from auth.users via admin API
        supabase.table("profiles").delete().eq("id", user_id).execute()
        return {"message": "User deleted from profiles"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# --- Authentication ---

@app.post("/api/auth/signup")
async def signup(data: AuthData):
    try:
        # Using Supabase Auth
        response = supabase.auth.sign_up({
            "email": data.email,
            "password": data.password,
            "options": {"data": {"full_name": data.name}}
        })
        return {"message": "Signup successful", "user": response.user}
    except Exception as e:
        print(f"Signup Error: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))

@app.post("/api/auth/login")
async def login(data: AuthData):
    try:
        response = supabase.auth.sign_in_with_password({
            "email": data.email,
            "password": data.password
        })
        return {
            "session": response.session,
            "user": response.user,
            "isAdmin": response.user.email == "admin@dormpulse.com"
        }
    except Exception as e:
        print(f"Login Error: {str(e)}")
        raise HTTPException(status_code=401, detail="Invalid credentials")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
