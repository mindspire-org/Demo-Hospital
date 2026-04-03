import { NavLink, useNavigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import type { LucideIcon } from 'lucide-react'
import {
  LayoutDashboard,
  Users,
  UserCog,
  Settings,
  LogOut,
  Calendar,
  Activity,
  Database,
  ScrollText,
  Shield,
  PlusCircle,
  History,
} from 'lucide-react'

type NavItem = { to: string; label: string; end?: boolean; icon: LucideIcon }

const navTop: NavItem[] = [
  { to: '/dialysis', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/dialysis/token-generator', label: 'Token Generator', icon: PlusCircle },
  { to: '/dialysis/token-history', label: 'Token History', icon: History },
  { to: '/dialysis/patients', label: 'Patients', icon: Users },
  { to: '/dialysis/sessions', label: 'Dialysis Sessions', icon: Activity },
  { to: '/dialysis/appointments', label: 'Appointments', icon: Calendar },
  { to: '/dialysis/master-data', label: 'Master Data', icon: Database },
]

const navBottom: NavItem[] = [
  { to: '/dialysis/user-management', label: 'Users', icon: UserCog },
  { to: '/dialysis/sidebar-permissions', label: 'Sidebar Permissions', icon: Shield },
  { to: '/dialysis/audit', label: 'Audit Log', icon: ScrollText },
  { to: '/dialysis/settings', label: 'Settings', icon: Settings },
]

export const dialysisSidebarNav: NavItem[] = [
  ...navTop,
  ...navBottom,
]

export default function Dialysis_Sidebar({ collapsed = false }: { collapsed?: boolean }) {
  const navigate = useNavigate()
  const [role, setRole] = useState<string>('admin')
  const [permMap] = useState<Map<string, any>>(new Map())
  const width = collapsed ? 'md:w-16' : 'md:w-72'

  useEffect(()=>{
    try {
      const raw = localStorage.getItem('dialysis.session')
      if (raw){
        const u = JSON.parse(raw)
        if (u?.role) setRole(String(u.role).toLowerCase())
      }
    } catch {}
  }, [])

  const canShow = (path: string) => {
    if (path === '/dialysis/sidebar-permissions' && String(role||'').toLowerCase() !== 'admin') return false
    const perm = permMap.get(path)
    return perm ? perm.visible !== false : true
  }

  const byOrder = (a: NavItem, b: NavItem) => {
    const oa = permMap.get(a.to)?.order ?? Number.MAX_SAFE_INTEGER
    const ob = permMap.get(b.to)?.order ?? Number.MAX_SAFE_INTEGER
    if (oa !== ob) return oa - ob
    return 0
  }

  return (
    <aside
      className={`hidden md:flex ${width} md:flex-none md:shrink-0 md:sticky md:top-14 md:h-[calc(100dvh-3.5rem)] md:flex-col md:border-r md:border-slate-200 dark:md:border-slate-700 bg-white dark:bg-slate-900`}
    >
      <nav className={`flex-1 overflow-y-auto overflow-x-hidden ${collapsed ? 'p-2' : 'p-3'} space-y-1`}>
        {[...navTop].filter(i=>canShow(i.to)).sort(byOrder).map(item => {
          const Icon = item.icon
          return (
            <NavLink
              key={item.to}
              to={item.to}
              title={collapsed ? item.label : undefined}
              style={({ isActive }) => (isActive ? ({ background: 'linear-gradient(180deg, #0d9488 0%, #0891b2 100%)' } as any) : undefined)}
              className={({ isActive }) => {
                const base = collapsed
                  ? 'rounded-md p-2 text-sm font-medium flex items-center justify-center'
                  : 'rounded-md px-3 py-2 text-sm font-medium flex items-center gap-2'
                const active = isActive
                  ? 'text-white'
                  : 'text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-100'
                return `${base} ${active}`
              }}
              end={item.end}
            >
              {({ isActive }) => (
                <>
                  <Icon className={collapsed ? (isActive ? 'h-5 w-5 text-white' : 'h-5 w-5 text-slate-700 dark:text-slate-400') : (isActive ? 'h-4 w-4 text-white' : 'h-4 w-4 text-slate-700 dark:text-slate-400')} />
                  {!collapsed && <span className="truncate">{item.label}</span>}
                </>
              )}
            </NavLink>
          )
        })}

        {[...navBottom].filter(i=>canShow(i.to)).sort(byOrder).map(item => {
          const Icon = item.icon
          return (
            <NavLink
              key={item.to}
              to={item.to}
              title={collapsed ? item.label : undefined}
              style={({ isActive }) => (isActive ? ({ background: 'linear-gradient(180deg, #0d9488 0%, #0891b2 100%)' } as any) : undefined)}
              className={({ isActive }) => {
                const base = collapsed
                  ? 'rounded-md p-2 text-sm font-medium flex items-center justify-center'
                  : 'rounded-md px-3 py-2 text-sm font-medium flex items-center gap-2'
                const active = isActive
                  ? 'text-white'
                  : 'text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-100'
                return `${base} ${active}`
              }}
              end={item.end}
            >
              {({ isActive }) => (
                <>
                  <Icon className={collapsed ? (isActive ? 'h-5 w-5 text-white' : 'h-5 w-5 text-slate-700 dark:text-slate-400') : (isActive ? 'h-4 w-4 text-white' : 'h-4 w-4 text-slate-700 dark:text-slate-400')} />
                  {!collapsed && <span className="truncate">{item.label}</span>}
                </>
              )}
            </NavLink>
          )
        })}
      </nav>
      <div className={collapsed ? 'p-2' : 'p-3'}>
        <button
          onClick={async () => {
            try { localStorage.removeItem('dialysis.session') } catch {}
            try { localStorage.removeItem('dialysis.token') } catch {}
            navigate('/dialysis/login')
          }}
          title={collapsed ? 'Logout' : undefined}
          className={collapsed ? 'w-full inline-flex items-center justify-center rounded-md p-2 text-sm font-medium bg-white dark:bg-slate-800 text-teal-600 dark:text-teal-400 border border-teal-600 dark:border-teal-500 hover:bg-teal-50 dark:hover:bg-slate-700' : 'w-full inline-flex items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-medium bg-white dark:bg-slate-800 text-teal-600 dark:text-teal-400 border border-teal-600 dark:border-teal-500 hover:bg-teal-50 dark:hover:bg-slate-700'}
          aria-label="Logout"
        >
          <LogOut className="h-4 w-4" />
          {!collapsed && <span>Logout</span>}
        </button>
      </div>
    </aside>
  )
}
