import { createFileRoute } from "@tanstack/react-router";
import type { ColumnDef } from "@tanstack/react-table";
import { PageHeader } from "@/components/common/PageHeader";
import { DataTable } from "@/components/common/DataTable";
import { StatusBadge } from "@/components/common/StatusBadge";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { Vendor } from "@/types/domain";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { useData } from "@/contexts/data";

export const Route = createFileRoute("/_app/vendors")({
  component: () => {
    const { vendors } = useData();
    const columns: ColumnDef<Vendor>[] = [
      { accessorKey: "id", header: "ID" },
      { accessorKey: "name", header: "Vendor" },
      { accessorKey: "contact", header: "Primary Contact" },
      { accessorKey: "email", header: "Email" },
      { accessorKey: "phone", header: "Phone" },
      { accessorKey: "category", header: "Category" },
      { accessorKey: "contractEnd", header: "Contract End" },
      { id: "status", header: "Status", cell: ({row}) => <StatusBadge status={row.original.status}/> },
    ];
    return (
      <>
        <PageHeader
          title="Vendors" description="Manage supplier relationships and contracts."
          actions={<Button onClick={()=>toast.success("Vendor added")}><Plus className="h-4 w-4 mr-1"/>Add Vendor</Button>}
        />
        <Card className="p-4">
          <DataTable data={vendors} columns={columns} searchPlaceholder="Search vendors…"/>
        </Card>
      </>
    );
  },
});
