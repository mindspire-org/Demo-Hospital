import { NavLink, useNavigate } from 'react-router-dom'
import { LayoutDashboard, ShoppingCart, UtensilsCrossed, ReceiptText, BarChart3, Settings, Users, ScrollText, PanelLeftClose, Coffee, Tag, FileText, Clock4 } from 'lucide-react'

interface Props {
  collapsed: boolean
  onToggle: () => void
  visibleItems?: { key: string; label: string; visible: boolean }[]
}

const ALL_ITEMS = [
  { key: 'dashboard', label: 'Dashboard', to: '/cafeteria', icon: LayoutDashboard, end: true },
  { key: 'pos', label: 'POS', to: '/cafeteria/pos', icon: ShoppingCart, end: false },
  { key: 'deals', label: 'Deals & Combos', to: '/cafeteria/deals', icon: Tag, end: false },
  { key: 'menu-items', label: 'Menu Items', to: '/cafeteria/menu-items', icon: UtensilsCrossed, end: false },
  { key: 'sales-history', label: 'Sales History', to: '/cafeteria/sales-history', icon: ReceiptText, end: false },
  { key: 'billing', label: 'Billing & Receipts', to: '/cafeteria/billing', icon: FileText, end: false },
  { key: 'daily-shift', label: 'Daily Opening/Closing', to: '/cafeteria/daily-shift', icon: Clock4, end: false },
  { key: 'reports', label: 'Reports', to: '/cafeteria/reports', icon: BarChart3, end: false },
  { key: 'settings', label: 'Settings', to: '/cafeteria/settings', icon: Settings, end: false },
  { key: 'user-management', label: 'User Management', to: '/cafeteria/user-management', icon: Users, end: false },
  { key: 'audit-logs', label: 'Audit Logs', to: '/cafeteria/audit-logs', icon: ScrollText, end: false },
  { key: 'sidebar-permissions', label: 'Sidebar Permissions', to: '/cafeteria/sidebar-permissions', icon: PanelLeftClose, end: false },
]

export default function Cafeteria_Sidebar({ collapsed, onToggle, visibleItems }: Props) {
  const navigate = useNavigate()
  const visibleKeys = new Set((visibleItems || []).filter(v => v.visible).map(v => v.key))
  const items = ALL_ITEMS.filter(item => !visibleItems || visibleKeys.has(item.key))

  return (
    <aside
      className={`flex flex-col border-r border-slate-200 bg-white transition-all duration-200 dark:border-slate-800 dark:bg-slate-900 ${
        collapsed ? 'w-16' : 'w-60'
      }`}
    >
      <div className="flex h-14 items-center gap-2 border-b border-slate-200 px-3 dark:border-slate-800">
        <button
          onClick={onToggle}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-700 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200"
          aria-label="Toggle sidebar"
        >
          {collapsed ? <Coffee className="h-5 w-5" /> : <PanelLeftClose className="h-5 w-5" />}
        </button>
        {!collapsed && (
          <span className="truncate text-sm font-bold text-slate-800 dark:text-slate-200">Cafeteria</span>
        )}
      </div>

      <nav className="flex-1 overflow-y-auto py-2">
        {items.map((item) => {
          const Icon = item.icon
          return (
            <NavLink
              key={item.key}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-orange-50 text-orange-700 dark:bg-orange-900/20 dark:text-orange-400'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200'
                } ${collapsed ? 'justify-center' : ''}`
              }
              title={collapsed ? item.label : undefined}
            >
              <Icon className="h-5 w-5 shrink-0" />
              {!collapsed && <span className="truncate">{item.label}</span>}
            </NavLink>
          )
        })}
      </nav>

      <div className="border-t border-slate-200 p-3 dark:border-slate-800">
        <button
          onClick={() => {
            localStorage.removeItem('cafeteria.token')
            localStorage.removeItem('cafeteria.session')
            navigate('/cafeteria/login')
          }}
          className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-slate-500 hover:bg-red-50 hover:text-red-600 dark:text-slate-400 dark:hover:bg-red-900/20 dark:hover:text-red-400 ${collapsed ? 'justify-center' : ''}`}
          title="Logout"
        >
          <Coffee className="h-4 w-4" />
          {!collapsed && <span>Logout</span>}
        </button>
      </div>
    </aside>
  )
}
