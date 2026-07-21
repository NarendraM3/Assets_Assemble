import { useEffect, useState } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { PageHeader } from "@/components/common/PageHeader";
import { DataTable } from "@/components/common/DataTable";
import { StatusBadge } from "@/components/common/StatusBadge";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Loader2, Plus } from "lucide-react";
import { useData } from "@/contexts/data";
import { useAuth } from "@/contexts/auth";

export default function AssignmentsPage() {
  const { user } = useAuth();
  const { assignmentRecords, fetchAssignmentRecords } = useData();
  const [loading, setLoading] = useState(true);
  const [initialFetchDone, setInitialFetchDone] = useState(false);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        console.log("[IT Support] GET Assignments");
        await fetchAssignmentRecords();
        setInitialFetchDone(true);
      } catch (err: any) {
        console.error("[Assignments] Failed to load assignments:", err);
        toast.error(err.message || "Failed to load assignments");
      } finally {
        setLoading(false);
      }
    };
    if (!initialFetchDone) {
      load();
    }
  }, [fetchAssignmentRecords, initialFetchDone]);

  useEffect(() => {
    console.log("Assignments API Response:", assignmentRecords);
    console.log("Assignments Count:", assignmentRecords?.length);
  }, [assignmentRecords]);

  useEffect(() => {
    console.log("Assignments State:", assignmentRecords);
  }, [assignmentRecords]);

  const columns: ColumnDef<any>[] = [
    { accessorKey: "AssignmentId", header: "Assignment ID" },
    { accessorKey: "EmployeeId", header: "Employee ID" },
    { accessorKey: "EmployeeName", header: "Employee Name" },
    { accessorKey: "AssetId", header: "Asset ID" },
    { accessorKey: "AssetName", header: "Asset Name" },
    { accessorKey: "Category", header: "Category" },
    { accessorKey: "Department", header: "Department" },
    { accessorKey: "AssignedBy", header: "Assigned By" },
    { accessorKey: "AssignedDate", header: "Assigned Date" },
    {
      id: "assignmentStatus",
      header: "Assignment Status",
      cell: ({ row }) => <StatusBadge status={row.original.AssignmentStatus || row.original.Status || "-"} />,
    },
    {
      id: "status",
      header: "Status",
      cell: ({ row }) => <StatusBadge status={row.original.Status || row.original.AssignmentStatus || "-"} />,
    },
    { accessorKey: "Workflow", header: "Workflow" },
    { accessorKey: "ITComment", header: "IT Comment" },
  ];

  const displayData = initialFetchDone ? (assignmentRecords ?? []) : [];

  return (
    <>
      <PageHeader
        title="Assignments"
        description="Assign, return, and transfer assets across employees and locations."
        actions={
          user?.role !== "it_support_team" && (
            <Button onClick={() => toast.success("Assignment created")}>
              <Plus className="h-4 w-4 mr-1" />
              New Assignment
            </Button>
          )
        }
      />
      <Card className="p-4">
        {loading ? (
          <div className="flex items-center justify-center gap-2 py-10 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading assignments...
          </div>
        ) : displayData.length > 0 ? (
          <DataTable
            data={displayData}
            columns={columns}
            searchPlaceholder="Search assignments..."
            pageSize={15}
          />
        ) : (
          <div className="py-10 text-center text-sm text-muted-foreground">
            No assignments found
          </div>
        )}
      </Card>
    </>
  );
}
