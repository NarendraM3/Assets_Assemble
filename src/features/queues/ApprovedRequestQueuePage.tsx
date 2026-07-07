import { PageHeader } from "@/components/common/PageHeader";
import { StatusBadge } from "@/components/common/StatusBadge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useAuth } from "@/contexts/auth";
import { useData } from "@/contexts/data";
import { toast } from "sonner";

export function ApprovedRequestQueuePage() {
  const { user } = useAuth();
  const { tickets, resolveAssetTicket } = useData();
  const approvedTickets = tickets.filter((t) => t.status === "Approved for Asset Manager");

  return (
    <>
      <PageHeader
        title="Approved Request Queue"
        description="Administration-approved requests waiting for asset manager action."
      />
      <Card className="p-5">
        <div className="font-semibold text-sm mb-4">Approved Requests</div>
        <div className="divide-y">
          {approvedTickets.length === 0 && (
            <div className="py-6 text-sm text-muted-foreground">No approved requests are waiting for asset action.</div>
          )}
          {approvedTickets.map((t) => (
            <div key={t.id} className="py-3 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="text-sm font-medium truncate">{t.id} - {t.title}</div>
                <div className="text-xs text-muted-foreground">Asset {t.assetId || "General"} - {t.category}</div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <StatusBadge status={t.status} />
                {(["Repair", "Replace", "Reassign"] as const).map((action) => (
                  <Button
                    key={action}
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      resolveAssetTicket(t.id, user?.name || "Asset Manager User", {
                        action,
                        assetDetails: t.assetId || "General asset request",
                        remarks: `${action} completed by Asset Manager.`,
                        resolution: `${action} completed and issue resolved.`,
                      });
                      toast.success(`Ticket resolved: ${action}`);
                    }}
                  >
                    {action}
                  </Button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </Card>
    </>
  );
}
