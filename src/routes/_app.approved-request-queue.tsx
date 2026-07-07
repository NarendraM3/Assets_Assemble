import { createFileRoute } from "@tanstack/react-router";
import { ApprovedRequestQueuePage } from "@/features/queues/ApprovedRequestQueuePage";

export const Route = createFileRoute("/_app/approved-request-queue")({
  component: ApprovedRequestQueuePage,
});
