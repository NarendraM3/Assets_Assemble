from fastapi import APIRouter, Depends, HTTPException, Query, status
from app.dependencies import get_db, get_current_user, RoleChecker
from app.services.user import user_service, generate_temp_password, get_password_hash
from app.schemas.employee_registration import AdminEmployeeRegistration, RegistrationResponse
from app.schemas.base import ApiResponse, PaginatedData
from app.schemas.user import UserCreate, UserResponse
from app.repositories.user import user_repository
from app.models.user import User
from app.database import generate_id, utcnow_str
from typing import Optional

router = APIRouter(prefix="/admin/employees", tags=["Admin / Employees"])


@router.get("", response_model=ApiResponse[PaginatedData[UserResponse]])
async def list_employees(
    db=Depends(get_db),
    current_user: User = Depends(get_current_user),
    limit: int = Query(10000, ge=1, le=10000),
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
        page=1, limit=limit, sort_by=None, sort_desc=False,
        search=None, search_fields=search_fields, filters=filters,
    )

    user_schemas = [UserResponse.model_validate(item) for item in items]

    return ApiResponse(
        success=True,
        message="Employees listed successfully",
        data=PaginatedData(
            items=user_schemas,
            total=total,
            page=1,
            limit=limit,
        ),
    )


@router.post("/register", response_model=ApiResponse[RegistrationResponse])
async def register_employee(
    payload: AdminEmployeeRegistration,
    db=Depends(get_db),
    admin_user: User = Depends(RoleChecker(["admin"])),
):
    name = f"{payload.FirstName.strip()} {payload.LastName.strip()}"

    user_in = UserCreate(
        name=name,
        email=payload.Email,
        role=payload.Role,
        department=payload.Department,
        designation=payload.Designation,
        manager=payload.Manager,
        location=payload.Location,
        status=payload.Status,
        phone=payload.Phone,
        join_date=payload.JoinDate,
        allocation_date=payload.AllocationDate,
        allocation_time=payload.AllocationTime,
        required_asset_category=payload.RequiredHardwareCategory,
    )

    user, temp_pwd = await user_service.create_user_detailed(user_in, admin_user.name)

    return ApiResponse(
        success=True,
        message="Employee registered successfully",
        data=RegistrationResponse(
            EmployeeId=user.display_id,
            TemporaryPassword=temp_pwd,
            Note="Please share this temporary password with the employee securely.",
        ),
    )
