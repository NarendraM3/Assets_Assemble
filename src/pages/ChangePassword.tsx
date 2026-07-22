import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Lock, KeyRound, ArrowLeft, ShieldCheck, Building2, Boxes } from "lucide-react";
import { BASE_URL, removeToken } from "@/services/api";
import { useAuth } from "@/contexts/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function ChangePasswordPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  const validatePassword = (password: string): string | null => {
    if (password.length < 8) return "Password must be at least 8 characters.";
    if (!/[A-Z]/.test(password)) return "Password must contain an uppercase letter.";
    if (!/[a-z]/.test(password)) return "Password must contain a lowercase letter.";
    if (!/[0-9]/.test(password)) return "Password must contain a number.";
    if (!/[^A-Za-z0-9]/.test(password)) return "Password must contain a special character.";
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!currentPassword || !newPassword || !confirmPassword) {
      setError("All fields are required.");
      return;
    }

    const validationError = validatePassword(newPassword);
    if (validationError) {
      setError(validationError);
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    if (!user?.email) {
      setError("Session expired. Please login again.");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch(`${BASE_URL}/auth/change-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: user.email, oldPassword: currentPassword, newPassword }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || data.detail || "Failed to change password");
      }

      localStorage.removeItem("employee");
      removeToken();
      setSuccess(true);
    } catch (err: any) {
      setError(err.message || "Failed to change password");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (success) {
    return (
      <main className="min-h-screen bg-[#020817] font-sans flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-full max-w-md"
        >
          <div className="rounded-[2rem] border border-white/70 bg-white/78 p-8 shadow-[0_28px_90px_rgba(15,23,42,0.18)] backdrop-blur-2xl text-center">
            <div className="mx-auto mb-4 h-16 w-16 rounded-full bg-green-100 flex items-center justify-center">
              <ShieldCheck className="h-8 w-8 text-green-600" />
            </div>
            <h2 className="text-2xl font-bold text-slate-950 mb-2">Password changed successfully.</h2>
            <p className="text-sm text-slate-500 mb-6">Please login again.</p>
            <Button
              onClick={() => navigate("/login", { replace: true })}
              className="rounded-2xl bg-gradient-to-r from-[#1E3A8A] via-[#2563EB] to-[#38BDF8] text-white font-bold shadow-lg"
            >
              Go to Login
            </Button>
          </div>
        </motion.div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#020817] font-sans">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.55 }}
        className="grid min-h-screen lg:grid-cols-[minmax(0,3fr)_minmax(400px,2fr)]"
      >
        <section className="relative min-h-[680px] overflow-hidden bg-[#020817] lg:min-h-screen">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_18%,rgba(56,189,248,0.2),transparent_30%),radial-gradient(circle_at_80%_25%,rgba(37,99,235,0.28),transparent_34%),linear-gradient(135deg,#071B3A_0%,#0B254F_48%,#102F67_100%)]" />
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
                <KeyRound className="h-3.5 w-3.5 text-sky-300" />
                Update Your Password
              </motion.div>

              <motion.h1
                initial={{ opacity: 0, y: 26 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.7, delay: 0.2 }}
                className="max-w-3xl text-4xl font-bold leading-[1.04] tracking-tight text-white sm:text-5xl xl:text-6xl"
              >
                Set a new secure{" "}
                <span className="bg-gradient-to-r from-[#38BDF8] via-[#60A5FA] to-[#2563EB] bg-clip-text text-transparent">
                  password
                </span>
                .
              </motion.h1>

              <motion.p
                initial={{ opacity: 0, y: 22 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.65, delay: 0.32 }}
                className="mt-6 max-w-2xl text-base leading-8 text-slate-200/72"
              >
                For security reasons, you need to update your password before accessing the platform.
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
                <button
                  onClick={() => navigate("/login")}
                  className="mb-4 inline-flex items-center gap-1.5 text-xs font-semibold text-blue-600 hover:text-blue-700 transition-colors"
                >
                  <ArrowLeft className="h-3.5 w-3.5" />
                  Back to Login
                </button>
                <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-blue-100 bg-blue-50/85 px-3 py-1.5 text-xs font-semibold text-blue-700">
                  <KeyRound className="h-3.5 w-3.5" />
                  Change Password
                </div>
                <h2 className="text-3xl font-bold tracking-tight text-slate-950">Update Password</h2>
                <p className="mt-3 text-sm leading-6 text-slate-500">
                  Enter your old password and set a new one.
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="currentPassword" className="text-sm font-semibold text-slate-700">
                    Current Password
                  </Label>
                  <div className="relative">
                    <Lock className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <Input
                      id="currentPassword"
                      type="password"
                      placeholder="Enter current password"
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      className="h-12 rounded-2xl border-slate-200 bg-white/86 pl-11 text-sm shadow-sm transition duration-300 placeholder:text-slate-400 focus-visible:border-blue-500 focus-visible:ring-4 focus-visible:ring-blue-500/12"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="newPassword" className="text-sm font-semibold text-slate-700">
                    New Password
                  </Label>
                  <div className="relative">
                    <Lock className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <Input
                      id="newPassword"
                      type="password"
                      placeholder="Enter new password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="h-12 rounded-2xl border-slate-200 bg-white/86 pl-11 text-sm shadow-sm transition duration-300 placeholder:text-slate-400 focus-visible:border-blue-500 focus-visible:ring-4 focus-visible:ring-blue-500/12"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirmPassword" className="text-sm font-semibold text-slate-700">
                    Confirm New Password
                  </Label>
                  <div className="relative">
                    <Lock className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <Input
                      id="confirmPassword"
                      type="password"
                      placeholder="Re-enter new password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="h-12 rounded-2xl border-slate-200 bg-white/86 pl-11 text-sm shadow-sm transition duration-300 placeholder:text-slate-400 focus-visible:border-blue-500 focus-visible:ring-4 focus-visible:ring-blue-500/12"
                    />
                  </div>
                </div>

                {error && (
                  <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-600">
                    {error}
                  </div>
                )}

                <div className="pt-2">
                  <Button
                    type="submit"
                    disabled={isSubmitting}
                    className="group relative h-13 w-full overflow-hidden rounded-2xl bg-gradient-to-r from-[#1E3A8A] via-[#2563EB] to-[#38BDF8] text-sm font-bold text-white shadow-[0_18px_42px_rgba(37,99,235,0.34)] transition duration-300 hover:-translate-y-0.5 hover:shadow-[0_22px_52px_rgba(37,99,235,0.42)]"
                  >
                    <span className="absolute inset-0 -translate-x-full bg-[linear-gradient(110deg,transparent,rgba(255,255,255,0.28),transparent)] transition duration-700 group-hover:translate-x-full" />
                    <span className="relative flex items-center justify-center gap-2">
                      {isSubmitting ? "Updating..." : "Update Password"}
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
