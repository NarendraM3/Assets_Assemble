import { apiFetch, apiUpload } from "./api";
import type { Ticket, Role } from "@/types/domain";

function extract(obj: any, ...keys: string[]): any {
  for (const key of keys) {
    const v = obj?.[key];
    if (v !== undefined && v !== null) return v;
  }
  return undefined;
}

function mapTicket(bt: any): Ticket {
  console.log("[mapTicket] Raw backend ticket:", bt);

  const id = extract(bt, "ticketId", "TicketId", "display_id", "DisplayId", "id", "Id") ?? "";
  const uuid = extract(bt, "ticketId", "TicketId", "Id", "id", "uuid", "Uuid") ?? "";
  const TicketId = id;
  const title = extract(bt, "Title", "title") ?? "";
  const description = extract(bt, "Description", "description") ?? "";
  const priority = extract(bt, "Priority", "priority") ?? "Medium";
  const category = extract(bt, "Category", "category") ?? "";
  const status =
    extract(bt, "Status", "status", "CurrentStatus", "WorkflowStatus") ?? "Open";

  console.log("[mapTicket]", {
    id: bt?.TicketId ?? bt?.ticketId,
    backendStatus: bt?.Status ?? bt?.status,
    mappedStatus: status,
  });
  const employeeId = extract(bt, "EmployeeId", "employeeId", "created_by_id", "CreatedById") ?? "";
  const assigneeId = extract(bt, "AssigneeId", "assignee_id", "assigneeId") ?? null;
  const assetId = extract(bt, "AssetId", "asset_id", "assetId") ?? null;
  const createdAt = extract(bt, "CreatedAt", "created_at", "createdAt") ?? "";
  const updatedAt = extract(bt, "UpdatedAt", "updated_at", "updatedAt") ?? "";
  const sla = extract(bt, "SLA", "Sla", "sla") ?? "On Track";
  const supportResolution = extract(bt, "SupportResolution", "support_resolution", "supportResolution");
  const adminRemarks = extract(bt, "AdminRemarks", "admin_remarks", "adminRemarks");
  const assetAction = extract(bt, "AssetAction", "asset_action", "assetAction");
  const assetDetails = extract(bt, "AssetDetails", "asset_details", "assetDetails");
  const assetRemarks = extract(bt, "AssetRemarks", "asset_remarks", "assetRemarks");
  const assetResolution = extract(bt, "AssetResolution", "asset_resolution", "assetResolution");
  const assignedRole = extract(bt, "AssignedRole", "assigned_role", "assignedRole");
  const attachmentUrl = extract(bt, "AttachmentUrl", "attachmentUrl", "AttachmentURL");
  const attachmentId = extract(bt, "AttachmentId", "attachmentId");
  const rawAttachments = extract(bt, "Attachments", "attachments", "AttachmentUrl", "attachmentUrl");
  const rawTimeline = extract(bt, "Timeline", "timeline") ?? [];
  const rawAuditTrail = extract(bt, "AuditTrail", "audit_trail", "auditTrail") ?? [];
  const rawComments = extract(bt, "Comments", "comments") ?? [];
  console.log("Employee ETA:", bt?.EstimatedResolutionTime);
  const estimatedResolutionTime = extract(bt, "EstimatedResolutionTime", "estimated_resolution_time", "estimatedResolutionTime", "estimatedTime", "estimated_time", "estimatedResolution", "resolutionETA", "eta") ?? "";
  console.log("Mapped ETA:", estimatedResolutionTime);

  let creatorName = "Unknown";
  if (Array.isArray(rawTimeline) && rawTimeline.length > 0) {
    const actor = extract(rawTimeline[0], "Actor", "actor");
    if (actor) creatorName = actor;
  } else if (employeeId) {
    creatorName = employeeId.slice(0, 8);
  }

  let assigneeName: string | null = null;
  if (assigneeId) {
    const assigneeEntry = Array.isArray(rawTimeline)
      ? rawTimeline.find((e: any) => extract(e, "Step", "step") === "Assigned to Support" && extract(e, "Actor", "actor") !== "System")
      : null;
    assigneeName = assigneeEntry ? extract(assigneeEntry, "Actor", "actor") : assigneeId.slice(0, 8);
  }

  let safeAttachments: string[] = [];
  if (Array.isArray(rawAttachments)) {
    safeAttachments = rawAttachments;
  } else if (typeof rawAttachments === "string" && rawAttachments.length > 0) {
    safeAttachments = [rawAttachments];
  } else if (rawAttachments != null) {
    console.warn(`[mapTicket] Non-array/non-string attachments for ticket ${id}:`, rawAttachments);
  }

  const mapped: Ticket = {
    id,
    uuid,
    TicketId,
    title,
    description,
    priority: priority as Ticket["priority"],
    category,
    status: status as Ticket["status"],
    createdBy: creatorName,
    assignee: assigneeName,
    assetId,
    createdAt: createdAt?.slice(0, 10) ?? "",
    updatedAt: updatedAt?.slice(0, 10) ?? "",
    sla: sla as Ticket["sla"],
    EstimatedResolutionTime: estimatedResolutionTime || undefined,
    attachmentUrl: attachmentUrl ?? null,
    attachments: safeAttachments,
    attachmentId: attachmentId ?? null,
    comments: Array.isArray(rawComments)
      ? rawComments.map((c: any) => ({
          author: extract(c, "AuthorName", "author_name", "author") ?? "",
          message: extract(c, "Message", "message") ?? "",
          at: (extract(c, "CreatedAt", "created_at", "at") ?? "").slice(0, 10),
        }))
      : [],
    supportResolution,
    adminRemarks,
    assetAction: (assetAction ?? null) as Ticket["assetAction"],
    assetDetails: assetDetails ?? null,
    assetRemarks: assetRemarks ?? null,
    assetResolution: assetResolution ?? null,
    assignedRole: (assignedRole ?? null) as Role,
    timeline: Array.isArray(rawTimeline)
      ? rawTimeline.map((t: any) => ({
          step: extract(t, "Step", "step") ?? "",
          timestamp: extract(t, "Timestamp", "timestamp") ?? "",
          actor: extract(t, "Actor", "actor") ?? "",
          role: (extract(t, "Role", "role") ?? "system") as Role | "system",
          remarks: extract(t, "Remarks", "remarks"),
          status: extract(t, "Status", "status") as Ticket["status"],
        }))
      : [],
    auditTrail: Array.isArray(rawAuditTrail)
      ? rawAuditTrail.map((a: any) => ({
          user: extract(a, "User", "user") ?? "",
          role: (extract(a, "Role", "role") ?? "system") as Role | "system",
          timestamp: extract(a, "Timestamp", "timestamp") ?? "",
          fromStatus: extract(a, "FromStatus", "fromStatus") as Ticket["status"],
          toStatus: extract(a, "ToStatus", "toStatus") as Ticket["status"],
          comment: extract(a, "Comment", "comment"),
        }))
      : [],
  };

  console.log("[mapTicket] Mapped ticket:", mapped);
  return mapped;
}

