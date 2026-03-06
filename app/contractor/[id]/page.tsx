'use client'

import { useEffect, use } from 'react'
import { useRouter } from 'next/navigation'

export default function ContractorPortalRedirect({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params)
    const router = useRouter()

    useEffect(() => {
        router.replace(`/loto/${id}/contractor`)
    }, [id, router])

    return (
        <div className="min-h-screen bg-zinc-950 flex items-center justify-center font-sans">
            <div className="text-center space-y-4">
                <div className="w-12 h-12 border-4 border-emerald-500 border-t-transparent animate-spin rounded-full mx-auto"></div>
                <p className="text-zinc-400 font-bold uppercase tracking-widest text-xs">Redirecting to Contractor Portal...</p>
            </div>
        </div>
    )
}
