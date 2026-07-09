from typing import List, Optional
from boto3.dynamodb.conditions import Attr
from app.models.notification import Notification
from app.repositories.base import BaseDynamoRepository
from app.dynamodb import NOTIFICATIONS_TABLE


class NotificationRepository(BaseDynamoRepository):
    def __init__(self):
        super().__init__(Notification, NOTIFICATIONS_TABLE)

    async def get_by_user(self, user_id: str) -> List[Notification]:
        response = await self.table.scan(
            FilterExpression=Attr("is_active").eq(True)
            & (Attr("user_id").eq(user_id) | Attr("user_id").not_exists())
        )
        items = response.get("Items", [])
        items.sort(key=lambda x: x.get("created_at", ""), reverse=True)
        return [Notification(**item) for item in items]

    async def mark_all_read(self, user_id: str) -> None:
        response = await self.table.scan(
            FilterExpression=Attr("is_active").eq(True)
            & (Attr("user_id").eq(user_id) | Attr("user_id").not_exists())
            & Attr("unread").eq(True)
        )
        items = response.get("Items", [])
        for item in items:
            await self.table.update_item(
                Key={"id": item["id"]},
                UpdateExpression="SET #unread = :val",
                ExpressionAttributeNames={"#unread": "unread"},
                ExpressionAttributeValues={":val": False},
            )


notification_repository = NotificationRepository()
