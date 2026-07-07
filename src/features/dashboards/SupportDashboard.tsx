import { TicketIcon, AlertTriangle, Clock, CheckCircle2 } from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
  LineChart, Line, PieChart, Pie, Cell,
} from "recharts";
import { PageHeader } from "@/components/common/PageHeader";
import { StatCard } from "@/components/common/StatCard";
import { ChartCard } from "@/components/common/ChartCard";
import { Card } from "@/components/ui/card";
import { StatusBadge } from "@/components/common/StatusBadge";
import { useData } from "@/contexts/data";

const COLORS = ["oklch(0.55 0.2 255)", "oklch(0.65 0.16 150)", "oklch(0.72 0.17 55)", "oklch(0.6 0.2 25)"];

export function SupportDashboard() {
  const { tickets } = useData();
  const open = tickets.filter(t => t.status === "Open").length;
  const critical = tickets.filter(t => t.priority === "Critical").length;
  const priorityData = ["Low","Medium","High","Critical"].map((p, i) => ({
    name: p, value: tickets.filter(t => t.priority === p).length, fill: COLORS[i],
  }));
  const sla = [
    { name: "On Track", v: tickets.filter(t => t.sla === "On Track").length },
    { name: "At Risk", v: tickets.filter(t => t.sla === "At Risk").length },
    { name: "Breached", v: tickets.filter(t => t.sla === "Breached").length },
  ];
  const monthly = ["Jan","Feb","Mar","Apr","May","Jun","Jul"].map((m, i) => ({
    m, opened: 40 + i * 5 + (i % 2) * 8, resolved: 38 + i * 5,
  }));

  return (
    <>
      <PageHeader title="Support Dashboard" description="Monitor ticket queues, SLA health, and daily resolution progress." />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard label="Open Tickets" value={open} icon={TicketIcon} tone="info" index={0} />
        <StatCard label="Critical Tickets" value={critical} icon={AlertTriangle} tone="danger" index={1} />
        <StatCard label="Assigned Today" value={14} icon={Clock} tone="warning" delta={{ value: "+3 vs yesterday", up: true }} index={2} />
        <StatCard label="Resolved Today" value={9} icon={CheckCircle2} tone="success" delta={{ value: "-1 vs yesterday", up: false }} index={3} />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
        <ChartCard title="Tickets by Priority">
          <ResponsiveContainer width="100%" height={240}>
            <PieChart>
              <Pie data={priorityData} dataKey="value" nameKey="name" innerRadius={45} outerRadius={90}>
                {priorityData.map((d,i)=><Cell key={i} fill={d.fill}/>)}
              </Pie>
              <Tooltip contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 6 }}/>
              <Legend/>
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>
        <ChartCard title="SLA Performance">
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={sla} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)"/>
              <XAxis type="number" stroke="var(--muted-foreground)" fontSize={12}/>
              <YAxis dataKey="name" type="category" stroke="var(--muted-foreground)" fontSize={12} width={80}/>
              <Tooltip contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 6 }}/>
              <Bar dataKey="v" fill="var(--primary)" radius={[0,6,6,0]}/>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
        <ChartCard title="Monthly Tickets">
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={monthly}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)"/>
              <XAxis dataKey="m" stroke="var(--muted-foreground)" fontSize={12}/>
              <YAxis stroke="var(--muted-foreground)" fontSize={12}/>
              <Tooltip contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 6 }}/>
              <Legend/>
              <Line type="monotone" dataKey="opened" stroke="var(--info)" strokeWidth={2}/>
              <Line type="monotone" dataKey="resolved" stroke="var(--success)" strokeWidth={2}/>
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>
      <Card className="p-5">
        <div className="font-semibold text-sm mb-4">Recently Assigned Tickets</div>
        <div className="divide-y">
          {tickets.slice(0, 6).map(t => (
            <div key={t.id} className="py-3 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="text-sm font-medium truncate">{t.id} — {t.title}</div>
                <div className="text-xs text-muted-foreground">by {t.createdBy} • {t.category}</div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <StatusBadge status={t.priority}/>
                <StatusBadge status={t.status}/>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </>
  );
}
