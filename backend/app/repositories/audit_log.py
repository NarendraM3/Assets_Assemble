from typing import List
from boto3.dynamodb.conditions import Attr
from app.models.audit_log import AuditLog
from app.repositories.base import BaseDynamoRepository
from app.dynamodb import AUDIT_LOGS_TABLE


class AuditLogRepository(BaseDynamoRepository):
    def __init__(self):
        super().__init__(AuditLog, AUDIT_LOGS_TABLE)

    async def get_recent(self, limit: int = 5) -> List[AuditLog]:
        response = await self.table.scan(
            FilterExpression=Attr("is_active").eq(True)
        )
        items = response.get("Items", [])
        items.sort(key=lambda x: x.get("created_at", ""), reverse=True)
        return [AuditLog(**item) for item in items[:limit]]


audit_log_repository = AuditLogRepository()
