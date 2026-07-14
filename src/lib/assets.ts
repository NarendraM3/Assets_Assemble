import type { Asset, AssetStatus } from "@/types/domain";

export function normalizeAssetStatus(status?: string | null): AssetStatus {
  const value = (status || "Available").trim().toLowerCase();

  if (value === "damaged" || value === "under maintenance" || value === "maintenance") {
    return "Under Maintenance";
  }
  if (value === "no stock" || value === "out of stock") {
    return "Out of Stock";
  }
  if (value === "returned") {
    return "Available";
  }
  if (value === "assigned") return "Assigned";
  if (value === "requested") return "Requested";
  if (value === "approved") return "Approved";
  if (value === "ready for pickup") return "Ready for Pickup";
  if (value === "delivered") return "Delivered";
  if (value === "retired") return "Retired";

  return "Available";
}

export function isAssignedToEmployee(asset: Asset, employeeId?: string, employeeUuid?: string) {
  if (!asset.assignedTo) return false;
  return asset.assignedTo === employeeId || asset.assignedTo === employeeUuid;
}

export function assetStats(assets: Asset[]) {
  return {
    available: assets.filter((a) => a.status === "Available").length,
    assigned: assets.filter((a) => a.status === "Assigned" || !!a.assignedTo).length,
    maintenance: assets.filter((a) => a.status === "Under Maintenance").length,
    outOfStock: assets.filter((a) => a.status === "Out of Stock").length,
    retired: assets.filter((a) => a.status === "Retired").length,
  };
}
