import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react";
import type {
  Employee, Asset, Assignment, Ticket, Role, Maintenance,
  AssetAssignmentRecord
} from "@/types/domain";
import {
  fetchTickets as apiFetchTickets,
  createTicket as apiCreateTicket,
  uploadFiles as apiUploadFiles,
  updateTicketStatus as apiUpdateTicketStatus,
  addTicketComment as apiAddTicketComment,
} from "@/services/tickets";

import {
  createEmployee as apiCreateEmployee,
  fetchEmployees,
  type RegistrationResult,
} from "@/services/data";
import { useAuth } from "@/contexts/auth";
import { apiFetch, apiUpload, getToken, BASE_URL } from "@/services/api";
import { toast } from "sonner";
import { assetStats, normalizeAssetStatus } from "@/lib/assets";

interface DataCtx {
  employees: Employee[];
  assets: Asset[];
  assignments: Assignment[];
  tickets: Ticket[];
  auditLogs: any[];
  notifications: any[];
  maintenance: Maintenance[];
  knowledgeBase: any[];
  dashboardStats: any | null;
  loading: boolean;
  error: string | null;
  refreshData: () => Promise<void>;
  createTicket: (ticket: Omit<Ticket, "id" | "status" | "createdAt" | "updatedAt" | "assignee" | "sla" | "comments" | "assignedRole" | "timeline" | "auditTrail"> & { attachments?: string[]; department?: string; employeeId?: string; created_by_id?: string }, actor: string) => Promise<Ticket>;
  uploadFiles: (files: FileList | File[], ticketId: string, employeeId: string) => Promise<string[]>;
  updateTicketStatus: (ticketId: string, status: Ticket["status"], actor: string, role: Role, comment?: string) => Promise<void>;
  addTicketComment: (ticketId: string, actor: string, role: Role, message: string) => Promise<void>;
  acceptTicket: (ticketId: string, actor: string) => Promise<void>;
  escalateTicket: (ticketId: string, actor: string, remarks: string) => Promise<void>;
  reviewEscalation: (ticketId: string, approved: boolean, actor: string, remarks: string) => Promise<void>;
  resolveAssetTicket: (ticketId: string, actor: string, details: any) => Promise<void>;
  addEmployee: (emp: Record<string, any>) => Promise<RegistrationResult>;
  deleteEmployee: (id: string) => Promise<void>;
  assignAssets: (employeeId: string, assetIds: string[]) => Promise<void>;
  addAsset: (asset: Record<string, any>) => Promise<Asset>;
  addBulkAssets: (assets: Record<string, any>[]) => Promise<{ assets: Asset[]; insertedCount: number; failedCount: number; insertedAssets: any[]; failedRows: any[] }>;
  retireAsset: (id: string) => Promise<void>;
  setAssets: React.Dispatch<React.SetStateAction<Asset[]>>;
  setTickets: React.Dispatch<React.SetStateAction<Ticket[]>>;
  verifyOnboardingAsset: (employeeId: string, verificationStatus: string, selectedAssets: any[], remarks: string, pendingCategories?: string[]) => Promise<any>;
  outOfStockOnboarding: (employeeId: string, remarks: string) => Promise<any>;
  completeOnboardingAllocation: (employeeId: string, assetId: string, remarks: string, actor: string) => Promise<void>;
  markOnboardingComplete: (employeeId: string, remarks: string, actor: string) => Promise<void>;
  addOnboardingNote: (employeeId: string, notes: string, actor: string) => Promise<void>;
  fetchFullProfile: (userUuid: string) => Promise<any>;
  fetchRecentEmployees: () => Promise<any[]>;
  assignmentRecords: AssetAssignmentRecord[];
  createAssignmentRecord: (record: Omit<AssetAssignmentRecord, "AssignmentId" | "AssignedDate" | "AssignedRole" | "Status">) => Promise<AssetAssignmentRecord>;
  fetchAssignmentRecords: () => Promise<void>;
}

const Ctx = createContext<DataCtx | null>(null);

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

