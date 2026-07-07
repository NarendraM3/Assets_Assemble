import { createFileRoute } from "@tanstack/react-router";
import { EscalationApprovalsPage } from "@/features/queues/EscalationApprovalsPage";

export const Route = createFileRoute("/_app/escalation-approvals")({
  component: EscalationApprovalsPage,
});
