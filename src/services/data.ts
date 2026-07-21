import { apiFetch } from "./api";
import type { Employee, Asset } from "@/types/domain";

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
  location?: string | null;
  status?: string;
  avatar?: string | null;
  phone?: string | null;
  join_date?: string | null;
  allocation_date?: string | null;
  allocation_time?: string | null;
  allocation_status?: Employee["allocationStatus"] | null;
  verification_status?: string | null;
  required_asset_category?: string | null;
  allocated_asset_details?: any;
  allocation_history?: any[];
}

function initials(name: string) {
  return (name ?? "")
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export function normalizeUser(raw: any): BackendUser {
  if (raw.EmployeeId !== undefined || raw.FirstName !== undefined) {
    const firstName = raw.FirstName ?? "";
    const lastName = raw.LastName ?? "";
    return {
      id: raw.EmployeeId ?? raw.id,
      display_id: raw.EmployeeId ?? raw.display_id,
      name: `${firstName} ${lastName}`.trim() || raw.name || "",
      email: raw.Email ?? raw.email ?? "",
      role: raw.Role ?? raw.role,
      department: raw.Department ?? raw.department,
      designation: raw.designation ?? raw.Designation,
      location: raw.Location ?? raw.location,
      status: raw.Status ?? raw.status,
      avatar: raw.avatar,
      phone: raw.phone ?? raw.Phone,
      join_date: raw.CreatedAt ?? raw.join_date ?? raw.JoinDate,
      allocation_date: raw.allocation_date ?? raw.AllocationDate,
      allocation_time: raw.allocation_time ?? raw.AllocationTime,
      allocation_status: raw.allocation_status,
      verification_status: raw.verification_status,
      required_asset_category: raw.required_asset_category ?? raw.RequiredHardwareCategory,
      allocated_asset_details: raw.allocated_asset_details,
      allocation_history: raw.allocation_history,
    };
  }
  return raw as BackendUser;
}

export function mapEmployee(user: BackendUser): Employee {
  return {
    id: user.display_id ?? user.id ?? "",
    uuid: user.id ?? user.display_id ?? "",
    name: user.name ?? "",
    email: user.email ?? "",
    role: (user.role as Employee["role"]) ?? "employee",
    department: user.department ?? "",
    designation: user.designation ?? "",
    location: user.location ?? "",
    status: (user.status as Employee["status"]) ?? "Active",
    avatar: user.avatar ?? initials(user.name),
    phone: user.phone ?? "",
    joinDate: user.join_date ?? "",
    allocationDate: user.allocation_date ?? undefined,
    allocationTime: user.allocation_time ?? undefined,
    allocationStatus: user.allocation_status ?? undefined,
    verificationStatus: (user.verification_status ?? "Pending") as Employee["verificationStatus"],
    requiredAssetCategory: user.required_asset_category ?? undefined,
    allocatedAssetDetails: user.allocated_asset_details,
    allocationHistory: user.allocation_history,
  };
}

function extractEmployeeArray(response: any): any[] {
  console.log("[fetchEmployees] Raw API response:", JSON.stringify(response));

  if (!response) {
    console.warn("[fetchEmployees] Response is null or undefined");
    return [];
  }

  if (Array.isArray(response)) {
    console.log(`[fetchEmployees] Response is a direct array with ${response.length} items`);
    return response;
  }

  if (response.items && Array.isArray(response.items)) {
    console.log(`[fetchEmployees] Found response.items array with ${response.items.length} items`);
    return response.items;
  }

  if (response.data && Array.isArray(response.data)) {
    console.log(`[fetchEmployees] Found response.data array with ${response.data.length} items`);
    return response.data;
  }

  if (response.data?.items && Array.isArray(response.data.items)) {
    console.log(`[fetchEmployees] Found response.data.items array with ${response.data.items.length} items`);
    return response.data.items;
  }

  if (response.employees && Array.isArray(response.employees)) {
    console.log(`[fetchEmployees] Found response.employees array with ${response.employees.length} items`);
    return response.employees;
  }

  if (response.employeeList && Array.isArray(response.employeeList)) {
    console.log(`[fetchEmployees] Found response.employeeList array with ${response.employeeList.length} items`);
    return response.employeeList;
  }

  const possibleKeys = Object.keys(response).filter(k => Array.isArray(response[k]));
  if (possibleKeys.length > 0) {
    console.log(`[fetchEmployees] No standard key found, using first array key "${possibleKeys[0]}" with ${response[possibleKeys[0]].length} items`);
    return response[possibleKeys[0]];
  }

  console.warn("[fetchEmployees] Could not extract employee array from response:", response);
  return [];
}

export async function fetchEmployees(): Promise<Employee[]> {
  console.log("[fetchEmployees] Starting API call to GET /admin/employees?limit=10000");

  const rawResponse = await apiFetch<any>("/admin/employees?limit=10000");

  console.log("[fetchEmployees] Raw response after apiFetch unwrap:", rawResponse);

  const rawArray = extractEmployeeArray(rawResponse);

  console.log(`[fetchEmployees] Extracted ${rawArray.length} raw employee records`);

  if (rawArray.length > 0) {
    console.log("[fetchEmployees] Sample raw record:", JSON.stringify(rawArray[0]));
  }

  const employees = rawArray.map((raw) => mapEmployee(normalizeUser(raw)));

  console.log(`[fetchEmployees] Mapped ${employees.length} employees successfully`);
  if (employees.length > 0) {
    console.log("[fetchEmployees] Sample mapped employee:", JSON.stringify(employees[0]));
  }

  return employees;
}

export async function fetchFullProfile() {
  return apiFetch<any>("/profile");
}

export interface RegistrationResult {
  EmployeeId: string;
  TemporaryPassword: string;
  Note?: string;
}

export class RegistrationError extends Error {
  status: number;
  body: any;
  constructor(message: string, status: number, body?: any) {
    super(message);
    this.status = status;
    this.body = body;
  }
}

export async function fetchAssignedAssets(): Promise<any[]> {
  try {
    const data = await apiFetch<any>("/profile");
    return data?.assigned_assets ?? [];
  } catch {
    return [];
  }
}

export async function createEmployee(payload: any): Promise<RegistrationResult> {
  const parts = (payload.name || "").trim().split(/\s+/);
  const firstName = parts[0] || "";
  const lastName = parts.slice(1).join(" ") || "-";

  const body: Record<string, any> = {
    FirstName: firstName,
    LastName: lastName,
    Email: payload.email,
    Role: payload.role,
  };

  if (payload.department) body.Department = payload.department;
  if (payload.designation) body.Designation = payload.designation;
  if (payload.location) body.Location = payload.location;
  if (payload.joinDate) body.JoinDate = payload.joinDate;
  body.AllocationDate = payload.allocationDate;
  body.AllocationTime = payload.allocationTime;
  body.RequiredHardwareCategory = payload.requiredAssetCategory;

  console.log("Employee Registration Payload:", body);

  try {
    const responseBody = await apiFetch<any>("/admin/employees/register", {
      method: "POST",
      body: JSON.stringify(body),
    });

    console.log("[Employee Registration] API Response:", responseBody);

    const employeeId =
      responseBody?.EmployeeId ??
      responseBody?.data?.EmployeeId ??
      responseBody?.employeeId ??
      "";

    const tempPassword =
      responseBody?.TemporaryPassword ??
      responseBody?.data?.TemporaryPassword ??
      responseBody?.temporaryPassword ??
      "";

    const note =
      responseBody?.Note ?? responseBody?.data?.Note ?? responseBody?.note;

    console.log("[Employee Registration] Extracted Result:", { employeeId, tempPassword, note });

    return {
      EmployeeId: employeeId,
      TemporaryPassword: tempPassword,
      Note: note,
    };
  } catch (err: any) {
    console.error("[Employee Registration] Error:", err);
    throw new RegistrationError(
      err.message || "Unable to reach the server. Please check your connection and try again.",
      err.status ?? 0,
      err.body,
    );
  }
}
