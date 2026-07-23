import { useState, useMemo, useEffect, useCallback } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { PageHeader } from "@/components/common/PageHeader";
import { DataTable } from "@/components/common/DataTable";
import { StatusBadge } from "@/components/common/StatusBadge";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { useData } from "@/contexts/data";
import { HardwareCategoryBadges } from "@/components/common/HardwareCategoryBadges";
import { apiFetch, BASE_URL } from "@/services/api";

import type { Employee } from "@/types/domain";
import { toast } from "sonner";
import { WorkflowTimeline, getWorkflowStageLabel, getStatusDisplayLabel } from "@/components/common/WorkflowTimeline";
import { ClipboardList, CheckCircle2, AlertCircle, Loader2, Mail, Phone, Calendar, ArrowRight, Circle } from "lucide-react";

const toArray = (value: unknown): any[] => {
  if (Array.isArray(value)) return value;
  return [];
};

const getEmployeeKey = (employee: any) =>
  employee?.EmployeeId || employee?.employeeId || employee?.id || employee?.uuid;

const getNewlyAvailableForAllocation = (employee: any): any[] =>
  toArray(employee?.newlyAvailableForAllocation ?? employee?.NewlyAvailableForAllocation);

const getCanAllocate = (employee: any): boolean =>
  employee?.CanAllocate === true ||
  (getNewlyAvailableForAllocation(employee).length ?? 0) > 0;

const getAssetCategory = (item: any): string =>
  item?.Category || item?.category || item?.RequiredHardwareCategory || item?.requiredHardwareCategory || "-";

const getAssetName = (asset: any): string =>
  asset?.AssetName || asset?.assetName || asset?.name || "-";

const getAssetId = (asset: any): string =>
  asset?.AssetId || asset?.assetId || asset?.id || "-";

