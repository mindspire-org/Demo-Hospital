import { NavLink, useNavigate } from 'react-router-dom'
import { financeApi } from '../../utils/api'
import { useEffect, useState } from 'react'
import type { LucideIcon } from 'lucide-react'
import {
  LogOut,
  BarChart3,
  FlaskConical,
  LayoutDashboard,
  Users,
  Activity,
  FileText,
  BookOpen,
  Settings,
  CreditCard,
  Calculator,
  Receipt,
  TrendingUp,
  PieChart,
  DollarSign,
  Repeat,
  Shield,
  Landmark,
  Printer,
  CalendarClock,
  Clock,
} from 'lucide-react'

type NavItem = { to: string; label: string; end?: boolean; icon: LucideIcon }

type Section = {
  label: string
  items: NavItem[]
}

const accountingSection: Section = {
  label: 'ACCOUNTING',
  items: [
    { to: '/finance/chart-of-accounts', label: 'Chart of Accounts', icon: BookOpen },
    { to: '/finance/vouchers', label: 'Vouchers', icon: Receipt },
    { to: '/finance/recurring-vouchers', label: 'Recurring Vouchers', icon: Repeat },
    { to: '/finance/accounts-ledger', label: 'Accounts Ledger', icon: Calculator },
    { to: '/finance/transactions', label: 'Transactions', icon: CreditCard },
    { to: '/finance/voucher-print', label: 'Voucher Print', icon: Printer },
  ],
}

const shiftsSection: Section = {
  label: 'SHIFTS',
  items: [
    { to: '/finance/shift-reports', label: 'Shift Reports', icon: Clock },
    { to: '/finance/shift-settings', label: 'Shift Settings', icon: Settings },
  ],
}

const budgetControlSection: Section = {
  label: 'BUDGET & CONTROL',
  items: [
    { to: '/finance/budgets', label: 'Budgets', icon: PieChart },
    { to: '/finance/approval-queue', label: 'Approval Queue', icon: Shield },
    { to: '/finance/fiscal-periods', label: 'Fiscal Periods', icon: CalendarClock },
    { to: '/finance/bank-reconciliation', label: 'Bank Reconciliation', icon: Landmark },  
  ],
}

 

const financialReportsSection: Section = {
  label: 'FINANCIAL REPORTS',
  items: [
    { to: '/finance/trial-balance', label: 'Trial Balance', icon: TrendingUp },
    { to: '/finance/profit-loss', label: 'Profit & Loss', icon: PieChart },
    { to: '/finance/balance-sheet', label: 'Balance Sheet', icon: DollarSign },
    { to: '/finance/cash-flow', label: 'Cash Flow', icon: Activity },
  ],
}

const reportsSection: Section = {
  label: 'MODULE REPORTS',
  items: [
    { to: '/finance/pharmacy-reports', label: 'Pharmacy Reports', icon: BarChart3 },
    { to: '/finance/lab-reports', label: 'Lab Reports', icon: FlaskConical },
    { to: '/finance/diagnostics-dashboard', label: 'Diagnostics Dashboard', icon: LayoutDashboard },
    { to: '/finance/staff-dashboard', label: 'Staff Dashboard', icon: Users },
    { to: '/finance/hospital-dashboard', label: 'Hospital Dashboard', icon: Activity },
  ],
}

const adminSection: Section = {
  label: 'ADMIN',
  items: [
    { to: '/finance/audit-logs', label: 'Audit Logs', icon: FileText },
    { to: '/finance/sidebar-permissions', label: 'Sidebar Permissions', icon: Settings },
    { to: '/finance/user-management', label: 'User Management', icon: Users },
  ],
}

const dashboardSection: Section = {
  label: 'HOME',
  items: [
    { to: '/finance/dashboard', label: 'Dashboard', icon: LayoutDashboard, end: true },
  ],
}

const allSections: Section[] = [
  dashboardSection,
  accountingSection,
  shiftsSection,
  budgetControlSection,
  financialReportsSection,
  reportsSection,
  adminSection,
]

// Flat array of all nav items for permissions management
export const financeSidebarNav: NavItem[] = allSections.flatMap(s => s.items)

