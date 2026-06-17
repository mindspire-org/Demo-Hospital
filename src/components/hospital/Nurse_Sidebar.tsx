import { useLocation, useNavigate } from 'react-router-dom'
import {
  HeartPulse,
  ClipboardList,
  Users,
  Thermometer,
  Calendar,
  TrendingUp,
  ArrowLeftRight,
  LogOut,
  LayoutDashboard
} from 'lucide-react'

interface NavItem {
  path: string
  label: string
  icon: React.ElementType
}

const navItems: NavItem[] = [
  { path: '/hospital/nurse/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/hospital/nurse/tasks', label: 'Tasks', icon: ClipboardList },
  { path: '/hospital/nurse/patients', label: 'Patients', icon: Users },
  { path: '/hospital/nurse/vitals', label: 'Vitals', icon: Thermometer },
  { path: '/hospital/nurse/shifts', label: 'Shifts', icon: Calendar },
  { path: '/hospital/nurse/handover', label: 'Handover', icon: ArrowLeftRight },
  { path: '/hospital/nurse/performance', label: 'Performance', icon: TrendingUp },
]

export default function Nurse_Sidebar({ collapsed = false, hospitalName = 'Health Spire' }: { collapsed?: boolean; hospitalName?: string }) {
  const location = useLocation()
  const navigate = useNavigate()

  const isActive = (path: string) => location.pathname === path

  return (
    <div
      className={`flex flex-col h-full bg-white border-r border-slate-200 transition-all duration-200 ${
        collapsed ? 'w-16' : 'w-56'
      }`}
    >
      {/* Logo / Header */}
      <div className="flex items-center gap-3 px-4 py-4 border-b border-slate-100">
        <div className="w-9 h-9 rounded-lg bg-rose-100 flex items-center justify-center shrink-0">
          <HeartPulse className="w-5 h-5 text-rose-600" />
        </div>
        {!collapsed && (
          <div className="min-w-0">
            <div className="text-sm font-bold text-slate-800 truncate">Nurse Portal</div>
            <div className="text-xs text-slate-500 truncate">{hospitalName}</div>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-1">
        {navItems.map((item) => {
          const active = isActive(item.path)
          const Icon = item.icon
          return (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                active
                  ? 'bg-rose-50 text-rose-700'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-800'
              }`}
              title={collapsed ? item.label : undefined}
            >
              <Icon className={`w-5 h-5 shrink-0 ${active ? 'text-rose-600' : 'text-slate-400'}`} />
              {!collapsed && <span className="truncate">{item.label}</span>}
            </button>
          )
        })}
      </nav>

      {/* Bottom: Logout */}
      <div className="p-2 border-t border-slate-100">
        <button
          onClick={() => {
            localStorage.removeItem('hospital.token')
            localStorage.removeItem('hospital.session')
            window.location.href = '/'
          }}
          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-red-500 hover:bg-red-50 transition-colors ${
            collapsed ? 'justify-center' : ''
          }`}
          title={collapsed ? 'Logout' : undefined}
        >
          <LogOut className="w-5 h-5 shrink-0" />
          {!collapsed && <span className="truncate">Logout</span>}
        </button>
      </div>
    </div>
  )
}
