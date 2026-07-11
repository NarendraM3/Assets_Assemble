from pydantic import BaseModel
from datetime import datetime
import uuid

class KnowledgeBaseResponse(BaseModel):
    id: uuid.UUID
    display_id: str
    title: str
    category: str
    views: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
