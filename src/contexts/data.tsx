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
  const [assets] = useState<Asset[]>([]);
  const [assignments] = useState<Assignment[]>([]);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [auditLogs] = useState<any[]>([]);
  const [notifications] = useState<any[]>([]);
  const [vendors] = useState<Vendor[]>([]);
  const [maintenance] = useState<Maintenance[]>([]);
  const [knowledgeBase] = useState<any[]>([]);
  const [dashboardStats] = useState<any | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);

  const loadAllData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const role = user?.role;
      const [apiEmployees, ticketResult] = await Promise.all([
        fetchEmployees(),
        apiFetchTickets(role),
      ]);
      setEmployees(apiEmployees);
      setTickets(ticketResult.tickets);
    } catch (err: any) {
      const message = err.message || "Failed to load application data";
      setError(message);
      toast.error(message);
      setEmployees([]);
      setTickets([]);
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
    toast.error("Employee deletion is not available yet");
  };

  const assignAssets = async (employeeId: string, assetIds: string[]) => {
    toast.error("Asset assignment is not available yet");
  };

  const addAsset = async (assetData: any) => {
    toast.error("Asset management is not available yet");
    throw new Error("Asset management is not available yet");
  };

  const retireAsset = async (id: string) => {
    toast.error("Asset management is not available yet");
  };

  const verifyOnboardingAsset = async (employeeId: string, approved: boolean, remarks: string, actor: string) => {
    toast.error("Onboarding verification is not available yet");
  };

  const completeOnboardingAllocation = async (employeeId: string, assetId: string, remarks: string, actor: string) => {
    toast.error("Onboarding allocation is not available yet");
  };

  const fetchFullProfile = async (userUuid: string) => {
    const employee = employees.find((e) => e.id === userUuid || e.uuid === userUuid);
    return employee ?? null;
  };

  const fetchRecentEmployees = async () => {
    return employees.slice(0, 10);
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
