import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export interface TimelineItem {
  title: string;
  description?: string;
  time: string;
  icon?: ReactNode;
  tone?: "default" | "primary" | "success" | "warning" | "danger";
}

export function Timeline({ items }: { items: TimelineItem[] }) {
  return (
    <ol className="relative border-l pl-6 space-y-6 ml-2">
      {items.map((it, i) => (
        <li key={i} className="relative">
          <span
            className={cn(
              "absolute -left-[30px] top-0.5 h-4 w-4 rounded-full border-2 border-background grid place-items-center",
              it.tone === "success" && "bg-success",
              it.tone === "warning" && "bg-warning",
              it.tone === "danger" && "bg-destructive",
              it.tone === "primary" && "bg-primary",
              (!it.tone || it.tone === "default") && "bg-muted-foreground",
            )}
          />
          <div className="text-sm font-medium">{it.title}</div>
          {it.description && <div className="text-sm text-muted-foreground mt-0.5">{it.description}</div>}
          <div className="text-xs text-muted-foreground mt-1">{it.time}</div>
        </li>
      ))}
    </ol>
  );
}
