import type { ColumnDef } from "@tanstack/react-table";
import { PageHeader } from "@/components/common/PageHeader";
import { DataTable } from "@/components/common/DataTable";
import { StatusBadge } from "@/components/common/StatusBadge";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { Assignment } from "@/types/domain";
import { useData } from "@/contexts/data";
import { toast } from "sonner";
import { ArrowLeftRight, RotateCcw, Plus } from "lucide-react";

export default function AssignmentsPage() {
  const { assignments, assets, employees } = useData();

  const columns: ColumnDef<Assignment>[] = [
    { accessorKey: "id", header: "Assignment ID" },
    { id: "asset", header: "Asset", cell: ({row}) => {
      const a = assets.find(x=>x.assetId===row.original.assetId);
      return <div><div className="font-medium">{a?.assetName}</div><div className="text-xs text-muted-foreground">{a?.assetId}</div></div>;
    }},
    { id: "employee", header: "Employee", cell: ({row}) => employees.find(e=>e.id===row.original.employeeId)?.name || row.original.employeeId },
    { accessorKey: "assignedDate", header: "Assigned Date" },
    { accessorKey: "expectedReturn", header: "Expected Return" },
    { accessorKey: "returnDate", header: "Return Date", cell: ({row}) => row.original.returnDate ?? <span className="text-muted-foreground">—</span> },
    { id: "status", header: "Status", cell: ({row}) => <StatusBadge status={row.original.status}/> },
    { id: "actions", header: "", cell: () => (
      <div className="flex gap-1">
        <Button size="sm" variant="ghost" onClick={() => toast.success("Return recorded")}><RotateCcw className="h-3.5 w-3.5"/></Button>
        <Button size="sm" variant="ghost" onClick={() => toast.success("Transfer initiated")}><ArrowLeftRight className="h-3.5 w-3.5"/></Button>
      </div>
    )},
  ];

  return (
    <>
      <PageHeader
        title="Assignments"
        description="Assign, return, and transfer assets across employees and locations."
        actions={<Button onClick={() => toast.success("Assignment created")}><Plus className="h-4 w-4 mr-1"/>New Assignment</Button>}
      />
      <Card className="p-4">
        <DataTable data={assignments} columns={columns} searchPlaceholder="Search assignments…" pageSize={15}/>
      </Card>
    </>
  );
}
