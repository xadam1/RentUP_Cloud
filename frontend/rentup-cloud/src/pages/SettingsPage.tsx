import { useState, useEffect } from 'react'
import { settingsApi, type UpdateSettingsRequest } from '@/lib/api'

export default function SettingsPage() {
  const [form, setForm] = useState<UpdateSettingsRequest>({ basePointValue: 1649, monthlyGoalPoints: 0, theme: 'dark' })
  const [saved, setSaved] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    settingsApi.get().then(r => setForm({
      basePointValue: r.data.basePointValue,
      monthlyGoalPoints: r.data.monthlyGoalPoints,
      theme: r.data.theme,
    })).finally(() => setLoading(false))
  }, [])

  const save = async (e: React.FormEvent) => {
    e.preventDefault()
    await settingsApi.update(form)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  if (loading) return <div className="h-32 bg-white/[0.03] rounded-2xl animate-pulse" />

  return (
    <div className="max-w-lg space-y-6">
      <div>
        <h1 className="text-white text-2xl font-semibold">Nastavení</h1>
        <p className="text-white/40 text-sm mt-0.5">Konfigurace kalkulačních parametrů</p>
      </div>

      <form onSubmit={save} className="bg-white/[0.04] border border-white/[0.08] rounded-2xl p-6 space-y-5">
        <div>
          <label className="block text-white/60 text-xs font-medium uppercase tracking-wider mb-1.5">
            Hodnota bodu (CZK)
          </label>
          <input
            type="number"
            step="0.01"
            value={form.basePointValue}
            onChange={e => setForm(f => ({ ...f, basePointValue: +e.target.value }))}
            className="w-full bg-white/[0.06] border border-white/[0.1] rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-blue-500/60 focus:ring-1 focus:ring-blue-500/30 transition-all"
          />
          <p className="text-white/30 text-xs mt-1">Slouží k výpočtu provize: body × hodnota bodu</p>
        </div>

        <div>
          <label className="block text-white/60 text-xs font-medium uppercase tracking-wider mb-1.5">
            Měsíční cíl (body)
          </label>
          <input
            type="number"
            step="0.01"
            value={form.monthlyGoalPoints}
            onChange={e => setForm(f => ({ ...f, monthlyGoalPoints: +e.target.value }))}
            className="w-full bg-white/[0.06] border border-white/[0.1] rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-blue-500/60 focus:ring-1 focus:ring-blue-500/30 transition-all"
          />
        </div>

        <button
          type="submit"
          className="w-full bg-gradient-to-r from-blue-600 to-violet-600 hover:from-blue-500 hover:to-violet-500 text-white font-medium rounded-xl py-3 text-sm transition-all duration-200 shadow-lg shadow-blue-500/20"
        >
          {saved ? '✓ Uloženo' : 'Uložit nastavení'}
        </button>
      </form>
    </div>
  )
}
