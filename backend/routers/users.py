from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from typing import List
from datetime import timedelta
from auth import (
    get_current_active_user,
    get_current_admin_user,
    create_access_token,
    get_password_hash,
    verify_password,
    ACCESS_TOKEN_EXPIRE_MINUTES
)
from database import users_collection
from models import User, UserCreate, Token, UserInDB

router = APIRouter()

@router.post("/token", response_model=Token)
async def login_for_access_token(form_data: OAuth2PasswordRequestForm = Depends()):
    user_dict = users_collection.find_one({"username": form_data.username})
    if not user_dict or not verify_password(form_data.password, user_dict["hashed_password"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user_dict["username"]}, expires_delta=access_token_expires
    )
    return {"access_token": access_token, "token_type": "bearer"}

@router.get("/users/me", response_model=User)
async def read_users_me(current_user: User = Depends(get_current_active_user)):
    return current_user

@router.post("/users", response_model=User)
async def create_user(user: UserCreate, current_user: User = Depends(get_current_admin_user)):
    if users_collection.find_one({"username": user.username}):
        raise HTTPException(status_code=400, detail="Username already registered")
    
    hashed_password = get_password_hash(user.password)
    user_in_db = UserInDB(**user.dict(), hashed_password=hashed_password)
    
    # Exclude password from storage (UserInDB has hashed_password)
    user_dict = user_in_db.dict(exclude={"password"})
    # But wait, UserInDB doesn't have 'password' field, UserCreate does.
    # user_in_db is created from user.dict() but UserInDB definition doesn't have password.
    # Let's fix this logic.
    
    user_data = user.dict()
    del user_data['password']
    user_data['hashed_password'] = hashed_password
    
    result = users_collection.insert_one(user_data)
    created_user = users_collection.find_one({"_id": result.inserted_id})
    created_user["_id"] = str(created_user["_id"])
    
    return User(**created_user)

@router.get("/users", response_model=List[User])
async def read_users(current_user: User = Depends(get_current_admin_user)):
    users = []
    for user_data in users_collection.find():
        user_data["_id"] = str(user_data["_id"])
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