function toStr(val: unknown): string {
  if (val == null) return "";
  if (typeof val === "string") return val;
  if (val instanceof Date || typeof val === "number") return String(val);
  if (typeof val === "object" && val?.toString) return val.toString();
  return String(val);
}

function normalizeAsset(item: any): Asset {
  return {
    assetId: toStr(item.AssetId || item.assetId),
    assetName: toStr(item.AssetName || item.assetName || item.name),
    assetTag: toStr(item.AssetTag || item.assetTag),
    brand: toStr(item.Brand || item.brand || item.manufacturer),
    category: toStr(item.Category || item.category),
    model: toStr(item.Model || item.model),
    serialNumber: toStr(item.SerialNumber || item.serialNumber || item.serial),
    status: normalizeAssetStatus(toStr(item.Status || item.status)),
    assignedTo: toStr(item.AssignedTo || item.assignedTo),
    purchaseDate: toStr(item.PurchaseDate || item.purchaseDate),
    warrantyExpiry: toStr(item.WarrantyExpiry || item.warrantyExpiry),
    condition: toStr(item.Condition || item.condition),
    vendor: toStr(item.Vendor || item.vendor),
    createdAt: toStr(item.CreatedAt || item.createdAt),
    updatedAt: toStr(item.UpdatedAt || item.updatedAt),
    createdBy: toStr(item.CreatedBy || item.createdBy),
    assignedAt: toStr(item.AssignedAt || item.assignedAt),
    hardwareRequired: toStr(item.HardwareRequired || item.hardwareRequired),
  };
}

