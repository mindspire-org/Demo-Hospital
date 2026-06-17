import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { 
  HeartPulse, 
  ClipboardList, 
  Users, 
  Calendar, 
  Activity,
  Clock,
  AlertCircle,
  CheckCircle2,
  ArrowRight,
  Thermometer,
  Syringe,
  Pill,
  Droplets
} from 'lucide-react'
import { hospitalApi } from '../../utils/api'

interface DashboardStats {
  currentShift: any | null
  tasks: {
    pending: number
    inProgress: number
    completedToday: number
    overdue: number
    total: number
  }
  patientsUnderCare: number
}

interface PendingTask {
  _id: string
  taskId: string
  patientName: string
  patientMrn: string
  taskType: string
  priority: 'routine' | 'urgent' | 'stat' | 'emergency'
  status: string
  scheduledTime: string
  location: string
  ward?: string
  bedNumber?: string
}

const taskTypeIcons: Record<string, any> = {
  injection: Syringe,
  iv_drip: Droplets,
  iv_medication: Droplets,
  oral_medication: Pill,
  vitals: Thermometer,
  default: ClipboardList
}

const priorityColors: Record<string, string> = {
  routine: 'bg-blue-100 text-blue-700 border-blue-200',
  urgent: 'bg-orange-100 text-orange-700 border-orange-200',
  stat: 'bg-red-100 text-red-700 border-red-200',
  emergency: 'bg-red-200 text-red-800 border-red-300'
}

const priorityLabels: Record<string, string> = {
  routine: 'Routine',
  urgent: 'Urgent',
  stat: 'STAT',
  emergency: 'Emergency'
}

