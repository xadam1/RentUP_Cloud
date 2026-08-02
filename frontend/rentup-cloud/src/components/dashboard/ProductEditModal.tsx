import React, { useState, useEffect } from 'react';
import { X, Check, HelpCircle, Sparkles, AlertCircle, Palette } from 'lucide-react';
import { productsApi, type ProductDashboardItem, type ProductCategory, type ProductCompany } from '@/lib/api';

interface ProductEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved: () => void;
  productToEdit?: ProductDashboardItem | null;
}

const colorSwatches = [
  '#3b82f6', // Blue
  '#10b981', // Emerald
  '#f59e0b', // Amber
  '#6366f1', // Indigo
  '#8b5cf6', // Violet
  '#ec4899', // Pink
  '#06b6d4', // Cyan
  '#ef4444', // Red
];

// Simplified clean list of categories as requested by user
const categoryLabels: Record<ProductCategory, string> = {
  InvestmentFund: 'Investiční fondy',
  RealEstate: 'Nemovitostní fondy',
  Bonds: 'Dluhopisy a programy',
  Other: 'Ostatní produkty',
  // Historical mapping for legacy products
  PensionSavings: 'Penzijní spoření',
  Commodities: 'Zlato a komodity',
  BuildingSavings: 'Stavební spoření',
  LifeInsurance: 'Investiční pojištění',
};

const activeCategories: ProductCategory[] = ['InvestmentFund', 'RealEstate', 'Bonds', 'Other'];

