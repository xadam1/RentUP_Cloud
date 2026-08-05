import { useState, useEffect } from 'react'
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
  PanelLeftOpen,
  Menu,
  X
} from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { useTheme } from '@/contexts/ThemeContext'

const aumNavItems = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/projections', icon: TrendingUp, label: 'Budoucí příjmy' },
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
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  // Automaticky zavřít mobilní menu při změně stránky (po kliknutí na odkaz)
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [location.pathname]);

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
      return { title: 'Budoucí příjmy', subtitle: 'Modelování budoucích pasivních příjmů a provizí' }
    } else if (path.includes('/deals')) {
      return { title: 'Obchody & Produkce', subtitle: 'Evidence uzavřených smluv a provizní statistika' }
    } else if (path.includes('/clients')) {
      return { title: 'Klienti', subtitle: 'Správa klientského kmene a detailní karty' }
    } else if (path.includes('/recommendations')) {
      return { title: 'Doporučení', subtitle: 'Přehled doporučitelů a síť růstu' }
    } else if (path.includes('/statistics')) {
      return { title: 'Statistická analýza', subtitle: 'Pokročilá analytická vizualizace produkce' }
    } else if (path.includes('/settings')) {
      return { title: 'Nastavení & Systém', subtitle: 'Konfigurace parametrů a správa dat' }
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

      {/* Desktop Sidebar (skrytý na malých displejích - md:hidden) */}
      <aside className={`hidden md:flex flex-col glass-sidebar z-10 flex-shrink-0 transition-all duration-300 ease-in-out relative ${
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
        <div className="px-3 py-4 border-t border-zinc-200/80 dark:border-zinc-800/80 space-y-2 transition-all duration-300">
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

      {/* Mobilní Slide-Over menu (Drawer) - zobrazuje se na telefonu na vyžádání */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex">
          {/* Backdrop */}
          <div 
            className="fixed inset-0 modal-backdrop animate-in fade-in duration-200"
            onClick={() => setIsMobileMenuOpen(false)} 
          />
          
          {/* Slide-over panel */}
          <aside className="relative z-10 w-72 max-w-[85vw] bg-white/95 dark:bg-zinc-900/95 backdrop-blur-xl flex flex-col h-full shadow-2xl animate-in slide-in-from-left duration-250 border-r border-zinc-200 dark:border-zinc-800">
            {/* Header in drawer */}
            <div className="px-5 py-5 border-b border-zinc-200/80 dark:border-zinc-800/80 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <img 
                  src="/assets/RentUP_Logo_Dark.png" 
                  alt="RentUP Logo" 
                  className="h-7 w-auto block dark:hidden object-contain"
                />
                <img 
                  src="/assets/RentUP_Logo_White.png" 
                  alt="RentUP Logo" 
                  className="h-7 w-auto hidden dark:block object-contain"
                />
              </div>
              <button
                type="button"
                onClick={() => setIsMobileMenuOpen(false)}
                className="p-2 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-xl transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Navigation links in drawer */}
            <nav className="flex-1 px-4 py-5 space-y-6 overflow-y-auto custom-scrollbar">
              <div>
                <div className="px-3 mb-2 text-[11px] font-bold tracking-wider text-zinc-400 dark:text-zinc-500 uppercase">
                  AUM & Příjmy
                </div>
                <div className="space-y-1.5">
                  {aumNavItems.map(({ to, icon: Icon, label }) => (
                    <NavLink
                      key={to}
                      to={to}
                      className={({ isActive }) =>
                        `sidebar-item flex items-center gap-3.5 px-3.5 py-3 text-sm font-medium transition-all rounded-xl ${
                          isActive ? 'active shadow-sm font-bold' : ''
                        }`
                      }
                    >
                      <Icon className="w-5 h-5 flex-shrink-0" />
                      <span>{label}</span>
                    </NavLink>
                  ))}
                </div>
              </div>

              <div>
                <div className="px-3 mb-2 text-[11px] font-bold tracking-wider text-zinc-400 dark:text-zinc-500 uppercase">
                  Obchody & Produkce
                </div>
                <div className="space-y-1.5">
                  {dealsNavItems.map(({ to, icon: Icon, label }) => (
                    <NavLink
                      key={to}
                      to={to}
                      className={({ isActive }) =>
                        `sidebar-item flex items-center gap-3.5 px-3.5 py-3 text-sm font-medium transition-all rounded-xl ${
                          isActive ? 'active shadow-sm font-bold' : ''
                        }`
                      }
                    >
                      <Icon className="w-5 h-5 flex-shrink-0" />
                      <span>{label}</span>
                    </NavLink>
                  ))}
                </div>
              </div>
            </nav>

            {/* Profile and settings footer in drawer */}
            <div className="px-4 py-4 border-t border-zinc-200 dark:border-zinc-800 space-y-3 bg-zinc-50/50 dark:bg-zinc-900/50">
              <NavLink
                to="/settings"
                className={({ isActive }) =>
                  `sidebar-item flex items-center gap-3.5 px-3.5 py-3 text-sm font-medium transition-all rounded-xl ${
                    isActive ? 'active shadow-sm font-bold' : ''
                  }`
                }
              >
                <Settings className="w-5 h-5 flex-shrink-0" />
                <span>Nastavení</span>
              </NavLink>

              <div className="pt-2 border-t border-zinc-200/70 dark:border-zinc-800/70 flex items-center justify-between px-1">
                <div className="flex items-center gap-3 overflow-hidden">
                  <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center flex-shrink-0 shadow-sm text-white text-xs font-semibold">
                    {user?.email?.[0]?.toUpperCase() ?? 'U'}
                  </div>
                  <div className="truncate">
                    <p className="text-xs font-semibold text-zinc-800 dark:text-zinc-200 truncate">{user?.email?.split('@')[0]}</p>
                    <p className="text-[10px] text-zinc-400 truncate">{user?.email}</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={signOut}
                  title="Odhlásit se"
                  className="p-2.5 text-zinc-400 hover:text-red-500 dark:hover:text-red-400 transition-colors rounded-xl hover:bg-red-50 dark:hover:bg-red-950/20 cursor-pointer"
                >
                  <LogOut className="w-5 h-5" />
                </button>
              </div>
            </div>
          </aside>
        </div>
      )}

      {/* Main Content & Top Header */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden relative z-10">
        {/* Header with Mobile Hamburger, Titles and Dark/Light Toggle */}
        <header className="h-16 sm:h-20 glass-nav px-3.5 sm:px-6 lg:px-8 flex items-center justify-between flex-shrink-0 z-20 sticky top-0 transition-colors duration-200">
          <div className="flex items-center gap-3 min-w-0 pr-2">
            {/* Hamburger button on mobile */}
            <button
              type="button"
              onClick={() => setIsMobileMenuOpen(true)}
              className="md:hidden p-2 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-xl transition-all cursor-pointer flex-shrink-0"
              title="Otevřít navigaci"
            >
              <Menu className="w-6 h-6 stroke-[2]" />
            </button>

            {/* Mini icon on mobile */}
            <div className="md:hidden flex-shrink-0 mr-0.5">
              <img src="/assets/RentUP_Icon.png" alt="RentUP" className="w-7 h-7 object-contain" />
            </div>

            <div className="min-w-0">
              <h1 className="text-lg sm:text-2xl font-bold tracking-tight text-zinc-900 dark:text-white truncate">{title}</h1>
              <p className="text-[11px] sm:text-sm text-zinc-500 dark:text-zinc-400 mt-0.5 hidden sm:block truncate">{subtitle}</p>
            </div>
          </div>

          <div className="flex items-center gap-3 sm:gap-4 flex-shrink-0">
            <button
              onClick={toggleTheme}
              className="relative inline-flex h-7 sm:h-8 w-14 sm:w-16 items-center rounded-full bg-zinc-200 dark:bg-zinc-800 transition-colors border border-zinc-300 dark:border-zinc-700 shadow-inner focus:outline-none cursor-pointer flex-shrink-0"
              title={theme === 'dark' ? 'Přepnout na světlý motiv' : 'Přepnout na tmavý motiv'}
            >
              <span className="sr-only">Přepnout téma</span>
              <span className={`inline-flex h-5 w-5 sm:h-6 sm:w-6 transform rounded-full bg-white dark:bg-zinc-900 shadow-sm transition-transform duration-300 ease-in-out items-center justify-center border border-zinc-200 dark:border-zinc-700 ${
                theme === 'dark' ? 'translate-x-7 sm:translate-x-9' : 'translate-x-1'
              }`}>
                {theme === 'dark' ? (
                  <Moon className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-blue-400" />
                ) : (
                  <Sun className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-amber-500" />
                )}
              </span>
            </button>
          </div>
        </header>

        {/* Scrollable Page Content (s dodatečným padding-bottom pro mobil, aby spodní navigace nezakrývala patičky) */}
        <div className="flex-1 overflow-y-auto p-3.5 sm:p-6 lg:p-8 pb-24 md:pb-6 lg:pb-8">
          <Outlet />
        </div>

        {/* Mobilní Spodní Navigace (Bottom Navigation Bar) - moderní iOS/Android UX pro telefony */}
        <nav className="md:hidden fixed bottom-0 left-0 right-0 h-16 glass-nav z-40 border-t border-zinc-200/80 dark:border-zinc-800/80 flex items-center justify-around px-2 shadow-xl backdrop-blur-xl">
          <NavLink
            to="/dashboard"
            className={({ isActive }) =>
              `flex flex-col items-center justify-center w-full py-1 gap-1 text-[10px] font-semibold transition-all ${
                isActive ? 'text-blue-600 dark:text-blue-400 font-extrabold' : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200'
              }`
            }
          >
            <LayoutDashboard className="w-5 h-5" />
            <span>Dashboard</span>
          </NavLink>

          <NavLink
            to="/projections"
            className={({ isActive }) =>
              `flex flex-col items-center justify-center w-full py-1 gap-1 text-[10px] font-semibold transition-all ${
                isActive ? 'text-blue-600 dark:text-blue-400 font-extrabold' : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200'
              }`
            }
          >
            <TrendingUp className="w-5 h-5" />
            <span>Příjmy</span>
          </NavLink>

          <NavLink
            to="/deals"
            className={({ isActive }) =>
              `flex flex-col items-center justify-center w-full py-1 gap-1 text-[10px] font-semibold transition-all ${
                isActive ? 'text-blue-600 dark:text-blue-400 font-extrabold' : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200'
              }`
            }
          >
            <Briefcase className="w-5 h-5" />
            <span>Produkce</span>
          </NavLink>

          <button
            type="button"
            onClick={() => setIsMobileMenuOpen(true)}
            className="flex flex-col items-center justify-center w-full py-1 gap-1 text-[10px] font-semibold text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200 transition-all cursor-pointer"
          >
            <Menu className="w-5 h-5" />
            <span>Více</span>
          </button>
        </nav>
      </main>
    </div>
  );
}
