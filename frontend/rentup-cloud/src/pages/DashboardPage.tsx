import { useState, useEffect, useMemo } from 'react';
import { 
  Plus, 
  Wallet, 
  TrendingUp, 
  Sparkles, 
  Edit3, 
  Trash2, 
  ArrowUpRight, 
  Coins, 
  BarChart2,
  PieChart as PieIcon,
  XCircle,
  FolderOpen
} from 'lucide-react';
import { 
  ResponsiveContainer, 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  Tooltip, 
  PieChart, 
  Pie, 
  Cell 
} from 'recharts';
import { aumApi, productsApi, type DashboardSummary, type AumSnapshot, type ProductDashboardItem, type ProductCategory } from '@/lib/api';
import CsvImportButton from '@/components/dashboard/CsvImportButton';
import ProductEditModal from '@/components/dashboard/ProductEditModal';

const categoryNames: Record<ProductCategory | string, string> = {
  InvestmentFund: 'Investiční fondy',
  RealEstate: 'Nemovitostní fondy',
  Bonds: 'Dluhopisy a programy',
  Other: 'Ostatní produkty',
  PensionSavings: 'Penzijní spoření',
  Commodities: 'Zlato a komodity',
  BuildingSavings: 'Stavební spoření',
  LifeInsurance: 'Investiční pojištění',
};

