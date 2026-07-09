import asyncio
from app.repositories.user import user_repository


async def main():
    users = await user_repository.get_all()
    print(f"Total users in DB: {len(users)}")
    for u in users:
        print(f"- {u.display_id}: {u.name} ({u.email}), active={u.is_active}, role={u.role}")


if __name__ == "__main__":
    asyncio.run(main())
