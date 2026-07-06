import { createFileRoute } from "@tanstack/react-router";
import { TicketCategoriesInner } from "./_app.asset-categories";

export const Route = createFileRoute("/_app/ticket-categories")({
  component: TicketCategoriesInner,
});
