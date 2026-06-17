import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Activity,
  Users,
  ClipboardList,
  CheckCircle2,
  Clock,
  AlertTriangle,
  TrendingUp,
  Calendar,
  ArrowRight,
  HeartPulse,
  Bed,
  Thermometer,
  UserCheck,
  BarChart3
} from 'lucide-react'
import { hospitalApi } from '../../utils/api'

interface DashboardStats {
  totalNurses: number
  activeNurses: number
  onDutyNurses: number
  pendingTasks: number
  completedTasks: number
  overdueTasks: number
  statTasks: number
  averageResponseTime: number
  todayShifts: number
  checkedInNurses: number
  wardCoverage: Array<{ ward: string; nurses: number; patients: number }>
  recentTasks: Array<{
    _id: string
    taskType: string
    patientName: string
    priority: string
    status: string
    assignedToName: string
    dueTime: string
  }>
}

export default function Hospital_NurseAdminDashboard() {
  const navigate = useNavigate()
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const session = localStorage.getItem('hospital.session')
    if (!session) {
      navigate('/hospital/nurse/login')
      return
    }
    loadStats()
  }, [navigate])

  const loadStats = async () => {
    try {
      setLoading(true)
      const res: any = await hospitalApi.getNurseAdminDashboard()
      setStats(res)
    } catch (e) {
      console.error('Failed to load admin dashboard:', e)
    } finally {
      setLoading(false)
    }
  }

  const formatTime = (dateString: string) => {
    if (!dateString) return 'N/A'
    const diff = new Date(dateString).getTime() - Date.now()
    const minutes = Math.round(diff / 60000)
    if (minutes < 0) return 'Overdue'
    if (minutes < 60) return `${minutes}m`
    return `${Math.round(minutes / 60)}h`
  }

  const priorityColors: Record<string, string> = {
    stat: 'bg-red-100 text-red-700 border-red-200',
    urgent: 'bg-amber-100 text-amber-700 border-amber-200',
    routine: 'bg-blue-100 text-blue-700 border-blue-200'
  }

  const statusColors: Record<string, string> = {
    pending: 'bg-slate-100 text-slate-600',
    in_progress: 'bg-blue-100 text-blue-700',
    completed: 'bg-emerald-100 text-emerald-700',
    overdue: 'bg-red-100 text-red-700'
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 px-6 py-4">
        <div className="flex items-center justify-between max-w-7xl mx-auto">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-rose-100 flex items-center justify-center">
              <HeartPulse className="w-5 h-5 text-rose-600" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-800">Nurse Admin Dashboard</h1>
              <p className="text-sm text-slate-500">Health Spire</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/hospital/nurse/dashboard')}
              className="px-4 py-2 text-sm font-medium text-rose-600 bg-rose-50 hover:bg-rose-100 rounded-lg transition-colors"
            >
              Switch to Nurse Portal
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-6">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="w-8 h-8 border-4 border-rose-200 border-t-rose-600 rounded-full animate-spin" />
          </div>
        ) : !stats ? (
          <div className="text-center py-12">
            <Activity className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <h3 className="text-lg font-medium text-slate-700">No data available</h3>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Quick Stats Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-white rounded-xl border border-slate-200 p-5">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm text-slate-500">Total Nurses</span>
                  <Users className="w-5 h-5 text-rose-500" />
                </div>
                <div className="text-3xl font-bold text-slate-800">{stats.totalNurses}</div>
                <div className="text-sm text-emerald-600 mt-1">{stats.activeNurses} active</div>
              </div>

              <div className="bg-white rounded-xl border border-slate-200 p-5">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm text-slate-500">On Duty</span>
                  <UserCheck className="w-5 h-5 text-emerald-500" />
                </div>
                <div className="text-3xl font-bold text-slate-800">{stats.onDutyNurses}</div>
                <div className="text-sm text-slate-500 mt-1">{stats.checkedInNurses} checked in</div>
              </div>

              <div className="bg-white rounded-xl border border-slate-200 p-5">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm text-slate-500">Pending Tasks</span>
                  <ClipboardList className="w-5 h-5 text-amber-500" />
                </div>
                <div className="text-3xl font-bold text-slate-800">{stats.pendingTasks}</div>
                <div className="text-sm text-red-600 mt-1">{stats.overdueTasks} overdue</div>
              </div>

              <div className="bg-white rounded-xl border border-slate-200 p-5">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm text-slate-500">Completed Today</span>
                  <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                </div>
                <div className="text-3xl font-bold text-slate-800">{stats.completedTasks}</div>
                <div className="text-sm text-slate-500 mt-1">
                  {stats.averageResponseTime > 0 ? `Avg ${stats.averageResponseTime}m response` : 'No data'}
                </div>
              </div>
            </div>

            {/* Stat Cards Row */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-red-50 rounded-xl border border-red-200 p-5 flex items-center gap-4">
                <div className="w-12 h-12 rounded-lg bg-red-100 flex items-center justify-center shrink-0">
                  <AlertTriangle className="w-6 h-6 text-red-600" />
                </div>
                <div>
                  <div className="text-2xl font-bold text-red-700">{stats.statTasks}</div>
                  <div className="text-sm text-red-600">STAT/Emergency Tasks</div>
                </div>
              </div>

              <div className="bg-blue-50 rounded-xl border border-blue-200 p-5 flex items-center gap-4">
                <div className="w-12 h-12 rounded-lg bg-blue-100 flex items-center justify-center shrink-0">
                  <Calendar className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <div className="text-2xl font-bold text-blue-700">{stats.todayShifts}</div>
                  <div className="text-sm text-blue-600">Shifts Scheduled Today</div>
                </div>
              </div>

              <div className="bg-emerald-50 rounded-xl border border-emerald-200 p-5 flex items-center gap-4">
                <div className="w-12 h-12 rounded-lg bg-emerald-100 flex items-center justify-center shrink-0">
                  <TrendingUp className="w-6 h-6 text-emerald-600" />
                </div>
                <div>
                  <div className="text-2xl font-bold text-emerald-700">
                    {stats.completedTasks + stats.pendingTasks > 0
                      ? Math.round((stats.completedTasks / (stats.completedTasks + stats.pendingTasks)) * 100)
                      : 0}%
                  </div>
                  <div className="text-sm text-emerald-600">Task Completion Rate</div>
                </div>
              </div>
            </div>

            {/* Ward Coverage & Recent Tasks */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Ward Coverage */}
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
                    <Bed className="w-5 h-5 text-slate-500" />
                    Ward Coverage
                  </h2>
                </div>
                <div className="divide-y divide-slate-100">
                  {stats.wardCoverage?.length === 0 ? (
                    <div className="px-6 py-8 text-center text-slate-500">No ward data</div>
                  ) : (
                    stats.wardCoverage?.map((ward, i) => (
                      <div key={i} className="px-6 py-4 flex items-center justify-between">
                        <div>
                          <div className="font-medium text-slate-800">{ward.ward}</div>
                          <div className="text-sm text-slate-500">{ward.patients} patients</div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Users className="w-4 h-4 text-rose-500" />
                          <span className="font-semibold text-slate-700">{ward.nurses}</span>
                          <span className="text-sm text-slate-500">nurses</span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Recent Tasks */}
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
                    <ClipboardList className="w-5 h-5 text-slate-500" />
                    Recent Tasks
                  </h2>
                  <button
                    onClick={() => navigate('/hospital/nurse/tasks')}
                    className="text-sm text-rose-600 hover:text-rose-700 font-medium flex items-center gap-1"
                  >
                    View All <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
                <div className="divide-y divide-slate-100">
                  {stats.recentTasks?.length === 0 ? (
                    <div className="px-6 py-8 text-center text-slate-500">No recent tasks</div>
                  ) : (
                    stats.recentTasks?.slice(0, 6).map((task) => (
                      <div key={task._id} className="px-6 py-3 hover:bg-slate-50 transition-colors">
                        <div className="flex items-start justify-between">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-slate-800 truncate">{task.taskType}</span>
                              <span className={`px-2 py-0.5 rounded-full text-xs font-medium border ${priorityColors[task.priority] || priorityColors.routine}`}>
                                {task.priority}
                              </span>
                            </div>
                            <div className="text-sm text-slate-500 mt-0.5">{task.patientName}</div>
                            <div className="text-xs text-slate-400 mt-0.5">
                              Assigned to {task.assignedToName}
                            </div>
                          </div>
                          <div className="flex flex-col items-end gap-1">
                            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusColors[task.status] || statusColors.pending}`}>
                              {task.status}
                            </span>
                            <span className="text-xs text-slate-400 flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {formatTime(task.dueTime)}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="bg-white rounded-xl border border-slate-200 p-6">
              <h2 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-slate-500" />
                Quick Actions
              </h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <button
                  onClick={() => navigate('/hospital/nurse/tasks')}
                  className="p-4 bg-rose-50 hover:bg-rose-100 rounded-lg text-left transition-colors"
                >
                  <ClipboardList className="w-6 h-6 text-rose-600 mb-2" />
                  <div className="font-medium text-slate-800">Task Queue</div>
                  <div className="text-sm text-slate-500">Manage all tasks</div>
                </button>
                <button
                  onClick={() => navigate('/hospital/nurse/patients')}
                  className="p-4 bg-blue-50 hover:bg-blue-100 rounded-lg text-left transition-colors"
                >
                  <Users className="w-6 h-6 text-blue-600 mb-2" />
                  <div className="font-medium text-slate-800">Patients</div>
                  <div className="text-sm text-slate-500">View all patients</div>
                </button>
                <button
                  onClick={() => navigate('/hospital/nurse/vitals')}
                  className="p-4 bg-emerald-50 hover:bg-emerald-100 rounded-lg text-left transition-colors"
                >
                  <Thermometer className="w-6 h-6 text-emerald-600 mb-2" />
                  <div className="font-medium text-slate-800">Vitals Entry</div>
                  <div className="text-sm text-slate-500">Record vitals</div>
                </button>
                <button
                  onClick={() => navigate('/hospital/nurse/shifts')}
                  className="p-4 bg-amber-50 hover:bg-amber-100 rounded-lg text-left transition-colors"
                >
                  <Calendar className="w-6 h-6 text-amber-600 mb-2" />
                  <div className="font-medium text-slate-800">Shift Schedule</div>
                  <div className="text-sm text-slate-500">View shifts</div>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
