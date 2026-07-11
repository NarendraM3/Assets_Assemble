class Asset:
    def __init__(self, **kwargs):
        for key, value in kwargs.items():
            setattr(self, key, value)

    __fields__ = [
        "id", "display_id", "name", "category", "manufacturer", "model",
        "serial", "purchase_date", "warranty_expiry", "location",
        "assigned_to_id", "status", "cost",
        "created_at", "updated_at", "is_active"
    ]
