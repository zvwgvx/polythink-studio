from fastapi import APIRouter, HTTPException, Depends, Query
from typing import List, Dict, Any
from pathlib import Path
import json
import os
from auth import get_current_active_user
from database import user_datasets_collection
from models import User, DatasetContent, UserDataset

router = APIRouter()

def find_dataset_dir():
    # Try to find the directory containing 'multi-turn' or 'single-turn'
    candidates = [
        # Standard structure: project/dataset/dataset
        Path(__file__).resolve().parent.parent.parent / "dataset" / "dataset",
        # Flat structure: project/dataset
        Path(__file__).resolve().parent.parent.parent / "dataset",
        # CWD based
        Path.cwd() / "dataset" / "dataset",
        Path.cwd() / "dataset",
    ]
    
    for path in candidates:
        if path.exists() and ((path / "multi-turn").exists() or (path / "single-turn").exists()):
            print(f"DEBUG: Found valid dataset dir at {path}")
            return path
            
    # Fallback to standard if nothing found (will likely fail but better than None crash)
    print("DEBUG: Could not find valid dataset dir with subfolders. Defaulting.")
    return Path(__file__).resolve().parent.parent.parent / "dataset" / "dataset"

BASE_DIR = find_dataset_dir()

@router.get("/datasets")
async def list_datasets(current_user: User = Depends(get_current_active_user)):
    print(f"DEBUG: list_datasets called by {current_user.username} (Role: {current_user.role})")
    print(f"DEBUG: Using BASE_DIR: {BASE_DIR}")
    
    datasets = []
    
    for turn_type in ['multi-turn', 'single-turn']:
        dir_path = BASE_DIR / turn_type
        if dir_path.exists():
            files = list(dir_path.glob('*.json'))
            print(f"DEBUG: Found {len(files)} files in {turn_type}")
            for f in files:
                datasets.append({
                    "name": f.stem.replace('_', ' ').title(),
                    "path": f"{turn_type}/{f.name}",
                    "type": turn_type,
                    "size": f.stat().st_size
                })
        else:
            print(f"DEBUG: Directory not found: {dir_path}")
    
    print(f"DEBUG: Total datasets found before filtering: {len(datasets)}")

    # Filter based on permissions
    if current_user.role != "admin":
        allowed = set(current_user.allowed_datasets)
        print(f"DEBUG: User is not admin. Allowed: {allowed}")
        datasets = [d for d in datasets if d["path"] in allowed]
        print(f"DEBUG: Datasets after filtering: {len(datasets)}")
    else:
        print("DEBUG: User is admin. Showing all.")
        
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
