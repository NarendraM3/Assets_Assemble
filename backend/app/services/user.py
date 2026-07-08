import secrets
import string
from datetime import datetime
from typing import Optional, Tuple, Dict, Any, List
import uuid
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.security import verify_password, get_password_hash, create_access_token, create_refresh_token
from app.models.user import User
from app.repositories.user import user_repository
from app.repositories.audit_log import audit_log_repository
from app.schemas.user import UserCreate, UserUpdate, UserLogin, TokenResponseData
from app.email.email import email_service
from fastapi import HTTPException, status

def generate_temp_password(length: int = 10) -> str:
    """Generate a secure temporary password."""
    chars = string.ascii_letters + string.digits + "!@#$%&"
    return "".join(secrets.choice(chars) for _ in range(length))

class UserService:
    async def authenticate(self, db: AsyncSession, credentials: UserLogin) -> TokenResponseData:
        """Authenticate user email/password, return access/refresh tokens and user details."""
        user = await user_repository.get_by_email(db, credentials.email)
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
            
        # Log successful login to Audit Logs
        next_log_num = secrets.randbelow(1000)
        await audit_log_repository.create(db, {
            "display_id": f"LOG-L{next_log_num}",
            "action": "User Login",
            "user": user.name,
            "target": str(user.id),
            "timestamp": datetime.utcnow().strftime("%Y-%m-%d"),
            "ip": "127.0.0.1"
        })
        
        access_token = create_access_token(subject=user.id)
        refresh_token = create_refresh_token(subject=user.id)
        
        return TokenResponseData(
            access_token=access_token,
            refresh_token=refresh_token,
            user=user
        )

    async def get_user_profile(self, db: AsyncSession, user_id: uuid.UUID) -> Optional[User]:
        """Fetch user by UUID."""
        return await user_repository.get(db, user_id)

    async def create_user(self, db: AsyncSession, user_in: UserCreate, actor_name: str) -> User:
        """Create a new employee/user, generate temp password, send onboarding email."""
        existing = await user_repository.get_by_email_raw(db, user_in.email)
        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email already registered (archived account exists)"
            )
            
        # Determine employee sequence display ID
        db_count = await user_repository.count_users(db)
        display_id = f"EMP-{1000 + db_count}"
        
        temp_pwd = generate_temp_password()
        hashed_pwd = get_password_hash(temp_pwd)
        
        avatar_initials = "".join([part[0].upper() for part in user_in.name.split() if part])[:2] or "EE"
        
        # Onboarding history
        stamp = datetime.now().strftime("%b %d, %Y %I:%M %p")
        history = [
            {"step": "Employee Created", "timestamp": stamp, "actor": actor_name, "remarks": "Employee record created."},
            {"step": "Awaiting Asset Verification", "timestamp": stamp, "actor": "System", "remarks": f"Asset verification request queued for required category {user_in.required_asset_category or 'Laptop'}."}
        ]
        
        user_data = user_in.model_dump()
        user_data.update({
            "display_id": display_id,
            "password_hash": hashed_pwd,
            "avatar": avatar_initials,
            "must_change_password": True,
            "allocation_status": "Awaiting Asset Verification" if user_in.required_asset_category else None,
            "allocation_history": history if user_in.required_asset_category else None
        })
        
        new_user = await user_repository.create(db, user_data)
        
        # Dispatch temporary password email
        await email_service.send_temporary_password_email(
            name=new_user.name,
            email=new_user.email,
            temp_password=temp_pwd,
            role=new_user.role,
            login_url="http://localhost:8080/login"
        )
        
        # Log to audit trails
        await audit_log_repository.create(db, {
            "display_id": f"LOG-C{secrets.randbelow(1000)}",
            "action": "Employee Created",
            "user": actor_name,
            "target": display_id,
            "timestamp": datetime.utcnow().strftime("%Y-%m-%d"),
            "ip": "127.0.0.1"
        })
        
        return new_user

    async def update_user(self, db: AsyncSession, user_id: uuid.UUID, user_in: UserUpdate, actor_name: str) -> User:
        """Update an employee's details."""
        user = await user_repository.get(db, user_id)
        if not user:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
            
        update_data = user_in.model_dump(exclude_unset=True)
        updated = await user_repository.update(db, user, update_data)
        
        await audit_log_repository.create(db, {
            "display_id": f"LOG-U{secrets.randbelow(1000)}",
            "action": "Employee Updated",
            "user": actor_name,
            "target": user.display_id,
            "timestamp": datetime.utcnow().strftime("%Y-%m-%d"),
            "ip": "127.0.0.1"
        })
        return updated

    async def delete_user(self, db: AsyncSession, user_id: uuid.UUID, actor_name: str) -> dict:
        """Hard delete an employee's account from the database along with associated records."""
        user = await user_repository.get_raw(db, user_id)
        if not user:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
            
        # Extract attributes to a dict BEFORE deleting, so we can return them safely to Pydantic
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
            "updated_at": user.updated_at
        }
            
        from sqlalchemy import delete, select
        from app.models.assignment import Assignment
        from app.models.ticket import Ticket, TicketComment
        from app.models.notification import Notification

        # 1. Delete asset assignments assigned to this user
        await db.execute(delete(Assignment).where(Assignment.employee_id == user_id))
        
        # 2. Delete comments on tickets created by or assigned to this user
        subq = select(Ticket.id).where((Ticket.created_by_id == user_id) | (Ticket.assignee_id == user_id))
        await db.execute(delete(TicketComment).where(TicketComment.ticket_id.in_(subq)))
        
        # 3. Delete tickets created by or assigned to this user
        await db.execute(delete(Ticket).where((Ticket.created_by_id == user_id) | (Ticket.assignee_id == user_id)))
        
        # 4. Delete notifications for this user
        await db.execute(delete(Notification).where(Notification.user_id == user_id))
        
        # 5. Hard delete the user record
        await db.delete(user)
        await db.flush()
        
        # Log deletion activity in audit trail
        await audit_log_repository.create(db, {
            "display_id": f"LOG-D{secrets.randbelow(1000)}",
            "action": "Employee Deleted",
            "user": actor_name,
            "target": user_dict["display_id"],
            "timestamp": datetime.utcnow().strftime("%Y-%m-%d"),
            "ip": "127.0.0.1"
        })
        return user_dict

    async def change_password(self, db: AsyncSession, user: User, old_pwd: str, new_pwd: str) -> None:
        """Change user's password verifying old credentials."""
        if not verify_password(old_pwd, user.password_hash):
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid current password")
            
        user.password_hash = get_password_hash(new_pwd)
        user.must_change_password = False
        db.add(user)
        await db.flush()
        
        await audit_log_repository.create(db, {
            "display_id": f"LOG-P{secrets.randbelow(1000)}",
            "action": "Password Changed",
            "user": user.name,
            "target": user.display_id,
            "timestamp": datetime.utcnow().strftime("%Y-%m-%d"),
            "ip": "127.0.0.1"
        })

    async def force_change_password(self, db: AsyncSession, user: User, new_pwd: str) -> None:
        """Change password without old credentials verification (for first login forced change)."""
        user.password_hash = get_password_hash(new_pwd)
        user.must_change_password = False
        db.add(user)
        await db.flush()
        
        await audit_log_repository.create(db, {
            "display_id": f"LOG-F{secrets.randbelow(1000)}",
            "action": "Password Force-Reset",
            "user": user.name,
            "target": user.display_id,
            "timestamp": datetime.utcnow().strftime("%Y-%m-%d"),
            "ip": "127.0.0.1"
        })

    async def get_recent_users(self, db: AsyncSession, limit: int = 10) -> List[User]:
        """Fetch recently joined employee accounts."""
        from sqlalchemy import select
        query = select(User).where(User.role == "employee").order_by(User.created_at.desc()).limit(limit)
        result = await db.execute(query)
        return list(result.scalars().all())

    async def get_full_profile(self, db: AsyncSession, user_id: uuid.UUID) -> dict:
        """Query and return a unified profile dictionary for a specific user."""
        from sqlalchemy import select
        from sqlalchemy.orm import selectinload
        from app.models.asset import Asset
        from app.models.ticket import Ticket
        from app.models.audit_log import AuditLog

        user = await user_repository.get_raw(db, user_id)
        if not user:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Employee not found")
            
        # 1. Fetch assigned assets
        asset_query = select(Asset).where(Asset.assigned_to_id == user_id, Asset.status == "Assigned")
        asset_result = await db.execute(asset_query)
        assigned_assets = list(asset_result.scalars().all())
        
        # 2. Fetch tickets (created by or assigned to this user)
        ticket_query = (
            select(Ticket)
            .where((Ticket.created_by_id == user_id) | (Ticket.assignee_id == user_id))
            .options(selectinload(Ticket.comments))
            .order_by(Ticket.created_at.desc())
        )
        ticket_result = await db.execute(ticket_query)
        tickets = list(ticket_result.scalars().all())
        
        # 3. Fetch last login log entry
        login_query = (
            select(AuditLog)
            .where(AuditLog.action == "User Login", AuditLog.target == str(user_id))
            .order_by(AuditLog.created_at.desc())
            .limit(1)
        )
        login_result = await db.execute(login_query)
        last_login = login_result.scalars().first()
        
        return {
            "user": user,
            "assigned_assets": assigned_assets,
            "tickets": tickets,
            "last_login": last_login
        }

user_service = UserService()
