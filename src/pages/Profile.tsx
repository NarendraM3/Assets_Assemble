import { useState } from "react";
import { PageHeader } from "@/components/common/PageHeader";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { StatusBadge } from "@/components/common/StatusBadge";
import { Timeline } from "@/components/common/Timeline";
import { useAuth } from "@/contexts/auth";
import { useData } from "@/contexts/data";
import { getRoleLabel } from "@/lib/utils";
import { apiFetch } from "@/services/api";
import { toast } from "sonner";
import { Mail, Phone, MapPin, Building2, Edit, KeyRound } from "lucide-react";

export default function ProfilePage() {
  const { user } = useAuth();
  const { employees, assets, tickets } = useData();
  const profile = employees.find(e => e.uuid === user?.id || e.id === user?.id);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [passwordError, setPasswordError] = useState("");

  const myAssets = assets.filter(a => a.assignedTo === user?.display_id || a.assignedTo === user?.id).slice(0, 5);
  const myTickets = tickets.filter(t => t.createdBy === user?.name).slice(0, 5);

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError("");

    if (!currentPassword || !newPassword || !confirmPassword) {
      setPasswordError("All fields are required.");
      return;
    }

    if (newPassword.length < 8) {
      setPasswordError("New password must be at least 8 characters.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError("Passwords do not match.");
      return;
    }

    setIsChangingPassword(true);
    try {
      await apiFetch("/auth/change-password", {
        method: "POST",
        body: JSON.stringify({ oldPassword: currentPassword, newPassword }),
      });
      toast.success("Password changed successfully.");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err: any) {
      toast.error(err.message || "Failed to change password");
    } finally {
      setIsChangingPassword(false);
    }
  };

  return (
    <>
      <PageHeader title="My Profile" description="Personal information and activity overview."
        actions={<Button variant="outline"><Edit className="h-4 w-4 mr-1"/>Edit Profile</Button>}/>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="p-6 text-center">
          <Avatar className="h-24 w-24 mx-auto"><AvatarFallback className="bg-primary text-primary-foreground text-2xl">{user?.avatar}</AvatarFallback></Avatar>
          <div className="mt-4 font-semibold text-lg">{user?.name}</div>
          <div className="text-sm text-muted-foreground">{getRoleLabel(user?.role)}</div>
          <div className="mt-6 text-left space-y-3 text-sm">
            <div className="flex items-center gap-2"><Mail className="h-4 w-4 text-muted-foreground"/>{user?.email}</div>
            <div className="flex items-center gap-2"><Phone className="h-4 w-4 text-muted-foreground"/>{profile?.phone || "Not provided"}</div>
            <div className="flex items-center gap-2"><MapPin className="h-4 w-4 text-muted-foreground"/>{profile?.location || "Not assigned"}</div>
            <div className="flex items-center gap-2"><Building2 className="h-4 w-4 text-muted-foreground"/>{profile?.department || "Not assigned"}</div>
          </div>
        </Card>
        <Card className="p-6">
          <h3 className="font-semibold mb-4 flex items-center gap-2">
            <KeyRound className="h-4 w-4" />
            Change Password
          </h3>
          <form onSubmit={handleChangePassword} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="currentPassword">Current Password</Label>
              <Input
                id="currentPassword"
                type="password"
                placeholder="Enter current password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="newPassword">New Password</Label>
              <Input
                id="newPassword"
                type="password"
                placeholder="Enter new password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm New Password</Label>
              <Input
                id="confirmPassword"
                type="password"
                placeholder="Re-enter new password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
            </div>
            {passwordError && (
              <p className="text-xs text-destructive font-medium">{passwordError}</p>
            )}
            <Button type="submit" disabled={isChangingPassword} className="w-full">
              {isChangingPassword ? "Changing..." : "Change Password"}
            </Button>
          </form>
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
                      <div key={a.assetId} className="p-4 flex items-center justify-between">
                      <div>
                        <div className="font-medium text-sm">{a.assetName}</div>
                        <div className="text-xs text-muted-foreground">{a.assetId} • {a.serialNumber}</div>
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
