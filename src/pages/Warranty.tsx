import type { ColumnDef } from "@tanstack/react-table";
import { AlertTriangle, CheckCircle2, Calendar } from "lucide-react";
import { PageHeader } from "@/components/common/PageHeader";
import { StatCard } from "@/components/common/StatCard";
import { ChartCard } from "@/components/common/ChartCard";
import { DataTable } from "@/components/common/DataTable";
import { Card } from "@/components/ui/card";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import type { Asset } from "@/types/domain";
import { cn } from "@/lib/utils";
import { useData } from "@/contexts/data";

function daysUntil(d: string) {
  return Math.floor((new Date(d).getTime() - new Date("2026-07-06").getTime()) / (1000*60*60*24));
}

export default function WarrantyPage() {
  const { assets } = useData();
  const expiring30 = assets.filter(a => { const d = daysUntil(a.warrantyExpiry); return d >= 0 && d <= 30; });
  const expired = assets.filter(a => daysUntil(a.warrantyExpiry) < 0);
  const active = assets.filter(a => daysUntil(a.warrantyExpiry) > 30);

  const trend = [...new Set(assets.map(a => {
    const d = new Date(a.warrantyExpiry);
    return isNaN(d.getTime()) ? null : d.toLocaleString("en", { month: "short", year: "2-digit" });
  }).filter(Boolean))].slice(0, 8).map(m => ({
    m,
    expiring: assets.filter(a => {
      const d = new Date(a.warrantyExpiry);
      return !isNaN(d.getTime()) && d.toLocaleString("en", { month: "short", year: "2-digit" }) === m;
    }).length,
  }));

  const columns: ColumnDef<Asset>[] = [
    { accessorKey: "id", header: "Asset ID" },
    { accessorKey: "name", header: "Asset" },
    { accessorKey: "manufacturer", header: "Manufacturer" },
    { accessorKey: "warrantyExpiry", header: "Expires" },
    { id: "days", header: "Days Left", cell: ({row}) => {
      const d = daysUntil(row.original.warrantyExpiry);
      const tone = d < 0 ? "text-destructive" : d < 30 ? "text-warning" : "text-success";
      return <span className={cn("font-medium", tone)}>{d < 0 ? `${Math.abs(d)}d ago` : `${d}d`}</span>;
    }},
    { accessorKey: "location", header: "Location" },
  ];

  return (
    <>
      <PageHeader title="Warranty Management" description="Monitor coverage windows and take action before expiration."/>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <StatCard label="Expiring in 30 Days" value={expiring30.length} icon={AlertTriangle} tone="warning" index={0}/>
        <StatCard label="Expired" value={expired.length} icon={Calendar} tone="danger" index={1}/>
        <StatCard label="Active" value={active.length.toLocaleString()} icon={CheckCircle2} tone="success" index={2}/>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
        <ChartCard title="Warranty Trend (next 8 months)" className="lg:col-span-2">
          <ResponsiveContainer width="100%" height={260}>
            <AreaChart data={trend}>
              <defs>
                <linearGradient id="w" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--warning)" stopOpacity={0.4}/>
                  <stop offset="100%" stopColor="var(--warning)" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)"/>
              <XAxis dataKey="m" stroke="var(--muted-foreground)" fontSize={12}/>
              <YAxis stroke="var(--muted-foreground)" fontSize={12}/>
              <Tooltip contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 6 }}/>
              <Area type="monotone" dataKey="expiring" stroke="var(--warning)" fill="url(#w)" strokeWidth={2}/>
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>
        <Card className="p-5">
          <div className="font-semibold text-sm mb-3">Coverage Health</div>
          <div className="space-y-3">
            {[
              { label: "Active coverage", pct: 82, tone: "bg-success" },
              { label: "Expiring soon", pct: 12, tone: "bg-warning" },
              { label: "Expired", pct: 6, tone: "bg-destructive" },
            ].map(x => (
              <div key={x.label}>
                <div className="flex justify-between text-xs mb-1"><span>{x.label}</span><span className="font-medium">{x.pct}%</span></div>
                <div className="h-2 bg-muted rounded-full overflow-hidden"><div className={cn("h-full", x.tone)} style={{ width: `${x.pct}%` }}/></div>
              </div>
            ))}
          </div>
        </Card>
      </div>
      <Card className="p-4">
        <div className="font-semibold text-sm mb-3">Expiring Assets</div>
        <DataTable data={[...expired, ...expiring30]} columns={columns} searchPlaceholder="Search assets…"/>
      </Card>
    </>
  );
}
