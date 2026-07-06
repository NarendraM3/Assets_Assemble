import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useAuth } from "@/contexts/auth";

export const Route = createFileRoute("/")({
  component: IndexRedirect,
});

function IndexRedirect() {
  const { user } = useAuth();
  const navigate = useNavigate();
  useEffect(() => {
    navigate({ to: user ? "/dashboard" : "/login", replace: true });
  }, [user, navigate]);
  return (
    <div className="min-h-screen grid place-items-center text-muted-foreground text-sm">
      Redirecting…
    </div>
  );
}
