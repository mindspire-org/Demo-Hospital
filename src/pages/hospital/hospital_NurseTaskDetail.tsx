import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { 
  ArrowLeft, 
  Clock, 
  User, 
  FileText,
  CheckCircle2,
  AlertCircle,
  Thermometer,
  Syringe,
  Pill,
  Droplets,
  HeartPulse,
  ClipboardList
} from 'lucide-react'
import { hospitalApi } from '../../utils/api'

interface NurseTask {
  _id: string
  taskId: string
  patientName: string
  patientMrn: string
  patientId: string
  taskType: string
  priority: 'routine' | 'urgent' | 'stat' | 'emergency'
  status: string
  scheduledTime: string
  location: string
  ward?: string
  bedNumber?: string
  medicationName?: string
  dosage?: string
  route?: string
  frequency?: string
  specialInstructions?: string
  notes?: string
  complications?: string
  patientResponse?: string
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

export default function Hospital_NurseTaskDetail() {
  const navigate = useNavigate()
  const { id } = useParams()
  const [task, setTask] = useState<NurseTask | null>(null)
  const [loading, setLoading] = useState(true)
  const [notes, setNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    const session = localStorage.getItem('hospital.session')
    if (!session) {
      navigate('/hospital/nurse/login')
      return
    }
    if (id) {
      loadTask()
    }
  }, [navigate, id])

  const loadTask = async () => {
    try {
      setLoading(true)
      const res: any = await hospitalApi.getNurseTask(id!)
      setTask(res)
      setNotes(res.notes || '')
    } catch (e) {
      console.error('Failed to load task:', e)
    } finally {
      setLoading(false)
    }
  }

  const handleAccept = async () => {
    try {
      setSubmitting(true)
      await hospitalApi.acceptNurseTask(id!)
      loadTask()
    } catch (e) {
      console.error('Failed to accept task:', e)
    } finally {
      setSubmitting(false)
    }
  }

  const handleComplete = async () => {
    try {
      setSubmitting(true)
      await hospitalApi.completeNurseTask(id!, { notes })
      loadTask()
    } catch (e) {
      console.error('Failed to complete task:', e)
    } finally {
      setSubmitting(false)
    }
  }

  const getTaskIcon = (taskType: string) => {
    const Icon = taskTypeIcons[taskType] || taskTypeIcons.default
    return <Icon className="w-6 h-6" />
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-rose-200 border-t-rose-600 rounded-full animate-spin" />
      </div>
    )
  }

  if (!task) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-slate-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-slate-700">Task not found</h3>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 px-6 py-4">
        <div className="flex items-center justify-between max-w-4xl mx-auto">
          <div className="flex items-center gap-3">
            <button 
              onClick={() => navigate('/hospital/nurse/tasks')}
              className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-slate-600" />
            </button>
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center">
                {getTaskIcon(task.taskType)}
              </div>
              <div>
                <h1 className="text-xl font-bold text-slate-800">Task {task.taskId}</h1>
                <p className="text-sm text-slate-500 capitalize">{task.taskType.replace('_', ' ')}</p>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <span className={`px-3 py-1 rounded-full text-sm font-medium border ${priorityColors[task.priority]}`}>
              {task.priority}
            </span>
            <span className={`px-3 py-1 rounded-full text-sm font-medium capitalize ${statusColors[task.status]}`}>
              {task.status.replace('_', ' ')}
            </span>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto p-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Info */}
          <div className="lg:col-span-2 space-y-6">
            {/* Patient Info */}
            <div className="bg-white rounded-xl border border-slate-200 p-6">
              <h2 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
                <User className="w-5 h-5 text-slate-500" />
                Patient Information
              </h2>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-slate-500">Name</p>
                  <p className="font-medium text-slate-800">{task.patientName}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-500">MRN</p>
                  <p className="font-medium text-slate-800">{task.patientMrn}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-500">Location</p>
                  <p className="font-medium text-slate-800">{task.location}</p>
                </div>
                {task.ward && (
                  <div>
                    <p className="text-sm text-slate-500">Ward/Bed</p>
                    <p className="font-medium text-slate-800">{task.ward} {task.bedNumber && `• Bed ${task.bedNumber}`}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Medication Details */}
            {task.medicationName && (
              <div className="bg-white rounded-xl border border-slate-200 p-6">
                <h2 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
                  <Pill className="w-5 h-5 text-slate-500" />
                  Medication Details
                </h2>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-slate-500">Medication</p>
                    <p className="font-medium text-slate-800">{task.medicationName}</p>
                  </div>
                  {task.dosage && (
                    <div>
                      <p className="text-sm text-slate-500">Dosage</p>
                      <p className="font-medium text-slate-800">{task.dosage}</p>
                    </div>
                  )}
                  {task.route && (
                    <div>
                      <p className="text-sm text-slate-500">Route</p>
                      <p className="font-medium text-slate-800">{task.route}</p>
                    </div>
                  )}
                  {task.frequency && (
                    <div>
                      <p className="text-sm text-slate-500">Frequency</p>
                      <p className="font-medium text-slate-800">{task.frequency}</p>
                    </div>
                  )}
                </div>
                {task.specialInstructions && (
                  <div className="mt-4 p-3 bg-amber-50 rounded-lg border border-amber-200">
                    <p className="text-sm text-amber-800">
                      <span className="font-medium">Special Instructions:</span> {task.specialInstructions}
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Notes */}
            {task.status !== 'completed' && (
              <div className="bg-white rounded-xl border border-slate-200 p-6">
                <h2 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
                  <FileText className="w-5 h-5 text-slate-500" />
                  Notes
                </h2>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Add notes about task completion..."
                  className="w-full px-4 py-3 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500 min-h-[120px]"
                />
              </div>
            )}

            {/* Completed Notes */}
            {task.status === 'completed' && task.notes && (
              <div className="bg-white rounded-xl border border-slate-200 p-6">
                <h2 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                  Completion Notes
                </h2>
                <p className="text-slate-700">{task.notes}</p>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Schedule Info */}
            <div className="bg-white rounded-xl border border-slate-200 p-6">
              <h3 className="font-semibold text-slate-800 mb-4">Schedule</h3>
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-sm">
                  <Clock className="w-4 h-4 text-slate-400" />
                  <span className="text-slate-500">Scheduled:</span>
                  <span className="font-medium">
                    {new Date(task.scheduledTime).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="bg-white rounded-xl border border-slate-200 p-6">
              <h3 className="font-semibold text-slate-800 mb-4">Actions</h3>
              
              {task.status === 'pending' && (
                <button
                  onClick={handleAccept}
                  disabled={submitting}
                  className="w-full py-3 px-4 bg-rose-600 hover:bg-rose-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50"
                >
                  {submitting ? 'Accepting...' : 'Accept Task'}
                </button>
              )}
              
              {task.status === 'in_progress' && (
                <button
                  onClick={handleComplete}
                  disabled={submitting}
                  className="w-full py-3 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50"
                >
                  {submitting ? 'Completing...' : 'Complete Task'}
                </button>
              )}
              
              {task.status === 'completed' && (
                <div className="flex items-center justify-center gap-2 py-3 px-4 bg-emerald-50 text-emerald-700 rounded-lg">
                  <CheckCircle2 className="w-5 h-5" />
                  <span className="font-medium">Task Completed</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
