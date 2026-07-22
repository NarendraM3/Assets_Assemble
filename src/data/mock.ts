// Deterministic mock data for the Enterprise IT Asset Management app.
// All data is generated in-memory. No backend calls.

export type Role = "employee" | "it_support_team" | "asset_manager" | "admin";

export interface Employee {
  id: string;
  name: string;
  email: string;
  department: string;
  designation: string;
  location: string;
  status: "Active" | "Inactive" | "On Leave";
  avatar: string;
  phone: string;
  joinDate: string;
  allocationDate?: string;
  allocationTime?: string;
  allocationStatus?: "Awaiting Asset Verification" | "Waiting for Inventory" | "Ready for Allocation" | "Completed";
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

export interface Asset {
  assetId: string;
  assetName: string;
  assetTag: string;
  brand: string;
  category: string;
  model: string;
  serialNumber: string;
  status: "Assigned" | "Available" | "Maintenance" | "Retired";
  assignedTo: string | null;
  purchaseDate: string;
  warrantyExpiry: string;
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
  title: string;
  description: string;
  priority: "Low" | "Medium" | "High" | "Critical";
  category: string;
  status: "Open" | "Assigned" | "In Progress" | "Waiting" | "Escalated" | "Pending Administration Approval" | "Approved for Asset Manager" | "Resolved" | "Closed";
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
  assetId: string;
  employeeId: string;
  assignedDate: string;
  returnDate: string | null;
  expectedReturn: string | null;
  status: "Active" | "Returned" | "Transferred";
}

export interface Maintenance {
  id: string;
  assetId: string;
  engineer: string;
  date: string;
  resolution: string;
  parts: string;
  cost: number;
  status: "Completed" | "In Progress" | "Scheduled";
}

export const DEPARTMENTS = [
  "Engineering",
  "Human Resources",
  "Finance",
  "Information Technology",
  "Sales",
  "Marketing",
  "Operations",
  "Customer Support",
  "Procurement",
  "Legal",
  "Administration",
  "Executive Management",
];
import { STANDARD_HARDWARE_CATEGORIES } from "@/lib/asset-categories";

export const CATEGORIES = STANDARD_HARDWARE_CATEGORIES;
export const MANUFACTURERS = ["Dell", "HP", "Lenovo", "Apple", "Samsung", "Logitech", "Microsoft"];
export const LOCATIONS = ["HQ - New York", "Austin Office", "London Office", "Bangalore Office", "Remote", "Singapore Office"];
export const TICKET_CATEGORIES = ["Hardware", "Software", "Network", "Access", "Email", "Peripheral", "Security"];
export const ROLES: { id: Role; name: string; description: string }[] = [
  { id: "employee", name: "Employee", description: "Standard employee access" },
  { id: "it_support_team", name: "IT Support Team", description: "IT support & ticket resolution" },
  { id: "asset_manager", name: "Asset Manager", description: "Full asset lifecycle" },
  { id: "admin", name: "Administrator", description: "System configuration & oversight" },
];

// Deterministic PRNG
function rng(seed: number) {
  let s = seed;
  return () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
}
const rand = rng(42);
const pick = <T>(arr: T[]) => arr[Math.floor(rand() * arr.length)];

const FIRST = ["Aarav", "Priya", "John", "Emma", "Liam", "Sophia", "Noah", "Ava", "Ethan", "Isabella", "Lucas", "Mia", "Amelia", "Oliver", "Elena", "Rahul", "Ananya", "Kavya", "Rohan", "Neha", "Chloe", "Mason", "James", "Ella", "Benjamin", "Charlotte", "Henry", "Grace", "Alexander", "Zoe", "Michael", "Sarah", "Daniel", "Lily", "David", "Nora", "Matthew", "Ruby", "Joseph", "Hannah"];
const LAST = ["Sharma", "Patel", "Smith", "Johnson", "Williams", "Brown", "Jones", "Garcia", "Miller", "Davis", "Rodriguez", "Martinez", "Hernandez", "Lopez", "Wilson", "Anderson", "Thomas", "Taylor", "Moore", "Jackson", "Martin", "Lee", "Perez", "Thompson", "White", "Harris", "Sanchez", "Clark", "Kumar", "Singh", "Gupta", "Verma", "Nair", "Iyer", "Kapoor"];
const DESIGNATIONS = ["Software Engineer", "Senior Engineer", "Product Manager", "Designer", "Analyst", "Director", "VP", "Coordinator", "Specialist", "Team Lead", "Manager", "Consultant"];

function fmtDate(d: Date) { return d.toISOString().slice(0, 10); }
function daysAgo(n: number) { const d = new Date("2026-07-06"); d.setDate(d.getDate() - n); return fmtDate(d); }
function daysFromNow(n: number) { const d = new Date("2026-07-06"); d.setDate(d.getDate() + n); return fmtDate(d); }

export const employees: Employee[] = Array.from({ length: 200 }, (_, i) => {
  const first = FIRST[i % FIRST.length];
  const last = LAST[(i * 3) % LAST.length];
  const name = `${first} ${last}`;

  let allocationDate: string | undefined = undefined;
  let allocationTime: string | undefined = undefined;
  let allocationStatus: "Awaiting Asset Verification" | "Waiting for Inventory" | "Ready for Allocation" | "Completed" | undefined = undefined;
  let requiredAssetCategory: string | undefined = undefined;
  let allocatedAssetDetails: any = undefined;
  let allocationHistory: any[] | undefined = undefined;

  if (i === 0) {
    allocationDate = daysAgo(0); // today
    allocationTime = "10:00";
    allocationStatus = "Awaiting Asset Verification";
    requiredAssetCategory = "Laptop";
    allocationHistory = [
      { step: "Employee Created", timestamp: `${daysAgo(1)} 09:00 AM`, actor: "Admin User", remarks: "Employee record created." },
      { step: "Awaiting Asset Verification", timestamp: `${daysAgo(1)} 09:00 AM`, actor: "System", remarks: "Asset verification request sent to Asset Manager." }
    ];
  } else if (i === 1) {
    allocationDate = daysFromNow(1); // tomorrow
    allocationTime = "14:30";
    allocationStatus = "Waiting for Inventory";
    requiredAssetCategory = "Mobile Phone";
    allocationHistory = [
      { step: "Employee Created", timestamp: `${daysAgo(1)} 10:00 AM`, actor: "Admin User", remarks: "Employee record created." },
      { step: "Awaiting Asset Verification", timestamp: `${daysAgo(1)} 10:00 AM`, actor: "System", remarks: "Asset verification request sent to Asset Manager." },
      { step: "Waiting for Inventory", timestamp: `${daysAgo(0)} 11:30 AM`, actor: "Asset Manager User", remarks: "No available Mobile Phones in Austin Office. Procurement ticket raised." }
    ];
  } else if (i === 2) {
    allocationDate = daysAgo(0); // today
    allocationTime = "09:00"; // past
    allocationStatus = "Ready for Allocation";
    requiredAssetCategory = "Laptop";
    allocationHistory = [
      { step: "Employee Created", timestamp: `${daysAgo(2)} 09:00 AM`, actor: "Admin User", remarks: "Employee record created." },
      { step: "Awaiting Asset Verification", timestamp: `${daysAgo(2)} 09:10 AM`, actor: "System", remarks: "Asset verification request sent." },
      { step: "Inventory Verified", timestamp: `${daysAgo(1)} 02:00 PM`, actor: "Asset Manager User", remarks: "Inventory availability verified in Texas HQ." },
      { step: "Ready for Allocation", timestamp: `${daysAgo(1)} 02:00 PM`, actor: "Asset Manager User", remarks: "Approved for Support allocation." }
    ];
  } else if (i === 3) {
    allocationDate = daysAgo(1); // yesterday
    allocationTime = "11:00";
    allocationStatus = "Completed";
    requiredAssetCategory = "Laptop";
    allocatedAssetDetails = {
      assetId: "AST-10022",
      assetName: "Lenovo Monitor 1022", // matches categories/names
      serialNumber: "SN55489723",
      assignedAt: `${daysAgo(1)} 11:15 AM`,
      assignedBy: "IT Support Team User",
      remarks: "Delivered to user desk and verified networking connection."
    };
    allocationHistory = [
      { step: "Employee Created", timestamp: `${daysAgo(3)} 09:00 AM`, actor: "Admin User", remarks: "Employee record created." },
      { step: "Awaiting Asset Verification", timestamp: `${daysAgo(3)} 09:10 AM`, actor: "System", remarks: "Asset verification request sent." },
      { step: "Inventory Verified", timestamp: `${daysAgo(2)} 11:00 AM`, actor: "Asset Manager User", remarks: "Verified." },
      { step: "Ready for Allocation", timestamp: `${daysAgo(2)} 11:00 AM`, actor: "Asset Manager User", remarks: "Approved." },
      { step: "Asset Assigned", timestamp: `${daysAgo(1)} 11:15 AM`, actor: "IT Support Team User", remarks: "Assigned Asset AST-10022." },
      { step: "Completed", timestamp: `${daysAgo(1)} 11:15 AM`, actor: "IT Support Team User", remarks: "Setup completed." }
    ];
  }

  return {
    id: `EMP-${String(1000 + i)}`,
    name,
    email: `${first.toLowerCase()}.${last.toLowerCase()}@acmecorp.com`,
    department: pick(DEPARTMENTS),
    designation: pick(DESIGNATIONS),
    location: pick(LOCATIONS),
    status: rand() > 0.9 ? (rand() > 0.5 ? "On Leave" : "Inactive") : "Active",
    avatar: `${first[0]}${last[0]}`,
    phone: `+1 555-${String(1000 + Math.floor(rand() * 9000))}`,
    joinDate: daysAgo(Math.floor(rand() * 2000) + 30),
    allocationDate,
    allocationTime,
    allocationStatus,
    requiredAssetCategory,
    allocatedAssetDetails,
    allocationHistory,
  };
});

export const assets: Asset[] = Array.from({ length: 1000 }, (_, i) => {
  const cat = pick(CATEGORIES);
  const mfr = pick(MANUFACTURERS);
  const statusRoll = rand();
  const status: Asset["status"] =
    statusRoll < 0.6 ? "Assigned" : statusRoll < 0.8 ? "Available" : statusRoll < 0.92 ? "Maintenance" : "Retired";
  const assignedTo = status === "Assigned" ? employees[Math.floor(rand() * employees.length)].id : null;
  return {
    assetId: `AST-${String(10000 + i)}`,
    assetName: `${mfr} ${cat} ${1000 + i}`,
    assetTag: `TAG-${String(10000 + i)}`,
    brand: mfr,
    category: cat,
    model: `${mfr.slice(0, 2).toUpperCase()}-${Math.floor(rand() * 9000 + 1000)}`,
    serialNumber: `SN${Math.floor(rand() * 1e10).toString(36).toUpperCase().padStart(10, "0")}`,
    status,
    assignedTo,
    purchaseDate: daysAgo(Math.floor(rand() * 1500) + 30),
    warrantyExpiry: daysFromNow(Math.floor(rand() * 800) - 200),
    condition: pick(["New", "Good", "Fair", "Poor"]),
    vendor: pick(["Dell Enterprise", "HP Inc", "Lenovo Group", "Apple Inc"]),
    createdAt: daysAgo(Math.floor(rand() * 365)),
    updatedAt: daysAgo(Math.floor(rand() * 30)),
    createdBy: pick(employees.map(e => e.id)),
    assignedAt: status === "Assigned" ? daysAgo(Math.floor(rand() * 200)) : "",
    hardwareRequired: rand() > 0.7 ? pick(["Docking Station", "Extra Monitor", "Keyboard", "Mouse"]) : "",
  };
});

const PRIORITIES: Ticket["priority"][] = ["Low", "Medium", "High", "Critical"];
const TSTATUSES: Ticket["status"][] = ["Open", "Assigned", "In Progress", "Waiting", "Resolved", "Closed"];
const SLA: Ticket["sla"][] = ["On Track", "At Risk", "Breached"];

export const tickets: Ticket[] = Array.from({ length: 500 }, (_, i) => {
  const created = daysAgo(Math.floor(rand() * 120));
  const updated = daysAgo(Math.floor(rand() * 30));
  const st = TSTATUSES[Math.floor(rand() * TSTATUSES.length)];
  const asset = rand() > 0.3 ? assets[Math.floor(rand() * assets.length)] : null;
  const emp = employees[Math.floor(rand() * employees.length)];
  const assignee = st === "Open" ? null : employees[Math.floor(rand() * 20)].name;
  return {
    id: `TKT-${String(5000 + i)}`,
    title: [
      "Laptop won't boot", "VPN disconnects randomly", "Need software installation",
      "Monitor flickering", "Password reset request", "Email not syncing",
      "Slow performance", "Printer offline", "Keyboard key stuck",
      "Access request: SharePoint", "Screen brightness issue", "Bluetooth not working",
    ][i % 12] + ` (${asset?.assetName.split(" ")[0] ?? "General"})`,
    description: "Detailed description of the issue reported by the employee. Steps to reproduce and impact assessment included.",
    priority: PRIORITIES[Math.floor(rand() * PRIORITIES.length)],
    category: pick(TICKET_CATEGORIES),
    status: st,
    createdBy: emp.name,
    assignee,
    assetId: asset?.assetId ?? null,
    createdAt: created,
    updatedAt: updated,
    sla: SLA[Math.floor(rand() * SLA.length)],
    comments: [
      { author: emp.name, message: "Initial report — issue observed this morning.", at: created },
      ...(assignee ? [{ author: assignee, message: "Assigned and investigating.", at: updated }] : []),
    ],
  };
});

export const assignments: Assignment[] = assets
  .filter((a) => a.assignedTo)
  .slice(0, 300)
  .map((a, i) => ({
    id: `ASG-${String(2000 + i)}`,
    assetId: a.assetId,
    employeeId: a.assignedTo!,
    assignedDate: daysAgo(Math.floor(rand() * 500) + 10),
    returnDate: null,
    expectedReturn: daysFromNow(Math.floor(rand() * 400)),
    status: "Active",
  }));

export const maintenance: Maintenance[] = Array.from({ length: 80 }, (_, i) => ({
  id: `MNT-${300 + i}`,
  assetId: assets[Math.floor(rand() * assets.length)].assetId,
  engineer: `${pick(FIRST)} ${pick(LAST)}`,
  date: daysAgo(Math.floor(rand() * 200)),
  resolution: ["Replaced RAM module", "Cleaned internal fans", "Reinstalled OS", "Replaced keyboard", "Battery replacement", "Screen replacement"][i % 6],
  parts: ["RAM 16GB", "Battery", "Screen", "Keyboard", "SSD 512GB", "N/A"][i % 6],
  cost: Math.floor(rand() * 500) + 50,
  status: rand() > 0.2 ? "Completed" : "In Progress",
}));

export const auditLogs = Array.from({ length: 120 }, (_, i) => ({
  id: `LOG-${i}`,
  action: ["User Login", "Asset Created", "Ticket Assigned", "Role Updated", "Setting Changed", "Employee Added", "Asset Retired"][i % 7],
  user: employees[i % 20].name,
  target: `TKT-${5000 + i}`,
  timestamp: daysAgo(Math.floor(rand() * 40)),
  ip: `10.0.${Math.floor(rand() * 255)}.${Math.floor(rand() * 255)}`,
}));

export const notifications = [
  { id: "1", title: "Ticket TKT-5023 assigned to you", type: "info", time: "5m ago", unread: true },
  { id: "2", title: "Asset AST-10234 warranty expiring in 15 days", type: "warning", time: "1h ago", unread: true },
  { id: "3", title: "Maintenance MNT-312 completed", type: "success", time: "3h ago", unread: true },
  { id: "4", title: "Critical ticket TKT-5088 breached SLA", type: "danger", time: "1d ago", unread: false },
  { id: "5", title: "Monthly asset report is ready", type: "info", time: "2d ago", unread: false },
];

export const knowledgeBase = Array.from({ length: 20 }, (_, i) => ({
  id: `KB-${100 + i}`,
  title: [
    "How to connect to VPN", "Resetting your Windows password", "Configuring Outlook mail",
    "Printer troubleshooting guide", "Setting up Multi-Factor Authentication", "VPN certificate installation",
    "Requesting new software", "Slack workspace onboarding", "Video conferencing best practices",
    "SharePoint access request", "Deploying Company Portal", "Common laptop issues",
    "Password policy overview", "Data backup procedures", "Security incident reporting",
    "Bring Your Own Device (BYOD) policy", "Encryption on macOS", "Remote work checklist",
    "Onboarding new hires", "Offboarding checklist",
  ][i],
  category: pick(TICKET_CATEGORIES),
  updatedAt: daysAgo(Math.floor(rand() * 90)),
  views: Math.floor(rand() * 2000),
}));
