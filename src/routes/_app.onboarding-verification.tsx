import { createFileRoute } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { PageHeader } from "@/components/common/PageHeader";
import { DataTable } from "@/components/common/DataTable";
import { StatusBadge } from "@/components/common/StatusBadge";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { useData } from "@/contexts/data";
import type { Employee } from "@/types/domain";
import { toast } from "sonner";
import { ClipboardList, CheckCircle2, AlertCircle } from "lucide-react";

export const Route = createFileRoute("/_app/onboarding-verification")({
  component: OnboardingVerificationPage,
});

function OnboardingVerificationPage() {
  const { employees, assets, verifyOnboardingAsset } = useData();

  // Verification Dialog States
  const [reviewingEmployee, setReviewingEmployee] = useState<Employee | null>(null);
  const [remarks, setRemarks] = useState("");

  // Filtering: employees awaiting inventory verification or waiting for inventory
  const verificationQueue = useMemo(() => {
    return employees.filter(
      emp => emp.allocationStatus === "Awaiting Asset Verification" || emp.allocationStatus === "Waiting for Inventory"
    );
  }, [employees]);

  // Check matching inventory count in the employee's location
  const localAvailableAssetsCount = useMemo(() => {
    if (!reviewingEmployee) return 0;
    const reqCat = reviewingEmployee.requiredAssetCategory || "Laptop";
    const reqLoc = reviewingEmployee.location;
    return assets.filter(
      a => a.status === "Available" && a.category === reqCat && a.location === reqLoc
    ).length;
  }, [assets, reviewingEmployee]);

  const handleOpenVerifyDialog = (emp: Employee) => {
    setReviewingEmployee(emp);
    setRemarks("");
  };

  const handleVerifySubmit = (approved: boolean) => {
    if (!reviewingEmployee) return;
    verifyOnboardingAsset(reviewingEmployee.id, approved, remarks, "Asset Manager User");
    if (approved) {
      toast.success(`Onboarding approved. Status of ${reviewingEmployee.name} updated to "Ready for Allocation".`);
    } else {
      toast.warning(`Allocation flagged as blocked. Status of ${reviewingEmployee.name} set to "Waiting for Inventory". Admin notified.`);
    }
    setReviewingEmployee(null);
  };

  const columns: ColumnDef<Employee>[] = [
    { accessorKey: "id", header: "Employee ID" },
    { accessorKey: "name", header: "Name" },
    { accessorKey: "department", header: "Department" },
    { accessorKey: "requiredAssetCategory", header: "Required Category", cell: ({row}) => <span className="font-semibold text-primary">{row.original.requiredAssetCategory || "Laptop"}</span> },
    { accessorKey: "joinDate", header: "Joining Date" },
    { id: "schedule", header: "Allocation Schedule", cell: ({row}) => `${row.original.allocationDate || "Not set"} @ ${row.original.allocationTime || "Not set"}` },
    { id: "status", header: "Verification Status", cell: ({row}) => <StatusBadge status={row.original.allocationStatus ?? "Awaiting Asset Verification"}/> },
    { id: "actions", header: "", cell: ({row}) => (
      <Button size="sm" variant="outline" onClick={(e) => { e.stopPropagation(); handleOpenVerifyDialog(row.original); }}>
        Verify Inventory
      </Button>
    )},
  ];

  return (
    <>
      <PageHeader
        title="Employee Onboarding Verification"
        description="Verify hardware inventory availability and approve new hire onboarding allocations."
      />
      
      <Card className="p-4">
        <DataTable
          data={verificationQueue}
          columns={columns}
          searchPlaceholder="Search verification queue…"
          pageSize={15}
        />
      </Card>

      {/* Verify Inventory Dialog */}
      <Dialog open={!!reviewingEmployee} onOpenChange={(o) => !o && setReviewingEmployee(null)}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ClipboardList className="h-5 w-5 text-primary" /> Onboarding Inventory Check
            </DialogTitle>
            <DialogDescription>
              Verify stock levels in the employee's designated office location.
            </DialogDescription>
          </DialogHeader>

          {reviewingEmployee && (
            <div className="space-y-4 py-2 text-sm">
              <div className="grid grid-cols-2 gap-y-2 border-b pb-3">
                <span className="text-muted-foreground">Employee Name</span>
                <span className="font-semibold text-foreground">{reviewingEmployee.name}</span>
                <span className="text-muted-foreground">Office Location</span>
                <span className="font-medium text-foreground">{reviewingEmployee.location}</span>
                <span className="text-muted-foreground">Required Category</span>
                <span className="font-semibold text-primary">{reviewingEmployee.requiredAssetCategory || "Laptop"}</span>
              </div>

              {/* Inventory availability checker result */}
              <div className="p-4 rounded-lg border">
                {localAvailableAssetsCount > 0 ? (
                  <div className="space-y-1">
                    <div className="text-success font-semibold flex items-center gap-1.5">
                      <CheckCircle2 className="h-4.5 w-4.5" /> Inventory Verified Available
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Found <strong>{localAvailableAssetsCount} available</strong> {reviewingEmployee.requiredAssetCategory || "Laptop"}(s) in {reviewingEmployee.location}. Ready to approve allocation workflow.
                    </div>
                  </div>
                ) : (
                  <div className="space-y-1">
                    <div className="text-destructive font-semibold flex items-center gap-1.5">
                      <AlertCircle className="h-4.5 w-4.5" /> Out of Stock
                    </div>
                    <div className="text-xs text-muted-foreground">
                      No available {reviewingEmployee.requiredAssetCategory || "Laptop"} assets found in {reviewingEmployee.location}. Procurement needed before Support Engineer can assign hardware.
                    </div>
                  </div>
                )}
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
          )}

          <DialogFooter className="gap-2 sm:gap-0 mt-2">
            <Button variant="outline" onClick={() => setReviewingEmployee(null)}>Cancel</Button>
            <Button
              variant="destructive"
              onClick={() => handleVerifySubmit(false)}
            >
              Flag Out of Stock
            </Button>
            <Button
              onClick={() => handleVerifySubmit(true)}
              disabled={localAvailableAssetsCount === 0}
            >
              Verify & Approve
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
