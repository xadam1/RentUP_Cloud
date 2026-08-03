import { useState, useEffect } from 'react'
import { settingsApi, aumApi, type UpdateSettingsRequest } from '@/lib/api'
import { useTheme } from '@/contexts/ThemeContext'
import { Database, Sparkles, CheckCircle2, AlertCircle, RefreshCw, TrendingUp } from 'lucide-react'

export default function SettingsPage() {
  const [form, setForm] = useState<UpdateSettingsRequest>({ basePointValue: 1649, monthlyGoalPoints: 0, theme: 'dark' })
  const [saved, setSaved] = useState(false)
  const [loading, setLoading] = useState(true)
  const [seeding, setSeeding] = useState(false)
  const [seedResult, setSeedResult] = useState<{ success?: string; error?: string } | null>(null)
  const [comparisonPeriod, setComparisonPeriod] = useState<string>(() => {
    return localStorage.getItem('rentup_dashboard_comparison_period') || 'YTD'
  })
  const { theme } = useTheme()

  useEffect(() => {
    settingsApi.get().then(r => setForm({
      basePointValue: r.data.basePointValue,
      monthlyGoalPoints: r.data.monthlyGoalPoints,
      theme: r.data.theme,
    })).catch(() => {
      setForm({ basePointValue: 1649, monthlyGoalPoints: 100, theme: 'dark' })
    }).finally(() => setLoading(false))
  }, [])

  const save = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await settingsApi.update({ ...form, theme })
      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
    } catch (err) {
      alert('Nepodařilo se uložit nastavení.')
    }
  }

  const handleSeedTestData = async () => {
    if (!window.confirm('Přejete si do vašeho účtu nahrát sadu vzorových investičních aktiv (Conseq, AVANT, Wood) s historií snímků portfolia? Tato akce je vhodná pro otestování nového rozhraní.')) {
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
