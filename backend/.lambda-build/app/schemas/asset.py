from pydantic import BaseModel
from typing import Optional
from datetime import datetime
import uuid

class AssetBase(BaseModel):
    name: str
    category: str
    manufacturer: str
    model: str
    serial: str
    purchase_date: str
    warranty_expiry: str
    location: str
    status: str  # Assigned, Available, Maintenance, Retired
    cost: float

class AssetCreate(AssetBase):
    assigned_to_id: Optional[uuid.UUID] = None

class AssetUpdate(BaseModel):
    name: Optional[str] = None
    category: Optional[str] = None
    manufacturer: Optional[str] = None
    model: Optional[str] = None
    serial: Optional[str] = None
    purchase_date: Optional[str] = None
    warranty_expiry: Optional[str] = None
    location: Optional[str] = None
    assigned_to_id: Optional[uuid.UUID] = None
    status: Optional[str] = None
    cost: Optional[float] = None

class AssetResponse(AssetBase):
    id: uuid.UUID
    display_id: str
    assigned_to_id: Optional[uuid.UUID] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
