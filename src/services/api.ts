import { toast } from "sonner";

export const BASE_URL =
  import.meta.env.VITE_API_BASE_URL?.replace(/\/$/, "") ??
  "http://localhost:8000/api";

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  const token = localStorage.getItem("token");
  if (token) console.log("[Auth] Token loaded");
  return token;
}

export function setToken(token: string) {
  if (typeof window === "undefined") return;
  localStorage.setItem("token", token);
  console.log("[Auth] Token saved");
}

export function removeToken() {
  if (typeof window === "undefined") return;
  localStorage.removeItem("token");
  localStorage.removeItem("employee");
}

function maskToken(token: string): string {
  if (token.length <= 15) return token;
  return token.substring(0, 15) + "...";
}

function logRequest(method: string, path: string, hasToken: boolean, authHeader: string) {
  console.log(`URL: ${path.startsWith("http") ? path : `${BASE_URL}${path}`}`);
  console.log(`Method: ${method}`);
  console.log(`Token Exists: ${hasToken ? "Yes" : "No"}`);
  console.log(`Authorization: ${authHeader}`);
}

function logError(status: number, body: any, error: any) {
  console.error(`[API Error] HTTP Status: ${status}`);
  console.error(`[API Error] Response Body:`, body);
  console.error(`[API Error] Backend Error Message:`, body?.message || body?.detail || "Unknown error");
  console.error(`[API Error] Stack Trace:`, error?.stack || new Error().stack);
}

function handleUnauthorized() {
  removeToken();
  if (typeof window !== "undefined") {
    window.location.hash = "#/login";
  }
}

export async function apiFetch<T>(
  path: string,
  options: RequestInit & { skipAuthCheck?: boolean } = {},
): Promise<T> {
  const { skipAuthCheck, ...fetchOptions } = options;
  const token = getToken();

  if (!skipAuthCheck && !token) {
    console.warn("[API] No token found — redirecting to login");
    handleUnauthorized();
    throw new Error("Authentication required");
  }

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(fetchOptions.headers as Record<string, string>),
  };
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const method = (fetchOptions.method || "GET").toUpperCase();
  console.log(`[API] Protected request started: ${method} ${path}`);
  logRequest(method, path, !!token, token ? `Bearer ${maskToken(token)}` : "none");

  const res = await fetch(`${BASE_URL}${path}`, {
    ...fetchOptions,
    headers,
  });

  const body = res.status === 204 ? null : await res.json();

  console.log(`[API] Protected request completed: ${method} ${path} → ${res.status}`);

  if (!res.ok) {
    logError(res.status, body, null);

    const errorMsg = body?.message || body?.detail || `Request failed with status ${res.status}`;

    if (res.status === 401) {
      handleUnauthorized();
      toast.error("Session expired. Please login again.");
    } else if (res.status === 404) {
      toast.error(errorMsg);
    } else if (res.status >= 500) {
      toast.error(errorMsg);
    }

    const err = new Error(errorMsg);
    (err as any).status = res.status;
    (err as any).body = body;
    throw err;
  }

  return (body?.data ?? body) as T;
}

export async function apiUpload<T>(
  path: string,
  formData: FormData,
): Promise<T> {
  const token = getToken();

  if (!token) {
    console.warn("[API] No token found — redirecting to login");
    handleUnauthorized();
    throw new Error("Authentication required");
  }

  const headers: Record<string, string> = {};
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const method = "POST";
  console.log(`[API] Protected request started: ${method} ${path}`);
  logRequest(method, path, !!token, token ? `Bearer ${maskToken(token)}` : "none");

  const res = await fetch(`${BASE_URL}${path}`, {
    method: "POST",
    headers,
    body: formData,
  });

  const body = res.status === 204 ? null : await res.json();

  console.log(`[API] Protected request completed: ${method} ${path} → ${res.status}`);

  if (!res.ok) {
    logError(res.status, body, null);

    const errorMsg = body?.message || body?.detail || `Upload failed with status ${res.status}`;

    if (res.status === 401) {
      handleUnauthorized();
      toast.error("Session expired. Please login again.");
    } else if (res.status === 404) {
      toast.error(errorMsg);
    } else if (res.status >= 500) {
      toast.error(errorMsg);
    }

    throw new Error(errorMsg);
  }

  return (body?.data ?? body) as T;
}
