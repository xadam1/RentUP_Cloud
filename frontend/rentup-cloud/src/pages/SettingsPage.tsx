import { useState, useEffect, useMemo } from 'react'
import { settingsApi, aumApi, type UpdateSettingsRequest } from '@/lib/api'
import { supabase } from '@/lib/supabase'
import { useTheme } from '@/contexts/ThemeContext'
import { Database, Sparkles, CheckCircle2, AlertCircle, RefreshCw, TrendingUp, ShieldCheck, Eye, EyeOff, Check } from 'lucide-react'
import { useModal } from '@/contexts/ModalContext'

export default function SettingsPage() {
  const { confirm, alert } = useModal()
  const [form, setForm] = useState<UpdateSettingsRequest>({ basePointValue: 150, monthlyGoalPoints: 0, theme: 'dark' })
  const [saved, setSaved] = useState(false)
  const [loading, setLoading] = useState(true)
  const [seeding, setSeeding] = useState(false)
  const [seedResult, setSeedResult] = useState<{ success?: string; error?: string } | null>(null)
  const [comparisonPeriod, setComparisonPeriod] = useState<string>(() => {
    return localStorage.getItem('rentup_dashboard_comparison_period') || 'YTD'
  })
  const { theme } = useTheme()

  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [pwdLoading, setPwdLoading] = useState(false)
  const [pwdError, setPwdError] = useState<string | null>(null)
  const [pwdSuccess, setPwdSuccess] = useState<string | null>(null)

  const pwdCriteria = useMemo(() => ({
    length: newPassword.length >= 8,
    case: /[A-Z]/.test(newPassword) && /[a-z]/.test(newPassword),
    numberOrSpecial: /[0-9]/.test(newPassword) || /[^A-Za-z0-9]/.test(newPassword),
    match: newPassword.length > 0 && newPassword === confirmPassword,
  }), [newPassword, confirmPassword])

  const isPasswordValid = Object.values(pwdCriteria).every(Boolean)

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!isPasswordValid) {
      setPwdError('Heslo nesplňuje všechna požadovaná bezpečnostní kritéria.')
      return
    }
    setPwdLoading(true)
    setPwdError(null)
    setPwdSuccess(null)

    const { error } = await supabase.auth.updateUser({ password: newPassword })
    setPwdLoading(false)
    if (error) {
      if (error.message.includes('Password should be at least')) setPwdError('Heslo musí mít alespoň 8 znaků.')
      else if (error.message.includes('different')) setPwdError('Nové heslo se musí lišit od Vašeho stávajícího hesla.')
      else setPwdError('Při změně hesla došlo k chybě: ' + error.message)
    } else {
      setPwdSuccess('Vaše nové heslo bylo úspěšně nastaveno a uloženo do zabezpečeného úložiště.')
      setNewPassword('')
      setConfirmPassword('')
      setTimeout(() => setPwdSuccess(null), 6000)
    }
  }

  useEffect(() => {
    settingsApi.get().then(r => setForm({
      basePointValue: r.data.basePointValue,
      monthlyGoalPoints: r.data.monthlyGoalPoints,
      theme: r.data.theme,
    })).catch(() => {
      setForm({ basePointValue: 150, monthlyGoalPoints: 100, theme: 'dark' })
    }).finally(() => setLoading(false))
  }, [])

  const save = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await settingsApi.update({ ...form, theme })
      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
    } catch {
      await alert({
        title: 'Chyba',
        description: 'Nepodařilo se uložit nastavení.',
        variant: 'danger'
      })
    }
  }

  const handleSeedTestData = async () => {
    const confirmed = await confirm({
      title: 'Nahrát ukázková data?',
      description: 'Přejete si do vašeho účtu nahrát sadu vzorových investičních aktiv (Conseq, AVANT, Wood) s historií snímků portfolia? Tato akce je vhodná pro otestování nového rozhraní.',
      variant: 'info',
      confirmText: 'Nahrát ukázková data',
      cancelText: 'Zrušit'
    })
    if (!confirmed) {
      return
    }

    setSeeding(true)
    setSeedResult(null)
    try {
      await aumApi.seedTestData()
      setSeedResult({ success: 'Vzorová data pro AUM a snímky aktiv byla úspěšně vytvořena a propojena s vaším účtem!' })
    } catch (e: any) {
      setSeedResult({ error: e?.response?.data?.error || 'Při nahrávání ukázkových dat došlo k chybě.' })
    } finally {
      setSeeding(false)
    }
  }

  if (loading) {
    return (
      <div className="max-w-2xl space-y-6 animate-pulse">
        <div className="h-10 w-48 bg-zinc-200 dark:bg-zinc-800 rounded-xl" />
        <div className="h-72 w-full bg-zinc-200/50 dark:bg-zinc-800/40 rounded-2xl" />
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto space-y-8 pb-16 animate-in fade-in duration-300">
      {/* Období srovnání na Dashboardu */}
      <div className="modern-card p-6 lg:p-8 space-y-5 border-l-4 border-emerald-500">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1">
            <h2 className="text-base font-bold text-zinc-800 dark:text-zinc-100 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-emerald-500" />
              <span>Srovnávací období pro KPI karty (AUM & vklady)</span>
            </h2>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 max-w-xl leading-relaxed">
              Zvolte, za jaké historické období se má na hlavní stránce AUM Dashboard vypočítávat a zobrazovat porovnání růstu u karet Celkové AUM a Pravidelné vklady / měs. Tímto ovlivníte zobrazení procentuální změny (v plusu vykresleno zeleně s šipkou vzhůru, při poklesu červeně s šipkou dolů).
            </p>
          </div>
        </div>

        <div className="pt-2">
          <div className="inline-flex rounded-xl p-1.5 bg-zinc-100 dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700/60 text-sm font-semibold gap-1 flex-wrap">
            {(['1M', '3M', '6M', '1R', 'YTD'] as const).map(p => (
              <button
                key={p}
                type="button"
                onClick={() => {
                  setComparisonPeriod(p)
                  localStorage.setItem('rentup_dashboard_comparison_period', p)
                }}
                className={`px-4 py-2 rounded-lg transition-all cursor-pointer ${
                  comparisonPeriod === p
                    ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white shadow-sm font-bold border border-zinc-200/60 dark:border-zinc-600'
                    : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
                }`}
              >
                {p === '1M' && '1 měsíc (1M)'}
                {p === '3M' && '3 měsíce (3M)'}
                {p === '6M' && '6 měsíců (6M)'}
                {p === '1R' && '1 rok (1R)'}
                {p === 'YTD' && 'Od začátku roku (YTD)'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Kalkulační parametry Form */}
      <form onSubmit={save} className="modern-card p-6 lg:p-8 space-y-6">
        <div className="border-b border-zinc-200 dark:border-zinc-800 pb-4">
          <h2 className="text-base font-bold text-zinc-800 dark:text-zinc-100">Kalkulační parametry pro produkci</h2>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">Zadejte jednotnou hodnotu provizního bodu dle vaší manažerské nebo poradenské pozice.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-zinc-700 dark:text-zinc-300 text-xs font-bold uppercase tracking-wider mb-2">
              Hodnota bodu (CZK)
            </label>
            <div className="relative">
              <input
                type="number"
                step="any"
                value={form.basePointValue}
                onChange={e => setForm(f => ({ ...f, basePointValue: parseFloat(e.target.value) || 0 }))}
                className="w-full bg-zinc-50 dark:bg-zinc-800/80 border border-zinc-300 dark:border-zinc-700 rounded-xl px-4 py-3 text-zinc-900 dark:text-white text-sm font-mono font-bold focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all"
              />
              <span className="absolute right-4 top-3 text-sm font-semibold text-zinc-400 pointer-events-none">Kč</span>
            </div>
            <p className="text-zinc-500 dark:text-zinc-400 text-xs mt-1.5 leading-relaxed">
              Slouží k automatické konverzi odhadované produkce do finančních objemů: <code className="text-blue-500 font-mono font-semibold">body × hodnota bodu</code>.
            </p>
          </div>

          <div>
            <label className="block text-zinc-700 dark:text-zinc-300 text-xs font-bold uppercase tracking-wider mb-2">
              Měsíční cílová produkce (body)
            </label>
            <input
              type="number"
              step="any"
              value={form.monthlyGoalPoints}
              onChange={e => setForm(f => ({ ...f, monthlyGoalPoints: parseFloat(e.target.value) || 0 }))}
              className="w-full bg-zinc-50 dark:bg-zinc-800/80 border border-zinc-300 dark:border-zinc-700 rounded-xl px-4 py-3 text-zinc-900 dark:text-white text-sm font-mono font-bold focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all"
            />
            <p className="text-zinc-500 dark:text-zinc-400 text-xs mt-1.5 leading-relaxed">
              Nastaví měsíční cílový ukazatel na vizuálním ukazateli úspěšnosti.
            </p>
          </div>
        </div>

        <div className="pt-2">
          <button
            type="submit"
            className="px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-semibold rounded-xl text-sm transition-all duration-200 shadow-lg shadow-blue-500/25 flex items-center justify-center gap-2 max-w-xs cursor-pointer"
          >
            {saved ? (
              <>
                <CheckCircle2 className="w-4 h-4 text-emerald-300" />
                <span>Nastavení bylo uloženo</span>
              </>
            ) : (
              <span>Uložit nové parametry</span>
            )}
          </button>
        </div>
      </form>

      {/* Zabezpečení účtu - Změna hesla */}
      <div className="modern-card p-6 lg:p-8 space-y-6 border-l-4 border-blue-500">
        <div className="flex items-start justify-between gap-4 border-b border-zinc-200 dark:border-zinc-800 pb-4">
          <div className="space-y-1">
            <h2 className="text-base font-bold text-zinc-800 dark:text-zinc-100 flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-blue-500" />
              <span>Zabezpečení účtu a změna přihlašovacího hesla</span>
            </h2>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 max-w-xl leading-relaxed">
              Zde si můžete kdykoliv bezpečně obměnit své stávající heslo bez nutnosti odhlášení ze systému či čekání na e-mailové potvrzení.
            </p>
          </div>
        </div>

        <form onSubmit={handleUpdatePassword} className="space-y-5 max-w-xl">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className="block text-zinc-700 dark:text-zinc-300 text-xs font-bold mb-1.5 uppercase tracking-wider">
                Nové heslo
              </label>
              <div className="relative">
                <input
                  type={showNewPassword ? "text" : "password"}
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  required
                  className="w-full bg-zinc-50 dark:bg-zinc-800/80 border border-zinc-300 dark:border-zinc-700 rounded-xl pl-4 pr-11 py-3 text-zinc-900 dark:text-white placeholder-zinc-400 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all"
                  placeholder="Min. 8 znaků..."
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
              <label className="block text-zinc-700 dark:text-zinc-300 text-xs font-bold mb-1.5 uppercase tracking-wider">
                Potvrdit nové heslo
              </label>
              <div className="relative">
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  required
                  className="w-full bg-zinc-50 dark:bg-zinc-800/80 border border-zinc-300 dark:border-zinc-700 rounded-xl pl-4 pr-11 py-3 text-zinc-900 dark:text-white placeholder-zinc-400 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all"
                  placeholder="Zopakujte heslo..."
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
          </div>

          {/* Ukazatel síly hesla */}
          <div className="p-4 rounded-xl bg-zinc-100/80 dark:bg-zinc-800/50 border border-zinc-200/60 dark:border-zinc-700/60 space-y-2.5">
            <p className="text-[11px] font-bold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider">Požadovaná kritéria síly hesla:</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              <div className={`flex items-center gap-2 transition-colors ${pwdCriteria.length ? 'text-emerald-600 dark:text-emerald-400 font-semibold' : 'text-zinc-500 dark:text-zinc-400'}`}>
                {pwdCriteria.length ? <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" /> : <div className="w-4 h-4 rounded-full border-2 border-zinc-400/50 flex-shrink-0" />}
                <span>Minimální délka 8 znaků</span>
              </div>
              <div className={`flex items-center gap-2 transition-colors ${pwdCriteria.case ? 'text-emerald-600 dark:text-emerald-400 font-semibold' : 'text-zinc-500 dark:text-zinc-400'}`}>
                {pwdCriteria.case ? <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" /> : <div className="w-4 h-4 rounded-full border-2 border-zinc-400/50 flex-shrink-0" />}
                <span>Malá a velká písmena</span>
              </div>
              <div className={`flex items-center gap-2 transition-colors ${pwdCriteria.numberOrSpecial ? 'text-emerald-600 dark:text-emerald-400 font-semibold' : 'text-zinc-500 dark:text-zinc-400'}`}>
                {pwdCriteria.numberOrSpecial ? <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" /> : <div className="w-4 h-4 rounded-full border-2 border-zinc-400/50 flex-shrink-0" />}
                <span>Číslice nebo speciální znak</span>
              </div>
              <div className={`flex items-center gap-2 transition-colors ${pwdCriteria.match && confirmPassword ? 'text-emerald-600 dark:text-emerald-400 font-semibold' : 'text-zinc-500 dark:text-zinc-400'}`}>
                {pwdCriteria.match && confirmPassword ? <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" /> : <div className="w-4 h-4 rounded-full border-2 border-zinc-400/50 flex-shrink-0" />}
                <span>Obě zadaná hesla se shodují</span>
              </div>
            </div>
          </div>

          {pwdError && (
            <div className="flex items-center gap-2.5 text-red-600 dark:text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 font-medium animate-in fade-in">
              <AlertCircle className="w-4 h-4 flex-shrink-0 text-red-500" />
              <span>{pwdError}</span>
            </div>
          )}

          {pwdSuccess && (
            <div className="flex items-center gap-2.5 text-emerald-600 dark:text-emerald-400 text-sm bg-emerald-500/10 border border-emerald-500/20 rounded-xl px-4 py-3 font-medium animate-in fade-in">
              <CheckCircle2 className="w-4 h-4 flex-shrink-0 text-emerald-500" />
              <span>{pwdSuccess}</span>
            </div>
          )}

          <div>
            <button
              type="submit"
              disabled={pwdLoading || !isPasswordValid}
              className="px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-semibold rounded-xl text-sm transition-all duration-200 shadow-lg shadow-blue-500/25 flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
            >
              {pwdLoading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin text-white" />
                  <span>Aktualizuje se heslo...</span>
                </>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  <span>Změnit přístupové heslo</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* Správa a generátor ukázkových dat */}
      <div className="modern-card p-6 lg:p-8 space-y-5 border-l-4 border-indigo-500">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1">
            <h2 className="text-base font-bold text-zinc-800 dark:text-zinc-100 flex items-center gap-2">
              <Database className="w-5 h-5 text-indigo-500" />
              <span>Generátor testovacích dat pro AUM Dashboard</span>
            </h2>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 max-w-xl leading-relaxed">
              V případě, že nemáte k dispozici exportovaný CSV soubor z desktopové verze, můžete pomocí tohoto nástroje okamžitě vygenerovat reálná testovací data. Bude přidána skupina produktů (Conseq, Wood, AVANT, ZFP Gold) s ročním zhodnocením, provizními vzorci a historickými snímky.
            </p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-indigo-500/15 border border-indigo-500/20 flex items-center justify-center text-indigo-500 flex-shrink-0 hidden sm:flex">
            <Sparkles className="w-5 h-5" />
          </div>
        </div>

        {seedResult && (
          <div className={`p-4 rounded-xl border text-sm font-medium flex items-center gap-3 ${
            seedResult.success 
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400'
              : 'bg-red-500/10 border-red-500/30 text-red-600 dark:text-red-400'
          }`}>
            {seedResult.success ? <CheckCircle2 className="w-5 h-5 flex-shrink-0 text-emerald-500" /> : <AlertCircle className="w-5 h-5 flex-shrink-0 text-red-500" />}
            <span>{seedResult.success || seedResult.error}</span>
          </div>
        )}

        <div className="pt-2 flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
          <button
            type="button"
            onClick={handleSeedTestData}
            disabled={seeding}
            className="px-5 py-3 bg-zinc-900 dark:bg-white hover:bg-zinc-800 dark:hover:bg-zinc-100 text-white dark:text-zinc-900 font-semibold rounded-xl text-sm transition-all shadow-md flex items-center justify-center gap-2.5 disabled:opacity-50 cursor-pointer"
          >
            {seeding ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin text-blue-500" />
                <span>Generují se testovací záznamy...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 text-amber-400 fill-amber-400" />
                <span>Vygenerovat testovací AUM data (6 produktů)</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
