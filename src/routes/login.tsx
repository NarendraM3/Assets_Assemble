import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { motion } from "framer-motion";
import {
  ArrowRight,
  Boxes,
  Building2,
  Cpu,
  Database,
  HardDrive,
  Laptop,
  Lock,
  Mail,
  Monitor,
  RadioTower,
  Router,
  Server,
  ShieldCheck,
  Smartphone,
  Sparkles,
  Users,
  Warehouse,
} from "lucide-react";
import { useAuth } from "@/contexts/auth";
import type { Role } from "@/types/domain";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export const Route = createFileRoute("/login")({
  head: () => ({ meta: [{ title: "Sign in - Asset Management" }] }),
  component: LoginPage,
});

const schema = z.object({
  email: z.string().trim().min(1, "Enter a username or email"),
  password: z.string().min(1, "Enter your password"),
});

type FormV = z.infer<typeof schema>;

const ROLES: { id: Role; label: string }[] = [
  { id: "employee", label: "Employee" },
  { id: "lo_support", label: "LO Support" },
  { id: "asset_manager", label: "Manager" },
  { id: "admin", label: "Admin" },
];

const assetIcons = [
  { icon: Monitor, x: "8%", y: "20%", delay: 0, size: "h-5 w-5" },
  { icon: Laptop, x: "72%", y: "13%", delay: 1.2, size: "h-5 w-5" },
  { icon: Server, x: "15%", y: "59%", delay: 0.7, size: "h-6 w-6" },
  { icon: Smartphone, x: "81%", y: "63%", delay: 1.8, size: "h-5 w-5" },
  { icon: Database, x: "44%", y: "26%", delay: 2.1, size: "h-5 w-5" },
  { icon: Warehouse, x: "8%", y: "80%", delay: 2.8, size: "h-6 w-6" },
  { icon: Cpu, x: "53%", y: "82%", delay: 1.5, size: "h-5 w-5" },
  { icon: HardDrive, x: "89%", y: "38%", delay: 2.5, size: "h-5 w-5" },
  { icon: Router, x: "31%", y: "73%", delay: 0.4, size: "h-5 w-5" },
  { icon: RadioTower, x: "65%", y: "50%", delay: 3.1, size: "h-5 w-5" },
];

function Particles() {
  const particles = useMemo(
    () =>
      Array.from({ length: 54 }, (_, i) => ({
        id: i,
        x: `${(i * 37) % 100}%`,
        size: 2 + (i % 4),
        duration: 14 + (i % 8),
        delay: -((i * 0.7) % 12),
        drift: (i % 2 === 0 ? 1 : -1) * (20 + (i % 7) * 10),
      })),
    [],
  );

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {particles.map((particle) => (
        <motion.span
          key={particle.id}
          className="absolute bottom-[-4%] rounded-full bg-sky-300/60 shadow-[0_0_16px_rgba(56,189,248,0.55)]"
          style={{
            left: particle.x,
            width: particle.size,
            height: particle.size,
          }}
          animate={{
            y: ["0vh", "-112vh"],
            x: [0, particle.drift, particle.drift / 2],
            opacity: [0, 0.85, 0],
            scale: [0.8, 1.25, 0.4],
          }}
          transition={{
            duration: particle.duration,
            delay: particle.delay,
            repeat: Infinity,
            ease: "linear",
          }}
        />
      ))}
    </div>
  );
}

