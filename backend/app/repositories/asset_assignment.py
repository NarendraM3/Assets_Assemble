from typing import Optional, List
from app.repositories.base import BaseDynamoRepository
from app.dynamodb import ASSET_ASSIGNMENTS_TABLE


class AssetAssignment:
    def __init__(self, **kwargs):
        for key, value in kwargs.items():
            setattr(self, key, value)


class AssetAssignmentRepository(BaseDynamoRepository):
    def __init__(self):
        super().__init__(AssetAssignment, ASSET_ASSIGNMENTS_TABLE)

    async def get_by_assignment_id(self, assignment_id: str) -> Optional[AssetAssignment]:
        response = await self.table.scan(
            FilterExpression=None
        )
        items = response.get("Items", [])
        for item in items:
            if item.get("AssignmentId") == assignment_id:
                return AssetAssignment(**item)
        return None


asset_assignment_repository = AssetAssignmentRepository()
