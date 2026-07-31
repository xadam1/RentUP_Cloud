import { useEffect, useState } from 'react'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend
} from 'recharts'
import { aumApi, type ProjectionPoint } from '@/lib/api'

const czk = new Intl.NumberFormat('cs-CZ', { style: 'currency', currency: 'CZK', maximumFractionDigits: 0 })

function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-[#13131f] border border-white/[0.1] rounded-xl px-4 py-3 shadow-2xl text-sm space-y-1">
      <p className="text-white/50 text-xs mb-1">{label}</p>
      {payload.map((p: any) => (
        <p key={p.name} style={{ color: p.color }} className="font-medium text-xs">
          {p.name}: {p.name.includes('AUM') ? czk.format(p.value) : p.value.toFixed(1)}
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
    .filter((_, i) => i % 3 === 0 || i === points.length - 1) // thin out monthly data to quarters
    .map(p => ({
      date: new Date(p.date).toLocaleDateString('cs-CZ', { month: 'short', year: '2-digit' }),
      'AUM': Math.round(p.totalAum),
      'Body/rok': Math.round(p.pointsPerYear),
      'Provize': Math.round(p.estimatedCommissionCzk),
    }))

  const finalPoint = points[points.length - 1]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-white text-2xl font-semibold tracking-tight">Budoucí projekce AUM</h1>
          <p className="text-white/40 text-sm mt-0.5">Složený úrok dle nastavení produktů</p>
        </div>
        {/* Year selector */}
        <div className="flex items-center gap-2 bg-white/[0.04] border border-white/[0.08] rounded-xl p-1">
          {[5, 10, 15, 20].map(y => (
            <button
              key={y}
              onClick={() => setYears(y)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                years === y ? 'bg-blue-600 text-white shadow' : 'text-white/40 hover:text-white/80'
              }`}
            >
              {y}r
            </button>
          ))}
        </div>
      </div>

      {/* Target summary */}
      {finalPoint && (
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: `AUM za ${years} let`, value: czk.format(finalPoint.totalAum), color: 'text-blue-400' },
            { label: 'Body/rok', value: finalPoint.pointsPerYear.toFixed(1), color: 'text-amber-400' },
            { label: 'Provize/rok', value: czk.format(finalPoint.estimatedCommissionCzk), color: 'text-emerald-400' },
          ].map(({ label, value, color }) => (
            <div key={label} className="bg-white/[0.04] border border-white/[0.08] rounded-2xl p-5">
              <p className="text-white/40 text-xs uppercase tracking-wider mb-2">{label}</p>
              <p className={`text-2xl font-semibold ${color}`}>{value}</p>
            </div>
          ))}
        </div>
      )}

      {/* Chart */}
      <div className="bg-white/[0.04] border border-white/[0.08] rounded-2xl p-6">
        <h2 className="text-white font-medium mb-6">Vývoj AUM ({years} let)</h2>
        {loading ? (
          <div className="h-72 bg-white/[0.02] rounded-xl animate-pulse" />
        ) : chartData.length === 0 ? (
          <div className="h-72 flex items-center justify-center text-white/25 text-sm">
            Nejsou data — přidejte produkty a importujte AUM data
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={chartData} margin={{ top: 5, right: 10, left: 10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="date" tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis yAxisId="aum" tickFormatter={v => `${(v / 1_000_000).toFixed(0)}M`} tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis yAxisId="points" orientation="right" tick={{ fill: 'rgba(255,255,255,0.2)', fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip content={<ChartTooltip />} />
              <Legend formatter={v => <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12 }}>{v}</span>} />
              <Line yAxisId="aum" type="monotone" dataKey="AUM" stroke="#3b82f6" strokeWidth={2} dot={false} />
              <Line yAxisId="points" type="monotone" dataKey="Body/rok" stroke="#f59e0b" strokeWidth={1.5} dot={false} strokeDasharray="4 2" />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  )
}
