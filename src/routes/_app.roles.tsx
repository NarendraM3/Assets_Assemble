import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/common/PageHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { ROLES } from "@/data/mock";
import { Shield, Users, Wrench, Package, Plus } from "lucide-react";

const ICONS = { employee: Users, support: Wrench, asset_manager: Package, admin: Shield };
const PERMS = ["View Assets","Manage Assets","Assign Assets","Raise Tickets","Resolve Tickets","Manage Users","System Settings","View Reports","Manage Vendors"];

export const Route = createFileRoute("/_app/roles")({
  component: () => (
    <>
      <PageHeader title="Roles & Permissions" description="Fine-grained control across the application."
        actions={<Button><Plus className="h-4 w-4 mr-1"/>New Role</Button>}/>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {ROLES.map((r) => {
          const Icon = ICONS[r.id];
          return (
            <Card key={r.id} className="p-5">
              <div className="flex items-start gap-3">
                <div className="h-11 w-11 rounded-md bg-primary/10 text-primary grid place-items-center"><Icon className="h-5 w-5"/></div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <div className="font-semibold">{r.name}</div>
                    <Badge variant="secondary" className="text-[10px]">System Role</Badge>
                  </div>
                  <div className="text-sm text-muted-foreground">{r.description}</div>
                </div>
              </div>
              <div className="mt-4 pt-4 border-t">
                <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Permissions</div>
                <div className="grid grid-cols-2 gap-2">
                  {PERMS.map((p, i) => (
                    <label key={p} className="flex items-center gap-2 text-sm">
                      <Checkbox defaultChecked={
                        r.id === "admin" ||
                        (r.id === "support" && ["View Assets","Raise Tickets","Resolve Tickets","View Reports"].includes(p)) ||
                        (r.id === "asset_manager" && ["View Assets","Manage Assets","Assign Assets","Manage Vendors","View Reports"].includes(p)) ||
                        (r.id === "employee" && ["View Assets","Raise Tickets"].includes(p))
                      }/>
                      <span>{p}</span>
                    </label>
                  ))}
                </div>
              </div>
            </Card>
          );
        })}
      </div>
    </>
  ),
});
