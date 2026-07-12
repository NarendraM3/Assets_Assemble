import { useMemo, useState } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { Plus, Download, MoreHorizontal, Trash2, Eye, Edit } from "lucide-react";
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
import type { Asset } from "@/types/domain";
import { uniqueValues } from "@/lib/live-data";
import { useData } from "@/contexts/data";
import { toast } from "sonner";

export default function AssetsPage() {
  const { assets, employees, addAsset, retireAsset } = useData();
  const CATEGORIES = uniqueValues(assets.map(a => a.category));
  const MANUFACTURERS = uniqueValues(assets.map(a => a.manufacturer));
  const LOCATIONS = uniqueValues(assets.map(a => a.location));
  const [selected, setSelected] = useState<Asset | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [category, setCategory] = useState("all");
  const [status, setStatus] = useState("all");

  const [name, setName] = useState("");
  const [assetCategory, setAssetCategory] = useState("");
  const [manufacturer, setManufacturer] = useState("");
  const [serial, setSerial] = useState("");
  const [location, setLocation] = useState("");

  const handleOpenCreate = () => {
    setName("");
    setAssetCategory("");
    setManufacturer("");
    setSerial("");
    setLocation("");
    setCreateOpen(true);
  };

  const handleCreate = () => {
    if (!name.trim() || !assetCategory || !manufacturer || !serial.trim() || !location) {
      toast.error("Please fill in all fields");
      return;
    }

    addAsset({
      name: name.trim(),
      category: assetCategory,
      manufacturer,
      model: `${manufacturer.slice(0, 2).toUpperCase()}-${Math.floor(Math.random() * 9000 + 1000)}`,
      serial: serial.trim().toUpperCase(),
      location,
      assignedTo: null,
      status: "Available",
      purchaseDate: new Date().toISOString().slice(0, 10),
      warrantyExpiry: new Date(new Date().setFullYear(new Date().getFullYear() + 2)).toISOString().slice(0, 10),
      cost: Math.floor(Math.random() * 2500) + 500,
    });

    toast.success("Asset created successfully");
    setCreateOpen(false);
  };

  const filtered = useMemo(() => {
    return assets.filter(a =>
      (category === "all" || a.category === category) &&
      (status === "all" || a.status === status)
    );
  }, [assets, category, status]);

  const columns: ColumnDef<Asset>[] = [
    { accessorKey: "id", header: "Asset ID" },
    { accessorKey: "name", header: "Name" },
    { accessorKey: "category", header: "Category" },
    { accessorKey: "manufacturer", header: "Manufacturer" },
    { accessorKey: "serial", header: "Serial" },
    { accessorKey: "warrantyExpiry", header: "Warranty" },
    { accessorKey: "location", header: "Location" },
    { id: "assignedTo", header: "Assigned", cell: ({row}) => row.original.assignedTo ? (employees.find(e => e.id === row.original.assignedTo)?.name || row.original.assignedTo) : <span className="text-muted-foreground">Unassigned</span> },
    { id: "status", header: "Status", cell: ({row}) => <StatusBadge status={row.original.status}/> },
    { id: "actions", header: "", cell: ({row}) => (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={e => e.stopPropagation()}><MoreHorizontal className="h-4 w-4"/></Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => setSelected(row.original)}><Eye className="h-4 w-4 mr-2"/>View</DropdownMenuItem>
          <DropdownMenuItem onClick={() => toast.info("Edit not wired in demo")}><Edit className="h-4 w-4 mr-2"/>Edit</DropdownMenuItem>
          <DropdownMenuItem className="text-destructive" onClick={() => { retireAsset(row.original.id); toast.success("Asset retired"); }}><Trash2 className="h-4 w-4 mr-2"/>Retire</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    )},
  ];

  return (
    <>
      <PageHeader
        title="Assets"
        description={`Manage ${assets.length.toLocaleString()} enterprise assets across all locations.`}
        actions={
          <>
            <Button variant="outline" onClick={() => toast.success("Export queued (demo)")}><Download className="h-4 w-4 mr-1"/>Export</Button>
            <Button onClick={handleOpenCreate}><Plus className="h-4 w-4 mr-1"/>Add Asset</Button>
          </>
        }
      />
      <Card className="p-4 mb-4">
        <div className="flex flex-wrap gap-3">
          <div className="min-w-40">
            <Label className="text-xs">Category</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger className="mt-1 h-9"><SelectValue/></SelectTrigger>
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
                <TabsTrigger value="Maintenance">Maintenance</TabsTrigger>
                <TabsTrigger value="Retired">Retired</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </div>
      </Card>
      <Card className="p-4">
        <DataTable data={filtered} columns={columns} searchPlaceholder="Search by ID, name, serial…" onRowClick={setSelected} pageSize={15}/>
      </Card>

      <Sheet open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <SheetContent className="w-full sm:max-w-xl overflow-y-auto p-6">
          {selected && (
            <>
              <SheetHeader className="p-0 mb-4">
                <div className="text-xs text-muted-foreground">{selected.id}</div>
                <SheetTitle className="text-xl">{selected.name}</SheetTitle>
                <div className="mt-2"><StatusBadge status={selected.status}/></div>
              </SheetHeader>
              <div className="space-y-4">
                <Card className="p-4">
                  <div className="font-semibold text-sm mb-3">Details</div>
                  <div className="grid grid-cols-2 gap-y-2 text-sm">
                    <span className="text-muted-foreground">Category</span><span>{selected.category}</span>
                    <span className="text-muted-foreground">Manufacturer</span><span>{selected.manufacturer}</span>
                    <span className="text-muted-foreground">Model</span><span>{selected.model}</span>
                    <span className="text-muted-foreground">Serial</span><span>{selected.serial}</span>
                    <span className="text-muted-foreground">Purchase Date</span><span>{selected.purchaseDate}</span>
                    <span className="text-muted-foreground">Warranty Expiry</span><span>{selected.warrantyExpiry}</span>
                    <span className="text-muted-foreground">Location</span><span>{selected.location}</span>
                    <span className="text-muted-foreground">Cost</span><span>${selected.cost.toLocaleString()}</span>
                    <span className="text-muted-foreground">Assigned</span>
                    <span>{selected.assignedTo ? (employees.find(e => e.id === selected.assignedTo)?.name || selected.assignedTo) : "Unassigned"}</span>
                  </div>
                </Card>
                <Card className="p-4">
                  <div className="font-semibold text-sm mb-3">Assignment History</div>
                  <div className="text-sm text-muted-foreground">
                    Previously assigned to 3 employees. Currently held for {selected.assignedTo ? "active use" : "reallocation"}.
                  </div>
                </Card>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add New Asset</DialogTitle></DialogHeader>
          <div className="grid gap-3">
            <div>
              <Label>Name</Label>
              <Input className="mt-1.5" placeholder="Dell Latitude 5540" value={name} onChange={e => setName(e.target.value)}/>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Category</Label>
                <Select value={assetCategory} onValueChange={setAssetCategory}>
                  <SelectTrigger className="mt-1.5"><SelectValue placeholder="Select"/></SelectTrigger>
                  <SelectContent>{CATEGORIES.map(c=><SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Manufacturer</Label>
                <Select value={manufacturer} onValueChange={setManufacturer}>
                  <SelectTrigger className="mt-1.5"><SelectValue placeholder="Select"/></SelectTrigger>
                  <SelectContent>{MANUFACTURERS.map(m=><SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Serial Number</Label>
                <Input className="mt-1.5" placeholder="SN…" value={serial} onChange={e => setSerial(e.target.value)}/>
              </div>
              <div><Label>Location</Label>
                <Select value={location} onValueChange={setLocation}>
                  <SelectTrigger className="mt-1.5"><SelectValue placeholder="Select"/></SelectTrigger>
                  <SelectContent>{LOCATIONS.map(l=><SelectItem key={l} value={l}>{l}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button onClick={handleCreate}>Create</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
