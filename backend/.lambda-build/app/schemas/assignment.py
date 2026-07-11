from pydantic import BaseModel
from typing import Optional
from datetime import datetime
import uuid

class AssignmentCreate(BaseModel):
    asset_id: uuid.UUID
    employee_id: uuid.UUID
    assigned_date: str
    expected_return: Optional[str] = None

class AssignmentUpdate(BaseModel):
    return_date: Optional[str] = None
    status: Optional[str] = None  # Active, Returned, Transferred

class AssignmentResponse(BaseModel):
    id: uuid.UUID
    display_id: str
    asset_id: uuid.UUID
    employee_id: uuid.UUID
    assigned_date: str
    return_date: Optional[str] = None
    expected_return: Optional[str] = None
    status: str
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
