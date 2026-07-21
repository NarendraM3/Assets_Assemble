class User:
    def __init__(self, **kwargs):
        for key, value in kwargs.items():
            setattr(self, key, value)

    __fields__ = [
        "id", "display_id", "name", "email", "password_hash", "role",
        "department", "designation", "manager", "location", "status",
        "avatar", "phone", "join_date", "must_change_password",
        "allocation_date", "allocation_time", "allocation_status",
        "verification_status",
        "required_asset_category", "allocated_asset_details", "allocation_history",
        "created_at", "updated_at", "is_active"
    ]
