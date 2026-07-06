import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/common/PageHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DEPARTMENTS, employees } from "@/data/mock";
import { Building2, Users, Plus, MoreHorizontal } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/departments")({
  component: () => {
    const heads = ["Sarah Johnson","Michael Chen","Priya Sharma","David Rodriguez","Emma Wilson","Amelia Kumar"];
    return (
      <>
        <PageHeader title="Departments" description="Organizational hierarchy across the company."
          actions={<Button onClick={()=>toast.success("Department created")}><Plus className="h-4 w-4 mr-1"/>New Department</Button>}/>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {DEPARTMENTS.map((d, i) => {
            const count = employees.filter(e => e.department === d).length;
            return (
              <Card key={d} className="p-5 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between">
                  <div className="h-11 w-11 rounded-md bg-primary/10 text-primary grid place-items-center">
                    <Building2 className="h-5 w-5"/>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8"><MoreHorizontal className="h-4 w-4"/></Button></DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem>Edit</DropdownMenuItem>
                      <DropdownMenuItem>Archive</DropdownMenuItem>
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
