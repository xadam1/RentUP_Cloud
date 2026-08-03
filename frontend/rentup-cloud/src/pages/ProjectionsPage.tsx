import { useEffect, useState } from 'react'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend
} from 'recharts'
import { Sparkles } from 'lucide-react'
import { aumApi, type ProjectionPoint } from '@/lib/api'

const czk = new Intl.NumberFormat('cs-CZ', { style: 'currency', currency: 'CZK', maximumFractionDigits: 0 })

function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 shadow-2xl text-sm space-y-1.5 text-white">
      <p className="text-zinc-400 text-xs font-semibold mb-1 border-b border-zinc-800 pb-1">{label}</p>
      {payload.map((p: any) => (
        <p key={p.name} style={{ color: p.color }} className="font-medium text-xs flex justify-between gap-4">
          <span>{p.name}:</span>
          <strong className="font-mono">{p.name.includes('AUM') ? czk.format(p.value) : p.value.toLocaleString('cs-CZ')}</strong>
        </p>
      ))}
    </div>
  )
}

export default function ProjectionsPage() {
  const [points, setPoints] = useState<ProjectionPoint[]>([])
  const [years, setYears] = useState(10)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    aumApi.getProjections(years)
      .then(r => setPoints(r.data.points))
      .catch(() => setPoints([]))
      .finally(() => setLoading(false))
  }, [years])

  const chartData = points
    .filter((_, i) => i % 3 === 0 || i === points.length - 1)
    .map(p => ({
      date: new Date(p.date).toLocaleDateString('cs-CZ', { month: 'short', year: '2-digit' }),
      'AUM': Math.round(p.totalAum),
      'Body/rok': Math.round(p.pointsPerYear),
      'Provize': Math.round(p.estimatedCommissionCzk),
    }))

  const finalPoint = points[points.length - 1]

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-16 animate-in fade-in duration-300">
      {/* Horizon selector */}
      <div className="flex justify-end border-b border-zinc-200 dark:border-zinc-800 pb-4">
        <div className="inline-flex rounded-xl p-1 bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-xs font-bold shadow-xs">
          {[5, 10, 15, 20].map(y => (
            <button
              key={y}
              onClick={() => setYears(y)}
              className={`px-4 py-2 rounded-lg transition-all ${
                years === y 
                  ? 'bg-white dark:bg-zinc-800 text-blue-600 dark:text-blue-400 shadow-sm ring-1 ring-zinc-200 dark:ring-zinc-700' 
                  : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
              }`}
            >
              Horizont {y} let
            </button>
          ))}
        </div>
      </div>

      {/* Target summary cards */}
      {finalPoint && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
          <div className="modern-card p-6 border border-zinc-200 dark:border-zinc-800 relative overflow-hidden group">
            <span className="text-xs font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500 block mb-1">
              Odhadované AUM za {years} let
            </span>
            <p className="text-2xl lg:text-3xl font-bold font-mono text-blue-600 dark:text-blue-400">
              {czk.format(finalPoint.totalAum)}
            </p>
            <div className="mt-4 pt-3 border-t border-zinc-100 dark:border-zinc-800/80 text-xs text-zinc-500 dark:text-zinc-400 flex items-center justify-between">
              <span>Složený úrok + vklady</span>
              <span className="font-semibold text-emerald-600 dark:text-emerald-400">Dlouhodobý horizont</span>
            </div>
          </div>

          <div className="modern-card p-6 border border-zinc-200 dark:border-zinc-800 relative overflow-hidden group">
            <span className="text-xs font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500 block mb-1">
              Roční produkce bodů (za {years} let)
            </span>
            <p className="text-2xl lg:text-3xl font-bold font-mono text-amber-600 dark:text-amber-400">
              {finalPoint.pointsPerYear.toLocaleString('cs-CZ', { maximumFractionDigits: 1 })} <span className="text-base font-semibold text-zinc-500">b. / rok</span>
            </p>
            <div className="mt-4 pt-3 border-t border-zinc-100 dark:border-zinc-800/80 text-xs text-zinc-500 dark:text-zinc-400 flex items-center justify-between">
              <span>Měsíční průměr:</span>
              <span className="font-mono font-bold text-zinc-800 dark:text-zinc-200">~{(finalPoint.pointsPerYear / 12).toLocaleString('cs-CZ', { maximumFractionDigits: 1 })} b.</span>
            </div>
          </div>

          <div className="premium-card p-6 rounded-2xl relative overflow-hidden flex flex-col justify-between group">
            <div>
              <div className="flex items-start justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-amber-200 block mb-1">
                  Odhad ročních provizí v Cíli
                </span>
                <Sparkles className="w-4 h-4 text-amber-300 animate-pulse" />
              </div>
              <p className="text-2xl lg:text-3xl font-bold font-mono text-white mt-1">
                {czk.format(finalPoint.estimatedCommissionCzk)}
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-white/10 text-xs text-amber-100/80 flex items-center justify-between">
              <span>Měsíční pasivní odhad:</span>
              <span className="font-mono font-bold bg-white/15 px-2 py-0.5 rounded-full">{czk.format(finalPoint.estimatedCommissionCzk / 12)} / měs.</span>
            </div>
          </div>
        </div>
      )}

      {/* Chart Card */}
      <div className="modern-card p-6 border border-zinc-200 dark:border-zinc-800">
        <div className="mb-6">
          <h2 className="text-lg font-bold text-zinc-900 dark:text-white">
            Růst a exponenciála majetku v čase ({years} let)
          </h2>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
            Porovnání růstu spravovaného AUM (potažená osa vlevo) a přelomu do pasivních bodů (osa vpravo).
          </p>
        </div>

        {loading ? (
          <div className="h-80 bg-zinc-100 dark:bg-zinc-800/50 rounded-2xl animate-pulse flex items-center justify-center">
            <span className="text-xs text-zinc-500 font-semibold animate-bounce">Kalkuluji matematiku složeného úroku...</span>
          </div>
        ) : chartData.length === 0 ? (
          <div className="h-80 flex flex-col items-center justify-center text-zinc-400 dark:text-zinc-500 text-sm border border-dashed border-zinc-200 dark:border-zinc-800 rounded-2xl">
            <p className="font-semibold text-zinc-600 dark:text-zinc-300">Zatím nebyly zjištěny žádné produkty k predikci.</p>
            <p className="text-xs mt-1 text-zinc-500">Přidejte prosím v Dashboardu do svého portfolia první investiční produkty s vkladem či úrodou.</p>
          </div>
        ) : (
          <div className="h-80 w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 10, right: 15, left: 10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#71717a" strokeOpacity={0.15} />
                <XAxis dataKey="date" tick={{ fill: '#71717a', fontSize: 11, fontWeight: 600 }} axisLine={false} tickLine={false} dy={10} />
                <YAxis yAxisId="aum" tickFormatter={v => `${(v / 1_000_000).toFixed(1)}M`} tick={{ fill: '#3b82f6', fontSize: 11, fontWeight: 700 }} axisLine={false} tickLine={false} />
                <YAxis yAxisId="points" orientation="right" tick={{ fill: '#f59e0b', fontSize: 11, fontWeight: 700 }} tickFormatter={v => `${v} b.`} axisLine={false} tickLine={false} />
                <Tooltip content={<ChartTooltip />} />
                <Legend 
                  verticalAlign="top" 
                  height={36} 
                  formatter={v => <span className="text-xs font-bold text-zinc-700 dark:text-zinc-300 px-2">{v}</span>} 
                />
                <Line yAxisId="aum" type="monotone" dataKey="AUM" name="Celkové AUM (Kč)" stroke="#3b82f6" strokeWidth={3} dot={false} activeDot={{ r: 6, strokeWidth: 0, fill: '#3b82f6' }} />
                <Line yAxisId="points" type="monotone" dataKey="Body/rok" name="Pasivní body ( ročně)" stroke="#f59e0b" strokeWidth={2.5} dot={false} strokeDasharray="5 3" activeDot={{ r: 5, strokeWidth: 0, fill: '#f59e0b' }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </div>
  )
}
