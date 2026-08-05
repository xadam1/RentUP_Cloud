import { useEffect, useState, useMemo } from 'react'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip,
  ResponsiveContainer
} from 'recharts'
import { 
  Layers, Wallet, Sparkles, Calendar, CheckSquare, 
  Square, Minus, Plus, Info
} from 'lucide-react'
import { aumApi, type ProjectionPoint, type DashboardSummary } from '@/lib/api'

const formatCurrencyFull = (value: number) => {
  return `${Math.round(value).toLocaleString('cs-CZ')} Kč`
}

const formatPoints = (value: number) => {
  return `${Math.round(value).toLocaleString('cs-CZ')} b.`
}

const formatAbbrevVal = (value: number) => {
  if (value >= 1_000_000_000) {
    return `${(value / 1_000_000_000).toFixed(2).replace('.', ',')} mld.`
  }
  if (value >= 1_000_000) {
    return `${(value / 1_000_000).toFixed(1).replace('.', ',')} mil.`
  }
  if (value >= 100_000) {
    return `${(value / 1_000).toFixed(0).replace('.', ',')} k`
  }
  return Math.round(value).toLocaleString('cs-CZ')
}

const formatChartAxis = (val: number) => {
  if (val >= 1_000_000_000) {
    return `${(val / 1_000_000_000).toFixed(1).replace('.', ',')} mld. Kč`
  }
  if (val >= 1_000_000) {
    return `${(val / 1_000_000).toFixed(0).replace('.', ',')} mil. Kč`
  }
  if (val >= 1_000) {
    return `${(val / 1_000).toFixed(0).replace('.', ',')} k Kč`
  }
  return `${val} Kč`
}

function CustomChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  const data = payload[0]?.payload
  if (!data) return null

  return (
    <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-3.5 shadow-xl text-xs space-y-2 z-50 pointer-events-none min-w-[220px]">
      <p className="font-bold text-zinc-900 dark:text-white pb-1.5 border-b border-zinc-100 dark:border-zinc-800/80">
        {label === '0. rok' ? '0. rok (Aktuální stav / start)' : label}
      </p>
      <div className="flex items-center justify-between gap-4">
        <span className="text-zinc-500 dark:text-zinc-400 flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
          Odhad AUM:
        </span>
        <strong className="font-mono text-zinc-900 dark:text-white text-[13px] tabular-nums">{formatCurrencyFull(data.AUM || 0)}</strong>
      </div>
      {data['Provize / měs.'] !== undefined && (
        <div className="flex items-center justify-between gap-4">
          <span className="text-zinc-500 dark:text-zinc-400 flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
            Provize / měsíc:
          </span>
          <strong className="font-mono text-emerald-600 dark:text-emerald-400 text-xs tabular-nums">{formatCurrencyFull(data['Provize / měs.'])}</strong>
        </div>
      )}
      {data['Body / měs.'] !== undefined && (
        <div className="flex items-center justify-between gap-4">
          <span className="text-zinc-500 dark:text-zinc-400 flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
            Body / měsíc:
          </span>
          <strong className="font-mono text-amber-600 dark:text-amber-400 text-xs tabular-nums">{formatPoints(data['Body / měs.'])}</strong>
        </div>
      )}
    </div>
  )
}

