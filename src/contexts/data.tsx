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
  completeOnboardingAllocation as apiCompleteOnboardingAllocation,
  createAsset as apiCreateAsset,
  createAssignment as apiCreateAssignment,
  createEmployee as apiCreateEmployee,
  deleteEmployee as apiDeleteEmployee,
  fetchAssets,
  fetchAssignments,
  fetchAuditLogs,
  fetchDashboardStats as apiFetchDashboardStats,
  fetchEmployees,
  fetchFullProfile as apiFetchFullProfile,
  fetchKnowledgeBase,
  fetchMaintenance,
  fetchNotifications,
  fetchRecentEmployees as apiFetchRecentEmployees,
  fetchVendors,
  retireAsset as apiRetireAsset,
  verifyOnboardingAsset as apiVerifyOnboardingAsset,
} from "@/services/data";
import { useAuth } from "@/contexts/auth";
import { toast } from "sonner";

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
  createTicket: (ticket: Omit<Ticket, "id" | "status" | "createdAt" | "updatedAt" | "assignee" | "sla" | "comments" | "assignedRole" | "timeline" | "auditTrail"> & { attachments?: string[] }, actor: string) => Promise<Ticket>;
  uploadFiles: (files: FileList) => Promise<string[]>;
  updateTicketStatus: (ticketId: string, status: Ticket["status"], actor: string, role: Role, comment?: string) => Promise<void>;
  addTicketComment: (ticketId: string, actor: string, role: Role, message: string) => Promise<void>;
  addEmployee: (emp: Omit<Employee, "id" | "avatar" | "joinDate" | "status">) => Promise<Employee>;
  deleteEmployee: (id: string) => Promise<void>;
  assignAssets: (employeeId: string, assetIds: string[]) => Promise<void>;
  addAsset: (asset: Omit<Asset, "id">) => Promise<Asset>;
  retireAsset: (id: string) => Promise<void>;
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
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [maintenance, setMaintenance] = useState<Maintenance[]>([]);
  const [knowledgeBase, setKnowledgeBase] = useState<any[]>([]);
  const [dashboardStats, setDashboardStats] = useState<any | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);

  const loadAllData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const role = user?.role;

      const [
        apiEmployees,
        apiAssets,
        apiAssignments,
        ticketResult,
        apiAuditLogs,
        apiNotifications,
        apiVendors,
        apiMaintenance,
        apiKnowledgeBase,
        apiDashboardStats,
      ] = await Promise.all([
        fetchEmployees(),
        fetchAssets(),
        fetchAssignments(),
        apiFetchTickets(role),
        fetchAuditLogs().catch(() => []),
        fetchNotifications(),
        fetchVendors(),
        fetchMaintenance(),
        fetchKnowledgeBase(),
        apiFetchDashboardStats().catch(() => null),
      ]);

      setEmployees(apiEmployees);
      setAssets(apiAssets);
      setAssignments(apiAssignments);
      setTickets(ticketResult.tickets);
      setAuditLogs(apiAuditLogs);
      setNotifications(apiNotifications);
      setVendors(apiVendors);
      setMaintenance(apiMaintenance);
      setKnowledgeBase(apiKnowledgeBase);
      setDashboardStats(apiDashboardStats);
    } catch (err: any) {
      const message = err.message || "Failed to load live application data";
      setError(message);
      toast.error(message);
      setEmployees([]);
      setAssets([]);
      setAssignments([]);
      setTickets([]);
      setAuditLogs([]);
      setNotifications([]);
      setVendors([]);
      setMaintenance([]);
      setKnowledgeBase([]);
      setDashboardStats(null);
    } finally {
      setLoading(false);
      setHydrated(true);
    }
  }, [user?.role]);

  useEffect(() => {
    loadAllData();
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

  const uploadFilesFn = async (files: FileList): Promise<string[]> => {
    try {
      return await apiUploadFiles(files);
    } catch (err: any) {
      toast.error(err.message || "Failed to upload files");
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
    try {
      const newEmp = await apiCreateEmployee({
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
      await refreshData();
      return newEmp;
    } catch (err: any) {
      toast.error(err.message || "Failed to add employee");
      throw err;
    }
  };

  const deleteEmployee = async (id: string) => {
    const employee = employees.find((e) => e.id === id || e.uuid === id);
    if (!employee) return;
    try {
      await apiDeleteEmployee(employee.uuid);
      await refreshData();
    } catch (err: any) {
      toast.error(err.message || "Failed to delete employee");
      throw err;
    }
  };

  const assignAssets = async (employeeId: string, assetIds: string[]) => {
    if (assetIds.length === 0) return;
    const asset = assets.find((a) => a.id === assetIds[0] || a.uuid === assetIds[0]);
    const employee = employees.find((e) => e.id === employeeId || e.uuid === employeeId);
    if (!asset || !employee) return;
    try {
      await apiCreateAssignment({
        assetId: asset.uuid,
        employeeId: employee.uuid,
        assignedDate: todayStr(),
      });
      await refreshData();
    } catch (err: any) {
      toast.error(err.message || "Failed to assign asset");
      throw err;
    }
  };

  const addAsset = async (assetData: any) => {
    try {
      const newAsset = await apiCreateAsset(assetData);
      await refreshData();
      return newAsset;
    } catch (err: any) {
      toast.error(err.message || "Failed to add asset");
      throw err;
    }
  };

  const retireAsset = async (id: string) => {
    const asset = assets.find((a) => a.id === id || a.uuid === id);
    if (!asset) return;
    try {
      await apiRetireAsset(asset.uuid);
      await refreshData();
    } catch (err: any) {
      toast.error(err.message || "Failed to retire asset");
      throw err;
    }
  };

  const verifyOnboardingAsset = async (employeeId: string, approved: boolean, remarks: string, actor: string) => {
    const employee = employees.find((e) => e.id === employeeId || e.uuid === employeeId);
    if (!employee) return;
    try {
      await apiVerifyOnboardingAsset(employee.uuid, approved, remarks);
      await refreshData();
    } catch (err: any) {
      toast.error(err.message || "Failed to verify onboarding asset");
      throw err;
    }
  };

  const completeOnboardingAllocation = async (employeeId: string, assetId: string, remarks: string, actor: string) => {
    const employee = employees.find((e) => e.id === employeeId || e.uuid === employeeId);
    const asset = assets.find((a) => a.id === assetId || a.uuid === assetId);
    if (!employee || !asset) return;
    try {
      await apiCompleteOnboardingAllocation(employee.uuid, asset.uuid, remarks);
      await refreshData();
    } catch (err: any) {
      toast.error(err.message || "Failed to complete onboarding allocation");
      throw err;
    }
  };

  const fetchFullProfile = async (userUuid: string) => {
    try {
      const employee = employees.find((e) => e.id === userUuid || e.uuid === userUuid);
      return await apiFetchFullProfile(employee?.uuid ?? userUuid);
    } catch (err: any) {
      toast.error(err.message || "Failed to load profile");
      return null;
    }
  };

  const fetchRecentEmployees = async () => {
    try {
      return await apiFetchRecentEmployees();
    } catch (err: any) {
      toast.error(err.message || "Failed to load recent employees");
      return [];
    }
  };

  if (!hydrated) {
    return null;
  }

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
      retireAsset,
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
