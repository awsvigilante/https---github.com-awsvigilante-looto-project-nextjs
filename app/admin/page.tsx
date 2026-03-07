"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
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
import { Shield, UserPlus, Loader2, LogOut } from "lucide-react";
import { toast } from "sonner";

const COMPANY_ROLES = [
  { value: "operator", label: "Operator" },
  { value: "shift_engineer", label: "Shift Engineer" },
  { value: "supervisor", label: "Supervisor" },
  { value: "admin", label: "Admin" },
];

export default function AdminPage() {
  const router = useRouter();
  const [token, setToken] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [type, setType] = useState("company");
  const [role, setRole] = useState("operator");
  const [lotoId, setLotoId] = useState("");
  const [contractorNumber, setContractorNumber] = useState("");

  useEffect(() => {
    const storedUser = localStorage.getItem("user");
    const storedToken = localStorage.getItem("token");

    if (!storedToken || !storedUser) {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      router.push("/login");
      return;
    }

    try {
      if (JSON.parse(storedUser).role !== "admin") {
        router.push("/");
        return;
      }
    } catch {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      router.push("/login");
      return;
    }

    setToken(storedToken);
  }, [router]);

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    router.push("/login");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email) {
      toast.error("Name and email are required.");
      return;
    }
    if (type === "contractor" && (!lotoId || !contractorNumber)) {
      toast.error("LOTO ID and Contractor Number required for contractor accounts.");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/admin/users", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ name, email, type, role, lotoId, contractorNumber }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create user");

      toast.success(`User ${name} created successfully! An email has been sent for password setup.`);
      setName(""); setEmail(""); 
      setLotoId(""); setContractorNumber("");
      setType("company"); setRole("operator");
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      {/* Admin Header */}
      <header className="sticky top-0 z-10 border-b bg-white dark:bg-slate-900 shadow-sm px-4 md:px-8 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="rounded-full bg-blue-600 p-2 text-white">
            <Shield className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-lg font-bold leading-none">Admin Console</h1>
            <p className="text-xs text-slate-500">User Management</p>
          </div>
        </div>
        <Button variant="ghost" size="sm" onClick={handleLogout} className="text-slate-500 gap-2">
          <LogOut className="h-4 w-4" />
          Logout
        </Button>
      </header>

      <main className="mx-auto max-w-xl px-4 py-10">
        <form
          onSubmit={handleSubmit}
          className="bg-white dark:bg-slate-900 border rounded-2xl shadow-sm p-8 space-y-6"
        >
          <div className="flex items-center gap-3 mb-2">
            <div className="rounded-full bg-blue-100 dark:bg-blue-900/30 p-2">
              <UserPlus className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <h2 className="font-bold text-slate-900 dark:text-white">Add New User</h2>
              <p className="text-xs text-slate-500">Create a new account. They will receive an email to set up their password.</p>
            </div>
          </div>

          {/* Account Type */}
          <div className="space-y-2">
            <Label>Account Type</Label>
            <Select value={type} onValueChange={setType}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="company">Company</SelectItem>
                <SelectItem value="contractor">Contractor</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Role — only for company */}
          {type === "company" && (
            <div className="space-y-2">
              <Label>Role</Label>
              <Select value={role} onValueChange={setRole}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {COMPANY_ROLES.map((r) => (
                    <SelectItem key={r.value} value={r.value}>
                      {r.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Common fields */}
          <div className="space-y-2">
            <Label>Full Name *</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Sarah Jenkins" required />
          </div>

          <div className="space-y-2">
            <Label>Email Address *</Label>
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@company.com" required />
          </div>

          {/* Contractor-specific fields */}
          {type === "contractor" && (
            <>
              <div className="space-y-2">
                <Label>LOTO ID *</Label>
                <Input value={lotoId} onChange={(e) => setLotoId(e.target.value)} placeholder="e.g. LOTO-2026-000789" required />
              </div>
              <div className="space-y-2">
                <Label>Contractor Number *</Label>
                <Input value={contractorNumber} onChange={(e) => setContractorNumber(e.target.value)} placeholder="e.g. CN-000001" required />
              </div>
            </>
          )}

          <Button
            type="submit"
            className="w-full bg-blue-600 hover:bg-blue-700"
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Creating...
              </>
            ) : (
              <>
                <UserPlus className="mr-2 h-4 w-4" />
                Create User
              </>
            )}
          </Button>
        </form>
      </main>
    </div>
  );
}
