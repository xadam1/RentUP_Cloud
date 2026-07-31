import { NavLink, Outlet } from 'react-router-dom'
import { LayoutDashboard, BarChart3, Package, Settings, LogOut, Handshake } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'

const navItems = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/projections', icon: BarChart3, label: 'Projekce' },
  { to: '/products', icon: Package, label: 'Produkty' },
  { to: '/deals', icon: Handshake, label: 'Obchody' },
  { to: '/settings', icon: Settings, label: 'Nastavení' },
]

export default function AppLayout() {
  const { user, signOut } = useAuth()

  return (
    <div className="flex h-screen bg-[#0a0a0f] overflow-hidden">
      {/* Sidebar */}
      <aside className="w-60 flex flex-col border-r border-white/[0.06] bg-white/[0.02]">
        {/* Logo */}
        <div className="flex items-center gap-2.5 px-5 py-5 border-b border-white/[0.06]">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center shadow-md shadow-blue-500/30 flex-shrink-0">
            <span className="text-white font-bold text-xs">R</span>
          </div>
          <span className="text-white font-semibold text-sm tracking-tight">RentUP Cloud</span>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
          {navItems.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 ${
                  isActive
                    ? 'bg-blue-500/15 text-blue-400 shadow-sm'
                    : 'text-white/50 hover:text-white/80 hover:bg-white/[0.05]'
                }`
              }
            >
              <Icon className="w-4 h-4 flex-shrink-0" />
              {label}
            </NavLink>
          ))}
        </nav>

        {/* User footer */}
        <div className="px-3 pb-4 border-t border-white/[0.06] pt-3">
          <div className="flex items-center gap-2.5 px-2 mb-2">
            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center flex-shrink-0">
              <span className="text-white text-xs font-medium">
                {user?.email?.[0]?.toUpperCase() ?? '?'}
              </span>
            </div>
            <span className="text-white/50 text-xs truncate flex-1">{user?.email}</span>
          </div>
          <button
            onClick={signOut}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm text-white/40 hover:text-red-400 hover:bg-red-500/10 transition-all duration-150"
          >
            <LogOut className="w-4 h-4" />
            Odhlásit se
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto">
        <div className="min-h-full p-6 lg:p-8">
          <Outlet />
        </div>
      </main>
    </div>
  )
}
