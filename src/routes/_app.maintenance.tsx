import { createFileRoute } from "@tanstack/react-router";
import type { ColumnDef } from "@tanstack/react-table";
import { PageHeader } from "@/components/common/PageHeader";
import { DataTable } from "@/components/common/DataTable";
import { StatusBadge } from "@/components/common/StatusBadge";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { Maintenance } from "@/types/domain";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { useData } from "@/contexts/data";

export const Route = createFileRoute("/_app/maintenance")({
  component: MaintenancePage,
});

function MaintenancePage() {
  return <MaintenanceTable title="Maintenance" description="Scheduled and completed maintenance across the fleet." showAction/>;
}

export function MaintenanceTable({ title, description, showAction }: { title: string; description?: string; showAction?: boolean }) {
  const { maintenance, assets } = useData();
  const columns: ColumnDef<Maintenance>[] = [
    { accessorKey: "id", header: "ID" },
    { id: "asset", header: "Asset", cell: ({row}) => {
      const a = assets.find(x=>x.id===row.original.assetId);
      return <div><div className="font-medium">{a?.name}</div><div className="text-xs text-muted-foreground">{row.original.assetId}</div></div>;
    }},
    { accessorKey: "engineer", header: "Engineer" },
    { accessorKey: "date", header: "Date" },
    { accessorKey: "resolution", header: "Resolution" },
    { accessorKey: "parts", header: "Parts" },
    { accessorKey: "cost", header: "Cost", cell: ({row}) => `$${row.original.cost}` },
    { id: "status", header: "Status", cell: ({row}) => <StatusBadge status={row.original.status}/> },
  ];
  return (
    <>
      <PageHeader
        title={title}
        description={description}
        actions={showAction ? <Button onClick={() => toast.success("Maintenance scheduled")}><Plus className="h-4 w-4 mr-1"/>Schedule</Button> : undefined}
      />
      <Card className="p-4">
        <DataTable data={maintenance} columns={columns} searchPlaceholder="Search maintenance records…"/>
      </Card>
    </>
  );
}
