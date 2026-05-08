import { NavLink, useNavigate } from 'react-router-dom'
import PortalSwitcher from '../PortalSwitcher'
import { useEffect, useState } from 'react'
import type { LucideIcon } from 'lucide-react'
import { LayoutDashboard, LogOut, Ticket, ListChecks, Settings as Cog, UserCog, FileText, Clock } from 'lucide-react'
import { receptionApi } from '../../utils/api'

type NavItem = { to: string; label: string; end?: boolean; icon: LucideIcon }

type Section = {
  label: string
  items: NavItem[]
}

const dashboardSection: Section = {
  label: 'DASHBOARD',
  items: [
    { to: '/reception', label: 'Dashboard', icon: LayoutDashboard, end: true },
  ],
}

const tokenSection: Section = {
  label: 'TOKEN MANAGEMENT',
  items: [
    { to: '/reception/token-generator', label: 'Hospital Token', icon: Ticket },
    { to: "/reception/today-tokens", label: "Today's Tokens", icon: ListChecks },
  ],
}

const ipdSection: Section = {
  label: 'IPD BILLING',
  items: [
    { to: '/reception/ipd-billing', label: 'IPD Billing (Add)', icon: Ticket, end: true },
    { to: '/reception/ipd-billing/collect', label: 'IPD Billing (Collect)', icon: Ticket },
    { to: '/reception/ipd-transactions', label: 'Recent IPD Payments', icon: ListChecks },
  ],
}

const erSection: Section = {
  label: 'ER BILLING',
  items: [
    { to: '/reception/er-billing', label: 'ER Billing (Collect)', icon: Ticket, end: true },
    { to: '/reception/er-billing/add', label: 'ER Billing (Add)', icon: Ticket },
    { to: '/reception/er-transactions', label: 'Recent ER Payments', icon: ListChecks },
  ],
}

const diagnosticSection: Section = {
  label: 'DIAGNOSTIC',
  items: [
    { to: '/reception/diagnostic/token-generator', label: 'Diag. Token Generator', icon: Ticket },
    { to: '/reception/diagnostic/sample-tracking', label: 'Diag. Sample Tracking', icon: ListChecks },
  ],
}

const labSection: Section = {
  label: 'LAB',
  items: [
    { to: '/reception/lab/sample-intake', label: 'Lab Token Generator', icon: Ticket },
    { to: '/reception/lab/tokens', label: 'Lab Token History', icon: ListChecks },
  ],
}

const reportsSection: Section = {
  label: 'REPORTS',
  items: [
    { to: '/reception/my-activity-report', label: 'My Activity Report', icon: FileText },
    { to: '/reception/staff-settings', label: 'Staff Settings', icon: Clock },
  ],
}

const adminSection: Section = {
  label: 'ADMIN',
  items: [
    { to: '/reception/user-management', label: 'User Management', icon: UserCog },
    { to: '/reception/sidebar-permissions', label: 'Sidebar Permissions', icon: Cog },
  ],
}

const allSections: Section[] = [
  dashboardSection,
  tokenSection,
  ipdSection,
  erSection,
  diagnosticSection,
  labSection,
  reportsSection,
  adminSection,
]

// Flat array of all nav items for permissions management
export const receptionSidebarNav: NavItem[] = allSections.flatMap(s => s.items)

export default function Reception_Sidebar({ collapsed = false }: { collapsed?: boolean }) {
  const navigate = useNavigate()
  const [role, setRole] = useState<string>('receptionist')
  const [permMap, setPermMap] = useState<Map<string, any>>(new Map())
  const width = collapsed ? 'md:w-16' : 'md:w-72'

  useEffect(() => {
    try {
      const raw = localStorage.getItem('reception.user') || localStorage.getItem('reception.session')
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
        const res: any = await (receptionApi as any).listSidebarPermissions?.(role)
        const doc = Array.isArray(res) ? res[0] : res
        const map = new Map<string, any>()
        const perms = (doc?.permissions || []) as Array<{ path: string; visible?: boolean; order?: number }>
        for (const p of perms) map.set(p.path, p)
        if (mounted) setPermMap(map)
      } catch { if (mounted) setPermMap(new Map()) }
    })()
    return () => { mounted = false }
  }, [role])

  async function logout() {
    try { await receptionApi.logout() } catch {}
    try { localStorage.removeItem('reception.token'); localStorage.removeItem('token'); localStorage.removeItem('reception.user'); localStorage.removeItem('reception.session') } catch {}
    navigate('/reception/login')
  }

  const canShow = (path: string) => {
    if (path === '/reception/sidebar-permissions' && String(role || '').toLowerCase() !== 'admin') return false
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
        {/* All sections */}
        {allSections.map(renderSection)}
      </nav>
      <div className={collapsed ? 'p-2 space-y-2' : 'p-3 space-y-2'}>
        {String(role || '').toLowerCase() === 'admin' ? <PortalSwitcher compact={collapsed} /> : null}
        <button
          onClick={logout}
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
