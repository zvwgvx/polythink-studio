from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import json
import os
from pathlib import Path
from typing import List, Dict, Any, Optional
from dotenv import load_dotenv
from routers import users, datasets, workflow
from database import users_collection
from auth import get_password_hash

load_dotenv()

app = FastAPI()

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all origins for development
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(users.router)
app.include_router(datasets.router)
app.include_router(workflow.router)

@app.on_event("startup")
async def startup_db_client():
    # Create default admin if not exists
    if not users_collection.find_one({"role": "admin"}):
        admin_user = {
            "username": "admin",
            "full_name": "System Administrator",
            "email": "admin@example.com",
            "role": "admin",
            "hashed_password": get_password_hash("admin123")
        }
        users_collection.insert_one(admin_user)
        print("Default admin user created: admin / admin123")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
