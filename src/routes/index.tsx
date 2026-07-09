import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";

export const Route = createFileRoute("/")({
  component: IndexRedirect,
});

function IndexRedirect() {
  const navigate = useNavigate();
  useEffect(() => {
    const token = typeof window !== "undefined" ? localStorage.getItem("itsm.token") : null;
    navigate({ to: token ? "/dashboard" : "/login", replace: true });
  }, [navigate]);
  return (
    <div className="min-h-screen grid place-items-center text-muted-foreground text-sm">
      Redirecting…
    </div>
  );
}
