import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function PageHeader({
  title, description, actions, breadcrumbs,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
  breadcrumbs?: { label: string; to?: string }[];
}) {
  return (
    <div className="mb-6">
      {breadcrumbs && (
        <div className="text-xs text-muted-foreground mb-2 flex items-center gap-1">
          {breadcrumbs.map((b, i) => (
            <span key={i} className="flex items-center gap-1">
              {i > 0 && <span>/</span>}
              <span className={cn(i === breadcrumbs.length - 1 && "text-foreground")}>{b.label}</span>
            </span>
          ))}
        </div>
      )}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
          {description && <p className="text-sm text-muted-foreground mt-1">{description}</p>}
        </div>
        {actions && <div className="flex items-center gap-2">{actions}</div>}
      </div>
    </div>
  );
}
