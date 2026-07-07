import { createContext, useContext, useState, useEffect, type ReactNode } from "react";
import {
  employees as defaultEmployees,
  assets as defaultAssets,
  assignments as defaultAssignments,
  tickets as defaultTickets,
  auditLogs as defaultAuditLogs,
  notifications as defaultNotifications,
  type Employee,
  type Asset,
  type Assignment,
  type Ticket,
  type Role,
} from "@/data/mock";

interface DataCtx {
  employees: Employee[];
  assets: Asset[];
  assignments: Assignment[];
  tickets: Ticket[];
  auditLogs: any[];
  notifications: any[];
  createTicket: (ticket: Omit<Ticket, "id" | "status" | "createdAt" | "updatedAt" | "assignee" | "sla" | "comments" | "assignedRole" | "timeline" | "auditTrail">, actor: string) => Ticket;
  acceptTicket: (ticketId: string, actor: string) => void;
  updateTicketStatus: (ticketId: string, status: Ticket["status"], actor: string, role: Role, comment?: string) => void;
  addTicketComment: (ticketId: string, actor: string, role: Role, message: string) => void;
  escalateTicket: (ticketId: string, actor: string, remarks: string) => void;
  reviewEscalation: (ticketId: string, approved: boolean, actor: string, remarks: string) => void;
  resolveAssetTicket: (ticketId: string, actor: string, details: { action: NonNullable<Ticket["assetAction"]>; assetDetails: string; remarks: string; resolution: string }) => void;
  addEmployee: (emp: Omit<Employee, "id" | "avatar" | "joinDate" | "status">) => Employee;
  deleteEmployee: (id: string) => void;
  assignAssets: (employeeId: string, assetIds: string[]) => void;
  addAsset: (asset: Omit<Asset, "id">) => Asset;
  retireAsset: (id: string) => void;
  verifyOnboardingAsset: (employeeId: string, approved: boolean, remarks: string, actor: string) => void;
  completeOnboardingAllocation: (employeeId: string, assetId: string, remarks: string, actor: string) => void;
}

const Ctx = createContext<DataCtx | null>(null);

