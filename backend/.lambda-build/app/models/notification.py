class Notification:
    def __init__(self, **kwargs):
        for key, value in kwargs.items():
            setattr(self, key, value)

    __fields__ = [
        "id", "user_id", "title", "type", "time", "unread",
        "created_at", "updated_at", "is_active"
    ]
