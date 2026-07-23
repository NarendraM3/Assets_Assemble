import { useState, useMemo, useEffect, useCallback } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { PageHeader } from "@/components/common/PageHeader";
import { DataTable } from "@/components/common/DataTable";
import { StatusBadge } from "@/components/common/StatusBadge";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { useData } from "@/contexts/data";
import { useAuth } from "@/contexts/auth";
import { apiFetch } from "@/services/api";
import { toast } from "sonner";
import {
  WorkflowTimeline,
  getStatusDisplayLabel,
  getWorkflowStageLabel,
  normalizeWorkflowStatus,
} from "@/components/common/WorkflowTimeline";
import { HardwareCategoryBadges } from "@/components/common/HardwareCategoryBadges";
import {
  CheckCircle2,
  ClipboardCheck,
  Loader2,
  User,
  Package,
  Clock,
  Hourglass,
  Eye,
  ArrowRight,
} from "lucide-react";

interface AllocatedAsset {
  category: string;
  assetId: string;
  assetName: string;
  assetTag: string;
}

interface PendingAsset {
  category: string;
  status: string;
}

interface OnboardingRequest {
  id: string;
  employeeId: string;
  name: string;
  firstName?: string;
  lastName?: string;
  email: string;
  phone?: string;
  role?: string;
  department: string;
  designation?: string;
  location: string;
  requiredHardware: string;
  requestedDate: string;
  joiningDate?: string;
  allocationDate?: string;
  allocationTime?: string;
  allocationStatus?: string;
  status: string;
  approvedBy: string;
  approvalDate: string;
  avatar: string;
  OnboardingStatus?: string;
  CurrentWorkflowState?: string;
  VerificationStatus?: string;
  InventoryVerified?: boolean;
  AssignedAssetId?: string;
  VerifiedBy?: string;
  AssignedAssetName?: string;
  AssignedAssetTag?: string;
  AssignedAssetSerialNumber?: string;
  Workflow?: string;
  ITStatus?: string;
  allocationHistory?: { step: string; timestamp: string; actor: string; remarks?: string }[];
  allocatedAssets?: AllocatedAsset[];
  pendingAssets?: PendingAsset[];
}

const toArray = (value: unknown): any[] => {
  if (Array.isArray(value)) return value;
  return [];
};

const safeString = (value: unknown): string =>
  typeof value === "string" ? value.trim() : "";

function getEmployeeName(emp: any): string {
  return emp.EmployeeName || `${emp.FirstName || ""} ${emp.LastName || ""}`.trim() || "-";
}

function getAvatar(name: string, firstName?: string, lastName?: string): string {
  if (firstName && lastName) return (firstName[0] + lastName[0]).toUpperCase();
  const parts = name.split(" ").filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return (name[0] || "?").toUpperCase();
}

