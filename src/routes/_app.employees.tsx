import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { PageHeader } from "@/components/common/PageHeader";
import { DataTable } from "@/components/common/DataTable";
import { StatusBadge } from "@/components/common/StatusBadge";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { employees, DEPARTMENTS, LOCATIONS, type Employee } from "@/data/mock";
import { Plus, MoreHorizontal, Eye, Edit, Trash2, Mail, Phone } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/employees")({
  component: EmployeesPage,
});

function EmployeesPage() {
  const [selected, setSelected] = useState<Employee | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<Employee | null>(null);

  const columns: ColumnDef<Employee>[] = [
    { accessorKey: "id", header: "Employee ID" },
    { id: "name", header: "Name", cell: ({row}) => (
      <div className="flex items-center gap-2">
        <Avatar className="h-7 w-7"><AvatarFallback className="text-[10px] bg-primary/10 text-primary">{row.original.avatar}</AvatarFallback></Avatar>
        <div><div className="font-medium">{row.original.name}</div><div className="text-xs text-muted-foreground">{row.original.email}</div></div>
      </div>
    )},
    { accessorKey: "department", header: "Department" },
    { accessorKey: "designation", header: "Designation" },
    { accessorKey: "manager", header: "Manager" },
    { accessorKey: "location", header: "Location" },
    { id: "status", header: "Status", cell: ({row}) => <StatusBadge status={row.original.status}/> },
    { id: "actions", header: "", cell: ({row}) => (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={e => e.stopPropagation()}><MoreHorizontal className="h-4 w-4"/></Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => setSelected(row.original)}><Eye className="h-4 w-4 mr-2"/>View</DropdownMenuItem>
          <DropdownMenuItem onClick={() => toast.info("Edit not wired in demo")}><Edit className="h-4 w-4 mr-2"/>Edit</DropdownMenuItem>
          <DropdownMenuItem className="text-destructive" onClick={() => setConfirmDelete(row.original)}><Trash2 className="h-4 w-4 mr-2"/>Delete</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    )},
  ];

  return (
    <>
      <PageHeader title="Employees" description={`Directory of ${employees.length} employees across ${DEPARTMENTS.length} departments.`}
        actions={<Button onClick={() => setCreateOpen(true)}><Plus className="h-4 w-4 mr-1"/>Add Employee</Button>}/>
      <Card className="p-4">
        <DataTable data={employees} columns={columns} searchPlaceholder="Search employees…" onRowClick={setSelected} pageSize={15}/>
      </Card>

      <Sheet open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto p-6">
          {selected && (
            <>
              <SheetHeader className="p-0 mb-6 flex-row items-center gap-4">
                <Avatar className="h-16 w-16"><AvatarFallback className="bg-primary text-primary-foreground text-lg">{selected.avatar}</AvatarFallback></Avatar>
                <div>
                  <SheetTitle className="text-xl">{selected.name}</SheetTitle>
                  <div className="text-sm text-muted-foreground">{selected.designation} • {selected.department}</div>
                </div>
              </SheetHeader>
              <Card className="p-4 space-y-2 text-sm">
                <div className="flex items-center gap-2"><Mail className="h-4 w-4 text-muted-foreground"/>{selected.email}</div>
                <div className="flex items-center gap-2"><Phone className="h-4 w-4 text-muted-foreground"/>{selected.phone}</div>
              </Card>
              <Card className="p-4 mt-3">
                <div className="grid grid-cols-2 gap-y-2 text-sm">
                  <span className="text-muted-foreground">Employee ID</span><span>{selected.id}</span>
                  <span className="text-muted-foreground">Manager</span><span>{selected.manager}</span>
                  <span className="text-muted-foreground">Location</span><span>{selected.location}</span>
                  <span className="text-muted-foreground">Join Date</span><span>{selected.joinDate}</span>
                  <span className="text-muted-foreground">Status</span><span><StatusBadge status={selected.status}/></span>
                </div>
              </Card>
            </>
          )}
        </SheetContent>
      </Sheet>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add Employee</DialogTitle></DialogHeader>
          <div className="grid gap-3">
            <div className="grid grid-cols-2 gap-3">
              <div><Label>First Name</Label><Input className="mt-1.5"/></div>
              <div><Label>Last Name</Label><Input className="mt-1.5"/></div>
            </div>
            <div><Label>Email</Label><Input className="mt-1.5" type="email"/></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Department</Label>
                <Select><SelectTrigger className="mt-1.5"><SelectValue placeholder="Select"/></SelectTrigger>
                  <SelectContent>{DEPARTMENTS.map(d=><SelectItem key={d} value={d}>{d}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Location</Label>
                <Select><SelectTrigger className="mt-1.5"><SelectValue placeholder="Select"/></SelectTrigger>
                  <SelectContent>{LOCATIONS.map(l=><SelectItem key={l} value={l}>{l}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button onClick={() => { toast.success("Employee added"); setCreateOpen(false); }}>Create</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!confirmDelete} onOpenChange={(o) => !o && setConfirmDelete(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Delete {confirmDelete?.name}?</DialogTitle></DialogHeader>
          <div className="text-sm text-muted-foreground">This action cannot be undone. The employee record and all associated assignments will be archived.</div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmDelete(null)}>Cancel</Button>
            <Button variant="destructive" onClick={() => { toast.success("Employee archived"); setConfirmDelete(null); }}>Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
