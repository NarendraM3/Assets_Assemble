import { useMemo, useState, useEffect } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { PageHeader } from "@/components/common/PageHeader";
import { DataTable } from "@/components/common/DataTable";
import { StatusBadge } from "@/components/common/StatusBadge";
import { Card } from "@/components/ui/card";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Timeline } from "@/components/common/Timeline";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import type { Role, Ticket } from "@/types/domain";
import { useAuth } from "@/contexts/auth";
import { useData } from "@/contexts/data";
import { toast } from "sonner";
import { AlertCircle, RefreshCw, Inbox } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export interface TicketListProps {
  title: string;
  description?: string;
  filter?: (t: Ticket) => boolean;
  actions?: React.ReactNode;
  showBoard?: boolean;
  workflowRole?: Role;
}

const STATUS_LANES: Ticket["status"][] = [
  "Open",
  "Assigned",
  "In Progress",
  "Pending Administration Approval",
  "Approved for Asset Manager",
  "Resolved",
  "Closed",
];

const EMPLOYEE_LANES = ["Open", "In Progress", "Escalated", "Approved", "Resolved", "Closed"];

function displayStatus(ticket: Ticket, role?: Role) {
  if (role === "employee") {
    if (ticket.status === "Pending Administration Approval") return "Escalated";
    if (ticket.status === "Approved for Asset Manager") return "Approved";
    if (ticket.status === "Assigned") return "Open";
    if (ticket.status === "Waiting") return "Escalated";
  }
  return ticket.status;
}

