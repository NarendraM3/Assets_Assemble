import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { Role } from "@/data/mock";
import { toast } from "sonner";

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
  login: (email: string, password: string, role?: Role) => Promise<void>;
  logout: () => void;
  forceChangePassword: (password: string) => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const Ctx = createContext<AuthCtx | null>(null);

const MOCK_USERS: Record<Role, AuthUser> = {
  admin: {
    id: "usr_mock_admin_001",
    display_id: "ADM-001",
    name: "Admin User",
    email: "admin@acmecorp.com",
    role: "admin",
    avatar: "AU",
    must_change_password: false,
  },
  employee: {
    id: "usr_mock_emp_001",
    display_id: "EMP-1001",
    name: "John Doe",
    email: "john.doe@acmecorp.com",
    role: "employee",
    avatar: "JD",
    must_change_password: false,
  },
  support: {
    id: "usr_mock_sup_001",
    display_id: "SUP-001",
    name: "Support Engineer User",
    email: "support@acmecorp.com",
    role: "support",
    avatar: "SE",
    must_change_password: false,
  },
  asset_manager: {
    id: "usr_mock_am_001",
    display_id: "ASTM-001",
    name: "Asset Manager User",
    email: "asset.manager@acmecorp.com",
    role: "asset_manager",
    avatar: "AM",
    must_change_password: false,
  },
};

const FAKE_TOKEN = "mock_jwt_token_abc123";

export function getAuthHeaders() {
  return { "Authorization": `Bearer ${FAKE_TOKEN}` };
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

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const stored = getToken();
    if (stored) {
      const savedRole = localStorage.getItem("itsm.role") as Role | null;
      setUser(MOCK_USERS[savedRole ?? "admin"]);
    }
    setLoading(false);
  }, []);

  const refreshProfile = async () => {
    const stored = getToken();
    if (stored) {
      const savedRole = localStorage.getItem("itsm.role") as Role | null;
      setUser(MOCK_USERS[savedRole ?? "admin"]);
    } else {
      setUser(null);
    }
    setLoading(false);
  };

  const login = async (_email: string, _password: string, role: Role = "admin") => {
    setToken(FAKE_TOKEN);
    localStorage.setItem("itsm.role", role);
    setUser(MOCK_USERS[role]);
    toast.success(`Welcome back, ${MOCK_USERS[role].name}`);
  };

  const logout = () => {
    setUser(null);
    removeToken();
    localStorage.removeItem("itsm.role");
    toast.info("Signed out of session");
  };

  const forceChangePassword = async (_password: string) => {
    if (user) {
      setUser({ ...user, must_change_password: false });
    }
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
