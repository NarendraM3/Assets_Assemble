import { apiFetch } from "./api";
import type { Employee } from "@/types/domain";

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

export async function fetchEmployees() {
  const data = await apiFetch<PaginatedData<BackendUser>>("/admin/employees?limit=10000");
  return data.items.map(mapEmployee);
}

export async function fetchFullProfile() {
  return apiFetch<any>("/profile");
}

export async function createEmployee(payload: any) {
  const data = await apiFetch<BackendUser>("/admin/employees/register", {
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
