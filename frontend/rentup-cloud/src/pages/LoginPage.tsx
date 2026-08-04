import { useState } from 'react'
import { Navigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'

export default function LoginPage() {
  const { session, loading: authLoading } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showInviteDialog, setShowInviteDialog] = useState(false)

  if (authLoading) return null

  if (session) {
    return <Navigate to="/dashboard" replace />
  }

  const handle = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      setError(translateError(error.message))
    }
    setLoading(false)
  }

  const translateError = (msg: string) => {
    if (msg.includes('Email not confirmed')) return 'E-mail dosud nebyl potvrzen. Zkontrolujte prosím svou e-mailovou schránku a klikněte na potvrzovací odkaz.'
    if (msg.includes('Invalid login credentials')) return 'Nesprávný e-mail nebo heslo.'
    if (msg.includes('User already registered')) return 'Uživatel s tímto e-mailem je již registrován.'
    if (msg.includes('Password should be at least')) return 'Heslo musí mít alespoň 6 znaků.'
    return msg
  }

  return (
    <div className="min-h-screen bg-transparent flex items-center justify-center p-4 relative overflow-hidden font-sans">
      {/* Background Dots & Glow */}
      <div className="bg-dots" />
      <div className="bg-glow">
        <div className="glow-orb-1" />
        <div className="glow-orb-2" />
      </div>

      <div className="relative w-full max-w-md z-10 animate-in zoom-in-95 duration-300">
        {/* Logo */}
        <div className="text-center mb-8 flex flex-col items-center">
          <div className="mb-4">
            <img 
              src="/assets/RentUP_Logo_Dark.png" 
              alt="RentUP" 
              className="h-12 w-auto block dark:hidden object-contain mx-auto"
            />
            <img 
              src="/assets/RentUP_Logo_White.png" 
              alt="RentUP" 
              className="h-12 w-auto hidden dark:block object-contain mx-auto"
            />
          </div>
          <h1 className="text-zinc-900 dark:text-white font-bold text-xl tracking-tight">RentUP Cloud & AUM</h1>
          <p className="text-zinc-500 dark:text-zinc-400 text-sm mt-1">Profesionální správa portfolia pro investiční poradce</p>
        </div>

        {/* Card */}
        <div className="modern-card p-8 shadow-2xl backdrop-blur-xl border border-zinc-200 dark:border-zinc-800 bg-white/90 dark:bg-zinc-900/90">
          <h2 className="text-zinc-900 dark:text-white font-bold text-lg mb-6">
            Přihlášení do účtu
          </h2>

          <form onSubmit={handle} className="space-y-4">
            <div>
              <label className="block text-zinc-700 dark:text-zinc-300 text-xs font-bold mb-1.5 uppercase tracking-wider">E-mail</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                className="w-full bg-zinc-50 dark:bg-zinc-800/80 border border-zinc-300 dark:border-zinc-700 rounded-xl px-4 py-3 text-zinc-900 dark:text-white placeholder-zinc-400 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all"
                placeholder="vas@email.cz"
              />
            </div>

            <div>
              <label className="block text-zinc-700 dark:text-zinc-300 text-xs font-bold mb-1.5 uppercase tracking-wider">Heslo</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                className="w-full bg-zinc-50 dark:bg-zinc-800/80 border border-zinc-300 dark:border-zinc-700 rounded-xl px-4 py-3 text-zinc-900 dark:text-white placeholder-zinc-400 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all"
                placeholder="••••••••"
              />
            </div>

            {error && (
              <p className="text-red-600 dark:text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 font-medium">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-semibold rounded-xl py-3 text-sm transition-all duration-200 disabled:opacity-50 shadow-lg shadow-blue-500/25 hover:shadow-blue-500/35 hover:-translate-y-px active:translate-y-0"
            >
              {loading ? 'Ověřování...' : 'Přihlásit se do RentUP'}
            </button>
          </form>

          <p className="text-center text-zinc-500 dark:text-zinc-400 text-sm mt-6">
            Zatím nemáte přístup?{' '}
            <button
              type="button"
              onClick={() => setShowInviteDialog(true)}
              className="text-blue-600 dark:text-blue-400 font-semibold hover:underline transition-colors"
            >
              Zažádat o registraci
            </button>
          </p>
        </div>
      </div>

      {/* Invite Only Modal Dialog */}
      {showInviteDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="modern-card p-6 md:p-8 max-w-md w-full shadow-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 relative text-center animate-in zoom-in-95 duration-200">
            <div className="w-12 h-12 rounded-2xl bg-blue-500/10 border border-blue-500/20 text-blue-600 dark:text-blue-400 flex items-center justify-center mx-auto mb-4">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <h3 className="text-zinc-900 dark:text-white font-bold text-lg mb-2">
              Aplikace je pouze pro zvané
            </h3>
            <p className="text-zinc-600 dark:text-zinc-400 text-sm leading-relaxed mb-6">
              RentUP Cloud funguje momentálně v režimu <strong>Invite-Only</strong>. Pro registraci a zřízení nového přístupového účtu prosím kontaktujte správce webu prostřednictvím e-mailu volnou formou.
            </p>
            
            <a
              href="mailto:jan.adam@zfpa.cz?subject=Žádost%20o%20registraci%20do%20RentUP%20Cloud"
              className="flex items-center justify-center gap-2 w-full bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800/80 dark:hover:bg-zinc-800 text-zinc-900 dark:text-white font-semibold rounded-xl py-3 text-sm transition-all duration-200 border border-zinc-300/50 dark:border-zinc-700/50 mb-3 group"
            >
              <svg className="w-4 h-4 text-blue-500 group-hover:scale-110 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              jan.adam@zfpa.cz
            </a>

            <button
              type="button"
              onClick={() => setShowInviteDialog(false)}
              className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-semibold rounded-xl py-3 text-sm transition-all duration-200 shadow-lg shadow-blue-500/25 hover:shadow-blue-500/35"
            >
              Rozumím, zavřít
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