export default function ProjectionsPage() {
  const [allPoints, setAllPoints] = useState<ProjectionPoint[]>([])
  const [summary, setSummary] = useState<DashboardSummary | null>(null)
  const [loading, setLoading] = useState(true)

  // Horizon & interactivity states
  const [years, setYears] = useState<number>(15)
  const [inputVal, setInputVal] = useState<string>("15")
  const [selectedYears, setSelectedYears] = useState<Set<number>>(new Set())

  useEffect(() => {
    setLoading(true)
    Promise.all([
      aumApi.getProjections(30).catch(() => ({ data: { points: [] as ProjectionPoint[], basePointValue: 150, yearsProjected: 30 } })),
      aumApi.getSummary().catch(() => ({ data: null }))
    ]).then(([projRes, sumRes]) => {
      setAllPoints(projRes.data.points || [])
      setSummary(sumRes.data)
    }).finally(() => setLoading(false))
  }, [])

  const handlePresetClick = (val: number) => {
    setYears(val)
    setInputVal(String(val))
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value
    setInputVal(v)
    const n = parseInt(v, 10)
    if (!isNaN(n) && n >= 1 && n <= 30) {
      setYears(n)
    }
  }

  const handleInputBlur = () => {
    let n = parseInt(inputVal, 10)
    if (isNaN(n) || n < 1) n = 1
    if (n > 30) n = 30
    setYears(n)
    setInputVal(String(n))
  }

  // Generate annual data rows from monthly simulation points
  const annualData = useMemo(() => {
    const rows = []
    for (let y = 1; y <= years; y++) {
      const pointIndex = y * 12 - 1
      if (allPoints.length > pointIndex && allPoints[pointIndex]) {
        const p = allPoints[pointIndex]
        rows.push({
          year: y,
          aum: p.totalAum,
          pointsMonth: p.pointsPerYear / 12,
          payoutMonth: p.estimatedCommissionCzk / 12,
          pointsYear: p.pointsPerYear,
          payoutYear: p.estimatedCommissionCzk
        })
      }
    }
    return rows
  }, [allPoints, years])

  // Chart data including Year 0 start point
  const chartData = useMemo(() => {
    const startPoint = {
      name: '0. rok',
      AUM: Math.round(summary?.totalAum || (allPoints[0]?.totalAum || 0)),
      'Provize / měs.': Math.round((summary?.estimatedCommissionMonthCzk || 0)),
      'Body / měs.': Math.round((summary?.pointsPerMonth || 0))
    }

    const annualPoints = annualData.map(r => ({
      name: `${r.year}. rok`,
      AUM: Math.round(r.aum),
      'Provize / měs.': Math.round(r.payoutMonth),
      'Body / měs.': Math.round(r.pointsMonth)
    }))

    return [startPoint, ...annualPoints]
  }, [summary, allPoints, annualData])

  // Top metric cards totals
  const targetAum = annualData.length > 0 ? annualData[annualData.length - 1].aum : (summary?.totalAum || 0)
  const totalPayout = annualData.reduce((acc, r) => acc + r.payoutYear, 0)
  const totalPoints = annualData.reduce((acc, r) => acc + r.pointsYear, 0)
  const finalMonthPayout = annualData.length > 0 ? annualData[annualData.length - 1].payoutMonth : (summary?.estimatedCommissionMonthCzk || 0)
  const averageYearlyPoints = years > 0 ? totalPoints / years : 0

  // Bottom table footer summary calculation based on selected rows
  const { summaryPoints, summaryPayout, isSubsetSelected } = useMemo(() => {
    const validSelected = new Set([...selectedYears].filter(y => y <= years))
    const isSubset = validSelected.size > 0
    let sumPoints = 0
    let sumPayout = 0

    annualData.forEach(row => {
      if (!isSubset || validSelected.has(row.year)) {
        sumPoints += row.pointsYear
        sumPayout += row.payoutYear
      }
    })

    return { summaryPoints: sumPoints, summaryPayout: sumPayout, isSubsetSelected: isSubset }
  }, [annualData, selectedYears, years])

  const toggleRowSelection = (year: number, e: React.MouseEvent) => {
    e.stopPropagation()
    setSelectedYears(prev => {
      const next = new Set(prev)
      if (next.has(year)) next.delete(year)
      else next.add(year)
      return next
    })
  }

  const toggleAllSelection = () => {
    const validSelected = new Set([...selectedYears].filter(y => y <= years))
    if (validSelected.size === annualData.length && annualData.length > 0) {
      setSelectedYears(new Set())
    } else {
      setSelectedYears(new Set(annualData.map(d => d.year)))
    }
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16 animate-in fade-in duration-300">
      {/* Explanation Banner */}
      <div className="modern-card p-4 border border-zinc-200 dark:border-zinc-800 bg-blue-50/50 dark:bg-blue-950/20 flex items-start sm:items-center gap-3.5 text-sm text-zinc-600 dark:text-zinc-300 shadow-xs">
        <div className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center flex-shrink-0">
          <Info className="w-4 h-4 stroke-[2.5]" />
        </div>
        <div className="flex-1 text-xs sm:text-sm leading-relaxed">
          <strong className="text-zinc-900 dark:text-white font-bold">Jak funguje projekce budoucích příjmů: </strong>
          Model znázorňuje budoucí vývoj Vašeho spravovaného majetku za předpokladu, že již nebudete přidávat nové investiční obchody ani zvyšovat pravidelné investice. Vychází z Vašeho <strong className="text-zinc-800 dark:text-zinc-200 font-semibold">aktuálního AUM</strong> a stávajících <strong className="text-zinc-800 dark:text-zinc-200 font-semibold">měsíčních vkladů</strong> u produktů (zaškrtnutých do AUM v Dashboardu), které zhodnocuje složeným úrokem v čase. Díky tomu roste jak AUM, tak i Váš pasivní provizní příjem a bodová produkce.
        </div>
      </div>

      {/* Top Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Card 1: Target AUM (subtle blue tinted card) */}
        <div className="modern-card p-6 relative group border border-blue-500/20 dark:border-blue-500/20 bg-gradient-to-br from-blue-50/50 via-white to-blue-50/20 dark:from-blue-950/20 dark:via-zinc-900 dark:to-blue-900/10 shadow-sm flex flex-col justify-between transition-all duration-300">
          <div className="absolute top-6 right-6 w-10 h-10 rounded-xl bg-blue-500/10 dark:bg-blue-500/15 text-blue-600 dark:text-blue-400 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
            <Layers className="w-5 h-5" />
          </div>
          <div className="pr-12">
            <p className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-2">Cílový stav AUM</p>
            <div className="flex items-baseline gap-1 cursor-help" title={formatCurrencyFull(targetAum)}>
              <h3 className="text-3xl font-bold text-zinc-900 dark:text-white tracking-tight tabular-nums truncate">
                {formatAbbrevVal(targetAum)}
              </h3>
              <span className="text-sm font-medium text-zinc-500 dark:text-zinc-400 flex-shrink-0">Kč</span>
            </div>
          </div>
          <div className="mt-4 flex items-center">
            <span className="inline-flex items-center gap-1 text-[12px] font-bold px-2.5 py-1 rounded-md bg-white/90 dark:bg-zinc-800 text-blue-600 dark:text-blue-400 border border-blue-200/80 dark:border-blue-500/30 shadow-sm">
              Horizont {years} {years === 1 ? 'rok' : years >= 2 && years <= 4 ? 'roky' : 'let'}
            </span>
          </div>
        </div>

        {/* Card 2: Celkové body (now 2nd in order) */}
        <div className="modern-card p-6 relative group border border-zinc-200 dark:border-zinc-800 flex flex-col justify-between">
          <div className="absolute top-6 right-6 w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
            <Sparkles className="w-5 h-5" />
          </div>
          <div className="pr-12">
            <p className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-2">Celkové body (součet)</p>
            <div className="flex items-baseline gap-1 cursor-help" title={formatPoints(totalPoints)}>
              <h3 className="text-3xl font-bold text-zinc-900 dark:text-white tracking-tight tabular-nums truncate">
                {formatAbbrevVal(totalPoints)}
              </h3>
              <span className="text-sm font-medium text-zinc-500 dark:text-zinc-400 flex-shrink-0">b.</span>
            </div>
          </div>
          <div className="mt-4 flex items-center">
            <span 
              className="inline-flex items-center gap-1 text-[12px] font-bold px-2.5 py-1 rounded-md bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700 shadow-sm cursor-help truncate"
              title={formatPoints(averageYearlyPoints)}
            >
              ~ {formatAbbrevVal(averageYearlyPoints)} b. / rok
            </span>
          </div>
        </div>

        {/* Card 3: Celková výplata (now 3rd in order, premium green style) */}
        <div className="premium-card p-6 group relative overflow-hidden flex flex-col justify-between">
          <div className="premium-orb"></div>
          <div className="absolute top-6 right-6 w-10 h-10 rounded-xl bg-white/20 text-white flex items-center justify-center backdrop-blur-sm shadow-sm group-hover:scale-110 transition-transform duration-300">
            <Wallet className="w-5 h-5" />
          </div>
          <div className="relative z-10 pr-12">
            <p className="text-xs font-bold text-emerald-100 uppercase tracking-wider mb-2">Celková výplata (součet)</p>
            <div className="flex items-baseline gap-1 cursor-help" title={formatCurrencyFull(totalPayout)}>
              <h3 className="text-3xl font-bold text-white tracking-tight tabular-nums truncate">
                {formatAbbrevVal(totalPayout)}
              </h3>
              <span className="text-sm font-medium text-emerald-100 flex-shrink-0">Kč</span>
            </div>
          </div>
          <div className="mt-4 flex items-center relative z-10">
            <span 
              className="inline-flex items-center gap-1 text-[12px] font-bold px-2.5 py-1 rounded-md bg-white/10 hover:bg-white/20 transition-colors text-white border border-white/20 backdrop-blur-md shadow-sm cursor-help truncate"
              title={formatCurrencyFull(finalMonthPayout)}
            >
              ~ {formatAbbrevVal(finalMonthPayout)} Kč / měsíc
            </span>
          </div>
        </div>

        {/* Card 4: Počet roků input & presets */}
        <div className="modern-card p-6 relative border border-zinc-200 dark:border-zinc-800 flex flex-col justify-between">
          <div className="absolute top-6 right-6 w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
            <Calendar className="w-5 h-5" />
          </div>
          <div className="pr-12">
            <p className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-2">Počet roků</p>
            <div className="inline-flex items-center rounded-xl bg-zinc-100 dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700 p-1 mt-0.5 shadow-xs w-full max-w-[160px] justify-between">
              <button 
                type="button"
                onClick={() => {
                  const val = Math.max(1, years - 1)
                  setYears(val)
                  setInputVal(String(val))
                }}
                disabled={years <= 1}
                className="w-8 h-8 rounded-lg bg-white dark:bg-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-600 text-zinc-700 dark:text-zinc-200 shadow-xs flex items-center justify-center transition-all disabled:opacity-30 disabled:pointer-events-none cursor-pointer border border-zinc-200/60 dark:border-zinc-600/60 flex-shrink-0"
                title="O rok méně"
              >
                <Minus className="w-3.5 h-3.5 stroke-[2.5]" />
              </button>
              
              <div className="flex items-center justify-center flex-1 px-1">
                <input 
                  type="number" 
                  min="1" 
                  max="30" 
                  value={inputVal}
                  onChange={handleInputChange}
                  onBlur={handleInputBlur}
                  className="w-10 bg-transparent text-zinc-900 dark:text-white text-lg font-bold text-center focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none tabular-nums"
                />
                <span className="text-xs font-bold text-zinc-400 dark:text-zinc-500">let</span>
              </div>

              <button 
                type="button"
                onClick={() => {
                  const val = Math.min(30, years + 1)
                  setYears(val)
                  setInputVal(String(val))
                }}
                disabled={years >= 30}
                className="w-8 h-8 rounded-lg bg-white dark:bg-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-600 text-zinc-700 dark:text-zinc-200 shadow-xs flex items-center justify-center transition-all disabled:opacity-30 disabled:pointer-events-none cursor-pointer border border-zinc-200/60 dark:border-zinc-600/60 flex-shrink-0"
                title="O rok více"
              >
                <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
              </button>
            </div>
          </div>
          <div className="mt-4 flex items-center gap-1 flex-wrap">
            {[5, 10, 15, 20, 30].map(py => (
              <button
                key={py}
                type="button"
                onClick={() => handlePresetClick(py)}
                className={`px-2 py-1 rounded-md text-[12px] font-bold transition-all cursor-pointer shadow-sm border ${
                  years === py
                    ? 'bg-blue-600 text-white border-blue-500'
                    : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 border-zinc-200 dark:border-zinc-700 hover:bg-zinc-200/70 dark:hover:bg-zinc-700/70'
                }`}
              >
                {py}l
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Chart Section */}
      <div className="modern-card p-6 border border-zinc-200 dark:border-zinc-800">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
          <div>
            <h2 className="text-lg font-bold text-zinc-900 dark:text-white tracking-tight">Vývoj AUM v jednotlivých letech</h2>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
              Kumulativní růst AUM se složené úročící míře a měsíčními vklady v horizontu do {years} let
            </p>
          </div>
          <div className="flex items-center gap-2 text-xs font-semibold px-3 py-1.5 rounded-lg bg-zinc-100 dark:bg-zinc-800/80 text-zinc-600 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700">
            <span className="w-2.5 h-2.5 rounded-full bg-blue-500 inline-block" />
            <span>Stav portfolia (AUM)</span>
          </div>
        </div>

        {loading ? (
          <div className="h-[340px] bg-zinc-100 dark:bg-zinc-800/40 rounded-2xl animate-pulse flex items-center justify-center">
            <span className="text-xs font-semibold text-zinc-500 animate-bounce">Kalkuluji matematiku složeného úročení...</span>
          </div>
        ) : chartData.length <= 1 ? (
          <div className="h-[340px] flex flex-col items-center justify-center text-zinc-400 dark:text-zinc-500 text-sm border border-dashed border-zinc-200 dark:border-zinc-800 rounded-2xl">
            <p className="font-semibold text-zinc-600 dark:text-zinc-300">Zatím nebyly nalezeny žádné produkty pro výpočet.</p>
            <p className="text-xs mt-1 text-zinc-500">Zaregistrujte prosím v Dashboardu produkty se zaškrtnutým vkladem a úrokem do AUM.</p>
          </div>
        ) : (
          <div className="h-[340px] w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 10, right: 20, left: 10, bottom: 5 }}>
                <defs>
                  <linearGradient id="aumGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.35}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#71717a" strokeOpacity={0.15} vertical={false} />
                <XAxis 
                  dataKey="name" 
                  tick={{ fill: '#71717a', fontSize: 11, fontWeight: 600 }} 
                  axisLine={false} 
                  tickLine={false} 
                  dy={10} 
                  minTickGap={25}
                />
                <YAxis 
                  tickFormatter={formatChartAxis} 
                  tick={{ fill: '#71717a', fontSize: 11, fontWeight: 700 }} 
                  axisLine={false} 
                  tickLine={false} 
                  width={95}
                />
                <RechartsTooltip content={<CustomChartTooltip />} />
                <Area 
                  type="monotone" 
                  dataKey="AUM" 
                  name="Stav AUM" 
                  stroke="#60a5fa" 
                  strokeWidth={3} 
                  fillOpacity={1} 
                  fill="url(#aumGradient)" 
                  activeDot={{ r: 6, strokeWidth: 0, fill: '#3b82f6' }} 
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* Data Table Section */}
      <div className="modern-card overflow-hidden border border-zinc-200 dark:border-zinc-800 shadow-sm flex flex-col">
        <div className="px-6 py-5 border-b border-zinc-200 dark:border-zinc-800 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-transparent">
          <div>
            <h2 className="text-lg font-bold text-zinc-900 dark:text-white tracking-tight">Detailní roční rozpad projekce</h2>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
              Kliknutím na řádek či zaškrtávací políčko vyberete konkrétní roky pro výpočet v souhrnu dole.
            </p>
          </div>
          {selectedYears.size > 0 && (
            <button
              type="button"
              onClick={() => setSelectedYears(new Set())}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-500/20 rounded-xl transition-colors cursor-pointer border border-blue-200 dark:border-blue-500/20 shadow-xs"
            >
              <span>Zrušit výběr ({selectedYears.size})</span>
            </button>
          )}
        </div>

        <div className="overflow-x-auto max-h-[520px] custom-scrollbar">
          <table className="w-full text-left border-collapse whitespace-nowrap">
            <thead className="sticky top-0 z-10">
              <tr className="bg-zinc-50 dark:bg-zinc-800/90 border-b border-zinc-200 dark:border-zinc-700 text-zinc-500 dark:text-zinc-400 text-[10px] uppercase tracking-widest font-bold backdrop-blur-md select-none shadow-xs">
                <th className="px-4 py-4 w-12 text-center">
                  <button
                    type="button"
                    onClick={toggleAllSelection}
                    className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 focus:outline-none flex items-center justify-center mx-auto cursor-pointer"
                    title="Vybrat / zrušit výběr všech roků"
                  >
                    {selectedYears.size === annualData.length && annualData.length > 0 ? (
                      <CheckSquare className="w-4 h-4 text-blue-600 dark:text-blue-400 stroke-[2.5]" />
                    ) : (
                      <Square className="w-4 h-4 text-zinc-400 stroke-[2]" />
                    )}
                  </button>
                </th>
                <th className="px-6 py-4">Rok</th>
                <th className="px-6 py-4">Stav účtu</th>
                <th className="px-6 py-4">Body / měs.</th>
                <th className="px-6 py-4">Výplata / měs.</th>
                <th className="px-6 py-4">Body / rok</th>
                <th className="px-6 py-4">Výplata / rok</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800/50 text-sm font-medium text-zinc-700 dark:text-zinc-300">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-16 text-center text-zinc-400 dark:text-zinc-500 font-medium animate-pulse">
                    Načítám data z portfolia pro výpočet predikcí...
                  </td>
                </tr>
              ) : annualData.length > 0 ? (
                annualData.map((row) => {
                  const isSelected = selectedYears.has(row.year);
                  return (
                    <tr
                      key={row.year}
                      onClick={(e) => toggleRowSelection(row.year, e)}
                      className={`table-row-hover transition-all cursor-pointer ${
                        isSelected 
                          ? 'bg-blue-50/60 dark:bg-blue-500/15 border-l-[3px] border-l-blue-500 font-semibold' 
                          : ''
                      }`}
                    >
                      <td className="px-4 py-4 text-center" onClick={(e) => e.stopPropagation()}>
                        <button
                          type="button"
                          onClick={(e) => toggleRowSelection(row.year, e)}
                          className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 focus:outline-none flex items-center justify-center mx-auto cursor-pointer"
                        >
                          {isSelected ? (
                            <CheckSquare className="w-4 h-4 text-blue-600 dark:text-blue-400 stroke-[2.5]" />
                          ) : (
                            <Square className="w-4 h-4 text-zinc-300 dark:text-zinc-600 stroke-[2]" />
                          )}
                        </button>
                      </td>
                      <td className="px-6 py-4 font-bold text-zinc-900 dark:text-white">
                        {row.year}. rok
                      </td>
                      <td className="px-6 py-4 tabular-nums font-mono font-semibold text-blue-600 dark:text-blue-400">
                        {formatCurrencyFull(row.aum)}
                      </td>
                      <td className="px-6 py-4 tabular-nums font-mono text-amber-600 dark:text-amber-400 font-semibold">
                        {formatPoints(row.pointsMonth)}
                      </td>
                      <td className="px-6 py-4 tabular-nums font-mono font-bold text-emerald-600 dark:text-emerald-400">
                        {formatCurrencyFull(row.payoutMonth)}
                      </td>
                      <td className="px-6 py-4 tabular-nums font-mono text-zinc-800 dark:text-zinc-200">
                        {formatPoints(row.pointsYear)}
                      </td>
                      <td className="px-6 py-4 tabular-nums font-mono font-semibold text-zinc-900 dark:text-zinc-100">
                        {formatCurrencyFull(row.payoutYear)}
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-zinc-400 dark:text-zinc-500 font-medium">
                    Žádná data k zobrazení.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Bottom Summary Footer */}
        <div className="p-6 bg-zinc-50/80 dark:bg-zinc-800/40 border-t border-zinc-200 dark:border-zinc-700 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center flex-shrink-0">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 mb-1">
                Součet bodů (<span className="text-amber-600 dark:text-amber-400 font-bold">{isSubsetSelected ? 'vybrané roky' : 'všechny roky'}</span>)
              </p>
              <p className="text-2xl font-bold font-mono text-zinc-900 dark:text-white tracking-tight tabular-nums">
                {formatPoints(summaryPoints)}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4 sm:text-right flex-row-reverse sm:flex-row">
            <div>
              <p className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 mb-1">
                Součet výplat (<span className="text-emerald-600 dark:text-emerald-400 font-bold">{isSubsetSelected ? 'vybrané roky' : 'všechny roky'}</span>)
              </p>
              <p className="text-2xl sm:text-3xl font-bold font-mono text-emerald-600 dark:text-emerald-400 tracking-tight tabular-nums">
                {formatCurrencyFull(summaryPayout)}
              </p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center flex-shrink-0">
              <Wallet className="w-5 h-5" />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
