import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/common/PageHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DEPARTMENTS, employees, assets, tickets } from "@/data/mock";
import { Building2, Users, Plus, MoreHorizontal, DollarSign, Ticket, Laptop, Search, MapPin, ArrowLeft } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { useState } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { StatusBadge } from "@/components/common/StatusBadge";

export const Route = createFileRoute("/_app/departments")({
  component: () => {
    const heads = ["Sarah Johnson", "Michael Chen", "Priya Sharma", "David Rodriguez", "Emma Wilson", "Amelia Kumar"];
    const [selectedDept, setSelectedDept] = useState<string | null>(null);
    const [memberSearch, setMemberSearch] = useState("");
    const [assetSearch, setAssetSearch] = useState("");
    const [ticketSearch, setTicketSearch] = useState("");

    // Calculate metrics and retrieve list for selected department
    const getDeptData = (deptName: string) => {
      const deptEmployees = employees.filter((e) => e.department === deptName);
      const employeeIds = new Set(deptEmployees.map((e) => e.id));
      const employeeNames = new Set(deptEmployees.map((e) => e.name));
      const deptAssets = assets.filter((a) => a.assignedTo && employeeIds.has(a.assignedTo));
      const deptTickets = tickets.filter((t) => employeeNames.has(t.createdBy));
      const totalCost = deptAssets.reduce((sum, a) => sum + a.cost, 0);
      const activeTicketsCount = deptTickets.filter(
        (t) => t.status !== "Closed" && t.status !== "Resolved"
      ).length;

      return {
        employees: deptEmployees,
        assets: deptAssets,
        tickets: deptTickets,
        totalCost,
        activeTicketsCount,
      };
    };

    const deptData = selectedDept ? getDeptData(selectedDept) : null;

    // Search filters
    const filteredEmployees = deptData
      ? deptData.employees.filter(
          (e) =>
            e.name.toLowerCase().includes(memberSearch.toLowerCase()) ||
            e.designation.toLowerCase().includes(memberSearch.toLowerCase()) ||
            e.location.toLowerCase().includes(memberSearch.toLowerCase()) ||
            e.id.toLowerCase().includes(memberSearch.toLowerCase())
        )
      : [];

    const filteredAssets = deptData
      ? deptData.assets.filter(
          (a) =>
            a.name.toLowerCase().includes(assetSearch.toLowerCase()) ||
            a.category.toLowerCase().includes(assetSearch.toLowerCase()) ||
            a.serial.toLowerCase().includes(assetSearch.toLowerCase()) ||
            a.id.toLowerCase().includes(assetSearch.toLowerCase())
        )
      : [];

    const filteredTickets = deptData
      ? deptData.tickets.filter(
          (t) =>
            t.title.toLowerCase().includes(ticketSearch.toLowerCase()) ||
            t.id.toLowerCase().includes(ticketSearch.toLowerCase()) ||
            t.createdBy.toLowerCase().includes(ticketSearch.toLowerCase())
        )
      : [];

    // Full screen department details view
    if (selectedDept && deptData) {
      // Find locations represented
      const locationsSet = new Set(deptData.employees.map(e => e.location.split(" - ")[0]));
      const locationsList = Array.from(locationsSet);

      // Members status breakdown
      const activeCount = deptData.employees.filter(e => e.status === "Active").length;
      const leaveCount = deptData.employees.filter(e => e.status === "On Leave").length;
      const inactiveCount = deptData.employees.filter(e => e.status === "Inactive").length;

      return (
        <div className="space-y-6 animate-in fade-in duration-200">
          <div className="flex items-center justify-between">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSelectedDept(null)}
              className="gap-2"
            >
              <ArrowLeft className="h-4 w-4" /> Back to Departments
            </Button>
            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={() => toast.success(`Exported ${selectedDept} Report`)}>Export Data</Button>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="h-16 w-16 rounded-xl bg-primary/10 text-primary flex items-center justify-center border shadow-sm">
              <Building2 className="h-9 w-9" />
            </div>
            <div>
              <h1 className="text-3xl font-bold tracking-tight">{selectedDept}</h1>
              <p className="text-muted-foreground mt-0.5">
                Department Head: <span className="font-semibold text-foreground">{heads[DEPARTMENTS.indexOf(selectedDept)]}</span>
              </p>
            </div>
          </div>

          {/* Key Metrics Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="p-5 flex flex-col justify-between space-y-3 shadow-sm hover:shadow transition-shadow">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-muted-foreground">Members</span>
                <div className="h-8 w-8 rounded-md bg-primary/10 text-primary grid place-items-center">
                  <Users className="h-4 w-4" />
                </div>
              </div>
              <div>
                <div className="text-2xl font-bold">{deptData.employees.length}</div>
                <p className="text-xs text-muted-foreground mt-0.5">Total personnel in organization</p>
              </div>
            </Card>
            <Card className="p-5 flex flex-col justify-between space-y-3 shadow-sm hover:shadow transition-shadow">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-muted-foreground">Assets</span>
                <div className="h-8 w-8 rounded-md bg-emerald-500/10 text-emerald-600 grid place-items-center">
                  <Laptop className="h-4 w-4" />
                </div>
              </div>
              <div>
                <div className="text-2xl font-bold">{deptData.assets.length}</div>
                <p className="text-xs text-muted-foreground mt-0.5">Active assigned physical devices</p>
              </div>
            </Card>
            <Card className="p-5 flex flex-col justify-between space-y-3 shadow-sm hover:shadow transition-shadow">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-muted-foreground">Asset Value</span>
                <div className="h-8 w-8 rounded-md bg-amber-500/10 text-amber-600 grid place-items-center">
                  <DollarSign className="h-4 w-4" />
                </div>
              </div>
              <div>
                <div className="text-2xl font-bold">${deptData.totalCost.toLocaleString()}</div>
                <p className="text-xs text-muted-foreground mt-0.5">Total investment in assets</p>
              </div>
            </Card>
            <Card className="p-5 flex flex-col justify-between space-y-3 shadow-sm hover:shadow transition-shadow">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-muted-foreground">Active Tickets</span>
                <div className="h-8 w-8 rounded-md bg-rose-500/10 text-rose-600 grid place-items-center">
                  <Ticket className="h-4 w-4" />
                </div>
              </div>
              <div>
                <div className="text-2xl font-bold">{deptData.activeTicketsCount}</div>
                <p className="text-xs text-muted-foreground mt-0.5">Pending IT help desk support tickets</p>
              </div>
            </Card>
          </div>

          {/* Main Content Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Overview / Stats Column */}
            <div className="space-y-6 lg:col-span-1">
              <Card className="p-5 space-y-4 shadow-sm">
                <div className="font-semibold text-base border-b pb-2">Department Overview</div>
                
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Department Name</span>
                    <span className="font-semibold">{selectedDept}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Department Head</span>
                    <span className="font-semibold">{heads[DEPARTMENTS.indexOf(selectedDept)]}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Avg. Assets per Member</span>
                    <span className="font-semibold">{(deptData.assets.length / (deptData.employees.length || 1)).toFixed(1)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Active Tickets Ratio</span>
                    <span className="font-semibold">{((deptData.activeTicketsCount / (deptData.employees.length || 1)) * 100).toFixed(0)}%</span>
                  </div>
                </div>
              </Card>

              <Card className="p-5 space-y-4 shadow-sm">
                <div className="font-semibold text-base border-b pb-2">Personnel Status</div>
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <span className="h-2.5 w-2.5 rounded-full bg-emerald-500"></span>
                      <span>Active Employees</span>
                    </div>
                    <span className="font-bold">{activeCount}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <span className="h-2.5 w-2.5 rounded-full bg-amber-500"></span>
                      <span>On Leave</span>
                    </div>
                    <span className="font-bold">{leaveCount}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <span className="h-2.5 w-2.5 rounded-full bg-slate-400"></span>
                      <span>Inactive</span>
                    </div>
                    <span className="font-bold">{inactiveCount}</span>
                  </div>
                </div>
              </Card>

              <Card className="p-5 space-y-4 shadow-sm">
                <div className="font-semibold text-base border-b pb-2">Office Locations</div>
                <div className="flex flex-wrap gap-1.5">
                  {locationsList.map((loc) => (
                    <span key={loc} className="text-xs bg-muted border px-2.5 py-1 rounded-full text-muted-foreground font-medium">
                      {loc}
                    </span>
                  ))}
                </div>
              </Card>
            </div>

            {/* List / Tabs Column */}
            <div className="lg:col-span-2">
              <Card className="p-5 shadow-sm">
                <Tabs defaultValue="members" className="w-full">
                  <TabsList className="grid grid-cols-3 mb-6 w-full">
                    <TabsTrigger value="members">Members ({deptData.employees.length})</TabsTrigger>
                    <TabsTrigger value="assets">Assets ({deptData.assets.length})</TabsTrigger>
                    <TabsTrigger value="tickets">Tickets ({deptData.tickets.length})</TabsTrigger>
                  </TabsList>

                  {/* Members Tab */}
                  <TabsContent value="members" className="space-y-4">
                    <div className="relative">
                      <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Search department members..."
                        className="pl-10 h-10"
                        value={memberSearch}
                        onChange={(e) => setMemberSearch(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2.5 max-h-[500px] overflow-y-auto pr-1">
                      {filteredEmployees.length === 0 ? (
                        <div className="text-center py-12 text-sm text-muted-foreground">No members found matching "{memberSearch}"</div>
                      ) : (
                        filteredEmployees.map((emp) => (
                          <div
                            key={emp.id}
                            className="flex items-center justify-between p-4 border rounded-xl hover:bg-muted/30 hover:border-muted-foreground/20 transition-all"
                          >
                            <div className="flex items-center gap-3">
                              <Avatar className="h-10 w-10">
                                <AvatarFallback className="bg-primary/10 text-primary font-semibold text-sm">
                                  {emp.avatar}
                                </AvatarFallback>
                              </Avatar>
                              <div>
                                <div className="text-sm font-semibold text-foreground">{emp.name}</div>
                                <div className="text-xs text-muted-foreground flex items-center gap-2 mt-0.5">
                                  <span className="font-medium">{emp.designation}</span>
                                  <span>•</span>
                                  <span className="flex items-center gap-0.5"><MapPin className="h-3 w-3 inline" /> {emp.location}</span>
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-4">
                              <span className="text-xs font-mono text-muted-foreground bg-muted border px-2 py-0.5 rounded">{emp.id}</span>
                              <StatusBadge status={emp.status} />
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </TabsContent>

                  {/* Assets Tab */}
                  <TabsContent value="assets" className="space-y-4">
                    <div className="relative">
                      <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Search department assets..."
                        className="pl-10 h-10"
                        value={assetSearch}
                        onChange={(e) => setAssetSearch(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2.5 max-h-[500px] overflow-y-auto pr-1">
                      {filteredAssets.length === 0 ? (
                        <div className="text-center py-12 text-sm text-muted-foreground">No assets found matching "{assetSearch}"</div>
                      ) : (
                        filteredAssets.map((asset) => (
                          <div
                            key={asset.id}
                            className="flex items-center justify-between p-4 border rounded-xl hover:bg-muted/30 hover:border-muted-foreground/20 transition-all"
                          >
                            <div>
                              <div className="text-sm font-semibold text-foreground">{asset.name}</div>
                              <div className="text-xs text-muted-foreground flex items-center gap-2 mt-0.5">
                                <span className="font-semibold text-primary/80 bg-primary/5 px-2 py-0.5 rounded border border-primary/10">{asset.category}</span>
                                <span>•</span>
                                <span>Serial: <span className="font-mono">{asset.serial}</span></span>
                              </div>
                            </div>
                            <div className="text-right flex items-center gap-5">
                              <div>
                                <div className="text-sm font-bold text-foreground">${asset.cost.toLocaleString()}</div>
                                <div className="text-[10px] text-muted-foreground">{asset.location.split(" - ")[0]}</div>
                              </div>
                              <StatusBadge status={asset.status} />
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </TabsContent>

                  {/* Tickets Tab */}
                  <TabsContent value="tickets" className="space-y-4">
                    <div className="relative">
                      <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Search tickets from this department..."
                        className="pl-10 h-10"
                        value={ticketSearch}
                        onChange={(e) => setTicketSearch(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2.5 max-h-[500px] overflow-y-auto pr-1">
                      {filteredTickets.length === 0 ? (
                        <div className="text-center py-12 text-sm text-muted-foreground">No tickets found matching "{ticketSearch}"</div>
                      ) : (
                        filteredTickets.map((ticket) => (
                          <div
                            key={ticket.id}
                            className="p-4 border rounded-xl hover:bg-muted/30 hover:border-muted-foreground/20 transition-all space-y-3"
                          >
                            <div className="flex items-start justify-between gap-4">
                              <div>
                                <div className="text-sm font-semibold text-foreground line-clamp-1">{ticket.title}</div>
                                <div className="text-[11px] text-muted-foreground mt-1 flex items-center gap-2">
                                  <span className="font-mono text-xs bg-muted border px-1.5 py-0.25 rounded">{ticket.id}</span>
                                  <span>•</span>
                                  <span>By {ticket.createdBy} on {ticket.createdAt}</span>
                                </div>
                              </div>
                              <div className="flex items-center gap-2 shrink-0">
                                <StatusBadge status={ticket.priority} />
                                <StatusBadge status={ticket.status} />
                              </div>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </TabsContent>
                </Tabs>
              </Card>
            </div>
          </div>
        </div>
      );
    }

    return (
      <>
        <PageHeader title="Departments" description="Organizational hierarchy across the company."
          actions={<Button onClick={()=>toast.success("Department created")}><Plus className="h-4 w-4 mr-1"/>New Department</Button>}/>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {DEPARTMENTS.map((d, i) => {
            const count = employees.filter(e => e.department === d).length;
            return (
              <Card
                key={d}
                className="p-5 hover:shadow-md hover:border-primary transition-all cursor-pointer"
                onClick={() => {
                  setSelectedDept(d);
                  // Clear searches when switching department
                  setMemberSearch("");
                  setAssetSearch("");
                  setTicketSearch("");
                }}
              >
                <div className="flex items-start justify-between">
                  <div className="h-11 w-11 rounded-md bg-primary/10 text-primary grid place-items-center">
                    <Building2 className="h-5 w-5"/>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <MoreHorizontal className="h-4 w-4"/>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                      <DropdownMenuItem onClick={() => toast.success(`Edit ${d}`)}>Edit</DropdownMenuItem>
                      <DropdownMenuItem onClick={() => toast.success(`Archive ${d}`)}>Archive</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
                <div className="mt-4">
                  <div className="text-lg font-semibold">{d}</div>
                  <div className="text-xs text-muted-foreground">Head: {heads[i]}</div>
                </div>
                <div className="mt-4 pt-4 border-t flex items-center justify-between text-sm">
                  <div className="flex items-center gap-1 text-muted-foreground"><Users className="h-4 w-4"/> {count} members</div>
                  <div className="text-muted-foreground">{Math.floor(count * 1.6)} assets</div>
                </div>
              </Card>
            );
          })}
        </div>
      </>
    );
  },
});
