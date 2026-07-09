import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { AppLayout } from "@/components/layouts/AppLayout";
import { DataProvider } from "@/contexts/data";

export const Route = createFileRoute("/_app")({
  component: AuthGuard,
});

function AuthGuard() {
  const navigate = useNavigate();
  useEffect(() => {
    const token = typeof window !== "undefined" ? localStorage.getItem("itsm.token") : null;
    if (!token) {
      navigate({ to: "/login", replace: true });
    }
  }, [navigate]);
  return (
    <DataProvider>
      <AppLayout />
    </DataProvider>
  );
}
