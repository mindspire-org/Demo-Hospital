import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { 
  ClipboardList, 
  Clock,
  Filter,
  Search,
  ArrowLeft,
  Thermometer,
  Syringe,
  Pill,
  Droplets,
  HeartPulse
} from 'lucide-react'
import { hospitalApi } from '../../utils/api'

interface NurseTask {
  _id: string
  taskId: string
  patientName: string
  patientMrn: string
  taskType: string
  priority: 'routine' | 'urgent' | 'stat' | 'emergency'
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled' | 'overdue'
  scheduledTime: string
  location: string
  ward?: string
  bedNumber?: string
  medicationName?: string
  dosage?: string
}

const taskTypeIcons: Record<string, any> = {
  injection: Syringe,
  iv_drip: Droplets,
  iv_medication: Droplets,
  oral_medication: Pill,
  dressing: ClipboardList,
  vitals: Thermometer,
  nebulization: HeartPulse,
  ecg: HeartPulse,
  catheterization: ClipboardList,
  default: ClipboardList
}

const priorityColors: Record<string, string> = {
  routine: 'bg-blue-100 text-blue-700 border-blue-200',
  urgent: 'bg-orange-100 text-orange-700 border-orange-200',
  stat: 'bg-red-100 text-red-700 border-red-200',
  emergency: 'bg-red-200 text-red-800 border-red-300'
}

const statusColors: Record<string, string> = {
  pending: 'bg-amber-100 text-amber-700',
  in_progress: 'bg-blue-100 text-blue-700',
  completed: 'bg-emerald-100 text-emerald-700',
  cancelled: 'bg-slate-100 text-slate-600',
  overdue: 'bg-red-100 text-red-700'
}

export default function Hospital_NurseTasks() {
  const navigate = useNavigate()
  const [tasks, setTasks] = useState<NurseTask[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'pending' | 'in_progress' | 'completed'>('all')
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
    const session = localStorage.getItem('hospital.session')
    if (!session) {
      navigate('/hospital/nurse/login')
      return
    }
    loadTasks()
  }, [navigate, filter])

  const loadTasks = async () => {
    try {
      setLoading(true)
      const params: any = {}
      if (filter !== 'all') {
        params.status = filter
      }
      const res: any = await hospitalApi.listNurseTasks(params)
      setTasks(res.items || [])
    } catch (e) {
      console.error('Failed to load tasks:', e)
    } finally {
      setLoading(false)
    }
  }

  const handleAcceptTask = async (taskId: string) => {
    try {
      await hospitalApi.acceptNurseTask(taskId)
      loadTasks()
    } catch (e) {
      console.error('Failed to accept task:', e)
    }
  }

  const handleCompleteTask = async (taskId: string) => {
    try {
      await hospitalApi.completeNurseTask(taskId, {})
      loadTasks()
    } catch (e) {
      console.error('Failed to complete task:', e)
    }
  }

  const filteredTasks = tasks.filter(task => 
    task.patientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    task.patientMrn.toLowerCase().includes(searchQuery.toLowerCase()) ||
    task.taskId.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const getTaskIcon = (taskType: string) => {
    const Icon = taskTypeIcons[taskType] || taskTypeIcons.default
    return <Icon className="w-5 h-5" />
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 px-6 py-4">
        <div className="flex items-center justify-between max-w-7xl mx-auto">
          <div className="flex items-center gap-3">
            <button 
              onClick={() => navigate('/hospital/nurse/dashboard')}
              className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-slate-600" />
            </button>
            <h1 className="text-xl font-bold text-slate-800">My Tasks</h1>
          </div>
          
          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search tasks..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-rose-500 w-64"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white border-b border-slate-200 px-6 py-3">
        <div className="flex items-center gap-2 max-w-7xl mx-auto">
          <Filter className="w-4 h-4 text-slate-400 mr-2" />
          {(['all', 'pending', 'in_progress', 'completed'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
                filter === f 
                  ? 'bg-rose-100 text-rose-700' 
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {f === 'all' ? 'All' : f.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
            </button>
          ))}
        </div>
      </div>

      {/* Task List */}
      <div className="max-w-7xl mx-auto p-6">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="w-8 h-8 border-4 border-rose-200 border-t-rose-600 rounded-full animate-spin" />
          </div>
        ) : filteredTasks.length === 0 ? (
          <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
            <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-4">
              <ClipboardList className="w-8 h-8 text-slate-400" />
            </div>
            <h3 className="text-lg font-medium text-slate-700 mb-1">No tasks found</h3>
            <p className="text-slate-500">You don't have any {filter !== 'all' ? filter.replace('_', ' ') : ''} tasks.</p>
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="divide-y divide-slate-100">
              {filteredTasks.map((task) => (
                <div 
                  key={task._id} 
                  className="px-6 py-4 hover:bg-slate-50 transition-colors cursor-pointer"
                  onClick={() => navigate(`/hospital/nurse/tasks/${task._id}`)}
                >
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center shrink-0">
                      {getTaskIcon(task.taskType)}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="font-medium text-slate-800">{task.patientName}</p>
                            <span className="text-sm text-slate-500">({task.patientMrn})</span>
                          </div>
                          {task.medicationName && (
                            <p className="text-sm text-slate-600 mt-0.5">
                              {task.medicationName} {task.dosage && `• ${task.dosage}`}
                            </p>
                          )}
                          {task.ward && (
                            <p className="text-sm text-slate-500 mt-0.5">
                              {task.ward} {task.bedNumber && `• Bed ${task.bedNumber}`}
                            </p>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium border ${priorityColors[task.priority]}`}>
                            {task.priority}
                          </span>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium capitalize ${statusColors[task.status]}`}>
                            {task.status.replace('_', ' ')}
                          </span>
                        </div>
                      </div>
                      
                      <div className="flex items-center justify-between mt-3">
                        <div className="flex items-center gap-4 text-sm text-slate-500">
                          <span className="flex items-center gap-1">
                            <Clock className="w-4 h-4" />
                            {new Date(task.scheduledTime).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                          </span>
                          <span className="font-mono text-xs">{task.taskId}</span>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          {task.status === 'pending' && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                handleAcceptTask(task._id)
                              }}
                              className="px-4 py-1.5 bg-rose-600 hover:bg-rose-700 text-white text-sm font-medium rounded-lg transition-colors"
                            >
                              Accept
                            </button>
                          )}
                          {task.status === 'in_progress' && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                handleCompleteTask(task._id)
                              }}
                              className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium rounded-lg transition-colors"
                            >
                              Complete
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
