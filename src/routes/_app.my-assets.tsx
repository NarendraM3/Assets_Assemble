
import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { Package, ShieldCheck, Tag, Laptop, Compass, DollarSign, CalendarDays, KeyRound, Wrench } from "lucide-react";
import { PageHeader } from "@/components/common/PageHeader";
import { DataTable } from "@/components/common/DataTable";
import { StatusBadge } from "@/components/common/StatusBadge";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { type Asset } from "@/data/mock";
import { useData } from "@/contexts/data";
import { useAuth } from "@/contexts/auth";

export const Route = createFileRoute("/_app/my-assets")({
  component: MyAssets,
});

function MyAssets() {
  const { assets } = useData();
  const { user } = useAuth();
  const [view, setView] = useState<"grid" | "table">("grid");
  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null);

  // Filter assets assigned specifically to the logged-in employee
  const myAssets = useMemo(() => {
    if (!user) return [];
    return assets.filter(a => a.status === "Assigned" && a.assignedTo === user.display_id);
  }, [assets, user]);

  const columns: ColumnDef<Asset>[] = [
    { accessorKey: "id", header: "Asset ID" },
    { accessorKey: "name", header: "Name" },
    { accessorKey: "category", header: "Category" },
    { accessorKey: "serial", header: "Serial" },
    { accessorKey: "warrantyExpiry", header: "Warranty" },
    { id: "status", header: "Status", cell: ({ row }) => <StatusBadge status={row.original.status}/> },
    {
      id: "actions",
      header: "",
      cell: ({ row }) => (
        <Button size="sm" variant="ghost" onClick={() => setSelectedAsset(row.original)}>
          View Specs
        </Button>
      )
    }
  ];

  return (
    <>
      <PageHeader
        title="My Assets"
        description="All hardware and software licenses currently assigned to you."
        actions={
          <div className="inline-flex rounded-md border p-0.5">
            <button onClick={() => setView("grid")} className={"px-3 py-1 text-xs rounded " + (view==="grid" ? "bg-primary text-primary-foreground" : "")}>Grid</button>
            <button onClick={() => setView("table")} className={"px-3 py-1 text-xs rounded " + (view==="table" ? "bg-primary text-primary-foreground" : "")}>Table</button>
          </div>
        }
      />
      
      {myAssets.length === 0 ? (
        <Card className="p-8 text-center border-dashed">
          <div className="h-12 w-12 rounded-full bg-muted grid place-items-center mx-auto mb-3">
            <Package className="h-6 w-6 text-muted-foreground" />
          </div>
          <h3 className="font-semibold text-lg">No assets assigned</h3>
          <p className="text-sm text-muted-foreground max-w-sm mx-auto mt-1">
            You do not have any IT hardware or active software licenses assigned to your profile yet.
          </p>
        </Card>
      ) : view === "grid" ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {myAssets.map(a => (
            <Card
              key={a.id}
              onClick={() => setSelectedAsset(a)}
              className="p-4 hover:shadow-md hover:border-primary/45 cursor-pointer transition-all active:scale-[0.99] group"
            >
              <div className="flex items-start gap-3">
                <div className="h-11 w-11 rounded-md bg-primary/10 grid place-items-center text-primary shrink-0 group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                  <Package className="h-5 w-5"/>
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-semibold truncate group-hover:text-primary transition-colors">{a.name}</div>
                  <div className="text-xs text-muted-foreground">{a.id}</div>
                </div>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-y-2 text-xs border-t pt-3 border-dashed">
                <span className="text-muted-foreground">Serial</span><span className="font-medium truncate">{a.serial}</span>
                <span className="text-muted-foreground">Location</span><span className="font-medium">{a.location}</span>
                <span className="text-muted-foreground">Warranty</span><span className="font-medium">{a.warrantyExpiry}</span>
              </div>
              <div className="mt-3.5 flex items-center justify-between border-t pt-3">
                <StatusBadge status={a.status}/>
                <span className="text-[10px] text-primary font-medium opacity-0 group-hover:opacity-100 transition-opacity">Click to view details →</span>
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <DataTable
          data={myAssets}
          columns={columns}
          searchPlaceholder="Search my assets…"
          onRowClick={(row) => setSelectedAsset(row)}
        />
      )}

      {/* Asset Specifications Details Dialog */}
      <Dialog open={!!selectedAsset} onOpenChange={(o) => !o && setSelectedAsset(null)}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Package className="h-5 w-5 text-primary" /> Asset Specifications
            </DialogTitle>
            <DialogDescription>
              Technical specifications, warranty details, and inventory tracking.
            </DialogDescription>
          </DialogHeader>

          {selectedAsset && (
            <div className="space-y-4 py-2 text-sm">
              {/* Product Identifier Card */}
              <div className="p-4 bg-muted/40 rounded-lg border border-dashed flex items-center gap-3">
                <div className="h-12 w-12 rounded-lg bg-primary/10 text-primary grid place-items-center shrink-0">
                  <Laptop className="h-6 w-6" />
                </div>
                <div className="min-w-0">
                  <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">{selectedAsset.category}</span>
                  <h4 className="font-semibold text-base truncate text-foreground">{selectedAsset.name}</h4>
                  <p className="text-xs font-mono text-muted-foreground mt-0.5">Asset ID: {selectedAsset.id}</p>
                </div>
              </div>

              {/* Specification Grid */}
              <div className="grid grid-cols-2 gap-4 border rounded-lg p-4 bg-background shadow-sm">
                <div>
                  <span className="text-xs text-muted-foreground flex items-center gap-1.5"><Tag className="h-3.5 w-3.5" /> Manufacturer</span>
                  <span className="font-medium text-foreground block mt-1">{selectedAsset.manufacturer || "Acme Standard"}</span>
                </div>
                
                <div>
                  <span className="text-xs text-muted-foreground flex items-center gap-1.5"><Laptop className="h-3.5 w-3.5" /> Model</span>
                  <span className="font-medium text-foreground block mt-1">{selectedAsset.model || "Universal Gen-2"}</span>
                </div>

                <div className="col-span-2 border-t pt-3 border-dashed">
                  <span className="text-xs text-muted-foreground flex items-center gap-1.5"><KeyRound className="h-3.5 w-3.5" /> Serial Number</span>
                  <span className="font-mono text-foreground font-semibold block mt-1">{selectedAsset.serial}</span>
                </div>

                <div className="border-t pt-3 border-dashed">
                  <span className="text-xs text-muted-foreground flex items-center gap-1.5"><CalendarDays className="h-3.5 w-3.5" /> Purchase Date</span>
                  <span className="font-medium text-foreground block mt-1">{selectedAsset.purchaseDate || "Jul 08, 2025"}</span>
                </div>

                <div className="border-t pt-3 border-dashed">
                  <span className="text-xs text-muted-foreground flex items-center gap-1.5"><ShieldCheck className="h-3.5 w-3.5" /> Warranty Expiry</span>
                  <span className="font-medium text-foreground block mt-1">{selectedAsset.warrantyExpiry || "Jul 08, 2027"}</span>
                </div>

                <div className="border-t pt-3 border-dashed">
                  <span className="text-xs text-muted-foreground flex items-center gap-1.5"><Compass className="h-3.5 w-3.5" /> Office Location</span>
                  <span className="font-medium text-foreground block mt-1">{selectedAsset.location}</span>
                </div>

                <div className="border-t pt-3 border-dashed">
                  <span className="text-xs text-muted-foreground flex items-center gap-1.5"><DollarSign className="h-3.5 w-3.5" /> Value / Cost</span>
                  <span className="font-semibold text-primary block mt-1">
                    {selectedAsset.cost ? `$${selectedAsset.cost.toLocaleString()}` : "Not listed"}
                  </span>
                </div>
              </div>

              {/* Status and Help Card */}
              <div className="p-3 bg-primary/5 rounded-lg border border-primary/20 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <StatusBadge status={selectedAsset.status} />
                  <span className="text-xs text-muted-foreground">Currently active on your profile.</span>
                </div>
                <Button size="xs" variant="link" className="text-xs p-0 h-auto flex items-center gap-1">
                  <Wrench className="h-3 w-3" /> Get Support
                </Button>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button className="w-full sm:w-auto" onClick={() => setSelectedAsset(null)}>Close Specs</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
