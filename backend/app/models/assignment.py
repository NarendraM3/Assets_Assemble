class Assignment:
    def __init__(self, **kwargs):
        for key, value in kwargs.items():
            setattr(self, key, value)

    __fields__ = [
        "id", "display_id", "asset_id", "employee_id",
        "assigned_date", "return_date", "expected_return", "status",
        "created_at", "updated_at", "is_active"
    ]
