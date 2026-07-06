// Deterministic mock data for the Enterprise IT Asset Management app.
// All data is generated in-memory. No backend calls.

export type Role = "employee" | "support" | "asset_manager" | "admin";

export interface Employee {
  id: string;
  name: string;
  email: string;
  department: string;
  designation: string;
  manager: string;
  location: string;
  status: "Active" | "Inactive" | "On Leave";
  avatar: string;
  phone: string;
  joinDate: string;
}

export interface Asset {
  id: string;
  name: string;
  category: string;
  manufacturer: string;
  model: string;
  serial: string;
  purchaseDate: string;
  warrantyExpiry: string;
  location: string;
  assignedTo: string | null;
  status: "Assigned" | "Available" | "Maintenance" | "Retired";
  cost: number;
}

export interface Ticket {
  id: string;
  title: string;
  description: string;
  priority: "Low" | "Medium" | "High" | "Critical";
  category: string;
  status: "Open" | "Assigned" | "In Progress" | "Waiting" | "Resolved" | "Closed";
  createdBy: string;
  assignee: string | null;
  assetId: string | null;
  createdAt: string;
  updatedAt: string;
  sla: "On Track" | "At Risk" | "Breached";
  comments: { author: string; message: string; at: string }[];
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

export interface Vendor {
  id: string;
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
  assetId: string;
  engineer: string;
  date: string;
  resolution: string;
  parts: string;
  cost: number;
  status: "Completed" | "In Progress" | "Scheduled";
}

export const DEPARTMENTS = ["HR", "Finance", "IT", "Operations", "Sales", "Marketing"];
export const CATEGORIES = [
  "Laptop", "Desktop", "Monitor", "Keyboard", "Mouse",
  "Headset", "Printer", "Software License", "Mobile Phone",
];
export const MANUFACTURERS = ["Dell", "HP", "Lenovo", "Apple", "Samsung", "Logitech", "Microsoft"];
export const LOCATIONS = ["HQ - New York", "Austin Office", "London Office", "Bangalore Office", "Remote", "Singapore Office"];
export const TICKET_CATEGORIES = ["Hardware", "Software", "Network", "Access", "Email", "Peripheral", "Security"];
export const ROLES: { id: Role; name: string; description: string }[] = [
  { id: "employee", name: "Employee", description: "Standard employee access" },
  { id: "support", name: "Support Engineer", description: "IT support & ticket resolution" },
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

const FIRST = ["Aarav","Priya","John","Emma","Liam","Sophia","Noah","Ava","Ethan","Isabella","Lucas","Mia","Amelia","Oliver","Elena","Rahul","Ananya","Kavya","Rohan","Neha","Chloe","Mason","James","Ella","Benjamin","Charlotte","Henry","Grace","Alexander","Zoe","Michael","Sarah","Daniel","Lily","David","Nora","Matthew","Ruby","Joseph","Hannah"];
const LAST = ["Sharma","Patel","Smith","Johnson","Williams","Brown","Jones","Garcia","Miller","Davis","Rodriguez","Martinez","Hernandez","Lopez","Wilson","Anderson","Thomas","Taylor","Moore","Jackson","Martin","Lee","Perez","Thompson","White","Harris","Sanchez","Clark","Kumar","Singh","Gupta","Verma","Nair","Iyer","Kapoor"];
const DESIGNATIONS = ["Software Engineer","Senior Engineer","Product Manager","Designer","Analyst","Director","VP","Coordinator","Specialist","Team Lead","Manager","Consultant"];

function fmtDate(d: Date) { return d.toISOString().slice(0, 10); }
function daysAgo(n: number) { const d = new Date("2026-07-06"); d.setDate(d.getDate() - n); return fmtDate(d); }
function daysFromNow(n: number) { const d = new Date("2026-07-06"); d.setDate(d.getDate() + n); return fmtDate(d); }

export const employees: Employee[] = Array.from({ length: 200 }, (_, i) => {
  const first = FIRST[i % FIRST.length];
  const last = LAST[(i * 3) % LAST.length];
  const name = `${first} ${last}`;
  return {
    id: `EMP-${String(1000 + i)}`,
    name,
    email: `${first.toLowerCase()}.${last.toLowerCase()}@acmecorp.com`,
    department: pick(DEPARTMENTS),
    designation: pick(DESIGNATIONS),
    manager: `${pick(FIRST)} ${pick(LAST)}`,
    location: pick(LOCATIONS),
    status: rand() > 0.9 ? (rand() > 0.5 ? "On Leave" : "Inactive") : "Active",
    avatar: `${first[0]}${last[0]}`,
    phone: `+1 555-${String(1000 + Math.floor(rand() * 9000))}`,
    joinDate: daysAgo(Math.floor(rand() * 2000) + 30),
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
    id: `AST-${String(10000 + i)}`,
    name: `${mfr} ${cat} ${1000 + i}`,
    category: cat,
    manufacturer: mfr,
    model: `${mfr.slice(0,2).toUpperCase()}-${Math.floor(rand()*9000+1000)}`,
    serial: `SN${Math.floor(rand()*1e10).toString(36).toUpperCase().padStart(10,"0")}`,
    purchaseDate: daysAgo(Math.floor(rand() * 1500) + 30),
    warrantyExpiry: daysFromNow(Math.floor(rand() * 800) - 200),
    location: pick(LOCATIONS),
    assignedTo,
    status,
    cost: Math.floor(rand() * 3500) + 200,
  };
});

const PRIORITIES: Ticket["priority"][] = ["Low","Medium","High","Critical"];
const TSTATUSES: Ticket["status"][] = ["Open","Assigned","In Progress","Waiting","Resolved","Closed"];
const SLA: Ticket["sla"][] = ["On Track","At Risk","Breached"];

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
    ][i % 12] + ` (${asset?.name.split(" ")[0] ?? "General"})`,
    description: "Detailed description of the issue reported by the employee. Steps to reproduce and impact assessment included.",
    priority: PRIORITIES[Math.floor(rand() * PRIORITIES.length)],
    category: pick(TICKET_CATEGORIES),
    status: st,
    createdBy: emp.name,
    assignee,
    assetId: asset?.id ?? null,
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
    assetId: a.id,
    employeeId: a.assignedTo!,
    assignedDate: daysAgo(Math.floor(rand() * 500) + 10),
    returnDate: null,
    expectedReturn: daysFromNow(Math.floor(rand() * 400)),
    status: "Active",
  }));

