from typing import Optional
from boto3.dynamodb.conditions import Attr
from app.models.vendor import Vendor
from app.repositories.base import BaseDynamoRepository
from app.dynamodb import VENDORS_TABLE


class VendorRepository(BaseDynamoRepository):
    def __init__(self):
        super().__init__(Vendor, VENDORS_TABLE)

    async def get_by_display_id(self, display_id: str) -> Optional[Vendor]:
        response = await self.table.scan(
            FilterExpression=Attr("display_id").eq(display_id) & Attr("is_active").eq(True)
        )
        items = response.get("Items", [])
        return Vendor(**items[0]) if items else None


vendor_repository = VendorRepository()
