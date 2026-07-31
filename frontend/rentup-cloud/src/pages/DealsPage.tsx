import { useState, useEffect } from 'react'
import { Plus, Pencil, Trash2 } from 'lucide-react'
import {
  dealsApi, productsApi,
  type Deal, type CreateDealRequest, type DealStatus, type Product,
} from '@/lib/api'

// ── Constants ─────────────────────────────────────────────────────────────────

const CATEGORIES: Record<string, string> = {
  InvestmentFund: 'Investiční fond', BuildingSavings: 'Stavební spoření',
  LifeInsurance: 'Životní pojištění', PensionSavings: 'Penzijní spoření',
  Bonds: 'Dluhopisy', Commodities: 'Zlato / Komodity',
  RealEstate: 'Nemovitosti', Other: 'Ostatní',
}

const COMPANIES: Record<string, string> = {
  ZfpInvestments: 'ZFP Investments', WoodAndCo: 'Wood & Co', Avant: 'AVANT',
  Conseq: 'Conseq', GeneraliInvestments: 'Generali Investments', ZfpFinance: 'ZFP Finance',
  ZfpGold: 'ZFP Gold', NnInvestments: 'NN Investments', Amundi: 'Amundi', Other: 'Ostatní',
}

const STATUS_LABELS: Record<DealStatus, string> = {
  Pending: 'Čekající', Active: 'Aktivní', Completed: 'Dokončený', Cancelled: 'Zrušený',
}

const STATUS_COLORS: Record<DealStatus, string> = {
  Pending: 'bg-amber-500/15 text-amber-400 border-amber-500/20',
  Active: 'bg-blue-500/15 text-blue-400 border-blue-500/20',
  Completed: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20',
  Cancelled: 'bg-white/[0.06] text-white/30 border-white/10',
}

const czk = new Intl.NumberFormat('cs-CZ', { style: 'currency', currency: 'CZK', maximumFractionDigits: 0 })
const INPUT = 'w-full bg-white/[0.06] border border-white/[0.1] rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-blue-500/60 focus:ring-1 focus:ring-blue-500/30 transition-all [&>option]:bg-[#1a1a2e]'

// ── Deal Dialog ───────────────────────────────────────────────────────────────