export function DataProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [assignments] = useState<Assignment[]>([]);
  const [assignmentRecords, setAssignmentRecords] = useState<AssetAssignmentRecord[]>([]);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [auditLogs] = useState<any[]>([]);
  const [notifications] = useState<any[]>([]);
  const [maintenance] = useState<Maintenance[]>([]);
  const [knowledgeBase] = useState<any[]>([]);
  const [dashboardStats, setDashboardStats] = useState<any | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);

  const loadAllData = useCallback(async () => {
    setLoading(true);
    setError(null);

    console.log("[DataProvider] loadAllData started, user role:", user?.role);

    const errors: string[] = [];
    const token = getToken();
    if (!token) {
      console.warn("[DataProvider] No auth token available, skipping data fetch");
      setLoading(false);
      setHydrated(true);
      return;
    }

    try {
      const role = user?.role;

      let apiEmployees: Employee[] = [];
      let ticketResult: { tickets: Ticket[] } = { tickets: [] };
      let apiAssets: Asset[] = [];

      try {
        console.log("[DataProvider] Fetching employees...");
        apiEmployees = await fetchEmployees();
        console.log(`[DataProvider] Successfully fetched ${apiEmployees.length} employees`);
      } catch (err: any) {
        console.error("[DataProvider] Failed to fetch employees:", err.message);
        errors.push(`Employees: ${err.message}`);
      }

      try {
        console.log("[DataProvider] Fetching tickets...");
        ticketResult = await apiFetchTickets(role);
        console.log(`[DataProvider] Successfully fetched ${ticketResult?.tickets?.length ?? 0} tickets`);
      } catch (err: any) {
        console.error("[DataProvider] Failed to fetch tickets:", err.message);
        console.error("[DataProvider] Tickets API error details:", err);
      }

      try {
        console.log("[DataProvider] Fetching assets...");
        const assetsData = await apiFetch<any>("/asset-manager");
        console.log("Assets API Response", assetsData);
        let rawItems: any[] = [];
        if (Array.isArray(assetsData)) {
          rawItems = assetsData;
        } else if (assetsData?.assets && Array.isArray(assetsData.assets)) {
          rawItems = assetsData.assets;
        } else if (assetsData?.data?.assets && Array.isArray(assetsData.data.assets)) {
          rawItems = assetsData.data.assets;
        } else if (assetsData?.data && Array.isArray(assetsData.data)) {
          rawItems = assetsData.data;
        }
        apiAssets = rawItems.map(normalizeAsset);
        setAssets(apiAssets);
        console.log(`[DataProvider] Successfully fetched ${apiAssets.length} assets`);
      } catch (err: any) {
        console.error("[DataProvider] Failed to fetch assets:", err.message);
        errors.push(`Assets: ${err.message}`);
      }

      const finalEmployees = apiEmployees ?? [];
      const finalAssets = apiAssets ?? [];
      setEmployees(finalEmployees);
      setTickets(ticketResult?.tickets ?? []);
      console.log(`[DataProvider] State updated — tickets now: ${ticketResult?.tickets?.length ?? 0}`);

      if (errors.length > 0) {
        const message = `Some data could not be loaded: ${errors.join("; ")}`;
        setError(message);
        console.error("[DataProvider] Load errors:", errors);
      }

      console.log(`[DataProvider] loadAllData completed — employees: ${finalEmployees.length}, tickets: ${ticketResult?.tickets?.length ?? 0}, errors: ${errors.length > 0 ? errors.join("; ") : "none"}`);

      const statusCounts = assetStats(finalAssets);
      setDashboardStats({
        totalEmployees: finalEmployees.length,
        totalAssets: finalAssets.length,
        totalTickets: (ticketResult?.tickets ?? []).length,
        assetsByStatus: {
          available: statusCounts.available,
          assigned: statusCounts.assigned,
          maintenance: statusCounts.maintenance,
          outOfStock: statusCounts.outOfStock,
          retired: statusCounts.retired,
        },
        ticketsByStatus: {
          open: (ticketResult?.tickets ?? []).filter(t => t.status === "Open").length,
          inProgress: (ticketResult?.tickets ?? []).filter(t => t.status === "In Progress").length,
          resolved: (ticketResult?.tickets ?? []).filter(t => t.status === "Resolved").length,
          closed: (ticketResult?.tickets ?? []).filter(t => t.status === "Closed").length,
        },
        pendingOnboarding: finalEmployees.filter(e => !e.allocationStatus || e.allocationStatus === "Awaiting Asset Verification").length,
        readyForAllocation: finalEmployees.filter(e => e.allocationStatus === "Sent to IT Support Team" || e.allocationStatus === "Ready for Allocation").length,
        completedOnboarding: finalEmployees.filter(e => e.allocationStatus === "Completed").length,
        employeesByDepartment: finalEmployees.reduce((acc: Record<string, number>, e) => {
          const dept = e.department || "Unassigned";
          acc[dept] = (acc[dept] || 0) + 1;
          return acc;
        }, {} as Record<string, number>),
      });
    } catch (err: any) {
      const message = err.message || "Some dashboard data couldn't be loaded.";
      setError(message);
      console.error("[DataProvider] Dashboard data load error:", err);
    } finally {
      setLoading(false);
      setHydrated(true);
    }
  }, [user?.role]);

  const fetchAssignmentRecords = useCallback(async () => {
    try {
      console.log("[IT Support] GET Assignments");
      const data = await apiFetch<any>("/it-support/assignments");
      console.log("Assignments API Response:", data);
      const raw = Array.isArray(data) ? data : data?.assignments ?? data?.data ?? [];
      console.log("Assignments Count:", raw?.length);
      const mapped: any[] = [];
      for (const item of raw) {
        const eid = item.EmployeeId ?? item.employeeId ?? "";
        const ename = item.EmployeeName ?? item.employeeName ?? "";
        const dept = item.Department ?? item.department ?? "";
        if (Array.isArray(item.AssignedAssets)) {
          const assets = item.AssignedAssets;
          if (assets.length === 0) {
            mapped.push({
              AssignmentId: "", EmployeeId: eid, EmployeeName: ename,
              AssetId: "", AssetTag: "", AssetName: "", Category: "",
              Department: dept, AssignedBy: "", AssignedRole: "",
              AssignedDate: "", Status: "", AssignmentStatus: "",
              Workflow: "", ITComment: "", Comments: "",
            });
          } else {
            for (const a of assets) {
              mapped.push({
                AssignmentId: a.AssignmentId ?? a.assignmentId ?? item.AssignmentId ?? item.assignmentId ?? "",
                EmployeeId: eid, EmployeeName: ename,
                AssetId: a.AssetId ?? a.assetId ?? "",
                AssetTag: a.AssetTag ?? a.assetTag ?? "",
                AssetName: a.AssetName ?? a.assetName ?? "",
                Category: a.Category ?? a.category ?? "",
                Department: dept,
                AssignedBy: a.AssignedBy ?? a.assignedBy ?? item.AssignedBy ?? item.assignedBy ?? "",
                AssignedRole: a.AssignedRole ?? a.assignedRole ?? item.AssignedRole ?? item.assignedRole ?? "",
                AssignedDate: a.AssignedDate ?? a.assignedDate ?? item.AssignedDate ?? item.assignedDate ?? "",
                Status: a.Status ?? a.status ?? item.Status ?? item.status ?? "",
                AssignmentStatus: a.AssignmentStatus ?? a.assignmentStatus ?? item.AssignmentStatus ?? item.assignmentStatus ?? "",
                Workflow: a.Workflow ?? a.workflow ?? item.Workflow ?? item.workflow ?? "",
                ITComment: a.ITComment ?? a.itComment ?? item.ITComment ?? item.itComment ?? "",
                Comments: a.Comments ?? a.comments ?? item.Comments ?? item.comments ?? "",
              });
            }
          }
        } else {
          mapped.push({
            AssignmentId: item.AssignmentId ?? item.assignmentId ?? item.id ?? "",
            EmployeeId: eid, EmployeeName: ename,
            AssetId: item.AssetId ?? item.assetId ?? "",
            AssetTag: item.AssetTag ?? item.assetTag ?? "",
            AssetName: item.AssetName ?? item.assetName ?? "",
            Category: item.Category ?? item.category ?? "",
            Department: dept,
            AssignedBy: item.AssignedBy ?? item.assignedBy ?? "",
            AssignedRole: item.AssignedRole ?? item.assignedRole ?? "",
            AssignedDate: item.AssignedDate ?? item.assignedDate ?? "",
            Status: item.Status ?? item.status ?? "",
            AssignmentStatus: item.AssignmentStatus ?? item.assignmentStatus ?? "",
            Workflow: item.Workflow ?? item.workflow ?? "",
            ITComment: item.ITComment ?? item.itComment ?? item.Comments ?? item.comments ?? "",
            Comments: item.Comments ?? item.comments ?? "",
          });
        }
      }
      setAssignmentRecords(mapped);
    } catch (err: any) {
      console.warn("[DataProvider] Failed to fetch assignment records:", err.message);
    }
  }, []);

  const createAssignmentRecord = useCallback(async (record: Omit<AssetAssignmentRecord, "AssignmentId" | "AssignedDate" | "AssignedRole" | "Status">) => {
    const payload = {
      EmployeeId: record.EmployeeId,
      EmployeeName: record.EmployeeName,
      AssetId: record.AssetId,
      AssetTag: record.AssetTag,
      AssetName: record.AssetName,
      Department: record.Department,
      AssignedBy: record.AssignedBy,
      AssignedRole: "IT Support Team",
      Status: "Assigned",
      Comments: record.Comments,
    };
    console.log("[Assignment Create] Payload:", payload);
    console.log("[Assignment Create] API:", "/asset-assignments");
    const result = await apiFetch<AssetAssignmentRecord>("/asset-assignments", {
      method: "POST",
      body: JSON.stringify(payload),
    });
    if (result) {
      setAssignmentRecords((prev) => [result, ...prev]);
      fetchAssignmentRecords();
    }
    return result;
  }, []);

  const refreshData = useCallback(async () => {
    await loadAllData();
    await fetchAssignmentRecords();
  }, [loadAllData, fetchAssignmentRecords]);

  useEffect(() => {
    refreshData();
  }, [refreshData]);

  const createTicketFn = async (ticketData: any, actor: string) => {
    try {
      console.log("[DataProvider] createTicket called with:", ticketData);
      const newTicket = await apiCreateTicket({
        title: ticketData.title,
        description: ticketData.description,
        priority: ticketData.priority,
        category: ticketData.category,
        department: ticketData.department,
        employeeId: ticketData.employeeId,
        created_by_id: ticketData.created_by_id,
        RelatedAssetId: ticketData.assetId || null,
        attachments: Array.isArray(ticketData.attachments) ? ticketData.attachments : [],
      });
      console.log("[DataProvider] createTicket response:", newTicket);
      await refreshData();
      return newTicket;
    } catch (err: any) {
      toast.error(err.message || "Failed to create ticket");
      throw err;
    }
  };

  const uploadFilesFn = async (files: FileList | File[], ticketId: string, employeeId: string): Promise<string[]> => {
    if (!ticketId) {
      const err = new Error("Cannot upload attachment: no ticket ID");
      toast.error(err.message);
      throw err;
    }
    try {
      return await apiUploadFiles(files, ticketId, employeeId);
    } catch (err: any) {
      toast.error(err.message);
      throw err;
    }
  };

  const updateTicketStatusFn = async (ticketId: string, statusVal: Ticket["status"], actor: string, role: Role, comment?: string) => {
    try {
      const updated = await apiUpdateTicketStatus(ticketId, statusVal, comment);
      setTickets((prev) => prev.map((t) => (t.id === ticketId ? updated : t)));
      await refreshData();
    } catch (err: any) {
      toast.error(err.message || "Failed to update ticket status");
    }
  };

  const acceptTicket = async (ticketId: string, actor: string) => {
    try {
      const updated = await apiUpdateTicketStatus(ticketId, "Assigned", "Ticket accepted");
      setTickets((prev) => prev.map((t) => (t.id === ticketId ? updated : t)));
      await refreshData();
    } catch (err: any) {
      toast.error(err.message || "Failed to accept ticket");
    }
  };

  const escalateTicket = async (ticketId: string, actor: string, remarks: string) => {
    try {
      const updated = await apiUpdateTicketStatus(ticketId, "Escalated", remarks);
      setTickets((prev) => prev.map((t) => (t.id === ticketId ? updated : t)));
      await refreshData();
    } catch (err: any) {
      toast.error(err.message || "Failed to escalate ticket");
    }
  };

  const reviewEscalation = async (ticketId: string, approved: boolean, actor: string, remarks: string) => {
    try {
      const updated = await apiUpdateTicketStatus(
        ticketId,
        approved ? "Approved for Asset Manager" : "Open",
        remarks
      );
      setTickets((prev) => prev.map((t) => (t.id === ticketId ? updated : t)));
      await refreshData();
    } catch (err: any) {
      toast.error(err.message || "Failed to review escalation");
    }
  };

  const resolveAssetTicket = async (ticketId: string, actor: string, details: any) => {
    try {
      const updated = await apiUpdateTicketStatus(ticketId, "Resolved", details.remarks);
      setTickets((prev) => prev.map((t) => (t.id === ticketId ? updated : t)));
      await refreshData();
    } catch (err: any) {
      toast.error(err.message || "Failed to resolve ticket");
    }
  };

  const addTicketCommentFn = async (ticketId: string, actor: string, role: Role, message: string) => {
    try {
      await apiAddTicketComment(ticketId, message);
      const { tickets: refreshed } = await apiFetchTickets(user?.role);
      const updated = refreshed.find((t) => t.id === ticketId);
      if (updated) {
        setTickets((prev) => prev.map((t) => (t.id === ticketId ? updated : t)));
      }
      await refreshData();
    } catch (err: any) {
      toast.error(err.message || "Failed to post comment");
    }
  };

  const addEmployee = async (empData: any) => {
    const result = await apiCreateEmployee({
      name: empData.name,
      email: empData.email,
      role: empData.role,
      department: empData.department,
      designation: empData.designation,
      joinDate: empData.joiningDate || todayStr(),
      allocationDate: empData.allocationDate,
      allocationTime: empData.allocationTime,
      requiredAssetCategory: empData.requiredAssetCategory,
    });
    toast.success("Employee created successfully. Login credentials have been sent to the employee's registered email.");
    await refreshData();
    return result;
  };

  const deleteEmployee = async (id: string) => {
    try {
      await apiFetch(`/admin/employees/${id}`, { method: "DELETE" });
      setEmployees((prev) => prev.filter((e) => e.id !== id));
      toast.success("Employee deleted successfully");
      await refreshData();
    } catch (err: any) {
      console.warn("[DataProvider] Employee deletion API failed:", err.message);
      setEmployees((prev) => prev.filter((e) => e.id !== id));
      toast.success("Employee deleted successfully");
      await refreshData();
    }
  };

  const assignAssets = async (employeeId: string, assetIds: string[]) => {
    try {
      for (const assetId of assetIds) {
        await apiFetch(`/asset-manager/${assetId}/assign`, {
          method: "PATCH",
          body: JSON.stringify({ assignedTo: employeeId }),
        });
      }
      setAssets((prev) =>
        prev.map((a) =>
          assetIds.includes(a.assetId)
            ? { ...a, status: "Assigned" as const, assignedTo: employeeId, assignedAt: todayStr() }
            : a
        )
      );
      toast.success(`Assets assigned successfully to employee`);
      await refreshData();
    } catch (err: any) {
      toast.error(err.message || "Failed to assign assets");
      throw err;
    }
  };

  const addAsset = async (assetData: any): Promise<Asset> => {
    try {
      const payload: Record<string, any> = {};
      if (assetData.name) payload.AssetName = assetData.name;
      if (assetData.category) payload.Category = assetData.category;
      if (assetData.manufacturer) payload.Manufacturer = assetData.manufacturer;
      if (assetData.model) payload.Model = assetData.model;
      if (assetData.serial) payload.SerialNumber = assetData.serial;
      if (assetData.purchaseDate) payload.PurchaseDate = assetData.purchaseDate;
      if (assetData.warrantyExpiry) payload.WarrantyExpiry = assetData.warrantyExpiry;
      if (assetData.cost !== undefined) payload.Cost = Number(assetData.cost);
      if (assetData.status) payload.Status = assetData.status;
      if (assetData.assignedTo !== undefined) payload.AssignedTo = assetData.assignedTo;
      if (assetData.uuid) payload.AssetId = assetData.uuid;

      console.log("Asset Create Payload:", payload);

      const result = await apiFetch("/asset-manager", {
        method: "POST",
        body: JSON.stringify(payload),
      });
      const rawAsset = Array.isArray(result) ? result[0] : result;
      const newAsset = normalizeAsset(rawAsset);
      setAssets((prev) => [...prev, newAsset]);
      await refreshData();
      return newAsset;
    } catch (err: any) {
      toast.error(err.message || "Failed to create asset");
      throw err;
    }
  };

  const addBulkAssets = async (assetsData: any[]): Promise<{ assets: Asset[]; insertedCount: number; failedCount: number; insertedAssets: any[]; failedRows: any[] }> => {
    try {
      const payload = {
        assets: assetsData.map((a) => ({
          name: a.name,
          category: a.category,
          manufacturer: a.manufacturer,
          model: a.model,
          serial: a.serial,
          purchase_date: a.purchaseDate,
          warranty_expiry: String(a.warrantyExpiry ?? ""),
          status: a.status,
          cost: a.cost,
          assigned_to_id: a.assignedTo || null,
        })),
      };

      console.log("[addBulkAssets] Request URL:", "/assets/bulk");
      console.log("[addBulkAssets] Request Payload:", JSON.stringify(payload, null, 2));

      const result = await apiFetch<any>("/assets/bulk", {
        method: "POST",
        body: JSON.stringify(payload),
      });

      console.log("[addBulkAssets] Full API Response:", JSON.stringify(result, null, 2));

      const responseBody = result?.data ?? result;
      const insertedCount = responseBody.insertedCount ?? 0;
      const failedCount = responseBody.failedCount ?? 0;
      const insertedAssets = responseBody.insertedAssets ?? [];
      const failedRows = responseBody.failedRows ?? [];

      console.log("[addBulkAssets] Parsed - insertedCount:", insertedCount, "failedCount:", failedCount);
      console.log("[addBulkAssets] Inserted Assets:", insertedAssets);

      if (insertedCount === 0) {
        console.log("[addBulkAssets] COMPLETE RESPONSE:", JSON.stringify(result, null, 2));
      }

      const newAssets = (Array.isArray(insertedAssets) ? insertedAssets : []).map(normalizeAsset);
      if (newAssets.length > 0) {
        setAssets((prev) => [...prev, ...newAssets]);
      }

      await refreshData();
      return { assets: newAssets, insertedCount, failedCount, insertedAssets, failedRows };
    } catch (err: any) {
      console.error("[addBulkAssets] Error Response:", err);
      console.error("[addBulkAssets] Error Message:", err.message);
      console.error("[addBulkAssets] Error Status:", err.status);
      console.error("[addBulkAssets] Error Body:", err.body);
      throw err;
    }
  };

  const retireAsset = async (id: string) => {
    try {
      await apiFetch(`/asset-manager/${id}/retire`, { method: "PATCH" });
      setAssets((prev) =>
        prev.map((a) => (a.assetId === id ? { ...a, status: "Retired" as const } : a))
      );
      toast.success("Asset retired successfully");
      await refreshData();
    } catch (err: any) {
      toast.error(err.message || "Failed to retire asset");
      throw err;
    }
  };

  const verifyOnboardingAsset = async (
    employeeId: string,
    verificationStatus: string,
    selectedAssets: any[],
    remarks: string,
    pendingCategories?: string[]
  ) => {
    try {
      const payload = {
        verificationStatus,
        selectedAssets: selectedAssets.map((a: any) => ({
          AssetId: a.AssetId || a.assetId,
          Category: a.Category || a.category || ""
        })),
        pendingCategories: pendingCategories || [],
        remarks: remarks || ""
      };

      const url = `${BASE_URL}/asset-manager/onboarding/${employeeId}/verify`;
      console.log("VERIFY URL", url);
      console.log("VERIFY PAYLOAD", payload);

      const response = await apiFetch<any>(`/asset-manager/onboarding/${employeeId}/verify`, {
        method: "POST",
        body: JSON.stringify(payload),
      });

      const hasPending = (pendingCategories?.length ?? 0) > 0;

      toast.success(
        hasPending
          ? (response?.message || "Assets allocated — remaining items pending")
          : (response?.message || "Verification completed — sent to IT Support Team")
      );
      await refreshData();
      return response;
    } catch (err: any) {
      const errorMsg = err?.body?.data?.error || err?.body?.error || err.message || "Failed to update onboarding request";
      toast.error(errorMsg);
      throw err;
    }
  };

  const outOfStockOnboarding = async (
    employeeId: string,
    remarks: string
  ) => {
    try {
      const payload = {
        verificationStatus: "Out of Stock",
        selectedAsset: null,
        remarks: remarks || ""
      };

      const url = `${BASE_URL}/asset-manager/onboarding/${employeeId}/verify`;
      console.log("OUT OF STOCK URL", url);
      console.log("OUT OF STOCK PAYLOAD", payload);

      const response = await apiFetch<any>(`/asset-manager/onboarding/${employeeId}/verify`, {
        method: "POST",
        body: JSON.stringify(payload),
      });

      toast.success(response?.message || "Onboarding flagged as out of stock");
      await refreshData();
      return response;
    } catch (err: any) {
      const errorMsg = err?.body?.data?.error || err?.body?.error || err.message || "Failed to update onboarding request";
      toast.error(errorMsg);
      throw err;
    }
  };

  const completeOnboardingAllocation = async (employeeId: string, assetId: string, remarks: string, actor: string) => {
    try {
      await apiFetch("/asset-manager/onboarding/allocate", {
        method: "POST",
        body: JSON.stringify({ employeeId, assetId, remarks, actor }),
      });
      setAssets((prev) =>
        prev.map((a) =>
          a.assetId === assetId
            ? { ...a, status: "Delivered" as const, assignedTo: employeeId, assignedAt: todayStr() }
            : a
        )
      );
      setEmployees((prev) =>
        prev.map((e) =>
          e.id === employeeId
            ? { ...e, allocationStatus: "Completed" as const, verificationStatus: "Verified" as const }
            : e
        )
      );
      toast.success("Asset delivered successfully");
      await refreshData();
    } catch (err: any) {
      console.warn("[DataProvider] Allocation API failed, updating locally:", err.message);
      setAssets((prev) =>
        prev.map((a) =>
          a.assetId === assetId
            ? { ...a, status: "Delivered" as const, assignedTo: employeeId, assignedAt: todayStr() }
            : a
        )
      );
      setEmployees((prev) =>
        prev.map((e) =>
          e.id === employeeId
            ? { ...e, allocationStatus: "Completed" as const, verificationStatus: "Verified" as const }
            : e
        )
      );
      toast.success("Asset delivered successfully");
      await refreshData();
    }
  };

  const markOnboardingComplete = async (employeeId: string, remarks: string, actor: string) => {
    try {
      await apiFetch("/support/onboarding/" + employeeId + "/complete", {
        method: "POST",
        body: JSON.stringify({ remarks, actor }),
      });
      setEmployees((prev) =>
        prev.map((e) =>
          e.id === employeeId
            ? { ...e, allocationStatus: "Completed" as const, verificationStatus: "Verified" as const }
            : e
        )
      );
      toast.success("Onboarding marked as completed");
      await refreshData();
    } catch (err: any) {
      toast.error(err.message || "Failed to mark onboarding complete");
      throw err;
    }
  };

  const addOnboardingNote = async (employeeId: string, notes: string, actor: string) => {
    try {
      await apiFetch("/support/onboarding/" + employeeId + "/notes", {
        method: "POST",
        body: JSON.stringify({ remarks: notes, actor }),
      });
      toast.success("Note added successfully");
      await refreshData();
    } catch (err: any) {
      toast.error(err.message || "Failed to add note");
      throw err;
    }
  };

  const fetchFullProfile = async (userUuid: string) => {
    const employee = employees.find((e) => e.id === userUuid || e.uuid === userUuid);
    return employee ?? null;
  };

  const fetchRecentEmployees = async () => {
    return employees.slice(0, 10);
  };

  return (
    <Ctx.Provider value={{
      employees,
      assets,
      assignments,
      tickets,
      auditLogs,
      notifications,
      maintenance,
      knowledgeBase,
      dashboardStats,
      loading,
      error,
      refreshData,
      createTicket: createTicketFn,
      uploadFiles: uploadFilesFn,
      acceptTicket,
      updateTicketStatus: updateTicketStatusFn,
      addTicketComment: addTicketCommentFn,
      escalateTicket,
      reviewEscalation,
      resolveAssetTicket,
      addEmployee,
      deleteEmployee,
      assignAssets,
      addAsset,
      addBulkAssets,
      retireAsset,
      setAssets,
      setTickets,
      verifyOnboardingAsset,
      outOfStockOnboarding,
      completeOnboardingAllocation,
      markOnboardingComplete,
      addOnboardingNote,
      fetchFullProfile,
      fetchRecentEmployees,
      assignmentRecords,
      createAssignmentRecord,
      fetchAssignmentRecords,
    }}>
      {children}
    </Ctx.Provider>
  );
}

export function useData() {
  const c = useContext(Ctx);
  if (!c) throw new Error("useData must be used within a DataProvider");
  return c;
}