export const vendors: Vendor[] = MANUFACTURERS.map((m, i) => ({
  id: `VND-${100 + i}`,
  name: `${m} Enterprise`,
  contact: `${pick(FIRST)} ${pick(LAST)}`,
  email: `sales@${m.toLowerCase()}.com`,
  phone: `+1 555-${1000 + i * 111}`,
  category: pick(CATEGORIES),
  status: "Active",
  contractEnd: daysFromNow(Math.floor(rand() * 700)),
}));

export const maintenance: Maintenance[] = Array.from({ length: 80 }, (_, i) => ({
  id: `MNT-${300 + i}`,
  assetId: assets[Math.floor(rand() * assets.length)].id,
  engineer: `${pick(FIRST)} ${pick(LAST)}`,
  date: daysAgo(Math.floor(rand() * 200)),
  resolution: ["Replaced RAM module","Cleaned internal fans","Reinstalled OS","Replaced keyboard","Battery replacement","Screen replacement"][i % 6],
  parts: ["RAM 16GB","Battery","Screen","Keyboard","SSD 512GB","N/A"][i % 6],
  cost: Math.floor(rand() * 500) + 50,
  status: rand() > 0.2 ? "Completed" : "In Progress",
}));

export const auditLogs = Array.from({ length: 120 }, (_, i) => ({
  id: `LOG-${i}`,
  action: ["User Login","Asset Created","Ticket Assigned","Role Updated","Setting Changed","Employee Added","Asset Retired"][i % 7],
  user: employees[i % 20].name,
  target: `TKT-${5000 + i}`,
  timestamp: daysAgo(Math.floor(rand() * 40)),
  ip: `10.0.${Math.floor(rand()*255)}.${Math.floor(rand()*255)}`,
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
    "How to connect to VPN","Resetting your Windows password","Configuring Outlook mail",
    "Printer troubleshooting guide","Setting up Multi-Factor Authentication","VPN certificate installation",
    "Requesting new software","Slack workspace onboarding","Video conferencing best practices",
    "SharePoint access request","Deploying Company Portal","Common laptop issues",
    "Password policy overview","Data backup procedures","Security incident reporting",
    "Bring Your Own Device (BYOD) policy","Encryption on macOS","Remote work checklist",
    "Onboarding new hires","Offboarding checklist",
  ][i],
  category: pick(TICKET_CATEGORIES),
  updatedAt: daysAgo(Math.floor(rand() * 90)),
  views: Math.floor(rand() * 2000),
}));
