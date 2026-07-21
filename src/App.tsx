import { Component, type ErrorInfo, type ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { HashRouter, Routes, Route, useNavigate } from "react-router-dom";
import { useEffect } from "react";
import { AuthProvider, useAuth } from "@/contexts/auth";
import { ThemeProvider } from "@/contexts/theme";
import { DataProvider } from "@/contexts/data";
import { Toaster } from "@/components/ui/sonner";
import { AppLayout } from "@/components/layouts/AppLayout";
import { Button } from "@/components/ui/button";

import Index from "./pages/Index";
import Login from "./pages/Login";
import ChangePassword from "./pages/ChangePassword";
import Dashboard from "./pages/Dashboard";
import Assets from "./pages/Assets";
import AssetCategories from "./pages/AssetCategories";
import Assignments from "./pages/Assignments";
import MyAssets from "./pages/MyAssets";
import Departments from "./pages/Departments";
import Employees from "./pages/Employees";
import KnowledgeBase from "./pages/KnowledgeBase";
import Maintenance from "./pages/Maintenance";
import MaintenanceHistory from "./pages/MaintenanceHistory";
import MyTickets from "./pages/MyTickets";
import AllTickets from "./pages/AllTickets";
import AssignedTickets from "./pages/AssignedTickets";
import RaiseTicket from "./pages/RaiseTicket";
import TicketCategories from "./pages/TicketCategories";
import AuditLogs from "./pages/AuditLogs";
import Profile from "./pages/Profile";
import Settings from "./pages/Settings";
import Notifications from "./pages/Notifications";
import Search from "./pages/Search";
import Reports from "./pages/Reports";
import Roles from "./pages/Roles";
import Vendors from "./pages/Vendors";
import Warranty from "./pages/Warranty";
import ApprovedRequestQueue from "./pages/ApprovedRequestQueue";
import OnboardingVerification from "./pages/OnboardingVerification";
import EmployeeOnboarding from "./pages/EmployeeOnboarding";
import { AdminDashboard } from "@/features/dashboards/AdminDashboard";
import { AssetManagerDashboard } from "@/features/dashboards/AssetManagerDashboard";
import { EmployeeDashboard } from "@/features/dashboards/EmployeeDashboard";
import { SupportDashboard } from "@/features/dashboards/SupportDashboard";

const queryClient = new QueryClient();

class ErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { error: null };
  }
  static getDerivedStateFromError(error: Error) {
    return { error };
  }
  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("[ErrorBoundary]", error, errorInfo);
  }
  render() {
    if (this.state.error) {
      return (
        <div className="flex min-h-screen items-center justify-center bg-background px-4">
          <div className="max-w-md text-center space-y-4">
            <h1 className="text-6xl font-bold text-destructive">Oops</h1>
            <h2 className="text-xl font-semibold">Something went wrong</h2>
            <p className="text-sm text-muted-foreground">
              {this.state.error.message || "An unexpected error occurred."}
            </p>
            <Button
              onClick={() => { this.setState({ error: null }); window.location.hash = "#/login"; window.location.reload(); }}
            >
              Reload Application
            </Button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for doesn't exist.
        </p>
        <a href="/" className="mt-6 inline-flex rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground">
          Go home
        </a>
      </div>
    </div>
  );
}

function RootProviders({ children }: { children: ReactNode }) {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider>
          <AuthProvider>
            {children}
            <Toaster />
          </AuthProvider>
        </ThemeProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

function AuthGuard() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  useEffect(() => {
    if (!loading && !user) {
      navigate("/login", { replace: true });
    } else if (!loading && user?.must_change_password) {
      navigate("/change-password", { replace: true });
    }
  }, [loading, user, navigate]);
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-sm text-muted-foreground">Loading session...</div>
      </div>
    );
  }
  if (!user) return null;
  return (
    <DataProvider>
      <AppLayout />
    </DataProvider>
  );
}

export function App() {
  return (
    <RootProviders>
      <HashRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/login" element={<Login />} />
          <Route path="/change-password" element={<ChangePassword />} />
          <Route element={<AuthGuard />}>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/admin" element={<AdminDashboard />} />
            <Route path="/admin/dashboard" element={<AdminDashboard />} />
            <Route path="/manager" element={<AssetManagerDashboard />} />
            <Route path="/asset-manager" element={<AssetManagerDashboard />} />
            <Route path="/asset-manager/dashboard" element={<AssetManagerDashboard />} />
            <Route path="/employee" element={<EmployeeDashboard />} />
            <Route path="/employee/dashboard" element={<EmployeeDashboard />} />
            <Route path="/it" element={<SupportDashboard />} />
            <Route path="/it/dashboard" element={<SupportDashboard />} />
            <Route path="/support" element={<SupportDashboard />} />
            <Route path="/hr" element={<Dashboard />} />
            <Route path="/assets" element={<Assets />} />
            <Route path="/asset-categories" element={<AssetCategories />} />
            <Route path="/assignments" element={<Assignments />} />
            <Route path="/my-assets" element={<MyAssets />} />
            <Route path="/departments" element={<Departments />} />
            <Route path="/employees" element={<Employees />} />
            <Route path="/knowledge-base" element={<KnowledgeBase />} />
            <Route path="/maintenance" element={<Maintenance />} />
            <Route path="/maintenance-history" element={<MaintenanceHistory />} />
            <Route path="/my-tickets" element={<MyTickets />} />
            <Route path="/all-tickets" element={<AllTickets />} />
            <Route path="/assigned-tickets" element={<AssignedTickets />} />
            <Route path="/raise-ticket" element={<RaiseTicket />} />
            <Route path="/ticket-categories" element={<TicketCategories />} />
            <Route path="/audit-logs" element={<AuditLogs />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/notifications" element={<Notifications />} />
            <Route path="/search" element={<Search />} />
            <Route path="/reports" element={<Reports />} />
            <Route path="/roles" element={<Roles />} />
            <Route path="/vendors" element={<Vendors />} />
            <Route path="/warranty" element={<Warranty />} />
            <Route path="/approved-request-queue" element={<ApprovedRequestQueue />} />
            <Route path="/employee-onboarding" element={<EmployeeOnboarding />} />
            <Route path="/onboarding-verification" element={<OnboardingVerification />} />
          </Route>
          <Route path="*" element={<NotFound />} />
        </Routes>
      </HashRouter>
    </RootProviders>
  );
}
