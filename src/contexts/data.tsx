import { createContext, useContext, useState, useEffect, type ReactNode } from "react";
import { getAuthHeaders } from "./auth";
import type {
  Employee, Asset, Assignment, Ticket, Role, Vendor, Maintenance
} from "@/data/mock";
import { toast } from "sonner";

const originalFetch = typeof window !== "undefined" ? window.fetch : globalThis.fetch;
const fetch = (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
  if (typeof input === "string" && input.startsWith("/api")) {
    return originalFetch(`http://localhost:8000${input}`, init);
  }
  return originalFetch(input, init);
};

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
  loading: boolean;
  refreshData: () => Promise<void>;
  createTicket: (ticket: Omit<Ticket, "id" | "status" | "createdAt" | "updatedAt" | "assignee" | "sla" | "comments" | "assignedRole" | "timeline" | "auditTrail"> & { attachments?: string[] }, actor: string) => Promise<Ticket>;
  uploadFiles: (files: FileList) => Promise<string[]>;
  acceptTicket: (ticketId: string, actor: string) => Promise<void>;
  updateTicketStatus: (ticketId: string, status: Ticket["status"], actor: string, role: Role, comment?: string) => Promise<void>;
  addTicketComment: (ticketId: string, actor: string, role: Role, message: string) => Promise<void>;
  escalateTicket: (ticketId: string, actor: string, remarks: string) => Promise<void>;
  reviewEscalation: (ticketId: string, approved: boolean, actor: string, remarks: string) => Promise<void>;
  resolveAssetTicket: (ticketId: string, actor: string, details: { action: NonNullable<Ticket["assetAction"]>; assetDetails: string; remarks: string; resolution: string }) => Promise<void>;
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

