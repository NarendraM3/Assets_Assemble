import { createFileRoute } from "@tanstack/react-router";
import { MaintenanceTable } from "./_app.maintenance";

export const Route = createFileRoute("/_app/maintenance-history")({
  component: () => <MaintenanceTable title="Maintenance History" description="Complete log of maintenance activities and parts replaced."/>,
});