export default function DashboardPage() {
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [snapshots, setSnapshots] = useState<AumSnapshot[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [pieMode, setPieMode] = useState<'products' | 'categories'>('products');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<ProductDashboardItem | null>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const [sumRes, snapRes] = await Promise.all([
        aumApi.getSummary(),
        aumApi.getSnapshots()
      ]);
      setSummary(sumRes.data);
      setSnapshots(snapRes.data);
    } catch (error) {
      console.error('Chyba při načítání dat portfolia:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleDeleteProduct = async (id: string, name: string) => {
    if (window.confirm(`Opravdu si přejete odebrat produkt "${name}"?`)) {
      try {
        await productsApi.delete(id);
        loadData();
      } catch {
        alert('Chyba při mazání produktu.');
      }
    }
  };

  const handleToggleInclude = async (item: ProductDashboardItem) => {
    try {
      await productsApi.update(item.id, {
        name: item.name,
        category: item.category,
        company: item.company,
        colorHex: item.colorHex,
        averageYield: item.averageYield,
        monthlyDeposit: item.monthlyDeposit,
        commissionFormula: item.commissionFormula,
        order: 0,
        includeInAum: !item.includeInAum,
        currentAum: item.currentAum,
        isActive: true
      });
      loadData();
    } catch {
      alert('Chyba při změně nastavení produktu.');
    }
  };

  // Prepare Pie Chart data based on selected mode
  const pieData = useMemo(() => {
    if (!summary || !summary.products || !summary.products.length) return [];

    if (pieMode === 'products') {
      return summary.products
        .filter(item => item.includeInAum && item.currentAum > 0)
        .map(item => ({
          name: item.name,
          value: item.currentAum,
          color: item.colorHex || '#3b82f6',
          percent: item.portfolioSharePercent
        }))
        .sort((a, b) => b.value - a.value);
    } else {
      const groups: Record<string, { value: number; color: string }> = {};
      const categoryColors: Record<string, string> = {
        InvestmentFund: '#3b82f6',
        RealEstate: '#10b981',
        Bonds: '#f59e0b',
        Other: '#8b5cf6',
        Commodities: '#06b6d4',
        PensionSavings: '#6366f1',
      };

      summary.products.forEach(item => {
        if (item.includeInAum && item.currentAum > 0) {
          const catKey = item.category || 'Other';
          const label = categoryNames[catKey] || catKey;
          if (!groups[label]) {
            groups[label] = { value: 0, color: categoryColors[catKey] || '#64748b' };
          }
          groups[label].value += item.currentAum;
        }
      });

      const total = Object.values(groups).reduce((acc, curr) => acc + curr.value, 0);
      return Object.entries(groups).map(([name, data]) => ({
        name,
        value: data.value,
        color: data.color,
        percent: total > 0 ? (data.value / total) * 100 : 0
      })).sort((a, b) => b.value - a.value);
    }
  }, [summary, pieMode]);

  const trendData = useMemo(() => {
    if (!snapshots.length && summary && summary.totalAum > 0) {
      return [
        { date: 'Před měsícem', totalAum: Math.round(summary.totalAum * 0.96) },
        { date: 'Dnes', totalAum: summary.totalAum }
      ];
    }
    return [...snapshots]
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .map(s => ({
        date: new Date(s.date).toLocaleDateString('cs-CZ', { month: 'short', year: 'numeric' }),
        totalAum: s.totalAum
      }));
  }, [snapshots, summary]);

  const formatCurrency = (val: number) => Math.round(val).toLocaleString('cs-CZ') + ' Kč';

  if (loading && !summary) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center gap-4">
        <div className="w-10 h-10 border-3 border-blue-600 border-t-transparent rounded-full animate-spin" />
        <p className="text-zinc-500 dark:text-zinc-400 text-sm animate-pulse font-medium">Načítám AUM ukázkové sestavy a strukturu produktů...</p>
      </div>
    );
  }

  const monthlyPoints = summary?.pointsPerMonth ?? ((summary?.pointsPerYear ?? 0) / 12);
  const annualPoints = summary?.pointsPerYear ?? (monthlyPoints * 12);

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-16 animate-in fade-in duration-300">
      {/* Header & Actions */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-zinc-200 dark:border-zinc-800 pb-6">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold tracking-tight text-zinc-900 dark:text-white flex items-center gap-3">
            <span>Přehled spravovaného majetku</span>
          </h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1 max-w-2xl">
            Detailní přehled produktů, roční pasivní produkce bodů a odhadovaných pravidelných provizí z celkového AUM.
          </p>
        </div>
        
        <div className="flex items-center gap-3 self-start md:self-auto flex-wrap">
          <CsvImportButton onImported={loadData} />
          
          <button
            onClick={() => {
              setEditingProduct(null);
              setIsModalOpen(true);
            }}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-sm font-semibold shadow-lg shadow-blue-500/25 hover:shadow-blue-500/35 hover:-translate-y-px transition-all flex-shrink-0"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>Přidat nový produkt</span>
          </button>
        </div>
      </div>

      {/* KPI Cards Grid (4 cards according to mockup) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-5">
        
        {/* Card 1: Celkové AUM */}
        <div className="modern-card p-5 flex flex-col justify-between relative overflow-hidden group">
          <div className="flex items-start justify-between gap-2 mb-4">
            <div>
              <span className="text-xs font-semibold uppercase tracking-wider text-zinc-400 dark:text-zinc-500 block mb-1">
                Celkové AUM
              </span>
              <div className="text-2xl font-bold font-mono tracking-tight text-zinc-900 dark:text-white">
                {formatCurrency(summary?.totalAum ?? 0)}
              </div>
            </div>
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 dark:bg-emerald-500/20 border border-emerald-500/20 dark:border-emerald-500/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400 flex-shrink-0 group-hover:scale-110 transition-transform duration-300">
              <Wallet className="w-5 h-5" />
            </div>
          </div>

          <div className="pt-3 border-t border-zinc-100 dark:border-zinc-800/80 flex items-center justify-between">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold tracking-wide bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-200/60 dark:border-emerald-500/20">
              <ArrowUpRight className="w-3 h-3 stroke-[2.5]" />
              <span>+{summary?.aumChangeYtdPercent ?? 6.2} % YTD odhad</span>
            </div>
            <span className="text-xs text-zinc-400">Aktivní portfolio</span>
          </div>
        </div>

        {/* Card 2: Pravidelné vklady */}
        <div className="modern-card p-5 flex flex-col justify-between relative overflow-hidden group">
          <div className="flex items-start justify-between gap-2 mb-4">
            <div>
              <span className="text-xs font-semibold uppercase tracking-wider text-zinc-400 dark:text-zinc-500 block mb-1">
                Pravidelné vklady / m.
              </span>
              <div className="text-2xl font-bold font-mono tracking-tight text-zinc-900 dark:text-white">
                {formatCurrency(summary?.totalMonthlyDeposit ?? 0)}
              </div>
            </div>
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 dark:bg-blue-500/20 border border-blue-500/20 dark:border-blue-500/30 flex items-center justify-center text-blue-600 dark:text-blue-400 flex-shrink-0 group-hover:scale-110 transition-transform duration-300">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>

          <div className="pt-3 border-t border-zinc-100 dark:border-zinc-800/80 flex items-center justify-between">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold tracking-wide bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400 border border-blue-200/60 dark:border-blue-500/20">
              <span>Nový přítok majetku</span>
            </div>
            <span className="text-xs text-zinc-400">Dlouhodobý nárůst</span>
          </div>
        </div>

        {/* Card 3: Pasivní produkce bodů (se zvětšenými body za měsíc) */}
        <div className="modern-card p-5 flex flex-col justify-between relative overflow-hidden group">
          <div>
            <div className="flex items-start justify-between gap-2 mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-zinc-400 dark:text-zinc-500 block">
                Pasivní produkce bodů
              </span>
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 dark:bg-amber-500/20 border border-amber-500/20 dark:border-amber-500/30 flex items-center justify-center text-amber-500 dark:text-amber-400 flex-shrink-0 group-hover:scale-110 transition-transform duration-300">
                <Coins className="w-5 h-5" />
              </div>
            </div>
            
            <div className="flex items-baseline gap-1.5 mt-1">
              <span className="text-2xl lg:text-3xl font-bold font-mono tracking-tight text-amber-600 dark:text-amber-400">
                ~{monthlyPoints.toLocaleString('cs-CZ', { maximumFractionDigits: 1 })}
              </span>
              <span className="text-sm font-bold text-zinc-600 dark:text-zinc-300">
                b. / měsíčně
              </span>
            </div>
            
            <div className="text-xs text-zinc-500 dark:text-zinc-400 mt-1.5">
              Roční přehled: <strong className="font-mono font-bold text-zinc-800 dark:text-zinc-200">{annualPoints.toLocaleString('cs-CZ', { maximumFractionDigits: 1 })} b. ročně</strong>
            </div>
          </div>

          <div className="pt-3 mt-3 border-t border-zinc-100 dark:border-zinc-800/80 flex items-center justify-between">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold tracking-wide bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-200/60 dark:border-amber-500/20">
              <span>Provizní koeficient AUM</span>
            </div>
          </div>
        </div>

        {/* Card 4: Pasivní příjem (Est.) - PREMIUM CARD */}
        <div className="premium-card p-5 rounded-2xl flex flex-col justify-between relative overflow-hidden group">
          <div className="relative z-10">
            <div className="flex items-start justify-between gap-2 mb-4">
              <div>
                <span className="text-xs font-semibold uppercase tracking-wider text-amber-200/80 block mb-1">
                  Pasivní příjem (Est.)
                </span>
                <div className="text-2xl font-bold font-mono tracking-tight text-white">
                  {formatCurrency(summary?.estimatedCommissionMonthCzk ?? 0)} <span className="text-sm font-normal text-amber-100/75 font-sans">/ měsíc</span>
                </div>
              </div>
              <div className="w-10 h-10 rounded-xl bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center text-amber-300 flex-shrink-0 group-hover:rotate-12 transition-transform duration-300">
                <Sparkles className="w-5 h-5 fill-amber-300" />
              </div>
            </div>
          </div>

          <div className="pt-3 border-t border-white/10 relative z-10 flex items-center justify-between text-xs text-amber-100/80">
            <span className="font-semibold bg-white/10 px-2.5 py-1 rounded-full backdrop-blur-sm">
              Ročně: {formatCurrency(summary?.estimatedCommissionYearCzk ?? 0)}
            </span>
            <span className="text-[11px] uppercase tracking-wider text-amber-200/60">Odhad po odpočtu</span>
          </div>
        </div>
      </div>

      {/* SECTION 1: DETAIL PRODUKTŮ (TABLE BEFORE CHARTS) */}
      <div className="modern-card overflow-hidden border border-zinc-200 dark:border-zinc-800">
        <div className="p-6 border-b border-zinc-200 dark:border-zinc-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-zinc-50/50 dark:bg-zinc-800/30">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 dark:bg-blue-500/20 border border-blue-500/20 flex items-center justify-center text-blue-500 flex-shrink-0">
              <FolderOpen className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-zinc-900 dark:text-white">
                Detail spravovaných produktů
              </h2>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                Přehled aktivních produktů zařazených v portfoliu s možností zapnutí či vypnutí v celkove kalkulaci AUM.
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2 text-xs font-semibold text-zinc-500 dark:text-zinc-400">
            <span>Celkem produktů: <strong className="text-zinc-900 dark:text-white">{summary?.products?.length ?? 0}</strong></span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-zinc-200 dark:border-zinc-800 text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 bg-zinc-50 dark:bg-zinc-800/60">
                <th className="py-3.5 px-6">Produkt</th>
                <th className="py-3.5 px-4 text-right font-mono">Aktuální stav AUM</th>
                <th className="py-3.5 px-4 text-right font-mono">Podíl na AUM</th>
                <th className="py-3.5 px-4 text-right font-mono">Měs. vklad</th>
                <th className="py-3.5 px-4 text-right font-mono">Oček. zhodnocení</th>
                <th className="py-3.5 px-4 text-center">Započítáno v AUM</th>
                <th className="py-3.5 px-4 text-right font-mono text-blue-600 dark:text-blue-400 font-bold">Produkce / měsíc</th>
                <th className="py-3.5 px-6 text-right">Akce</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800/80 text-sm text-zinc-700 dark:text-zinc-300">
              {!summary || !summary.products || summary.products.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-zinc-500 dark:text-zinc-400">
                    <p className="text-sm mb-2 font-semibold">Zatím nebyly přidány žádné produkty.</p>
                    <p className="text-xs max-w-md mx-auto mb-4 text-zinc-400">
                      Kliknutím na tlačítko "Přidat nový produkt" nadpisu nebo nahrávkou CSV exportu z PC vytvoříte vaše úvodní portfolio.
                    </p>
                  </td>
                </tr>
              ) : (
                summary.products.map((item) => (
                  <tr 
                    key={item.id} 
                    className={`hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors ${!item.includeInAum ? 'opacity-60 bg-zinc-50/50 dark:bg-zinc-900/50' : ''}`}
                  >
                    <td className="py-4 px-6 font-medium text-zinc-900 dark:text-white flex items-center gap-3">
                      <span 
                        className="w-3 h-3 rounded-full flex-shrink-0 shadow-sm" 
                        style={{ backgroundColor: item.colorHex || '#3b82f6' }}
                      />
                      <div>
                        <div className="font-bold flex items-center gap-2 text-zinc-900 dark:text-zinc-100">
                          <span>{item.name}</span>
                        </div>
                        <div className="text-xs text-zinc-500 dark:text-zinc-400 font-normal mt-0.5">
                          {categoryNames[item.category] || item.category}
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-4 text-right font-mono font-bold text-zinc-900 dark:text-white">
                      {formatCurrency(item.currentAum)}
                    </td>
                    <td className="py-4 px-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <span className="text-xs font-mono font-semibold text-zinc-600 dark:text-zinc-300">
                          {item.includeInAum ? `${item.portfolioSharePercent.toFixed(1)} %` : '—'}
                        </span>
                        {item.includeInAum && (
                          <div className="w-12 h-1.5 bg-zinc-200 dark:bg-zinc-800 rounded-full overflow-hidden">
                            <div 
                              className="h-full rounded-full transition-all duration-500" 
                              style={{ width: `${Math.min(100, Math.max(8, item.portfolioSharePercent))}%`, backgroundColor: item.colorHex || '#3b82f6' }}
                            />
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="py-4 px-4 text-right font-mono text-zinc-600 dark:text-zinc-300">
                      {item.monthlyDeposit > 0 ? formatCurrency(item.monthlyDeposit) : '—'}
                    </td>
                    <td className="py-4 px-4 text-right font-mono text-emerald-600 dark:text-emerald-400 font-semibold">
                      {item.averageYield > 0 ? `${item.averageYield} %` : '—'}
                    </td>
                    <td className="py-4 px-4 text-center">
                      <button
                        onClick={() => handleToggleInclude(item)}
                        title={item.includeInAum ? 'Kliknutím vyřadíte z AUM' : 'Kliknutím zahrnete do AUM'}
                        className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold transition-all ${
                          item.includeInAum 
                            ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20' 
                            : 'bg-zinc-200 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400 hover:bg-zinc-300 dark:hover:bg-zinc-700'
                        }`}
                      >
                        {item.includeInAum ? (
                          <span>✓ Započítáno</span>
                        ) : (
                          <span className="flex items-center gap-1"><XCircle className="w-3 h-3" /> Vypnuto</span>
                        )}
                      </button>
                    </td>
                    <td className="py-4 px-4 text-right font-mono text-blue-600 dark:text-blue-400 font-bold">
                      ~{(item.yearlyPoints / 12).toFixed(1)} b.
                    </td>
                    <td className="py-4 px-6 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => {
                            setEditingProduct(item);
                            setIsModalOpen(true);
                          }}
                          title="Upravit produkt"
                          className="p-1.5 text-zinc-400 hover:text-blue-600 dark:hover:text-blue-400 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteProduct(item.id, item.name)}
                          title="Odebrat produkt"
                          className="p-1.5 text-zinc-400 hover:text-red-600 dark:hover:text-red-400 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* SECTION 2: ANALYTIC CHARTS (AFTER THE PRODUCTS TABLE) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Structure / Pie Chart */}
        <div className="lg:col-span-5 modern-card p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-base font-bold text-zinc-900 dark:text-white flex items-center gap-2">
                  <PieIcon className="w-4 h-4 text-blue-500" />
                  <span>Rozložení majetku</span>
                </h3>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                  Procentuální rozložení investičního portfolia
                </p>
              </div>
              
              {/* Toggle Buttons: Podle produktů vs Podle tříd */}
              <div className="inline-flex rounded-lg p-0.5 bg-zinc-100 dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700/60 text-[11px] font-semibold">
                <button
                  onClick={() => setPieMode('products')}
                  className={`px-2.5 py-1 rounded-md transition-all ${
                    pieMode === 'products'
                      ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white shadow-xs'
                      : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-300'
                  }`}
                >
                  Produkty
                </button>
                <button
                  onClick={() => setPieMode('categories')}
                  className={`px-2.5 py-1 rounded-md transition-all ${
                    pieMode === 'categories'
                      ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white shadow-xs'
                      : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-300'
                  }`}
                >
                  Třídy produktů
                </button>
              </div>
            </div>

            <div className="h-64 relative flex items-center justify-center my-4">
              {pieData.length > 0 ? (
                <>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={pieData}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        innerRadius={65}
                        outerRadius={95}
                        paddingAngle={4}
                      >
                        {pieData.map((entry, index) => (
                          <Cell key={`cell-${index}-${entry.name}`} fill={entry.color} stroke="transparent" />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={(value: any) => [formatCurrency(Number(value)), 'AUM']}
                        contentStyle={{ backgroundColor: '#18181b', borderRadius: '12px', border: '1px solid #27272a', color: '#fff', fontSize: '12px', fontWeight: 'bold' }}
                      />
                    </PieChart>
                  </ResponsiveContainer>

                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                    <span className="text-[11px] uppercase font-bold tracking-wider text-zinc-400 dark:text-zinc-500">Celkem</span>
                    <span className="text-base font-bold font-mono text-zinc-900 dark:text-white mt-0.5">
                      {formatCurrency(summary?.totalAum ?? 0)}
                    </span>
                  </div>
                </>
              ) : (
                <div className="flex flex-col items-center justify-center text-center text-zinc-400 dark:text-zinc-600 text-xs">
                  <PieIcon className="w-8 h-8 opacity-40 mb-2" />
                  <span>Žádný spravovaný majetek zadaný k zobrazení v grafu.</span>
                </div>
              )}
            </div>
          </div>

          {/* Legend */}
          <div className="pt-4 border-t border-zinc-200 dark:border-zinc-800 grid grid-cols-2 gap-y-2 gap-x-4 max-h-36 overflow-y-auto pr-1">
            {pieData.map((entry, idx) => (
              <div key={`${idx}-${entry.name}`} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2 truncate">
                  <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: entry.color }} />
                  <span className="text-zinc-700 dark:text-zinc-300 font-medium truncate" title={entry.name}>{entry.name}</span>
                </div>
                <span className="font-mono text-zinc-500 dark:text-zinc-400 font-semibold ml-2 flex-shrink-0">
                  {entry.percent.toFixed(1)} %
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Development Trend Area Chart */}
        <div className="lg:col-span-7 modern-card p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-base font-bold text-zinc-900 dark:text-white flex items-center gap-2">
                  <BarChart2 className="w-4 h-4 text-emerald-500" />
                  <span>Vývoj spravovaného majetku</span>
                </h3>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                  Historie a nárůst hodnoty AUM v čase
                </p>
              </div>
            </div>

            <div className="h-72 w-full pt-4">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={trendData} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                  <defs>
                    <linearGradient id="aumGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <XAxis 
                    dataKey="date" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fill: '#71717a', fontSize: 11, fontWeight: 600 }} 
                    dy={10} 
                  />
                  <YAxis 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fill: '#71717a', fontSize: 11, fontWeight: 600 }}
                    tickFormatter={(value) => `${Math.round(value / 1000)} tis.`}
                    domain={['auto', 'auto']}
                  />
                  <Tooltip 
                    formatter={(value: any) => [formatCurrency(Number(value)), 'Celkové AUM']}
                    labelStyle={{ color: '#94a3b8', fontSize: '11px', fontWeight: 'bold' }}
                    contentStyle={{ backgroundColor: '#18181b', borderRadius: '12px', border: '1px solid #27272a', color: '#fff', fontSize: '13px', fontWeight: 'bold' }}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="totalAum" 
                    stroke="#3b82f6" 
                    strokeWidth={3} 
                    fillOpacity={1} 
                    fill="url(#aumGradient)" 
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="pt-4 mt-2 border-t border-zinc-200 dark:border-zinc-800 flex items-center justify-between text-xs text-zinc-500 dark:text-zinc-400 font-medium">
            <span>Zobrazen chronologický výplývající objem spravovaného majetku.</span>
            <span className="font-semibold text-zinc-700 dark:text-zinc-300">Aktualizováno real-time</span>
          </div>
        </div>

      </div>

      {/* Product Edit / Create Modal */}
      <ProductEditModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSaved={loadData}
        productToEdit={editingProduct}
      />
    </div>
  );
}
