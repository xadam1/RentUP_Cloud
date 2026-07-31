import { useState } from 'react'
import { supabase } from '@/lib/supabase'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [mode, setMode] = useState<'login' | 'signup'>('login')

  const handle = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    const fn = mode === 'login'
      ? supabase.auth.signInWithPassword({ email, password })
      : supabase.auth.signUp({ email, password })
    const { error } = await fn
    if (error) setError(error.message)
    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center p-4">
      {/* Ambient glow */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-blue-600/10 rounded-full blur-3xl" />
      </div>

      <div className="relative w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 mb-4">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center shadow-lg shadow-blue-500/30">
              <span className="text-white font-bold text-sm">R</span>
            </div>
            <span className="text-white font-semibold text-xl tracking-tight">RentUP Cloud</span>
          </div>
          <p className="text-white/40 text-sm">Správa AUM pro finanční poradce</p>
        </div>

        {/* Card */}
        <div className="bg-white/[0.04] border border-white/[0.08] rounded-2xl p-8 backdrop-blur-sm shadow-2xl">
          <h2 className="text-white font-semibold text-lg mb-6">
            {mode === 'login' ? 'Přihlásit se' : 'Vytvořit účet'}
          </h2>

          <form onSubmit={handle} className="space-y-4">
            <div>
              <label className="block text-white/60 text-xs font-medium mb-1.5 uppercase tracking-wider">E-mail</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                className="w-full bg-white/[0.06] border border-white/[0.1] rounded-xl px-4 py-3 text-white placeholder-white/25 text-sm focus:outline-none focus:border-blue-500/60 focus:ring-1 focus:ring-blue-500/30 transition-all"
                placeholder="vas@email.cz"
              />
            </div>

            <div>
              <label className="block text-white/60 text-xs font-medium mb-1.5 uppercase tracking-wider">Heslo</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                className="w-full bg-white/[0.06] border border-white/[0.1] rounded-xl px-4 py-3 text-white placeholder-white/25 text-sm focus:outline-none focus:border-blue-500/60 focus:ring-1 focus:ring-blue-500/30 transition-all"
                placeholder="••••••••"
              />
            </div>

            {error && (
              <p className="text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-blue-600 to-violet-600 hover:from-blue-500 hover:to-violet-500 text-white font-medium rounded-xl py-3 text-sm transition-all duration-200 disabled:opacity-50 shadow-lg shadow-blue-500/20 hover:shadow-blue-500/30 hover:-translate-y-px active:translate-y-0"
            >
              {loading ? 'Načítám...' : mode === 'login' ? 'Přihlásit se' : 'Vytvořit účet'}
            </button>
          </form>

          <p className="text-center text-white/40 text-sm mt-6">
            {mode === 'login' ? 'Nemáte účet?' : 'Máte účet?'}{' '}
            <button
              onClick={() => setMode(m => m === 'login' ? 'signup' : 'login')}
              className="text-blue-400 hover:text-blue-300 transition-colors"
            >
              {mode === 'login' ? 'Registrovat' : 'Přihlásit se'}
            </button>
          </p>
        </div>
      </div>
    </div>
  )
}
