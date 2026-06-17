import { NavLink, useNavigate } from 'react-router-dom'
import { pharmacyApi } from '../../utils/api'
import { useEffect, useState } from 'react'
import type { LucideIcon } from 'lucide-react'
import {
  LayoutDashboard,
  CreditCard,
  Boxes,
  Users,
  Truck,
  ReceiptText,
  ShoppingCart,
  RotateCcw,
  Settings,
  BarChart3,
  BookText,
  FileClock,
  Wallet,
  Users2,
  ClipboardCheck,
  Bell,
  LogOut,
} from 'lucide-react'

type NavItem = { to: string; label: string; end?: boolean; icon: LucideIcon }

type Section = {
  label: string
  items: NavItem[]
}

const posSection: Section = {
  label: 'POINT OF SALE',
  items: [
    { to: '/pharmacy/pos', label: 'Point of Sale', icon: CreditCard },
    { to: '/pharmacy/prescriptions', label: 'Prescription Intake', icon: ClipboardCheck },
    { to: '/pharmacy/sales-history', label: 'Sales History', icon: ReceiptText },
    { to: '/pharmacy/returns', label: 'Customer Return', icon: RotateCcw },
    { to: '/pharmacy/customers', label: 'Customers', icon: Users },
    { to: '/pharmacy/referrals', label: 'Referrals', icon: FileClock },
    { to: '/pharmacy/guidelines', label: 'Guidelines', icon: BookText },
    { to: '/pharmacy/notifications', label: 'Notifications', icon: Bell },
  ],
}

const inventorySection: Section = {
  label: 'INVENTORY / SUPPLY CHAIN',
  items: [
    { to: '/pharmacy/inventory', label: 'Inventory', icon: Boxes },
    { to: '/pharmacy/purchase-orders', label: 'Purchase Orders', icon: ShoppingCart },
    { to: '/pharmacy/purchase-history', label: 'Purchase History', icon: ShoppingCart },
    { to: '/pharmacy/suppliers', label: 'Suppliers', icon: Truck },
    { to: '/pharmacy/companies', label: 'Companies', icon: Users },
    { to: '/pharmacy/supplier-returns', label: 'Supplier Return', icon: RotateCcw },
    { to: '/pharmacy/return-history', label: 'Return History', icon: RotateCcw },
  ],
}

const financeSection: Section = {
  label: 'FINANCE',
  items: [
    { to: '/pharmacy/expenses', label: 'Expenses', icon: Wallet },
    { to: '/pharmacy/pay-in-out', label: 'Pay In/Out', icon: Wallet },
    { to: '/pharmacy/manager-cash-count', label: 'Manager Cash Count', icon: Wallet },
    { to: '/pharmacy/reports', label: 'Reports', icon: BarChart3 },
  ],
}

const adminSection: Section = {
  label: 'ADMIN',
  items: [
    { to: '/pharmacy/user-management', label: 'User Management', icon: Users2 },
    { to: '/pharmacy/sidebar-permissions', label: 'Sidebar Permissions', icon: Settings },
    { to: '/pharmacy/audit-logs', label: 'Audit Logs', icon: FileClock },
    { to: '/pharmacy/settings', label: 'Settings', icon: Settings },
  ],
}

const dashboardItem: NavItem = { to: '/pharmacy', label: 'Dashboard', icon: LayoutDashboard, end: true }

const allSections: Section[] = [
  posSection,
  inventorySection,
  financeSection,
  adminSection,
]

// Flat array of all nav items for permissions management
export const pharmacySidebarNav: NavItem[] = [
  dashboardItem,
  ...allSections.flatMap(s => s.items),
]

export default function Pharmacy_Sidebar({ collapsed = false }: { collapsed?: boolean }) {
  const navigate = useNavigate()
  const [role, setRole] = useState<string>('admin')
  const [username, setUsername] = useState<string>('')
  const [permMap, setPermMap] = useState<Map<string, any>>(new Map())
  const width = collapsed ? 'md:w-16' : 'md:w-72'

  useEffect(() => {
    try {
      const raw = localStorage.getItem('pharmacy.user') || localStorage.getItem('user')
      if (raw) {
        const u = JSON.parse(raw)
        if (u?.role) setRole(String(u.role).toLowerCase())
        if (u?.username) setUsername(String(u.username))
      }
    } catch {}
  }, [])

  useEffect(() => {
    let mounted = true
    ;(async () => {
      try {
        const res: any = await pharmacyApi.listSidebarPermissions(role)
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
        style={({ isActive }) => (isActive ? ({ background: 'linear-gradient(135deg, #e0f2fe 0%, #bae6fd 100%)' } as any) : undefined)}
        className={({ isActive }) => {
          const base = collapsed
            ? 'rounded-md p-2 text-sm font-medium flex items-center justify-center transition-all'
            : 'rounded-md px-3 py-2 text-sm font-medium flex items-center gap-2 transition-all'
          const active = isActive
            ? 'text-sky-800'
            : 'text-slate-700 hover:bg-slate-50 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100'
          return `${base} ${active}`
        }}
        end={item.end}
      >
        {({ isActive }) => (
          <>
            <Icon className={collapsed
              ? (isActive ? 'h-5 w-5 text-sky-700' : 'h-5 w-5 text-slate-700 dark:text-slate-400')
              : (isActive ? 'h-4 w-4 text-sky-700' : 'h-4 w-4 text-slate-700 dark:text-slate-400')} />
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
          <div className="px-3 py-2 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 dark:text-slate-600 mt-4 first:mt-0">
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
            try { await pharmacyApi.logoutUser(username || undefined) } catch {}
            try { localStorage.removeItem('pharmacy.user') } catch {}
            try { localStorage.removeItem('pharma_user') } catch {}
            try { localStorage.removeItem('pharmacy.token') } catch {}
            navigate('/pharmacy/login')
          }}
          title={collapsed ? 'Logout' : undefined}
          className={collapsed
            ? 'w-full inline-flex items-center justify-center rounded-md p-2 text-sm font-medium transition-all bg-white dark:bg-slate-800 text-[#0f2d5c] dark:text-slate-300 border border-[#0f2d5c] dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700'
            : 'w-full inline-flex items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-all bg-white dark:bg-slate-800 text-[#0f2d5c] dark:text-slate-300 border border-[#0f2d5c] dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700'}
          aria-label="Logout"
        >
          <LogOut className="h-4 w-4" />
          {!collapsed && <span>Logout</span>}
        </button>
      </div>
    </aside>
  )
}
