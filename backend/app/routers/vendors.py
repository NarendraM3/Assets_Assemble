from fastapi import APIRouter, Depends, Query, status
from app.dependencies import get_db, get_current_user, RoleChecker
from app.models.user import User
from app.repositories.vendor import vendor_repository
from app.schemas.base import ApiResponse, PaginatedData
from app.schemas.vendor import VendorResponse, VendorCreate
from app.database import generate_id, utcnow_str
from typing import Optional
import secrets

router = APIRouter(prefix="/vendors", tags=["Vendors"])


@router.get("", response_model=ApiResponse[PaginatedData[VendorResponse]])
async def list_vendors(
    db=Depends(get_db),
    current_user: User = Depends(get_current_user),
    page: int = Query(1, ge=1),
    limit: int = Query(15, ge=1, le=10000),
    sort_by: Optional[str] = Query(None),
    sort_desc: bool = Query(False),
    search: Optional[str] = Query(None),
):
    search_fields = ["name", "contact", "email", "category", "display_id"]

    items, total = await vendor_repository.get_multi_paginated(
        page=page, limit=limit, sort_by=sort_by, sort_desc=sort_desc,
        search=search, search_fields=search_fields,
    )

    schemas = [VendorResponse.model_validate(item) for item in items]

    return ApiResponse(
        success=True,
        message="Vendors loaded successfully",
        data=PaginatedData(
            items=schemas,
            total=total,
            page=page,
            limit=limit,
        ),
    )


@router.post("", response_model=ApiResponse[VendorResponse])
async def create_vendor(
    vendor_in: VendorCreate,
    db=Depends(get_db),
    current_user: User = Depends(RoleChecker(["admin", "asset_manager"])),
):
    count = len(await vendor_repository.get_all())
    display_id = f"VND-{100 + count}"

    vendor_data = vendor_in.model_dump()
    vendor_data.update({
        "id": generate_id(),
        "display_id": display_id,
        "created_at": utcnow_str(),
        "updated_at": utcnow_str(),
        "is_active": True,
    })

    vendor = await vendor_repository.create(vendor_data)

    return ApiResponse(
        success=True,
        message="Vendor created successfully",
        data=VendorResponse.model_validate(vendor),
    )
