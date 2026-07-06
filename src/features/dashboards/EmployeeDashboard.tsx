import { Package, TicketIcon, CheckCircle2, Clock, Plus, ArrowRight } from "lucide-react";
import { Link } from "@tanstack/react-router";
import {
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend,
} from "recharts";
import { PageHeader } from "@/components/common/PageHeader";
import { StatCard } from "@/components/common/StatCard";
import { ChartCard } from "@/components/common/ChartCard";
import { Timeline } from "@/components/common/Timeline";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { assets, tickets } from "@/data/mock";
import { useAuth } from "@/contexts/auth";

const COLORS = ["oklch(0.55 0.2 255)", "oklch(0.65 0.16 150)", "oklch(0.72 0.17 55)", "oklch(0.6 0.2 25)", "oklch(0.65 0.15 300)"];

export function EmployeeDashboard() {
  const { user } = useAuth();
  const myAssets = assets.slice(0, 6);
  const myTickets = tickets.slice(0, 12);
  const open = myTickets.filter((t) => ["Open","Assigned","In Progress"].includes(t.status)).length;
  const closed = myTickets.filter((t) => t.status === "Closed" || t.status === "Resolved").length;
  const pending = myTickets.filter((t) => t.status === "Waiting").length;

  const statusData = [
    { name: "Open", value: open },
    { name: "In Progress", value: myTickets.filter(t => t.status === "In Progress").length },
    { name: "Resolved", value: closed },
    { name: "Waiting", value: pending },
  ];
  const categoryData = [
    { name: "Laptop", value: 2 }, { name: "Monitor", value: 1 },
    { name: "Peripheral", value: 2 }, { name: "Mobile", value: 1 },
  ];

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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
        <ChartCard title="Ticket Status" description="Breakdown of your ticket lifecycle">
          <ResponsiveContainer width="100%" height={240}>
            <PieChart>
              <Pie data={statusData} dataKey="value" nameKey="name" innerRadius={50} outerRadius={90} paddingAngle={2}>
                {statusData.map((_, i) => <Cell key={i} fill={COLORS[i]} />)}
              </Pie>
              <Tooltip contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 6 }} />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>
        <ChartCard title="Assets by Category" description="Your assigned inventory">
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={categoryData}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="name" stroke="var(--muted-foreground)" fontSize={12} />
              <YAxis stroke="var(--muted-foreground)" fontSize={12} />
              <Tooltip contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 6 }} />
              <Bar dataKey="value" fill="var(--primary)" radius={[6,6,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
        <Card className="p-5">
          <div className="font-semibold text-sm mb-4">Recent Activity</div>
          <Timeline items={[
            { title: "Ticket TKT-5023 assigned", description: "Support engineer will reach out soon", time: "2 hours ago", tone: "primary" },
            { title: "Password reset completed", time: "Yesterday", tone: "success" },
            { title: "MacBook Pro assigned", description: "AST-10120 — Apple MacBook Pro 14”", time: "3 days ago", tone: "default" },
            { title: "Onboarding complete", time: "1 week ago", tone: "success" },
          ]} />
        </Card>
      </div>

      <Card className="p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="font-semibold text-sm">Quick Actions</div>
          <Link to="/my-tickets" className="text-xs text-primary flex items-center gap-1 hover:underline">
            View all tickets <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: "Report an Issue", to: "/raise-ticket", icon: Plus },
            { label: "My Assets", to: "/my-assets", icon: Package },
            { label: "Ticket History", to: "/ticket-history", icon: Clock },
            { label: "My Profile", to: "/profile", icon: CheckCircle2 },
          ].map((a) => (
            <Link key={a.label} to={a.to} className="p-4 rounded-md border hover:border-primary/40 hover:bg-primary/5 transition-colors">
              <a.icon className="h-4 w-4 text-primary mb-2" />
              <div className="text-sm font-medium">{a.label}</div>
            </Link>
          ))}
        </div>
      </Card>
    </>
  );
}
