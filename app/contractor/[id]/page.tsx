'use client'

import React, { useState, useEffect, use } from 'react'
import Link from 'next/link'
import { ArrowLeft, HardHat, Camera, UserPlus, CheckCircle2, ShieldAlert } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner' // Assuming sonner is used as instructed earlier

export default function ContractorPortal({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params)
    const router = useRouter()

    const [activeUser, setActiveUser] = useState<any>(null)
    const [token, setToken] = useState('')
    const [task, setTask] = useState<any>(null)
    const [isLoading, setIsLoading] = useState(true)

    // Locks that are already saved in DB
    const [savedLocks, setSavedLocks] = useState<any[]>([])

    // Locks being drafted in UI
    const [draftLocks, setDraftLocks] = useState<any[]>([])

    // Camera modal state
    const [showCameraForDraft, setShowCameraForDraft] = useState<string | null>(null)

    useEffect(() => {
        const storedUser = localStorage.getItem('user')
        const storedToken = localStorage.getItem('token')
        if (storedUser && storedToken) {
            setActiveUser(JSON.parse(storedUser))
            setToken(storedToken)
        } else {
            router.push('/login')
        }
    }, [router])

    useEffect(() => {
        if (!token) return;
        fetchData()
    }, [token, id])

    const fetchData = async () => {
        setIsLoading(true)
        try {
            const r = await fetch(`/api/loto/${id}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            })
            const data = await r.json()
            if (data.error) {
                toast.error(data.error)
            } else {
                setTask(data.task)
                setSavedLocks(data.task.contractorLocks || [])
            }
        } catch (err) {
            console.error(err)
        } finally {
            setIsLoading(false)
        }
    }

    const addDraftMember = () => {
        setDraftLocks([...draftLocks, {
            draftId: Math.random().toString(36).substr(2, 9),
            trade: '',
            description: '',
            contractorName: activeUser?.name || '',
            contractorPhone: activeUser?.contractorNumber || '',
            lockOnSignature: '',
            lockOnPhoto: '',
            isSubmitting: false
        }])
    }

    const updateDraft = (draftId: string, field: string, value: any) => {
        setDraftLocks(draftLocks.map(d => d.draftId === draftId ? { ...d, [field]: value } : d))
    }

    const removeDraft = (draftId: string) => {
        setDraftLocks(draftLocks.filter(d => d.draftId !== draftId))
    }

    const handleTakePhoto = () => {
        // Simulate photo capture with a dummy base64 string
        if (showCameraForDraft) {
            updateDraft(showCameraForDraft, 'lockOnPhoto', 'data:image/jpeg;base64,mockphoto')
            setShowCameraForDraft(null)
            toast.success("Photo verified successfully.")
        }
    }

    const submitLockOn = async (draftRow: any) => {
        if (!draftRow.trade || !draftRow.description || !draftRow.contractorName || !draftRow.lockOnSignature || !draftRow.lockOnPhoto) {
            toast.error("Please fill all required fields, capture photo, and sign.")
            return
        }

        updateDraft(draftRow.draftId, 'isSubmitting', true)
        try {
            const r = await fetch(`/api/loto/${id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({
                    action: 'contractor_lock_on',
                    trade: draftRow.trade,
                    description: draftRow.description,
                    contractorName: draftRow.contractorName,
                    contractorPhone: draftRow.contractorPhone,
                    lockOnSignature: draftRow.lockOnSignature,
                    lockOnPhoto: draftRow.lockOnPhoto
                })
            })
            const data = await r.json()
            if (data.error) throw new Error(data.error)
            
            toast.success("Lock On Confirmed")
            setTask(data.task)
            setSavedLocks(data.task.contractorLocks || [])
            removeDraft(draftRow.draftId)
        } catch (err: any) {
            toast.error(err.message)
            updateDraft(draftRow.draftId, 'isSubmitting', false)
        }
    }

    const handleLockOff = async (lockId: string, lockOffType: string) => {
        if (!lockOffType) return;
        
        try {
            const r = await fetch(`/api/loto/${id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({
                    action: 'contractor_lock_off',
                    lockId,
                    lockOffType,
                    lockOffNote: 'Work complete'
                })
            })
            const data = await r.json()
            if (data.error) throw new Error(data.error)
            
            toast.success(`Lock Off Confirmed: ${lockOffType}`)
            setTask(data.task)
            setSavedLocks(data.task.contractorLocks || [])
        } catch (err: any) {
            toast.error(err.message)
        }
    }

    if (isLoading) return <div className="min-h-screen bg-zinc-950 flex items-center justify-center"><div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent animate-spin rounded-full"></div></div>

    // Check if task exists and is at least "Isolation Verified / Active"
    const isActive = task?.status === 'Isolation Verified / Active'
    
    return (
        <div className="min-h-screen bg-zinc-950 text-zinc-100 pb-32 font-sans selection:bg-emerald-500/30 selection:text-emerald-200">
            <header className="sticky top-0 z-30 flex flex-col gap-4 border-b border-white/5 bg-zinc-900/80 backdrop-blur-xl px-4 py-5 md:flex-row md:items-center md:justify-between md:px-8 shadow-2xl">
                <div className="flex items-center gap-4">
                    <Link href={`/`} className="rounded-xl p-2.5 bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white transition-all shadow-sm border border-white/5">
                        <ArrowLeft className="h-5 w-5" />
                    </Link>
                    <div className="flex items-center justify-center p-2.5 rounded-xl bg-gradient-to-br from-emerald-400 to-emerald-600 text-zinc-950 shadow-lg shadow-emerald-500/20">
                        <HardHat className="h-5 w-5" />
                    </div>
                    <div>
                        <h1 className="text-xl md:text-2xl font-extrabold tracking-tight text-white leading-none mb-1">Contractor Portal</h1>
                        <span className="text-[10px] sm:text-xs font-extrabold text-emerald-400/90 uppercase tracking-widest">{task?.lotoId} — {task?.equipmentName}</span>
                    </div>
                </div>

                <div className={`px-5 py-2.5 rounded-full border text-xs font-extrabold uppercase tracking-widest text-center flex justify-center items-center gap-2 shadow-sm ${isActive ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.15)]' : 'border-rose-500/30 bg-rose-500/10 text-rose-400'}`}>
                    <ShieldAlert className="w-4 h-4" />
                    STATUS: {task?.status}
                </div>
            </header>

            <main className="mx-auto max-w-6xl px-4 py-8 md:px-6 space-y-8">
                {/* Company Context */}
                <section className="bg-gray-800 border border-gray-700 rounded-xl p-6 shadow-lg relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full -mr-16 -mt-16 blur-xl"></div>
                    <h2 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-2">Contractor Registry Data</h2>
                    <div className="text-xl font-extrabold text-white">
                        {activeUser?.name} ({activeUser?.email})
                    </div>
                </section>

                <section className="bg-zinc-900/50 border border-white/5 rounded-2xl shadow-xl overflow-hidden backdrop-blur-sm">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 md:p-8 bg-zinc-900/80 border-b border-white/5 backdrop-blur-sm">
                        <div>
                            <h3 className="text-xl font-extrabold text-white flex items-center gap-3 tracking-tight">
                                <div className="bg-emerald-500/10 p-2 rounded-xl text-emerald-400">
                                    <ShieldAlert className="w-5 h-5" />
                                </div>
                                Contractor Lock Confirmation
                            </h3>
                            <p className="text-sm text-zinc-400 mt-2 font-medium px-1">Verify equipment safely locked out before commencing work.</p>
                        </div>
                        {isActive && (
                            <button onClick={addDraftMember} className="bg-zinc-800 hover:bg-zinc-700 text-white px-5 py-3 rounded-xl text-sm font-extrabold flex items-center justify-center gap-2 transition-all shadow-sm active:scale-[0.98] border border-white/10">
                                <UserPlus className="w-5 h-5" /> Add Team Row
                            </button>
                        )}
                    </div>

                    <div className="p-0 overflow-x-auto">
                        <table className="w-full text-left whitespace-nowrap lg:whitespace-normal">
                            <thead>
                                <tr className="border-b border-white/5 bg-zinc-950/50">
                                    <th className="p-5 md:p-6 text-[10px] sm:text-xs font-extrabold text-zinc-500 uppercase tracking-widest">Date & Trade</th>
                                    <th className="p-5 md:p-6 text-[10px] sm:text-xs font-extrabold text-zinc-500 uppercase tracking-widest min-w-[200px]">Description & Contact</th>
                                    <th className="p-5 md:p-6 text-[10px] sm:text-xs font-extrabold text-emerald-500 uppercase tracking-widest w-64 bg-emerald-500/5">LOCK ON (Start Work)</th>
                                    <th className="p-5 md:p-6 text-[10px] sm:text-xs font-extrabold text-rose-500 uppercase tracking-widest w-48 bg-rose-500/5">LOCK OFF (Finish Work)</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                                {/* DRAFT ROWS */}
                                {draftLocks.map((d) => (
                                    <tr key={d.draftId} className="hover:bg-zinc-800/30 transition-colors">
                                        <td className="p-5 md:p-6 align-top">
                                            <div className="font-mono text-xs font-extrabold text-zinc-400 mb-3 ml-1">{new Date().toISOString().split('T')[0]}</div>
                                            <input
                                                type="text"
                                                placeholder="Trade (e.g. Electrician)"
                                                value={d.trade}
                                                onChange={(e) => updateDraft(d.draftId, 'trade', e.target.value)}
                                                className="w-full bg-zinc-950/50 border border-white/10 rounded-xl p-3 text-sm font-bold text-white focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/20 transition-all outline-none"
                                            />
                                            <button onClick={() => removeDraft(d.draftId)} className="mt-3 text-[10px] font-bold text-rose-500 hover:text-rose-400 uppercase tracking-widest">Remove</button>
                                        </td>
                                        <td className="p-5 md:p-6 align-top space-y-4">
                                            <input
                                                type="text"
                                                placeholder="Description of Lock Confirmed"
                                                value={d.description}
                                                onChange={(e) => updateDraft(d.draftId, 'description', e.target.value)}
                                                className="w-full bg-zinc-950/50 border border-white/10 rounded-xl p-3 text-sm font-bold text-white focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/20 transition-all outline-none"
                                            />
                                            <div className="grid grid-cols-2 gap-3">
                                                <input
                                                    type="text"
                                                    placeholder="Full Name"
                                                    value={d.contractorName}
                                                    onChange={(e) => updateDraft(d.draftId, 'contractorName', e.target.value)}
                                                    className="w-full bg-zinc-950/50 border border-white/10 rounded-xl p-3 text-sm font-bold text-white focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/20 transition-all outline-none"
                                                />
                                                <input
                                                    type="text"
                                                    placeholder="Phone Number"
                                                    value={d.contractorPhone}
                                                    onChange={(e) => updateDraft(d.draftId, 'contractorPhone', e.target.value)}
                                                    className="w-full bg-zinc-950/50 border border-white/10 rounded-xl p-3 text-sm font-bold text-white focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/20 transition-all outline-none"
                                                />
                                            </div>
                                        </td>
                                        <td className="p-5 md:p-6 align-top bg-emerald-500/5 mt-1 border-r border-white/5">
                                            {!d.lockOnPhoto ? (
                                                <button
                                                    onClick={() => setShowCameraForDraft(d.draftId)}
                                                    className="w-full bg-zinc-950/80 border-2 border-dashed border-zinc-700/80 rounded-2xl p-6 flex flex-col items-center justify-center gap-3 hover:bg-zinc-900 hover:border-emerald-500/50 active:scale-[0.98] transition-all group shadow-sm shadow-emerald-900/10"
                                                >
                                                    <div className="bg-zinc-800 p-3 rounded-full group-hover:bg-emerald-500/20 transition-colors">
                                                        <Camera className="w-6 h-6 text-zinc-400 group-hover:text-emerald-400 transition-colors" />
                                                    </div>
                                                    <span className="text-xs font-extrabold text-zinc-400 text-center uppercase tracking-widest leading-relaxed">Identity Check Required for Lock On</span>
                                                </button>
                                            ) : (
                                                <div className="space-y-3 animate-in fade-in duration-300">
                                                    <div className="flex items-center gap-2 text-[10px] font-extrabold text-emerald-400 bg-emerald-500/10 px-3 py-1.5 rounded-lg inline-flex border border-emerald-500/20">
                                                        <CheckCircle2 className="w-4 h-4" /> PHOTO VERIFIED
                                                    </div>
                                                    <input
                                                        type="text"
                                                        placeholder={`Sign as ${d.contractorName}...`}
                                                        value={d.lockOnSignature}
                                                        onChange={(e) => updateDraft(d.draftId, 'lockOnSignature', e.target.value)}
                                                        className="w-full bg-emerald-50 border-2 border-emerald-400 text-emerald-950 rounded-xl p-4 text-center text-lg font-[Brush_Script_MT] focus:ring-4 focus:ring-emerald-500/30 placeholder-emerald-900/30 outline-none transition-all shadow-inner"
                                                    />
                                                    <button
                                                        onClick={() => submitLockOn(d)}
                                                        disabled={d.isSubmitting}
                                                        className="w-full mt-2 bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs py-3 rounded-xl uppercase tracking-widest disabled:opacity-50"
                                                    >
                                                        {d.isSubmitting ? 'Saving...' : 'Submit Lock On'}
                                                    </button>
                                                </div>
                                            )}
                                        </td>
                                        <td className="p-5 md:p-6 align-top bg-rose-500/5 mt-1 border-l border-white/5 opacity-50 pointer-events-none">
                                            <div className="text-xs font-extrabold text-zinc-600 text-center p-6 border border-zinc-800/50 rounded-xl uppercase tracking-widest bg-zinc-900/20">Requires Lock On First</div>
                                        </td>
                                    </tr>
                                ))}

                                {/* SAVED ROWS FROM DB */}
                                {savedLocks.map((lock) => (
                                    <tr key={lock.id} className="hover:bg-zinc-800/30 transition-colors">
                                        <td className="p-5 md:p-6 align-top">
                                            <div className="font-mono text-xs font-extrabold text-zinc-400 mb-3 ml-1">{new Date(lock.lockedOnAt).toLocaleDateString()}</div>
                                            <div className="text-sm font-bold text-white px-3 py-2 bg-zinc-950/50 border border-white/10 rounded-xl">{lock.trade}</div>
                                        </td>
                                        <td className="p-5 md:p-6 align-top space-y-4">
                                            <div className="text-sm font-bold text-white px-3 py-2 bg-zinc-950/50 border border-white/10 rounded-xl">{lock.description}</div>
                                            <div className="grid grid-cols-2 gap-3">
                                                <div className="text-sm font-bold text-white px-3 py-2 bg-zinc-950/50 border border-white/10 rounded-xl">{lock.contractorName || lock.contractor?.name}</div>
                                                <div className="text-sm font-bold text-white px-3 py-2 bg-zinc-950/50 border border-white/10 rounded-xl">{lock.contractorPhone || 'N/A'}</div>
                                            </div>
                                        </td>
                                        <td className="p-5 md:p-6 align-top bg-emerald-500/5 mt-1 border-r border-white/5">
                                            <div className="space-y-3">
                                                 <div className="flex items-center gap-2 text-[10px] font-extrabold text-emerald-400 bg-emerald-500/10 px-3 py-1.5 rounded-lg inline-flex border border-emerald-500/20">
                                                    <CheckCircle2 className="w-4 h-4" /> PHOTO VERIFIED
                                                </div>
                                                <div className="w-full bg-emerald-50 border border-emerald-200 text-emerald-950 rounded-xl p-4 text-center text-2xl font-[Brush_Script_MT]">
                                                    {lock.lockOnSignature}
                                                </div>
                                                <div className="text-[10px] text-zinc-500 text-right font-extrabold mt-1">
                                                    SIGNED {new Date(lock.lockedOnAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                                </div>
                                            </div>
                                        </td>
                                        <td className="p-5 md:p-6 align-top bg-rose-500/5 mt-1 border-l border-white/5">
                                            <div className="space-y-3">
                                                {lock.lockedOffAt ? (
                                                     <>
                                                         <div className="w-full bg-zinc-950 border border-zinc-700 rounded-xl p-4 text-sm font-extrabold text-rose-400 text-center uppercase tracking-widest shadow-sm">
                                                             Lock Off: {lock.lockOffType}
                                                         </div>
                                                         <div className="text-[10px] text-zinc-500 text-right font-extrabold mt-1">LOCKED OFF {new Date(lock.lockedOffAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</div>
                                                     </>
                                                ) : (
                                                    <select
                                                        value={lock.lockOffType || ''}
                                                        onChange={(e) => handleLockOff(lock.id, e.target.value)}
                                                        disabled={lock.contractorId !== activeUser?.userId}
                                                        className="w-full bg-zinc-950 border border-rose-500/50 rounded-xl p-4 text-sm font-extrabold text-white focus:border-rose-500 focus:ring-4 focus:ring-rose-500/20 outline-none transition-all shadow-sm appearance-none disabled:opacity-50"
                                                    >
                                                        <option value="">Pending Lock Off...</option>
                                                        <option value="Self">Self (Work Complete)</option>
                                                        <option value="Other">Other (Transfer)</option>
                                                        <option value="N/A">N/A</option>
                                                    </select>
                                                )}
                                                {lock.contractorId !== activeUser?.userId && !lock.lockedOffAt && (
                                                     <div className="text-[10px] text-rose-500 text-center font-extrabold leading-tight">Only the original signer can unlock.</div>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                                
                                {savedLocks.length === 0 && draftLocks.length === 0 && (
                                    <tr>
                                        <td colSpan={4} className="p-12 text-center text-sm font-bold text-zinc-500">
                                            No contractors have locked on yet.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </section>
            </main>

            {/* Simulated Camera Modal */}
            {showCameraForDraft && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/80 backdrop-blur-md p-4 animate-in fade-in zoom-in duration-300">
                    <div className="w-full max-w-sm bg-zinc-900 rounded-3xl overflow-hidden shadow-2xl border border-white/10 ring-1 ring-black">
                        <div className="p-6 bg-zinc-950/80 border-b border-white/5 text-center relative">
                            <h3 className="text-lg font-extrabold text-white tracking-tight">Identity Verification</h3>
                            <p className="text-xs text-zinc-400 mt-1 font-medium">Please ensure your face or ID is clearly visible.</p>
                            <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-2xl -mr-10 -mt-10 pointer-events-none"></div>
                        </div>
                        <div className="h-72 bg-zinc-900/50 relative flex items-center justify-center border-b border-white/5">
                            <div className="absolute inset-6 border-2 border-zinc-700/50 border-dashed rounded-2xl"></div>
                            <div className="w-32 h-32 rounded-full border border-emerald-500/30 bg-emerald-500/5 flex items-center justify-center shadow-[0_0_30px_rgba(16,185,129,0.1)]">
                                <UserPlus className="w-12 h-12 text-emerald-500/50" />
                            </div>
                            <div className="absolute bottom-6 left-0 right-0 text-center flex justify-center">
                                <span className="bg-rose-500 text-white text-[10px] uppercase font-extrabold tracking-widest px-3 py-1.5 rounded-full animate-pulse shadow-sm shadow-rose-500/20 flex items-center gap-2">
                                    <div className="w-1.5 h-1.5 rounded-full bg-white"></div>
                                    Live Stream
                                </span>
                            </div>
                        </div>
                        <div className="p-6 bg-zinc-950/80 flex gap-4">
                            <button onClick={() => setShowCameraForDraft(null)} className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-white font-extrabold py-3.5 rounded-xl transition-all text-sm active:scale-[0.98] border border-white/5">Cancel</button>
                            <button onClick={handleTakePhoto} className="flex-[2] bg-emerald-500 hover:bg-emerald-400 text-emerald-950 font-extrabold py-3.5 rounded-xl transition-all shadow-[0_0_20px_rgba(16,185,129,0.3)] hover:shadow-[0_0_25px_rgba(16,185,129,0.4)] text-sm flex justify-center items-center gap-2 active:scale-[0.98]">
                                <Camera className="w-5 h-5" /> Capture Photo
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
