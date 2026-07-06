import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { motion } from "framer-motion";
import { Boxes, Mail, Lock, ArrowRight, Shield, Users, Package, Wrench } from "lucide-react";
import { useAuth } from "@/contexts/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { ROLES } from "@/data/mock";
import type { Role } from "@/data/mock";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/login")({
  head: () => ({ meta: [{ title: "Sign in — Acme ITSM" }] }),
  component: LoginPage,
});

const schema = z.object({
  email: z.string().trim().email("Enter a valid email"),
  password: z.string().min(6, "At least 6 characters"),
});
type FormV = z.infer<typeof schema>;

const roleIcons = { employee: Users, support: Wrench, asset_manager: Package, admin: Shield };

function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [role, setRole] = useState<Role>("employee");
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormV>({
    resolver: zodResolver(schema),
    defaultValues: { email: "demo@acmecorp.com", password: "demo1234" },
  });

  const onSubmit = async (v: FormV) => {
    await new Promise((r) => setTimeout(r, 400));
    const name = v.email.split("@")[0].split(".").map((s) => s[0].toUpperCase() + s.slice(1)).join(" ");
    login(role, name);
    toast.success(`Welcome back, ${name}`);
    navigate({ to: "/dashboard" });
  };

  return (
    <div className="min-h-screen grid lg:grid-cols-2">
      {/* Left panel */}
      <div className="hidden lg:flex flex-col justify-between p-12 bg-gradient-to-br from-primary via-primary to-primary/70 text-primary-foreground relative overflow-hidden">
        <div className="absolute inset-0 opacity-10" style={{
          backgroundImage: "radial-gradient(circle at 20% 30%, white 1px, transparent 1px), radial-gradient(circle at 70% 60%, white 1px, transparent 1px)",
          backgroundSize: "40px 40px, 60px 60px",
        }} />
        <div className="relative flex items-center gap-2">
          <div className="h-10 w-10 rounded-lg bg-white/10 backdrop-blur grid place-items-center">
            <Boxes className="h-5 w-5" />
          </div>
          <div>
            <div className="text-lg font-semibold">Acme ITSM</div>
            <div className="text-xs opacity-70">Enterprise Platform</div>
          </div>
        </div>
        <div className="relative">
          <h1 className="text-4xl font-semibold leading-tight max-w-md">
            The unified control plane for IT operations.
          </h1>
          <p className="mt-4 text-primary-foreground/80 max-w-md">
            Manage assets, resolve tickets, and orchestrate the full service lifecycle from a single enterprise workspace.
          </p>
          <div className="mt-10 grid grid-cols-3 gap-4 max-w-md">
            {[
              { v: "12.4K", l: "Assets Tracked" },
              { v: "98.7%", l: "SLA Compliance" },
              { v: "24/7", l: "Support Coverage" },
            ].map((s) => (
              <div key={s.l}>
                <div className="text-2xl font-semibold">{s.v}</div>
                <div className="text-xs opacity-70">{s.l}</div>
              </div>
            ))}
          </div>
        </div>
        <div className="relative text-xs opacity-70">© 2026 Acme Corporation. Enterprise IT Suite.</div>
      </div>

      {/* Right form */}
      <div className="flex items-center justify-center p-6 md:p-12 bg-background">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md">
          <div className="lg:hidden flex items-center gap-2 mb-8">
            <div className="h-10 w-10 rounded-lg bg-primary grid place-items-center text-primary-foreground">
              <Boxes className="h-5 w-5" />
            </div>
            <div className="text-lg font-semibold">Acme ITSM</div>
          </div>
          <h2 className="text-2xl font-semibold">Sign in to your workspace</h2>
          <p className="text-sm text-muted-foreground mt-1">Choose your role to preview the experience.</p>

          <div className="grid grid-cols-2 gap-2 mt-6">
            {ROLES.map((r) => {
              const Icon = roleIcons[r.id];
              const active = role === r.id;
              return (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => setRole(r.id)}
                  className={cn(
                    "text-left p-3 rounded-md border transition-all",
                    active
                      ? "border-primary bg-primary/5 shadow-sm"
                      : "border-border hover:border-primary/40",
                  )}
                >
                  <Icon className={cn("h-4 w-4 mb-2", active ? "text-primary" : "text-muted-foreground")} />
                  <div className="text-sm font-medium">{r.name}</div>
                  <div className="text-xs text-muted-foreground line-clamp-1">{r.description}</div>
                </button>
              );
            })}
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="mt-6 space-y-4">
            <div>
              <Label htmlFor="email">Work email</Label>
              <div className="relative mt-1.5">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input id="email" type="email" className="pl-9" {...register("email")} />
              </div>
              {errors.email && <div className="text-xs text-destructive mt-1">{errors.email.message}</div>}
            </div>
            <div>
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Password</Label>
                <button type="button" className="text-xs text-primary hover:underline">Forgot?</button>
              </div>
              <div className="relative mt-1.5">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input id="password" type="password" className="pl-9" {...register("password")} />
              </div>
              {errors.password && <div className="text-xs text-destructive mt-1">{errors.password.message}</div>}
            </div>
            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? "Signing in…" : (<>Sign in <ArrowRight className="h-4 w-4 ml-1" /></>)}
            </Button>
          </form>

          <Card className="mt-6 p-3 bg-muted/50 border-dashed">
            <div className="text-xs text-muted-foreground">
              <span className="font-semibold text-foreground">Demo:</span> any email + password (6+ chars). Role selects the experience.
            </div>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}
