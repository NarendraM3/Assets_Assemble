from pydantic import BaseModel
from datetime import datetime
import uuid

class AuditLogResponse(BaseModel):
    id: uuid.UUID
    display_id: str
    action: str
    user: str
    target: str
    timestamp: str
    ip: str
    created_at: datetime

    class Config:
        from_attributes = True
