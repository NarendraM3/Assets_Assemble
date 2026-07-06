import { createFileRoute } from "@tanstack/react-router";
import type { ColumnDef } from "@tanstack/react-table";
import { PageHeader } from "@/components/common/PageHeader";
import { DataTable } from "@/components/common/DataTable";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { auditLogs } from "@/data/mock";

export const Route = createFileRoute("/_app/audit-logs")({
  component: () => {
    type Log = typeof auditLogs[number];
    const columns: ColumnDef<Log>[] = [
      { accessorKey: "id", header: "ID" },
      { accessorKey: "timestamp", header: "Timestamp" },
      { accessorKey: "user", header: "User" },
      { id: "action", header: "Action", cell: ({row}) => <Badge variant="secondary">{row.original.action}</Badge> },
      { accessorKey: "target", header: "Target" },
      { accessorKey: "ip", header: "IP Address" },
    ];
    return (
      <>
        <PageHeader title="Audit Logs" description="Complete trail of system events and configuration changes."/>
        <Card className="p-4"><DataTable data={auditLogs} columns={columns} searchPlaceholder="Search audit logs…" pageSize={20}/></Card>
      </>
    );
  },
});
