import { createFileRoute } from "@tanstack/react-router";
import { AppLayout } from "@/components/layouts/AppLayout";
import { DataProvider } from "@/contexts/data";

export const Route = createFileRoute("/_app")({
  component: () => (
    <DataProvider>
      <AppLayout />
    </DataProvider>
  ),
});
