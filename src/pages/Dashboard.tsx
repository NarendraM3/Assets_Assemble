import { useAuth } from "@/contexts/auth";
import { EmployeeDashboard } from "@/features/dashboards/EmployeeDashboard";
import { SupportDashboard } from "@/features/dashboards/SupportDashboard";
import { AssetManagerDashboard } from "@/features/dashboards/AssetManagerDashboard";
import { AdminDashboard } from "@/features/dashboards/AdminDashboard";

export default function DashboardRouter() {
  const { user } = useAuth();
  if (!user) return null;
  switch (user.role) {
    case "employee": return <EmployeeDashboard />;
    case "support": return <SupportDashboard />;
    case "asset_manager": return <AssetManagerDashboard />;
    case "admin": return <AdminDashboard />;
  }
}
