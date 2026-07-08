import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { motion } from "framer-motion";
import { Boxes, Mail, Lock, ArrowRight } from "lucide-react";
import { useAuth } from "@/contexts/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/login")({
  head: () => ({ meta: [{ title: "Sign in — Acme ITSM" }] }),
  component: LoginPage,
});

const schema = z.object({
  email: z.string().trim().email("Enter a valid email"),
  password: z.string().min(6, "At least 6 characters"),
});
type FormV = z.infer<typeof schema>;

function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormV>({
    resolver: zodResolver(schema),
    defaultValues: { email: "", password: "" },
  });

  const onSubmit = async (v: FormV) => {
    try {
      await login(v.email, v.password);
      navigate({ to: "/dashboard" });
    } catch (e) {
      // toast error is already handled by login method in AuthContext
    }
  };

  return (
    <div className="min-h-screen grid lg:grid-cols-2 bg-muted/20">
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
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md space-y-6">
          <div className="lg:hidden flex items-center gap-2 mb-4">
            <div className="h-10 w-10 rounded-lg bg-primary grid place-items-center text-primary-foreground">
              <Boxes className="h-5 w-5" />
            </div>
            <div className="text-lg font-semibold">Acme ITSM</div>
          </div>
          
          <div>
            <h2 className="text-2xl font-bold tracking-tight text-foreground">Sign in to your workspace</h2>
            <p className="text-sm text-muted-foreground mt-1.5">Sign in with your enterprise credentials to access the platform.</p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="email">Work email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input id="email" type="email" placeholder="you@acmecorp.com" className="pl-9" {...register("email")} />
              </div>
              {errors.email && <div className="text-xs text-destructive mt-1">{errors.email.message}</div>}
            </div>
            
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Password</Label>
                <button type="button" className="text-xs text-primary hover:underline">Forgot?</button>
              </div>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input id="password" type="password" placeholder="••••••••" className="pl-9" {...register("password")} />
              </div>
              {errors.password && <div className="text-xs text-destructive mt-1">{errors.password.message}</div>}
            </div>

            <Button type="submit" className="w-full h-10 mt-2 font-medium" disabled={isSubmitting}>
              {isSubmitting ? "Signing in…" : (<>Sign in <ArrowRight className="h-4 w-4 ml-1" /></>)}
            </Button>
          </form>
        </motion.div>
      </div>
    </div>
  );
}