export default function Hospital_NurseDashboard() {
  const navigate = useNavigate()
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [pendingTasks, setPendingTasks] = useState<PendingTask[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [currentTime, setCurrentTime] = useState(new Date())

  useEffect(() => {
    // Check authentication
    const session = localStorage.getItem('hospital.session')
    if (!session) {
      navigate('/hospital/nurse/login')
      return
    }

    loadDashboardData()
    
    // Update clock every minute
    const timeInterval = setInterval(() => setCurrentTime(new Date()), 60000)
    
    // Refresh data every 30 seconds
    const dataInterval = setInterval(loadDashboardData, 30000)
    
    return () => {
      clearInterval(timeInterval)
      clearInterval(dataInterval)
    }
  }, [navigate])

  const loadDashboardData = async () => {
    try {
      setLoading(true)
      
      // Load dashboard stats
      const statsRes: any = await hospitalApi.getNurseDashboardStats()
      setStats(statsRes)
      
      // Load pending tasks
      const tasksRes: any = await hospitalApi.getPendingNurseTasks()
      setPendingTasks(tasksRes.items || [])
      
      setError('')
    } catch (e: any) {
      console.error('Failed to load dashboard:', e)
      setError('Failed to load dashboard data')
    } finally {
      setLoading(false)
    }
  }

  const formatTime = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
  }

  const getTaskIcon = (taskType: string) => {
    const Icon = taskTypeIcons[taskType] || taskTypeIcons.default
    return <Icon className="w-5 h-5" />
  }

  const handleAcceptTask = async (taskId: string) => {
    try {
      await hospitalApi.acceptNurseTask(taskId)
      loadDashboardData()
    } catch (e) {
      console.error('Failed to accept task:', e)
    }
  }

  if (loading && !stats) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-rose-200 border-t-rose-600 rounded-full animate-spin" />
          <p className="text-slate-500">Loading dashboard...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 px-6 py-4">
        <div className="flex items-center justify-between max-w-7xl mx-auto">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-rose-100 flex items-center justify-center">
              <HeartPulse className="w-5 h-5 text-rose-600" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-800">Nurse Dashboard</h1>
              <p className="text-sm text-slate-500">
                {currentTime.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            {stats?.currentShift && (
              <div className="flex items-center gap-2 px-4 py-2 bg-rose-50 rounded-lg border border-rose-100">
                <Clock className="w-4 h-4 text-rose-600" />
                <span className="text-sm font-medium text-rose-700">
                  {stats.currentShift.shiftType.charAt(0).toUpperCase() + stats.currentShift.shiftType.slice(1)} Shift
                </span>
              </div>
            )}
            <button 
              onClick={() => navigate('/hospital/nurse/tasks')}
              className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-sm font-medium transition-colors"
            >
              View All Tasks
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto p-6">
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-600">
            {error}
          </div>
        )}

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-slate-500 mb-1">Pending Tasks</p>
                <p className="text-2xl font-bold text-slate-800">{stats?.tasks.pending || 0}</p>
              </div>
              <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center">
                <ClipboardList className="w-5 h-5 text-amber-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-slate-500 mb-1">In Progress</p>
                <p className="text-2xl font-bold text-slate-800">{stats?.tasks.inProgress || 0}</p>
              </div>
              <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                <Clock className="w-5 h-5 text-blue-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-slate-500 mb-1">Completed Today</p>
                <p className="text-2xl font-bold text-emerald-600">{stats?.tasks.completedToday || 0}</p>
              </div>
              <div className="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center">
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-slate-500 mb-1">Patients Under Care</p>
                <p className="text-2xl font-bold text-slate-800">{stats?.patientsUnderCare || 0}</p>
              </div>
              <div className="w-10 h-10 rounded-lg bg-indigo-100 flex items-center justify-center">
                <Users className="w-5 h-5 text-indigo-600" />
              </div>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <button 
            onClick={() => navigate('/hospital/nurse/vitals')}
            className="flex flex-col items-center gap-2 p-4 bg-white rounded-xl border border-slate-200 hover:border-rose-300 hover:shadow-md transition-all"
          >
            <div className="w-12 h-12 rounded-xl bg-rose-100 flex items-center justify-center">
              <Thermometer className="w-6 h-6 text-rose-600" />
            </div>
            <span className="text-sm font-medium text-slate-700">Record Vitals</span>
          </button>

          <button 
            onClick={() => navigate('/hospital/nurse/patients')}
            className="flex flex-col items-center gap-2 p-4 bg-white rounded-xl border border-slate-200 hover:border-rose-300 hover:shadow-md transition-all"
          >
            <div className="w-12 h-12 rounded-xl bg-indigo-100 flex items-center justify-center">
              <Users className="w-6 h-6 text-indigo-600" />
            </div>
            <span className="text-sm font-medium text-slate-700">My Patients</span>
          </button>

          <button 
            onClick={() => navigate('/hospital/nurse/shifts')}
            className="flex flex-col items-center gap-2 p-4 bg-white rounded-xl border border-slate-200 hover:border-rose-300 hover:shadow-md transition-all"
          >
            <div className="w-12 h-12 rounded-xl bg-amber-100 flex items-center justify-center">
              <Calendar className="w-6 h-6 text-amber-600" />
            </div>
            <span className="text-sm font-medium text-slate-700">My Shifts</span>
          </button>

          <button 
            onClick={() => navigate('/hospital/nurse/performance')}
            className="flex flex-col items-center gap-2 p-4 bg-white rounded-xl border border-slate-200 hover:border-rose-300 hover:shadow-md transition-all"
          >
            <div className="w-12 h-12 rounded-xl bg-emerald-100 flex items-center justify-center">
              <Activity className="w-6 h-6 text-emerald-600" />
            </div>
            <span className="text-sm font-medium text-slate-700">Performance</span>
          </button>
        </div>

        {/* Pending Tasks Section */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-800">Pending Tasks</h2>
            {stats?.tasks.overdue ? (
              <div className="flex items-center gap-2 px-3 py-1 bg-red-50 rounded-full border border-red-200">
                <AlertCircle className="w-4 h-4 text-red-600" />
                <span className="text-sm font-medium text-red-600">{stats.tasks.overdue} Overdue</span>
              </div>
            ) : null}
          </div>

          <div className="divide-y divide-slate-100">
            {pendingTasks.length === 0 ? (
              <div className="px-6 py-12 text-center">
                <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-4">
                  <CheckCircle2 className="w-8 h-8 text-slate-400" />
                </div>
                <h3 className="text-lg font-medium text-slate-700 mb-1">All caught up!</h3>
                <p className="text-slate-500">No pending tasks at the moment.</p>
              </div>
            ) : (
              pendingTasks.map((task) => (
                <div key={task._id} className="px-6 py-4 hover:bg-slate-50 transition-colors">
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center shrink-0">
                      {getTaskIcon(task.taskType)}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="font-medium text-slate-800">{task.patientName}</p>
                          <p className="text-sm text-slate-500">MRN: {task.patientMrn}</p>
                          {task.ward && (
                            <p className="text-sm text-slate-500">
                              {task.ward} {task.bedNumber && `• Bed ${task.bedNumber}`}
                            </p>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium border ${priorityColors[task.priority]}`}>
                            {priorityLabels[task.priority]}
                          </span>
                        </div>
                      </div>
                      
                      <div className="flex items-center justify-between mt-3">
                        <div className="flex items-center gap-4 text-sm text-slate-500">
                          <span className="flex items-center gap-1">
                            <Clock className="w-4 h-4" />
                            {formatTime(task.scheduledTime)}
                          </span>
                          <span className="capitalize">{task.location.toLowerCase()}</span>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          {task.status === 'pending' ? (
                            <button
                              onClick={() => handleAcceptTask(task._id)}
                              className="px-4 py-1.5 bg-rose-600 hover:bg-rose-700 text-white text-sm font-medium rounded-lg transition-colors"
                            >
                              Accept
                            </button>
                          ) : (
                            <button
                              onClick={() => navigate(`/hospital/nurse/tasks/${task._id}`)}
                              className="px-4 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-medium rounded-lg transition-colors flex items-center gap-1"
                            >
                              View <ArrowRight className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
