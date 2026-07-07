import type { Role } from "@/data/mock";
import {
  LayoutDashboard, Package, Ticket as TicketIcon, User, Users,
  Building2, Tags, Settings as SettingsIcon, FileBarChart,
  ClipboardList, Wrench, ShoppingBag, BookOpen, PlusCircle, ScrollText, Calendar,
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
      label: "Support", items: [
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
  support: [
    {
      label: "Overview", items: [
        { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
        { to: "/allocation-onboarding", label: "Asset Allocation Onboarding", icon: ClipboardList },
      ]
    },
    {
      label: "Tickets", items: [
        { to: "/assigned-tickets", label: "Assigned Tickets", icon: ClipboardList },
        { to: "/all-tickets", label: "All Tickets", icon: TicketIcon },
      ]
    },
    {
      label: "Knowledge", items: [
        { to: "/maintenance-history", label: "Maintenance History", icon: Wrench },
        { to: "/knowledge-base", label: "Knowledge Base", icon: BookOpen },
      ]
    },
  ],
  asset_manager: [
    {
      label: "Overview", items: [
        { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
        { to: "/onboarding-verification", label: "Employee Onboarding Verification", icon: ClipboardList },
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
    {
      label: "Partners", items: [
        { to: "/vendors", label: "Vendors", icon: ShoppingBag },
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
        { to: "/settings", label: "Application Settings", icon: SettingsIcon },
      ]
    },
    {
      label: "Insights", items: [
        { to: "/audit-logs", label: "Audit Logs", icon: ScrollText },
      ]
    },
  ],
};