export default function ProductEditModal({ isOpen, onClose, onSaved, productToEdit }: ProductEditModalProps) {
  const [name, setName] = useState('');
  const [category, setCategory] = useState<ProductCategory>('InvestmentFund');
  const [company, setCompany] = useState<ProductCompany>('Other');
  const [colorHex, setColorHex] = useState('#3b82f6');
  const [currentAum, setCurrentAum] = useState('0');
  const [monthlyDeposit, setMonthlyDeposit] = useState('0');
  const [averageYield, setAverageYield] = useState('6.5');
  const [commissionFormula, setCommissionFormula] = useState('AUM * 0.015 * 0.35');
  const [includeInAum, setIncludeInAum] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (productToEdit) {
      setName(productToEdit.name);
      setCategory(productToEdit.category);
      setCompany(productToEdit.company);
      setColorHex(productToEdit.colorHex || '#3b82f6');
      setCurrentAum(productToEdit.currentAum.toString());
      setMonthlyDeposit(productToEdit.monthlyDeposit.toString());
      setAverageYield(productToEdit.averageYield.toString());
      setCommissionFormula(productToEdit.commissionFormula || '0');
      setIncludeInAum(productToEdit.includeInAum !== false);
    } else {
      setName('');
      setCategory('InvestmentFund');
      setCompany('Other');
      setColorHex(colorSwatches[Math.floor(Math.random() * colorSwatches.length)]);
      setCurrentAum('0');
      setMonthlyDeposit('0');
      setAverageYield('6.5');
      setCommissionFormula('AUM * 0.015 * 0.35');
      setIncludeInAum(true);
    }
    setError(null);
  }, [productToEdit, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError('Název produktu je povinný.');
      return;
    }

    setLoading(true);
    try {
      const parsedAum = parseFloat(currentAum.replace(' ', '').replace(',', '.')) || 0;
      const parsedDeposit = parseFloat(monthlyDeposit.replace(' ', '').replace(',', '.')) || 0;
      const parsedYield = parseFloat(averageYield.replace(',', '.')) || 0;

      if (productToEdit) {
        await productsApi.update(productToEdit.id, {
          name: name.trim(),
          category,
          company,
          colorHex,
          averageYield: parsedYield,
          monthlyDeposit: parsedDeposit,
          commissionFormula: commissionFormula.trim(),
          order: 0,
          includeInAum,
          currentAum: parsedAum,
          isActive: true
        });
      } else {
        await productsApi.create({
          name: name.trim(),
          category,
          company,
          colorHex,
          averageYield: parsedYield,
          monthlyDeposit: parsedDeposit,
          commissionFormula: commissionFormula.trim(),
          order: 0,
          includeInAum,
          currentAum: parsedAum
        });
      }

      onSaved();
      onClose();
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Došlo k chybě při ukládání produktu.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 modal-backdrop animate-in fade-in duration-200"
        onClick={onClose} 
      />

      {/* Modal Card */}
      <div className="relative z-10 w-full max-w-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-2xl overflow-hidden backdrop-blur-xl animate-in zoom-in-95 duration-200 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between bg-zinc-50 dark:bg-zinc-800/50">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-500/15 border border-blue-500/30 flex items-center justify-center text-blue-500">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
                {productToEdit ? 'Upravit investiční produkt' : 'Přidat nový produkt do portfolia'}
              </h3>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Nastavte vlastnosti produktu pro výpočet roční produkce a správy AUM.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body (Form) */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-5 flex-1">
          {error && (
            <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-600 dark:text-red-400 text-sm flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Name & Color swatch */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
            <div className="md:col-span-7 space-y-1.5">
              <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                Název produktu <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="např. Conseq Active Invest"
                className="w-full px-3.5 py-2.5 text-sm bg-zinc-50 dark:bg-zinc-800/80 border border-zinc-300 dark:border-zinc-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all text-zinc-900 dark:text-zinc-100"
              />
            </div>

            <div className="md:col-span-5 space-y-1.5">
              <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 flex items-center gap-1.5">
                <Palette className="w-3.5 h-3.5 text-zinc-400" />
                <span>Barva (i vlastní)</span>
              </label>
              <div className="flex items-center gap-2 flex-wrap pt-1">
                {colorSwatches.map((c) => (
                  <button
                    type="button"
                    key={c}
                    onClick={() => setColorHex(c)}
                    style={{ backgroundColor: c }}
                    className={`w-6 h-6 rounded-full transition-all flex items-center justify-center ${
                      colorHex === c ? 'ring-2 ring-offset-2 ring-offset-white dark:ring-offset-zinc-900 ring-zinc-800 dark:ring-white scale-110 shadow-sm' : 'hover:scale-105 opacity-80 hover:opacity-100'
                    }`}
                  >
                    {colorHex === c && <Check className="w-3 h-3 text-white stroke-[3]" />}
                  </button>
                ))}
                
                {/* Custom Color Picker */}
                <div className="relative group flex items-center justify-center w-7 h-7 rounded-full border-2 border-dashed border-zinc-400 dark:border-zinc-500 hover:border-blue-500 p-0.5 overflow-hidden transition-all cursor-pointer">
                  <input
                    type="color"
                    value={colorHex.startsWith('#') && colorHex.length === 7 ? colorHex : '#3b82f6'}
                    onChange={(e) => setColorHex(e.target.value)}
                    title="Vybrat libovolnou barvu"
                    className="absolute -inset-2 w-12 h-12 cursor-pointer bg-transparent opacity-90 hover:opacity-100 transition-opacity"
                  />
                  {!colorSwatches.includes(colorHex) && (
                    <div 
                      className="w-full h-full rounded-full flex items-center justify-center text-white pointer-events-none z-10 shadow-inner" 
                      style={{ backgroundColor: colorHex }}
                    >
                      <Check className="w-3 h-3 text-white stroke-[3]" />
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Category (Company removed as requested) */}
          <div>
            <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">
              Třída produktu
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as ProductCategory)}
              className="w-full px-3.5 py-2.5 text-sm bg-zinc-50 dark:bg-zinc-800/80 border border-zinc-300 dark:border-zinc-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 text-zinc-900 dark:text-zinc-100 font-medium"
            >
              {activeCategories.map((cat) => (
                <option key={cat} value={cat}>
                  {categoryLabels[cat]}
                </option>
              ))}
              {!activeCategories.includes(category) && (
                <option value={category}>{categoryLabels[category] || category}</option>
              )}
            </select>
          </div>

          {/* Current AUM, Monthly Deposit, Yield */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                Aktuální stav AUM
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={currentAum}
                  onChange={(e) => setCurrentAum(e.target.value)}
                  className="w-full px-3.5 py-2 text-sm bg-zinc-50 dark:bg-zinc-800/80 border border-zinc-300 dark:border-zinc-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 font-mono font-semibold text-zinc-900 dark:text-zinc-100 pr-8"
                />
                <span className="absolute right-3 top-2.5 text-xs text-zinc-400 font-semibold">Kč</span>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                Měsíční vklady
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={monthlyDeposit}
                  onChange={(e) => setMonthlyDeposit(e.target.value)}
                  className="w-full px-3.5 py-2 text-sm bg-zinc-50 dark:bg-zinc-800/80 border border-zinc-300 dark:border-zinc-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 font-mono font-semibold text-zinc-900 dark:text-zinc-100 pr-8"
                />
                <span className="absolute right-3 top-2.5 text-xs text-zinc-400 font-semibold">Kč</span>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                Oček. zhodnocení
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={averageYield}
                  onChange={(e) => setAverageYield(e.target.value)}
                  className="w-full px-3.5 py-2 text-sm bg-zinc-50 dark:bg-zinc-800/80 border border-zinc-300 dark:border-zinc-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 font-mono font-semibold text-zinc-900 dark:text-zinc-100 pr-7"
                />
                <span className="absolute right-3 top-2.5 text-xs text-zinc-400 font-semibold">%</span>
              </div>
            </div>
          </div>

          {/* Commission Formula */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300">
              Vzorec pro výpočet roční produkce bodů / pasiva
            </label>
            <input
              type="text"
              value={commissionFormula}
              onChange={(e) => setCommissionFormula(e.target.value)}
              placeholder="např. AUM * 0.015 * 0.35"
              className="w-full px-3.5 py-2.5 text-sm font-mono font-bold bg-zinc-100 dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 text-blue-600 dark:text-blue-400"
            />
            <p className="text-[11px] text-zinc-500 dark:text-zinc-400 flex items-center gap-1.5 pt-1 leading-relaxed">
              <HelpCircle className="w-3.5 h-3.5 flex-shrink-0 text-blue-500" />
              <span>Použijte proměnnou <strong>AUM</strong>. Výsledek reprezentuje roční příjem nebo produkci k danému aktuálnímu stavu portfolia produktu.</span>
            </p>
          </div>

          {/* Include in AUM Checkbox */}
          <div className="p-4 bg-zinc-50 dark:bg-zinc-800/40 rounded-xl border border-zinc-200 dark:border-zinc-800 flex items-start gap-3">
            <input
              type="checkbox"
              id="includeInAum"
              checked={includeInAum}
              onChange={(e) => setIncludeInAum(e.target.checked)}
              className="mt-1 w-4 h-4 text-blue-600 rounded border-zinc-300 dark:border-zinc-600 focus:ring-blue-500/50 cursor-pointer"
            />
            <label htmlFor="includeInAum" className="text-xs text-zinc-700 dark:text-zinc-300 cursor-pointer select-none">
              <strong className="block text-sm font-bold text-zinc-900 dark:text-zinc-100 mb-0.5">Započítávat do celkového spravovaného portfolia</strong>
              Vypnutím vyřadíte tento produkt ze součtových ukazatelů AUM i celkového grafu.
            </label>
          </div>

          {/* Actions */}
          <div className="pt-4 border-t border-zinc-200 dark:border-zinc-800 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 text-sm font-medium text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-xl transition-colors"
            >
              Zrušit
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2.5 text-sm font-semibold bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-xl shadow-lg shadow-blue-500/25 transition-all disabled:opacity-50 flex items-center gap-2"
            >
              {loading && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
              <span>{productToEdit ? 'Uložit změny' : 'Vytvořit produkt'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
