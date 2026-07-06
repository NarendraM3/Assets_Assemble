import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/common/PageHeader";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { knowledgeBase } from "@/data/mock";
import { useState, useMemo } from "react";
import { BookOpen, Search, Eye } from "lucide-react";

export const Route = createFileRoute("/_app/knowledge-base")({
  component: () => {
    const [q, setQ] = useState("");
    const filtered = useMemo(() => knowledgeBase.filter(a => a.title.toLowerCase().includes(q.toLowerCase())), [q]);
    return (
      <>
        <PageHeader title="Knowledge Base" description="Self-service articles curated by the IT team."/>
        <div className="relative max-w-lg mb-6">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground"/>
          <Input value={q} onChange={e=>setQ(e.target.value)} className="pl-9 h-10" placeholder="Search articles…"/>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(a => (
            <Card key={a.id} className="p-5 hover:shadow-md transition-shadow cursor-pointer">
              <div className="flex items-start gap-3">
                <div className="h-10 w-10 rounded-md bg-info/10 text-info grid place-items-center shrink-0"><BookOpen className="h-4 w-4"/></div>
                <div className="min-w-0">
                  <div className="font-medium text-sm">{a.title}</div>
                  <div className="text-xs text-muted-foreground mt-0.5">Updated {a.updatedAt}</div>
                </div>
              </div>
              <div className="mt-4 flex items-center justify-between">
                <Badge variant="secondary">{a.category}</Badge>
                <div className="text-xs text-muted-foreground flex items-center gap-1"><Eye className="h-3 w-3"/> {a.views.toLocaleString()}</div>
              </div>
            </Card>
          ))}
        </div>
      </>
    );
  },
});
