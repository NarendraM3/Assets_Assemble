import { PageHeader } from "@/components/common/PageHeader";
import { StatusBadge } from "@/components/common/StatusBadge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useAuth } from "@/contexts/auth";
import { useData } from "@/contexts/data";
import { toast } from "sonner";

export function EscalationApprovalsPage() {
  const { user } = useAuth();
  const { tickets, reviewEscalation } = useData();
  const escalationQueue = tickets.filter((t) => t.status === "Pending Administration Approval");

  return (
    <>
      <PageHeader
        title="Escalation Approvals"
        description="Escalation requests waiting for administration review."
      />
      <Card className="p-5">
        <div className="font-semibold text-sm mb-4">Pending Approvals</div>
        <div className="divide-y">
          {escalationQueue.length === 0 && (
            <div className="py-6 text-sm text-muted-foreground">No tickets are pending administration approval.</div>
          )}
          {escalationQueue.map((t) => (
            <div key={t.id} className="py-3 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="text-sm font-medium truncate">{t.id} - {t.title}</div>
                <div className="text-xs text-muted-foreground">by {t.createdBy} - {t.category}</div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <StatusBadge status={t.status} />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    reviewEscalation(t.id, false, user?.name || "Admin User", "Rejected from administration review.");
                    toast.success("Escalation rejected");
                  }}
                >
                  Reject
                </Button>
                <Button
                  size="sm"
                  onClick={() => {
                    reviewEscalation(t.id, true, user?.name || "Admin User", "Approved for Asset Manager action.");
                    toast.success("Escalation approved");
                  }}
                >
                  Approve
                </Button>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </>
  );
}
