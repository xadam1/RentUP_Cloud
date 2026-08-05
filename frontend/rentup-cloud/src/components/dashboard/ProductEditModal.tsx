import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Check, AlertCircle, Trash2, Calculator, Code, Info, ChevronDown, ChevronUp, Save } from 'lucide-react';
import { productsApi, type ProductDashboardItem, type ProductCategory, type ProductCompany } from '@/lib/api';
import { useModal } from '@/contexts/ModalContext';

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

const categoryLabels: Record<string, string> = {
  InvestmentFund: 'Cenné papíry',
  RealEstate: 'Nemovitosti',
  Commodities: 'Komodity',
  MoneyMarket: 'Peněžní trh',
  LifeInsurance: 'Peněžní trh',
  Bonds: 'Dluhopisy a programy',
  Other: 'Ostatní produkty',
  PensionSavings: 'Penzijní spoření',
  BuildingSavings: 'Stavební spoření',
  '0': 'Cenné papíry',
  '6': 'Nemovitosti',
  '5': 'Komodity',
  '7': 'Peněžní trh',
  '2': 'Peněžní trh',
};

const activeCategories: ProductCategory[] = ['InvestmentFund', 'RealEstate', 'Commodities', 'MoneyMarket' as any];

const normalizeCategory = (cat?: string | number): ProductCategory => {
  if (cat === 0 || cat === '0' || cat === 'InvestmentFund') return 'InvestmentFund';
  if (cat === 6 || cat === '6' || cat === 'RealEstate') return 'RealEstate';
  if (cat === 5 || cat === '5' || cat === 'Commodities') return 'Commodities';
  if (cat === 7 || cat === '7' || cat === 'MoneyMarket' || cat === 2 || cat === '2' || cat === 'LifeInsurance') return 'MoneyMarket' as any;
  if (typeof cat === 'string' && ['InvestmentFund', 'RealEstate', 'Commodities', 'MoneyMarket'].includes(cat)) return cat as ProductCategory;
  return 'InvestmentFund';
};

const formatNumberWithSpaces = (val?: string | number): string => {
  if (val === undefined || val === null) return '';
  const str = val.toString().replace(/\s/g, '').replace(',', '.');
  if (str === '') return '';
  const parts = str.split('.');
  const intPart = parts[0].replace(/\D/g, '');
  const formattedInt = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  if (parts.length > 1) {
    return `${formattedInt},${parts[1].replace(/\D/g, '')}`;
  }
  return formattedInt;
};

