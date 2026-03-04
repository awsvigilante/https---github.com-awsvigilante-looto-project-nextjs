"use client";

import { Search, Plus, AlertTriangle, ShieldCheck, Clock, CheckCircle2, FileText, User, LogOut, Loader2, Eye, Edit, Trash2, Bell } from 'lucide-react'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

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

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; textColor: string }> = {
  "Draft":                     { label: "Draft",             color: "border-slate-200",   bg: "bg-slate-100",   textColor: "text-slate-600" },
  "Pending Approval":          { label: "Pending",           color: "border-amber-200",   bg: "bg-amber-100",   textColor: "text-amber-700" },
  "Approved":                  { label: "Approved",          color: "border-emerald-200", bg: "bg-emerald-100", textColor: "text-emerald-700" },
  "Isolation In Progress":     { label: "In Progress",       color: "border-blue-200",    bg: "bg-blue-100",    textColor: "text-blue-700" },
  "Isolation Complete":        { label: "Awaiting Sign-off", color: "border-purple-200",  bg: "bg-purple-100",  textColor: "text-purple-700" },
  "Isolation Verified / Active": { label: "Active (Safe)",   color: "border-emerald-200", bg: "bg-emerald-100", textColor: "text-emerald-700" },
  "Closed":                    { label: "Closed",            color: "border-slate-200",   bg: "bg-slate-100",   textColor: "text-slate-600" },
};

function getStatusConfig(status: string) {
  return STATUS_CONFIG[status] || STATUS_CONFIG["Draft"];
}

function getTaskActionLabel(status: string, role: string) {
  if (status === "Pending Approval" && role === "shift_engineer") return "Approve";
  if (status === "Approved" && role === "operator") return "Fill Details";
  if (status === "Isolation In Progress" && role === "operator") return "Continue";
  if (status === "Isolation Complete" && role === "supervisor") return "Verify";
  return "View";
}

