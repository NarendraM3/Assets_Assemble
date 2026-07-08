from fastapi import APIRouter, Depends, Query, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.dependencies import get_db, get_current_user, RoleChecker
from app.models.user import User
from app.models.ticket import Ticket
from app.services.ticket import ticket_service
from app.repositories.ticket import ticket_repository
from app.schemas.base import ApiResponse, PaginatedData
from app.schemas.ticket import (
    TicketResponse, TicketCreate, TicketUpdate, TicketCommentResponse,
    TicketCommentCreate, TicketResolveAsset, TicketReviewEscalation
)
from typing import Optional, List
import uuid

router = APIRouter(prefix="/tickets", tags=["Tickets"])

@router.get("", response_model=ApiResponse[PaginatedData[TicketResponse]])
async def list_tickets(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
    page: int = Query(1, ge=1),
    limit: int = Query(15, ge=1, le=10000),
    sort_by: Optional[str] = Query(None),
    sort_desc: bool = Query(False),
    search: Optional[str] = Query(None),
    category: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    priority: Optional[str] = Query(None)
):
    """Retrieve filtered tickets matching the role permissions of the logged-in user."""
    filters = {}
    if category:
        filters["category"] = category
    if status and status != "all":
        filters["status"] = status
    if priority:
        filters["priority"] = priority

    # Role-based ticket scoping
    role = current_user.role
    items = []
    total = 0
    
    # We query using the repository's generic query with query injections for scoping
    query = select(Ticket).where(Ticket.is_active == True)
    
    # Scoping filters
    if role == "employee":
        # Employees only see their own tickets
        query = query.where(Ticket.created_by_id == current_user.id)
    elif role == "support":
        # Support engineers see all except those locked to admin / asset manager workflows
        query = query.where(Ticket.assigned_role.in_(["support", None]))
    elif role == "admin":
        # Admins see administration queues (escalations, resolved)
        query = query.where(Ticket.status.in_(["Pending Administration Approval", "Approved for Asset Manager", "Resolved"]))
    elif role == "asset_manager":
        # Asset managers see approved escalations or resolved asset tickets
        query = query.where(Ticket.status.in_(["Approved for Asset Manager", "Resolved"]))
        
    # Apply standard query configurations
    for field, val in filters.items():
        if val is not None and hasattr(Ticket, field):
            query = query.where(getattr(Ticket, field) == val)
            
    if search:
        search_term = f"%{search}%"
        # Since creator and assignee names are stored in joined tables (or display fields in ticket), 
        # we can join creators/assignees if needed, but standard search covers titles
        query = query.where(Ticket.title.ilike(search_term))
        
    # Sort
    if sort_by and hasattr(Ticket, sort_by):
        col = getattr(Ticket, sort_by)
        query = query.order_by(col.desc() if sort_desc else col.asc())
    else:
        query = query.order_by(Ticket.created_at.desc())
        
    # Count total
    from sqlalchemy import func
    count_query = select(func.count()).select_from(query.subquery())
    total = (await db.execute(count_query)).scalar() or 0
    
    # Pagination & Load relationship comments
    from sqlalchemy.orm import selectinload
    query = query.offset((page - 1) * limit).limit(limit).options(selectinload(Ticket.comments))
    result = await db.execute(query)
    items = list(result.scalars().all())
    
    schemas = [TicketResponse.model_validate(item) for item in items]
    
    return ApiResponse(
        success=True,
        message="Tickets retrieved successfully",
        data=PaginatedData(
            items=schemas,
            total=total,
            page=page,
            limit=limit
        )
    )

