import { useLocation } from 'react-router-dom';

export default function ComingSoonPage() {
  const location = useLocation();
  const path = location.pathname.replace('/', '');
  
  const titleMap: Record<string, { title: string; icon: string; desc: string }> = {
    clients: {
      title: 'Klienti',
      icon: '👥',
      desc: 'Správa klientského portfolia, kontakty a přehled smluv u jednotlivých klientů připravujeme.'
    },
    recommendations: {
      title: 'Doporučení',
      icon: '🤝',
      desc: 'Modul pro sledování referencí, doporučení a síťového rozvoje bude brzy k dispozici.'
    },
    statistics: {
      title: 'Statistická analýza',
      icon: '📊',
      desc: 'Rozšířené grafické výpory, konverze obchodů a analytické metriky produkce se vyvíjejí.'
    }
  };

  const current = titleMap[path] || {
    title: 'Ve výstavbě',
    icon: '🚀',
    desc: 'Tato sekce je v současné době ve fázi intenzivního vývoje.'
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-6">
      <div className="w-24 h-24 mb-6 rounded-3xl bg-gradient-to-tr from-blue-500/20 to-purple-500/20 border border-blue-500/30 flex items-center justify-center text-5xl shadow-lg shadow-blue-500/10 animate-bounce">
        {current.icon}
      </div>
      <h2 className="text-3xl font-bold tracking-tight text-zinc-800 dark:text-zinc-100 mb-2">
        {current.title}
      </h2>
      <span className="px-3 py-1 text-xs font-semibold uppercase tracking-wider text-blue-600 bg-blue-100 dark:bg-blue-500/20 dark:text-blue-400 rounded-full mb-4 inline-block border border-blue-200 dark:border-blue-500/30">
        Brzy zpřístupníme
      </span>
      <p className="max-w-md text-sm text-zinc-500 dark:text-zinc-400 leading-relaxed">
        {current.desc}
      </p>
    </div>
  );
}
