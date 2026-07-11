from fastapi import APIRouter, Depends, Query
from app.dependencies import get_db, RoleChecker
from app.models.user import User
from app.repositories.audit_log import audit_log_repository
from app.schemas.base import ApiResponse, PaginatedData
from app.schemas.audit_log import AuditLogResponse
from typing import Optional

router = APIRouter(prefix="/audit-logs", tags=["Audit Logs"])


@router.get("", response_model=ApiResponse[PaginatedData[AuditLogResponse]])
async def list_audit_logs(
    db=Depends(get_db),
    admin_user: User = Depends(RoleChecker(["admin"])),
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=10000),
    sort_by: Optional[str] = Query(None),
    sort_desc: bool = Query(False),
    search: Optional[str] = Query(None),
):
    search_fields = ["action", "user", "target", "ip", "display_id"]

    items, total = await audit_log_repository.get_multi_paginated(
        page=page, limit=limit, sort_by=sort_by, sort_desc=sort_desc,
        search=search, search_fields=search_fields,
    )

    schemas = [AuditLogResponse.model_validate(item) for item in items]

    return ApiResponse(
        success=True,
        message="Audit logs loaded",
        data=PaginatedData(
            items=schemas,
            total=total,
            page=page,
            limit=limit,
        ),
    )
