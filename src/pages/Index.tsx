import { useNavigate } from "react-router-dom";
import { useEffect } from "react";
import { ROLE_ROUTE, getStoredEmployee } from "@/contexts/auth";
import { getToken } from "@/services/api";

export default function IndexRedirect() {
  const navigate = useNavigate();
  useEffect(() => {
    const token = getToken();
    if (token) {
      const emp = getStoredEmployee();
      navigate(emp ? ROLE_ROUTE[emp.role] : "/dashboard", { replace: true });
    } else {
      navigate("/login", { replace: true });
    }
  }, [navigate]);
  return (
    <div className="min-h-screen grid place-items-center text-muted-foreground text-sm">
      Redirecting…
    </div>
  );
}
