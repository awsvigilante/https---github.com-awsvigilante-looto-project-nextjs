"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Shield, Lock, Mail, Loader2, HardHat, Building2 } from "lucide-react";
import { toast } from "sonner";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [lotoId, setLotoId] = useState("");
  const [userType, setUserType] = useState<"company" | "contractor">("company");
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const token = localStorage.getItem("token");
    const storedUser = localStorage.getItem("user");
    
    if (token && storedUser) {
      try {
        const parsed = JSON.parse(storedUser);
        router.push(parsed.role === "admin" ? "/admin" : "/");
      } catch {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
      }
    } else if (token || storedUser) {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
    }
  }, [router]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const body = userType === "contractor" 
        ? { lotoId, type: userType }
        : { email, password, type: userType };

      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Login failed");
      }

      localStorage.setItem("token", data.token);
      localStorage.setItem("user", JSON.stringify(data.user));

      toast.success(`Welcome back, ${data.user.name}!`);
      
      if (data.user.role === "admin") {
        router.push("/admin");
      } else if (data.user.type === "contractor" && data.user.taskId) {
        router.push(`/loto/${data.user.taskId}/contractor`);
      } else {
        router.push("/");
      }
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-950 px-4 py-12 font-sans selection:bg-emerald-500/30 selection:text-emerald-200">
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

        <Card className="border-white/5 bg-zinc-900/50 shadow-2xl backdrop-blur-xl rounded-3xl overflow-hidden ring-1 ring-white/10">
          <CardHeader className="pb-8 pt-10 px-8 bg-zinc-950/20 border-b border-white/5">
            <div className="flex items-center justify-between mb-2">
              <CardTitle className="text-2xl font-black text-white tracking-tight">Sign In</CardTitle>
              <div className="flex items-center gap-3 bg-zinc-950/50 p-1.5 rounded-full ring-1 ring-white/10 transition-all">
                <span className={`text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-full transition-all flex items-center gap-1.5 ${userType === 'company' ? 'bg-emerald-500 text-zinc-950' : 'text-zinc-500'}`}>
                  <Building2 className="w-3 h-3" /> Staff
                </span>
                <Switch
                  id="user-type-toggle"
                  checked={userType === "contractor"}
                  onCheckedChange={(checked) => setUserType(checked ? "contractor" : "company")}
                  className="data-[state=checked]:bg-blue-500 data-[state=unchecked]:bg-emerald-500"
                  aria-label="Toggle login mode"
                />
                <span className={`text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-full transition-all flex items-center gap-1.5 ${userType === 'contractor' ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/20' : 'text-zinc-500'}`}>
                  <HardHat className="w-3 h-3" /> Contractor
                </span>
              </div>
            </div>
            <CardDescription className="text-zinc-400 font-medium">
              Secure authentication for safety monitoring.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-8">
            <form onSubmit={handleLogin} className="space-y-6">
              {userType === "company" ? (
                <div className="space-y-5 animate-in slide-in-from-right-4 duration-300">
                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-[10px] font-black uppercase tracking-widest text-zinc-500 ml-1">Email Address</Label>
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
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between ml-1">
                      <Label htmlFor="password" title="password" className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Security Password</Label>
                    </div>
                    <div className="relative group">
                      <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-600 group-focus-within:text-emerald-400 transition-colors" />
                      <Input
                        id="password"
                        type="password"
                        placeholder="••••••••"
                        className="h-14 pl-12 bg-zinc-950/50 border-white/5 text-sm font-bold text-white focus:border-emerald-500 transition-all rounded-2xl outline-none ring-0 placeholder:text-zinc-700"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                      />
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-5 animate-in slide-in-from-left-4 duration-300">
                  <div className="space-y-4">
                    <Label htmlFor="lotoId" className="text-[10px] font-black uppercase tracking-widest text-zinc-500 ml-1">Active LOTO ID</Label>
                    <div className="relative group">
                      <Shield className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-600 group-focus-within:text-blue-400 transition-colors" />
                      <Input
                        id="lotoId"
                        placeholder="LOTO-2026-XXXX"
                        className="h-16 pl-12 bg-zinc-950/50 border-white/5 text-lg font-black text-white focus:border-blue-500 transition-all rounded-2xl outline-none ring-0 placeholder:text-zinc-700 uppercase tracking-wider"
                        value={lotoId}
                        onChange={(e) => setLotoId(e.target.value)}
                        required
                      />
                    </div>
                    <p className="text-[10px] text-zinc-500 font-medium px-1">
                      Enter the ID provided by your supervisor to access the crew tracking portal.
                    </p>
                  </div>
                </div>
              )}

              <Button
                type="submit"
                className={`w-full h-14 rounded-2xl font-black text-xs uppercase tracking-[0.2em] transition-all shadow-xl active:scale-[0.98] ${userType === 'company' ? 'bg-emerald-500 hover:bg-emerald-400 text-zinc-900 shadow-emerald-500/20' : 'bg-blue-600 hover:bg-blue-500 text-white shadow-blue-600/20'}`}
                disabled={isLoading}
              >
                {isLoading ? (
                  <div className="flex items-center gap-3">
                    <Loader2 className="h-5 w-5 animate-spin" />
                    <span>Verifying...</span>
                  </div>
                ) : (
                  "Initiate Session"
                )}
              </Button>
            </form>
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
