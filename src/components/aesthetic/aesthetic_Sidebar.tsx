import { NavLink, useNavigate } from 'react-router-dom'
import PortalSwitcher from '../PortalSwitcher'
import { aestheticApi } from '../../utils/api'
import { useEffect, useState } from 'react'
import type { LucideIcon } from 'lucide-react'
import {
  LayoutDashboard,
  CalendarCheck,
  Users,
  Settings as Cog,
  Sparkles,
  History,
  FileText,
  Boxes,
  Truck,
  Receipt,
  UserCog,
  ScrollText,
  Bell,
  LogOut,
  Wallet,
  CreditCard,
  CalendarDays,
} from 'lucide-react'

type NavItem = { to: string; label: string; end?: boolean; icon: LucideIcon }

type Section = {
  label: string
  items: NavItem[]
}

const tokenSection: Section = {
  label: 'TOKEN MANAGEMENT',
  items: [
    { to: '/aesthetic/token-generator', label: 'Token Generation', icon: CalendarCheck },
    { to: '/aesthetic/today-tokens', label: "Today's Tokens", icon: History },
    { to: '/aesthetic/token-history', label: 'Token History', icon: History },
    { to: '/aesthetic/appointments', label: 'Appointments', icon: CalendarCheck },
  ],
}

const procedureSection: Section = {
  label: 'PROCEDURES',
  items: [
    { to: '/aesthetic/procedure-catalog', label: 'Procedure Catalog', icon: Sparkles },
    { to: '/aesthetic/patients', label: 'Patients', icon: Users },
    { to: '/aesthetic/consent-templates', label: 'Consent Templates', icon: FileText },
  ],
}

const inventorySection: Section = {
  label: 'INVENTORY / SUPPLY CHAIN',
  items: [
    { to: '/aesthetic/inventory', label: 'Inventory', icon: Boxes },
    { to: '/aesthetic/suppliers', label: 'Suppliers', icon: Truck },
    { to: '/aesthetic/purchase-history', label: 'Purchase History', icon: History },
    { to: '/aesthetic/supplier-returns', label: 'Supplier Returns', icon: FileText },
    { to: '/aesthetic/return-history', label: 'Return History', icon: History },
  ],
}

const doctorSection: Section = {
  label: 'DOCTOR MANAGEMENT',
  items: [
    { to: '/aesthetic/doctor-management', label: 'Doctor Management', icon: Users },
    { to: '/aesthetic/doctor-schedules', label: 'Doctor Schedules', icon: CalendarDays },
    { to: '/aesthetic/doctor-finance', label: 'Doctor Finance', icon: Wallet },
    { to: '/aesthetic/doctor-payouts', label: 'Doctor Payouts', icon: CreditCard },
  ],
}

const staffSection: Section = {
  label: 'STAFF MANAGEMENT',
  items: [
    { to: '/aesthetic/staff-management', label: 'Staff Management', icon: UserCog },
    { to: '/aesthetic/staff-attendance', label: 'Staff Attendance', icon: CalendarCheck },
    { to: '/aesthetic/staff-monthly', label: 'Staff Monthly', icon: CalendarDays },
    { to: '/aesthetic/staff-settings', label: 'Staff Settings', icon: Cog },
  ],
}

const financeSection: Section = {
  label: 'FINANCE',
  items: [
    { to: '/aesthetic/expenses', label: 'Expenses', icon: Receipt },
  ],
}

const reportingSection: Section = {
  label: 'REPORTING',
  items: [
    { to: '/aesthetic/reports', label: 'Reports', icon: FileText },
    { to: '/aesthetic/notifications', label: 'Notifications', icon: Bell },
  ],
}

const adminSection: Section = {
  label: 'ADMIN',
  items: [
    { to: '/aesthetic/user-management', label: 'User Management', icon: UserCog },
    { to: '/aesthetic/sidebar-permissions', label: 'Sidebar Permissions', icon: Cog },
    { to: '/aesthetic/audit-logs', label: 'Audit Logs', icon: ScrollText },
    { to: '/aesthetic/settings', label: 'Settings', icon: Cog },
  ],
}

const dashboardItem: NavItem = { to: '/aesthetic', label: 'Dashboard', icon: LayoutDashboard, end: true }

const allSections: Section[] = [
  tokenSection,
  procedureSection,
  inventorySection,
  doctorSection,
  staffSection,
  financeSection,
  reportingSection,
  adminSection,
]

// Flat array of all nav items for permissions management
export const aestheticSidebarNav: NavItem[] = [
  dashboardItem,
  ...allSections.flatMap(s => s.items),
]

export default function Aesthetic_Sidebar({ collapsed = false }: { collapsed?: boolean }) {
  const navigate = useNavigate()
  const [role, setRole] = useState<string>('admin')
  const [permMap, setPermMap] = useState<Map<string, any>>(new Map())
  const width = collapsed ? 'md:w-16' : 'md:w-72'

  useEffect(() => {
    try {
      const raw = localStorage.getItem('aesthetic.session')
      if (raw) {
        const s = JSON.parse(raw || '{}')
        if (s?.role) setRole(String(s.role).toLowerCase())
      }
    } catch {}
  }, [])

  useEffect(() => {
    let mounted = true
    ;(async () => {
      try {
        const res: any = await (aestheticApi as any).listSidebarPermissions(role)
        const doc = Array.isArray(res) ? res[0] : res
        const map = new Map<string, any>()
        const perms = (doc?.permissions || []) as Array<{ path: string; visible?: boolean; order?: number }>
        for (const p of perms) map.set(p.path, p)
        if (mounted) setPermMap(map)
      } catch { if (mounted) setPermMap(new Map()) }
    })()
    return () => { mounted = false }
  }, [role])

  const logout = async () => {
    try { await aestheticApi.logout() } catch {}
    try {
      localStorage.removeItem('aesthetic.session')
      localStorage.removeItem('aesthetic.token')
      localStorage.removeItem('token')
    } catch {}
    navigate('/aesthetic/login')
  }

  const canShow = (path: string) => {
    if (path === '/aesthetic/sidebar-permissions' && String(role || '').toLowerCase() !== 'admin') return false
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
