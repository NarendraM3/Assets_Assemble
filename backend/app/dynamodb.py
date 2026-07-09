import asyncio
import boto3
from typing import Optional
from app.config import settings

_sync_dynamodb = boto3.resource(
    'dynamodb',
    region_name=settings.AWS_REGION,
    endpoint_url=settings.DYNAMODB_ENDPOINT,
    aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
    aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
)

USERS_TABLE = 'users'
ASSETS_TABLE = 'assets'
TICKETS_TABLE = 'tickets'
TICKET_COMMENTS_TABLE = 'ticket_comments'
ASSIGNMENTS_TABLE = 'assignments'
VENDORS_TABLE = 'vendors'
MAINTENANCE_TABLE = 'maintenance'
AUDIT_LOGS_TABLE = 'audit_logs'
NOTIFICATIONS_TABLE = 'notifications'
KNOWLEDGE_BASE_TABLE = 'knowledge_base'


class AsyncTableWrapper:
    def __init__(self, table_name: str):
        self._table = _sync_dynamodb.Table(table_name)

    async def get_item(self, **kwargs) -> dict:
        return await asyncio.to_thread(self._table.get_item, **kwargs)

    async def put_item(self, **kwargs) -> dict:
        return await asyncio.to_thread(self._table.put_item, **kwargs)

    async def update_item(self, **kwargs) -> dict:
        return await asyncio.to_thread(self._table.update_item, **kwargs)

    async def delete_item(self, **kwargs) -> dict:
        return await asyncio.to_thread(self._table.delete_item, **kwargs)

    async def scan(self, **kwargs) -> dict:
        return await asyncio.to_thread(self._table.scan, **kwargs)

    async def query(self, **kwargs) -> dict:
        return await asyncio.to_thread(self._table.query, **kwargs)


def get_table(name: str) -> AsyncTableWrapper:
    return AsyncTableWrapper(name)
