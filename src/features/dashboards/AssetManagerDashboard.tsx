import { useState, useEffect, useMemo, useCallback } from "react";
import { apiFetch, apiUpload } from "@/services/api";
import { Package, CheckCircle2, PackageCheck, Wrench, Archive, Plus, Download, Upload, MoreHorizontal, Eye, Edit, Trash2, ChevronDown, FileUp, ChevronLeft, ChevronRight, Search, Loader2 } from "lucide-react";
import { PageHeader } from "@/components/common/PageHeader";
import { StatCard } from "@/components/common/StatCard";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { StatusBadge } from "@/components/common/StatusBadge";
import { WorkflowTimeline, getWorkflowStageLabel } from "@/components/common/WorkflowTimeline";
import { HardwareCategoryBadges } from "@/components/common/HardwareCategoryBadges";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { assetStats, normalizeAssetStatus } from "@/lib/assets";
import { STANDARD_HARDWARE_CATEGORIES } from "@/lib/asset-categories";
import * as XLSX from "xlsx";

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

const STATUS_OPTIONS = ["Available", "Assigned", "Under Maintenance", "Out of Stock"];

function handleDownloadSample() {
  const columns = ["Asset Name", "Category", "Brand", "Model", "Serial Number", "Purchase Date", "Warranty Expiry Date", "Status"];
  const sampleData = [{
    "Asset Name": "Dell Latitude 5540",
    "Category": "Laptop",
    "Brand": "Dell",
    "Model": "Latitude 5540",
    "Serial Number": "SN1234567890",
    "Purchase Date": "2026-01-15",
    "Warranty Expiry Date": "2028-01-15",
    "Status": "Available",
  }];
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(sampleData, { header: columns });
  XLSX.utils.book_append_sheet(wb, ws, "Assets");
  const categoryWs = XLSX.utils.json_to_sheet(
    STANDARD_HARDWARE_CATEGORIES.map((category) => ({ Category: category }))
  );
  XLSX.utils.book_append_sheet(wb, categoryWs, "Allowed Categories");
  XLSX.writeFile(wb, "asset_import_sample.xlsx");
}

