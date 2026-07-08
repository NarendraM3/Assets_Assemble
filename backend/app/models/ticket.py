from sqlalchemy import String, ForeignKey, Text, JSON
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID
from app.database import Base
from app.models.base import TimestampMixin
import uuid

class Ticket(Base, TimestampMixin):
    __tablename__ = "tickets"
    
    display_id: Mapped[str] = mapped_column(String, unique=True, index=True)  # e.g., TKT-5000
    title: Mapped[str] = mapped_column(String)
    description: Mapped[str] = mapped_column(Text)
    priority: Mapped[str] = mapped_column(String)  # Low, Medium, High, Critical
    category: Mapped[str] = mapped_column(String)
    status: Mapped[str] = mapped_column(String)  # Open, Assigned, In Progress, Waiting, Escalated, Pending Administration Approval, Approved for Asset Manager, Resolved, Closed
    
    created_by_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"))
    assignee_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    asset_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("assets.id"), nullable=True)
    
    sla: Mapped[str] = mapped_column(String)  # On Track, At Risk, Breached
    support_resolution: Mapped[str] = mapped_column(Text, nullable=True)
    admin_remarks: Mapped[str] = mapped_column(Text, nullable=True)
    
    asset_action: Mapped[str] = mapped_column(String, nullable=True)  # Repair, Replace, Reassign
    asset_details: Mapped[str] = mapped_column(Text, nullable=True)
    asset_remarks: Mapped[str] = mapped_column(Text, nullable=True)
    asset_resolution: Mapped[str] = mapped_column(Text, nullable=True)
    
    assigned_role: Mapped[str] = mapped_column(String, nullable=True)  # Role of assignee needed (e.g. support, admin, asset_manager)
    timeline: Mapped[list] = mapped_column(JSON, nullable=True)  # History timeline events
    audit_trail: Mapped[list] = mapped_column(JSON, nullable=True)  # Security/status changes audit
    attachments: Mapped[list] = mapped_column(JSON, nullable=True)  # File attachment URLs
    
    # Relationships
    creator = relationship(
        "User", 
        back_populates="created_tickets", 
        foreign_keys=[created_by_id]
    )
    assignee = relationship(
        "User", 
        back_populates="assigned_tickets", 
        foreign_keys=[assignee_id]
    )
    asset = relationship("Asset", back_populates="tickets")
    comments = relationship("TicketComment", back_populates="ticket", cascade="all, delete-orphan")


class TicketComment(Base, TimestampMixin):
    __tablename__ = "ticket_comments"
    
    ticket_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("tickets.id"))
    author_name: Mapped[str] = mapped_column(String)
    message: Mapped[str] = mapped_column(Text)
    
    # Relationships
    ticket = relationship("Ticket", back_populates="comments")
