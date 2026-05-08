import { NavLink, useNavigate } from 'react-router-dom'
import { hospitalApi } from '../../utils/api'
import { useEffect, useState } from 'react'
import type { LucideIcon } from 'lucide-react'
import PortalSwitcher from '../PortalSwitcher'
import {
  LayoutDashboard,
  PlusCircle,
  Ticket,
  History,
  Building2,
  Activity,
  Bed,
  Users,
  LogOut,
  Calendar,
  UserCog,
  Settings,
  CalendarDays,
  Search,
  Stethoscope,
  FileText,
  ScrollText,
  Database,
  ReceiptText,
  CreditCard,
  Wallet,
  Siren,
  UserMinus,
  Package,
  Truck,
  ClipboardList,
  BarChart3,
} from 'lucide-react'

type NavItem = { to: string; label: string; end?: boolean; icon: LucideIcon }

type Section = {
  label: string
  items: NavItem[]
}

const tokenGenerationSection: Section = {
  label: 'TOKEN GENERATION',
  items: [
    { to: '/hospital/token-generator', label: 'Token Generator', icon: PlusCircle },
    { to: '/hospital/today-tokens', label: "Today's Tokens", icon: Ticket },
    { to: '/hospital/token-history', label: 'Token History', icon: History },
    { to: '/hospital/my-activity-report', label: 'My Activity', icon: Activity },
    { to: '/hospital/departments', label: 'Departments', icon: Building2 },
    { to: '/hospital/appointments', label: 'Appointments', icon: Calendar },
    { to: '/hospital/finance/cash-sessions', label: 'Cash Sessions', icon: Wallet },
    { to: '/hospital/search-patients', label: 'Search Patients', icon: Search },
  ],
}

const erSection: Section = {
  label: 'ER MANAGEMENT',
  items: [
    { to: '/hospital/emergency', label: 'Emergency', icon: Siren },
    { to: '/hospital/er-referrals', label: 'ER Referrals', icon: Activity },
    { to: '/hospital/er-discharged', label: 'ER Discharged', icon: UserMinus },
    { to: '/hospital/er-billing', label: 'ER Billing (Add)', icon: CreditCard, end: true },
    { to: '/hospital/er-billing/collect', label: 'ER Billing (Collect)', icon: CreditCard },
    { to: '/hospital/emergency-services', label: 'Emergency Services', icon: ReceiptText },
    { to: '/hospital/er-transactions', label: 'Recent ER Payments', icon: CreditCard },
  ],
}

const ipdSection: Section = {
  label: 'IPD MANAGEMENT',
  items: [
    { to: '/hospital/ipd', label: 'IPD Dashboard', icon: Activity },
    { to: '/hospital/bed-management', label: 'Bed Management', icon: Bed },
    { to: '/hospital/patient-list', label: 'Patient List', icon: Users },
    { to: '/hospital/ipd-referrals', label: 'Referrals', icon: Activity },
    { to: '/hospital/ipd-services', label: 'IPD Services', icon: ReceiptText },
    { to: '/hospital/discharged', label: 'Discharged', icon: LogOut },
    { to: '/hospital/ipd-billing', label: 'IPD Billing (Add)', icon: ReceiptText, end: true },
    { to: '/hospital/ipd-billing/collect', label: 'IPD Billing (Collect)', icon: CreditCard },
    { to: '/hospital/ipd-transactions', label: 'Recent IPD Payments', icon: CreditCard },
  ],
}

const ipdFormsSection: Section = {
  label: 'IPD FORMS',
  items: [
    { to: '/hospital/forms/consent-forms', label: 'Consent Forms', icon: FileText },
    { to: '/hospital/forms/received-deaths', label: 'Received Death', icon: ScrollText },
    { to: '/hospital/forms/death-certificates', label: 'Death Certificates', icon: ScrollText },
    { to: '/hospital/forms/birth-certificates', label: 'Birth Certificates', icon: ScrollText },
    { to: '/hospital/forms/short-stays', label: 'Short Stays', icon: ScrollText },
    { to: '/hospital/forms/discharge-summaries', label: 'Discharge Summaries', icon: ScrollText },
    { to: '/hospital/forms/invoices', label: 'Invoices', icon: ReceiptText },
  ],
}

