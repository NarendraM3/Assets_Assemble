import { Card } from "@/components/ui/card";
import type { ReactNode } from "react";

export function ChartCard({ title, description, action, children, className }: {
  title: string;
  description?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <Card className={"p-5 " + (className ?? "")}>
      <div className="flex items-start justify-between mb-4">
        <div>
          <div className="font-semibold text-sm">{title}</div>
          {description && <div className="text-xs text-muted-foreground mt-0.5">{description}</div>}
        </div>
        {action}
      </div>
      {children}
    </Card>
  );
}
