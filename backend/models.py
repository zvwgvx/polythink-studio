from pydantic import BaseModel, Field, EmailStr
from typing import Optional, List, Dict, Any
from datetime import datetime
from bson import ObjectId

class PyObjectId(ObjectId):
    @classmethod
    def __get_validators__(cls):
        yield cls.validate

    @classmethod
    def validate(cls, v, handler):
        if not ObjectId.is_valid(v):
            raise ValueError("Invalid ObjectId")
        return ObjectId(v)

    @classmethod
    def __get_pydantic_json_schema__(cls, core_schema, handler):
        return {"type": "string"}

class User(BaseModel):
    id: Optional[PyObjectId] = Field(None, alias="_id")
    username: str
    email: Optional[EmailStr] = None
    full_name: Optional[str] = None
    contribution_stats: Optional[dict] = None
    sample_stats: Optional[dict] = Field(default_factory=lambda: {"accepted": 0, "rejected": 0})
    role: str = "user"
    is_active: bool = False  # Default to False until verified
    email_verified: bool = False
    verification_code: Optional[str] = None
    hashed_password: Optional[str] = None
    otp_code: Optional[str] = None
    otp_created_at: Optional[datetime] = None
    reset_code: Optional[str] = None

    class Config:
        allow_population_by_field_name = True
        arbitrary_types_allowed = True
        json_encoders = {ObjectId: str}
        schema_extra = {
            "example": {
                "username": "johndoe",
                "email": "johndoe@example.com",
                "full_name": "John Doe",
                "role": "user",
                "is_active": False,
                "email_verified": False,
                "verification_code": "123456"
            }
        }

class UserInDB(User):
    hashed_password: str

class UserCreate(BaseModel):
    username: str
    email: EmailStr
    full_name: str
    invitation_code: str

class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    username: Optional[str] = None

class InvitationCode(BaseModel):
    code: str
    created_by: str
    is_used: bool = False
    used_by: Optional[str] = None
    created_at: datetime = datetime.utcnow()
    expires_at: Optional[datetime] = None

class UserDataset(BaseModel):
    id: Optional[str] = Field(None, alias="_id")
    username: str
    original_path: str # e.g. "multi-turn/dataset_1.json"
    content: List[Dict[str, Any]]
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    class Config:
        allow_population_by_field_name = True
        arbitrary_types_allowed = True
        json_encoders = {ObjectId: str}

class PullRequest(BaseModel):
    id: Optional[str] = Field(None, alias="_id")
    username: str
    dataset_path: str
    status: str = "open" # open, merged, rejected
    created_at: datetime = Field(default_factory=datetime.utcnow)
    description: Optional[str] = None
    accepted_count: int = 0
    rejected_count: int = 0

    class Config:
        allow_population_by_field_name = True
        arbitrary_types_allowed = True
        json_encoders = {ObjectId: str}

class DatasetContent(BaseModel):
    content: List[Dict[str, Any]]
