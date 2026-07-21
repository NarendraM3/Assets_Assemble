import secrets
import string
from datetime import datetime
from typing import Optional, List
from app.core.security import verify_password, get_password_hash, create_access_token, create_refresh_token
from app.repositories.user import user_repository
from app.repositories.audit_log import audit_log_repository
from app.schemas.user import UserCreate, UserUpdate, UserLogin, TokenResponseData
from app.email.email import email_service
from app.database import generate_id, utcnow_str, today_str
from fastapi import HTTPException, status


def generate_temp_password(length: int = 10) -> str:
    chars = string.ascii_letters + string.digits + "!@#$%&"
    return "".join(secrets.choice(chars) for _ in range(length))


class UserService:
    async def authenticate(self, credentials: UserLogin):
        user = await user_repository.get_by_email(credentials.email)
        if not user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Incorrect email or password",
                headers={"WWW-Authenticate": "Bearer"},
            )

        if not verify_password(credentials.password, user.password_hash):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Incorrect email or password",
                headers={"WWW-Authenticate": "Bearer"},
            )

        next_log_num = secrets.randbelow(1000)
        await audit_log_repository.create({
            "id": generate_id(),
            "display_id": f"LOG-L{next_log_num}",
            "action": "User Login",
            "user": user.name,
            "target": str(user.id),
            "timestamp": today_str(),
            "ip": "127.0.0.1",
            "created_at": utcnow_str(),
            "updated_at": utcnow_str(),
            "is_active": True,
        })

        access_token = create_access_token(subject=user.id)
        refresh_token = create_refresh_token(subject=user.id)

        return TokenResponseData(
            access_token=access_token,
            refresh_token=refresh_token,
            user=user,
        )

    async def get_user_profile(self, user_id: str):
        return await user_repository.get(user_id)

    async def create_user(self, user_in: UserCreate, actor_name: str):
        existing = await user_repository.get_by_email_raw(user_in.email)
        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email already registered (archived account exists)"
            )

        db_count = await user_repository.count_users()
        display_id = f"EMP-{1000 + db_count}"

        temp_pwd = generate_temp_password()
        hashed_pwd = get_password_hash(temp_pwd)

        avatar_initials = "".join([part[0].upper() for part in user_in.name.split() if part])[:2] or "EE"

        stamp = datetime.now().strftime("%b %d, %Y %I:%M %p")
        history = [
            {"step": "Employee Created", "timestamp": stamp, "actor": actor_name, "remarks": "Employee record created."},
            {"step": "Awaiting Asset Verification", "timestamp": stamp, "actor": "System", "remarks": f"Asset verification request queued for required category {user_in.required_asset_category or 'Laptop'}."}
        ]

        user_data = user_in.model_dump()
        user_data.update({
            "id": generate_id(),
            "display_id": display_id,
            "password_hash": hashed_pwd,
            "avatar": avatar_initials,
            "must_change_password": True,
            "allocation_status": "Awaiting Asset Verification" if user_in.required_asset_category else None,
            "verification_status": "Pending" if user_in.required_asset_category else None,
            "allocation_history": history if user_in.required_asset_category else None,
            "created_at": utcnow_str(),
            "updated_at": utcnow_str(),
            "is_active": True,
        })

        new_user = await user_repository.create(user_data)

        await email_service.send_temporary_password_email(
            name=new_user.name,
            email=new_user.email,
            temp_password=temp_pwd,
            role=new_user.role,
            login_url="http://localhost:8080/login",
        )

        await audit_log_repository.create({
            "id": generate_id(),
            "display_id": f"LOG-C{secrets.randbelow(1000)}",
            "action": "Employee Created",
            "user": actor_name,
            "target": display_id,
            "timestamp": today_str(),
            "ip": "127.0.0.1",
            "created_at": utcnow_str(),
            "updated_at": utcnow_str(),
            "is_active": True,
        })

        return new_user

    async def create_user_detailed(self, user_in: UserCreate, actor_name: str):
        existing = await user_repository.get_by_email_raw(user_in.email)
        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email already registered (archived account exists)"
            )

        db_count = await user_repository.count_users()
        display_id = f"EMP-{1000 + db_count}"

        temp_pwd = generate_temp_password()
        hashed_pwd = get_password_hash(temp_pwd)

        avatar_initials = "".join([part[0].upper() for part in user_in.name.split() if part])[:2] or "EE"

        stamp = datetime.now().strftime("%b %d, %Y %I:%M %p")
        history = [
            {"step": "Employee Created", "timestamp": stamp, "actor": actor_name, "remarks": "Employee record created."},
            {"step": "Awaiting Asset Verification", "timestamp": stamp, "actor": "System", "remarks": f"Asset verification request queued for required category {user_in.required_asset_category or 'Laptop'}."}
        ]

        user_data = user_in.model_dump()
        user_data.update({
            "id": generate_id(),
            "display_id": display_id,
            "password_hash": hashed_pwd,
            "avatar": avatar_initials,
            "must_change_password": True,
            "allocation_status": "Awaiting Asset Verification" if user_in.required_asset_category else None,
            "verification_status": "Pending" if user_in.required_asset_category else None,
            "allocation_history": history if user_in.required_asset_category else None,
            "created_at": utcnow_str(),
            "updated_at": utcnow_str(),
            "is_active": True,
        })

        new_user = await user_repository.create(user_data)

        await email_service.send_temporary_password_email(
            name=new_user.name,
            email=new_user.email,
            temp_password=temp_pwd,
            role=new_user.role,
            login_url="http://localhost:8080/login",
        )

        await audit_log_repository.create({
            "id": generate_id(),
            "display_id": f"LOG-C{secrets.randbelow(1000)}",
            "action": "Employee Created",
            "user": actor_name,
            "target": display_id,
            "timestamp": today_str(),
            "ip": "127.0.0.1",
            "created_at": utcnow_str(),
            "updated_at": utcnow_str(),
            "is_active": True,
        })

        return new_user, temp_pwd

    async def update_user(self, user_id: str, user_in: UserUpdate, actor_name: str):
        user = await user_repository.get(user_id)
        if not user:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

        update_data = user_in.model_dump(exclude_unset=True)
        update_data["updated_at"] = utcnow_str()
        updated = await user_repository.update(user_id, update_data)

        await audit_log_repository.create({
            "id": generate_id(),
            "display_id": f"LOG-U{secrets.randbelow(1000)}",
            "action": "Employee Updated",
            "user": actor_name,
            "target": user.display_id,
            "timestamp": today_str(),
            "ip": "127.0.0.1",
            "created_at": utcnow_str(),
            "updated_at": utcnow_str(),
            "is_active": True,
        })
        return updated

    async def delete_user(self, user_id: str, actor_name: str):
        user = await user_repository.get_raw(user_id)
        if not user:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

        user_dict = {
            "id": user.id,
            "display_id": user.display_id,
            "name": user.name,
            "email": user.email,
            "role": user.role,
            "department": user.department,
            "designation": user.designation,
            "manager": user.manager,
            "location": user.location,
            "status": user.status,
            "avatar": user.avatar,
            "phone": user.phone,
            "join_date": user.join_date,
            "must_change_password": user.must_change_password,
            "allocation_date": user.allocation_date,
            "allocation_time": user.allocation_time,
            "allocation_status": user.allocation_status,
            "required_asset_category": user.required_asset_category,
            "allocated_asset_details": user.allocated_asset_details,
            "allocation_history": user.allocation_history,
            "created_at": user.created_at,
            "updated_at": user.updated_at,
        }

        from boto3.dynamodb.conditions import Attr
        from app.dynamodb import get_table, ASSIGNMENTS_TABLE, TICKETS_TABLE, TICKET_COMMENTS_TABLE, NOTIFICATIONS_TABLE

        asg_table = get_table(ASSIGNMENTS_TABLE)
        response = await asg_table.scan(FilterExpression=Attr("employee_id").eq(user_id))
        for item in response.get("Items", []):
            await asg_table.delete_item(Key={"id": item["id"]})

        tkt_table = get_table(TICKETS_TABLE)
        response = await tkt_table.scan(
            FilterExpression=Attr("created_by_id").eq(user_id) | Attr("assignee_id").eq(user_id)
        )
        ticket_ids = [item["id"] for item in response.get("Items", [])]

        cmt_table = get_table(TICKET_COMMENTS_TABLE)
        for tid in ticket_ids:
            cmts = await cmt_table.scan(FilterExpression=Attr("ticket_id").eq(tid))
            for c in cmts.get("Items", []):
                await cmt_table.delete_item(Key={"id": c["id"]})

        for tid in ticket_ids:
            await tkt_table.delete_item(Key={"id": tid})

        notif_table = get_table(NOTIFICATIONS_TABLE)
        response = await notif_table.scan(FilterExpression=Attr("user_id").eq(user_id))
        for item in response.get("Items", []):
            await notif_table.delete_item(Key={"id": item["id"]})

        await user_repository.remove(user_id)

        await audit_log_repository.create({
            "id": generate_id(),
            "display_id": f"LOG-D{secrets.randbelow(1000)}",
            "action": "Employee Deleted",
            "user": actor_name,
            "target": user_dict["display_id"],
            "timestamp": today_str(),
            "ip": "127.0.0.1",
            "created_at": utcnow_str(),
            "updated_at": utcnow_str(),
            "is_active": True,
        })
        return user_dict

    async def change_password(self, user, old_pwd: str, new_pwd: str):
        if not verify_password(old_pwd, user.password_hash):
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid current password")

        await user_repository.update(user.id, {
            "password_hash": get_password_hash(new_pwd),
            "must_change_password": False,
            "updated_at": utcnow_str(),
        })

        await audit_log_repository.create({
            "id": generate_id(),
            "display_id": f"LOG-P{secrets.randbelow(1000)}",
            "action": "Password Changed",
            "user": user.name,
            "target": user.display_id,
            "timestamp": today_str(),
            "ip": "127.0.0.1",
            "created_at": utcnow_str(),
            "updated_at": utcnow_str(),
            "is_active": True,
        })

    async def force_change_password(self, user, new_pwd: str):
        await user_repository.update(user.id, {
            "password_hash": get_password_hash(new_pwd),
            "must_change_password": False,
            "updated_at": utcnow_str(),
        })

        await audit_log_repository.create({
            "id": generate_id(),
            "display_id": f"LOG-F{secrets.randbelow(1000)}",
            "action": "Password Force-Reset",
            "user": user.name,
            "target": user.display_id,
            "timestamp": today_str(),
            "ip": "127.0.0.1",
            "created_at": utcnow_str(),
            "updated_at": utcnow_str(),
            "is_active": True,
        })

    async def get_recent_users(self, limit: int = 10):
        from boto3.dynamodb.conditions import Attr
        from app.dynamodb import get_table, USERS_TABLE
        table = get_table(USERS_TABLE)
        response = await table.scan(
            FilterExpression=Attr("role").eq("employee")
        )
        items = response.get("Items", [])
        items.sort(key=lambda x: x.get("created_at", ""), reverse=True)
        from app.models.user import User
        return [User(**item) for item in items[:limit]]

    async def get_full_profile(self, user_id: str):
        from boto3.dynamodb.conditions import Attr
        from app.dynamodb import get_table, ASSETS_TABLE, TICKETS_TABLE, AUDIT_LOGS_TABLE, TICKET_COMMENTS_TABLE
        from app.models.asset import Asset
        from app.models.ticket import Ticket, TicketComment
        from app.models.audit_log import AuditLog

        user = await user_repository.get_raw(user_id)
        if not user:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Employee not found")

        asset_table = get_table(ASSETS_TABLE)
        response = await asset_table.scan(
            FilterExpression=Attr("assigned_to_id").eq(user_id) & Attr("status").eq("Assigned")
        )
        assigned_assets = [Asset(**item) for item in response.get("Items", [])]

        tkt_table = get_table(TICKETS_TABLE)
        response = await tkt_table.scan(
            FilterExpression=Attr("created_by_id").eq(user_id) | Attr("assignee_id").eq(user_id)
        )
        tickets_raw = response.get("Items", [])
        tickets_raw.sort(key=lambda x: x.get("created_at", ""), reverse=True)

        tickets = []
        for t in tickets_raw:
            ticket = Ticket(**t)
            cmt_table = get_table(TICKET_COMMENTS_TABLE)
            cmts = await cmt_table.scan(
                FilterExpression=Attr("ticket_id").eq(ticket.id) & Attr("is_active").eq(True)
            )
            comments_list = cmts.get("Items", [])
            comments_list.sort(key=lambda x: x.get("created_at", ""))
            ticket.comments = [TicketComment(**c) for c in comments_list]
            tickets.append(ticket)

        audit_table = get_table(AUDIT_LOGS_TABLE)
        response = await audit_table.scan(
            FilterExpression=Attr("action").eq("User Login") & Attr("target").eq(user_id)
        )
        login_items = response.get("Items", [])
        login_items.sort(key=lambda x: x.get("created_at", ""), reverse=True)
        last_login = AuditLog(**login_items[0]) if login_items else None

        return {
            "user": user,
            "assigned_assets": assigned_assets,
            "tickets": tickets,
            "last_login": last_login,
        }


user_service = UserService()
