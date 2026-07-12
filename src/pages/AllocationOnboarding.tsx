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
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { useData } from "@/contexts/data";
import type { Employee } from "@/types/domain";
import { toast } from "sonner";
import { Laptop, ArrowRight, User, Search } from "lucide-react";

export default function AllocationOnboardingPage() {
  const { employees, assets, completeOnboardingAllocation } = useData();

  const [assigningEmployee, setAssigningEmployee] = useState<Employee | null>(null);
  const [selectedAssetId, setSelectedAssetId] = useState<string>("");
  const [assetSearch, setAssetSearch] = useState("");
  const [remarks, setRemarks] = useState("");
  const [filterByLocation, setFilterByLocation] = useState(true);

  const isAllocationDue = (dateStr?: string, timeStr?: string) => {
    if (!dateStr || !timeStr) return false;
    const scheduled = new Date(`${dateStr}T${timeStr}:00`);
    return new Date() >= scheduled;
  };

  const formatDateTime = (dateStr?: string, timeStr?: string) => {
    if (!dateStr || !timeStr) return "";
    try {
      const d = new Date(`${dateStr}T${timeStr}:00`);
      return d.toLocaleString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit",
        hour12: true
      });
    } catch (e) {
      return `${dateStr} ${timeStr}`;
    }
  };

  const dueAllocations = useMemo(() => {
    return employees.filter(emp => emp.allocationStatus === "Ready for Allocation");
  }, [employees]);

  const allocationHistory = useMemo(() => {
    return employees.filter(emp => emp.allocationStatus === "Completed");
  }, [employees]);

  const availableAssets = useMemo(() => {
    if (!assigningEmployee) return [];
    return assets.filter(asset => {
      if (asset.status !== "Available") return false;
      if (asset.category !== (assigningEmployee.requiredAssetCategory || "Laptop")) return false;
      if (filterByLocation && asset.location !== assigningEmployee.location) return false;
      if (assetSearch.trim()) {
        const s = assetSearch.toLowerCase();
        return (
          asset.name.toLowerCase().includes(s) ||
          asset.id.toLowerCase().includes(s) ||
          asset.category.toLowerCase().includes(s) ||
          asset.model.toLowerCase().includes(s) ||
          asset.serial.toLowerCase().includes(s)
        );
      }
      return true;
    });
  }, [assets, assigningEmployee, assetSearch, filterByLocation]);

  const handleOpenAssignDialog = (emp: Employee) => {
    setAssigningEmployee(emp);
    setSelectedAssetId("");
    setAssetSearch("");
    setRemarks("");
    setFilterByLocation(true);
  };

  const handleConfirmAssignment = () => {
    if (!assigningEmployee || !selectedAssetId) return;
    const asset = assets.find(a => a.id === selectedAssetId);
    if (!asset) return;

    completeOnboardingAllocation(assigningEmployee.id, selectedAssetId, remarks, "Support Engineer User");
    toast.success(`Asset "${asset.name}" assigned to ${assigningEmployee.name}. Onboarding completed.`);
    setAssigningEmployee(null);
  };

  const pendingColumns: ColumnDef<Employee>[] = [
    { accessorKey: "id", header: "Employee ID" },
    { accessorKey: "name", header: "Name" },
    { accessorKey: "department", header: "Department" },
    { accessorKey: "requiredAssetCategory", header: "Assigned Category", cell: ({row}) => <span className="font-semibold text-primary">{row.original.requiredAssetCategory || "Laptop"}</span> },
    { id: "schedule", header: "Scheduled Date & Time", cell: ({row}) => formatDateTime(row.original.allocationDate, row.original.allocationTime) },
    { id: "status", header: "Status", cell: ({row}) => <StatusBadge status={row.original.allocationStatus ?? "Ready for Allocation"}/> },
    { id: "actions", header: "", cell: ({row}) => (
      <Button size="sm" onClick={() => handleOpenAssignDialog(row.original)}>
        Assign Assets
      </Button>
    )},
  ];

  const historyColumns: ColumnDef<Employee>[] = [
    { accessorKey: "id", header: "Employee ID" },
    { accessorKey: "name", header: "Name" },
    { accessorKey: "department", header: "Department" },
    { id: "assetName", header: "Assigned Hardware", cell: ({row}) => {
      const details = row.original.allocatedAssetDetails;
      if (!details) return <span className="text-muted-foreground">—</span>;
      return (
        <div>
          <div className="font-semibold text-success">{details.assetName}</div>
          <div className="font-mono text-xs text-muted-foreground">ID: {details.assetId} • S/N: {details.serialNumber}</div>
        </div>
      );
    }},
    { id: "assignedAt", header: "Assigned Date", cell: ({row}) => row.original.allocatedAssetDetails?.assignedAt || "Not set" },
    { id: "assignedBy", header: "Assigned By", cell: ({row}) => row.original.allocatedAssetDetails?.assignedBy || "System" },
    { id: "remarks", header: "Remarks", cell: ({row}) => <span className="text-muted-foreground italic truncate max-w-40 block">{row.original.allocatedAssetDetails?.remarks || "—"}</span> },
  ];

  return (
    <>
      <PageHeader
        title="Asset Allocation Onboarding"
        description="Assign approved hardware assets and configure employee workspaces."
      />

      <Tabs defaultValue="pending">
        <TabsList className="mb-4">
          <TabsTrigger value="pending" className="relative">
            Pending Onboardings
            {dueAllocations.length > 0 && (
              <span className="ml-1.5 px-1.5 py-0.5 text-[10px] font-bold bg-destructive text-destructive-foreground rounded-full leading-none">
                {dueAllocations.length}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="history">
            Allocation Onboarding History ({allocationHistory.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pending">
          <Card className="p-4">
            <DataTable
              data={dueAllocations}
              columns={pendingColumns}
              searchPlaceholder="Search pending allocations…"
              pageSize={15}
            />
          </Card>
        </TabsContent>

        <TabsContent value="history">
          <Card className="p-4">
            <DataTable
              data={allocationHistory}
              columns={historyColumns}
              searchPlaceholder="Search assignment history…"
              pageSize={15}
            />
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={!!assigningEmployee} onOpenChange={(o) => !o && setAssigningEmployee(null)}>
        <DialogContent className="sm:max-w-[550px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Laptop className="h-5 w-5 text-primary" /> Assign IT Assets
            </DialogTitle>
            <DialogDescription>
              Assign available hardware assets to complete the workspace setup schedule.
            </DialogDescription>
          </DialogHeader>

          {assigningEmployee && (
            <div className="space-y-4 py-2">
              <div className="p-4 bg-muted/50 rounded-lg border grid grid-cols-2 gap-y-2 gap-x-4 text-sm">
                <div>
                  <span className="text-xs text-muted-foreground block">Employee Name</span>
                  <span className="font-medium flex items-center gap-1.5 mt-0.5">
                    <User className="h-3.5 w-3.5 text-muted-foreground" /> {assigningEmployee.name}
                  </span>
                </div>
                <div>
                  <span className="text-xs text-muted-foreground block">Employee ID</span>
                  <span className="font-mono mt-0.5 block">{assigningEmployee.id}</span>
                </div>
                <div>
                  <span className="text-xs text-muted-foreground block">Required hardware category</span>
                  <span className="font-bold mt-0.5 block text-primary">{assigningEmployee.requiredAssetCategory || "Laptop"}</span>
                </div>
                <div>
                  <span className="text-xs text-muted-foreground block">Location</span>
                  <span className="font-medium text-foreground mt-0.5 block">{assigningEmployee.location}</span>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Select Hardware Asset</Label>
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="loc-filter"
                      checked={filterByLocation}
                      onCheckedChange={(checked) => setFilterByLocation(!!checked)}
                    />
                    <Label htmlFor="loc-filter" className="text-xs text-muted-foreground cursor-pointer select-none">
                      Filter assets in {assigningEmployee.location}
                    </Label>
                  </div>
                </div>

                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search model, serial, category…"
                    className="pl-8 h-9 text-sm"
                    value={assetSearch}
                    onChange={e => setAssetSearch(e.target.value)}
                  />
                </div>

                <div className="border rounded-md max-h-[220px] overflow-y-auto divide-y bg-background scrollbar-thin">
                  {availableAssets.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground text-xs">
                      No available {assigningEmployee.requiredAssetCategory || "Laptop"}s found in {filterByLocation ? assigningEmployee.location : "any location"}.
                      {filterByLocation && (
                        <button
                          type="button"
                          className="text-primary hover:underline block mx-auto mt-1 font-medium"
                          onClick={() => setFilterByLocation(false)}
                        >
                          Show assets in all locations
                        </button>
                      )}
                    </div>
                  ) : (
                    availableAssets.map(asset => {
                      const selected = selectedAssetId === asset.id;
                      return (
                        <div
                          key={asset.id}
                          onClick={() => setSelectedAssetId(asset.id)}
                          className={`p-3 flex items-center justify-between gap-3 cursor-pointer transition-colors ${
                            selected ? "bg-primary/5 border-l-2 border-primary" : "hover:bg-muted/30"
                          }`}
                        >
                          <div className="min-w-0">
                            <div className="text-xs font-bold text-muted-foreground uppercase">{asset.category}</div>
                            <div className="text-sm font-semibold truncate text-foreground mt-0.5">{asset.name}</div>
                            <div className="text-xs text-muted-foreground mt-0.5">
                              Model: {asset.model} • S/N: {asset.serial}
                            </div>
                          </div>
                          <div className="text-right shrink-0 flex flex-col items-end gap-1">
                            <span className="text-xs font-mono bg-muted px-2 py-0.5 rounded text-muted-foreground border">
                              {asset.id}
                            </span>
                            <span className="text-[10px] text-muted-foreground mt-0.5 block">{asset.location}</span>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              <div>
                <Label className="text-xs font-semibold">Allocation Remarks</Label>
                <Input
                  className="mt-1.5 text-sm"
                  placeholder="e.g. Configured local networks, delivered device to user."
                  value={remarks}
                  onChange={e => setRemarks(e.target.value)}
                />
              </div>
            </div>
          )}

          <DialogFooter className="border-t pt-3">
            <Button variant="outline" onClick={() => setAssigningEmployee(null)}>Cancel</Button>
            <Button onClick={handleConfirmAssignment} disabled={!selectedAssetId}>
              Confirm Allocation & Onboard <ArrowRight className="h-4 w-4 ml-1" />
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
