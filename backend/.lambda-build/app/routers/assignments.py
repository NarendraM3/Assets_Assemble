from fastapi import APIRouter, Depends, Query, HTTPException, status
from app.dependencies import get_db, get_current_user, RoleChecker
from app.models.user import User
from app.services.asset import asset_service
from app.repositories.assignment import assignment_repository
from app.schemas.base import ApiResponse, PaginatedData
from app.schemas.assignment import AssignmentResponse, AssignmentCreate
from typing import Optional

router = APIRouter(prefix="/assignments", tags=["Assignments"])


@router.get("", response_model=ApiResponse[PaginatedData[AssignmentResponse]])
async def list_assignments(
    db=Depends(get_db),
    current_user: User = Depends(get_current_user),
    page: int = Query(1, ge=1),
    limit: int = Query(15, ge=1, le=10000),
    sort_by: Optional[str] = Query(None),
    sort_desc: bool = Query(False),
    status_filter: Optional[str] = Query(None, alias="status"),
):
    filters = {}
    if status_filter:
        filters["status"] = status_filter

    items, total = await assignment_repository.get_multi_paginated(
        page=page, limit=limit, sort_by=sort_by, sort_desc=sort_desc,
        filters=filters,
    )

    schemas = [AssignmentResponse.model_validate(item) for item in items]

    return ApiResponse(
        success=True,
        message="Assignments listed successfully",
        data=PaginatedData(
            items=schemas,
            total=total,
            page=page,
            limit=limit,
        ),
    )


@router.post("", response_model=ApiResponse[AssignmentResponse])
async def create_assignment(
    assign_in: AssignmentCreate,
    db=Depends(get_db),
    current_user: User = Depends(RoleChecker(["admin", "support", "asset_manager"])),
):
    asg = await asset_service.assign_asset(assign_in, current_user.name)
    return ApiResponse(
        success=True,
        message="Asset assigned successfully",
        data=AssignmentResponse.model_validate(asg),
    )


@router.post("/{assignment_id}/return", response_model=ApiResponse[AssignmentResponse])
async def return_asset(
    assignment_id: str,
    db=Depends(get_db),
    current_user: User = Depends(RoleChecker(["admin", "support", "asset_manager"])),
):
    asg = await asset_service.return_asset(assignment_id, current_user.name)
    return ApiResponse(
        success=True,
        message="Asset return logged successfully",
        data=AssignmentResponse.model_validate(asg),
    )
