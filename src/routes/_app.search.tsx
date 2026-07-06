import { createFileRoute, Link } from "@tanstack/react-router";
import { z } from "zod";
import { useMemo } from "react";
import { PageHeader } from "@/components/common/PageHeader";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { employees, assets, tickets } from "@/data/mock";
import { Users, Package, TicketIcon, Search as SearchIcon } from "lucide-react";

const searchSchema = z.object({ q: z.string().optional() });

export const Route = createFileRoute("/_app/search")({
  validateSearch: searchSchema,
  component: SearchPage,
});

function SearchPage() {
  const { q = "" } = Route.useSearch();
  const nav = Route.useNavigate();
  const term = q.toLowerCase();

  const empResults = useMemo(() => employees.filter(e => e.name.toLowerCase().includes(term) || e.id.toLowerCase().includes(term) || e.email.toLowerCase().includes(term)).slice(0, 8), [term]);
  const assetResults = useMemo(() => assets.filter(a => a.name.toLowerCase().includes(term) || a.id.toLowerCase().includes(term) || a.serial.toLowerCase().includes(term)).slice(0, 8), [term]);
  const ticketResults = useMemo(() => tickets.filter(t => t.title.toLowerCase().includes(term) || t.id.toLowerCase().includes(term)).slice(0, 8), [term]);

  return (
    <>
      <PageHeader title="Global Search" description="Instantly find employees, assets, and tickets across the platform."/>
      <div className="relative max-w-2xl mb-6">
        <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground"/>
        <Input
          value={q}
          onChange={(e) => nav({ search: { q: e.target.value }, replace: true })}
          className="pl-9 h-11"
          placeholder="Search employees, assets, tickets…"
          autoFocus
        />
      </div>
      {!term ? (
        <Card className="p-10 text-center text-sm text-muted-foreground">Enter a search term to see instant results.</Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <Card className="p-5">
            <div className="flex items-center gap-2 mb-3"><Users className="h-4 w-4 text-primary"/><span className="font-semibold text-sm">Employees</span><Badge variant="secondary">{empResults.length}</Badge></div>
            <div className="divide-y">
              {empResults.length === 0 && <div className="text-sm text-muted-foreground py-3">No results</div>}
              {empResults.map(e => (
                <div key={e.id} className="py-2.5 text-sm"><div className="font-medium">{e.name}</div><div className="text-xs text-muted-foreground">{e.id} • {e.email}</div></div>
              ))}
            </div>
          </Card>
          <Card className="p-5">
            <div className="flex items-center gap-2 mb-3"><Package className="h-4 w-4 text-primary"/><span className="font-semibold text-sm">Assets</span><Badge variant="secondary">{assetResults.length}</Badge></div>
            <div className="divide-y">
              {assetResults.length === 0 && <div className="text-sm text-muted-foreground py-3">No results</div>}
              {assetResults.map(a => (
                <Link key={a.id} to="/assets" className="block py-2.5 text-sm hover:bg-muted/50 -mx-1 px-1 rounded"><div className="font-medium">{a.name}</div><div className="text-xs text-muted-foreground">{a.id} • {a.serial}</div></Link>
              ))}
            </div>
          </Card>
          <Card className="p-5">
            <div className="flex items-center gap-2 mb-3"><TicketIcon className="h-4 w-4 text-primary"/><span className="font-semibold text-sm">Tickets</span><Badge variant="secondary">{ticketResults.length}</Badge></div>
            <div className="divide-y">
              {ticketResults.length === 0 && <div className="text-sm text-muted-foreground py-3">No results</div>}
              {ticketResults.map(t => (
                <Link key={t.id} to="/all-tickets" className="block py-2.5 text-sm hover:bg-muted/50 -mx-1 px-1 rounded"><div className="font-medium truncate">{t.title}</div><div className="text-xs text-muted-foreground">{t.id} • {t.status}</div></Link>
              ))}
            </div>
          </Card>
        </div>
      )}
    </>
  );
}
