'use client'

import React, { useState, useEffect, use } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
    ArrowLeft, ShieldCheck, CheckCircle2, AlertTriangle,
    Lock, UserCheck, FileText, Bell
} from 'lucide-react'

const STAGES = [
    { label: 'Creation' },
    { label: 'Approval' },
    { label: 'Isolation' },
    { label: 'Verification' },
    { label: 'Contractor' },
    { label: 'DeLOT' },
]

function getStageIndex(status: string) {
    switch (status) {
        case 'Draft':
        case 'Pending Approval': return 1
        case 'Approved': return 2
        case 'Verification In Progress':
        case 'Isolation Complete': return 3
        case 'Isolation Verified / Active': return 4
        case 'Return to Service': return 5
        case 'Closed': return 6
        default: return 1
    }
}

export default function VerifyPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params)
    const router = useRouter()

    const [task, setTask] = useState<any>(null)
    const [points, setPoints] = useState<any[]>([])
    const [activeUser, setActiveUser] = useState<any>(null)
    const [isUpdating, setIsUpdating] = useState(false)
    const [isRowUpdating, setIsRowUpdating] = useState(false)
    const [toastMessage, setToastMessage] = useState('')
    const [status, setStatus] = useState('')

    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null

    useEffect(() => {
        const stored = localStorage.getItem('user')
        if (stored) setActiveUser(JSON.parse(stored))
    }, [])

    useEffect(() => {
        if (!id) return
        const tok = localStorage.getItem('token')
        if (!tok) { router.push('/login'); return }
        fetch(`/api/loto/${id}`, { headers: { Authorization: `Bearer ${tok}` } })
            .then(r => r.json())
            .then(d => {
                if (d.error) { router.push('/'); return }
                setTask(d.task)
                setStatus(d.task.status)
                setPoints(d.isolationPoints || [])
            })
    }, [id])

    useEffect(() => {
        if (toastMessage) {
            const t = setTimeout(() => setToastMessage(''), 4000)
            return () => clearTimeout(t)
        }
    }, [toastMessage])

    const currentUserId = String(activeUser?.id || activeUser?.userId || '').trim().toLowerCase()
    const isAssignedSupervisor = currentUserId !== '' &&
        currentUserId === String(task?.supervisorId || task?.supervisor?.id || '').trim().toLowerCase()
    // Allow any supervisor or shift_engineer role to verify — not just the exact assigned one
    const isSupervisorRole = ['supervisor', 'shift_engineer'].includes(activeUser?.role || '')
    const supervisorHasSigned = ['Isolation Verified / Active', 'Return to Service', 'Closed'].includes(status)
    const canVerify = status === 'Verification In Progress' && (isAssignedSupervisor || isSupervisorRole)

    const stageIdx = getStageIndex(status)

    // Update a point's lockOnInitial2 in local state + backend immediately
    const updateInitial2 = async (index: number, value: string) => {
        setIsRowUpdating(true)
        setPoints(prev => {
            const newPts = [...prev]
            newPts[index] = { ...newPts[index], lockOnInitial2: value }
            return newPts
        })
        
        try {
            const pointId = points[index]?.id
            const tok = localStorage.getItem('token')
            if (tok && pointId && task?.id) {
                await fetch(`/api/loto/${task.id}`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tok}` },
                    body: JSON.stringify({ action: 'update_point', pointId, field: 'lockOnInitial2', value }),
                })
            }
        } catch (err) {
            console.error('Failed to update row', err)
        } finally {
            setIsRowUpdating(false)
        }
    }

    const handleSignAndSupervise = async () => {
        if (points.some(p => !p.lockOnInitial2)) {
            setToastMessage('Please sign all rows (Done) before completing verification.')
            return
        }
        setIsUpdating(true)
        try {
            const res = await fetch(`/api/loto/${id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify({
                    action: 'supervisor_complete',
                    isolationPoints: points.map(p => ({ id: p.id, lockOnInitial2: p.lockOnInitial2 }))
                })
            })
            const data = await res.json()
            if (!res.ok) throw new Error(data.error || 'Verification failed')
            setTask(data.task)
            setStatus(data.task.status)
            setToastMessage('✅ Isolation verified! Operator and creator have been notified.')
        } catch (err: any) {
            setToastMessage(err.message)
        } finally {
            setIsUpdating(false)
        }
    }

    if (!task) return (
        <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center">
            <div className="text-center space-y-3">
                <div className="w-12 h-12 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto" />
                <p className="text-sm font-bold text-slate-500 uppercase tracking-widest">Loading Verification…</p>
            </div>
        </div>
    )

    return (
        <div className="min-h-screen bg-[#F8FAFC] text-slate-800 pb-32">
            {/* Toast */}
            {toastMessage && (
                <div className="fixed bottom-6 right-6 z-[100] bg-slate-900 border-l-4 border-purple-500 text-white p-4 rounded-xl shadow-2xl animate-in slide-in-from-bottom-5 fade-in duration-300 flex items-start gap-4 max-w-sm">
                    <Bell className="w-5 h-5 text-purple-400 mt-0.5 shrink-0" />
                    <p className="text-sm font-medium leading-relaxed">{toastMessage}</p>
                </div>
            )}

            {/* 6-Stage Progress Bar */}
            <div className="bg-white border-b border-slate-100 px-4 py-4 shadow-sm">
                <div className="max-w-6xl mx-auto flex items-center justify-between gap-2">
                    {STAGES.map((s, i) => {
                        const done = i + 1 < stageIdx
                        const active = i + 1 === stageIdx
                        return (
                            <React.Fragment key={s.label}>
                                <div className="flex flex-col items-center gap-1.5 min-w-[48px]">
                                    <div className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-black border-2 transition-all
                                        ${done ? 'bg-emerald-500 border-emerald-500 text-white' : active ? 'bg-indigo-600 border-indigo-600 text-white ring-4 ring-indigo-600/20' : 'bg-white border-slate-200 text-slate-400'}`}>
                                        {done ? <CheckCircle2 className="w-4 h-4" /> : i + 1}
                                    </div>
                                    <span className={`text-[9px] font-extrabold uppercase tracking-widest ${active ? 'text-indigo-600' : done ? 'text-emerald-600' : 'text-slate-400'}`}>
                                        {s.label}
                                    </span>
                                </div>
                                {i < STAGES.length - 1 && (
                                    <div className={`flex-1 h-1.5 mx-1 rounded-full transition-colors ${done ? 'bg-emerald-500' : 'bg-slate-100'}`} />
                                )}
                            </React.Fragment>
                        )
                    })}
                </div>
            </div>

            {/* Header */}
            <div className="bg-white border-b border-slate-200 px-4 py-4 shadow-sm">
                <div className="max-w-6xl mx-auto flex items-center gap-4">
                    <Link href={`/loto/${id}`} className="p-2 rounded-lg hover:bg-slate-100 transition-colors">
                        <ArrowLeft className="w-5 h-5 text-slate-500" />
                    </Link>
                    <div className="flex-1">
                        <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest mb-0.5">Supervisor Verification</p>
                        <h1 className="text-xl font-black text-slate-900 tracking-tight">{task.lotoId}</h1>
                    </div>
                    {/* Right: status + user + logout */}
                    <div className="flex items-center gap-3">
                        {supervisorHasSigned ? (
                            <span className="bg-emerald-100 text-emerald-800 border border-emerald-200 px-3 py-1 rounded-full text-xs font-bold uppercase flex items-center gap-1.5">
                                <ShieldCheck className="w-3.5 h-3.5" /> Verified
                            </span>
                        ) : (
                            <span className="bg-purple-100 text-purple-800 border border-purple-200 px-3 py-1 rounded-full text-xs font-bold uppercase flex items-center gap-1.5">
                                <Lock className="w-3.5 h-3.5" /> Awaiting Supervisor Sign
                            </span>
                        )}
                        {/* User + Logout */}
                        <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 shadow-sm">
                            <div className="w-7 h-7 rounded-full bg-purple-600 flex items-center justify-center text-white text-[11px] font-black uppercase">
                                {(activeUser?.name || 'U').charAt(0)}
                            </div>
                            <span className="text-xs font-bold text-slate-700 hidden sm:block max-w-[100px] truncate">{activeUser?.name || 'User'}</span>
                            <button
                                onClick={() => {
                                    localStorage.removeItem('token')
                                    localStorage.removeItem('user')
                                    router.push('/login')
                                }}
                                className="ml-1 px-4 py-1.5 rounded-full bg-red-500 hover:bg-red-600 active:scale-95 text-white text-[11px] font-black uppercase tracking-widest shadow-sm shadow-red-500/30 transition-all"
                            >
                                Logout
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            <div className="max-w-6xl mx-auto px-4 py-8 space-y-6">
                {/* Task summary card */}
                <div className="rounded-2xl bg-white border border-slate-200 p-6 shadow-sm grid grid-cols-2 md:grid-cols-4 gap-4">
                    {[
                        { label: 'Equipment', value: task.equipmentName },
                        { label: 'Reason', value: task.reasonForIsolation },
                        { label: 'Operator', value: task.primaryOperator?.name || '—' },
                        { label: 'Lock Box', value: task.lockBoxNumber },
                    ].map(({ label, value }) => (
                        <div key={label}>
                            <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest mb-1">{label}</p>
                            <p className="text-sm font-bold text-slate-800">{value}</p>
                        </div>
                    ))}
                </div>

                {/* Supervisor instructions */}


                {supervisorHasSigned && (
                    <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-6 py-4 flex items-start gap-4">
                        <CheckCircle2 className="w-5 h-5 text-emerald-600 mt-0.5 shrink-0" />
                        <div>
                            <p className="text-sm font-extrabold text-emerald-900">Verification complete — Work may proceed</p>
                            <p className="text-xs font-bold text-emerald-700 mt-1">Signed at {task.supervisorSignedAt ? new Date(task.supervisorSignedAt).toLocaleString() : '—'}</p>
                        </div>
                    </div>
                )}

                {/* Isolation table */}
                <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
                    <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-3">
                        <FileText className="w-4 h-4 text-slate-400" />
                        <h3 className="text-sm font-extrabold text-slate-700 uppercase tracking-widest">Isolation Points — {points.length} Points</h3>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left min-w-[800px]">
                            <thead className="border-b border-slate-100 bg-slate-50">
                                <tr>
                                    <th className="px-3 py-4 text-[10px] font-extrabold text-slate-400 uppercase tracking-widest w-12 text-center">Tag</th>
                                    <th className="px-4 py-4 text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">Tag Location</th>
                                    <th className="px-6 py-4 text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">Lock #</th>
                                    <th className="px-6 py-4 text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">Isolated Position</th>
                                    <th className="px-6 py-4 text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">Lock on Initial #1 (Operator)</th>
                                    <th className={`px-6 py-4 text-[10px] font-extrabold uppercase tracking-widest ${canVerify ? 'text-purple-500' : 'text-slate-400'}`}>
                                        Lock on Initial #2 {canVerify && '(You)'}
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {points.map((p, i) => (
                                    <tr key={p.id} className="hover:bg-slate-50/50 transition-colors">
                                        <td className="px-3 py-4 text-center">
                                            <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-slate-100 text-[11px] font-black text-slate-500">{p.tagNo}</span>
                                        </td>
                                        <td className="px-4 py-4">
                                            <span className="text-sm font-bold text-slate-800">{p.isolationDescription}</span>
                                        </td>
                                        {/* Lock # — read-only */}
                                        <td className="px-6 py-4">
                                            <span className="font-extrabold text-slate-900 bg-slate-100 px-3 py-1.5 rounded-lg border border-slate-200 text-sm">
                                                {p.lockNumber || '—'}
                                            </span>
                                        </td>
                                        {/* Isolated Position — read-only */}
                                        <td className="px-6 py-4">
                                            <span className={`inline-flex rounded-md px-2.5 py-1 text-[10px] font-extrabold border uppercase tracking-widest ${p.isolationPosition ? 'bg-indigo-50 text-indigo-700 border-indigo-200' : 'bg-slate-50 text-slate-300 border-slate-100'}`}>
                                                {p.isolationPosition || '—'}
                                            </span>
                                        </td>
                                        {/* Lock on Initial #1 — read-only */}
                                        <td className="px-6 py-4">
                                            {p.lockOnInitial1 ? (
                                                <div className="inline-flex flex-col">
                                                    <span className="text-[10px] font-extrabold text-slate-600 uppercase bg-emerald-50 px-2.5 py-1 rounded-md border border-emerald-200 flex items-center gap-1.5">
                                                        <UserCheck className="w-3 h-3 text-emerald-500" /> {p.lockOnInitial1.split(' – ')[0]}
                                                    </span>
                                                    <span className="text-[9px] text-slate-400 font-bold tracking-wider mt-1">{p.lockOnInitial1.split(' – ')[1]}</span>
                                                </div>
                                            ) : (
                                                <span className="text-[10px] text-slate-300 italic font-bold">Not signed</span>
                                            )}
                                        </td>
                                        {/* Lock on Initial #2 — only editable by supervisor role */}
                                        <td className="px-6 py-4">
                                            {p.lockOnInitial2 ? (
                                                <div className="flex items-center gap-3">
                                                    <div className="inline-flex flex-col">
                                                        <span className="text-[10px] font-extrabold text-slate-600 uppercase bg-purple-50 px-2.5 py-1 rounded-md border border-purple-200 flex items-center gap-1.5">
                                                            <UserCheck className="w-3 h-3 text-purple-500" /> {p.lockOnInitial2.split(' – ')[0]}
                                                        </span>
                                                        <span className="text-[9px] text-slate-400 font-bold tracking-wider mt-1">{p.lockOnInitial2.split(' – ')[1]}</span>
                                                    </div>
                                                    {canVerify && !supervisorHasSigned && (
                                                        <button
                                                            onClick={() => updateInitial2(i, '')}
                                                            disabled={isRowUpdating}
                                                            className={`px-4 py-2 text-xs font-black text-white rounded-lg transition-all uppercase tracking-widest shadow-md active:scale-95 ${isRowUpdating ? 'bg-slate-300 cursor-wait' : 'bg-red-500 hover:bg-red-600'}`}
                                                        >
                                                            ✎ Edit
                                                        </button>
                                                    )}
                                                </div>
                                            ) : canVerify ? (
                                                <button
                                                    onClick={() => {
                                                        const name = activeUser?.name || 'Supervisor'
                                                        const now = new Date().toLocaleString('en-CA', { hour12: false }).replace(',', '')
                                                        updateInitial2(i, `${name} – ${now}`)
                                                    }}
                                                    disabled={isRowUpdating}
                                                    className={`text-sm font-black text-white px-6 py-2.5 rounded-xl shadow-lg active:scale-95 transition-all uppercase tracking-widest border ${isRowUpdating ? 'bg-slate-400 border-slate-400 cursor-wait shadow-none' : 'bg-purple-600 hover:bg-purple-700 shadow-purple-500/30 border-purple-700'}`}
                                                >
                                                    ✓ Done
                                                </button>
                                            ) : (
                                                <span className="text-[10px] text-slate-300 italic font-bold">—</span>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Sign & Supervise CTA */}
                {canVerify && (
                    <div className="rounded-2xl border border-purple-200 bg-gradient-to-br from-purple-50 to-violet-50 p-6 shadow-sm">
                        <button
                            onClick={handleSignAndSupervise}
                            disabled={points.some(p => !p.lockOnInitial2) || isUpdating || isRowUpdating}
                            className={`w-full rounded-xl px-8 py-5 text-base font-black text-white active:scale-[0.98] transition-all shadow-lg flex items-center justify-center gap-3 uppercase tracking-widest disabled:opacity-50 ${
                                points.every(p => p.lockOnInitial2) && !isRowUpdating
                                    ? 'bg-purple-600 hover:bg-purple-700 shadow-purple-500/20'
                                    : 'bg-slate-400 cursor-wait'
                            }`}
                        >
                            {isUpdating || isRowUpdating ? (
                                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            ) : (
                                <ShieldCheck className="w-6 h-6" />
                            )}
                            {isRowUpdating ? 'Saving Row...' : points.every(p => p.lockOnInitial2)
                                ? 'Sign & Supervise — Mark Isolation Verified'
                                : `Sign all ${points.filter(p => !p.lockOnInitial2).length} remaining rows first`}
                        </button>
                    </div>
                )}
            </div>
        </div>
    )
}
