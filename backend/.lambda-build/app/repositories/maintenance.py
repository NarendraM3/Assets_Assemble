from typing import Optional
from boto3.dynamodb.conditions import Attr
from app.models.maintenance import Maintenance
from app.repositories.base import BaseDynamoRepository
from app.dynamodb import MAINTENANCE_TABLE


class MaintenanceRepository(BaseDynamoRepository):
    def __init__(self):
        super().__init__(Maintenance, MAINTENANCE_TABLE)

    async def get_by_display_id(self, display_id: str) -> Optional[Maintenance]:
        response = await self.table.scan(
            FilterExpression=Attr("display_id").eq(display_id) & Attr("is_active").eq(True)
        )
        items = response.get("Items", [])
        return Maintenance(**items[0]) if items else None


maintenance_repository = MaintenanceRepository()
