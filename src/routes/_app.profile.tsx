import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/common/PageHeader";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { StatusBadge } from "@/components/common/StatusBadge";
import { Timeline } from "@/components/common/Timeline";
import { useAuth } from "@/contexts/auth";
import { useData } from "@/contexts/data";
import { Mail, Phone, MapPin, Building2, Edit } from "lucide-react";

export const Route = createFileRoute("/_app/profile")({
  component: ProfilePage,
});

function ProfilePage() {
  const { user } = useAuth();
  const { employees, assets, tickets } = useData();
  const profile = employees.find(e => e.uuid === user?.id || e.id === user?.id);

  const myAssets = assets.filter(a => a.assignedTo === user?.display_id || a.assignedTo === user?.id).slice(0, 5);
  const myTickets = tickets.filter(t => t.createdBy === user?.name).slice(0, 5);

  return (
    <>
      <PageHeader title="My Profile" description="Personal information and activity overview."
        actions={<Button variant="outline"><Edit className="h-4 w-4 mr-1"/>Edit Profile</Button>}/>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="p-6 text-center">
          <Avatar className="h-24 w-24 mx-auto"><AvatarFallback className="bg-primary text-primary-foreground text-2xl">{user?.avatar}</AvatarFallback></Avatar>
          <div className="mt-4 font-semibold text-lg">{user?.name}</div>
          <div className="text-sm text-muted-foreground capitalize">{user?.role.replace("_"," ")}</div>
          <div className="mt-6 text-left space-y-3 text-sm">
            <div className="flex items-center gap-2"><Mail className="h-4 w-4 text-muted-foreground"/>{user?.email}</div>
            <div className="flex items-center gap-2"><Phone className="h-4 w-4 text-muted-foreground"/>{profile?.phone || "Not provided"}</div>
            <div className="flex items-center gap-2"><MapPin className="h-4 w-4 text-muted-foreground"/>{profile?.location || "Not assigned"}</div>
            <div className="flex items-center gap-2"><Building2 className="h-4 w-4 text-muted-foreground"/>{profile?.department || "Not assigned"}</div>
          </div>
        </Card>
          <div className="lg:col-span-2">
            <Tabs defaultValue="assets">
              <TabsList>
                <TabsTrigger value="assets">Assigned Assets ({myAssets.length})</TabsTrigger>
                <TabsTrigger value="tickets">Recent Tickets ({myTickets.length})</TabsTrigger>
                <TabsTrigger value="activity">Activity</TabsTrigger>
              </TabsList>
              <TabsContent value="assets">
                <Card className="divide-y">
                  {myAssets.length === 0 ? (
                    <div className="p-6 text-center text-sm text-muted-foreground">No assets assigned to you.</div>
                  ) : myAssets.map(a => (
                    <div key={a.id} className="p-4 flex items-center justify-between">
                      <div>
                        <div className="font-medium text-sm">{a.name}</div>
                        <div className="text-xs text-muted-foreground">{a.id} • {a.serial}</div>
                      </div>
                      <StatusBadge status={a.status}/>
                    </div>
                  ))}
                </Card>
              </TabsContent>
              <TabsContent value="tickets">
                <Card className="divide-y">
                  {myTickets.length === 0 ? (
                    <div className="p-6 text-center text-sm text-muted-foreground">No tickets raised yet.</div>
                  ) : myTickets.map(t => (
                    <div key={t.id} className="p-4 flex items-center justify-between">
                      <div className="min-w-0"><div className="font-medium text-sm truncate">{t.title}</div><div className="text-xs text-muted-foreground">{t.id} • {t.updatedAt}</div></div>
                      <div className="flex gap-2"><StatusBadge status={t.priority}/><StatusBadge status={t.status}/></div>
                    </div>
                  ))}
                </Card>
              </TabsContent>
              <TabsContent value="activity">
                <Card className="p-6">
                  {myTickets.length === 0 ? (
                    <div className="text-center text-sm text-muted-foreground">No recent activity.</div>
                  ) : (
                    <Timeline items={myTickets.slice(0, 5).map(t => ({
                      title: `Ticket ${t.id} - ${t.status}`,
                      description: t.title,
                      time: t.updatedAt,
                      tone: t.status === "Resolved" || t.status === "Closed" ? "success" as const : "primary" as const,
                    }))}/>
                  )}
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </>
    );
  }
