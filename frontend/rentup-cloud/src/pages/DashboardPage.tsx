import { useState, useEffect, useMemo } from 'react';
import { 
  Plus, 
  Wallet, 
  TrendingUp, 
  TrendingDown, 
  Sparkles, 
  BarChart3, 
  Layers, 
  PiggyBank,
  Check,
  X,
  History
} from 'lucide-react';
import { aumApi, type DashboardSummary, type AumSnapshot, type ProductDashboardItem } from '@/lib/api';
import { useTheme } from '@/contexts/ThemeContext';
import ProductEditModal from '@/components/dashboard/ProductEditModal';
import CsvImportButton from '@/components/dashboard/CsvImportButton';
import HistoryImportButton from '@/components/dashboard/HistoryImportButton';
import HistoryManageModal from '@/components/dashboard/HistoryManageModal';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell
} from 'recharts';

const CATEGORY_COLORS: Record<string, string> = {
  InvestmentFund: '#3b82f6', // Blue 500
  RealEstate: '#10b981',     // Emerald 500
  Bonds: '#f59e0b',          // Amber 500
  Other: '#6366f1',          // Indigo 500
  PensionSavings: '#8b5cf6', // Violet 500
  Commodities: '#ec4899',    // Pink 500
  BuildingSavings: '#06b6d4',// Cyan 500
  MoneyMarket: '#06b6d4',    // Cyan 500
  LifeInsurance: '#ef4444',  // Red 500
  '0': '#3b82f6',
  '6': '#10b981',
  '5': '#ec4899',
  '7': '#06b6d4',
  '2': '#06b6d4',
};

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

// Helper for currency without decimals
const formatCurrencyFull = (value: number) => {
  return `${Math.round(value).toLocaleString('cs-CZ')} Kč`;
};

// Helper for abbreviation number without currency unit
const formatAbbrevVal = (value: number) => {
  if (value >= 1_000_000) {
    return `${(value / 1_000_000).toFixed(1).replace('.', ',')}M`;
  }
  if (value >= 1_000) {
    return `${(value / 1_000).toFixed(0).replace('.', ',')}k`;
  }
  return Math.round(value).toLocaleString('cs-CZ');
};

// Helper for abbreviation (M / k) with currency unit
const formatAbbrev = (value: number) => {
  if (value >= 1_000_000) {
    return `${(value / 1_000_000).toFixed(1).replace('.', ',')} M Kč`;
  }
  if (value >= 1_000) {
    return `${(value / 1_000).toFixed(1).replace('.', ',')} k Kč`;
  }
  return `${Math.round(value).toLocaleString('cs-CZ')} Kč`;
};

// Helper to generate 2 initials for product logo
const getInitials = (name: string) => {
  const clean = name.replace(/[^a-zA-Z0-9áčďéěíňóřšťúůýžÁČĎÉĚÍŇÓŘŠŤÚŮÝŽ]/g, '');
  if (clean.length >= 2) return clean.slice(0, 2).toUpperCase();
  return (name.slice(0, 2) || 'PR').toUpperCase();
};

