import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/common/PageHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChartCard } from "@/components/common/ChartCard";
import { Download, FileSpreadsheet, FileText } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, LineChart, Line, PieChart, Pie, Cell } from "recharts";
import { CATEGORIES, DEPARTMENTS, tickets, assets, employees } from "@/data/mock";
import { toast } from "sonner";

const COLORS = ["oklch(0.55 0.2 255)","oklch(0.65 0.16 150)","oklch(0.72 0.17 55)","oklch(0.6 0.2 25)","oklch(0.65 0.15 300)"];

export const Route = createFileRoute("/_app/reports")({
  component: () => {
    const assetsByCat = CATEGORIES.map((c, i) => ({ c, v: assets.filter(a=>a.category===c).length, fill: COLORS[i%COLORS.length] }));
    const ticketsByDept = DEPARTMENTS.map(d => ({ d, v: Math.floor(tickets.length / DEPARTMENTS.length) + Math.floor(Math.random()*20) }));
    const monthly = ["Jan","Feb","Mar","Apr","May","Jun","Jul"].map((m,i)=>({ m, opened: 60 + i*8, closed: 55 + i*7 }));

    const exportAs = (fmt: string) => toast.success(`Exported as ${fmt}`, { description: "Download started (demo)" });

    return (
      <>
        <PageHeader title="Reports & Analytics" description="Cross-domain insights across assets, tickets, and departments."
          actions={
            <>
              <Button variant="outline" onClick={() => exportAs("CSV")}><Download className="h-4 w-4 mr-1"/>CSV</Button>
              <Button variant="outline" onClick={() => exportAs("Excel")}><FileSpreadsheet className="h-4 w-4 mr-1"/>Excel</Button>
              <Button variant="outline" onClick={() => exportAs("PDF")}><FileText className="h-4 w-4 mr-1"/>PDF</Button>
            </>
          }
        />
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mb-6">
          {[
            { l: "Total Assets", v: assets.length.toLocaleString() },
            { l: "Total Tickets", v: tickets.length },
            { l: "Employees", v: employees.length },
            { l: "Departments", v: DEPARTMENTS.length },
          ].map((s, i) => (
            <Card key={i} className="p-4">
              <div className="text-xs uppercase tracking-wider text-muted-foreground">{s.l}</div>
              <div className="text-2xl font-semibold mt-1.5">{s.v}</div>
            </Card>
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
          <ChartCard title="Assets Distribution">
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie data={assetsByCat} dataKey="v" nameKey="c" outerRadius={100}>{assetsByCat.map((d,i)=><Cell key={i} fill={d.fill}/>)}</Pie>
                <Tooltip contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 6 }}/>
                <Legend wrapperStyle={{ fontSize: 11 }}/>
              </PieChart>
            </ResponsiveContainer>
          </ChartCard>
          <ChartCard title="Tickets by Department">
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={ticketsByDept}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)"/>
                <XAxis dataKey="d" stroke="var(--muted-foreground)" fontSize={12}/>
                <YAxis stroke="var(--muted-foreground)" fontSize={12}/>
                <Tooltip contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 6 }}/>
                <Bar dataKey="v" fill="var(--primary)" radius={[6,6,0,0]}/>
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        </div>
        <ChartCard title="Monthly Ticket Activity">
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={monthly}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)"/>
              <XAxis dataKey="m" stroke="var(--muted-foreground)" fontSize={12}/>
              <YAxis stroke="var(--muted-foreground)" fontSize={12}/>
              <Tooltip contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 6 }}/>
              <Legend/>
              <Line dataKey="opened" stroke="var(--info)" strokeWidth={2}/>
              <Line dataKey="closed" stroke="var(--success)" strokeWidth={2}/>
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>
      </>
    );
  },
});
