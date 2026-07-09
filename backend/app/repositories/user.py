from typing import Optional, List
from boto3.dynamodb.conditions import Attr
from app.models.user import User
from app.repositories.base import BaseDynamoRepository
from app.dynamodb import USERS_TABLE


class UserRepository(BaseDynamoRepository):
    def __init__(self):
        super().__init__(User, USERS_TABLE)

    async def get_by_email(self, email: str) -> Optional[User]:
        response = await self.table.scan(
            FilterExpression=Attr("email").eq(email) & Attr("is_active").eq(True)
        )
        items = response.get("Items", [])
        return User(**items[0]) if items else None

    async def get_by_email_raw(self, email: str) -> Optional[User]:
        response = await self.table.scan(
            FilterExpression=Attr("email").eq(email)
        )
        items = response.get("Items", [])
        return User(**items[0]) if items else None

    async def get_by_display_id(self, display_id: str) -> Optional[User]:
        response = await self.table.scan(
            FilterExpression=Attr("display_id").eq(display_id) & Attr("is_active").eq(True)
        )
        items = response.get("Items", [])
        return User(**items[0]) if items else None

    async def count_users(self) -> int:
        response = await self.table.scan(Select="COUNT")
        return response.get("Count", 0)

    async def count_employees(self) -> int:
        response = await self.table.scan(
            FilterExpression=Attr("role").eq("employee") & Attr("is_active").eq(True),
            Select="COUNT",
        )
        return response.get("Count", 0)


user_repository = UserRepository()
