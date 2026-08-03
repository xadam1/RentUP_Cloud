import { useState, useEffect } from 'react'
import { Plus, Pencil, Trash2, Briefcase, CheckCircle2 } from 'lucide-react'
import {
  dealsApi, productsApi,
  type Deal, type CreateDealRequest, type DealStatus, type Product,
} from '@/lib/api'
import { useModal } from '@/contexts/ModalContext'

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
  Pending: 'Čekající', Active: 'Aktivní / Běží', Completed: 'Uzavřený', Cancelled: 'Zrušený',
}

const STATUS_COLORS: Record<DealStatus, string> = {
  Pending: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',
  Active: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20',
  Completed: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
  Cancelled: 'bg-zinc-200 dark:bg-zinc-800 text-zinc-500 border-zinc-300 dark:border-zinc-700',
}

const czk = new Intl.NumberFormat('cs-CZ', { style: 'currency', currency: 'CZK', maximumFractionDigits: 0 })

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
    productName: deal.productName || (defaultProduct?.name ?? 'Conseq Horizont Invest'),
    depositAmount: deal.depositAmount,
    commissionFormula: 'AUM * 0.015 * 0.35',
    status: deal.status,
    note: deal.note,
  } : {
    clientName: '',
    date: new Date().toISOString().slice(0, 10),
    category: 'InvestmentFund',
    company: 'Conseq',
    productName: defaultProduct?.name ?? 'Conseq Horizont Invest',
    depositAmount: 100000,
    commissionFormula: defaultProduct?.commissionFormula ?? 'AUM * 0.015 * 0.35',
    status: 'Pending',
    note: '',
  })

  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const set = (k: keyof CreateDealRequest, v: any) => setForm(f => ({ ...f, [k]: v }))

  const handleProductSelect = (productName: string) => {
    set('productName', productName)
    const p = products.find(p => p.name === productName)
    if (p && p.commissionFormula) {
      set('commissionFormula', p.commissionFormula)
      set('category', p.category)
      set('company', p.company)
    }
  }

  const save = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError(null)
    try {
      if (!form.clientName.trim()) {
        setError('Jméno klienta je povinné.');
        setSaving(false);
        return;
      }
      if (isEdit) await dealsApi.update(deal!.id, form)
      else await dealsApi.create(form)
      onSaved()
    } catch (err: any) {
      setError(err?.response?.data?.error ?? 'Chyba při ukládání obchodu do databází. Zkontrolujte prosím připojení.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 modal-backdrop animate-in fade-in duration-200" onClick={onClose} />
      <div className="relative z-10 w-full max-w-lg bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-2xl overflow-hidden backdrop-blur-xl max-h-[90vh] flex flex-col animate-in zoom-in-95 duration-200">
        <div className="px-6 py-4 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between bg-zinc-50 dark:bg-zinc-800/50">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-500/15 border border-blue-500/30 flex items-center justify-center text-blue-500">
              <Briefcase className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
                {isEdit ? 'Upravit evidovaný obchod' : 'Zasáhnout nový obchod / smlouvu'}
              </h3>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">Nastavte klienta a vklad pro kalkulaci bodů.</p>
            </div>
          </div>
          <button onClick={onClose} className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 p-1.5 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800">×</button>
        </div>

        <form onSubmit={save} className="px-6 py-5 space-y-4 max-h-[75vh] overflow-y-auto flex-1">
          {error && (
            <div className="p-3.5 bg-red-500/10 border border-red-500/20 rounded-xl text-red-600 dark:text-red-400 text-sm font-medium">
              {error}
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-zinc-700 dark:text-zinc-300 text-xs font-bold mb-1.5">Klient *</label>
              <input 
                value={form.clientName} 
                onChange={e => set('clientName', e.target.value)}
                required 
                className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-xl px-3.5 py-2.5 text-zinc-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500/50 outline-none" 
                placeholder="např. Jan Novák" 
              />
            </div>
            <div>
              <label className="block text-zinc-700 dark:text-zinc-300 text-xs font-bold mb-1.5">Datum uzavření *</label>
              <input 
                type="date" 
                value={form.date} 
                onChange={e => set('date', e.target.value)}
                required 
                className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-xl px-3.5 py-2.5 text-zinc-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500/50 outline-none" 
              />
            </div>
          </div>

          <div>
            <label className="block text-zinc-700 dark:text-zinc-300 text-xs font-bold mb-1.5">Investiční / Obchodní produkt</label>
            {products.length > 0 ? (
              <select 
                value={form.productName} 
                onChange={e => handleProductSelect(e.target.value)} 
                className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-xl px-3.5 py-2.5 text-zinc-900 dark:text-white text-sm font-semibold focus:ring-2 focus:ring-blue-500/50 outline-none"
              >
                <option value={form.productName}>{form.productName || 'Vyberte produkt z portfolia'}</option>
                {products.map(p => <option key={p.id} value={p.name}>{p.name}</option>)}
              </select>
            ) : (
              <input 
                value={form.productName} 
                onChange={e => set('productName', e.target.value)} 
                className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-xl px-3.5 py-2.5 text-zinc-900 dark:text-white text-sm font-semibold focus:ring-2 focus:ring-blue-500/50 outline-none" 
                placeholder="Conseq Active Invest"
              />
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-zinc-700 dark:text-zinc-300 text-xs font-bold mb-1.5">Kategorie</label>
              <select 
                value={form.category} 
                onChange={e => set('category', e.target.value)} 
                className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-xl px-3.5 py-2.5 text-zinc-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500/50 outline-none"
              >
                {Object.entries(CATEGORIES).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-zinc-700 dark:text-zinc-300 text-xs font-bold mb-1.5">Společnost / Partner</label>
              <select 
                value={form.company} 
                onChange={e => set('company', e.target.value)} 
                className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-xl px-3.5 py-2.5 text-zinc-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500/50 outline-none"
              >
                {Object.entries(COMPANIES).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-zinc-700 dark:text-zinc-300 text-xs font-bold mb-1.5">Objem vkladu (CZK)</label>
              <input 
                type="number" 
                step="1" 
                value={form.depositAmount}
                onChange={e => set('depositAmount', parseFloat(e.target.value) || 0)} 
                className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-xl px-3.5 py-2.5 text-zinc-900 dark:text-white text-sm font-mono font-bold focus:ring-2 focus:ring-blue-500/50 outline-none" 
              />
            </div>
            <div>
              <label className="block text-zinc-700 dark:text-zinc-300 text-xs font-bold mb-1.5">Aktuální stav</label>
              <select 
                value={form.status} 
                onChange={e => set('status', e.target.value as DealStatus)} 
                className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-xl px-3.5 py-2.5 text-zinc-900 dark:text-white text-sm font-semibold focus:ring-2 focus:ring-blue-500/50 outline-none"
              >
                {Object.entries(STATUS_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-zinc-700 dark:text-zinc-300 text-xs font-bold mb-1.5">Vzorec pro provizi (proměnná: AUM nebo VKLAD)</label>
            <input 
              value={form.commissionFormula} 
              onChange={e => set('commissionFormula', e.target.value)}
              className="w-full bg-zinc-100 dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-700 rounded-xl px-3.5 py-2.5 text-blue-600 dark:text-blue-400 text-sm font-mono font-bold focus:ring-2 focus:ring-blue-500/50 outline-none" 
              placeholder="AUM * 0.015 * 0.35" 
            />
          </div>

          <div>
            <label className="block text-zinc-700 dark:text-zinc-300 text-xs font-bold mb-1.5">Poznámka pro interní evidenci</label>
            <textarea 
              value={form.note} 
              onChange={e => set('note', e.target.value)}
              rows={2} 
              className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-xl px-3.5 py-2 text-zinc-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500/50 outline-none resize-none" 
            />
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t border-zinc-200 dark:border-zinc-800">
            <button 
              type="button" 
              onClick={onClose} 
              className="px-5 py-2.5 text-sm font-medium text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-xl transition-colors"
            >
              Zrušit
            </button>
            <button 
              type="submit" 
              disabled={saving}
              className="px-6 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-sm font-semibold rounded-xl transition-all shadow-lg shadow-blue-500/25 disabled:opacity-50 flex items-center gap-2"
            >
              {saving ? 'Ukládám do DB...' : isEdit ? 'Uložit změny' : 'Zaregistrovat obchod'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Deals Page ────────────────────────────────────────────────────────────────

export default function DealsPage() {
  const { confirm, alert } = useModal()
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
    } catch (err) {
      console.error('Chyba komunikace u obchodního API:', err);
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [statusFilter])

  const handleDelete = async (deal: Deal) => {
    const confirmed = await confirm({
      title: 'Smazat obchod?',
      description: `Opravdu si přejete smazat obchod s klientem "${deal.clientName}"?`,
      variant: 'danger',
      confirmText: 'Smazat obchod',
      cancelText: 'Zrušit'
    })
    if (!confirmed) return
    try {
      await dealsApi.delete(deal.id)
      load()
    } catch {
      await alert({
        title: 'Chyba',
        description: 'Došlo k chybě při mazání záznamu.',
        variant: 'danger'
      })
    }
  }

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-16 animate-in fade-in duration-300">
      {/* Action button */}
      <div className="flex justify-end border-b border-zinc-200 dark:border-zinc-800 pb-4">
        <button 
          onClick={() => setDialog('new')}
          className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-sm font-semibold rounded-xl transition-all shadow-lg shadow-blue-500/25 cursor-pointer"
        >
          <Plus className="w-4 h-4 stroke-[2.5]" />
          <span>Přidat nový obchod</span>
        </button>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
          <div className="modern-card p-5 relative overflow-hidden">
            <span className="text-xs font-semibold uppercase tracking-wider text-zinc-400 dark:text-zinc-500 block mb-1">
              Celkem evidovaných smluv
            </span>
            <p className="text-2xl lg:text-3xl font-bold font-mono text-zinc-900 dark:text-white">
              {stats.totalCount} <span className="text-sm font-normal text-zinc-500">obchodů</span>
            </p>
          </div>
          <div className="modern-card p-5 relative overflow-hidden">
            <span className="text-xs font-semibold uppercase tracking-wider text-zinc-400 dark:text-zinc-500 block mb-1">
              Celková provizní produkce
            </span>
            <p className="text-2xl lg:text-3xl font-bold font-mono text-amber-600 dark:text-amber-400">
              {stats.totalPoints.toLocaleString('cs-CZ', { maximumFractionDigits: 1 })} <span className="text-sm font-semibold text-zinc-500">b.</span>
            </p>
          </div>
          <div className="modern-card p-5 relative overflow-hidden border-l-4 border-l-emerald-500">
            <span className="text-xs font-semibold uppercase tracking-wider text-zinc-400 dark:text-zinc-500 block mb-1">
              Provize celkem (při hodn. bodu)
            </span>
            <p className="text-2xl lg:text-3xl font-bold font-mono text-emerald-600 dark:text-emerald-400">
              {czk.format(stats.totalCommissionCzk)}
            </p>
          </div>
        </div>
      )}

      {/* Filter tabs */}
      <div className="flex items-center gap-2 flex-wrap">
        {(['', 'Pending', 'Active', 'Completed', 'Cancelled'] as const).map(s => (
          <button 
            key={s} 
            onClick={() => setStatusFilter(s)}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all border ${
              statusFilter === s
                ? 'bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 border-transparent shadow-sm'
                : 'bg-zinc-100 dark:bg-zinc-800/60 border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
            }`}
          >
            {s === '' ? 'Všechny obchody' : STATUS_LABELS[s]}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="modern-card overflow-hidden border border-zinc-200 dark:border-zinc-800">
        {loading ? (
          <div className="p-12 text-center text-sm font-medium text-zinc-500 animate-pulse">
            Načítání seznamu obchodů a smluv...
          </div>
        ) : deals.length === 0 ? (
          <div className="py-16 text-center text-zinc-500 dark:text-zinc-400 text-sm">
            <p className="font-semibold mb-1">Nebyl nalezen žádný evidovaný obchod ani smlouva.</p>
            <p className="text-xs text-zinc-400 max-w-sm mx-auto">Kliknutím na "Přidat nový obchod" vytvoříte svůj první záznam do deníku provizních příjmů.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/60 text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                  {['Klient & Partner', 'Datum', 'Investované Aktivum / Produkt', 'Objem vkladu', 'Vytěžené Body', 'Odhad provize', 'Stav', 'Akce'].map((h, idx) => (
                    <th key={h} className={`py-3.5 px-5 ${idx >= 3 && idx <= 5 ? 'text-right' : ''} ${idx === 7 ? 'text-right' : ''}`}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800/80 text-sm text-zinc-700 dark:text-zinc-300">
                {deals.map(d => (
                  <tr key={d.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors">
                    <td className="py-4 px-5">
                      <div className="font-bold text-zinc-900 dark:text-zinc-100">{d.clientName}</div>
                      <div className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">{COMPANIES[d.company] ?? d.company}</div>
                    </td>
                    <td className="py-4 px-5 text-zinc-600 dark:text-zinc-400 font-medium">
                      {new Date(d.date).toLocaleDateString('cs-CZ')}
                    </td>
                    <td className="py-4 px-5">
                      <div className="font-semibold text-zinc-800 dark:text-zinc-200">{d.productName || 'Neuvedený produkt'}</div>
                      <div className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">{CATEGORIES[d.category] ?? d.category}</div>
                    </td>
                    <td className="py-4 px-5 text-right font-mono font-bold text-zinc-900 dark:text-white">
                      {d.depositAmount.toLocaleString('cs-CZ')} Kč
                    </td>
                    <td className="py-4 px-5 text-right font-mono font-bold text-amber-600 dark:text-amber-400">
                      ~{d.calculatedPoints.toLocaleString('cs-CZ', { maximumFractionDigits: 1 })} b.
                    </td>
                    <td className="py-4 px-5 text-right font-mono font-bold text-emerald-600 dark:text-emerald-400">
                      {czk.format(d.estimatedCommission)}
                    </td>
                    <td className="py-4 px-5">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold border ${STATUS_COLORS[d.status]}`}>
                        <CheckCircle2 className="w-3 h-3" />
                        <span>{STATUS_LABELS[d.status]}</span>
                      </span>
                    </td>
                    <td className="py-4 px-5 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button 
                          onClick={() => setDialog(d)}
                          title="Upravit obchod"
                          className="p-1.5 text-zinc-400 hover:text-blue-600 dark:hover:text-blue-400 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => handleDelete(d)}
                          title="Odstranit"
                          className="p-1.5 text-zinc-400 hover:text-red-600 dark:hover:text-red-400 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
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
