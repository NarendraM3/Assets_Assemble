from datetime import datetime
from typing import Optional, List, Dict, Any
import uuid
import secrets
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.ticket import Ticket, TicketComment
from app.models.user import User
from app.repositories.ticket import ticket_repository
from app.repositories.audit_log import audit_log_repository
from app.repositories.notification import notification_repository
from app.schemas.ticket import TicketCreate, TicketUpdate, TicketResolveAsset
from fastapi import HTTPException, status

class TicketService:
    def now_stamp(self) -> str:
        return datetime.now().strftime("%b %d, %Y %I:%M %p")

    def today(self) -> str:
        return datetime.utcnow().strftime("%Y-%m-%d")

    async def create_ticket(self, db: AsyncSession, ticket_in: TicketCreate, creator: User) -> Ticket:
        """Create a new support ticket and initialize timeline and SLA."""
        count = await ticket_repository.count_pending(db) # just indexing
        display_id = f"TKT-{5000 + secrets.randbelow(1000)}"
        stamp = self.now_stamp()
        
        timeline = [
            {"step": "Ticket Raised", "timestamp": stamp, "actor": creator.name, "role": "employee", "remarks": "Employee submitted the support request.", "status": "Open"},
            {"step": "Assigned to Support", "timestamp": stamp, "actor": "System", "role": "system", "remarks": "Ticket routed to the support queue.", "status": "Open"}
        ]
        
        audit_trail = [
            {"user": creator.name, "role": "employee", "timestamp": stamp, "toStatus": "Open", "comment": "Ticket created"}
        ]
        
        sla = "At Risk" if ticket_in.priority == "Critical" else "On Track"
        
        ticket_data = {
            "display_id": display_id,
            "title": ticket_in.title,
            "description": ticket_in.description,
            "priority": ticket_in.priority,
            "category": ticket_in.category,
            "asset_id": ticket_in.asset_id,
            "status": "Open",
            "created_by_id": creator.id,
            "sla": sla,
            "assigned_role": "support",
            "timeline": timeline,
            "audit_trail": audit_trail,
            "attachments": ticket_in.attachments
        }
        
        new_ticket = await ticket_repository.create(db, ticket_data)
        
        # Add initial comment with description
        await ticket_repository.create_comment(
            db, 
            ticket_id=new_ticket.id, 
            author_name=creator.name, 
            message=ticket_in.description
        )
        
        # Log to audits
        await audit_log_repository.create(db, {
            "display_id": f"LOG-T{secrets.randbelow(1000)}",
            "action": "Ticket Raised",
            "user": creator.name,
            "target": display_id,
            "timestamp": self.today(),
            "ip": "127.0.0.1"
        })
        
        # Send system notification
        await notification_repository.create(db, {
            "title": f"{display_id} opened in Support queue",
            "type": "info",
            "time": "Just now",
            "unread": True
        })
        
        return new_ticket

    async def accept_ticket(self, db: AsyncSession, ticket_id: uuid.UUID, actor: User) -> Ticket:
        """Assign the ticket to the current support agent."""
        ticket = await ticket_repository.get(db, ticket_id)
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
            "status": "Assigned"
        })
        
        audit_trail = list(ticket.audit_trail or [])
        audit_trail.append({
            "user": actor.name,
            "role": "support",
            "timestamp": stamp,
            "fromStatus": ticket.status,
            "toStatus": "Assigned",
            "comment": "Accepted ticket"
        })
        
        ticket.status = "Assigned"
        ticket.assignee_id = actor.id
        ticket.assigned_role = "support"
        ticket.timeline = timeline
        ticket.audit_trail = audit_trail
        db.add(ticket)
        await db.flush()
        
        await audit_log_repository.create(db, {
            "display_id": f"LOG-T{secrets.randbelow(1000)}",
            "action": "Ticket Assigned",
            "user": actor.name,
            "target": ticket.display_id,
            "timestamp": self.today(),
            "ip": "127.0.0.1"
        })
        
        return ticket

    async def update_ticket_status(self, db: AsyncSession, ticket_id: uuid.UUID, status_val: str, actor: User, comment_msg: Optional[str] = None) -> Ticket:
        """Update ticket status, logging the comment and action to audit logs."""
        ticket = await ticket_repository.get_with_comments(db, ticket_id)
        if not ticket:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Ticket not found")
            
        step = status_val
        if status_val == "In Progress":
            step = "In Progress"
        elif status_val == "Resolved":
            step = "Resolved"
            ticket.support_resolution = comment_msg
        elif status_val == "Closed":
            step = "Closed"
            
        stamp = self.now_stamp()
        timeline = list(ticket.timeline or [])
        timeline.append({
            "step": step,
            "timestamp": stamp,
            "actor": actor.name,
            "role": actor.role,
            "remarks": comment_msg or f"Ticket status changed to {status_val}.",
            "status": status_val
        })
        
        audit_trail = list(ticket.audit_trail or [])
        audit_trail.append({
            "user": actor.name,
            "role": actor.role,
            "timestamp": stamp,
            "fromStatus": ticket.status,
            "toStatus": status_val,
            "comment": comment_msg
        })
        
        ticket.status = status_val
        ticket.timeline = timeline
        ticket.audit_trail = audit_trail
        db.add(ticket)
        
        if comment_msg:
            await ticket_repository.create_comment(
                db,
                ticket_id=ticket.id,
                author_name=actor.name,
                message=comment_msg
            )
            
        await db.flush()
        
        await audit_log_repository.create(db, {
            "display_id": f"LOG-T{secrets.randbelow(1000)}",
            "action": f"Ticket {status_val}",
            "user": actor.name,
            "target": ticket.display_id,
            "timestamp": self.today(),
            "ip": "127.0.0.1"
        })
        
        return ticket

    async def add_comment(self, db: AsyncSession, ticket_id: uuid.UUID, author: User, message: str) -> TicketComment:
        """Add a comment/message to a ticket discussion."""
        ticket = await ticket_repository.get(db, ticket_id)
        if not ticket:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Ticket not found")
            
        comment = await ticket_repository.create_comment(db, ticket_id, author.name, message)
        
        stamp = self.now_stamp()
        audit_trail = list(ticket.audit_trail or [])
        audit_trail.append({
            "user": author.name,
            "role": author.role,
            "timestamp": stamp,
            "fromStatus": ticket.status,
            "toStatus": ticket.status,
            "comment": f"Comment: {message}"
        })
        ticket.audit_trail = audit_trail
        db.add(ticket)
        await db.flush()
        
        await audit_log_repository.create(db, {
            "display_id": f"LOG-T{secrets.randbelow(1000)}",
            "action": "Ticket Comment Added",
            "user": author.name,
            "target": ticket.display_id,
            "timestamp": self.today(),
            "ip": "127.0.0.1"
        })
        return comment

    async def escalate_ticket(self, db: AsyncSession, ticket_id: uuid.UUID, actor: User, remarks: str) -> Ticket:
        """Escalate ticket to Administration approval queue."""
        ticket = await ticket_repository.get(db, ticket_id)
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
            "status": "Pending Administration Approval"
        })
        
        audit_trail = list(ticket.audit_trail or [])
        audit_trail.append({
            "user": actor.name,
            "role": actor.role,
            "timestamp": stamp,
            "fromStatus": ticket.status,
            "toStatus": "Pending Administration Approval",
            "comment": remarks
        })
        
        ticket.status = "Pending Administration Approval"
        ticket.assigned_role = "admin"
        ticket.timeline = timeline
        ticket.audit_trail = audit_trail
        db.add(ticket)
        await db.flush()
        
        # Send notification to admins
        await notification_repository.create(db, {
            "title": f"{ticket.display_id} pending administration approval",
            "type": "warning",
            "time": "Just now",
            "unread": True
        })
        
        await audit_log_repository.create(db, {
            "display_id": f"LOG-T{secrets.randbelow(1000)}",
            "action": "Ticket Escalated",
            "user": actor.name,
            "target": ticket.display_id,
            "timestamp": self.today(),
            "ip": "127.0.0.1"
        })
        
        return ticket

    async def review_escalation(self, db: AsyncSession, ticket_id: uuid.UUID, approved: bool, actor: User, remarks: str) -> Ticket:
        """Review escalation and route to Asset Manager or return to Support queue."""
        ticket = await ticket_repository.get(db, ticket_id)
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
                "status": "Approved for Asset Manager"
            })
            timeline.append({
                "step": "Assigned to Asset Manager",
                "timestamp": stamp,
                "actor": "System",
                "role": "system",
                "remarks": "Ticket routed to the asset manager queue.",
                "status": "Approved for Asset Manager"
            })
            
            audit_trail.append({
                "user": actor.name, "role": "admin", "timestamp": stamp,
                "fromStatus": ticket.status, "toStatus": "Approved for Asset Manager",
                "comment": remarks or "Approved"
            })
            audit_trail.append({
                "user": "System", "role": "system", "timestamp": stamp,
                "fromStatus": "Approved for Asset Manager", "toStatus": "Approved for Asset Manager",
                "comment": "Assigned to Asset Manager"
            })
            
            ticket.status = "Approved for Asset Manager"
            ticket.assigned_role = "asset_manager"
            ticket.admin_remarks = remarks
            
            await notification_repository.create(db, {
                "title": f"{ticket.display_id} approved for Asset Manager",
                "type": "success",
                "time": "Just now",
                "unread": True
            })
        else:
            timeline.append({
                "step": "Rejected",
                "timestamp": stamp,
                "actor": actor.name,
                "role": "admin",
                "remarks": remarks or "Escalation rejected and returned to Support.",
                "status": "Open"
            })
            
            audit_trail.append({
                "user": actor.name, "role": "admin", "timestamp": stamp,
                "fromStatus": ticket.status, "toStatus": "Open",
                "comment": remarks or "Rejected"
            })
            
            ticket.status = "Open"
            ticket.assigned_role = "support"
            ticket.admin_remarks = remarks
            
            await notification_repository.create(db, {
                "title": f"{ticket.display_id} returned to Support by Administration",
                "type": "danger",
                "time": "Just now",
                "unread": True
            })
            
        db.add(ticket)
        await db.flush()
        
        await audit_log_repository.create(db, {
            "display_id": f"LOG-T{secrets.randbelow(1000)}",
            "action": "Escalation Approved" if approved else "Escalation Rejected",
            "user": actor.name,
            "target": ticket.display_id,
            "timestamp": self.today(),
            "ip": "127.0.0.1"
        })
        
        return ticket

    async def resolve_asset_ticket(self, db: AsyncSession, ticket_id: uuid.UUID, details: TicketResolveAsset, actor: User) -> Ticket:
        """Process resolution by the Asset Manager."""
        ticket = await ticket_repository.get(db, ticket_id)
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
            "status": "Resolved"
        })
        
        audit_trail = list(ticket.audit_trail or [])
        audit_trail.append({
            "user": actor.name, "role": "asset_manager", "timestamp": stamp,
            "fromStatus": ticket.status, "toStatus": "Resolved",
            "comment": details.resolution
        })
        
        ticket.status = "Resolved"
        ticket.assigned_role = "support"
        ticket.asset_action = details.action
        ticket.asset_details = details.asset_details
        ticket.asset_remarks = details.remarks
        ticket.asset_resolution = details.resolution
        ticket.support_resolution = details.resolution
        
        db.add(ticket)
        await db.flush()
        
        await notification_repository.create(db, {
            "title": f"{ticket.display_id} resolved by Asset Manager",
            "type": "success",
            "time": "Just now",
            "unread": True
        })
        
        await audit_log_repository.create(db, {
            "display_id": f"LOG-T{secrets.randbelow(1000)}",
            "action": "Asset Ticket Resolved",
            "user": actor.name,
            "target": ticket.display_id,
            "timestamp": self.today(),
            "ip": "127.0.0.1"
        })
        
        return ticket

ticket_service = TicketService()
