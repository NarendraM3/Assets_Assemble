from fastapi import APIRouter, Depends, Query
from app.dependencies import get_db, get_current_user
from app.repositories.knowledge_base import knowledge_base_repository
from app.schemas.base import ApiResponse, PaginatedData
from app.schemas.knowledge_base import KnowledgeBaseResponse
from typing import Optional

router = APIRouter(prefix="/knowledge-base", tags=["Knowledge Base"])


@router.get("", response_model=ApiResponse[PaginatedData[KnowledgeBaseResponse]])
async def list_kb_articles(
    db=Depends(get_db),
    current_user=Depends(get_current_user),
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=10000),
    sort_by: Optional[str] = Query(None),
    sort_desc: bool = Query(False),
    search: Optional[str] = Query(None),
    category: Optional[str] = Query(None),
):
    filters = {}
    if category:
        filters["category"] = category

    search_fields = ["title", "category", "display_id"]

    items, total = await knowledge_base_repository.get_multi_paginated(
        page=page, limit=limit, sort_by=sort_by, sort_desc=sort_desc,
        search=search, search_fields=search_fields, filters=filters,
    )

    schemas = [KnowledgeBaseResponse.model_validate(item) for item in items]

    return ApiResponse(
        success=True,
        message="Knowledge base articles retrieved",
        data=PaginatedData(
            items=schemas,
            total=total,
            page=page,
            limit=limit,
        ),
    )
