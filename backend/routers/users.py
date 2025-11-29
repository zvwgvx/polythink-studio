from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks
from fastapi.security import OAuth2PasswordRequestForm
from typing import List
from pydantic import BaseModel
from datetime import timedelta, datetime
import secrets
import os
from auth import (
    get_current_active_user,
    get_current_admin_user,
    create_access_token,
    ACCESS_TOKEN_EXPIRE_MINUTES
)
from database import users_collection, invitation_codes_collection, pull_requests_collection
from models import User, UserCreate, Token, UserInDB, InvitationCode
from utils.email_utils import send_verification_email, send_login_otp_email

router = APIRouter()

MASTER_ADMIN_CODE = os.getenv("MASTER_ADMIN_CODE")
ALLOWED_EMAIL_DOMAINS = os.getenv("ALLOWED_EMAIL_DOMAINS", "").split(",")

def validate_email_domain(email: str):
    domain = email.split("@")[-1]
    if domain not in ALLOWED_EMAIL_DOMAINS:
        raise HTTPException(status_code=400, detail=f"Email domain must be one of: {', '.join(ALLOWED_EMAIL_DOMAINS)}")

class LoginRequest(BaseModel):
    email: str

class LoginVerify(BaseModel):
    email: str
    code: str

@router.post("/auth/login-request")
async def request_login_otp(request: LoginRequest, background_tasks: BackgroundTasks):
    user = users_collection.find_one({"email": request.email})
    if not user:
        # Don't reveal user existence
        return {"message": "If an account exists, a login code has been sent."}
    
    if not user.get("is_active"):
         raise HTTPException(status_code=400, detail="Account not active. Please verify your email first.")

    otp_code = secrets.token_hex(3).upper() # 6 chars
    users_collection.update_one(
        {"email": request.email},
        {"$set": {"otp_code": otp_code, "otp_created_at": datetime.utcnow()}}
    )
    
    background_tasks.add_task(send_login_otp_email, request.email, otp_code)
    return {"message": "If an account exists, a login code has been sent."}

@router.post("/auth/login-verify", response_model=Token)
async def verify_login_otp(request: LoginVerify):
    user = users_collection.find_one({"email": request.email})
    if not user:
        raise HTTPException(status_code=400, detail="Invalid email or code")
        
    if not user.get("otp_code") or user.get("otp_code") != request.code:
        raise HTTPException(status_code=400, detail="Invalid or expired login code")
        
    # Check expiration (e.g., 10 mins)
    if user.get("otp_created_at") and (datetime.utcnow() - user.get("otp_created_at")) > timedelta(minutes=10):
         raise HTTPException(status_code=400, detail="Login code expired")

    # Clear OTP
    users_collection.update_one(
        {"email": request.email},
        {"$set": {"otp_code": None, "otp_created_at": None}}
    )

    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user["username"]}, expires_delta=access_token_expires
    )
    return {"access_token": access_token, "token_type": "bearer"}

@router.post("/auth/register", response_model=User)
async def register_user(user: UserCreate, background_tasks: BackgroundTasks):
    # 1. Validate Email Domain
    validate_email_domain(user.email)

    # 2. Check Username/Email existence
    if users_collection.find_one({"username": user.username}):
        raise HTTPException(status_code=400, detail="Username already registered")
    if users_collection.find_one({"email": user.email}):
        raise HTTPException(status_code=400, detail="Email already registered")

    # 3. Validate Invitation Code
    role = "user"
    if user.invitation_code == MASTER_ADMIN_CODE:
        role = "admin"
    else:
        # Atomic check and update to prevent race conditions
        invite = invitation_codes_collection.find_one_and_update(
            {"code": user.invitation_code, "is_used": False},
            {"$set": {"is_used": True, "used_by": user.username}},
            return_document=True
        )
        
        if not invite:
            raise HTTPException(status_code=400, detail="Invalid or already used invitation code")

    # 4. Create User (Inactive)
    verification_code = secrets.token_hex(3).upper() # 6 chars
    
    user_data = {
        "username": user.username,
        "email": user.email,
        "full_name": user.full_name,
        "role": role,
        "is_active": False,
        "email_verified": False,
        "verification_code": verification_code
    }
    
    result = users_collection.insert_one(user_data)
    created_user = users_collection.find_one({"_id": result.inserted_id})
    created_user["_id"] = str(created_user["_id"])
    
    # 5. Send Verification Email
    background_tasks.add_task(send_verification_email, user.email, verification_code)
    
    return User(**created_user)

