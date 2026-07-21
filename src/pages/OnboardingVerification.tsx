import { useState, useMemo, useEffect, useCallback } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { PageHeader } from "@/components/common/PageHeader";
import { DataTable } from "@/components/common/DataTable";
import { StatusBadge } from "@/components/common/StatusBadge";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { useData } from "@/contexts/data";
import { apiFetch, BASE_URL } from "@/services/api";

import type { Employee } from "@/types/domain";
import { toast } from "sonner";
import { WorkflowTimeline, getWorkflowStageLabel, getStatusDisplayLabel } from "@/components/common/WorkflowTimeline";
import { ClipboardList, CheckCircle2, AlertCircle, Loader2, Mail, Phone, Calendar } from "lucide-react";

export default function OnboardingVerificationPage() {
  const { employees, verifyOnboardingAsset, outOfStockOnboarding, refreshData } = useData();

  const [rawPending, setRawPending] = useState<any[]>([]);
  const [pendingLoading, setPendingLoading] = useState(true);
  const [reviewingEmployee, setReviewingEmployee] = useState<Employee | null>(null);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [remarks, setRemarks] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [inventoryCheck, setInventoryCheck] = useState<{ available: boolean; count: number; assets: any[] } | null>(null);
  const [inventoryLoading, setInventoryLoading] = useState(false);
  const [inventoryVerified, setInventoryVerified] = useState(false);
  const [inventoryAvailable, setInventoryAvailable] = useState(false);
  const [selectedAsset, setSelectedAsset] = useState<any>(null);
  const [verificationError, setVerificationError] = useState<string | null>(null);

  const fetchPending = useCallback(async () => {
    setPendingLoading(true);
    try {
      const apiUrl = `${BASE_URL}/asset-manager/onboarding/pending`;
      console.log("[OnboardingVerification] Final request URL:", apiUrl);

      console.log("[OnboardingVerification] Fetching from /asset-manager/onboarding/pending");
      const response = await apiFetch<any>("/asset-manager/onboarding/pending");

      console.log("[OnboardingVerification] Response status: 200");
      console.log("Raw response", response);

      const items =
        response?.employees ??
        response?.data?.employees ??
        response?.data ??
        [];

      console.log("Employees received:", items.length);

      setRawPending(prev => {
        const merged = new Map(prev.map(r => [r.EmployeeId || r.employeeId, r]));
        for (const item of items) {
          merged.set(item.EmployeeId || item.employeeId, item);
        }
        return Array.from(merged.values());
      });
    } catch (err: any) {
      console.error("[OnboardingVerification] Error fetching pending employees:", err);
      toast.error("Failed to load pending onboarding employees");
    } finally {
      setPendingLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPending();
  }, [fetchPending]);

  const pendingEmployees: Employee[] = useMemo(() => {
    const allItems = [...rawPending];
    const rawIds = new Set(allItems.map(r => r.EmployeeId || r.employeeId));

    for (const emp of employees) {
      if (
        !rawIds.has(emp.id) &&
        (emp.allocationStatus === "Awaiting Asset Verification" ||
         emp.allocationStatus === "Sent to IT Support Team" ||
         emp.allocationStatus === "Ready for Allocation" ||
         emp.allocationStatus === "Waiting for Inventory" ||
         emp.allocationStatus === "Out of Stock" ||
         !emp.allocationStatus)
      ) {
        allItems.push({
          EmployeeId: emp.id,
          EmployeeName: emp.name,
          Department: emp.department,
          Location: emp.location,
          Status: emp.status,
          JoinDate: emp.joinDate,
          AllocationDate: emp.allocationDate,
          AllocationTime: emp.allocationTime,
          RequiredHardwareCategory: emp.requiredAssetCategory,
          VerificationStatus: emp.verificationStatus ?? "",
        });
      }
    }

    return allItems.map((emp: any) => {
      const employee = employees.find(
        (e: any) =>
          e.id === emp.EmployeeId ||
          e.uuid === emp.EmployeeId ||
          e.employeeId === emp.EmployeeId
      );

      const employeeName =
        emp.EmployeeName ||
        emp.employeeName ||
        emp.Name ||
        emp.name ||
        (emp.FirstName && emp.LastName
          ? `${emp.FirstName} ${emp.LastName}`
          : employee?.name || "-");

      return {
        id: emp.EmployeeId,
        uuid: emp.EmployeeId,
        employeeId: emp.EmployeeId,
        name: employeeName,
        firstName: emp.FirstName,
        lastName: emp.LastName,
        email: emp.Email,
        role: emp.Role as Employee["role"],
        department: emp.Department,
        designation: employee?.designation || "",
        location: emp.Location,
        status: emp.Status || "Active",
        avatar: employee?.avatar || "",
        phone: employee?.phone || "",
        requiredAssetCategory: emp.RequiredHardwareCategory || emp.requiredAssetCategory,
        requiredHardwareCategory: emp.RequiredHardwareCategory,
        joinDate: emp.JoinDate || emp.joinDate,
        allocationDate: emp.AllocationDate || emp.allocationDate,
        allocationTime: emp.AllocationTime || emp.allocationTime,
        allocationStatus: emp.AllocationStatus || emp.allocationStatus || employee?.allocationStatus,
        verificationStatus: (emp.VerificationStatus ?? emp.verificationStatus ?? "") as Employee["verificationStatus"],
        currentWorkflowState: emp.CurrentWorkflowState ?? emp.currentWorkflowState ?? "",
        createdAt: emp.CreatedAt,
      } as unknown as Employee;
    });
  }, [rawPending, employees]);

  const hasAssetId = !!(selectedAsset?.AssetId || selectedAsset?.assetId);
  const disabled = !inventoryVerified || !inventoryAvailable || !hasAssetId || !!verificationError || inventoryLoading || submitting;
  console.log({
    inventoryVerified,
    inventoryAvailable,
    selectedAsset,
    hasAssetId,
    remarks,
    disabled
  });

  const fetchInventoryCheck = useCallback(async (employee: Employee) => {
    setInventoryLoading(true);
    setInventoryCheck(null);
    setInventoryVerified(false);
    setInventoryAvailable(false);
    setSelectedAsset(null);
    setVerificationError(null);
    try {
      const response = await apiFetch<any>(`/asset-manager/onboarding/check-inventory/${employee.id}`);
      console.log("Inventory API response", response);
      console.log("Matching asset count", response?.count ?? 0);
      const available = response?.available ?? false;
      const asset = response?.assets?.[0] ?? null;
      setInventoryCheck(response);
      setInventoryVerified(true);
      setInventoryAvailable(available);
      setSelectedAsset(asset);
    } catch (err: any) {
      console.error("Inventory check API error", err);
      setInventoryCheck(null);
      setInventoryVerified(false);
      setInventoryAvailable(false);
      setSelectedAsset(null);
      setVerificationError(err.message || "Inventory check failed");
    } finally {
      setInventoryLoading(false);
    }
  }, []);

  const handleOpenVerifyDialog = (emp: Employee) => {
    setReviewingEmployee(emp);
    setRemarks("");
    setInventoryCheck(null);
    setInventoryVerified(false);
    setInventoryAvailable(false);
    setSelectedAsset(null);
    setVerificationError(null);
    fetchInventoryCheck(emp);
  };

  const handleVerifySubmit = async (approved: boolean) => {
    if (!reviewingEmployee || submitting) return;
    setSubmitting(true);
    try {
      if (approved && !(selectedAsset?.AssetId || selectedAsset?.assetId)) {
        toast.error("No asset selected for verification. Please check inventory first.");
        return;
      }

      if (approved) {
        console.log("Submitting verification for:", reviewingEmployee.id);
        await verifyOnboardingAsset(
          reviewingEmployee.id,
          "Verified",
          selectedAsset,
          remarks
        );
      } else {
        await outOfStockOnboarding(
          reviewingEmployee.id,
          remarks
        );
      }
      await refreshData();
      await fetchPending();
      setReviewingEmployee(null);
    } catch (err: any) {
      console.error("Verification submit error:", err);
      const backendMsg = err?.body?.data?.error || err?.body?.error || err?.body?.detail || err?.body?.message;
      const errorDetails = err?.body ? JSON.stringify(err.body) : "";
      toast.error(backendMsg || err.message || "Verification failed" + (errorDetails ? ` — ${errorDetails}` : ""));
    } finally {
      setSubmitting(false);
    }
  };

  const columns: ColumnDef<Employee>[] = [
    { accessorKey: "employeeId", header: "Employee ID" },
    { accessorKey: "name", header: "Employee Name" },
    { accessorKey: "department", header: "Department" },
    { accessorKey: "requiredAssetCategory", header: "Required Hardware", cell: ({row}) => <span className="font-semibold text-primary">{row.original.requiredAssetCategory || "Laptop"}</span> },
    { accessorKey: "status", header: "Status" },
    { accessorKey: "joinDate", header: "Joining Date" },
    { id: "schedule", header: "Allocation Schedule", cell: ({row}) => `${row.original.allocationDate || "Not set"} @ ${row.original.allocationTime || "Not set"}` },
    {
      id: "verificationStatus",
      header: "Verification Status",
      cell: ({row}) => <StatusBadge status={row.original.verificationStatus ?? "Pending"}/>,
    },
    {
      id: "workflowState",
      header: "Current Workflow State",
      cell: ({row}) => {
        const emp = row.original as any;
        const cwf = emp.currentWorkflowState || "";
        const status = cwf
          ? getStatusDisplayLabel(emp.allocationStatus, { currentWorkflowState: cwf, verificationStatus: emp.verificationStatus })
          : getStatusDisplayLabel(emp.allocationStatus);
        return <StatusBadge status={status} />;
      },
    },
    {
      id: "actions",
      header: "",
      cell: ({row}) => {
        const vs = row.original.verificationStatus;
        const isPending = vs === "Pending" || !vs;
        return (
          <Button size="sm" variant="outline" disabled={!isPending} onClick={(e) => { e.stopPropagation(); handleOpenVerifyDialog(row.original); }}>
            Verify Inventory
          </Button>
        );
      },
    },
  ];

  if (pendingLoading) {
    return (
      <>
        <PageHeader
          title="Employee Onboarding Verification"
          description="Verify hardware inventory availability and approve new hire onboarding allocations."
        />
        <Card className="p-4 flex items-center justify-center min-h-[200px]">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
            <span>Loading pending onboarding employees...</span>
          </div>
        </Card>
      </>
    );
  }

  return (
    <>
      <PageHeader
        title="Employee Onboarding Verification"
        description="Verify hardware inventory availability and approve new hire onboarding allocations."
      />

      <Card className="p-4">
        <DataTable
          data={pendingEmployees}
          columns={columns}
          searchPlaceholder="Search verification queue…"
          pageSize={15}
          onRowClick={setSelectedEmployee}
        />
      </Card>

      <Sheet open={!!selectedEmployee} onOpenChange={(o) => !o && setSelectedEmployee(null)}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto p-6 space-y-4">
          {selectedEmployee && (() => {
            const fullEmp = employees.find(e => e.id === selectedEmployee.id) || selectedEmployee;
            return (
              <>
                <SheetHeader className="p-0 mb-2 flex-row items-center gap-4">
                  <Avatar className="h-16 w-16"><AvatarFallback className="bg-primary text-primary-foreground text-lg">{fullEmp.avatar}</AvatarFallback></Avatar>
                  <div>
                    <SheetTitle className="text-xl">{fullEmp.name}</SheetTitle>
                    <div className="text-sm text-muted-foreground">{fullEmp.designation} • {fullEmp.department}</div>
                  </div>
                </SheetHeader>
                <Card className="p-4 space-y-2 text-sm">
                  <div className="flex items-center gap-2"><Mail className="h-4 w-4 text-muted-foreground"/>{fullEmp.email}</div>
                  <div className="flex items-center gap-2"><Phone className="h-4 w-4 text-muted-foreground"/>{fullEmp.phone || "—"}</div>
                </Card>
                <Card className="p-4">
                  <div className="font-semibold text-sm mb-3">Employment Details</div>
                  <div className="grid grid-cols-2 gap-y-2 text-sm">
                    <span className="text-muted-foreground">Employee ID</span><span>{fullEmp.id}</span>
                    <span className="text-muted-foreground">Department</span><span>{fullEmp.department}</span>
                    <span className="text-muted-foreground">Joining Date</span><span>{fullEmp.joinDate}</span>
                    <span className="text-muted-foreground">Required Hardware Category</span><span className="font-semibold text-primary">{fullEmp.requiredAssetCategory || "Laptop"}</span>
                    <span className="text-muted-foreground">Current Status</span><span><StatusBadge status={fullEmp.status}/></span>
                  </div>
                </Card>
                <Card className="p-4 border-primary/10 bg-muted/30">
                  <div className="font-semibold text-sm text-primary flex items-center gap-2 border-b pb-2">
                    <Calendar className="h-4 w-4" /> Asset Onboarding Status
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-y-1.5 text-xs">
                    <span className="text-muted-foreground">Scheduled Date:</span>
                    <span className="font-medium text-foreground">{fullEmp.allocationDate || "TBD"}{fullEmp.allocationDate && fullEmp.allocationTime ? ` @ ${fullEmp.allocationTime}` : ""}</span>
                    <span className="text-muted-foreground">Required Category:</span>
                    <span className="font-semibold text-primary">{fullEmp.requiredAssetCategory || "Laptop"}</span>
                    <span className="text-muted-foreground">Current Stage:</span>
                    <span className="font-medium text-foreground">{getWorkflowStageLabel(fullEmp.allocationStatus)}</span>
                  </div>
                  <WorkflowTimeline allocationStatus={fullEmp.allocationStatus} />
                </Card>
              </>
            );
          })()}
        </SheetContent>
      </Sheet>

      <Dialog open={!!reviewingEmployee} onOpenChange={(o) => !o && setReviewingEmployee(null)}>
        <DialogContent className="sm:max-w-[560px] rounded-xl p-0 gap-0 max-h-[90vh] overflow-y-auto">
          <DialogHeader className="p-6 pb-2 shrink-0">
            <DialogTitle className="flex items-center gap-2">
              <ClipboardList className="h-5 w-5 text-primary" /> Onboarding Inventory Check
            </DialogTitle>
            <DialogDescription>
              Verify stock levels in the employee's designated office location.
            </DialogDescription>
          </DialogHeader>

          {reviewingEmployee && (
            <>
              <div className="px-6 py-4 space-y-4 text-sm">
                <div className="grid grid-cols-2 gap-y-2 border-b pb-3">
                  <span className="text-muted-foreground">Employee Name</span>
                  <span className="font-semibold text-foreground">{reviewingEmployee.name}</span>
                  <span className="text-muted-foreground">Office Location</span>
                  <span className="font-medium text-foreground">{reviewingEmployee.location}</span>
                  <span className="text-muted-foreground">Required Category</span>
                  <span className="font-semibold text-primary">{reviewingEmployee.requiredAssetCategory || "Laptop"}</span>
                </div>

                <div className="p-4 rounded-lg border">
                  {verificationError ? (
                    <div className="space-y-1">
                      <div className="text-destructive font-semibold flex items-center gap-1.5">
                        <AlertCircle className="h-4.5 w-4.5" /> Inventory Check Failed
                      </div>
                      <div className="text-xs text-destructive/80">
                        {verificationError}
                      </div>
                    </div>
                  ) : inventoryLoading ? (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Checking inventory...</span>
                    </div>
                  ) : inventoryCheck?.available ? (
                    <div className="space-y-3">
                      <div className="text-success font-semibold flex items-center gap-1.5">
                        <CheckCircle2 className="h-4.5 w-4.5" /> In Stock
                      </div>
                      <div className="text-xs text-muted-foreground font-medium">Available Assets: {inventoryCheck.count}</div>
                      <div className="text-xs text-muted-foreground">
                        {inventoryCheck.count} matching assets are available for allocation.
                      </div>
                    </div>
                  ) : !inventoryLoading && inventoryCheck !== null && !inventoryCheck.available ? (
                    <div className="space-y-1">
                      <div className="text-destructive font-semibold flex items-center gap-1.5">
                        <AlertCircle className="h-4.5 w-4.5" /> Out of Stock
                      </div>
                      <div className="text-xs text-muted-foreground font-medium">Available Assets: 0</div>
                      <div className="text-xs text-muted-foreground">
                        No matching assets are available for allocation.
                      </div>
                    </div>
                  ) : null}
                </div>

                <div>
                  <Label className="text-xs font-semibold">Verification Remarks / Notes</Label>
                  <Input
                    className="mt-1.5 text-sm"
                    placeholder="e.g. Verified local stock. Approved Dell Latitude allocation."
                    value={remarks}
                    onChange={e => setRemarks(e.target.value)}
                  />
                </div>
              </div>

              <div className="shrink-0 border-t p-6 bg-background flex items-center gap-2">
                <Button variant="outline" onClick={() => setReviewingEmployee(null)} disabled={submitting}>
                  Cancel
                </Button>
                <div className="flex-1 flex justify-center">
                  <Button
                    variant="destructive"
                    onClick={() => handleVerifySubmit(false)}
                    disabled={submitting}
                  >
                    {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
                    Flag Out of Stock
                  </Button>
                </div>
                <Button
                  onClick={() => handleVerifySubmit(true)}
                  disabled={disabled}
                >
                  {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
                  Verify & Approve
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}