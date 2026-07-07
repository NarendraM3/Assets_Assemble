import { Package, TicketIcon, CheckCircle2, Clock, Plus, ArrowRight } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { PageHeader } from "@/components/common/PageHeader";
import { StatCard } from "@/components/common/StatCard";
import { Timeline } from "@/components/common/Timeline";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useAuth } from "@/contexts/auth";
import { useData } from "@/contexts/data";

export function EmployeeDashboard() {
  const { user } = useAuth();
  const { assets, tickets } = useData();
  const myAssets = assets.slice(0, 6);
  const myTickets = tickets.filter(t => t.createdBy === user?.name).slice(0, 12);
  const open = myTickets.filter((t) => ["Open","Assigned","In Progress"].includes(t.status)).length;
  const closed = myTickets.filter((t) => t.status === "Closed" || t.status === "Resolved").length;
  const pending = myTickets.filter((t) => ["Waiting", "Escalated", "Pending Administration Approval", "Approved for Asset Manager"].includes(t.status)).length;

  return (
    <>
      <PageHeader
        title={`Welcome back, ${user?.name.split(" ")[0]}`}
        description="Here's what's happening with your assets and tickets today."
        actions={
          <>
            <Button asChild variant="outline"><Link to="/my-assets">View Assets</Link></Button>
            <Button asChild><Link to="/raise-ticket"><Plus className="h-4 w-4 mr-1" />Raise Ticket</Link></Button>
          </>
        }
      />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard label="Assigned Assets" value={myAssets.length} icon={Package} tone="primary" index={0} />
        <StatCard label="Open Tickets" value={open} icon={TicketIcon} tone="info" delta={{ value: "+2 this week", up: true }} index={1} />
        <StatCard label="Closed Tickets" value={closed} icon={CheckCircle2} tone="success" index={2} />
        <StatCard label="Pending Tickets" value={pending} icon={Clock} tone="warning" index={3} />
      </div>

      <Card className="p-6">
        <div className="flex items-center justify-between mb-5">
          <div className="font-semibold text-sm">Recent Activity</div>
          <Link to="/my-tickets" className="text-xs text-primary flex items-center gap-1 hover:underline">
            View all tickets <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
        <Timeline items={[
          { title: "Ticket TKT-5023 assigned", description: "Support engineer will reach out soon", time: "2 hours ago", tone: "primary" },
          { title: "Password reset completed", time: "Yesterday", tone: "success" },
          { title: "MacBook Pro assigned", description: "AST-10120 — Apple MacBook Pro 14\"", time: "3 days ago", tone: "default" },
          { title: "Onboarding complete", time: "1 week ago", tone: "success" },
        ]} />
      </Card>
    </>
  );
}
