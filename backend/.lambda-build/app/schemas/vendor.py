from pydantic import BaseModel, EmailStr
from typing import Optional
from datetime import datetime
import uuid

class VendorBase(BaseModel):
    name: str
    contact: str
    email: EmailStr
    phone: str
    category: str
    status: str = "Active"  # Active, Inactive
    contract_end: str

class VendorCreate(VendorBase):
    pass

class VendorUpdate(BaseModel):
    name: Optional[str] = None
    contact: Optional[str] = None
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    category: Optional[str] = None
    status: Optional[str] = None
    contract_end: Optional[str] = None

class VendorResponse(VendorBase):
    id: uuid.UUID
    display_id: str
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
