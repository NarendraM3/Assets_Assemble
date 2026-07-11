from pydantic import BaseModel
from typing import List, Dict, Any
from app.schemas.audit_log import AuditLogResponse

class DashboardStats(BaseModel):
    total_users: int
    total_employees: int
    total_assets: int
    assigned_assets: int
    available_assets: int
    returned_assets: int  # count of returned assignments
    pending_tickets: int
    recent_activities: List[AuditLogResponse]
