import { Link, useRouterState } from "@tanstack/react-router";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronsLeft, ChevronsRight, Boxes } from "lucide-react";
import { NAV } from "@/lib/nav";
import { useAuth } from "@/contexts/auth";
import { cn } from "@/lib/utils";

export function Sidebar({ collapsed, setCollapsed }: { collapsed: boolean; setCollapsed: (v: boolean) => void }) {
  const { user } = useAuth();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  if (!user) return null;
  const groups = NAV[user.role];

  return (
    <motion.aside
      initial={false}
      animate={{ width: collapsed ? 68 : 248 }}
      transition={{ duration: 0.22, ease: "easeOut" }}
      className="hidden md:flex sticky top-0 h-screen shrink-0 flex-col border-r bg-sidebar text-sidebar-foreground"
    >
      <div className="h-14 flex items-center gap-2 px-3 border-b">
        <div className="h-8 w-8 rounded-md bg-primary text-primary-foreground grid place-items-center shrink-0">
          <Boxes className="h-4.5 w-4.5" size={18} />
        </div>
        {!collapsed && (
          <div className="min-w-0">
            <div className="text-sm font-semibold truncate">Acme ITSM</div>
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Enterprise</div>
          </div>
        )}
      </div>

      <nav className="flex-1 overflow-y-auto scrollbar-thin py-3">
        {groups.map((g) => (
          <div key={g.label} className="mb-4">
            {!collapsed && (
              <div className="px-4 mb-1 text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
                {g.label}
              </div>
            )}
            <ul className="space-y-0.5 px-2">
              {g.items.map((item) => {
                const active = pathname === item.to;
                const Icon = item.icon;
                return (
                  <li key={item.to}>
                    <Link
                      to={item.to}
                      className={cn(
                        "group flex items-center gap-3 rounded-md px-2.5 py-2 text-sm transition-colors relative",
                        active
                          ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                          : "hover:bg-sidebar-accent/60 text-sidebar-foreground/85",
                      )}
                    >
                      {active && (
                        <motion.span
                          layoutId="active-pill"
                          className="absolute left-0 top-1.5 bottom-1.5 w-0.5 bg-primary rounded-r"
                        />
                      )}
                      <Icon className="h-4 w-4 shrink-0" />
                      <AnimatePresence>
                        {!collapsed && (
                          <motion.span
                            initial={{ opacity: 0, x: -6 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0 }}
                            className="truncate"
                          >
                            {item.label}
                          </motion.span>
                        )}
                      </AnimatePresence>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      <button
        onClick={() => setCollapsed(!collapsed)}
        className="h-10 border-t flex items-center justify-center hover:bg-sidebar-accent transition-colors text-muted-foreground"
      >
        {collapsed ? <ChevronsRight className="h-4 w-4" /> : <ChevronsLeft className="h-4 w-4" />}
      </button>
    </motion.aside>
  );
}