@router.post("", response_model=ApiResponse[TicketResponse])
async def raise_ticket(
    ticket_in: TicketCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Raise a support ticket. Available to all logged-in users."""
    ticket = await ticket_service.create_ticket(db, ticket_in, current_user)
    # Reload with comments
    ticket = await ticket_repository.get_with_comments(db, ticket.id)
    return ApiResponse(
        success=True,
        message="Support ticket raised successfully",
        data=TicketResponse.model_validate(ticket)
    )

@router.post("/{ticket_id}/accept", response_model=ApiResponse[TicketResponse])
async def accept_ticket(
    ticket_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(RoleChecker(["admin", "support"]))
):
    """Assign a ticket in the support queue to yourself. Support only."""
    ticket = await ticket_service.accept_ticket(db, ticket_id, current_user)
    # Reload with comments
    ticket = await ticket_repository.get_with_comments(db, ticket.id)
    return ApiResponse(
        success=True,
        message="Ticket accepted into queue",
        data=TicketResponse.model_validate(ticket)
    )

@router.post("/{ticket_id}/comments", response_model=ApiResponse[TicketCommentResponse])
async def add_comment(
    ticket_id: uuid.UUID,
    comment_in: TicketCommentCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Add a new comment/message to a ticket's activity trail."""
    comment = await ticket_service.add_comment(db, ticket_id, current_user, comment_in.message)
    return ApiResponse(
        success=True,
        message="Comment added to ticket conversation",
        data=TicketCommentResponse.model_validate(comment)
    )

@router.patch("/{ticket_id}/status", response_model=ApiResponse[TicketResponse])
async def update_status(
    ticket_id: uuid.UUID,
    payload: TicketUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Update a ticket's status (with comments support)."""
    # Grab the status value or comments from payload if any
    status_val = payload.status
    if not status_val:
        raise HTTPException(status_code=400, detail="Status field is required")
        
    comment_msg = payload.support_resolution or "Status updated"
    
    ticket = await ticket_service.update_ticket_status(
        db, ticket_id=ticket_id, status_val=status_val, actor=current_user, comment_msg=comment_msg
    )
    # Reload comments
    ticket = await ticket_repository.get_with_comments(db, ticket.id)
    return ApiResponse(
        success=True,
        message=f"Ticket status set to {status_val}",
        data=TicketResponse.model_validate(ticket)
    )

@router.post("/{ticket_id}/escalate", response_model=ApiResponse[TicketResponse])
async def escalate_ticket(
    ticket_id: uuid.UUID,
    payload: TicketUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(RoleChecker(["admin", "support"]))
):
    """Escalate a ticket to Admin approval. Support only."""
    remarks = payload.support_resolution or "Requires administration approval"
    ticket = await ticket_service.escalate_ticket(db, ticket_id, current_user, remarks)
    # Reload comments
    ticket = await ticket_repository.get_with_comments(db, ticket.id)
    return ApiResponse(
        success=True,
        message="Ticket escalation submitted to Administration",
        data=TicketResponse.model_validate(ticket)
    )

@router.post("/{ticket_id}/review-escalation", response_model=ApiResponse[TicketResponse])
async def review_escalation(
    ticket_id: uuid.UUID,
    review: TicketReviewEscalation,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(RoleChecker(["admin"]))
):
    """Approve or reject a support escalation request. Admin only."""
    ticket = await ticket_service.review_escalation(
        db, ticket_id=ticket_id, approved=review.approved, actor=current_user, remarks=review.remarks
    )
    # Reload comments
    ticket = await ticket_repository.get_with_comments(db, ticket.id)
    return ApiResponse(
        success=True,
        message="Escalation review completed",
        data=TicketResponse.model_validate(ticket)
    )

@router.post("/{ticket_id}/resolve-asset", response_model=ApiResponse[TicketResponse])
async def resolve_asset_action(
    ticket_id: uuid.UUID,
    details: TicketResolveAsset,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(RoleChecker(["admin", "asset_manager"]))
):
    """Perform inventory actions (Repair/Replace/Reassign) and resolve ticket. Asset Manager only."""
    ticket = await ticket_service.resolve_asset_ticket(
        db, ticket_id=ticket_id, details=details, actor=current_user
    )
    # Reload comments
    ticket = await ticket_repository.get_with_comments(db, ticket.id)
    return ApiResponse(
        success=True,
        message="Inventory actions recorded. Ticket resolved.",
        data=TicketResponse.model_validate(ticket)
    )

from fastapi import UploadFile, File
import shutil
import os

@router.post("/upload", response_model=ApiResponse[List[str]])
async def upload_attachments(
    files: List[UploadFile] = File(...),
    current_user: User = Depends(get_current_user)
):
    """Upload ticket attachments (screenshots, logs)."""
    uploaded_urls = []
    upload_dir = "static/uploads"
    os.makedirs(upload_dir, exist_ok=True)
    
    for file in files:
        safe_filename = "".join(c for c in file.filename if c.isalnum() or c in "._-")
        unique_filename = f"{uuid.uuid4().hex[:8]}_{safe_filename}"
        file_path = os.path.join(upload_dir, unique_filename)
        
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
            
        uploaded_urls.append(f"/static/uploads/{unique_filename}")
        
    return ApiResponse(
        success=True,
        message="Files uploaded successfully",
        data=uploaded_urls
    )