class VerifyEmailRequest(BaseModel):
    email: str
    code: str


@router.get("/users/me", response_model=User)
async def read_users_me(current_user: User = Depends(get_current_active_user)):
    # Calculate stats
    total_prs = pull_requests_collection.count_documents({"username": current_user.username})
    merged_prs = pull_requests_collection.count_documents({"username": current_user.username, "status": "merged"})
    rejected_prs = pull_requests_collection.count_documents({"username": current_user.username, "status": "rejected"})
    
    # Calculate daily stats for the last 30 days
    daily_stats = {}
    end_date = datetime.utcnow()
    start_date = end_date - timedelta(days=30)
    
    pipeline = [
        {
            "$match": {
                "username": current_user.username,
                "created_at": {"$gte": start_date}
            }
        },
        {
            "$group": {
                "_id": {
                    "$dateToString": {"format": "%Y-%m-%d", "date": "$created_at"}
                },
                "total": {"$sum": 1},
                "merged": {
                    "$sum": {
                        "$cond": [{"$eq": ["$status", "merged"]}, 1, 0]
                    }
                },
                "rejected": {
                    "$sum": {
                        "$cond": [{"$eq": ["$status", "rejected"]}, 1, 0]
                    }
                }
            }
        }
    ]
    
    results = list(pull_requests_collection.aggregate(pipeline))
    print(f"DEBUG: Aggregation Results for {current_user.username}: {results}")
    for r in results:
        daily_stats[r["_id"]] = {
            "total": r["total"],
            "merged": r["merged"],
            "rejected": r["rejected"]
        }
        
    # Convert to list of objects for frontend
    daily_stats_list = []
    # Fill in missing days (0 to 30 covers 31 days, ensuring today is included)
    for i in range(31):
        d = start_date + timedelta(days=i)
        date_str = d.strftime("%Y-%m-%d")
        stats = daily_stats.get(date_str, {"total": 0, "merged": 0, "rejected": 0})
        daily_stats_list.append({
            "date": date_str,
            "total": stats["total"],
            "merged": stats["merged"],
            "rejected": stats["rejected"]
        })
    
    current_user.contribution_stats = {
        "total_prs": total_prs,
        "merged_prs": merged_prs,
        "rejected_prs": rejected_prs,
        "daily_stats": daily_stats_list
    }
    return current_user

@router.get("/users", response_model=List[User])
async def read_users(current_user: User = Depends(get_current_admin_user)):
    users = []
    for user_data in users_collection.find():
        user_data["_id"] = str(user_data["_id"])
        
        # Calculate stats
        username = user_data.get("username")
        total_prs = pull_requests_collection.count_documents({"username": username})
        merged_prs = pull_requests_collection.count_documents({"username": username, "status": "merged"})
        
        user_data["contribution_stats"] = {
            "total_prs": total_prs,
            "merged_prs": merged_prs
        }
        
        users.append(User(**user_data))
    return users

@router.delete("/users/{username}")
async def delete_user(username: str, current_user: User = Depends(get_current_admin_user)):
    if username == current_user.username:
        raise HTTPException(status_code=400, detail="Cannot delete your own account")
        
    result = users_collection.delete_one({"username": username})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="User not found")
    
    return {"status": "success", "message": f"User {username} deleted"}

# Invitation Management
@router.post("/admin/invites", response_model=InvitationCode)
async def generate_invite(current_user: User = Depends(get_current_admin_user)):
    code = secrets.token_hex(4).upper() # 8 chars
    invite_data = {
        "code": code,
        "created_by": current_user.username,
        "is_used": False,
        "created_at": datetime.utcnow()
    }
    invitation_codes_collection.insert_one(invite_data)
    return InvitationCode(**invite_data)

@router.get("/admin/invites", response_model=List[InvitationCode])
async def list_invites(current_user: User = Depends(get_current_admin_user)):
    invites = []
    for inv in invitation_codes_collection.find().sort("created_at", -1):
        if "_id" in inv:
            del inv["_id"] # Model doesn't have ID for now
        invites.append(InvitationCode(**inv))
    return invites
