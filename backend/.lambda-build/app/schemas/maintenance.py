from pydantic import BaseModel
from typing import Optional
from datetime import datetime
import uuid

class MaintenanceBase(BaseModel):
    asset_id: uuid.UUID
    engineer: str
    date: str
    resolution: str
    parts: str
    cost: float
    status: str  # Completed, In Progress, Scheduled

class MaintenanceCreate(MaintenanceBase):
    pass

class MaintenanceUpdate(BaseModel):
    asset_id: Optional[uuid.UUID] = None
    engineer: Optional[str] = None
    date: Optional[str] = None
    resolution: Optional[str] = None
    parts: Optional[str] = None
    cost: Optional[float] = None
    status: Optional[str] = None

class MaintenanceResponse(MaintenanceBase):
    id: uuid.UUID
    display_id: str
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
