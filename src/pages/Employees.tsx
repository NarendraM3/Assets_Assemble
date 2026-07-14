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
import type { Employee } from "@/types/domain";
import { uniqueValues } from "@/lib/live-data";
import { DEPARTMENTS as MOCK_DEPARTMENTS, LOCATIONS as MOCK_LOCATIONS, CATEGORIES as MOCK_CATEGORIES } from "@/data/mock";
import { useData } from "@/contexts/data";
import { Plus, MoreHorizontal, Eye, Edit, Trash2, Mail, Phone, Calendar, Clock, CheckCircle2, AlertCircle, Laptop, Loader2, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export default function EmployeesPage() {
  const { employees, assets, addEmployee, deleteEmployee, refreshData, loading, error } = useData();
  const depts = uniqueValues(employees.map(e => e.department));
  const DEPARTMENTS = depts.length > 0 ? depts : MOCK_DEPARTMENTS;
  const locs = uniqueValues(employees.map(e => e.location));
  const LOCATIONS = locs.length > 0 ? locs : MOCK_LOCATIONS;
  const cats = uniqueValues(assets.map(a => a.category));
  const CATEGORIES = cats.length > 0 ? cats : MOCK_CATEGORIES;
  const [selected, setSelected] = useState<Employee | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<Employee | null>(null);

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("Employee");
  const [department, setDepartment] = useState("");
  const [location, setLocation] = useState("");
  const [allocationDate, setAllocationDate] = useState("");
  const [allocationTime, setAllocationTime] = useState("");
  const [requiredAssetCategory, setRequiredAssetCategory] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleRoleChange = (value: string) => {
    setRole(value);
  };

  const handleOpenCreate = () => {
    setFirstName("");
    setLastName("");
    setEmail("");
    setRole("Employee");
    setDepartment("");
    setLocation("");
    setAllocationDate("");
    setAllocationTime("");
    setRequiredAssetCategory("");
    setCreateOpen(true);
  };

  const handleCreate = async () => {
    const isFormValid =
      firstName.trim() &&
      lastName.trim() &&
      email.trim() &&
      department &&
      location &&
      (role !== "Employee" || (allocationDate && allocationTime && requiredAssetCategory));

    if (!isFormValid) {
      toast.error("Please fill in all required fields.");
      return;
    }

    if (isSubmitting) return;
    setIsSubmitting(true);

    const normalizedRole = role.trim().replace(/\s+/g, ' ');

    try {
      console.log("Selected Role:", normalizedRole);

      const empData = {
        name: `${firstName.trim()} ${lastName.trim()}`,
        email: email.trim(),
        role: normalizedRole,
        department,
        location,
        designation: normalizedRole === "IT Support Team" ? "IT Support Team" : normalizedRole === "Asset Manager" ? "Asset Manager" : normalizedRole === "Admin" ? "Administrator" : "Software Engineer",
        manager: "Aarav Sharma",
        phone: `+1 555-${String(1000 + Math.floor(Math.random() * 9000))}`,
        allocationDate: normalizedRole === "Employee" ? allocationDate : undefined,
        allocationTime: normalizedRole === "Employee" ? allocationTime : undefined,
        allocationStatus: normalizedRole === "Employee" ? "Awaiting Asset Verification" : undefined,
        requiredAssetCategory: normalizedRole === "Employee" ? requiredAssetCategory : undefined,
      };

      console.log("[Employee Registration] Request payload:", empData);

      const result = await addEmployee(empData);

      console.log("[Employee Registration] API response:", result);

      toast.success("Employee registered successfully.");

      if (result?.EmployeeId || result?.TemporaryPassword) {
        toast.info(
          `Employee ID: ${result.EmployeeId}\nTemporary Password: ${result.TemporaryPassword}` +
            (result.Note ? `\n${result.Note}` : ""),
          { duration: 15000 },
        );
      }

      setCreateOpen(false);
      setFirstName("");
      setLastName("");
      setEmail("");
      setRole("Employee");
      setDepartment("");
      setLocation("");
      setAllocationDate("");
      setAllocationTime("");
      setRequiredAssetCategory("");
    } catch (e: any) {
      console.error("[Employee Registration] Error:", e);
      const backendMsg = e.body?.message || e.body?.detail || e.body?.error || e.message || "";
      if (e.status === 401) {
        toast.error("Unauthorized. Please log in again.");
      } else if (e.status === 0) {
        toast.error("Unable to reach the server. Please check your connection and try again.");
      } else {
        toast.error(backendMsg || "Failed to add employee");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = () => {
    if (confirmDelete) {
      deleteEmployee(confirmDelete.id);
      toast.success("Employee deleted successfully");
      setConfirmDelete(null);
      if (selected?.id === confirmDelete.id) {
        setSelected(null);
      }
    }
  };

  const roleLabel = (r: string) => {
    const map: Record<string, string> = {
      employee: "Employee",
      it_support_team: "IT Support Team",
      asset_manager: "Asset Manager",
      admin: "Admin",
    };
    return map[r] ?? r;
  };

  const columns: ColumnDef<Employee>[] = [
    { accessorKey: "id", header: "Employee ID" },
    { id: "role", header: "Role", cell: ({row}) => roleLabel(row.original.role ?? "") },
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

  const isFormValid =
    firstName.trim() &&
    lastName.trim() &&
    email.trim() &&
    department &&
    location &&
    (role !== "employee" || (allocationDate && allocationTime && requiredAssetCategory));

  const renderTimeline = (employee: Employee) => {
    const steps = [
      { id: "Employee Created", label: "Employee Created" },
      { id: "Awaiting Asset Verification", label: "Awaiting Asset Verification" },
      { id: "Inventory Verified", label: "Inventory Verified" },
      { id: "Ready for Allocation", label: "Ready for Allocation" },
      { id: "Asset Assigned", label: "Asset Assigned" },
      { id: "Completed", label: "Completed" }
    ];

    return (
      <div className="relative border-l pl-6 space-y-5 ml-3 mt-4">
        {steps.map((step, idx) => {
          let historyItem = employee.allocationHistory?.find(h => h.step === step.id);
          let isDone = !!historyItem;
          let isWarning = false;
          let title = step.label;

          if (step.id === "Inventory Verified") {
            const waitItem = employee.allocationHistory?.find(h => h.step === "Waiting for Inventory");
            if (waitItem) {
              historyItem = waitItem;
              isDone = true;
              isWarning = true;
              title = "Waiting for Inventory";
            }
          }

          let isActive = false;
          if (!isDone) {
            if (step.id === "Inventory Verified" && employee.allocationStatus === "Awaiting Asset Verification") {
              isActive = true;
            } else if (step.id === "Ready for Allocation" && employee.allocationStatus === "Awaiting Asset Verification") {
              isActive = false;
            } else if (step.id === "Asset Assigned" && employee.allocationStatus === "Ready for Allocation") {
              isActive = true;
            } else if (step.id === "Completed" && employee.allocationStatus === "Ready for Allocation") {
              isActive = false;
            }
          }

          return (
            <div key={idx} className="relative">
              <span
                className={cn(
                  "absolute -left-[33px] top-0.5 h-4.5 w-4.5 rounded-full border-2 border-background grid place-items-center text-[9px] font-bold shadow-sm transition-all",
                  isDone && !isWarning && "bg-success text-success-foreground border-success",
                  isDone && isWarning && "bg-warning text-warning-foreground border-warning",
                  isActive && "bg-primary text-primary-foreground border-primary animate-pulse",
                  !isDone && !isActive && "bg-muted text-muted-foreground border-muted"
                )}
              >
                {isDone ? "✓" : isActive ? "▶" : ""}
              </span>
              <div>
                <div className={cn("text-xs font-semibold", isDone && "text-foreground", isActive && "text-primary", !isDone && !isActive && "text-muted-foreground")}>
                  {title}
                </div>
                {historyItem ? (
                  <div className="text-xs text-muted-foreground mt-0.5">
                    <div>{historyItem.remarks}</div>
                    <div className="text-[10px] opacity-70 mt-0.5">{historyItem.timestamp} • by {historyItem.actor}</div>
                  </div>
                ) : isActive ? (
                  <div className="text-xs text-primary/85 italic mt-0.5">Awaiting verification/allocation action…</div>
                ) : (
                  <div className="text-xs text-muted-foreground/40 mt-0.5">Pending previous steps</div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <>
      <PageHeader title="Employees" description={`Directory of ${employees.length} employees across ${DEPARTMENTS.length} departments.`}
        actions={<Button onClick={handleOpenCreate}><Plus className="h-4 w-4 mr-1"/>Add Employee</Button>}/>
      <Card className="p-4 relative">
        {loading && (
          <div className="absolute inset-0 bg-background/60 z-10 flex items-center justify-center rounded-lg">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        )}

        {error && !loading && (
          <div className="flex items-center gap-3 p-3 mb-3 rounded-lg border border-destructive/20 bg-destructive/5 text-destructive text-sm">
            <AlertTriangle className="h-5 w-5 shrink-0" />
            <span>{error}</span>
            <Button variant="outline" size="sm" className="ml-auto" onClick={() => refreshData()}>Retry</Button>
          </div>
        )}

        <DataTable data={employees} columns={columns} searchPlaceholder="Search employees…" onRowClick={setSelected} pageSize={15} emptyMessage="No employees found."/>
      </Card>

      <Sheet open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto p-6 space-y-4">
          {selected && (
            <>
              <SheetHeader className="p-0 mb-2 flex-row items-center gap-4">
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
              <Card className="p-4">
                <div className="font-semibold text-sm mb-3">Employment Details</div>
                <div className="grid grid-cols-2 gap-y-2 text-sm">
                  <span className="text-muted-foreground">Employee ID</span><span>{selected.id}</span>
                  <span className="text-muted-foreground">Manager</span><span>{selected.manager}</span>
                  <span className="text-muted-foreground">Location</span><span>{selected.location}</span>
                  <span className="text-muted-foreground">Join Date</span><span>{selected.joinDate}</span>
                  <span className="text-muted-foreground">Status</span><span><StatusBadge status={selected.status}/></span>
                </div>
              </Card>

              {selected.allocationStatus === "Completed" && selected.allocatedAssetDetails && (
                <Card className="p-4 border-success/20 bg-success/5">
                  <div className="font-semibold text-sm mb-3 text-success flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4" /> Allocated Asset Details
                  </div>
                  <div className="grid grid-cols-2 gap-y-2 text-sm">
                    <span className="text-muted-foreground">Asset Name</span>
                    <span className="font-medium">{selected.allocatedAssetDetails.assetName}</span>
                    <span className="text-muted-foreground">Asset ID</span>
                    <span className="font-mono font-medium">{selected.allocatedAssetDetails.assetId}</span>
                    <span className="text-muted-foreground">Serial Number</span>
                    <span className="font-mono">{selected.allocatedAssetDetails.serialNumber}</span>
                    <span className="text-muted-foreground">Assigned Date</span>
                    <span>{selected.allocatedAssetDetails.assignedAt}</span>
                    <span className="text-muted-foreground">Assigned By</span>
                    <span>{selected.allocatedAssetDetails.assignedBy}</span>
                    {selected.allocatedAssetDetails.remarks && (
                      <>
                        <span className="text-muted-foreground">Remarks</span>
                        <span className="italic">{selected.allocatedAssetDetails.remarks}</span>
                      </>
                    )}
                  </div>
                </Card>
              )}

              {selected.allocationDate && (
                <Card className="p-4 border-primary/10 bg-muted/30">
                  <div className="font-semibold text-sm text-primary flex items-center gap-2 border-b pb-2">
                    <Calendar className="h-4 w-4" /> Asset Onboarding Status
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-y-1.5 text-xs">
                    <span className="text-muted-foreground">Scheduled Date:</span>
                    <span className="font-medium text-foreground">{selected.allocationDate} @ {selected.allocationTime}</span>
                    <span className="text-muted-foreground">Required Category:</span>
                    <span className="font-semibold text-primary">{selected.requiredAssetCategory || "Laptop"}</span>
                    <span className="text-muted-foreground">Current Workflow State:</span>
                    <span><StatusBadge status={selected.allocationStatus ?? "Awaiting Asset Verification"}/></span>
                  </div>

                  {renderTimeline(selected)}
                </Card>
              )}
            </>
          )}
        </SheetContent>
      </Sheet>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader><DialogTitle>Add Team Member</DialogTitle></DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-semibold">First Name <span className="text-destructive">*</span></Label>
                <Input className="mt-1.5" value={firstName} onChange={e => setFirstName(e.target.value)} placeholder="e.g. John"/>
              </div>
              <div>
                <Label className="text-xs font-semibold">Last Name <span className="text-destructive">*</span></Label>
                <Input className="mt-1.5" value={lastName} onChange={e => setLastName(e.target.value)} placeholder="e.g. Doe"/>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-semibold">Email <span className="text-destructive">*</span></Label>
                <Input className="mt-1.5" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="e.g. john.doe@acmecorp.com"/>
              </div>
              <div>
                <Label className="text-xs font-semibold">Role <span className="text-destructive">*</span></Label>
                <Select value={role} onValueChange={handleRoleChange}>
                  <SelectTrigger className="mt-1.5"><SelectValue placeholder="Select Role"/></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Employee">Employee</SelectItem>
                    <SelectItem value="IT Support Team">IT Support Team</SelectItem>
                    <SelectItem value="Asset Manager">Asset Manager</SelectItem>
                    <SelectItem value="Admin">Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-semibold">Department <span className="text-destructive">*</span></Label>
                <Select value={department} onValueChange={setDepartment}>
                  <SelectTrigger className="mt-1.5"><SelectValue placeholder="Select"/></SelectTrigger>
                  <SelectContent>{DEPARTMENTS.map(d=><SelectItem key={d} value={d}>{d}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs font-semibold">Location <span className="text-destructive">*</span></Label>
                <Select value={location} onValueChange={setLocation}>
                  <SelectTrigger className="mt-1.5"><SelectValue placeholder="Select"/></SelectTrigger>
                  <SelectContent>{LOCATIONS.map(l=><SelectItem key={l} value={l}>{l}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>

            <div className="border-t pt-3 mt-1 space-y-3">
              <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground block">Asset Onboarding Setup</span>

              <div>
                <Label className="text-xs font-semibold flex items-center gap-1">
                  <Laptop className="h-3 w-3 text-muted-foreground" /> Required Hardware Category <span className="text-destructive">*</span>
                </Label>
                <Select value={requiredAssetCategory} onValueChange={setRequiredAssetCategory}>
                  <SelectTrigger className="mt-1.5"><SelectValue placeholder="Select Required Category"/></SelectTrigger>
                  <SelectContent>{CATEGORIES.map(c=><SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs font-semibold flex items-center gap-1">
                    <Calendar className="h-3 w-3 text-muted-foreground" /> Allocation Date <span className="text-destructive">*</span>
                  </Label>
                  <Input className="mt-1.5 cursor-pointer" type="date" value={allocationDate} onChange={e => setAllocationDate(e.target.value)}/>
                </div>
                <div>
                  <Label className="text-xs font-semibold flex items-center gap-1">
                    <Clock className="h-3 w-3 text-muted-foreground" /> Allocation Time <span className="text-destructive">*</span>
                  </Label>
                  <Input className="mt-1.5 cursor-pointer" type="time" value={allocationTime} onChange={e => setAllocationTime(e.target.value)}/>
                </div>
              </div>
            </div>
          </div>
          <DialogFooter className="mt-2">
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button onClick={handleCreate} disabled={!isFormValid || isSubmitting}>Create</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!confirmDelete} onOpenChange={(o) => !o && setConfirmDelete(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Delete {confirmDelete?.name}?</DialogTitle></DialogHeader>
          <div className="text-sm text-muted-foreground">This action cannot be undone. The employee record and all associated assignments will be permanently deleted from the database.</div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmDelete(null)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDelete}>Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
