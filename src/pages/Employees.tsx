import { useState, useEffect } from "react";
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
import { DEPARTMENTS as MOCK_DEPARTMENTS } from "@/data/mock";
import { useData } from "@/contexts/data";
import { Plus, MoreHorizontal, Eye, Edit, Trash2, Mail, Phone, Calendar, Clock, CheckCircle2, AlertCircle, Laptop, Loader2, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { Combobox } from "@/components/ui/combobox";
import { cn } from "@/lib/utils";
import { WorkflowTimeline, getWorkflowStageLabel } from "@/components/common/WorkflowTimeline";

const REQUIRED_HARDWARE_OPTIONS = [
  "Laptop", "Desktop", "Monitor", "Keyboard", "Mouse",
  "Headset", "Printer", "Other",
];

export default function EmployeesPage() {
  const { employees, assets, addEmployee, deleteEmployee, refreshData, loading, error } = useData();
  const DEPARTMENTS = MOCK_DEPARTMENTS;
  const [selected, setSelected] = useState<Employee | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<Employee | null>(null);

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("Employee");
  const [department, setDepartment] = useState("");
  const [designation, setDesignation] = useState("");
  const [joiningDate, setJoiningDate] = useState("");
  const [allocationDate, setAllocationDate] = useState("");
  const [allocationTime, setAllocationTime] = useState("");
  const [requiredAssetCategory, setRequiredAssetCategory] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [createdEmployeeEmail, setCreatedEmployeeEmail] = useState<string | null>(null);

  useEffect(() => {
    if (createdEmployeeEmail) {
      const emp = employees.find(e => e.email === createdEmployeeEmail);
      if (emp && emp.allocationDate) {
        setSelected(emp);
        setCreatedEmployeeEmail(null);
      }
    }
  }, [employees, createdEmployeeEmail]);

  useEffect(() => {
    if (selected) {
      const updated = employees.find(e => e.id === selected.id);
      if (updated && updated !== selected) {
        setSelected(updated);
      }
    }
  }, [employees]);

  const handleRoleChange = (value: string) => {
    setRole(value);
  };

  const handleOpenCreate = () => {
    setFirstName("");
    setLastName("");
    setEmail("");
    setRole("Employee");
    setDepartment("");
    setDesignation("");
    setJoiningDate("");
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
      designation.trim() &&
      joiningDate &&
      allocationDate &&
      allocationTime &&
      requiredAssetCategory;

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
        designation: designation.trim(),
        joiningDate,
        phone: `+1 555-${String(1000 + Math.floor(Math.random() * 9000))}`,
        allocationDate,
        allocationTime,
        allocationStatus: normalizedRole === "Employee" ? "Awaiting Asset Verification" : undefined,
        requiredAssetCategory,
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
      setAllocationDate("");
      setAllocationTime("");
      setRequiredAssetCategory("");

      const tempEmp: Employee = {
        id: result.EmployeeId || "",
        uuid: result.EmployeeId || "",
        name: `${firstName.trim()} ${lastName.trim()}`,
        email: email.trim(),
        role: normalizedRole as Employee["role"],
        department,
        designation: designation.trim(),
        location: "",
        status: "Active",
        avatar: (firstName.trim()[0] + lastName.trim()[0]).toUpperCase(),
        phone: empData.phone,
        joinDate: joiningDate,
        allocationDate,
        allocationTime,
        allocationStatus: normalizedRole === "Employee" ? "Awaiting Asset Verification" as const : undefined,
        requiredAssetCategory: requiredAssetCategory || "Laptop",
        allocationHistory: normalizedRole === "Employee"
          ? [{ step: "Employee Created", timestamp: new Date().toLocaleString(), actor: "System" }]
          : undefined,
      };
      setSelected(tempEmp);
      setCreatedEmployeeEmail(email.trim());
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
    { id: "workflow", header: "Workflow", cell: ({row}) => row.original.allocationStatus ? <WorkflowTimeline allocationStatus={row.original.allocationStatus} variant="horizontal" /> : <span className="text-xs text-muted-foreground">—</span> },
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
    designation.trim() &&
    joiningDate &&
    allocationDate &&
    allocationTime &&
    requiredAssetCategory;

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

              <Card className="p-4 border-primary/10 bg-muted/30">
                <div className="font-semibold text-sm text-primary flex items-center gap-2 border-b pb-2">
                  <Calendar className="h-4 w-4" /> Asset Onboarding Status
                </div>
                <div className="mt-3 grid grid-cols-2 gap-y-1.5 text-xs">
                  <span className="text-muted-foreground">Scheduled Date:</span>
                  <span className="font-medium text-foreground">{selected.allocationDate || "TBD"}{selected.allocationDate && selected.allocationTime ? ` @ ${selected.allocationTime}` : ""}</span>
                  <span className="text-muted-foreground">Required Category:</span>
                  <span className="font-semibold text-primary">{selected.requiredAssetCategory || "Laptop"}</span>
                  <span className="text-muted-foreground">Current Stage:</span>
                  <span className="font-medium text-foreground">{getWorkflowStageLabel(selected.allocationStatus)}</span>
                </div>

                <WorkflowTimeline allocationStatus={selected.allocationStatus} />
              </Card>
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
            <div>
              <Label className="text-xs font-semibold">Department <span className="text-destructive">*</span></Label>
              <Combobox
                options={DEPARTMENTS}
                value={department}
                onValueChange={setDepartment}
                placeholder="Select Department"
                className="mt-1.5"
              />
            </div>
            <div>
              <Label className="text-xs font-semibold">Designation <span className="text-destructive">*</span></Label>
              <Input className="mt-1.5" value={designation} onChange={e => setDesignation(e.target.value)} placeholder="e.g. Software Engineer"/>
            </div>
            <div>
              <Label className="text-xs font-semibold">Joining Date <span className="text-destructive">*</span></Label>
              <Input className="mt-1.5 cursor-pointer" type="date" value={joiningDate} onChange={e => setJoiningDate(e.target.value)} placeholder="dd-mm-yyyy"/>
            </div>

            <div className="border-t pt-3 mt-1 space-y-3">
              <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground block">Asset Onboarding Setup</span>

              <div>
                <Label className="text-xs font-semibold flex items-center gap-1">
                  <Laptop className="h-3 w-3 text-muted-foreground" /> Required Hardware Category <span className="text-destructive">*</span>
                </Label>
                <Select value={requiredAssetCategory} onValueChange={setRequiredAssetCategory}>
                  <SelectTrigger className="mt-1.5"><SelectValue placeholder="Select Required Category"/></SelectTrigger>
                  <SelectContent>{REQUIRED_HARDWARE_OPTIONS.map(c=><SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
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
