from typing import Optional
from boto3.dynamodb.conditions import Attr
from app.models.knowledge_base import KnowledgeBase
from app.repositories.base import BaseDynamoRepository
from app.dynamodb import KNOWLEDGE_BASE_TABLE


class KnowledgeBaseRepository(BaseDynamoRepository):
    def __init__(self):
        super().__init__(KnowledgeBase, KNOWLEDGE_BASE_TABLE)

    async def get_by_display_id(self, display_id: str) -> Optional[KnowledgeBase]:
        response = await self.table.scan(
            FilterExpression=Attr("display_id").eq(display_id) & Attr("is_active").eq(True)
        )
        items = response.get("Items", [])
        return KnowledgeBase(**items[0]) if items else None


knowledge_base_repository = KnowledgeBaseRepository()
