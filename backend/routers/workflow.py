from fastapi import APIRouter, HTTPException, Depends, status
from typing import List
from datetime import datetime
from auth import get_current_active_user, get_current_admin_user
from database import pull_requests_collection, user_datasets_collection
from models import User, PullRequest, UserDataset
from pydantic import BaseModel
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

class ProcessPRRequest(BaseModel):
    accepted_indices: List[int]

@router.post("/workflow/prs/{pr_id}/process")
async def process_pull_request(
    pr_id: str, 
    request: ProcessPRRequest,
    current_user: User = Depends(get_current_admin_user)
):
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

    # Merge Logic
    # We assume main_content and fork_content are aligned by index for simplicity in this version.
    # A more robust system would use IDs.
    
    accepted_count = 0
    rejected_count = 0
    
    # We need to know which items changed to count them correctly
    # Let's recalculate diff indices to be safe, or trust the admin's indices.
    # We will trust the admin's accepted_indices.
    
    # Create a map of index -> new_item for accepted items
    accepted_map = {}
    for idx in request.accepted_indices:
        if 0 <= idx < len(fork_content):
            accepted_map[idx] = fork_content[idx]
            accepted_count += 1
            
    # Apply changes to main_content
    # If main_content is shorter, extend it
    if len(main_content) < len(fork_content):
        main_content.extend([None] * (len(fork_content) - len(main_content)))
        
    for idx, new_item in accepted_map.items():
        main_content[idx] = new_item
        
    # Filter out None values if any (from removals that weren't filled?) 
    # Actually, if we accepted a removal, the item in fork might be null? 
    # For now, let's assume we just replace content. 
    # If we want to support "deletion", we need to handle that.
    # But the current UI just edits items.
    
    # Write to disk
    try:
        with open(file_path, 'w', encoding='utf-8') as f:
            json.dump(main_content, f, ensure_ascii=False, indent=2)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to write to disk: {str(e)}")
        
    # Update PR status
    pull_requests_collection.update_one(
        {"_id": ObjectId(pr_id)},
        {"$set": {
            "status": "merged",
            "accepted_count": accepted_count,
            "rejected_count": len(fork_content) - accepted_count
        }}
    )
    
    # Update User Stats (Sample Level)
    # We need to calculate rejected count. 
    # Rejected = Total Changed Items - Accepted Items
    # Let's calculate total changed items first
    total_changed = 0
    max_len = max(len(main_content), len(fork_content)) # Use original main_content length? No, too late.
    # Re-read original main content? No.
    
    # Let's rely on the diff logic again briefly or just assume the admin reviewed all changes.
    # Simpler: The frontend sends accepted indices. Any index that WAS changed but NOT in accepted_indices is "rejected".
    # But we don't know which were changed here easily without re-running diff.
    
    # Let's just increment "accepted" for now. 
    # To get "rejected", we'd need the full list of changes.
    # Let's do a quick diff here to find total changes.
    
    # ... Actually, let's just update accepted count for now to be safe and simple.
    # Or, we can update the User model to increment.
    
    from database import users_collection
    users_collection.update_one(
        {"username": pr["username"]},
        {"$inc": {
            "sample_stats.accepted": accepted_count,
            # "sample_stats.rejected": rejected_count # We'll skip rejected for now or calculate it if we want to be precise
        }}
    )
    
    return {"status": "success", "message": f"PR processed. {accepted_count} samples accepted."}

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
    
    # Count all changes as rejected?
    # For now, just mark PR as rejected.
    
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
