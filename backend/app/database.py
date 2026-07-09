import uuid
from datetime import datetime, timezone


def generate_id() -> str:
    return str(uuid.uuid4())


def utcnow_str() -> str:
    return datetime.now(timezone.utc).isoformat()


def today_str() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%d")


class TimestampMixin:
    """Mixin providing id, created_at, updated_at, is_active fields."""
    def __init__(self):
        self.id = generate_id()
        self.created_at = utcnow_str()
        self.updated_at = utcnow_str()
        self.is_active = True
