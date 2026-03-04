'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { ShieldCheck, Loader2, AlertTriangle } from 'lucide-react'
import { Suspense } from 'react'

function MagicLinkHandler() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [error, setError] = useState<string | null>(null)
  const [status, setStatus] = useState('Verifying your link...')

  useEffect(() => {
    const token = searchParams.get('token')
    const redirect = searchParams.get('redirect')

    if (!token) {
      setError('No token found in the link. Please request a new one.')
      return
    }

    // If already logged in, check if session matches the magic link user
    const existingToken = localStorage.getItem('token')
    const existingUser = localStorage.getItem('user')
    if (existingToken && existingUser) {
      try {
        const parsed = JSON.parse(existingUser)
        // Decode magic token to get userId (without verifying — just reading payload)
        const payload = JSON.parse(atob(token.split('.')[1]))
        if (parsed.id === payload.userId || parsed.userId === payload.userId) {
          // Already logged in as the correct user — just redirect
          setStatus('Already logged in — redirecting...')
          setTimeout(() => {
            if (redirect) router.replace(redirect)
            else if (payload.taskId) router.replace(`/loto/${payload.taskId}`)
            else router.replace('/dashboard')
          }, 500)
          return
        }
      } catch { /* ignore parse errors, fall through to normal auth */ }
    }

    setStatus('Authenticating you securely...')
    fetch(`/api/auth/magic?token=${encodeURIComponent(token)}`)
      .then(r => r.json())
      .then(data => {
        if (data.error) { setError(data.error); return }
        localStorage.setItem('token', data.token)
        localStorage.setItem('user', JSON.stringify(data.user))
        setStatus('Redirecting you...')
        if (redirect) router.replace(redirect)
        else if (data.taskId) router.replace(`/loto/${data.taskId}`)
        else router.replace('/dashboard')
      })
      .catch(() => setError('Something went wrong. Please try again or log in manually.'))
  }, [searchParams, router])

  return (
    <div className="min-h-screen bg-[#F4F7FE] flex items-center justify-center p-6">
      <div className="bg-white rounded-2xl shadow-xl p-10 max-w-md w-full text-center border border-slate-100">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-blue-50 text-blue-600 mx-auto mb-6">
          {error ? (
            <AlertTriangle className="h-8 w-8 text-red-500" />
          ) : (
            <ShieldCheck className="h-8 w-8" />
          )}
        </div>

        {error ? (
          <>
            <h1 className="text-xl font-extrabold text-slate-900 mb-2">Link Expired or Invalid</h1>
            <p className="text-sm font-bold text-slate-500 mb-6">{error}</p>
            <button
              onClick={() => router.push('/login')}
              className="w-full rounded-xl bg-blue-600 py-3 text-sm font-extrabold text-white hover:bg-blue-700 transition-all"
            >
              Go to Login
            </button>
          </>
        ) : (
          <>
            <Loader2 className="h-6 w-6 animate-spin text-blue-500 mx-auto mb-4" />
            <h1 className="text-xl font-extrabold text-slate-900 mb-2">Smart LOTO</h1>
            <p className="text-sm font-bold text-slate-500">{status}</p>
          </>
        )}
      </div>
    </div>
  )
}

export default function MagicPage() {
  return (
    <Suspense>
      <MagicLinkHandler />
    </Suspense>
  )
}
