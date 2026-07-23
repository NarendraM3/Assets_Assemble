import { useEffect, useState, useMemo } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { PageHeader } from "@/components/common/PageHeader";
import { DataTable } from "@/components/common/DataTable";
import { StatusBadge } from "@/components/common/StatusBadge";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { useData } from "@/contexts/data";
import type { AssetAssignmentRecord } from "@/types/domain";

interface FlatAssignmentRecord extends AssetAssignmentRecord {
  Category: string;
  AssignmentStatus: string;
}

function dash(value: unknown): string {
  const s = value == null ? "" : String(value);
  return s.trim() ? s : "-";
}

export default function AssignmentsPage() {
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

  const records = (assignmentRecords ?? []) as FlatAssignmentRecord[];

  const groupedRecords = useMemo(() => {
    const map = new Map<string, FlatAssignmentRecord[]>();
    for (const r of records) {
      const key = r.EmployeeId || "";
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(r);
    }
    const result: FlatAssignmentRecord[] = [];
    for (const [, group] of map) {
      const base = { ...group[0] };
      const pairs = new Map<string, string>();
      for (const r of group) {
        const assetId = r.AssetId == null ? "" : String(r.AssetId);
        if (assetId.trim()) {
          if (!pairs.has(assetId.trim())) {
            pairs.set(assetId.trim(), r.AssetName ? String(r.AssetName) : "");
          }
        }
      }
      if (pairs.size > 0) {
        base.AssetId = Array.from(pairs.keys()).join("\n");
        base.AssetName = Array.from(pairs.entries()).map(([_, name]) => { const n = name == null ? "" : String(name); return n.trim() ? n.trim() : "-"; }).join("\n");
      }
      result.push(base);
    }
    return result;
  }, [records]);

  const columns: ColumnDef<FlatAssignmentRecord>[] = [
    {
      accessorKey: "EmployeeId",
      header: "Employee ID",
      cell: ({ getValue }) => <span className="text-xs">{dash(getValue<string>())}</span>,
    },
    {
      accessorKey: "EmployeeName",
      header: "Employee Name",
      cell: ({ getValue }) => <span className="text-xs">{dash(getValue<string>())}</span>,
    },
    {
      accessorKey: "AssetId",
      header: "Asset ID",
      cell: ({ getValue }) => <span className="text-xs whitespace-pre-line">{dash(getValue<string>())}</span>,
    },
    {
      accessorKey: "AssetName",
      header: "Asset Name",
      cell: ({ getValue }) => <span className="text-xs whitespace-pre-line">{dash(getValue<string>())}</span>,
    },
    {
      accessorKey: "Category",
      header: "Category",
      cell: ({ getValue }) => <span className="text-xs">{dash(getValue<string>())}</span>,
    },
    {
      accessorKey: "Department",
      header: "Department",
      cell: ({ getValue }) => <span className="text-xs">{dash(getValue<string>())}</span>,
    },
    {
      accessorKey: "AssignedBy",
      header: "Assigned By",
      cell: ({ getValue }) => <span className="text-xs">{dash(getValue<string>())}</span>,
    },
    {
      accessorKey: "AssignedDate",
      header: "Assigned Date",
      cell: ({ getValue }) => <span className="text-xs">{dash(getValue<string>())}</span>,
    },
    {
      accessorKey: "AssignmentStatus",
      header: "Assignment Status",
      cell: ({ getValue }) => {
        const raw = getValue();
        const val = raw == null ? "" : String(raw);
        if (!val.trim()) return <span className="text-xs text-muted-foreground">-</span>;
        return <StatusBadge status={val} />;
      },
    },
    {
      accessorKey: "AssignedRole",
      header: "Assigned Role",
      cell: ({ getValue }) => <span className="text-xs">{dash(getValue<string>())}</span>,
    },
  ];

  const displayData = initialFetchDone ? groupedRecords : [];

  return (
    <>
      <PageHeader
        title="Assignments"
        description="Assign, return, and transfer assets across employees and locations."
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
