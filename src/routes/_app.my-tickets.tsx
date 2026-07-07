import { createFileRoute } from "@tanstack/react-router";
import { TicketList } from "@/features/tickets/TicketList";

export const Route = createFileRoute("/_app/my-tickets")({
  component: () => (
    <TicketList
      title="My Tickets"
      description="Track the tickets you've raised and follow their progress."
      filter={(t) => !["Closed"].includes(t.status)}
      workflowRole="employee"
    />
  ),
});
