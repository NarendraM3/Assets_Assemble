import { createFileRoute } from "@tanstack/react-router";
import { TicketList } from "@/features/tickets/TicketList";

export const Route = createFileRoute("/_app/all-tickets")({
  component: () => (
    <TicketList
      title="All Tickets"
      description="Global view across the support organization."
    />
  ),
});
