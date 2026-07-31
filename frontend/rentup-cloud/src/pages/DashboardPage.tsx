import { useEffect, useState } from 'react'
import { TrendingUp, Wallet, Star, Calendar } from 'lucide-react'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer
} from 'recharts'
import { aumApi, type AumSnapshot, type AumSummary } from '@/lib/api'
import CsvImportButton from '@/components/dashboard/CsvImportButton'

// ── Formatters ────────────────────────────────────────────────────────────────

const czk = new Intl.NumberFormat('cs-CZ', { style: 'currency', currency: 'CZK', maximumFractionDigits: 0 })
const num = new Intl.NumberFormat('cs-CZ', { maximumFractionDigits: 2 })
const shortDate = (d: string) => new Date(d).toLocaleDateString('cs-CZ', { month: 'short', year: '2-digit' })

// ── KPI Card ──────────────────────────────────────────────────────────────────

interface KpiCardProps {
  label: string
  value: string
  sub?: string
  icon: React.ElementType
  color: string
  glow: string
}

function KpiCard({ label, value, sub, icon: Icon, color, glow }: KpiCardProps) {
  return (
    <div className={`relative bg-white/[0.04] border border-white/[0.08] rounded-2xl p-5 overflow-hidden group hover:border-white/[0.14] transition-all duration-300`}>
      <div className={`absolute -top-6 -right-6 w-24 h-24 ${glow} rounded-full blur-2xl opacity-40 group-hover:opacity-70 transition-opacity`} />
      <div className="flex items-start justify-between mb-3">
        <div className={`w-9 h-9 rounded-xl ${color} bg-opacity-10 flex items-center justify-center`}>
          <Icon className={`w-4 h-4 ${color.replace('bg-', 'text-')}`} />
        </div>
      </div>
      <p className="text-white/50 text-xs font-medium uppercase tracking-wider mb-1">{label}</p>
      <p className="text-white text-2xl font-semibold tracking-tight">{value}</p>
      {sub && <p className="text-white/30 text-xs mt-1">{sub}</p>}
    </div>
  )
}

// ── Custom Tooltip ─────────────────────────────────────────────────────────────

function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-[#13131f] border border-white/[0.1] rounded-xl px-4 py-3 shadow-2xl text-sm">
      <p className="text-white/50 text-xs mb-2">{label}</p>
      {payload.map((p: any) => (
        <p key={p.name} style={{ color: p.color }} className="font-medium">
          {p.name}: {czk.format(p.value)}
        </p>
      ))}
    </div>
  )
}

// ── Dashboard Page ────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const [summary, setSummary] = useState<AumSummary | null>(null)
  const [snapshots, setSnapshots] = useState<AumSnapshot[]>([])
  const [loading, setLoading] = useState(true)

  const loadData = async () => {
    try {
      const [sumRes, snapRes] = await Promise.all([
        aumApi.getSummary(),
        aumApi.getSnapshots(),
      ])
      setSummary(sumRes.data)
      setSnapshots(snapRes.data)
    } catch {
      // silently fail — empty state handles it
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadData() }, [])

  const chartData = snapshots.map(s => ({
    date: shortDate(s.date),
    'Celkové AUM': Math.round(s.totalAum),
    'Body/rok': Math.round(s.pointsPerYear),
  }))

  const latest = snapshots[snapshots.length - 1]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-white text-2xl font-semibold tracking-tight">Dashboard</h1>
          <p className="text-white/40 text-sm mt-0.5">Přehled aktiv pod správou</p>
        </div>
        <CsvImportButton onImported={loadData} />
      </div>

      {/* KPI Cards */}
      {loading ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-28 bg-white/[0.03] rounded-2xl animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiCard
            label="Celkové AUM"
            value={summary ? czk.format(summary.totalAum) : '—'}
            sub={latest ? shortDate(latest.date) : undefined}
            icon={Wallet}
            color="bg-blue-500"
            glow="bg-blue-500"
          />
          <KpiCard
            label="Body / rok"
            value={summary ? num.format(summary.pointsPerYear) : '—'}
            icon={Star}
            color="bg-amber-500"
            glow="bg-amber-500"
          />
          <KpiCard
            label="Provize / rok"
            value={summary ? czk.format(summary.estimatedCommissionCzk) : '—'}
            icon={TrendingUp}
            color="bg-emerald-500"
            glow="bg-emerald-500"
          />
          <KpiCard
            label="Měs. vklady"
            value={summary ? czk.format(summary.totalMonthlyDeposit) : '—'}
            icon={Calendar}
            color="bg-violet-500"
            glow="bg-violet-500"
          />
        </div>
      )}

      {/* AUM History Chart */}
      <div className="bg-white/[0.04] border border-white/[0.08] rounded-2xl p-6">
        <h2 className="text-white font-medium mb-1">Historický vývoj AUM</h2>
        <p className="text-white/40 text-xs mb-6">Celkové aktiva pod správou v čase</p>

        {chartData.length === 0 ? (
          <div className="h-64 flex items-center justify-center">
            <p className="text-white/25 text-sm">
              Žádná data — importujte CSV soubor
            </p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={chartData} margin={{ top: 5, right: 10, left: 10, bottom: 0 }}>
              <defs>
                <linearGradient id="aumGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="date" tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tickFormatter={v => `${(v / 1_000_000).toFixed(1)}M`} tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip content={<ChartTooltip />} />
              <Area
                type="monotone"
                dataKey="Celkové AUM"
                stroke="#3b82f6"
                strokeWidth={2}
                fill="url(#aumGrad)"
                dot={false}
                activeDot={{ r: 4, fill: '#3b82f6', stroke: '#1d4ed8', strokeWidth: 2 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  )
}
