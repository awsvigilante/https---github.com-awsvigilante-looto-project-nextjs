"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
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
import { Shield, Mail, Loader2, ArrowLeft, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    setIsLoading(true);

    try {
      const response = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to process request");
      }

      setIsSuccess(true);
      toast.success("Reset link sent!");
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setIsLoading(false);
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
                <Shield className="h-10 w-10" />
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

        <Card className="border-white/5 bg-zinc-900/50 shadow-2xl backdrop-blur-xl rounded-3xl overflow-hidden ring-1 ring-white/10 relative">
          <div className="absolute top-6 left-6 z-10">
            <button
              onClick={() => router.push("/login")}
              className="group flex items-center justify-center w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 border border-white/5 transition-all outline-none"
              title="Back to login"
            >
              <ArrowLeft className="w-4 h-4 text-zinc-400 group-hover:text-white transition-colors" />
            </button>
          </div>

          <CardHeader className="pb-8 pt-12 px-8 bg-zinc-950/20 border-b border-white/5 text-center">
            <CardTitle className="text-2xl font-black text-white tracking-tight">
              Reset Password
            </CardTitle>
            <CardDescription className="text-zinc-400 font-medium max-w-[280px] mx-auto mt-2 tracking-wide">
              {isSuccess 
                ? "Check your inbox for the reset magic link." 
                : "Enter your email address to receive a secure reset link."}
            </CardDescription>
          </CardHeader>
          
          <CardContent className="p-8">
            {isSuccess ? (
              <div className="flex flex-col items-center justify-center space-y-6 py-4 animate-in fade-in duration-500 slide-in-from-bottom-4">
                <div className="w-20 h-20 bg-emerald-500/10 rounded-full flex items-center justify-center ring-1 ring-emerald-500/20">
                  <CheckCircle2 className="w-10 h-10 text-emerald-400" />
                </div>
                <div className="text-center space-y-2">
                  <p className="text-zinc-300 font-medium">Link Sent to:</p>
                  <p className="text-white font-bold">{email}</p>
                </div>
                <Button
                  onClick={() => router.push("/login")}
                  className="w-full mt-4 h-14 rounded-2xl font-black text-xs uppercase tracking-[0.2em] bg-zinc-800 hover:bg-zinc-700 text-white shadow-xl active:scale-[0.98] transition-all"
                >
                  Return to Login
                </Button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-5 animate-in slide-in-from-bottom-4 duration-300">
                  <div className="space-y-2">
                    <Label
                      htmlFor="email"
                      className="text-[10px] font-black uppercase tracking-widest text-zinc-500 ml-1"
                    >
                      Registered Email
                    </Label>
                    <div className="relative group">
                      <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-600 group-focus-within:text-emerald-400 transition-colors" />
                      <Input
                        id="email"
                        type="email"
                        placeholder="name@company.com"
                        className="h-14 pl-12 bg-zinc-950/50 border-white/5 text-sm font-bold text-white focus:border-emerald-500 transition-all rounded-2xl outline-none ring-0 placeholder:text-zinc-700"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        disabled={isLoading}
                      />
                    </div>
                  </div>
                </div>

                <Button
                  type="submit"
                  className="w-full h-14 rounded-2xl font-black text-xs uppercase tracking-[0.2em] transition-all shadow-xl active:scale-[0.98] bg-emerald-500 hover:bg-emerald-400 text-zinc-900 shadow-emerald-500/20"
                  disabled={isLoading || !email}
                >
                  {isLoading ? (
                    <div className="flex items-center gap-3">
                      <Loader2 className="h-5 w-5 animate-spin" />
                      <span>Sending Link...</span>
                    </div>
                  ) : (
                    "Send Request"
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
