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
import { HardwareCategoryBadges } from "@/components/common/HardwareCategoryBadges";
import { apiFetch, BASE_URL } from "@/services/api";

import type { Employee } from "@/types/domain";
import { toast } from "sonner";
import { WorkflowTimeline, getWorkflowStageLabel, getStatusDisplayLabel } from "@/components/common/WorkflowTimeline";
import { ClipboardList, CheckCircle2, AlertCircle, Loader2, Mail, Phone, Calendar, XCircle, ArrowRight, Circle } from "lucide-react";
import { parseHardwareCategories } from "@/lib/utils";

export default function OnboardingVerificationPage() {
  const { employees, verifyOnboardingAsset, outOfStockOnboarding, refreshData } = useData();

  const [rawPending, setRawPending] = useState<any[]>([]);
  const [pendingLoading, setPendingLoading] = useState(true);
  const [reviewingEmployee, setReviewingEmployee] = useState<Employee | null>(null);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [remarks, setRemarks] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [inventoryData, setInventoryData] = useState<any>(null);
  const [inventoryLoading, setInventoryLoading] = useState(false);
  const [inventoryVerified, setInventoryVerified] = useState(false);
  const [selectedAssets, setSelectedAssets] = useState<any[]>([]);
  const [missingCategories, setMissingCategories] = useState<string[]>([]);
  const [verificationError, setVerificationError] = useState<string | null>(null);
  const [allocationResult, setAllocationResult] = useState<{
    allocated: { category: string; assetName: string; assetId: string }[];
    pending: string[];
  } | null>(null);

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
         emp.allocationStatus === "Waiting for Procurement" ||
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
        onboardingStatus: emp.OnboardingStatus ?? emp.onboardingStatus ?? "",
        createdAt: emp.CreatedAt,
        remainingRequiredAssets: emp.RemainingRequiredAssets ?? emp.remainingRequiredAssets,
        pendingAssetCategories: emp.PendingAssetCategories ?? emp.pendingAssetCategories,
        assignedAssets: emp.AssignedAssets ?? emp.assignedAssets,
        allocatedAssets: emp.AllocatedAssets ?? emp.allocatedAssets,
        pendingAssets: emp.PendingAssets ?? emp.pendingAssets,
      } as unknown as Employee;
    }).filter((emp) => {
      const cwf = ((emp as any).currentWorkflowState ?? "").toUpperCase();
      const obStatus = ((emp as any).onboardingStatus ?? "").toLowerCase();
      const vStatus = ((emp as any).verificationStatus ?? "").toLowerCase();
      if (cwf === "COMPLETED") return false;
      if (obStatus === "completed") return false;
      if (vStatus === "completed") return false;
      return true;
    });
  }, [rawPending, employees]);

  const hasAnyAvailable = inventoryData?.inventory?.some((i: any) => i.available) ?? false;
  const canVerify = inventoryVerified && hasAnyAvailable && !verificationError && !inventoryLoading && !submitting && !allocationResult;
  const canFlagOutOfStock = inventoryVerified && !hasAnyAvailable && !verificationError && !inventoryLoading && !submitting && !allocationResult;

  const fetchInventoryCheck = useCallback(async (employee: Employee) => {
    setInventoryLoading(true);
    setInventoryData(null);
    setInventoryVerified(false);
    setSelectedAssets([]);
    setMissingCategories([]);
    setVerificationError(null);
    setAllocationResult(null);
    try {
      const response = await apiFetch<any>(`/asset-manager/onboarding/check-inventory/${employee.id}`);
      console.log("Inventory API response", response);
      const inv = response?.inventory ?? [];
      const missing = response?.missingCategories ?? [];
      const assets = inv.filter((i: any) => i.selectedAsset != null).map((i: any) => ({
        ...i.selectedAsset,
        Category: i.category
      }));
      setInventoryData(response);
      setInventoryVerified(true);
      setSelectedAssets(assets);
      setMissingCategories(missing);
    } catch (err: any) {
      console.error("Inventory check API error", err);
      setInventoryData(null);
      setInventoryVerified(false);
      setSelectedAssets([]);
      setMissingCategories([]);
      setVerificationError(err.message || "Inventory check failed");
    } finally {
      setInventoryLoading(false);
    }
  }, []);

  const handleOpenVerifyDialog = (emp: Employee) => {
    setReviewingEmployee(emp);
    setRemarks("");
    setInventoryData(null);
    setInventoryVerified(false);
    setSelectedAssets([]);
    setMissingCategories([]);
    setVerificationError(null);
    setAllocationResult(null);
    fetchInventoryCheck(emp);
  };

  const handleVerifySubmit = async (approved: boolean) => {
    if (!reviewingEmployee || submitting) return;
    setSubmitting(true);
    try {
      if (approved) {
        const availableAssets = (inventoryData?.inventory ?? []).filter((i: any) => i.available && i.selectedAsset).map((i: any) => ({
          ...i.selectedAsset,
          Category: i.category
        }));
        const pendingCats = (inventoryData?.inventory ?? [])
          .filter((i: any) => !i.available)
          .map((i: any) => i.category);

        console.log("Submitting verification for:", reviewingEmployee.id);
        await verifyOnboardingAsset(
          reviewingEmployee.id,
          "Verified",
          availableAssets,
          remarks,
          pendingCats
        );

        setAllocationResult({
          allocated: availableAssets.map((a: any) => ({
            category: a.Category || a.category,
            assetName: a.AssetName || a.assetName || a.name || "",
            assetId: a.AssetId || a.assetId,
          })),
          pending: pendingCats,
        });
      } else {
        await outOfStockOnboarding(
          reviewingEmployee.id,
          remarks
        );
      }
      await refreshData();
      await fetchPending();
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
    { accessorKey: "requiredAssetCategory", header: "Required Hardware", cell: ({row}) => (
      <HardwareCategoryBadges value={row.original.requiredAssetCategory} />
    ) },
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
          const status = getStatusDisplayLabel(emp.allocationStatus, {
            currentWorkflowState: emp.currentWorkflowState || undefined,
            verificationStatus: emp.verificationStatus,
          });
          return <StatusBadge status={status} />;
        },
    },
    {
      id: "actions",
      header: "",
      cell: ({row}) => {
        const emp = row.original as any;
        const vs = emp.verificationStatus;
        const hasPendingAssets = (emp.pendingAssets?.length ?? 0) > 0;
        const cwf = (emp.currentWorkflowState ?? "").toUpperCase();
        const isCompleted = vs === "Completed" || cwf === "COMPLETED";
        const canVerify = !isCompleted && (
          !vs || vs === "Pending" ||
          vs === "Out of Stock" ||
          (vs === "Verified" && hasPendingAssets)
        );
        return (
          <Button size="sm" variant="outline" disabled={!canVerify} onClick={(e) => { e.stopPropagation(); handleOpenVerifyDialog(row.original); }}>
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
                    <span className="text-muted-foreground">Required Hardware Category</span><HardwareCategoryBadges value={fullEmp.requiredAssetCategory} />
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
                    <HardwareCategoryBadges value={fullEmp.requiredAssetCategory} />
                    <span className="text-muted-foreground">Current Stage:</span>
                    <span className="font-medium text-foreground">{getWorkflowStageLabel(fullEmp.allocationStatus, fullEmp.verificationStatus, (fullEmp as any).currentWorkflowState)}</span>
                  </div>
                  <WorkflowTimeline allocationStatus={fullEmp.allocationStatus} verificationStatus={fullEmp.verificationStatus} currentWorkflowState={(fullEmp as any).currentWorkflowState} />
                </Card>

                {(() => {
                  const cwf = ((fullEmp as any).currentWorkflowState ?? '').toUpperCase();
                  const isPendingState = cwf === "PENDING_REMAINING_ASSETS";

                  const allocatedAssetsArr = (fullEmp as any).allocatedAssets ?? [];
                  const pendingAssetsArr = (fullEmp as any).pendingAssets ?? [];

                  const requiredCats = parseHardwareCategories(fullEmp.requiredAssetCategory);
                  const allocatedCatSet = new Set(allocatedAssetsArr.map((a: any) => a.category));

                  let pendingCats: string[] = [];
                  if ((fullEmp as any).PendingAssetCategories?.length) {
                    pendingCats = (fullEmp as any).PendingAssetCategories;
                  } else if ((fullEmp as any).pendingAssetCategories?.length) {
                    pendingCats = (fullEmp as any).pendingAssetCategories;
                  } else if (pendingAssetsArr.length > 0) {
                    pendingCats = pendingAssetsArr.map((a: any) => a.category);
                  } else if ((fullEmp as any).RemainingRequiredAssets?.length) {
                    pendingCats = (fullEmp as any).RemainingRequiredAssets;
                  } else if ((fullEmp as any).remainingRequiredAssets?.length) {
                    pendingCats = (fullEmp as any).remainingRequiredAssets;
                  } else {
                    pendingCats = requiredCats.filter(cat => !allocatedCatSet.has(cat));
                  }

                  const allocatedCats = allocatedAssetsArr.map((a: any) => a.category);

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

      <Dialog open={!!reviewingEmployee} onOpenChange={(o) => { if (!o && !submitting) { setReviewingEmployee(null); setAllocationResult(null); } }}>
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
            const alreadyAllocatedAssets = (reviewingEmployee as any).allocatedAssets ?? [];
            const alreadyAllocatedCats = new Set(alreadyAllocatedAssets.map((a: any) => a.category));
            const alreadyAllocatedCount = alreadyAllocatedAssets.length;

            const inventoryResult = inventoryData?.inventory ?? [];
            const allocatedItems = inventoryResult.filter((i: any) => i.available && !alreadyAllocatedCats.has(i.category)) ?? [];
            const pendingItems = inventoryResult.filter((i: any) => !i.available && !alreadyAllocatedCats.has(i.category)) ?? [];
            const allocatedCount = allocationResult?.allocated.length ?? 0;
            const pendingCount = allocationResult?.pending.length ?? 0;

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

                    {allocatedCount > 0 && (
                      <div>
                        <h4 className="text-sm font-semibold mb-2 text-success">Allocated Assets</h4>
                        <div className="space-y-1.5">
                          {allocationResult.allocated.map((a, i) => (
                            <div key={i} className="flex items-center gap-2 text-xs text-foreground">
                              <CheckCircle2 className="h-3.5 w-3.5 text-success shrink-0" />
                              <span className="font-medium">{a.category}</span>
                              <ArrowRight className="h-3 w-3 text-muted-foreground" />
                              <span className="font-mono">{a.assetName} ({a.assetId})</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {pendingCount > 0 && (
                      <div>
                        <h4 className="text-sm font-semibold mb-2 text-muted-foreground">Pending Assets</h4>
                        <div className="space-y-1.5">
                          {allocationResult.pending.map((cat, i) => (
                            <div key={i} className="flex items-center gap-2 text-xs text-muted-foreground">
                              <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                              <span className="font-medium">{cat}</span>
                              <ArrowRight className="h-3 w-3" />
                              <span>Waiting for Procurement</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="shrink-0 border-t p-6 bg-background flex items-center justify-end">
                    <Button onClick={() => { setReviewingEmployee(null); setAllocationResult(null); }}>
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

                  {verificationError ? (
                    <div className="p-4 rounded-lg border space-y-1">
                      <div className="text-destructive font-semibold flex items-center gap-1.5">
                        <AlertCircle className="h-4.5 w-4.5" /> Inventory Check Failed
                      </div>
                      <div className="text-xs text-destructive/80">{verificationError}</div>
                    </div>
                  ) : inventoryLoading ? (
                    <div className="p-4 rounded-lg border flex items-center gap-2 text-muted-foreground">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Checking inventory...</span>
                    </div>
                  ) : inventoryData?.inventory ? (
                    <>
                      {alreadyAllocatedAssets.length > 0 && (
                        <div>
                          <h4 className="text-sm font-semibold mb-2 text-primary flex items-center gap-1.5">
                            <CheckCircle2 className="h-4 w-4" /> Already Allocated
                          </h4>
                          <div className="space-y-2">
                            {alreadyAllocatedAssets.map((item: any, idx: number) => (
                              <div key={item.category || idx} className="p-4 rounded-lg border space-y-2">
                                <div className="flex items-center gap-2">
                                  <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
                                  <span className="font-semibold text-sm">{item.category}</span>
                                </div>
                                <div className="text-xs text-primary font-medium">
                                  Status: Already Allocated
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {allocatedItems.length > 0 && (
                        <div>
                          <h4 className="text-sm font-semibold mb-2 text-success flex items-center gap-1.5">
                            <CheckCircle2 className="h-4 w-4" /> Allocated
                          </h4>
                          <div className="space-y-2">
                            {allocatedItems.map((item: any, idx: number) => (
                              <div key={item.category || idx} className="p-4 rounded-lg border space-y-2">
                                <div className="flex items-center gap-2">
                                  <CheckCircle2 className="h-4 w-4 text-success shrink-0" />
                                  <span className="font-semibold text-sm">{item.category}</span>
                                </div>
                                <div className="text-xs text-muted-foreground">
                                  Available Assets: {item.availableCount ?? 0}
                                </div>
                                {item.selectedAsset ? (
                                  <>
                                    <div className="text-xs font-medium text-foreground">
                                      Selected Asset: {item.selectedAsset.AssetName} ({item.selectedAsset.AssetId})
                                    </div>
                                    <div className="text-xs text-success font-medium">
                                      Status: Ready to Allocate
                                    </div>
                                  </>
                                ) : null}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {pendingItems.length > 0 && (
                        <div>
                          <h4 className="text-sm font-semibold mb-2 text-muted-foreground flex items-center gap-1.5">
                            <AlertCircle className="h-4 w-4" /> Pending
                          </h4>
                          <div className="space-y-2">
                            {pendingItems.map((item: any, idx: number) => (
                              <div key={item.category || idx} className="p-4 rounded-lg border space-y-2">
                                <div className="flex items-center gap-2">
                                  <XCircle className="h-4 w-4 text-destructive shrink-0" />
                                  <span className="font-semibold text-sm">{item.category}</span>
                                </div>
                                <div className="text-xs text-muted-foreground">
                                  Available Assets: 0
                                </div>
                                <div className="text-xs font-medium text-destructive">
                                  Status: Out of Stock
                                </div>
                                <div className="text-xs text-muted-foreground">
                                  Pending Allocation
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {missingCategories.length > 0 && (
                        <div className="p-4 rounded-lg border border-destructive/20 bg-destructive/5 space-y-1.5">
                          <div className="text-destructive font-semibold flex items-center gap-1.5 text-sm">
                            <AlertCircle className="h-4 w-4" /> Missing Categories
                          </div>
                          <div className="flex flex-wrap gap-1">
                            {missingCategories.map((cat: string) => (
                              <span key={cat} className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-destructive/10 text-destructive">{cat}</span>
                            ))}
                          </div>
                        </div>
                      )}
                    </>
                  ) : null}

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
                  <Button variant="outline" onClick={() => { setReviewingEmployee(null); setAllocationResult(null); }} disabled={submitting}>
                    Cancel
                  </Button>
                  <div className="flex-1 flex justify-center">
                    {!hasAnyAvailable && (
                      <Button
                        variant="destructive"
                        onClick={() => handleVerifySubmit(false)}
                        disabled={!canFlagOutOfStock}
                      >
                        {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
                        Flag Out of Stock
                      </Button>
                    )}
                  </div>
                  <Button
                    onClick={() => handleVerifySubmit(true)}
                    disabled={!canVerify}
                  >
                    {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
                    Verify & Approve
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