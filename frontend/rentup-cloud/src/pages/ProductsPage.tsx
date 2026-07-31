import { useState, useEffect } from 'react'
import { Plus, Pencil, Trash2, FlaskConical, ChevronUp, ChevronDown, Power } from 'lucide-react'
import { productsApi, type Product, type CreateProductRequest, type UpdateProductRequest } from '@/lib/api'

// ── Enums → Czech labels ──────────────────────────────────────────────────────

const CATEGORIES: Record<string, string> = {
  InvestmentFund: 'Investiční fond',
  BuildingSavings: 'Stavební spoření',
  LifeInsurance: 'Životní pojištění',
  PensionSavings: 'Penzijní spoření',
  Bonds: 'Dluhopisy',
  Commodities: 'Zlato / Komodity',
  RealEstate: 'Nemovitosti',
  Other: 'Ostatní',
}

const COMPANIES: Record<string, string> = {
  ZfpInvestments: 'ZFP Investments',
  WoodAndCo: 'Wood & Co',
  Avant: 'AVANT',
  Conseq: 'Conseq',
  GeneraliInvestments: 'Generali Investments',
  ZfpFinance: 'ZFP Finance',
  ZfpGold: 'ZFP Gold',
  NnInvestments: 'NN Investments',
  Amundi: 'Amundi',
  Other: 'Ostatní',
}

const PRESET_COLORS = [
  '#3b82f6', '#8b5cf6', '#10b981', '#f59e0b',
  '#ef4444', '#06b6d4', '#ec4899', '#84cc16',
]

// ── Form defaults ─────────────────────────────────────────────────────────────

const EMPTY_FORM: Omit<CreateProductRequest, 'order'> = {
  name: '',
  category: 'InvestmentFund' as any,
  company: 'Other' as any,
  colorHex: '#3b82f6',
  averageYield: 5,
  monthlyDeposit: 0,
  commissionFormula: '',
}

// ── Product Dialog ────────────────────────────────────────────────────────────

interface DialogProps {
  product?: Product | null
  onClose: () => void
  onSaved: () => void
  nextOrder: number
}

