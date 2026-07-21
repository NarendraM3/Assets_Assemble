from fastapi import APIRouter, Depends, HTTPException, status
from app.dependencies import get_db, get_current_user, RoleChecker
from app.models.user import User
from app.repositories.user import user_repository
from app.repositories.asset import asset_repository
from app.repositories.audit_log import audit_log_repository
from app.repositories.notification import notification_repository
from app.schemas.base import ApiResponse
from app.schemas.user import UserResponse
from app.database import generate_id, utcnow_str, today_str
from datetime import datetime
from typing import Dict, Any
import secrets

router = APIRouter(prefix="/support", tags=["IT Support"])

def _parse_payload(payload: Dict[str, Any]) -> tuple:
    remarks = str(payload.get("remarks", ""))
    actor = str(payload.get("actor", "IT Support Team"))
    return remarks, actor


@router.post("/onboarding/{employee_id}/complete", response_model=ApiResponse[UserResponse])
async def mark_onboarding_complete(
    employee_id: str,
    payload: Dict[str, Any],
    db=Depends(get_db),
    current_user: User = Depends(RoleChecker(["admin", "it_support_team"])),
):
    user = await user_repository.get(employee_id)
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Employee not found")

    remarks, actor = _parse_payload(payload)
    stamp = datetime.now().strftime("%b %d, %Y %I:%M %p")

    history = list(user.allocation_history or [])
    history.append({
        "step": "Assigned to IT Support",
        "timestamp": stamp,
        "actor": actor,
        "remarks": "Record moved to IT Support queue for allocation.",
    })
    history.append({
        "step": "Completed",
        "timestamp": stamp,
        "actor": actor,
        "remarks": remarks or "Allocation completed by IT Support.",
    })

    allocated_details = {
        "assetId": "N/A",
        "assetName": "Marked Complete (No Asset)",
        "serialNumber": "N/A",
        "assignedAt": stamp,
        "assignedBy": actor,
        "remarks": remarks or "Completed without asset allocation.",
    }

    await user_repository.update(employee_id, {
        "allocation_status": "Completed",
        "verification_status": "Completed",
        "allocation_history": history,
        "allocated_asset_details": allocated_details,
        "updated_at": utcnow_str(),
    })

    await audit_log_repository.create({
        "id": generate_id(),
        "display_id": f"LOG-IT{secrets.randbelow(1000)}",
        "action": "IT Support Marked Complete",
        "user": actor,
        "target": user.display_id,
        "timestamp": today_str(),
        "ip": "127.0.0.1",
        "created_at": utcnow_str(),
        "updated_at": utcnow_str(),
        "is_active": True,
    })

    user.allocation_status = "Completed"
    user.allocation_history = history
    user.allocated_asset_details = allocated_details
    return ApiResponse(
        success=True,
        message="Onboarding marked as completed",
        data=UserResponse.model_validate(user),
    )


@router.post("/onboarding/{employee_id}/review", response_model=ApiResponse[UserResponse])
async def review_onboarding(
    employee_id: str,
    payload: Dict[str, Any],
    db=Depends(get_db),
    current_user: User = Depends(RoleChecker(["admin", "it_support_team"])),
):
    user = await user_repository.get(employee_id)
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Employee not found")

    action = payload.get("action", "")
    comments = str(payload.get("comments", ""))
    reject_reason = str(payload.get("rejectReason", ""))

    if action not in ("approve", "reject"):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Action must be 'approve' or 'reject'")

    if not comments.strip():
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Comments are required")

    if action == "reject" and not reject_reason:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Reject reason is required")

    stamp = datetime.now().strftime("%b %d, %Y %I:%M %p")
    history = list(user.allocation_history or [])

    if action == "approve":
        new_status = "Approved by IT Support"
        history.append({
            "step": "Approved by IT Support",
            "timestamp": stamp,
            "actor": current_user.name,
            "remarks": comments,
        })
    else:
        new_status = "Rejected by IT Support"
        history.append({
            "step": "Rejected by IT Support",
            "timestamp": stamp,
            "actor": current_user.name,
            "remarks": f"Reason: {reject_reason}. Comments: {comments}",
        })

    update_data = {
        "allocation_status": new_status,
        "allocation_history": history,
        "updated_at": utcnow_str(),
    }

    if action == "reject":
        update_data["verification_status"] = "Rejected"
        update_data["allocated_asset_details"] = {
            "rejectReason": reject_reason,
            "comments": comments,
            "rejectedBy": current_user.name,
            "rejectedAt": stamp,
        }

    await user_repository.update(employee_id, update_data)

    await audit_log_repository.create({
        "id": generate_id(),
        "display_id": f"LOG-RV{secrets.randbelow(1000)}",
        "action": f"Onboarding {action}d",
        "user": current_user.name,
        "target": user.display_id,
        "timestamp": today_str(),
        "ip": "127.0.0.1",
        "created_at": utcnow_str(),
        "updated_at": utcnow_str(),
        "is_active": True,
    })

    user.allocation_status = new_status
    user.allocation_history = history
    return ApiResponse(
        success=True,
        message=f"Onboarding request {action}d successfully",
        data=UserResponse.model_validate(user),
    )


@router.post("/onboarding/{employee_id}/notes", response_model=ApiResponse[UserResponse])
async def add_onboarding_note(
    employee_id: str,
    payload: Dict[str, Any],
    db=Depends(get_db),
    current_user: User = Depends(RoleChecker(["admin", "it_support_team", "asset_manager"])),
):
    user = await user_repository.get(employee_id)
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Employee not found")

    remarks, actor = _parse_payload(payload)
    if not remarks:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Remarks/notes cannot be empty")

    stamp = datetime.now().strftime("%b %d, %Y %I:%M %p")
    history = list(user.allocation_history or [])
    history.append({
        "step": "Note Added",
        "timestamp": stamp,
        "actor": actor,
        "remarks": remarks,
    })

    await user_repository.update(employee_id, {
        "allocation_history": history,
        "updated_at": utcnow_str(),
    })

    user.allocation_history = history
    return ApiResponse(
        success=True,
        message="Note added successfully",
        data=UserResponse.model_validate(user),
    )
