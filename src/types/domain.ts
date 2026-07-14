export type Role =
  | "employee"
  | "it_support_team"
  | "asset_manager"
  | "admin";

export interface Employee {
  id: string;
  uuid: string;
  name: string;
  email: string;
  role?: Role;
  department: string;
  designation: string;
  manager: string;
  location: string;
  status: "Active" | "Inactive" | "On Leave";
  avatar: string;
  phone: string;
  joinDate: string;
  allocationDate?: string;
  allocationTime?: string;
  allocationStatus?:
    | "Awaiting Asset Verification"
    | "Waiting for Inventory"
    | "Ready for Allocation"
    | "Completed";
  requiredAssetCategory?: string;
  allocatedAssetDetails?: {
    assetId: string;
    assetName: string;
    serialNumber: string;
    assignedAt: string;
    assignedBy: string;
    remarks?: string;
  };
  allocationHistory?: {
    step: string;
    timestamp: string;
    actor: string;
    remarks?: string;
  }[];
}

export type AssetStatus =
  | "Requested"
  | "Approved"
  | "Ready for Pickup"
  | "Assigned"
  | "Delivered"
  | "Returned"
  | "Under Maintenance"
  | "Out of Stock"
  | "Available"
  | "Maintenance"
  | "Retired";

export interface Asset {
  assetId: string;
  assetName: string;
  assetTag: string;
  brand: string;
  category: string;
  model: string;
  serialNumber: string;
  status: AssetStatus;
  assignedTo: string | null;
  purchaseDate: string;
  warrantyExpiry: string;
  location: string;
  condition: string;
  vendor: string;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  assignedAt: string;
  hardwareRequired: string;
}

export interface Ticket {
  id: string;
  uuid?: string;
  title: string;
  description: string;
  priority: "Low" | "Medium" | "High" | "Critical";
  category: string;
  status:
    | "Open"
    | "Assigned"
    | "In Progress"
    | "Waiting"
    | "Escalated"
    | "Pending Administration Approval"
    | "Approved for Asset Manager"
    | "Resolved"
    | "Closed";
  createdBy: string;
  assignee: string | null;
  assetId: string | null;
  createdAt: string;
  updatedAt: string;
  sla: "On Track" | "At Risk" | "Breached";
  attachments?: string[];
  comments: { author: string; message: string; at: string }[];
  supportResolution?: string;
  adminRemarks?: string;
  assetAction?: "Repair" | "Replace" | "Reassign";
  assetDetails?: string;
  assetRemarks?: string;
  assetResolution?: string;
  assignedRole?: Role;
  timeline?: {
    step: string;
    timestamp: string;
    actor: string;
    role: Role | "system";
    remarks?: string;
    status?: Ticket["status"];
  }[];
  auditTrail?: {
    user: string;
    role: Role | "system";
    timestamp: string;
    fromStatus?: Ticket["status"];
    toStatus: Ticket["status"];
    comment?: string;
  }[];
}

export interface Assignment {
  id: string;
  uuid: string;
  assetId: string;
  employeeId: string;
  assignedDate: string;
  returnDate: string | null;
  expectedReturn: string | null;
  status: "Active" | "Returned" | "Transferred";
}

export interface Vendor {
  id: string;
  uuid: string;
  name: string;
  contact: string;
  email: string;
  phone: string;
  category: string;
  status: "Active" | "Inactive";
  contractEnd: string;
}

export interface Maintenance {
  id: string;
  uuid: string;
  assetId: string;
  engineer: string;
  date: string;
  resolution: string;
  parts: string;
  cost: number;
  status: "Completed" | "In Progress" | "Scheduled";
}

export interface DashboardStats {
  totalUsers: number;
  totalEmployees: number;
  totalAssets: number;
  assignedAssets: number;
  availableAssets: number;
  returnedAssets: number;
  pendingTickets: number;
  recentActivities: any[];
}