function ProductDialog({ product, onClose, onSaved, nextOrder }: DialogProps) {
  const isEdit = !!product
  const [form, setForm] = useState<CreateProductRequest>(
    product
      ? { name: product.name, category: product.category, company: product.company,
          colorHex: product.colorHex, averageYield: product.averageYield,
          monthlyDeposit: product.monthlyDeposit, commissionFormula: product.commissionFormula,
          order: product.order }
      : { ...EMPTY_FORM, order: nextOrder }
  )
  const [saving, setSaving] = useState(false)
  const [formulaError, setFormulaError] = useState<string | null>(null)
  const [validating, setValidating] = useState(false)

  const set = (k: keyof CreateProductRequest, v: any) =>
    setForm(f => ({ ...f, [k]: v }))

  const validateFormula = async () => {
    if (!form.commissionFormula) return
    setValidating(true)
    try {
      await productsApi.validateFormula(form.commissionFormula)
      setFormulaError(null)
    } catch (e: any) {
      setFormulaError(e?.response?.data?.error ?? 'Neplatný vzorec')
    }
    setValidating(false)
  }

  const save = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      if (isEdit) {
        await productsApi.update(product!.id, { ...form, isActive: product!.isActive } as UpdateProductRequest)
      } else {
        await productsApi.create(form)
      }
      onSaved()
    } catch (e: any) {
      setFormulaError(e?.response?.data?.error ?? 'Chyba při ukládání.')
    }
    setSaving(false)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-[#13131f] border border-white/[0.1] rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-white/[0.08] flex items-center justify-between">
          <h3 className="text-white font-medium">{isEdit ? 'Upravit produkt' : 'Nový produkt'}</h3>
          <button onClick={onClose} className="text-white/40 hover:text-white transition-colors text-xl leading-none">×</button>
        </div>

        <form onSubmit={save} className="px-6 py-5 space-y-4 max-h-[75vh] overflow-y-auto">
          {/* Name */}
          <Field label="Název produktu">
            <input value={form.name} onChange={e => set('name', e.target.value)} required
              className={INPUT} placeholder="např. ZFP Investiční fond" />
          </Field>

          {/* Category + Company */}
          <div className="grid grid-cols-2 gap-3">
            <Field label="Kategorie">
              <select value={form.category as string} onChange={e => set('category', e.target.value)} className={INPUT}>
                {Object.entries(CATEGORIES).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </Field>
            <Field label="Společnost">
              <select value={form.company as string} onChange={e => set('company', e.target.value)} className={INPUT}>
                {Object.entries(COMPANIES).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </Field>
          </div>

          {/* Yield + Deposit */}
          <div className="grid grid-cols-2 gap-3">
            <Field label="Průměrný výnos (% p.a.)">
              <input type="number" step="0.01" value={form.averageYield}
                onChange={e => set('averageYield', +e.target.value)} className={INPUT} />
            </Field>
            <Field label="Měsíční vklad (CZK)">
              <input type="number" step="1" value={form.monthlyDeposit}
                onChange={e => set('monthlyDeposit', +e.target.value)} className={INPUT} />
            </Field>
          </div>

          {/* Commission formula */}
          <Field label="Vzorec provize (NCalc, proměnná: AUM)">
            <div className="flex gap-2">
              <input value={form.commissionFormula}
                onChange={e => { set('commissionFormula', e.target.value); setFormulaError(null) }}
                onBlur={validateFormula}
                className={`${INPUT} flex-1 font-mono text-xs`}
                placeholder="(AUM/1555200)*24" />
              <button type="button" onClick={validateFormula} title="Ověřit vzorec"
                className="px-3 py-2 rounded-xl bg-white/[0.06] hover:bg-white/[0.1] text-white/60 hover:text-white transition-all">
                <FlaskConical className={`w-4 h-4 ${validating ? 'animate-pulse text-blue-400' : ''}`} />
              </button>
            </div>
            {formulaError === null && form.commissionFormula && !validating && (
              <p className="text-emerald-400 text-xs mt-1">✓ Vzorec je validní</p>
            )}
            {formulaError && <p className="text-red-400 text-xs mt-1">{formulaError}</p>}
          </Field>

          {/* Color */}
          <Field label="Barva v grafech">
            <div className="flex items-center gap-2 flex-wrap">
              {PRESET_COLORS.map(c => (
                <button key={c} type="button" onClick={() => set('colorHex', c)}
                  style={{ background: c }}
                  className={`w-7 h-7 rounded-lg transition-all ${form.colorHex === c ? 'ring-2 ring-white ring-offset-1 ring-offset-[#13131f] scale-110' : 'opacity-70 hover:opacity-100'}`}
                />
              ))}
              <input type="color" value={form.colorHex} onChange={e => set('colorHex', e.target.value)}
                className="w-7 h-7 rounded-lg border border-white/20 bg-transparent cursor-pointer" />
              <span className="text-white/40 text-xs font-mono">{form.colorHex}</span>
            </div>
          </Field>

          {/* Order */}
          <Field label="Pořadí zobrazení">
            <input type="number" min={0} value={form.order}
              onChange={e => set('order', +e.target.value)} className={INPUT} />
          </Field>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose}
              className="px-4 py-2 text-sm text-white/50 hover:text-white transition-colors">
              Zrušit
            </button>
            <button type="submit" disabled={saving}
              className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium rounded-xl transition-all disabled:opacity-50">
              {saving ? 'Ukládám...' : isEdit ? 'Uložit změny' : 'Vytvořit produkt'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-white/50 text-xs font-medium uppercase tracking-wider mb-1.5">{label}</label>
      {children}
    </div>
  )
}

const INPUT = 'w-full bg-white/[0.06] border border-white/[0.1] rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-blue-500/60 focus:ring-1 focus:ring-blue-500/30 transition-all [&>option]:bg-[#1a1a2e]'

// ── Products Page ─────────────────────────────────────────────────────────────

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [showInactive, setShowInactive] = useState(false)
  const [dialog, setDialog] = useState<'new' | Product | null>(null)

  const load = async () => {
    setLoading(true)
    try {
      const res = await productsApi.getAll(showInactive)
      setProducts(res.data)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [showInactive]) // eslint-disable-line

  const handleDelete = async (product: Product) => {
    if (!confirm(`Opravdu deaktivovat produkt "${product.name}"?\n(Historická data budou zachována)`)) return
    await productsApi.delete(product.id)
    load()
  }

  const handleReorder = async (product: Product, direction: 'up' | 'down') => {
    const idx = products.findIndex(p => p.id === product.id)
    const swap = products[direction === 'up' ? idx - 1 : idx + 1]
    if (!swap) return
    await Promise.all([
      productsApi.update(product.id, { ...product, isActive: product.isActive, order: swap.order }),
      productsApi.update(swap.id, { ...swap, isActive: swap.isActive, order: product.order }),
    ])
    load()
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-white text-2xl font-semibold tracking-tight">Produkty</h1>
          <p className="text-white/40 text-sm mt-0.5">Správa finančních produktů a vzorců provizí</p>
        </div>
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 text-white/40 text-sm cursor-pointer select-none">
            <input type="checkbox" checked={showInactive} onChange={e => setShowInactive(e.target.checked)}
              className="w-4 h-4 rounded accent-blue-500" />
            Zobrazit neaktivní
          </label>
          <button onClick={() => setDialog('new')}
            className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium rounded-xl transition-all shadow-lg shadow-blue-500/20 hover:-translate-y-px">
            <Plus className="w-4 h-4" />
            Nový produkt
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white/[0.04] border border-white/[0.08] rounded-2xl overflow-hidden">
        {loading ? (
          <div className="space-y-px p-1">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-14 bg-white/[0.03] rounded-xl animate-pulse" />
            ))}
          </div>
        ) : products.length === 0 ? (
          <div className="py-16 text-center">
            <p className="text-white/25 text-sm">Žádné produkty — vytvořte první produkt</p>
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/[0.06]">
                {['', 'Produkt', 'Kategorie', 'Výnos', 'Měs. vklad', 'Vzorec provize', 'Pořadí', ''].map((h, i) => (
                  <th key={i} className="text-left px-4 py-3 text-white/30 text-xs font-medium uppercase tracking-wider">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {products.map((p, idx) => (
                <tr key={p.id}
                  className={`border-b border-white/[0.04] last:border-0 transition-colors hover:bg-white/[0.03] ${!p.isActive ? 'opacity-40' : ''}`}>
                  {/* Color dot */}
                  <td className="pl-4 pr-2 py-3.5 w-8">
                    <div className="w-3 h-3 rounded-full" style={{ background: p.colorHex }} />
                  </td>
                  {/* Name + company */}
                  <td className="px-2 py-3.5">
                    <p className="text-white text-sm font-medium">{p.name}</p>
                    <p className="text-white/30 text-xs">{COMPANIES[p.company as string] ?? p.company}</p>
                  </td>
                  {/* Category */}
                  <td className="px-4 py-3.5 text-white/50 text-xs">
                    {CATEGORIES[p.category as string] ?? p.category}
                  </td>
                  {/* Yield */}
                  <td className="px-4 py-3.5 text-white/70 text-sm font-mono">
                    {p.averageYield.toFixed(2)} %
                  </td>
                  {/* Monthly deposit */}
                  <td className="px-4 py-3.5 text-white/70 text-sm font-mono">
                    {p.monthlyDeposit.toLocaleString('cs-CZ')} Kč
                  </td>
                  {/* Formula */}
                  <td className="px-4 py-3.5 max-w-[160px]">
                    <code className="text-blue-400/80 text-xs font-mono truncate block" title={p.commissionFormula}>
                      {p.commissionFormula || <span className="text-white/20 not-italic">—</span>}
                    </code>
                  </td>
                  {/* Order controls */}
                  <td className="px-4 py-3.5 w-16">
                    <div className="flex flex-col gap-0.5">
                      <button onClick={() => handleReorder(p, 'up')} disabled={idx === 0}
                        className="text-white/20 hover:text-white/60 disabled:opacity-20 transition-colors">
                        <ChevronUp className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => handleReorder(p, 'down')} disabled={idx === products.length - 1}
                        className="text-white/20 hover:text-white/60 disabled:opacity-20 transition-colors">
                        <ChevronDown className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                  {/* Actions */}
                  <td className="px-4 py-3.5 w-28">
                    <div className="flex items-center gap-1">
                      <button onClick={() => setDialog(p)} title="Upravit"
                        className="p-1.5 rounded-lg text-white/30 hover:text-white hover:bg-white/[0.08] transition-all">
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => handleDelete(p)} title={p.isActive ? 'Deaktivovat' : 'Již neaktivní'}
                        className={`p-1.5 rounded-lg transition-all ${p.isActive ? 'text-white/30 hover:text-red-400 hover:bg-red-500/10' : 'text-white/10 cursor-default'}`}>
                        {p.isActive ? <Trash2 className="w-3.5 h-3.5" /> : <Power className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Dialog */}
      {dialog !== null && (
        <ProductDialog
          product={dialog === 'new' ? null : dialog}
          onClose={() => setDialog(null)}
          onSaved={() => { setDialog(null); load() }}
          nextOrder={products.length}
        />
      )}
    </div>
  )
}
