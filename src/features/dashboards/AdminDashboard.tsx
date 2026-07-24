import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Users, Package, TicketIcon, CheckCircle, ArrowRight,
  Loader2, AlertTriangle, User, Mail, Phone, Briefcase,
  UserCheck, Clock, MapPin, Calendar, HelpCircle, KeyRound,
} from "lucide-react";
import {
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend,
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  BarChart, Bar,
} from "recharts";
import { PageHeader } from "@/components/common/PageHeader";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/common/StatusBadge";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { WorkflowTimeline, getWorkflowStageLabel } from "@/components/common/WorkflowTimeline";
import { HardwareCategoryBadges } from "@/components/common/HardwareCategoryBadges";
import { useData } from "@/contexts/data";
import { useAuth } from "@/contexts/auth";
import { getRoleLabel } from "@/lib/utils";
import { cn } from "@/lib/utils";
import type { Ticket } from "@/types/domain";

function yearMonthKey(dateValue?: string | null) {
  if (!dateValue) return "Unknown";
  const d = new Date(dateValue);
  if (Number.isNaN(d.getTime())) return "Unknown";
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function formatMonthLabel(key: string) {
  if (key === "Unknown") return "Unknown";
  const [, m] = key.split("-");
  const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return monthNames[parseInt(m, 10) - 1] || key;
}

function findEmployeeName(createdBy: string, employees: { name: string; id: string; email: string }[]): string {
  if (!createdBy || createdBy === "Unknown") return "N/A";
  const emp = employees.find(
    (e) => e.name === createdBy || e.id === createdBy || e.email === createdBy,
  );
  return emp?.name || createdBy;
}

const CATEGORY_ORDER = [
  "Laptop", "Desktop", "Monitor", "Printer", "Keyboard",
  "Mouse", "Headset", "Mobile", "Network Device", "Other",
];

export function AdminDashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { employees, assets, tickets, loading, error, refreshData, fetchFullProfile } = useData();

  const [selectedEmp, setSelectedEmp] = useState<any | null>(null);
  const [fullProfile, setFullProfile] = useState<any | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(false);

  useEffect(() => {
    if (!selectedEmp) {
      setFullProfile(null);
      return;
    }
    let active = true;
    setLoadingProfile(true);
    fetchFullProfile(selectedEmp.uuid).then((res) => {
      if (active) {
        setFullProfile(res);
        setLoadingProfile(false);
      }
    });
    return () => { active = false; };
  }, [selectedEmp, fetchFullProfile]);

  const totalAssets = assets.length;
  const totalEmployees = employees.length;
  const openTickets = tickets.filter((t) => t.status !== "Resolved" && t.status !== "Closed").length;
  const resolvedTickets = tickets.filter((t) => t.status === "Resolved" || t.status === "Closed").length;

  const assetStatusData = useMemo(() => {
    const allocated = assets.filter((a) => a.status === "Assigned" || a.status === "Delivered" || !!a.assignedTo).length;
    const available = assets.filter((a) => a.status === "Available").length;
    const maintenance = assets.filter((a) => a.status === "Under Maintenance" || a.status === "Maintenance").length;
    const retired = assets.filter((a) => a.status === "Retired").length;
    const total = allocated + available + maintenance + retired || 1;
    return [
      { name: "Allocated", value: allocated, percentage: ((allocated / total) * 100).toFixed(1), color: "oklch(0.55 0.2 255)" },
      { name: "Available", value: available, percentage: ((available / total) * 100).toFixed(1), color: "oklch(0.65 0.16 150)" },
      { name: "Under Maintenance", value: maintenance, percentage: ((maintenance / total) * 100).toFixed(1), color: "oklch(0.72 0.17 55)" },
      { name: "Retired", value: retired, percentage: ((retired / total) * 100).toFixed(1), color: "oklch(0.6 0.0 0)" },
    ];
  }, [assets]);

  const ticketTrends = useMemo(() => {
    const map = new Map<string, { open: number; resolved: number }>();
    tickets.forEach((t) => {
      const createdMonth = yearMonthKey(t.createdAt);
      if (!map.has(createdMonth)) map.set(createdMonth, { open: 0, resolved: 0 });
      map.get(createdMonth)!.open++;
    });
    tickets
      .filter((t) => t.status === "Resolved" || t.status === "Closed")
      .forEach((t) => {
        const resolvedMonth = yearMonthKey(t.updatedAt);
        if (!map.has(resolvedMonth)) map.set(resolvedMonth, { open: 0, resolved: 0 });
        map.get(resolvedMonth)!.resolved++;
      });
    return Array.from(map.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, data]) => ({ month: formatMonthLabel(month), ...data }));
  }, [tickets]);

  const recentTickets = useMemo(
    () =>
      [...tickets]
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .slice(0, 5),
    [tickets],
  );

  const topCategories = useMemo(() => {
    const counts = new Map<string, number>();
    assets.forEach((a) => {
      const cat = a.category || "Other";
      counts.set(cat, (counts.get(cat) || 0) + 1);
    });
    const result: { category: string; count: number }[] = [];
    const seen = new Set<string>();
    CATEGORY_ORDER.forEach((cat) => {
      if (counts.has(cat)) {
        result.push({ category: cat, count: counts.get(cat)! });
        seen.add(cat);
      }
    });
    let otherCount = 0;
    counts.forEach((count, cat) => {
      if (!seen.has(cat)) otherCount += count;
    });
    if (otherCount > 0) {
      const existingOther = result.find((r) => r.category === "Other");
      if (existingOther) {
        existingOther.count += otherCount;
      } else {
        result.push({ category: "Other", count: otherCount });
      }
    }
    return result;
  }, [assets]);

  const summaryCards = [
    { label: "Total Assets", value: totalAssets.toLocaleString(), icon: Package, color: "bg-info/10 text-info" },
    { label: "Total Employees", value: totalEmployees.toLocaleString(), icon: Users, color: "bg-primary/10 text-primary" },
    { label: "Open Tickets", value: openTickets.toLocaleString(), icon: TicketIcon, color: "bg-warning/10 text-warning" },
    { label: "Resolved Tickets", value: resolvedTickets.toLocaleString(), icon: CheckCircle, color: "bg-success/10 text-success" },
  ];

  return (
    <>
      <PageHeader title="Administration Dashboard" description="System-wide performance and configuration insights." />

      {loading && (
        <div className="flex items-center justify-center py-12 mb-6 rounded-lg border bg-card">
          <div className="flex flex-col items-center gap-2 text-muted-foreground">
            <Loader2 className="h-8 w-8 animate-spin" />
            <span className="text-sm">Loading dashboard data...</span>
          </div>
        </div>
      )}

      {error && !loading && (
        <div className="flex items-center gap-3 p-4 mb-6 rounded-lg border border-destructive/20 bg-destructive/5 text-destructive text-sm">
          <AlertTriangle className="h-5 w-5 shrink-0" />
          <span>{error}</span>
          <Button variant="outline" size="sm" className="ml-auto" onClick={() => refreshData()}>Retry</Button>
        </div>
      )}

      {!loading && (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            {summaryCards.map((card, i) => (
              <motion.div
                key={card.label}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
              >
                <Card className="p-5 hover:shadow-lg transition-all duration-200 hover:-translate-y-0.5">
                  <div className="flex items-center gap-4">
                    <div className={cn("h-12 w-12 rounded-xl grid place-items-center shrink-0", card.color)}>
                      <card.icon className="h-6 w-6" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs uppercase tracking-wider text-muted-foreground font-medium">{card.label}</div>
                      <div className="text-2xl font-bold mt-0.5 tabular-nums">{card.value}</div>
                    </div>
                  </div>
                </Card>
              </motion.div>
            ))}
          </div>

          {/* Middle Row: Asset Status Doughnut | Ticket Overview Line */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
            {/* Asset Status Doughnut Chart */}
            <Card className="p-5">
              <div className="font-semibold text-sm mb-4">Asset Status</div>
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie
                    data={assetStatusData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={70}
                    outerRadius={105}
                    paddingAngle={3}
                    strokeWidth={0}
                  >
                    {assetStatusData.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      background: "var(--card)",
                      border: "1px solid var(--border)",
                      borderRadius: 8,
                      fontSize: 12,
                    }}
                    formatter={(value: number, name: string) => {
                      const item = assetStatusData.find((d) => d.name === name);
                      return [`${value} (${item?.percentage}%)`, name];
                    }}
                  />
                  <Legend
                    verticalAlign="bottom"
                    wrapperStyle={{ fontSize: 12, paddingTop: 8 }}
                    formatter={(value: string) => {
                      const item = assetStatusData.find((d) => d.name === value);
                      return `${value} — ${item?.value} (${item?.percentage}%)`;
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </Card>

            {/* Ticket Overview Line Chart */}
            <Card className="p-5">
              <div className="font-semibold text-sm mb-4">Ticket Overview</div>
              <ResponsiveContainer width="100%" height={280}>
                <LineChart data={ticketTrends}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="month" stroke="var(--muted-foreground)" fontSize={12} />
                  <YAxis stroke="var(--muted-foreground)" fontSize={12} allowDecimals={false} />
                  <Tooltip
                    contentStyle={{
                      background: "var(--card)",
                      border: "1px solid var(--border)",
                      borderRadius: 8,
                      fontSize: 12,
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Line
                    type="monotone"
                    dataKey="open"
                    name="Open Tickets"
                    stroke="var(--warning)"
                    strokeWidth={2.5}
                    dot={{ r: 3, fill: "var(--warning)" }}
                    activeDot={{ r: 5 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="resolved"
                    name="Resolved Tickets"
                    stroke="var(--success)"
                    strokeWidth={2.5}
                    dot={{ r: 3, fill: "var(--success)" }}
                    activeDot={{ r: 5 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </Card>
          </div>

          {/* Bottom Row: Recent Tickets | Top Asset Categories */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
            {/* Recent Tickets */}
            <Card className="p-5">
              <div className="flex items-center justify-between mb-4">
                <div className="font-semibold text-sm">Recent Tickets</div>
                <Button variant="ghost" size="sm" className="gap-1.5 text-xs" onClick={() => navigate("/all-tickets")}>
                  View All Tickets <ArrowRight className="h-3.5 w-3.5" />
                </Button>
              </div>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/40 hover:bg-muted/40">
                      <TableHead className="text-xs uppercase tracking-wider font-semibold whitespace-nowrap">Ticket ID</TableHead>
                      <TableHead className="text-xs uppercase tracking-wider font-semibold whitespace-nowrap">Employee</TableHead>
                      <TableHead className="text-xs uppercase tracking-wider font-semibold whitespace-nowrap">Subject</TableHead>
                      <TableHead className="text-xs uppercase tracking-wider font-semibold whitespace-nowrap">Date</TableHead>
                      <TableHead className="text-xs uppercase tracking-wider font-semibold whitespace-nowrap">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {recentTickets.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center text-muted-foreground text-sm py-8">
                          No tickets found.
                        </TableCell>
                      </TableRow>
                    ) : (
                      recentTickets.map((ticket) => (
                        <TableRow key={ticket.id} className="hover:bg-muted/30">
                          <TableCell className="font-mono text-xs font-semibold text-primary whitespace-nowrap">
                            {ticket.TicketId || ticket.id?.slice(0, 8) || "-"}
                          </TableCell>
                          <TableCell className="text-sm whitespace-nowrap">
                            {findEmployeeName(ticket.createdBy, employees)}
                          </TableCell>
                          <TableCell className="text-sm max-w-[180px] truncate">{ticket.title || "-"}</TableCell>
                          <TableCell className="text-sm text-muted-foreground whitespace-nowrap">{ticket.createdAt || "-"}</TableCell>
                          <TableCell className="whitespace-nowrap">
                            <StatusBadge status={ticket.status} />
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </Card>

            {/* Top Asset Categories Bar Chart */}
            <Card className="p-5">
              <div className="font-semibold text-sm mb-4">Top Asset Categories</div>
              {topCategories.length === 0 ? (
                <div className="flex items-center justify-center h-[260px] text-muted-foreground text-sm">
                  No asset data available.
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={topCategories} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                    <XAxis dataKey="category" stroke="var(--muted-foreground)" fontSize={11} tickLine={false} />
                    <YAxis stroke="var(--muted-foreground)" fontSize={12} tickLine={false} allowDecimals={false} />
                    <Tooltip
                      contentStyle={{
                        background: "var(--card)",
                        border: "1px solid var(--border)",
                        borderRadius: 8,
                        fontSize: 12,
                      }}
                    />
                    <Bar dataKey="count" radius={[6, 6, 0, 0]} maxBarSize={40}>
                      {topCategories.map((_, i) => (
                        <Cell key={i} fill={i < 6 ? "oklch(0.55 0.18 255 / 1)" : "oklch(0.55 0.18 255 / 0.5)"} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </Card>
          </div>

          {/* Employee Onboarding Workflow Section */}
          <Card className="p-4 mt-2">
            <div className="font-semibold text-sm mb-3 flex items-center justify-between">
              <span>Employee Onboarding Workflow</span>
              <span className="text-xs text-muted-foreground font-normal">
                {employees.filter((e) => e.allocationStatus && e.allocationStatus !== "Completed").length} in progress
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
                  {employees.filter((e) => e.allocationStatus).length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-muted-foreground text-sm py-8">
                        No employees with active workflow found.
                      </TableCell>
                    </TableRow>
                  ) : (
                    employees
                      .filter((e) => e.allocationStatus)
                      .sort((a, b) => {
                        const order: Record<string, number> = {
                          "Awaiting Asset Verification": 0,
                          "Ready for Allocation": 1,
                          "Sent to IT Support Team": 1,
                          "Assigned to IT Support": 2,
                          "IT Asset Assignment In Progress": 2,
                          "Asset Allocated": 3,
                          "Assets Allocated": 3,
                          "Ready for Delivery": 3,
                          "Completed": 4,
                        };
                        return (order[a.allocationStatus ?? ""] ?? 0) - (order[b.allocationStatus ?? ""] ?? 0);
                      })
                      .map((emp) => (
                        <TableRow key={emp.id} className="cursor-pointer" onClick={() => setSelectedEmp(emp)}>
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
        </>
      )}

      {/* Employee Full Profile Drawer */}
      <Sheet open={!!selectedEmp} onOpenChange={(o) => !o && setSelectedEmp(null)}>
        <SheetContent className="sm:max-w-[550px] overflow-y-auto h-full pr-6">
          <SheetHeader className="border-b pb-4">
            <SheetTitle className="flex items-center gap-2 text-lg">
              <User className="h-5 w-5 text-primary" /> Employee Details
            </SheetTitle>
            <SheetDescription>
              Complete record, assigned assets, and support history.
            </SheetDescription>
          </SheetHeader>

          {selectedEmp && (
            <div className="space-y-6 py-5 text-sm">
              {/* Profile Card Header */}
              <div className="flex items-center gap-4 p-4 bg-muted/40 rounded-lg border">
                <Avatar className="h-16 w-16 border-2 border-primary/20 shadow-inner">
                  <AvatarFallback className="text-lg font-bold bg-primary/10 text-primary">
                    {selectedEmp.avatar || (selectedEmp.name ?? "").split(" ").map((n: string) => n[0]).join("").toUpperCase() || "NA"}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <div className="text-xs uppercase font-bold text-primary tracking-wider">{selectedEmp.designation || "IT Specialist"}</div>
                  <h4 className="font-bold text-lg text-foreground truncate">{selectedEmp.name}</h4>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="font-mono text-xs text-muted-foreground">{selectedEmp.id}</span>
                    <Badge variant="secondary" className="text-[10px] py-0 px-1.5">{getRoleLabel(selectedEmp.role)}</Badge>
                    <StatusBadge status={selectedEmp.status} />
                  </div>
                </div>
              </div>

              {loadingProfile ? (
                <div className="py-12 text-center text-muted-foreground text-sm">Loading employee profile details...</div>
              ) : fullProfile ? (
                <div className="space-y-6">
                  {/* Job Information */}
                  <div>
                    <h5 className="font-semibold text-xs text-muted-foreground uppercase tracking-wider mb-2.5">Employment Profile</h5>
                    <div className="grid grid-cols-2 gap-4 border rounded-lg p-4 bg-card shadow-sm">
                      <div className="flex gap-2">
                        <Briefcase className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                        <div>
                          <span className="text-[10px] text-muted-foreground block uppercase font-semibold">Department</span>
                          <span className="font-medium text-foreground">{fullProfile?.user?.department || fullProfile?.department || "Not assigned"}</span>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <UserCheck className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                        <div>
                          <span className="text-[10px] text-muted-foreground block uppercase font-semibold">Reporting Manager</span>
                          <span className="font-medium text-foreground">{fullProfile?.user?.manager ?? fullProfile?.manager ?? "Not assigned"}</span>
                        </div>
                      </div>
                      <div className="flex gap-2 border-t pt-3 border-dashed col-span-2 sm:col-span-1">
                        <MapPin className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                        <div>
                          <span className="text-[10px] text-muted-foreground block uppercase font-semibold">Location</span>
                          <span className="font-medium text-foreground">{fullProfile?.user?.location ?? fullProfile?.location ?? "Not assigned"}</span>
                        </div>
                      </div>
                      <div className="flex gap-2 border-t pt-3 border-dashed col-span-2 sm:col-span-1">
                        <Calendar className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                        <div>
                          <span className="text-[10px] text-muted-foreground block uppercase font-semibold">Joining Date</span>
                          <span className="font-medium text-foreground">{fullProfile?.user?.join_date ?? fullProfile?.joinDate ?? "Not assigned"}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Workflow Timeline */}
                  {selectedEmp.allocationStatus && (
                    <div>
                      <h5 className="font-semibold text-xs text-muted-foreground uppercase tracking-wider mb-2.5">Asset Onboarding Workflow</h5>
                      <div className="border rounded-lg p-4 bg-card shadow-sm">
                        <div className="grid grid-cols-2 gap-y-2 text-xs mb-3">
                          <span className="text-muted-foreground">Current Stage:</span>
                          <span className="font-medium text-foreground">{getWorkflowStageLabel(selectedEmp.allocationStatus)}</span>
                          {selectedEmp.allocationDate && (
                            <>
                              <span className="text-muted-foreground">Scheduled Date:</span>
                              <span className="font-medium text-foreground">{selectedEmp.allocationDate}{selectedEmp.allocationTime ? ` @ ${selectedEmp.allocationTime}` : ""}</span>
                            </>
                          )}
                          {selectedEmp.requiredAssetCategory && (
                            <>
                              <span className="text-muted-foreground">Required Asset:</span>
                              <HardwareCategoryBadges value={selectedEmp.requiredAssetCategory} />
                            </>
                          )}
                        </div>
                        <WorkflowTimeline allocationStatus={selectedEmp.allocationStatus} />
                      </div>
                    </div>
                  )}

                  {/* Personal Contact & Security */}
                  <div>
                    <h5 className="font-semibold text-xs text-muted-foreground uppercase tracking-wider mb-2.5">Contact & Account Details</h5>
                    <div className="grid grid-cols-2 gap-4 border rounded-lg p-4 bg-card shadow-sm">
                      <div className="col-span-2 flex gap-2">
                        <Mail className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                        <div className="min-w-0 flex-1">
                          <span className="text-[10px] text-muted-foreground block uppercase font-semibold">Email Address</span>
                          <span className="font-medium text-foreground block truncate">{fullProfile?.user?.email ?? fullProfile?.email ?? "Not provided"}</span>
                        </div>
                      </div>
                      <div className="flex gap-2 border-t pt-3 border-dashed col-span-2 sm:col-span-1">
                        <Phone className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                        <div>
                          <span className="text-[10px] text-muted-foreground block uppercase font-semibold">Phone Number</span>
                          <span className="font-medium text-foreground">{fullProfile?.user?.phone ?? fullProfile?.phone ?? "Not provided"}</span>
                        </div>
                      </div>
                      <div className="flex gap-2 border-t pt-3 border-dashed col-span-2 sm:col-span-1">
                        <Clock className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                        <div>
                          <span className="text-[10px] text-muted-foreground block uppercase font-semibold">Last Login</span>
                          <span className="font-medium text-foreground block text-xs">
                            {fullProfile.last_login ? `${fullProfile.last_login.timestamp} (${fullProfile.last_login.ip})` : "Never logged in"}
                          </span>
                        </div>
                      </div>
                      <div className="col-span-2 border-t pt-3 border-dashed flex items-center justify-between">
                        <div className="flex gap-1.5 items-center">
                          <KeyRound className="h-4 w-4 text-muted-foreground" />
                          <span className="text-xs text-muted-foreground">Credentials Temporary Reset Status:</span>
                        </div>
                        <Badge variant={(fullProfile?.user?.must_change_password ?? fullProfile?.must_change_password) ? "warning" : "success"} className="text-[10px]">
                          {(fullProfile?.user?.must_change_password ?? fullProfile?.must_change_password) ? "Reset Code Pending" : "Secured"}
                        </Badge>
                      </div>
                    </div>
                  </div>

                  {/* Assigned Assets */}
                  <div>
                    <h5 className="font-semibold text-xs text-muted-foreground uppercase tracking-wider mb-2.5">
                      Assigned Assets ({fullProfile.assigned_assets.length})
                    </h5>
                    {fullProfile.assigned_assets.length === 0 ? (
                      <div className="p-4 text-center border rounded-lg border-dashed text-xs text-muted-foreground">
                        No hardware assets currently issued to this profile.
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {fullProfile.assigned_assets.map((asset: any) => (
                          <div key={asset.id} className="p-3 border rounded-lg bg-card flex items-center justify-between shadow-sm">
                            <div className="min-w-0">
                              <div className="font-medium text-foreground truncate">{asset.name}</div>
                              <div className="text-[10px] text-muted-foreground font-mono mt-0.5">{asset.display_id} • S/N: {asset.serial}</div>
                            </div>
                            <div className="text-right">
                              <Badge variant="outline" className="text-[10px] capitalize">{asset.category}</Badge>
                              <div className="text-[9px] text-muted-foreground mt-0.5">Exp: {asset.warranty_expiry}</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Support Tickets */}
                  <div>
                    <h5 className="font-semibold text-xs text-muted-foreground uppercase tracking-wider mb-2.5">
                      Recent Tickets ({fullProfile.tickets.length})
                    </h5>
                    {fullProfile.tickets.length === 0 ? (
                      <div className="p-4 text-center border rounded-lg border-dashed text-xs text-muted-foreground">
                        No ticket requests created by or assigned to this employee.
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {fullProfile.tickets.slice(0, 5).map((ticket: any) => (
                          <div key={ticket.id} className="p-3 border rounded-lg bg-card space-y-1.5 shadow-sm">
                            <div className="flex items-center justify-between">
                              <span className="font-mono text-xs font-semibold text-primary">{ticket.display_id}</span>
                              <div className="flex gap-1.5">
                                <Badge size="xs" variant={ticket.priority === "Critical" || ticket.priority === "High" ? "destructive" : "secondary"} className="text-[9px] py-0 px-1">
                                  {ticket.priority}
                                </Badge>
                                <StatusBadge status={ticket.status} />
                              </div>
                            </div>
                            <div className="font-medium text-foreground text-xs truncate">{ticket.title}</div>
                            <div className="text-[10px] text-muted-foreground">Updated {ticket.updated_at?.slice(0, 10)}</div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="py-12 text-center text-muted-foreground text-sm flex flex-col items-center gap-2">
                  <HelpCircle className="h-6 w-6 text-muted-foreground" />
                  <span>Failed to load profile details.</span>
                </div>
              )}
            </div>
          )}
        </SheetContent>
      </Sheet>
    </>
  );
}