const staffSection: Section = {
  label: 'STAFF MANAGEMENT',
  items: [
    { to: '/hospital/staff-dashboard', label: 'Staff Dashboard', icon: LayoutDashboard },
    { to: '/hospital/staff-attendance', label: 'Staff Attendance', icon: Calendar },
    { to: '/hospital/staff-monthly', label: 'Staff Monthly', icon: CalendarDays },
    { to: '/hospital/staff-settings', label: 'Staff Settings', icon: Settings },
    { to: '/hospital/staff-management', label: 'Staff Management', icon: UserCog },
  ],
}

const doctorSection: Section = {
  label: 'DOCTOR MANAGEMENT',
  items: [
    { to: '/hospital/doctors', label: 'Add Doctors', icon: Stethoscope },
    { to: '/hospital/doctor-schedules', label: 'Doctor Schedules', icon: CalendarDays },
    { to: '/hospital/finance/doctors', label: 'Doctors Finance', icon: Wallet },
    { to: '/hospital/finance/doctor-payouts', label: 'Doctor Payouts', icon: CreditCard },
  ],
}

const expenseSection: Section = {
  label: 'EXPENSE MANAGEMENT',
  items: [
    { to: '/hospital/finance/transactions', label: 'Transactions', icon: CreditCard },
    { to: '/hospital/finance/add-expense', label: 'Add Expense', icon: ReceiptText },
  ],
}

/*const equipmentSection: Section = {
  label: 'EQUIPMENT MANAGEMENT',
  items: [
    { to: '/hospital/equipment', label: 'Equipment', icon: Wrench },
    { to: '/hospital/equipment-due', label: 'Equipment Due', icon: CalendarDays },
    { to: '/hospital/equipment/kpis', label: 'Equipment KPIs', icon: Activity },
    { to: '/hospital/equipment/breakdown-register', label: 'Breakdown Register', icon: AlertTriangle },
    { to: '/hospital/equipment/condemnation-register', label: 'Condemnation Register', icon: Trash2 },
  ],
}
*/

const storeSection: Section = {
  label: 'STORE / INVENTORY',
  items: [
    // { to: '/hospital/store', label: 'Store Dashboard', icon: LayoutDashboard, end: true },
    { to: '/hospital/store/suppliers', label: 'Suppliers', icon: Truck },
    { to: '/hospital/store/purchase-orders', label: 'Purchase Orders', icon: FileText },
    { to: '/hospital/store/purchase-history', label: 'Purchase History', icon: ClipboardList },
    { to: '/hospital/store/inventory', label: 'Inventory', icon: Package },
    { to: '/hospital/store/issue-history', label: 'Issue History', icon: History },
    { to: '/hospital/store/reports', label: 'Reports', icon: BarChart3 },
  ],
}

/* Hidden - ambulance
const ambulanceSection: Section = {
  label: 'AMBULANCE MANAGEMENT',
  items: [
    { to: '/hospital/ambulance', label: 'Ambulance Dashboard', icon: LayoutDashboard, end: true },
    { to: '/hospital/ambulance/master', label: 'Ambulance Master', icon: Ambulance },
    { to: '/hospital/ambulance/trips', label: 'Trip Tracking', icon: Route },
    { to: '/hospital/ambulance/fuel', label: 'Fuel Tracking', icon: Fuel },
    { to: '/hospital/ambulance/expenses', label: 'Expenses', icon: ReceiptText },
    { to: '/hospital/ambulance/reports', label: 'Reports', icon: BarChart3 },
  ],
}
*/

const adminSection: Section = {
  label: 'ADMIN',
  items: [
    { to: '/hospital/user-management', label: 'Users', icon: UserCog },
    { to: '/hospital/sidebar-permissions', label: 'Sidebar Permissions', icon: Settings },
    { to: '/hospital/audit', label: 'Audit Log', icon: ScrollText },
    { to: '/hospital/backup', label: 'Backup', icon: Database },
    { to: '/hospital/settings', label: 'Settings', icon: Settings },
  ],
}

const dashboardItem: NavItem = { to: '/hospital', label: 'Dashboard', icon: LayoutDashboard, end: true }

const allSections: Section[] = [
  tokenGenerationSection,
  erSection,
  ipdSection,
  ipdFormsSection,
  staffSection,
  doctorSection,
  expenseSection,
  storeSection,
  // corporateSection,
  adminSection,
]

