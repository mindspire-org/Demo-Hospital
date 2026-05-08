import { NavLink, useNavigate, useLocation } from 'react-router-dom'
import { labApi } from '../../utils/api'
import { useEffect, useState, useCallback } from 'react'
import type { LucideIcon } from 'lucide-react'
import {
  LayoutDashboard,
  CalendarDays,
  ClipboardPlus,
  Clock,
  FlaskConical,
  BarChart3,
  PieChart,
  Receipt,
  Boxes,
  Building2,
  Truck,
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
  Calculator,
  LogOut,
  Building,
  TrendingUp,
  CreditCard,
  QrCode,
  FileCheck,
  FileBarChart,
  Siren,
  IdCard,
  ArrowRightLeft,
  ClipboardList,
  ArrowDownUp,
  ChevronDown,
  ChevronRight,
  BookOpen,
  Banknote,
  HandCoins,
  CircleDollarSign,
  Warehouse,
  Package,
  TruckIcon,
  ShoppingCart,
  Droplet,
  FileSpreadsheet,
  Scale,
  Shield,
  Eye,
} from 'lucide-react'

type NavItem = { to: string; label: string; end?: boolean; icon: LucideIcon }

type Section = {
  label: string
  icon: LucideIcon
  items: NavItem[]
}

const tokenSection: Section = {
  label: 'Registration',
  icon: ClipboardPlus,
  items: [
    { to: '/lab/orders', label: 'Token Generation', icon: ClipboardPlus },
    { to: '/lab/today-tokens', label: "Today's Tokens", icon: Clock },
    { to: '/lab/appointments', label: 'Appointments', icon: CalendarDays },
    { to: '/lab/referrals', label: 'Referrals', icon: ArrowRightLeft },
    { to: '/lab/pay-in-out', label: 'Pay In / Out', icon: HandCoins },
    { to: '/lab/manager-cash-count', label: 'Manager Cash Count', icon: Calculator },
  ],
}

const testSection: Section = {
  label: 'Lab Operations',
  icon: FlaskConical,
  items: [
    { to: '/lab/tests', label: 'Test Catalog', icon: FlaskConical },
    { to: '/lab/tracking', label: 'Sample Tracking', icon: ClipboardList },
    { to: '/lab/barcodes', label: 'Barcodes', icon: QrCode },
    { to: '/lab/results', label: 'Result Entry', icon: FileCheck },
    { to: '/lab/report-approval', label: 'Report Approval', icon: Eye },
    { to: '/lab/reports', label: 'Reports Generator', icon: FileBarChart },
    { to: '/lab/critical-values', label: 'Critical Values', icon: Siren },
    { to: '/lab/test-packages', label: 'Test Packages', icon: PackageOpen },
    { to: '/lab/patient-cards', label: 'Patient Cards', icon: IdCard },
    { to: '/lab/ward-imports', label: 'Ward Imports', icon: ArrowDownUp },
    { to: '/lab/outsource-labs', label: 'Outsource Labs', icon: Truck },
    { to: '/lab/outsource-rates', label: 'Outsource Rate List', icon: CircleDollarSign },
    { to: '/lab/outsource-dispatch', label: 'Outsource Dispatch', icon: TruckIcon },
    { to: '/lab/total-tests', label: 'Total Tests', icon: BarChart3 },
    { to: '/lab/tat', label: 'Turn Around Time', icon: Clock },
  ],
}

const financeSection: Section = {
  label: 'Finance',
  icon: Banknote,
  items: [
    { to: '/lab/income-ledger', label: 'Income Ledger', icon: BookOpen },
    { to: '/lab/collection-centers', label: 'Collection Centers', icon: Building },
    { to: '/lab/center-revenue', label: 'Center Revenue', icon: TrendingUp },
    { to: '/lab/center-payments', label: 'Center Payments', icon: CreditCard },
    { to: '/lab/center-rate-list', label: 'Center Rate List', icon: Receipt },
    { to: '/lab/expenses', label: 'Expenses', icon: Banknote },
    { to: '/lab/reports-summary', label: 'Reports', icon: PieChart },
    { to: '/lab/daily-worksheet', label: 'Daily Worksheet', icon: FileSpreadsheet },
    { to: '/lab/main-register', label: 'Main Register', icon: ScrollText },
  ],
}

