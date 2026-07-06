import { useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { Bell, Search, Moon, Sun, Settings, LogOut, MessageSquare, User as UserIcon, Boxes } from "lucide-react";
import { useAuth } from "@/contexts/auth";
import { useTheme } from "@/contexts/theme";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { notifications } from "@/data/mock";
import { cn } from "@/lib/utils";

export function Topbar() {
  const { user, logout } = useAuth();
  const { theme, toggle } = useTheme();
  const navigate = useNavigate();
  const [q, setQ] = useState("");
  const unread = notifications.filter((n) => n.unread).length;

  return (
    <header className="sticky top-0 z-30 h-14 border-b bg-card/80 backdrop-blur flex items-center gap-3 px-4">
      <Link to="/dashboard" className="md:hidden flex items-center gap-2">
        <div className="h-7 w-7 rounded-md bg-primary text-primary-foreground grid place-items-center">
          <Boxes className="h-4 w-4" />
        </div>
      </Link>
      <form
        onSubmit={(e) => { e.preventDefault(); if (q) navigate({ to: "/search", search: { q } as never }); }}
        className="flex-1 max-w-xl relative"
      >
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search employees, assets, tickets…"
          className="pl-9 h-9 bg-muted/50 border-transparent focus-visible:bg-background"
        />
      </form>
      <div className="flex items-center gap-1">
        <Button variant="ghost" size="icon" onClick={toggle} aria-label="Toggle theme">
          {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </Button>
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="ghost" size="icon" className="relative" aria-label="Notifications">
              <Bell className="h-4 w-4" />
              {unread > 0 && (
                <span className="absolute top-1.5 right-1.5 h-4 min-w-4 px-1 rounded-full bg-destructive text-destructive-foreground text-[10px] font-semibold grid place-items-center">
                  {unread}
                </span>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent align="end" className="w-80 p-0">
            <div className="p-3 border-b flex items-center justify-between">
              <div className="font-semibold text-sm">Notifications</div>
              <Badge variant="secondary">{unread} new</Badge>
            </div>
            <div className="max-h-96 overflow-y-auto">
              {notifications.map((n) => (
                <div key={n.id} className={cn("p-3 border-b last:border-0 hover:bg-muted/50 cursor-pointer", n.unread && "bg-primary/5")}>
                  <div className="flex items-start gap-2">
                    <div className={cn(
                      "h-2 w-2 rounded-full mt-1.5 shrink-0",
                      n.type === "info" && "bg-info",
                      n.type === "warning" && "bg-warning",
                      n.type === "success" && "bg-success",
                      n.type === "danger" && "bg-destructive",
                    )} />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm">{n.title}</div>
                      <div className="text-xs text-muted-foreground mt-0.5">{n.time}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <Link to="/notifications" className="block text-center p-2 text-sm text-primary hover:bg-muted border-t">
              View all
            </Link>
          </PopoverContent>
        </Popover>
        <Button variant="ghost" size="icon" aria-label="Messages">
          <MessageSquare className="h-4 w-4" />
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center gap-2 hover:bg-accent rounded-md p-1 pr-2">
              <Avatar className="h-7 w-7">
                <AvatarFallback className="bg-primary text-primary-foreground text-xs">{user?.avatar}</AvatarFallback>
              </Avatar>
              <div className="text-left hidden sm:block">
                <div className="text-xs font-medium leading-tight">{user?.name}</div>
                <div className="text-[10px] text-muted-foreground capitalize">{user?.role.replace("_", " ")}</div>
              </div>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>{user?.email}</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild><Link to="/profile"><UserIcon className="h-4 w-4 mr-2" />Profile</Link></DropdownMenuItem>
            <DropdownMenuItem asChild><Link to="/settings"><Settings className="h-4 w-4 mr-2" />Settings</Link></DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => { logout(); navigate({ to: "/login" }); }} className="text-destructive">
              <LogOut className="h-4 w-4 mr-2" />Logout
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
