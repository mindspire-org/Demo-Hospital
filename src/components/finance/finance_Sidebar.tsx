/**
 * Finance ERP sidebar — matches the ERP mockups.
 *
 * Structure:
 *   Dashboard
 *   General Ledger       (collapsible)
 *   Receivables          (collapsible)
 *   Payables             (collapsible)
 *   Expenses
 *   Payroll & HR         (collapsible)
 *   Module Integrations  (collapsible)
 *   Reconciliation
 *   Audit Logs
 *   Sidebar Permissions
 *   User Management
 *   Settings
 *
 * Each top-level item is rendered as a NavLink. Collapsible groups have a
 * chevron; expansion is purely visual (no persisted state).
 */

import { NavLink, useNavigate } from 'react-router-dom'
import { financeApi } from '../../utils/api'
import { useEffect, useMemo, useState } from 'react'
import type { LucideIcon } from 'lucide-react'
import PortalSwitcher from '../PortalSwitcher'
import {
  LogOut,
  LayoutDashboard,
  BookOpen,
  FileText,
  Scale,
  TrendingUp,
  ScrollText,
  Wallet,
  Receipt,
  HandCoins,
  ShoppingBag,
  Banknote,
  Clock,
  Users,
  UserCircle,
  Settings,
  Activity,
  Stethoscope,
  FlaskConical,
  Pill,
  ScanLine,
  Sparkles,
  Workflow,
  Repeat,
  ShieldCheck,
  Library,
  ClipboardList,
  ChevronDown,
} from 'lucide-react'

type NavItem = { to: string; label: string; end?: boolean; icon: LucideIcon }

type Section =
  | { type: 'item'; item: NavItem }
  | { type: 'group'; label: string; icon: LucideIcon; items: NavItem[] }

// ---------------------------------------------------------------------------
// sidebar definition (drives the whole menu)
// ---------------------------------------------------------------------------

const SECTIONS: Section[] = [
  { type: 'item', item: { to: '/finance', label: 'Dashboard', icon: LayoutDashboard, end: true } },

  { type: 'group', label: 'General Ledger', icon: BookOpen, items: [
    { to: '/finance/chart-of-accounts', label: 'Chart of Accounts', icon: Library },
    { to: '/finance/journal-vouchers',  label: 'Journal Vouchers',  icon: ScrollText },
    { to: '/finance/ledger-explorer',   label: 'Ledger Explorer',   icon: FileText },
    { to: '/finance/trial-balance',     label: 'Trial Balance',     icon: Scale },
    { to: '/finance/profit-loss',       label: 'Profit & Loss',     icon: TrendingUp },
    { to: '/finance/balance-sheet',     label: 'Balance Sheet',     icon: BookOpen },
    { to: '/finance/petty-cash',        label: 'Petty Cash',        icon: Wallet },
  ] },

  { type: 'group', label: 'Receivables', icon: HandCoins, items: [
    { to: '/finance/receivables/patient',   label: 'Patient AR',    icon: Users },
    // { to: '/finance/receivables/corporate', label: 'Corporate AR',  icon: Building2 },
    { to: '/finance/receivables/aging',     label: 'AR Aging',      icon: Clock },
  ] },

  { type: 'group', label: 'Payables', icon: Receipt, items: [
    { to: '/finance/vendors',          label: 'Vendors',         icon: Users },
    { to: '/finance/bills',            label: 'Bills / Purchases', icon: ShoppingBag },
    { to: '/finance/vendor-payments',  label: 'Vendor Payments', icon: Banknote },
    { to: '/finance/payables/aging',   label: 'Aging',           icon: Clock },
  ] },

  { type: 'item', item: { to: '/finance/expenses', label: 'Expenses', icon: Receipt } },

  { type: 'group', label: 'Payroll & HR', icon: Users, items: [
    { to: '/finance/payroll/staff',               label: 'Staff Payroll',        icon: UserCircle },
    { to: '/finance/payroll/doctors',             label: 'Doctor Payroll',       icon: Stethoscope },
    { to: '/finance/payroll/attendance',          label: 'Attendance Finance',   icon: Clock },
    { to: '/finance/payroll/earnings-deductions', label: 'Earnings / Deductions', icon: ClipboardList },
  ] },

  { type: 'group', label: 'Module Integrations', icon: Workflow, items: [
    { to: '/finance/integrations/opd',        label: 'OPD',         icon: Activity },
    { to: '/finance/integrations/ipd',        label: 'IPD',         icon: Stethoscope },
    { to: '/finance/integrations/lab',        label: 'Lab',         icon: FlaskConical },
    { to: '/finance/integrations/pharmacy',   label: 'Pharmacy',    icon: Pill },
    { to: '/finance/integrations/diagnostic', label: 'Diagnostics', icon: ScanLine },
    { to: '/finance/integrations/aesthetic',  label: 'Aesthetic',   icon: Sparkles },
  ] },

  { type: 'item', item: { to: '/finance/reconciliation',      label: 'Reconciliation',      icon: Repeat } },
  { type: 'item', item: { to: '/finance/audit-logs',          label: 'Audit Logs',          icon: FileText } },
  { type: 'item', item: { to: '/finance/sidebar-permissions', label: 'Sidebar Permissions', icon: ShieldCheck } },
  { type: 'item', item: { to: '/finance/user-management',     label: 'User Management',     icon: Users } },
  { type: 'item', item: { to: '/finance/settings',            label: 'Settings',            icon: Settings } },
]

// Flat list of every NavItem (used by Sidebar Permissions admin page).
export const financeSidebarNav: NavItem[] = SECTIONS.flatMap(s =>
  s.type === 'item' ? [s.item] : s.items
)

// ---------------------------------------------------------------------------
// component
// ---------------------------------------------------------------------------