function DealDialog({ deal, products, onClose, onSaved }: {
  deal?: Deal | null; products: Product[]; onClose: () => void; onSaved: () => void
}) {
  const isEdit = !!deal
  const defaultProduct = products[0]

  const [form, setForm] = useState<CreateDealRequest>(deal ? {
    clientName: deal.clientName,
    date: deal.date.slice(0, 10),
    category: deal.category,
    company: deal.company,
    productName: deal.productName,
    depositAmount: deal.depositAmount,
    commissionFormula: '',
    status: deal.status,
    note: deal.note,
  } : {
    clientName: '',
    date: new Date().toISOString().slice(0, 10),
    category: 'InvestmentFund',
    company: 'Other',
    productName: defaultProduct?.name ?? '',
    depositAmount: 0,
    commissionFormula: defaultProduct?.commissionFormula ?? '',
    status: 'Pending',
    note: '',
  })

  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const set = (k: keyof CreateDealRequest, v: any) => setForm(f => ({ ...f, [k]: v }))

  // Auto-fill formula when product is selected
  const handleProductSelect = (productName: string) => {
    set('productName', productName)
    const p = products.find(p => p.name === productName)
    if (p) {
      set('commissionFormula', p.commissionFormula)
      set('category', p.category)
      set('company', p.company)
    }
  }

  const save = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      if (isEdit) await dealsApi.update(deal!.id, form)
      else await dealsApi.create(form)
      onSaved()
    } catch (e: any) {
      setError(e?.response?.data?.error ?? 'Chyba při ukládání.')
    }
    setSaving(false)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-[#13131f] border border-white/[0.1] rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden">
        <div className="px-6 py-4 border-b border-white/[0.08] flex items-center justify-between">
          <h3 className="text-white font-medium">{isEdit ? 'Upravit obchod' : 'Nový obchod'}</h3>
          <button onClick={onClose} className="text-white/40 hover:text-white transition-colors text-xl leading-none">×</button>
        </div>

        <form onSubmit={save} className="px-6 py-5 space-y-4 max-h-[75vh] overflow-y-auto">
          {/* Client + Date */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={LBL}>Klient</label>
              <input value={form.clientName} onChange={e => set('clientName', e.target.value)}
                required className={INPUT} placeholder="Jan Novák" />
            </div>
            <div>
              <label className={LBL}>Datum</label>
              <input type="date" value={form.date} onChange={e => set('date', e.target.value)}
                required className={INPUT} />
            </div>
          </div>

          {/* Product selector */}
          {products.length > 0 && (
            <div>
              <label className={LBL}>Produkt (z katalogu)</label>
              <select value={form.productName} onChange={e => handleProductSelect(e.target.value)} className={INPUT}>
                <option value="">— vlastní —</option>
                {products.map(p => <option key={p.id} value={p.name}>{p.name}</option>)}
              </select>
            </div>
          )}

          {/* Category + Company */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={LBL}>Kategorie</label>
              <select value={form.category} onChange={e => set('category', e.target.value)} className={INPUT}>
                {Object.entries(CATEGORIES).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </div>
            <div>
              <label className={LBL}>Společnost</label>
              <select value={form.company} onChange={e => set('company', e.target.value)} className={INPUT}>
                {Object.entries(COMPANIES).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </div>
          </div>

          {/* Deposit */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={LBL}>Vkladová částka (CZK)</label>
              <input type="number" step="1" value={form.depositAmount}
                onChange={e => set('depositAmount', +e.target.value)} className={INPUT} />
            </div>
            <div>
              <label className={LBL}>Stav</label>
              <select value={form.status} onChange={e => set('status', e.target.value as DealStatus)} className={INPUT}>
                {Object.entries(STATUS_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </div>
          </div>

          {/* Formula */}
          <div>
            <label className={LBL}>Vzorec provize (NCalc, proměnná: AUM = vkladová částka)</label>
            <input value={form.commissionFormula} onChange={e => set('commissionFormula', e.target.value)}
              className={`${INPUT} font-mono text-xs`} placeholder="(AUM/1555200)*24" />
          </div>

          {/* Note */}
          <div>
            <label className={LBL}>Poznámka</label>
            <textarea value={form.note} onChange={e => set('note', e.target.value)}
              rows={2} className={`${INPUT} resize-none`} />
          </div>

          {error && <p className="text-red-400 text-sm">{error}</p>}

          <div className="flex justify-end gap-3 pt-1">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-white/50 hover:text-white transition-colors">
              Zrušit
            </button>
            <button type="submit" disabled={saving}
              className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium rounded-xl transition-all disabled:opacity-50">
              {saving ? 'Ukládám...' : isEdit ? 'Uložit' : 'Vytvořit obchod'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

const LBL = 'block text-white/50 text-xs font-medium uppercase tracking-wider mb-1.5'

// ── Deals Page ────────────────────────────────────────────────────────────────

export default function DealsPage() {
  const [deals, setDeals] = useState<Deal[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [stats, setStats] = useState<{ totalPoints: number; totalCommissionCzk: number; totalCount: number } | null>(null)
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState<DealStatus | ''>('')
  const [dialog, setDialog] = useState<'new' | Deal | null>(null)

  const load = async () => {
    setLoading(true)
    try {
      const [dealsRes, productsRes, statsRes] = await Promise.all([
        dealsApi.getAll(statusFilter ? { status: statusFilter } : undefined),
        productsApi.getAll(),
        dealsApi.getStats(),
      ])
      setDeals(dealsRes.data)
      setProducts(productsRes.data)
      setStats(statsRes.data)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [statusFilter]) // eslint-disable-line

  const handleDelete = async (deal: Deal) => {
    if (!confirm(`Smazat obchod s klientem "${deal.clientName}"?`)) return
    await dealsApi.delete(deal.id)
    load()
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-white text-2xl font-semibold tracking-tight">Obchody / Produkce</h1>
          <p className="text-white/40 text-sm mt-0.5">Přehled uzavřených a otevřených obchodů</p>
        </div>
        <button onClick={() => setDialog('new')}
          className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium rounded-xl transition-all shadow-lg shadow-blue-500/20 hover:-translate-y-px">
          <Plus className="w-4 h-4" />
          Nový obchod
        </button>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: 'Celkem obchodů', value: stats.totalCount.toString() },
            { label: 'Celkové body', value: stats.totalPoints.toFixed(1) },
            { label: 'Provize celkem', value: czk.format(stats.totalCommissionCzk) },
          ].map(({ label, value }) => (
            <div key={label} className="bg-white/[0.04] border border-white/[0.08] rounded-2xl p-5">
              <p className="text-white/40 text-xs uppercase tracking-wider mb-2">{label}</p>
              <p className="text-white text-xl font-semibold">{value}</p>
            </div>
          ))}
        </div>
      )}

      {/* Filter */}
      <div className="flex items-center gap-2">
        {(['', 'Pending', 'Active', 'Completed', 'Cancelled'] as const).map(s => (
          <button key={s} onClick={() => setStatusFilter(s)}
            className={`px-3 py-1.5 rounded-xl text-xs font-medium border transition-all ${
              statusFilter === s
                ? 'bg-blue-600 border-blue-500 text-white'
                : 'border-white/[0.08] text-white/40 hover:text-white/70 hover:border-white/20'
            }`}>
            {s === '' ? 'Vše' : STATUS_LABELS[s]}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="bg-white/[0.04] border border-white/[0.08] rounded-2xl overflow-hidden">
        {loading ? (
          <div className="p-1 space-y-px">
            {[...Array(5)].map((_, i) => <div key={i} className="h-14 bg-white/[0.03] rounded-xl animate-pulse" />)}
          </div>
        ) : deals.length === 0 ? (
          <div className="py-16 text-center text-white/25 text-sm">
            Žádné obchody — vytvořte první záznam
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/[0.06]">
                {['Klient', 'Datum', 'Produkt', 'Vklad', 'Body', 'Provize', 'Stav', ''].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-white/30 text-xs font-medium uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {deals.map(d => (
                <tr key={d.id} className="border-b border-white/[0.04] last:border-0 hover:bg-white/[0.03] transition-colors">
                  <td className="px-4 py-3.5">
                    <p className="text-white text-sm font-medium">{d.clientName}</p>
                    <p className="text-white/30 text-xs">{COMPANIES[d.company] ?? d.company}</p>
                  </td>
                  <td className="px-4 py-3.5 text-white/50 text-sm">
                    {new Date(d.date).toLocaleDateString('cs-CZ')}
                  </td>
                  <td className="px-4 py-3.5 text-white/70 text-sm">
                    <p>{d.productName}</p>
                    <p className="text-white/30 text-xs">{CATEGORIES[d.category] ?? d.category}</p>
                  </td>
                  <td className="px-4 py-3.5 text-white/70 text-sm font-mono">
                    {d.depositAmount.toLocaleString('cs-CZ')} Kč
                  </td>
                  <td className="px-4 py-3.5 text-amber-400 text-sm font-mono">
                    {d.calculatedPoints.toFixed(2)}
                  </td>
                  <td className="px-4 py-3.5 text-emerald-400 text-sm font-mono">
                    {czk.format(d.estimatedCommission)}
                  </td>
                  <td className="px-4 py-3.5">
                    <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-medium border ${STATUS_COLORS[d.status]}`}>
                      {STATUS_LABELS[d.status]}
                    </span>
                  </td>
                  <td className="px-4 py-3.5">
                    <div className="flex items-center gap-1">
                      <button onClick={() => setDialog(d)}
                        className="p-1.5 rounded-lg text-white/30 hover:text-white hover:bg-white/[0.08] transition-all">
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => handleDelete(d)}
                        className="p-1.5 rounded-lg text-white/30 hover:text-red-400 hover:bg-red-500/10 transition-all">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {dialog !== null && (
        <DealDialog
          deal={dialog === 'new' ? null : dialog}
          products={products}
          onClose={() => setDialog(null)}
          onSaved={() => { setDialog(null); load() }}
        />
      )}
    </div>
  )
}
