from pydantic import BaseModel
from typing import Optional
from datetime import datetime
import uuid

class NotificationCreate(BaseModel):
    user_id: Optional[uuid.UUID] = None
    title: str
    type: str = "info"  # info, warning, success, danger
    time: str

class NotificationUpdate(BaseModel):
    unread: Optional[bool] = None

class NotificationResponse(BaseModel):
    id: uuid.UUID
    user_id: Optional[uuid.UUID] = None
    title: str
    type: str
    time: str
    unread: bool
    created_at: datetime

    class Config:
        from_attributes = True
