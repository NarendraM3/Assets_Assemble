import { createFileRoute } from "@tanstack/react-router";
import { TicketList } from "@/features/tickets/TicketList";

export const Route = createFileRoute("/_app/ticket-history")({
  component: () => (
    <TicketList
      title="Ticket History"
      description="Complete archive of your resolved and closed tickets."
      filter={(t) => ["Resolved","Closed"].includes(t.status)}
    />
  ),
});
