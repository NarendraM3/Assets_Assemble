import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/common/PageHeader";
import { Card } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { notifications } from "@/data/mock";
import { cn } from "@/lib/utils";
import { Bell } from "lucide-react";

export const Route = createFileRoute("/_app/notifications")({
  component: () => {
    return (
      <>
        <PageHeader title="Notifications" description="Alerts, reminders, and mentions from across the platform."/>
        <Tabs defaultValue="all">
          <TabsList>
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="unread">Unread</TabsTrigger>
            <TabsTrigger value="mentions">Mentions</TabsTrigger>
          </TabsList>
          <TabsContent value="all">
            <Card className="divide-y">
              {notifications.map(n => (
                <div key={n.id} className={cn("p-4 flex items-start gap-3", n.unread && "bg-primary/5")}>
                  <div className={cn("h-9 w-9 rounded-md grid place-items-center shrink-0",
                    n.type === "info" && "bg-info/10 text-info",
                    n.type === "warning" && "bg-warning/10 text-warning",
                    n.type === "success" && "bg-success/10 text-success",
                    n.type === "danger" && "bg-destructive/10 text-destructive",
                  )}><Bell className="h-4 w-4"/></div>
                  <div className="flex-1"><div className="text-sm font-medium">{n.title}</div><div className="text-xs text-muted-foreground mt-0.5">{n.time}</div></div>
                  {n.unread && <div className="h-2 w-2 rounded-full bg-primary shrink-0 mt-2"/>}
                </div>
              ))}
            </Card>
          </TabsContent>
          <TabsContent value="unread">
            <Card className="divide-y">
              {notifications.filter(n=>n.unread).map(n => (
                <div key={n.id} className="p-4 bg-primary/5"><div className="text-sm font-medium">{n.title}</div><div className="text-xs text-muted-foreground mt-0.5">{n.time}</div></div>
              ))}
            </Card>
          </TabsContent>
          <TabsContent value="mentions">
            <Card className="p-10 text-center text-sm text-muted-foreground">No mentions yet.</Card>
          </TabsContent>
        </Tabs>
      </>
    );
  },
});
