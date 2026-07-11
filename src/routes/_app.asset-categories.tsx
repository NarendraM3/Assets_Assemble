import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/common/PageHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Tags } from "lucide-react";
import { toast } from "sonner";
import { useData } from "@/contexts/data";
import { uniqueValues } from "@/lib/live-data";

function CategoryGrid({ items, count }: { items: string[]; count: (c: string) => number }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
      {items.map(c => (
        <Card key={c} className="p-4 hover:shadow-md transition-shadow">
          <div className="flex items-start justify-between">
            <div className="h-9 w-9 rounded-md bg-info/10 text-info grid place-items-center"><Tags className="h-4 w-4"/></div>
            <span className="text-xs font-medium text-muted-foreground">{count(c)}</span>
          </div>
          <div className="mt-3 font-medium text-sm">{c}</div>
          <div className="text-xs text-muted-foreground">Category</div>
        </Card>
      ))}
    </div>
  );
}

export const Route = createFileRoute("/_app/asset-categories")({
  component: () => {
    const { assets } = useData();
    const categories = uniqueValues(assets.map((asset) => asset.category));
    return (
      <>
        <PageHeader title="Asset Categories" description="Classification schema for the asset catalog."
          actions={<Button onClick={()=>toast.success("Category added")}><Plus className="h-4 w-4 mr-1"/>Add Category</Button>}/>
        {categories.length === 0 ? (
          <Card className="p-8 text-center text-sm text-muted-foreground">No asset categories found.</Card>
        ) : (
          <CategoryGrid items={categories} count={(c) => assets.filter(a => a.category === c).length}/>
        )}
      </>
    );
  },
});

export function TicketCategoriesInner() {
  const { tickets } = useData();
  const categories = uniqueValues(tickets.map((ticket) => ticket.category));
  return (
    <>
      <PageHeader title="Ticket Categories" description="Group and route tickets to the right team."
        actions={<Button onClick={()=>toast.success("Category added")}><Plus className="h-4 w-4 mr-1"/>Add Category</Button>}/>
      {categories.length === 0 ? (
        <Card className="p-8 text-center text-sm text-muted-foreground">No ticket categories found.</Card>
      ) : (
        <CategoryGrid items={categories} count={(c) => tickets.filter(t => t.category === c).length}/>
      )}
    </>
  );
}