export default function Finance_Sidebar({ collapsed = false }: { collapsed?: boolean }) {
  const navigate = useNavigate()
  const [role, setRole] = useState<string>('admin')
  const [permMap, setPermMap] = useState<Map<string, any>>(new Map())
  const width = collapsed ? 'md:w-16' : 'md:w-72'

  useEffect(() => {
    try {
      const raw = localStorage.getItem('finance.session') || localStorage.getItem('user')
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
        const res: any = await financeApi.listSidebarPermissions(role)
        const doc = Array.isArray(res) ? res[0] : res
        const map = new Map<string, any>()
        const perms = (doc?.permissions || []) as Array<{ path: string; visible?: boolean; order?: number }>
        for (const p of perms) map.set(p.path, p)
        if (mounted) setPermMap(map)
      } catch { if (mounted) setPermMap(new Map()) }
    })()
    return () => { mounted = false }
  }, [role])

  const canShow = (_path: string) => {
    // All modules visible — permissions disabled
    return true
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
        className={({ isActive }) => {
          const base = collapsed
            ? 'group relative flex items-center justify-center rounded-lg p-2 text-[13px] font-medium transition-all duration-150'
            : 'group relative flex items-center gap-2.5 rounded-lg px-3 py-[7px] text-[13px] font-medium transition-all duration-150'
          const active = isActive
            ? 'bg-slate-900 text-white shadow-sm shadow-slate-900/20 dark:bg-slate-800 dark:text-white dark:shadow-none'
            : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800/50 dark:hover:text-slate-200'
          return `${base} ${active}`
        }}
        end={item.end}
      >
        {({ isActive }) => (
          <>
            <Icon className={collapsed ? 'h-[18px] w-[18px] shrink-0' : 'h-4 w-4 shrink-0'} />
            {!collapsed && <span className="truncate">{item.label}</span>}
            {collapsed && isActive && (
              <span className="absolute -left-0.5 top-1/2 -translate-y-1/2 h-4 w-[3px] rounded-r-full bg-white" />
            )}
          </>
        )}
      </NavLink>
    )
  }

  const renderSection = (section: Section) => {
    const visibleItems = section.items.filter(i => canShow(i.to)).sort(byOrder)
    if (visibleItems.length === 0) return null

    if (collapsed) {
      return (
        <div key={section.label} className="space-y-1">
          {visibleItems.map(renderNavItem)}
        </div>
      )
    }

    return (
      <div key={section.label} className="rounded-lg bg-slate-50/60 dark:bg-slate-800/30">
        <div className="flex items-center gap-2 px-3 py-2 text-[11px] font-bold uppercase tracking-[0.08em] text-slate-400 dark:text-slate-500">
          <span className="flex-1">{section.label}</span>
        </div>
        <div className="space-y-0.5 px-1.5 pb-1.5">
          {visibleItems.map(renderNavItem)}
        </div>
      </div>
    )
  }

  return (
    <aside
      className={`hidden md:flex ${width} md:flex-none md:shrink-0 md:sticky md:top-14 md:h-[calc(100dvh-3.5rem)] md:flex-col border-r border-slate-200/80 bg-white dark:bg-[#0b1220] dark:border-slate-800/80`}
    >
      <nav className={`flex-1 overflow-y-auto overflow-x-hidden ${collapsed ? 'p-2 space-y-2' : 'p-3 space-y-2'}`}>
        {/* All sections */}
        {allSections.map(renderSection)}
      </nav>

      {/* Footer */}
      <div className={`border-t border-slate-200/60 dark:border-slate-800/60 ${collapsed ? 'p-2 space-y-1.5' : 'p-3 space-y-1.5'}`}>
        <button
          onClick={async () => {
            try { await financeApi.logout() } catch {}
            try { localStorage.removeItem('finance.session') } catch {}
            navigate('/finance/login')
          }}
          title={collapsed ? 'Logout' : undefined}
          className={`w-full flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-[13px] font-medium text-slate-500 transition-all duration-150 hover:bg-rose-50 hover:text-rose-600 dark:text-slate-400 dark:hover:bg-rose-900/20 dark:hover:text-rose-400 ${collapsed ? 'p-2.5' : ''}`}
          aria-label="Logout"
        >
          <LogOut className="h-4 w-4 shrink-0" />
          {!collapsed && <span>Logout</span>}
        </button>
      </div>
    </aside>
  )
}

