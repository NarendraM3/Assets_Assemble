from pydantic import BaseModel, EmailStr, Field
from typing import Optional, List, Dict, Any
from datetime import datetime
import uuid

class UserBase(BaseModel):
    name: str
    email: EmailStr
    role: str  # employee, support, asset_manager, admin
    department: Optional[str] = None
    designation: Optional[str] = None
    manager: Optional[str] = None
    location: Optional[str] = None
    status: str = "Active"
    phone: Optional[str] = None
    join_date: Optional[str] = None

class UserCreate(UserBase):
    allocation_date: Optional[str] = None
    allocation_time: Optional[str] = None
    required_asset_category: Optional[str] = None

class UserUpdate(BaseModel):
    name: Optional[str] = None
    email: Optional[EmailStr] = None
    role: Optional[str] = None
    department: Optional[str] = None
    designation: Optional[str] = None
    manager: Optional[str] = None
    location: Optional[str] = None
    status: Optional[str] = None
    phone: Optional[str] = None
    join_date: Optional[str] = None
    allocation_date: Optional[str] = None
    allocation_time: Optional[str] = None
    required_asset_category: Optional[str] = None
    must_change_password: Optional[bool] = None

class UserResponse(UserBase):
    id: uuid.UUID
    display_id: str
    avatar: Optional[str] = None
    must_change_password: bool
    allocation_date: Optional[str] = None
    allocation_time: Optional[str] = None
    allocation_status: Optional[str] = None
    required_asset_category: Optional[str] = None
    allocated_asset_details: Optional[Dict[str, Any]] = None
    allocation_history: Optional[List[Dict[str, Any]]] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class TokenResponseData(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    user: UserResponse

class ChangePasswordRequest(BaseModel):
    old_password: str
    new_password: str = Field(..., min_length=6)

class ForceChangePasswordRequest(BaseModel):
    new_password: str = Field(..., min_length=6)

class ResetPasswordRequest(BaseModel):
    email: EmailStr
