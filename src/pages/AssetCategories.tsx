import { useState, useMemo } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { PageHeader } from "@/components/common/PageHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/common/DataTable";
import { StatusBadge } from "@/components/common/StatusBadge";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Plus, Tags, Eye } from "lucide-react";
import { toast } from "sonner";
import { useData } from "@/contexts/data";
import { uniqueValues } from "@/lib/live-data";
import type { Ticket, Employee } from "@/types/domain";

function CategoryGrid({ items, count, onSelect }: { items: string[]; count: (c: string) => number; onSelect?: (c: string) => void }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
      {items.map(c => (
        <Card key={c} className="p-4 hover:shadow-md transition-shadow cursor-pointer" onClick={() => onSelect?.(c)}>
          <div className="flex items-start justify-between">
            <div className="h-9 w-9 rounded-md bg-info/10 text-info grid place-items-center"><Tags className="h-4 w-4"/></div>
            <span className="text-xs font-medium text-muted-foreground">{count(c)}</span>
          </div>
          <div className="mt-3 font-medium text-sm">{c}</div>
          <div className="text-xs text-muted-foreground">Category</div>
        </Card>
      ))}
    </div>
  );
}

export default function AssetCategoriesPage() {
  const { assets } = useData();
  const categories = uniqueValues(assets.map((asset) => asset.category));
  return (
    <>
      <PageHeader title="Asset Categories" description="Classification schema for the asset catalog."
        actions={<Button onClick={()=>toast.success("Category added")}><Plus className="h-4 w-4 mr-1"/>Add Category</Button>}/>
      {categories.length === 0 ? (
        <Card className="p-8 text-center text-sm text-muted-foreground">No asset categories found.</Card>
      ) : (
        <CategoryGrid items={categories} count={(c) => assets.filter(a => a.category === c).length}/>
      )}
    </>
  );
}

function findEmployee(employees: Employee[], ticket: Ticket) {
  return employees.find(
    e => e.name === ticket.createdBy || e.email === ticket.createdBy
  );
}

