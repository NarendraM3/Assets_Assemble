import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const MAP: Record<string, string> = {
  // ticket status
  "Open": "bg-info/15 text-info border-info/20",
  "Assigned": "bg-primary/15 text-primary border-primary/20",
  "In Progress": "bg-warning/15 text-warning border-warning/20",
  "Waiting": "bg-muted text-muted-foreground border",
  "Resolved": "bg-success/15 text-success border-success/20",
  "Closed": "bg-muted text-muted-foreground border",
  // asset status
  "Available": "bg-success/15 text-success border-success/20",
  "Maintenance": "bg-warning/15 text-warning border-warning/20",
  "Retired": "bg-muted text-muted-foreground border",
  // priority
  "Low": "bg-muted text-muted-foreground border",
  "Medium": "bg-info/15 text-info border-info/20",
  "High": "bg-warning/15 text-warning border-warning/20",
  "Critical": "bg-destructive/15 text-destructive border-destructive/20",
  // sla
  "On Track": "bg-success/15 text-success border-success/20",
  "At Risk": "bg-warning/15 text-warning border-warning/20",
  "Breached": "bg-destructive/15 text-destructive border-destructive/20",
  // employee
  "Active": "bg-success/15 text-success border-success/20",
  "Inactive": "bg-muted text-muted-foreground border",
  "On Leave": "bg-warning/15 text-warning border-warning/20",
  "Returned": "bg-muted text-muted-foreground border",
  "Transferred": "bg-info/15 text-info border-info/20",
  "Completed": "bg-success/15 text-success border-success/20",
  "Scheduled": "bg-info/15 text-info border-info/20",
};

export function StatusBadge({ status }: { status: string }) {
  const cls = MAP[status] ?? "bg-muted text-muted-foreground border";
  return <Badge variant="outline" className={cn("font-medium", cls)}>{status}</Badge>;
}
