import { useEffect, useState } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import {
  LayoutDashboard, CalendarDays, Users, Stethoscope, FileText, FlaskConical,
  Microscope, Pill, UserCog, BarChart3, Settings, ShieldCheck,
} from 'lucide-react'

const SIDEBAR_ITEMS = [
  { to: '/camp', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/camp/schedule', label: 'Camp Schedule', icon: CalendarDays },
  { to: '/camp/patients', label: 'Patients', icon: Users },
  { to: '/camp/consultations', label: 'Consultations', icon: Stethoscope },
  { to: '/camp/prescriptions', label: 'Prescriptions', icon: FileText },
  { to: '/camp/lab-orders', label: 'Lab Orders', icon: FlaskConical },
  { to: '/camp/diagnostics', label: 'Diagnostics', icon: Microscope },
  { to: '/camp/dispensing', label: 'Dispensing', icon: Pill },
  { to: '/camp/staff', label: 'Staff', icon: UserCog },
  { to: '/camp/reports', label: 'Reports', icon: BarChart3 },
  { to: '/camp/settings', label: 'Settings', icon: Settings },
  { to: '/camp/user-management', label: 'User Management', icon: ShieldCheck },
]

export default function Camp_Sidebar({ collapsed }: { collapsed: boolean }) {
  const location = useLocation()
  const [role, setRole] = useState<string>('admin')
  const [permissions, setPermissions] = useState<Record<string, boolean>>({})

  useEffect(() => {
    const sessionRaw = localStorage.getItem('camp.session')
    const session = sessionRaw ? JSON.parse(sessionRaw) : null
    setRole(session?.role || 'admin')
  }, [location.pathname])

  useEffect(() => {
    const fetchPermissions = async () => {
      try {
        const { campApi } = await import('../../features/camp/camp.api')
        const res: any = await campApi.getSidebarPermissions(role)
        const map: Record<string, boolean> = {}
        for (const p of res?.permissions || []) {
          map[p.path] = p.visible !== false
        }
        setPermissions(map)
      } catch {}
    }
    fetchPermissions()
  }, [role])

  const isVisible = (path: string) => {
    if (role === 'admin') return true
    return permissions[path] !== false
  }

  return (
    <aside className={`flex flex-col border-r border-emerald-200 bg-white transition-all duration-300 ${collapsed ? 'w-0 overflow-hidden' : 'w-60'}`}>
      <div className="flex h-14 items-center gap-2 border-b border-emerald-100 px-4">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700">
          <TentIcon className="h-5 w-5" />
        </div>
        <span className="text-sm font-bold text-slate-800">Medical Camp</span>
      </div>
      <nav className="flex-1 overflow-y-auto p-2 space-y-1">
        {SIDEBAR_ITEMS.map(item => {
          if (!isVisible(item.to)) return null
          const Icon = item.icon
          const active = location.pathname === item.to || location.pathname.startsWith(item.to + '/')
          return (
            <NavLink
              key={item.to}
              to={item.to}
              className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${active ? 'bg-emerald-50 text-emerald-700' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'}`}
            >
              <Icon className="h-4.5 w-4.5" />
              <span>{item.label}</span>
            </NavLink>
          )
        })}
      </nav>
    </aside>
  )
}

function TentIcon({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M3.5 21l7-18 7 18" /><path d="M5 21h14" /><path d="M12 11l3 10" /><path d="M12 11l-3 10" />
    </svg>
  )
}
