from typing import Optional, List
from boto3.dynamodb.conditions import Attr
from app.models.ticket import Ticket, TicketComment
from app.repositories.base import BaseDynamoRepository
from app.dynamodb import TICKETS_TABLE, TICKET_COMMENTS_TABLE
from app.database import generate_id, utcnow_str


class TicketRepository(BaseDynamoRepository):
    def __init__(self):
        super().__init__(Ticket, TICKETS_TABLE)

    async def get_by_display_id(self, display_id: str) -> Optional[Ticket]:
        response = await self.table.scan(
            FilterExpression=Attr("display_id").eq(display_id) & Attr("is_active").eq(True)
        )
        items = response.get("Items", [])
        if not items:
            return None
        ticket = Ticket(**items[0])
        ticket.comments = await self._get_comments(ticket.id)
        return ticket

    async def get_with_comments(self, ticket_id: str) -> Optional[Ticket]:
        item = await self.get_raw(ticket_id)
        if not item:
            return None
        if not item.is_active:
            return None
        item.comments = await self._get_comments(ticket_id)
        return item

    async def _get_comments(self, ticket_id: str) -> List[TicketComment]:
        comments_table = get_table_instance(TICKET_COMMENTS_TABLE)
        response = await comments_table.scan(
            FilterExpression=Attr("ticket_id").eq(ticket_id) & Attr("is_active").eq(True)
        )
        items = response.get("Items", [])
        items.sort(key=lambda x: x.get("created_at", ""))
        return [TicketComment(**c) for c in items]

    async def create_comment(self, ticket_id: str, author_name: str, message: str) -> TicketComment:
        comment_table = get_table_instance(TICKET_COMMENTS_TABLE)
        data = {
            "id": generate_id(),
            "ticket_id": ticket_id,
            "author_name": author_name,
            "message": message,
            "created_at": utcnow_str(),
            "updated_at": utcnow_str(),
            "is_active": True,
        }
        await comment_table.put_item(Item=data)
        return TicketComment(**data)

    async def count_pending(self) -> int:
        response = await self.table.scan(
            FilterExpression=Attr("is_active").eq(True)
            & Attr("status").ne("Resolved")
            & Attr("status").ne("Closed"),
            Select="COUNT",
        )
        return response.get("Count", 0)


ticket_repository = TicketRepository()


def get_table_instance(name: str):
    from app.dynamodb import get_table
    return get_table(name)
