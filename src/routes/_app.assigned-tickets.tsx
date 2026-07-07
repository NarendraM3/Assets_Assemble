import { createFileRoute } from "@tanstack/react-router";
import { TicketList } from "@/features/tickets/TicketList";

export const Route = createFileRoute("/_app/assigned-tickets")({
  component: () => (
    <TicketList
      title="Assigned to Me"
      description="Tickets currently in your queue."
      filter={(t) => !["Closed", "Pending Administration Approval", "Approved for Asset Manager"].includes(t.status)}
      workflowRole="support"
    />
  ),
});
