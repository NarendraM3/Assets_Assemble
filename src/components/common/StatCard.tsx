import { motion } from "framer-motion";
import type { LucideIcon } from "lucide-react";
import { TrendingUp, TrendingDown } from "lucide-react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export function StatCard({
  label, value, icon: Icon, delta, tone = "default", index = 0,
}: {
  label: string;
  value: string | number;
  icon: LucideIcon;
  delta?: { value: string; up?: boolean };
  tone?: "default" | "primary" | "success" | "warning" | "danger" | "info";
  index?: number;
}) {
  const toneMap = {
    default: "bg-muted text-foreground",
    primary: "bg-primary/10 text-primary",
    success: "bg-success/10 text-success",
    warning: "bg-warning/10 text-warning",
    danger: "bg-destructive/10 text-destructive",
    info: "bg-info/10 text-info",
  };
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      className="h-full"
    >
      <Card className="p-5 h-full hover:shadow-md transition-shadow">
        <div className="flex items-start justify-between">
          <div>
            <div className="text-xs uppercase tracking-wider text-muted-foreground font-medium">{label}</div>
            <div className="text-2xl font-semibold mt-1.5">{value}</div>
            {delta && (
              <div className={cn(
                "text-xs mt-1 flex items-center gap-1",
                delta.up ? "text-success" : "text-destructive",
              )}>
                {delta.up ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                {delta.value}
              </div>
            )}
          </div>
          <div className={cn("h-10 w-10 rounded-md grid place-items-center", toneMap[tone])}>
            <Icon className="h-5 w-5" />
          </div>
        </div>
      </Card>
    </motion.div>
  );
}
