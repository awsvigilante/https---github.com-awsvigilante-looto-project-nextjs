'use client'

import React, { useState, use } from 'react'
import Link from 'next/link'
import { ArrowLeft, HardHat, Camera, UserPlus, CheckCircle2, ShieldAlert } from 'lucide-react'

type LockOffStatus = '' | 'Self' | 'Other' | 'N/A'

interface TeamMember {
    id: string
    date: string
    trade: string
    description: string
    name: string
    phone: string
    photoVerified: boolean
    lockOnSignature: string
    lockOffStatus: LockOffStatus
}

export default function ContractorPortal({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params)
    const [company, setCompany] = useState('')
    const [team, setTeam] = useState<TeamMember[]>([
        {
            id: 'TM1',
            date: '2026-02-16',
            trade: 'Electrician',
            description: 'Confirmed tag #5 attached to breaker',
            name: 'Alex Rivera',
            phone: '+1-555-987-6543',
            photoVerified: false,
            lockOnSignature: '',
            lockOffStatus: ''
        }
    ])

    // Mock Photo Capture Modal
    const [showCamera, setShowCamera] = useState<string | null>(null) // holds TeamMember ID

    const handleTakePhoto = () => {
        // Simulate photo taken
        const newTeam = team.map(member =>
            member.id === showCamera ? { ...member, photoVerified: true } : member
        )
        setTeam(newTeam)
        setShowCamera(null)
    }

    const updateMember = (id: string, field: keyof TeamMember, value: unknown) => {
        setTeam(team.map(m => m.id === id ? { ...m, [field]: value } : m))
    }

    const addTeamMember = () => {
        const newMember: TeamMember = {
            id: `TM${team.length + 1}`,
            date: '2026-02-16',
            trade: 'Helper',
            description: 'Checked tag #7 on drain valve',
            name: 'Sam Lee',
            phone: '+1-555-456-7890',
            photoVerified: false,
            lockOnSignature: '',
            lockOffStatus: ''
        }
        setTeam([...team, newMember])
    }

    return (
        <div className="min-h-screen bg-zinc-950 text-zinc-100 pb-32 font-sans selection:bg-emerald-500/30 selection:text-emerald-200">
            {/* Premium Dark Mode for Contractors */}
            <header className="sticky top-0 z-30 flex flex-col gap-4 border-b border-white/5 bg-zinc-900/80 backdrop-blur-xl px-4 py-5 md:flex-row md:items-center md:justify-between md:px-8 shadow-2xl">
                <div className="flex items-center gap-4">
                    <Link href={`/loto/${id}`} className="rounded-xl p-2.5 bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white transition-all shadow-sm border border-white/5">
                        <ArrowLeft className="h-5 w-5" />
                    </Link>
                    <div className="flex items-center justify-center p-2.5 rounded-xl bg-gradient-to-br from-emerald-400 to-emerald-600 text-zinc-950 shadow-lg shadow-emerald-500/20">
                        <HardHat className="h-5 w-5" />
                    </div>
                    <div>
                        <h1 className="text-xl md:text-2xl font-extrabold tracking-tight text-white leading-none mb-1">Contractor Portal</h1>
                        <span className="text-[10px] sm:text-xs font-extrabold text-emerald-400/90 uppercase tracking-widest">{id} — WATER SOFTENER_A</span>
                    </div>
                </div>

                {/* Dynamic Status Badge per PRD */}
                <div className="px-5 py-2.5 rounded-full border border-emerald-500/30 text-xs font-extrabold uppercase tracking-widest text-center bg-emerald-500/10 text-emerald-400 flex justify-center items-center gap-2 shadow-[0_0_15px_rgba(16,185,129,0.15)]">
                    <ShieldAlert className="w-4 h-4" />
                    STATUS: ACTIVE (SAFE)
                </div>
            </header>

            <main className="mx-auto max-w-6xl px-4 py-8 md:px-6 space-y-8">

                {/* Company Selector */}
                <section className="bg-gray-800 border border-gray-700 rounded-xl p-6 shadow-lg relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full -mr-16 -mt-16 blur-xl"></div>
                    <h2 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-4">Contractor Company Registry</h2>
                    <div className="max-w-md">
                        <select
                            value={company}
                            onChange={(e) => setCompany(e.target.value)}
                            className="w-full bg-gray-900 border-2 border-gray-700 rounded-lg p-3 text-white font-bold focus:border-emerald-500 focus:ring-0 transition-colors"
                        >
                            <option value="">Select your registered company...</option>
                            <option value="Black Dreams Electrical Crew">Black Dreams Electrical Crew</option>
                            <option value="Apex Industrial Services">Apex Industrial Services</option>
                        </select>
                    </div>
                </section>

                {company && (
                    <section className="bg-zinc-900/50 border border-white/5 rounded-2xl shadow-xl overflow-hidden animate-in fade-in slide-in-from-bottom-4 backdrop-blur-sm">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 md:p-8 bg-zinc-900/80 border-b border-white/5 backdrop-blur-sm">
                            <div>
                                <h3 className="text-xl font-extrabold text-white flex items-center gap-3 tracking-tight">
                                    <div className="bg-emerald-500/10 p-2 rounded-xl text-emerald-400">
                                        <ShieldAlert className="w-5 h-5" />
                                    </div>
                                    Contractor Lock Confirmation - LOTO {id}
                                </h3>
                                <p className="text-sm text-zinc-400 mt-2 font-medium px-1">Verify equipment safely locked out before commencing work.</p>
                            </div>
                            <button onClick={addTeamMember} className="bg-zinc-800 hover:bg-zinc-700 text-white px-5 py-3 rounded-xl text-sm font-extrabold flex items-center justify-center gap-2 transition-all shadow-sm active:scale-[0.98] border border-white/10">
                                <UserPlus className="w-5 h-5" /> Add Team Member
                            </button>
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
                                    {team.map((m) => (
                                        <tr key={m.id} className="hover:bg-zinc-800/30 transition-colors">
                                            <td className="p-5 md:p-6 align-top">
                                                <div className="font-mono text-xs font-extrabold text-zinc-400 mb-3 ml-1">{m.date}</div>
                                                <input
                                                    type="text"
                                                    value={m.trade}
                                                    onChange={(e) => updateMember(m.id, 'trade', e.target.value)}
                                                    className="w-full bg-zinc-950/50 border border-white/10 rounded-xl p-3 text-sm font-bold text-white focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/20 transition-all outline-none"
                                                />
                                            </td>
                                            <td className="p-5 md:p-6 align-top space-y-4">
                                                <input
                                                    type="text"
                                                    placeholder="Lock description..."
                                                    value={m.description}
                                                    onChange={(e) => updateMember(m.id, 'description', e.target.value)}
                                                    className="w-full bg-zinc-950/50 border border-white/10 rounded-xl p-3 text-sm font-bold text-white focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/20 transition-all outline-none"
                                                />
                                                <div className="grid grid-cols-2 gap-3">
                                                    <input
                                                        type="text"
                                                        placeholder="Full Name"
                                                        value={m.name}
                                                        onChange={(e) => updateMember(m.id, 'name', e.target.value)}
                                                        className="w-full bg-zinc-950/50 border border-white/10 rounded-xl p-3 text-sm font-bold text-white focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/20 transition-all outline-none"
                                                    />
                                                    <input
                                                        type="text"
                                                        placeholder="Phone Number"
                                                        value={m.phone}
                                                        onChange={(e) => updateMember(m.id, 'phone', e.target.value)}
                                                        className="w-full bg-zinc-950/50 border border-white/10 rounded-xl p-3 text-sm font-bold text-white focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/20 transition-all outline-none"
                                                    />
                                                </div>
                                            </td>
                                            <td className="p-5 md:p-6 align-top bg-emerald-500/5 mt-1">
                                                {!m.photoVerified ? (
                                                    <button
                                                        onClick={() => setShowCamera(m.id)}
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
                                                            placeholder={`Sign as ${m.name}...`}
                                                            value={m.lockOnSignature}
                                                            onChange={(e) => updateMember(m.id, 'lockOnSignature', e.target.value)}
                                                            className="w-full bg-emerald-50 border-2 border-emerald-400 text-emerald-950 rounded-xl p-4 text-center text-lg font-[Brush_Script_MT] focus:ring-4 focus:ring-emerald-500/30 placeholder-emerald-900/30 outline-none transition-all shadow-inner"
                                                        />
                                                        {m.lockOnSignature && (
                                                            <div className="text-[10px] text-zinc-500 text-right font-extrabold mt-1">SIGNED TODAY 08:34 AM</div>
                                                        )}
                                                    </div>
                                                )}
                                            </td>
                                            <td className="p-5 md:p-6 align-top bg-rose-500/5 mt-1 border-l border-white/5">
                                                <div className="space-y-3">
                                                    {m.lockOnSignature ? (
                                                        <>
                                                            <select
                                                                value={m.lockOffStatus}
                                                                onChange={(e) => updateMember(m.id, 'lockOffStatus', e.target.value as LockOffStatus)}
                                                                className="w-full bg-zinc-950 border border-zinc-700 rounded-xl p-4 text-sm font-extrabold text-white focus:border-rose-500 focus:ring-4 focus:ring-rose-500/20 outline-none transition-all shadow-sm appearance-none"
                                                            >
                                                                <option value="">Pending Lock Off...</option>
                                                                <option value="Self">Self (Work Complete)</option>
                                                                <option value="Other">Other (Transfer)</option>
                                                                <option value="N/A">N/A</option>
                                                            </select>
                                                            {m.lockOffStatus && (
                                                                <div className="text-[10px] text-zinc-500 text-right font-extrabold mt-1">LOCKED OFF TODAY 16:45 PM</div>
                                                            )}
                                                        </>
                                                    ) : (
                                                        <div className="text-xs font-extrabold text-zinc-600 text-center p-6 border border-zinc-800/50 rounded-xl uppercase tracking-widest bg-zinc-900/20">Requires Lock On First</div>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </section>
                )}

            </main>

            {/* Simulated Camera Modal - Premium Dark */}
            {showCamera && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/80 backdrop-blur-md p-4 animate-in fade-in zoom-in duration-300">
                    <div className="w-full max-w-sm bg-zinc-900 rounded-3xl overflow-hidden shadow-2xl border border-white/10 ring-1 ring-black">
                        <div className="p-6 bg-zinc-950/80 border-b border-white/5 text-center relative">
                            <h3 className="text-lg font-extrabold text-white tracking-tight">Identity Verification</h3>
                            <p className="text-xs text-zinc-400 mt-1 font-medium">Please ensure your face or ID is clearly visible.</p>
                            <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-2xl -mr-10 -mt-10 pointer-events-none"></div>
                        </div>
                        <div className="h-72 bg-zinc-900/50 relative flex items-center justify-center border-b border-white/5">
                            {/* Camera viewfinder simulation */}
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
                            <button onClick={() => setShowCamera(null)} className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-white font-extrabold py-3.5 rounded-xl transition-all text-sm active:scale-[0.98] border border-white/5">Cancel</button>
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