export default function Dashboard() {
  const [user, setUser] = useState<any>(null)
  const [token, setToken] = useState("")
  const [tasks, setTasks] = useState<LotoTask[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [search, setSearch] = useState("")
  const router = useRouter()

  useEffect(() => {
    const storedUser = localStorage.getItem('user')
    const storedToken = localStorage.getItem('token')

    if (!storedToken || !storedUser) {
      localStorage.removeItem('token')
      localStorage.removeItem('user')
      router.push('/login')
      return
    }
    try {
      const parsed = JSON.parse(storedUser)
      if (parsed.role === "admin") { router.push('/admin'); return; }
      setUser(parsed)
      setToken(storedToken)
    } catch {
      localStorage.removeItem('token')
      localStorage.removeItem('user')
      router.push('/login')
    }
  }, [router])

  useEffect(() => {
    if (!token) return;
    setIsLoading(true)
    fetch('/api/loto', {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(r => r.json())
      .then(data => setTasks(Array.isArray(data) ? data : []))
      .catch(() => setTasks([]))
      .finally(() => setIsLoading(false))
  }, [token])

  const handleLogout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    router.push('/login')
  }

  if (!user) return null

  const filtered = tasks.filter(t =>
    t.lotoId.toLowerCase().includes(search.toLowerCase()) ||
    t.equipmentName.toLowerCase().includes(search.toLowerCase())
  )

  const pendingTasks = filtered.filter(t => !["Isolation Verified / Active", "Closed"].includes(t.status))
  const activeTasks = filtered.filter(t => t.status === "Isolation Verified / Active")
  
  const totalTasks = tasks.length;
  const activeTasksCount = activeTasks.length;
  const pendingApprovalsCount = tasks.filter(t => t.status === "Pending Approval").length;
  const closedTasksCount = tasks.filter(t => t.status === "Closed").length;

  return (
    <div className="min-h-screen bg-[#F4F7FE] text-slate-800 font-sans">
      {/* Top Navigation */}
      <header className="sticky top-0 z-30 flex items-center justify-between bg-white px-6 py-4 shadow-sm border-b border-slate-100">
        <div className="flex items-center gap-3 w-64">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-600 text-white shadow-sm">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <h1 className="text-xl font-bold text-slate-800 tracking-tight">Smart LOTO</h1>
        </div>

        <div className="flex-1 flex justify-center max-w-2xl px-4">
          <div className="relative w-full max-w-lg">
            <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search equipment, LOTO IDs..."
              className="w-full rounded-full border border-slate-200 bg-white py-2.5 pl-11 pr-4 text-sm font-medium text-slate-700 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 shadow-[0_2px_10px_rgba(0,0,0,0.02)]"
            />
          </div>
        </div>

        <div className="flex items-center gap-5 w-64 justify-end">
          <button className="relative p-2 text-slate-400 hover:text-slate-600 transition-colors">
            <Bell className="h-5 w-5" />
            <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-red-500 border-2 border-white"></span>
          </button>
          
          <div className="h-8 w-px bg-slate-200"></div>
          
          <div className="flex items-center gap-3">
            <div className="flex flex-col items-end">
              <span className="text-sm font-bold text-slate-800 leading-tight">{user.name}</span>
              <span className="text-xs font-medium text-slate-500 capitalize">{user.role?.replace('_', ' ')}</span>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-slate-600 border border-slate-200">
              <User className="h-5 w-5" />
            </div>
            <button onClick={handleLogout} className="ml-2 text-slate-400 hover:text-red-500 transition-colors">
              <LogOut className="h-5 w-5" />
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[1400px] px-6 py-8">
        
        {/* Page Header */}
        <div className="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-slate-900 mb-1">Good Morning, {user.name.split(' ')[0]}</h2>
            <p className="text-sm font-medium text-slate-500">Here's what's happening with your isolation tasks today.</p>
          </div>
          
          {["operator", "shift_engineer", "supervisor"].includes(user.role) && (
            <div className="flex items-center gap-3">
              <button className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-50 shadow-sm transition-all">
                <FileText className="h-4 w-4" />
                Export
              </button>
              <Link href="/loto/create" className="flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-blue-700 shadow-md shadow-blue-500/20 transition-all">
                <Plus className="h-4 w-4" />
                Add New LOTO
              </Link>
            </div>
          )}
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="rounded-2xl bg-white p-6 shadow-[0_2px_10px_rgba(0,0,0,0.02)] flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
              <FileText className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm font-bold text-slate-500 mb-1">Total Tasks</p>
              <h3 className="text-2xl font-bold text-slate-900">{isLoading ? "-" : totalTasks}</h3>
            </div>
          </div>
          
          <div className="rounded-2xl bg-white p-6 shadow-[0_2px_10px_rgba(0,0,0,0.02)] flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-purple-50 text-purple-600">
              <Clock className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm font-bold text-slate-500 mb-1">Pending Validation</p>
              <h3 className="text-2xl font-bold text-slate-900">{isLoading ? "-" : pendingApprovalsCount}</h3>
            </div>
          </div>

          <div className="rounded-2xl bg-white p-6 shadow-[0_2px_10px_rgba(0,0,0,0.02)] flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
              <ShieldCheck className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm font-bold text-slate-500 mb-1">Active Isolations</p>
              <h3 className="text-2xl font-bold text-slate-900">{isLoading ? "-" : activeTasksCount}</h3>
            </div>
          </div>

          <div className="rounded-2xl bg-white p-6 shadow-[0_2px_10px_rgba(0,0,0,0.02)] flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-orange-50 text-orange-600">
              <CheckCircle2 className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm font-bold text-slate-500 mb-1">Safely Closed</p>
              <h3 className="text-2xl font-bold text-slate-900">{isLoading ? "-" : closedTasksCount}</h3>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Active Tasks Table (Main Area) */}
          <div className="lg:col-span-2 space-y-6">
            <div className="rounded-2xl bg-white p-6 shadow-[0_2px_10px_rgba(0,0,0,0.02)]">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-bold text-slate-900">All LOTO Tasks</h3>
                <div className="flex gap-2 text-sm">
                  <select className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 font-medium text-slate-700 outline-none">
                    <option>Filter by Status</option>
                  </select>
                </div>
              </div>

              {isLoading ? (
                <div className="flex items-center justify-center py-12 text-slate-400">
                  <Loader2 className="h-6 w-6 animate-spin" />
                </div>
              ) : filtered.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-slate-400">
                  <FileText className="h-8 w-8 mb-3 text-slate-300" />
                  <p className="text-sm font-bold">No tasks found</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className="border-b border-slate-100 text-slate-500 font-bold">
                        <th className="pb-3 px-2">Equipment Name</th>
                        <th className="pb-3 px-2">LOTO ID / Facility</th>
                        <th className="pb-3 px-2">Reason</th>
                        <th className="pb-3 px-2">Status</th>
                        <th className="pb-3 px-2 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {filtered.map(task => {
                        const cfg = getStatusConfig(task.status);
                        const actionLabel = getTaskActionLabel(task.status, user.role);
                        return (
                          <tr key={task.id} className="hover:bg-slate-50/50 transition-colors group">
                            <td className="py-4 px-2">
                              <div className="font-extrabold text-slate-900">{task.equipmentName}</div>
                              <div className="text-xs font-bold text-slate-500 mt-0.5">{new Date(task.createdAt).toLocaleDateString()}</div>
                            </td>
                            <td className="py-4 px-2">
                              <div className="font-extrabold text-slate-700">{task.lotoId}</div>
                              <div className="text-xs font-bold text-slate-500 mt-0.5">{task.facility}</div>
                            </td>
                            <td className="py-4 px-2 max-w-[200px]">
                              <div className="truncate font-bold text-slate-700">{task.reasonForIsolation}</div>
                            </td>
                            <td className="py-4 px-2">
                              <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-bold ${cfg.bg} ${cfg.textColor}`}>
                                {task.status === "Isolation Verified / Active" && <ShieldCheck className="mr-1 h-3 w-3" />}
                                {cfg.label}
                              </span>
                            </td>
                            <td className="py-4 px-2 text-right">
                              <div className="flex justify-end gap-2">
                                <button onClick={() => router.push(`/loto/${task.id}`)} className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors" title="View details">
                                  <Eye className="h-4 w-4" />
                                </button>
                                {actionLabel !== "View" && (
                                  <button onClick={() => router.push(`/loto/${task.id}`)} className="flex h-8 items-center justify-center rounded-lg bg-blue-50 px-3 text-xs font-extrabold text-blue-600 hover:bg-blue-100 transition-colors uppercase tracking-wide">
                                    {actionLabel}
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>

          {/* Side Panel (Snapshot) */}
          <div className="lg:col-span-1 space-y-6">
            <div className="rounded-2xl bg-white p-6 shadow-[0_2px_10px_rgba(0,0,0,0.02)]">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-bold text-slate-900">Today's Snapshot</h3>
                <Link href="#" className="text-sm font-bold text-blue-600 hover:text-blue-700">View All</Link>
              </div>

              <div className="space-y-4">
                {pendingTasks.slice(0, 4).map(task => {
                  const cfg = getStatusConfig(task.status);
                  return (
                    <div key={task.id} className="rounded-xl border border-slate-100 p-4 hover:shadow-md transition-shadow cursor-pointer" onClick={() => router.push(`/loto/${task.id}`)}>
                      <div className="flex justify-between items-start mb-2">
                        <span className="font-bold text-slate-900 text-sm line-clamp-1 flex-1 pr-2">{task.equipmentName}</span>
                        <span className="text-xs font-bold text-slate-500 whitespace-nowrap">{task.lotoId}</span>
                      </div>
                      <div className="flex items-center justify-between mb-3">
                        <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-[10px] font-bold ${cfg.bg} ${cfg.textColor}`}>
                          {cfg.label}
                        </span>
                        <span className="text-xs font-medium text-slate-500">{task.numIsolationPoints} pts</span>
                      </div>
                      <div className="h-1.5 w-full rounded-full bg-slate-100 overflow-hidden">
                        <div 
                          className={`h-full rounded-full ${task.status === 'Pending Approval' ? 'bg-amber-400 w-1/4' : task.status === 'Isolation In Progress' ? 'bg-blue-500 w-1/2' : task.status === 'Isolation Complete' ? 'bg-purple-500 w-3/4' : 'bg-slate-300 w-5'}`} 
                        />
                      </div>
                    </div>
                  )
                })}
                
                {pendingTasks.length === 0 && !isLoading && (
                  <div className="text-center py-6">
                    <CheckCircle2 className="mx-auto h-8 w-8 text-emerald-400 mb-2" />
                    <p className="text-sm font-bold text-slate-600">All clear! No pending tasks.</p>
                  </div>
                )}
              </div>
            </div>
          </div>

        </div>
      </main>
    </div>
  )
}