const inventorySection: Section = {
  label: 'Inventory',
  icon: Warehouse,
  items: [
    { to: '/lab/inventory', label: 'Inventory', icon: Boxes },
    { to: '/lab/companies', label: 'Companies', icon: Building2 },
    { to: '/lab/suppliers', label: 'Suppliers', icon: Truck },
    { to: '/lab/purchase-orders', label: 'Purchase Orders', icon: ShoppingCart },
    { to: '/lab/purchase-history', label: 'Purchase History', icon: History },
    { to: '/lab/supplier-returns', label: 'Supplier Returns', icon: Undo2 },
    { to: '/lab/return-history', label: 'Return History', icon: RotateCcw },
  ],
}

const bloodBankSection: Section = {
  label: 'Blood Bank',
  icon: Droplet,
  items: [
    { to: '/lab/bb/donors', label: 'Donors', icon: UserPlus },
    { to: '/lab/bb/inventory', label: 'Inventory', icon: Package },
    { to: '/lab/bb/receivers', label: 'Receivers', icon: Droplets },
  ],
}

const staffSection: Section = {
  label: 'Staff',
  icon: Users,
  items: [
    { to: '/lab/staff-management', label: 'Staff Management', icon: Users },
    { to: '/lab/staff-attendance', label: 'Staff Attendance', icon: CalendarCheck },
    { to: '/lab/staff-monthly', label: 'Staff Monthly', icon: CalendarDays },
    { to: '/lab/staff-settings', label: 'Staff Settings', icon: Cog },
  ],
}

