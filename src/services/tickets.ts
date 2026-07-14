import { apiFetch, apiUpload } from "./api";
import type { Ticket, Role } from "@/types/domain";

interface BackendTicket {
  id: string;
  display_id: string;
  title: string;
  description: string;
  priority: string;
  category: string;
  status: string;
  created_by_id: string;
  assignee_id: string | null;
  asset_id: string | null;
  sla: string;
  support_resolution?: string;
  admin_remarks?: string;
  asset_action?: string;
  asset_details?: string;
  asset_remarks?: string;
  asset_resolution?: string;
  assigned_role?: string;
  attachments?: string[];
  created_at: string;
  updated_at: string;
  timeline?: {
    step: string;
    timestamp: string;
    actor: string;
    role: string;
    remarks?: string;
    status?: string;
  }[];
  audit_trail?: {
    user: string;
    role: string;
    timestamp: string;
    fromStatus?: string;
    toStatus: string;
    comment?: string;
  }[];
  comments: {
    id: string;
    ticket_id: string;
    author_name: string;
    message: string;
    created_at: string;
  }[];
}

function mapTicket(bt: BackendTicket): Ticket {
  const creatorName =
    bt.timeline && bt.timeline.length > 0
      ? bt.timeline[0].actor
      : bt.created_by_id
        ? bt.created_by_id.slice(0, 8)
        : "Unknown";

  const assigneeName = bt.assignee_id
    ? (bt.timeline ?? [])
        .filter((e) => e.step === "Assigned to Support" && e.actor !== "System")
        .map((e) => e.actor)[0] ?? bt.assignee_id.slice(0, 8)
    : null;

  return {
    id: bt.display_id,
    uuid: bt.id,
    title: bt.title,
    description: bt.description,
    priority: bt.priority as Ticket["priority"],
    category: bt.category,
    status: bt.status as Ticket["status"],
    createdBy: creatorName,
    assignee: assigneeName,
    assetId: bt.asset_id ?? null,
    createdAt: bt.created_at?.slice(0, 10),
    updatedAt: bt.updated_at?.slice(0, 10),
    sla: bt.sla as Ticket["sla"],
    attachments: bt.attachments ?? [],
    comments: (bt.comments ?? []).map((c) => ({
      author: c.author_name,
      message: c.message,
      at: c.created_at?.slice(0, 10),
    })),
    supportResolution: bt.support_resolution,
    adminRemarks: bt.admin_remarks,
    assetAction: bt.asset_action as Ticket["assetAction"],
    assetDetails: bt.asset_details,
    assetRemarks: bt.asset_remarks,
    assetResolution: bt.asset_resolution,
    assignedRole: bt.assigned_role as Role,
    timeline: (bt.timeline ?? []).map((t) => ({
      step: t.step,
      timestamp: t.timestamp,
      actor: t.actor,
      role: t.role as Role | "system",
      remarks: t.remarks,
      status: t.status as Ticket["status"],
    })),
    auditTrail: (bt.audit_trail ?? []).map((a) => ({
      user: a.user,
      role: a.role as Role | "system",
      timestamp: a.timestamp,
      fromStatus: a.fromStatus as Ticket["status"],
      toStatus: a.toStatus as Ticket["status"],
      comment: a.comment,
    })),
  };
}

export async function fetchTickets(role?: string): Promise<{ tickets: Ticket[]; total: number }> {
  let path = "/it-tickets";
  if (role === "employee") path = "/employee-tickets";
  else if (role === "admin") path = "/admin-tickets";

  const data = await apiFetch<BackendTicket[]>(path);
  const rawTickets = Array.isArray(data) ? data : (data as any)?.items ?? [];
  const tickets = rawTickets.map(mapTicket);
  return { tickets, total: tickets.length };
}

export async function createTicket(
  payload: {
    title: string;
    description: string;
    priority: string;
    category: string;
    department: string;
    employeeId: string;
    created_by_id: string;
    asset_id?: string | null;
    attachments?: string[];
  },
): Promise<Ticket> {
  const response = await apiFetch<any>("/create-ticket", {
    method: "POST",
    body: JSON.stringify(payload),
  });
  const ticketId = response.ticketId || response.ticket?.TicketId || response.ticket?.ticketId;
  const ticket = mapTicket({
    ...(response.ticket || {}),
    display_id: ticketId,
    id: ticketId,
  } as BackendTicket);
  console.log("[Ticket] Ticket created:", ticket.id);
  return ticket;
}

export async function updateTicketStatus(
  ticketId: string,
  status: string,
  comment?: string,
): Promise<Ticket> {
  const data = await apiFetch<BackendTicket>("/update-ticket", {
    method: "PUT",
    body: JSON.stringify({ ticket_id: ticketId, status, comment }),
  });
  return mapTicket(data ?? {} as BackendTicket);
}

export async function addTicketComment(
  ticketId: string,
  message: string,
): Promise<void> {
  await apiFetch("/add-comment", {
    method: "POST",
    body: JSON.stringify({ ticket_id: ticketId, message }),
  });
}

export async function uploadFiles(
  files: FileList | File[],
  ticketId: string,
  employeeId: string,
): Promise<string[]> {
  if (!ticketId) {
    const error = new Error("TicketId is missing");
    console.error("[Upload]", error.message);
    throw error;
  }

  const urls: string[] = [];

  for (let i = 0; i < files.length; i++) {
    const file = files[i];

    if (!file) {
      console.error("Upload validation failed: file is null/undefined at index", i);
      continue;
    }
    if (file.size <= 0) {
      console.error(`Upload validation failed: file "${file.name}" has size ${file.size}`);
      continue;
    }

    const formData = new FormData();
    formData.append("TicketId", ticketId);
    formData.append("EmployeeId", employeeId);
    formData.append("FileName", file.name);
    formData.append("File", file);

    console.log("TicketId:", ticketId);
    console.log("EmployeeId:", employeeId);
    console.log("FileName:", file.name);
    console.log("File:", file);

    try {
      const result = await apiUpload<{ url?: string; data?: { url?: string } }>(
        "/upload-attachment",
        formData,
      );

      const fileUrl = result?.url || result?.data?.url;
      if (fileUrl) {
        urls.push(fileUrl);
      } else {
        console.warn("Upload succeeded but no URL in response:", result);
        urls.push(String(result));
      }
    } catch (err: any) {
      console.error(`[Upload] Attachment upload failed for "${file.name}":`, err.message);
      throw err;
    }
  }

  console.log("[Upload] Attachment upload completed. URLs:", urls);
  return urls;
}
