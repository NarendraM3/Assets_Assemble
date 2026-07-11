from typing import Optional
from boto3.dynamodb.conditions import Attr
from app.models.asset import Asset
from app.repositories.base import BaseDynamoRepository
from app.dynamodb import ASSETS_TABLE


class AssetRepository(BaseDynamoRepository):
    def __init__(self):
        super().__init__(Asset, ASSETS_TABLE)

    async def get_by_serial(self, serial: str) -> Optional[Asset]:
        response = await self.table.scan(
            FilterExpression=Attr("serial").eq(serial) & Attr("is_active").eq(True)
        )
        items = response.get("Items", [])
        return Asset(**items[0]) if items else None

    async def get_by_display_id(self, display_id: str) -> Optional[Asset]:
        response = await self.table.scan(
            FilterExpression=Attr("display_id").eq(display_id) & Attr("is_active").eq(True)
        )
        items = response.get("Items", [])
        return Asset(**items[0]) if items else None

    async def count_total(self) -> int:
        response = await self.table.scan(Select="COUNT")
        return response.get("Count", 0)

    async def count_by_status(self, status: str) -> int:
        response = await self.table.scan(
            FilterExpression=Attr("status").eq(status) & Attr("is_active").eq(True),
            Select="COUNT",
        )
        return response.get("Count", 0)


asset_repository = AssetRepository()
