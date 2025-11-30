from fastapi import APIRouter, HTTPException, Depends, Query
from typing import List, Dict, Any
from pathlib import Path
import json
import os
from auth import get_current_active_user
from database import user_datasets_collection
from models import User, DatasetContent, UserDataset

router = APIRouter()

REPO_ROOT = Path(__file__).parent.parent.parent / "dataset"
BASE_DIR = REPO_ROOT / "dataset" if (REPO_ROOT / "dataset").exists() else REPO_ROOT

@router.get("/datasets")
async def list_datasets(current_user: User = Depends(get_current_active_user)):
    datasets = []
    if not BASE_DIR.exists():
        return {"datasets": []}

    for turn_type in ['multi-turn', 'single-turn']:
        turn_dir = BASE_DIR / turn_type
        if turn_dir.exists():
            for file_path in turn_dir.glob('*.json'):
                datasets.append({
                    "path": f"{turn_type}/{file_path.name}",
                    "name": file_path.stem.replace('_', ' ').title(),
                    "type": turn_type
                })
    
    # Filter based on permissions
    if current_user.role != "admin":
        allowed = set(current_user.allowed_datasets)
        datasets = [d for d in datasets if d["path"] in allowed]

    return {"datasets": datasets}

@router.get("/datasets/{turn_type}/{filename}")
async def get_dataset(
    turn_type: str, 
    filename: str, 
    fork: bool = Query(False),
    current_user: User = Depends(get_current_active_user)
):
    dataset_path = f"{turn_type}/{filename}"
    
    # If requesting fork, check DB first
    if fork:
        user_dataset = user_datasets_collection.find_one({
            "username": current_user.username,
            "original_path": dataset_path
        })
        if user_dataset:
            return {"content": user_dataset["content"], "is_fork": True}
    
    # Fallback to disk (Main Repo)
    file_path = BASE_DIR / turn_type / filename
    
    main_content = []
    if file_path.exists():
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                main_content = json.load(f)
        except:
            pass

    if fork:
        user_dataset = user_datasets_collection.find_one({
            "username": current_user.username,
            "original_path": dataset_path
        })
        if user_dataset:
            # Check for changes
            has_changes = user_dataset["content"] != main_content
            return {"content": user_dataset["content"], "is_fork": True, "has_changes": has_changes}
    
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="Dataset not found")
    
    return {"content": main_content, "is_fork": False, "has_changes": False}

@router.post("/datasets/{turn_type}/{filename}")
async def save_dataset_fork(
    turn_type: str, 
    filename: str, 
    data: DatasetContent,
    current_user: User = Depends(get_current_active_user)
):
    # ALWAYS save to user's fork in DB
    dataset_path = f"{turn_type}/{filename}"
    
    user_datasets_collection.update_one(
        {
            "username": current_user.username,
            "original_path": dataset_path
        },
        {
            "$set": {
                "content": data.content,
                "updated_at": datetime.utcnow()
            }
        },
        upsert=True
    )
            
    return {"status": "success", "message": "Saved to your personal fork"}

from datetime import datetime
