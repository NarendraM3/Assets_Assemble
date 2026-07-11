from typing import Generic, TypeVar, Optional, Any
from pydantic import BaseModel

T = TypeVar("T")

class ApiResponse(BaseModel, Generic[T]):
    """Standard API response wrapper."""
    success: bool
    message: str
    data: Optional[T] = None
    errors: Optional[dict[str, Any]] = None

class PaginatedData(BaseModel, Generic[T]):
    """Data object for paginated collections."""
    items: list[T]
    total: int
    page: int
    limit: int
