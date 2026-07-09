class Ticket:
    def __init__(self, **kwargs):
        for key, value in kwargs.items():
            setattr(self, key, value)

    __fields__ = [
        "id", "display_id", "title", "description", "priority", "category",
        "status", "created_by_id", "assignee_id", "asset_id",
        "sla", "support_resolution", "admin_remarks",
        "asset_action", "asset_details", "asset_remarks", "asset_resolution",
        "assigned_role", "timeline", "audit_trail", "attachments",
        "created_at", "updated_at", "is_active"
    ]


class TicketComment:
    def __init__(self, **kwargs):
        for key, value in kwargs.items():
            setattr(self, key, value)

    __fields__ = [
        "id", "ticket_id", "author_name", "message",
        "created_at", "updated_at", "is_active"
    ]
