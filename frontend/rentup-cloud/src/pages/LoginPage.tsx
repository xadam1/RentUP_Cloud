import { useState, useMemo } from 'react'
import { Navigate, useNavigate, useSearchParams } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { Eye, EyeOff, CheckCircle2, AlertCircle, KeyRound, Mail, ArrowLeft, ShieldCheck, Check, Lock } from 'lucide-react'

type AuthView = 'login' | 'forgot_password' | 'update_password'

export default function LoginPage() {
  const { session, loading: authLoading, authAction, clearAuthAction } = useAuth()
  const [searchParams, setSearchParams] = useSearchParams()
  const navigate = useNavigate()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [resetSent, setResetSent] = useState(false)
  const [showInviteDialog, setShowInviteDialog] = useState(false)

  const urlView = searchParams.get('view') as AuthView | null
  const urlType = searchParams.get('type')

  const currentView: AuthView = useMemo(() => {
    if (urlView === 'update_password' || authAction === 'invite' || authAction === 'recovery' || urlType === 'invite' || urlType === 'recovery') {
      return 'update_password'
    }
    if (urlView === 'forgot_password') {
      return 'forgot_password'
    }
    return 'login'
  }, [urlView, urlType, authAction])

  // Kritéria pro bezpečnost hesla
  const pwdCriteria = useMemo(() => ({
    length: newPassword.length >= 8,
    case: /[A-Z]/.test(newPassword) && /[a-z]/.test(newPassword),
    numberOrSpecial: /[0-9]/.test(newPassword) || /[^A-Za-z0-9]/.test(newPassword),
    match: newPassword.length > 0 && newPassword === confirmPassword,
  }), [newPassword, confirmPassword])

  const isPasswordValid = Object.values(pwdCriteria).every(Boolean)

  if (authLoading) {
    return (
      <div className="min-h-screen bg-transparent flex items-center justify-center p-4">
        <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  // Pokud má uživatel aktivní relaci a NEJDE si právě vytvořit heslo z invite či resetu, pustíme ho do aplikace
  if (session && currentView !== 'update_password') {
    return <Navigate to="/dashboard" replace />
  }

  const switchView = (view: AuthView) => {
    setError(null)
    setResetSent(false)
    setSearchParams(view === 'login' ? {} : { view })
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      setError(translateError(error.message))
      setLoading(false)
    } else {
      localStorage.setItem('rentup_welcome_message', 'welcome_login')
    }
  }

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/login?view=update_password&type=recovery`,
    })
    setLoading(false)
    if (error) {
      setError(translateError(error.message))
    } else {
      setResetSent(true)
    }
  }

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!isPasswordValid) {
      setError('Heslo nesplňuje všechna požadovaná bezpečnostní kritéria.')
      return
    }
    setLoading(true)
    setError(null)

    const { error } = await supabase.auth.updateUser({ password: newPassword })
    setLoading(false)
    if (error) {
      setError(translateError(error.message))
    } else {
      clearAuthAction()
      const isInvite = urlType === 'invite' || authAction === 'invite'
      localStorage.setItem('rentup_welcome_message', isInvite ? 'welcome_invite' : 'welcome_password_updated')
      navigate('/dashboard', { replace: true })
    }
  }

  const translateError = (msg: string) => {
    if (msg.includes('Email not confirmed')) return 'E-mail dosud nebyl potvrzen. Zkontrolujte prosím svou e-mailovou schránku a klikněte na potvrzovací odkaz.'
    if (msg.includes('Invalid login credentials')) return 'Nesprávný e-mail nebo heslo.'
    if (msg.includes('User already registered')) return 'Uživatel s tímto e-mailem je již registrován.'
    if (msg.includes('Password should be at least')) return 'Heslo musí mít alespoň 8 znaků.'
    if (msg.includes('New password should be different')) return 'Nové heslo se musí lišit od Vašeho předchozího hesla.'
    if (msg.includes('rate limit')) return 'Z bezpečnostních důvodů byl dosažen limit pokusů. Zkuste to prosím za pár minut.'
    if (msg.includes('Auth session missing')) return 'Platnost bezpečnostní relace vypršela. Klikněte prosím znovu na odkaz z e-mailu.'
    if (msg.includes('Token has expired or is invalid')) return 'Odkaz v pozvánce či na obnovu hesla již neplatí nebo vypršel.'
    return msg
  }

  const isInviteMode = urlType === 'invite' || authAction === 'invite'

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
        <div className="modern-card p-8 shadow-2xl backdrop-blur-xl border border-zinc-200 dark:border-zinc-800 bg-white/95 dark:bg-zinc-900/95 transition-all duration-300">
          {/* VIEW 1: LOGIN */}
          {currentView === 'login' && (
            <>
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-zinc-900 dark:text-white font-bold text-lg">
                  Přihlášení do účtu
                </h2>
                <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                  Invite-Only
                </span>
              </div>

              <form onSubmit={handleLogin} className="space-y-4">
                <div>
                  <label className="block text-zinc-700 dark:text-zinc-300 text-xs font-bold mb-1.5 uppercase tracking-wider">E-mail</label>
                  <div className="relative">
                    <input
                      type="email"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      required
                      className="w-full bg-zinc-50 dark:bg-zinc-800/80 border border-zinc-300 dark:border-zinc-700 rounded-xl pl-4 pr-10 py-3 text-zinc-900 dark:text-white placeholder-zinc-400 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all"
                      placeholder="vas@email.cz"
                    />
                    <Mail className="w-4 h-4 text-zinc-400 absolute right-3.5 top-3.5 pointer-events-none" />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-zinc-700 dark:text-zinc-300 text-xs font-bold uppercase tracking-wider">Heslo</label>
                    <button
                      type="button"
                      onClick={() => switchView('forgot_password')}
                      className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
                    >
                      Zapomněli jste heslo?
                    </button>
                  </div>
                  <div className="relative">
                    <input
                      type="password"
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      required
                      className="w-full bg-zinc-50 dark:bg-zinc-800/80 border border-zinc-300 dark:border-zinc-700 rounded-xl pl-4 pr-10 py-3 text-zinc-900 dark:text-white placeholder-zinc-400 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all"
                      placeholder="••••••••"
                    />
                    <Lock className="w-4 h-4 text-zinc-400 absolute right-3.5 top-3.5 pointer-events-none" />
                  </div>
                </div>

                {error && (
                  <div className="flex items-start gap-2.5 text-red-600 dark:text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 font-medium animate-in fade-in">
                    <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5 text-red-500" />
                    <span>{error}</span>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-semibold rounded-xl py-3 text-sm transition-all duration-200 disabled:opacity-50 shadow-lg shadow-blue-500/25 hover:shadow-blue-500/35 hover:-translate-y-px active:translate-y-0 cursor-pointer"
                >
                  {loading ? 'Ověřování dat...' : 'Přihlásit se do RentUP'}
                </button>
              </form>

              <div className="border-t border-zinc-200 dark:border-zinc-800 my-6" />

              <p className="text-center text-zinc-500 dark:text-zinc-400 text-sm">
                Zatím nemáte přístup?{' '}
                <button
                  type="button"
                  onClick={() => setShowInviteDialog(true)}
                  className="text-blue-600 dark:text-blue-400 font-semibold hover:underline transition-colors cursor-pointer"
                >
                  Zažádat o registraci
                </button>
              </p>
            </>
          )}

          {/* VIEW 2: FORGOT PASSWORD */}
          {currentView === 'forgot_password' && (
            <div className="space-y-5 animate-in fade-in duration-200">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                  <KeyRound className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-zinc-900 dark:text-white font-bold text-lg">Obnova hesla</h2>
                  <p className="text-zinc-500 dark:text-zinc-400 text-xs">Zašleme vám odkaz k nastavení nového hesla</p>
                </div>
              </div>

              {resetSent ? (
                <div className="space-y-5 animate-in zoom-in-95 duration-200">
                  <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-sm space-y-2">
                    <div className="flex items-center gap-2 font-bold text-base">
                      <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                      <span>E-mail byl úspěšně odeslán</span>
                    </div>
                    <p className="text-xs leading-relaxed text-zinc-600 dark:text-zinc-300">
                      Na adresu <strong className="text-zinc-900 dark:text-white font-mono">{email}</strong> jsme zaslali zprávu s instrukcemi pro vytvoření nového hesla. Odkaz je z bezpečnostních důvodů časově omezený.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => switchView('login')}
                    className="w-full bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-900 dark:text-white font-semibold rounded-xl py-3 text-sm transition-all flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    <span>Zpět k přihlášení</span>
                  </button>
                </div>
              ) : (
                <form onSubmit={handleForgotPassword} className="space-y-4">
                  <div>
                    <label className="block text-zinc-700 dark:text-zinc-300 text-xs font-bold mb-1.5 uppercase tracking-wider">Registrační e-mail</label>
                    <div className="relative">
                      <input
                        type="email"
                        value={email}
                        onChange={e => setEmail(e.target.value)}
                        required
                        className="w-full bg-zinc-50 dark:bg-zinc-800/80 border border-zinc-300 dark:border-zinc-700 rounded-xl pl-4 pr-10 py-3 text-zinc-900 dark:text-white placeholder-zinc-400 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all"
                        placeholder="vas@email.cz"
                      />
                      <Mail className="w-4 h-4 text-zinc-400 absolute right-3.5 top-3.5 pointer-events-none" />
                    </div>
                  </div>

                  {error && (
                    <div className="flex items-start gap-2.5 text-red-600 dark:text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 font-medium animate-in fade-in">
                      <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5 text-red-500" />
                      <span>{error}</span>
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={loading || !email}
                    className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-semibold rounded-xl py-3 text-sm transition-all duration-200 disabled:opacity-50 shadow-lg shadow-blue-500/25 hover:shadow-blue-500/35 cursor-pointer"
                  >
                    {loading ? 'Odesílám požadavek...' : 'Odeslat odkaz na obnovu hesla'}
                  </button>

                  <button
                    type="button"
                    onClick={() => switchView('login')}
                    className="w-full text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white font-medium text-xs py-2 transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    <span>Zpět k přihlášení do účtu</span>
                  </button>
                </form>
              )}
            </div>
          )}

          {/* VIEW 3: UPDATE PASSWORD (INVITE OR RECOVERY) */}
          {currentView === 'update_password' && (
            <div className="space-y-5 animate-in fade-in duration-200">
              <div className="flex items-center gap-3 border-b border-zinc-200 dark:border-zinc-800 pb-4">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-zinc-900 dark:text-white font-bold text-base md:text-lg">
                    {isInviteMode ? 'Vítejte v RentUP Cloud!' : 'Nastavení nového hesla'}
                  </h2>
                  <p className="text-zinc-500 dark:text-zinc-400 text-xs">
                    {isInviteMode ? 'Pro aktivaci Vašeho účtu si nastavte přístupové heslo' : 'Zvolte si nové bezpečné heslo ke svému účtu'}
                  </p>
                </div>
              </div>

              {!session && !authLoading ? (
                <div className="space-y-4">
                  <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-700 dark:text-amber-400 text-sm flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5 text-amber-500" />
                    <div className="space-y-1">
                      <p className="font-bold">Chybí autorizační relace</p>
                      <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">
                        Odkaz z e-mailu již pravděpodobně vypršel nebo byl použit. Požádejte prosím o nové zaslání zprávy pro nastavení hesla.
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => switchView('forgot_password')}
                    className="w-full bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-xl py-3 text-sm transition-all cursor-pointer shadow-lg shadow-blue-500/25"
                  >
                    Vyžádat odkaz pro obnovu hesla
                  </button>
                  <button
                    type="button"
                    onClick={() => switchView('login')}
                    className="w-full text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white font-semibold text-xs py-2 text-center block cursor-pointer"
                  >
                    Zpět na přihlašování
                  </button>
                </div>
              ) : (
                <form onSubmit={handleUpdatePassword} className="space-y-4">
                  <div>
                    <label className="block text-zinc-700 dark:text-zinc-300 text-xs font-bold mb-1.5 uppercase tracking-wider">Nové heslo</label>
                    <div className="relative">
                      <input
                        type={showNewPassword ? "text" : "password"}
                        value={newPassword}
                        onChange={e => setNewPassword(e.target.value)}
                        required
                        className="w-full bg-zinc-50 dark:bg-zinc-800/80 border border-zinc-300 dark:border-zinc-700 rounded-xl pl-4 pr-11 py-3 text-zinc-900 dark:text-white placeholder-zinc-400 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all"
                        placeholder="Minimálně 8 znaků..."
                      />
                      <button
                        type="button"
                        onClick={() => setShowNewPassword(!showNewPassword)}
                        className="absolute right-3 top-3 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 p-1 cursor-pointer transition-colors"
                      >
                        {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-zinc-700 dark:text-zinc-300 text-xs font-bold mb-1.5 uppercase tracking-wider">Potvrdit nové heslo</label>
                    <div className="relative">
                      <input
                        type={showConfirmPassword ? "text" : "password"}
                        value={confirmPassword}
                        onChange={e => setConfirmPassword(e.target.value)}
                        required
                        className="w-full bg-zinc-50 dark:bg-zinc-800/80 border border-zinc-300 dark:border-zinc-700 rounded-xl pl-4 pr-11 py-3 text-zinc-900 dark:text-white placeholder-zinc-400 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all"
                        placeholder="Zadejte stejné heslo pro ověření..."
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute right-3 top-3 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 p-1 cursor-pointer transition-colors"
                      >
                        {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  {/* Bezpečnostní ukazatel hesla */}
                  <div className="p-3.5 rounded-xl bg-zinc-100/80 dark:bg-zinc-800/50 border border-zinc-200/60 dark:border-zinc-700/60 space-y-2">
                    <p className="text-[11px] font-bold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider">Bezpečnostní požadavky na heslo:</p>
                    <div className="grid grid-cols-1 gap-1.5 text-xs">
                      <div className={`flex items-center gap-2 transition-colors ${pwdCriteria.length ? 'text-emerald-600 dark:text-emerald-400 font-semibold' : 'text-zinc-500 dark:text-zinc-400'}`}>
                        {pwdCriteria.length ? <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" /> : <div className="w-4 h-4 rounded-full border-2 border-zinc-400/50 flex-shrink-0" />}
                        <span>Minimální délka 8 znaků</span>
                      </div>
                      <div className={`flex items-center gap-2 transition-colors ${pwdCriteria.case ? 'text-emerald-600 dark:text-emerald-400 font-semibold' : 'text-zinc-500 dark:text-zinc-400'}`}>
                        {pwdCriteria.case ? <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" /> : <div className="w-4 h-4 rounded-full border-2 border-zinc-400/50 flex-shrink-0" />}
                        <span>Malé a velké písmeno (A-Z, a-z)</span>
                      </div>
                      <div className={`flex items-center gap-2 transition-colors ${pwdCriteria.numberOrSpecial ? 'text-emerald-600 dark:text-emerald-400 font-semibold' : 'text-zinc-500 dark:text-zinc-400'}`}>
                        {pwdCriteria.numberOrSpecial ? <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" /> : <div className="w-4 h-4 rounded-full border-2 border-zinc-400/50 flex-shrink-0" />}
                        <span>Alespoň 1 číslice nebo speciální znak (#, @, ...)</span>
                      </div>
                      <div className={`flex items-center gap-2 transition-colors ${pwdCriteria.match && confirmPassword ? 'text-emerald-600 dark:text-emerald-400 font-semibold' : 'text-zinc-500 dark:text-zinc-400'}`}>
                        {pwdCriteria.match && confirmPassword ? <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" /> : <div className="w-4 h-4 rounded-full border-2 border-zinc-400/50 flex-shrink-0" />}
                        <span>Obě hesla se přesně shodují</span>
                      </div>
                    </div>
                  </div>

                  {error && (
                    <div className="flex items-start gap-2.5 text-red-600 dark:text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 font-medium animate-in fade-in">
                      <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5 text-red-500" />
                      <span>{error}</span>
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={loading || !isPasswordValid}
                    className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-semibold rounded-xl py-3.5 text-sm transition-all duration-200 disabled:opacity-50 shadow-lg shadow-emerald-500/25 hover:shadow-emerald-500/35 flex items-center justify-center gap-2 cursor-pointer"
                  >
                    {loading ? (
                      <span>Ukládám heslo a aktivuji...</span>
                    ) : (
                      <>
                        <Check className="w-4 h-4 stroke-[3]" />
                        <span>{isInviteMode ? 'Aktivovat účet a přejít na AUM Dashboard' : 'Uložit nové heslo a přejít do aplikace'}</span>
                      </>
                    )}
                  </button>
                </form>
              )}
            </div>
          )}
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
