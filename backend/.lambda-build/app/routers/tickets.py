from fastapi import APIRouter, Depends, Query, HTTPException, status
from boto3.dynamodb.conditions import Attr
from app.dependencies import get_db, get_current_user, RoleChecker
from app.models.user import User
from app.models.ticket import Ticket
from app.services.ticket import ticket_service
from app.repositories.ticket import ticket_repository
from app.schemas.base import ApiResponse, PaginatedData
from app.schemas.ticket import (
    TicketResponse, TicketCreate, TicketUpdate, TicketCommentResponse,
    TicketCommentCreate, TicketResolveAsset, TicketReviewEscalation,
)
from app.dynamodb import get_table, TICKETS_TABLE, TICKET_COMMENTS_TABLE
from typing import Optional, List
import uuid

router = APIRouter(prefix="/tickets", tags=["Tickets"])


@router.get("", response_model=ApiResponse[PaginatedData[TicketResponse]])
async def list_tickets(
    db=Depends(get_db),
    current_user: User = Depends(get_current_user),
    page: int = Query(1, ge=1),
    limit: int = Query(15, ge=1, le=10000),
    sort_by: Optional[str] = Query(None),
    sort_desc: bool = Query(False),
    search: Optional[str] = Query(None),
    category: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    priority: Optional[str] = Query(None),
):
    table = get_table(TICKETS_TABLE)
    filter_expr = Attr("is_active").eq(True)

    role = current_user.role
    if role == "employee":
        filter_expr = filter_expr & Attr("created_by_id").eq(str(current_user.id))
    elif role == "support":
        filter_expr = filter_expr & Attr("assigned_role").is_in(["support", None])
    elif role == "admin":
        filter_expr = filter_expr & Attr("status").is_in(["Pending Administration Approval", "Approved for Asset Manager", "Resolved"])
    elif role == "asset_manager":
        filter_expr = filter_expr & Attr("status").is_in(["Approved for Asset Manager", "Resolved"])

    if category:
        filter_expr = filter_expr & Attr("category").eq(category)
    if status and status != "all":
        filter_expr = filter_expr & Attr("status").eq(status)
    if priority:
        filter_expr = filter_expr & Attr("priority").eq(priority)

    if search:
        filter_expr = filter_expr & Attr("title").contains(search)

    response = await table.scan(FilterExpression=filter_expr)
    all_items = response.get("Items", [])

    if sort_by:
        all_items.sort(key=lambda x: x.get(sort_by, ""), reverse=sort_desc)
    else:
        all_items.sort(key=lambda x: x.get("created_at", ""), reverse=True)

    total = len(all_items)
    offset = (page - 1) * limit
    page_items = all_items[offset: offset + limit]

    cmt_table = get_table(TICKET_COMMENTS_TABLE)
    schemas = []
    for item in page_items:
        cmts = await cmt_table.scan(
            FilterExpression=Attr("ticket_id").eq(item["id"]) & Attr("is_active").eq(True)
        )
        comments_list = cmts.get("Items", [])
        comments_list.sort(key=lambda x: x.get("created_at", ""))
        item["comments"] = comments_list
        schemas.append(TicketResponse.model_validate(item))

    return ApiResponse(
        success=True,
        message="Tickets retrieved successfully",
        data=PaginatedData(
            items=schemas,
            total=total,
            page=page,
            limit=limit,
        ),
    )


@router.post("", response_model=ApiResponse[TicketResponse])
async def raise_ticket(
    ticket_in: TicketCreate,
    db=Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    ticket = await ticket_service.create_ticket(ticket_in, current_user)
    ticket = await ticket_repository.get_with_comments(ticket.id)
    return ApiResponse(
        success=True,
        message="Support ticket raised successfully",
        data=TicketResponse.model_validate(ticket),
    )


@router.post("/{ticket_id}/accept", response_model=ApiResponse[TicketResponse])
async def accept_ticket(
    ticket_id: str,
    db=Depends(get_db),
    current_user: User = Depends(RoleChecker(["admin", "support"])),
):
    ticket = await ticket_service.accept_ticket(ticket_id, current_user)
    ticket = await ticket_repository.get_with_comments(ticket.id)
    return ApiResponse(
        success=True,
        message="Ticket accepted into queue",
        data=TicketResponse.model_validate(ticket),
    )


@router.post("/{ticket_id}/comments", response_model=ApiResponse[TicketCommentResponse])
async def add_comment(
    ticket_id: str,
    comment_in: TicketCommentCreate,
    db=Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    comment = await ticket_service.add_comment(ticket_id, current_user, comment_in.message)
    return ApiResponse(
        success=True,
        message="Comment added to ticket conversation",
        data=TicketCommentResponse.model_validate(comment),
    )


@router.patch("/{ticket_id}/status", response_model=ApiResponse[TicketResponse])
async def update_status(
    ticket_id: str,
    payload: TicketUpdate,
    db=Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    status_val = payload.status
    if not status_val:
        raise HTTPException(status_code=400, detail="Status field is required")

    comment_msg = payload.support_resolution or "Status updated"

    ticket = await ticket_service.update_ticket_status(
        ticket_id=ticket_id, status_val=status_val, actor=current_user, comment_msg=comment_msg,
    )
    ticket = await ticket_repository.get_with_comments(ticket.id)
    return ApiResponse(
        success=True,
        message=f"Ticket status set to {status_val}",
        data=TicketResponse.model_validate(ticket),
    )


@router.post("/{ticket_id}/escalate", response_model=ApiResponse[TicketResponse])
async def escalate_ticket(
    ticket_id: str,
    payload: TicketUpdate,
    db=Depends(get_db),
    current_user: User = Depends(RoleChecker(["admin", "support"])),
):
    remarks = payload.support_resolution or "Requires administration approval"
    ticket = await ticket_service.escalate_ticket(ticket_id, current_user, remarks)
    ticket = await ticket_repository.get_with_comments(ticket.id)
    return ApiResponse(
        success=True,
        message="Ticket escalation submitted to Administration",
        data=TicketResponse.model_validate(ticket),
    )


@router.post("/{ticket_id}/review-escalation", response_model=ApiResponse[TicketResponse])
async def review_escalation(
    ticket_id: str,
    review: TicketReviewEscalation,
    db=Depends(get_db),
    current_user: User = Depends(RoleChecker(["admin"])),
):
    ticket = await ticket_service.review_escalation(
        ticket_id=ticket_id, approved=review.approved, actor=current_user, remarks=review.remarks,
    )
    ticket = await ticket_repository.get_with_comments(ticket.id)
    return ApiResponse(
        success=True,
        message="Escalation review completed",
        data=TicketResponse.model_validate(ticket),
    )


@router.post("/{ticket_id}/resolve-asset", response_model=ApiResponse[TicketResponse])
async def resolve_asset_action(
    ticket_id: str,
    details: TicketResolveAsset,
    db=Depends(get_db),
    current_user: User = Depends(RoleChecker(["admin", "asset_manager"])),
):
    ticket = await ticket_service.resolve_asset_ticket(
        ticket_id=ticket_id, details=details, actor=current_user,
    )
    ticket = await ticket_repository.get_with_comments(ticket.id)
    return ApiResponse(
        success=True,
        message="Inventory actions recorded. Ticket resolved.",
        data=TicketResponse.model_validate(ticket),
    )


from fastapi import UploadFile, File
import shutil
import os


@router.post("/upload", response_model=ApiResponse[List[str]])
async def upload_attachments(
    files: List[UploadFile] = File(...),
    current_user: User = Depends(get_current_user),
):
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
        data=uploaded_urls,
    )