export function DataProvider({ children }: { children: ReactNode }) {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const localEmps = localStorage.getItem("itsm.employees");
    const localAssets = localStorage.getItem("itsm.assets");
    const localAsgs = localStorage.getItem("itsm.assignments");
    const localTkts = localStorage.getItem("itsm.tickets");
    const localAudits = localStorage.getItem("itsm.auditLogs");
    const localNotifs = localStorage.getItem("itsm.notifications");

    let loadedAssets = localAssets ? JSON.parse(localAssets) : defaultAssets;

    // For the demo: ensure Emma Johnson's (EMP-1003) pre-assigned asset AST-10022 is marked Assigned
    if (!localAssets) {
      loadedAssets = loadedAssets.map((a: Asset) => {
        if (a.id === "AST-10022") {
          return { ...a, status: "Assigned" as const, assignedTo: "EMP-1003" };
        }
        return a;
      });
    }

    setEmployees(localEmps ? JSON.parse(localEmps) : defaultEmployees);
    setAssets(loadedAssets);
    setAssignments(localAsgs ? JSON.parse(localAsgs) : defaultAssignments);
    setTickets(localTkts ? JSON.parse(localTkts) : defaultTickets);
    setAuditLogs(localAudits ? JSON.parse(localAudits) : defaultAuditLogs);
    setNotifications(localNotifs ? JSON.parse(localNotifs) : defaultNotifications);

    setHydrated(true);
  }, []);

  const saveAndSetEmployees = (newEmps: Employee[]) => {
    setEmployees(newEmps);
    localStorage.setItem("itsm.employees", JSON.stringify(newEmps));
  };

  const saveAndSetAssets = (newAssets: Asset[]) => {
    setAssets(newAssets);
    localStorage.setItem("itsm.assets", JSON.stringify(newAssets));
  };

  const saveAndSetAssignments = (newAsgs: Assignment[]) => {
    setAssignments(newAsgs);
    localStorage.setItem("itsm.assignments", JSON.stringify(newAsgs));
  };

  const saveAndSetAuditLogs = (newLogs: any[]) => {
    setAuditLogs(newLogs);
    localStorage.setItem("itsm.auditLogs", JSON.stringify(newLogs));
  };

  const saveAndSetNotifications = (newNotifs: any[]) => {
    setNotifications(newNotifs);
    localStorage.setItem("itsm.notifications", JSON.stringify(newNotifs));
  };

  const saveAndSetTickets = (newTickets: Ticket[]) => {
    setTickets(newTickets);
    localStorage.setItem("itsm.tickets", JSON.stringify(newTickets));
  };

  const nowStamp = () => new Date().toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true
  });

  const today = () => new Date().toISOString().slice(0, 10);

  const addAuditLog = (action: string, user: string, target: string) => {
    const nextLogIdNum = Math.max(...auditLogs.map(l => parseInt(l.id.replace("LOG-", "")) || 0), 119) + 1;
    const newLog = {
      id: `LOG-${nextLogIdNum}`,
      action,
      user,
      target,
      timestamp: today(),
      ip: "10.0.1.25"
    };
    saveAndSetAuditLogs([newLog, ...auditLogs]);
  };

  const addNotification = (title: string, type: "info" | "warning" | "success" | "danger" = "info") => {
    const newNotif = {
      id: String(Date.now()),
      title,
      type,
      time: "Just now",
      unread: true
    };
    saveAndSetNotifications([newNotif, ...notifications]);
  };

  const timelineStep = (
    step: string,
    actor: string,
    role: Role | "system",
    remarks?: string,
    status?: Ticket["status"]
  ) => ({
    step,
    timestamp: nowStamp(),
    actor,
    role,
    remarks,
    status
  });

  const auditEntry = (
    user: string,
    role: Role | "system",
    toStatus: Ticket["status"],
    fromStatus?: Ticket["status"],
    comment?: string
  ) => ({
    user,
    role,
    timestamp: nowStamp(),
    fromStatus,
    toStatus,
    comment
  });

  const normalizeTicket = (ticket: Ticket): Ticket => {
    const timeline = ticket.timeline && ticket.timeline.length > 0
      ? ticket.timeline
      : [
          { step: "Ticket Raised", timestamp: ticket.createdAt, actor: ticket.createdBy, role: "employee" as const, remarks: "Employee submitted the support request.", status: "Open" as const },
          { step: "Assigned to Support", timestamp: ticket.createdAt, actor: "System", role: "system" as const, remarks: "Ticket routed to the support queue.", status: "Open" as const }
        ];
    const auditTrail = ticket.auditTrail && ticket.auditTrail.length > 0
      ? ticket.auditTrail
      : [{ user: ticket.createdBy, role: "employee" as const, timestamp: ticket.createdAt, toStatus: ticket.status, comment: "Initial ticket state" }];
    return {
      ...ticket,
      assignedRole: ticket.assignedRole ?? (
        ticket.status === "Pending Administration Approval" ? "admin" :
        ticket.status === "Approved for Asset Manager" ? "asset_manager" :
        "support"
      ),
      timeline,
      auditTrail
    };
  };

  const updateTicket = (
    ticketId: string,
    actor: string,
    role: Role,
    status: Ticket["status"],
    step: string,
    remarks?: string,
    patch?: Partial<Ticket>
  ) => {
    let nextTicket: Ticket | undefined;
    const updated = tickets.map(t => {
      if (t.id !== ticketId) return t;
      const current = normalizeTicket(t);
      const next = {
        ...current,
        ...patch,
        status,
        updatedAt: today(),
        timeline: [...(current.timeline || []), timelineStep(step, actor, role, remarks, status)],
        auditTrail: [...(current.auditTrail || []), auditEntry(actor, role, status, current.status, remarks)]
      };
      nextTicket = next;
      return next;
    });
    saveAndSetTickets(updated);
    if (nextTicket) addAuditLog(step, actor, ticketId);
  };

  const createTicket = (
    ticketData: Omit<Ticket, "id" | "status" | "createdAt" | "updatedAt" | "assignee" | "sla" | "comments" | "assignedRole" | "timeline" | "auditTrail">,
    actor: string
  ) => {
    const nextIdNum = Math.max(...tickets.map(t => parseInt(t.id.replace("TKT-", "")) || 0), 4999) + 1;
    const id = `TKT-${nextIdNum}`;
    const stamp = nowStamp();
    const newTicket: Ticket = {
      ...ticketData,
      id,
      status: "Open",
      assignee: null,
      createdAt: today(),
      updatedAt: today(),
      sla: ticketData.priority === "Critical" ? "At Risk" : "On Track",
      comments: [{ author: actor, message: ticketData.description, at: today() }],
      assignedRole: "support",
      timeline: [
        { step: "Ticket Raised", timestamp: stamp, actor, role: "employee", remarks: "Employee submitted the support request.", status: "Open" },
        { step: "Assigned to Support", timestamp: stamp, actor: "System", role: "system", remarks: "Ticket routed to the support queue.", status: "Open" }
      ],
      auditTrail: [{ user: actor, role: "employee", timestamp: stamp, toStatus: "Open", comment: "Ticket created" }]
    };
    saveAndSetTickets([newTicket, ...tickets]);
    addAuditLog("Ticket Raised", actor, id);
    addNotification(`${id} opened in Support queue`, "info");
    return newTicket;
  };

  const acceptTicket = (ticketId: string, actor: string) => {
    updateTicket(ticketId, actor, "support", "Assigned", "Assigned to Support", "Support engineer accepted the ticket.", { assignee: actor, assignedRole: "support" });
  };

  const updateTicketStatus = (ticketId: string, status: Ticket["status"], actor: string, role: Role, comment?: string) => {
    const step = status === "In Progress" ? "In Progress" : status === "Resolved" ? "Resolved" : status === "Closed" ? "Closed" : "Status Updated";
    const patch: Partial<Ticket> = {};
    if (comment) {
      const current = tickets.find(t => t.id === ticketId);
      patch.comments = [...(current?.comments || []), { author: actor, message: comment, at: today() }];
      if (status === "Resolved") patch.supportResolution = comment;
    }
    updateTicket(ticketId, actor, role, status, step, comment, patch);
  };

  const addTicketComment = (ticketId: string, actor: string, role: Role, message: string) => {
    const current = tickets.find(t => t.id === ticketId);
    if (!current || !message.trim()) return;
    const normalized = normalizeTicket(current);
    const updated = tickets.map(t => t.id === ticketId ? {
      ...normalized,
      comments: [...(normalized.comments || []), { author: actor, message: message.trim(), at: today() }],
      updatedAt: today(),
      auditTrail: [...(normalized.auditTrail || []), auditEntry(actor, role, normalized.status, normalized.status, message.trim())]
    } : t);
    saveAndSetTickets(updated);
    addAuditLog("Ticket Comment Added", actor, ticketId);
  };

  const escalateTicket = (ticketId: string, actor: string, remarks: string) => {
    updateTicket(
      ticketId,
      actor,
      "support",
      "Pending Administration Approval",
      "Pending Administration Approval",
      remarks || "Support escalation requested.",
      { assignedRole: "admin", adminRemarks: undefined }
    );
    addNotification(`${ticketId} pending administration approval`, "warning");
  };

  const reviewEscalation = (ticketId: string, approved: boolean, actor: string, remarks: string) => {
    if (approved) {
      updateTicket(
        ticketId,
        actor,
        "admin",
        "Approved for Asset Manager",
        "Approved",
        remarks || "Escalation approved for asset manager action.",
        { assignedRole: "asset_manager", adminRemarks: remarks }
      );
      const current = tickets.find(t => t.id === ticketId);
      if (current) {
        const normalized = normalizeTicket(current);
        const updated = tickets.map(t => t.id === ticketId ? {
          ...normalized,
          status: "Approved for Asset Manager" as const,
          assignedRole: "asset_manager" as const,
          adminRemarks: remarks,
          updatedAt: today(),
          timeline: [
            ...(normalized.timeline || []),
            timelineStep("Approved", actor, "admin", remarks || "Escalation approved.", "Approved for Asset Manager"),
            timelineStep("Assigned to Asset Manager", "System", "system", "Ticket routed to the asset manager queue.", "Approved for Asset Manager")
          ],
          auditTrail: [
            ...(normalized.auditTrail || []),
            auditEntry(actor, "admin", "Approved for Asset Manager", normalized.status, remarks || "Approved"),
            auditEntry("System", "system", "Approved for Asset Manager", "Approved for Asset Manager", "Assigned to Asset Manager")
          ]
        } : t);
        saveAndSetTickets(updated);
      }
      addNotification(`${ticketId} approved for Asset Manager`, "success");
    } else {
      updateTicket(
        ticketId,
        actor,
        "admin",
        "Open",
        "Rejected",
        remarks || "Escalation rejected and returned to Support.",
        { assignedRole: "support", adminRemarks: remarks }
      );
      addNotification(`${ticketId} returned to Support by Administration`, "danger");
    }
  };

  const resolveAssetTicket = (
    ticketId: string,
    actor: string,
    details: { action: NonNullable<Ticket["assetAction"]>; assetDetails: string; remarks: string; resolution: string }
  ) => {
    updateTicket(
      ticketId,
      actor,
      "asset_manager",
      "Resolved",
      "Resolved",
      details.resolution || "Asset action completed.",
      {
        assignedRole: "support",
        assetAction: details.action,
        assetDetails: details.assetDetails,
        assetRemarks: details.remarks,
        assetResolution: details.resolution,
        supportResolution: details.resolution
      }
    );
    addNotification(`${ticketId} resolved by Asset Manager`, "success");
  };

  const addEmployee = (empData: Omit<Employee, "id" | "avatar" | "joinDate" | "status">) => {
    const nextIdNum = Math.max(...employees.map(e => parseInt(e.id.replace("EMP-", "")) || 0), 999) + 1;
    const timestamp = new Date().toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
      hour12: true
    });

    const nextLogIdNum = Math.max(...auditLogs.map(l => parseInt(l.id.replace("LOG-", "")) || 0), 119) + 1;
    const newLog = {
      id: `LOG-${nextLogIdNum}`,
      action: "Employee Created",
      user: "Admin User",
      target: `EMP-${nextIdNum}`,
      timestamp: new Date().toISOString().slice(0, 10),
      ip: "10.0.1.25"
    };

    const newEmp: Employee = {
      ...empData,
      id: `EMP-${nextIdNum}`,
      joinDate: new Date().toISOString().slice(0, 10),
      avatar: `${empData.name.split(" ")[0]?.[0] ?? ""}${empData.name.split(" ")[1]?.[0] ?? ""}`.toUpperCase() || "EE",
      status: "Active",
      allocationStatus: empData.allocationStatus || "Awaiting Asset Verification",
      allocationHistory: empData.allocationHistory || [
        { step: "Employee Created", timestamp, actor: "Admin User", remarks: "Employee record created." },
        { step: "Awaiting Asset Verification", timestamp, actor: "System", remarks: `Asset verification request queued for required category ${empData.requiredAssetCategory || "Laptop"}.` }
      ]
    };

    saveAndSetEmployees([newEmp, ...employees]);
    saveAndSetAuditLogs([newLog, ...auditLogs]);
    return newEmp;
  };

  const deleteEmployee = (id: string) => {
    const updated = employees.filter(e => e.id !== id);
    saveAndSetEmployees(updated);
  };

  const assignAssets = (employeeId: string, assetIds: string[]) => {
    // Legacy fallback wrapper
    if (assetIds.length > 0) {
      completeOnboardingAllocation(employeeId, assetIds[0], "Assigned from legacy trigger", "Support Engineer");
    }
  };

  const verifyOnboardingAsset = (
    employeeId: string,
    approved: boolean,
    remarks: string,
    actor: string
  ) => {
    const timestamp = new Date().toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
      hour12: true
    });

    const targetStatus = approved ? "Ready for Allocation" : "Waiting for Inventory";

    const updatedEmps = employees.map(emp => {
      if (emp.id === employeeId) {
        const history = [...(emp.allocationHistory || [])];
        if (approved) {
          history.push({
            step: "Inventory Verified",
            timestamp,
            actor,
            remarks: `Asset category ${emp.requiredAssetCategory || "Laptop"} verified and available in location.`
          });
          history.push({
            step: "Ready for Allocation",
            timestamp,
            actor,
            remarks: remarks || "Approved for allocation queue."
          });
        } else {
          history.push({
            step: "Waiting for Inventory",
            timestamp,
            actor,
            remarks: remarks || `Requested hardware (${emp.requiredAssetCategory || "Laptop"}) is currently out of stock.`
          });
        }
        return {
          ...emp,
          allocationStatus: targetStatus as any,
          allocationHistory: history
        };
      }
      return emp;
    });

    const emp = employees.find(e => e.id === employeeId);
    const nextLogIdNum = Math.max(...auditLogs.map(l => parseInt(l.id.replace("LOG-", "")) || 0), 119) + 1;
    const newLog = {
      id: `LOG-${nextLogIdNum}`,
      action: approved ? "Asset Verified & Approved" : "Asset Unavailable",
      user: actor,
      target: employeeId,
      timestamp: new Date().toISOString().slice(0, 10),
      ip: "10.0.1.25"
    };

    saveAndSetEmployees(updatedEmps);
    saveAndSetAuditLogs([newLog, ...auditLogs]);

    if (!approved) {
      const nextNotifId = String(Date.now());
      const newNotif = {
        id: nextNotifId,
        title: `Procurement Alert: Allocation blocked for ${emp?.name || employeeId} (${remarks || "Waiting for Inventory"})`,
        type: "danger" as const,
        time: "Just now",
        unread: true
      };
      saveAndSetNotifications([newNotif, ...notifications]);
    }
  };

  const completeOnboardingAllocation = (
    employeeId: string,
    assetId: string,
    remarks: string,
    actor: string
  ) => {
    const timestamp = new Date().toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
      hour12: true
    });

    const asset = assets.find(a => a.id === assetId);
    if (!asset) return;

    // 1. Update Employee
    const updatedEmps = employees.map(emp => {
      if (emp.id === employeeId) {
        const history = [...(emp.allocationHistory || [])];
        history.push({
          step: "Asset Assigned",
          timestamp,
          actor,
          remarks: `Assigned Asset ${assetId} (${asset.name}).`
        });
        history.push({
          step: "Completed",
          timestamp,
          actor,
          remarks: remarks || "Onboarding workspace setup and asset delivery completed."
        });
        return {
          ...emp,
          allocationStatus: "Completed" as const,
          allocationHistory: history,
          allocatedAssetDetails: {
            assetId,
            assetName: asset.name,
            serialNumber: asset.serial,
            assignedAt: timestamp,
            assignedBy: actor,
            remarks
          }
        };
      }
      return emp;
    });

    // 2. Update Asset
    const updatedAssets = assets.map(a => {
      if (a.id === assetId) {
        return { ...a, status: "Assigned" as const, assignedTo: employeeId };
      }
      return a;
    });

    // 3. Log Assignment
    const nextAsgIdNum = Math.max(...assignments.map(a => parseInt(a.id.replace("ASG-", "")) || 0), 1999) + 1;
    const newAsg: Assignment = {
      id: `ASG-${nextAsgIdNum}`,
      assetId,
      employeeId,
      assignedDate: new Date().toISOString().slice(0, 10),
      returnDate: null,
      expectedReturn: new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString().slice(0, 10),
      status: "Active" as const
    };

    // 4. Log Audit Trail
    const nextLogIdNum = Math.max(...auditLogs.map(l => parseInt(l.id.replace("LOG-", "")) || 0), 119) + 1;
    const newLog = {
      id: `LOG-${nextLogIdNum}`,
      action: "Asset Allocation Completed",
      user: actor,
      target: employeeId,
      timestamp: new Date().toISOString().slice(0, 10),
      ip: "10.0.1.25"
    };

    saveAndSetEmployees(updatedEmps);
    saveAndSetAssets(updatedAssets);
    saveAndSetAssignments([newAsg, ...assignments]);
    saveAndSetAuditLogs([newLog, ...auditLogs]);
  };

  const addAsset = (assetData: Omit<Asset, "id">) => {
    const nextIdNum = Math.max(...assets.map(a => parseInt(a.id.replace("AST-", "")) || 0), 9999) + 1;
    const newAsset: Asset = {
      ...assetData,
      id: `AST-${nextIdNum}`,
    };
    saveAndSetAssets([newAsset, ...assets]);
    return newAsset;
  };

  const retireAsset = (id: string) => {
    const updated = assets.map(a => {
      if (a.id === id) {
        return { ...a, status: "Retired" as const, assignedTo: null };
      }
      return a;
    });
    saveAndSetAssets(updated);
  };

  if (!hydrated) {
    return null;
  }

  return (
    <Ctx.Provider value={{
      employees,
      assets,
      assignments,
      tickets: tickets.map(normalizeTicket),
      auditLogs,
      notifications,
      createTicket,
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
      completeOnboardingAllocation
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