export default function OnboardingVerificationPage() {
  const { employees, verifyOnboardingAsset, outOfStockOnboarding, refreshData, fetchAssignmentRecords } = useData();

  const [rawPending, setRawPending] = useState<any[]>([]);
  const [pendingLoading, setPendingLoading] = useState(true);
  const [reviewingEmployee, setReviewingEmployee] = useState<Employee | null>(null);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [remarks, setRemarks] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [allocationResult, setAllocationResult] = useState<{
    allocated: { category: string; assetName: string; assetId: string }[];
    pending: string[];
  } | null>(null);

  const fetchPending = useCallback(async (showLoading = false): Promise<any[]> => {
    if (showLoading) setPendingLoading(true);
    try {
      const apiUrl = `${BASE_URL}/asset-manager/onboarding/pending`;
      console.log("[OnboardingVerification] Final request URL:", apiUrl);

      console.log("[OnboardingVerification] Fetching from /asset-manager/onboarding/pending");
      const response = await apiFetch<any>("/asset-manager/onboarding/pending");

      console.log("[OnboardingVerification] Response status: 200");
      console.log("Raw response", response);

      const items = toArray(
        response?.employees ??
        response?.data?.employees ??
        response?.data
      );

      console.log("Employees received:", items.length);

      setRawPending(items);
      setReviewingEmployee(prev => {
        if (!prev) return prev;
        const fresh = items.find((item: any) => getEmployeeKey(item) === getEmployeeKey(prev));
        return (fresh ?? null) as any;
      });
      setSelectedEmployee(prev => {
        if (!prev) return prev;
        const fresh = items.find((item: any) => getEmployeeKey(item) === getEmployeeKey(prev));
        return (fresh ?? null) as any;
      });

      return items;
    } catch (err: any) {
      console.error("[OnboardingVerification] Error fetching pending employees:", err);
      toast.error("Failed to load pending onboarding employees");
      return [];
    } finally {
      setPendingLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPending(true);
    const interval = setInterval(() => {
      fetchPending();
    }, 10000);
    return () => clearInterval(interval);
  }, [fetchPending]);

  const pendingEmployees: Employee[] = useMemo(() => {
    const allItems = [...rawPending];

    return allItems.map((emp: any) => {
      const employee = employees.find(
        (e: any) =>
          e.id === emp.EmployeeId ||
          e.uuid === emp.EmployeeId ||
          e.employeeId === emp.EmployeeId ||
          e.id === emp.id
      );

      const employeeName =
        emp.EmployeeName ||
        emp.employeeName ||
        emp.Name ||
        emp.name ||
        (emp.FirstName && emp.LastName
          ? `${emp.FirstName} ${emp.LastName}`
          : employee?.name || "-");

      const assignedAssets = toArray(emp.AssignedAssets ?? emp.assignedAssets);
      const allocatedAssets = toArray(emp.AllocatedAssets ?? emp.allocatedAssets);
      const assignedAssetId = emp.AssignedAssetId ?? emp.assignedAssetId ?? null;
      const pendingAssets = toArray(emp.PendingAssets ?? emp.pendingAssets);
      const remainingAssets = toArray(emp.RemainingAssets ?? emp.remainingAssets);
      const newlyAvailableForAllocation = getNewlyAvailableForAllocation(emp);
      const empId = emp.EmployeeId || emp.id || emp.employeeId;
      const cwf = emp.CurrentWorkflowState ?? emp.currentWorkflowState ?? "";

      return {
        ...emp,
        EmployeeId: empId,
        id: empId,
        uuid: empId,
        employeeId: empId,
        name: employeeName,
        firstName: emp.FirstName || emp.firstName,
        lastName: emp.LastName || emp.lastName,
        email: emp.Email || emp.email,
        role: emp.Role as Employee["role"],
        department: emp.Department || emp.department,
        designation: employee?.designation || emp.designation || "",
        location: emp.Location || emp.location,
        status: emp.Status || emp.status || "Active",
        avatar: employee?.avatar || "",
        phone: employee?.phone || "",
        requiredAssetCategory: emp.RequiredHardwareCategory || emp.requiredAssetCategory,
        requiredHardwareCategory: emp.RequiredHardwareCategory || emp.requiredHardwareCategory,
        RequiredHardwareCategory: emp.RequiredHardwareCategory || emp.requiredHardwareCategory,
        joinDate: emp.JoinDate || emp.joinDate,
        allocationDate: emp.AllocationDate || emp.allocationDate,
        allocationTime: emp.AllocationTime || emp.allocationTime,
        allocationStatus: emp.AllocationStatus || emp.allocationStatus || employee?.allocationStatus,
        verificationStatus: (emp.VerificationStatus ?? emp.verificationStatus ?? "") as Employee["verificationStatus"],
        VerificationStatus: emp.VerificationStatus ?? emp.verificationStatus ?? "",
        currentWorkflowState: cwf,
        CurrentWorkflowState: cwf,
        onboardingStatus: emp.OnboardingStatus ?? emp.onboardingStatus ?? "",
        OnboardingStatus: emp.OnboardingStatus ?? emp.onboardingStatus ?? "",
        createdAt: emp.CreatedAt || emp.createdAt,
        allocatedAssets: allocatedAssets.length > 0 ? allocatedAssets : assignedAssets,
        AllocatedAssets: allocatedAssets.length > 0 ? allocatedAssets : assignedAssets,
        pendingAssets: pendingAssets,
        PendingAssets: pendingAssets,
        remainingAssets,
        RemainingAssets: remainingAssets,
        AllocationProgress: emp.AllocationProgress ?? emp.allocationProgress,
        allocationProgress: emp.AllocationProgress ?? emp.allocationProgress,
        AssignedAssets: assignedAssets,
        AssignedAssetId: assignedAssetId,
        CanAllocate: emp.CanAllocate ?? emp.canAllocate,
        canAllocate: emp.CanAllocate ?? emp.canAllocate,
        newlyAvailableForAllocation,
        NewlyAvailableForAllocation: newlyAvailableForAllocation,
      } as unknown as Employee;
    });
  }, [rawPending, employees]);

  const canAllocate = useMemo(() => {
    if (!reviewingEmployee) return false;
    return getCanAllocate(reviewingEmployee);
  }, [reviewingEmployee]);

  useEffect(() => {
    if (!reviewingEmployee) return;

    console.log("Employee:", reviewingEmployee);
    console.log("CanAllocate:", (reviewingEmployee as any).CanAllocate);
    console.log("Available:", (reviewingEmployee as any).newlyAvailableForAllocation);
    console.log("Pending:", (reviewingEmployee as any).PendingAssets);
    console.log("Assigned:", (reviewingEmployee as any).AssignedAssets);
  }, [reviewingEmployee]);

  const canFlagOutOfStock = useMemo(() => {
    if (!reviewingEmployee) return false;
    return !getCanAllocate(reviewingEmployee) && !submitting && !allocationResult;
  }, [submitting, allocationResult, reviewingEmployee]);

  const refreshReviewingEmployee = useCallback(async (employee: Employee) => {
    setAllocationResult(null);
    const empId = getEmployeeKey(employee);
    const items = await fetchPending();
    const updatedEmp = items.find((item: any) => getEmployeeKey(item) === empId);
    setReviewingEmployee((updatedEmp ?? null) as any);
  }, [fetchPending]);

  const handleOpenVerifyDialog = async (emp: Employee) => {
    setRemarks("");
    setAllocationResult(null);

    await refreshReviewingEmployee(emp);
  };

  const handleRemainingAllocation = async () => {
    if (!reviewingEmployee || submitting) return;
    const newlyAvailable = getNewlyAvailableForAllocation(reviewingEmployee);
    setSubmitting(true);
    try {
      const empId = getEmployeeKey(reviewingEmployee);

      const assetsToAllocate = newlyAvailable.map((item: any) => {
        const asset = item.availableAsset || item;
        return {
          AssetId: getAssetId(asset),
          AssetName: getAssetName(asset),
          Category: item.Category || getAssetCategory(asset),
        };
      });

      await verifyOnboardingAsset(
        empId,
        "Verified",
        assetsToAllocate,
        remarks,
        []
      );

      setReviewingEmployee(null);
      setAllocationResult(null);
      const freshItems = await fetchPending();
      const freshEmp = freshItems.find((r: any) => getEmployeeKey(r) === empId);
      setReviewingEmployee((freshEmp ?? null) as any);
      await fetchAssignmentRecords();
      await refreshData();
    } catch (err: any) {
      console.error("Remaining allocation error:", err);
      const backendMsg = err?.body?.data?.error || err?.body?.error || err?.body?.detail || err?.body?.message;
      const errorDetails = err?.body ? JSON.stringify(err.body) : "";
      toast.error(backendMsg || err.message || "Allocation failed" + (errorDetails ? ` — ${errorDetails}` : ""));
    } finally {
      setSubmitting(false);
    }
  };

  const handleVerifySubmit = async () => {
    if (!reviewingEmployee || submitting) return;
    setSubmitting(true);
    try {
      const empId = getEmployeeKey(reviewingEmployee);
      const availableAssets = getNewlyAvailableForAllocation(reviewingEmployee).map((item: any) => {
        const asset = item.availableAsset || item;
        return {
          ...asset,
          AssetId: getAssetId(asset),
          AssetName: getAssetName(asset),
          Category: item.Category || getAssetCategory(asset),
        };
      });

      console.log("Submitting verification for:", empId);
      await verifyOnboardingAsset(
        empId,
        "Verified",
        availableAssets,
        remarks,
        []
      );

      setReviewingEmployee(null);
      setAllocationResult(null);
      const freshItems = await fetchPending();
      const freshEmp = freshItems.find((r: any) => getEmployeeKey(r) === empId);
      setReviewingEmployee((freshEmp ?? null) as any);
      await fetchAssignmentRecords();
      await refreshData();
    } catch (err: any) {
      console.error("Verification submit error:", err);
      const backendMsg = err?.body?.data?.error || err?.body?.error || err?.body?.detail || err?.body?.message;
      const errorDetails = err?.body ? JSON.stringify(err.body) : "";
      toast.error(backendMsg || err.message || "Verification failed" + (errorDetails ? ` — ${errorDetails}` : ""));
    } finally {
      setSubmitting(false);
    }
  };

  const handleOutOfStockSubmit = async () => {
    if (!reviewingEmployee || submitting) return;
    setSubmitting(true);
    try {
      const empId = getEmployeeKey(reviewingEmployee);
      await outOfStockOnboarding(empId, remarks);
      setReviewingEmployee(null);
      setAllocationResult(null);
      await fetchPending();
      await fetchAssignmentRecords();
      await refreshData();
    } catch (err: any) {
      console.error("Out of stock submit error:", err);
      const backendMsg = err?.body?.data?.error || err?.body?.error || err?.body?.detail || err?.body?.message;
      const errorDetails = err?.body ? JSON.stringify(err.body) : "";
      toast.error(backendMsg || err.message || "Out of stock update failed" + (errorDetails ? ` â€” ${errorDetails}` : ""));
    } finally {
      setSubmitting(false);
    }
  };

  const columns: ColumnDef<Employee>[] = [
    { accessorKey: "employeeId", header: "Employee ID" },
    { accessorKey: "name", header: "Employee Name" },
    { accessorKey: "department", header: "Department" },
    {
      accessorKey: "requiredAssetCategory", header: "Required Hardware", cell: ({ row }) => (
        <HardwareCategoryBadges value={row.original.requiredAssetCategory} />
      )
    },
    {
      id: "allocatedAssets",
      header: "Allocated Assets",
      cell: ({ row }) => {
        const assets = toArray((row.original as any).allocatedAssets);
        if (assets.length === 0) return <span className="text-xs text-muted-foreground italic">No Assets Allocated</span>;
        const labels = assets.map((a: any) => a.Category || a.category).filter(Boolean);
        return (
          <div className="flex flex-wrap gap-1">
            {labels.map((label: string, i: number) => (
              <Badge key={i} variant="outline" className="font-medium bg-success/15 text-success border-success/20">
                {label}
              </Badge>
            ))}
          </div>
        );
      },
    },
    {
      id: "remainingAssets",
      header: "Remaining Assets",
      cell: ({ row }) => {
        const pending = toArray((row.original as any).pendingAssets);
        if (pending.length === 0) return <span className="text-xs text-muted-foreground italic">Completed</span>;
        const labels = pending.map((a: any) => a.Category || a.category).filter(Boolean);
        return (
          <div className="flex flex-wrap gap-1">
            {labels.map((label: string, i: number) => (
              <Badge key={i} variant="outline" className="font-medium bg-destructive/15 text-destructive border-destructive/20">
                {label}
              </Badge>
            ))}
          </div>
        );
      },
    },
    { accessorKey: "status", header: "Status" },
    { accessorKey: "joinDate", header: "Joining Date" },
    { id: "schedule", header: "Allocation Schedule", cell: ({ row }) => `${row.original.allocationDate || "Not set"} @ ${row.original.allocationTime || "Not set"}` },
    {
      id: "verificationStatus",
      header: "Verification Status",
      cell: ({ row }) => {
        const emp = row.original as any;
        const aa = toArray(emp.allocatedAssets);
        const pa = toArray(emp.pendingAssets);
        const aaCount = aa.length;
        const paCount = pa.length;
        const totalCount = aaCount + paCount;
        const hasPending = paCount > 0;
        let vs: string;
        if (hasPending) {
          vs = "Partial Allocation";
        } else if (totalCount > 0) {
          vs = "Verified";
        } else {
          vs = emp.verificationStatus ?? "Pending";
        }
        return (
          <div className="flex flex-col gap-0.5">
            <StatusBadge status={vs} />
            {totalCount > 0 && (
              <span className="text-[10px] text-muted-foreground mt-0.5">
                Allocated: {aaCount} / {totalCount} Asset{totalCount !== 1 ? 's' : ''}
              </span>
            )}
          </div>
        );
      },
    },
    {
      id: "workflowState",
      header: "Current Workflow State",
      cell: ({ row }) => {
        const emp = row.original as any;
        const pendingArr = toArray(emp.pendingAssets);
        const hasPending = pendingArr.length > 0;
        let status: string;
        if (hasPending) {
          status = "Pending Remaining Assets";
        } else {
          status = getStatusDisplayLabel(emp.allocationStatus, {
            currentWorkflowState: emp.currentWorkflowState || undefined,
            verificationStatus: emp.verificationStatus,
          });
        }
        return <StatusBadge status={status} />;
      },
    },
    {
      id: "actions",
      header: "",
      cell: ({ row }) => {
        const employee = row.original as any;

        return (
          <Button
            size="sm"
            variant="outline"
            onClick={(e) => {
              e.stopPropagation();
              handleOpenVerifyDialog(employee);
            }}
          >
            {getCanAllocate(employee) ? "Allocate Remaining" : "Review"}
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
                  <div className="flex items-center gap-2"><Mail className="h-4 w-4 text-muted-foreground" />{fullEmp.email}</div>
                  <div className="flex items-center gap-2"><Phone className="h-4 w-4 text-muted-foreground" />{fullEmp.phone || "—"}</div>
                </Card>
                <Card className="p-4">
                  <div className="font-semibold text-sm mb-3">Employment Details</div>
                  <div className="grid grid-cols-2 gap-y-2 text-sm">
                    <span className="text-muted-foreground">Employee ID</span><span>{fullEmp.id}</span>
                    <span className="text-muted-foreground">Department</span><span>{fullEmp.department}</span>
                    <span className="text-muted-foreground">Joining Date</span><span>{fullEmp.joinDate}</span>
                    <span className="text-muted-foreground">Required Hardware Category</span><HardwareCategoryBadges value={fullEmp.requiredAssetCategory} />
                    <span className="text-muted-foreground">Current Status</span><span><StatusBadge status={fullEmp.status} /></span>
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
                    <HardwareCategoryBadges value={fullEmp.requiredAssetCategory} />
                    <span className="text-muted-foreground">Current Stage:</span>
                    <span className="font-medium text-foreground">{getWorkflowStageLabel(fullEmp.allocationStatus, fullEmp.verificationStatus, (fullEmp as any).currentWorkflowState)}</span>
                  </div>
                  <WorkflowTimeline allocationStatus={fullEmp.allocationStatus} verificationStatus={fullEmp.verificationStatus} currentWorkflowState={(fullEmp as any).currentWorkflowState} />
                </Card>

                {(() => {
                  const cwf = ((fullEmp as any).currentWorkflowState ?? '').toUpperCase();
                  const isPendingState = cwf === "PENDING_REMAINING_ASSETS";

                  const allocatedCats = toArray((fullEmp as any).allocatedAssets)
                    .map((a: any) => a.Category || a.category)
                    .filter(Boolean);

                  const pendingCats = toArray((fullEmp as any).pendingAssets)
                    .map((a: any) => a.Category || a.category)
                    .filter(Boolean);

                  if (!isPendingState && pendingCats.length === 0) return null;

                  return (
                    <Card className="p-4 border-amber-500/20 bg-amber-50/50 dark:bg-amber-950/10">
                      <div className="font-semibold text-sm text-amber-700 dark:text-amber-400 flex items-center gap-2 border-b border-amber-200/30 dark:border-amber-800/30 pb-2">
                        <AlertCircle className="h-4 w-4" /> Pending Asset Allocation
                      </div>

                      {pendingCats.length === 0 ? (
                        <div className="mt-3 flex items-center gap-2 text-sm text-green-600 dark:text-green-400">
                          <CheckCircle2 className="h-4 w-4" />
                          <span className="font-medium">All required assets have been allocated.</span>
                        </div>
                      ) : (
                        <div className="mt-3 space-y-3">
                          <div>
                            <h4 className="text-xs font-semibold text-green-600 dark:text-green-400 mb-1.5">Allocated Assets</h4>
                            <div className="space-y-1">
                              {allocatedCats.length > 0 ? allocatedCats.map((cat: string, i: number) => (
                                <div key={i} className="flex items-center gap-1.5 text-xs">
                                  <CheckCircle2 className="h-3.5 w-3.5 text-green-500 shrink-0" />
                                  <span>{cat}</span>
                                </div>
                              )) : (
                                <div className="text-xs text-muted-foreground">None</div>
                              )}
                            </div>
                          </div>

                          <div>
                            <h4 className="text-xs font-semibold text-amber-600 dark:text-amber-400 mb-1.5">Pending Assets</h4>
                            <div className="space-y-1">
                              {pendingCats.map((cat: string, i: number) => (
                                <div key={i} className="flex items-center gap-1.5 text-xs">
                                  <Circle className="h-3 w-3 text-amber-500 fill-amber-500 shrink-0" />
                                  <span>{cat}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      )}
                    </Card>
                  );
                })()}
              </>
            );
          })()}
        </SheetContent>
      </Sheet>

      <Dialog open={!!reviewingEmployee} onOpenChange={(o) => { if (!o && !submitting) { setReviewingEmployee(null); setAllocationResult(null); fetchPending(); } }}>
        <DialogContent className="sm:max-w-[560px] rounded-xl p-0 gap-0 max-h-[90vh] overflow-y-auto">
          <DialogHeader className="p-6 pb-2 shrink-0">
            <DialogTitle className="flex items-center gap-2">
              <ClipboardList className="h-5 w-5 text-primary" /> Onboarding Inventory Check
            </DialogTitle>
            <DialogDescription>
              Verify stock levels in the employee's designated office location.
            </DialogDescription>
          </DialogHeader>

          {reviewingEmployee && (() => {
            const alreadyAllocatedAssets = toArray(
              (reviewingEmployee as any).AssignedAssets ??
              (reviewingEmployee as any).assignedAssets ??
              (reviewingEmployee as any).AllocatedAssets ??
              (reviewingEmployee as any).allocatedAssets
            );
            const alreadyAllocatedCount = alreadyAllocatedAssets.length;
            const pendingAssets = toArray((reviewingEmployee as any).PendingAssets ?? (reviewingEmployee as any).pendingAssets);
            const remainingAssets = toArray((reviewingEmployee as any).RemainingAssets ?? (reviewingEmployee as any).remainingAssets);
            const newlyAvailableAssets = getNewlyAvailableForAllocation(reviewingEmployee);
            const allocationProgress = (reviewingEmployee as any).AllocationProgress ?? (reviewingEmployee as any).allocationProgress;
            const shouldShowNoAvailable =
              (reviewingEmployee as any).CanAllocate === false &&
              newlyAvailableAssets.length === 0;
            const allocatedCount = Array.isArray(allocationResult?.allocated) ? allocationResult.allocated.length : 0;
            const pendingCount = Array.isArray(allocationResult?.pending) ? allocationResult.pending.length : 0;

            console.log("Employee:", reviewingEmployee);
            console.log("CanAllocate:", (reviewingEmployee as any).CanAllocate);
            console.log("Available:", (reviewingEmployee as any).newlyAvailableForAllocation);
            console.log("Pending:", (reviewingEmployee as any).PendingAssets);
            console.log("Assigned:", (reviewingEmployee as any).AssignedAssets);

            return (
              <>
                {allocationResult ? (
                  <>
                    <div className="px-6 py-4 space-y-4 text-sm">
                      <div className="p-4 rounded-lg border bg-success/5 border-success/20 space-y-2">
                        <div className="flex items-center gap-2 text-success">
                          <CheckCircle2 className="h-5 w-5" />
                          <span className="font-semibold">{allocatedCount} Asset{allocatedCount !== 1 ? 's' : ''} Allocated Successfully.</span>
                        </div>
                        {pendingCount > 0 && (
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <AlertCircle className="h-5 w-5" />
                            <span className="font-semibold">{pendingCount} Asset{pendingCount !== 1 ? 's' : ''} Pending Procurement.</span>
                          </div>
                        )}
                      </div>

                      {Array.isArray(allocationResult?.allocated) && allocationResult.allocated.length > 0 && (
                        <div>
                          <h4 className="text-sm font-semibold mb-2 text-success">Allocated Assets</h4>
                          <div className="space-y-1.5">
                            {allocationResult.allocated.map((a, i) => (
                              <div key={i} className="flex items-center gap-2 text-xs text-foreground">
                                <CheckCircle2 className="h-3.5 w-3.5 text-success shrink-0" />
                                <span className="font-medium">{a.category}</span>
                                <ArrowRight className="h-3 w-3 text-muted-foreground" />
                                <span className="font-mono">{String(a.assetName ?? "")} ({String(a.assetId ?? "")})</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {Array.isArray(allocationResult?.pending) && allocationResult.pending.length > 0 && (
                        <div>
                          <h4 className="text-sm font-semibold mb-2 text-muted-foreground">Pending Assets</h4>
                          <div className="space-y-1.5">
                            {allocationResult.pending.map((cat, i) => (
                              <div key={i} className="flex items-center gap-2 text-xs text-muted-foreground">
                                <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                                <span className="font-medium">{String(cat)}</span>
                                <ArrowRight className="h-3 w-3" />
                                <span>Waiting for Procurement</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                    <div className="shrink-0 border-t p-6 bg-background flex items-center justify-end">
                      <Button onClick={() => { setReviewingEmployee(null); setAllocationResult(null); fetchPending(); }}>
                        Done
                      </Button>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="px-6 py-4 space-y-4 text-sm">
                      <div className="grid grid-cols-2 gap-y-2 border-b pb-3">
                        <span className="text-muted-foreground">Employee Name</span>
                        <span className="font-semibold text-foreground">{reviewingEmployee.name}</span>
                        <span className="text-muted-foreground">Office Location</span>
                        <span className="font-medium text-foreground">{reviewingEmployee.location}</span>
                        <span className="text-muted-foreground">Required Categories</span>
                        <HardwareCategoryBadges value={reviewingEmployee.requiredAssetCategory} />
                      </div>

                      <div className="rounded-lg border p-4 space-y-4">
                        <div className="grid grid-cols-2 gap-y-2 text-xs border-b pb-3">
                          <span className="text-muted-foreground">Verification Status</span>
                          <span className="font-medium text-foreground">{String((reviewingEmployee as any).VerificationStatus ?? (reviewingEmployee as any).verificationStatus ?? "-")}</span>
                          <span className="text-muted-foreground">Workflow State</span>
                          <span className="font-medium text-foreground">{String((reviewingEmployee as any).CurrentWorkflowState ?? (reviewingEmployee as any).currentWorkflowState ?? "-")}</span>
                          <span className="text-muted-foreground">Allocation Progress</span>
                          <span className="font-medium text-foreground">{allocationProgress ?? `${alreadyAllocatedCount} assigned`}</span>
                        </div>

                        <div>
                          <h4 className="text-sm font-semibold mb-2 text-amber-600 dark:text-amber-400 flex items-center gap-1.5">
                            <AlertCircle className="h-4 w-4" /> Pending Assets
                          </h4>
                          {pendingAssets.length > 0 ? (
                            <div className="flex flex-wrap gap-1.5">
                              {pendingAssets.map((item: any, i: number) => (
                                <Badge key={i} variant="outline" className="bg-amber-50 dark:bg-amber-950/20 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800">
                                  {typeof item === "object" && item !== null ? getAssetCategory(item) : String(item)}
                                </Badge>
                              ))}
                            </div>
                          ) : (
                            <div className="text-xs text-muted-foreground italic">None pending</div>
                          )}
                        </div>

                        <div>
                          <h4 className="text-sm font-semibold mb-2 text-success flex items-center gap-1.5">
                            <CheckCircle2 className="h-4 w-4" /> Available Assets
                          </h4>
                          {newlyAvailableAssets.length > 0 ? (
                            <div className="space-y-2">
                              {newlyAvailableAssets.map((item: any, idx: number) => {
                                const asset = item.availableAsset || item;
                                return (
                                  <div key={getAssetId(asset) || idx} className="p-4 rounded-lg border space-y-1.5">
                                    <div className="text-xs text-muted-foreground space-y-0.5">
                                      <div><span className="font-medium text-foreground">Asset Name:</span> {getAssetName(asset)}</div>
                                      <div><span className="font-medium text-foreground">Category:</span> {item.Category || getAssetCategory(asset)}</div>
                                      <div><span className="font-medium text-foreground">Asset ID:</span> {getAssetId(asset)}</div>
                                      <div><span className="font-medium text-foreground">Manufacturer:</span> {asset.Manufacturer || asset.manufacturer || "-"}</div>
                                      <div><span className="font-medium text-foreground">Model:</span> {asset.Model || asset.model || "-"}</div>
                                      <div><span className="font-medium text-foreground">Status:</span> {asset.Status || asset.status || "-"}</div>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          ) : shouldShowNoAvailable ? (
                            <div className="p-4 rounded-lg border border-amber-500/20 bg-amber-50/50 dark:bg-amber-950/10">
                              <div className="text-xs text-muted-foreground">No available assets found.</div>
                            </div>
                          ) : null}
                        </div>

                        <div>
                          <h4 className="text-sm font-semibold mb-2 text-primary flex items-center gap-1.5">
                            <CheckCircle2 className="h-4 w-4" /> Assigned Assets
                          </h4>
                          {alreadyAllocatedAssets.length > 0 ? (
                            <div className="space-y-2">
                              {alreadyAllocatedAssets.map((asset: any, idx: number) => (
                                <div key={getAssetId(asset) || idx} className="p-3 rounded-lg border text-xs text-muted-foreground space-y-0.5">
                                  <div><span className="font-medium text-foreground">Asset Name:</span> {getAssetName(asset)}</div>
                                  <div><span className="font-medium text-foreground">Category:</span> {getAssetCategory(asset)}</div>
                                  <div><span className="font-medium text-foreground">Asset ID:</span> {getAssetId(asset)}</div>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className="text-xs text-muted-foreground italic">No assets assigned</div>
                          )}
                        </div>

                        <div>
                          <h4 className="text-sm font-semibold mb-2 text-muted-foreground flex items-center gap-1.5">
                            <Circle className="h-4 w-4" /> Remaining Assets
                          </h4>
                          {remainingAssets.length > 0 ? (
                            <div className="flex flex-wrap gap-1.5">
                              {remainingAssets.map((item: any, i: number) => (
                                <Badge key={i} variant="outline">
                                  {typeof item === "object" && item !== null ? getAssetCategory(item) : String(item)}
                                </Badge>
                              ))}
                            </div>
                          ) : (
                            <div className="text-xs text-muted-foreground italic">None remaining</div>
                          )}
                        </div>
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
                      <Button variant="outline" onClick={() => { setReviewingEmployee(null); setAllocationResult(null); fetchPending(); }} disabled={submitting}>
                        Cancel
                      </Button>
                      <div className="flex-1 flex justify-center">
                        {!canAllocate ? (
                          <Button
                            variant="destructive"
                            onClick={handleOutOfStockSubmit}
                            disabled={!canFlagOutOfStock}
                          >
                            {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
                            Flag Out of Stock
                          </Button>
                        ) : null}
                      </div>
                      <Button
                        onClick={handleRemainingAllocation}
                        disabled={!canAllocate}
                      >
                        {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
                        Allocate Remaining Asset
                      </Button>
                    </div>
                  </>
                )}
              </>
            );
          })()}
        </DialogContent>
      </Dialog>
    </>
  );
}
