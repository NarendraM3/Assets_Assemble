from datetime import datetime
from typing import Optional, List, Tuple
import uuid
import secrets
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.asset import Asset
from app.models.assignment import Assignment
from app.models.user import User
from app.repositories.asset import asset_repository
from app.repositories.user import user_repository
from app.repositories.assignment import assignment_repository
from app.repositories.audit_log import audit_log_repository
from app.repositories.notification import notification_repository
from app.schemas.asset import AssetCreate, AssetUpdate
from app.schemas.assignment import AssignmentCreate
from fastapi import HTTPException, status

class AssetService:
    async def add_asset(self, db: AsyncSession, asset_in: AssetCreate, actor: str) -> Asset:
        """Add a new asset to the catalog."""
        # Calculate display ID
        count = await asset_repository.count_total(db)
        display_id = f"AST-{10000 + count}"
        
        asset_data = asset_in.model_dump()
        asset_data.update({"display_id": display_id})
        
        new_asset = await asset_repository.create(db, asset_data)
        
        # Log to audits
        await audit_log_repository.create(db, {
            "display_id": f"LOG-A{secrets.randbelow(1000)}",
            "action": "Asset Created",
            "user": actor,
            "target": display_id,
            "timestamp": datetime.utcnow().strftime("%Y-%m-%d"),
            "ip": "127.0.0.1"
        })
        return new_asset

    async def update_asset(self, db: AsyncSession, asset_id: uuid.UUID, asset_in: AssetUpdate, actor: str) -> Asset:
        """Update asset properties."""
        asset = await asset_repository.get(db, asset_id)
        if not asset:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Asset not found")
            
        update_data = asset_in.model_dump(exclude_unset=True)
        updated = await asset_repository.update(db, asset, update_data)
        
        await audit_log_repository.create(db, {
            "display_id": f"LOG-A{secrets.randbelow(1000)}",
            "action": "Asset Updated",
            "user": actor,
            "target": asset.display_id,
            "timestamp": datetime.utcnow().strftime("%Y-%m-%d"),
            "ip": "127.0.0.1"
        })
        return updated

    async def retire_asset(self, db: AsyncSession, asset_id: uuid.UUID, actor: str) -> Asset:
        """Retire an asset from the fleet."""
        asset = await asset_repository.get(db, asset_id)
        if not asset:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Asset not found")
            
        asset.status = "Retired"
        asset.assigned_to_id = None
        db.add(asset)
        await db.flush()
        
        await audit_log_repository.create(db, {
            "display_id": f"LOG-A{secrets.randbelow(1000)}",
            "action": "Asset Retired",
            "user": actor,
            "target": asset.display_id,
            "timestamp": datetime.utcnow().strftime("%Y-%m-%d"),
            "ip": "127.0.0.1"
        })
        return asset

    async def assign_asset(self, db: AsyncSession, assign_in: AssignmentCreate, actor: str) -> Assignment:
        """Assign an available asset to a user."""
        asset = await asset_repository.get(db, assign_in.asset_id)
        if not asset or asset.status != "Available":
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Asset is not available for assignment")
            
        user = await user_repository.get(db, assign_in.employee_id)
        if not user:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Employee not found")
            
        # Update asset status
        asset.status = "Assigned"
        asset.assigned_to_id = user.id
        db.add(asset)
        
        # Create assignment record
        asg_count = await assignment_repository.count_returned(db)  # just keying
        # Get active count for displays
        display_id = f"ASG-{2000 + secrets.randbelow(1000)}"
        
        new_asg = await assignment_repository.create(db, {
            "display_id": display_id,
            "asset_id": asset.id,
            "employee_id": user.id,
            "assigned_date": assign_in.assigned_date,
            "expected_return": assign_in.expected_return,
            "status": "Active"
        })
        
        await audit_log_repository.create(db, {
            "display_id": f"LOG-AS{secrets.randbelow(1000)}",
            "action": "Asset Assigned",
            "user": actor,
            "target": f"Asset {asset.display_id} assigned to Employee {user.display_id}",
            "timestamp": datetime.utcnow().strftime("%Y-%m-%d"),
            "ip": "127.0.0.1"
        })
        
        return new_asg

    async def return_asset(self, db: AsyncSession, assignment_id: uuid.UUID, actor: str) -> Assignment:
        """Process an asset return."""
        asg = await assignment_repository.get(db, assignment_id)
        if not asg or asg.status != "Active":
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Active assignment not found")
            
        # Update assignment
        asg.status = "Returned"
        asg.return_date = datetime.utcnow().strftime("%Y-%m-%d")
        db.add(asg)
        
        # Update asset
        asset = await asset_repository.get_raw(db, asg.asset_id)
        if asset:
            asset.status = "Available"
            asset.assigned_to_id = None
            db.add(asset)
            
        await audit_log_repository.create(db, {
            "display_id": f"LOG-R{secrets.randbelow(1000)}",
            "action": "Asset Returned",
            "user": actor,
            "target": f"Assignment {asg.display_id}",
            "timestamp": datetime.utcnow().strftime("%Y-%m-%d"),
            "ip": "127.0.0.1"
        })
        
        return asg

    async def verify_onboarding(self, db: AsyncSession, user_id: uuid.UUID, approved: bool, remarks: str, actor: str) -> User:
        """Verify inventory availability for new hire onboarding."""
        user = await user_repository.get(db, user_id)
        if not user:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Employee not found")
            
        target_status = "Ready for Allocation" if approved else "Waiting for Inventory"
        stamp = datetime.now().strftime("%b %d, %Y %I:%M %p")
        history = list(user.allocation_history or [])
        
        if approved:
            history.append({
                "step": "Inventory Verified",
                "timestamp": stamp,
                "actor": actor,
                "remarks": f"Asset category {user.required_asset_category or 'Laptop'} verified and available in location."
            })
            history.append({
                "step": "Ready for Allocation",
                "timestamp": stamp,
                "actor": actor,
                "remarks": remarks or "Approved for allocation queue."
            })
        else:
            history.append({
                "step": "Waiting for Inventory",
                "timestamp": stamp,
                "actor": actor,
                "remarks": remarks or f"Requested hardware ({user.required_asset_category or 'Laptop'}) is currently out of stock."
            })
            
            # Send alert notification
            await notification_repository.create(db, {
                "title": f"Procurement Alert: Allocation blocked for {user.name} ({remarks or 'Waiting for Inventory'})",
                "type": "danger",
                "time": "Just now",
                "unread": True
            })
            
        user.allocation_status = target_status
        user.allocation_history = history
        db.add(user)
        await db.flush()
        await db.refresh(user)
        
        # Log to audits
        await audit_log_repository.create(db, {
            "display_id": f"LOG-V{secrets.randbelow(1000)}",
            "action": "Asset Verified & Approved" if approved else "Asset Unavailable",
            "user": actor,
            "target": user.display_id,
            "timestamp": datetime.utcnow().strftime("%Y-%m-%d"),
            "ip": "127.0.0.1"
        })
        
        return user

    async def complete_onboarding(self, db: AsyncSession, user_id: uuid.UUID, asset_id: uuid.UUID, remarks: str, actor: str) -> User:
        """Assign hardware asset and complete employee onboarding workflow."""
        user = await user_repository.get(db, user_id)
        if not user:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Employee not found")
            
        asset = await asset_repository.get(db, asset_id)
        if not asset or asset.status != "Available":
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Asset is not available")
            
        stamp = datetime.now().strftime("%b %d, %Y %I:%M %p")
        
        # 1. Update Asset to Assigned
        asset.status = "Assigned"
        asset.assigned_to_id = user.id
        db.add(asset)
        
        # 2. Update User onboarding details
        history = list(user.allocation_history or [])
        history.append({
            "step": "Asset Assigned",
            "timestamp": stamp,
            "actor": actor,
            "remarks": f"Assigned Asset {asset.display_id} ({asset.name})."
        })
        history.append({
            "step": "Completed",
            "timestamp": stamp,
            "actor": actor,
            "remarks": remarks or "Onboarding workspace setup and asset delivery completed."
        })
        
        user.allocation_status = "Completed"
        user.allocation_history = history
        user.allocated_asset_details = {
            "assetId": asset.display_id,
            "assetName": asset.name,
            "serialNumber": asset.serial,
            "assignedAt": stamp,
            "assignedBy": actor,
            "remarks": remarks
        }
        db.add(user)
        
        # 3. Create active assignment row
        display_id = f"ASG-{2000 + secrets.randbelow(1000)}"
        await assignment_repository.create(db, {
            "display_id": display_id,
            "asset_id": asset.id,
            "employee_id": user.id,
            "assigned_date": datetime.utcnow().strftime("%Y-%m-%d"),
            "expected_return": (datetime.utcnow() + timedelta(days=365)).strftime("%Y-%m-%d"),
            "status": "Active"
        })
        
        await audit_log_repository.create(db, {
            "display_id": f"LOG-C{secrets.randbelow(1000)}",
            "action": "Asset Allocation Completed",
            "user": actor,
            "target": user.display_id,
            "timestamp": datetime.utcnow().strftime("%Y-%m-%d"),
            "ip": "127.0.0.1"
        })
        
        await db.refresh(user)
        return user

asset_service = AssetService()
from datetime import timedelta
