import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const MAP: Record<string, string> = {
  // ticket status
  "Open": "bg-info/15 text-info border-info/20",
  "Assigned": "bg-primary/15 text-primary border-primary/20",
  "In Progress": "bg-warning/15 text-warning border-warning/20",
  "Waiting": "bg-muted text-muted-foreground border",
  "Escalated": "bg-warning/15 text-warning border-warning/20",
  "Pending Administration Approval": "bg-warning/15 text-warning border-warning/20",
  "Approved for Asset Manager": "bg-primary/15 text-primary border-primary/20",
  "Resolved": "bg-success/15 text-success border-success/20",
  "Closed": "bg-muted text-muted-foreground border",
  // asset status
  "Requested": "bg-primary/15 text-primary border-primary/20",
  "Approved": "bg-success/15 text-success border-success/20",
  "Ready for Pickup": "bg-info/15 text-info border-info/20",
  "Delivered": "bg-success/15 text-success border-success/20",
  "Returned": "bg-muted text-muted-foreground border",
  "Available": "bg-success/15 text-success border-success/20",
  "Maintenance": "bg-warning/15 text-warning border-warning/20",
  "Under Maintenance": "bg-warning/15 text-warning border-warning/20",
  "Retired": "bg-muted text-muted-foreground border",
  "Out of Stock": "bg-destructive/15 text-destructive border-destructive/20",
  "No Stock": "bg-destructive/15 text-destructive border-destructive/20",
  // priority
  "Low": "bg-muted text-muted-foreground border",
  "Medium": "bg-info/15 text-info border-info/20",
  "High": "bg-warning/15 text-warning border-warning/20",
  "Critical": "bg-destructive/15 text-destructive border-destructive/20",
  // sla
  "On Track": "bg-success/15 text-success border-success/20",
  "At Risk": "bg-warning/15 text-warning border-warning/20",
  "Breached": "bg-destructive/15 text-destructive border-destructive/20",
  // workflow / allocation status
  "Awaiting Asset Verification": "bg-warning/15 text-warning border-warning/20",
  "Pending Asset Manager Review": "bg-yellow-500/15 text-yellow-600 border-yellow-500/20",
  "Inventory Verified": "bg-blue-500/15 text-blue-600 border-blue-500/20",
  "Sent to IT Support Team": "bg-blue-500/15 text-blue-600 border-blue-500/20",
  "Ready for Allocation": "bg-purple-500/15 text-purple-600 border-purple-500/20",
  "Assigned to IT Support": "bg-info/15 text-info border-info/20",
  "IT Asset Assignment In Progress": "bg-orange-500/15 text-orange-600 border-orange-500/20",
  "Asset Allocated": "bg-primary/15 text-primary border-primary/20",
  "Assets Allocated": "bg-teal-500/15 text-teal-600 border-teal-500/20",
  "Ready for Delivery": "bg-green-500/15 text-green-600 border-green-500/20",
  // employee
  "Active": "bg-success/15 text-success border-success/20",
  "Inactive": "bg-muted text-muted-foreground border",
  "On Leave": "bg-warning/15 text-warning border-warning/20",
  "Transferred": "bg-info/15 text-info border-info/20",
  "Completed": "bg-emerald-700/15 text-emerald-800 border-emerald-700/20",
  "Asset Verification Completed": "bg-success/15 text-success border-success/20",
  "In IT Support Queue": "bg-info/15 text-info border-info/20",
  "Scheduled": "bg-info/15 text-info border-info/20",
  "Pending": "bg-warning/15 text-warning border-warning/20",
  "Pending IT Support": "bg-warning/15 text-warning border-warning/20",
  "Waiting for Procurement": "bg-warning/15 text-warning border-warning/20",
  "Verified": "bg-success/15 text-success border-success/20",
  "Rejected": "bg-destructive/15 text-destructive border-destructive/20",
};

export function StatusBadge({ status }: { status: string }) {
  const cls = MAP[status] ?? "bg-muted text-muted-foreground border";
  return <Badge variant="outline" className={cn("font-medium", cls)}>{status}</Badge>;
}
