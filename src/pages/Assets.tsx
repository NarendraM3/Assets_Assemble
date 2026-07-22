import { useMemo, useState, useEffect } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { Plus, MoreHorizontal, Trash2, Eye, Edit, ChevronDown, Loader2 } from "lucide-react";
import { useSearchParams } from "react-router-dom";
import { PageHeader } from "@/components/common/PageHeader";
import { DataTable } from "@/components/common/DataTable";
import { StatusBadge } from "@/components/common/StatusBadge";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import type { Asset } from "@/types/domain";
import { uniqueValues } from "@/lib/live-data";
import { useData } from "@/contexts/data";
import { ImportExcelModal } from "@/components/import/ImportExcelModal";
import { BulkAddModal } from "@/components/assets/BulkAddModal";
import { toast } from "sonner";
import { MANUFACTURERS as FALLBACK_MANUFACTURERS } from "@/data/mock";
import { STANDARD_HARDWARE_CATEGORIES } from "@/lib/asset-categories";

export default function AssetsPage() {
  const { assets, employees, loading: contextLoading, addAsset, retireAsset, setAssets, refreshData } = useData();
  const DERIVED_MANUFACTURERS = uniqueValues(assets.map(a => a.brand));
  const CATEGORIES = STANDARD_HARDWARE_CATEGORIES;
  const MANUFACTURERS = DERIVED_MANUFACTURERS.length > 0 ? DERIVED_MANUFACTURERS : FALLBACK_MANUFACTURERS;
  const [selected, setSelected] = useState<Asset | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [bulkOpen, setBulkOpen] = useState(false);
  const [category, setCategory] = useState("all");
  const [status, setStatus] = useState("all");
  const [saving, setSaving] = useState(false);
  const [searchParams, setSearchParams] = useSearchParams();

  const [name, setName] = useState("");
  const [assetCategory, setAssetCategory] = useState("");
  const [customCategory, setCustomCategory] = useState("");
  const [manufacturer, setManufacturer] = useState("");
  const [serial, setSerial] = useState("");

  console.log("[AssetsPage] Options:", { CATEGORIES, MANUFACTURERS, employeesCount: employees.length });

  useEffect(() => {
    if (searchParams.get("action") === "create") {
      setName("");
      setAssetCategory("");
      setCustomCategory("");
      setManufacturer("");
      setSerial("");
      setCreateOpen(true);
      setSearchParams({}, { replace: true });
    }
  }, []);

  useEffect(() => {
    if (assets.length === 0 && !contextLoading) {
      refreshData();
    }
  }, []);

  const handleOpenCreate = () => {
    setName("");
    setAssetCategory("");
    setCustomCategory("");
    setManufacturer("");
    setSerial("");
    setCreateOpen(true);
  };

  const handleCreate = async () => {
    const finalCategory = assetCategory === "Other" ? customCategory.trim() : assetCategory;
    if (!name.trim() || !finalCategory || !manufacturer || !serial.trim()) {
      toast.error("Please fill in all fields");
      return;
    }

    setSaving(true);
    try {
      await addAsset({
        name: name.trim(),
        uuid: "",
        category: finalCategory,
        manufacturer,
        model: `${manufacturer.slice(0, 2).toUpperCase()}-${Math.floor(Math.random() * 9000 + 1000)}`,
        serial: serial.trim().toUpperCase(),
        assignedTo: null,
        status: "Available",
        purchaseDate: new Date().toISOString().slice(0, 10),
        warrantyExpiry: new Date(new Date().setFullYear(new Date().getFullYear() + 2)).toISOString().slice(0, 10),
        cost: Math.floor(Math.random() * 2500) + 500,
      });
      toast.success("Asset Created Successfully");
      setName("");
      setAssetCategory("");
      setCustomCategory("");
      setManufacturer("");
      setSerial("");
    } catch {
    } finally {
      setSaving(false);
    }
  };

  const handleRetire = async (assetId: string) => {
    await retireAsset(assetId);
  };

  const handleImportSuccess = (importedAssets: any[]) => {
    if (importedAssets.length > 0) {
      setAssets((prev) => {
        const existingIds = new Set(prev.map((a) => a.assetId));
        const newOnes = importedAssets.filter((a: any) => !existingIds.has(a.assetId));
        return [...prev, ...newOnes];
      });
    }
    refreshData();
  };

  const filtered = useMemo(() => {
    return assets.filter(a =>
      (category === "all" || a.category === category) &&
      (status === "all" || a.status === status)
    );
  }, [assets, category, status]);

  const getAssignedDisplay = (asset: Asset) => {
    if (!asset.assignedTo) return <span className="text-muted-foreground">Available</span>;
    const emp = employees.find(e => e.id === asset.assignedTo || e.uuid === asset.assignedTo);
    if (emp) return <span>Assigned to: {emp.name} ({emp.id})</span>;
    return <span className="text-muted-foreground">Assigned</span>;
  };

  const columns: ColumnDef<Asset>[] = [
    { accessorKey: "assetId", header: "Asset ID" },
    { accessorKey: "assetName", header: "Asset Name" },
    { accessorKey: "category", header: "Category" },
    { accessorKey: "brand", header: "Brand" },
    { accessorKey: "model", header: "Model" },
    { accessorKey: "serialNumber", header: "Serial Number" },
    { accessorKey: "purchaseDate", header: "Purchase Date" },
    { accessorKey: "warrantyExpiry", header: "Warranty" },
    { id: "assignedTo", header: "Assigned Employee", cell: ({ row }) => getAssignedDisplay(row.original) },
    { id: "status", header: "Status", cell: ({ row }) => <StatusBadge status={row.original.status} /> },
    { id: "actions", header: "Actions", cell: ({ row }) => (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={e => e.stopPropagation()}><MoreHorizontal className="h-4 w-4" /></Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => setSelected(row.original)}><Eye className="h-4 w-4 mr-2" />View</DropdownMenuItem>
          <DropdownMenuItem onClick={() => toast.info("Edit not wired in demo")}><Edit className="h-4 w-4 mr-2" />Edit</DropdownMenuItem>
          <DropdownMenuItem className="text-destructive" onClick={async () => handleRetire(row.original.assetId)}>
            <Trash2 className="h-4 w-4 mr-2" />Retire
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    )},
  ];

  if (contextLoading) {
    return (
      <>
        <PageHeader title="Assets" description="Loading assets..." />
        <Card className="p-4">
          <div className="space-y-3">
            <Skeleton className="h-10 w-full" />
            {Array.from({ length: 8 }).map((_, i) => (
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
        title="Assets"
        description={assets.length > 0 ? `Manage ${assets.length.toLocaleString()} enterprise assets.` : "No assets found"}
        actions={
          <>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-1" />Add Asset<ChevronDown className="h-4 w-4 ml-1" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={handleOpenCreate}>
                  <Plus className="h-4 w-4 mr-2" />Single Asset
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setBulkOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />Multiple Assets
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setImportOpen(true)}>
                  <UploadIcon className="h-4 w-4 mr-2" />Import Excel
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </>
        }
      />
      {assets.length === 0 ? (
        <Card className="p-8 text-center">
          <p className="text-muted-foreground text-lg">No Assets Found</p>
          <p className="text-sm text-muted-foreground mt-1">Add your first asset to get started.</p>
          <Button className="mt-4" onClick={handleOpenCreate}>
            <Plus className="h-4 w-4 mr-1" />Add Asset
          </Button>
        </Card>
      ) : (
        <>
          <Card className="p-4 mb-4">
            <div className="flex flex-wrap gap-3">
              <div className="min-w-40">
                <Label className="text-xs">Category</Label>
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger className="mt-1 h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    {CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="min-w-40">
                <Label className="text-xs">Status</Label>
                <Tabs value={status} onValueChange={setStatus} className="mt-1">
                  <TabsList>
                    <TabsTrigger value="all">All</TabsTrigger>
                    <TabsTrigger value="Assigned">Assigned</TabsTrigger>
                    <TabsTrigger value="Available">Available</TabsTrigger>
                    <TabsTrigger value="Under Maintenance">Maintenance</TabsTrigger>
                    <TabsTrigger value="Out of Stock">Out of Stock</TabsTrigger>
                  </TabsList>
                </Tabs>
              </div>
            </div>
          </Card>
          <Card className="p-4">
            <DataTable
              data={filtered}
              columns={columns}
              searchPlaceholder="Search by ID, name, serial..."
              onRowClick={setSelected}
              pageSize={10}
              emptyMessage="No Assets Found"
            />
          </Card>
        </>
      )}

      <Sheet open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <SheetContent className="w-full sm:max-w-xl overflow-y-auto p-6">
          {selected && (
            <>
              <SheetHeader className="p-0 mb-4">
                <div className="text-xs text-muted-foreground">{selected.assetId}</div>
                <SheetTitle className="text-xl">{selected.assetName}</SheetTitle>
                <div className="mt-2"><StatusBadge status={selected.status} /></div>
              </SheetHeader>
              <div className="space-y-4">
                <Card className="p-4">
                  <div className="font-semibold text-sm mb-3">Details</div>
                  <div className="grid grid-cols-2 gap-y-2 text-sm">
                    <span className="text-muted-foreground">Category</span><span>{selected.category}</span>
                    <span className="text-muted-foreground">Brand</span><span>{selected.brand}</span>
                    <span className="text-muted-foreground">Model</span><span>{selected.model}</span>
                    <span className="text-muted-foreground">Serial</span><span>{selected.serialNumber}</span>
                    <span className="text-muted-foreground">Purchase Date</span><span>{selected.purchaseDate}</span>
                    <span className="text-muted-foreground">Warranty Expiry</span><span>{selected.warrantyExpiry}</span>
                    <span className="text-muted-foreground">Assigned</span><span>{getAssignedDisplay(selected)}</span>
                  </div>
                </Card>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>

      <Dialog open={createOpen} onOpenChange={(o) => { setCreateOpen(o); if (!o) { setCustomCategory(""); refreshData(); } }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add New Asset</DialogTitle></DialogHeader>
          <div className="grid gap-3">
            <div>
              <Label>Name</Label>
              <Input className="mt-1.5" placeholder="Dell Latitude 5540" value={name} onChange={e => setName(e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Category</Label>
                <Select value={assetCategory} onValueChange={setAssetCategory}>
                  <SelectTrigger className="mt-1.5"><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>{CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Manufacturer</Label>
                <Select value={manufacturer} onValueChange={setManufacturer}>
                  <SelectTrigger className="mt-1.5"><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>{MANUFACTURERS.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            {assetCategory === "Other" && (
              <div>
                <Label>Custom Category</Label>
                <Input className="mt-1.5" placeholder="Enter category name" value={customCategory} onChange={e => setCustomCategory(e.target.value)} />
              </div>
            )}
            <div>
              <Label>Serial Number</Label>
              <Input className="mt-1.5" placeholder="SN..." value={serial} onChange={e => setSerial(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)} disabled={saving}>Cancel</Button>
            <Button onClick={handleCreate} disabled={saving}>
              {saving ? "Saving..." : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ImportExcelModal
        open={importOpen}
        onOpenChange={setImportOpen}
        onSuccess={handleImportSuccess}
      />

      <BulkAddModal
        open={bulkOpen}
        onOpenChange={setBulkOpen}
        categories={CATEGORIES}
        manufacturers={MANUFACTURERS}
      />
    </>
  );
}

function UploadIcon(props: any) {
  return <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>;
}
