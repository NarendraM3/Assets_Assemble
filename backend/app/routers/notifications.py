from fastapi import APIRouter, Depends
from app.dependencies import get_db, get_current_user
from app.models.user import User
from app.repositories.notification import notification_repository
from app.schemas.base import ApiResponse
from app.schemas.notification import NotificationResponse
from typing import List

router = APIRouter(prefix="/notifications", tags=["Notifications"])


@router.get("", response_model=ApiResponse[List[NotificationResponse]])
async def list_notifications(
    db=Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    items = await notification_repository.get_by_user(str(current_user.id))
    schemas = [NotificationResponse.model_validate(item) for item in items]
    return ApiResponse(
        success=True,
        message="Notifications retrieved",
        data=schemas,
    )


@router.post("/mark-read", response_model=ApiResponse[None])
async def mark_all_as_read(
    db=Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    await notification_repository.mark_all_read(str(current_user.id))
    return ApiResponse(
        success=True,
        message="All notifications marked as read",
    )
