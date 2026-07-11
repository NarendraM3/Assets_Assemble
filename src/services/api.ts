const BASE_URL =
  import.meta.env.VITE_API_BASE_URL?.replace(/\/$/, "") ??
  "http://localhost:8000/api";

function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("itsm.token");
}

export async function apiFetch<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers,
  });

  const body = res.status === 204 ? null : await res.json();

  if (!res.ok) {
    throw new Error(
      body?.message || body?.detail || `Request failed with status ${res.status}`,
    );
  }

  return body?.data as T;
}

export async function apiUpload(
  path: string,
  formData: FormData,
): Promise<any> {
  const token = getToken();
  const headers: Record<string, string> = {};
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const res = await fetch(`${BASE_URL}${path}`, {
    method: "POST",
    headers,
    body: formData,
  });

  const body = res.status === 204 ? null : await res.json();

  if (!res.ok) {
    throw new Error(
      body?.message || body?.detail || `Upload failed with status ${res.status}`,
    );
  }

  return body?.data;
}
