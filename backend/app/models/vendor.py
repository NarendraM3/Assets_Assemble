class Vendor:
    def __init__(self, **kwargs):
        for key, value in kwargs.items():
            setattr(self, key, value)

    __fields__ = [
        "id", "display_id", "name", "contact", "email", "phone",
        "category", "status", "contract_end",
        "created_at", "updated_at", "is_active"
    ]