function MeshBackground() {
  return (
    <svg className="absolute inset-0 h-full w-full opacity-70" viewBox="0 0 900 900" fill="none">
      <defs>
        <linearGradient id="assetLine" x1="0" x2="1" y1="0" y2="1">
          <stop stopColor="#38BDF8" stopOpacity="0.7" />
          <stop offset="0.55" stopColor="#2563EB" stopOpacity="0.35" />
          <stop offset="1" stopColor="#38BDF8" stopOpacity="0.05" />
        </linearGradient>
        <filter id="assetGlow">
          <feGaussianBlur stdDeviation="4" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      {[
        "M30 180 C180 130 290 180 420 125 S690 70 840 170",
        "M70 540 C230 420 345 470 470 360 S685 280 850 405",
        "M40 700 C180 620 330 690 490 600 S735 520 875 640",
        "M150 80 L245 245 L430 170 L605 285 L790 220",
        "M120 780 L265 610 L455 710 L635 545 L805 665",
      ].map((path, index) => (
        <motion.path
          key={path}
          d={path}
          stroke="url(#assetLine)"
          strokeDasharray="8 18"
          strokeWidth={index < 3 ? 1.5 : 1}
          initial={{ pathLength: 0, opacity: 0 }}
          animate={{ pathLength: 1, opacity: [0.25, 0.75, 0.35] }}
          transition={{ duration: 5 + index, repeat: Infinity, repeatType: "mirror" }}
        />
      ))}
      {[
        [150, 80],
        [245, 245],
        [430, 170],
        [605, 285],
        [790, 220],
        [265, 610],
        [455, 710],
        [635, 545],
        [805, 665],
        [470, 360],
      ].map(([cx, cy], index) => (
        <motion.circle
          key={`${cx}-${cy}`}
          cx={cx}
          cy={cy}
          r={index % 3 === 0 ? 5 : 3.5}
          fill="#38BDF8"
          filter="url(#assetGlow)"
          animate={{ opacity: [0.25, 0.9, 0.3], scale: [0.8, 1.25, 0.8] }}
          transition={{ duration: 2.8, delay: index * 0.25, repeat: Infinity }}
        />
      ))}
    </svg>
  );
}

function DigitalGlobe() {
  return (
    <div className="pointer-events-none absolute right-[-120px] top-1/2 hidden h-[520px] w-[520px] -translate-y-1/2 lg:block">
      <motion.div
        className="absolute inset-0 rounded-full border border-sky-300/15 bg-[radial-gradient(circle_at_35%_35%,rgba(56,189,248,0.24),rgba(37,99,235,0.08)_42%,transparent_68%)] shadow-[0_0_90px_rgba(37,99,235,0.35)]"
        animate={{ rotate: 360 }}
        transition={{ duration: 80, repeat: Infinity, ease: "linear" }}
      >
        <div className="absolute inset-[9%] rounded-full border border-sky-300/10" />
        <div className="absolute inset-[20%] rounded-full border border-sky-300/10" />
        <div className="absolute left-1/2 top-0 h-full w-px -translate-x-1/2 bg-sky-200/10" />
        <div className="absolute left-0 top-1/2 h-px w-full -translate-y-1/2 bg-sky-200/10" />
        <div className="absolute left-[18%] top-[26%] h-2 w-2 rounded-full bg-sky-300 shadow-[0_0_22px_rgba(56,189,248,0.9)]" />
        <div className="absolute right-[24%] top-[42%] h-1.5 w-1.5 rounded-full bg-blue-300 shadow-[0_0_20px_rgba(37,99,235,0.9)]" />
        <div className="absolute bottom-[26%] left-[44%] h-2 w-2 rounded-full bg-cyan-200 shadow-[0_0_20px_rgba(56,189,248,0.9)]" />
      </motion.div>
      <motion.div
        className="absolute inset-[16%] rounded-full border border-dashed border-sky-300/20"
        animate={{ rotate: -360 }}
        transition={{ duration: 58, repeat: Infinity, ease: "linear" }}
      />
    </div>
  );
}

function FloatingAssets() {
  return (
    <div className="pointer-events-none absolute inset-0">
      {assetIcons.map((item) => {
        const Icon = item.icon;
        return (
          <motion.div
            key={`${item.x}-${item.y}`}
            className="absolute rounded-2xl border border-white/10 bg-white/[0.055] p-3 text-sky-200 shadow-[0_0_28px_rgba(56,189,248,0.16)] backdrop-blur-xl"
            style={{ left: item.x, top: item.y }}
            animate={{ y: [0, -12, 0], opacity: [0.35, 0.78, 0.35] }}
            transition={{ duration: 6, delay: item.delay, repeat: Infinity, ease: "easeInOut" }}
          >
            <Icon className={item.size} strokeWidth={1.5} />
          </motion.div>
        );
      })}
    </div>
  );
}

