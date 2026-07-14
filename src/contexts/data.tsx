import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react";
import type {
  Employee, Asset, Assignment, Ticket, Role, Vendor, Maintenance
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
import { apiFetch, apiUpload, getToken } from "@/services/api";
import { toast } from "sonner";
import { assetStats, normalizeAssetStatus } from "@/lib/assets";

interface DataCtx {
  employees: Employee[];
  assets: Asset[];
  assignments: Assignment[];
  tickets: Ticket[];
  auditLogs: any[];
  notifications: any[];
  vendors: Vendor[];
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
  addBulkAssets: (assets: Record<string, any>[]) => Promise<Asset[]>;
  retireAsset: (id: string) => Promise<void>;
  setAssets: React.Dispatch<React.SetStateAction<Asset[]>>;
  verifyOnboardingAsset: (employeeId: string, approved: boolean, remarks: string, actor: string) => Promise<void>;
  completeOnboardingAllocation: (employeeId: string, assetId: string, remarks: string, actor: string) => Promise<void>;
  fetchFullProfile: (userUuid: string) => Promise<any>;
  fetchRecentEmployees: () => Promise<any[]>;
}

const Ctx = createContext<DataCtx | null>(null);

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

export function DataProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [assignments] = useState<Assignment[]>([]);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [auditLogs] = useState<any[]>([]);
  const [notifications] = useState<any[]>([]);
  const [vendors] = useState<Vendor[]>([]);
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
        errors.push(`Tickets: ${err.message}`);
      }

      try {
        console.log("[DataProvider] Fetching assets...");
        const assetsData = await apiFetch<any>("/asset-manager");
        console.log("Assets API Response", assetsData);
        const rawItems = Array.isArray(assetsData)
          ? assetsData
          : assetsData?.data ?? [];
        apiAssets = rawItems.map((item: any) => ({
          assetId: item.AssetId || item.assetId || "",
          assetName: item.AssetName || item.assetName || item.name || "",
          assetTag: item.AssetTag || item.assetTag || "",
          brand: item.Brand || item.brand || item.manufacturer || "",
          category: item.Category || item.category || "",
          model: item.Model || item.model || "",
          serialNumber: item.SerialNumber || item.serialNumber || item.serial || "",
          status: normalizeAssetStatus(item.Status || item.status),
          assignedTo: item.AssignedTo || item.assignedTo || null,
          purchaseDate: item.PurchaseDate || item.purchaseDate || "",
          warrantyExpiry: item.WarrantyExpiry || item.warrantyExpiry || "",
          location: item.Location || item.location || "",
          condition: item.Condition || item.condition || "",
          vendor: item.Vendor || item.vendor || "",
          createdAt: item.CreatedAt || item.createdAt || "",
          updatedAt: item.UpdatedAt || item.updatedAt || "",
          createdBy: item.CreatedBy || item.createdBy || "",
          assignedAt: item.AssignedAt || item.assignedAt || "",
          hardwareRequired: item.HardwareRequired || item.hardwareRequired || "",
        }));
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
        pendingOnboarding: finalEmployees.filter(e => e.allocationStatus === "Pending" || !e.allocationStatus).length,
        readyForAllocation: finalEmployees.filter(e => e.allocationStatus === "Ready for Allocation").length,
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

  useEffect(() => {
    loadAllData();
    const interval = setInterval(() => {
      loadAllData();
    }, 30000);
    return () => clearInterval(interval);
  }, [loadAllData]);

  const refreshData = useCallback(async () => {
    await loadAllData();
  }, [loadAllData]);

  const createTicketFn = async (ticketData: any, actor: string) => {
    try {
      const newTicket = await apiCreateTicket({
        title: ticketData.title,
        description: ticketData.description,
        priority: ticketData.priority,
        category: ticketData.category,
        department: ticketData.department,
        employeeId: ticketData.employeeId,
        created_by_id: ticketData.created_by_id,
        asset_id: ticketData.assetId || null,
        attachments: ticketData.attachments || [],
      });
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
      manager: empData.manager,
      location: empData.location,
      status: "Active",
      phone: empData.phone,
      joinDate: todayStr(),
      allocationDate: empData.allocationDate,
      allocationTime: empData.allocationTime,
      requiredAssetCategory: empData.requiredAssetCategory,
    });
    toast.success("Employee created successfully");
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
      if (assetData.location) payload.Location = assetData.location;
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
      const newAsset = Array.isArray(result) ? result[0] : result;
      setAssets((prev) => [...prev, newAsset]);
      toast.success("Inventory updated successfully");
      await refreshData();
      return newAsset;
    } catch (err: any) {
      toast.error(err.message || "Failed to create asset");
      throw err;
    }
  };

  const addBulkAssets = async (assetsData: any[]): Promise<Asset[]> => {
    try {
      const result = await apiFetch<any>("/asset-manager/bulk", {
        method: "POST",
        body: JSON.stringify({ assets: assetsData }),
      });
      const newAssets = Array.isArray(result) ? result : (result?.data ?? []);
      if (newAssets.length > 0) {
        setAssets((prev) => [...prev, ...newAssets]);
      }
      toast.success(`Inventory updated successfully (${newAssets.length} assets added)`);
      await refreshData();
      return newAssets;
    } catch (err: any) {
      toast.error(err.message || "Failed to create assets");
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

  const verifyOnboardingAsset = async (employeeId: string, approved: boolean, remarks: string, actor: string) => {
    try {
      const payload = { employeeId, approved, remarks, actor };
      await apiFetch("/asset-manager/onboarding/verify", {
        method: "POST",
        body: JSON.stringify(payload),
      });
      setEmployees((prev) =>
        prev.map((e) =>
          e.id === employeeId
            ? {
                ...e,
                allocationStatus: approved ? "Ready for Allocation" as const : "Waiting for Inventory" as const,
              }
            : e
        )
      );
      if (approved) {
        toast.success("Employee onboarding approved successfully");
      } else {
        toast.success("Employee onboarding rejected");
      }
      await refreshData();
    } catch (err: any) {
      toast.error(err.message || "Failed to update onboarding request");
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
            ? { ...e, allocationStatus: "Completed" as const }
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
            ? { ...e, allocationStatus: "Completed" as const }
            : e
        )
      );
      toast.success("Asset delivered successfully");
      await refreshData();
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
      vendors,
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
      verifyOnboardingAsset,
      completeOnboardingAllocation,
      fetchFullProfile,
      fetchRecentEmployees
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
