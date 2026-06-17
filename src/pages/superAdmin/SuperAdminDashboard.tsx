import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Settings, Shield, BarChart3, Users, Building2, LogOut, Home,
  Zap, Activity, Lock, Globe, ChevronRight, Sparkles
} from 'lucide-react'
import { superAdminApi } from '../../features/superAdmin'

const cards = [
  { to: '/super-admin/modules', title: 'Module Manager', description: 'Enable or disable modules and sub-modules across the entire system.', icon: Settings, tone: 'sky', stat: 'modules' },
  { to: '/super-admin/client', title: 'Client Profile', description: 'Manage license details, contact info, and support expiry dates.', icon: Building2, tone: 'emerald', stat: 'client' },
  { to: '/super-admin/usage', title: 'Usage Stats', description: 'View module usage metrics, active users, and system analytics.', icon: BarChart3, tone: 'violet', stat: 'usage' },
  { to: '/super-admin/admins', title: 'Super Admins', description: 'Create and manage developer-level administrator accounts.', icon: Users, tone: 'amber', stat: 'admins' },
]

const toneMap: Record<string, string> = {
  sky: 'from-sky-500 to-cyan-400 bg-sky-50 text-sky-600 dark:bg-sky-900/30 dark:text-sky-400 ring-sky-200 dark:ring-sky-800',
  emerald: 'from-emerald-500 to-teal-400 bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400 ring-emerald-200 dark:ring-emerald-800',
  violet: 'from-violet-500 to-purple-400 bg-violet-50 text-violet-600 dark:bg-violet-900/30 dark:text-violet-400 ring-violet-200 dark:ring-violet-800',
  amber: 'from-amber-500 to-orange-400 bg-amber-50 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400 ring-amber-200 dark:ring-amber-800',
}

export default function SuperAdminDashboard() {
  const navigate = useNavigate()
  const [stats, setStats] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    superAdminApi.getUsageStats().then(setStats).catch(() => {}).finally(() => setLoading(false))
  }, [])

  function handleLogout() {
    localStorage.removeItem('super_admin.token')
    navigate('/super-admin/login')
  }

  const quickStats = [
    { label: 'Super Admins', value: stats?.totalAdmins ?? 0, icon: Shield, tone: 'sky' },
    { label: 'Active Modules', value: stats?.totalModules ?? 0, icon: Zap, tone: 'emerald' },
    { label: 'System Version', value: stats?.version ?? 'v1.0', icon: Activity, tone: 'violet' },
    { label: 'Security Status', value: 'Active', icon: Lock, tone: 'amber' },
  ]

  return (
    <div className="min-h-dvh bg-slate-50 dark:bg-slate-950">
      {/* Top Nav */}
      <header className="bg-white/80 dark:bg-slate-900/80 backdrop-blur border-b border-slate-200 dark:border-slate-800 sticky top-0 z-10">
        <div className="mx-auto max-w-6xl px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="inline-flex rounded-lg p-2 bg-gradient-to-br from-sky-500 to-cyan-400 text-white shadow-sm">
              <Shield className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-base font-bold text-slate-900 dark:text-slate-100 leading-tight">Super Admin Portal</h1>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">System Control Center</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => navigate('/')} className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors" title="Home">
              <Home className="h-5 w-5 text-slate-600 dark:text-slate-400" />
            </button>
            <button
              onClick={handleLogout}
              className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-300 dark:border-slate-700 transition-colors"
            >
              <LogOut className="h-4 w-4" />
              Logout
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-8 space-y-8">
        {/* Hero */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900 to-slate-800 dark:from-slate-800 dark:to-slate-900 p-8 text-white shadow-lg">
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2" />
          <div className="absolute bottom-0 left-0 w-40 h-40 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/2" />
          <div className="relative flex items-start gap-4">
            <div className="inline-flex rounded-xl p-3 bg-white/10 backdrop-blur ring-1 ring-white/20">
              <Sparkles className="h-6 w-6 text-cyan-300" />
            </div>
            <div>
              <h2 className="text-xl font-bold">Welcome back, Super Admin</h2>
              <p className="text-sm text-slate-300 mt-1 max-w-lg">
                Manage modules, monitor usage, configure client profiles, and control admin access from one central dashboard.
              </p>
              <div className="flex items-center gap-4 mt-4 text-xs text-slate-400">
                <span className="inline-flex items-center gap-1"><Globe className="h-3.5 w-3.5" /> System Online</span>
                <span className="inline-flex items-center gap-1"><Activity className="h-3.5 w-3.5" /> All Services Healthy</span>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {quickStats.map((s) => {
            const Icon = s.icon
            return (
              <div key={s.label} className="rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 flex items-center gap-3">
                <div className={`inline-flex rounded-lg p-2 ${toneMap[s.tone].split(' ').slice(1, 3).join(' ')}`}>
                  <Icon className="h-4 w-4" />
                </div>
                <div>
                  <div className="text-lg font-bold text-slate-900 dark:text-slate-100">{loading ? '—' : s.value}</div>
                  <div className="text-xs text-slate-500 dark:text-slate-400">{s.label}</div>
                </div>
              </div>
            )
          })}
        </div>

        {/* Cards */}
        <div>
          <h3 className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-4">Management</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {cards.map((card) => {
              const Icon = card.icon
              const tone = toneMap[card.tone]
              return (
                <button
                  key={card.to}
                  onClick={() => navigate(card.to)}
                  className="group text-left rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 hover:shadow-md hover:border-slate-300 dark:hover:border-slate-700 transition-all duration-200"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className={`inline-flex rounded-lg p-2.5 ${tone.split(' ').slice(1, 3).join(' ')} ring-1`}>
                      <Icon className="h-5 w-5" />
                    </div>
                    <ChevronRight className="h-4 w-4 text-slate-300 dark:text-slate-600 group-hover:text-slate-500 dark:group-hover:text-slate-400 transition-colors" />
                  </div>
                  <h3 className="font-semibold text-slate-900 dark:text-slate-100 text-sm">{card.title}</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">{card.description}</p>
                </button>
              )
            })}
          </div>
        </div>
      </main>
    </div>
  )
}
