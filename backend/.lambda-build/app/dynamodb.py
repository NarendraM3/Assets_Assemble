import asyncio
import boto3
from app.config import settings

_dynamodb_kwargs = {"region_name": settings.AWS_REGION}
if settings.DYNAMODB_ENDPOINT:
    _dynamodb_kwargs["endpoint_url"] = settings.DYNAMODB_ENDPOINT
if settings.AWS_ACCESS_KEY_ID and settings.AWS_SECRET_ACCESS_KEY:
    _dynamodb_kwargs["aws_access_key_id"] = settings.AWS_ACCESS_KEY_ID
    _dynamodb_kwargs["aws_secret_access_key"] = settings.AWS_SECRET_ACCESS_KEY

_sync_dynamodb = boto3.resource("dynamodb", **_dynamodb_kwargs)

USERS_TABLE = settings.USERS_TABLE
ASSETS_TABLE = settings.ASSETS_TABLE
TICKETS_TABLE = settings.TICKETS_TABLE
TICKET_COMMENTS_TABLE = settings.TICKET_COMMENTS_TABLE
ASSIGNMENTS_TABLE = settings.ASSIGNMENTS_TABLE
VENDORS_TABLE = settings.VENDORS_TABLE
MAINTENANCE_TABLE = settings.MAINTENANCE_TABLE
AUDIT_LOGS_TABLE = settings.AUDIT_LOGS_TABLE
NOTIFICATIONS_TABLE = settings.NOTIFICATIONS_TABLE
KNOWLEDGE_BASE_TABLE = settings.KNOWLEDGE_BASE_TABLE


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
