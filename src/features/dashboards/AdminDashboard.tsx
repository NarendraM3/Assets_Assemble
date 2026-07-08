import { Users, Package, TicketIcon, Timer, Download, FileSpreadsheet, FileText, ShieldCheck, Tag, Laptop, Compass, DollarSign, CalendarDays, KeyRound, User, Mail, Phone, Briefcase, UserCheck, Clock, MapPin, Calendar, HelpCircle, Eye } from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
  PieChart, Pie, Cell, LineChart, Line, AreaChart, Area,
} from "recharts";
import { useState, useEffect } from "react";
import { PageHeader } from "@/components/common/PageHeader";
import { StatCard } from "@/components/common/StatCard";
import { ChartCard } from "@/components/common/ChartCard";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/common/StatusBadge";
import { Card } from "@/components/ui/card";
import { useData } from "@/contexts/data";
import { useAuth } from "@/contexts/auth";
import { TICKET_CATEGORIES, DEPARTMENTS, CATEGORIES } from "@/data/mock";
import { toast } from "sonner";

const COLORS = ["oklch(0.55 0.2 255)","oklch(0.65 0.16 150)","oklch(0.72 0.17 55)","oklch(0.6 0.2 25)","oklch(0.65 0.15 300)","oklch(0.6 0.15 180)","oklch(0.7 0.12 40)"];

