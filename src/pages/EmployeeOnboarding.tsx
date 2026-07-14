import { useState, useMemo, useEffect } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { PageHeader } from "@/components/common/PageHeader";
import { DataTable } from "@/components/common/DataTable";
import { StatusBadge } from "@/components/common/StatusBadge";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { useData } from "@/contexts/data";
import { useAuth } from "@/contexts/auth";
import { apiFetch } from "@/services/api";
import { toast } from "sonner";
import {
  CheckCircle2, XCircle, Eye, MoreHorizontal, Loader2, User, Calendar, Package
} from "lucide-react";

interface OnboardingRequest {
  id: string;
  employeeId: string;
  name: string;
  email: string;
  department: string;
  requiredHardware: string;
  requestedDate: string;
  status: "Pending" | "Approved" | "Rejected";
  approvedBy: string;
  approvalDate: string;
  location: string;
}

export default function EmployeeOnboardingPage() {
  const { user } = useAuth();
  const { assets, assignAssets, verifyOnboardingAsset, refreshData } = useData();

  const [requests, setRequests] = useState<OnboardingRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("all");

  const [viewingRequest, setViewingRequest] = useState<OnboardingRequest | null>(null);
  const [remarks, setRemarks] = useState("");
  const [confirmAction, setConfirmAction] = useState<{ request: OnboardingRequest; action: "approve" | "reject" } | null>(null);
  const [processing, setProcessing] = useState(false);

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
      const response = await apiFetch<any>("/asset-manager/onboarding/pending");
      const employees = response?.employees ?? response?.data?.employees ?? response?.data ?? [];
      const mapped: OnboardingRequest[] = employees.map((emp: any) => ({
        id: emp.EmployeeId || emp.id || "",
        employeeId: emp.EmployeeId || emp.id || "",
        name: `${emp.FirstName || emp.firstName || ""} ${emp.LastName || emp.lastName || ""}`.trim(),
        email: emp.Email || emp.email || "",
        department: emp.Department || emp.department || "",
        requiredHardware: emp.RequiredHardwareCategory || emp.requiredHardwareCategory || emp.requiredAssetCategory || "Laptop",
        requestedDate: emp.CreatedAt || emp.createdAt || emp.joinDate || "",
        status: (emp.Status || emp.status || "Pending") === "Rejected" ? "Rejected" : "Pending",
        approvedBy: "",
        approvalDate: "",
        location: emp.Location || emp.location || "",
      }));

      const archived = readArchive();
      const pendingIds = new Set(mapped.map((r) => r.employeeId));
      setRequests([...mapped, ...archived.filter((r) => !pendingIds.has(r.employeeId))]);
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

  const markRequest = (request: OnboardingRequest, status: "Approved" | "Rejected") => {
    const next = {
      ...request,
      status,
      approvedBy: user?.name || "Asset Manager",
      approvalDate: new Date().toISOString().slice(0, 10),
    };

    setRequests((prev) => prev.map((r) => (r.employeeId === request.employeeId ? next : r)));
    upsertArchivedRequest(next);
  };

  const handleApprove = async (request: OnboardingRequest) => {
    setProcessing(true);
    try {
      const availableAsset = assets.find(
        (a) =>
          a.status === "Available" &&
          a.category === request.requiredHardware &&
          (!request.location || a.location === request.location)
      );

      await verifyOnboardingAsset(request.employeeId, true, remarks, user?.name || "Asset Manager");

      if (availableAsset) {
        await assignAssets(request.employeeId, [availableAsset.assetId]);
        toast.success("Inventory updated successfully");
      } else {
        toast.warning(`No available ${request.requiredHardware} assets found${request.location ? ` in ${request.location}` : ""}. Approved without asset assignment.`);
      }

      markRequest(request, "Approved");
      await refreshData();
      await fetchOnboarding();
      setConfirmAction(null);
    } catch (err: any) {
      toast.error(err.message || "Failed to approve onboarding");
    } finally {
      setProcessing(false);
    }
  };

  const handleReject = async (request: OnboardingRequest) => {
    setProcessing(true);
    try {
      await verifyOnboardingAsset(request.employeeId, false, remarks, user?.name || "Asset Manager");
      markRequest(request, "Rejected");
      await refreshData();
      await fetchOnboarding();
      setConfirmAction(null);
    } catch (err: any) {
      toast.error(err.message || "Failed to reject onboarding");
    } finally {
      setProcessing(false);
    }
  };

  const filtered = useMemo(() => {
    if (tab === "all") return requests;
    return requests.filter((r) => r.status.toLowerCase() === tab);
  }, [requests, tab]);

  const columns: ColumnDef<OnboardingRequest>[] = [
    { accessorKey: "employeeId", header: "Employee ID" },
    { accessorKey: "name", header: "Employee Name" },
    { accessorKey: "department", header: "Department" },
    {
      accessorKey: "requiredHardware", header: "Required Hardware",
      cell: ({ row }) => <span className="font-semibold text-primary">{row.original.requiredHardware}</span>
    },
    { accessorKey: "requestedDate", header: "Requested Date", cell: ({ row }) => row.original.requestedDate ? row.original.requestedDate.slice(0, 10) : "-" },
    { id: "status", header: "Status", cell: ({ row }) => <StatusBadge status={row.original.status} /> },
    { accessorKey: "approvedBy", header: "Approved By", cell: ({ row }) => row.original.approvedBy || "-" },
    { accessorKey: "approvalDate", header: "Approval Date", cell: ({ row }) => row.original.approvalDate || "-" },
    {
      id: "actions", header: "Actions",
      cell: ({ row }) => {
        const req = row.original;
        const isPending = req.status === "Pending";
        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={(e) => e.stopPropagation()}>
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setViewingRequest(req)}>
                <Eye className="h-4 w-4 mr-2" />View
              </DropdownMenuItem>
              {isPending && (
                <>
                  <DropdownMenuItem onClick={() => setConfirmAction({ request: req, action: "approve" })}>
                    <CheckCircle2 className="h-4 w-4 mr-2 text-success" />Approve
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setConfirmAction({ request: req, action: "reject" })}>
                    <XCircle className="h-4 w-4 mr-2 text-destructive" />Reject
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        );
      }
    },
  ];

  if (loading) {
    return (
      <>
        <PageHeader title="Employee Onboarding" description="Manage new hire onboarding requests." />
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
            <TabsTrigger value="pending">Pending ({requests.filter(r => r.status === "Pending").length})</TabsTrigger>
            <TabsTrigger value="approved">Approved ({requests.filter(r => r.status === "Approved").length})</TabsTrigger>
            <TabsTrigger value="rejected">Rejected ({requests.filter(r => r.status === "Rejected").length})</TabsTrigger>
          </TabsList>
        </Tabs>
      </Card>

      <Card className="p-4">
        <DataTable
          data={filtered}
          columns={columns}
          searchPlaceholder="Search by name, ID, department..."
          pageSize={15}
          emptyMessage="No onboarding requests found"
        />
      </Card>

      <Sheet open={!!viewingRequest} onOpenChange={(o) => !o && setViewingRequest(null)}>
        <SheetContent className="w-full sm:max-w-xl overflow-y-auto p-6">
          {viewingRequest && (
            <>
              <SheetHeader className="p-0 mb-4">
                <div className="text-xs text-muted-foreground">{viewingRequest.employeeId}</div>
                <SheetTitle className="text-xl">{viewingRequest.name}</SheetTitle>
                <div className="mt-2"><StatusBadge status={viewingRequest.status} /></div>
              </SheetHeader>
              <div className="space-y-4">
                <Card className="p-4">
                  <div className="font-semibold text-sm mb-3">Onboarding Details</div>
                  <div className="grid grid-cols-2 gap-y-2 text-sm">
                    <span className="text-muted-foreground">Employee ID</span>
                    <span>{viewingRequest.employeeId}</span>
                    <span className="text-muted-foreground">Email</span>
                    <span>{viewingRequest.email}</span>
                    <span className="text-muted-foreground">Department</span>
                    <span>{viewingRequest.department}</span>
                    <span className="text-muted-foreground">Location</span>
                    <span>{viewingRequest.location}</span>
                    <span className="text-muted-foreground">Required Hardware</span>
                    <span className="font-semibold text-primary">{viewingRequest.requiredHardware}</span>
                    <span className="text-muted-foreground">Requested Date</span>
                    <span>{viewingRequest.requestedDate ? viewingRequest.requestedDate.slice(0, 10) : "-"}</span>
                    {viewingRequest.status !== "Pending" && (
                      <>
                        <span className="text-muted-foreground">Approved By</span>
                        <span>{viewingRequest.approvedBy}</span>
                        <span className="text-muted-foreground">Approval Date</span>
                        <span>{viewingRequest.approvalDate}</span>
                      </>
                    )}
                  </div>
                </Card>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>

      <Dialog open={!!confirmAction} onOpenChange={(o) => !o && setConfirmAction(null)}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {confirmAction?.action === "approve" ? (
                <><CheckCircle2 className="h-5 w-5 text-success" /> Approve Onboarding</>
              ) : (
                <><XCircle className="h-5 w-5 text-destructive" /> Reject Onboarding</>
              )}
            </DialogTitle>
            <DialogDescription>
              {confirmAction?.action === "approve"
                ? "This will approve the hardware request and assign an available asset."
                : "This will reject the onboarding hardware request."}
            </DialogDescription>
          </DialogHeader>

          {confirmAction && (
            <div className="space-y-3 py-2 text-sm">
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">{confirmAction.request.name}</span>
              </div>
              <div className="flex items-center gap-2">
                <Package className="h-4 w-4 text-muted-foreground" />
                <span>{confirmAction.request.requiredHardware}</span>
              </div>
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span>{confirmAction.request.requestedDate?.slice(0, 10) || "-"}</span>
              </div>

              <div>
                <Label className="text-xs font-semibold">Remarks</Label>
                <Textarea
                  className="mt-1.5 text-sm"
                  placeholder="Add remarks..."
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                />
              </div>
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-0 mt-2">
            <Button variant="outline" onClick={() => setConfirmAction(null)} disabled={processing}>Cancel</Button>
            <Button
              variant={confirmAction?.action === "approve" ? "default" : "destructive"}
              onClick={() => {
                if (confirmAction?.action === "approve") handleApprove(confirmAction.request);
                else if (confirmAction) handleReject(confirmAction.request);
              }}
              disabled={processing}
            >
              {processing ? (
                <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Processing...</>
              ) : (
                <>{confirmAction?.action === "approve" ? "Approve" : "Reject"}</>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
