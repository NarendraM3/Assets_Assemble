import { TicketList } from "@/features/tickets/TicketList";

export default function AssignedTicketsPage() {
  return (
    <TicketList
      title="Assigned to Me"
      description="Tickets currently in your queue."
      filter={(t) => !["Closed", "Pending Administration Approval", "Approved for Asset Manager"].includes(t.status)}
      workflowRole="it_support_team"
    />
  );
}
