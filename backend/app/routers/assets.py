from fastapi import APIRouter, Depends, Query, HTTPException, status
from app.dependencies import get_db, get_current_user, RoleChecker
from app.models.user import User
from app.services.asset import asset_service
from app.repositories.asset import asset_repository
from app.schemas.base import ApiResponse, PaginatedData
from app.schemas.asset import AssetResponse, AssetCreate, AssetUpdate, BulkAssetCreate
from app.schemas.user import UserResponse
from typing import Optional, Dict, Any

router = APIRouter(prefix="/assets", tags=["Assets"])


@router.get("", response_model=ApiResponse[PaginatedData[AssetResponse]])
async def list_assets(
    db=Depends(get_db),
    current_user: User = Depends(get_current_user),
    page: int = Query(1, ge=1),
    limit: int = Query(15, ge=1, le=10000),
    sort_by: Optional[str] = Query(None),
    sort_desc: bool = Query(False),
    search: Optional[str] = Query(None),
    category: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    location: Optional[str] = Query(None),
    assigned_to_id: Optional[str] = Query(None),
):
    filters = {}
    if category and category != "all":
        filters["category"] = category
    if status and status != "all":
        filters["status"] = status
    if location:
        filters["location"] = location
    if assigned_to_id:
        filters["assigned_to_id"] = assigned_to_id

    search_fields = ["name", "serial", "model", "manufacturer", "display_id"]

    items, total = await asset_repository.get_multi_paginated(
        page=page, limit=limit, sort_by=sort_by, sort_desc=sort_desc,
        search=search, search_fields=search_fields, filters=filters,
    )

    schemas = [AssetResponse.model_validate(item) for item in items]

    return ApiResponse(
        success=True,
        message="Assets listed successfully",
        data=PaginatedData(
            items=schemas,
            total=total,
            page=page,
            limit=limit,
        ),
    )


@router.get("/{asset_id}", response_model=ApiResponse[AssetResponse])
async def get_asset(
    asset_id: str,
    db=Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    asset = await asset_repository.get(asset_id)
    if not asset:
        raise HTTPException(status_code=404, detail="Asset not found")
    return ApiResponse(
        success=True,
        message="Asset found",
        data=AssetResponse.model_validate(asset),
    )


@router.post("", response_model=ApiResponse[AssetResponse])
async def create_asset(
    asset_in: AssetCreate,
    db=Depends(get_db),
    current_user: User = Depends(RoleChecker(["admin", "asset_manager"])),
):
    asset = await asset_service.add_asset(asset_in, current_user.name)
    return ApiResponse(
        success=True,
        message="Asset created successfully",
        data=AssetResponse.model_validate(asset),
    )


@router.post("/bulk", response_model=ApiResponse[list[AssetResponse]])
async def create_assets_bulk(
    bulk_in: BulkAssetCreate,
    db=Depends(get_db),
    current_user: User = Depends(RoleChecker(["admin", "asset_manager"])),
):
    assets = await asset_service.add_bulk_assets(bulk_in.assets, current_user.name)
    schemas = [AssetResponse.model_validate(a) for a in assets]
    return ApiResponse(
        success=True,
        message=f"{len(schemas)} assets created successfully",
        data=schemas,
    )


@router.patch("/{asset_id}", response_model=ApiResponse[AssetResponse])
async def update_asset(
    asset_id: str,
    asset_in: AssetUpdate,
    db=Depends(get_db),
    current_user: User = Depends(RoleChecker(["admin", "asset_manager"])),
):
    asset = await asset_service.update_asset(asset_id, asset_in, current_user.name)
    return ApiResponse(
        success=True,
        message="Asset updated successfully",
        data=AssetResponse.model_validate(asset),
    )


@router.delete("/{asset_id}", response_model=ApiResponse[AssetResponse])
async def retire_asset(
    asset_id: str,
    db=Depends(get_db),
    current_user: User = Depends(RoleChecker(["admin", "asset_manager"])),
):
    asset = await asset_service.retire_asset(asset_id, current_user.name)
    return ApiResponse(
        success=True,
        message="Asset marked as retired",
        data=AssetResponse.model_validate(asset),
    )


@router.get("/onboarding/check-inventory/{employee_id}")
async def check_onboarding_inventory(
    employee_id: str,
    db=Depends(get_db),
    current_user: User = Depends(RoleChecker(["admin", "asset_manager"])),
):
    from app.repositories.user import user_repository

    user = await user_repository.get(employee_id)
    if not user:
        raise HTTPException(status_code=404, detail="Employee not found")

    category = user.required_asset_category or "Laptop"
    location = user.location or ""

    filters = {"status": "Available", "category": category}
    if location:
        filters["location"] = location

    items, total = await asset_repository.get_multi_paginated(
        page=1, limit=10000, filters=filters
    )

    asset_schemas = [AssetResponse.model_validate(item) for item in items]

    return ApiResponse(
        success=True,
        message="Inventory check completed",
        data={
            "available": len(asset_schemas) > 0,
            "count": len(asset_schemas),
            "assets": [s.model_dump() for s in asset_schemas],
        }
    )


@router.post("/onboarding/verify/{employee_id}", response_model=ApiResponse[UserResponse])
async def verify_onboarding_inventory(
    employee_id: str,
    payload: Dict[str, Any],
    db=Depends(get_db),
    current_user: User = Depends(RoleChecker(["admin", "asset_manager"])),
):
    approved = bool(payload.get("approved", False))
    remarks = str(payload.get("remarks", ""))

    updated_user = await asset_service.verify_onboarding(
        user_id=employee_id, approved=approved, remarks=remarks, actor=current_user.name,
    )
    return ApiResponse(
        success=True,
        message="Onboarding verification status updated",
        data=UserResponse.model_validate(updated_user),
    )


@router.post("/onboarding/allocate/{employee_id}", response_model=ApiResponse[UserResponse])
async def complete_onboarding_allocation(
    employee_id: str,
    payload: Dict[str, Any],
    db=Depends(get_db),
    current_user: User = Depends(RoleChecker(["admin", "support"])),
):
    asset_id_str = payload.get("asset_id")
    if not asset_id_str:
        raise HTTPException(status_code=400, detail="asset_id is required")

    remarks = str(payload.get("remarks", ""))

    updated_user = await asset_service.complete_onboarding(
        user_id=employee_id, asset_id=asset_id_str, remarks=remarks, actor=current_user.name,
    )
    return ApiResponse(
        success=True,
        message="Asset allocated and onboarding complete",
        data=UserResponse.model_validate(updated_user),
    )