function LeftPanel() {
  return (
    <section className="relative min-h-[680px] overflow-hidden bg-[#020817] lg:min-h-screen">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_18%,rgba(56,189,248,0.2),transparent_30%),radial-gradient(circle_at_80%_25%,rgba(37,99,235,0.28),transparent_34%),linear-gradient(135deg,#071B3A_0%,#0B254F_48%,#102F67_100%)]" />
      <div className="absolute inset-0 opacity-[0.13] [background-image:linear-gradient(rgba(255,255,255,0.12)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.12)_1px,transparent_1px)] [background-size:42px_42px]" />
      <div className="absolute inset-0 bg-[linear-gradient(115deg,transparent_0%,rgba(56,189,248,0.08)_42%,transparent_72%)]" />
      <MeshBackground />
      <DigitalGlobe />
      <FloatingAssets />
      <Particles />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,transparent_18%,rgba(2,8,23,0.42)_76%)]" />

      <div className="relative z-10 flex min-h-[680px] flex-col justify-between px-6 py-8 sm:px-10 lg:min-h-screen lg:px-14 lg:py-12 xl:px-16">
        <motion.div
          initial={{ opacity: 0, y: -14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="flex items-center gap-4"
        >
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-sky-300/20 bg-white/10 text-sky-200 shadow-[0_0_34px_rgba(56,189,248,0.26)] backdrop-blur-xl">
            <Boxes className="h-6 w-6" />
          </div>
          <div>
            <div className="text-xl font-bold tracking-tight text-white">Asset Management</div>
            <div className="text-xs font-semibold uppercase tracking-[0.22em] text-sky-300/70">
              Enterprise Asset Platform
            </div>
          </div>
        </motion.div>

        <div className="max-w-3xl py-14 lg:py-0">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.65, delay: 0.12 }}
            className="mb-6 inline-flex items-center gap-2 rounded-full border border-sky-300/15 bg-white/[0.07] px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-sky-200 shadow-[0_0_30px_rgba(56,189,248,0.14)] backdrop-blur-xl"
          >
            <Sparkles className="h-3.5 w-3.5 text-sky-300" />
            Enterprise Asset Intelligence
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 26 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.2 }}
            className="max-w-3xl text-4xl font-bold leading-[1.04] tracking-tight text-white sm:text-5xl xl:text-6xl"
          >
            Manage every enterprise asset from one{" "}
            <span className="bg-gradient-to-r from-[#38BDF8] via-[#60A5FA] to-[#2563EB] bg-clip-text text-transparent">
              intelligent platform
            </span>
            .
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 22 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.65, delay: 0.32 }}
            className="mt-6 max-w-2xl text-base leading-8 text-slate-200/72"
          >
            Track IT assets, assign equipment, manage inventory, monitor lifecycle, handle support
            tickets, and gain complete visibility across your organization.
          </motion.p>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.65, delay: 0.42 }}
          className="flex items-center gap-3 text-sm text-slate-300/60"
        >
          <span className="flex items-center gap-1.5"><Boxes className="h-4 w-4 text-sky-300" /> Enterprise IT Asset Management</span>
        </motion.div>
      </div>
    </section>
  );
}

