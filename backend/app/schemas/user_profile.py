from pydantic import BaseModel
from typing import Optional, List
from app.schemas.user import UserResponse
from app.schemas.asset import AssetResponse
from app.schemas.ticket import TicketResponse
from app.schemas.audit_log import AuditLogResponse

class UserFullProfileResponse(BaseModel):
    user: UserResponse
    assigned_assets: List[AssetResponse]
    tickets: List[TicketResponse]
    last_login: Optional[AuditLogResponse] = None
