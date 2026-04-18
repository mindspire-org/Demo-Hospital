import { NavLink, useNavigate } from 'react-router-dom'
import { labApi } from '../../utils/api'
import { useEffect, useState } from 'react'
import type { LucideIcon } from 'lucide-react'
import {
  LayoutDashboard,
  CalendarDays,
  ClipboardPlus,
  Clock,
  ListChecks,
  FileText,
  FlaskConical,
  BarChart3,
  PieChart,
  Receipt,
  Boxes,
  Building2,
  Truck,
  FilePlus,
  History,
  Undo2,
  RotateCcw,
  Droplets,
  PackageOpen,
  UserPlus,
  Users,
  CalendarCheck,
  Settings as Cog,
  UserCog,
  ScrollText,
  Wallet,
  Calculator,
  LogOut,
  Building,
  TrendingUp,
  CreditCard,
} from 'lucide-react'

type NavItem = { to: string; label: string; end?: boolean; icon: LucideIcon }

type Section = {
  label: string
  items: NavItem[]
}

const tokenSection: Section = {
  label: 'TOKEN MANAGEMENT',
  items: [
    { to: '/lab/orders', label: 'Token Generation', icon: ClipboardPlus },
    { to: '/lab/today-tokens', label: "Today's Tokens", icon: Clock },
    { to: '/lab/appointments', label: 'Appointments', icon: CalendarDays },
    { to: '/lab/referrals', label: 'Referrals', icon: ListChecks },
   { to: '/lab/pay-in-out', label: 'Pay In / Out', icon: Wallet },
    { to: '/lab/manager-cash-count', label: 'Manager Cash Count', icon: Calculator },
  ],
}

const testSection: Section = {
  label: 'TEST MANAGEMENT',
  items: [
    { to: '/lab/tests', label: 'Test Catalog', icon: FlaskConical },
    { to: '/lab/tracking', label: 'Sample Tracking', icon: ListChecks },
    { to: '/lab/barcodes', label: 'Barcodes', icon: FileText },
    { to: '/lab/results', label: 'Result Entry', icon: FileText },
    { to: '/lab/report-approval', label: 'Report Approval', icon: FileText },
    { to: '/lab/reports', label: 'Reports Generator', icon: BarChart3 },
  ],
}

const financeSection: Section = {
  label: 'FINANCE',
  items: [
    { to: '/lab/income-ledger', label: 'Income Ledger', icon: Receipt },
     { to: '/lab/collection-centers', label: 'Collection Centers', icon: Building },
    { to: '/lab/center-revenue', label: 'Center Revenue', icon: TrendingUp },
    { to: '/lab/center-payments', label: 'Center Payments', icon: CreditCard },
    { to: '/lab/expenses', label: 'Expenses', icon: Receipt },
    
    { to: '/lab/reports-summary', label: 'Reports', icon: PieChart },
  ],
}

const inventorySection: Section = {
  label: 'INVENTORY / SUPPLY CHAIN',
  items: [
    { to: '/lab/inventory', label: 'Inventory', icon: Boxes },
    { to: '/lab/companies', label: 'Companies', icon: Building2 },
    { to: '/lab/suppliers', label: 'Suppliers', icon: Truck },
    { to: '/lab/purchase-orders', label: 'Purchase Orders', icon: FilePlus },
    { to: '/lab/purchase-history', label: 'Purchase History', icon: History },
    { to: '/lab/supplier-returns', label: 'Supplier Returns', icon: Undo2 },
    { to: '/lab/return-history', label: 'Return History', icon: RotateCcw },
  ],
}

const bloodBankSection: Section = {
  label: 'BLOOD BANK',
  items: [
    { to: '/lab/bb/donors', label: 'Donors', icon: UserPlus },
    { to: '/lab/bb/inventory', label: 'Inventory', icon: PackageOpen },
    { to: '/lab/bb/receivers', label: 'Receivers', icon: Droplets },
  ],
}

const staffSection: Section = {
  label: 'STAFF MANAGEMENT',
  items: [
    { to: '/lab/staff-management', label: 'Staff Management', icon: Users },
    { to: '/lab/staff-attendance', label: 'Staff Attendance', icon: CalendarCheck },
    { to: '/lab/staff-monthly', label: 'Staff Monthly', icon: CalendarDays },
    { to: '/lab/staff-settings', label: 'Staff Settings', icon: Cog },
  ],
}

const adminSection: Section = {
  label: 'ADMIN',
  items: [
    { to: '/lab/user-management', label: 'User Management', icon: UserCog },
    { to: '/lab/sidebar-permissions', label: 'Sidebar Permissions', icon: Cog },
    { to: '/lab/audit-logs', label: 'Audit Logs', icon: ScrollText },
    { to: '/lab/settings', label: 'Settings', icon: Cog },
  ],
}

const dashboardItem: NavItem = { to: '/lab', label: 'Dashboard', icon: LayoutDashboard, end: true }

const allSections: Section[] = [
  tokenSection,
  testSection,
  financeSection,
  inventorySection,
  bloodBankSection,
  staffSection,
  adminSection,
]

// Flat array of all nav items for permissions management
export const labSidebarNav: NavItem[] = [
  dashboardItem,
  ...allSections.flatMap(s => s.items),
]

export default function Lab_Sidebar({ collapsed = false }: { collapsed?: boolean }) {
  const navigate = useNavigate()
  const [role, setRole] = useState<string>('admin')
  const [permMap, setPermMap] = useState<Map<string, any>>(new Map())
  const width = collapsed ? 'md:w-16' : 'md:w-72'

  useEffect(()=>{
    try {
      const raw = localStorage.getItem('lab.session') || localStorage.getItem('user')
      if (raw){
        const u = JSON.parse(raw)
        if (u?.role) setRole(String(u.role).toLowerCase())
      }
    } catch {}
  }, [])

  useEffect(()=>{
    let mounted = true
    ;(async()=>{
      try {
        const res: any = await labApi.listSidebarPermissions(role)
        const doc = Array.isArray(res) ? res[0] : res
        const map = new Map<string, any>()
        const perms = (doc?.permissions || []) as Array<{ path: string; visible?: boolean; order?: number }>
        for (const p of perms) map.set(p.path, p)
        if (mounted) setPermMap(map)
      } catch { if (mounted) setPermMap(new Map()) }
    })()
    return ()=>{ mounted = false }
  }, [role])

  const canShow = (path: string) => {
    if (path === '/lab/sidebar-permissions' && String(role||'').toLowerCase() !== 'admin') return false
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
      <div className={collapsed ? 'p-2' : 'p-3'}>
        <button
          onClick={async () => {
            try { await labApi.logoutUser() } catch {}
            try { localStorage.removeItem('lab.session') } catch {}
            navigate('/lab/login')
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
