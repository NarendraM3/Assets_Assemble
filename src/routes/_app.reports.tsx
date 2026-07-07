import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_app/reports")({
  beforeLoad: () => {
    throw redirect({ to: "/dashboard", replace: true });
  },
  component: () => null,
});