// Flat array of all nav items for permissions management
export const hospitalSidebarNav: NavItem[] = [
  dashboardItem,
  ...allSections.flatMap(s => s.items),
]

export default function Hospital_Sidebar({ collapsed = false }: { collapsed?: boolean }) {
  const navigate = useNavigate()
  const [role, setRole] = useState<string>('admin')
  const [permMap, setPermMap] = useState<Map<string, any>>(new Map())
  const width = collapsed ? 'md:w-16' : 'md:w-72'

  useEffect(()=>{
    try {
      const raw = localStorage.getItem('hospital.session') || localStorage.getItem('user')
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
        const res: any = await hospitalApi.listSidebarPermissions(role)
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
    if (path === '/hospital/sidebar-permissions' && String(role||'').toLowerCase() !== 'admin') return false
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
        className={({ isActive }) => {
          const base = collapsed
            ? 'rounded-lg p-2 text-sm font-semibold flex items-center justify-center transition-all duration-150'
            : 'rounded-lg px-3 py-2 text-[13px] font-semibold flex items-center gap-2.5 transition-all duration-150'
          const active = isActive
            ? 'bg-linear-to-r from-(--navy) to-(--navy-700) text-white shadow-md'
            : 'text-slate-600 hover:bg-slate-100/80 hover:text-slate-900'
          return `${base} ${active}`
        }}
        end={item.end}
      >
        {({ isActive }) => (
          <>
            <div className={collapsed ? '' : 'flex h-7 w-7 items-center justify-center rounded-md ' + (isActive ? 'bg-white/20' : 'bg-slate-100/60')}>
              <Icon className={isActive ? 'h-4 w-4 text-white' : 'h-4 w-4 text-slate-500'} strokeWidth={isActive ? 2.2 : 1.8} />
            </div>
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
      <div key={section.label} className="space-y-0.5">
        {!collapsed && (
          <div className="px-3 pt-4 pb-1.5 flex items-center gap-2">
            <div className="h-px flex-1 bg-linear-to-r from-slate-200 to-transparent" />
            <span className="text-[10px] font-black uppercase tracking-[0.15em] text-slate-400 whitespace-nowrap">{section.label}</span>
            <div className="h-px flex-1 bg-linear-to-l from-slate-200 to-transparent" />
          </div>
        )}
        {collapsed && <div className="my-2 border-t border-slate-100" />}
        {visibleItems.map(renderNavItem)}
      </div>
    )
  }

  return (
    <aside
      className={`hidden md:flex ${width} md:flex-none md:shrink-0 md:sticky md:top-14 md:h-[calc(100dvh-3.5rem)] md:flex-col md:border-r bg-white/80 backdrop-blur-md shadow-sm dark:bg-slate-900/60 dark:border-slate-700`}
    >
      <nav className={`flex-1 overflow-y-auto overflow-x-hidden ${collapsed ? 'p-2' : 'p-3'} space-y-1`}>
        {/* Dashboard at top — prominent */}
        {canShow(dashboardItem.to) && (
          <div className="mb-2">
            {renderNavItem(dashboardItem)}
          </div>
        )}

        {/* All sections */}
        {allSections.map(renderSection)}
      </nav>
      <div className={collapsed ? 'p-2 space-y-2 border-t border-slate-100' : 'p-3 space-y-2 border-t border-slate-100'}>
        {String(role || '').toLowerCase() === 'admin' ? <PortalSwitcher compact={collapsed} /> : null}
        <button
          onClick={async () => {
            try {
              const raw = localStorage.getItem('hospital.session')
              const u = raw ? JSON.parse(raw) : null
              await hospitalApi.logoutHospitalUser(u?.username||'')
            } catch {}
            try { localStorage.removeItem('hospital.session') } catch {}
            navigate('/hospital/login')
          }}
          title={collapsed ? 'Logout' : undefined}
          className={collapsed
            ? 'w-full inline-flex items-center justify-center rounded-lg p-2 text-sm font-semibold transition-colors text-rose-600 hover:bg-rose-50'
            : 'w-full inline-flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold transition-colors text-rose-600 hover:bg-rose-50'}
          aria-label="Logout"
        >
          <LogOut className="h-4 w-4" />
          {!collapsed && <span>Logout</span>}
        </button>
      </div>
    </aside>
  )
}
