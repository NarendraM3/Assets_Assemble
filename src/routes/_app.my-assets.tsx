import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { Package } from "lucide-react";
import { PageHeader } from "@/components/common/PageHeader";
import { DataTable } from "@/components/common/DataTable";
import { StatusBadge } from "@/components/common/StatusBadge";
import { Card } from "@/components/ui/card";
import { type Asset } from "@/data/mock";
import { useData } from "@/contexts/data";

export const Route = createFileRoute("/_app/my-assets")({
  component: MyAssets,
});

function MyAssets() {
  const { assets } = useData();
  const [view, setView] = useState<"grid" | "table">("grid");

  const myAssets = useMemo(() => assets.filter(a => a.status === "Assigned").slice(0, 8), [assets]);

  const columns: ColumnDef<Asset>[] = [
    { accessorKey: "id", header: "Asset ID" },
    { accessorKey: "name", header: "Name" },
    { accessorKey: "category", header: "Category" },
    { accessorKey: "serial", header: "Serial" },
    { accessorKey: "warrantyExpiry", header: "Warranty" },
    { id: "status", header: "Status", cell: ({ row }) => <StatusBadge status={row.original.status}/> },
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
      {view === "grid" ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {myAssets.map(a => (
            <Card key={a.id} className="p-4 hover:shadow-md transition-shadow">
              <div className="flex items-start gap-3">
                <div className="h-11 w-11 rounded-md bg-primary/10 grid place-items-center text-primary shrink-0">
                  <Package className="h-5 w-5"/>
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-semibold truncate">{a.name}</div>
                  <div className="text-xs text-muted-foreground">{a.id}</div>
                </div>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-y-2 text-xs">
                <span className="text-muted-foreground">Serial</span><span className="font-medium truncate">{a.serial}</span>
                <span className="text-muted-foreground">Location</span><span className="font-medium">{a.location}</span>
                <span className="text-muted-foreground">Warranty</span><span className="font-medium">{a.warrantyExpiry}</span>
              </div>
              <div className="mt-3 flex items-center justify-between">
                <StatusBadge status={a.status}/>
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <DataTable data={myAssets} columns={columns} searchPlaceholder="Search my assets…"/>
      )}
    </>
  );
}
