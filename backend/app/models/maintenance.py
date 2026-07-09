class Maintenance:
    def __init__(self, **kwargs):
        for key, value in kwargs.items():
            setattr(self, key, value)

    __fields__ = [
        "id", "display_id", "asset_id", "engineer", "date",
        "resolution", "parts", "cost", "status",
        "created_at", "updated_at", "is_active"
    ]
