"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Shield, Lock, Loader2, ShieldCheck, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

function SetupPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) {
      toast.error("Invalid or missing setup token.");
      return;
    }
    if (password !== confirmPassword) {
      toast.error("Passwords do not match.");
      return;
    }
    if (password.length < 8) {
      toast.error("Password must be at least 8 characters long.");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/auth/setup-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to set password.");

      setIsSuccess(true);
      toast.success("Password updated successfully!");
      
      // Auto redirect after a short delay
      setTimeout(() => {
        router.push("/login");
      }, 2000);
      
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      suppressHydrationWarning
      className="flex min-h-screen items-center justify-center bg-zinc-950 px-4 py-12 font-sans selection:bg-emerald-500/30 selection:text-emerald-200"
    >
      <div className="w-full max-w-md animate-in fade-in zoom-in duration-500">
        <div className="text-center mb-10">
          <div className="flex justify-center mb-6">
            <div className="relative">
              <div className="absolute inset-0 bg-emerald-500/20 blur-2xl rounded-full"></div>
              <div className="relative rounded-2xl bg-gradient-to-br from-emerald-400 to-emerald-600 p-4 text-zinc-950 shadow-2xl shadow-emerald-500/20 ring-1 ring-white/10">
                <ShieldCheck className="h-10 w-10" />
              </div>
            </div>
          </div>
          <h1 className="text-4xl font-extrabold tracking-tighter text-white sm:text-5xl">
            Smart<span className="text-emerald-400">LOTO</span>
          </h1>
          <p className="mt-3 text-sm font-bold text-zinc-500 uppercase tracking-widest px-1">
            Accountability & Safety Portal
          </p>
        </div>

        <Card className="border-white/5 bg-zinc-900/50 shadow-2xl backdrop-blur-xl rounded-3xl overflow-hidden ring-1 ring-white/10">
          <CardHeader className="pb-8 pt-10 px-8 bg-zinc-950/20 border-b border-white/5">
            <CardTitle className="text-2xl font-black text-white tracking-tight text-center">
              Secure Your Account
            </CardTitle>
            <CardDescription className="text-zinc-400 font-medium text-center mt-2">
              Create a new password to securely access the portal.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-8">
            {isSuccess ? (
              <div className="flex flex-col items-center justify-center space-y-6 py-4 animate-in fade-in duration-500 zoom-in">
                <div className="w-20 h-20 bg-emerald-500/10 rounded-full flex items-center justify-center ring-1 ring-emerald-500/20">
                  <CheckCircle2 className="w-10 h-10 text-emerald-400" />
                </div>
                <div className="text-center space-y-2">
                  <p className="text-white font-bold text-xl">Password Updated</p>
                  <p className="text-zinc-400 font-medium">Redirecting to login...</p>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-5 animate-in slide-in-from-bottom-4 duration-300">
                  
                  <div className="space-y-2">
                    <Label
                      className="text-[10px] font-black uppercase tracking-widest text-zinc-500 ml-1"
                    >
                      New Password
                    </Label>
                    <div className="relative group">
                      <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-600 group-focus-within:text-emerald-400 transition-colors" />
                      <Input
                        type="password"
                        placeholder="••••••••"
                        className="h-14 pl-12 bg-zinc-950/50 border-white/5 text-sm font-bold text-white focus:border-emerald-500 transition-all rounded-2xl outline-none ring-0 placeholder:text-zinc-700"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        disabled={isSubmitting}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label
                      className="text-[10px] font-black uppercase tracking-widest text-zinc-500 ml-1"
                    >
                      Confirm Password
                    </Label>
                    <div className="relative group">
                      <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-600 group-focus-within:text-emerald-400 transition-colors" />
                      <Input
                        type="password"
                        placeholder="••••••••"
                        className="h-14 pl-12 bg-zinc-950/50 border-white/5 text-sm font-bold text-white focus:border-emerald-500 transition-all rounded-2xl outline-none ring-0 placeholder:text-zinc-700"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        required
                        disabled={isSubmitting}
                      />
                    </div>
                  </div>

                  {!token && (
                    <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl">
                      <p className="text-xs font-bold text-red-500 text-center uppercase tracking-wider">
                        SECURITY ERROR: Missing Auth Token
                      </p>
                      <p className="text-[10px] text-red-400/80 text-center mt-1">
                        Use the secure link from your email.
                      </p>
                    </div>
                  )}

                </div>

                <Button
                  type="submit"
                  className="w-full h-14 rounded-2xl font-black text-xs uppercase tracking-[0.2em] transition-all shadow-xl active:scale-[0.98] bg-emerald-500 hover:bg-emerald-400 text-zinc-900 shadow-emerald-500/20"
                  disabled={isSubmitting || !token}
                >
                  {isSubmitting ? (
                    <div className="flex items-center gap-3">
                      <Loader2 className="h-5 w-5 animate-spin" />
                      <span>Encrypting...</span>
                    </div>
                  ) : (
                    "Save Password"
                  )}
                </Button>
              </form>
            )}
          </CardContent>
          <CardFooter className="flex justify-center border-t border-white/5 py-6 bg-zinc-950/30">
            <p className="text-[10px] font-black uppercase tracking-widest text-zinc-600">
              System Protected by Safety Encryption
            </p>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}

export default function SetupPasswordPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-zinc-950">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
      </div>
    }>
      <SetupPasswordForm />
    </Suspense>
  );
}
