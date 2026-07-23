import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import type { Role } from "@/types/domain";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const ROLE_LABEL: Record<string, string> = {
  employee: "Employee",
  it_support_team: "IT Support Team",
  asset_manager: "Asset Manager",
  admin: "Admin",
};

export function getRoleLabel(role?: Role | string | null): string {
  if (!role) return "";
  return ROLE_LABEL[role] ?? role.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export function parseHardwareCategories(value: unknown): string[] {
  if (Array.isArray(value)) return value;
  if (!value) return [];
  const str = String(value);
  return str.split(",").map((s) => s.trim()).filter(Boolean);
}
