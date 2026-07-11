from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime
import uuid

class TicketCommentCreate(BaseModel):
    message: str = Field(..., min_length=1)

class TicketCommentResponse(BaseModel):
    id: uuid.UUID
    ticket_id: uuid.UUID
    author_name: str
    message: str
    created_at: datetime

    class Config:
        from_attributes = True

class TicketCreate(BaseModel):
    title: str = Field(..., min_length=5, max_length=120)
    description: str = Field(..., min_length=15, max_length=2000)
    priority: str  # Low, Medium, High, Critical
    category: str
    asset_id: Optional[uuid.UUID] = None
    attachments: Optional[List[str]] = None

class TicketUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    priority: Optional[str] = None
    category: Optional[str] = None
    status: Optional[str] = None
    assignee_id: Optional[uuid.UUID] = None
    asset_id: Optional[uuid.UUID] = None
    support_resolution: Optional[str] = None
    admin_remarks: Optional[str] = None
    asset_action: Optional[str] = None
    asset_details: Optional[str] = None
    asset_remarks: Optional[str] = None
    asset_resolution: Optional[str] = None
    assigned_role: Optional[str] = None

class TicketResolveAsset(BaseModel):
    action: str  # Repair, Replace, Reassign
    asset_details: str
    remarks: str
    resolution: str

class TicketReviewEscalation(BaseModel):
    approved: bool
    remarks: str

class TicketResponse(BaseModel):
    id: uuid.UUID
    display_id: str
    title: str
    description: str
    priority: str
    category: str
    status: str
    created_by_id: uuid.UUID
    assignee_id: Optional[uuid.UUID] = None
    asset_id: Optional[uuid.UUID] = None
    sla: str
    support_resolution: Optional[str] = None
    admin_remarks: Optional[str] = None
    asset_action: Optional[str] = None
    asset_details: Optional[str] = None
    asset_remarks: Optional[str] = None
    asset_resolution: Optional[str] = None
    assigned_role: Optional[str] = None
    timeline: Optional[List[Dict[str, Any]]] = None
    audit_trail: Optional[List[Dict[str, Any]]] = None
    attachments: Optional[List[str]] = None
    comments: List[TicketCommentResponse] = []
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
