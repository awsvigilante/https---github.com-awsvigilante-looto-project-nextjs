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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  ShieldCheck,
  UserPlus,
  Loader2,
  LogOut,
  CheckCircle2,
  Factory,
  Construction,
  Trash2,
  CalendarClock,
} from "lucide-react";
import { toast } from "sonner";
import { format as timeagoFormat } from "timeago.js";

const COMPANY_ROLES = [
  { value: "operator", label: "Operator" },
  { value: "shift_engineer", label: "Shift Engineer" },
  { value: "supervisor", label: "Supervisor" },
  { value: "admin", label: "Admin" },
];

export default function AdminPage() {
  const router = useRouter();
  const [token, setToken] = useState("");
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Data States
  const [lotos, setLotos] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);

  // Add User Form States
  const [isAddUserOpen, setIsAddUserOpen] = useState(false);
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
      handleForceLogout();
      return;
    }

    try {
      const parsedUser = JSON.parse(storedUser);
      if (parsedUser.role !== "admin") {
        router.push("/");
        return;
      }
      setCurrentUser(parsedUser);
      setToken(storedToken);
      fetchDashboardData(storedToken);
    } catch {
      handleForceLogout();
    }
  }, [router]);

  const handleForceLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    router.push("/login");
  };

  const fetchDashboardData = async (authToken: string) => {
    setIsLoading(true);
    try {
      const [lotosRes, usersRes] = await Promise.all([
        fetch("/api/loto", {
          headers: { Authorization: `Bearer ${authToken}` },
        }),
        fetch("/api/admin/users", {
          headers: { Authorization: `Bearer ${authToken}` },
        }),
      ]);

      if (lotosRes.ok) {
        setLotos(await lotosRes.json());
      }
      if (usersRes.ok) {
        const usersData = await usersRes.json();
        setUsers(usersData.users || []);
      }
    } catch (error) {
      console.error("Dashboard data fetch error:", error);
      toast.error("Failed to load dashboard data");
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email) {
      toast.error("Name and email are required.");
      return;
    }
    if (type === "contractor" && (!lotoId || !contractorNumber)) {
      toast.error(
        "LOTO ID and Contractor Number required for contractor accounts.",
      );
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
        body: JSON.stringify({
          name,
          email,
          type,
          role,
          lotoId,
          contractorNumber,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create user");

      toast.success(`User ${name} created successfully! Link sent via email.`);

      // Reset form and close modal
      setName("");
      setEmail("");
      setLotoId("");
      setContractorNumber("");
      setType("company");
      setRole("operator");
      setIsAddUserOpen(false);

      // Refresh user list
      fetchDashboardData(token);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (
      !confirm(
        "Are you sure you want to delete this user? This action cannot be undone.",
      )
    )
      return;

    try {
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to delete user");

      toast.success("User deleted successfully");
      setUsers(users.filter((u) => u.id !== userId));
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-300 selection:bg-emerald-500/30">
      {/* Admin Header - Premium Sticky */}
      <header className="sticky top-0 z-50 backdrop-blur-xl bg-zinc-950/80 border-b border-white/5 px-6 py-4">
        <div className="mx-auto max-w-[1400px] flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-zinc-900 border border-white/5 flex items-center justify-center shadow-2xl">
              <ShieldCheck className="w-6 h-6 text-emerald-400" />
            </div>
            <div>
              <div className="flex items-center gap-2 mb-0.5">
                <h1 className="text-xl font-black text-white tracking-tight">
                  Admin Console
                </h1>
                <span className="px-2 py-0.5 rounded-lg bg-emerald-500/10 text-[8px] font-black text-emerald-400 uppercase tracking-widest border border-emerald-500/20">
                  System Authorized
                </span>
              </div>
              <p className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em]">
                System Overview & Management
              </p>
            </div>
          </div>

          <div className="flex items-center gap-5 justify-end">
            <div className="flex items-center gap-3 bg-zinc-900/50 border border-white/5 rounded-2xl p-1.5 pl-4 pr-1.5 shadow-xl">
              <div className="flex flex-col items-end mr-1">
                <span className="text-xs font-black text-white">
                  {currentUser?.name || "Admin"}
                </span>
                <span className="text-[9px] font-black text-zinc-500 uppercase tracking-widest">
                  Administrator
                </span>
              </div>
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center text-zinc-950 text-xs font-black ring-1 ring-white/10 uppercase">
                {(currentUser?.name || "A").charAt(0)}
              </div>
              <button
                onClick={handleForceLogout}
                className="group w-10 h-10 rounded-xl bg-zinc-950 border border-white/5 flex items-center justify-center text-zinc-500 hover:text-red-400 hover:bg-red-500/10 transition-all active:scale-95"
                title="Logout Session"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-10">
        <Tabs defaultValue="overview" className="space-y-10">
          <div className="flex justify-between items-center bg-zinc-900/40 p-1 rounded-2xl border border-white/5 max-w-fit shadow-xl">
            <TabsList className="bg-transparent border-none">
              <TabsTrigger
                value="overview"
                className="rounded-xl px-6 py-2 text-[10px] font-black uppercase tracking-widest text-zinc-500 hover:text-zinc-300 data-[state=active]:bg-emerald-500 data-[state=active]:text-zinc-950 transition-all"
              >
                LOTO Overview
              </TabsTrigger>
              <TabsTrigger
                value="users"
                className="rounded-xl px-6 py-2 text-[10px] font-black uppercase tracking-widest text-zinc-500 hover:text-zinc-300 data-[state=active]:bg-emerald-500 data-[state=active]:text-zinc-950 transition-all"
              >
                User Management
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent
            value="overview"
            className="mt-0 outline-none space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700"
          >
            <div className="bg-zinc-900/40 backdrop-blur-xl rounded-[2.5rem] border border-white/5 overflow-hidden ring-1 ring-white/10 shadow-2xl">
              <div className="p-8 border-b border-white/5 bg-zinc-950/50 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <h2 className="text-2xl font-black text-white tracking-tight flex items-center gap-3">
                    <Factory className="h-6 w-6 text-emerald-400" />
                    Ongoing Tasks
                  </h2>
                  <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mt-1">
                    Live Lockout/Tagout procedures tracking
                  </p>
                </div>
              </div>

              {isLoading ? (
                <div className="p-12 text-center">
                  <Loader2 className="h-8 w-8 animate-spin text-emerald-500 mx-auto" />
                </div>
              ) : lotos.length === 0 ? (
                <div className="p-20 text-center space-y-4">
                  <div className="w-20 h-20 rounded-3xl bg-zinc-950 flex items-center justify-center mx-auto border border-white/5 shadow-inner">
                    <CheckCircle2 className="h-10 w-10 text-zinc-800" />
                  </div>
                  <p className="text-xs font-black text-zinc-600 uppercase tracking-widest">
                    No active LOTO tasks detected.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-b border-white/5 hover:bg-transparent">
                        <TableHead className="py-5 px-8 text-[10px] font-black text-zinc-500 uppercase tracking-widest">
                          LOTO ID
                        </TableHead>
                        <TableHead className="py-5 px-8 text-[10px] font-black text-zinc-500 uppercase tracking-widest">
                          Facility
                        </TableHead>
                        <TableHead className="py-5 px-8 text-[10px] font-black text-zinc-500 uppercase tracking-widest">
                          Equipment
                        </TableHead>
                        <TableHead className="py-5 px-8 text-[10px] font-black text-zinc-500 uppercase tracking-widest">
                          Status
                        </TableHead>
                        <TableHead className="py-5 px-8 text-[10px] font-black text-zinc-500 uppercase tracking-widest">
                          Created
                        </TableHead>
                        <TableHead className="py-5 px-8 text-right text-[10px] font-black text-zinc-500 uppercase tracking-widest">
                          Action
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {lotos.map((loto) => (
                        <TableRow
                          key={loto.id}
                          className="border-b border-white/5 hover:bg-white/[0.02] transition-colors group"
                        >
                          <TableCell className="py-6 px-8 font-black text-white tracking-tight">
                            {loto.lotoId}
                          </TableCell>
                          <TableCell className="py-6 px-8 text-xs font-bold text-zinc-400 uppercase tracking-wider">
                            {loto.facility}
                          </TableCell>
                          <TableCell className="py-6 px-8 text-xs font-bold text-zinc-400 uppercase tracking-wider">
                            {loto.equipmentName}
                          </TableCell>
                          <TableCell className="py-6 px-8">
                            <span
                              className={`inline-flex items-center px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest border ${
                                loto.status === "Completed"
                                  ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20"
                                  : loto.status === "Active"
                                    ? "bg-blue-500/10 text-blue-400 border-blue-500/20"
                                    : "bg-amber-500/10 text-amber-500 border-amber-500/20"
                              }`}
                            >
                              {loto.status}
                            </span>
                          </TableCell>
                          <TableCell className="py-6 px-8">
                            <span className="flex items-center gap-2 text-[10px] font-bold text-zinc-500 uppercase tracking-widest">
                              <CalendarClock className="h-3.5 w-3.5 opacity-30" />
                              {timeagoFormat(loto.createdAt)}
                            </span>
                          </TableCell>
                          <TableCell className="py-6 px-8 text-right">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() =>
                                router.push(`/loto/${loto.lotoId}`)
                              }
                              className="rounded-xl px-4 py-2 text-[10px] font-black uppercase tracking-widest text-zinc-400 hover:text-white hover:bg-white/5 transition-all"
                            >
                              Details
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent
            value="users"
            className="mt-0 outline-none space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700"
          >
            <div className="bg-zinc-900/40 backdrop-blur-xl rounded-[2.5rem] border border-white/5 overflow-hidden ring-1 ring-white/10 shadow-2xl">
              <div className="p-8 border-b border-white/5 bg-zinc-950/50 flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                  <h2 className="text-2xl font-black text-white tracking-tight flex items-center gap-3">
                    <Construction className="h-6 w-6 text-emerald-400" />
                    Personnel Directory
                  </h2>
                  <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mt-1">
                    Manage system access and roles
                  </p>
                </div>

                <Dialog open={isAddUserOpen} onOpenChange={setIsAddUserOpen}>
                  <DialogTrigger asChild>
                    <Button className="bg-emerald-500 hover:bg-emerald-400 text-zinc-950 rounded-2xl h-12 px-6 font-black text-[10px] uppercase tracking-widest shadow-lg shadow-emerald-500/20 transition-all active:scale-95">
                      <UserPlus className="mr-2 h-4 w-4" />
                      Enroll Personnel
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-[425px] bg-zinc-900 border-white/5 rounded-[2.5rem] p-8">
                    <DialogHeader className="mb-6">
                      <DialogTitle className="text-2xl font-black text-white tracking-tight">
                        Enroll Member
                      </DialogTitle>
                      <DialogDescription className="text-xs font-bold text-zinc-500 uppercase tracking-widest mt-2 leading-relaxed">
                        Create a secure credential link for system onboarding.
                      </DialogDescription>
                    </DialogHeader>

                    <form onSubmit={handleAddUser} className="space-y-6">
                      <div className="space-y-2">
                        <Label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-1">
                          Account Category
                        </Label>
                        <Select value={type} onValueChange={setType}>
                          <SelectTrigger className="rounded-2xl bg-zinc-950 border-white/5 h-12 text-xs font-bold focus:ring-emerald-500/50">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="bg-zinc-900 border-white/5 rounded-xl">
                            <SelectItem
                              value="company"
                              className="text-xs font-bold hover:bg-emerald-500/10"
                            >
                              Company Internal
                            </SelectItem>
                            <SelectItem
                              value="contractor"
                              className="text-xs font-bold hover:bg-emerald-500/10"
                            >
                              External Contractor
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      {type === "company" && (
                        <div className="space-y-2">
                          <Label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-1">
                            Privilege Level
                          </Label>
                          <Select value={role} onValueChange={setRole}>
                            <SelectTrigger className="rounded-2xl bg-zinc-950 border-white/5 h-12 text-xs font-bold focus:ring-emerald-500/50">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="bg-zinc-900 border-white/5 rounded-xl">
                              {COMPANY_ROLES.map((r) => (
                                <SelectItem
                                  key={r.value}
                                  value={r.value}
                                  className="text-xs font-bold hover:bg-emerald-500/10"
                                >
                                  {r.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      )}

                      <div className="space-y-2">
                        <Label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-1">
                          Full Legal Name
                        </Label>
                        <Input
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          placeholder="e.g. Sarah Jenkins"
                          className="rounded-2xl bg-zinc-950 border-white/5 h-12 text-xs font-bold text-white focus:ring-emerald-500/50"
                          required
                        />
                      </div>

                      <div className="space-y-2">
                        <Label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-1">
                          Verified Email
                        </Label>
                        <Input
                          type="email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder="name@organization.com"
                          className="rounded-2xl bg-zinc-950 border-white/5 h-12 text-xs font-bold text-white focus:ring-emerald-500/50"
                          required
                        />
                      </div>

                      {type === "contractor" && (
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-1">
                              Active LOTO ID
                            </Label>
                            <Input
                              value={lotoId}
                              onChange={(e) => setLotoId(e.target.value)}
                              placeholder="e.g. 000789"
                              className="rounded-2xl bg-zinc-950 border-white/5 h-12 text-[10px] font-bold text-white focus:ring-emerald-500/50"
                              required
                            />
                          </div>
                          <div className="space-y-2">
                            <Label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-1">
                              CN Reference
                            </Label>
                            <Input
                              value={contractorNumber}
                              onChange={(e) =>
                                setContractorNumber(e.target.value)
                              }
                              placeholder="CN-001"
                              className="rounded-2xl bg-zinc-950 border-white/5 h-12 text-[10px] font-bold text-white focus:ring-emerald-500/50"
                              required
                            />
                          </div>
                        </div>
                      )}

                      <Button
                        type="submit"
                        className="w-full bg-emerald-500 hover:bg-emerald-400 text-zinc-950 rounded-2xl h-14 font-black text-[11px] uppercase tracking-[0.2em] shadow-lg shadow-emerald-500/20 transition-all active:scale-95 mt-4"
                        disabled={isSubmitting}
                      >
                        {isSubmitting ? (
                          <>
                            <Loader2 className="mr-3 h-4 w-4 animate-spin" />{" "}
                            Transmitting...
                          </>
                        ) : (
                          "Generate Credentials"
                        )}
                      </Button>
                    </form>
                  </DialogContent>
                </Dialog>
              </div>

              {isLoading ? (
                <div className="p-12 text-center">
                  <Loader2 className="h-8 w-8 animate-spin text-emerald-500 mx-auto" />
                </div>
              ) : users.length === 0 ? (
                <div className="p-20 text-center space-y-4">
                  <div className="w-20 h-20 rounded-3xl bg-zinc-950 flex items-center justify-center mx-auto border border-white/5 shadow-inner">
                    <UserPlus className="h-10 w-10 text-zinc-800" />
                  </div>
                  <p className="text-xs font-black text-zinc-600 uppercase tracking-widest">
                    Directory is currently empty.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-b border-white/5 hover:bg-transparent">
                        <TableHead className="py-5 px-8 text-[10px] font-black text-zinc-500 uppercase tracking-widest">
                          Name
                        </TableHead>
                        <TableHead className="py-5 px-8 text-[10px] font-black text-zinc-500 uppercase tracking-widest">
                          Contact / ID
                        </TableHead>
                        <TableHead className="py-5 px-8 text-[10px] font-black text-zinc-500 uppercase tracking-widest">
                          Type
                        </TableHead>
                        <TableHead className="py-5 px-8 text-[10px] font-black text-zinc-500 uppercase tracking-widest">
                          Role
                        </TableHead>
                        <TableHead className="py-5 px-8 text-right text-[10px] font-black text-zinc-500 uppercase tracking-widest">
                          Actions
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {users.map((u) => (
                        <TableRow
                          key={u.id}
                          className="border-b border-white/5 hover:bg-white/[0.02] transition-colors group"
                        >
                          <TableCell className="py-6 px-8 font-black text-white tracking-tight">
                            {u.name}
                          </TableCell>
                          <TableCell className="py-6 px-8 text-xs font-bold text-zinc-500">
                            {u.type === "company"
                              ? u.email
                              : `LOTO-${u.lotoId} / ${u.contractorNumber}`}
                          </TableCell>
                          <TableCell className="py-6 px-8">
                            <span
                              className={`inline-flex items-center px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-widest border ${
                                u.type === "company"
                                  ? "bg-purple-500/10 text-purple-400 border-purple-500/20"
                                  : "bg-amber-500/10 text-amber-500 border-amber-500/20"
                              }`}
                            >
                              {u.type}
                            </span>
                          </TableCell>
                          <TableCell className="py-6 px-8 text-xs font-black text-zinc-400 uppercase tracking-widest">
                            {u.role.replace("_", " ")}
                          </TableCell>
                          <TableCell className="py-6 px-8 text-right">
                            {currentUser?.userId !== u.id && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-10 w-10 text-zinc-600 hover:text-red-500 hover:bg-red-500/10 rounded-xl transition-all"
                                onClick={() => handleDeleteUser(u.id)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
