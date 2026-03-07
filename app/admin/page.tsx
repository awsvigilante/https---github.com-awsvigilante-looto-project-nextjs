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
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Shield, UserPlus, Loader2, LogOut, CheckCircle2, Factory, Construction, Trash2, CalendarClock } from "lucide-react";
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
        fetch("/api/loto", { headers: { Authorization: `Bearer ${authToken}` } }),
        fetch("/api/admin/users", { headers: { Authorization: `Bearer ${authToken}` } }),
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

      toast.success(`User ${name} created successfully! Link sent via email.`);
      
      // Reset form and close modal
      setName(""); setEmail(""); setLotoId(""); setContractorNumber("");
      setType("company"); setRole("operator");
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
    if (!confirm("Are you sure you want to delete this user? This action cannot be undone.")) return;

    try {
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to delete user");

      toast.success("User deleted successfully");
      setUsers(users.filter(u => u.id !== userId));
    } catch (err: any) {
      toast.error(err.message);
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
            <p className="text-xs text-slate-500">System Overview & Management</p>
          </div>
        </div>
        <Button variant="ghost" size="sm" onClick={handleForceLogout} className="text-slate-500 gap-2">
          <LogOut className="h-4 w-4" />
          Logout
        </Button>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-8">
        <Tabs defaultValue="overview" className="space-y-6">
          <div className="flex justify-between items-center">
            <TabsList className="bg-slate-200/50 dark:bg-slate-800/50 p-1">
              <TabsTrigger value="overview" className="data-[state=active]:bg-white dark:data-[state=active]:bg-slate-900">
                LOTO Overview
              </TabsTrigger>
              <TabsTrigger value="users" className="data-[state=active]:bg-white dark:data-[state=active]:bg-slate-900">
                User Management
              </TabsTrigger>
            </TabsList>

            {/* Global Actions can go here if needed */}
          </div>

          <TabsContent value="overview" className="mt-0 outline-none">
            <div className="bg-white dark:bg-slate-900 rounded-xl border shadow-sm overflow-hidden">
              <div className="p-6 border-b border-slate-100 dark:border-slate-800">
                <h2 className="text-xl font-semibold flex items-center gap-2">
                  <Factory className="h-5 w-5 text-blue-600" />
                  Ongoing Tasks
                </h2>
                <p className="text-sm text-slate-500 mt-1">
                  A high-level view of all Lockout/Tagout procedures currently tracked in the system.
                </p>
              </div>
              
              {isLoading ? (
                <div className="p-8 text-center text-slate-500"><Loader2 className="h-6 w-6 animate-spin mx-auto" /></div>
              ) : lotos.length === 0 ? (
                <div className="p-12 text-center text-slate-500">
                  <CheckCircle2 className="h-12 w-12 mx-auto mb-3 text-slate-300" />
                  No LOTO tasks found in the system.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-slate-50 dark:bg-slate-800/50">
                        <TableHead>LOTO ID</TableHead>
                        <TableHead>Facility</TableHead>
                        <TableHead>Equipment</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Created</TableHead>
                        <TableHead className="text-right">Action</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {lotos.map((loto) => (
                        <TableRow key={loto.id}>
                          <TableCell className="font-medium text-slate-900 dark:text-slate-100">
                            {loto.lotoId}
                          </TableCell>
                          <TableCell>{loto.facility}</TableCell>
                          <TableCell>{loto.equipmentName}</TableCell>
                          <TableCell>
                            <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                              loto.status === 'Completed' ? 'bg-green-100 text-green-800' :
                              loto.status === 'Active' ? 'bg-blue-100 text-blue-800' :
                              'bg-amber-100 text-amber-800'
                            }`}>
                              {loto.status}
                            </span>
                          </TableCell>
                          <TableCell className="text-slate-500 text-sm">
                            <span className="flex items-center gap-1">
                              <CalendarClock className="h-3 w-3" />
                              {timeagoFormat(loto.createdAt)}
                            </span>
                          </TableCell>
                          <TableCell className="text-right">
                            <Button variant="ghost" size="sm" onClick={() => router.push(`/loto/${loto.lotoId}`)}>
                              View
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

          <TabsContent value="users" className="mt-0 outline-none">
            <div className="bg-white dark:bg-slate-900 rounded-xl border shadow-sm overflow-hidden">
              <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-start md:items-center flex-col md:flex-row gap-4">
                <div>
                  <h2 className="text-xl font-semibold flex items-center gap-2">
                    <Construction className="h-5 w-5 text-blue-600" />
                    Personnel Directory
                  </h2>
                  <p className="text-sm text-slate-500 mt-1">
                    Manage company staff and external contractors.
                  </p>
                </div>
                
                <Dialog open={isAddUserOpen} onOpenChange={setIsAddUserOpen}>
                  <DialogTrigger asChild>
                    <Button className="bg-blue-600 hover:bg-blue-700">
                      <UserPlus className="mr-2 h-4 w-4" />
                      Add New User
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                      <DialogTitle>Add New User</DialogTitle>
                      <DialogDescription>
                        Create a new account. An email will be sent automatically to set up their password.
                      </DialogDescription>
                    </DialogHeader>
                    
                    <form onSubmit={handleAddUser} className="space-y-4 mt-4">
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

                      <div className="space-y-2">
                        <Label>Full Name *</Label>
                        <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Sarah Jenkins" required />
                      </div>

                      <div className="space-y-2">
                        <Label>Email Address *</Label>
                        <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@company.com" required />
                      </div>

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

                      <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700" disabled={isSubmitting}>
                        {isSubmitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Sending Invite...</> : "Create & Send Invite"}
                      </Button>
                    </form>
                  </DialogContent>
                </Dialog>
              </div>

              {isLoading ? (
                <div className="p-8 text-center text-slate-500"><Loader2 className="h-6 w-6 animate-spin mx-auto" /></div>
              ) : users.length === 0 ? (
                <div className="p-12 text-center text-slate-500">
                  <UserPlus className="h-12 w-12 mx-auto mb-3 text-slate-300" />
                  No users found.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-slate-50 dark:bg-slate-800/50">
                        <TableHead>Name</TableHead>
                        <TableHead>Email / Ref</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Role</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {users.map((u) => (
                        <TableRow key={u.id}>
                          <TableCell className="font-medium text-slate-900 dark:text-slate-100">
                            {u.name}
                          </TableCell>
                          <TableCell className="text-slate-500">
                            {u.type === 'company' ? u.email : `${u.lotoId} / ${u.contractorNumber}`}
                          </TableCell>
                          <TableCell>
                            <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium capitalize ${
                              u.type === 'company' ? 'bg-purple-100 text-purple-800' : 'bg-orange-100 text-orange-800'
                            }`}>
                              {u.type}
                            </span>
                          </TableCell>
                          <TableCell className="capitalize text-slate-500">
                            {u.role.replace('_', ' ')}
                          </TableCell>
                          <TableCell className="text-right">
                            {currentUser?.userId !== u.id && (
                              <Button variant="ghost" size="icon" className="text-red-500 hover:text-red-700 hover:bg-red-50" onClick={() => handleDeleteUser(u.id)}>
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
