from typing import Optional, List, Tuple
from boto3.dynamodb.conditions import Attr
from app.dynamodb import get_table


class BaseDynamoRepository:
    def __init__(self, model_class, table_name: str):
        self.model_class = model_class
        self.table = get_table(table_name)

    async def get(self, item_id: str) -> Optional:
        response = await self.table.get_item(Key={"id": item_id})
        item = response.get("Item")
        if item and item.get("is_active", True):
            return self.model_class(**item)
        return None

    async def get_raw(self, item_id: str) -> Optional:
        response = await self.table.get_item(Key={"id": item_id})
        item = response.get("Item")
        if item:
            return self.model_class(**item)
        return None

    async def get_all(self) -> List:
        response = await self.table.scan(
            FilterExpression=Attr("is_active").eq(True)
        )
        items = response.get("Items", [])
        return [self.model_class(**item) for item in items]

    async def create(self, data: dict):
        await self.table.put_item(Item=data)
        return self.model_class(**data)

    async def update(self, item_id: str, data: dict):
        if not data:
            return await self.get_raw(item_id)
        update_expr = "SET "
        expr_attr_values = {}
        expr_attr_names = {}
        for key, value in data.items():
            if key != "id":
                attr_key = f"#{key}"
                val_key = f":{key}"
                update_expr += f"{attr_key} = {val_key}, "
                expr_attr_names[attr_key] = key
                expr_attr_values[val_key] = value
        update_expr = update_expr.rstrip(", ")
        await self.table.update_item(
            Key={"id": item_id},
            UpdateExpression=update_expr,
            ExpressionAttributeNames=expr_attr_names,
            ExpressionAttributeValues=expr_attr_values,
        )
        return await self.get_raw(item_id)

    async def remove(self, item_id: str):
        item = await self.get_raw(item_id)
        if item:
            await self.table.update_item(
                Key={"id": item_id},
                UpdateExpression="SET #is_active = :val",
                ExpressionAttributeNames={"#is_active": "is_active"},
                ExpressionAttributeValues={":val": False},
            )
            item.is_active = False
        return item

    async def get_multi_paginated(
        self,
        page: int = 1,
        limit: int = 10,
        sort_by: Optional[str] = None,
        sort_desc: bool = False,
        search: Optional[str] = None,
        search_fields: List[str] = [],
        filters: dict = {},
    ) -> Tuple[List, int]:
        filter_expr = Attr("is_active").eq(True)
        for field, val in filters.items():
            if val is not None:
                filter_expr = filter_expr & Attr(field).eq(val)
        if search and search_fields:
            search_conditions = None
            for field in search_fields:
                cond = Attr(field).contains(search)
                search_conditions = cond if search_conditions is None else (search_conditions | cond)
            if search_conditions is not None:
                filter_expr = filter_expr & search_conditions
        response = await self.table.scan(FilterExpression=filter_expr)
        items = response.get("Items", [])
        total = len(items)
        if sort_by:
            items.sort(
                key=lambda x: (x.get(sort_by) or ""),
                reverse=sort_desc,
            )
        else:
            items.sort(key=lambda x: x.get("created_at", ""), reverse=True)
        offset = (page - 1) * limit
        page_items = items[offset : offset + limit]
        return [self.model_class(**item) for item in page_items], total
