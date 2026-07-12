import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { Role } from "@/types/domain";
import { toast } from "sonner";

const API_BASE =
  import.meta.env.VITE_API_BASE_URL?.replace(/\/$/, "") ??
  "http://localhost:8000/api";

export interface AuthUser {
  id: string;
  display_id: string;
  name: string;
  email: string;
  role: Role;
  avatar: string;
  must_change_password: boolean;
}

interface AuthCtx {
  user: AuthUser | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<AuthUser>;
  logout: () => void;
  forceChangePassword: (password: string) => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const Ctx = createContext<AuthCtx | null>(null);

export function getAuthHeaders() {
  const token = getToken();
  return token ? { "Authorization": `Bearer ${token}` } : {};
}

function getToken() {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("itsm.token");
}

function setToken(token: string) {
  if (typeof window === "undefined") return;
  localStorage.setItem("itsm.token", token);
}

function removeToken() {
  if (typeof window === "undefined") return;
  localStorage.removeItem("itsm.token");
}

const ROLE_MAP: Record<string, Role> = {
  Admin: "admin",
  Manager: "asset_manager",
  Employee: "employee",
  "IT Support Team": "support",
};

function mapBackendRole(raw: string): Role {
  return ROLE_MAP[raw] ?? (raw as Role) ?? "employee";
}

function mapBackendUser(bu: any): AuthUser {
  const rawRole = bu.Role ?? bu.role ?? "Employee";
  return {
    id: bu.id ?? bu.display_id,
    display_id: bu.display_id ?? bu.id,
    name: bu.name,
    email: bu.email,
    role: mapBackendRole(rawRole),
    avatar: bu.avatar ?? (bu.name?.split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase() ?? "NA"),
    must_change_password: bu.must_change_password ?? false,
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const stored = getToken();
    if (stored) {
      const cached = localStorage.getItem("itsm.employee");
      if (cached) {
        try {
          setUser(mapBackendUser(JSON.parse(cached)));
        } catch {
          removeToken();
          localStorage.removeItem("itsm.employee");
        }
      }
    }
    setLoading(false);
  }, []);

  const refreshProfile = async () => {
    const cached = localStorage.getItem("itsm.employee");
    if (cached) {
      try {
        setUser(mapBackendUser(JSON.parse(cached)));
      } catch {
        removeToken();
        localStorage.removeItem("itsm.employee");
        setUser(null);
      }
    } else {
      setUser(null);
    }
  };

  const login = async (email: string, password: string): Promise<AuthUser> => {
    try {
      const res = await fetch(`${API_BASE}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const body = await res.json();
      if (res.ok && body.token && body.employee) {
        setToken(body.token);
        localStorage.setItem("itsm.employee", JSON.stringify(body.employee));
        const mapped = mapBackendUser(body.employee);
        setUser(mapped);
        toast.success(`Welcome back, ${mapped.name}`);
        return mapped;
      }
      throw new Error(body.message || "Login failed");
    } catch (err: any) {
      const message = err.message || "Unable to sign in. Please check your credentials.";
      toast.error(message);
      throw err;
    }
  };

  const logout = () => {
    setUser(null);
    removeToken();
    localStorage.removeItem("itsm.employee");
    toast.info("Signed out of session");
  };

  const forceChangePassword = async (password: string) => {
    const token = getToken();
    if (!token) throw new Error("You must be signed in to change your password.");
    const res = await fetch(`${API_BASE}/auth/force-change-password`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ new_password: password }),
    });
    const body = await res.json();
    if (!res.ok || !body.success) {
      throw new Error(body.message || body.detail || "Failed to change password");
    }
    await refreshProfile();
    toast.success("Password changed successfully!");
  };

  return (
    <Ctx.Provider value={{ user, loading, login, logout, forceChangePassword, refreshProfile }}>
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
    const raw = localStorage.getItem("itsm.employee");
    if (!raw) return null;
    return mapBackendUser(JSON.parse(raw));
  } catch {
    return null;
  }
}

export const ROLE_ROUTE: Record<Role, string> = {
  admin: "/admin",
  asset_manager: "/manager",
  employee: "/employee",
  support: "/support",
  lo_support: "/support",
};
