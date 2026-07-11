import { apiFetch } from "./api";
import type {
  Asset,
  Assignment,
  DashboardStats,
  Employee,
  Maintenance,
  Vendor,
} from "@/types/domain";

interface PaginatedData<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
}

interface BackendUser {
  id: string;
  display_id: string;
  name: string;
  email: string;
  role?: string;
  department?: string | null;
  designation?: string | null;
  manager?: string | null;
  location?: string | null;
  status?: string;
  avatar?: string | null;
  phone?: string | null;
  join_date?: string | null;
  allocation_date?: string | null;
  allocation_time?: string | null;
  allocation_status?: Employee["allocationStatus"] | null;
  required_asset_category?: string | null;
  allocated_asset_details?: any;
  allocation_history?: any[];
}

interface BackendAsset {
  id: string;
  display_id: string;
  name: string;
  category: string;
  manufacturer: string;
  model: string;
  serial: string;
  purchase_date: string;
  warranty_expiry: string;
  location: string;
  assigned_to_id: string | null;
  status: Asset["status"];
  cost: number;
}

interface BackendAssignment {
  id: string;
  display_id: string;
  asset_id: string;
  employee_id: string;
  assigned_date: string;
  return_date: string | null;
  expected_return: string | null;
  status: Assignment["status"];
}

interface BackendVendor {
  id: string;
  display_id: string;
  name: string;
  contact: string;
  email: string;
  phone: string;
  category: string;
  status: Vendor["status"];
  contract_end: string;
}

interface BackendMaintenance {
  id: string;
  display_id: string;
  asset_id: string;
  engineer: string;
  date: string;
  resolution: string;
  parts: string;
  cost: number;
  status: Maintenance["status"];
}

