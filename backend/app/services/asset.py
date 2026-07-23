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

    async def verify_onboarding(self, user_id: str, approved: bool, remarks: str, actor: str,
                                 allocated_assets: Optional[List[Dict[str, Any]]] = None,
                                 pending_assets: Optional[List[Dict[str, Any]]] = None):
        user = await user_repository.get(user_id)
        if not user:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Employee not found")

        stamp = datetime.now().strftime("%b %d, %Y %I:%M %p")
        history = list(user.allocation_history or [])

        allocated = allocated_assets or []
        pending = pending_assets or []
        has_allocated = len(allocated) > 0
        has_pending = len(pending) > 0

        if not has_allocated and not approved:
            verification_status = "Out of Stock"
            allocation_status = "Out of Stock"
            history.append({
                "step": "Out of Stock",
                "timestamp": stamp,
                "actor": actor,
                "remarks": remarks or f"Requested hardware ({user.required_asset_category or 'Laptop'}) is currently out of stock.",
            })
            await notification_repository.create({
                "id": generate_id(),
                "title": f"Procurement Alert: Allocation blocked for {user.name} ({remarks or 'Out of Stock'})",
                "type": "danger",
                "time": "Just now",
                "unread": True,
                "created_at": utcnow_str(),
                "updated_at": utcnow_str(),
                "is_active": True,
            })
        elif has_allocated and has_pending:
            verification_status = "Partial Allocation"
            allocation_status = "Pending Remaining Assets"
            history.append({
                "step": "Partial Allocation",
                "timestamp": stamp,
                "actor": actor,
                "remarks": f"{len(allocated)} asset(s) allocated. {len(pending)} asset(s) pending due to insufficient inventory.",
            })
        elif has_allocated and not has_pending:
            verification_status = "Verified"
            allocation_status = "Completed"
            history.append({
                "step": "Inventory Verified",
                "timestamp": stamp,
                "actor": actor,
                "remarks": remarks or "All required assets verified and allocated.",
            })
            history.append({
                "step": "Completed",
                "timestamp": stamp,
                "actor": actor,
                "remarks": "All assets allocated successfully.",
            })
        else:
            verification_status = "Out of Stock"
            allocation_status = "Out of Stock"
            history.append({
                "step": "Out of Stock",
                "timestamp": stamp,
                "actor": actor,
                "remarks": remarks or "No assets available for allocation.",
            })

        await user_repository.update(user_id, {
            "allocation_status": allocation_status,
            "verification_status": verification_status,
            "allocation_history": history,
            "allocated_assets": allocated,
            "pending_assets": pending,
            "updated_at": utcnow_str(),
        })

        await audit_log_repository.create({
            "id": generate_id(),
            "display_id": f"LOG-V{secrets.randbelow(1000)}",
            "action": "Asset Verified & Approved" if has_allocated else "Asset Unavailable",
            "user": actor,
            "target": user.display_id,
            "timestamp": today_str(),
            "ip": "127.0.0.1",
            "created_at": utcnow_str(),
            "updated_at": utcnow_str(),
            "is_active": True,
        })

        user.allocation_status = allocation_status
        user.verification_status = verification_status
        user.allocation_history = history
        user.allocated_assets = allocated
        user.pending_assets = pending
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

        allocated_assets = list(user.allocated_assets or [])
        pending_assets = list(user.pending_assets or [])
        allocated_assets.append({
            "category": asset.category,
            "assetId": asset.id,
            "assetName": asset.name,
            "assetTag": getattr(asset, "display_id", ""),
        })
        pending_assets = [p for p in pending_assets if p.get("category", "").lower() != (asset.category or "").lower()]

        is_complete = len(pending_assets) == 0

        if is_complete:
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

        update_fields = {
            "allocation_history": history,
            "allocated_asset_details": allocated_details,
            "allocated_assets": allocated_assets,
            "pending_assets": pending_assets,
            "updated_at": utcnow_str(),
        }

        if is_complete:
            update_fields["allocation_status"] = "Completed"
            update_fields["verification_status"] = "Completed"
        else:
            update_fields["allocation_status"] = "Pending Remaining Assets"
            update_fields["verification_status"] = "Partial Allocation"

        await user_repository.update(user_id, update_fields)

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
            "action": "Asset Allocation Completed" if is_complete else "Asset Partially Allocated",
            "user": actor,
            "target": user.display_id,
            "timestamp": today_str(),
            "ip": "127.0.0.1",
            "created_at": utcnow_str(),
            "updated_at": utcnow_str(),
            "is_active": True,
        })

        user.allocation_status = update_fields.get("allocation_status", "Completed")
        user.allocation_history = history
        user.allocated_asset_details = allocated_details
        user.allocated_assets = allocated_assets
        user.pending_assets = pending_assets
        return user


    async def allocate_onboarding_partial(self, user_id: str, assets_to_allocate: List[Dict[str, Any]], actor: str):
        user = await user_repository.get(user_id)
        if not user:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Employee not found")

        stamp = datetime.now().strftime("%b %d, %Y %I:%M %p")
        history = list(user.allocation_history or [])
        allocated_assets = list(user.allocated_assets or [])
        pending_assets = list(user.pending_assets or [])

        newly_allocated = []
        still_pending = []

        for item in assets_to_allocate:
            asset_id = item.get("assetId") or item.get("AssetId")
            category = item.get("category") or item.get("Category", "")
            if not asset_id:
                still_pending.append({"category": category, "status": "Pending"})
                continue

            asset = await asset_repository.get(asset_id)
            if not asset or asset.status != "Available":
                still_pending.append({"category": category, "status": "Pending"})
                continue

            await asset_repository.update(asset_id, {
                "status": "Assigned",
                "assigned_to_id": user_id,
                "updated_at": utcnow_str(),
            })

            allocated_assets.append({
                "category": asset.category,
                "assetId": asset.id,
                "assetName": asset.name,
                "assetTag": getattr(asset, "display_id", ""),
            })
            newly_allocated.append(category)

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

        still_pending_categories = [p for p in pending_assets if p.get("category") not in newly_allocated]
        for sp in still_pending:
            if sp["category"] not in [p["category"] for p in still_pending_categories]:
                still_pending_categories.append(sp)

        is_complete = len(still_pending_categories) == 0

        history.append({
            "step": "Asset Allocated" if is_complete else "Partial Allocation",
            "timestamp": stamp,
            "actor": actor,
            "remarks": f"{len(newly_allocated)} asset(s) allocated. {len(still_pending_categories)} asset(s) pending."
        })

        if is_complete:
            history.append({
                "step": "Completed",
                "timestamp": stamp,
                "actor": actor,
                "remarks": "All assets allocated successfully.",
            })

        update_fields = {
            "allocation_history": history,
            "allocated_assets": allocated_assets,
            "pending_assets": still_pending_categories,
            "updated_at": utcnow_str(),
        }

        if is_complete:
            update_fields["allocation_status"] = "Completed"
            update_fields["verification_status"] = "Completed"
        else:
            update_fields["allocation_status"] = "Pending Remaining Assets"
            update_fields["verification_status"] = "Partial Allocation"

        await user_repository.update(user_id, update_fields)

        await audit_log_repository.create({
            "id": generate_id(),
            "display_id": f"LOG-PA{secrets.randbelow(1000)}",
            "action": "Assets Allocated" if is_complete else "Assets Partially Allocated",
            "user": actor,
            "target": user.display_id,
            "timestamp": today_str(),
            "ip": "127.0.0.1",
            "created_at": utcnow_str(),
            "updated_at": utcnow_str(),
            "is_active": True,
        })

        user.allocation_status = update_fields["allocation_status"]
        user.allocation_history = history
        user.allocated_assets = allocated_assets
        user.pending_assets = still_pending_categories

        return {
            "user": user,
            "newly_allocated": newly_allocated,
            "allocated_count": len(newly_allocated),
            "pending_count": len(still_pending_categories),
            "is_complete": is_complete,
        }

    async def add_bulk_assets(self, assets_in: List[AssetCreate], actor: str):
        created_assets = []
        for asset_in in assets_in:
            asset = await self.add_asset(asset_in, actor)
            created_assets.append(asset)
        return created_assets


asset_service = AssetService()
