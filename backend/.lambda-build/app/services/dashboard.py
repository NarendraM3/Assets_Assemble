from app.repositories.user import user_repository
from app.repositories.asset import asset_repository
from app.repositories.assignment import assignment_repository
from app.repositories.ticket import ticket_repository
from app.repositories.audit_log import audit_log_repository
from app.schemas.dashboard import DashboardStats


class DashboardService:
    async def get_stats(self):
        total_users = await user_repository.count_users()
        total_employees = await user_repository.count_employees()

        total_assets = await asset_repository.count_total()
        assigned_assets = await asset_repository.count_by_status("Assigned")
        available_assets = await asset_repository.count_by_status("Available")
        returned_assets = await assignment_repository.count_returned()

        pending_tickets = await ticket_repository.count_pending()
        recent_logs = await audit_log_repository.get_recent(limit=10)

        return DashboardStats(
            total_users=total_users,
            total_employees=total_employees,
            total_assets=total_assets,
            assigned_assets=assigned_assets,
            available_assets=available_assets,
            returned_assets=returned_assets,
            pending_tickets=pending_tickets,
            recent_activities=recent_logs,
        )


dashboard_service = DashboardService()
