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
} from "@/data/mock";

interface DataCtx {
  employees: Employee[];
  assets: Asset[];
  assignments: Assignment[];
  tickets: Ticket[];
  auditLogs: any[];
  notifications: any[];
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
    <Ctx.Provider value={{ employees, assets, assignments, tickets, auditLogs, notifications, addEmployee, deleteEmployee, assignAssets, addAsset, retireAsset, verifyOnboardingAsset, completeOnboardingAllocation }}>
      {children}
    </Ctx.Provider>
  );
}

export function useData() {
  const c = useContext(Ctx);
  if (!c) throw new Error("useData must be used within a DataProvider");
  return c;
}
