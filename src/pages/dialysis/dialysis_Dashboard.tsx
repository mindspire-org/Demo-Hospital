import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { 
  Users, Activity, Calendar, Clock, 
  Droplets, RefreshCw, ChevronRight, DollarSign,
  AlertCircle, CheckCircle2, Timer, BedDouble, Stethoscope
} from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Area, AreaChart } from 'recharts'
import { dialysisApi } from '../../utils/api'

type Stats = {
  totalPatients: number
  todaySessions: number
  activeMachines: number
  pendingAppointments: number
  completedToday: number
  cancelledToday: number
  avgSessionTime: number
  revenue: number
}

type WeeklyData = { day: string; sessions: number; patients: number }[]

type SessionTypeData = { name: string; value: number; color: string }[]

type RevenueData = { month: string; revenue: number }[]

type RecentSession = {
  id: string
  patient: string
  mrn: string
  type: string
  time: string
  status: string
  machine: string
}

type UpcomingAppointment = {
  id: string
  patient: string
  time: string
  type: string
  shift: string
}

export default function Dialysis_Dashboard() {
  const navigate = useNavigate()
  const [lastUpdate, setLastUpdate] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  const [stats, setStats] = useState<Stats>({
    totalPatients: 0,
    todaySessions: 0,
    activeMachines: 0,
    pendingAppointments: 0,
    completedToday: 0,
    cancelledToday: 0,
    avgSessionTime: 4,
    revenue: 0,
  })

  const [weeklyData, setWeeklyData] = useState<WeeklyData>([])
  const [sessionTypeData, setSessionTypeData] = useState<SessionTypeData>([])
  const [revenueData, setRevenueData] = useState<RevenueData>([])
  const [recentSessions, setRecentSessions] = useState<RecentSession[]>([])
  const [upcomingAppointments, setUpcomingAppointments] = useState<UpcomingAppointment[]>([])

  async function fetchDashboardData() {
    setLoading(true)
    setError(null)
    try {
      const res: any = await dialysisApi.getDashboardStats()
      setStats(res.stats || {})
      setWeeklyData(res.weeklyData || [])
      setSessionTypeData(res.sessionTypeData?.length > 0 ? res.sessionTypeData : [{ name: 'Hemodialysis', value: 100, color: '#0d9488' }])
      setRevenueData(res.revenueData || [])
      setRecentSessions(res.recentSessions || [])
      setUpcomingAppointments(res.upcomingAppointments || [])
      setLastUpdate(new Date().toLocaleTimeString())
    } catch (err: any) {
      setError(err?.message || 'Failed to load dashboard data')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchDashboardData()
  }, [])

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      'completed': 'bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300 dark:border-emerald-800',
      'in-progress': 'bg-cyan-100 text-cyan-700 border-cyan-200 dark:bg-cyan-900/30 dark:text-cyan-300 dark:border-cyan-800',
      'scheduled': 'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-800',
      'cancelled': 'bg-rose-100 text-rose-700 border-rose-200 dark:bg-rose-900/30 dark:text-rose-300 dark:border-rose-800',
    }
    const icons: Record<string, React.ReactNode> = {
      'completed': <CheckCircle2 className="h-3.5 w-3.5" />,
      'in-progress': <Timer className="h-3.5 w-3.5" />,
      'scheduled': <Clock className="h-3.5 w-3.5" />,
      'cancelled': <AlertCircle className="h-3.5 w-3.5" />,
    }
    return (
      <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-medium ${styles[status] || styles['scheduled']}`}>
        {icons[status]}
        {status.charAt(0).toUpperCase() + status.slice(1).replace('-', ' ')}
      </span>
    )
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900 p-6 flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 animate-spin text-teal-600 mx-auto" />
          <p className="mt-4 text-slate-600 dark:text-slate-400">Loading dashboard...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900 p-6 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="h-8 w-8 text-red-500 mx-auto" />
          <p className="mt-4 text-red-600 dark:text-red-400">{error}</p>
          <button 
            onClick={fetchDashboardData}
            className="mt-4 px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700"
          >
            Retry
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 p-6">
      {/* Header */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Dialysis Dashboard</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">Monitor and manage dialysis operations</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-sm text-slate-500 dark:text-slate-400">
            Last updated: <span className="font-medium text-slate-700 dark:text-slate-300">{lastUpdate}</span>
          </div>
          <button 
            onClick={fetchDashboardData}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-200 shadow-sm hover:bg-slate-50 dark:hover:bg-slate-700"
          >
            <RefreshCw className="h-4 w-4" />
            Refresh
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5">
        <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-5 shadow-sm">
          <div className="flex items-start justify-between">
            <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-teal-100 dark:bg-teal-900/30">
              <Users className="h-6 w-6 text-teal-600 dark:text-teal-400" />
            </div>
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 dark:bg-emerald-900/30 px-2 py-0.5 text-xs font-medium text-emerald-700 dark:text-emerald-300">
              Active
            </span>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-slate-900 dark:text-slate-100">{stats.totalPatients}</div>
            <div className="text-sm text-slate-500 dark:text-slate-400">Total Patients</div>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-5 shadow-sm">
          <div className="flex items-start justify-between">
            <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-cyan-100 dark:bg-cyan-900/30">
              <Activity className="h-6 w-6 text-cyan-600 dark:text-cyan-400" />
            </div>
            <span className="inline-flex items-center gap-1 rounded-full bg-cyan-100 dark:bg-cyan-900/30 px-2 py-0.5 text-xs font-medium text-cyan-700 dark:text-cyan-300">
              <Timer className="h-3 w-3" />
              {stats.completedToday}/{stats.todaySessions}
            </span>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-slate-900 dark:text-slate-100">{stats.todaySessions}</div>
            <div className="text-sm text-slate-500 dark:text-slate-400">Today's Sessions</div>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-5 shadow-sm">
          <div className="flex items-start justify-between">
            <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-emerald-100 dark:bg-emerald-900/30">
              <BedDouble className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
            </div>
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 dark:bg-emerald-900/30 px-2 py-0.5 text-xs font-medium text-emerald-700 dark:text-emerald-300">
              Active
            </span>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-slate-900 dark:text-slate-100">{stats.activeMachines}</div>
            <div className="text-sm text-slate-500 dark:text-slate-400">Machines Running</div>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-5 shadow-sm">
          <div className="flex items-start justify-between">
            <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-amber-100 dark:bg-amber-900/30">
              <Calendar className="h-6 w-6 text-amber-600 dark:text-amber-400" />
            </div>
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 dark:bg-amber-900/30 px-2 py-0.5 text-xs font-medium text-amber-700 dark:text-amber-300">
              Pending
            </span>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-slate-900 dark:text-slate-100">{stats.pendingAppointments}</div>
            <div className="text-sm text-slate-500 dark:text-slate-400">Appointments</div>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-5 shadow-sm">
          <div className="flex items-start justify-between">
            <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-violet-100 dark:bg-violet-900/30">
              <DollarSign className="h-6 w-6 text-violet-600 dark:text-violet-400" />
            </div>
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 dark:bg-emerald-900/30 px-2 py-0.5 text-xs font-medium text-emerald-700 dark:text-emerald-300">
              This Month
            </span>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-slate-900 dark:text-slate-100">Rs {stats.revenue.toLocaleString()}</div>
            <div className="text-sm text-slate-500 dark:text-slate-400">This Month</div>
          </div>
        </div>
      </div>

      {/* Charts Row */}
      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        {/* Weekly Sessions Chart */}
        <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100">Weekly Sessions</h2>
            <select className="rounded-md border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 py-1.5 text-sm text-slate-700 dark:text-slate-200">
              <option>Last 7 Days</option>
            </select>
          </div>
          {weeklyData.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={weeklyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="day" tick={{ fontSize: 12 }} stroke="#94a3b8" />
                <YAxis tick={{ fontSize: 12 }} stroke="#94a3b8" />
                <Tooltip 
                  contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0' }}
                />
                <Bar dataKey="sessions" fill="#0d9488" radius={[4, 4, 0, 0]} name="Sessions" />
                <Bar dataKey="patients" fill="#06b6d4" radius={[4, 4, 0, 0]} name="Patients" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[220px] flex items-center justify-center text-slate-400 dark:text-slate-500">
              No session data available
            </div>
          )}
        </div>

        {/* Session Types Pie Chart */}
        <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-5 shadow-sm">
          <div className="mb-4">
            <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100">Session Types</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">Distribution by type</p>
          </div>
          {sessionTypeData.length > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie
                    data={sessionTypeData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={90}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {sessionTypeData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
              <div className="mt-3 flex flex-wrap justify-center gap-4">
                {sessionTypeData.map((item) => (
                  <div key={item.name} className="flex items-center gap-2">
                    <div className="h-3 w-3 rounded-full" style={{ backgroundColor: item.color }} />
                    <span className="text-sm text-slate-600 dark:text-slate-300">{item.name}</span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="h-[220px] flex items-center justify-center text-slate-400 dark:text-slate-500">
              No session type data
            </div>
          )}
        </div>

        {/* Revenue Trend */}
        <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-5 shadow-sm">
          <div className="mb-4">
            <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100">Revenue Trend</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">Last 6 months</p>
          </div>
          {revenueData.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={revenueData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} stroke="#94a3b8" />
                <YAxis tick={{ fontSize: 12 }} stroke="#94a3b8" tickFormatter={(v) => `${v/1000}k`} />
                <Tooltip 
                  contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0' }}
                  formatter={(value: number | undefined) => value != null ? [`Rs ${value.toLocaleString()}`, 'Revenue'] : ['', 'Revenue']}
                />
                <defs>
                  <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#0d9488" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#0d9488" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <Area type="monotone" dataKey="revenue" stroke="#0d9488" strokeWidth={2} fillOpacity={1} fill="url(#colorRevenue)" />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[220px] flex items-center justify-center text-slate-400 dark:text-slate-500">
              No revenue data available
            </div>
          )}
        </div>
      </div>

      {/* Tables Row */}
      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        {/* Recent Sessions */}
        <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-sm">
          <div className="border-b border-slate-200 dark:border-slate-700 px-5 py-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100">Recent Sessions</h2>
              <button 
                onClick={() => navigate('/dialysis/token-history')}
                className="inline-flex items-center gap-1 text-sm font-medium text-teal-600 dark:text-teal-400 hover:text-teal-700 dark:hover:text-teal-300"
              >
                View All
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
          <div className="overflow-x-auto">
            {recentSessions.length > 0 ? (
              <table className="min-w-full">
                <thead className="bg-slate-50 dark:bg-slate-700">
                  <tr>
                    <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-300">Patient</th>
                    <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-300">Type</th>
                    <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-300">Machine</th>
                    <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-300">Time</th>
                    <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-300">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                  {recentSessions.map((session) => (
                    <tr key={session.id} className="hover:bg-slate-50 dark:hover:bg-slate-700">
                      <td className="px-5 py-3">
                        <div className="font-medium text-slate-900 dark:text-slate-100">{session.patient}</div>
                        <div className="text-xs text-slate-500 dark:text-slate-400">{session.mrn}</div>
                      </td>
                      <td className="px-5 py-3 text-sm text-slate-600 dark:text-slate-300">{session.type}</td>
                      <td className="px-5 py-3 text-sm text-slate-600 dark:text-slate-300">{session.machine}</td>
                      <td className="px-5 py-3 text-sm text-slate-600 dark:text-slate-300">{session.time}</td>
                      <td className="px-5 py-3">{getStatusBadge(session.status)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="px-5 py-8 text-center text-slate-400 dark:text-slate-500">
                No recent sessions
              </div>
            )}
          </div>
        </div>

        {/* Upcoming Appointments */}
        <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-sm">
          <div className="border-b border-slate-200 dark:border-slate-700 px-5 py-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100">Upcoming Appointments</h2>
              <button 
                onClick={() => navigate('/dialysis/appointments')}
                className="inline-flex items-center gap-1 text-sm font-medium text-teal-600 dark:text-teal-400 hover:text-teal-700 dark:hover:text-teal-300"
              >
                View All
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
          {upcomingAppointments.length > 0 ? (
            <div className="divide-y divide-slate-100 dark:divide-slate-700">
              {upcomingAppointments.map((apt) => (
                <div key={apt.id} className="flex items-center justify-between px-5 py-4 hover:bg-slate-50 dark:hover:bg-slate-700">
                  <div className="flex items-center gap-4">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-teal-100 dark:bg-teal-900/30">
                      <Clock className="h-5 w-5 text-teal-600 dark:text-teal-400" />
                    </div>
                    <div>
                      <div className="font-medium text-slate-900 dark:text-slate-100">{apt.patient}</div>
                      <div className="text-sm text-slate-500 dark:text-slate-400">{apt.type} • {apt.shift}</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-medium text-slate-900 dark:text-slate-100">{apt.time}</div>
                    <div className="text-sm text-slate-500 dark:text-slate-400">Today</div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="px-5 py-8 text-center text-slate-400 dark:text-slate-500">
              No upcoming appointments for today
            </div>
          )}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <button 
          onClick={() => navigate('/dialysis/token-generator')}
          className="flex items-center gap-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-5 shadow-sm hover:border-teal-300 dark:hover:border-teal-600 hover:shadow-md transition-all"
        >
          <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-gradient-to-br from-teal-500 to-cyan-500">
            <Droplets className="h-6 w-6 text-white" />
          </div>
          <div className="text-left">
            <div className="font-semibold text-slate-900 dark:text-slate-100">New Session</div>
            <div className="text-sm text-slate-500 dark:text-slate-400">Generate token</div>
          </div>
        </button>

        <button 
          onClick={() => navigate('/dialysis/token-history')}
          className="flex items-center gap-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-5 shadow-sm hover:border-cyan-300 dark:hover:border-cyan-600 hover:shadow-md transition-all"
        >
          <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-gradient-to-br from-cyan-500 to-teal-500">
            <Activity className="h-6 w-6 text-white" />
          </div>
          <div className="text-left">
            <div className="font-semibold text-slate-900 dark:text-slate-100">Session History</div>
            <div className="text-sm text-slate-500 dark:text-slate-400">View all records</div>
          </div>
        </button>

        <button 
          onClick={() => navigate('/dialysis/appointments')}
          className="flex items-center gap-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-5 shadow-sm hover:border-amber-300 dark:hover:border-amber-600 hover:shadow-md transition-all"
        >
          <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-gradient-to-br from-amber-500 to-orange-500">
            <Calendar className="h-6 w-6 text-white" />
          </div>
          <div className="text-left">
            <div className="font-semibold text-slate-900 dark:text-slate-100">Appointments</div>
            <div className="text-sm text-slate-500 dark:text-slate-400">Manage bookings</div>
          </div>
        </button>

        <button 
          onClick={() => navigate('/dialysis/master-data')}
          className="flex items-center gap-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-5 shadow-sm hover:border-violet-300 dark:hover:border-violet-600 hover:shadow-md transition-all"
        >
          <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-gradient-to-br from-violet-500 to-purple-500">
            <Stethoscope className="h-6 w-6 text-white" />
          </div>
          <div className="text-left">
            <div className="font-semibold text-slate-900 dark:text-slate-100">Master Data</div>
            <div className="text-sm text-slate-500 dark:text-slate-400">Configure settings</div>
          </div>
        </button>
      </div>
    </div>
  )
}
