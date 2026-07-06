import { createFileRoute, Link } from "@tanstack/react-router";
import { Plus } from "lucide-react";
import { TicketList } from "@/features/tickets/TicketList";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_app/my-tickets")({
  component: () => (
    <TicketList
      title="My Tickets"
      description="Track the tickets you've raised and follow their progress."
      filter={(t) => !["Closed"].includes(t.status)}
      actions={<Button asChild><Link to="/raise-ticket"><Plus className="h-4 w-4 mr-1"/>New Ticket</Link></Button>}
    />
  ),
});