export function AdminDashboard() {
  const { user } = useAuth();
  const { employees, assets, tickets, fetchFullProfile } = useData();

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
    fetchFullProfile(selectedEmp.uuid).then(res => {
      if (active) {
        setFullProfile(res);
        setLoadingProfile(false);
      }
    });
    return () => { active = false; };
  }, [selectedEmp]);

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

  const assetsByCat = CATEGORIES.map((c, i) => ({
    c,
    v: assets.filter(a => a.category === c).length,
    fill: COLORS[i % COLORS.length]
  }));

  const ticketsByDept = DEPARTMENTS.map(d => ({
    d,
    v: Math.floor(tickets.length / DEPARTMENTS.length) + Math.floor(Math.random() * 20)
  }));

  const monthly = ["Jan","Feb","Mar","Apr","May","Jun","Jul"].map((m, i) => ({
    m,
    opened: 60 + i * 8,
    closed: 55 + i * 7
  }));

  const exportAs = (fmt: string) => toast.success(`Exported as ${fmt}`, { description: "Download started (demo)" });

  return (
    <>
      <PageHeader 
        title="Administration Dashboard" 
        description="System-wide performance and configuration insights." 
        actions={
          <>
            <Button variant="outline" onClick={() => exportAs("CSV")}><Download className="h-4 w-4 mr-1"/>CSV</Button>
            <Button variant="outline" onClick={() => exportAs("Excel")}><FileSpreadsheet className="h-4 w-4 mr-1"/>Excel</Button>
            <Button variant="outline" onClick={() => exportAs("PDF")}><FileText className="h-4 w-4 mr-1"/>PDF</Button>
          </>
        }
      />
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
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-6">
        <ChartCard title="Assets by Category">
          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Pie data={assetsByCat} dataKey="v" nameKey="c" outerRadius={100}>
                {assetsByCat.map((d, i) => <Cell key={i} fill={d.fill}/>)}
              </Pie>
              <Tooltip contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 6 }}/>
              <Legend wrapperStyle={{ fontSize: 11 }}/>
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>
        <ChartCard title="Tickets by Department">
          <ResponsiveContainer width="100%" height={260}>
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
      <div className="grid grid-cols-1 gap-4 mt-6">
        <ChartCard title="Ticket Volumes">
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={monthly}>
              <defs>
                <linearGradient id="o" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--info)" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="var(--info)" stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="c" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--success)" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="var(--success)" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)"/>
              <XAxis dataKey="m" stroke="var(--muted-foreground)" fontSize={12}/>
              <YAxis stroke="var(--muted-foreground)" fontSize={12}/>
              <Tooltip contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 6 }}/>
              <Legend/>
              <Area type="monotone" dataKey="opened" stroke="var(--info)" fill="url(#o)" strokeWidth={2}/>
              <Area type="monotone" dataKey="closed" stroke="var(--success)" fill="url(#c)" strokeWidth={2}/>
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

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
                    {selectedEmp.avatar || selectedEmp.name.split(" ").map((n: string) => n[0]).join("").toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <div className="text-xs uppercase font-bold text-primary tracking-wider">{selectedEmp.designation || "IT Specialist"}</div>
                  <h4 className="font-bold text-lg text-foreground truncate">{selectedEmp.name}</h4>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="font-mono text-xs text-muted-foreground">{selectedEmp.id}</span>
                    <Badge variant="secondary" className="capitalize text-[10px] py-0 px-1.5">{selectedEmp.role}</Badge>
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
                          <span className="font-medium text-foreground">{fullProfile.user.department || "Not assigned"}</span>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <UserCheck className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                        <div>
                          <span className="text-[10px] text-muted-foreground block uppercase font-semibold">Reporting Manager</span>
                          <span className="font-medium text-foreground">{fullProfile.user.manager || "Not assigned"}</span>
                        </div>
                      </div>
                      <div className="flex gap-2 border-t pt-3 border-dashed col-span-2 sm:col-span-1">
                        <MapPin className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                        <div>
                          <span className="text-[10px] text-muted-foreground block uppercase font-semibold">Location</span>
                          <span className="font-medium text-foreground">{fullProfile.user.location || "Not assigned"}</span>
                        </div>
                      </div>
                      <div className="flex gap-2 border-t pt-3 border-dashed col-span-2 sm:col-span-1">
                        <Calendar className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                        <div>
                          <span className="text-[10px] text-muted-foreground block uppercase font-semibold">Joining Date</span>
                          <span className="font-medium text-foreground">{fullProfile.user.join_date || "Not assigned"}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Personal Contact & Security */}
                  <div>
                    <h5 className="font-semibold text-xs text-muted-foreground uppercase tracking-wider mb-2.5">Contact & Account Details</h5>
                    <div className="grid grid-cols-2 gap-4 border rounded-lg p-4 bg-card shadow-sm">
                      <div className="col-span-2 flex gap-2">
                        <Mail className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                        <div className="min-w-0 flex-1">
                          <span className="text-[10px] text-muted-foreground block uppercase font-semibold">Email Address</span>
                          <span className="font-medium text-foreground block truncate">{fullProfile.user.email}</span>
                        </div>
                      </div>
                      <div className="flex gap-2 border-t pt-3 border-dashed col-span-2 sm:col-span-1">
                        <Phone className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                        <div>
                          <span className="text-[10px] text-muted-foreground block uppercase font-semibold">Phone Number</span>
                          <span className="font-medium text-foreground">{fullProfile.user.phone || "Not provided"}</span>
                        </div>
                      </div>
                      <div className="flex gap-2 border-t pt-3 border-dashed col-span-2 sm:col-span-1">
                        <Clock className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                        <div>
                          <span className="text-[10px] text-muted-foreground block uppercase font-semibold">Last Login</span>
                          <span className="font-medium text-foreground block text-xs">
                            {fullProfile.last_login 
                              ? `${fullProfile.last_login.timestamp} (${fullProfile.last_login.ip})` 
                              : "Never logged in"}
                          </span>
                        </div>
                      </div>
                      <div className="col-span-2 border-t pt-3 border-dashed flex items-center justify-between">
                        <div className="flex gap-1.5 items-center">
                          <KeyRound className="h-4 w-4 text-muted-foreground" />
                          <span className="text-xs text-muted-foreground">Credentials Temporary Reset Status:</span>
                        </div>
                        <Badge variant={fullProfile.user.must_change_password ? "warning" : "success"} className="text-[10px]">
                          {fullProfile.user.must_change_password ? "Reset Code Pending" : "Secured"}
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
                            <div className="text-[10px] text-muted-foreground">Updated {ticket.updated_at.slice(0,10)}</div>
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
