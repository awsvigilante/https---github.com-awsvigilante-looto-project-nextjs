'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, ShieldCheck, AlertCircle, CheckCircle2, FileText, Lock, Loader2, Trash2 } from 'lucide-react'

interface IsolationPoint {
    id: string;
    description: string;
    normalPosition: string;
    requiredPosition: string;
}

interface SupervisorOption { id: string; name: string; role: string; }

export default function CreateLOTO() {
    const router = useRouter()
    const [pointCount, setPointCount] = useState<number | ''>('')
    const [points, setPoints] = useState<IsolationPoint[]>([])
    const [error, setError] = useState<string | null>(null)
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [showSuccessModal, setShowSuccessModal] = useState(false)
    const [submittedTask, setSubmittedTask] = useState<any>(null)
    const [supervisors, setSupervisors] = useState<SupervisorOption[]>([])
    const [engineers, setEngineers] = useState<SupervisorOption[]>([])
    const [operators, setOperators] = useState<SupervisorOption[]>([])
    const [token, setToken] = useState('')
    const [currentUser, setCurrentUser] = useState<any>(null)

    // Header Fields
    const [facility, setFacility] = useState('Power Lab')
    const [lockbox, setLockbox] = useState('')
    const [reason, setReason] = useState('')
    const [rtm, setRtm] = useState('')
    const [equipment, setEquipment] = useState('')
    const [duration, setDuration] = useState('')
    const [supervisor, setSupervisor] = useState('')
    const [approver, setApprover] = useState('')
    const [assignedOperator, setAssignedOperator] = useState('')

    useEffect(() => {
        const storedUser = localStorage.getItem('user')
        const storedToken = localStorage.getItem('token')
        if (!storedUser || !storedToken) { router.push('/login'); return; }
        try {
            const user = JSON.parse(storedUser)
            setCurrentUser(user)
            setToken(storedToken)
            // Default assigned operator to current user if they are an operator/SE
            if (['operator', 'shift_engineer'].includes(user.role)) {
                setAssignedOperator(user.userId || user.id)
            }
        } catch { router.push('/login'); }
    }, [router])

    useEffect(() => {
        if (!token) return;
        fetch('/api/admin/users', { headers: { Authorization: `Bearer ${token}` } })
            .then(r => r.json())
            .then(data => {
                const allUsers = data.users || []
                // Approver can be Shift Engineer or Admin
                setEngineers(allUsers.filter((u: any) => ['shift_engineer', 'admin'].includes(u.role)))
                
                // Supervisor can be Supervisor, Shift Engineer, or Admin
                setSupervisors(allUsers.filter((u: any) => ['supervisor', 'shift_engineer', 'admin'].includes(u.role)))

                // Operator can be Operator, Supervisor, Shift Engineer, or Admin
                setOperators(allUsers.filter((u: any) => ['operator', 'supervisor', 'shift_engineer', 'admin'].includes(u.role)))
            })
            .catch(() => {})
    }, [token])

    const handlePointCountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = parseInt(e.target.value)
        if (isNaN(val) || val <= 0) {
            setPointCount('')
            setPoints([])
            return
        }
        setPointCount(val)

        // Generate empty rows per PRD
        const newPoints = Array.from({ length: val }).map((_, i) => ({
            id: `point-${i + 1}`,
            description: i === 0 ? 'Service Inlet Block Valve' : '',
            normalPosition: '',
            requiredPosition: ''
        }))
        setPoints(newPoints)
    }

    const updatePoint = (index: number, field: keyof IsolationPoint, val: string) => {
        const newPoints = [...points]
        newPoints[index][field] = val
        setPoints(newPoints)
    }

    const deletePoint = (index: number) => {
        const newPoints = points.filter((_, i) => i !== index)
        setPoints(newPoints)
        setPointCount(newPoints.length || '')
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setError('')
        if (!facility || !lockbox || !reason || !equipment || !supervisor || !approver || !assignedOperator) {
            setError("Please fill all mandatory fields (Facility, Lockbox, Reason, Equipment, Approver, Supervisor, Operator)")
            window.scrollTo({ top: 0, behavior: 'smooth' })
            return
        }

        const missingDescIndex = points.findIndex(p => !p.description)
        if (missingDescIndex !== -1) {
            setError(`Missing Description on Isolation Point ${missingDescIndex + 1}`)
            window.scrollTo({ top: 0, behavior: 'smooth' })
            return
        }

        const missingPositionIndex = points.findIndex(p => !p.normalPosition)
        if (missingPositionIndex !== -1) {
            setError(`Missing Normal Position on Tag ${missingPositionIndex + 1}`)
            window.scrollTo({ top: 0, behavior: 'smooth' })
            return
        }

        const missingReqIndex = points.findIndex(p => !p.requiredPosition)
        if (missingReqIndex !== -1) {
            setError(`Missing Required Position on Tag ${missingReqIndex + 1}`)
            window.scrollTo({ top: 0, behavior: 'smooth' })
            return
        }

        setIsSubmitting(true)
        try {
            // 1. Create task with full details and 'Pending Approval' status
            const createRes = await fetch('/api/loto', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({
                    facility,
                    lockBoxNumber: lockbox,
                    reasonForIsolation: reason,
                    equipmentName: equipment,
                    expectedDuration: duration,
                    numIsolationPoints: points.length,
                    supervisorId: supervisor,
                    approverId: approver,
                    primaryOperatorId: assignedOperator,
                    status: 'Pending Approval',
                    isolationPoints: points.map((p, i) => ({
                        isolationDescription: p.description,
                        normalPosition: p.normalPosition,
                        requiredPosition: p.requiredPosition
                    }))
                })
            })
            const data = await createRes.json()
            if (!createRes.ok) throw new Error(data.error || "Failed to create task")

            setSubmittedTask(data.task)
            setShowSuccessModal(true)
        } catch (err: any) {
            setError(err.message)
        } finally {
            setIsSubmitting(false)
        }
    }

    return (
        <div className="min-h-screen bg-gray-50 text-gray-900 pb-24">
            {/* Top Level Progress Stepper */}
            <div className="bg-white border-b border-gray-200 py-3 px-4 overflow-x-auto">
                <div className="max-w-4xl mx-auto flex items-center justify-between min-w-[600px]">
                    {[
                        { step: 'Creation', active: true, done: false },
                        { step: 'Approval', active: false, done: false },
                        { step: 'Isolation', active: false, done: false },
                        { step: 'Verification', active: false, done: false },
                        { step: 'Active', active: false, done: false },
                        { step: 'Delot', active: false, done: false }
                    ].map((s, idx, arr) => (
                        <React.Fragment key={s.step}>
                            <div className="flex flex-col items-center opacity-50">
                                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${s.active ? 'bg-blue-600 text-white ring-4 ring-blue-100 opacity-100' : s.done ? 'bg-emerald-500 text-white' : 'bg-gray-200 text-gray-500'}`}>
                                    {s.done ? <CheckCircle2 className="w-3 h-3" /> : idx + 1}
                                </div>
                                <span className={`text-[10px] mt-1 font-bold uppercase tracking-wider ${s.active ? 'text-blue-600 opacity-100' : s.done ? 'text-emerald-600' : 'text-gray-400'}`}>{s.step}</span>
                            </div>
                            {idx < arr.length - 1 && (
                                <div className={`flex-1 h-1 mx-2 rounded ${s.done ? 'bg-emerald-500' : 'bg-gray-200'}`} />
                            )}
                        </React.Fragment>
                    ))}
                </div>
            </div>

            <header className="sticky top-0 z-30 flex items-center justify-between border-b border-gray-200 bg-white px-4 py-3 md:py-4 md:px-6 shadow-sm gap-3">
                <div className="flex items-center gap-2 md:gap-3 min-w-0">
                    <Link href="/" className="rounded-full p-2 hover:bg-gray-100 transition-colors shrink-0">
                        <ArrowLeft className="h-4 w-4 md:h-5 md:w-5" />
                    </Link>
                    <div className="flex items-center gap-2 md:gap-3 min-w-0">
                        <div className="hidden sm:flex h-8 w-8 items-center justify-center rounded-lg bg-gray-900 text-white shrink-0">
                            <ShieldCheck className="h-5 w-5" />
                        </div>
                        <div className="min-w-0">
                            <h1 className="text-sm md:text-lg font-bold leading-none truncate">Create New LOTO Task</h1>
                            <span className="text-[9px] md:text-[10px] font-bold text-gray-500 uppercase tracking-wider">Task Creator</span>
                        </div>
                    </div>
                </div>
                <div className="hidden sm:flex px-3 py-1.5 rounded-full border-2 text-[10px] font-bold uppercase tracking-wider text-center bg-gray-100 text-gray-800 border-gray-300 items-center gap-1.5 shrink-0">
                    <FileText className="w-3 h-3" />
                    DRAFT
                </div>
            </header>

            <main className="mx-auto max-w-4xl px-4 py-6 md:px-6 md:py-8 space-y-6">

                {error && (
                    <div className="flex items-start gap-3 rounded-xl border-l-4 border-red-500 bg-red-50 p-4 shadow-sm animate-in fade-in slide-in-from-top-2">
                        <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
                        <div>
                            <h3 className="text-sm font-bold text-red-800">Missing Required Fields</h3>
                            <p className="text-sm font-medium text-red-700 mt-0.5">{error}</p>
                        </div>
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-6">
                    <section className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
                        <div className="border-b border-slate-100 bg-slate-50/80 px-6 py-5">
                            <h2 className="text-sm font-extrabold text-slate-900 uppercase tracking-widest flex items-center gap-2">
                                <div className="w-1.5 h-4 bg-indigo-500 rounded-full"></div>
                                1. Isolation Header
                            </h2>
                        </div>
                        <div className="p-6 md:p-8 grid gap-6 md:grid-cols-2">
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-extrabold text-slate-500 uppercase tracking-widest ml-1">Facility</label>
                                <select
                                    title="Facility"
                                    value={facility}
                                    onChange={(e) => setFacility(e.target.value)}
                                    className="w-full rounded-xl border border-slate-300 bg-white p-3 text-sm font-semibold text-slate-900 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 shadow-sm transition-all focus:outline-none"
                                >
                                    <option value="Power Lab">Power Lab</option>
                                    <option value="Building A">Building A</option>
                                    <option value="Building B">Building B</option>
                                </select>
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-extrabold text-slate-500 uppercase tracking-widest ml-1">Lock Box Number</label>
                                <input
                                    type="text"
                                    title="Lock Box Number"
                                    value={lockbox}
                                    onChange={(e) => setLockbox(e.target.value)}
                                    placeholder="e.g. 001"
                                    className="w-full rounded-xl border border-slate-300 bg-white p-3 text-sm font-semibold text-slate-900 focus:border-red-500 focus:ring-4 focus:ring-red-500/10 shadow-sm transition-all focus:outline-none"
                                    required
                                />
                            </div>
                            <div className="space-y-1.5 md:col-span-2">
                                <label className="text-[10px] font-extrabold text-slate-500 uppercase tracking-widest ml-1">Reason for Isolation</label>
                                <input
                                    type="text"
                                    value={reason}
                                    onChange={(e) => setReason(e.target.value)}
                                    placeholder="e.g. Replace leaking top handle gasket..."
                                    className="w-full rounded-xl border border-slate-300 bg-white p-3 text-sm font-semibold text-slate-900 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 shadow-sm transition-all focus:outline-none"
                                    required
                                />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-extrabold text-slate-500 uppercase tracking-widest ml-1">Equipment Name</label>
                                <input
                                    type="text"
                                    value={equipment}
                                    onChange={(e) => setEquipment(e.target.value)}
                                    placeholder="e.g. Water Softener_A"
                                    className="w-full rounded-xl border border-slate-300 bg-white p-3 text-sm font-semibold text-slate-900 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 shadow-sm transition-all focus:outline-none"
                                    required
                                />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-extrabold text-slate-500 uppercase tracking-widest ml-1">Red Tag Master #</label>
                                <div className="relative">
                                    <input
                                        title="Red Tag Master Number"
                                        placeholder="Auto-generated upon submission"
                                        type="text"
                                        value="AUTO-GENERATED"
                                        readOnly
                                        className="w-full rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm font-extrabold text-slate-400 cursor-not-allowed italic shadow-inner"
                                    />
                                    <Lock className="w-4 h-4 text-slate-300 absolute right-4 top-1/2 -translate-y-1/2" />
                                </div>
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-extrabold text-slate-500 uppercase tracking-widest ml-1">Expected Duration</label>
                                <input
                                    type="text"
                                    value={duration}
                                    onChange={(e) => setDuration(e.target.value)}
                                    placeholder="e.g. 2 days"
                                    className="w-full rounded-xl border border-slate-300 bg-white p-3 text-sm font-semibold text-slate-900 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 shadow-sm transition-all focus:outline-none"
                                    required
                                />
                            </div>
                             <div className="space-y-1.5">
                                <label className="text-[10px] font-extrabold text-slate-500 uppercase tracking-widest ml-1">Assigned Operator (Isolation)</label>
                                <select
                                    title="Assigned Operator"
                                    value={assignedOperator}
                                    onChange={(e) => setAssignedOperator(e.target.value)}
                                    className="w-full rounded-xl border border-slate-300 bg-white p-3 text-sm font-semibold text-slate-900 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 shadow-sm transition-all focus:outline-none"
                                     required
                                 >
                                     <option value="">Select Operator...</option>
                                     {operators.map(o => (
                                         <option key={o.id} value={o.id}>{o.name}</option>
                                     ))}
                                 </select>
                            </div>
                             <div className="space-y-1.5">
                                <label className="text-[10px] font-extrabold text-slate-500 uppercase tracking-widest ml-1">Assigned Supervisor (Verification)</label>
                                <select
                                    title="Supervisor"
                                    value={supervisor}
                                    onChange={(e) => setSupervisor(e.target.value)}
                                    className="w-full rounded-xl border border-slate-300 bg-white p-3 text-sm font-semibold text-slate-900 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 shadow-sm transition-all focus:outline-none"
                                     required
                                 >
                                     <option value="">Select Supervisor...</option>
                                     {supervisors.map(s => (
                                         <option key={s.id} value={s.id}>{s.name}</option>
                                     ))}
                                 </select>
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-extrabold text-slate-500 uppercase tracking-widest ml-1">Shift Engineer (Approver)</label>
                                <select
                                    title="Approver"
                                    value={approver}
                                    onChange={(e) => setApprover(e.target.value)}
                                    className="w-full rounded-xl border border-slate-300 bg-white p-3 text-sm font-semibold text-slate-900 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 shadow-sm transition-all focus:outline-none"
                                     required
                                 >
                                     <option value="">Select Approver...</option>
                                     {engineers.map(e => (
                                         <option key={e.id} value={e.id}>{e.name}</option>
                                     ))}
                                 </select>
                            </div>
                        </div>
                    </section>

                    <section className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden transition-all duration-300">
                        <div className="border-b border-slate-100 bg-slate-50/80 px-6 py-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
                            <h2 className="text-sm font-extrabold text-slate-900 uppercase tracking-widest flex items-center gap-2">
                                <div className="w-1.5 h-4 bg-indigo-500 rounded-full"></div>
                                2. Isolation Points
                            </h2>
                            <div className="flex items-center gap-3">
                                <label className="text-[10px] font-extrabold text-slate-500 uppercase tracking-widest">Number of Points:</label>
                                <input
                                    type="number"
                                    min="1"
                                    max="50"
                                    value={pointCount}
                                    onChange={handlePointCountChange}
                                    placeholder="0"
                                    className="w-20 rounded-xl border border-slate-300 bg-white p-2.5 text-sm font-extrabold text-center text-slate-900 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 shadow-sm transition-all focus:outline-none"
                                />
                            </div>
                        </div>

                        {points.length > 0 && (
                            <div className="p-4 md:p-8">
                                {/* Mobile: card layout */}
                                <div className="flex flex-col gap-4 md:hidden">
                                    {points.map((point, i) => (
                                        <div key={point.id} className="border border-slate-200 rounded-2xl p-4 space-y-3 bg-slate-50/50">
                                            <div className="flex items-center justify-between">
                                                <span className="text-xs font-extrabold text-slate-400 uppercase tracking-widest">Point {i + 1}</span>
                                                <button
                                                    type="button"
                                                    onClick={() => deletePoint(i)}
                                                    title="Delete isolation point"
                                                    className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                            <div className="space-y-1">
                                                <label className="text-[10px] font-extrabold text-slate-500 uppercase tracking-widest">Description</label>
                                                <input
                                                    type="text"
                                                    value={point.description}
                                                    onChange={(e) => updatePoint(i, 'description', e.target.value)}
                                                    placeholder="e.g. Service Inlet Block Valve"
                                                    className="w-full rounded-xl border border-slate-300 bg-white p-3 text-sm font-semibold text-slate-900 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 shadow-sm transition-all focus:outline-none"
                                                />
                                            </div>
                                            <div className="grid grid-cols-2 gap-3">
                                                <div className="space-y-1">
                                                    <label className="text-[10px] font-extrabold text-slate-500 uppercase tracking-widest">Normal Position</label>
                                                    <select
                                                        title="Normal Position"
                                                        value={point.normalPosition}
                                                        onChange={(e) => updatePoint(i, 'normalPosition', e.target.value)}
                                                        className={`w-full rounded-xl border p-3 text-sm font-semibold focus:outline-none ${point.normalPosition ? 'border-slate-200 bg-slate-50 text-slate-700' : 'border-red-300 bg-red-50 text-red-900'}`}
                                                    >
                                                        <option value="">Select...</option>
                                                        <option value="OPEN">Open</option>
                                                        <option value="CLOSE">Close</option>
                                                        <option value="INSTALLED">Installed</option>
                                                        <option value="REMOVED">Removed</option>
                                                    </select>
                                                </div>
                                                <div className="space-y-1">
                                                    <label className="text-[10px] font-extrabold text-slate-500 uppercase tracking-widest">Required Position</label>
                                                    <select
                                                        title="Required Position"
                                                        value={point.requiredPosition}
                                                        onChange={(e) => updatePoint(i, 'requiredPosition', e.target.value)}
                                                        className={`w-full rounded-xl border p-3 text-sm font-semibold focus:outline-none ${point.requiredPosition ? 'border-amber-200 bg-amber-50 text-amber-900' : 'border-red-300 bg-red-50 text-red-900'}`}
                                                    >
                                                        <option value="">Select...</option>
                                                        <option value="OPEN">Open</option>
                                                        <option value="CLOSE">Close</option>
                                                        <option value="REMOVED">Removed</option>
                                                    </select>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                {/* Desktop: table layout */}
                                <div className="hidden md:block overflow-x-auto">
                                {pointCount === 10 && (
                                    <div className="mb-6 inline-flex items-center gap-3 rounded-xl bg-indigo-50 px-4 py-3 border border-indigo-100/50 shadow-sm">
                                        <div className="bg-indigo-100 p-1.5 rounded-lg text-indigo-600">
                                            <AlertCircle className="h-4 w-4" />
                                        </div>
                                        <span className="text-xs font-extrabold text-indigo-800 uppercase tracking-widest mt-0.5">System generating LOTO ID for 10 points...</span>
                                    </div>
                                )}
                                <table className="w-full text-left whitespace-nowrap lg:whitespace-normal">
                                    <thead>
                                        <tr className="border-b border-slate-200">
                                            <th className="pb-4 pr-6 text-[10px] font-extrabold text-slate-400 uppercase tracking-widest w-16">Tag No</th>
                                            <th className="pb-4 pr-6 text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">Isolation Description</th>
                                            <th className="pb-4 text-[10px] font-extrabold text-slate-400 uppercase tracking-widest w-40">Normal Position</th>
                                            <th className="pb-4 pl-4 text-[10px] font-extrabold text-slate-400 uppercase tracking-widest w-48">Required Position</th>
                                            <th className="pb-4 text-[10px] font-extrabold text-slate-400 uppercase tracking-widest w-12"></th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-50">
                                        {points.map((point, i) => (
                                            <tr key={point.id} className="hover:bg-slate-50/50 transition-colors">
                                                <td className="py-4 pr-6 font-extrabold text-slate-900">{i + 1}</td>
                                                <td className="py-4 pr-6">
                                                    <input
                                                        type="text"
                                                        value={point.description}
                                                        onChange={(e) => updatePoint(i, 'description', e.target.value)}
                                                        placeholder="e.g. Service Inlet Block Valve"
                                                        className="w-full min-w-[200px] rounded-xl border border-slate-300 bg-white p-3 text-sm font-semibold text-slate-900 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 shadow-sm transition-all focus:outline-none"
                                                    />
                                                </td>
                                                <td className="py-4 pr-4">
                                                    <select
                                                        title="Normal Position"
                                                        value={point.normalPosition}
                                                        onChange={(e) => updatePoint(i, 'normalPosition', e.target.value)}
                                                        className={`w-full rounded-xl border p-3 text-sm font-semibold transition-all shadow-sm focus:outline-none ${point.normalPosition ? 'border-slate-200 bg-slate-50 text-slate-700 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10' : 'border-red-300 bg-red-50 text-red-900 focus:border-red-500 focus:ring-4 focus:ring-red-500/10 animate-pulse'}`}
                                                    >
                                                        <option value="">Select...</option>
                                                        <option value="OPEN">Open</option>
                                                        <option value="CLOSE">Close</option>
                                                        <option value="INSTALLED">Installed</option>
                                                        <option value="REMOVED">Removed</option>
                                                    </select>
                                                </td>
                                                <td className="py-4 pl-4">
                                                    <select
                                                        title="Required Position"
                                                        value={point.requiredPosition}
                                                        onChange={(e) => updatePoint(i, 'requiredPosition', e.target.value)}
                                                        className={`w-full rounded-xl border p-3 text-sm font-semibold transition-all shadow-sm focus:outline-none ${point.requiredPosition ? 'border-amber-200 bg-amber-50 text-amber-900 focus:border-amber-500 focus:ring-4 focus:ring-amber-500/10' : 'border-red-300 bg-red-50 text-red-900 focus:border-red-500 focus:ring-4 focus:ring-red-500/10 animate-pulse'}`}
                                                    >
                                                        <option value="">Select...</option>
                                                        <option value="OPEN">Open</option>
                                                        <option value="CLOSE">Close</option>
                                                        <option value="REMOVED">Removed</option>
                                                    </select>
                                                </td>
                                                <td className="py-4 text-right">
                                                    <button
                                                        type="button"
                                                        onClick={() => deletePoint(i)}
                                                        className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                                                        title="Delete isolation point"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                                </div>{/* end desktop table wrapper */}
                            </div>
                        )}
                        {points.length === 0 && (
                            <div className="p-12 text-center text-slate-400 flex flex-col items-center justify-center bg-slate-50/50">
                                <FileText className="w-8 h-8 mb-4 text-slate-300 opacity-50" />
                                <p className="text-sm font-bold tracking-wide">Enter the number of isolation points to generate rows.</p>
                            </div>
                        )}
                    </section>

                    <div className="pt-6 flex flex-col sm:flex-row sm:justify-end gap-3">
                        <button
                            type="submit"
                            className={`w-full sm:w-auto rounded-xl px-10 py-4 text-sm font-extrabold text-white transition-all shadow-md flex items-center justify-center gap-2 uppercase tracking-widest ${points.length > 0 && !isSubmitting && points.every(p => p.description && p.normalPosition && p.requiredPosition) && approver && supervisor && assignedOperator ? 'bg-red-600 hover:bg-red-700 active:scale-[0.98] shadow-red-500/20' : 'bg-slate-300 cursor-not-allowed opacity-70'}`}
                            disabled={points.length === 0 || isSubmitting || !points.every(p => p.description && p.normalPosition && p.requiredPosition) || !approver || !supervisor || !assignedOperator}
                        >
                            {isSubmitting ? <><Loader2 className="w-4 h-4 animate-spin" /> Submitting...</> : 'Submit for Approval'}
                        </button>
                    </div>
                </form>
            </main>

            {/* Success Modal */}
            {showSuccessModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
                    <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-100 animate-in zoom-in-95 duration-300">
                        <div className="p-8 text-center">
                            <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner ring-8 ring-emerald-50">
                                <CheckCircle2 className="w-10 h-10" />
                            </div>
                            <h3 className="text-2xl font-black text-slate-900 mb-3 tracking-tight">LOTO Submitted!</h3>
                            <p className="text-slate-600 font-medium leading-relaxed">
                                Your LOTO request has been successfully created and forwarded to the <span className="text-indigo-600 font-bold">Shift Engineer</span> for approval.
                            </p>
                            
                            <div className="mt-6 space-y-3">
                                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 text-left">
                                    <div className="flex justify-between items-center mb-3">
                                        <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">LOTO ID</span>
                                        <span className="text-sm font-black text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100">{submittedTask?.lotoId}</span>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <p className="text-[9px] font-extrabold text-slate-400 uppercase tracking-widest mb-0.5">Facility / Equipment</p>
                                            <p className="text-xs font-bold text-slate-700">{submittedTask?.facility} / {submittedTask?.equipmentName}</p>
                                        </div>
                                        <div>
                                            <p className="text-[9px] font-extrabold text-slate-400 uppercase tracking-widest mb-0.5">Reason</p>
                                            <p className="text-xs font-bold text-slate-700 truncate">{submittedTask?.reasonForIsolation}</p>
                                        </div>
                                    </div>
                                </div>

                                <div className="grid grid-cols-3 gap-2">
                                    <div className="p-3 bg-indigo-50/50 rounded-xl border border-indigo-100/50 text-center">
                                        <p className="text-[8px] font-extrabold text-indigo-400 uppercase tracking-widest mb-1">Approver</p>
                                        <p className="text-[10px] font-bold text-indigo-700 truncate">{engineers.find(e => e.id === submittedTask?.approverId)?.name || 'N/A'}</p>
                                    </div>
                                    <div className="p-3 bg-emerald-50/50 rounded-xl border border-emerald-100/50 text-center">
                                        <p className="text-[8px] font-extrabold text-emerald-400 uppercase tracking-widest mb-1">Supervisor</p>
                                        <p className="text-[10px] font-bold text-emerald-700 truncate">{supervisors.find(s => s.id === submittedTask?.supervisorId)?.name || 'N/A'}</p>
                                    </div>
                                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-center">
                                        <p className="text-[8px] font-extrabold text-slate-400 uppercase tracking-widest mb-1">Operator</p>
                                        <p className="text-[10px] font-bold text-slate-700 truncate">{operators.find(o => o.id === submittedTask?.primaryOperatorId)?.name || 'N/A'}</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="p-6 bg-slate-50 border-t border-slate-100 grid grid-cols-2 gap-3">
                            <button 
                                onClick={() => setShowSuccessModal(false)}
                                className="px-6 py-3.5 bg-white border border-slate-200 text-slate-600 font-bold rounded-xl hover:bg-slate-100 transition-all text-sm active:scale-[0.98]"
                            >
                                Close
                            </button>
                            <button 
                                onClick={() => router.push('/')}
                                className="px-6 py-3.5 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 shadow-md shadow-indigo-200 transition-all text-sm active:scale-[0.98]"
                            >
                                Dashboard
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
