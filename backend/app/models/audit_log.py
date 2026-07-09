class AuditLog:
    def __init__(self, **kwargs):
        for key, value in kwargs.items():
            setattr(self, key, value)

    __fields__ = [
        "id", "display_id", "action", "user", "target",
        "timestamp", "ip",
        "created_at", "updated_at", "is_active"
    ]
