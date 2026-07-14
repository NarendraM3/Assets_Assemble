import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { Role } from "@/types/domain";
import { toast } from "sonner";
import { getToken, setToken, removeToken, apiFetch, BASE_URL } from "@/services/api";

export interface AuthUser {
  id: string;
  display_id: string;
  name: string;
  email: string;
  role: Role;
  avatar: string;
  must_change_password: boolean;
}

interface LoginResult {
  forcePasswordChange?: boolean;
  user?: AuthUser;
}

interface AuthCtx {
  user: AuthUser | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<LoginResult>;
  logout: () => void;
  refreshProfile: () => Promise<void>;
}

const Ctx = createContext<AuthCtx | null>(null);

function normalizeRole(raw: string): Role {
  const lower = raw.toLowerCase().replace(/[\s_-]/g, "");
  if (lower === "itsupportteam" || lower === "itsupport" || lower === "support") {
    return "it_support_team";
  }
  const valid: Role[] = ["employee", "it_support_team", "asset_manager", "admin"];
  if (valid.includes(raw as Role)) return raw as Role;
  return "employee";
}

const ROLE_MAP: Record<string, Role> = {
  Admin: "admin",
  "Asset Manager": "asset_manager",
  Employee: "employee",
  "IT Support Team": "it_support_team",
  "IT Support": "it_support_team",
  Support: "it_support_team",
  it_support: "it_support_team",
  "it-support": "it_support_team",
};

function mapBackendRole(raw: string): Role {
  return normalizeRole(ROLE_MAP[raw] ?? raw);
}

function mapBackendUser(bu: any): AuthUser {
  const rawRole = bu.Role ?? bu.role ?? "Employee";
  const firstName = bu.FirstName ?? "";
  const lastName = bu.LastName ?? "";
  const fullName = `${firstName} ${lastName}`.trim();
  return {
    id: bu.EmployeeId ?? bu.id ?? bu.display_id,
    display_id: bu.EmployeeId ?? bu.display_id ?? bu.id,
    name: fullName || bu.name,
    email: bu.Email ?? bu.email,
    role: mapBackendRole(rawRole),
    avatar: bu.avatar ?? (firstName && lastName
      ? (firstName[0] + lastName[0]).toUpperCase()
      : fullName
        ? fullName.split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase()
        : "NA"),
    must_change_password: bu.must_change_password ?? false,
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const stored = getToken();
    if (stored) {
      const cached = localStorage.getItem("employee");
      if (cached) {
        try {
          setUser(mapBackendUser(JSON.parse(cached)));
        } catch {
          removeToken();
          localStorage.removeItem("employee");
        }
      }
    }
    setLoading(false);
  }, []);

  const refreshProfile = async () => {
    const token = getToken();
    if (!token) {
      setUser(null);
      return;
    }
    try {
      const data = await apiFetch<any>("/profile");
      if (data) {
        const mapped = mapBackendUser(data);
        setUser(mapped);
        localStorage.setItem("employee", JSON.stringify(data));
      } else {
        removeToken();
        localStorage.removeItem("employee");
        setUser(null);
      }
    } catch (err: any) {
      console.error("Profile fetch error:", err.message);
      setUser(null);
    }
  };

  const login = async (email: string, password: string): Promise<LoginResult> => {
    const res = await fetch(`${BASE_URL}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    const response = await res.json();

    console.log("Login response", response);

    if (response.success === true) {
      localStorage.setItem("token", response.token);
      localStorage.setItem("employee", JSON.stringify(response.employee));

      console.log("Role", response.employee.Role);

      const mapped = mapBackendUser(response.employee);
      setUser(mapped);

      const mustChangePassword = response.employee.must_change_password ?? false;
      if (mustChangePassword) {
        return { forcePasswordChange: true };
      }

      return { user: mapped };
    }

    throw new Error(response.message || "Login failed");
  };

  const logout = () => {
    setUser(null);
    removeToken();
    localStorage.removeItem("employee");
    toast.info("Signed out of session");
  };

  return (
    <Ctx.Provider value={{ user, loading, login, logout, refreshProfile }}>
      {children}
    </Ctx.Provider>
  );
}

export function useAuth() {
  const c = useContext(Ctx);
  if (!c) throw new Error("useAuth outside provider");
  return c;
}

export function getStoredEmployee(): AuthUser | null {
  try {
    const raw = localStorage.getItem("employee");
    if (!raw) return null;
    return mapBackendUser(JSON.parse(raw));
  } catch {
    return null;
  }
}

export const ROLE_ROUTE: Record<Role, string> = {
  admin: "/admin/dashboard",
  asset_manager: "/asset-manager/dashboard",
  employee: "/employee/dashboard",
  it_support_team: "/support",
};