export default function ProductEditModal({ isOpen, onClose, onSaved, productToEdit }: ProductEditModalProps) {
  const { confirm, alert } = useModal();
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

  // Collapsible advanced settings state
  const [showAdvanced, setShowAdvanced] = useState(false);

  useEffect(() => {
    if (productToEdit) {
      setName(productToEdit.name);
      setCategory(normalizeCategory(productToEdit.category));
      setCompany(productToEdit.company);
      setColorHex(productToEdit.colorHex || '#3b82f6');
      setCurrentAum(formatNumberWithSpaces(productToEdit.currentAum));
      setMonthlyDeposit(formatNumberWithSpaces(productToEdit.monthlyDeposit));
      setAverageYield(productToEdit.averageYield.toString());
      setCommissionFormula(productToEdit.commissionFormula || 'AUM * 0.015 * 0.35');
      setIncludeInAum(productToEdit.includeInAum !== false);
    } else {
      setName('');
      setCategory('InvestmentFund');
      setCompany('Other');
      setColorHex(colorSwatches[Math.floor(Math.random() * 5)]);
      setCurrentAum('0');
      setMonthlyDeposit('0');
      setAverageYield('6.5');
      setCommissionFormula('AUM * 0.015 * 0.35');
      setIncludeInAum(true);
    }
    setError(null);
    setShowAdvanced(false);
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
      const parsedAum = parseFloat(currentAum.toString().replace(/\s/g, '').replace(',', '.')) || 0;
      const parsedDeposit = parseFloat(monthlyDeposit.toString().replace(/\s/g, '').replace(',', '.')) || 0;
      const parsedYield = parseFloat(averageYield.toString().replace(',', '.')) || 0;

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

  const handleDelete = async () => {
    if (!productToEdit) return;
    const confirmed = await confirm({
      title: 'Smazat produkt?',
      description: `Opravdu si přejete trvale odebrat produkt "${productToEdit.name}" z portfolia?`,
      variant: 'danger',
      confirmText: 'Smazat produkt',
      cancelText: 'Zrušit'
    });
    if (confirmed) {
      setLoading(true);
      try {
        await productsApi.delete(productToEdit.id);
        onSaved();
        onClose();
      } catch (err: any) {
        await alert({
          title: 'Chyba',
          description: err?.response?.data?.error || 'Došlo k chybě při mazání produktu.',
          variant: 'danger'
        });
      } finally {
        setLoading(false);
      }
    }
  };

  if (!isOpen) return null;

  return createPortal(
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 modal-backdrop animate-in fade-in duration-200"
      onClick={(e) => e.stopPropagation()} 
    >
      <div className="modern-card w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200 relative z-10 text-left">
        {/* Modal Header */}
        <div className="px-6 py-5 border-b border-zinc-200 dark:border-zinc-800 flex justify-between items-center bg-zinc-50/50 dark:bg-zinc-900/50">
          <div>
            <p className="text-[10px] font-bold text-blue-600 dark:text-blue-500 uppercase tracking-widest mb-1">Nastavení Produktu</p>
            <h2 className="text-xl font-bold text-zinc-900 dark:text-white">{productToEdit ? productToEdit.name : 'Nový produkt'}</h2>
          </div>
          <button onClick={onClose} type="button" className="w-8 h-8 rounded-lg hover:bg-zinc-200 dark:hover:bg-zinc-800 text-zinc-500 flex items-center justify-center transition-colors border border-transparent dark:hover:border-zinc-700 cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSubmit} className="flex-1 flex flex-col overflow-hidden">
          <div className="p-6 overflow-y-auto space-y-6 flex-1">
            {error && (
              <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-600 dark:text-red-400 text-sm flex items-center gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Basic Info & Visuals */}
            <div className="space-y-4">
              <h3 className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest border-b border-zinc-100 dark:border-zinc-800 pb-2">Identifikace a vzhled</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mt-3">
                <div className="flex flex-col justify-between h-full space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">Název produktu <span className="text-red-500">*</span></label>
                    <input
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="např. Conseq Active Invest"
                      className="w-full bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-700 rounded-xl px-3.5 py-2.5 text-sm text-zinc-900 dark:text-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all shadow-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">Třída aktiv</label>
                    <select
                      value={category}
                      onChange={(e) => setCategory(e.target.value as ProductCategory)}
                      className="w-full bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-700 rounded-xl px-3.5 py-2.5 text-sm text-zinc-900 dark:text-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all shadow-sm font-medium cursor-pointer"
                    >
                      {activeCategories.map((cat) => (
                        <option key={cat} value={cat}>{categoryLabels[cat]}</option>
                      ))}
                      {!activeCategories.includes(category) && (
                        <option value={category}>{categoryLabels[category] || category}</option>
                      )}
                    </select>
                  </div>
                </div>

                <div className="flex flex-col justify-between h-full space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-2.5">Barva produktu v grafech</label>
                    <div className="flex gap-2.5 flex-wrap items-center">
                      {colorSwatches.map((c) => (
                        <button
                          type="button"
                          key={c}
                          onClick={() => setColorHex(c)}
                          style={{ backgroundColor: c }}
                          className={`w-8 h-8 rounded-full transition-all flex items-center justify-center cursor-pointer ${
                            colorHex === c ? 'ring-2 ring-offset-2 ring-blue-500 ring-offset-white dark:ring-offset-zinc-900 shadow-md scale-110' : 'hover:scale-105 opacity-85 hover:opacity-100'
                          }`}
                        >
                          {colorHex === c && <Check className="w-4 h-4 text-white stroke-[3]" />}
                        </button>
                      ))}
                      {/* Custom Color Picker */}
                      <div className="relative group flex items-center justify-center w-8 h-8 rounded-full border-2 border-dashed border-zinc-300 dark:border-zinc-600 hover:border-blue-500 p-0.5 overflow-hidden transition-all cursor-pointer" title="Vlastní barva">
                        <input
                          type="color"
                          value={colorHex.startsWith('#') && colorHex.length === 7 ? colorHex : '#3b82f6'}
                          onChange={(e) => setColorHex(e.target.value)}
                          className="absolute -inset-2 w-14 h-14 cursor-pointer bg-transparent opacity-90 hover:opacity-100 transition-opacity"
                        />
                        {!colorSwatches.includes(colorHex) && (
                          <div
                            className="w-full h-full rounded-full flex items-center justify-center text-white pointer-events-none z-10 shadow-inner"
                            style={{ backgroundColor: colorHex }}
                          >
                            <Check className="w-3.5 h-3.5 text-white stroke-[3]" />
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Beautified Custom Switch / Card for includeInAum without redundant checkbox icon */}
                  <div>
                    <button
                      type="button"
                      onClick={() => setIncludeInAum(!includeInAum)}
                      className={`w-full flex items-center justify-between p-3.5 rounded-xl border transition-all cursor-pointer select-none ${
                        includeInAum
                          ? 'bg-emerald-50/80 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/30 text-emerald-950 dark:text-emerald-100 shadow-xs'
                          : 'bg-zinc-100/70 dark:bg-zinc-800/60 border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400'
                      }`}
                    >
                      <div className="text-left min-w-0 pr-2">
                        <div className="text-xs font-bold truncate">Započítat do AUM portfolia</div>
                        <div className="text-[10px] text-emerald-700/80 dark:text-zinc-400 truncate mt-0.5">
                          {includeInAum ? 'Aktivně zahrnuto do statistik AUM' : 'Skryto z celkového souhrnu'}
                        </div>
                      </div>
                      <div className={`w-10 h-6 flex items-center rounded-full p-1 duration-200 transition-colors flex-shrink-0 ${
                        includeInAum ? 'bg-emerald-500' : 'bg-zinc-300 dark:bg-zinc-700'
                      }`}>
                        <div className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform duration-200 ${
                          includeInAum ? 'translate-x-4' : 'translate-x-0'
                        }`} />
                      </div>
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Values - Enlarged with prominent formatting */}
            <div className="space-y-4">
              <h3 className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest border-b border-zinc-100 dark:border-zinc-800 pb-2">Stav majetku a cashflow</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mt-3">
                <div className="bg-zinc-50/70 dark:bg-zinc-900/50 p-4 rounded-2xl border border-zinc-200/80 dark:border-zinc-800/80 shadow-xs">
                  <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider mb-2">Počáteční / Aktuální AUM</label>
                  <div className="relative flex items-center">
                    <input
                      type="text"
                      value={currentAum}
                      onChange={(e) => setCurrentAum(formatNumberWithSpaces(e.target.value))}
                      placeholder="0"
                      className="w-full bg-white dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-700 rounded-xl px-4 py-3.5 pr-12 text-xl text-zinc-900 dark:text-white font-extrabold tabular-nums tracking-tight focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all shadow-inner"
                    />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm text-zinc-400 dark:text-zinc-500 font-extrabold pointer-events-none">Kč</span>
                  </div>
                  <p className="text-[11px] text-zinc-400 dark:text-zinc-500 mt-2">Aktuální hodnota fondu nebo investovaného kapitálu.</p>
                </div>

                <div className="bg-emerald-50/30 dark:bg-emerald-950/10 p-4 rounded-2xl border border-emerald-200/60 dark:border-emerald-900/40 shadow-xs">
                  <label className="block text-xs font-bold text-emerald-800 dark:text-emerald-300 uppercase tracking-wider mb-2">Pravidelný vklad</label>
                  <div className="relative flex items-center">
                    <input
                      type="text"
                      value={monthlyDeposit}
                      onChange={(e) => setMonthlyDeposit(formatNumberWithSpaces(e.target.value))}
                      placeholder="0"
                      className="w-full bg-white dark:bg-zinc-950 border border-emerald-300 dark:border-emerald-800/80 rounded-xl px-4 py-3.5 pr-20 text-xl text-emerald-600 dark:text-emerald-400 font-extrabold tabular-nums tracking-tight focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-all shadow-inner"
                    />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm text-emerald-600/80 dark:text-emerald-400/80 font-extrabold pointer-events-none">Kč / měs.</span>
                  </div>
                  <p className="text-[11px] text-emerald-700/70 dark:text-emerald-400/60 mt-2">Pravidelná měsíční úložka či trvalý příspěvek do programu.</p>
                </div>
              </div>
            </div>

            {/* Collapsible Advanced Settings (Formula & Annual Yield) */}
            <div className="border border-zinc-200 dark:border-zinc-800 rounded-2xl overflow-hidden bg-zinc-50/50 dark:bg-zinc-900/30 transition-all shadow-2xs">
              <button
                type="button"
                onClick={() => setShowAdvanced(!showAdvanced)}
                className="w-full px-5 py-4 flex items-center justify-between hover:bg-zinc-100/60 dark:hover:bg-zinc-800/50 transition-colors cursor-pointer text-left"
              >
                <div className="flex items-center gap-3.5">
                  <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center border border-blue-200/60 dark:border-blue-500/20">
                    <Calculator className="w-4 h-4 stroke-[2.5]" />
                  </div>
                  <div>
                    <div className="text-sm font-bold text-zinc-900 dark:text-zinc-100">Pokročilé nastavení: Provizní vzerec a roční výnos</div>
                    <div className="text-xs text-zinc-500 dark:text-zinc-400">Matematický výpočet odhadu provizního přínosu a zhodnocení</div>
                  </div>
                </div>
                <div className="text-zinc-400 dark:text-zinc-500 p-1 rounded-lg bg-zinc-200/50 dark:bg-zinc-800">
                  {showAdvanced ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                </div>
              </button>

              {showAdvanced && (
                <div className="p-5 border-t border-zinc-200 dark:border-zinc-800 space-y-6 bg-white/60 dark:bg-zinc-950/60 animate-in slide-in-from-top-2 duration-200">
                  {/* Annual Yield */}
                  <div className="max-w-xs">
                    <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">Roční výnos p.a.</label>
                    <div className="relative">
                      <input
                        type="text"
                        value={averageYield}
                        onChange={(e) => setAverageYield(e.target.value)}
                        className="w-full bg-white dark:bg-zinc-900 border border-blue-200 dark:border-blue-900/60 rounded-xl px-3.5 py-2.5 pr-8 text-sm text-blue-600 dark:text-blue-400 font-bold tabular-nums focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all shadow-xs"
                      />
                      <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs text-blue-600/80 dark:text-blue-400/80 font-bold">%</span>
                    </div>
                    <p className="text-[11px] text-zinc-400 dark:text-zinc-500 mt-1">Očekávané zhodnocení fondu.</p>
                  </div>

                  {/* Formula */}
                  <div className="space-y-2 border-t border-zinc-100 dark:border-zinc-800/80 pt-4">
                    <div className="flex justify-between items-center">
                      <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300">Vzorec pro roční pasivní příjem / body</label>
                      <span className="text-[10px] text-blue-600 dark:text-blue-400 font-bold bg-blue-50 dark:bg-blue-500/10 px-2 py-1 rounded border border-blue-200/50 dark:border-blue-500/20 flex items-center gap-1">
                        <Code className="w-3 h-3" /> Proměnná: AUM
                      </span>
                    </div>
                    <div className="relative group">
                      <div className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none text-zinc-400 dark:text-zinc-500">
                        <Calculator className="w-4 h-4" />
                      </div>
                      <input
                        type="text"
                        value={commissionFormula}
                        onChange={(e) => setCommissionFormula(e.target.value)}
                        placeholder="např. AUM * 0.015 * 0.35"
                        className="w-full bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-xl pl-10 pr-4 py-3 text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all font-mono text-blue-600 dark:text-blue-400 font-bold shadow-inner"
                      />
                    </div>
                    <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-2 flex items-center gap-1.5">
                      <Info className="w-3.5 h-3.5 text-blue-500 flex-shrink-0" />
                      <span>Výsledek vzorce bude automaticky vydělen 12 pro zobrazení měsíčního příjmu či provizní produkce u produktu.</span>
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Modal Footer */}
          <div className="px-6 py-4 border-t border-zinc-200 dark:border-zinc-800 flex flex-wrap items-center justify-between gap-3 bg-zinc-50/50 dark:bg-zinc-900/50">
            {productToEdit ? (
              <button
                type="button"
                onClick={handleDelete}
                disabled={loading}
                className="mr-auto flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium text-rose-600 hover:text-rose-700 dark:text-rose-500 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition-colors cursor-pointer"
              >
                <Trash2 className="w-4 h-4" />
                <span className="hidden sm:inline">Odstranit produkt</span>
              </button>
            ) : <div className="mr-auto" />}

            <div className="flex gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 rounded-xl text-sm font-semibold text-zinc-600 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-800 transition-colors border border-transparent dark:hover:border-zinc-700 cursor-pointer"
              >
                Zrušit
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-6 py-2.5 rounded-xl text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 shadow-sm shadow-blue-500/30 transition-colors border border-blue-500 flex items-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {loading ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Save className="w-4 h-4 stroke-[2]" />
                )}
                <span>Uložit nastavení</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}

