import { createContext, useContext, useState, useEffect, type ReactNode } from "react";
import type { Role } from "@/data/mock";
import { ROLES } from "@/data/mock";

export interface AuthUser {
  name: string;
  email: string;
  role: Role;
  avatar: string;
}

interface AuthCtx {
  user: AuthUser | null;
  login: (role: Role, name?: string) => void;
  logout: () => void;
}

const Ctx = createContext<AuthCtx | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const raw = localStorage.getItem("itsm.user");
    if (raw) setUser(JSON.parse(raw));
  }, []);

  const login = (role: Role, name?: string) => {
    const roleMeta = ROLES.find((r) => r.id === role)!;
    const u: AuthUser = {
      name: name || `${roleMeta.name} User`,
      email: `${role}@acmecorp.com`,
      role,
      avatar: (name || roleMeta.name).slice(0, 2).toUpperCase(),
    };
    setUser(u);
    localStorage.setItem("itsm.user", JSON.stringify(u));
  };
  const logout = () => {
    setUser(null);
    localStorage.removeItem("itsm.user");
  };

  return <Ctx.Provider value={{ user, login, logout }}>{children}</Ctx.Provider>;
}

export function useAuth() {
  const c = useContext(Ctx);
  if (!c) throw new Error("useAuth outside provider");
  return c;
}
