import { NavLink, useNavigate } from 'react-router-dom'
import { hospitalApi } from '../../utils/api'
import { useEffect, useState } from 'react'
import type { LucideIcon } from 'lucide-react'
import { useSystemConfig } from '../../contexts/SystemConfigContext'
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
  Fingerprint,
  CalendarDays, 
  Search, 
  Stethoscope, 
  ScrollText, 
  Database, 
  ReceiptText, 
  CreditCard, 
  Wallet, 
  Siren, 
  ClipboardList, 
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
    { to: '/hospital/patients', label: 'Patients', icon: Users },
  ],
}

const erSection: Section = {
  label: 'ER MANAGEMENT',
  items: [
    { to: '/hospital/emergency', label: 'Emergency', icon: Siren },
    { to: '/hospital/er-discharged', label: 'ER Discharged', icon: LogOut },
    { to: '/hospital/er-referrals', label: 'ER Referrals', icon: Activity },
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
    { to: '/hospital/staff-leaves', label: 'Staff Leaves', icon: ClipboardList },
    { to: '/hospital/staff-monthly', label: 'Staff Monthly', icon: CalendarDays },
    { to: '/hospital/staff-settings', label: 'Staff Settings', icon: Settings },
    { to: '/hospital/biometric-settings', label: 'Biometric Settings', icon: Fingerprint },
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

const financeSection: Section = {
  label: 'FINANCE',
  items: [
    { to: '/hospital/finance/transactions', label: 'Transactions', icon: CreditCard },
    { to: '/hospital/finance/add-expense', label: 'Add Expense', icon: PlusCircle },
    { to: '/hospital/finance/expenses', label: 'Expense History', icon: ClipboardList },
  ],
}

const corporateSection: Section = {
  label: 'CORPORATE',
  items: [
    { to: '/hospital/corporate', label: 'Corporate Dashboard', icon: LayoutDashboard, end: true },
    { to: '/hospital/corporate/companies', label: 'Companies', icon: Building2 },
    { to: '/hospital/corporate/rate-rules', label: 'Rate Rules', icon: ScrollText },
    { to: '/hospital/corporate/transactions', label: 'Transactions', icon: CreditCard },
    { to: '/hospital/corporate/claims', label: 'Claims', icon: ReceiptText },
    { to: '/hospital/corporate/payments', label: 'Payments', icon: Wallet },
    { to: '/hospital/corporate/reports', label: 'Reports', icon: ScrollText },
  ],
}

const otSection: Section = {
  label: 'OT MANAGEMENT',
  items: [
    { to: '/hospital/ot', label: 'OT Dashboard', icon: LayoutDashboard, end: true },
    { to: '/hospital/ot/schedule', label: 'OT Schedule', icon: CalendarDays },
    { to: '/hospital/ot/rooms', label: 'OT Rooms', icon: Building2 },
    { to: '/hospital/ot/team', label: 'OT Team', icon: Users },
    { to: '/hospital/ot/sterilization', label: 'Sterilization', icon: ScrollText },
    { to: '/hospital/ot/equipment', label: 'OT Equipment', icon: Settings },
    { to: '/hospital/ot/procedures', label: 'OT Procedures', icon: ClipboardList },
    { to: '/hospital/ot/reports', label: 'OT Reports', icon: ScrollText },
  ],
}

const icuSection: Section = {
  label: 'ICU MANAGEMENT',
  items: [
    { to: '/hospital/icu', label: 'ICU Dashboard', icon: LayoutDashboard, end: true },
    { to: '/hospital/icu/beds', label: 'ICU Bed Status', icon: Bed },
    { to: '/hospital/icu/monitoring', label: 'Vitals Monitoring', icon: Activity },
    { to: '/hospital/icu/scoring', label: 'Severity Scoring', icon: ScrollText },
    { to: '/hospital/icu/ventilator', label: 'Ventilator/Device', icon: Settings },
    { to: '/hospital/icu/reports', label: 'ICU Reports', icon: ScrollText },
  ],
}

const storeSection: Section = {
  label: 'STORE & INVENTORY',
  items: [
    { to: '/hospital/store', label: 'Store Dashboard', icon: LayoutDashboard, end: true },
    { to: '/hospital/store/inventory', label: 'Store Inventory', icon: Database },
    { to: '/hospital/store/add-purchase', label: 'Add Purchase', icon: PlusCircle },
    { to: '/hospital/store/purchase-history', label: 'Purchase History', icon: History },
    { to: '/hospital/store/purchase-orders', label: 'Purchase Orders', icon: ClipboardList },
    { to: '/hospital/store/issue-history', label: 'Issue History', icon: ScrollText },
    { to: '/hospital/store/suppliers', label: 'Store Suppliers', icon: Users },
    { to: '/hospital/store/reports', label: 'Store Reports', icon: ScrollText },
  ],
}

const equipmentSection: Section = {
  label: 'EQUIPMENT MANAGEMENT',
  items: [
    { to: '/hospital/equipment/dashboard', label: 'Equipment Dashboard', icon: LayoutDashboard },
    { to: '/hospital/equipment', label: 'Equipment List', icon: Settings, end: true },
    { to: '/hospital/equipment/purchases', label: 'Equipment Purchases', icon: CreditCard },
    { to: '/hospital/equipment/suppliers', label: 'Equipment Suppliers', icon: Users },
  ],
}

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
  financeSection,
  corporateSection,
  erSection,
  ipdSection,
  otSection,
  icuSection,
  ipdFormsSection,
  storeSection,
  equipmentSection,
  staffSection,
  doctorSection,
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

  const { isPathVisible } = useSystemConfig()
  const canShow = (path: string) => isPathVisible('hospital', path)

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
              : (isActive ? 'h-4 w-4 text-sky-700' : 'h-4 w-4 text-slate-700 dark:text-slate-400')} 
            />
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
      className={`hidden md:flex ${width} md:flex-none md:shrink-0 md:flex-col md:border-r bg-white/80 backdrop-blur-md shadow-sm dark:bg-slate-900/60 dark:border-slate-700`}
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
            try {
              const raw = localStorage.getItem('hospital.session')
              const u = raw ? JSON.parse(raw) : null
              await hospitalApi.logoutHospitalUser(u?.username||'')
            } catch {}
            try { localStorage.removeItem('hospital.session') } catch {}
            try { localStorage.removeItem('hospital.token') } catch {}
            try { localStorage.removeItem('lab.token') } catch {}
            try { localStorage.removeItem('token') } catch {}
            navigate('/hospital/login')
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
