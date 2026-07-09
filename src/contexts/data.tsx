import { createContext, useContext, useState, useEffect, type ReactNode } from "react";
import type {
  Employee, Asset, Assignment, Ticket, Role, Vendor, Maintenance
} from "@/data/mock";
import {
  employees as mockEmployees,
  assets as mockAssets,
  assignments as mockAssignments,
  tickets as mockTickets,
  auditLogs as mockAuditLogs,
  notifications as mockNotifications,
  vendors as mockVendors,
  maintenance as mockMaintenance,
  knowledgeBase as mockKnowledgeBase,
} from "@/data/mock";
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

let nextTicketId = mockTickets.length + 5000;
let nextEmployeeId = mockEmployees.length + 1000;
let nextAssetId = mockAssets.length + 10000;

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

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

  const loadAllData = async () => {
    setEmployees(mockEmployees);
    setAssets(mockAssets);
    setAssignments(mockAssignments);
    setTickets(mockTickets);
    setAuditLogs(mockAuditLogs);
    setNotifications(mockNotifications);
    setVendors(mockVendors);
    setMaintenance(mockMaintenance);
    setKnowledgeBase(mockKnowledgeBase);
    setLoading(false);
    setHydrated(true);
  };

  useEffect(() => {
    loadAllData();
  }, []);

  const refreshData = async () => {
    await loadAllData();
  };

  const createTicket = async (ticketData: any, actor: string) => {
    const id = `TKT-${nextTicketId++}`;
    const newTicket: Ticket = {
      id,
      title: ticketData.title,
      description: ticketData.description,
      priority: ticketData.priority,
      category: ticketData.category,
      status: "Open",
      createdBy: actor,
      assignee: null,
      assetId: ticketData.assetId || null,
      createdAt: todayStr(),
      updatedAt: todayStr(),
      sla: "On Track",
      attachments: ticketData.attachments || [],
      comments: [],
      assignedRole: undefined,
      timeline: [
        { step: "Ticket Created", timestamp: todayStr(), actor, role: "system", status: "Open" },
      ],
      auditTrail: [
        { user: actor, role: "system", timestamp: todayStr(), toStatus: "Open" },
      ],
    };
    setTickets((prev) => [...prev, newTicket]);
    return newTicket;
  };

  const uploadFiles = async (files: FileList): Promise<string[]> => {
    return Array.from(files).map((f) => `mock-upload/${f.name}`);
  };

  const acceptTicket = async (ticketId: string, actor: string) => {
    setTickets((prev) =>
      prev.map((t) =>
        t.id === ticketId
          ? { ...t, status: "Assigned" as const, assignee: actor, updatedAt: todayStr() }
          : t
      )
    );
  };

  const updateTicketStatus = async (ticketId: string, statusVal: Ticket["status"], actor: string, role: Role, comment?: string) => {
    setTickets((prev) =>
      prev.map((t) =>
        t.id === ticketId
          ? { ...t, status: statusVal, updatedAt: todayStr() }
          : t
      )
    );
  };

  const addTicketComment = async (ticketId: string, actor: string, role: Role, message: string) => {
    setTickets((prev) =>
      prev.map((t) =>
        t.id === ticketId
          ? { ...t, comments: [...t.comments, { author: actor, message, at: todayStr() }] }
          : t
      )
    );
  };

  const escalateTicket = async (ticketId: string, actor: string, remarks: string) => {
    setTickets((prev) =>
      prev.map((t) =>
        t.id === ticketId
          ? { ...t, status: "Escalated" as const, updatedAt: todayStr(), supportResolution: remarks }
          : t
      )
    );
  };

  const reviewEscalation = async (ticketId: string, approved: boolean, actor: string, remarks: string) => {
    setTickets((prev) =>
      prev.map((t) =>
        t.id === ticketId
          ? {
              ...t,
              status: approved ? ("Approved for Asset Manager" as const) : ("Pending Administration Approval" as const),
              adminRemarks: remarks,
              updatedAt: todayStr(),
            }
          : t
      )
    );
  };

  const resolveAssetTicket = async (ticketId: string, actor: string, details: any) => {
    setTickets((prev) =>
      prev.map((t) =>
        t.id === ticketId
          ? {
              ...t,
              status: "Resolved" as const,
              updatedAt: todayStr(),
              assetAction: details.action,
              assetDetails: details.assetDetails,
              assetRemarks: details.remarks,
              assetResolution: details.resolution,
            }
          : t
      )
    );
  };

  const addEmployee = async (empData: any) => {
    const id = `EMP-${nextEmployeeId++}`;
    const initials = empData.name.split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase();
    const newEmp: Employee = {
      id,
      name: empData.name,
      email: empData.email,
      department: empData.department,
      designation: empData.designation,
      manager: empData.manager,
      location: empData.location,
      status: "Active",
      avatar: initials,
      phone: empData.phone || "+1 555-0000",
      joinDate: todayStr(),
      allocationDate: empData.allocationDate,
      allocationTime: empData.allocationTime,
      allocationStatus: empData.allocationStatus,
      requiredAssetCategory: empData.requiredAssetCategory,
      allocatedAssetDetails: undefined,
      allocationHistory: empData.allocationDate
        ? [{ step: "Employee Created", timestamp: todayStr(), actor: "Admin User", remarks: "Employee record created." }]
        : undefined,
    };
    setEmployees((prev) => [...prev, newEmp]);
    return newEmp;
  };

  const deleteEmployee = async (id: string) => {
    setEmployees((prev) => prev.filter((e) => e.id !== id));
  };

  const assignAssets = async (employeeId: string, assetIds: string[]) => {
    if (assetIds.length === 0) return;
    const assetId = assetIds[0];
    setAssets((prev) =>
      prev.map((a) =>
        a.id === assetId ? { ...a, assignedTo: employeeId, status: "Assigned" as const } : a
      )
    );
    const asgId = `ASG-${2000 + assignments.length + 1}`;
    const newAsg: Assignment = {
      id: asgId,
      assetId,
      employeeId,
      assignedDate: todayStr(),
      returnDate: null,
      expectedReturn: null,
      status: "Active",
    };
    setAssignments((prev) => [...prev, newAsg]);
  };

  const addAsset = async (assetData: any) => {
    const id = `AST-${nextAssetId++}`;
    const newAsset: Asset = {
      id,
      name: assetData.name,
      category: assetData.category,
      manufacturer: assetData.manufacturer,
      model: assetData.model,
      serial: assetData.serial,
      purchaseDate: assetData.purchaseDate,
      warrantyExpiry: assetData.warrantyExpiry,
      location: assetData.location,
      assignedTo: null,
      status: assetData.status || "Available",
      cost: assetData.cost,
    };
    setAssets((prev) => [...prev, newAsset]);
    return newAsset;
  };

  const retireAsset = async (id: string) => {
    setAssets((prev) =>
      prev.map((a) =>
        a.id === id ? { ...a, status: "Retired" as const, assignedTo: null } : a
      )
    );
  };

  const verifyOnboardingAsset = async (employeeId: string, approved: boolean, remarks: string, actor: string) => {
    if (approved) {
      setEmployees((prev) =>
        prev.map((e) =>
          e.id === employeeId
            ? { ...e, allocationStatus: "Ready for Allocation" as const }
            : e
        )
      );
    }
  };

  const completeOnboardingAllocation = async (employeeId: string, assetId: string, remarks: string, actor: string) => {
    setEmployees((prev) =>
      prev.map((e) =>
        e.id === employeeId
          ? {
              ...e,
              allocationStatus: "Completed" as const,
              allocatedAssetDetails: {
                assetId,
                assetName: assets.find((a) => a.id === assetId)?.name || "",
                serialNumber: assets.find((a) => a.id === assetId)?.serial || "",
                assignedAt: todayStr(),
                assignedBy: actor,
                remarks,
              },
            }
          : e
      )
    );
  };

  const fetchFullProfile = async (userUuid: string) => {
    return employees.find((e) => e.id === userUuid) || null;
  };

  const fetchRecentEmployees = async () => {
    return employees.slice(0, 5);
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
