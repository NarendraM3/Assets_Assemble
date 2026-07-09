from datetime import datetime
from typing import Optional, List
import secrets
from app.repositories.ticket import ticket_repository
from app.repositories.audit_log import audit_log_repository
from app.repositories.notification import notification_repository
from app.schemas.ticket import TicketCreate, TicketUpdate, TicketResolveAsset
from app.database import generate_id, utcnow_str, today_str
from fastapi import HTTPException, status


class TicketService:
    def now_stamp(self) -> str:
        return datetime.now().strftime("%b %d, %Y %I:%M %p")

    async def create_ticket(self, ticket_in: TicketCreate, creator):
        await ticket_repository.count_pending()
        display_id = f"TKT-{5000 + secrets.randbelow(1000)}"
        stamp = self.now_stamp()

        timeline = [
            {"step": "Ticket Raised", "timestamp": stamp, "actor": creator.name, "role": "employee", "remarks": "Employee submitted the support request.", "status": "Open"},
            {"step": "Assigned to Support", "timestamp": stamp, "actor": "System", "role": "system", "remarks": "Ticket routed to the support queue.", "status": "Open"},
        ]

        audit_trail = [
            {"user": creator.name, "role": "employee", "timestamp": stamp, "toStatus": "Open", "comment": "Ticket created"},
        ]

        sla = "At Risk" if ticket_in.priority == "Critical" else "On Track"

        ticket_data = {
            "id": generate_id(),
            "display_id": display_id,
            "title": ticket_in.title,
            "description": ticket_in.description,
            "priority": ticket_in.priority,
            "category": ticket_in.category,
            "asset_id": str(ticket_in.asset_id) if ticket_in.asset_id else None,
            "status": "Open",
            "created_by_id": str(creator.id),
            "sla": sla,
            "assigned_role": "support",
            "timeline": timeline,
            "audit_trail": audit_trail,
            "attachments": ticket_in.attachments,
            "created_at": utcnow_str(),
            "updated_at": utcnow_str(),
            "is_active": True,
        }

        new_ticket = await ticket_repository.create(ticket_data)

        await ticket_repository.create_comment(
            ticket_id=new_ticket.id,
            author_name=creator.name,
            message=ticket_in.description,
        )

        await audit_log_repository.create({
            "id": generate_id(),
            "display_id": f"LOG-T{secrets.randbelow(1000)}",
            "action": "Ticket Raised",
            "user": creator.name,
            "target": display_id,
            "timestamp": today_str(),
            "ip": "127.0.0.1",
            "created_at": utcnow_str(),
            "updated_at": utcnow_str(),
            "is_active": True,
        })

        await notification_repository.create({
            "id": generate_id(),
            "title": f"{display_id} opened in Support queue",
            "type": "info",
            "time": "Just now",
            "unread": True,
            "created_at": utcnow_str(),
            "updated_at": utcnow_str(),
            "is_active": True,
        })

        return new_ticket

    async def accept_ticket(self, ticket_id: str, actor):
        ticket = await ticket_repository.get(ticket_id)
        if not ticket:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Ticket not found")

        stamp = self.now_stamp()
        timeline = list(ticket.timeline or [])
        timeline.append({
            "step": "Assigned to Support",
            "timestamp": stamp,
            "actor": actor.name,
            "role": "support",
            "remarks": "Support engineer accepted the ticket.",
            "status": "Assigned",
        })

        audit_trail = list(ticket.audit_trail or [])
        audit_trail.append({
            "user": actor.name,
            "role": "support",
            "timestamp": stamp,
            "fromStatus": ticket.status,
            "toStatus": "Assigned",
            "comment": "Accepted ticket",
        })

        await ticket_repository.update(ticket_id, {
            "status": "Assigned",
            "assignee_id": str(actor.id),
            "assigned_role": "support",
            "timeline": timeline,
            "audit_trail": audit_trail,
            "updated_at": utcnow_str(),
        })

        await audit_log_repository.create({
            "id": generate_id(),
            "display_id": f"LOG-T{secrets.randbelow(1000)}",
            "action": "Ticket Assigned",
            "user": actor.name,
            "target": ticket.display_id,
            "timestamp": today_str(),
            "ip": "127.0.0.1",
            "created_at": utcnow_str(),
            "updated_at": utcnow_str(),
            "is_active": True,
        })

        ticket.status = "Assigned"
        ticket.assignee_id = actor.id
        ticket.assigned_role = "support"
        ticket.timeline = timeline
        ticket.audit_trail = audit_trail
        return ticket

    async def update_ticket_status(self, ticket_id: str, status_val: str, actor, comment_msg: Optional[str] = None):
        ticket = await ticket_repository.get_with_comments(ticket_id)
        if not ticket:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Ticket not found")

        step = status_val
        if status_val == "Resolved":
            ticket.support_resolution = comment_msg

        stamp = self.now_stamp()
        timeline = list(ticket.timeline or [])
        timeline.append({
            "step": step,
            "timestamp": stamp,
            "actor": actor.name,
            "role": actor.role,
            "remarks": comment_msg or f"Ticket status changed to {status_val}.",
            "status": status_val,
        })

        audit_trail = list(ticket.audit_trail or [])
        audit_trail.append({
            "user": actor.name,
            "role": actor.role,
            "timestamp": stamp,
            "fromStatus": ticket.status,
            "toStatus": status_val,
            "comment": comment_msg,
        })

        update_dict = {
            "status": status_val,
            "timeline": timeline,
            "audit_trail": audit_trail,
            "updated_at": utcnow_str(),
        }
        if status_val == "Resolved" and comment_msg:
            update_dict["support_resolution"] = comment_msg

        await ticket_repository.update(ticket_id, update_dict)

        if comment_msg:
            await ticket_repository.create_comment(
                ticket_id=ticket.id,
                author_name=actor.name,
                message=comment_msg,
            )

        await audit_log_repository.create({
            "id": generate_id(),
            "display_id": f"LOG-T{secrets.randbelow(1000)}",
            "action": f"Ticket {status_val}",
            "user": actor.name,
            "target": ticket.display_id,
            "timestamp": today_str(),
            "ip": "127.0.0.1",
            "created_at": utcnow_str(),
            "updated_at": utcnow_str(),
            "is_active": True,
        })

        ticket.status = status_val
        ticket.timeline = timeline
        ticket.audit_trail = audit_trail
        return ticket

    async def add_comment(self, ticket_id: str, author, message: str):
        ticket = await ticket_repository.get(ticket_id)
        if not ticket:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Ticket not found")

        comment = await ticket_repository.create_comment(ticket_id, author.name, message)

        stamp = self.now_stamp()
        audit_trail = list(ticket.audit_trail or [])
        audit_trail.append({
            "user": author.name,
            "role": author.role,
            "timestamp": stamp,
            "fromStatus": ticket.status,
            "toStatus": ticket.status,
            "comment": f"Comment: {message}",
        })

        await ticket_repository.update(ticket_id, {
            "audit_trail": audit_trail,
            "updated_at": utcnow_str(),
        })

        await audit_log_repository.create({
            "id": generate_id(),
            "display_id": f"LOG-T{secrets.randbelow(1000)}",
            "action": "Ticket Comment Added",
            "user": author.name,
            "target": ticket.display_id,
            "timestamp": today_str(),
            "ip": "127.0.0.1",
            "created_at": utcnow_str(),
            "updated_at": utcnow_str(),
            "is_active": True,
        })
        return comment

    async def escalate_ticket(self, ticket_id: str, actor, remarks: str):
        ticket = await ticket_repository.get(ticket_id)
        if not ticket:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Ticket not found")

        stamp = self.now_stamp()
        timeline = list(ticket.timeline or [])
        timeline.append({
            "step": "Pending Administration Approval",
            "timestamp": stamp,
            "actor": actor.name,
            "role": actor.role,
            "remarks": remarks or "Support escalation requested.",
            "status": "Pending Administration Approval",
        })

        audit_trail = list(ticket.audit_trail or [])
        audit_trail.append({
            "user": actor.name,
            "role": actor.role,
            "timestamp": stamp,
            "fromStatus": ticket.status,
            "toStatus": "Pending Administration Approval",
            "comment": remarks,
        })

        await ticket_repository.update(ticket_id, {
            "status": "Pending Administration Approval",
            "assigned_role": "admin",
            "timeline": timeline,
            "audit_trail": audit_trail,
            "updated_at": utcnow_str(),
        })

        await notification_repository.create({
            "id": generate_id(),
            "title": f"{ticket.display_id} pending administration approval",
            "type": "warning",
            "time": "Just now",
            "unread": True,
            "created_at": utcnow_str(),
            "updated_at": utcnow_str(),
            "is_active": True,
        })

        await audit_log_repository.create({
            "id": generate_id(),
            "display_id": f"LOG-T{secrets.randbelow(1000)}",
            "action": "Ticket Escalated",
            "user": actor.name,
            "target": ticket.display_id,
            "timestamp": today_str(),
            "ip": "127.0.0.1",
            "created_at": utcnow_str(),
            "updated_at": utcnow_str(),
            "is_active": True,
        })

        ticket.status = "Pending Administration Approval"
        ticket.assigned_role = "admin"
        ticket.timeline = timeline
        ticket.audit_trail = audit_trail
        return ticket

    async def review_escalation(self, ticket_id: str, approved: bool, actor, remarks: str):
        ticket = await ticket_repository.get(ticket_id)
        if not ticket:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Ticket not found")

        stamp = self.now_stamp()
        timeline = list(ticket.timeline or [])
        audit_trail = list(ticket.audit_trail or [])

        if approved:
            timeline.append({
                "step": "Approved",
                "timestamp": stamp,
                "actor": actor.name,
                "role": "admin",
                "remarks": remarks or "Escalation approved for asset manager action.",
                "status": "Approved for Asset Manager",
            })
            timeline.append({
                "step": "Assigned to Asset Manager",
                "timestamp": stamp,
                "actor": "System",
                "role": "system",
                "remarks": "Ticket routed to the asset manager queue.",
                "status": "Approved for Asset Manager",
            })

            audit_trail.append({
                "user": actor.name, "role": "admin", "timestamp": stamp,
                "fromStatus": ticket.status, "toStatus": "Approved for Asset Manager",
                "comment": remarks or "Approved",
            })
            audit_trail.append({
                "user": "System", "role": "system", "timestamp": stamp,
                "fromStatus": "Approved for Asset Manager", "toStatus": "Approved for Asset Manager",
                "comment": "Assigned to Asset Manager",
            })

            await ticket_repository.update(ticket_id, {
                "status": "Approved for Asset Manager",
                "assigned_role": "asset_manager",
                "admin_remarks": remarks,
                "timeline": timeline,
                "audit_trail": audit_trail,
                "updated_at": utcnow_str(),
            })

            await notification_repository.create({
                "id": generate_id(),
                "title": f"{ticket.display_id} approved for Asset Manager",
                "type": "success",
                "time": "Just now",
                "unread": True,
                "created_at": utcnow_str(),
                "updated_at": utcnow_str(),
                "is_active": True,
            })
        else:
            timeline.append({
                "step": "Rejected",
                "timestamp": stamp,
                "actor": actor.name,
                "role": "admin",
                "remarks": remarks or "Escalation rejected and returned to Support.",
                "status": "Open",
            })

            audit_trail.append({
                "user": actor.name, "role": "admin", "timestamp": stamp,
                "fromStatus": ticket.status, "toStatus": "Open",
                "comment": remarks or "Rejected",
            })

            await ticket_repository.update(ticket_id, {
                "status": "Open",
                "assigned_role": "support",
                "admin_remarks": remarks,
                "timeline": timeline,
                "audit_trail": audit_trail,
                "updated_at": utcnow_str(),
            })

            await notification_repository.create({
                "id": generate_id(),
                "title": f"{ticket.display_id} returned to Support by Administration",
                "type": "danger",
                "time": "Just now",
                "unread": True,
                "created_at": utcnow_str(),
                "updated_at": utcnow_str(),
                "is_active": True,
            })

        await audit_log_repository.create({
            "id": generate_id(),
            "display_id": f"LOG-T{secrets.randbelow(1000)}",
            "action": "Escalation Approved" if approved else "Escalation Rejected",
            "user": actor.name,
            "target": ticket.display_id,
            "timestamp": today_str(),
            "ip": "127.0.0.1",
            "created_at": utcnow_str(),
            "updated_at": utcnow_str(),
            "is_active": True,
        })

        ticket.status = "Approved for Asset Manager" if approved else "Open"
        ticket.assigned_role = "asset_manager" if approved else "support"
        ticket.admin_remarks = remarks
        ticket.timeline = timeline
        ticket.audit_trail = audit_trail
        return ticket

    async def resolve_asset_ticket(self, ticket_id: str, details: TicketResolveAsset, actor):
        ticket = await ticket_repository.get(ticket_id)
        if not ticket:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Ticket not found")

        stamp = self.now_stamp()
        timeline = list(ticket.timeline or [])
        timeline.append({
            "step": "Resolved",
            "timestamp": stamp,
            "actor": actor.name,
            "role": "asset_manager",
            "remarks": details.resolution or "Asset action completed.",
            "status": "Resolved",
        })

        audit_trail = list(ticket.audit_trail or [])
        audit_trail.append({
            "user": actor.name, "role": "asset_manager", "timestamp": stamp,
            "fromStatus": ticket.status, "toStatus": "Resolved",
            "comment": details.resolution,
        })

        await ticket_repository.update(ticket_id, {
            "status": "Resolved",
            "assigned_role": "support",
            "asset_action": details.action,
            "asset_details": details.asset_details,
            "asset_remarks": details.remarks,
            "asset_resolution": details.resolution,
            "support_resolution": details.resolution,
            "timeline": timeline,
            "audit_trail": audit_trail,
            "updated_at": utcnow_str(),
        })

        await notification_repository.create({
            "id": generate_id(),
            "title": f"{ticket.display_id} resolved by Asset Manager",
            "type": "success",
            "time": "Just now",
            "unread": True,
            "created_at": utcnow_str(),
            "updated_at": utcnow_str(),
            "is_active": True,
        })

        await audit_log_repository.create({
            "id": generate_id(),
            "display_id": f"LOG-T{secrets.randbelow(1000)}",
            "action": "Asset Ticket Resolved",
            "user": actor.name,
            "target": ticket.display_id,
            "timestamp": today_str(),
            "ip": "127.0.0.1",
            "created_at": utcnow_str(),
            "updated_at": utcnow_str(),
            "is_active": True,
        })

        ticket.status = "Resolved"
        ticket.assigned_role = "support"
        ticket.asset_action = details.action
        ticket.asset_details = details.asset_details
        ticket.asset_remarks = details.remarks
        ticket.asset_resolution = details.resolution
        ticket.support_resolution = details.resolution
        return ticket


ticket_service = TicketService()
