from fastapi import APIRouter, HTTPException, Depends, status
from typing import List
from datetime import datetime
from auth import get_current_active_user, get_current_admin_user
from database import pull_requests_collection, user_datasets_collection
from models import User, PullRequest, UserDataset
from pathlib import Path
import json

router = APIRouter()
REPO_ROOT = Path(__file__).parent.parent.parent / "dataset"
BASE_DIR = REPO_ROOT / "dataset" if (REPO_ROOT / "dataset").exists() else REPO_ROOT

@router.post("/workflow/pr", response_model=PullRequest)
async def create_pull_request(
    dataset_path: str,
    description: str = "",
    current_user: User = Depends(get_current_active_user)
):
    # Check if user has a fork
    user_dataset = user_datasets_collection.find_one({
        "username": current_user.username,
        "original_path": dataset_path
    })
    
    if not user_dataset:
        raise HTTPException(status_code=400, detail="You haven't made any changes to this dataset yet.")
        
    # Check if open PR exists
    existing_pr = pull_requests_collection.find_one({
        "username": current_user.username,
        "dataset_path": dataset_path,
        "status": "open"
    })
    
    if existing_pr:
        raise HTTPException(status_code=400, detail="You already have an open Pull Request for this dataset.")
    
    pr_data = {
        "username": current_user.username,
        "dataset_path": dataset_path,
        "status": "open",
        "created_at": datetime.utcnow(),
        "description": description
    }
    
    result = pull_requests_collection.insert_one(pr_data)
    created_pr = pull_requests_collection.find_one({"_id": result.inserted_id})
    created_pr["_id"] = str(created_pr["_id"])
    
    return PullRequest(**created_pr)

@router.get("/workflow/prs", response_model=List[PullRequest])
async def list_pull_requests(current_user: User = Depends(get_current_active_user)):
    query = {}
    # If not admin, only show own PRs? Or show all like GitHub?
    # Let's show all for now, but maybe filter in UI.
    # Actually, usually users want to see their own PR status.
    # Admin needs to see all 'open' PRs.
    
    prs = []
    cursor = pull_requests_collection.find().sort("created_at", -1)
    for pr in cursor:
        pr["_id"] = str(pr["_id"])
        prs.append(PullRequest(**pr))
    return prs

@router.post("/workflow/prs/{pr_id}/merge")
async def merge_pull_request(pr_id: str, current_user: User = Depends(get_current_admin_user)):
    from bson import ObjectId
    
    pr = pull_requests_collection.find_one({"_id": ObjectId(pr_id)})
    if not pr:
        raise HTTPException(status_code=404, detail="Pull Request not found")
        
    if pr["status"] != "open":
        raise HTTPException(status_code=400, detail="PR is not open")
        
    # Get user's fork content
    user_dataset = user_datasets_collection.find_one({
        "username": pr["username"],
        "original_path": pr["dataset_path"]
    })
    
    if not user_dataset:
        raise HTTPException(status_code=404, detail="Fork data not found")
        
    # Write to disk
    file_path = BASE_DIR / pr["dataset_path"]
    try:
        with open(file_path, 'w', encoding='utf-8') as f:
            json.dump(user_dataset["content"], f, ensure_ascii=False, indent=2)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to write to disk: {str(e)}")
        
    # Update PR status
    pull_requests_collection.update_one(
        {"_id": ObjectId(pr_id)},
        {"$set": {"status": "merged"}}
    )
    
    # Optional: Delete user fork after merge? Or keep it?
    # GitHub keeps the branch. Let's keep it.
    
    return {"status": "success", "message": "Pull Request merged successfully"}

@router.post("/workflow/prs/{pr_id}/reject")
async def reject_pull_request(pr_id: str, current_user: User = Depends(get_current_admin_user)):
    from bson import ObjectId
    
    pr = pull_requests_collection.find_one({"_id": ObjectId(pr_id)})
    if not pr:
        raise HTTPException(status_code=404, detail="Pull Request not found")
        
    pull_requests_collection.update_one(
        {"_id": ObjectId(pr_id)},
        {"$set": {"status": "rejected"}}
    )
    
    
    return {"status": "success", "message": "Pull Request rejected"}

@router.get("/workflow/prs/{pr_id}/diff")
async def get_pr_diff(pr_id: str, current_user: User = Depends(get_current_admin_user)):
    from bson import ObjectId
    import difflib
    
    pr = pull_requests_collection.find_one({"_id": ObjectId(pr_id)})
    if not pr:
        raise HTTPException(status_code=404, detail="Pull Request not found")
        
    # Get User Fork
    user_dataset = user_datasets_collection.find_one({
        "username": pr["username"],
        "original_path": pr["dataset_path"]
    })
    
    if not user_dataset:
        raise HTTPException(status_code=404, detail="Fork data not found")
        
    fork_content = user_dataset["content"]
    
    # Get Main Repo Content
    file_path = BASE_DIR / pr["dataset_path"]
    main_content = []
    if file_path.exists():
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                main_content = json.load(f)
        except:
            pass # File might be new
            
    # Calculate Diff
    # We will assume list of dicts.
    # Simple strategy: Compare by index. 
    # If lengths differ, show that.
    
    diffs = []
    
    max_len = max(len(main_content), len(fork_content))
    
    for i in range(max_len):
        item_main = main_content[i] if i < len(main_content) else None
        item_fork = fork_content[i] if i < len(fork_content) else None
        
        if item_main != item_fork:
            if item_main is None:
                diffs.append({"index": i, "type": "added", "content": item_fork})
            elif item_fork is None:
                diffs.append({"index": i, "type": "removed", "content": item_main})
            else:
                # Modified
                diffs.append({
                    "index": i, 
                    "type": "modified", 
                    "old_content": item_main,
                    "new_content": item_fork
                })
                
    return {"diffs": diffs, "total_changes": len(diffs)}

# Git Integration Endpoints
from utils import git_utils

@router.on_event("startup")
async def startup_git():
    git_utils.init_repo_if_needed()

@router.get("/workflow/git/config")
async def get_git_config(current_user: User = Depends(get_current_admin_user)):
    return {"remote_url": git_utils.get_remote_url()}

@router.post("/workflow/git/config")
async def set_git_config(
    data: dict,
    current_user: User = Depends(get_current_admin_user)
):
    url = data.get("url")
    if not url:
        raise HTTPException(status_code=400, detail="URL is required")
    
    try:
        git_utils.set_remote_url(url)
        return {"status": "success", "message": "Remote URL updated"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/workflow/git/sync")
async def git_sync(current_user: User = Depends(get_current_admin_user)):
    try:
        output = git_utils.git_pull()
        return {"status": "success", "message": "Synced successfully", "output": output}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/workflow/git/push")
async def git_push_changes(current_user: User = Depends(get_current_admin_user)):
    try:
        output = git_utils.git_push()
        return {"status": "success", "message": "Pushed successfully", "output": output}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
