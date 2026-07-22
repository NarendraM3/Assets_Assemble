import { useState, useEffect } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { PageHeader } from "@/components/common/PageHeader";
import { DataTable } from "@/components/common/DataTable";
import { StatusBadge } from "@/components/common/StatusBadge";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { Employee } from "@/types/domain";
import { DEPARTMENTS as MOCK_DEPARTMENTS } from "@/data/mock";
import { useData } from "@/contexts/data";
import {
  Plus,
  MoreHorizontal,
  Eye,
  Edit,
  Trash2,
  Mail,
  Phone,
  Calendar,
  Clock,
  CheckCircle2,
  AlertCircle,
  Laptop,
  Loader2,
  AlertTriangle,
  X,
  ChevronDown,
  Hourglass,
} from "lucide-react";
import { toast } from "sonner";
import { Combobox } from "@/components/ui/combobox";
import { cn } from "@/lib/utils";
import { WorkflowTimeline } from "@/components/common/WorkflowTimeline";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const REQUIRED_HARDWARE_OPTIONS = [
  "Laptop",
  "Desktop",
  "Monitor",
  "Keyboard",
  "Mouse",
  "Headset",
  "Printer",
  "Other",
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
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [customHardwareCategory, setCustomHardwareCategory] = useState("");
  const [hardwareCategoryError, setHardwareCategoryError] = useState("");
  const [isMultiSelectOpen, setIsMultiSelectOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [createdEmployeeEmail, setCreatedEmployeeEmail] = useState<string | null>(null);

  useEffect(() => {
    if (createdEmployeeEmail) {
      const emp = employees.find((e) => e.email === createdEmployeeEmail);
      if (emp && emp.allocationDate) {
        setSelected(emp);
        setCreatedEmployeeEmail(null);
      }
    }
  }, [employees, createdEmployeeEmail]);

  useEffect(() => {
    if (selected) {
      const updated = employees.find((e) => e.id === selected.id);
      if (updated && updated !== selected) {
        setSelected(updated);
      }
    }
  }, [employees]);

  const handleRoleChange = (value: string) => {
    setRole(value);
  };

  const handleCategoryToggle = (category: string) => {
    setSelectedCategories((prev) => {
      if (prev.includes(category)) {
        if (category === "Other") {
          setCustomHardwareCategory("");
          setHardwareCategoryError("");
        }
        return prev.filter((c) => c !== category);
      }
      return [...prev, category];
    });
    if (hardwareCategoryError) setHardwareCategoryError("");
  };

  const removeCategory = (category: string) => {
    setSelectedCategories((prev) => {
      if (category === "Other") {
        setCustomHardwareCategory("");
        setHardwareCategoryError("");
      }
      return prev.filter((c) => c !== category);
    });
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
    setSelectedCategories([]);
    setCustomHardwareCategory("");
    setHardwareCategoryError("");
    setCreateOpen(true);
  };

  const handleCreate = async () => {
    if (selectedCategories.includes("Other") && !customHardwareCategory.trim()) {
      setHardwareCategoryError("Please enter the hardware category name.");
      return;
    }

    const isFormValid =
      firstName.trim() &&
      lastName.trim() &&
      email.trim() &&
      department &&
      designation.trim() &&
      joiningDate &&
      allocationDate &&
      allocationTime &&
      selectedCategories.length > 0;

    if (!isFormValid) {
      toast.error("Please fill in all required fields.");
      return;
    }

    if (isSubmitting) return;
    setIsSubmitting(true);

    const normalizedRole = role.trim().replace(/\s+/g, " ");
    const finalHardwareCategory = selectedCategories.map((cat) =>
      cat === "Other" ? customHardwareCategory.trim() : cat,
    );

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
        requiredAssetCategory: finalHardwareCategory,
      };

      console.log("[Employee Registration] Request payload:", empData);

      const result = await addEmployee(empData);

      console.log("[Employee Registration] API response:", result);

      if (result?.Note?.toLowerCase().includes("email could not be sent")) {
        toast.success("Employee created successfully, but email could not be sent.");
      } else {
        toast.success(
          "Employee created successfully. Login credentials have been sent to the employee's registered email.",
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
      setSelectedCategories([]);
      setCustomHardwareCategory("");
      setHardwareCategoryError("");

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
        allocationStatus:
          normalizedRole === "Employee" ? ("Awaiting Asset Verification" as const) : undefined,
        requiredAssetCategory: finalHardwareCategory.join(", ") || "Laptop",
        allocationHistory:
          normalizedRole === "Employee"
            ? [
                {
                  step: "Employee Created",
                  timestamp: new Date().toLocaleString(),
                  actor: "System",
                },
              ]
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
    { id: "role", header: "Role", cell: ({ row }) => roleLabel(row.original.role ?? "") },
    {
      id: "name",
      header: "Name",
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <Avatar className="h-7 w-7">
            <AvatarFallback className="text-[10px] bg-primary/10 text-primary">
              {row.original.avatar}
            </AvatarFallback>
          </Avatar>
          <div>
            <div className="font-medium">{row.original.name}</div>
            <div className="text-xs text-muted-foreground">{row.original.email}</div>
          </div>
        </div>
      ),
    },
    { accessorKey: "department", header: "Department" },
    { accessorKey: "designation", header: "Designation" },
    {
      id: "workflow",
      header: "Workflow",
      cell: ({ row }) =>
        row.original.allocationStatus ? (
          <WorkflowTimeline allocationStatus={row.original.allocationStatus} variant="horizontal" />
        ) : (
          <span className="text-xs text-muted-foreground">—</span>
        ),
    },
    {
      id: "status",
      header: "Status",
      cell: ({ row }) => <StatusBadge status={row.original.status} />,
    },
    {
      id: "actions",
      header: "",
      cell: ({ row }) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={(e) => e.stopPropagation()}
            >
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => setSelected(row.original)}>
              <Eye className="h-4 w-4 mr-2" />
              View
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => toast.info("Edit not wired in demo")}>
              <Edit className="h-4 w-4 mr-2" />
              Edit
            </DropdownMenuItem>
            <DropdownMenuItem
              className="text-destructive"
              onClick={() => setConfirmDelete(row.original)}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
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
    selectedCategories.length > 0 &&
    (!selectedCategories.includes("Other") || customHardwareCategory.trim());

  return (
    <>
      <PageHeader
        title="Employees"
        description={`Directory of ${employees.length} employees across ${DEPARTMENTS.length} departments.`}
        actions={
          <Button onClick={handleOpenCreate}>
            <Plus className="h-4 w-4 mr-1" />
            Add Employee
          </Button>
        }
      />
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
            <Button variant="outline" size="sm" className="ml-auto" onClick={() => refreshData()}>
              Retry
            </Button>
          </div>
        )}

        <DataTable
          data={employees}
          columns={columns}
          searchPlaceholder="Search employees…"
          onRowClick={setSelected}
          pageSize={15}
          emptyMessage="No employees found."
        />
      </Card>

      <Sheet open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <SheetContent className="w-full sm:max-w-[900px] overflow-y-auto p-6 space-y-6">
          {selected &&
            (() => {
              const formatDateTime = (dt: string) => {
                if (!dt) return { date: "-", time: "-" };
                try {
                  const d = new Date(dt);
                  if (isNaN(d.getTime())) return { date: dt, time: "-" };
                  return {
                    date: d.toLocaleDateString("en-GB", {
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                    }),
                    time: d.toLocaleTimeString("en-US", {
                      hour: "2-digit",
                      minute: "2-digit",
                      hour12: true,
                    }),
                  };
                } catch {
                  return { date: dt, time: "-" };
                }
              };

              const allocatedAssets = (selected.allocatedAssets || []).map((aa) => {
                const fullAsset = assets.find((a) => a.assetId === aa.assetId);
                const dateStr =
                  selected.allocatedAssetDetails?.assignedAt || fullAsset?.assignedAt || "";
                const { date, time } = formatDateTime(dateStr);
                return {
                  assetId: aa.assetId,
                  assetName: aa.assetName,
                  category: aa.category,
                  brand: fullAsset?.brand || "-",
                  model: fullAsset?.model || "-",
                  serialNumber:
                    fullAsset?.serialNumber || selected.allocatedAssetDetails?.serialNumber || "-",
                  allocatedBy:
                    selected.allocatedAssetDetails?.assignedBy || fullAsset?.createdBy || "-",
                  allocationDate: date,
                  allocationTime: time,
                };
              });

              const pendingAssets = (selected.pendingAssets || []).map((p) => ({
                assetName: p.category,
                category: p.category,
                currentStatus: p.status || "Pending Allocation",
              }));

              const requiredCategories = (selected.requiredAssetCategory || "")
                .split(",")
                .map((c) => c.trim())
                .filter(Boolean);

              const allocatedCatSet = new Set(
                (selected.allocatedAssets || []).map((a) => a.category),
              );
              const pendingCatSet = new Set((selected.pendingAssets || []).map((p) => p.category));

              const isOutOfStock =
                selected.allocationStatus === "Out of Stock" ||
                selected.verificationStatus === "Out of Stock";

              const outOfStockCats = isOutOfStock
                ? requiredCategories.filter((c) => !allocatedCatSet.has(c) && !pendingCatSet.has(c))
                : [];

              const outOfStockAssets = outOfStockCats.map((cat) => {
                const oosAsset = assets.find(
                  (a) => a.status === "Out of Stock" && a.category === cat,
                );
                return {
                  assetName: oosAsset?.assetName || cat,
                  category: cat,
                  status: "Out of Stock",
                  remarks: oosAsset?.condition || "Currently unavailable",
                };
              });

              const allocatedCount = allocatedAssets.length;
              const pendingCount = pendingAssets.length;
              const outOfStockCount = outOfStockAssets.length;

              return (
                <>
                  <SheetHeader className="p-0 mb-2">
                    <SheetTitle className="text-xl">View Details</SheetTitle>
                  </SheetHeader>

                  {/* Summary Cards */}
                  <div className="grid grid-cols-3 gap-4">
                    <Card className="p-4 border-success/30 bg-success/5">
                      <div className="text-2xl font-bold text-success">{allocatedCount}</div>
                      <div className="text-sm text-muted-foreground">Allocated Assets</div>
                    </Card>
                    <Card className="p-4 border-amber-300 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-800">
                      <div className="text-2xl font-bold text-amber-600 dark:text-amber-400">
                        {pendingCount}
                      </div>
                      <div className="text-sm text-muted-foreground">Pending Assets</div>
                    </Card>
                    <Card className="p-4 border-red-300 bg-red-50 dark:bg-red-950/20 dark:border-red-800">
                      <div className="text-2xl font-bold text-red-600 dark:text-red-400">
                        {outOfStockCount}
                      </div>
                      <div className="text-sm text-muted-foreground">Out of Stock</div>
                    </Card>
                  </div>

                  {/* Employee Information */}
                  <Card className="p-4">
                    <div className="font-semibold text-sm mb-3">Employee Information</div>
                    <div className="flex items-center gap-4 mb-4">
                      <Avatar className="h-12 w-12">
                        <AvatarFallback className="bg-primary text-primary-foreground">
                          {selected.avatar}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="font-semibold text-base">{selected.name}</div>
                        <div className="text-sm text-muted-foreground">
                          {selected.designation} &bull; {selected.department}
                        </div>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-y-2 text-sm">
                      <span className="text-muted-foreground">Employee ID</span>
                      <span className="font-medium font-mono">{selected.id}</span>
                      <span className="text-muted-foreground">Employee Name</span>
                      <span className="font-medium">{selected.name}</span>
                      <span className="text-muted-foreground">Department</span>
                      <span className="font-medium">{selected.department}</span>
                      <span className="text-muted-foreground">Joining Date</span>
                      <span className="font-medium">{selected.joinDate}</span>
                      <span className="text-muted-foreground">Workflow Status</span>
                      <span>
                        <StatusBadge status={selected.allocationStatus || "Pending"} />
                      </span>
                      <span className="text-muted-foreground">Verification Status</span>
                      <span>
                        <StatusBadge status={selected.verificationStatus || "Pending"} />
                      </span>
                    </div>
                  </Card>

                  {/* Allocated Assets */}
                  <Card className="p-4 border-success/20 bg-success/5">
                    <div className="font-semibold text-sm mb-3 text-success flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full bg-success shrink-0" />
                      Allocated Assets
                    </div>
                    {allocatedAssets.length > 0 ? (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Asset ID</TableHead>
                            <TableHead>Asset Name</TableHead>
                            <TableHead>Category</TableHead>
                            <TableHead>Brand</TableHead>
                            <TableHead>Model</TableHead>
                            <TableHead>Serial Number</TableHead>
                            <TableHead>Allocated By</TableHead>
                            <TableHead>Allocation Date</TableHead>
                            <TableHead>Allocation Time</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {allocatedAssets.map((a, i) => (
                            <TableRow key={i}>
                              <TableCell className="font-mono text-xs whitespace-nowrap">
                                {a.assetId}
                              </TableCell>
                              <TableCell className="font-medium whitespace-nowrap">
                                {a.assetName}
                              </TableCell>
                              <TableCell>{a.category}</TableCell>
                              <TableCell>{a.brand}</TableCell>
                              <TableCell>{a.model}</TableCell>
                              <TableCell className="font-mono text-xs">{a.serialNumber}</TableCell>
                              <TableCell>{a.allocatedBy}</TableCell>
                              <TableCell className="whitespace-nowrap">
                                {a.allocationDate}
                              </TableCell>
                              <TableCell className="whitespace-nowrap">
                                {a.allocationTime}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    ) : (
                      <div className="text-sm text-muted-foreground italic">
                        No assets allocated.
                      </div>
                    )}
                  </Card>

                  {/* Pending Assets */}
                  <Card className="p-4 border-amber-200 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-800">
                    <div className="font-semibold text-sm mb-3 text-amber-600 dark:text-amber-400 flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full bg-amber-500 shrink-0" />
                      Pending Assets
                    </div>
                    {pendingAssets.length > 0 ? (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Asset Name</TableHead>
                            <TableHead>Category</TableHead>
                            <TableHead>Current Status</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {pendingAssets.map((p, i) => (
                            <TableRow key={i}>
                              <TableCell className="font-medium">{p.assetName}</TableCell>
                              <TableCell>{p.category}</TableCell>
                              <TableCell>
                                <Badge
                                  variant="outline"
                                  className="border-amber-300 text-amber-700 dark:text-amber-400"
                                >
                                  {p.currentStatus}
                                </Badge>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    ) : (
                      <div className="text-sm text-muted-foreground italic">No pending assets.</div>
                    )}
                  </Card>

                  {/* Out of Stock Assets */}
                  <Card className="p-4 border-red-200 bg-red-50 dark:bg-red-950/20 dark:border-red-800">
                    <div className="font-semibold text-sm mb-3 text-red-600 dark:text-red-400 flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full bg-red-500 shrink-0" />
                      Out of Stock Assets
                    </div>
                    {outOfStockAssets.length > 0 ? (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Asset Name</TableHead>
                            <TableHead>Category</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Remarks</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {outOfStockAssets.map((o, i) => (
                            <TableRow key={i}>
                              <TableCell className="font-medium">{o.assetName}</TableCell>
                              <TableCell>{o.category}</TableCell>
                              <TableCell>
                                <Badge
                                  variant="outline"
                                  className="border-red-300 text-red-700 dark:text-red-400"
                                >
                                  {o.status}
                                </Badge>
                              </TableCell>
                              <TableCell>{o.remarks}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    ) : (
                      <div className="text-sm text-muted-foreground italic">
                        No out-of-stock assets.
                      </div>
                    )}
                  </Card>

                  {/* Footer */}
                  <div className="flex justify-end pt-2">
                    <Button variant="outline" onClick={() => setSelected(null)}>
                      Close
                    </Button>
                  </div>
                </>
              );
            })()}
        </SheetContent>
      </Sheet>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle>Add Team Member</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-semibold">
                  First Name <span className="text-destructive">*</span>
                </Label>
                <Input
                  className="mt-1.5"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder="e.g. John"
                />
              </div>
              <div>
                <Label className="text-xs font-semibold">
                  Last Name <span className="text-destructive">*</span>
                </Label>
                <Input
                  className="mt-1.5"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  placeholder="e.g. Doe"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-semibold">
                  Email <span className="text-destructive">*</span>
                </Label>
                <Input
                  className="mt-1.5"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="e.g. john.doe@acmecorp.com"
                />
              </div>
              <div>
                <Label className="text-xs font-semibold">
                  Role <span className="text-destructive">*</span>
                </Label>
                <Select value={role} onValueChange={handleRoleChange}>
                  <SelectTrigger className="mt-1.5">
                    <SelectValue placeholder="Select Role" />
                  </SelectTrigger>
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
              <Label className="text-xs font-semibold">
                Department <span className="text-destructive">*</span>
              </Label>
              <Combobox
                options={DEPARTMENTS}
                value={department}
                onValueChange={setDepartment}
                placeholder="Select Department"
                className="mt-1.5"
              />
            </div>
            <div>
              <Label className="text-xs font-semibold">
                Designation <span className="text-destructive">*</span>
              </Label>
              <Input
                className="mt-1.5"
                value={designation}
                onChange={(e) => setDesignation(e.target.value)}
                placeholder="e.g. Software Engineer"
              />
            </div>
            <div>
              <Label className="text-xs font-semibold">
                Joining Date <span className="text-destructive">*</span>
              </Label>
              <Input
                className="mt-1.5 cursor-pointer"
                type="date"
                value={joiningDate}
                onChange={(e) => setJoiningDate(e.target.value)}
                placeholder="dd-mm-yyyy"
              />
            </div>

            <div className="border-t pt-3 mt-1 space-y-3">
              <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground block">
                Asset Onboarding Setup
              </span>

              <div>
                <Label className="text-xs font-semibold flex items-center gap-1">
                  <Laptop className="h-3 w-3 text-muted-foreground" /> Required Hardware Category{" "}
                  <span className="text-destructive">*</span>
                </Label>
                <Popover open={isMultiSelectOpen} onOpenChange={setIsMultiSelectOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      className="mt-1.5 w-full justify-between"
                    >
                      {selectedCategories.length > 0
                        ? `${selectedCategories.length} selected`
                        : "Select Required Categories"}
                      <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-full p-2">
                    {REQUIRED_HARDWARE_OPTIONS.map((category) => (
                      <label
                        key={category}
                        className="flex items-center gap-2 px-2 py-1.5 rounded-sm cursor-pointer hover:bg-accent text-sm"
                      >
                        <Checkbox
                          checked={selectedCategories.includes(category)}
                          onCheckedChange={() => handleCategoryToggle(category)}
                        />
                        {category}
                      </label>
                    ))}
                  </PopoverContent>
                </Popover>
                {selectedCategories.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {selectedCategories.map((cat) => (
                      <span
                        key={cat}
                        className="inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-xs font-medium bg-secondary text-secondary-foreground"
                      >
                        {cat}
                        <X className="h-3 w-3 cursor-pointer" onClick={() => removeCategory(cat)} />
                      </span>
                    ))}
                  </div>
                )}
                {selectedCategories.includes("Other") && (
                  <div className="mt-2">
                    <Label className="text-xs font-semibold">
                      Hardware Category Name <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      className="mt-1.5"
                      value={customHardwareCategory}
                      onChange={(e) => {
                        setCustomHardwareCategory(e.target.value);
                        if (hardwareCategoryError) setHardwareCategoryError("");
                      }}
                      placeholder="Enter hardware category"
                      autoFocus
                    />
                    {hardwareCategoryError && (
                      <p className="text-xs text-destructive mt-1">{hardwareCategoryError}</p>
                    )}
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs font-semibold flex items-center gap-1">
                    <Calendar className="h-3 w-3 text-muted-foreground" /> Allocation Date{" "}
                    <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    className="mt-1.5 cursor-pointer"
                    type="date"
                    value={allocationDate}
                    onChange={(e) => setAllocationDate(e.target.value)}
                  />
                </div>
                <div>
                  <Label className="text-xs font-semibold flex items-center gap-1">
                    <Clock className="h-3 w-3 text-muted-foreground" /> Allocation Time{" "}
                    <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    className="mt-1.5 cursor-pointer"
                    type="time"
                    value={allocationTime}
                    onChange={(e) => setAllocationTime(e.target.value)}
                  />
                </div>
              </div>
            </div>
          </div>
          <DialogFooter className="mt-2">
            <Button variant="outline" onClick={() => setCreateOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreate} disabled={!isFormValid || isSubmitting}>
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!confirmDelete} onOpenChange={(o) => !o && setConfirmDelete(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete {confirmDelete?.name}?</DialogTitle>
          </DialogHeader>
          <div className="text-sm text-muted-foreground">
            This action cannot be undone. The employee record and all associated assignments will be
            permanently deleted from the database.
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmDelete(null)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
