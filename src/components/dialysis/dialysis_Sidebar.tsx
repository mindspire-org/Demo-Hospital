import { NavLink, useNavigate } from 'react-router-dom'
import PortalSwitcher from '../PortalSwitcher'
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
  BookOpen,
  UserMinus,
} from 'lucide-react'
import { dialysisApi } from '../../utils/api'

type NavItem = { to: string; label: string; end?: boolean; icon: LucideIcon }

type Section = {
  label: string
  items: NavItem[]
}

const tokenSection: Section = {
  label: 'TOKEN MANAGEMENT',
  items: [
    { to: '/dialysis/token-generator', label: 'Token Generator', icon: PlusCircle },
    { to: '/dialysis/token-history', label: 'Token History', icon: History },
    { to: '/dialysis/appointments', label: 'Appointments', icon: Calendar },
  ],
}

const patientSection: Section = {
  label: 'PATIENT MANAGEMENT',
  items: [
    { to: '/dialysis/patients', label: 'Patients', icon: Users },
    { to: '/dialysis/sessions', label: 'Dialysis Sessions', icon: Activity },
    { to: '/dialysis/patient-history', label: 'Patient History', icon: BookOpen },
    { to: '/dialysis/discharged-patients', label: 'Discharged Patients', icon: UserMinus },
  ],
}

const masterSection: Section = {
  label: 'MASTER DATA',
  items: [
    { to: '/dialysis/master-data', label: 'Master Data', icon: Database },
  ],
}

const adminSection: Section = {
  label: 'ADMIN',
  items: [
    { to: '/dialysis/user-management', label: 'Users', icon: UserCog },
    { to: '/dialysis/sidebar-permissions', label: 'Sidebar Permissions', icon: Shield },
    { to: '/dialysis/audit', label: 'Audit Log', icon: ScrollText },
    { to: '/dialysis/settings', label: 'Settings', icon: Settings },
  ],
}

const dashboardItem: NavItem = { to: '/dialysis', label: 'Dashboard', icon: LayoutDashboard, end: true }

const allSections: Section[] = [
  tokenSection,
  patientSection,
  masterSection,
  adminSection,
]

// Flat array of all nav items for permissions management
export const dialysisSidebarNav: NavItem[] = [
  dashboardItem,
  ...allSections.flatMap(s => s.items),
]

export default function Dialysis_Sidebar({ collapsed = false }: { collapsed?: boolean }) {
  const navigate = useNavigate()
  const [role, setRole] = useState<string>('admin')
  const [permMap, setPermMap] = useState<Map<string, any>>(new Map())
  const width = collapsed ? 'md:w-16' : 'md:w-72'

  useEffect(() => {
    try {
      const raw = localStorage.getItem('dialysis.session')
      if (raw) {
        const u = JSON.parse(raw)
        if (u?.role) setRole(String(u.role).toLowerCase())
      }
    } catch {}
  }, [])

  useEffect(() => {
    let mounted = true
    ;(async () => {
      try {
        const res: any = await (dialysisApi as any).listSidebarPermissions?.(role)
        const doc = Array.isArray(res) ? res[0] : res
        const map = new Map<string, any>()
        const perms = (doc?.permissions || []) as Array<{ path: string; visible?: boolean; order?: number }>
        for (const p of perms) map.set(p.path, p)
        if (mounted) setPermMap(map)
      } catch { if (mounted) setPermMap(new Map()) }
    })()
    return () => { mounted = false }
  }, [role])

  const canShow = (path: string) => {
    if (path === '/dialysis/sidebar-permissions' && String(role || '').toLowerCase() !== 'admin') return false
    const perm = permMap.get(path)
    return perm ? perm.visible !== false : true
  }

  const byOrder = (a: NavItem, b: NavItem) => {
    const oa = permMap.get(a.to)?.order ?? Number.MAX_SAFE_INTEGER
    const ob = permMap.get(b.to)?.order ?? Number.MAX_SAFE_INTEGER
    if (oa !== ob) return oa - ob
    return 0
  }

  const renderNavItem = (item: NavItem) => {
    const Icon = item.icon
    return (
      <NavLink
        key={item.to}
        to={item.to}
        title={collapsed ? item.label : undefined}
        style={({ isActive }) => (isActive ? ({ background: 'linear-gradient(180deg, var(--navy) 0%, var(--navy-700) 100%)' } as any) : undefined)}
        className={({ isActive }) => {
          const base = collapsed
            ? 'rounded-md p-2 text-sm font-medium flex items-center justify-center'
            : 'rounded-md px-3 py-2 text-sm font-medium flex items-center gap-2'
          const active = isActive
            ? 'text-white'
            : 'text-slate-700 hover:bg-slate-50 hover:text-slate-900'
          return `${base} ${active}`
        }}
        end={item.end}
      >
        {({ isActive }) => (
          <>
            <Icon className={collapsed ? (isActive ? 'h-5 w-5 text-white' : 'h-5 w-5 text-slate-700') : (isActive ? 'h-4 w-4 text-white' : 'h-4 w-4 text-slate-700')} />
            {!collapsed && <span className="truncate">{item.label}</span>}
          </>
        )}
      </NavLink>
    )
  }

  const renderSection = (section: Section) => {
    const visibleItems = section.items.filter(i => canShow(i.to)).sort(byOrder)
    if (visibleItems.length === 0) return null

    return (
      <div key={section.label} className="space-y-1">
        {!collapsed && (
          <div className="px-3 py-2 text-base font-bold uppercase tracking-wider" style={{ color: 'var(--navy)' }}>
            {section.label}
          </div>
        )}
        {visibleItems.map(renderNavItem)}
      </div>
    )
  }

  return (
    <aside
      className={`hidden md:flex ${width} md:flex-none md:shrink-0 md:sticky md:top-14 md:h-[calc(100dvh-3.5rem)] md:flex-col md:border-r bg-white/80 backdrop-blur-md shadow-sm dark:bg-slate-900/60 dark:border-slate-700`}
    >
      <nav className={`flex-1 overflow-y-auto overflow-x-hidden ${collapsed ? 'p-2' : 'p-3'} space-y-4`}>
        {/* Dashboard at top */}
        {canShow(dashboardItem.to) && renderNavItem(dashboardItem)}

        {/* All sections */}
        {allSections.map(renderSection)}
      </nav>
      <div className={collapsed ? 'p-2 space-y-2' : 'p-3 space-y-2'}>
        {String(role || '').toLowerCase() === 'admin' ? <PortalSwitcher compact={collapsed} /> : null}
        <button
          onClick={async () => {
            try { localStorage.removeItem('dialysis.session') } catch {}
            try { localStorage.removeItem('dialysis.token') } catch {}
            navigate('/dialysis/login')
          }}
          title={collapsed ? 'Logout' : undefined}
          className={collapsed ? 'w-full inline-flex items-center justify-center rounded-md p-2 text-sm font-medium' : 'w-full inline-flex items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-medium'}
          style={{ backgroundColor: '#ffffff', color: 'var(--navy)', border: '1px solid var(--navy)' }}
          onMouseEnter={e => { try { ;(e.currentTarget as any).style.backgroundColor = 'rgba(15,45,92,0.06)' } catch {} }}
          onMouseLeave={e => { try { ;(e.currentTarget as any).style.backgroundColor = '#ffffff' } catch {} }}
          aria-label="Logout"
        >
          <LogOut className="h-4 w-4" />
          {!collapsed && <span>Logout</span>}
        </button>
      </div>
    </aside>
  )
}
