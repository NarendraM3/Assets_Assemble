from fastapi import APIRouter, Depends
from app.dependencies import get_db, get_current_user
from app.services.dashboard import dashboard_service
from app.schemas.base import ApiResponse
from app.schemas.dashboard import DashboardStats

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])


@router.get("/stats", response_model=ApiResponse[DashboardStats])
async def get_dashboard_statistics(
    db=Depends(get_db),
    current_user=Depends(get_current_user),
):
    stats = await dashboard_service.get_stats()
    return ApiResponse(
        success=True,
        message="Dashboard stats loaded",
        data=stats,
    )
