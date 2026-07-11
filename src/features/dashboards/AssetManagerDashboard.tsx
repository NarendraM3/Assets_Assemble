import { Package, CheckCircle2, PackageCheck, Wrench, Archive } from "lucide-react";
import {
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, AreaChart, Area,
} from "recharts";
import { PageHeader } from "@/components/common/PageHeader";
import { StatCard } from "@/components/common/StatCard";
import { ChartCard } from "@/components/common/ChartCard";
import { Card } from "@/components/ui/card";
import { StatusBadge } from "@/components/common/StatusBadge";
import { useData } from "@/contexts/data";
import { countBy, monthKey } from "@/lib/live-data";

const COLORS = ["oklch(0.55 0.2 255)","oklch(0.65 0.16 150)","oklch(0.72 0.17 55)","oklch(0.6 0.2 25)","oklch(0.65 0.15 300)","oklch(0.6 0.15 180)","oklch(0.7 0.12 40)","oklch(0.5 0.1 200)","oklch(0.55 0.18 320)"];

export function AssetManagerDashboard() {
  const { assets, assignments, employees } = useData();
  const total = assets.length;
  const assigned = assets.filter(a => a.status === "Assigned").length;
  const available = assets.filter(a => a.status === "Available").length;
  const maint = assets.filter(a => a.status === "Maintenance").length;
  const retired = assets.filter(a => a.status === "Retired").length;

  const byCategory = countBy(assets, (asset) => asset.category).map((item, i) => ({
    ...item,
    fill: COLORS[i % COLORS.length],
  }));
  const byStatus = [
    { name: "Assigned", v: assigned },
    { name: "Available", v: available },
    { name: "Maint.", v: maint },
    { name: "Retired", v: retired },
  ];
  const warrantyTrend = countBy(assets, (asset) => monthKey(asset.warrantyExpiry)).map((item) => ({
    m: item.name,
    expiring: item.value,
  }));

  return (
    <>
      <PageHeader title="Asset Manager Dashboard" description="Lifecycle metrics, deployment status, and inventory health." />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
        <StatCard label="Total Assets" value={total.toLocaleString()} icon={Package} tone="primary" index={0} />
        <StatCard label="Assigned" value={assigned} icon={PackageCheck} tone="info" index={1} />
        <StatCard label="Available" value={available} icon={CheckCircle2} tone="success" index={2} />
        <StatCard label="In Maintenance" value={maint} icon={Wrench} tone="warning" index={3} />
        <StatCard label="Retired" value={retired} icon={Archive} tone="danger" index={4} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
        <ChartCard title="Assets by Category">
          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Pie data={byCategory} dataKey="value" nameKey="name" outerRadius={100}>
                {byCategory.map((d,i)=><Cell key={i} fill={d.fill}/>)}
              </Pie>
              <Tooltip contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 6 }}/>
              <Legend wrapperStyle={{ fontSize: 11 }}/>
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>
        <ChartCard title="Assets by Status">
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={byStatus}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)"/>
              <XAxis dataKey="name" stroke="var(--muted-foreground)" fontSize={12}/>
              <YAxis stroke="var(--muted-foreground)" fontSize={12}/>
              <Tooltip contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 6 }}/>
              <Bar dataKey="v" fill="var(--primary)" radius={[6,6,0,0]}/>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
        <ChartCard title="Warranty Expiration (6 mo)">
          <ResponsiveContainer width="100%" height={260}>
            <AreaChart data={warrantyTrend}>
              <defs>
                <linearGradient id="warr" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--warning)" stopOpacity={0.5}/>
                  <stop offset="100%" stopColor="var(--warning)" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)"/>
              <XAxis dataKey="m" stroke="var(--muted-foreground)" fontSize={12}/>
              <YAxis stroke="var(--muted-foreground)" fontSize={12}/>
              <Tooltip contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 6 }}/>
              <Area type="monotone" dataKey="expiring" stroke="var(--warning)" fill="url(#warr)" strokeWidth={2}/>
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      <Card className="p-5">
        <div className="font-semibold text-sm mb-4">Recent Assignments</div>
        <div className="divide-y">
          {assignments.slice(0, 6).map(a => {
            const asset = assets.find(x => x.id === a.assetId);
            if (!asset) return null;
            const emp = employees.find(e => e.id === a.employeeId);
            return (
              <div key={a.id} className="py-3 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-sm font-medium truncate">{asset.name}</div>
                  <div className="text-xs text-muted-foreground">Assigned to {emp?.name || a.employeeId} • {a.assignedDate}</div>
                </div>
                <StatusBadge status={a.status}/>
              </div>
            );
          })}
        </div>
      </Card>
    </>
  );
}