function initials(name: string) {
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export function mapEmployee(user: BackendUser): Employee {
  return {
    id: user.display_id ?? user.id,
    uuid: user.id,
    name: user.name,
    email: user.email,
    role: user.role as Employee["role"],
    department: user.department ?? "",
    designation: user.designation ?? "",
    manager: user.manager ?? "",
    location: user.location ?? "",
    status: (user.status as Employee["status"]) ?? "Active",
    avatar: user.avatar ?? initials(user.name),
    phone: user.phone ?? "",
    joinDate: user.join_date ?? "",
    allocationDate: user.allocation_date ?? undefined,
    allocationTime: user.allocation_time ?? undefined,
    allocationStatus: user.allocation_status ?? undefined,
    requiredAssetCategory: user.required_asset_category ?? undefined,
    allocatedAssetDetails: user.allocated_asset_details,
    allocationHistory: user.allocation_history,
  };
}

export function mapAsset(asset: BackendAsset): Asset {
  return {
    id: asset.display_id ?? asset.id,
    uuid: asset.id,
    name: asset.name,
    category: asset.category,
    manufacturer: asset.manufacturer,
    model: asset.model,
    serial: asset.serial,
    purchaseDate: asset.purchase_date,
    warrantyExpiry: asset.warranty_expiry,
    location: asset.location,
    assignedTo: asset.assigned_to_id,
    status: asset.status,
    cost: Number(asset.cost ?? 0),
  };
}

export function mapAssignment(assignment: BackendAssignment): Assignment {
  return {
    id: assignment.display_id ?? assignment.id,
    uuid: assignment.id,
    assetId: assignment.asset_id,
    employeeId: assignment.employee_id,
    assignedDate: assignment.assigned_date,
    returnDate: assignment.return_date,
    expectedReturn: assignment.expected_return,
    status: assignment.status,
  };
}

function mapVendor(vendor: BackendVendor): Vendor {
  return {
    id: vendor.display_id ?? vendor.id,
    uuid: vendor.id,
    name: vendor.name,
    contact: vendor.contact,
    email: vendor.email,
    phone: vendor.phone,
    category: vendor.category,
    status: vendor.status,
    contractEnd: vendor.contract_end,
  };
}

function mapMaintenance(item: BackendMaintenance): Maintenance {
  return {
    id: item.display_id ?? item.id,
    uuid: item.id,
    assetId: item.asset_id,
    engineer: item.engineer,
    date: item.date,
    resolution: item.resolution,
    parts: item.parts,
    cost: Number(item.cost ?? 0),
    status: item.status,
  };
}

export async function fetchEmployees() {
  const data = await apiFetch<PaginatedData<BackendUser>>("/employees?limit=10000");
  return data.items.map(mapEmployee);
}

export async function fetchRecentEmployees() {
  const data = await apiFetch<BackendUser[]>("/employees/recent");
  return data.map(mapEmployee);
}

export async function fetchFullProfile(userUuid: string) {
  return apiFetch<any>(`/employees/${userUuid}`);
}

export async function createEmployee(payload: any) {
  const data = await apiFetch<BackendUser>("/register", {
    method: "POST",
    body: JSON.stringify({
      ...payload,
      join_date: payload.joinDate,
      allocation_date: payload.allocationDate,
      allocation_time: payload.allocationTime,
      required_asset_category: payload.requiredAssetCategory,
    }),
  });
  return mapEmployee(data);
}

export async function updateEmployee(userUuid: string, payload: any) {
  const data = await apiFetch<BackendUser>(`/employees/${userUuid}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
  return mapEmployee(data);
}

export async function deleteEmployee(userUuid: string) {
  await apiFetch<BackendUser>(`/employees/${userUuid}`, { method: "DELETE" });
}

export async function fetchAssets() {
  const data = await apiFetch<PaginatedData<BackendAsset>>("/assets?limit=10000");
  return data.items.map(mapAsset);
}

export async function createAsset(payload: any) {
  const data = await apiFetch<BackendAsset>("/assets", {
    method: "POST",
    body: JSON.stringify({
      name: payload.name,
      category: payload.category,
      manufacturer: payload.manufacturer,
      model: payload.model,
      serial: payload.serial,
      purchase_date: payload.purchaseDate,
      warranty_expiry: payload.warrantyExpiry,
      location: payload.location,
      assigned_to_id: payload.assignedTo,
      status: payload.status,
      cost: payload.cost,
    }),
  });
  return mapAsset(data);
}

export async function retireAsset(assetUuid: string) {
  const data = await apiFetch<BackendAsset>(`/assets/${assetUuid}`, {
    method: "DELETE",
  });
  return mapAsset(data);
}

export async function verifyOnboardingAsset(
  employeeUuid: string,
  approved: boolean,
  remarks: string,
) {
  const data = await apiFetch<BackendUser>(`/assets/onboarding/verify/${employeeUuid}`, {
    method: "POST",
    body: JSON.stringify({ approved, remarks }),
  });
  return mapEmployee(data);
}

export async function completeOnboardingAllocation(
  employeeUuid: string,
  assetUuid: string,
  remarks: string,
) {
  const data = await apiFetch<BackendUser>(
    `/assets/onboarding/allocate/${employeeUuid}`,
    {
      method: "POST",
      body: JSON.stringify({ asset_id: assetUuid, remarks }),
    },
  );
  return mapEmployee(data);
}

export async function fetchAssignments() {
  const data = await apiFetch<PaginatedData<BackendAssignment>>(
    "/assignments?limit=10000",
  );
  return data.items.map(mapAssignment);
}

export async function createAssignment(payload: {
  assetId: string;
  employeeId: string;
  assignedDate: string;
  expectedReturn?: string | null;
}) {
  const data = await apiFetch<BackendAssignment>("/assignments", {
    method: "POST",
    body: JSON.stringify({
      asset_id: payload.assetId,
      employee_id: payload.employeeId,
      assigned_date: payload.assignedDate,
      expected_return: payload.expectedReturn,
    }),
  });
  return mapAssignment(data);
}

export async function fetchVendors() {
  const data = await apiFetch<PaginatedData<BackendVendor>>("/vendors?limit=10000");
  return data.items.map(mapVendor);
}

export async function fetchMaintenance() {
  const data = await apiFetch<PaginatedData<BackendMaintenance>>(
    "/maintenance?limit=10000",
  );
  return data.items.map(mapMaintenance);
}

export async function fetchAuditLogs() {
  const data = await apiFetch<PaginatedData<any>>("/audit-logs?limit=10000");
  return data.items.map((item) => ({
    id: item.display_id ?? item.id,
    action: item.action,
    user: item.user,
    target: item.target,
    timestamp: item.timestamp,
    ip: item.ip,
  }));
}

export async function fetchNotifications() {
  return apiFetch<any[]>("/notifications");
}

export async function markNotificationsRead() {
  await apiFetch<void>("/notifications/mark-read", { method: "POST" });
}

export async function fetchKnowledgeBase() {
  const data = await apiFetch<PaginatedData<any>>("/knowledge-base?limit=10000");
  return data.items.map((item) => ({
    id: item.display_id ?? item.id,
    uuid: item.id,
    title: item.title,
    category: item.category,
    updatedAt: item.updated_at?.slice(0, 10),
    views: item.views,
  }));
}

export async function fetchDashboardStats(): Promise<DashboardStats> {
  const data = await apiFetch<any>("/dashboard/stats");
  return {
    totalUsers: data.total_users,
    totalEmployees: data.total_employees,
    totalAssets: data.total_assets,
    assignedAssets: data.assigned_assets,
    availableAssets: data.available_assets,
    returnedAssets: data.returned_assets,
    pendingTickets: data.pending_tickets,
    recentActivities: data.recent_activities ?? [],
  };
}
