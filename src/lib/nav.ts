import type { Role } from "@/types/domain";
import {
  LayoutDashboard, Package, Ticket as TicketIcon, User, Users,
  Building2, Tags,
  ClipboardList, Wrench, PlusCircle, Calendar,
  ListTodo,
} from "lucide-react";

export interface NavItem {
  to: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

export interface NavGroup {
  label: string;
  items: NavItem[];
}

export const NAV: Record<Role, NavGroup[]> = {
  employee: [
    {
      label: "Workspace", items: [
        { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
        { to: "/my-assets", label: "My Assets", icon: Package },
      ]
    },
    {
      label: "IT Support Team", items: [
        { to: "/raise-ticket", label: "Raise Ticket", icon: PlusCircle },
        { to: "/my-tickets", label: "My Tickets", icon: TicketIcon },
      ]
    },
    {
      label: "Account", items: [
        { to: "/profile", label: "Profile", icon: User },
      ]
    },
  ],
  asset_manager: [
    {
      label: "Overview", items: [
        { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
        { to: "/onboarding-verification", label: "Onboarding Verification", icon: ClipboardList },
      ]
    },
    {
      label: "Requests", items: [
        { to: "/approved-request-queue", label: "Approved Request Queue", icon: ClipboardList },
      ]
    },
    {
      label: "Inventory", items: [
        { to: "/assets", label: "Assets", icon: Package },
        { to: "/assignments", label: "Assignments", icon: ClipboardList },
        { to: "/warranty", label: "Warranty", icon: Calendar },
        { to: "/maintenance", label: "Maintenance", icon: Wrench },
      ]
    },
  ],
  it_support_team: [
    {
      label: "Overview", items: [
        { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
        { to: "/employee-onboarding", label: "Employee Onboarding", icon: ClipboardList },
      ]
    },
    {
      label: "Tickets", items: [
        { to: "/all-tickets", label: "Tickets", icon: ListTodo },
      ]
    },
    {
      label: "Inventory", items: [
        { to: "/assets", label: "Assets", icon: Package },
        { to: "/assignments", label: "Assignments", icon: ClipboardList },
        { to: "/warranty", label: "Warranty", icon: Calendar },
        { to: "/maintenance", label: "Maintenance", icon: Wrench },
      ]
    },
  ],
  admin: [
    {
      label: "Overview", items: [
        { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
      ]
    },
    {
      label: "People", items: [
        { to: "/employees", label: "Employees", icon: Users },
        { to: "/departments", label: "Departments", icon: Building2 },
      ]
    },
    {
      label: "Configuration", items: [
        { to: "/asset-categories", label: "Asset Categories", icon: Tags },
        { to: "/ticket-categories", label: "Ticket Categories", icon: Tags },
      ]
    },

  ],
};