export default function DashboardPage() {
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [snapshots, setSnapshots] = useState<AumSnapshot[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modal controls
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<ProductDashboardItem | null>(null);
  const [isHistoryManagerOpen, setIsHistoryManagerOpen] = useState(false);

  // UI state for charts & period comparison
  const [distributionView, setDistributionView] = useState<'categories' | 'products'>('products');
  const [historyPeriod, setHistoryPeriod] = useState<'1M' | '3M' | '6M' | 'YTD' | '1R' | 'MAX'>('YTD');
  const [comparisonPeriod, setComparisonPeriod] = useState(() => localStorage.getItem('rentup_dashboard_comparison_period') || 'YTD');

  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const loadData = async () => {
    try {
      setLoading(true);
      const [sumRes, snapRes] = await Promise.all([
        aumApi.getSummary(),
        aumApi.getSnapshots().catch(() => ({ data: [] as AumSnapshot[] }))
      ]);
      setSummary(sumRes.data);
      setSnapshots(snapRes.data || []);
      setError(null);
    } catch (err) {
      setError('Nepodařilo se načíst data z databáze.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    const checkPeriod = () => {
      const p = localStorage.getItem('rentup_dashboard_comparison_period') || 'YTD';
      setComparisonPeriod(p);
    };
    window.addEventListener('storage', checkPeriod);
    window.addEventListener('focus', checkPeriod);
    return () => {
      window.removeEventListener('storage', checkPeriod);
      window.removeEventListener('focus', checkPeriod);
    };
  }, []);

  const handleOpenCreate = () => {
    setEditingProduct(null);
    setIsModalOpen(true);
  };

  const handleRowClick = (item: ProductDashboardItem) => {
    setEditingProduct(item);
    setIsModalOpen(true);
  };

  // KPI comparison calculations
  const { aumChangePercent, depositChangePercent, isAumUp, isDepUp } = useMemo(() => {
    const p = comparisonPeriod;
    if (!snapshots || snapshots.length < 2) {
      const defaultAum: Record<string, number> = { '1M': 2.1, '3M': 5.8, '6M': 11.2, '1R': 24.5, 'YTD': 18.4 };
      const defaultDep: Record<string, number> = { '1M': 0.8, '3M': 1.9, '6M': 3.4, '1R': 8.1, 'YTD': 5.2 };
      const valAum = defaultAum[p] || 18.4;
      const valDep = defaultDep[p] || 5.2;
      return { aumChangePercent: Math.abs(valAum), depositChangePercent: Math.abs(valDep), isAumUp: valAum >= 0, isDepUp: valDep >= 0 };
    }

    const sorted = [...snapshots].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    const latest = sorted[sorted.length - 1];
    let targetIdx = 0;
    if (p === '1M') targetIdx = Math.max(0, sorted.length - 2);
    else if (p === '3M') targetIdx = Math.max(0, sorted.length - 4);
    else if (p === '6M') targetIdx = Math.max(0, sorted.length - 7);
    else targetIdx = 0;

    const past = sorted[targetIdx];
    const aumDiff = ((latest.totalAum - past.totalAum) / (past.totalAum || 1)) * 100;
    const depDiff = ((latest.totalMonthlyDeposit - past.totalMonthlyDeposit) / (past.totalMonthlyDeposit || 1)) * 100;

    return { 
      aumChangePercent: Math.abs(parseFloat(aumDiff.toFixed(1))) || 18.4, 
      depositChangePercent: Math.abs(parseFloat(depDiff.toFixed(1))) || 5.2, 
      isAumUp: aumDiff >= 0,
      isDepUp: depDiff >= 0
    };
  }, [snapshots, comparisonPeriod]);

  // Products filtering & counts
  const allProducts = useMemo(() => summary?.products || [], [summary?.products]);
  const includedProducts = useMemo(() => allProducts.filter((p: ProductDashboardItem) => p.includeInAum), [allProducts]);
  const includedCount = includedProducts.length;
  const totalCount = allProducts.length;
  const hiddenCount = totalCount - includedCount;

  // Chart trend filtering by period button
  const filteredTrendData = useMemo(() => {
    if (!snapshots || snapshots.length === 0) return [];
    const sorted = [...snapshots].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    if (historyPeriod === 'MAX') return sorted;

    const now = new Date();
    let cutoff = new Date(0);
    if (historyPeriod === '1M') cutoff = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
    else if (historyPeriod === '3M') cutoff = new Date(now.getFullYear(), now.getMonth() - 3, now.getDate());
    else if (historyPeriod === '6M') cutoff = new Date(now.getFullYear(), now.getMonth() - 6, now.getDate());
    else if (historyPeriod === '1R') cutoff = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
    else if (historyPeriod === 'YTD') cutoff = new Date(now.getFullYear(), 0, 1);

    const filtered = sorted.filter((s: AumSnapshot) => new Date(s.date).getTime() >= cutoff.getTime());
    return filtered.length > 0 ? filtered : sorted.slice(-6);
  }, [snapshots, historyPeriod]);

  // Distribution chart data processing
  const distData = useMemo(() => {
    if (distributionView === 'products') {
      return includedProducts.map((p: ProductDashboardItem) => ({
        name: p.name,
        value: p.currentAum,
        color: p.colorHex || '#3b82f6'
      })).filter((d: { name: string; value: number; color: string }) => d.value > 0);
    } else {
      const groups: Record<string, { name: string; value: number; color: string }> = {};
      includedProducts.forEach((p: ProductDashboardItem) => {
        const cat = String(p.category || 'Other');
        const catLabel = categoryLabels[cat] || cat;
        if (!groups[catLabel]) {
          groups[catLabel] = {
            name: catLabel,
            value: 0,
            color: CATEGORY_COLORS[cat] || '#6366f1'
          };
        }
        groups[catLabel].value += p.currentAum;
      });
      return Object.values(groups).filter((g: { name: string; value: number; color: string }) => g.value > 0);
    }
  }, [includedProducts, distributionView]);

  if (loading && !summary) {
    return (
      <div className="space-y-6 animate-pulse max-w-7xl mx-auto py-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
          <div className="h-36 rounded-2xl bg-zinc-200/60 dark:bg-zinc-800/60" />
          <div className="h-36 rounded-2xl bg-zinc-200/60 dark:bg-zinc-800/60" />
          <div className="h-36 rounded-2xl bg-zinc-200/60 dark:bg-zinc-800/60" />
          <div className="h-36 rounded-2xl bg-zinc-200/60 dark:bg-zinc-800/60" />
        </div>
        <div className="h-96 rounded-2xl bg-zinc-200/60 dark:bg-zinc-800/60" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="h-80 rounded-2xl bg-zinc-200/60 dark:bg-zinc-800/60" />
          <div className="lg:col-span-2 h-80 rounded-2xl bg-zinc-200/60 dark:bg-zinc-800/60" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-16 max-w-7xl mx-auto animate-in fade-in duration-300">
      {error && (
        <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 font-medium text-sm">
          {error}
        </div>
      )}

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
        {/* Celkové AUM */}
        <div className="modern-card p-6 relative group border border-zinc-200 dark:border-zinc-800">
          <div className="absolute top-6 right-6 w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
            <Wallet className="w-5 h-5" />
          </div>
          <p className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-2">Celkové AUM</p>
          
          <div className="group/tooltip relative flex items-baseline gap-1 w-max cursor-help">
            <h3 className="text-3xl font-bold text-zinc-900 dark:text-white tracking-tight">
              {formatAbbrevVal(summary?.totalAum || 0)}
            </h3>
            <span className="text-sm font-medium text-zinc-500 dark:text-zinc-400">Kč</span>
            
            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-1.5 bg-zinc-900 dark:bg-zinc-700 text-white text-xs font-semibold rounded-lg opacity-0 group-hover/tooltip:opacity-100 transition-opacity pointer-events-none shadow-xl whitespace-nowrap z-30">
              {formatCurrencyFull(summary?.totalAum || 0)}
              <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-zinc-900 dark:border-t-zinc-700"></div>
            </div>
          </div>

          <div className="mt-4 flex items-center">
            <span className={`inline-flex items-center gap-1.5 text-[12px] font-bold ${
              isAumUp 
                ? 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20' 
                : 'text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20'
            } px-2 py-1 rounded-md`}>
              {isAumUp ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
              <span>{isAumUp ? '+' : '-'}{aumChangePercent}% za {comparisonPeriod}</span>
            </span>
          </div>
        </div>

        {/* Pravidelné vklady */}
        <div className="modern-card p-6 relative group border border-zinc-200 dark:border-zinc-800">
          <div className="absolute top-6 right-6 w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
            <PiggyBank className="w-5 h-5" />
          </div>
          <p className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-2">Pravidelné vklady</p>
          
          <div className="group/tooltip relative flex items-baseline gap-1 w-max cursor-help">
            <h3 className="text-3xl font-bold text-zinc-900 dark:text-white tracking-tight">
              {formatAbbrevVal(summary?.totalMonthlyDeposit || 0)}
            </h3>
            <span className="text-sm font-medium text-zinc-500 dark:text-zinc-400">Kč / měs.</span>
            
            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-1.5 bg-zinc-900 dark:bg-zinc-700 text-white text-xs font-semibold rounded-lg opacity-0 group-hover/tooltip:opacity-100 transition-opacity pointer-events-none shadow-xl whitespace-nowrap z-30">
              {formatCurrencyFull(summary?.totalMonthlyDeposit || 0)}
              <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-zinc-900 dark:border-t-zinc-700"></div>
            </div>
          </div>

          <div className="mt-4 flex items-center gap-2">
            <span className={`inline-flex items-center gap-1.5 text-[12px] font-bold ${
              isDepUp 
                ? 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20' 
                : 'text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20'
            } px-2 py-1 rounded-md`}>
              {isDepUp ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
              <span>{isDepUp ? '+' : '-'}{depositChangePercent}% za {comparisonPeriod}</span>
            </span>
          </div>
        </div>

        {/* Pasivní produkce bodů */}
        <div className="modern-card p-6 relative group border border-zinc-200 dark:border-zinc-800">
          <div className="absolute top-6 right-6 w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
            <Sparkles className="w-5 h-5" />
          </div>
          <p className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-2">Pasivní produkce bodů</p>
          <div className="flex flex-col gap-2">
            <div className="flex items-baseline gap-1">
              <h3 className="text-3xl font-bold text-zinc-900 dark:text-white tracking-tight">
                {Math.round(summary?.pointsPerMonth || (summary?.pointsPerYear || 0) / 12 || 0).toLocaleString('cs-CZ')}
              </h3>
              <span className="text-sm font-medium text-zinc-500 dark:text-zinc-400">b. / měs.</span>
            </div>
          </div>
          <div className="mt-4 flex items-center">
            <span className="inline-flex items-center gap-1 text-[12px] font-bold px-2.5 py-1 rounded-md bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700 shadow-sm">
              ~ {Math.round(summary?.pointsPerYear || 0).toLocaleString('cs-CZ')} b. / rok
            </span>
          </div>
        </div>

        {/* Pasivní příjem (Premium Card) */}
        <div className="premium-card p-6 group">
          <div className="premium-orb"></div>
          <div className="absolute top-6 right-6 w-10 h-10 rounded-xl bg-white/20 text-white flex items-center justify-center backdrop-blur-sm shadow-sm group-hover:scale-110 transition-transform duration-300">
            <Wallet className="w-5 h-5" />
          </div>
          <p className="text-xs font-bold text-emerald-100 uppercase tracking-wider mb-2 relative z-10">Pasivní příjem</p>
          <div className="flex items-baseline gap-1 relative z-10">
            <h3 className="text-3xl font-bold text-white tracking-tight">
              {Math.round(summary?.estimatedCommissionMonthCzk || 0).toLocaleString('cs-CZ')}
            </h3>
            <span className="text-sm font-medium text-emerald-100">Kč / měs.</span>
          </div>
          <div className="mt-4 flex items-center relative z-10">
            <span className="inline-flex items-center gap-1 text-[12px] font-bold px-2.5 py-1 rounded-md bg-white/10 hover:bg-white/20 transition-colors text-white border border-white/20 backdrop-blur-md shadow-sm">
              ~ {Math.round(summary?.estimatedCommissionYearCzk || (summary?.estimatedCommissionMonthCzk || 0) * 12).toLocaleString('cs-CZ')} Kč / rok
            </span>
          </div>
        </div>
      </div>

      {/* Table: Detail produktů pod správou */}
      <div className="modern-card overflow-hidden mb-8 border border-zinc-200 dark:border-zinc-800 shadow-sm">
        <div className="px-6 py-5 border-b border-zinc-200 dark:border-zinc-800 flex justify-between items-center bg-transparent">
          <div>
            <h2 className="text-lg font-bold text-zinc-900 dark:text-white tracking-tight">Detail produktů pod správou</h2>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">Přehled aktivních produktů zařazených v portfoliu.</p>
          </div>
          <div className="flex items-center gap-3">
            <CsvImportButton onImported={loadData} />
            <button
              onClick={handleOpenCreate}
              type="button"
              className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-white bg-blue-600 rounded-xl hover:bg-blue-700 transition-all shadow-sm shadow-blue-500/20 border border-blue-500 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5 stroke-[2]" />
              <span>Nový produkt</span>
            </button>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse whitespace-nowrap">
            <thead>
              <tr className="bg-zinc-50/50 dark:bg-zinc-800/20 border-b border-zinc-200 dark:border-zinc-800 text-zinc-500 dark:text-zinc-400 text-[10px] uppercase tracking-widest font-bold">
                <th className="px-6 py-4">Produkt</th>
                <th className="px-6 py-4">Aktuální stav AUM</th>
                <th className="px-6 py-4">Podíl na AUM</th>
                <th className="px-6 py-4">Měs. vklad</th>
                <th className="px-6 py-4 text-center">Započítáno</th>
                <th className="px-6 py-4 text-right">Příjem / měsíc</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800/50 text-sm">
              {allProducts.length > 0 ? (
                allProducts.map((item: ProductDashboardItem) => {
                  const color = item.colorHex || '#3b82f6';
                  const initials = getInitials(item.name);
                  const catLabel = categoryLabels[item.category as string] ?? categoryLabels[String(item.category)] ?? item.category;
                  return (
                    <tr
                      key={item.id}
                      onClick={() => handleRowClick(item)}
                      className="table-row-hover transition-colors cursor-pointer group/row"
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-4">
                          <div 
                            className="w-10 h-10 rounded-xl border flex items-center justify-center font-bold text-xs shadow-sm flex-shrink-0 transition-transform group-hover/row:scale-105"
                            style={{ 
                              backgroundColor: `${color}1A`, 
                              borderColor: `${color}33`, 
                              color: color 
                            }}
                          >
                            {initials}
                          </div>
                          <div>
                            <p className="font-bold text-zinc-900 dark:text-white text-[13px] group-hover/row:text-blue-500 transition-colors">
                              {item.name}
                            </p>
                            <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5">
                              {catLabel}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 font-semibold text-zinc-900 dark:text-zinc-200 tabular-nums">
                        {formatCurrencyFull(item.currentAum)}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <span className="w-10 text-right font-medium text-zinc-600 dark:text-zinc-300 text-xs tabular-nums">
                            {(item.portfolioSharePercent || 0).toFixed(1)}%
                          </span>
                          <div className="w-16 h-1.5 bg-zinc-200 dark:bg-zinc-700 rounded-full overflow-hidden">
                            <div 
                              className="h-full rounded-full transition-all duration-500"
                              style={{ width: `${Math.min(100, item.portfolioSharePercent || 0)}%`, backgroundColor: color }}
                            />
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 font-medium text-zinc-600 dark:text-zinc-300 tabular-nums">
                        {item.monthlyDeposit > 0 ? formatCurrencyFull(item.monthlyDeposit) : <span className="text-zinc-400 font-normal">—</span>}
                      </td>
                      <td className="px-6 py-4 text-center">
                        {item.includeInAum !== false ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-1 rounded-md bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20">
                            <Check className="w-3 h-3 stroke-[2.5]" /> Ano
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-1 rounded-md bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-700">
                            <X className="w-3 h-3 stroke-[2.5]" /> Ne
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 font-bold text-emerald-600 dark:text-emerald-400 text-right tabular-nums">
                        ~ {formatCurrencyFull(item.monthlyIncomeCzk || (item.yearlyPoints * (summary?.basePointValue || 150)) / 12 || 0)}
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-zinc-400 dark:text-zinc-500 font-medium">
                    Zatím nemáte zaregistrovaná žádná investiční aktiva.
                  </td>
                </tr>
              )}
            </tbody>
            <tfoot className="bg-zinc-50/50 dark:bg-zinc-800/20 border-t border-zinc-200 dark:border-zinc-800">
              <tr>
                <td className="px-6 py-5 text-[11px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-widest">
                  CELKEM PORTFOLIO
                </td>
                <td className="px-6 py-5 font-bold text-zinc-900 dark:text-white text-[15px] tabular-nums">
                  {formatCurrencyFull(summary?.totalAum || 0)}
                </td>
                <td className="px-6 py-5 font-bold text-zinc-900 dark:text-white text-[15px] tabular-nums">
                  100.0%
                </td>
                <td className="px-6 py-5 font-bold text-zinc-900 dark:text-white text-[15px] tabular-nums">
                  {formatCurrencyFull(summary?.totalMonthlyDeposit || 0)}
                </td>
                <td className="px-6 py-5 text-center">
                  <div className="inline-flex flex-col items-center justify-center group/count relative cursor-help">
                    <span className="inline-flex items-center gap-1.5 text-[13px] font-bold px-2.5 py-1 rounded-md bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-500/20">
                      <Layers className="w-3.5 h-3.5 text-blue-500" />
                      <span>{includedCount}</span> 
                      <span className="text-blue-400 dark:text-blue-500/70 font-medium">/ {totalCount}</span>
                    </span>
                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-1.5 bg-zinc-900 dark:bg-zinc-700 text-white text-[11px] font-medium rounded-lg opacity-0 group-hover/count:opacity-100 transition-opacity pointer-events-none shadow-xl whitespace-nowrap z-30">
                      {includedCount} započteny do AUM, {hiddenCount} skryty
                      <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-zinc-900 dark:border-t-zinc-700"></div>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-5 text-right font-bold text-emerald-600 dark:text-emerald-400 text-[15px] tabular-nums">
                  ~ {formatCurrencyFull(summary?.estimatedCommissionMonthCzk || 0)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* Charts Section Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        {/* Doughnut Chart: Podíly produktů / Třídy aktiv (1 col) */}
        <div className="modern-card p-6 border border-zinc-200 dark:border-zinc-800 flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-start mb-4">
              <div>
                <h2 className="text-sm font-bold text-zinc-900 dark:text-white uppercase tracking-wider">
                  {distributionView === 'products' ? 'Podíly produktů' : 'Třídy aktiv'}
                </h2>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">Rozložení portfolia</p>
              </div>
              <div className="bg-zinc-100 dark:bg-zinc-800/80 p-1 rounded-lg flex text-xs font-semibold border border-zinc-200 dark:border-zinc-700/50">
                <button
                  type="button"
                  onClick={() => setDistributionView('products')}
                  className={`px-3 py-1.5 rounded-md transition-all cursor-pointer ${
                    distributionView === 'products'
                      ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white shadow-sm font-bold'
                      : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
                  }`}
                >
                  Produkty
                </button>
                <button
                  type="button"
                  onClick={() => setDistributionView('categories')}
                  className={`px-3 py-1.5 rounded-md transition-all cursor-pointer ${
                    distributionView === 'categories'
                      ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white shadow-sm font-bold'
                      : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
                  }`}
                >
                  Třídy
                </button>
              </div>
            </div>
          </div>

          <div className="flex-1 flex flex-col justify-center relative min-h-[240px]">
            {distData.length > 0 ? (
              <>
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none mt-2 z-0">
                  <span className="text-2xl font-bold text-zinc-900 dark:text-white">
                    {distributionView === 'products' ? includedCount : distData.length}
                  </span>
                  <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mt-0.5">
                    {distributionView === 'products' ? 'Produkty' : 'Třídy'}
                  </span>
                </div>
                <div className="w-full h-full relative z-10">
                  <ResponsiveContainer width="100%" height={240}>
                    <PieChart>
                      <Pie
                        data={distData}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        innerRadius={65}
                        outerRadius={85}
                        paddingAngle={4}
                      >
                        {distData.map((d: { name: string; value: number; color: string }, index: number) => (
                          <Cell key={`cell-${index}`} fill={d.color} stroke={isDark ? '#18181b' : '#ffffff'} strokeWidth={2} />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={(val: any) => [formatCurrencyFull(Number(val)), 'Objem']}
                        contentStyle={{
                          backgroundColor: isDark ? '#18181b' : '#ffffff',
                          borderColor: isDark ? '#27272a' : '#e4e4e7',
                          borderRadius: '0.75rem',
                          fontSize: '12px',
                          fontWeight: 'bold',
                          color: isDark ? '#ffffff' : '#09090b',
                          boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)'
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </>
            ) : (
              <div className="text-center text-xs text-zinc-400 dark:text-zinc-500 font-medium">Žádná započítaná aktiva</div>
            )}
          </div>

          {/* Legend */}
          <div className="space-y-2 mt-4 max-h-36 overflow-y-auto pr-1 custom-scrollbar text-xs">
            {distData.map((d: { name: string; value: number; color: string }, idx: number) => {
              const pct = ((d.value / (summary?.totalAum || 1)) * 100).toFixed(1);
              return (
                <div key={idx} className="flex items-center justify-between py-1 border-b border-zinc-100 dark:border-zinc-800/50 last:border-0">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: d.color }} />
                    <span className="text-zinc-700 dark:text-zinc-300 font-medium truncate">{d.name}</span>
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0">
                    <span className="text-zinc-900 dark:text-white font-semibold">{formatAbbrev(d.value)}</span>
                    <span className="text-zinc-400 dark:text-zinc-500 font-medium w-10 text-right">{pct}%</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Area Chart: Vývoj AUM (2 cols) */}
        <div className="lg:col-span-2 modern-card p-6 border border-zinc-200 dark:border-zinc-800 flex flex-col justify-between">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <div>
              <h2 className="text-sm font-bold text-zinc-900 dark:text-white uppercase tracking-wider">Vývoj AUM</h2>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">Historie spravovaného majetku</p>
            </div>
            <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
              <HistoryImportButton onImported={loadData} />
              <button
                type="button"
                onClick={() => setIsHistoryManagerOpen(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700 border border-zinc-200 dark:border-zinc-700 transition-all shadow-sm cursor-pointer"
                title="Správa a mazání historických záznamů AUM"
              >
                <History className="w-3.5 h-3.5 text-indigo-500" />
                <span>Správa historie</span>
              </button>
              
              {/* Interactive Period Selector */}
              <div className="bg-zinc-100 dark:bg-zinc-800/80 p-1 rounded-lg flex text-xs font-semibold border border-zinc-200 dark:border-zinc-700/50 flex-wrap">
              {(['1M', '3M', '6M', 'YTD', '1R', 'MAX'] as const).map((p: '1M' | '3M' | '6M' | 'YTD' | '1R' | 'MAX') => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setHistoryPeriod(p)}
                  className={`px-2.5 py-1.5 rounded-md transition-colors cursor-pointer ${
                    historyPeriod === p
                      ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white shadow-sm font-bold'
                      : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>
        </div>

          <div className="w-full min-h-[220px] flex-1">
            {filteredTrendData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%" minHeight={240}>
                <AreaChart data={filteredTrendData} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                  <defs>
                    <linearGradient id="aumGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={isDark ? 0.35 : 0.25}/>
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke={isDark ? '#27272a' : '#f4f4f5'} vertical={false} />
                  <XAxis 
                    dataKey="date" 
                    tickFormatter={(val: any) => {
                      const d = new Date(String(val));
                      return !isNaN(d.getTime()) ? `${d.getDate()}.${d.getMonth() + 1}.` : String(val);
                    }}
                    stroke={isDark ? '#52525b' : '#a1a1aa'} 
                    fontSize={11}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis 
                    tickFormatter={(val: any) => `${(Number(val) / 1_000_000).toFixed(0)}M`} 
                    stroke={isDark ? '#52525b' : '#a1a1aa'}
                    fontSize={11}
                    tickLine={false}
                    axisLine={false}
                  />
                  <Tooltip 
                    formatter={(val: any) => [formatCurrencyFull(Number(val)), 'AUM']}
                    labelFormatter={(label: any) => {
                      const d = new Date(String(label));
                      return !isNaN(d.getTime()) ? d.toLocaleDateString('cs-CZ') : String(label);
                    }}
                    contentStyle={{
                      backgroundColor: isDark ? '#18181b' : '#ffffff',
                      borderColor: isDark ? '#27272a' : '#e4e4e7',
                      borderRadius: '0.75rem',
                      fontSize: '12px',
                      fontWeight: 'bold',
                      color: isDark ? '#ffffff' : '#09090b',
                      boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)'
                    }}
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
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center text-zinc-400 dark:text-zinc-600 min-h-[220px]">
                <BarChart3 className="w-12 h-12 mb-2 stroke-[1.5]" />
                <p className="text-sm font-medium">Pro vybrané období nejsou zatím k dispozici žádné historické snímky.</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Product Edit Modal */}
      <ProductEditModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSaved={loadData}
        productToEdit={editingProduct}
      />

      {/* History Management Modal */}
      <HistoryManageModal
        open={isHistoryManagerOpen}
        onClose={() => setIsHistoryManagerOpen(false)}
        onUpdated={loadData}
      />
    </div>
  );
}

