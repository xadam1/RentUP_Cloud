import { useState } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { 
  LayoutDashboard, 
  TrendingUp, 
  Briefcase, 
  Users, 
  UserPlus, 
  PieChart, 
  Settings, 
  LogOut, 
  Sun, 
  Moon,
  PanelLeftClose,
  PanelLeftOpen
} from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { useTheme } from '@/contexts/ThemeContext'

const aumNavItems = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/projections', icon: TrendingUp, label: 'Vize a projekce' },
]

const dealsNavItems = [
  { to: '/deals', icon: Briefcase, label: 'Produkce' },
  { to: '/clients', icon: Users, label: 'Klienti' },
  { to: '/recommendations', icon: UserPlus, label: 'Doporučení' },
  { to: '/statistics', icon: PieChart, label: 'Statistická analýza' },
]

export default function AppLayout() {
  const { user, signOut } = useAuth()
  const { theme, toggleTheme } = useTheme()
  const location = useLocation()
  const [isCollapsed, setIsCollapsed] = useState(() => localStorage.getItem('sidebar_collapsed') === 'true')

  const toggleSidebar = () => {
    setIsCollapsed(prev => {
      const next = !prev;
      localStorage.setItem('sidebar_collapsed', String(next));
      return next;
    });
  };

  const getHeaderInfo = () => {
    const path = location.pathname
    if (path.includes('/dashboard')) {
      return { title: 'AUM Dashboard', subtitle: 'Přehled spravovaného majetku a pasivního příjmu' }
    } else if (path.includes('/projections')) {
      return { title: 'Vize a projekce', subtitle: 'Budoucí vývoj a predikce růstu Vašeho portfolia' }
    } else if (path.includes('/deals')) {
      return { title: 'Obchody & Produkce', subtitle: 'Evidence uzavřených smluv a provizní statistiky' }
    } else if (path.includes('/clients')) {
      return { title: 'Klienti', subtitle: 'Správa klientského kmene a detailní karty' }
    } else if (path.includes('/recommendations')) {
      return { title: 'Doporučení', subtitle: 'Přehled doporučitelů a síť neomezeného růstu' }
    } else if (path.includes('/statistics')) {
      return { title: 'Statistická analýza', subtitle: 'Pokročilá analytická vizualizace produkce' }
    } else if (path.includes('/settings')) {
      return { title: 'Nastavení & Systém', subtitle: 'Konfigurace parametrů a správa testovacích dat' }
    }
    return { title: 'RentUP Cloud', subtitle: 'Správa investičního a obchodního portfolia' }
  }
  const { title, subtitle } = getHeaderInfo()

  return (
    <div className="flex h-screen bg-transparent text-zinc-800 dark:text-zinc-100 overflow-hidden relative font-sans">
      {/* Background Dots & Glow (always visible on body background) */}
      <div className="bg-dots" />
      <div className="bg-glow">
        <div className="glow-orb-1" />
        <div className="glow-orb-2" />
      </div>

      {/* Sidebar */}
      <aside className={`flex flex-col glass-sidebar z-10 flex-shrink-0 transition-all duration-300 ease-in-out relative ${
        isCollapsed ? 'w-20' : 'w-64'
      }`}>
        {/* Logo & Toggle */}
        <div className={`flex items-center ${isCollapsed ? 'justify-center px-4 py-5' : 'justify-between px-6 py-5'} border-b border-zinc-200/80 dark:border-zinc-800/80 transition-all duration-300`}>
          {!isCollapsed ? (
            <div className="flex items-center gap-3 overflow-hidden">
              <img 
                src="/assets/RentUP_Logo_Dark.png" 
                alt="RentUP Logo" 
                className="h-8 w-auto block dark:hidden object-contain transition-all duration-300"
              />
              <img 
                src="/assets/RentUP_Logo_White.png" 
                alt="RentUP Logo" 
                className="h-8 w-auto hidden dark:block object-contain transition-all duration-300"
              />
            </div>
          ) : (
            <img 
              src="/assets/RentUP_Icon.png" 
              alt="RentUP Icon" 
              className="h-8 w-8 object-contain transition-all duration-300 animate-in zoom-in duration-200"
            />
          )}
          
          <button
            type="button"
            onClick={toggleSidebar}
            title={isCollapsed ? 'Rozbalit navigační panel' : 'Sbalit navigační panel'}
            className={`${
              isCollapsed ? 'hidden' : 'flex'
            } items-center justify-center w-7 h-7 rounded-lg text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800/60 transition-all cursor-pointer`}
          >
            <PanelLeftClose className="w-4 h-4 stroke-[2]" />
          </button>
        </div>

        {/* Toggle button when collapsed */}
        {isCollapsed && (
          <div className="px-3 pt-3 flex justify-center">
            <button
              type="button"
              onClick={toggleSidebar}
              title="Rozbalit navigační panel"
              className="flex items-center justify-center w-9 h-9 rounded-xl text-zinc-500 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-500/10 transition-all cursor-pointer shadow-2xs border border-transparent hover:border-blue-500/20"
            >
              <PanelLeftOpen className="w-5 h-5 stroke-[2]" />
            </button>
          </div>
        )}

        {/* Navigation Sections */}
        <nav className="flex-1 px-3 py-4 space-y-6 overflow-y-auto custom-scrollbar">
          {/* AUM & Příjmy */}
          <div>
            {!isCollapsed ? (
              <div className="px-3 mb-2 text-[11px] font-bold tracking-wider text-zinc-400 dark:text-zinc-500 uppercase transition-opacity duration-300">
                AUM & Příjmy
              </div>
            ) : (
              <div className="h-px bg-zinc-200/80 dark:bg-zinc-800/80 my-2 mx-2" />
            )}
            <div className="space-y-1">
              {aumNavItems.map(({ to, icon: Icon, label }) => (
                <NavLink
                  key={to}
                  to={to}
                  title={isCollapsed ? label : undefined}
                  className={({ isActive }) =>
                    `sidebar-item flex items-center ${isCollapsed ? 'justify-center p-3' : 'gap-3 px-3.5 py-2.5'} text-sm font-medium transition-all duration-200 rounded-xl ${
                      isActive ? 'active shadow-sm font-semibold' : ''
                    }`
                  }
                >
                  <Icon className={`${isCollapsed ? 'w-5 h-5' : 'w-4 h-4'} flex-shrink-0 transition-all duration-200`} />
                  {!isCollapsed && <span className="truncate">{label}</span>}
                </NavLink>
              ))}
            </div>
          </div>

          {/* Obchody */}
          <div>
            {!isCollapsed ? (
              <div className="px-3 mb-2 text-[11px] font-bold tracking-wider text-zinc-400 dark:text-zinc-500 uppercase transition-opacity duration-300">
                Obchody
              </div>
            ) : (
              <div className="h-px bg-zinc-200/80 dark:bg-zinc-800/80 my-2 mx-2" />
            )}
            <div className="space-y-1">
              {dealsNavItems.map(({ to, icon: Icon, label }) => (
                <NavLink
                  key={to}
                  to={to}
                  title={isCollapsed ? label : undefined}
                  className={({ isActive }) =>
                    `sidebar-item flex items-center ${isCollapsed ? 'justify-center p-3' : 'gap-3 px-3.5 py-2.5'} text-sm font-medium transition-all duration-200 rounded-xl ${
                      isActive ? 'active shadow-sm font-semibold' : ''
                    }`
                  }
                >
                  <Icon className={`${isCollapsed ? 'w-5 h-5' : 'w-4 h-4'} flex-shrink-0 transition-all duration-200`} />
                  {!isCollapsed && <span className="truncate">{label}</span>}
                </NavLink>
              ))}
            </div>
          </div>
        </nav>
        
        {/* Footer with Settings & Profile */}
        <div className={`px-3 py-4 border-t border-zinc-200/80 dark:border-zinc-800/80 space-y-2 transition-all duration-300`}>
          <NavLink
            to="/settings"
            title={isCollapsed ? 'Nastavení' : undefined}
            className={({ isActive }) =>
              `sidebar-item flex items-center ${isCollapsed ? 'justify-center p-3' : 'gap-3 px-3.5 py-2.5'} text-sm font-medium transition-all duration-200 rounded-xl ${
                isActive ? 'active shadow-sm font-semibold' : ''
              }`
            }
          >
            <Settings className={`${isCollapsed ? 'w-5 h-5' : 'w-4 h-4'} flex-shrink-0 transition-all duration-200`} />
            {!isCollapsed && <span className="truncate">Nastavení</span>}
          </NavLink>

          <div className="pt-2 border-t border-zinc-200/60 dark:border-zinc-800/60 flex items-center justify-between px-1">
            {!isCollapsed ? (
              <>
                <div className="flex items-center gap-2.5 overflow-hidden">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center flex-shrink-0 shadow-sm text-white text-xs font-semibold">
                    {user?.email?.[0]?.toUpperCase() ?? 'U'}
                  </div>
                  <div className="truncate">
                    <p className="text-xs font-medium text-zinc-700 dark:text-zinc-300 truncate">{user?.email?.split('@')[0]}</p>
                    <p className="text-[10px] text-zinc-400 truncate">{user?.email}</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={signOut}
                  title="Odhlásit se"
                  className="p-2 text-zinc-400 hover:text-red-500 dark:hover:text-red-400 transition-colors rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </>
            ) : (
              <div className="w-full flex flex-col items-center gap-2 py-1">
                <div 
                  className="w-8 h-8 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center shadow-sm text-white text-xs font-semibold cursor-help"
                  title={`${user?.email ?? 'Uživatel'}`}
                >
                  {user?.email?.[0]?.toUpperCase() ?? 'U'}
                </div>
                <button
                  type="button"
                  onClick={signOut}
                  title="Odhlásit se"
                  className="p-2 text-zinc-400 hover:text-red-500 dark:hover:text-red-400 transition-colors rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        </div>
      </aside>

      {/* Main Content & Top Header */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden relative z-10">
        {/* Header with Dark/Light Toggle */}
        <header className="h-20 glass-nav px-6 lg:px-8 flex items-center justify-between flex-shrink-0 z-20 sticky top-0 transition-colors duration-200">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-white">{title}</h1>
            <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-0.5">{subtitle}</p>
          </div>

          <div className="flex items-center gap-4">
            <button
              onClick={toggleTheme}
              className="relative inline-flex h-8 w-16 items-center rounded-full bg-zinc-200 dark:bg-zinc-800 transition-colors border border-zinc-300 dark:border-zinc-700 shadow-inner focus:outline-none cursor-pointer"
              title={theme === 'dark' ? 'Přepnout na světlý motiv' : 'Přepnout na tmavý motiv'}
            >
              <span className="sr-only">Přepnout téma</span>
              <span className={`inline-flex h-6 w-6 transform rounded-full bg-white dark:bg-zinc-900 shadow-sm transition-transform duration-300 ease-in-out items-center justify-center border border-zinc-200 dark:border-zinc-700 ${
                theme === 'dark' ? 'translate-x-9' : 'translate-x-1'
              }`}>
                {theme === 'dark' ? (
                  <Moon className="w-3.5 h-3.5 text-blue-400" />
                ) : (
                  <Sun className="w-3.5 h-3.5 text-amber-500" />
                )}
              </span>
            </button>
          </div>
        </header>

        {/* Scrollable Page Content */}
        <div className="flex-1 overflow-y-auto p-6 lg:p-8">
          <Outlet />
        </div>
      </main>
    </div>
  )
}
