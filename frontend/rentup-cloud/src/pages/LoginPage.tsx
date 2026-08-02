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
  const [mode, setMode] = useState<'login' | 'signup'>('login')

  const [successMsg, setSuccessMsg] = useState<string | null>(null)

  if (authLoading) return null

  if (session) {
    return <Navigate to="/dashboard" replace />
  }

  const handle = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setSuccessMsg(null)

    if (mode === 'signup') {
      const { data, error } = await supabase.auth.signUp({ email, password })
      if (error) {
        setError(translateError(error.message))
      } else if (data.user && data.user.identities?.length === 0) {
        setError('Uživatel s tímto e-mailem již existuje. Přihlaste se prosím.')
      } else {
        setSuccessMsg('Účet byl úspěšně vytvořen! Pokud je vyžadováno potvrzení, zkontrolujte svůj e-mail a klikněte na potvrzovací odkaz.')
      }
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) {
        setError(translateError(error.message))
      }
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
            {mode === 'login' ? 'Přihlášení do účtu' : 'Registrace nového účtu'}
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

            {successMsg && (
              <p className="text-emerald-600 dark:text-emerald-400 text-sm bg-emerald-500/10 border border-emerald-500/20 rounded-xl px-4 py-3 font-medium">
                {successMsg}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-semibold rounded-xl py-3 text-sm transition-all duration-200 disabled:opacity-50 shadow-lg shadow-blue-500/25 hover:shadow-blue-500/35 hover:-translate-y-px active:translate-y-0"
            >
              {loading ? 'Ověřování...' : mode === 'login' ? 'Přihlásit se do RentUP' : 'Vytvořit poradenský účet'}
            </button>
          </form>

          <p className="text-center text-zinc-500 dark:text-zinc-400 text-sm mt-6">
            {mode === 'login' ? 'Zatím nemáte přístup?' : 'Máte již svůj účet?'}{' '}
            <button
              onClick={() => setMode(m => m === 'login' ? 'signup' : 'login')}
              className="text-blue-600 dark:text-blue-400 font-semibold hover:underline transition-colors"
            >
              {mode === 'login' ? 'Založit účet zdarma' : 'Přejít k přihlášení'}
            </button>
          </p>
        </div>
      </div>
    </div>
  )
}