export default function Finance_Sidebar({ collapsed = false }: { collapsed?: boolean }) {
  const navigate = useNavigate()
  const [role, setRole] = useState<string>('admin')
  const [permMap, setPermMap] = useState<Map<string, any>>(new Map())
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({
    'General Ledger': true,
    'Receivables': false,
    'Payables': false,
    'Payroll & HR': false,
    'Module Integrations': false,
  })
  const width = collapsed ? 'md:w-16' : 'md:w-72'

  useEffect(() => {
    try {
      const raw = localStorage.getItem('finance.session') || localStorage.getItem('user')
      if (raw){ const u = JSON.parse(raw); if (u?.role) setRole(String(u.role).toLowerCase()) }
    } catch {}
  }, [])

  useEffect(() => {
    let mounted = true
    ;(async () => {
      try {
        const res: any = await financeApi.listSidebarPermissions(role)
        const doc = Array.isArray(res) ? res[0] : res
        const map = new Map<string, any>()
        for (const p of (doc?.permissions || [])) map.set(p.path, p)
        if (mounted) setPermMap(map)
      } catch { if (mounted) setPermMap(new Map()) }
    })()
    return () => { mounted = false }
  }, [role])

  const canShow = (path: string) => {
    if (path === '/finance/sidebar-permissions' && role.toLowerCase() !== 'admin') return false
    const perm = permMap.get(path)
    return perm ? perm.visible !== false : true
  }

  const byOrder = (a: NavItem, b: NavItem) => {
    const oa = permMap.get(a.to)?.order ?? Number.MAX_SAFE_INTEGER
    const ob = permMap.get(b.to)?.order ?? Number.MAX_SAFE_INTEGER
    return oa - ob
  }

  const sections = useMemo(() => SECTIONS.map(s => {
    if (s.type === 'item') return s
    return { ...s, items: s.items.filter(i => canShow(i.to)).sort(byOrder) }
  }).filter(s => s.type === 'item' ? canShow(s.item.to) : s.items.length > 0),
    [permMap, role]) // eslint-disable-line react-hooks/exhaustive-deps

  // --------------------------------------------------------------------- rendering

  const renderNavItem = (item: NavItem, nested = false) => {
    const Icon = item.icon
    return (
      <NavLink
        key={item.to}
        to={item.to}
        end={item.end}
        title={collapsed ? item.label : undefined}
        className={({ isActive }) => {
          const base = collapsed
            ? 'rounded-md p-2 text-sm font-medium flex items-center justify-center'
            : `rounded-md ${nested ? 'pl-9 pr-3' : 'px-3'} py-2 text-sm font-medium flex items-center gap-2`
          const active = isActive
            ? 'text-white'
            : 'text-slate-700 hover:bg-slate-50 hover:text-slate-900 dark:text-slate-200 dark:hover:bg-slate-800'
          return `${base} ${active}`
        }}
        style={({ isActive }) => (isActive ? ({ background: 'linear-gradient(180deg, var(--navy) 0%, var(--navy-700) 100%)' } as any) : undefined)}
      >
        {({ isActive }) => (
          <>
            <Icon className={collapsed ? 'h-5 w-5' : 'h-4 w-4'} style={{ color: isActive ? '#fff' : undefined }} />
            {!collapsed && <span className="truncate">{item.label}</span>}
          </>
        )}
      </NavLink>
    )
  }

  const renderSection = (s: Section) => {
    if (s.type === 'item') return renderNavItem(s.item)
    const Icon = s.icon
    const open = !!openGroups[s.label]
    if (collapsed){
      // In collapsed mode show each child as icon-only directly
      return (
        <div key={s.label} className="space-y-1">
          {s.items.map(i => renderNavItem(i))}
        </div>
      )
    }
    return (
      <div key={s.label} className="space-y-1">
        <button
          type="button"
          onClick={() => setOpenGroups(prev => ({ ...prev, [s.label]: !open }))}
          className="w-full flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-800"
          aria-expanded={open}
        >
          <Icon className="h-4 w-4" />
          <span className="flex-1 text-left truncate">{s.label}</span>
          <ChevronDown className={`h-4 w-4 transition-transform ${open ? 'rotate-180' : ''}`} />
        </button>
        {open && <div className="space-y-1">{s.items.map(i => renderNavItem(i, true))}</div>}
      </div>
    )
  }

  return (
    <aside className={`hidden md:flex ${width} md:flex-none md:shrink-0 md:sticky md:top-14 md:h-[calc(100dvh-3.5rem)] md:flex-col md:border-r bg-white/80 backdrop-blur-md shadow-sm dark:bg-slate-900/60 dark:border-slate-700`}>
      <nav className={`flex-1 overflow-y-auto overflow-x-hidden ${collapsed ? 'p-2' : 'p-3'} space-y-1`}>
        {sections.map(renderSection)}
      </nav>
      <div className={collapsed ? 'p-2 space-y-2' : 'p-3 space-y-2'}>
        {String(role || '').toLowerCase() === 'admin' ? <PortalSwitcher compact={collapsed} /> : null}
        <button
          onClick={async () => {
            try { await financeApi.logout() } catch {}
            try { localStorage.removeItem('finance.session') } catch {}
            navigate('/finance/login')
          }}
          title={collapsed ? 'Logout' : undefined}
          className={collapsed ? 'w-full inline-flex items-center justify-center rounded-md p-2 text-sm font-medium' : 'w-full inline-flex items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-medium'}
          style={{ color: 'var(--navy)', border: '1px solid var(--navy)', backgroundColor: '#fff' }}
          aria-label="Logout"
        >
          <LogOut className="h-4 w-4" />
          {!collapsed && <span>Logout</span>}
        </button>
      </div>
    </aside>
  )
}