export function DataProvider({ children }: { children: ReactNode }) {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [maintenance, setMaintenance] = useState<Maintenance[]>([]);
  const [knowledgeBase, setKnowledgeBase] = useState<any[]>([]);

  const [loading, setLoading] = useState(true);
  const [hydrated, setHydrated] = useState(false);

  // Mappings to convert backend schemas (with display_id and uuid) to UI schemas
  const mapEmployee = (u: any): Employee & { uuid: string } => ({
    id: u.display_id,
    uuid: u.id,
    name: u.name,
    email: u.email,
    department: u.department,
    designation: u.designation,
    manager: u.manager,
    location: u.location,
    status: u.status as any,
    avatar: u.avatar || "EE",
    phone: u.phone,
    joinDate: u.join_date,
    allocationDate: u.allocation_date,
    allocationTime: u.allocation_time,
    allocationStatus: u.allocation_status,
    requiredAssetCategory: u.required_asset_category,
    allocatedAssetDetails: u.allocated_asset_details,
    allocationHistory: u.allocation_history
  });

  const mapAsset = (a: any): Asset & { uuid: string } => ({
    id: a.display_id,
    uuid: a.id,
    name: a.name,
    category: a.category,
    manufacturer: a.manufacturer,
    model: a.model,
    serial: a.serial,
    purchaseDate: a.purchase_date,
    warrantyExpiry: a.warranty_expiry,
    location: a.location,
    assignedTo: a.assigned_to_id,  // Will resolve to display_id on load
    status: a.status as any,
    cost: a.cost
  });

  const mapTicket = (t: any, resolvedAssets: any[]): Ticket & { uuid: string } => ({
    id: t.display_id,
    uuid: t.id,
    title: t.title,
    description: t.description,
    priority: t.priority as any,
    category: t.category,
    status: t.status as any,
    createdBy: t.created_by_id,  // Will resolve to creator name on load
    assignee: t.assignee_id,     // Will resolve to assignee name on load
    assetId: resolvedAssets.find(x => x.id === t.asset_id)?.display_id || null,
    createdAt: t.created_at.slice(0, 10),
    updatedAt: t.updated_at.slice(0, 10),
    sla: t.sla as any,
    supportResolution: t.support_resolution,
    adminRemarks: t.admin_remarks,
    assetAction: t.asset_action as any,
    assetDetails: t.asset_details,
    assetRemarks: t.asset_remarks,
    assetResolution: t.asset_resolution,
    assignedRole: t.assigned_role as any,
    timeline: t.timeline,
    auditTrail: t.audit_trail,
    attachments: t.attachments || [],
    comments: (t.comments || []).map((c: any) => ({
      author: c.author_name,
      message: c.message,
      at: c.created_at.slice(0, 10)
    }))
  });

  const loadAllData = async () => {
    const headers = getAuthHeaders();
    if (!headers.Authorization) {
      setLoading(false);
      setHydrated(true);
      return;
    }

    try {
      // 1. Fetch Employees (Users API)
      const empRes = await fetch("/api/users?limit=1000", { headers });
      const empData = await empRes.json();
      const loadedEmps = empData.success ? empData.data.items.map(mapEmployee) : [];

      // 2. Fetch Assets
      const assetRes = await fetch("/api/assets?limit=2000", { headers });
      const assetData = await assetRes.json();
      const rawAssets = assetData.success ? assetData.data.items.map(mapAsset) : [];

      // Resolve asset.assignedTo (which is UUID) to employee display_id (e.g. EMP-1000)
      const loadedAssets = rawAssets.map((asset: any) => {
        if (asset.assignedTo) {
          const emp = loadedEmps.find((e: any) => e.uuid === asset.assignedTo);
          asset.assignedTo = emp ? emp.id : null;
        }
        return asset;
      });

      // 3. Fetch Assignments
      const asgRes = await fetch("/api/assignments?limit=1000", { headers });
      const asgData = await asgRes.json();
      const loadedAsgs = asgData.success ? asgData.data.items.map((a: any) => ({
        id: a.display_id,
        uuid: a.id,
        assetId: loadedAssets.find((x: any) => x.uuid === a.asset_id)?.id || a.asset_id,
        employeeId: loadedEmps.find((e: any) => e.uuid === a.employee_id)?.id || a.employee_id,
        assignedDate: a.assigned_date,
        returnDate: a.return_date,
        expectedReturn: a.expected_return,
        status: a.status as any
      })) : [];

      // 4. Fetch Tickets
      const tktRes = await fetch("/api/tickets?limit=1000", { headers });
      const tktData = await tktRes.json();
      const rawTkts = tktData.success ? tktData.data.items.map((t: any) => mapTicket(t, assetData.data.items)) : [];

      // Resolve ticket creator and assignee UUIDs to names
      const loadedTkts = rawTkts.map((t: any) => {
        const creator = loadedEmps.find((e: any) => e.uuid === t.createdBy);
        t.createdBy = creator ? creator.name : "System";

        if (t.assignee) {
          const assignee = loadedEmps.find((e: any) => e.uuid === t.assignee);
          t.assignee = assignee ? assignee.name : null;
        }
        return t;
      });

      // 5. Fetch Audit Logs
      const auditRes = await fetch("/api/audit-logs?limit=500", { headers });
      const auditData = await auditRes.json();
      const loadedAudits = auditData.success ? auditData.data.items : [];

      // 6. Fetch Notifications
      const notifRes = await fetch("/api/notifications", { headers });
      const notifData = await notifRes.json();
      const loadedNotifs = notifData.success ? notifData.data : [];

      // 7. Fetch Vendors
      const vendorRes = await fetch("/api/vendors?limit=100", { headers });
      const vendorData = await vendorRes.json();
      const loadedVendors = vendorData.success ? vendorData.data.items.map((v: any) => ({
        id: v.display_id,
        uuid: v.id,
        name: v.name,
        contact: v.contact,
        email: v.email,
        phone: v.phone,
        category: v.category,
        status: v.status as any,
        contractEnd: v.contract_end
      })) : [];

      // 8. Fetch Maintenance
      const maintRes = await fetch("/api/maintenance?limit=500", { headers });
      const maintData = await maintRes.json();
      const loadedMaintenance = maintData.success ? maintData.data.items.map((m: any) => ({
        id: m.display_id,
        uuid: m.id,
        assetId: loadedAssets.find((x: any) => x.uuid === m.asset_id)?.id || m.asset_id,
        engineer: m.engineer,
        date: m.date,
        resolution: m.resolution,
        parts: m.parts,
        cost: m.cost,
        status: m.status as any
      })) : [];

      // 9. Fetch Knowledge Base
      const kbRes = await fetch("/api/knowledge-base?limit=100", { headers });
      const kbData = await kbRes.json();
      const loadedKB = kbData.success ? kbData.data.items.map((k: any) => ({
        id: k.display_id,
        uuid: k.id,
        title: k.title,
        category: k.category,
        updatedAt: k.updated_at.slice(0, 10),
        views: k.views
      })) : [];

      setEmployees(loadedEmps);
      setAssets(loadedAssets);
      setAssignments(loadedAsgs);
      setTickets(loadedTkts);
      setAuditLogs(loadedAudits);
      setNotifications(loadedNotifs);
      setVendors(loadedVendors);
      setMaintenance(loadedMaintenance);
      setKnowledgeBase(loadedKB);

    } catch (error) {
      console.error("Error loading api data in contexts/data.tsx:", error);
    } finally {
      setLoading(false);
      setHydrated(true);
    }
  };

  useEffect(() => {
    loadAllData();
  }, []);

  const refreshData = async () => {
    await loadAllData();
  };

  const createTicket = async (ticketData: any, actor: string) => {
    // Translate asset display_id back to UUID if specified
    const assetUuid = ticketData.assetId
      ? assets.find((a: any) => a.id === ticketData.assetId)?.uuid || null
      : null;

    try {
      const response = await fetch("/api/tickets", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...getAuthHeaders(),
        },
        body: JSON.stringify({
          title: ticketData.title,
          description: ticketData.description,
          priority: ticketData.priority,
          category: ticketData.category,
          asset_id: assetUuid,
          attachments: ticketData.attachments || []
        }),
      });
      const result = await response.json();
      if (result.success && result.data) {
        refreshData();
        return result.data;
      } else {
        toast.error(result.message || "Failed to create ticket");
        throw new Error(result.message);
      }
    } catch (e) {
      console.error(e);
      throw e;
    }
  };

  const uploadFiles = async (files: FileList): Promise<string[]> => {
    const formData = new FormData();
    for (let i = 0; i < files.length; i++) {
      formData.append("files", files[i]);
    }
    try {
      const response = await fetch("/api/tickets/upload", {
        method: "POST",
        headers: {
          Authorization: getAuthHeaders().Authorization || "",
        },
        body: formData,
      });
      const result = await response.json();
      if (result.success && result.data) {
        return result.data;
      } else {
        toast.error(result.message || "Failed to upload files");
        return [];
      }
    } catch (e) {
      console.error("File upload error:", e);
      toast.error("File upload failed due to network error");
      return [];
    }
  };

  const acceptTicket = async (ticketId: string, actor: string) => {
    const tUuid = tickets.find((t: any) => t.id === ticketId)?.uuid;
    if (!tUuid) return;

    try {
      const response = await fetch(`/api/tickets/${tUuid}/accept`, {
        method: "POST",
        headers: getAuthHeaders(),
      });
      const result = await response.json();
      if (result.success) {
        await refreshData();
      } else {
        toast.error(result.message || "Failed to accept ticket");
      }
    } catch (e) {
      console.error(e);
    }
  };

  const updateTicketStatus = async (ticketId: string, statusVal: string, actor: string, role: Role, comment?: string) => {
    const tUuid = tickets.find((t: any) => t.id === ticketId)?.uuid;
    if (!tUuid) return;

    try {
      const response = await fetch(`/api/tickets/${tUuid}/status`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          ...getAuthHeaders(),
        },
        body: JSON.stringify({
          status: statusVal,
          support_resolution: comment || ""
        }),
      });
      const result = await response.json();
      if (result.success) {
        await refreshData();
      } else {
        toast.error(result.message || "Failed to update status");
      }
    } catch (e) {
      console.error(e);
    }
  };

  const addTicketComment = async (ticketId: string, actor: string, role: Role, message: string) => {
    const tUuid = tickets.find((t: any) => t.id === ticketId)?.uuid;
    if (!tUuid) return;

    try {
      const response = await fetch(`/api/tickets/${tUuid}/comments`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...getAuthHeaders(),
        },
        body: JSON.stringify({ message }),
      });
      const result = await response.json();
      if (result.success) {
        await refreshData();
      } else {
        toast.error(result.message || "Failed to post comment");
      }
    } catch (e) {
      console.error(e);
    }
  };

  const escalateTicket = async (ticketId: string, actor: string, remarks: string) => {
    const tUuid = tickets.find((t: any) => t.id === ticketId)?.uuid;
    if (!tUuid) return;

    try {
      const response = await fetch(`/api/tickets/${tUuid}/escalate`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...getAuthHeaders(),
        },
        body: JSON.stringify({ support_resolution: remarks }),
      });
      const result = await response.json();
      if (result.success) {
        await refreshData();
      } else {
        toast.error(result.message || "Failed to escalate ticket");
      }
    } catch (e) {
      console.error(e);
    }
  };

  const reviewEscalation = async (ticketId: string, approved: boolean, actor: string, remarks: string) => {
    const tUuid = tickets.find((t: any) => t.id === ticketId)?.uuid;
    if (!tUuid) return;

    try {
      const response = await fetch(`/api/tickets/${tUuid}/review-escalation`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...getAuthHeaders(),
        },
        body: JSON.stringify({ approved, remarks }),
      });
      const result = await response.json();
      if (result.success) {
        await refreshData();
      } else {
        toast.error(result.message || "Failed to review escalation");
      }
    } catch (e) {
      console.error(e);
    }
  };

  const resolveAssetTicket = async (ticketId: string, actor: string, details: any) => {
    const tUuid = tickets.find((t: any) => t.id === ticketId)?.uuid;
    if (!tUuid) return;

    try {
      const response = await fetch(`/api/tickets/${tUuid}/resolve-asset`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...getAuthHeaders(),
        },
        body: JSON.stringify({
          action: details.action,
          asset_details: details.assetDetails,
          remarks: details.remarks,
          resolution: details.resolution
        }),
      });
      const result = await response.json();
      if (result.success) {
        await refreshData();
      } else {
        toast.error(result.message || "Failed to resolve ticket");
      }
    } catch (e) {
      console.error(e);
    }
  };

  const addEmployee = async (empData: any) => {
    try {
      const response = await fetch("/api/users", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...getAuthHeaders(),
        },
        body: JSON.stringify({
          name: empData.name,
          email: empData.email,
          role: empData.role || "employee",
          department: empData.department,
          designation: empData.designation,
          manager: empData.manager,
          location: empData.location,
          phone: empData.phone,
          allocation_date: empData.allocationDate,
          allocation_time: empData.allocationTime,
          required_asset_category: empData.requiredAssetCategory
        }),
      });
      const result = await response.json();
      if (result.success && result.data) {
        refreshData();
        return mapEmployee(result.data);
      } else {
        toast.error(result.message || "Failed to create employee");
        throw new Error(result.message);
      }
    } catch (e) {
      console.error(e);
      throw e;
    }
  };

  const deleteEmployee = async (id: string) => {
    const eUuid = employees.find((e: any) => e.id === id)?.uuid;
    if (!eUuid) return;

    try {
      const response = await fetch(`/api/users/${eUuid}`, {
        method: "DELETE",
        headers: getAuthHeaders(),
      });
      const result = await response.json();
      if (result.success) {
        refreshData();
      } else {
        toast.error(result.message || "Failed to delete employee");
      }
    } catch (e) {
      console.error(e);
    }
  };

  const assignAssets = async (employeeId: string, assetIds: string[]) => {
    if (assetIds.length === 0) return;
    const eUuid = employees.find((e: any) => e.id === employeeId)?.uuid;
    const aUuid = assets.find((a: any) => a.id === assetIds[0])?.uuid;
    if (!eUuid || !aUuid) return;

    try {
      const response = await fetch("/api/assignments", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...getAuthHeaders(),
        },
        body: JSON.stringify({
          asset_id: aUuid,
          employee_id: eUuid,
          assigned_date: new Date().toISOString().slice(0, 10)
        }),
      });
      const result = await response.json();
      if (result.success) {
        refreshData();
      } else {
        toast.error(result.message || "Failed to assign asset");
      }
    } catch (e) {
      console.error(e);
    }
  };

  const addAsset = async (assetData: any) => {
    try {
      const response = await fetch("/api/assets", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...getAuthHeaders(),
        },
        body: JSON.stringify({
          name: assetData.name,
          category: assetData.category,
          manufacturer: assetData.manufacturer,
          model: assetData.model,
          serial: assetData.serial,
          purchase_date: assetData.purchaseDate,
          warranty_expiry: assetData.warrantyExpiry,
          location: assetData.location,
          status: assetData.status,
          cost: assetData.cost
        }),
      });
      const result = await response.json();
      if (result.success && result.data) {
        refreshData();
        return mapAsset(result.data);
      } else {
        toast.error(result.message || "Failed to create asset");
        throw new Error(result.message);
      }
    } catch (e) {
      console.error(e);
      throw e;
    }
  };

  const retireAsset = async (id: string) => {
    const aUuid = assets.find((a: any) => a.id === id)?.uuid;
    if (!aUuid) return;

    try {
      const response = await fetch(`/api/assets/${aUuid}`, {
        method: "DELETE",
        headers: getAuthHeaders(),
      });
      const result = await response.json();
      if (result.success) {
        refreshData();
      } else {
        toast.error(result.message || "Failed to retire asset");
      }
    } catch (e) {
      console.error(e);
    }
  };

  const verifyOnboardingAsset = async (employeeId: string, approved: boolean, remarks: string, actor: string) => {
    const eUuid = employees.find((e: any) => e.id === employeeId)?.uuid;
    if (!eUuid) return;

    try {
      const response = await fetch(`/api/assets/onboarding/verify/${eUuid}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...getAuthHeaders(),
        },
        body: JSON.stringify({ approved, remarks }),
      });
      const result = await response.json();
      if (result.success) {
        refreshData();
      } else {
        toast.error(result.message || "Failed to verify onboarding");
      }
    } catch (e) {
      console.error(e);
    }
  };

  const completeOnboardingAllocation = async (employeeId: string, assetId: string, remarks: string, actor: string) => {
    const eUuid = employees.find((e: any) => e.id === employeeId)?.uuid;
    const aUuid = assets.find((a: any) => a.id === assetId)?.uuid;
    if (!eUuid || !aUuid) return;

    try {
      const response = await fetch(`/api/assets/onboarding/allocate/${eUuid}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...getAuthHeaders(),
        },
        body: JSON.stringify({ asset_id: aUuid, remarks }),
      });
      const result = await response.json();
      if (result.success) {
        refreshData();
      } else {
        toast.error(result.message || "Failed to allocate asset");
      }
    } catch (e) {
      console.error(e);
    }
  };
  const fetchFullProfile = async (userUuid: string) => {
    try {
      const response = await fetch(`/api/users/${userUuid}/full-profile`, {
        headers: getAuthHeaders(),
      });
      const result = await response.json();
      if (result.success && result.data) {
        return result.data;
      }
      return null;
    } catch (e) {
      console.error("Failed to fetch full employee profile:", e);
      return null;
    }
  };

  const fetchRecentEmployees = async () => {
    try {
      const response = await fetch("/api/users/recent", {
        headers: getAuthHeaders(),
      });
      const result = await response.json();
      if (result.success && result.data) {
        return result.data.map(mapEmployee);
      }
      return [];
    } catch (e) {
      console.error("Failed to fetch recent employees:", e);
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
      loading,
      refreshData,
      createTicket,
      uploadFiles,
      acceptTicket,
      updateTicketStatus,
      addTicketComment,
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