export function TicketList({ title, description, filter, actions, workflowRole }: TicketListProps) {
  const { user } = useAuth();
  const {
    tickets,
    loading,
    error,
    refreshData,
    acceptTicket,
    updateTicketStatus,
    addTicketComment,
    escalateTicket,
    reviewEscalation,
    resolveAssetTicket,
  } = useData();
  const role = workflowRole || user?.role || "employee";
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [tab, setTab] = useState<string>("all");
  const [comment, setComment] = useState("");

  useEffect(() => {
    refreshData();
  }, []);

  const scopedTickets = useMemo(() => {
    if (role === "it_support_team") {
      return tickets.filter(t => t.assignedRole !== "admin" && t.assignedRole !== "asset_manager");
    }
    if (role === "admin") {
      return tickets.filter(t => t.status === "Pending Administration Approval" || t.status === "Approved for Asset Manager" || t.status === "Resolved");
    }
    if (role === "asset_manager") {
      return tickets.filter(t => t.status === "Approved for Asset Manager" || (t.status === "Resolved" && !!t.assetResolution));
    }
    return tickets;
  }, [role, tickets]);

  const data = useMemo(() => {
    let list = filter ? scopedTickets.filter(filter) : scopedTickets;
    if (tab !== "all") {
      list = list.filter(t => role === "employee" ? displayStatus(t, role) === tab : t.status === tab);
    }
    return list;
  }, [filter, role, scopedTickets, tab]);

  const selected = selectedId ? tickets.find(t => t.id === selectedId) ?? null : null;

  const actor = user?.name || `${role} User`;

  const postComment = () => {
    if (!selected || !comment.trim()) return;
    addTicketComment(selected.id, actor, role, comment);
    toast.success("Comment posted");
    setComment("");
  };

  const withRemarks = (fallback: string) => comment.trim() || fallback;

  const columns = useMemo<ColumnDef<Ticket>[]>(() => {
    const cols: ColumnDef<Ticket>[] = [
      { accessorKey: "id", header: "ID" },
      { accessorKey: "title", header: "Title", cell: ({ row }) => <div className="max-w-sm truncate">{row.original.title}</div> },
      { id: "priority", header: "Priority", cell: ({ row }) => <StatusBadge status={row.original.priority} /> },
      { accessorKey: "category", header: "Category" },
      { accessorKey: "createdBy", header: "Requester" },
      { accessorKey: "assignee", header: "Assignee", cell: ({ row }) => row.original.assignee || <span className="text-muted-foreground">-</span> },
    ];

    if (role !== "employee") {
      cols.push({ id: "sla", header: "SLA", cell: ({ row }) => <StatusBadge status={row.original.sla} /> });
    }

    cols.push(
      { id: "status", header: "Status", cell: ({ row }) => <StatusBadge status={displayStatus(row.original, role)} /> },
      { accessorKey: "updatedAt", header: "Updated" }
    );

    return cols;
  }, [role]);

  const renderWorkflowActions = () => {
    if (!selected) return null;

    if (role === "it_support_team") {
      return (
        <div className="flex gap-2 flex-wrap">
          {selected.status === "Open" && (
            <Button variant="outline" size="sm" onClick={() => { acceptTicket(selected.id, actor); toast.success("Ticket accepted"); }}>Accept</Button>
          )}
          {["Open", "Assigned"].includes(selected.status) && (
            <Button variant="outline" size="sm" onClick={() => { updateTicketStatus(selected.id, "In Progress", actor, role, withRemarks("Work started.")); toast.success("Status updated"); setComment(""); }}>In Progress</Button>
          )}
          {!["Pending Administration Approval", "Approved for Asset Manager", "Resolved", "Closed"].includes(selected.status) && (
            <Button variant="outline" size="sm" onClick={() => { escalateTicket(selected.id, actor, withRemarks("Requires administration approval.")); toast.success("Ticket escalated"); setComment(""); }}>Escalate</Button>
          )}
          {!["Pending Administration Approval", "Approved for Asset Manager", "Resolved", "Closed"].includes(selected.status) && (
            <Button variant="outline" size="sm" onClick={() => { updateTicketStatus(selected.id, "Resolved", actor, role, withRemarks("Issue resolved.")); toast.success("Ticket resolved"); setComment(""); }}>Resolve</Button>
          )}
          {selected.status === "Resolved" && (
            <Button variant="outline" size="sm" onClick={() => { updateTicketStatus(selected.id, "Closed", actor, role, withRemarks("Ticket closed.")); toast.success("Ticket closed"); setComment(""); }}>Close Ticket</Button>
          )}
        </div>
      );
    }

    if (role === "admin" && selected.status === "Pending Administration Approval") {
      return (
        <div className="flex gap-2 flex-wrap">
          <Button variant="outline" size="sm" onClick={() => { reviewEscalation(selected.id, false, actor, withRemarks("Escalation rejected by Administration.")); toast.success("Escalation rejected"); setComment(""); }}>Reject</Button>
          <Button size="sm" onClick={() => { reviewEscalation(selected.id, true, actor, withRemarks("Approved for Asset Manager action.")); toast.success("Escalation approved"); setComment(""); }}>Approve</Button>
        </div>
      );
    }

    if (role === "asset_manager" && selected.status === "Approved for Asset Manager") {
      return (
        <div className="flex gap-2 flex-wrap">
          {(["Repair", "Replace", "Reassign"] as const).map(action => (
            <Button
              key={action}
              variant="outline"
              size="sm"
              onClick={() => {
                resolveAssetTicket(selected.id, actor, {
                  action,
                  assetDetails: selected.assetId || "General asset request",
                  remarks: withRemarks(`${action} completed by Asset Manager.`),
                  resolution: withRemarks(`${action} completed and issue resolved.`),
                });
                toast.success(`Ticket resolved: ${action}`);
                setComment("");
              }}
            >
              {action} & Resolve
            </Button>
          ))}
        </div>
      );
    }

    return null;
  };

  return (
    <>
      <PageHeader title={title} description={description} actions={actions} />

      {loading && (
        <Card className="p-12 mb-4">
          <div className="flex flex-col items-center justify-center text-muted-foreground gap-3">
            <RefreshCw className="h-8 w-8 animate-spin text-primary/60" />
            <p className="text-sm">Loading tickets...</p>
          </div>
        </Card>
      )}

      {!loading && error && (
        <Card className="p-6 mb-4">
          <Alert variant="destructive">
            <AlertCircle className="h-5 w-5" />
            <AlertTitle>Failed to load tickets</AlertTitle>
            <AlertDescription className="flex items-center justify-between gap-4 flex-wrap">
              <span>{error}</span>
              <Button size="sm" variant="outline" onClick={refreshData}>
                <RefreshCw className="h-4 w-4 mr-1" /> Retry
              </Button>
            </AlertDescription>
          </Alert>
        </Card>
      )}

      {!loading && !error && (
        <>
          <Tabs value={tab} onValueChange={setTab} className="mb-4">
            <TabsList>
              <TabsTrigger value="all">All ({scopedTickets.filter(t => !filter || filter(t)).length})</TabsTrigger>
              {(role === "employee" ? EMPLOYEE_LANES : STATUS_LANES).map(s => (
                <TabsTrigger key={s} value={s}>{s}</TabsTrigger>
              ))}
            </TabsList>
          </Tabs>

          {data.length === 0 ? (
            <Card className="p-12">
              <div className="flex flex-col items-center justify-center text-muted-foreground gap-3">
                <Inbox className="h-12 w-12 text-muted-foreground/40" />
                <p className="text-lg font-medium">No ticket history found</p>
                <p className="text-sm text-muted-foreground/60">There are no tickets matching your current filters.</p>
              </div>
            </Card>
          ) : (
            <Card className="p-4">
              <DataTable
                data={data}
                columns={columns}
                searchPlaceholder="Search tickets by title, requester, category..."
                onRowClick={(r) => setSelectedId(r.id)}
              />
            </Card>
          )}
        </>
      )}

      <Sheet open={!!selected} onOpenChange={(o) => !o && setSelectedId(null)}>
        <SheetContent className="w-full sm:max-w-2xl overflow-y-auto p-6">
          {selected && (
            <>
              <SheetHeader className="p-0 mb-4">
                <div className="text-xs text-muted-foreground">{selected.id}</div>
                <SheetTitle className="text-xl">{selected.title}</SheetTitle>
                <div className="flex flex-wrap gap-2 mt-2">
                  <StatusBadge status={selected.priority} />
                  <StatusBadge status={displayStatus(selected, role)} />
                  <StatusBadge status={selected.sla} />
                </div>
              </SheetHeader>
              <div className="grid grid-cols-2 gap-3 text-sm mb-6 p-3 bg-muted/40 rounded-md">
                <div><span className="text-muted-foreground">Requester:</span> <span className="font-medium">{selected.createdBy}</span></div>
                <div><span className="text-muted-foreground">Assignee:</span> <span className="font-medium">{selected.assignee ?? "Unassigned"}</span></div>
                <div><span className="text-muted-foreground">Category:</span> <span className="font-medium">{selected.category}</span></div>
                <div><span className="text-muted-foreground">Asset:</span> <span className="font-medium">{selected.assetId ?? "-"}</span></div>
                <div><span className="text-muted-foreground">Created:</span> <span className="font-medium">{selected.createdAt}</span></div>
                <div><span className="text-muted-foreground">Updated:</span> <span className="font-medium">{selected.updatedAt}</span></div>
              </div>
              <div className="text-sm mb-6">{selected.description}</div>

              {selected.attachments && selected.attachments.length > 0 && (
                <div className="mb-6 space-y-2">
                  <div className="font-semibold text-sm">Attachments</div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {selected.attachments.map((url, idx) => {
                      const fileName = url.substring(url.indexOf("_") + 1);
                      return (
                        <a
                          key={idx}
                          href={url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-2 p-2 rounded-md border bg-muted/40 hover:bg-muted text-xs text-primary font-medium transition-colors"
                        >
                          <span className="truncate max-w-[220px]">{fileName}</span>
                        </a>
                      );
                    })}
                  </div>
                </div>
              )}

              {(selected.adminRemarks || selected.assetResolution || selected.supportResolution) && (
                <div className="text-sm mb-6 p-3 bg-muted/40 rounded-md space-y-2">
                  {selected.adminRemarks && <div><span className="font-medium">Admin remarks:</span> {selected.adminRemarks}</div>}
                  {selected.assetAction && <div><span className="font-medium">Asset action:</span> {selected.assetAction}</div>}
                  {selected.assetDetails && <div><span className="font-medium">Asset details:</span> {selected.assetDetails}</div>}
                  {selected.assetRemarks && <div><span className="font-medium">Asset remarks:</span> {selected.assetRemarks}</div>}
                  {(selected.assetResolution || selected.supportResolution) && <div><span className="font-medium">Resolution:</span> {selected.assetResolution || selected.supportResolution}</div>}
                </div>
              )}

              <div className="font-semibold text-sm mb-3">Ticket Timeline</div>
              <Timeline items={(selected.timeline || []).map(item => ({
                title: item.step,
                description: item.remarks,
                time: `${item.timestamp} - ${item.actor}`,
                tone: item.status === "Resolved" || item.status === "Closed" ? "success" as const : item.status === "Pending Administration Approval" ? "warning" as const : "primary" as const,
              }))} />

              <div className="font-semibold text-sm mb-3 mt-6">Conversation</div>
              <Timeline items={selected.comments.map(c => ({
                title: c.author, description: c.message, time: c.at, tone: "primary" as const,
              }))} />

              <div className="mt-6">
                <div className="font-semibold text-sm mb-2">Add Comment / Remarks</div>
                <Textarea value={comment} onChange={e => setComment(e.target.value)} placeholder="Type a reply, remark, or resolution note..." className="min-h-24" />
                <div className="flex justify-between mt-3 gap-3 flex-wrap">
                  {renderWorkflowActions()}
                  <div className="flex gap-2 ml-auto">
                    <Button variant="ghost" size="sm" onClick={() => setSelectedId(null)}>Close</Button>
                    <Button size="sm" onClick={postComment}>Post Comment</Button>
                  </div>
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </>
  );
}