export function TicketCategoriesInner() {
  const { tickets, employees } = useData();
  const categories = uniqueValues(tickets.map((ticket) => ticket.category));
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [viewingTicket, setViewingTicket] = useState<Ticket | null>(null);

  const filteredTickets = useMemo(
    () => tickets.filter(t => t.category === selectedCategory),
    [tickets, selectedCategory]
  );

  const columns = useMemo<ColumnDef<Ticket>[]>(() => [
    { accessorKey: "id", header: "Ticket ID" },
    {
      id: "employeeName",
      header: "Employee Name",
      cell: ({ row }) => <span>{row.original.createdBy}</span>,
    },
    {
      id: "employeeId",
      header: "Employee ID",
      cell: ({ row }) => {
        const emp = findEmployee(employees, row.original);
        return <span>{emp?.id ?? "-"}</span>;
      },
    },
    { accessorKey: "title", header: "Title" },
    {
      id: "status",
      header: "Status",
      cell: ({ row }) => <StatusBadge status={row.original.status} />,
    },
    {
      id: "priority",
      header: "Priority",
      cell: ({ row }) => <StatusBadge status={row.original.priority} />,
    },
    { accessorKey: "createdAt", header: "Created Date" },
    {
      accessorKey: "assignee",
      header: "Assigned To",
      cell: ({ row }) => <span>{row.original.assignee ?? "-"}</span>,
    },
    {
      id: "action",
      header: "Action",
      cell: ({ row }) => (
        <Button
          size="sm"
          onClick={(e) => {
            e.stopPropagation();
            setViewingTicket(row.original);
          }}
        >
          <Eye className="h-4 w-4 mr-1" /> View
        </Button>
      ),
    },
  ], [employees]);

  return (
    <>
      <PageHeader title="Ticket Categories" description="Group and route tickets to the right team."
        actions={<Button onClick={()=>toast.success("Category added")}><Plus className="h-4 w-4 mr-1"/>Add Category</Button>}/>
      {categories.length === 0 ? (
        <Card className="p-8 text-center text-sm text-muted-foreground">No ticket categories found.</Card>
      ) : (
        <CategoryGrid items={categories} count={(c) => tickets.filter(t => t.category === c).length} onSelect={setSelectedCategory}/>
      )}

      <Sheet open={!!selectedCategory} onOpenChange={(o) => { if (!o) setSelectedCategory(null); }}>
        <SheetContent className="w-full sm:max-w-4xl overflow-y-auto p-6">
          <SheetHeader className="p-0 mb-4">
            <SheetTitle className="text-xl">{selectedCategory} Tickets</SheetTitle>
            <div className="text-sm text-muted-foreground">
              {filteredTickets.length} ticket{filteredTickets.length !== 1 ? "s" : ""} found
            </div>
          </SheetHeader>
          {filteredTickets.length === 0 ? (
            <Card className="p-8 text-center text-sm text-muted-foreground">
              No tickets found for this category.
            </Card>
          ) : (
            <Card className="p-4">
              <DataTable
                data={filteredTickets}
                columns={columns}
                searchPlaceholder="Search tickets..."
                emptyMessage="No tickets found for this category."
              />
            </Card>
          )}
        </SheetContent>
      </Sheet>

      <Dialog open={!!viewingTicket} onOpenChange={(o) => { if (!o) setViewingTicket(null); }}>
        <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Ticket Details</DialogTitle>
          </DialogHeader>
          {viewingTicket && <>
            <div className="grid grid-cols-2 gap-3 text-sm p-3 bg-muted/40 rounded-md">
              <div><span className="text-muted-foreground">Ticket ID:</span> <span className="font-medium ml-1">{viewingTicket.id}</span></div>
              <div><span className="text-muted-foreground">Employee Name:</span> <span className="font-medium ml-1">{viewingTicket.createdBy}</span></div>
              <div><span className="text-muted-foreground">Employee ID:</span> <span className="font-medium ml-1">{findEmployee(employees, viewingTicket)?.id ?? "-"}</span></div>
              <div><span className="text-muted-foreground">Email:</span> <span className="font-medium ml-1">{findEmployee(employees, viewingTicket)?.email ?? "-"}</span></div>
              <div><span className="text-muted-foreground">Category:</span> <span className="font-medium ml-1">{viewingTicket.category}</span></div>
              <div><span className="text-muted-foreground">Title:</span> <span className="font-medium ml-1">{viewingTicket.title}</span></div>
              <div className="col-span-2"><span className="text-muted-foreground">Description:</span> <span className="font-medium ml-1 block mt-1">{viewingTicket.description}</span></div>
              <div><span className="text-muted-foreground">Status:</span> <span className="ml-1"><StatusBadge status={viewingTicket.status} /></span></div>
              <div><span className="text-muted-foreground">Priority:</span> <span className="ml-1"><StatusBadge status={viewingTicket.priority} /></span></div>
              <div><span className="text-muted-foreground">Assigned To:</span> <span className="font-medium ml-1">{viewingTicket.assignee ?? "Unassigned"}</span></div>
              <div><span className="text-muted-foreground">Related Asset:</span> <span className="font-medium ml-1">{viewingTicket.assetId ?? "-"}</span></div>
              <div><span className="text-muted-foreground">Created Date:</span> <span className="font-medium ml-1">{viewingTicket.createdAt}</span></div>
              <div><span className="text-muted-foreground">Updated Date:</span> <span className="font-medium ml-1">{viewingTicket.updatedAt}</span></div>
            </div>

            {viewingTicket.comments.length > 0 && (
              <div>
                <h4 className="font-semibold text-sm mb-2 mt-4">Comments</h4>
                <div className="space-y-2">
                  {viewingTicket.comments.map((c, i) => (
                    <div key={i} className="p-2 bg-muted/40 rounded text-sm">
                      <div className="font-medium">{c.author} <span className="text-xs text-muted-foreground ml-2">{c.at}</span></div>
                      <div className="text-muted-foreground mt-0.5">{c.message}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {Array.isArray(viewingTicket.attachments) && viewingTicket.attachments.length > 0 && (
              <div>
                <h4 className="font-semibold text-sm mb-2 mt-4">Attachments</h4>
                <div className="flex flex-wrap gap-2">
                  {viewingTicket.attachments.map((url, idx) => (
                    <a
                      key={idx}
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 p-2 rounded-md border bg-muted/40 hover:bg-muted text-xs text-primary font-medium transition-colors"
                    >
                      <span className="truncate max-w-[200px]">{url.substring(url.indexOf("_") + 1) || `Attachment ${idx + 1}`}</span>
                    </a>
                  ))}
                </div>
              </div>
            )}
          </>}
        </DialogContent>
      </Dialog>
    </>
  );
}
