from fastapi import APIRouter, Depends, Query, HTTPException, status
from app.dependencies import get_db, get_current_user, RoleChecker
from app.models.user import User
from app.services.user import user_service, generate_temp_password, get_password_hash
from app.repositories.user import user_repository
from app.schemas.base import ApiResponse, PaginatedData
from app.schemas.user import UserResponse, UserCreate, UserUpdate
from app.schemas.user_profile import UserFullProfileResponse
from app.email.email import email_service
from app.database import utcnow_str
from typing import Optional, List

router = APIRouter(prefix="/users", tags=["Users / Employees"])


@router.get("", response_model=ApiResponse[PaginatedData[UserResponse]])
async def list_users(
    db=Depends(get_db),
    current_user: User = Depends(get_current_user),
    page: int = Query(1, ge=1),
    limit: int = Query(15, ge=1, le=10000),
    sort_by: Optional[str] = Query(None),
    sort_desc: bool = Query(False),
    search: Optional[str] = Query(None),
    role: Optional[str] = Query(None),
    department: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
):
    filters = {}
    if role:
        filters["role"] = role
    if department:
        filters["department"] = department
    if status:
        filters["status"] = status

    search_fields = ["name", "email", "display_id"]

    items, total = await user_repository.get_multi_paginated(
        page=page, limit=limit, sort_by=sort_by, sort_desc=sort_desc,
        search=search, search_fields=search_fields, filters=filters,
    )

    user_schemas = [UserResponse.model_validate(item) for item in items]

    return ApiResponse(
        success=True,
        message="Users listed successfully",
        data=PaginatedData(
            items=user_schemas,
            total=total,
            page=page,
            limit=limit,
        ),
    )


@router.get("/{user_id}", response_model=ApiResponse[UserResponse])
async def get_user(
    user_id: str,
    db=Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    user = await user_repository.get(user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return ApiResponse(
        success=True,
        message="User details loaded",
        data=UserResponse.model_validate(user),
    )


@router.post("", response_model=ApiResponse[UserResponse])
async def create_user(
    user_in: UserCreate,
    db=Depends(get_db),
    admin_user: User = Depends(RoleChecker(["admin"])),
):
    user = await user_service.create_user(user_in, admin_user.name)
    return ApiResponse(
        success=True,
        message="Employee account initialized successfully",
        data=UserResponse.model_validate(user),
    )


@router.patch("/{user_id}", response_model=ApiResponse[UserResponse])
async def update_user(
    user_id: str,
    user_in: UserUpdate,
    db=Depends(get_db),
    admin_user: User = Depends(RoleChecker(["admin"])),
):
    user = await user_service.update_user(user_id, user_in, admin_user.name)
    return ApiResponse(
        success=True,
        message="Employee record updated successfully",
        data=UserResponse.model_validate(user),
    )


@router.delete("/{user_id}", response_model=ApiResponse[UserResponse])
async def delete_user(
    user_id: str,
    db=Depends(get_db),
    admin_user: User = Depends(RoleChecker(["admin"])),
):
    user_dict = await user_service.delete_user(user_id, admin_user.name)
    return ApiResponse(
        success=True,
        message="Employee deleted successfully",
        data=UserResponse.model_validate(user_dict),
    )


@router.post("/{user_id}/reset-password", response_model=ApiResponse[None])
async def admin_reset_password(
    user_id: str,
    db=Depends(get_db),
    admin_user: User = Depends(RoleChecker(["admin"])),
):
    user = await user_repository.get(user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    temp_pwd = generate_temp_password()
    await user_repository.update(user_id, {
        "password_hash": get_password_hash(temp_pwd),
        "must_change_password": True,
        "updated_at": utcnow_str(),
    })

    await email_service.send_temporary_password_email(
        name=user.name,
        email=user.email,
        temp_password=temp_pwd,
        role=user.role,
        login_url="http://localhost:5173/login",
    )

    return ApiResponse(
        success=True,
        message="Temporary password generated and sent to employee",
    )


@router.post("/{user_id}/toggle-status", response_model=ApiResponse[UserResponse])
async def toggle_active(
    user_id: str,
    db=Depends(get_db),
    admin_user: User = Depends(RoleChecker(["admin"])),
):
    user = await user_repository.get(user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    new_status = "Inactive" if user.status == "Active" else "Active"
    await user_repository.update(user_id, {
        "status": new_status,
        "updated_at": utcnow_str(),
    })

    user.status = new_status
    return ApiResponse(
        success=True,
        message="Employee status toggled",
        data=UserResponse.model_validate(user),
    )


@router.get("/recent", response_model=ApiResponse[List[UserResponse]])
async def get_recent_employees(
    db=Depends(get_db),
    admin_user: User = Depends(RoleChecker(["admin"])),
):
    users = await user_service.get_recent_users(limit=10)
    return ApiResponse(
        success=True,
        message="Recent employees retrieved",
        data=[UserResponse.model_validate(u) for u in users],
    )


@router.get("/{user_id}/full-profile", response_model=ApiResponse[UserFullProfileResponse])
async def get_employee_full_profile(
    user_id: str,
    db=Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.role != "admin" and str(current_user.id) != user_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")

    profile = await user_service.get_full_profile(user_id)
    return ApiResponse(
        success=True,
        message="Full profile data retrieved successfully",
        data=profile,
    )
