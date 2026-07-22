import { useState } from "react";
import { TicketIcon, AlertTriangle, Clock, CheckCircle2, User, Package, Mail, Phone } from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
  LineChart, Line, PieChart, Pie, Cell,
} from "recharts";
import { PageHeader } from "@/components/common/PageHeader";
import { StatCard } from "@/components/common/StatCard";
import { ChartCard } from "@/components/common/ChartCard";
import { Card } from "@/components/ui/card";
import { StatusBadge } from "@/components/common/StatusBadge";
import { WorkflowTimeline, getWorkflowStageLabel } from "@/components/common/WorkflowTimeline";
import { HardwareCategoryBadges } from "@/components/common/HardwareCategoryBadges";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useData } from "@/contexts/data";
import { countBy, monthKey } from "@/lib/live-data";

const COLORS = ["oklch(0.55 0.2 255)", "oklch(0.65 0.16 150)", "oklch(0.72 0.17 55)", "oklch(0.6 0.2 25)"];

export function SupportDashboard() {
  const { tickets, employees } = useData();
  const [selectedWorkflowEmp, setSelectedWorkflowEmp] = useState<any | null>(null);
  const open = tickets.filter(t => t.status === "Open").length;
  const critical = tickets.filter(t => t.priority === "Critical").length;
  const priorityData = countBy(tickets, (ticket) => ticket.priority).map((item, i) => ({
    ...item,
    fill: COLORS[i % COLORS.length],
  }));
  const sla = [
    { name: "On Track", v: tickets.filter(t => t.sla === "On Track").length },
    { name: "At Risk", v: tickets.filter(t => t.sla === "At Risk").length },
    { name: "Breached", v: tickets.filter(t => t.sla === "Breached").length },
  ];
  const monthly = countBy(tickets, (ticket) => monthKey(ticket.createdAt)).map((item) => ({
    m: item.name,
    opened: item.value,
    resolved: tickets.filter((ticket) => monthKey(ticket.updatedAt) === item.name && ["Resolved", "Closed"].includes(ticket.status)).length,
  }));

  return (
    <>
      <PageHeader title="IT Support Team Dashboard" description="Monitor ticket queues, SLA health, and daily resolution progress." />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard label="Open Tickets" value={open} icon={TicketIcon} tone="info" index={0} />
        <StatCard label="Critical Tickets" value={critical} icon={AlertTriangle} tone="danger" index={1} />
        <StatCard label="Assigned Today" value={tickets.filter(t => t.status === "Assigned" && t.updatedAt === new Date().toISOString().slice(0, 10)).length} icon={Clock} tone="warning" index={2} />
        <StatCard label="Resolved Today" value={tickets.filter(t => ["Resolved", "Closed"].includes(t.status) && t.updatedAt === new Date().toISOString().slice(0, 10)).length} icon={CheckCircle2} tone="success" index={3} />
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
                  <div className="text-[11px] text-muted-foreground/80 mt-0.5">
                    Resolution: {t.EstimatedResolutionTime || "Not Estimated Yet"}
                  </div>
                </div>
              <div className="flex items-center gap-2 shrink-0">
                <StatusBadge status={t.priority}/>
                <StatusBadge status={t.status}/>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Employee Onboarding Workflow Queue */}
      <Card className="p-4 mt-6">
        <div className="font-semibold text-sm mb-3 flex items-center justify-between">
          <span>Employee Onboarding Workflow</span>
          <span className="text-xs text-muted-foreground font-normal">
            {employees.filter(e => e.allocationStatus && e.allocationStatus !== "Completed").length} in progress
          </span>
        </div>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40 hover:bg-muted/40">
                <TableHead className="text-xs uppercase tracking-wider font-semibold whitespace-nowrap">Employee</TableHead>
                <TableHead className="text-xs uppercase tracking-wider font-semibold whitespace-nowrap">Department</TableHead>
                <TableHead className="text-xs uppercase tracking-wider font-semibold whitespace-nowrap">Workflow Timeline</TableHead>
                <TableHead className="text-xs uppercase tracking-wider font-semibold whitespace-nowrap">Stage</TableHead>
                <TableHead className="text-xs uppercase tracking-wider font-semibold whitespace-nowrap">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {employees.filter(e => e.allocationStatus).length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground text-sm py-8">
                    No employees with active workflow found.
                  </TableCell>
                </TableRow>
              ) : (
                employees
                  .filter(e => e.allocationStatus)
                  .sort((a, b) => {
                    const order: Record<string, number> = { "Awaiting Asset Verification": 0, "Ready for Allocation": 1, "Sent to IT Support Team": 1, "Assigned to IT Support": 2, "IT Asset Assignment In Progress": 2, "Asset Allocated": 3, "Assets Allocated": 3, "Ready for Delivery": 3, "Completed": 4 };
                    return (order[a.allocationStatus ?? ""] ?? 0) - (order[b.allocationStatus ?? ""] ?? 0);
                  })
                  .map((emp) => (
                    <TableRow
                      key={emp.id}
                      className="cursor-pointer"
                      onClick={() => setSelectedWorkflowEmp(emp)}
                    >
                      <TableCell className="text-sm whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <div className="h-7 w-7 rounded-full bg-primary/10 text-primary text-[10px] font-bold grid place-items-center">
                            {emp.avatar || emp.name.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2)}
                          </div>
                          <div>
                            <div className="font-medium text-sm">{emp.name}</div>
                            <div className="text-[10px] text-muted-foreground font-mono">{emp.id}</div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm whitespace-nowrap">{emp.department || "-"}</TableCell>
                      <TableCell className="min-w-[280px]">
                        <WorkflowTimeline allocationStatus={emp.allocationStatus} variant="horizontal" />
                      </TableCell>
                      <TableCell className="whitespace-nowrap">
                        <span className="text-xs font-medium text-muted-foreground">
                          {getWorkflowStageLabel(emp.allocationStatus)}
                        </span>
                      </TableCell>
                      <TableCell className="whitespace-nowrap">
                        <StatusBadge status={emp.status} />
                      </TableCell>
                    </TableRow>
                  ))
              )}
            </TableBody>
          </Table>
        </div>
      </Card>

      {/* Employee Workflow Detail Sheet */}
      <Sheet open={!!selectedWorkflowEmp} onOpenChange={(o) => !o && setSelectedWorkflowEmp(null)}>
        <SheetContent className="sm:max-w-[550px] overflow-y-auto h-full pr-6">
          <SheetHeader className="border-b pb-4 mb-4">
            <SheetTitle className="flex items-center gap-2 text-lg">
              <User className="h-5 w-5 text-primary" /> Employee Workflow Details
            </SheetTitle>
          </SheetHeader>
          {selectedWorkflowEmp && (
            <div className="space-y-6 text-sm">
              <div className="flex items-center gap-4 p-4 bg-muted/40 rounded-lg border">
                <Avatar className="h-14 w-14 border-2 border-primary/20">
                  <AvatarFallback className="text-base font-bold bg-primary/10 text-primary">
                    {selectedWorkflowEmp.avatar || selectedWorkflowEmp.name.split(" ").map((n: string) => n[0]).join("").toUpperCase() || "NA"}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <div className="text-xs uppercase font-bold text-primary tracking-wider">{selectedWorkflowEmp.designation || ""}</div>
                  <h4 className="font-bold text-lg text-foreground truncate">{selectedWorkflowEmp.name}</h4>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="font-mono text-xs text-muted-foreground">{selectedWorkflowEmp.id}</span>
                    <StatusBadge status={selectedWorkflowEmp.status} />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 border rounded-lg p-4 bg-card shadow-sm">
                <div>
                  <span className="text-[10px] text-muted-foreground block uppercase font-semibold">Department</span>
                  <span className="font-medium text-foreground">{selectedWorkflowEmp.department || "-"}</span>
                </div>
                <div>
                  <span className="text-[10px] text-muted-foreground block uppercase font-semibold">Email</span>
                  <span className="font-medium text-foreground break-all">{selectedWorkflowEmp.email || "-"}</span>
                </div>
                {selectedWorkflowEmp.joinDate && (
                  <div>
                    <span className="text-[10px] text-muted-foreground block uppercase font-semibold">Join Date</span>
                    <span className="font-medium text-foreground">{selectedWorkflowEmp.joinDate}</span>
                  </div>
                )}
                {selectedWorkflowEmp.allocationDate && (
                  <div>
                    <span className="text-[10px] text-muted-foreground block uppercase font-semibold">Scheduled Date</span>
                    <span className="font-medium text-foreground">{selectedWorkflowEmp.allocationDate}{selectedWorkflowEmp.allocationTime ? ` @ ${selectedWorkflowEmp.allocationTime}` : ""}</span>
                  </div>
                )}
              </div>

              <div className="border rounded-lg p-4 bg-card shadow-sm">
                <h5 className="font-semibold text-xs text-muted-foreground uppercase tracking-wider mb-2.5">Asset Onboarding Workflow</h5>
                <div className="grid grid-cols-2 gap-y-2 text-xs mb-3">
                  <span className="text-muted-foreground">Current Stage:</span>
                  <span className="font-medium text-foreground">{getWorkflowStageLabel(selectedWorkflowEmp.allocationStatus)}</span>
                  {selectedWorkflowEmp.requiredAssetCategory && (
                    <>
                      <span className="text-muted-foreground">Required Asset:</span>
                      <HardwareCategoryBadges value={selectedWorkflowEmp.requiredAssetCategory} />
                    </>
                  )}
                </div>
                <WorkflowTimeline allocationStatus={selectedWorkflowEmp.allocationStatus} />
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </>
  );
}
