import { NavLink, Outlet } from 'react-router-dom'
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
  Moon 
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

  return (
    <div className="flex h-screen bg-transparent text-zinc-800 dark:text-zinc-100 overflow-hidden relative font-sans">
      {/* Background Dots & Glow (always visible on body background) */}
      <div className="bg-dots" />
      <div className="bg-glow">
        <div className="glow-orb-1" />
        <div className="glow-orb-2" />
      </div>

      {/* Sidebar */}
      <aside className="w-64 flex flex-col glass-sidebar z-10 flex-shrink-0 transition-colors duration-300">
        {/* Logo */}
        <div className="flex items-center gap-3 px-6 py-5 border-b border-zinc-200/80 dark:border-zinc-800/80">
          <img 
            src="/assets/RentUP_Logo_Dark.png" 
            alt="RentUP Logo" 
            className="h-8 w-auto block dark:hidden object-contain"
          />
          <img 
            src="/assets/RentUP_Logo_White.png" 
            alt="RentUP Logo" 
            className="h-8 w-auto hidden dark:block object-contain"
          />
        </div>

        {/* Navigation Sections */}
        <nav className="flex-1 px-4 py-6 space-y-6 overflow-y-auto">
          {/* AUM & Příjmy */}
          <div>
            <div className="px-3 mb-2 text-[11px] font-bold tracking-wider text-zinc-400 dark:text-zinc-500 uppercase">
              AUM & Příjmy
            </div>
            <div className="space-y-1">
              {aumNavItems.map(({ to, icon: Icon, label }) => (
                <NavLink
                  key={to}
                  to={to}
                  className={({ isActive }) =>
                    `sidebar-item flex items-center gap-3 px-3.5 py-2.5 text-sm font-medium ${
                      isActive ? 'active' : ''
                    }`
                  }
                >
                  <Icon className="w-4 h-4 flex-shrink-0" />
                  <span>{label}</span>
                </NavLink>
              ))}
            </div>
          </div>

          {/* Obchody */}
          <div>
            <div className="px-3 mb-2 text-[11px] font-bold tracking-wider text-zinc-400 dark:text-zinc-500 uppercase">
              Obchody
            </div>
            <div className="space-y-1">
              {dealsNavItems.map(({ to, icon: Icon, label }) => (
                <NavLink
                  key={to}
                  to={to}
                  className={({ isActive }) =>
                    `sidebar-item flex items-center gap-3 px-3.5 py-2.5 text-sm font-medium ${
                      isActive ? 'active' : ''
                    }`
                  }
                >
                  <Icon className="w-4 h-4 flex-shrink-0" />
                  <span>{label}</span>
                </NavLink>
              ))}
            </div>
          </div>
        </nav>
        
        {/* Footer with Settings & Profile */}
        <div className="px-4 py-4 border-t border-zinc-200/80 dark:border-zinc-800/80 space-y-2">
          {/* Nastavení přesunto dolů */}
          <NavLink
            to="/settings"
            className={({ isActive }) =>
              `sidebar-item flex items-center gap-3 px-3.5 py-2.5 text-sm font-medium ${
                isActive ? 'active' : ''
              }`
            }
          >
            <Settings className="w-4 h-4 flex-shrink-0" />
            <span>Nastavení</span>
          </NavLink>

          <div className="pt-2 border-t border-zinc-200/60 dark:border-zinc-800/60 flex items-center justify-between px-2">
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
              onClick={signOut}
              title="Odhlásit se"
              className="p-2 text-zinc-400 hover:text-red-500 dark:hover:text-red-400 transition-colors rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content & Top Header */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden relative z-10">
        {/* Header with Dark/Light Toggle */}
        <header className="h-16 glass-nav px-6 lg:px-8 flex items-center justify-between flex-shrink-0 z-20">
          <div className="flex items-center gap-2">
            <span className="text-sm text-zinc-500 dark:text-zinc-400 font-semibold">Správa investičního a obchodního portfolia</span>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={toggleTheme}
              className="flex items-center justify-center w-10 h-10 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white/80 dark:bg-zinc-900/80 text-zinc-600 dark:text-zinc-300 hover:text-blue-600 dark:hover:text-blue-400 hover:scale-105 transition-all shadow-sm"
              title={theme === 'dark' ? 'Přepnout na světlý motiv' : 'Přepnout na tmavý motiv'}
            >
              {theme === 'dark' ? (
                <Sun className="w-5 h-5 text-amber-400 animate-in fade-in duration-200" />
              ) : (
                <Moon className="w-5 h-5 text-indigo-600 animate-in fade-in duration-200" />
              )}
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
