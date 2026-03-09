"use client";

import {
  Search,
  Plus,
  AlertTriangle,
  ShieldCheck,
  Clock,
  CheckCircle2,
  FileText,
  User,
  LogOut,
  Loader2,
  Eye,
  Edit,
  Trash2,
  Bell,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

interface LotoTask {
  id: string;
  lotoId: string;
  equipmentName: string;
  facility: string;
  lockBoxNumber: string;
  numIsolationPoints: number;
  status: string;
  createdAt: string;
  reasonForIsolation: string;
}

const STATUS_CONFIG: Record<
  string,
  { label: string; color: string; bg: string; textColor: string }
> = {
  Draft: {
    label: "Draft",
    color: "border-slate-200",
    bg: "bg-slate-100",
    textColor: "text-slate-600",
  },
  "Pending Approval": {
    label: "Pending",
    color: "border-amber-200",
    bg: "bg-amber-100",
    textColor: "text-amber-700",
  },
  Approved: {
    label: "Approved",
    color: "border-emerald-200",
    bg: "bg-emerald-100",
    textColor: "text-emerald-700",
  },
  "Isolation In Progress": {
    label: "In Progress",
    color: "border-blue-200",
    bg: "bg-blue-100",
    textColor: "text-blue-700",
  },
  "Isolation Complete": {
    label: "Awaiting Sign-off",
    color: "border-purple-200",
    bg: "bg-purple-100",
    textColor: "text-purple-700",
  },
  "Verification In Progress": {
    label: "Verifying",
    color: "border-purple-200",
    bg: "bg-purple-100",
    textColor: "text-purple-700",
  },
  "Isolation Verified / Active": {
    label: "Active (Safe)",
    color: "border-emerald-200",
    bg: "bg-emerald-100",
    textColor: "text-emerald-700",
  },
  Closed: {
    label: "Closed",
    color: "border-slate-200",
    bg: "bg-slate-100",
    textColor: "text-slate-600",
  },
};

function getStatusConfig(status: string) {
  return STATUS_CONFIG[status] || STATUS_CONFIG["Draft"];
}

function getTaskActionLabel(
  status: string,
  role: string,
  task?: any,
  userId?: string,
) {
  const sId =
    task?.supervisor?.id?.toString() || task?.supervisorId?.toString();
  const aId = task?.approver?.id?.toString() || task?.approverId?.toString();
  const uId = userId?.toString();

  const isSupervisorForTask = sId && uId && sId === uId;
  const isApproverForTask = aId && uId && aId === uId;

  // 1. Fully Closed tasks are always 'View' (history)
  if (status === "Closed") return "View";
  if (status === "Isolation Verified / Active") return "View";

  // Strict mapping: Only show action verb if the user can ACTUALLY take action on this status

  // Pending Approval -> Shift Engineer / Approver acts
  if (
    status === "Pending Approval" &&
    (role === "shift_engineer" || role === "admin" || isApproverForTask)
  ) {
    return "Approve";
  }

  // Approved -> Operator acts
  if (status === "Approved" && (role === "operator" || role === "admin")) {
    return "Isolate";
  }

  // Isolation In Progress -> Operator acts
  if (status === "Isolation In Progress" && role === "operator") {
    return "Continue";
  }

  // Isolation Complete or Verification In Progress -> Supervisor acts
  if (
    (status === "Isolation Complete" ||
      status === "Verification In Progress") &&
    (role === "supervisor" || role === "admin" || isSupervisorForTask)
  ) {
    return "Verify";
  }

  // Everyone else, or any other status (like Draft) just gets "View"
  return "View";
}

// Smart routing: send each user to exactly the right page for their stage
function getTaskRoute(
  task: LotoTask & { supervisorId?: string; primaryOperatorId?: string },
  role: string,
  userId?: string,
): string {
  const base = `/loto/${task.id}`;

  // Supervisor going to verify an in-progress isolation → dedicated verify page
  if (task.status === "Isolation In Progress" && role === "supervisor") {
    return `${base}/verify`;
  }

  // All other cases → main task page (which shows the correct panel for their role)
  return base;
}

export default function Dashboard() {
  const [user, setUser] = useState<any>(null);
  const [token, setToken] = useState("");
  const [tasks, setTasks] = useState<LotoTask[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const router = useRouter();

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
      const parsed = JSON.parse(storedUser);
      if (parsed.role === "admin") {
        router.push("/admin");
        return;
      }
      setUser(parsed);
      setToken(storedToken);
    } catch {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      router.push("/login");
    }
  }, [router]);

  useEffect(() => {
    if (!token) return;
    setIsLoading(true);
    fetch("/api/loto", {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    })
      .then((r) => r.json())
      .then((data) => setTasks(Array.isArray(data) ? data : []))
      .catch(() => setTasks([]))
      .finally(() => setIsLoading(false));
  }, [token]);

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    router.push("/login");
  };

  if (!user) return null;

  const filtered = tasks.filter(
    (t) =>
      t.lotoId.toLowerCase().includes(search.toLowerCase()) ||
      t.equipmentName.toLowerCase().includes(search.toLowerCase()),
  );

  const activeTasksCount = tasks.filter(
    (t) => t.status === "Isolation Verified / Active",
  ).length;
  const pendingApprovalsCount = tasks.filter(
    (t) => t.status === "Pending Approval",
  ).length;
  const inProgressCount = tasks.filter((t) =>
    ["Isolation In Progress", "Verification In Progress"].includes(t.status),
  ).length;
  const closedTasksCount = tasks.filter((t) => t.status === "Closed").length;

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-300 selection:bg-emerald-500/30 font-sans">
      {/* Universal Premium Header */}
      <header className="sticky top-0 z-50 backdrop-blur-xl bg-zinc-950/80 border-b border-white/5 px-6 py-4">
        <div className="mx-auto max-w-[1400px] flex items-center justify-between gap-6">
          <div className="flex items-center gap-4 w-64">
            <div className="w-12 h-12 rounded-2xl bg-zinc-900 border border-white/5 flex items-center justify-center shadow-2xl">
              <ShieldCheck className="w-6 h-6 text-emerald-400" />
            </div>
            <div>
              <h1 className="text-xl font-black text-white tracking-tight">
                Smart LOTO
              </h1>
              <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mt-0.5">
                Safety & Control
              </p>
            </div>
          </div>

          <div className="flex-1 flex justify-center max-w-2xl">
            <div className="relative w-full max-w-lg group">
              <Search className="absolute left-5 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500 group-focus-within:text-emerald-400 transition-colors" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search resources, LOTO IDs..."
                className="w-full rounded-2xl border border-white/5 bg-zinc-900/50 py-3 pl-12 pr-4 text-xs font-bold text-zinc-200 placeholder:text-zinc-600 focus:border-emerald-500/30 focus:outline-none focus:ring-4 focus:ring-emerald-500/5 transition-all shadow-inner"
              />
            </div>
          </div>

          <div className="flex items-center gap-5 w-64 justify-end">
            <button className="relative p-2 text-zinc-500 hover:text-emerald-400 transition-all hover:bg-white/5 rounded-xl group">
              <Bell className="h-5 w-5" />
              <span className="absolute top-2 right-2 h-2 w-2 rounded-full bg-red-500 border-2 border-zinc-950 animate-pulse"></span>
            </button>

            <div className="h-8 w-px bg-white/5"></div>

            <div className="flex items-center gap-3 bg-zinc-900/50 border border-white/5 rounded-2xl p-1.5 pl-4 pr-1.5 shadow-xl">
              <div className="flex flex-col items-end mr-1">
                <span className="text-xs font-black text-white">
                  {user.name}
                </span>
                <span className="text-[9px] font-black text-zinc-500 uppercase tracking-widest">
                  {user.role?.replace("_", " ")}
                </span>
              </div>
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center text-zinc-950 text-xs font-black ring-1 ring-white/10 uppercase">
                {user.name.charAt(0)}
              </div>
              <button
                onClick={handleLogout}
                className="group w-10 h-10 rounded-xl bg-zinc-950 border border-white/5 flex items-center justify-center text-zinc-500 hover:text-red-400 hover:bg-red-500/10 transition-all active:scale-95"
                title="Logout Session"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[1400px] px-6 py-10">
        {/* Page Header */}
        <div className="mb-12 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <h2 className="text-4xl font-black text-white tracking-tight mb-2">
              Good Morning, {user.name.split(" ")[0]}
            </h2>
            <p className="text-xs font-black text-zinc-500 uppercase tracking-[0.2em]">
              Operational Oversight Dashboard
            </p>
          </div>

          {["operator", "shift_engineer", "supervisor"].includes(user.role) && (
            <div className="flex items-center gap-4">
              <button className="flex items-center gap-2 rounded-2xl border border-white/5 bg-zinc-900 px-5 py-3 text-[10px] font-black text-zinc-400 uppercase tracking-widest hover:border-emerald-500/30 hover:text-white transition-all">
                <FileText className="h-4 w-4" />
                Export Data
              </button>
              <Link
                href="/loto/create"
                className="flex items-center gap-2 rounded-2xl bg-emerald-500 px-6 py-3 text-[10px] font-black text-zinc-950 uppercase tracking-[0.2em] hover:bg-emerald-400 shadow-lg shadow-emerald-500/20 transition-all active:scale-95"
              >
                <Plus className="h-4 w-4" />
                Create New LOTO
              </Link>
            </div>
          )}
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          {[
            {
              label: "Active Points",
              value: isLoading ? "-" : activeTasksCount,
              icon: ShieldCheck,
              color: "text-emerald-400",
              bg: "bg-emerald-500/10",
            },
            {
              label: "Verification",
              value: isLoading ? "-" : inProgressCount,
              icon: Clock,
              color: "text-amber-400",
              bg: "bg-amber-500/10",
            },
            {
              label: "Pending Sign-off",
              value: isLoading ? "-" : pendingApprovalsCount,
              icon: ShieldCheck,
              color: "text-blue-400",
              bg: "bg-blue-500/10",
            },
            {
              label: "Archived",
              value: isLoading ? "-" : closedTasksCount,
              icon: CheckCircle2,
              color: "text-zinc-500",
              bg: "bg-zinc-500/10",
            },
          ].map((stat, i) => (
            <div
              key={i}
              className="group relative rounded-[2rem] bg-zinc-900/50 p-8 border border-white/5 hover:border-white/10 transition-all shadow-xl overflow-hidden ring-1 ring-white/10"
            >
              <div className="relative z-10 flex items-center gap-6">
                <div
                  className={`flex h-16 w-16 items-center justify-center rounded-2xl ${stat.bg} ${stat.color} shadow-lg ring-1 ring-white/10 group-hover:scale-110 transition-transform duration-500`}
                >
                  <stat.icon className="h-7 w-7" />
                </div>
                <div>
                  <p className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em] mb-1">
                    {stat.label}
                  </p>
                  <h3 className="text-3xl font-black text-white tracking-tight">
                    {stat.value}
                  </h3>
                </div>
              </div>
              <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-white/5 to-transparent rounded-full -mr-16 -mt-16 blur-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
          {/* Active Tasks Table (Main Area) */}
          <div className="lg:col-span-2 space-y-8 animate-in fade-in slide-in-from-bottom-6 duration-700">
            <div className="rounded-[2.5rem] bg-zinc-900/40 backdrop-blur-xl border border-white/5 shadow-2xl overflow-hidden ring-1 ring-white/10">
              <div className="p-8 border-b border-white/5 bg-zinc-950/50 flex items-center justify-between">
                <div>
                  <h3 className="text-2xl font-black text-white tracking-tight">
                    Personnel Assignments
                  </h3>
                  <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mt-1">
                    Real-time isolation point tracking
                  </p>
                </div>
                <div className="bg-zinc-950/50 border border-white/5 rounded-xl p-1">
                  <select className="bg-transparent border-none text-[10px] font-extrabold text-zinc-400 px-4 py-2 outline-none uppercase tracking-widest cursor-pointer hover:text-white transition-colors">
                    <option className="bg-zinc-900">Current Status</option>
                    <option className="bg-zinc-900">Active Only</option>
                  </select>
                </div>
              </div>

              {isLoading ? (
                <div className="p-20 text-center">
                  <Loader2 className="h-8 w-8 animate-spin text-emerald-500 mx-auto" />
                </div>
              ) : filtered.length === 0 ? (
                <div className="p-20 text-center space-y-4 opacity-50">
                  <div className="w-20 h-20 rounded-3xl bg-zinc-950 flex items-center justify-center mx-auto border border-white/5">
                    <FileText className="h-8 w-8 text-zinc-800" />
                  </div>
                  <p className="text-xs font-black uppercase tracking-widest">
                    Clear Authorization Log
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="border-b border-white/5 bg-white/[0.02]">
                        <th className="py-5 px-8 text-[10px] font-black text-zinc-500 uppercase tracking-widest">
                          Equipment
                        </th>
                        <th className="py-5 px-8 text-[10px] font-black text-zinc-500 uppercase tracking-widest">
                          Identity / Location
                        </th>
                        <th className="py-5 px-8 text-[10px] font-black text-zinc-500 uppercase tracking-widest">
                          Purpose
                        </th>
                        <th className="py-5 px-8 text-[10px] font-black text-zinc-500 uppercase tracking-widest">
                          Verification
                        </th>
                        <th className="py-5 px-8 text-right text-[10px] font-black text-zinc-500 uppercase tracking-widest">
                          Action
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {filtered.map((task) => {
                        const actionLabel = getTaskActionLabel(
                          task.status,
                          user.role,
                          task as any,
                          user.id,
                        );
                        const taskRoute = getTaskRoute(
                          task as any,
                          user.role,
                          user.id,
                        );
                        return (
                          <tr
                            key={task.id}
                            className="hover:bg-white/[0.03] transition-colors group"
                          >
                            <td className="py-6 px-8">
                              <div className="font-black text-white text-base tracking-tight mb-1">
                                {task.equipmentName}
                              </div>
                              <div className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">
                                {new Date(task.createdAt).toLocaleDateString(
                                  undefined,
                                  {
                                    month: "short",
                                    day: "numeric",
                                    year: "numeric",
                                  },
                                )}
                              </div>
                            </td>
                            <td className="py-6 px-8">
                              <div className="font-black text-zinc-300 tracking-tight mb-1">
                                {task.lotoId}
                              </div>
                              <div className="text-[10px] font-black text-emerald-500/80 uppercase tracking-widest">
                                {task.facility}
                              </div>
                            </td>
                            <td className="py-6 px-8 max-w-[200px]">
                              <div className="truncate font-bold text-zinc-400 text-xs leading-relaxed">
                                {task.reasonForIsolation}
                              </div>
                            </td>
                            <td className="py-6 px-8">
                              <span
                                className={`inline-flex items-center rounded-lg px-3 py-1.5 text-[9px] font-black uppercase tracking-widest border transition-all duration-500 ${
                                  task.status === "Isolation Verified / Active"
                                    ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                                    : task.status === "Pending Approval"
                                      ? "bg-amber-500/10 text-amber-500 border-amber-500/20"
                                      : task.status.includes("Progress")
                                        ? "bg-blue-500/10 text-blue-400 border-blue-500/20"
                                        : "bg-zinc-800 text-zinc-500 border-white/5"
                                }`}
                              >
                                {task.status ===
                                  "Isolation Verified / Active" && (
                                  <ShieldCheck className="mr-2 h-3 w-3" />
                                )}
                                {task.status}
                              </span>
                            </td>
                            <td className="py-6 px-8 text-right">
                              <div className="flex justify-end gap-3 translate-x-2 group-hover:translate-x-0 transition-transform">
                                <button
                                  onClick={() =>
                                    router.push(`/loto/${task.id}`)
                                  }
                                  className="h-10 w-10 flex items-center justify-center rounded-xl bg-zinc-950 border border-white/5 text-zinc-500 hover:text-white hover:bg-white/10 hover:border-white/20 transition-all shadow-lg"
                                  title="View details"
                                >
                                  <Eye className="h-4 w-4" />
                                </button>
                                <button
                                  onClick={() => router.push(taskRoute)}
                                  className={`h-10 px-6 rounded-xl text-[10px] font-black transition-all uppercase tracking-widest shadow-lg active:scale-95 ${actionLabel === "View" ? "bg-zinc-900 text-zinc-400 hover:text-white border border-white/5" : "bg-emerald-500 text-zinc-950 hover:bg-emerald-400"}`}
                                >
                                  {actionLabel}
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>

          {/* Snapshot Area */}
          <div className="lg:col-span-1 space-y-10 animate-in fade-in slide-in-from-right-6 duration-700">
            <div className="rounded-[2.5rem] bg-zinc-900/40 border border-white/5 p-8 shadow-2xl ring-1 ring-white/10 h-fit">
              <div className="flex items-center justify-between mb-8">
                <h3 className="text-xl font-black text-white tracking-tight">
                  Active Pulse
                </h3>
                <Link
                  href="#"
                  className="text-[10px] font-black text-emerald-400 uppercase tracking-[0.2em] hover:text-emerald-300 transition-colors"
                >
                  Manifest
                </Link>
              </div>

              <div className="space-y-6">
                {filtered
                  .filter((t) => t.status !== "Closed")
                  .slice(0, 5)
                  .map((task) => (
                    <div
                      key={task.id}
                      className="group rounded-2xl bg-zinc-950 border border-white/5 p-5 hover:border-emerald-500/30 transition-all cursor-pointer shadow-lg active:scale-[0.98]"
                      onClick={() =>
                        router.push(
                          getTaskRoute(task as any, user.role, user.id),
                        )
                      }
                    >
                      <div className="flex justify-between items-start mb-3">
                        <span className="font-black text-white text-xs tracking-tight line-clamp-1 flex-1 pr-4">
                          {task.equipmentName}
                        </span>
                        <span className="text-[10px] font-black text-zinc-600 uppercase tracking-widest tabular-nums">
                          {task.lotoId}
                        </span>
                      </div>

                      <div className="flex items-center justify-between mb-4">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-md text-[8px] font-black uppercase tracking-widest ${
                            task.status === "Pending Approval"
                              ? "bg-amber-500/10 text-amber-500"
                              : task.status.includes("Progress")
                                ? "bg-blue-500/10 text-blue-400"
                                : "bg-emerald-500/10 text-emerald-400"
                          }`}
                        >
                          {task.status}
                        </span>
                        <div className="flex items-center gap-1.5 opacity-40">
                          <div className="w-1 h-1 rounded-full bg-zinc-400" />
                          <span className="text-[9px] font-black text-zinc-400 uppercase tracking-tighter">
                            {task.numIsolationPoints} POINTS
                          </span>
                        </div>
                      </div>

                      <div className="relative h-1.5 w-full rounded-full bg-zinc-900 border border-white/5 overflow-hidden">
                        <div
                          className={`absolute top-0 left-0 h-full rounded-full transition-all duration-1000 ${
                            task.status === "Pending Approval"
                              ? "bg-amber-500/60 shadow-[0_0_8px_rgba(245,158,11,0.3)] w-1/4"
                              : task.status.includes("In Progress")
                                ? "bg-blue-500/60 shadow-[0_0_8px_rgba(59,130,246,0.3)] w-1/2"
                                : "bg-emerald-500/60 shadow-[0_0_8px_rgba(16,185,129,0.3)] w-full"
                          }`}
                        />
                      </div>
                    </div>
                  ))}

                {filtered.filter((t) => t.status !== "Closed").length === 0 &&
                  !isLoading && (
                    <div className="text-center py-10 space-y-4">
                      <div className="w-16 h-16 rounded-2xl bg-zinc-950 border border-white/5 flex items-center justify-center mx-auto shadow-inner">
                        <CheckCircle2 className="h-8 w-8 text-zinc-800" />
                      </div>
                      <p className="text-[10px] font-black text-zinc-600 uppercase tracking-widest">
                        Pulse Status: Nominal
                      </p>
                    </div>
                  )}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
