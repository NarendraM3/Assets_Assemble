import asyncio
from app.core.security import get_password_hash
from app.repositories.user import user_repository
from app.repositories.asset import asset_repository
from app.repositories.ticket import ticket_repository
from app.repositories.assignment import assignment_repository
from app.repositories.vendor import vendor_repository
from app.repositories.maintenance import maintenance_repository
from app.repositories.audit_log import audit_log_repository
from app.repositories.notification import notification_repository
from app.repositories.knowledge_base import knowledge_base_repository
from app.database import generate_id, utcnow_str, today_str


async def seed_db():
    print("Resetting database and seeding credentials...")

    # Clear existing records
    for repo in [knowledge_base_repository, notification_repository, audit_log_repository,
                 vendor_repository, maintenance_repository, assignment_repository,
                 ticket_repository, asset_repository, user_repository]:
        response = await repo.table.scan()
        for item in response.get("Items", []):
            await repo.table.delete_item(Key={"id": item["id"]})

    pwd_hash = get_password_hash("demo1234")

    core_accounts = [
        {"name": "Admin User", "email": "admin@acmecorp.com", "role": "admin", "display_id": "EMP-999"},
    ]

    for acc in core_accounts:
        user_data = {
            "id": generate_id(),
            "display_id": acc["display_id"],
            "name": acc["name"],
            "email": acc["email"],
            "password_hash": pwd_hash,
            "role": acc["role"],
            "department": "IT",
            "designation": "IT Specialist",
            "manager": "Director IT",
            "location": "HQ - New York",
            "status": "Active",
            "avatar": "".join([part[0] for part in acc["name"].split()])[:2],
            "phone": "+1 555-0199",
            "join_date": today_str(),
            "must_change_password": False,
            "created_at": utcnow_str(),
            "updated_at": utcnow_str(),
            "is_active": True,
        }
        await user_repository.create(user_data)

    print("Database cleared and core credentials successfully seeded!")


if __name__ == "__main__":
    asyncio.run(seed_db())
