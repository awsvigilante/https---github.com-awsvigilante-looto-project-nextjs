"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Shield, Lock, Mail, Loader2 } from "lucide-react";
import { toast } from "sonner";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [lotoId, setLotoId] = useState("");
  const [contractorNumber, setContractorNumber] = useState("");
  const [userType, setUserType] = useState("company");
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
      // Clear corrupt state if only one exists
      localStorage.removeItem("token");
      localStorage.removeItem("user");
    }
  }, [router]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const body = userType === "contractor" 
        ? { lotoId, contractorNumber, type: userType }
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

      // Store token (in a real app, use HTTP-only cookies)
      localStorage.setItem("token", data.token);
      localStorage.setItem("user", JSON.stringify(data.user));

      toast.success(`Welcome back, ${data.user.name}!`);
      
      // Redirect based on role
      if (data.user.role === "admin") {
        router.push("/admin");
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
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-12 dark:bg-slate-950">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <div className="flex justify-center">
            <div className="rounded-full bg-blue-600 p-3 text-white shadow-lg shadow-blue-500/30">
              <Shield className="h-8 w-8" />
            </div>
          </div>
          <h1 className="mt-6 text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
            Smart LOTO
          </h1>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
            Accountability System Login
          </p>
        </div>

        <Card className="border-none shadow-2xl">
          <CardHeader>
            <CardTitle>Sign In</CardTitle>
            <CardDescription>
              Choose your account type and enter your credentials.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="company" onValueChange={setUserType} className="mb-6 w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="company">Company</TabsTrigger>
                <TabsTrigger value="contractor">Contractor</TabsTrigger>
              </TabsList>
            </Tabs>

            <form onSubmit={handleLogin} className="space-y-4">
              {userType === "company" ? (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email Address</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                      <Input
                        id="email"
                        type="email"
                        placeholder="name@company.com"
                        className="pl-10"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="password">Password</Label>
                      <a href="#" className="text-xs text-blue-600 hover:underline">
                        Forgot password?
                      </a>
                    </div>
                    <div className="relative">
                      <Lock className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                      <Input
                        id="password"
                        type="password"
                        className="pl-10"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                      />
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="lotoId">LOTO ID</Label>
                    <div className="relative">
                      <Shield className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                      <Input
                        id="lotoId"
                        placeholder="LOTO-2026-XXXX"
                        className="pl-10"
                        value={lotoId}
                        onChange={(e) => setLotoId(e.target.value)}
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="contractorNumber">Contractor Number</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                      <Input
                        id="contractorNumber"
                        placeholder="CN-XXXXXX"
                        className="pl-10"
                        value={contractorNumber}
                        onChange={(e) => setContractorNumber(e.target.value)}
                        required
                      />
                    </div>
                  </div>
                </>
              )}

              <Button
                type="submit"
                className="w-full bg-blue-600 hover:bg-blue-700"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Authenticating...
                  </>
                ) : (
                  "Sign In"
                )}
              </Button>
            </form>
          </CardContent>
          <CardFooter className="flex justify-center border-t py-4">
            <p className="text-xs text-slate-500">
              Secured by Enterprise Auth Protocol
            </p>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