export async function fetchTickets(role?: string): Promise<{ tickets: Ticket[]; total: number }> {
  let path = "/it-tickets";
  if (role === "employee") path = "/employee-tickets";
  else if (role === "admin") path = "/admin-tickets";

  const data = await apiFetch<any>(path);
  console.log(`[fetchTickets] Raw API response for ${path}:`, data);

  const rawTickets = Array.isArray(data) ? data : (data as any)?.tickets ?? (data as any)?.items ?? [];
  console.log(`[fetchTickets] Raw tickets array (count: ${rawTickets.length}):`, rawTickets);

  if (rawTickets.length > 0) {
    console.log(`[fetchTickets] First raw ticket:`, rawTickets[0]);
  }

  const tickets = rawTickets.map(mapTicket);
  console.log(`[fetchTickets] Final rendered tickets (count: ${tickets.length}):`, tickets);

  tickets.forEach((t: Ticket, i: number) => {
    console.log(`[fetchTickets] Ticket ${i}: id=${t.id}, title="${t.title}", attachments=`, t.attachments);
  });

  console.log(
    "[fetchTickets]",
    tickets.map((t: Ticket) => ({
      id: t.id,
      status: t.status,
    })),
  );

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
    RelatedAssetId?: string | null;
    attachments?: string[];
  },
): Promise<Ticket> {
  console.log("[createTicket] Request payload:", JSON.stringify(payload, null, 2));
  const response = await apiFetch<any>("/create-ticket", {
    method: "POST",
    body: JSON.stringify(payload),
  });
  console.log("[createTicket] Raw API response:", response);
  const ticketId = response.ticketId || response.ticket?.TicketId || response.ticket?.ticketId;
  console.log("[createTicket] Extracted ticketId:", ticketId);
  const ticket = mapTicket(response.ticket
    ? { ...response.ticket, TicketId: ticketId }
    : { TicketId: ticketId });
  console.log("[createTicket] Mapped ticket:", ticket);
  return ticket;
}

export async function updateTicketStatus(
  ticketId: string,
  status: string,
  comment?: string,
): Promise<Ticket> {
  const data = await apiFetch<any>("/update-ticket", {
    method: "PUT",
    body: JSON.stringify({ ticket_id: ticketId, status, comment }),
  });
  return mapTicket(data ?? {});
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

export async function updateTicketStatusPatch(
  ticketId: string,
  payload: { status: string; estimatedTime: string; note: string },
): Promise<void> {
  await apiFetch(`/tickets/${ticketId}/status`, {
    method: "PATCH",
    body: JSON.stringify(payload),
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
    formData.append("FileType", file.type);
    formData.append("File", file);

    for (const [key, value] of formData.entries()) {
      console.log(key, value);
    }

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
