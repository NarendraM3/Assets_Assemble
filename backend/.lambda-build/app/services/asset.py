from datetime import datetime, timedelta
from typing import Optional, List
import secrets
from app.repositories.asset import asset_repository
from app.repositories.user import user_repository
from app.repositories.assignment import assignment_repository
from app.repositories.audit_log import audit_log_repository
from app.repositories.notification import notification_repository
from app.schemas.asset import AssetCreate, AssetUpdate
from app.schemas.assignment import AssignmentCreate
from app.database import generate_id, utcnow_str, today_str
from fastapi import HTTPException, status


class AssetService:
    async def add_asset(self, asset_in: AssetCreate, actor: str):
        count = await asset_repository.count_total()
        display_id = f"AST-{10000 + count}"

        asset_data = asset_in.model_dump()
        asset_data.update({
            "id": generate_id(),
            "display_id": display_id,
            "created_at": utcnow_str(),
            "updated_at": utcnow_str(),
            "is_active": True,
        })

        new_asset = await asset_repository.create(asset_data)

        await audit_log_repository.create({
            "id": generate_id(),
            "display_id": f"LOG-A{secrets.randbelow(1000)}",
            "action": "Asset Created",
            "user": actor,
            "target": display_id,
            "timestamp": today_str(),
            "ip": "127.0.0.1",
            "created_at": utcnow_str(),
            "updated_at": utcnow_str(),
            "is_active": True,
        })
        return new_asset

    async def update_asset(self, asset_id: str, asset_in: AssetUpdate, actor: str):
        asset = await asset_repository.get(asset_id)
        if not asset:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Asset not found")

        update_data = asset_in.model_dump(exclude_unset=True)
        update_data["updated_at"] = utcnow_str()
        updated = await asset_repository.update(asset_id, update_data)

        await audit_log_repository.create({
            "id": generate_id(),
            "display_id": f"LOG-A{secrets.randbelow(1000)}",
            "action": "Asset Updated",
            "user": actor,
            "target": asset.display_id,
            "timestamp": today_str(),
            "ip": "127.0.0.1",
            "created_at": utcnow_str(),
            "updated_at": utcnow_str(),
            "is_active": True,
        })
        return updated

    async def retire_asset(self, asset_id: str, actor: str):
        asset = await asset_repository.get(asset_id)
        if not asset:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Asset not found")

        await asset_repository.update(asset_id, {
            "status": "Retired",
            "assigned_to_id": None,
            "updated_at": utcnow_str(),
        })

        await audit_log_repository.create({
            "id": generate_id(),
            "display_id": f"LOG-A{secrets.randbelow(1000)}",
            "action": "Asset Retired",
            "user": actor,
            "target": asset.display_id,
            "timestamp": today_str(),
            "ip": "127.0.0.1",
            "created_at": utcnow_str(),
            "updated_at": utcnow_str(),
            "is_active": True,
        })

        asset.status = "Retired"
        asset.assigned_to_id = None
        return asset

    async def assign_asset(self, assign_in: AssignmentCreate, actor: str):
        asset = await asset_repository.get(str(assign_in.asset_id))
        if not asset or asset.status != "Available":
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Asset is not available for assignment")

        user = await user_repository.get(str(assign_in.employee_id))
        if not user:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Employee not found")

        await asset_repository.update(str(asset.id), {
            "status": "Assigned",
            "assigned_to_id": str(user.id),
            "updated_at": utcnow_str(),
        })

        display_id = f"ASG-{2000 + secrets.randbelow(1000)}"
        new_asg = await assignment_repository.create({
            "id": generate_id(),
            "display_id": display_id,
            "asset_id": str(asset.id),
            "employee_id": str(user.id),
            "assigned_date": assign_in.assigned_date,
            "expected_return": assign_in.expected_return,
            "status": "Active",
            "created_at": utcnow_str(),
            "updated_at": utcnow_str(),
            "is_active": True,
        })

        await audit_log_repository.create({
            "id": generate_id(),
            "display_id": f"LOG-AS{secrets.randbelow(1000)}",
            "action": "Asset Assigned",
            "user": actor,
            "target": f"Asset {asset.display_id} assigned to Employee {user.display_id}",
            "timestamp": today_str(),
            "ip": "127.0.0.1",
            "created_at": utcnow_str(),
            "updated_at": utcnow_str(),
            "is_active": True,
        })

        return new_asg

    async def return_asset(self, assignment_id: str, actor: str):
        asg = await assignment_repository.get(assignment_id)
        if not asg or asg.status != "Active":
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Active assignment not found")

        await assignment_repository.update(assignment_id, {
            "status": "Returned",
            "return_date": today_str(),
            "updated_at": utcnow_str(),
        })

        asset = await asset_repository.get_raw(str(asg.asset_id))
        if asset:
            await asset_repository.update(str(asset.id), {
                "status": "Available",
                "assigned_to_id": None,
                "updated_at": utcnow_str(),
            })

        await audit_log_repository.create({
            "id": generate_id(),
            "display_id": f"LOG-R{secrets.randbelow(1000)}",
            "action": "Asset Returned",
            "user": actor,
            "target": f"Assignment {asg.display_id}",
            "timestamp": today_str(),
            "ip": "127.0.0.1",
            "created_at": utcnow_str(),
            "updated_at": utcnow_str(),
            "is_active": True,
        })

        asg.status = "Returned"
        asg.return_date = today_str()
        return asg

    async def verify_onboarding(self, user_id: str, approved: bool, remarks: str, actor: str):
        user = await user_repository.get(user_id)
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
                "remarks": f"Asset category {user.required_asset_category or 'Laptop'} verified and available in location.",
            })
            history.append({
                "step": "Ready for Allocation",
                "timestamp": stamp,
                "actor": actor,
                "remarks": remarks or "Approved for allocation queue.",
            })
        else:
            history.append({
                "step": "Waiting for Inventory",
                "timestamp": stamp,
                "actor": actor,
                "remarks": remarks or f"Requested hardware ({user.required_asset_category or 'Laptop'}) is currently out of stock.",
            })

            await notification_repository.create({
                "id": generate_id(),
                "title": f"Procurement Alert: Allocation blocked for {user.name} ({remarks or 'Waiting for Inventory'})",
                "type": "danger",
                "time": "Just now",
                "unread": True,
                "created_at": utcnow_str(),
                "updated_at": utcnow_str(),
                "is_active": True,
            })

        await user_repository.update(user_id, {
            "allocation_status": target_status,
            "allocation_history": history,
            "updated_at": utcnow_str(),
        })

        await audit_log_repository.create({
            "id": generate_id(),
            "display_id": f"LOG-V{secrets.randbelow(1000)}",
            "action": "Asset Verified & Approved" if approved else "Asset Unavailable",
            "user": actor,
            "target": user.display_id,
            "timestamp": today_str(),
            "ip": "127.0.0.1",
            "created_at": utcnow_str(),
            "updated_at": utcnow_str(),
            "is_active": True,
        })

        user.allocation_status = target_status
        user.allocation_history = history
        return user

    async def complete_onboarding(self, user_id: str, asset_id: str, remarks: str, actor: str):
        user = await user_repository.get(user_id)
        if not user:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Employee not found")

        asset = await asset_repository.get(asset_id)
        if not asset or asset.status != "Available":
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Asset is not available")

        stamp = datetime.now().strftime("%b %d, %Y %I:%M %p")

        await asset_repository.update(asset_id, {
            "status": "Assigned",
            "assigned_to_id": user_id,
            "updated_at": utcnow_str(),
        })

        history = list(user.allocation_history or [])
        history.append({
            "step": "Asset Assigned",
            "timestamp": stamp,
            "actor": actor,
            "remarks": f"Assigned Asset {asset.display_id} ({asset.name}).",
        })
        history.append({
            "step": "Completed",
            "timestamp": stamp,
            "actor": actor,
            "remarks": remarks or "Onboarding workspace setup and asset delivery completed.",
        })

        allocated_details = {
            "assetId": asset.display_id,
            "assetName": asset.name,
            "serialNumber": asset.serial,
            "assignedAt": stamp,
            "assignedBy": actor,
            "remarks": remarks,
        }

        await user_repository.update(user_id, {
            "allocation_status": "Completed",
            "allocation_history": history,
            "allocated_asset_details": allocated_details,
            "updated_at": utcnow_str(),
        })

        display_id = f"ASG-{2000 + secrets.randbelow(1000)}"
        await assignment_repository.create({
            "id": generate_id(),
            "display_id": display_id,
            "asset_id": asset_id,
            "employee_id": user_id,
            "assigned_date": today_str(),
            "expected_return": (datetime.utcnow() + timedelta(days=365)).strftime("%Y-%m-%d"),
            "status": "Active",
            "created_at": utcnow_str(),
            "updated_at": utcnow_str(),
            "is_active": True,
        })

        await audit_log_repository.create({
            "id": generate_id(),
            "display_id": f"LOG-C{secrets.randbelow(1000)}",
            "action": "Asset Allocation Completed",
            "user": actor,
            "target": user.display_id,
            "timestamp": today_str(),
            "ip": "127.0.0.1",
            "created_at": utcnow_str(),
            "updated_at": utcnow_str(),
            "is_active": True,
        })

        user.allocation_status = "Completed"
        user.allocation_history = history
        user.allocated_asset_details = allocated_details
        return user


asset_service = AssetService()
