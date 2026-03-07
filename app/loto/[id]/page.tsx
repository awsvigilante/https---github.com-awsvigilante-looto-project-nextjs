'use client'

import React, { useState, useEffect, use } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
    ArrowLeft, ShieldCheck, CheckCircle2, AlertTriangle, Clock,
    Printer, Lock, UserCheck, Key, FileText, CheckSquare, Maximize, Bell, PenLine, 
    User, Mail, Phone, Camera, Shield, Eye, ExternalLink, X
} from 'lucide-react'

type LotoStatus =
    | 'AWAITING_APPROVAL'
    | 'PENDING_ISOLATION'
    | 'TAGS_PRINTED'
    | 'AWAITING_VERIFICATION'
    | 'ACTIVE'
    | 'READY_FOR_DELOT'
    | 'COMPLETED'

const INITIAL_POINTS = []

export default function LotoDetail({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params)
    const router = useRouter()
    // Simulate active role and system status for demonstration
    const [task, setTask] = useState<any>(null)
    const [points, setPoints] = useState<any[]>([])
    const [status, setStatus] = useState<string>('Pending Approval')
    const [isEditing, setIsEditing] = useState(false)
    const [isLoading, setIsLoading] = useState(true)
    const [activeUser, setActiveUser] = useState<any>(null)
    const [token, setToken] = useState('')
    const [toastMessage, setToastMessage] = useState<string | null>(null)
    const [supervisors, setSupervisors] = useState<any[]>([])

    // Modified Header Info for Editing
    const [facility, setFacility] = useState("")
    const [lockbox, setLockbox] = useState("")
    const [reason, setReason] = useState("")
    const [equipment, setEquipment] = useState("")
    const [duration, setDuration] = useState("")
    
    // Photo Mirror state
    const [showPhotoMirror, setShowPhotoMirror] = useState(false)
    const [mirrorPhotoUrl, setMirrorPhotoUrl] = useState("")
    const [mirrorTitle, setMirrorTitle] = useState("")

    useEffect(() => {
        const storedUser = localStorage.getItem('user')
        const storedToken = localStorage.getItem('token')
        if (storedUser && storedToken) {
            setActiveUser(JSON.parse(storedUser))
            setToken(storedToken)
        } else {
            router.push('/login')
        }

        // Fetch Supervisors
        fetch('/api/admin/users?role=supervisor', {
            headers: { 'Authorization': `Bearer ${storedToken}` }
        })
            .then(r => r.json())
            .then(data => setSupervisors(data))
            .catch(() => setSupervisors([]))
    }, [router])

    useEffect(() => {
        if (!token) return;
        fetch(`/api/loto/${id}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        })
            .then(r => r.json())
            .then(data => {
                if (data.error) throw new Error(data.error)
                setTask(data.task)
                setPoints(data.isolationPoints)
                setStatus(data.task.status)

                // Smart redirect: send supervisor to /verify if isolation is in progress
                const currentUserRole = JSON.parse(localStorage.getItem('user') || '{}')?.role || ''
                if (
                  data.task.status === 'Isolation In Progress' &&
                  ['supervisor', 'shift_engineer'].includes(currentUserRole)
                ) {
                  router.replace(`/loto/${id}/verify`)
                  return
                }

                // Contractor Redirect
                if (currentUserRole === 'contractor' && data.task.status === 'Isolation Verified / Active') {
                    router.replace(`/loto/${id}/contractor`)
                    return
                }

                // Set editable fields
                setFacility(data.task.facility)
                setLockbox(data.task.lockBoxNumber)
                setReason(data.task.reasonForIsolation)
                setEquipment(data.task.equipmentName)
                setDuration(data.task.expectedDuration)
                setOperatorSignature(data.task.operatorSignature || '')
                setSupervisorSignature(data.task.supervisorSignature || '')
                setMaintenanceSignature(data.task.maintenanceSignature || '')
                setFinalOperatorSignature(data.task.finalOperatorSignature || '')
            })
            .catch(err => setToastMessage(err.message))
            .finally(() => setIsLoading(false))
    }, [token, id, router])

    // Signatures
    const [operatorSignature, setOperatorSignature] = useState('')
    const [supervisorSignature, setSupervisorSignature] = useState('')
    const [maintenanceSignature, setMaintenanceSignature] = useState('')
    const [finalOperatorSignature, setFinalOperatorSignature] = useState('')

    const [lockboxEmpty, setLockboxEmpty] = useState(false)
    const [showPrintModal, setShowPrintModal] = useState(false)
    const [isUpdating, setIsUpdating] = useState(false)
    const [isRowUpdating, setIsRowUpdating] = useState(false)
    const [newComment, setNewComment] = useState('')

    const handleSaveEdit = async () => {
        setIsUpdating(true)
        try {
            const res = await fetch(`/api/loto/${id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({
                    action: 'edit',
                    facility,
                    lockBoxNumber: lockbox,
                    reasonForIsolation: reason,
                    equipmentName: equipment,
                    expectedDuration: duration,
                    isolationPoints: points.map(p => ({
                        id: p.id,
                        isolationDescription: p.isolationDescription,
                        normalPosition: p.normalPosition,
                        requiredPosition: p.requiredPosition
                    }))
                })
            })
            if (!res.ok) throw new Error("Failed to save changes")
            setToastMessage("Changes saved successfully!")
            setIsEditing(false)
        } catch (err: any) {
            setToastMessage(err.message)
        } finally {
            setIsUpdating(false)
        }
    }

    const updatePoint = async (index: number, field: string, val: string) => {
        setIsRowUpdating(true)
        setPoints(prev => {
            const newPts = [...prev]
            newPts[index] = { ...newPts[index], [field]: val }
            return newPts
        })
        
        try {
            // Persist changes to backend immediately
            if (field === 'lockOnInitial1' || field === 'lockOnInitial2') {
                const pointId = points[index]?.id
                const storedToken = localStorage.getItem('token')
                if (storedToken && pointId && task?.id) {
                    const r = await fetch(`/api/loto/${task.id}`, {
                        method: 'PATCH',
                        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${storedToken}` },
                        body: JSON.stringify({ action: 'update_point', pointId, field, value: val }),
                    })
                    const data = await r.json()
                    if (data.task) {
                        setTask(data.task)
                        setStatus(data.task.status)
                    }
                    // For lockOnInitial2: backend stamps the real name — reload isolation points
                    if (field === 'lockOnInitial2') {
                        const tok = localStorage.getItem('token')
                        if (tok && task?.id) {
                            const freshR = await fetch(`/api/loto/${task.id}`, {
                                headers: { Authorization: `Bearer ${tok}` }
                            })
                            const fresh = await freshR.json()
                            if (fresh.isolationPoints) setPoints(fresh.isolationPoints)
                        }
                    }
                }
            }
        } catch (err) {
            console.error('Failed to update row', err)
        } finally {
            setIsRowUpdating(false)
        }
    }


    const handleAction = async (action: string, payload: any = {}) => {
        setIsUpdating(true)
        try {
            const res = await fetch(`/api/loto/${id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ action, ...payload })
            })
            const data = await res.json()
            if (!res.ok) throw new Error(data.error || "Action failed")
            
            // Refresh data
            setTask(data.task)
            setStatus(data.task.status)
            setToastMessage(`Action '${action}' successful!`)
        } catch (err: any) {
            setToastMessage(err.message)
        } finally {
            setIsUpdating(false)
        }
    }

    const mapStatusToUI = (dbStatus: string): LotoStatus => {
        switch (dbStatus) {
            case 'Draft': return 'AWAITING_APPROVAL'
            case 'Pending Approval': return 'AWAITING_APPROVAL'
            case 'Approved': return 'PENDING_ISOLATION'
            case 'Verification In Progress': return 'TAGS_PRINTED'
            case 'Isolation Complete': return 'AWAITING_VERIFICATION'
            case 'Isolation Verified / Active': return 'ACTIVE'
            case 'Return to Service': return 'READY_FOR_DELOT'
            case 'Closed': return 'COMPLETED'
            default: return 'AWAITING_APPROVAL'
        }
    }

    const uiStatus = mapStatusToUI(status)

    // Roles based on DB task and current user
    const currentUserId = String(activeUser?.id || activeUser?.userId || activeUser?.uid || '').trim().toLowerCase();
    const isCreator = currentUserId !== '' && currentUserId === String(task?.creatorId || '').trim().toLowerCase()
    const isAssignedSupervisor = currentUserId !== '' && currentUserId === String(task?.supervisorId || task?.supervisor?.id || '').trim().toLowerCase()
    const isAssignedOperator = currentUserId !== '' && currentUserId === String(task?.primaryOperatorId || task?.primaryOperator?.id || '').trim().toLowerCase()
    const isAssignedApproverRole = ['shift_engineer', 'admin'].includes(activeUser?.role || '')
    const isAuthorizedApprover = (currentUserId !== '' && currentUserId === String(task?.approverId || task?.approver?.id || '').trim().toLowerCase()) || isAssignedApproverRole

    const isIsolationPhase = status === 'Approved' || status === 'Verification In Progress'
    // Stage-progressive column flags — each stage accumulates previous columns + its own
    const showOperatorCols  = ['Approved', 'Verification In Progress', 'Isolation Complete', 'Isolation Verified / Active', 'Return to Service', 'Closed'].includes(status) // Lock Details + Isolation Position
    const showLockInitial1  = ['Approved', 'Verification In Progress', 'Isolation Complete', 'Isolation Verified / Active', 'Return to Service', 'Closed'].includes(status)
    const showInitial2      = ['Verification In Progress', 'Isolation Complete', 'Isolation Verified / Active', 'Return to Service', 'Closed'].includes(status)
    const showRTS           = ['Return to Service', 'Closed'].includes(status)
    const canSeeDetails = status !== 'Pending Approval' || isAuthorizedApprover || isCreator

    const supervisorHasSigned = ['Isolation Verified / Active', 'Return to Service', 'Closed'].includes(status)
    // Only the assigned supervisor can verify Lock on Initial #2
    // Role check catches both 'supervisor' and 'shift_engineer' roles
    const isSupervisorRole = ['supervisor', 'shift_engineer'].includes(activeUser?.role || '')
    const canSupervisorVerify = status === 'Verification In Progress' && (isAssignedSupervisor || isSupervisorRole)

    // Operator can ONLY edit when status is exactly 'Approved' — once signed (Verification In Progress), all their fields lock
    const canExecuteIsolation = status === 'Approved' && (isCreator || isAssignedOperator)

    const updatePointLock = (index: number, val: string) => {
        setPoints(prev => {
            const newPts = [...prev]
            newPts[index] = { ...newPts[index], lockNumber: val }
            return newPts
        })
    }

    const handlePrintTags = () => {
        const tok = localStorage.getItem('token')
        if (!tok) { alert("Not logged in"); return }
        const taskId = task?.id
        if (!taskId) return
        // Open the print page directly — token passed as query param so the browser
        // can open it as a standalone authenticated page and auto-trigger print dialog.
        window.open(`/api/loto/${taskId}/tags?token=${encodeURIComponent(tok)}`, '_blank')
    }
    const confirmPrint = () => {
        setShowPrintModal(false)
        handleAction('tags_attached')
    }

    const HeaderBadge = () => {
        switch (status) {
            case 'Pending Approval': return <span className="bg-yellow-100 text-yellow-800 border-yellow-200 border px-3 py-1 rounded-full text-xs font-bold uppercase flex items-center gap-1.5"><Clock className="w-3.5 h-3.5" /> Approval Pending</span>
            case 'Approved': return <span className="bg-blue-100 text-blue-800 border-blue-200 border px-3 py-1 rounded-full text-xs font-bold uppercase flex items-center gap-1.5"><Lock className="w-3.5 h-3.5" /> Execution Required</span>
            case 'Verification In Progress': return <span className="bg-purple-100 text-purple-800 border-purple-200 border px-3 py-1 rounded-full text-xs font-bold uppercase flex items-center gap-1.5"><UserCheck className="w-3.5 h-3.5" /> Awaiting Verification</span>
            case 'Isolation Complete': return <span className="bg-purple-100 text-purple-800 border-purple-200 border px-3 py-1 rounded-full text-xs font-bold uppercase flex items-center gap-1.5"><UserCheck className="w-3.5 h-3.5" /> Supervisor Verification</span>
            case 'Isolation Verified / Active': return <span className="bg-emerald-100 text-emerald-800 border-emerald-500 border-2 px-3 py-1 rounded-full text-xs font-bold uppercase flex items-center gap-1.5"><ShieldCheck className="w-3.5 h-3.5 text-emerald-600" /> Safe To Work</span>
            case 'Return to Service': return <span className="bg-red-100 text-red-800 border-red-500 border-2 px-3 py-1 rounded-full text-xs font-bold uppercase flex items-center gap-1.5"><Key className="w-3.5 h-3.5" /> Return to Service</span>
            case 'Closed': return <span className="bg-gray-200 text-gray-700 border-gray-300 border px-3 py-1 rounded-full text-xs font-bold uppercase flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5" /> Archived</span>
            default: return null;
        }
    }

    return (
        <div className="min-h-screen bg-[#F8FAFC] text-slate-800 pb-32 selection:bg-indigo-100 selection:text-indigo-900">
            {/* Simulator Control Panel - REMOVED */}

            {/* Simulated Push Notification Toast (The "Nudge" System) */}
            {toastMessage && (
                <div className="fixed bottom-6 right-6 z-[100] bg-slate-900 border-l-4 border-indigo-500 text-white p-4 rounded-xl shadow-2xl animate-in slide-in-from-bottom-5 fade-in duration-300 flex items-start gap-4 max-w-sm">
                    <Bell className="w-5 h-5 text-indigo-400 mt-0.5 shrink-0" />
                    <div>
                        <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest mb-1">System Notification</p>
                        <p className="text-sm font-medium leading-relaxed">{toastMessage}</p>
                    </div>
                </div>
            )}

            {/* Top Level Progress Stepper - Modernized */}
            <div className="bg-white border-b border-indigo-100/50 py-4 px-4 overflow-x-auto shadow-sm">
                <div className="max-w-5xl mx-auto flex items-center justify-between min-w-[600px]">
                    {[
                        { step: 'Creation', active: false, done: true },
                        { step: 'Approval', active: status === 'Pending Approval', done: status !== 'Pending Approval' && status !== 'Draft' },
                        { step: 'Isolation', active: status === 'Approved', done: ['Verification In Progress','Isolation Complete','Isolation Verified / Active','Return to Service','Closed'].includes(status) },
                        { step: 'Verification', active: status === 'Verification In Progress', done: ['Isolation Verified / Active','Return to Service','Closed'].includes(status) },
                        { step: 'Contractor', active: status === 'Isolation Verified / Active', done: status === 'Return to Service' || status === 'Closed' },
                        { step: 'Delot', active: status === 'Return to Service', done: status === 'Closed' }
                    ].map((s, idx, arr) => (
                        <React.Fragment key={s.step}>
                            <div className="flex flex-col items-center">
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-extrabold transition-all duration-300 ${s.active ? 'bg-indigo-600 text-white ring-8 ring-indigo-50 shadow-md shadow-indigo-500/20 scale-110' : s.done ? 'bg-emerald-500 text-white shadow-sm' : 'bg-slate-100 text-slate-400 border border-slate-200'}`}>
                                    {s.done ? <CheckCircle2 className="w-4 h-4" /> : idx + 1}
                                </div>
                                <span className={`text-[10px] sm:text-xs mt-3 font-extrabold uppercase tracking-widest transition-colors ${s.active ? 'text-indigo-600' : s.done ? 'text-emerald-600' : 'text-slate-400'}`}>{s.step}</span>
                            </div>
                            {idx < arr.length - 1 && (
                                <div className={`flex-1 h-1.5 mx-3 rounded-full transition-colors duration-300 ${s.done ? 'bg-emerald-500' : 'bg-slate-100'}`} />
                            )}
                        </React.Fragment>
                    ))}
                </div>
            </div>

            {/* Glassmorphism Header */}
            <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-xl px-4 py-4 md:px-8 shadow-sm border-b border-indigo-100/50">
                <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                        <Link href="/" className="rounded-xl p-2.5 hover:bg-slate-100 text-slate-500 hover:text-slate-900 transition-colors">
                            <ArrowLeft className="h-5 w-5 md:h-6 md:w-6" />
                        </Link>
                        <div>
                            <h1 className="text-xl md:text-2xl font-extrabold tracking-tight text-slate-900 leading-none mb-1">{task?.lotoId}</h1>
                            <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">{task?.equipmentName}</span>
                        </div>
                    </div>

                    <div className="flex items-center gap-3 flex-wrap justify-end">
                        {/* Dynamic Status Badge */}
                        <div className={`px-5 py-2.5 rounded-full border-2 text-xs font-extrabold uppercase tracking-widest text-center shadow-sm
                            ${status === 'Pending Approval' || status === 'Isolation Complete' ? 'bg-amber-50 text-amber-700 border-amber-200 shadow-amber-500/10' : ''}
                            ${status === 'Isolation Verified / Active' || status === 'Approved' ? 'bg-emerald-50 text-emerald-700 border-emerald-200 shadow-emerald-500/10' : ''}
                            ${status === 'Return to Service' ? 'bg-red-50 text-red-700 border-red-200 shadow-red-500/10' : ''}
                            ${status === 'Draft' || status === 'Verification In Progress' || status === 'Closed' ? 'bg-slate-50 text-slate-700 border-slate-200' : ''}
                        `}>
                            STATUS: {status}
                        </div>

                        {/* User + Logout */}
                        <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 shadow-sm">
                            <div className="w-7 h-7 rounded-full bg-indigo-600 flex items-center justify-center text-white text-[11px] font-black uppercase">
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
            </header>

            <main className="mx-auto max-w-7xl px-4 py-8 md:px-8 space-y-8">

                {/* LOTO Header Information */}
                <section className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden text-sm">
                    {isCreator && (status === 'Draft' || status === 'Pending Approval') && (
                        <div className="bg-gradient-to-r from-indigo-50 to-slate-50 border-b border-indigo-100 px-6 py-4 flex items-center justify-between">
                            <span className="text-xs font-black text-indigo-800 uppercase tracking-widest flex items-center gap-2">
                                <FileText className="w-4 h-4 text-indigo-500" /> Creator Tools
                            </span>
                            {isEditing ? (
                                <div className="flex gap-3">
                                    <button 
                                        onClick={() => setIsEditing(false)}
                                        className="text-xs font-extrabold text-slate-600 hover:text-slate-900 bg-white border border-slate-300 px-6 py-2 rounded-xl shadow-sm hover:bg-slate-50 transition-all uppercase tracking-widest"
                                    >
                                        Cancel
                                    </button>
                                    <button 
                                        onClick={handleSaveEdit}
                                        disabled={isUpdating}
                                        className="text-xs font-black text-white bg-emerald-600 hover:bg-emerald-700 px-6 py-2 rounded-xl shadow-md shadow-emerald-500/20 active:scale-95 transition-all uppercase tracking-widest disabled:opacity-50"
                                    >
                                        {isUpdating ? 'Saving...' : 'Save Changes'}
                                    </button>
                                </div>
                            ) : (
                                <button 
                                    onClick={() => setIsEditing(true)}
                                    className="text-xs font-black text-white bg-indigo-600 hover:bg-indigo-700 px-6 py-2.5 rounded-xl shadow-lg shadow-indigo-500/30 active:scale-95 transition-all uppercase tracking-widest ring-4 ring-indigo-600/20"
                                >
                                    Edit LOTO Info
                                </button>
                            )}
                        </div>
                    )}
                    <div className="grid grid-cols-1 md:grid-cols-3 w-full divide-y md:divide-y-0 md:divide-x divide-slate-100 border-b border-slate-100 bg-slate-50">
                        <div className="p-4 md:p-5 flex justify-between items-center">
                            <span className="text-[10px] uppercase font-extrabold text-slate-500 tracking-widest">Operator (Isolation)</span>
                            <span className="text-xs font-bold text-slate-900 bg-white px-3 py-1.5 rounded-lg border shadow-sm">{task?.primaryOperator?.name || 'N/A'}</span>
                        </div>
                        <div className="p-4 md:p-5 flex justify-between items-center">
                            <span className="text-[10px] uppercase font-extrabold text-slate-500 tracking-widest">Supervisor (Verify)</span>
                            <span className="text-xs font-bold text-slate-900 bg-white px-3 py-1.5 rounded-lg border shadow-sm">{task?.supervisor?.name || 'N/A'}</span>
                        </div>
                        <div className="p-4 md:p-5 flex justify-between items-center">
                            <span className="text-[10px] uppercase font-extrabold text-slate-500 tracking-widest">Shift Engineer (Approve)</span>
                            <span className="text-xs font-bold text-slate-900 bg-white px-3 py-1.5 rounded-lg border shadow-sm">{task?.approver?.name || 'N/A'}</span>
                        </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-4 w-full divide-y md:divide-y-0 md:divide-x divide-slate-100">
                        <div className="p-5 md:p-6 bg-slate-50/50 flex flex-col justify-center">
                            <p className="text-[10px] font-extrabold text-slate-500 uppercase tracking-widest mb-2">Lockbox / Duration</p>
                            {isEditing ? (
                                <div className="space-y-2">
                                    <input placeholder="Lockbox #" value={lockbox} onChange={e => setLockbox(e.target.value)} className="w-full rounded-lg border border-slate-200 p-2 text-xs font-bold" />
                                    <input placeholder="Duration e.g. 2 Days" value={duration} onChange={e => setDuration(e.target.value)} className="w-full rounded-lg border border-slate-200 p-2 text-xs font-bold" />
                                </div>
                            ) : (
                                <div className="space-y-1">
                                    <p className="font-extrabold text-slate-900 text-sm">#{lockbox}</p>
                                    <p className="text-xs font-bold text-slate-600">{duration}</p>
                                </div>
                            )}
                        </div>
                        <div className="p-5 md:p-6 md:col-span-2 bg-white flex flex-col justify-center">
                            <p className="text-[10px] font-extrabold text-slate-500 uppercase tracking-widest mb-2">Reason for Isolation</p>
                            {isEditing ? (
                                <textarea 
                                    title="Reason for Isolation"
                                    placeholder="Enter reason..."
                                    value={reason} 
                                    onChange={e => setReason(e.target.value)}
                                    className="w-full rounded-lg border border-slate-200 p-2 text-xs font-bold focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 outline-none h-20"
                                />
                            ) : (
                                <p className="font-extrabold text-slate-900 text-sm leading-relaxed">{reason}</p>
                            )}
                        </div>
                        <div className="p-5 md:p-6 bg-slate-50 flex flex-col md:items-end md:text-right">
                            <p className="text-[10px] font-extrabold text-slate-500 uppercase tracking-widest mb-2">RTM Number</p>
                            <p className="font-bold text-slate-900 bg-white px-3 py-1.5 rounded-lg border border-slate-200 inline-flex shadow-sm uppercase">{task?.redTagMasterNo || 'N/A'}</p>
                        </div>
                    </div>
                </section>

                {/* Isolation Table & Actions - Role Restricted Visibility */}
                {!canSeeDetails ? (
                    <section className="rounded-2xl border border-slate-200 bg-white p-12 text-center shadow-sm">
                        <div className="max-w-md mx-auto">
                            <div className="w-16 h-16 bg-slate-50 text-slate-300 rounded-2xl flex items-center justify-center mx-auto mb-6 border border-slate-100">
                                <FileText className="w-8 h-8" />
                            </div>
                            <h3 className="text-lg font-extrabold text-slate-900 mb-2">Isolation Details Restricted</h3>
                            <p className="text-sm font-medium text-slate-500 leading-relaxed">
                                Full isolation details are hidden until the <span className="text-indigo-600 font-bold">Shift Engineer</span> approves this LOTO plan. 
                                {isCreator && " Use 'Edit LOTO Info' above to review or modify your plan."}
                            </p>
                        </div>
                    </section>
                ) : (
                    <>
                        {/* Isolation Table */}
                        <section className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden animate-in fade-in slide-in-from-top-2 duration-300">
                            <div className="border-b border-slate-100 bg-slate-50/80 px-6 py-5">
                                <h2 className="text-sm font-extrabold text-slate-900 uppercase tracking-widest flex items-center gap-2">
                                    <div className="w-1.5 h-4 bg-indigo-500 rounded-full"></div>
                                    Isolation Points ({points.length})
                                </h2>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full text-left">
                                    <thead className="border-b-2 border-slate-100 bg-slate-50/60">
                                        <tr>
                                            <th className="px-4 py-3.5 text-[10px] font-extrabold text-slate-400 uppercase tracking-widest w-10 text-center">#</th>
                                            <th className="px-4 py-3.5 text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">Description</th>
                                            <th className="px-4 py-3.5 text-[10px] font-extrabold text-slate-400 uppercase tracking-widest w-32">Normal</th>
                                            <th className="px-4 py-3.5 text-[10px] font-extrabold text-slate-400 uppercase tracking-widest w-32">Required</th>
                                            {showOperatorCols && <th className="px-4 py-3.5 text-[10px] font-extrabold text-slate-400 uppercase tracking-widest w-28">Lock No.</th>}
                                            {showOperatorCols && <th className="px-4 py-3.5 text-[10px] font-extrabold text-slate-400 uppercase tracking-widest w-36">Isolated Position</th>}
                                            {showLockInitial1 && <th className="px-4 py-3.5 text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">Lock on Initial #1</th>}
                                            {showInitial2 && <th className={`px-4 py-3.5 text-[10px] font-extrabold uppercase tracking-widest ${canSupervisorVerify ? 'text-purple-500' : 'text-slate-400'}`}>Lock on Initial #2</th>}
                                            {showRTS && <th className="px-4 py-3.5 text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">RTS Initial</th>}
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {points.map((p, i) => (
                                            <tr key={p.id} className="hover:bg-slate-50/60 transition-colors group">
                                                {/* Tag number */}
                                                <td className="px-4 py-4 text-center">
                                                    <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-slate-100 text-[11px] font-black text-slate-500">{p.tagNo}</span>
                                                </td>
                                                {/* Description — text only */}
                                                <td className="px-4 py-4">
                                                    {isEditing ? (
                                                        <input 
                                                            title="Description"
                                                            value={p.isolationDescription} 
                                                            onChange={e => updatePoint(i, 'isolationDescription', e.target.value)} 
                                                            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-900 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 outline-none" 
                                                        />
                                                    ) : (
                                                        <span className="font-bold text-slate-900 text-sm leading-snug">{p.isolationDescription || <span className="text-slate-300 italic font-normal">No description</span>}</span>
                                                    )}
                                                </td>
                                                {/* Normal Position — own column, always visible */}
                                                <td className="px-4 py-4">
                                                    <span className="inline-flex rounded-md bg-slate-100 px-3 py-1 text-[11px] font-bold text-slate-600 border border-slate-200 uppercase tracking-wide">{p.normalPosition || '—'}</span>
                                                </td>
                                                {/* Required Position — own column, editable in edit mode */}
                                                <td className="px-4 py-4">
                                                    {isEditing ? (
                                                        <select title="Required Position" value={p.requiredPosition} onChange={e => updatePoint(i, 'requiredPosition', e.target.value)} className="rounded-lg border-2 border-amber-300 bg-amber-50 px-2 py-1.5 text-[11px] font-bold text-amber-800 outline-none cursor-pointer">
                                                            <option value="CLOSE">Close</option>
                                                            <option value="OPEN">Open</option>
                                                            <option value="INSTALLED">Installed</option>
                                                            <option value="REMOVED">Removed</option>
                                                        </select>
                                                    ) : (
                                                        <span className="inline-flex rounded-md bg-amber-50 px-3 py-1 text-[11px] font-bold text-amber-700 border border-amber-200 uppercase tracking-wide shadow-sm">{p.requiredPosition || '—'}</span>
                                                    )}
                                                </td>
                                                {/* Lock No. — visible from Approved onwards */}
                                                {showOperatorCols && (
                                                    <td className="px-4 py-4">
                                                        {canExecuteIsolation ? (
                                                            <select
                                                                title="Lock Number"
                                                                value={p.lockNumber || ''}
                                                                onChange={(e) => updatePoint(i, 'lockNumber', e.target.value)}
                                                                disabled={!!p.lockOnInitial1}
                                                                className={`w-full rounded-lg border-2 px-3 py-2 text-sm font-extrabold text-slate-800 focus:border-indigo-500 outline-none cursor-pointer transition-all ${p.lockOnInitial1 ? 'border-slate-200 bg-slate-50 opacity-60 cursor-not-allowed' : 'border-slate-300 bg-white'}`}
                                                            >
                                                                <option value="">Lock #...</option>
                                                                {Array.from({ length: 50 }, (_, k) => k + 1).map(n => (
                                                                    <option key={n} value={String(n)}>{n}</option>
                                                                ))}
                                                            </select>
                                                        ) : (
                                                            <span className={`font-bold text-sm px-3 py-1.5 rounded-lg border shadow-sm ${p.lockNumber ? 'bg-slate-50 text-slate-900 border-slate-200' : 'text-slate-300 border-slate-100 italic text-xs'}`}>
                                                                {p.lockNumber || '—'}
                                                            </span>
                                                        )}
                                                    </td>
                                                )}
                                                {/* Actual Position — visible from Approved onwards */}
                                                {showOperatorCols && (
                                                    <td className="px-4 py-4">
                                                        {canExecuteIsolation ? (
                                                            <select
                                                                title="Isolated Position"
                                                                value={p.isolationPosition || ''}
                                                                onChange={e => updatePoint(i, 'isolationPosition', e.target.value)}
                                                                disabled={!!p.lockOnInitial1}
                                                                className={`w-full rounded-lg border-2 p-2.5 text-sm font-extrabold text-slate-800 focus:border-indigo-500 outline-none shadow-sm cursor-pointer transition-all ${p.lockOnInitial1 ? 'border-slate-200 bg-slate-50 opacity-60 cursor-not-allowed' : 'border-indigo-300 bg-indigo-50'}`}
                                                            >
                                                                <option value="">Select...</option>
                                                                <option value="CLOSE">Close</option>
                                                                <option value="OPEN">Open</option>
                                                                <option value="INSTALLED">Installed</option>
                                                                <option value="REMOVED">Removed</option>
                                                            </select>
                                                        ) : (
                                                            <span className={`inline-flex rounded-md px-2.5 py-1 text-[10px] font-extrabold border uppercase tracking-widest shadow-sm ${p.isolationPosition ? 'bg-indigo-50 text-indigo-700 border-indigo-200' : 'bg-slate-50 text-slate-300 border-slate-100 italic'}`}>
                                                                {p.isolationPosition || '—'}
                                                            </span>
                                                        )}
                                                    </td>
                                                )}
                                                {/* Lock on Initial #1 — visible from Isolation In Progress onwards */}
                                                {showLockInitial1 && (
                                                <td className="px-4 py-4">
                                                    {p.lockOnInitial1 ? (
                                                        <div className="flex items-center gap-3">
                                                            <div className="inline-flex flex-col">
                                                                <span className="text-[10px] font-extrabold text-slate-600 uppercase bg-emerald-50 px-2.5 py-1 rounded-md border border-emerald-200 flex items-center gap-1.5 shadow-sm">
                                                                    <UserCheck className="w-3 h-3 text-emerald-500" /> {p.lockOnInitial1.split(' – ')[0]}
                                                                </span>
                                                                <span className="text-[9px] text-slate-400 font-bold tracking-wider mt-1">{p.lockOnInitial1.split(' – ')[1]}</span>
                                                            </div>
                                                            {canExecuteIsolation && (
                                                                <button
                                                                    onClick={() => updatePoint(i, 'lockOnInitial1', '')}
                                                                    disabled={isRowUpdating}
                                                                    className={`px-4 py-2 text-xs font-black text-white rounded-lg transition-all border border-red-600 uppercase tracking-widest shadow-md shadow-red-500/20 active:scale-95 ${isRowUpdating ? 'bg-slate-400 cursor-wait' : 'bg-red-500 hover:bg-red-600'}`}
                                                                    title="Edit Initial"
                                                                >
                                                                    ✎ Edit
                                                                </button>
                                                            )}
                                                        </div>
                                                    ) : (
                                                        canExecuteIsolation ? (
                                                            <button
                                                                onClick={() => {
                                                                    const name = activeUser?.name || 'Operator'
                                                                    const now = new Date().toLocaleString("en-CA", { hour12: false }).replace(',', '')
                                                                    updatePoint(i, 'lockOnInitial1', `${name} – ${now}`)
                                                                }}
                                                                disabled={!p.lockNumber || !p.isolationPosition || isRowUpdating}
                                                                title={!p.lockNumber ? 'Set Lock No. first' : !p.isolationPosition ? 'Set Isolated Position first' : 'Click to sign'}
                                                                className={`text-sm font-black text-white px-6 py-2.5 rounded-xl shadow-lg active:scale-95 transition-all uppercase tracking-widest border disabled:opacity-40 disabled:cursor-wait disabled:shadow-none ${isRowUpdating ? 'bg-slate-400 border-slate-400' : 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-500/30 border-indigo-700'}`}
                                                            >
                                                                ✓ Done
                                                            </button>
                                                        ) : (
                                                            <span className="text-[10px] text-slate-300 font-extrabold uppercase italic px-4">—</span>
                                                        )
                                                    )}
                                                </td>
                                                )}
                                                {showInitial2 && (
                                                    <td className="px-6 py-4">
                                                        {p.lockOnInitial2 ? (
                                                            <div className="flex items-center gap-3">
                                                                <div className="inline-flex flex-col">
                                                                    <span className="text-[10px] font-extrabold text-slate-600 uppercase bg-purple-50 px-2.5 py-1 rounded-md border border-purple-200 flex items-center gap-1.5 shadow-sm">
                                                                        <UserCheck className="w-3 h-3 text-purple-500" /> {p.lockOnInitial2.split(' – ')[0]}
                                                                    </span>
                                                                    <span className="text-[9px] text-slate-400 font-bold tracking-wider mt-1">{p.lockOnInitial2.split(' – ')[1]}</span>
                                                                </div>
                                                                {canSupervisorVerify && !supervisorHasSigned && (
                                                                    <button
                                                                        onClick={() => updatePoint(i, 'lockOnInitial2', '')}
                                                                        disabled={isRowUpdating}
                                                                        className={`px-4 py-2 text-xs font-black text-white rounded-lg transition-all border border-red-600 uppercase tracking-widest shadow-md shadow-red-500/20 active:scale-95 ${isRowUpdating ? 'bg-slate-400 cursor-wait' : 'bg-red-500 hover:bg-red-600'}`}
                                                                        title="Edit Supervisor Initial"
                                                                    >
                                                                        ✎ Edit
                                                                    </button>
                                                                )}
                                                            </div>
                                                        ) : canSupervisorVerify ? (
                                                            <button
                                                                onClick={() => {
                                                                    // Send truthy signal — backend stamps real name from JWT
                                                                    updatePoint(i, 'lockOnInitial2', 'sign')
                                                                }}
                                                                disabled={isRowUpdating}
                                                                className={`text-sm font-black text-white px-6 py-2.5 rounded-xl shadow-lg active:scale-95 transition-all uppercase tracking-widest border ${isRowUpdating ? 'bg-slate-400 border-slate-400 cursor-wait shadow-none' : 'bg-purple-600 hover:bg-purple-700 shadow-purple-500/30 border-purple-700'}`}
                                                            >
                                                                ✓ Verify
                                                            </button>
                                                        ) : (
                                                            <span className="text-[10px] text-slate-300 font-extrabold uppercase italic px-4">—</span>
                                                        )}
                                                    </td>
                                                )}
                                                {showRTS && (
                                                    <td className="px-6 py-4 text-right">
                                                        {status === 'READY_FOR_DELOT' ? (
                                                            <input
                                                                title="Returned to Service Initial"
                                                                type="text"
                                                                placeholder="Initial..."
                                                                value={p.returnedToServiceInitial || ''}
                                                                onChange={(e) => updatePoint(i, 'returnedToServiceInitial', e.target.value)}
                                                                className="w-full rounded-lg border border-slate-200 p-2 text-xs font-bold focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 outline-none"
                                                            />
                                                        ) : (
                                                            <span className="text-[10px] text-slate-300 font-extrabold uppercase italic px-4">
                                                                {p.returnedToServiceInitial || '—'}
                                                            </span>
                                                        )}
                                                    </td>
                                                )}
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </section>
                        
                        {/* Crew Tracking Section — Shared with Contractor Portal */}
                        {['Approved', 'Verification In Progress', 'Isolation Complete', 'Isolation Verified / Active', 'Return to Service', 'Closed'].includes(status) && (
                            <section className="rounded-2xl border border-blue-200 bg-white shadow-sm overflow-hidden animate-in fade-in slide-in-from-top-4 duration-500 delay-150">
                                <div className="bg-gradient-to-r from-blue-50 to-slate-50/50 px-6 py-5 border-b border-blue-100 flex items-center justify-between">
                                    <h2 className="text-sm font-extrabold text-slate-900 uppercase tracking-widest flex items-center gap-2">
                                        <div className="w-1.5 h-4 bg-blue-500 rounded-full"></div>
                                        Crew Tracking <span className="text-blue-500 ml-1">({task?.contractorLocks?.length || 0})</span>
                                    </h2>
                                    <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400 uppercase tracking-tight">
                                        <Shield className="h-3 w-3" /> Real-time status
                                    </div>
                                </div>
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left">
                                        <thead className="bg-slate-50/50 border-b border-slate-100">
                                            <tr>
                                                <th className="px-6 py-4 text-[10px] font-black uppercase text-slate-500 tracking-widest shrink-0">Identity</th>
                                                <th className="px-6 py-4 text-[10px] font-black uppercase text-slate-500 tracking-widest">Trade \ Contact</th>
                                                <th className="px-6 py-4 text-[10px] font-black uppercase text-slate-500 tracking-widest">LOCK ON</th>
                                                <th className="px-6 py-4 text-[10px] font-black uppercase text-slate-500 tracking-widest text-right">LOCK OFF</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100">
                                            {(!task?.contractorLocks || task.contractorLocks.length === 0) ? (
                                                <tr>
                                                    <td colSpan={4} className="px-6 py-12 text-center">
                                                        <div className="flex flex-col items-center opacity-40">
                                                            <User className="h-10 w-10 mb-2 text-slate-300" />
                                                            <p className="text-xs font-black uppercase tracking-widest text-slate-400">No one signed on yet</p>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ) : (
                                                task.contractorLocks.map((lock: any) => (
                                                    <tr key={lock.id} className="hover:bg-blue-50/20 transition-all group">
                                                        <td className="px-6 py-5 shrink-0">
                                                            <div className="flex items-center gap-4">
                                                                <div 
                                                                    className="h-14 w-14 rounded-2xl bg-slate-100 border-2 border-slate-50 overflow-hidden relative shadow-sm group-hover:shadow-md transition-all cursor-zoom-in"
                                                                    onClick={() => {
                                                                        setMirrorPhotoUrl(lock.lockOnPhoto || "");
                                                                        setMirrorTitle(lock.contractorName || "Contractor");
                                                                        setShowPhotoMirror(true);
                                                                    }}
                                                                >
                                                                    {lock.lockOnPhoto ? (
                                                                        <img src={lock.lockOnPhoto} alt="ID" className="h-full w-full object-cover group-hover:scale-110 transition-transform" />
                                                                    ) : (
                                                                        <div className="h-full w-full flex items-center justify-center text-slate-300">
                                                                            <User className="h-6 w-6" />
                                                                        </div>
                                                                    )}
                                                                </div>
                                                                <div>
                                                                    <div className="font-black text-slate-900 text-sm tracking-tight leading-none mb-1">{lock.contractorName}</div>
                                                                    <div className="text-[10px] text-emerald-600 font-extrabold uppercase tracking-wide flex items-center gap-1">
                                                                        <CheckCircle2 className="h-2.5 w-2.5" /> Identity Verified
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </td>
                                                        <td className="px-6 py-5">
                                                            <div className="space-y-1">
                                                                <div className="font-bold text-slate-700 text-xs">{lock.trade || 'Worker'}</div>
                                                                <div className="text-[10px] text-slate-400 font-bold flex flex-col gap-0.5">
                                                                    <div className="flex items-center gap-2">
                                                                        <Mail className="h-3 w-3" /> {lock.contractorEmail || 'N/A'}
                                                                    </div>
                                                                    {lock.contractorPhone && (
                                                                        <div className="flex items-center gap-2">
                                                                            <Phone className="h-3 w-3" /> {lock.contractorPhone}
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </td>
                                                        <td className="px-6 py-5">
                                                            <div className="inline-flex flex-col items-center">
                                                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 flex items-center gap-1.5">
                                                                    <Clock className="h-3 w-3" /> {new Date(lock.lockedOnAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                                </span>
                                                                <div 
                                                                    className="h-10 w-24 rounded-lg bg-slate-50 border border-slate-200 overflow-hidden relative group/sign hover:border-slate-300 transition-all cursor-zoom-in shadow-inner"
                                                                    onClick={() => {
                                                                        setMirrorPhotoUrl(lock.lockOnSignature || "");
                                                                        setMirrorTitle(`Sign-on: ${lock.contractorName}`);
                                                                        setShowPhotoMirror(true);
                                                                    }}
                                                                >
                                                                    {lock.lockOnSignature && <img src={lock.lockOnSignature} alt="Sign" className="h-full w-full object-contain grayscale" />}
                                                                    {!lock.lockOnSignature && <div className="h-full w-full flex items-center justify-center text-[10px] font-bold text-slate-400">SIGN-ON</div>}
                                                                </div>
                                                                <div className="text-[9px] font-black text-emerald-600 uppercase mt-1">
                                                                    Active
                                                                </div>
                                                            </div>
                                                        </td>
                                                        <td className="px-6 py-5 text-right">
                                                            {lock.lockedOffAt ? (
                                                                <div className="inline-flex flex-col items-end opacity-60">
                                                                    <span className="text-[9px] font-extrabold text-blue-500 uppercase tracking-widest mb-1">
                                                                        LOCK OFF: {new Date(lock.lockedOffAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                                    </span>
                                                                    <div 
                                                                        className="h-10 w-24 rounded-lg bg-slate-50 border border-slate-200 overflow-hidden relative group/sign hover:border-slate-300 transition-all cursor-zoom-in shadow-inner"
                                                                        onClick={() => {
                                                                            setMirrorPhotoUrl(lock.lockOffSignature || "");
                                                                            setMirrorTitle(`Sign-off: ${lock.contractorName}`);
                                                                            setShowPhotoMirror(true);
                                                                        }}
                                                                    >
                                                                        {lock.lockOffSignature && <img src={lock.lockOffSignature} alt="Sign" className="h-full w-full object-contain grayscale" />}
                                                                        {!lock.lockOffSignature && <div className="h-full w-full flex items-center justify-center text-[10px] font-bold text-slate-400">SIGN-OFF</div>}
                                                                    </div>
                                                                    <div className="text-[9px] font-black text-slate-500 uppercase mt-1">
                                                                        {lock.lockOffType === 'Self' ? 'Verified Entry' : lock.lockOffType}
                                                                    </div>
                                                                </div>
                                                            ) : (
                                                                <div className="inline-flex flex-col items-end">
                                                                    <div className="h-10 w-24 rounded-lg bg-slate-50/50 border border-dashed border-slate-200 flex items-center justify-center text-[10px] font-bold text-amber-500 tracking-widest uppercase animate-pulse">
                                                                        Not Active
                                                                    </div>
                                                                </div>
                                                            )}
                                                        </td>
                                                    </tr>
                                                ))
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </section>
                        )}

                {/* Contextual Actions Panel */}
                {status === 'Pending Approval' && (isAuthorizedApprover || isCreator) && (
                    <div className="rounded-2xl border border-amber-200/60 bg-gradient-to-br from-amber-50 to-orange-50/30 p-6 md:p-8 shadow-sm">
                        <div className="flex items-start gap-4 mb-4">
                            <div className="bg-amber-100 p-2.5 rounded-xl text-amber-600 shadow-sm">
                                <FileText className="w-6 h-6" />
                            </div>
                            <div>
                                <h3 className="text-xl font-extrabold text-slate-900 tracking-tight leading-none mb-1">Approval & Discussion</h3>
                                <p className="text-sm font-medium text-slate-600 mt-1">
                                    {isAuthorizedApprover 
                                        ? <>Reviewing isolation plan for <span className="text-indigo-600 font-bold">{task?.creator?.name}</span>. Exchange notes or request changes.</>
                                        : <>Discuss this isolation plan with the assigned Approver (<span className="text-indigo-600 font-bold">{task?.approver?.name}</span>).</>
                                    }
                                </p>
                            </div>
                        </div>

                        {/* Existing Comments */}
                        {task?.comments && task.comments.length > 0 && (
                            <div className="mb-6 space-y-3 max-h-60 overflow-y-auto">
                                {task.comments.map((c: any, i: number) => (
                                    <div key={i} className={`p-4 rounded-xl border shadow-sm ${c.authorRole === 'shift_engineer' ? 'bg-amber-50 border-amber-200 text-amber-900' : 'bg-white border-slate-200 text-slate-800'}`}>
                                        <div className="flex items-center gap-2 mb-2 text-[10px] font-extrabold uppercase tracking-widest opacity-80 border-b border-black/5 pb-2">
                                            <span>{c.author}</span>
                                            <span className="bg-black/5 px-2 py-0.5 rounded-md">{c.authorRole}</span>
                                            <span className="ml-auto opacity-70">{new Date(c.timestamp).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}</span>
                                        </div>
                                        <p className="text-sm font-semibold whitespace-pre-wrap">{c.text}</p>
                                    </div>
                                ))}
                            </div>
                        )}

                        <div className="flex flex-col gap-3 mb-6">
                            <textarea
                                value={newComment}
                                onChange={(e) => setNewComment(e.target.value)}
                                placeholder="Type a message or requested change..."
                                className="w-full rounded-xl border border-slate-300 bg-white p-4 text-sm font-medium focus:border-amber-500 focus:ring-4 focus:ring-amber-500/10 shadow-sm transition-all focus:outline-none resize-none h-20"
                            />
                            <div className="flex justify-end">
                                <button
                                    onClick={() => {
                                        handleAction('add_comment', { text: newComment });
                                        setNewComment('');
                                    }}
                                    disabled={!newComment.trim() || isUpdating}
                                    className="rounded-xl border border-slate-300 bg-white px-6 py-2.5 font-extrabold text-slate-700 hover:bg-slate-50 active:scale-95 transition-all shadow-sm uppercase tracking-widest text-xs disabled:opacity-50"
                                >
                                    Post Comment
                                </button>
                            </div>
                        </div>
                        
                        {isAuthorizedApprover && (
                            <button 
                                disabled={isUpdating}
                                onClick={() => handleAction('approve')}
                                className="w-full md:w-auto rounded-xl bg-amber-400 px-8 py-3.5 text-sm font-extrabold text-amber-950 hover:bg-amber-500 active:scale-95 transition-all shadow-md shadow-amber-400/20 uppercase tracking-widest disabled:opacity-50"
                            >
                                Approve Isolation Plan
                            </button>
                        )}
                    </div>
                )}

                {isIsolationPhase && (
                                    <div className="space-y-4">


                                        {/* Operator action panel — only when status is Approved */}
                                        {status === 'Approved' && (
                                            <div className="rounded-2xl border border-indigo-200/60 bg-gradient-to-br from-indigo-50 to-blue-50/30 p-6 md:p-8 shadow-sm">
                                                <div className="flex items-start gap-4 mb-4">
                                                    <div className="bg-indigo-100 p-2.5 rounded-xl text-indigo-600 shadow-sm">
                                                        <Lock className="w-6 h-6" />
                                                    </div>
                                                    <div>
                                                        <h3 className="text-xl font-extrabold text-slate-900 tracking-tight leading-none mb-1">Execution: Primary Operator Locks</h3>
                                                        <p className="text-sm font-bold text-slate-600 mt-1">Enter lock numbers for all {points.length} points. Sign each row (Done), then Sign &amp; Complete Isolation.</p>
                                                    </div>
                                                </div>
                                                <div className="flex flex-col sm:flex-row gap-3">
                                                    <button
                                                        onClick={handlePrintTags}
                                                        disabled={isUpdating}
                                                        className="rounded-xl bg-white border border-indigo-200 px-8 py-3.5 text-sm font-bold text-indigo-600 hover:bg-indigo-50 active:scale-[0.98] transition-all shadow-sm flex items-center justify-center gap-2"
                                                    >
                                                        <Printer className="w-5 h-5" />
                                                        Print Tags
                                                    </button>
                                                    <button
                                                        onClick={async () => {
                                                            await handleAction('fill_rows', { isolationPoints: points.map(p => ({ id: p.id, tagNo: p.tagNo, lockNumber: p.lockNumber, isolationPosition: p.isolationPosition, lockOnInitial1: p.lockOnInitial1, lockOnInitial2: p.lockOnInitial2, returnedToServiceInitial: p.returnedToServiceInitial })) })
                                                        }}
                                                        disabled={points.some(p => !p.lockNumber || !p.isolationPosition || !p.lockOnInitial1) || isUpdating || !canExecuteIsolation || isRowUpdating}
                                                        className={`flex-1 rounded-xl px-8 py-3.5 text-sm font-extrabold text-white active:scale-[0.98] transition-all shadow-lg flex items-center justify-center gap-2 uppercase tracking-widest disabled:opacity-50 ${isRowUpdating ? 'bg-slate-400 cursor-wait shadow-none' : 'shadow-indigo-500/20 bg-indigo-600 hover:bg-indigo-700'}`}
                                                    >
                                                        {isRowUpdating ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <PenLine className="w-5 h-5" />} {isRowUpdating ? 'Saving Row...' : 'Sign & Complete Isolation'}
                                                    </button>
                                                </div>
                                                {!isAssignedOperator && (
                                                    <p className="mt-4 text-[10px] font-bold text-red-500 flex items-center gap-1 uppercase tracking-widest"><AlertTriangle className="w-3 h-3" /> Only the assigned operator ({task?.primaryOperator?.name}) can log these locks.</p>
                                                )}
                                            </div>
                                        )}

                                        {/* Supervisor verification panel — only shown to supervisor */}
                                        {canSupervisorVerify && (
                                            <div className="rounded-2xl border border-purple-200/60 bg-gradient-to-br from-purple-50 to-violet-50/30 p-6 md:p-8 shadow-sm">
                                                <div className="flex items-start gap-4 mb-4">
                                                    <div className="bg-purple-100 p-2.5 rounded-xl text-purple-600 shadow-sm">
                                                        <ShieldCheck className="w-6 h-6" />
                                                    </div>
                                                    <div>
                                                        <h3 className="text-xl font-extrabold text-slate-900 tracking-tight leading-none mb-1">
                                                            Verification: Sign Lock on Initial #2
                                                        </h3>
                                                        <p className="text-sm font-bold text-slate-600 mt-1">
                                                            Click <strong>Done</strong> on each row to sign Lock on Initial #2. All other fields are locked by the operator.
                                                        </p>
                                                    </div>
                                                </div>
                                                <button
                                                    onClick={async () => {
                                                        await handleAction('supervisor_complete', { isolationPoints: points.map(p => ({ id: p.id, lockOnInitial2: p.lockOnInitial2 })) })
                                                    }}
                                                    disabled={points.some(p => !p.lockOnInitial2) || isUpdating || isRowUpdating}
                                                    className={`w-full rounded-xl px-8 py-4 text-base font-black text-white active:scale-[0.98] transition-all shadow-lg flex items-center justify-center gap-3 uppercase tracking-widest disabled:opacity-50 ${points.every(p => p.lockOnInitial2) && !isRowUpdating ? 'bg-purple-600 hover:bg-purple-700 shadow-purple-500/20' : 'bg-slate-400 cursor-wait shadow-none'}`}
                                                >
                                                    {isUpdating || isRowUpdating ? <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <ShieldCheck className="w-6 h-6" />}
                                                    {isRowUpdating ? 'Saving Row...' : points.every(p => p.lockOnInitial2) ? 'Sign & Supervise — Mark Isolation Verified' : `Sign all ${points.filter(p => !p.lockOnInitial2).length} remaining rows first`}
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                )}


                {status === 'TAGS_PRINTED' && (
                    <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500">
                        <div className="rounded-2xl border border-indigo-200/60 bg-gradient-to-br from-indigo-50 to-blue-50/30 p-6 md:p-8 shadow-sm">
                            <div className="flex items-start gap-4 mb-6">
                                <div className="bg-indigo-100 p-2.5 rounded-xl text-indigo-600">
                                    <Printer className="w-6 h-6" />
                                </div>
                                <div>
                                    <h3 className="text-xl font-extrabold text-slate-900 tracking-tight">Tags Printed. Proceed to Field.</h3>
                                    <p className="text-sm font-medium text-slate-600 mt-1">Physically attach locks and tags to the {task?.equipmentName}. Confirm completion below.</p>
                                </div>
                            </div>

                            <div className="border border-dashed border-indigo-200 rounded-2xl p-6 md:p-10 bg-white/50 flex flex-col items-center justify-center space-y-5">
                                <div className="w-full max-w-sm">
                                    <p className="text-[10px] font-extrabold text-slate-500 uppercase tracking-widest mb-3 text-center">Operator Signature ({task?.primaryOperator?.name})</p>
                                     {operatorSignature ? (
                                         <div className="bg-white border border-indigo-100 rounded-xl p-8 text-center relative overflow-hidden shadow-sm">
                                             <div className="absolute top-0 w-full h-1 bg-indigo-500 left-0"></div>
                                             <h2 className="text-4xl font-[Brush_Script_MT] text-indigo-900 rotate-[-5deg] py-2">{operatorSignature}</h2>
                                             <div className="mt-4 border-t border-dashed border-slate-200 pt-3 flex justify-between text-[10px] font-extrabold text-slate-400">
                                                 <span>{task?.primaryOperator?.name || 'N/A'}</span>
                                                 <span>{task?.operatorSignedAt || 'N/A'}</span>
                                             </div>
                                         </div>
                                     ) : (
                                         <>
                                              <div className="relative">
                                                 <input
                                                     type="text"
                                                     placeholder={`Type '${activeUser?.name}' to digitally sign...`}
                                                     value={operatorSignature}
                                                     disabled={!isAssignedOperator}
                                                     onChange={(e) => setOperatorSignature(e.target.value)}
                                                     className={`w-full rounded-xl border p-4 text-center text-sm font-bold transition-all shadow-sm ${operatorSignature ? 'bg-slate-50 border-slate-200 text-slate-600' : 'bg-white border-indigo-200 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10'} disabled:opacity-50 disabled:cursor-not-allowed outline-none`}
                                                 />
                                                 {operatorSignature && <Lock className="w-4 h-4 text-slate-400 absolute right-4 top-1/2 -translate-y-1/2" />}
                                             </div>
                                             <button
                                                 onClick={() => handleAction('operator_sign', { signature: operatorSignature })}
                                                 disabled={!operatorSignature || !isAssignedOperator}
                                                 className="w-full rounded-xl bg-indigo-600 px-8 py-4 text-sm font-bold text-white hover:bg-indigo-700 active:scale-[0.98] transition-all shadow-md shadow-indigo-500/20 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                                             >
                                                 <CheckCircle2 className="w-5 h-5" />
                                                 Tags Attached & Verified
                                             </button>
                                         </>
                                      )}
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {status === 'AWAITING_VERIFICATION' && (
                    <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500">
                        {/* Operator Signature is readonly */}
                        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm opacity-80">
                            <p className="text-[10px] font-extrabold text-slate-500 uppercase tracking-widest mb-3">Operator Signature</p>
                            <div className="bg-slate-50 border border-slate-100 rounded-xl flex justify-between items-center px-5 py-4">
                                <span className="font-[Brush_Script_MT] text-3xl text-slate-800">{task?.primaryOperator?.name}</span>
                                <span className="text-[10px] font-extrabold text-emerald-600 tracking-widest"><CheckCircle2 className="inline w-3.5 h-3.5 mr-1" /> VERIFIED <span className="text-slate-400 ml-1">{task?.operatorSignedAt}</span></span>
                            </div>
                        </div>

                        <div className="rounded-2xl border border-purple-200/60 bg-gradient-to-br from-purple-50 to-fuchsia-50/30 p-6 md:p-8 shadow-sm">
                            <div className="flex items-start gap-4 mb-6">
                                <div className="bg-purple-100 p-2.5 rounded-xl text-purple-600">
                                    <UserCheck className="w-6 h-6" />
                                </div>
                                <div>
                                    <h3 className="text-xl font-extrabold text-slate-900 tracking-tight">Supervisor Verification</h3>
                                    <p className="text-sm font-medium text-slate-600 mt-1">Physically walk the line to ensure all {points.length} locks are applied correctly by {task?.primaryOperator?.name}.</p>
                                </div>
                            </div>

                            <div className="border border-dashed border-purple-200 rounded-2xl p-6 md:p-10 bg-white/50 flex flex-col items-center justify-center space-y-5">
                                <div className="w-full max-w-sm">
                                    <p className="text-[10px] font-extrabold text-purple-600 uppercase tracking-widest mb-3 text-center">Supervisor Signature ({task?.supervisor?.name})</p>
                                    {!supervisorSignature && !isAssignedSupervisor && (
                                        <div className="text-xs font-bold text-red-600 bg-red-50 p-3 rounded-xl border border-red-200 text-center animate-pulse mb-4 shadow-sm">
                                            Rule violation: Only the assigned Supervisor ({task?.supervisor?.name || 'Lisa'}) can sign this verification block.
                                        </div>
                                    )}
                                    <div className="relative w-full mb-4">
                                        <input
                                            type="text"
                                            placeholder={`Type '${task?.supervisor?.name}' to sign...`}
                                            value={supervisorSignature}
                                            disabled={!isAssignedSupervisor}
                                            onChange={(e) => setSupervisorSignature(e.target.value)}
                                            className={`w-full rounded-xl border p-4 text-center text-sm font-bold transition-all shadow-sm ${supervisorSignature ? 'bg-slate-50 border-slate-200 text-slate-600' : 'bg-white border-purple-200 focus:border-purple-500 focus:ring-4 focus:ring-purple-500/10'} disabled:opacity-50 disabled:cursor-not-allowed outline-none`}
                                        />
                                        {supervisorSignature && <Lock className="w-4 h-4 text-slate-400 absolute right-4 top-1/2 -translate-y-1/2" />}
                                    </div>
                                    <button
                                        onClick={() => setStatus('ACTIVE')}
                                        disabled={!supervisorSignature}
                                        className="w-full rounded-xl bg-purple-600 px-8 py-4 text-sm font-bold text-white hover:bg-purple-700 active:scale-[0.98] transition-all shadow-md shadow-purple-500/20 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        <ShieldCheck className="w-5 h-5" />
                                        Confirm Safety Walk & Verify
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
                {(isAuthorizedApprover || isCreator) && (
                    <>
                {(status === 'ACTIVE' || status === 'READY_FOR_DELOT') && (
                    <div className="space-y-6">
                        {/* Existing signatures readonly */}
                        <div className="grid md:grid-cols-2 gap-4">
                            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm opacity-80">
                                <p className="text-[10px] font-extrabold text-slate-500 uppercase tracking-widest mb-2">De-Energizing Operator</p>
                                <span className="font-[Brush_Script_MT] text-3xl text-slate-800">{task?.primaryOperator?.name}</span>
                            </div>
                            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm opacity-80">
                                <p className="text-[10px] font-extrabold text-slate-500 uppercase tracking-widest mb-2">Verifying Supervisor</p>
                                <span className="font-[Brush_Script_MT] text-3xl text-slate-800">{task?.supervisor?.name}</span>
                            </div>
                        </div>

                        {['Isolation Verified / Active', 'READY_FOR_DELOT'].includes(status) && (
                            <div className="rounded-2xl border border-emerald-200/60 bg-gradient-to-br from-emerald-50 to-teal-50/30 p-6 md:p-8 flex flex-col md:flex-row items-center justify-between gap-6 shadow-sm">
                                <div>
                                    <h3 className="text-xl font-extrabold text-slate-900 mb-2 flex items-center gap-2 tracking-tight">Isolation is Verified & Active</h3>
                                    <p className="text-sm font-medium text-slate-600">The Dedicated Contractor Portal is now live for this LOTO. Contractors may access it to safely apply their visual locks.</p>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {(status === 'READY_FOR_DELOT' || status === 'Closed') && (
                    <div className="animate-in slide-in-from-bottom-4 duration-500 space-y-6">
                        <div className="rounded-2xl border border-red-200/60 bg-white overflow-hidden shadow-lg shadow-red-500/5">
                            <div className="bg-gradient-to-r from-red-50 to-rose-50/50 px-6 md:px-8 py-5 border-b border-red-100">
                                <h3 className="text-xl font-extrabold text-slate-900 flex items-center gap-3 tracking-tight">
                                    <div className="bg-red-100 p-2 rounded-lg text-red-600">
                                        <Key className="w-5 h-5" />
                                    </div>
                                    Declaration of Work Complete
                                </h3>
                                <p className="text-sm font-medium text-slate-600 mt-2 ml-12">Contractors have signed off. Return Equipment to Service.</p>
                            </div>

                            <div className="p-6 md:p-8 space-y-8">
                                <label className={`flex items-start gap-4 p-5 md:p-6 rounded-2xl border cursor-pointer transition-all shadow-sm ${lockboxEmpty ? 'border-red-400 bg-red-50/50 ring-4 ring-red-500/10' : 'border-slate-200 bg-slate-50 hover:bg-slate-100/80 hover:border-slate-300'}`}>
                                    <input
                                        type="checkbox"
                                        checked={lockboxEmpty || status === 'Closed'}
                                        disabled={status === 'Closed'}
                                        onChange={(e) => setLockboxEmpty(e.target.checked)}
                                        className="mt-1 w-6 h-6 rounded border-slate-300 text-red-600 focus:ring-red-500 transition-colors cursor-pointer disabled:opacity-50"
                                    />
                                    <div>
                                        <h4 className="font-extrabold text-slate-900 text-lg mb-1">Lockbox #1 is EMPTY</h4>
                                        <p className="text-sm font-medium text-slate-600 leading-relaxed">I confirm all keys have been removed/returned and physical locks are off the equipment.</p>
                                    </div>
                                </label>

                                {lockboxEmpty && (
                                    <div className="grid md:grid-cols-2 gap-8 pt-6 border-t border-dashed border-slate-200">
                                        {/* Jamal's Block */}
                                        <div className="space-y-4">
                                            <div className="flex items-center gap-3 mb-2">
                                                <div className="w-7 h-7 rounded-lg bg-red-100 text-red-700 font-extrabold flex items-center justify-center text-xs shadow-sm shadow-red-500/10">1</div>
                                                <p className="text-[10px] font-extrabold text-slate-500 uppercase tracking-widest">Maintenance Verification</p>
                                            </div>
                                            {activeUser?.role !== 'contractor' && !isAssignedSupervisor && !maintenanceSignature && (
                                                <div className="text-xs font-bold text-red-600 bg-red-50 p-2.5 rounded-xl border border-red-100 text-center shadow-sm">
                                                    Only Maintenance/Contractor or Supervisor can sign here.
                                                </div>
                                            )}
                                            <div className="relative">
                                                <input
                                                    type="text"
                                                    placeholder={`Type signature to sign...`}
                                                    value={maintenanceSignature}
                                                    readOnly={!!maintenanceSignature}
                                                    disabled={(activeUser?.role !== 'contractor' && !isAssignedSupervisor) || !!maintenanceSignature}
                                                    onBlur={() => maintenanceSignature && handleAction('maintenance_sign', { signature: maintenanceSignature })}
                                                    onChange={(e) => setMaintenanceSignature(e.target.value)}
                                                    className={`w-full rounded-xl border p-4 text-center text-sm font-bold transition-all shadow-sm ${maintenanceSignature ? 'bg-slate-50 border-slate-200 text-slate-600' : 'bg-white border-slate-300 focus:border-red-400 focus:ring-4 focus:ring-red-500/10'} disabled:opacity-50 disabled:cursor-not-allowed outline-none`}
                                                />
                                                {maintenanceSignature && <Lock className="w-4 h-4 text-slate-400 absolute right-4 top-1/2 -translate-y-1/2" />}
                                            </div>
                                        </div>

                                        {/* Mike's Final Block */}
                                        <div className={`space-y-4 transition-all duration-300 ${!maintenanceSignature ? 'opacity-40 grayscale pointer-events-none' : ''}`}>
                                            <div className="flex items-center gap-3 mb-2">
                                                <div className="w-7 h-7 rounded-lg bg-slate-900 text-white font-extrabold flex items-center justify-center text-xs shadow-sm shadow-slate-900/20">2</div>
                                                <p className="text-[10px] font-extrabold text-slate-900 uppercase tracking-widest">Operator Final Sign-Off</p>
                                            </div>
                                            {maintenanceSignature && !isAssignedOperator && !finalOperatorSignature && (
                                                <div className="text-xs font-bold text-red-600 bg-red-50 p-2.5 rounded-xl border border-red-100 text-center shadow-sm">
                                                    Only the assigned operator ({task?.primaryOperator?.name}) can sign.
                                                </div>
                                            )}
                                            <div className="relative w-full mb-4">
                                                <input
                                                    type="text"
                                                    placeholder={`Type '${task?.primaryOperator?.name}' to sign...`}
                                                    value={finalOperatorSignature}
                                                    readOnly={!!finalOperatorSignature}
                                                    disabled={!isAssignedOperator || !maintenanceSignature || !!finalOperatorSignature}
                                                    onBlur={() => finalOperatorSignature && handleAction('final_operator_sign', { signature: finalOperatorSignature })}
                                                    onChange={(e) => setFinalOperatorSignature(e.target.value)}
                                                    className={`w-full rounded-xl border p-4 text-center text-sm font-bold transition-all shadow-sm ${finalOperatorSignature ? 'bg-slate-50 border-slate-200 text-slate-600' : 'bg-white border-slate-900 focus:border-red-500 focus:ring-4 focus:ring-red-500/20'} disabled:opacity-50 disabled:cursor-not-allowed outline-none`}
                                                />
                                                {finalOperatorSignature && <Lock className="w-4 h-4 text-slate-400 absolute right-4 top-1/2 -translate-y-1/2" />}
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {(lockboxEmpty || status === 'Closed') && maintenanceSignature && finalOperatorSignature && (
                                    <div className="pt-6 flex justify-end border-t border-slate-100">
                                        <button disabled className="w-full md:w-auto rounded-xl bg-slate-300 px-8 py-4 text-sm font-extrabold text-white transition-all flex items-center justify-center gap-2 uppercase tracking-widest cursor-not-allowed">
                                            <ShieldCheck className="w-5 h-5" />
                                            LOTO CLOSED
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}
                    </>
                )}
                    </>
                )}
            </main>

            {/* Print Tags Modal */}
            {showPrintModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-300">
                    <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full overflow-hidden zoom-in-95 border border-slate-100">
                        <div className="bg-gradient-to-br from-indigo-600 to-blue-700 p-8 text-center text-white relative">
                            <Printer className="w-14 h-14 mx-auto mb-4 opacity-90 drop-shadow-md" />
                            <h2 className="text-2xl font-extrabold tracking-tight">Ready to Print 10 Tags?</h2>
                            <p className="text-indigo-100 font-medium mt-2">Printer connection verified.</p>
                        </div>
                        <div className="p-8">
                            <p className="text-sm text-slate-600 font-medium text-center leading-relaxed mb-8">
                                Tags for <strong className="text-slate-900 font-bold">LOTO-2026-000789</strong> will be generated as a single PDF batch. You cannot print individual tags.
                            </p>
                            <div className="flex items-center gap-4">
                                <button onClick={() => setShowPrintModal(false)} className="flex-1 rounded-xl border border-slate-200 py-3.5 font-bold text-slate-700 hover:bg-slate-50 active:scale-[0.98] transition-all">
                                    Cancel
                                </button>
                                <button onClick={confirmPrint} className="flex-1 rounded-xl bg-indigo-600 py-3.5 font-bold text-white hover:bg-indigo-700 active:scale-[0.98] transition-all shadow-md shadow-indigo-500/20">
                                    Print All Tags
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* --- PHOTO MIRROR MODAL (Click to enlarge) --- */}
            {showPhotoMirror && (
                <div 
                    className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/95 backdrop-blur-xl animate-in fade-in duration-300"
                    onClick={() => setShowPhotoMirror(false)}
                >
                    <div className="absolute top-8 right-8 text-white/50 hover:text-white transition-colors">
                        <X className="h-10 w-10 cursor-pointer" />
                    </div>
                    <div 
                        className="max-w-4xl w-full bg-slate-800 rounded-[40px] overflow-hidden shadow-2xl animate-in zoom-in-95 duration-300 ring-1 ring-white/20"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="aspect-video relative bg-black flex items-center justify-center group overflow-hidden">
                            {mirrorPhotoUrl ? (
                                <img 
                                    src={mirrorPhotoUrl} 
                                    className="h-full w-full object-contain animate-in fade-in duration-700 zoom-in-110" 
                                    alt="Enlarged" 
                                />
                            ) : (
                                <div className="text-slate-700 flex flex-col items-center">
                                    <Camera className="h-20 w-20 mb-4 opacity-10" />
                                    <p className="text-xs font-black uppercase tracking-widest opacity-20">No Image Data</p>
                                </div>
                            )}
                            
                            {/* Overlay Info */}
                            <div className="absolute bottom-0 left-0 right-0 p-8 bg-gradient-to-t from-black/80 to-transparent">
                                <h3 className="text-2xl font-black text-white tracking-tight mb-1">{mirrorTitle}</h3>
                                <p className="text-sm font-bold text-blue-400 uppercase tracking-widest flex items-center gap-2">
                                    <ShieldCheck className="h-4 w-4" /> Identity Verified Segment
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
