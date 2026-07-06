import { useMemo, useState } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { PageHeader } from "@/components/common/PageHeader";
import { DataTable } from "@/components/common/DataTable";
import { StatusBadge } from "@/components/common/StatusBadge";
import { Card } from "@/components/ui/card";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Timeline } from "@/components/common/Timeline";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { tickets, type Ticket } from "@/data/mock";
import { toast } from "sonner";

export interface TicketListProps {
  title: string;
  description?: string;
  filter?: (t: Ticket) => boolean;
  actions?: React.ReactNode;
  showBoard?: boolean;
}

const STATUS_LANES: Ticket["status"][] = ["Open","Assigned","In Progress","Waiting","Resolved","Closed"];

export function TicketList({ title, description, filter, actions }: TicketListProps) {
  const [selected, setSelected] = useState<Ticket | null>(null);
  const [tab, setTab] = useState<string>("all");
  const [comment, setComment] = useState("");

  const data = useMemo(() => {
    let list = filter ? tickets.filter(filter) : tickets;
    if (tab !== "all") list = list.filter(t => t.status === tab);
    return list;
  }, [filter, tab]);

  const columns: ColumnDef<Ticket>[] = [
    { accessorKey: "id", header: "ID" },
    { accessorKey: "title", header: "Title", cell: ({row}) => <div className="max-w-sm truncate">{row.original.title}</div> },
    { id: "priority", header: "Priority", cell: ({row}) => <StatusBadge status={row.original.priority}/> },
    { accessorKey: "category", header: "Category" },
    { accessorKey: "createdBy", header: "Requester" },
    { accessorKey: "assignee", header: "Assignee", cell: ({row}) => row.original.assignee || <span className="text-muted-foreground">—</span> },
    { id: "sla", header: "SLA", cell: ({row}) => <StatusBadge status={row.original.sla}/> },
    { id: "status", header: "Status", cell: ({row}) => <StatusBadge status={row.original.status}/> },
    { accessorKey: "updatedAt", header: "Updated" },
  ];

  return (
    <>
      <PageHeader title={title} description={description} actions={actions}/>
      <Tabs value={tab} onValueChange={setTab} className="mb-4">
        <TabsList>
          <TabsTrigger value="all">All ({tickets.filter(t => !filter || filter(t)).length})</TabsTrigger>
          {STATUS_LANES.map(s => (
            <TabsTrigger key={s} value={s}>{s}</TabsTrigger>
          ))}
        </TabsList>
      </Tabs>
      <Card className="p-4">
        <DataTable
          data={data}
          columns={columns}
          searchPlaceholder="Search tickets by title, requester, category…"
          onRowClick={(r) => setSelected(r)}
        />
      </Card>

      <Sheet open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <SheetContent className="w-full sm:max-w-2xl overflow-y-auto p-6">
          {selected && (
            <>
              <SheetHeader className="p-0 mb-4">
                <div className="text-xs text-muted-foreground">{selected.id}</div>
                <SheetTitle className="text-xl">{selected.title}</SheetTitle>
                <div className="flex flex-wrap gap-2 mt-2">
                  <StatusBadge status={selected.priority}/>
                  <StatusBadge status={selected.status}/>
                  <StatusBadge status={selected.sla}/>
                </div>
              </SheetHeader>
              <div className="grid grid-cols-2 gap-3 text-sm mb-6 p-3 bg-muted/40 rounded-md">
                <div><span className="text-muted-foreground">Requester:</span> <span className="font-medium">{selected.createdBy}</span></div>
                <div><span className="text-muted-foreground">Assignee:</span> <span className="font-medium">{selected.assignee ?? "Unassigned"}</span></div>
                <div><span className="text-muted-foreground">Category:</span> <span className="font-medium">{selected.category}</span></div>
                <div><span className="text-muted-foreground">Asset:</span> <span className="font-medium">{selected.assetId ?? "—"}</span></div>
                <div><span className="text-muted-foreground">Created:</span> <span className="font-medium">{selected.createdAt}</span></div>
                <div><span className="text-muted-foreground">Updated:</span> <span className="font-medium">{selected.updatedAt}</span></div>
              </div>
              <div className="text-sm mb-6">{selected.description}</div>

              <div className="font-semibold text-sm mb-3">Conversation</div>
              <Timeline items={selected.comments.map(c => ({
                title: c.author, description: c.message, time: c.at, tone: "primary" as const,
              }))} />

              <div className="mt-6">
                <div className="font-semibold text-sm mb-2">Add Comment</div>
                <Textarea value={comment} onChange={e => setComment(e.target.value)} placeholder="Type a reply…" className="min-h-24"/>
                <div className="flex justify-between mt-3">
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => toast.success("Ticket reassigned")}>Reassign</Button>
                    <Button variant="outline" size="sm" onClick={() => toast.success(`Status updated`)}>Update Status</Button>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="ghost" size="sm" onClick={() => setSelected(null)}>Close</Button>
                    <Button size="sm" onClick={() => { toast.success("Comment posted"); setComment(""); }}>Post Comment</Button>
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