export default function EmployeeOnboardingPage() {
  const { user } = useAuth();
  const { assets, refreshData } = useData();

  const [requests, setRequests] = useState<OnboardingRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("all");

  const [itActionProcessing, setItActionProcessing] = useState<string | null>(null);
  const [localItStatuses, setLocalItStatuses] = useState<Record<string, string>>({});
  const [selectedRequest, setSelectedRequest] = useState<OnboardingRequest | null>(null);
  const [reviewDialogOpen, setReviewDialogOpen] = useState(false);
  const [reviewingRequest, setReviewingRequest] = useState<OnboardingRequest | null>(null);

  const archiveKey = "onboarding_requests_archive";

  const readArchive = () => {
    try {
      return JSON.parse(localStorage.getItem(archiveKey) || "[]") as OnboardingRequest[];
    } catch {
      return [];
    }
  };

  const saveArchive = (items: OnboardingRequest[]) => {
    localStorage.setItem(archiveKey, JSON.stringify(items.filter((r) => r.status !== "Pending")));
  };

  const upsertArchivedRequest = (request: OnboardingRequest) => {
    const archived = readArchive().filter((item) => item.employeeId !== request.employeeId);
    saveArchive([request, ...archived]);
  };

  const fetchOnboarding = async () => {
    setLoading(true);
    try {
      console.log("[IT Support] GET Pending");
      const response = await apiFetch<any>("/it-support/onboarding/pending");
      const employees = response?.employees || response?.data || [];
      console.log("[IT Support] Pending employees:", employees);
      console.log("Pending Employees:", employees);
      const mapped: OnboardingRequest[] = employees.map((emp: any) => {
        const employeeName = getEmployeeName(emp);
        const firstName = emp.FirstName || "";
        const lastName = emp.LastName || "";

        return {
          id: emp.EmployeeId ?? emp.id ?? emp.employeeId ?? "",
          employeeId: emp.EmployeeId ?? emp.id ?? emp.employeeId ?? "",
          name: employeeName,
          firstName,
          lastName,
          email: emp.Email ?? emp.email ?? "",
          phone: emp.Phone ?? emp.phone ?? "",
          role: emp.Role ?? emp.role ?? "",
          department: emp.Department ?? emp.department ?? "",
          designation: emp.Designation ?? emp.designation ?? "",
          location: emp.Location ?? emp.location ?? "",
          requiredHardware: (() => {
            const raw = emp.RequiredHardwareCategory ??
              emp.requiredHardwareCategory ??
              emp.requiredAssetCategory ??
              "Laptop";
            return Array.isArray(raw) ? raw.join(", ") : raw;
          })(),
          requestedDate: emp.CreatedAt ?? emp.createdAt ?? emp.RequestedDate ?? "",
          joiningDate: emp.JoiningDate ?? emp.joiningDate ?? "",
          allocationDate: emp.AllocationDate ?? emp.allocationDate ?? "",
          allocationTime: emp.AllocationTime ?? emp.allocationTime ?? "",
          allocationStatus: emp.AllocationStatus ?? emp.allocationStatus ?? "",
          status: emp.Status ?? emp.status ?? emp.OnboardingStatus ?? "",
          approvedBy: emp.ApprovedBy ?? emp.approvedBy ?? "",
          approvalDate: emp.ApprovalDate ?? emp.approvalDate ?? "",
          avatar: getAvatar(employeeName, firstName, lastName),
          OnboardingStatus: emp.OnboardingStatus ?? emp.onboardingStatus ?? "",
          CurrentWorkflowState: emp.CurrentWorkflowState ?? emp.currentWorkflowState ?? emp.Workflow ?? "",
          VerificationStatus: emp.VerificationStatus ?? emp.verificationStatus ?? "",
          InventoryVerified: emp.InventoryVerified ?? emp.inventoryVerified ?? false,
          Workflow: emp.Workflow ?? emp.workflow ?? "",
          ITStatus: emp.ITStatus ?? emp.itStatus ?? "",
          AssignedAssetId: emp.AssignedAssetId ?? emp.assignedAssetId ?? "",
          AssignedAssetName: emp.AssignedAssetName ?? emp.assignedAssetName ?? "",
          AssignedAssetTag: emp.AssignedAssetTag ?? emp.assignedAssetTag ?? "",
          AssignedAssetSerialNumber:
            emp.AssignedAssetSerialNumber ?? emp.assignedAssetSerialNumber ?? emp.SerialNumber ?? "",
          allocationHistory: emp.AllocationHistory ?? emp.allocationHistory ?? [],
          VerifiedBy: emp.VerifiedBy ?? emp.verifiedBy ?? "",
          allocatedAssets: toArray(emp.AllocatedAssets).map((a: any) => ({
            category: a.Category ?? a.category ?? "",
            assetId: a.AssetId ?? a.assetId ?? "",
            assetName: a.AssetName ?? a.assetName ?? "",
            assetTag: a.AssetTag ?? a.assetTag ?? "",
          })),
          pendingAssets: toArray(emp.PendingAssets).map((p: any) => ({
            category: p.Category ?? p.category ?? "",
            status: p.Status ?? p.status ?? "Waiting for Procurement",
          })),
        };
      });

      const archived = readArchive();
      const pendingIds = new Set(mapped.map((r) => r.employeeId));
      const all = [...mapped, ...archived.filter((r) => !pendingIds.has(r.employeeId))];
      setRequests(all.filter((r) => !isCompleted(r)));
    } catch (err: any) {
      console.error("[EmployeeOnboarding] Error fetching:", err);
      toast.error("Failed to load onboarding requests");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOnboarding();
  }, []);

  const isCompleted = useCallback((r: OnboardingRequest) => {
    const checks = [
      r.CurrentWorkflowState,
      r.OnboardingStatus,
      r.Workflow,
      r.ITStatus,
    ];
    return checks.some((v) => v === "COMPLETED" || v === "Completed");
  }, []);

  const getAssignedAsset = (request: OnboardingRequest) => {
    if (request.AssignedAssetId) {
      return assets.find((a) => a.assetId === request.AssignedAssetId);
    }
    return undefined;
  };

  const getAssignedAssetLabel = (request: OnboardingRequest) => {
    const asset = getAssignedAsset(request);
    if (asset) return `${asset.assetName} (${asset.assetTag || asset.assetId})`;
    if (request.AssignedAssetName || request.AssignedAssetTag) {
      return `${request.AssignedAssetName || "Assigned asset"}${request.AssignedAssetTag ? ` (${request.AssignedAssetTag})` : ""
        }`;
    }
    return "Not assigned yet";
  };

  const getAllocatedAssetsList = (request: OnboardingRequest) => {
    return Array.isArray(request.allocatedAssets) ? request.allocatedAssets : [];
  };

  const getPendingAssetsList = (request: OnboardingRequest) => {
    return Array.isArray(request.pendingAssets) ? request.pendingAssets : [];
  };

  const getRequiredHardwareList = (request: OnboardingRequest): string[] => {
    const raw: any = request.requiredHardware;
    if (!raw) return [];
    if (Array.isArray(raw)) return raw.map((s: any) => safeString(s)).filter(Boolean);
    if (typeof raw === "string") return raw.split(",").map((s: string) => safeString(s)).filter(Boolean);
    return [];
  };

  const getAllocatedCount = (request: OnboardingRequest) => {
    return getAllocatedAssetsList(request).length;
  };

  const getPendingCount = (request: OnboardingRequest) => {
    return getPendingAssetsList(request).length;
  };

  const getTotalRequiredCount = (request: OnboardingRequest) => {
    return getRequiredHardwareList(request).length;
  };

  const hasPendingHardware = (request: OnboardingRequest) => {
    return getPendingCount(request) > 0;
  };

  const getPendingBannerMessage = (request: OnboardingRequest) => {
    const pending = getPendingAssetsList(request);
    if (pending.length === 0) return null;
    const categories = pending.map(p => p.category).filter(Boolean).join(", ");
    return `${request.name} has pending asset(s): ${categories}`;
  };

  const getWorkflowFields = (request: OnboardingRequest) => [
    request.CurrentWorkflowState,
    request.OnboardingStatus,
    request.allocationStatus,
    request.VerificationStatus,
  ];

  const getWorkflowLabel = (request: OnboardingRequest) => {
    const workflowValue =
      request.CurrentWorkflowState || request.OnboardingStatus || request.allocationStatus;
    return getStatusDisplayLabel(workflowValue, {
      verificationStatus: request.VerificationStatus,
      inventoryVerified: request.InventoryVerified,
      currentWorkflowState: request.CurrentWorkflowState,
      onboardingStatus: request.OnboardingStatus,
    });
  };

  const isITSupportReviewable = (request: OnboardingRequest) => {
    if (
      request.allocationStatus === "Completed" ||
      request.VerificationStatus === "Completed" ||
      getWorkflowLabel(request) === "Completed" ||
      getWorkflowLabel(request) === "Rejected"
    ) {
      return false;
    }

    const reviewableStatuses = new Set([
      "pending it support",
      "sent to it support",
      "sent to it support team",
      "ready for it support",
      "it support pending",
      "ready for allocation",
      "pending remaining assets",
    ]);

    return getWorkflowFields(request).some((status) =>
      reviewableStatuses.has(normalizeWorkflowStatus(status)),
    );
  };

  const performItAction = async (request: OnboardingRequest, action: "prepare" | "ready" | "deliver") => {
    setItActionProcessing(request.employeeId);
    const statusLabels: Record<string, string> = { prepare: "Prepared", ready: "Ready", deliver: "Delivered" };
    setLocalItStatuses((prev) => ({ ...prev, [request.employeeId]: statusLabels[action] }));
    try {
      const actionLabel = action.charAt(0).toUpperCase() + action.slice(1);
      console.log(`[IT Support] PATCH ${actionLabel}`);
      await apiFetch(`/it-support/onboarding/${request.employeeId}/${action}`, {
        method: "PATCH",
      });
      toast.success(`IT Support ${actionLabel} completed for ${request.name}`);
      await refreshData();
      await fetchOnboarding();
    } catch (err: any) {
      setLocalItStatuses((prev) => {
        const next = { ...prev };
        delete next[request.employeeId];
        return next;
      });
      toast.error(err.message || `Failed to ${action} onboarding`);
    } finally {
      setItActionProcessing(null);
    }
  };

  const filtered = useMemo(() => {
    if (tab === "all") return requests;
    if (tab === "pending-it-support") {
      return requests.filter(isITSupportReviewable);
    }
    if (tab === "verified") {
      return requests.filter((r) => r.VerificationStatus === "Verified");
    }
    if (tab === "out-of-stock") {
      return requests.filter((r) => r.VerificationStatus === "Out of Stock");
    }
    return requests;
  }, [requests, tab]);

  const columns: ColumnDef<OnboardingRequest>[] = [
    { accessorKey: "employeeId", header: "Employee ID" },
    { accessorKey: "name", header: "Employee Name" },
    { accessorKey: "department", header: "Department" },
    {
      accessorKey: "requiredHardware",
      header: "Required Hardware",
      cell: ({ row }) => (
        <HardwareCategoryBadges value={row.original.requiredHardware} />
      ),
    },
    {
      id: "allocatedAssets",
      header: "Allocated Assets",
      cell: ({ row }) => {
        const assets = getAllocatedAssetsList(row.original);
        if (assets.length === 0) {
          return <span className="text-muted-foreground text-xs italic">No Assets Allocated</span>;
        }
        return (
          <div className="flex flex-wrap gap-1">
            {assets.map((a, i) => (
              <span key={i} className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-primary/10 text-primary">
                {a.assetName}
              </span>
            ))}
          </div>
        );
      },
    },
    {
      id: "pendingAssets",
      header: "Pending Assets",
      cell: ({ row }) => {
        const pending = getPendingAssetsList(row.original);
        if (pending.length === 0) {
          return <span className="text-muted-foreground text-xs italic">No Pending Assets</span>;
        }
        return (
          <div className="flex flex-col gap-0.5">
            {pending.map((p, i) => (
              <span key={i} className="text-xs text-muted-foreground whitespace-nowrap">
                {p.category}
                <span className="text-amber-600 ml-1">({p.status || "Waiting for Procurement"})</span>
              </span>
            ))}
          </div>
        );
      },
    },
    {
      accessorKey: "joiningDate",
      header: "Joining Date",
      cell: ({ row }) => (row.original.joiningDate ? row.original.joiningDate.slice(0, 10) : "-"),
    },
    {
      id: "status",
      header: "Status",
      cell: ({ row }) => {
        const r = row.original;
        const localStatus = localItStatuses[r.employeeId];
        if (localStatus) return <StatusBadge status={localStatus} />;
        const itStatus = safeString(r.ITStatus);
        if (["Prepared", "Ready", "Delivered"].includes(itStatus)) return <StatusBadge status={itStatus} />;
        const cwf = safeString(r.CurrentWorkflowState);
        const cwfNorm = cwf.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
        if (["Prepared", "Ready", "Delivered"].includes(cwfNorm)) return <StatusBadge status={cwfNorm} />;
        const allocStatus = safeString(r.allocationStatus);
        const allocNorm = allocStatus.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
        if (["Prepared", "Ready", "Delivered"].includes(allocNorm)) return <StatusBadge status={allocNorm} />;
        if (r.VerificationStatus === "Out of Stock") return <StatusBadge status="Out of Stock" />;
        if (r.VerificationStatus === "Verified") return <StatusBadge status="Verified" />;
        return <StatusBadge status="Pending Asset Manager Review" />;
      },
    },
    {
      id: "workflow",
      header: "Workflow",
      cell: ({ row }) => {
        const ws = getStatusDisplayLabel(
          row.original.CurrentWorkflowState ??
          row.original.OnboardingStatus ??
          row.original.allocationStatus,
          {
            verificationStatus: row.original.VerificationStatus,
            inventoryVerified: row.original.InventoryVerified,
            currentWorkflowState: row.original.CurrentWorkflowState,
            onboardingStatus: row.original.OnboardingStatus,
          },
        );
        return <StatusBadge status={ws} />;
      },
    },
    {
      accessorKey: "approvedBy",
      header: "Approved By",
      cell: ({ row }) => row.original.approvedBy || "-",
    },
    {
      accessorKey: "approvalDate",
      header: "Approval Date",
      cell: ({ row }) => row.original.approvalDate || "-",
    },
    {
      id: "actions",
      header: "Actions",
      cell: ({ row }) => {
        const req = row.original;
        const hasAllocatedAssets = getAllocatedAssetsList(req).length > 0;
        const isPendingRemaining = (req.CurrentWorkflowState ?? '').toUpperCase() === 'PENDING_REMAINING_ASSETS';
        const canReview = isITSupportReviewable(req);
        const showActions = canReview || hasAllocatedAssets || isPendingRemaining;

        if (!showActions) return null;

        return (
          <Button
            variant="default"
            size="sm"
            className="h-8"
            onClick={(event) => {
              event.stopPropagation();
              setReviewingRequest(req);
              setReviewDialogOpen(true);
            }}
          >
            <Eye className="h-4 w-4 mr-1" />
            View Details
          </Button>
        );
      },
    },
  ];

  if (loading) {
    return (
      <>
        <PageHeader
          title="Employee Onboarding"
          description="Manage new hire onboarding requests."
        />
        <Card className="p-4">
          <div className="space-y-3">
            <Skeleton className="h-10 w-full" />
            {Array.from({ length: 7 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        </Card>
      </>
    );
  }

  return (
    <>
      <PageHeader
        title="Employee Onboarding"
        description="Review, approve, or reject new employee hardware onboarding requests."
      />

      <Card className="p-4 mb-4">
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList>
            <TabsTrigger value="all">All ({requests.length})</TabsTrigger>
            <TabsTrigger value="pending-it-support">
              Pending IT Support ({requests.filter(isITSupportReviewable).length})
            </TabsTrigger>
            <TabsTrigger value="verified">
              Verified ({requests.filter((r) => r.VerificationStatus === "Verified").length})
            </TabsTrigger>
            <TabsTrigger value="out-of-stock">
              Out of Stock ({requests.filter((r) => r.VerificationStatus === "Out of Stock").length}
              )
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </Card>

      {filtered.some(hasPendingHardware) && (
        <Card className="p-3 mb-4 border-amber-200 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-800">
          <div className="flex items-start gap-3">
            <Hourglass className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
            <div className="text-sm text-amber-800 dark:text-amber-200">
              <span className="font-semibold">Pending Hardware Items</span>
              <div className="mt-1 space-y-0.5">
                {filtered.filter(hasPendingHardware).map((req) => {
                  const msg = getPendingBannerMessage(req);
                  if (!msg) return null;
                  return (
                    <div key={req.employeeId} className="text-xs">
                      <span className="font-medium">{req.name}:</span> {msg}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </Card>
      )}

      <Card className="p-4">
        <DataTable
          data={filtered}
          columns={columns}
          searchPlaceholder="Search by name, ID, department..."
          pageSize={15}
          emptyMessage="No onboarding requests found"
          onRowClick={setSelectedRequest}
        />
      </Card>

      <Sheet open={!!selectedRequest} onOpenChange={(o) => !o && setSelectedRequest(null)}>
        <SheetContent className="sm:max-w-[550px] overflow-y-auto h-full pr-6">
          <SheetHeader className="border-b pb-4 mb-4">
            <SheetTitle className="flex items-center gap-2 text-lg">
              <User className="h-5 w-5 text-primary" /> Employee Workflow Details
            </SheetTitle>
          </SheetHeader>
          {selectedRequest && (
            <div className="space-y-6 text-sm">
              <div className="flex items-center gap-4 p-4 bg-muted/40 rounded-lg border">
                <Avatar className="h-14 w-14 border-2 border-primary/20">
                  <AvatarFallback className="text-base font-bold bg-primary/10 text-primary">
                    {selectedRequest.avatar}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <div className="text-xs uppercase font-bold text-primary tracking-wider">
                    {selectedRequest.designation || selectedRequest.role || ""}
                  </div>
                  <h4 className="font-bold text-lg text-foreground truncate">
                    {selectedRequest.name}
                  </h4>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="font-mono text-xs text-muted-foreground">
                      {selectedRequest.employeeId}
                    </span>
                    <StatusBadge status={selectedRequest.status || "Active"} />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 border rounded-lg p-4 bg-card shadow-sm">
                <div>
                  <span className="text-[10px] text-muted-foreground block uppercase font-semibold">
                    Department
                  </span>
                  <span className="font-medium text-foreground">
                    {selectedRequest.department || "-"}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-muted-foreground block uppercase font-semibold">
                    Email
                  </span>
                  <span className="font-medium text-foreground break-all">
                    {selectedRequest.email || "-"}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-muted-foreground block uppercase font-semibold">
                    Joining Date
                  </span>
                  <span className="font-medium text-foreground">
                    {selectedRequest.joiningDate || "-"}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-muted-foreground block uppercase font-semibold">
                    Required Hardware
                  </span>
                  <HardwareCategoryBadges value={selectedRequest.requiredHardware} fallback="-" />
                </div>
                <div className="col-span-2">
                  <span className="text-[10px] text-muted-foreground block uppercase font-semibold">
                    Assigned Asset
                  </span>
                  <span className="font-medium text-foreground">
                    {getAssignedAssetLabel(selectedRequest)}
                  </span>
                </div>
              </div>

              <div className="border rounded-lg p-4 bg-card shadow-sm">
                <h5 className="font-semibold text-xs text-muted-foreground uppercase tracking-wider mb-2.5">
                  Workflow Timeline
                </h5>
                <div className="grid grid-cols-2 gap-y-2 text-xs mb-3">
                  <span className="text-muted-foreground">Current Stage:</span>
                  <span className="font-medium text-foreground">
                    {getWorkflowStageLabel(
                      selectedRequest.CurrentWorkflowState ||
                      selectedRequest.OnboardingStatus ||
                      selectedRequest.allocationStatus,
                    )}
                  </span>
                  <span className="text-muted-foreground">Workflow Status:</span>
                  <span>
                    <StatusBadge status={getWorkflowLabel(selectedRequest)} />
                  </span>
                </div>
                <WorkflowTimeline
                  allocationStatus={
                    selectedRequest.CurrentWorkflowState ||
                    selectedRequest.OnboardingStatus ||
                    selectedRequest.allocationStatus
                  }
                  verificationStatus={selectedRequest.VerificationStatus}
                />
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>

      <Dialog open={reviewDialogOpen} onOpenChange={(o) => { if (!o) { setReviewDialogOpen(false); setReviewingRequest(null); } }}>
        <DialogContent className="sm:max-w-[560px] rounded-xl p-0 gap-0 max-h-[90vh] overflow-y-auto">
          <DialogHeader className="p-6 pb-2 shrink-0">
            <DialogTitle className="flex items-center gap-2">
              <ClipboardCheck className="h-5 w-5 text-primary" /> Asset Allocation Details
            </DialogTitle>
            <DialogDescription>
              Review allocated and pending assets for this employee.
            </DialogDescription>
          </DialogHeader>

          {reviewingRequest && (() => {
            const allocated = getAllocatedAssetsList(reviewingRequest);
            const pending = getPendingAssetsList(reviewingRequest);
            const required = getRequiredHardwareList(reviewingRequest);
            const totalRequired = required.length;
            const allocatedCount = allocated.length;
            const pendingCount = pending.length;

            return (
              <>
                <div className="px-6 py-4 space-y-4 text-sm">
                  {pendingCount > 0 && (
                    <Alert className="border-amber-200 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-800">
                      <Hourglass className="h-4 w-4 text-amber-500" />
                      <AlertDescription className="text-xs text-amber-800 dark:text-amber-200">
                        <span className="font-semibold">Partial Allocation</span> — Some required hardware is still pending procurement.
                      </AlertDescription>
                    </Alert>
                  )}

                  <div className="grid grid-cols-2 gap-y-2 border-b pb-3">
                    <span className="text-muted-foreground">Employee Name</span>
                    <span className="font-semibold text-foreground">{reviewingRequest.name}</span>
                    <span className="text-muted-foreground">Department</span>
                    <span className="font-medium text-foreground">{reviewingRequest.department}</span>
                    <span className="text-muted-foreground">Employee ID</span>
                    <span className="font-medium text-foreground font-mono">{reviewingRequest.employeeId}</span>
                  </div>

                  <div>
                    <h4 className="text-sm font-semibold mb-2 text-foreground">Required Hardware</h4>
                    <div className="flex flex-wrap gap-1.5">
                      {required.map((cat, i) => (
                        <span key={i} className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium bg-muted text-foreground">
                          {cat}
                        </span>
                      ))}
                      {required.length === 0 && (
                        <span className="text-xs text-muted-foreground italic">No requirements specified</span>
                      )}
                    </div>
                  </div>

                  <div>
                    <h4 className="text-sm font-semibold mb-2 text-success flex items-center gap-1.5">
                      <CheckCircle2 className="h-4 w-4" /> Allocated Assets
                    </h4>
                    {allocated.length > 0 ? (
                      <div className="space-y-1.5">
                        {allocated.map((a, i) => (
                          <div key={i} className="flex items-center gap-2 text-xs text-foreground">
                            <CheckCircle2 className="h-3.5 w-3.5 text-success shrink-0" />
                            <span className="font-medium">{a.category}</span>
                            <ArrowRight className="h-3 w-3 text-muted-foreground" />
                            <span className="font-medium">{a.assetName}</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <span className="text-xs text-muted-foreground italic">No assets have been allocated yet.</span>
                    )}
                  </div>

                  <div>
                    <h4 className="text-sm font-semibold mb-2 text-muted-foreground flex items-center gap-1.5">
                      <Hourglass className="h-4 w-4" /> Pending Assets
                    </h4>
                    {pending.length > 0 ? (
                      <div className="space-y-1.5">
                        {pending.map((p, i) => (
                          <div key={i} className="flex items-center gap-2 text-xs text-muted-foreground">
                            <Clock className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                            <span className="font-medium">{p.category}</span>
                            <ArrowRight className="h-3 w-3 text-muted-foreground" />
                            <span>{p.status || "Waiting for Procurement"}</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <span className="text-xs text-muted-foreground italic">No Pending Assets</span>
                    )}
                  </div>
                </div>

                <div className="shrink-0 border-t p-6 bg-background flex items-center justify-between">
                  <div className="text-xs text-muted-foreground">
                    {allocatedCount} of {totalRequired} assets allocated
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" onClick={() => { setReviewDialogOpen(false); setReviewingRequest(null); }}>
                      Close
                    </Button>
                    {isITSupportReviewable(reviewingRequest) && (
                      <>
                        <Button
                          variant="outline"
                          onClick={() => {
                            performItAction(reviewingRequest, "prepare");
                            setReviewDialogOpen(false);
                            setReviewingRequest(null);
                          }}
                          disabled={itActionProcessing === reviewingRequest.employeeId}
                        >
                          {itActionProcessing === reviewingRequest.employeeId ? (
                            <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                          ) : (
                            <ClipboardCheck className="h-4 w-4 mr-1" />
                          )}
                          Prepare
                        </Button>
                        <Button
                          onClick={() => {
                            performItAction(reviewingRequest, "ready");
                            setReviewDialogOpen(false);
                            setReviewingRequest(null);
                          }}
                          disabled={allocatedCount === 0 || itActionProcessing === reviewingRequest.employeeId}
                        >
                          {itActionProcessing === reviewingRequest.employeeId ? (
                            <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                          ) : (
                            <CheckCircle2 className="h-4 w-4 mr-1" />
                          )}
                          Ready
                        </Button>
                        <Button
                          variant="outline"
                          onClick={() => {
                            performItAction(reviewingRequest, "deliver");
                            setReviewDialogOpen(false);
                            setReviewingRequest(null);
                          }}
                          disabled={itActionProcessing === reviewingRequest.employeeId}
                        >
                          <Package className="h-4 w-4 mr-1" />
                          Deliver
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              </>
            );
          })()}
        </DialogContent>
      </Dialog>
    </>
  );
}
