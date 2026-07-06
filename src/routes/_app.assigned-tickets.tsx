import { createFileRoute } from "@tanstack/react-router";
import { TicketList } from "@/features/tickets/TicketList";

export const Route = createFileRoute("/_app/assigned-tickets")({
  component: () => (
    <TicketList
      title="Assigned to Me"
      description="Tickets currently in your queue."
      filter={(t) => !!t.assignee && !["Closed"].includes(t.status)}
    />
  ),
});