export function AssetManagerDashboard() {
  const [summary, setSummary] = useState<any>(null);
  const [allAssets, setAllAssets] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [statusFilter, setStatusFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const pageSize = 10;

  const [selectedAsset, setSelectedAsset] = useState<any>(null);
  const [selectedWorkflowEmp, setSelectedWorkflowEmp] = useState<any>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<any>(null);
  const [importOpen, setImportOpen] = useState(false);
  const [bulkOpen, setBulkOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const [createName, setCreateName] = useState("");
  const [createCategory, setCreateCategory] = useState("");
  const [createCustomCategory, setCreateCustomCategory] = useState("");
  const [createManufacturer, setCreateManufacturer] = useState("");
  const [createModel, setCreateModel] = useState("");
  const [createSerial, setCreateSerial] = useState("");

  const loadData = useCallback(async () => {
    console.log("==========================================");
    console.log("[AssetManagerDashboard] Loading dashboard data...");
    const apiBase = (import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000").replace(/\/$/, "");
    console.log("[AssetManagerDashboard] API Base URL:", apiBase);
    console.log("[AssetManagerDashboard] Dashboard endpoint:", `${apiBase}/asset-manager/dashboard`);
    setLoading(true);

    try {
      try {
        console.log("[AssetManagerDashboard] >>> REQUEST: GET /asset-manager/dashboard");
        const dashData = await apiFetch<any>("/asset-manager/dashboard");
        console.log("[AssetManagerDashboard] <<< RESPONSE STATUS: 200");
        console.log("[AssetManagerDashboard] <<< RESPONSE BODY:", dashData);
        setSummary(dashData?.summary ?? dashData ?? null);
      } catch (dashErr: any) {
        console.warn("[AssetManagerDashboard] Dashboard summary failed:", dashErr.message);
        console.warn("[AssetManagerDashboard] HTTP Status:", dashErr.status ?? "N/A");
        console.warn("[AssetManagerDashboard] Error body:", dashErr.body ?? "N/A");
        setSummary(null);
      }

      try {
        console.log("[AssetManagerDashboard] >>> REQUEST: GET /asset-manager");
        const response = await apiFetch<any>("/asset-manager");
        console.log("[AssetManagerDashboard] <<< RESPONSE STATUS: 200");
        console.log("Assets API Response:", response);

        let rawAssets: any[] = [];
        if (Array.isArray(response)) {
          rawAssets = response;
        } else if (response?.assets && Array.isArray(response.assets)) {
          rawAssets = response.assets;
        } else if (response?.data?.assets && Array.isArray(response.data.assets)) {
          rawAssets = response.data.assets;
        } else if (response?.data && Array.isArray(response.data)) {
          rawAssets = response.data;
        }

        const assets = rawAssets.map((item: any) => ({
          assetId: item.AssetId || item.assetId || item.display_id || item.id || "",
          assetName: item.AssetName || item.assetName || item.name || "",
          assetTag: item.AssetTag || item.assetTag || "",
          brand: item.Brand || item.brand || item.manufacturer || "",
          category: item.Category || item.category || "",
          model: item.Model || item.model || "",
          serialNumber: item.SerialNumber || item.serialNumber || item.serial || "",
          status: normalizeAssetStatus(item.Status || item.status),
          assignedTo: item.AssignedTo || item.assignedTo || item.assigned_to_id || null,
          purchaseDate: item.PurchaseDate || item.purchaseDate || item.purchase_date || "",
          warrantyExpiry: item.WarrantyExpiry || item.warrantyExpiry || item.warranty_expiry || "",
          condition: item.Condition || item.condition || "",
          vendor: item.Vendor || item.vendor || "",
          createdAt: item.CreatedAt || item.createdAt || item.created_at || "",
          updatedAt: item.UpdatedAt || item.updatedAt || "",
          createdBy: item.CreatedBy || item.createdBy || "",
          assignedAt: item.AssignedAt || item.assignedAt || "",
          hardwareRequired: item.HardwareRequired || item.hardwareRequired || "",
        }));
        setAllAssets(assets);
        console.log(`[AssetManagerDashboard] Total assets received: ${rawAssets.length}`);
        if (rawAssets.length > 0) {
          console.log("[AssetManagerDashboard] First asset object:", rawAssets[0]);
        }
        console.log("[AssetManagerDashboard] Assets stored in state:", assets.length);
        setError(null);
      } catch (assetsErr: any) {
        console.error("[AssetManagerDashboard] Asset list fetch error:", assetsErr);
        console.error("[AssetManagerDashboard] HTTP Status:", assetsErr.status ?? "Unknown");
        console.error("[AssetManagerDashboard] Error body:", assetsErr.body ?? "N/A");
        setError("Unable to load dashboard. Please try again.");
        return;
      }

      try {
        console.log("[AssetManagerDashboard] >>> REQUEST: GET /admin/employees?limit=10000");
        const empData = await apiFetch<any>("/admin/employees?limit=10000");
        console.log("[AssetManagerDashboard] <<< RESPONSE STATUS: 200");
        const empCount = Array.isArray(empData) ? empData.length : empData?.items?.length ?? 0;
        console.log("[AssetManagerDashboard] <<< Employees count:", empCount);
        const empItems = Array.isArray(empData) ? empData : empData?.items ?? [];
        setEmployees(empItems);
      } catch (err: any) {
        console.warn("[AssetManagerDashboard] Failed to fetch employees:", err.message);
        console.warn("[AssetManagerDashboard] HTTP Status:", err.status ?? "N/A");
      }
    } catch (err: any) {
      console.error("[AssetManagerDashboard] Dashboard load error:", err);
      console.error("[AssetManagerDashboard] HTTP Status:", err.status ?? "Unknown");
      console.error("[AssetManagerDashboard] Error body:", err.body ?? "N/A");
      setError("Unable to load dashboard. Please try again.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
    const interval = setInterval(() => {
      loadData();
    }, 30000);
    return () => clearInterval(interval);
  }, [loadData]);

  const stats = useMemo(() => {
    if (summary) {
      const counts = assetStats(allAssets);
      return {
        total_assets: summary.total_assets ?? allAssets.length,
        assigned_assets: summary.assigned_assets ?? counts.assigned,
        available_assets: summary.available_assets ?? counts.available,
        maintenance_assets: summary.maintenance_assets ?? counts.maintenance,
        out_of_stock_assets: summary.out_of_stock_assets ?? counts.outOfStock,
      };
    }
    const counts = assetStats(allAssets);
    return {
      total_assets: allAssets.length,
      assigned_assets: counts.assigned,
      available_assets: counts.available,
      maintenance_assets: counts.maintenance,
      out_of_stock_assets: counts.outOfStock,
    };
  }, [summary, allAssets]);

  const getEmployeeName = useCallback((assignedToId: string | null) => {
    if (!assignedToId) return null;
    const emp = employees.find(
      (e: any) => e.id === assignedToId || e.uuid === assignedToId || e.display_id === assignedToId
    );
    return emp || null;
  }, [employees]);

  const filteredAssets = useMemo(() => {
    let result = [...allAssets];

    if (statusFilter !== "all") {
      result = result.filter((a: any) => a.status === statusFilter);
    }

    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter((a: any) => {
        const assetId = (a.assetId || "").toLowerCase();
        const name = (a.assetName || "").toLowerCase();
        const cat = (a.category || "").toLowerCase();
        const empId = ((a.assignedTo || "") + "").toLowerCase();
        const emp = getEmployeeName(a.assignedTo);
        const empName = (emp?.name || "").toLowerCase();
        return assetId.includes(q) || name.includes(q) || cat.includes(q) || empId.includes(q) || empName.includes(q);
      });
    }

    return result;
  }, [allAssets, statusFilter, search, getEmployeeName]);

  const paginatedAssets = useMemo(() => {
    const start = page * pageSize;
    return filteredAssets.slice(start, start + pageSize);
  }, [filteredAssets, page, pageSize]);

  const totalPages = Math.ceil(filteredAssets.length / pageSize);

  useEffect(() => {
    setPage(0);
  }, [statusFilter, search]);

  const handleCreate = async () => {
    const finalCategory = createCategory === "Other" ? createCustomCategory.trim() : createCategory;
    if (!createName.trim() || !finalCategory || !createManufacturer || !createSerial.trim()) {
      toast.error("Please fill in all required fields");
      return;
    }
    setSaving(true);
    try {
      const dPayload: Record<string, any> = {
        AssetName: createName.trim(),
        Category: finalCategory,
        Manufacturer: createManufacturer,
        Model: createModel.trim() || `${createManufacturer.slice(0, 2).toUpperCase()}-${Math.floor(Math.random() * 9000 + 1000)}`,
        SerialNumber: createSerial.trim().toUpperCase(),
        PurchaseDate: todayStr(),
        WarrantyExpiry: new Date(new Date().setFullYear(new Date().getFullYear() + 2)).toISOString().slice(0, 10),
        Cost: Math.floor(Math.random() * 2500) + 500,
        Status: "Available",
      };

      console.log("Asset Create Payload:", dPayload);

      await apiFetch("/asset-manager", {
        method: "POST",
        body: JSON.stringify(dPayload),
      });
      toast.success("Asset Created Successfully");
      setCreateOpen(false);
      setCreateName("");
      setCreateCategory("");
      setCreateCustomCategory("");
      setCreateManufacturer("");
      setCreateModel("");
      setCreateSerial("");
      await loadData();
    } catch (err: any) {
      toast.error(err.message || "Failed to create asset");
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = async () => {
    if (!editTarget) return;
    setSaving(true);
    try {
      const body: any = {};
      if (editTarget._editName?.trim()) body.name = editTarget._editName.trim();
      if (editTarget._editCategory) body.category = editTarget._editCategory;
      if (editTarget._editManufacturer) body.manufacturer = editTarget._editManufacturer;
      if (editTarget._editModel?.trim()) body.model = editTarget._editModel.trim();
      if (editTarget._editSerial?.trim()) body.serial = editTarget._editSerial.trim().toUpperCase();
      if (editTarget._editStatus) body.status = editTarget._editStatus;

      await apiFetch(`/asset-manager/${editTarget.assetId}`, {
        method: "PATCH",
        body: JSON.stringify(body),
      });
      toast.success("Asset Updated Successfully");
      setEditOpen(false);
      setEditTarget(null);
      await loadData();
    } catch (err: any) {
      toast.error(err.message || "Failed to update asset");
    } finally {
      setSaving(false);
    }
  };

  const handleRetire = async (asset: any) => {
    try {
      await apiFetch(`/asset-manager/${asset.assetId}/retire`, { method: "PATCH" });
      toast.success("Asset retired successfully");
      await loadData();
    } catch (err: any) {
      toast.error(err.message || "Failed to retire asset");
    }
  };

  const openEdit = (asset: any) => {
    setEditTarget({
      ...asset,
      _editName: asset.assetName || "",
      _editCategory: asset.category || "",
      _editManufacturer: asset.brand || "",
      _editModel: asset.model || "",
      _editSerial: asset.serialNumber || "",
      _editStatus: asset.status || "Available",
    });
    setEditOpen(true);
  };

  const formatDate = (d: string) => {
    if (!d) return "-";
    return d.slice(0, 10);
  };

  function renderAssetId(a: any) {
    return a.assetId || "-";
  }

  function renderAssigned(a: any) {
    if (!a.assignedTo) return <span className="text-muted-foreground">Available</span>;
    const emp = getEmployeeName(a.assignedTo);
    if (emp) {
      return <span>Assigned to: {emp.name} ({emp.display_id || emp.id})</span>;
    }
    return <span>Assigned to: {a.assignedTo}</span>;
  }

  if (loading && !error) {
    return (
      <>
        <PageHeader title="Asset Manager Dashboard" description="Loading assets from database..." />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
          {Array.from({ length: 5 }).map((_, i) => (
            <Card key={i} className="p-4 space-y-2">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-8 w-16" />
            </Card>
          ))}
        </div>
        <Card className="p-4">
          <div className="space-y-3">
            <Skeleton className="h-10 w-full" />
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        </Card>
      </>
    );
  }

  if (error) {
    return (
      <>
        <PageHeader title="Asset Manager Dashboard" description="Error loading data" />
        <Card className="p-8 text-center">
          <p className="text-destructive font-medium text-lg">Unable to load dashboard. Please try again.</p>
          <Button className="mt-4" variant="outline" onClick={loadData} disabled={loading}>
            {loading ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Retrying...</> : "Retry"}
          </Button>
        </Card>
      </>
    );
  }

  return (
    <>
      <PageHeader
        title="Asset Manager Dashboard"
        description="Lifecycle metrics, deployment status, and inventory health."
        actions={
          <>
            <Button variant="outline" onClick={handleDownloadSample}>
              <Download className="h-4 w-4 mr-1" />Download Sample
            </Button>
            <Button variant="outline" onClick={() => setImportOpen(true)}>
              <FileUp className="h-4 w-4 mr-1" />Import
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button><Plus className="h-4 w-4 mr-1" />Add Asset<ChevronDown className="h-4 w-4 ml-1" /></Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setCreateOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />Single Asset
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setBulkOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />Multiple Assets
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setImportOpen(true)}>
                  <Upload className="h-4 w-4 mr-2" />Import Excel
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </>
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
        <StatCard label="Total Assets" value={stats.total_assets.toLocaleString()} icon={Package} tone="primary" index={0} />
        <StatCard label="Assigned" value={stats.assigned_assets} icon={PackageCheck} tone="info" index={1} />
        <StatCard label="Available" value={stats.available_assets} icon={CheckCircle2} tone="success" index={2} />
        <StatCard label="In Maintenance" value={stats.maintenance_assets} icon={Wrench} tone="warning" index={3} />
        <StatCard label="Out of Stock" value={stats.out_of_stock_assets} icon={Archive} tone="danger" index={4} />
      </div>

      <Card className="p-4 mb-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by Asset ID, Name, Category, Employee..."
              className="pl-8 h-9"
            />
          </div>
          <div className="min-w-40">
            <Tabs value={statusFilter} onValueChange={setStatusFilter}>
              <TabsList>
                <TabsTrigger value="all">All</TabsTrigger>
                <TabsTrigger value="Available">Available</TabsTrigger>
                <TabsTrigger value="Assigned">Assigned</TabsTrigger>
                <TabsTrigger value="Under Maintenance">Maintenance</TabsTrigger>
                <TabsTrigger value="Out of Stock">Out of Stock</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </div>
      </Card>

      <Card className="p-4">
        {filteredAssets.length === 0 ? (
          <div className="text-center text-muted-foreground py-10">No Assets Found</div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/40 hover:bg-muted/40">
                    <TableHead className="text-xs uppercase tracking-wider font-semibold whitespace-nowrap">Asset ID</TableHead>
                    <TableHead className="text-xs uppercase tracking-wider font-semibold whitespace-nowrap">Asset Name</TableHead>
                    <TableHead className="text-xs uppercase tracking-wider font-semibold whitespace-nowrap">Category</TableHead>
                    <TableHead className="text-xs uppercase tracking-wider font-semibold whitespace-nowrap">Brand</TableHead>
                    <TableHead className="text-xs uppercase tracking-wider font-semibold whitespace-nowrap">Model</TableHead>
                    <TableHead className="text-xs uppercase tracking-wider font-semibold whitespace-nowrap">Serial Number</TableHead>
                    <TableHead className="text-xs uppercase tracking-wider font-semibold whitespace-nowrap">Status</TableHead>
                    <TableHead className="text-xs uppercase tracking-wider font-semibold whitespace-nowrap">Assigned Employee</TableHead>
                    <TableHead className="text-xs uppercase tracking-wider font-semibold whitespace-nowrap">Purchase Date</TableHead>
                    <TableHead className="text-xs uppercase tracking-wider font-semibold whitespace-nowrap">Warranty</TableHead>
                    <TableHead className="text-xs uppercase tracking-wider font-semibold whitespace-nowrap">Created Date</TableHead>
                    <TableHead className="text-xs uppercase tracking-wider font-semibold whitespace-nowrap">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedAssets.map((a: any) => (
                    <TableRow key={a.assetId} className="cursor-pointer" onClick={() => setSelectedAsset(a)}>
                      <TableCell className="text-sm font-mono whitespace-nowrap">{renderAssetId(a)}</TableCell>
                      <TableCell className="text-sm whitespace-nowrap">{a.assetName || "-"}</TableCell>
                      <TableCell className="text-sm whitespace-nowrap">{a.category || "-"}</TableCell>
                      <TableCell className="text-sm whitespace-nowrap">{a.brand || "-"}</TableCell>
                      <TableCell className="text-sm whitespace-nowrap">{a.model || "-"}</TableCell>
                      <TableCell className="text-sm font-mono whitespace-nowrap">{a.serialNumber || "-"}</TableCell>
                      <TableCell className="whitespace-nowrap"><StatusBadge status={a.status || "Available"} /></TableCell>
                      <TableCell className="text-sm whitespace-nowrap">{renderAssigned(a)}</TableCell>
                      <TableCell className="text-sm whitespace-nowrap">{formatDate(a.purchaseDate)}</TableCell>
                      <TableCell className="text-sm whitespace-nowrap">{formatDate(a.warrantyExpiry)}</TableCell>
                      <TableCell className="text-sm whitespace-nowrap">{formatDate(a.createdAt)}</TableCell>
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8"><MoreHorizontal className="h-4 w-4" /></Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => setSelectedAsset(a)}><Eye className="h-4 w-4 mr-2" />View</DropdownMenuItem>
                            <DropdownMenuItem onClick={() => openEdit(a)}><Edit className="h-4 w-4 mr-2" />Edit</DropdownMenuItem>
                            <DropdownMenuItem className="text-destructive" onClick={() => handleRetire(a)}>
                              <Trash2 className="h-4 w-4 mr-2" />Retire
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            <div className="flex items-center justify-between text-sm mt-4">
              <div className="text-muted-foreground">
                Showing {paginatedAssets.length} of {filteredAssets.length} asset{filteredAssets.length !== 1 ? "s" : ""}
              </div>
              <div className="flex items-center gap-1">
                <Button size="sm" variant="outline" onClick={() => setPage((p) => Math.max(0, p - 1))} disabled={page === 0}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <div className="px-3 text-sm">
                  Page {page + 1} / {totalPages || 1}
                </div>
                <Button size="sm" variant="outline" onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))} disabled={page >= totalPages - 1}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </>
        )}
      </Card>

      {/* Employee Onboarding Workflow Queue */}
      <Card className="p-4 mt-6">
        <div className="font-semibold text-sm mb-3 flex items-center justify-between">
          <span>Employee Onboarding Workflow</span>
          <span className="text-xs text-muted-foreground font-normal">
            {employees.filter((e: any) => e.allocationStatus && e.allocationStatus !== "Completed").length} in progress
          </span>
        </div>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40 hover:bg-muted/40">
                <TableHead className="text-xs uppercase tracking-wider font-semibold whitespace-nowrap">Employee</TableHead>
                <TableHead className="text-xs uppercase tracking-wider font-semibold whitespace-nowrap">Department</TableHead>
                <TableHead className="text-xs uppercase tracking-wider font-semibold whitespace-nowrap">Workflow Timeline</TableHead>
                <TableHead className="text-xs uppercase tracking-wider font-semibold whitespace-nowrap">Stage</TableHead>
                <TableHead className="text-xs uppercase tracking-wider font-semibold whitespace-nowrap">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {employees.filter((e: any) => e.allocationStatus).length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground text-sm py-8">
                    No employees with active workflow found.
                  </TableCell>
                </TableRow>
              ) : (
                (employees as any[])
                  .filter((e: any) => e.allocationStatus)
                  .sort((a: any, b: any) => {
                    const order: Record<string, number> = { "Awaiting Asset Verification": 0, "Ready for Allocation": 1, "Sent to IT Support Team": 1, "Assigned to IT Support": 2, "IT Asset Assignment In Progress": 2, "Asset Allocated": 3, "Assets Allocated": 3, "Ready for Delivery": 3, "Completed": 4 };
                    return (order[a.allocationStatus ?? ""] ?? 0) - (order[b.allocationStatus ?? ""] ?? 0);
                  })
                  .map((emp: any) => (
                    <TableRow
                      key={emp.id}
                      className="cursor-pointer"
                      onClick={() => setSelectedWorkflowEmp(emp)}
                    >
                      <TableCell className="text-sm whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <div className="h-7 w-7 rounded-full bg-primary/10 text-primary text-[10px] font-bold grid place-items-center">
                            {emp.avatar || emp.name?.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2) || "NA"}
                          </div>
                          <div>
                            <div className="font-medium text-sm">{emp.name}</div>
                            <div className="text-[10px] text-muted-foreground font-mono">{emp.id}</div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm whitespace-nowrap">{emp.department || "-"}</TableCell>
                      <TableCell className="min-w-[280px]">
                        <WorkflowTimeline allocationStatus={emp.allocationStatus} variant="horizontal" />
                      </TableCell>
                      <TableCell className="whitespace-nowrap">
                        <span className="text-xs font-medium text-muted-foreground">
                          {getWorkflowStageLabel(emp.allocationStatus)}
                        </span>
                      </TableCell>
                      <TableCell className="whitespace-nowrap">
                        <StatusBadge status={emp.status} />
                      </TableCell>
                    </TableRow>
                  ))
              )}
            </TableBody>
          </Table>
        </div>
      </Card>

      {/* Employee Workflow Detail Sheet */}
      <Sheet open={!!selectedWorkflowEmp} onOpenChange={(o) => !o && setSelectedWorkflowEmp(null)}>
        <SheetContent className="sm:max-w-[550px] overflow-y-auto h-full pr-6">
          <SheetHeader className="border-b pb-4 mb-4">
            <SheetTitle className="flex items-center gap-2 text-lg">
              <Package className="h-5 w-5 text-primary" /> Employee Workflow Details
            </SheetTitle>
          </SheetHeader>
          {selectedWorkflowEmp && (
            <div className="space-y-6 text-sm">
              <div className="flex items-center gap-4 p-4 bg-muted/40 rounded-lg border">
                <Avatar className="h-14 w-14 border-2 border-primary/20">
                  <AvatarFallback className="text-base font-bold bg-primary/10 text-primary">
                    {selectedWorkflowEmp.avatar || selectedWorkflowEmp.name?.split(" ").map((n: string) => n[0]).join("").toUpperCase() || "NA"}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <div className="text-xs uppercase font-bold text-primary tracking-wider">{selectedWorkflowEmp.designation || ""}</div>
                  <h4 className="font-bold text-lg text-foreground truncate">{selectedWorkflowEmp.name}</h4>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="font-mono text-xs text-muted-foreground">{selectedWorkflowEmp.id}</span>
                    <StatusBadge status={selectedWorkflowEmp.status} />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 border rounded-lg p-4 bg-card shadow-sm">
                <div>
                  <span className="text-[10px] text-muted-foreground block uppercase font-semibold">Department</span>
                  <span className="font-medium text-foreground">{selectedWorkflowEmp.department || "-"}</span>
                </div>
                <div>
                  <span className="text-[10px] text-muted-foreground block uppercase font-semibold">Email</span>
                  <span className="font-medium text-foreground break-all">{selectedWorkflowEmp.email || "-"}</span>
                </div>
                {selectedWorkflowEmp.joinDate && (
                  <div>
                    <span className="text-[10px] text-muted-foreground block uppercase font-semibold">Join Date</span>
                    <span className="font-medium text-foreground">{selectedWorkflowEmp.joinDate}</span>
                  </div>
                )}
                {selectedWorkflowEmp.allocationDate && (
                  <div>
                    <span className="text-[10px] text-muted-foreground block uppercase font-semibold">Scheduled Date</span>
                    <span className="font-medium text-foreground">{selectedWorkflowEmp.allocationDate}{selectedWorkflowEmp.allocationTime ? ` @ ${selectedWorkflowEmp.allocationTime}` : ""}</span>
                  </div>
                )}
              </div>

              <div className="border rounded-lg p-4 bg-card shadow-sm">
                <h5 className="font-semibold text-xs text-muted-foreground uppercase tracking-wider mb-2.5">Asset Onboarding Workflow</h5>
                <div className="grid grid-cols-2 gap-y-2 text-xs mb-3">
                  <span className="text-muted-foreground">Current Stage:</span>
                  <span className="font-medium text-foreground">{getWorkflowStageLabel(selectedWorkflowEmp.allocationStatus)}</span>
                  {selectedWorkflowEmp.requiredAssetCategory && (
                    <>
                      <span className="text-muted-foreground">Required Asset:</span>
                      <HardwareCategoryBadges value={selectedWorkflowEmp.requiredAssetCategory} />
                    </>
                  )}
                </div>
                <WorkflowTimeline allocationStatus={selectedWorkflowEmp.allocationStatus} />
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>

      <Sheet open={!!selectedAsset} onOpenChange={(o) => !o && setSelectedAsset(null)}>
        <SheetContent className="w-full sm:max-w-xl overflow-y-auto p-6">
          {selectedAsset && (
            <>
              <SheetHeader className="p-0 mb-4">
                <div className="text-xs text-muted-foreground">{renderAssetId(selectedAsset)}</div>
                <SheetTitle className="text-xl">{selectedAsset.assetName}</SheetTitle>
                <div className="mt-2"><StatusBadge status={selectedAsset.status || "Available"} /></div>
              </SheetHeader>
              <div className="space-y-4">
                <Card className="p-4">
                  <div className="font-semibold text-sm mb-3">Details</div>
                  <div className="grid grid-cols-2 gap-y-2 text-sm">
                    <span className="text-muted-foreground">Category</span><span>{selectedAsset.category || "-"}</span>
                    <span className="text-muted-foreground">Brand</span><span>{selectedAsset.brand || "-"}</span>
                    <span className="text-muted-foreground">Model</span><span>{selectedAsset.model || "-"}</span>
                    <span className="text-muted-foreground">Serial</span><span>{selectedAsset.serialNumber || "-"}</span>
                    <span className="text-muted-foreground">Purchase Date</span><span>{formatDate(selectedAsset.purchaseDate)}</span>
                    <span className="text-muted-foreground">Warranty Expiry</span><span>{formatDate(selectedAsset.warrantyExpiry)}</span>
                    <span className="text-muted-foreground">Assigned</span><span>{renderAssigned(selectedAsset)}</span>
                    <span className="text-muted-foreground">Created Date</span><span>{formatDate(selectedAsset.createdAt)}</span>
                  </div>
                </Card>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>

      <Dialog open={createOpen} onOpenChange={(o) => { if (!o) setCreateCustomCategory(""); setCreateOpen(o); }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add New Asset</DialogTitle></DialogHeader>
          <div className="grid gap-3">
            <div>
              <Label>Asset Name *</Label>
              <Input className="mt-1.5" placeholder="Dell Latitude 5540" value={createName} onChange={(e) => setCreateName(e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Category *</Label>
                <Select value={createCategory} onValueChange={setCreateCategory}>
                  <SelectTrigger className="mt-1.5"><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>
                    {STANDARD_HARDWARE_CATEGORIES.map((category) => (
                      <SelectItem key={category} value={category}>{category}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Brand *</Label>
                <Select value={createManufacturer} onValueChange={setCreateManufacturer}>
                  <SelectTrigger className="mt-1.5"><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Dell">Dell</SelectItem>
                    <SelectItem value="HP">HP</SelectItem>
                    <SelectItem value="Lenovo">Lenovo</SelectItem>
                    <SelectItem value="Apple">Apple</SelectItem>
                    <SelectItem value="Microsoft">Microsoft</SelectItem>
                    <SelectItem value="Samsung">Samsung</SelectItem>
                    <SelectItem value="Cisco">Cisco</SelectItem>
                    <SelectItem value="Other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            {createCategory === "Other" && (
              <div>
                <Label>Custom Category</Label>
                <Input className="mt-1.5" placeholder="Enter category name" value={createCustomCategory} onChange={(e) => setCreateCustomCategory(e.target.value)} />
              </div>
            )}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Model</Label>
                  <Input className="mt-1.5" placeholder="Latitude 5540" value={createModel} onChange={(e) => setCreateModel(e.target.value)} />
                </div>
                <div>
                  <Label>Serial Number *</Label>
                  <Input className="mt-1.5" placeholder="SN..." value={createSerial} onChange={(e) => setCreateSerial(e.target.value)} />
                </div>
              </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)} disabled={saving}>Cancel</Button>
            <Button onClick={handleCreate} disabled={saving}>{saving ? "Saving..." : "Create"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Edit Asset</DialogTitle></DialogHeader>
          {editTarget && (
            <div className="grid gap-3">
              <div>
                <Label>Asset Name</Label>
                <Input className="mt-1.5" value={editTarget._editName} onChange={(e) => setEditTarget({ ...editTarget, _editName: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Category</Label>
                  <Select value={editTarget._editCategory} onValueChange={(v) => setEditTarget({ ...editTarget, _editCategory: v })}>
                    <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {STANDARD_HARDWARE_CATEGORIES.map((category) => (
                        <SelectItem key={category} value={category}>{category}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Brand</Label>
                  <Select value={editTarget._editManufacturer} onValueChange={(v) => setEditTarget({ ...editTarget, _editManufacturer: v })}>
                    <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Dell">Dell</SelectItem>
                      <SelectItem value="HP">HP</SelectItem>
                      <SelectItem value="Lenovo">Lenovo</SelectItem>
                      <SelectItem value="Apple">Apple</SelectItem>
                      <SelectItem value="Microsoft">Microsoft</SelectItem>
                      <SelectItem value="Samsung">Samsung</SelectItem>
                      <SelectItem value="Cisco">Cisco</SelectItem>
                      <SelectItem value="Other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Model</Label><Input className="mt-1.5" value={editTarget._editModel} onChange={(e) => setEditTarget({ ...editTarget, _editModel: e.target.value })} /></div>
                <div><Label>Serial Number</Label><Input className="mt-1.5" value={editTarget._editSerial} onChange={(e) => setEditTarget({ ...editTarget, _editSerial: e.target.value })} /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Status</Label>
                  <Select value={editTarget._editStatus} onValueChange={(v) => setEditTarget({ ...editTarget, _editStatus: v })}>
                    <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {STATUS_OPTIONS.map((s) => (
                        <SelectItem key={s} value={s}>{s}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)} disabled={saving}>Cancel</Button>
            <Button onClick={handleEdit} disabled={saving}>{saving ? "Saving..." : "Update"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {importOpen && (
        <ImportDialog
          open={importOpen}
          onOpenChange={setImportOpen}
          onDone={() => { setImportOpen(false); loadData(); }}
        />
      )}

      {bulkOpen && (
        <BulkDialog
          open={bulkOpen}
          onOpenChange={setBulkOpen}
          onDone={() => { setBulkOpen(false); loadData(); }}
        />
      )}
    </>
  );
}

function ImportDialog({ open, onOpenChange, onDone }: { open: boolean; onOpenChange: (v: boolean) => void; onDone: () => void }) {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  const handleUpload = async () => {
    if (!file) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      await apiUpload("/asset-manager/bulk", formData);
      toast.success("Import successful");
      onDone();
    } catch (err: any) {
      toast.error(err.message || "Import failed");
    } finally {
      setUploading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>Import Assets</DialogTitle></DialogHeader>
        <div className="space-y-4 py-2">
          <Input type="file" accept=".xlsx,.xls,.csv,.pdf" onChange={(e) => setFile(e.target.files?.[0] || null)} />
          {file && <p className="text-sm text-muted-foreground">{file.name}</p>}
          {!file && (
            <Button variant="outline" className="w-full" onClick={handleDownloadSample}>
              <Download className="h-4 w-4 mr-2" />
              Download Sample Excel
            </Button>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={uploading}>Cancel</Button>
          <Button onClick={handleUpload} disabled={!file || uploading}>
            {uploading ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Uploading...</> : "Upload"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function BulkDialog({ open, onOpenChange, onDone }: { open: boolean; onOpenChange: (v: boolean) => void; onDone: () => void }) {
  const [rows, setRows] = useState<any[]>([{ name: "", category: "", manufacturer: "", serial: "" }]);
  const [saving, setSaving] = useState(false);

  const addRow = () => setRows((prev) => [...prev, { name: "", category: "", manufacturer: "", serial: "" }]);
  const updateRow = (i: number, field: string, value: string) =>
    setRows((prev) => prev.map((r, j) => (j === i ? { ...r, [field]: value } : r)));
  const removeRow = (i: number) => setRows((prev) => prev.filter((_, j) => j !== i));

  const handleSave = async () => {
    const valid = rows.filter((r) => r.name && r.serial);
    if (valid.length === 0) { toast.error("Add at least one asset with name and serial"); return; }
    setSaving(true);
    try {
      const payload = {
        assets: valid.map((r) => ({
          name: r.name,
          category: r.category || "Other",
          manufacturer: r.manufacturer || "Other",
          serial: r.serial.toUpperCase(),
          purchase_date: todayStr(),
          warranty_expiry: new Date(new Date().setFullYear(new Date().getFullYear() + 2)).toISOString().slice(0, 10),
          cost: Math.floor(Math.random() * 2500) + 500,
          status: "Available",
        })),
      };
      console.log("[AssetManagerDashboard] Bulk Request Payload:", JSON.stringify(payload, null, 2));
      await apiFetch("/assets/bulk", {
        method: "POST",
        body: JSON.stringify(payload),
      });
      toast.success(`${valid.length} asset(s) added`);
      onDone();
    } catch (err: any) {
      console.error("[AssetManagerDashboard] Bulk Add Error:", err);
      toast.error(err.message || "Bulk add failed");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader><DialogTitle>Add Multiple Assets</DialogTitle></DialogHeader>
        <div className="space-y-3 max-h-80 overflow-y-auto">
          {rows.map((row, i) => (
            <div key={i} className="border rounded-lg p-3 space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">Asset #{i + 1}</span>
                {rows.length > 1 && (
                  <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={() => removeRow(i)}>
                    <Trash2 className="h-3 w-3" />
                  </Button>
                )}
              </div>
              <div className="grid grid-cols-2 gap-2">
                <Input placeholder="Name *" value={row.name} onChange={(e) => updateRow(i, "name", e.target.value)} />
                <Input placeholder="Serial *" value={row.serial} onChange={(e) => updateRow(i, "serial", e.target.value)} />
                <Select value={row.category} onValueChange={(value) => updateRow(i, "category", value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Category" />
                  </SelectTrigger>
                  <SelectContent>
                    {STANDARD_HARDWARE_CATEGORIES.map((category) => (
                      <SelectItem key={category} value={category}>{category}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Input placeholder="Brand" value={row.manufacturer} onChange={(e) => updateRow(i, "manufacturer", e.target.value)} />
              </div>
            </div>
          ))}
          <Button variant="outline" size="sm" onClick={addRow}><Plus className="h-3 w-3 mr-1" />Add Row</Button>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving}>{saving ? "Saving..." : "Save"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
