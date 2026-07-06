import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/common/PageHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useTheme } from "@/contexts/theme";
import { toast } from "sonner";
import { Moon, Sun, Bell, Globe, Save } from "lucide-react";

export const Route = createFileRoute("/_app/settings")({
  component: () => {
    const { theme, toggle } = useTheme();
    return (
      <>
        <PageHeader title="Application Settings" description="Configure global preferences and system defaults."
          actions={<Button onClick={()=>toast.success("Settings saved")}><Save className="h-4 w-4 mr-1"/>Save Changes</Button>}/>
        <Tabs defaultValue="general" className="w-full">
          <TabsList>
            <TabsTrigger value="general">General</TabsTrigger>
            <TabsTrigger value="appearance">Appearance</TabsTrigger>
            <TabsTrigger value="notifications">Notifications</TabsTrigger>
            <TabsTrigger value="security">Security</TabsTrigger>
          </TabsList>
          <TabsContent value="general">
            <Card className="p-6 space-y-5 max-w-2xl">
              <div className="grid grid-cols-2 gap-4">
                <div><Label>Organization Name</Label><Input className="mt-1.5" defaultValue="Acme Corporation"/></div>
                <div><Label>Timezone</Label>
                  <Select defaultValue="est"><SelectTrigger className="mt-1.5"><SelectValue/></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="est">Eastern Time (ET)</SelectItem>
                      <SelectItem value="pst">Pacific Time (PT)</SelectItem>
                      <SelectItem value="gmt">GMT</SelectItem>
                      <SelectItem value="ist">India Standard Time</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div><Label>Language</Label>
                  <Select defaultValue="en"><SelectTrigger className="mt-1.5"><Globe className="h-4 w-4 mr-2"/><SelectValue/></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="en">English</SelectItem>
                      <SelectItem value="es">Spanish</SelectItem>
                      <SelectItem value="de">German</SelectItem>
                      <SelectItem value="hi">Hindi</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div><Label>Date Format</Label>
                  <Select defaultValue="ymd"><SelectTrigger className="mt-1.5"><SelectValue/></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ymd">YYYY-MM-DD</SelectItem>
                      <SelectItem value="mdy">MM/DD/YYYY</SelectItem>
                      <SelectItem value="dmy">DD/MM/YYYY</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </Card>
          </TabsContent>
          <TabsContent value="appearance">
            <Card className="p-6 space-y-5 max-w-2xl">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium flex items-center gap-2">{theme === "dark" ? <Moon className="h-4 w-4"/> : <Sun className="h-4 w-4"/>}Theme</div>
                  <div className="text-xs text-muted-foreground">Toggle light or dark interface</div>
                </div>
                <Switch checked={theme === "dark"} onCheckedChange={toggle}/>
              </div>
              <div className="flex items-center justify-between">
                <div><div className="font-medium">Compact Mode</div><div className="text-xs text-muted-foreground">Reduce spacing in tables and lists</div></div>
                <Switch/>
              </div>
              <div className="flex items-center justify-between">
                <div><div className="font-medium">Animations</div><div className="text-xs text-muted-foreground">Enable page and component transitions</div></div>
                <Switch defaultChecked/>
              </div>
            </Card>
          </TabsContent>
          <TabsContent value="notifications">
            <Card className="p-6 space-y-5 max-w-2xl">
              {[
                { l: "Ticket Assignments", d: "Notify when a ticket is assigned to you" },
                { l: "SLA Warnings", d: "Alerts before a ticket breaches SLA" },
                { l: "Asset Warranty", d: "Reminders when warranty is expiring" },
                { l: "System Updates", d: "Platform announcements and releases" },
                { l: "Weekly Digest", d: "Summary of activity every Monday" },
              ].map((n, i) => (
                <div key={n.l} className="flex items-center justify-between">
                  <div><div className="font-medium flex items-center gap-2"><Bell className="h-4 w-4 text-muted-foreground"/>{n.l}</div><div className="text-xs text-muted-foreground">{n.d}</div></div>
                  <Switch defaultChecked={i < 3}/>
                </div>
              ))}
            </Card>
          </TabsContent>
          <TabsContent value="security">
            <Card className="p-6 space-y-5 max-w-2xl">
              <div className="flex items-center justify-between">
                <div><div className="font-medium">Multi-factor Authentication</div><div className="text-xs text-muted-foreground">Require MFA for sensitive actions</div></div>
                <Switch defaultChecked/>
              </div>
              <div className="flex items-center justify-between">
                <div><div className="font-medium">Session Timeout</div><div className="text-xs text-muted-foreground">Auto sign-out after inactivity</div></div>
                <Select defaultValue="30"><SelectTrigger className="w-36"><SelectValue/></SelectTrigger>
                  <SelectContent><SelectItem value="15">15 minutes</SelectItem><SelectItem value="30">30 minutes</SelectItem><SelectItem value="60">1 hour</SelectItem></SelectContent>
                </Select>
              </div>
            </Card>
          </TabsContent>
        </Tabs>
      </>
    );
  },
});
