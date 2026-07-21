from fastapi import APIRouter, Depends, HTTPException, status
from app.dependencies import get_db, get_current_user, RoleChecker
from app.models.user import User
from app.repositories.user import user_repository
from app.repositories.asset import asset_repository
from app.repositories.asset_assignment import asset_assignment_repository
from app.repositories.audit_log import audit_log_repository
from app.database import generate_id, utcnow_str, today_str
from app.schemas.base import ApiResponse
from typing import Dict, Any, List
import secrets

router = APIRouter(prefix="/asset-manager", tags=["Asset Manager"])


@router.get("")
async def list_assets(
    db=Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    items = await asset_repository.get_all()
    schemas = []
    for item in items:
        schemas.append({
            "AssetId": item.id,
            "assetId": item.id,
            "AssetName": item.name,
            "assetName": item.name,
            "AssetTag": getattr(item, "display_id", ""),
            "assetTag": getattr(item, "display_id", ""),
            "Category": item.category,
            "category": item.category,
            "Brand": getattr(item, "manufacturer", ""),
            "brand": getattr(item, "manufacturer", ""),
            "Model": item.model,
            "model": item.model,
            "SerialNumber": item.serial,
            "serialNumber": item.serial,
            "status": item.status,
            "Status": item.status,
            "assignedTo": getattr(item, "assigned_to_id", None),
            "AssignedTo": getattr(item, "assigned_to_id", None),
            "location": item.location,
            "Location": item.location,
            "purchaseDate": getattr(item, "purchase_date", ""),
            "PurchaseDate": getattr(item, "purchase_date", ""),
            "warrantyExpiry": getattr(item, "warranty_expiry", ""),
            "WarrantyExpiry": getattr(item, "warranty_expiry", ""),
            "createdAt": getattr(item, "created_at", ""),
            "CreatedAt": getattr(item, "created_at", ""),
            "updatedAt": getattr(item, "updated_at", ""),
            "UpdatedAt": getattr(item, "updated_at", ""),
        })
    return schemas


@router.get("/onboarding/pending")
async def list_pending_onboarding(
    db=Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    all_users = await user_repository.get_all()
    pending = [
        u for u in all_users
        if u.role == "employee"
        and u.allocation_status
        and u.allocation_status not in ("", "Completed")
        and u.is_active
    ]
    employees = []
    for u in pending:
        employees.append({
            "EmployeeId": u.display_id,
            "FirstName": (u.name or "").split(" ")[0] if u.name else "",
            "LastName": " ".join((u.name or "").split(" ")[1:]) if u.name and " " in u.name else u.name or "",
            "Email": u.email,
            "Department": u.department or "",
            "Role": u.role,
            "Designation": u.designation or "",
            "Location": u.location or "",
            "RequiredHardwareCategory": u.required_asset_category or "Laptop",
            "AllocationStatus": u.allocation_status,
            "VerificationStatus": u.verification_status or "Pending",
            "Status": u.status,
            "AllocationDate": u.allocation_date or "",
            "AllocationTime": u.allocation_time or "",
            "ApprovedBy": "",
            "ApprovalDate": "",
            "CreatedAt": u.join_date or u.created_at if hasattr(u, "created_at") else "",
            "JoiningDate": u.join_date or "",
            "AssignedAssetId": (u.allocated_asset_details or {}).get("assetId", "") if hasattr(u, "allocated_asset_details") else "",
            "OnboardingStatus": u.allocation_status or "",
            "CurrentWorkflowState": u.allocation_status or "",
            "InventoryVerified": u.verification_status == "Verified" if hasattr(u, "verification_status") else False,
        })
    return {"employees": employees}


@router.get("/assignments")
async def list_assignments(
    db=Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    items = await asset_assignment_repository.get_all()
    result = []
    for item in items:
        result.append({
            "AssignmentId": item.AssignmentId if hasattr(item, "AssignmentId") else item.id,
            "EmployeeId": item.EmployeeId if hasattr(item, "EmployeeId") else "",
            "EmployeeName": item.EmployeeName if hasattr(item, "EmployeeName") else "",
            "AssetId": item.AssetId if hasattr(item, "AssetId") else "",
            "AssetTag": item.AssetTag if hasattr(item, "AssetTag") else "",
            "AssetName": item.AssetName if hasattr(item, "AssetName") else "",
            "Department": item.Department if hasattr(item, "Department") else "",
            "AssignedBy": item.AssignedBy if hasattr(item, "AssignedBy") else "",
            "AssignedRole": item.AssignedRole if hasattr(item, "AssignedRole") else "",
            "AssignedDate": item.AssignedDate if hasattr(item, "AssignedDate") else "",
            "Status": item.Status if hasattr(item, "Status") else "",
            "Comments": item.Comments if hasattr(item, "Comments") else "",
        })
    return {"data": result}


@router.post("/assignments")
async def create_assignment(
    payload: Dict[str, Any],
    db=Depends(get_db),
    current_user: User = Depends(RoleChecker(["admin", "it_support_team", "asset_manager"])),
):
    assignment_id = f"ASG-{3000 + secrets.randbelow(9000)}"
    record = {
        "id": generate_id(),
        "AssignmentId": assignment_id,
        "EmployeeId": payload.get("EmployeeId", ""),
        "EmployeeName": payload.get("EmployeeName", ""),
        "AssetId": payload.get("AssetId", ""),
        "AssetTag": payload.get("AssetTag", ""),
        "AssetName": payload.get("AssetName", ""),
        "Department": payload.get("Department", ""),
        "AssignedBy": payload.get("AssignedBy", current_user.name),
        "AssignedRole": payload.get("AssignedRole", "IT Support Team"),
        "AssignedDate": today_str(),
        "Status": payload.get("Status", "Assigned"),
        "Comments": payload.get("Comments", ""),
        "created_at": utcnow_str(),
        "updated_at": utcnow_str(),
        "is_active": True,
    }
    created = await asset_assignment_repository.create(record)

    await audit_log_repository.create({
        "id": generate_id(),
        "display_id": f"LOG-AA{secrets.randbelow(1000)}",
        "action": "Asset Assignment Created",
        "user": current_user.name,
        "target": assignment_id,
        "timestamp": today_str(),
        "ip": "127.0.0.1",
        "created_at": utcnow_str(),
        "updated_at": utcnow_str(),
        "is_active": True,
    })

    return {
        "AssignmentId": assignment_id,
        "EmployeeId": record["EmployeeId"],
        "EmployeeName": record["EmployeeName"],
        "AssetId": record["AssetId"],
        "AssetTag": record["AssetTag"],
        "AssetName": record["AssetName"],
        "Department": record["Department"],
        "AssignedBy": record["AssignedBy"],
        "AssignedRole": record["AssignedRole"],
        "AssignedDate": record["AssignedDate"],
        "Status": record["Status"],
        "Comments": record["Comments"],
    }


@router.patch("/{asset_id}/assign")
async def assign_asset(
    asset_id: str,
    payload: Dict[str, Any],
    db=Depends(get_db),
    current_user: User = Depends(RoleChecker(["admin", "it_support_team", "asset_manager"])),
):
    asset = await asset_repository.get_raw(asset_id)
    if not asset:
        asset = await asset_repository.get(asset_id)
    if not asset:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Asset not found")

    assigned_to = payload.get("assignedTo", payload.get("assigned_to", ""))
    asset_status = payload.get("status", "Assigned")

    update_data = {
        "status": asset_status,
        "assigned_to_id": assigned_to or None,
        "updated_at": utcnow_str(),
    }
    await asset_repository.update(asset.id, update_data)

    await audit_log_repository.create({
        "id": generate_id(),
        "display_id": f"LOG-AAS{secrets.randbelow(1000)}",
        "action": "Asset Assigned",
        "user": current_user.name,
        "target": f"{asset.display_id} -> {assigned_to}",
        "timestamp": today_str(),
        "ip": "127.0.0.1",
        "created_at": utcnow_str(),
        "updated_at": utcnow_str(),
        "is_active": True,
    })

    return {"success": True, "message": "Asset assigned successfully"}


@router.patch("/{asset_id}/retire")
async def retire_asset(
    asset_id: str,
    db=Depends(get_db),
    current_user: User = Depends(RoleChecker(["admin", "asset_manager"])),
):
    asset = await asset_repository.get_raw(asset_id)
    if not asset:
        asset = await asset_repository.get(asset_id)
    if not asset:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Asset not found")

    await asset_repository.update(asset.id, {
        "status": "Retired",
        "assigned_to_id": None,
        "updated_at": utcnow_str(),
    })

    await audit_log_repository.create({
        "id": generate_id(),
        "display_id": f"LOG-ART{secrets.randbelow(1000)}",
        "action": "Asset Retired",
        "user": current_user.name,
        "target": asset.display_id,
        "timestamp": today_str(),
        "ip": "127.0.0.1",
        "created_at": utcnow_str(),
        "updated_at": utcnow_str(),
        "is_active": True,
    })

    return {"success": True, "message": "Asset retired successfully"}
