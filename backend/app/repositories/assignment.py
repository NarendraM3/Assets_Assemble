from typing import Optional
from boto3.dynamodb.conditions import Attr
from app.models.assignment import Assignment
from app.repositories.base import BaseDynamoRepository
from app.dynamodb import ASSIGNMENTS_TABLE


class AssignmentRepository(BaseDynamoRepository):
    def __init__(self):
        super().__init__(Assignment, ASSIGNMENTS_TABLE)

    async def get_by_display_id(self, display_id: str) -> Optional[Assignment]:
        response = await self.table.scan(
            FilterExpression=Attr("display_id").eq(display_id) & Attr("is_active").eq(True)
        )
        items = response.get("Items", [])
        return Assignment(**items[0]) if items else None

    async def count_returned(self) -> int:
        response = await self.table.scan(
            FilterExpression=Attr("status").eq("Returned") & Attr("is_active").eq(True),
            Select="COUNT",
        )
        return response.get("Count", 0)


assignment_repository = AssignmentRepository()
