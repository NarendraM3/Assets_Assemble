import { Package, TicketIcon, CheckCircle2, Clock, Plus, ArrowRight, User, Mail, Phone, Briefcase, UserCheck, MapPin, Calendar, KeyRound, HelpCircle, Bell, ShieldCheck, Tag, Laptop, Compass, DollarSign, CalendarDays } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { useState, useEffect, useMemo } from "react";
import { PageHeader } from "@/components/common/PageHeader";
import { StatCard } from "@/components/common/StatCard";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/common/StatusBadge";
import { useAuth } from "@/contexts/auth";
import { useData } from "@/contexts/data";

export function EmployeeDashboard() {
  const { user } = useAuth();
  const { assets, tickets, notifications, fetchFullProfile } = useData();

  const [fullProfile, setFullProfile] = useState<any | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(true);

  useEffect(() => {
    if (!user) return;
    let active = true;
    fetchFullProfile(user.id).then((res) => {
      if (active) {
        setFullProfile(res);
        setLoadingProfile(false);
      }
    });
    return () => { active = false; };
  }, [user]);

  // Filter assets assigned specifically to this logged-in user
  const myAssets = useMemo(() => {
    if (!user) return [];
    return assets.filter(a => a.status === "Assigned" && a.assignedTo === user.display_id);
  }, [assets, user]);

  // Filter tickets filed by this logged-in user
  const myTickets = useMemo(() => {
    if (!user) return [];
    return tickets.filter(t => t.createdBy === user.name);
  }, [tickets, user]);

  const openTicketsCount = useMemo(() => {
    return myTickets.filter((t) => ["Open", "Assigned", "In Progress"].includes(t.status)).length;
  }, [myTickets]);

  const closedTicketsCount = useMemo(() => {
    return myTickets.filter((t) => t.status === "Closed" || t.status === "Resolved").length;
  }, [myTickets]);

  const pendingTicketsCount = useMemo(() => {
    return myTickets.filter((t) => ["Waiting", "Escalated", "Pending Administration Approval", "Approved for Asset Manager"].includes(t.status)).length;
  }, [myTickets]);

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
        <StatCard label="Open Tickets" value={openTicketsCount} icon={TicketIcon} tone="info" index={1} />
        <StatCard label="Closed Tickets" value={closedTicketsCount} icon={CheckCircle2} tone="success" index={2} />
        <StatCard label="Pending Tickets" value={pendingTicketsCount} icon={Clock} tone="warning" index={3} />
      </div>

      {loadingProfile ? (
        <div className="py-12 text-center text-sm text-muted-foreground bg-card border rounded-lg">
          Loading dashboard profile data...
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column: Personal Profile & Account Info */}
          <div className="space-y-6 lg:col-span-1">
            {/* Employment details */}
            <Card className="p-5 space-y-4">
              <div className="flex flex-col items-center text-center pb-4 border-b">
                <Avatar className="h-20 w-20 border-2 border-primary/20 shadow-inner mb-3">
                  <AvatarFallback className="text-2xl font-bold bg-primary/10 text-primary">
                    {user?.avatar || user?.name.split(" ").map((n: string) => n[0]).join("").toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="text-xs uppercase font-bold text-primary tracking-wider">{user?.designation || "Employee"}</div>
                <h4 className="font-bold text-lg text-foreground mt-0.5">{user?.name}</h4>
                <div className="flex items-center gap-2 mt-1">
                  <span className="font-mono text-xs text-muted-foreground">{user?.display_id}</span>
                  <Badge variant="outline" className="text-[10px] capitalize px-1 py-0">{user?.role}</Badge>
                  <StatusBadge status={user?.status || "Active"} />
                </div>
              </div>

              <div className="space-y-3.5 text-sm pt-2">
                <div className="flex gap-2.5">
                  <Briefcase className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                  <div>
                    <span className="text-[10px] text-muted-foreground block uppercase font-semibold">Department</span>
                    <span className="font-medium text-foreground">{fullProfile?.user?.department || "Not set"}</span>
                  </div>
                </div>

                <div className="flex gap-2.5 border-t pt-3">
                  <UserCheck className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                  <div>
                    <span className="text-[10px] text-muted-foreground block uppercase font-semibold">Reporting Manager</span>
                    <span className="font-medium text-foreground">{fullProfile?.user?.manager || "Not assigned"}</span>
                  </div>
                </div>

                <div className="flex gap-2.5 border-t pt-3">
                  <MapPin className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                  <div>
                    <span className="text-[10px] text-muted-foreground block uppercase font-semibold">Office Location</span>
                    <span className="font-medium text-foreground">{fullProfile?.user?.location || "Not assigned"}</span>
                  </div>
                </div>

                <div className="flex gap-2.5 border-t pt-3">
                  <Calendar className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                  <div>
                    <span className="text-[10px] text-muted-foreground block uppercase font-semibold">Joining Date</span>
                    <span className="font-medium text-foreground">{fullProfile?.user?.join_date || "Not assigned"}</span>
                  </div>
                </div>
              </div>
            </Card>

            {/* Account & Contact Specs */}
            <Card className="p-5 space-y-4">
              <h5 className="font-semibold text-sm text-foreground">Contact & Account Details</h5>
              <div className="space-y-3 text-sm">
                <div className="flex gap-2">
                  <Mail className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                  <div className="min-w-0 flex-1">
                    <span className="text-[10px] text-muted-foreground block uppercase font-semibold">Email Address</span>
                    <span className="font-medium text-foreground block truncate">{user?.email}</span>
                  </div>
                </div>
                <div className="flex gap-2 border-t pt-3">
                  <Phone className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                  <div>
                    <span className="text-[10px] text-muted-foreground block uppercase font-semibold">Phone Number</span>
                    <span className="font-medium text-foreground">{fullProfile?.user?.phone || "Not provided"}</span>
                  </div>
                </div>
                <div className="flex gap-2 border-t pt-3">
                  <Clock className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                  <div>
                    <span className="text-[10px] text-muted-foreground block uppercase font-semibold">Last Login Connection</span>
                    <span className="font-medium text-foreground block text-xs">
                      {fullProfile?.last_login 
                        ? `${fullProfile.last_login.timestamp} (${fullProfile.last_login.ip})` 
                        : "First session connection"}
                    </span>
                  </div>
                </div>
                <div className="border-t pt-3 flex items-center justify-between">
                  <div className="flex gap-1.5 items-center">
                    <KeyRound className="h-4 w-4 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">Credentials Security:</span>
                  </div>
                  <Badge variant={user?.must_change_password ? "warning" : "success"} className="text-[10px]">
                    {user?.must_change_password ? "Temporary Password" : "Secure Password"}
                  </Badge>
                </div>
              </div>
            </Card>
          </div>

          {/* Right Column: Assets, Tickets, & Notifications */}
          <div className="space-y-6 lg:col-span-2">
            {/* Hardware Assets */}
            <Card className="p-5">
              <div className="flex items-center justify-between mb-4">
                <div className="font-semibold text-sm">My Active Hardware Assets ({myAssets.length})</div>
                <Link to="/my-assets" className="text-xs text-primary flex items-center gap-1 hover:underline">
                  More specs <ArrowRight className="h-3 w-3" />
                </Link>
              </div>

              {myAssets.length === 0 ? (
                <div className="p-8 text-center border rounded-lg border-dashed text-sm text-muted-foreground">
                  No hardware devices or active licenses assigned to your profile.
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {myAssets.map((asset) => (
                    <div key={asset.id} className="p-3 border rounded-lg bg-card flex flex-col justify-between shadow-sm hover:border-primary/20 transition-colors">
                      <div className="flex items-start gap-2.5">
                        <div className="h-9 w-9 rounded-md bg-primary/10 grid place-items-center text-primary shrink-0">
                          <Laptop className="h-4.5 w-4.5" />
                        </div>
                        <div className="min-w-0">
                          <div className="font-medium text-sm truncate text-foreground">{asset.name}</div>
                          <div className="text-[10px] text-muted-foreground font-mono mt-0.5">ID: {asset.id}</div>
                        </div>
                      </div>
                      <div className="mt-3.5 grid grid-cols-2 gap-y-1.5 text-[11px] border-t pt-2.5 border-dashed">
                        <span className="text-muted-foreground">Serial:</span>
                        <span className="font-medium truncate text-right">{asset.serial}</span>
                        <span className="text-muted-foreground">Warranty Exp:</span>
                        <span className="font-medium text-right">{asset.warrantyExpiry}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>

            {/* Support Tickets */}
            <Card className="p-5">
              <div className="flex items-center justify-between mb-4">
                <div className="font-semibold text-sm">Recent Service Tickets ({myTickets.length})</div>
                <Link to="/my-tickets" className="text-xs text-primary flex items-center gap-1 hover:underline">
                  View support panel <ArrowRight className="h-3 w-3" />
                </Link>
              </div>

              {myTickets.length === 0 ? (
                <div className="p-8 text-center border rounded-lg border-dashed text-sm text-muted-foreground">
                  No ticket service requests created.
                </div>
              ) : (
                <div className="space-y-3">
                  {myTickets.slice(0, 4).map((ticket) => (
                    <div key={ticket.id} className="p-3.5 border rounded-lg bg-card space-y-2 shadow-sm hover:border-primary/20 transition-colors">
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-xs font-bold text-primary">{ticket.id}</span>
                        <div className="flex gap-1.5">
                          <Badge size="xs" variant={ticket.priority === "Critical" || ticket.priority === "High" ? "destructive" : "secondary"} className="text-[9px] py-0 px-1">
                            {ticket.priority}
                          </Badge>
                          <StatusBadge status={ticket.status} />
                        </div>
                      </div>
                      <div className="font-semibold text-sm text-foreground">{ticket.title}</div>
                      <div className="text-[10px] text-muted-foreground flex justify-between">
                        <span>Category: {ticket.category}</span>
                        <span>Updated: {ticket.updatedAt}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>

            {/* Recent System Notifications */}
            <Card className="p-5">
              <div className="flex items-center justify-between mb-4">
                <div className="font-semibold text-sm flex items-center gap-1.5">
                  <Bell className="h-4.5 w-4.5 text-primary" /> Recent Alerts & Notifications
                </div>
              </div>

              {notifications.length === 0 ? (
                <div className="py-6 text-center text-xs text-muted-foreground">
                  No recent alert messages.
                </div>
              ) : (
                <div className="space-y-3">
                  {notifications.slice(0, 4).map((notif: any, i: number) => (
                    <div key={notif.id || i} className="p-3 border rounded-lg bg-card flex gap-2.5 items-start shadow-sm">
                      <div className={`h-2.5 w-2.5 rounded-full mt-1.5 shrink-0 bg-info ${notif.type === "danger" ? "bg-destructive" : notif.type === "success" ? "bg-success" : "bg-primary"}`} />
                      <div className="min-w-0 flex-1">
                        <div className="text-xs font-medium text-foreground">{notif.title}</div>
                        <div className="text-[10px] text-muted-foreground mt-0.5">{notif.time || "Just now"}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </div>
        </div>
      )}
    </>
  );
}
