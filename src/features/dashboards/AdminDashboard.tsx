import { Users, Package, TicketIcon, Timer } from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
  PieChart, Pie, Cell, LineChart, Line,
} from "recharts";
import { PageHeader } from "@/components/common/PageHeader";
import { StatCard } from "@/components/common/StatCard";
import { ChartCard } from "@/components/common/ChartCard";
import { employees, assets, tickets, TICKET_CATEGORIES, DEPARTMENTS } from "@/data/mock";

const COLORS = ["oklch(0.55 0.2 255)","oklch(0.65 0.16 150)","oklch(0.72 0.17 55)","oklch(0.6 0.2 25)","oklch(0.65 0.15 300)","oklch(0.6 0.15 180)","oklch(0.7 0.12 40)"];

export function AdminDashboard() {
  const failures = ["Laptop","Desktop","Monitor","Printer","Mobile Phone"].map((c,i)=>({
    c, v: 40 - i*6 + (i%2)*3,
  }));
  const catData = TICKET_CATEGORIES.map((c,i)=>({
    name: c, value: tickets.filter(t=>t.category===c).length, fill: COLORS[i%COLORS.length],
  }));
  const deptAssets = DEPARTMENTS.map(d=>({
    d, v: Math.floor(assets.length / DEPARTMENTS.length) + Math.floor(Math.random()*30),
  }));
  const growth = ["Jan","Feb","Mar","Apr","May","Jun","Jul"].map((m,i)=>({
    m, employees: 180 + i*3, assets: 900 + i*15, tickets: 60 + i*8,
  }));

  return (
    <>
      <PageHeader title="Administration Dashboard" description="System-wide performance and configuration insights." />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard label="Employees" value={employees.length} icon={Users} tone="primary" delta={{value:"+12 this month", up:true}} index={0}/>
        <StatCard label="Assets" value={assets.length.toLocaleString()} icon={Package} tone="info" delta={{value:"+34 this month", up:true}} index={1}/>
        <StatCard label="Tickets" value={tickets.length} icon={TicketIcon} tone="warning" index={2}/>
        <StatCard label="Avg Resolution Time" value="4.2h" icon={Timer} tone="success" delta={{value:"-0.3h", up:true}} index={3}/>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
        <ChartCard title="Top Asset Failures">
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={failures}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)"/>
              <XAxis dataKey="c" stroke="var(--muted-foreground)" fontSize={12}/>
              <YAxis stroke="var(--muted-foreground)" fontSize={12}/>
              <Tooltip contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 6 }}/>
              <Bar dataKey="v" fill="var(--destructive)" radius={[6,6,0,0]}/>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
        <ChartCard title="Ticket Categories">
          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Pie data={catData} dataKey="value" nameKey="name" outerRadius={100}>
                {catData.map((d,i)=><Cell key={i} fill={d.fill}/>)}
              </Pie>
              <Tooltip contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 6 }}/>
              <Legend wrapperStyle={{ fontSize: 11 }}/>
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ChartCard title="Department Assets">
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={deptAssets} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)"/>
              <XAxis type="number" stroke="var(--muted-foreground)" fontSize={12}/>
              <YAxis dataKey="d" type="category" stroke="var(--muted-foreground)" fontSize={12} width={80}/>
              <Tooltip contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 6 }}/>
              <Bar dataKey="v" fill="var(--info)" radius={[0,6,6,0]}/>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
        <ChartCard title="Monthly Growth">
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={growth}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)"/>
              <XAxis dataKey="m" stroke="var(--muted-foreground)" fontSize={12}/>
              <YAxis stroke="var(--muted-foreground)" fontSize={12}/>
              <Tooltip contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 6 }}/>
              <Legend/>
              <Line type="monotone" dataKey="employees" stroke="var(--primary)" strokeWidth={2}/>
              <Line type="monotone" dataKey="assets" stroke="var(--info)" strokeWidth={2}/>
              <Line type="monotone" dataKey="tickets" stroke="var(--warning)" strokeWidth={2}/>
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>
    </>
  );
}
