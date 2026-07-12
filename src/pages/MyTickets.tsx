import { TicketList } from "@/features/tickets/TicketList";

export default function MyTicketsPage() {
  return (
    <TicketList
      title="My Tickets"
      description="Track the tickets you've raised and follow their progress."
      filter={(t) => !["Closed"].includes(t.status)}
      workflowRole="employee"
    />
  );
}