const adminSection: Section = {
  label: 'Admin',
  icon: Shield,
  items: [
    { to: '/lab/user-management', label: 'User Management', icon: UserCog },
    { to: '/lab/sidebar-permissions', label: 'Sidebar Permissions', icon: Scale },
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
  const location = useLocation()
  const [role, setRole] = useState<string>('admin')
  const [permMap, setPermMap] = useState<Map<string, any>>(new Map())
  const [collapsedSections, setCollapsedSections] = useState<Set<string>>(new Set())
  const width = collapsed ? 'md:w-[68px]' : 'md:w-[260px]'

  useEffect(() => {
    try {
      const raw = localStorage.getItem('lab.session') || localStorage.getItem('user')
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
        const res: any = await labApi.listSidebarPermissions(role)
        const doc = Array.isArray(res) ? res[0] : res
        const map = new Map<string, any>()
        const perms = (doc?.permissions || []) as Array<{ path: string; visible?: boolean; order?: number }>
        for (const p of perms) map.set(p.path, p)
        if (mounted) setPermMap(map)
      } catch { if (mounted) setPermMap(new Map()) }
    })()
    return () => { mounted = false }
  }, [role])

  const alwaysVisible = new Set([
    '/lab',
    '/lab/orders',
    '/lab/today-tokens',
    '/lab/appointments',
  ])

  const canShow = (path: string) => {
    if (alwaysVisible.has(path)) return true
    if (path === '/lab/sidebar-permissions' && String(role || '').toLowerCase() !== 'admin') return false
    const perm = permMap.get(path)
    return perm ? perm.visible !== false : true
  }

  const byOrder = (a: NavItem, b: NavItem) => {
    const oa = permMap.get(a.to)?.order ?? Number.MAX_SAFE_INTEGER
    const ob = permMap.get(b.to)?.order ?? Number.MAX_SAFE_INTEGER
    if (oa !== ob) return oa - ob
    return 0
  }

  const toggleSection = useCallback((label: string) => {
    setCollapsedSections(prev => {
      const next = new Set(prev)
      if (next.has(label)) next.delete(label)
      else next.add(label)
      return next
    })
  }, [])

  // Auto-expand section containing current route
  useEffect(() => {
    for (const s of allSections) {
      if (s.items.some(i => location.pathname.startsWith(i.to))) {
        setCollapsedSections(prev => {
          if (prev.has(s.label)) {
            const next = new Set(prev)
            next.delete(s.label)
            return next
          }
          return prev
        })
      }
    }
  }, [location.pathname])

  const renderNavItem = (item: NavItem) => {
    const Icon = item.icon
    return (
      <NavLink
        key={item.to}
        to={item.to}
        title={collapsed ? item.label : undefined}
        className={({ isActive }) => {
          if (collapsed) {
            return `group relative flex items-center justify-center rounded-lg p-2.5 transition-all duration-150 ${
              isActive
                ? 'bg-slate-900 text-white shadow-md shadow-slate-900/20'
                : 'text-slate-500 hover:bg-slate-100 hover:text-slate-700'
            }`
          }
          return `group relative flex items-center gap-2.5 rounded-lg px-3 py-[7px] text-[13px] font-medium transition-all duration-150 ${
            isActive
              ? 'bg-slate-900 text-white shadow-sm shadow-slate-900/20'
              : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
          }`
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

    const isCollapsed = collapsedSections.has(section.label)
    const SectionIcon = section.icon

    if (collapsed) {
      return (
        <div key={section.label} className="space-y-1">
          {visibleItems.map(renderNavItem)}
        </div>
      )
    }

    return (
      <div key={section.label} className="rounded-lg bg-slate-50/60">
        <button
          onClick={() => toggleSection(section.label)}
          className="flex w-full items-center gap-2 px-3 py-2 text-[11px] font-bold uppercase tracking-[0.08em] text-slate-400 hover:text-slate-600 transition-colors"
        >
          <SectionIcon className="h-3 w-3" />
          <span className="flex-1 text-left">{section.label}</span>
          {isCollapsed ? (
            <ChevronRight className="h-3 w-3" />
          ) : (
            <ChevronDown className="h-3 w-3" />
          )}
        </button>
        {!isCollapsed && (
          <div className="space-y-0.5 px-1.5 pb-1.5">
            {visibleItems.map(renderNavItem)}
          </div>
        )}
      </div>
    )
  }

  return (
    <aside
      className={`hidden md:flex ${width} md:flex-none md:shrink-0 md:sticky md:top-14 md:h-[calc(100dvh-3.5rem)] md:flex-col border-r border-slate-200/80 bg-white`}
    >
      <nav className={`flex-1 overflow-y-auto overflow-x-hidden ${collapsed ? 'p-2 space-y-2' : 'p-3 space-y-2'}`}>
        {/* Dashboard — always visible, special styling */}
        {canShow(dashboardItem.to) && (
          <div className={collapsed ? '' : 'mb-1'}>
            {renderNavItem(dashboardItem)}
          </div>
        )}

        {/* Divider */}
        <div className="mx-2 border-t border-slate-200/60" />

        {/* All sections */}
        {allSections.map(renderSection)}
      </nav>

      {/* Footer */}
      <div className={`border-t border-slate-200/60 ${collapsed ? 'p-2 space-y-1.5' : 'p-3 space-y-1.5'}`}>
        <button
          onClick={async () => {
            try { await labApi.logoutUser() } catch {}
            try { localStorage.removeItem('lab.session') } catch {}
            navigate('/lab/login')
          }}
          title={collapsed ? 'Logout' : undefined}
          className={`w-full flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-[13px] font-medium text-slate-500 transition-all duration-150 hover:bg-rose-50 hover:text-rose-600 ${
            collapsed ? 'p-2.5' : ''
          }`}
          aria-label="Logout"
        >
          <LogOut className="h-4 w-4 shrink-0" />
          {!collapsed && <span>Logout</span>}
        </button>
      </div>
    </aside>
  )
}