function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [role, setRole] = useState<Role>("employee");

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormV>({
    resolver: zodResolver(schema),
    defaultValues: { email: "", password: "" },
  });

  useEffect(() => {
    if (typeof window !== "undefined" && localStorage.getItem("itsm.token")) {
      navigate({ to: "/dashboard", replace: true });
    }
  }, [navigate]);

  const onSubmit = async (v: FormV) => {
    try {
      await login(v.email, v.password, role);
      navigate({ to: "/dashboard" });
    } catch {
      /* toast error is already handled by login method in AuthContext */
    }
  };

  return (
    <main className="min-h-screen bg-[#020817] font-sans text-slate-950">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.55 }}
        className="grid min-h-screen lg:grid-cols-[minmax(0,3fr)_minmax(400px,2fr)]"
      >
        <LeftPanel />

        <section className="relative flex min-h-[620px] items-center justify-center overflow-hidden bg-[radial-gradient(circle_at_18%_8%,rgba(56,189,248,0.18),transparent_26%),linear-gradient(145deg,#f8fbff_0%,#eef5ff_42%,#dceafe_100%)] px-5 py-10 sm:px-8 lg:min-h-screen">
          <div className="absolute inset-0 opacity-60 [background-image:linear-gradient(rgba(15,23,42,0.045)_1px,transparent_1px),linear-gradient(90deg,rgba(15,23,42,0.04)_1px,transparent_1px)] [background-size:44px_44px]" />
          <div className="absolute -right-28 top-12 h-72 w-72 rounded-full bg-sky-300/30 blur-3xl" />
          <div className="absolute -bottom-24 left-4 h-72 w-72 rounded-full bg-blue-500/18 blur-3xl" />

          <motion.div
            initial={{ opacity: 0, y: 28, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.62, delay: 0.16 }}
            className="relative w-full max-w-md"
          >
            <div className="absolute -inset-4 rounded-[2rem] bg-white/35 blur-2xl" />
            <div className="relative rounded-[2rem] border border-white/70 bg-white/78 p-6 shadow-[0_28px_90px_rgba(15,23,42,0.18)] backdrop-blur-2xl sm:p-8">
              <div className="mb-8 flex items-center gap-3 lg:hidden">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-[#2563EB] to-[#38BDF8] text-white shadow-lg shadow-blue-500/25">
                  <Boxes className="h-5 w-5" />
                </div>
                <div>
                  <div className="font-bold tracking-tight text-slate-950">Asset Management</div>
                  <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                    Enterprise Asset Platform
                  </div>
                </div>
              </div>

              <div className="mb-8">
                <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-blue-100 bg-blue-50/85 px-3 py-1.5 text-xs font-semibold text-blue-700">
                  <Building2 className="h-3.5 w-3.5" />
                  Enterprise Workspace
                </div>
                <h2 className="text-3xl font-bold tracking-tight text-slate-950">Welcome Back</h2>
                <p className="mt-3 text-sm leading-6 text-slate-500">
                  Sign in to access your enterprise asset management workspace.
                </p>
              </div>

              <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-sm font-semibold text-slate-700">
                    Work Email
                  </Label>
                  <div className="relative">
                    <Mail className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <Input
                      id="email"
                      type="email"
                      placeholder="you@company.com"
                      className="h-12 rounded-2xl border-slate-200 bg-white/86 pl-11 text-sm shadow-sm transition duration-300 placeholder:text-slate-400 focus-visible:border-blue-500 focus-visible:ring-4 focus-visible:ring-blue-500/12"
                      {...register("email")}
                    />
                  </div>
                  {errors.email && <p className="text-xs font-medium text-red-500">{errors.email.message}</p>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password" className="text-sm font-semibold text-slate-700">
                    Password
                  </Label>
                  <div className="relative">
                    <Lock className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <Input
                      id="password"
                      type="password"
                      placeholder="Enter your password"
                      className="h-12 rounded-2xl border-slate-200 bg-white/86 pl-11 text-sm shadow-sm transition duration-300 placeholder:text-slate-400 focus-visible:border-blue-500 focus-visible:ring-4 focus-visible:ring-blue-500/12"
                      {...register("password")}
                    />
                  </div>
                  {errors.password && (
                    <p className="text-xs font-medium text-red-500">{errors.password.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="role" className="text-sm font-semibold text-slate-700">
                    Login As
                  </Label>
                  <div className="relative">
                    <Users className="pointer-events-none absolute left-4 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <Select value={role} onValueChange={(v) => setRole(v as Role)}>
                      <SelectTrigger
                        id="role"
                        className="h-12 rounded-2xl border-slate-200 bg-white/86 pl-11 text-sm shadow-sm transition duration-300 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/12"
                      >
                        <SelectValue placeholder="Select role" />
                      </SelectTrigger>
                      <SelectContent className="rounded-xl border-slate-200 bg-white shadow-xl">
                        {ROLES.map((r) => (
                          <SelectItem key={r.id} value={r.id}>
                            {r.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="pt-2">
                  <Button
                    type="submit"
                    disabled={isSubmitting}
                    className="group relative h-13 w-full overflow-hidden rounded-2xl bg-gradient-to-r from-[#1E3A8A] via-[#2563EB] to-[#38BDF8] text-sm font-bold text-white shadow-[0_18px_42px_rgba(37,99,235,0.34)] transition duration-300 hover:-translate-y-0.5 hover:shadow-[0_22px_52px_rgba(37,99,235,0.42)]"
                  >
                    <span className="absolute inset-0 -translate-x-full bg-[linear-gradient(110deg,transparent,rgba(255,255,255,0.28),transparent)] transition duration-700 group-hover:translate-x-full" />
                    <span className="relative flex items-center justify-center gap-2">
                      {isSubmitting ? "Signing In..." : "Sign In"}
                      {!isSubmitting && <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" />}
                    </span>
                  </Button>
                </div>
              </form>

              <div className="mt-7 flex items-center justify-center gap-2 rounded-2xl border border-slate-200/70 bg-slate-50/75 px-4 py-3 text-xs font-semibold text-slate-500">
                <ShieldCheck className="h-4 w-4 text-blue-600" />
                Secure Authentication
              </div>
            </div>
          </motion.div>
        </section>
      </motion.div>
    </main>
  );
}
