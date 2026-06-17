import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { 
  Calendar, 
  ArrowLeft, 
  Clock,
  MapPin,
  CheckCircle2,
  XCircle,
  Sun,
  Sunset,
  Moon,
  Users
} from 'lucide-react'
import { hospitalApi } from '../../utils/api'

interface NurseShift {
  _id: string
  date: string
  shiftType: 'morning' | 'evening' | 'night'
  startTime: string
  endTime: string
  wardAssignments: string[]
  bedCount: number
  status: 'scheduled' | 'checked_in' | 'checked_out' | 'cancelled'
  checkInAt?: string
  checkOutAt?: string
  lateMinutes: number
  tasksAssigned: number
  tasksCompleted: number
}

const shiftIcons = {
  morning: Sun,
  evening: Sunset,
  night: Moon
}

const shiftColors = {
  morning: 'bg-amber-100 text-amber-700 border-amber-200',
  evening: 'bg-orange-100 text-orange-700 border-orange-200',
  night: 'bg-indigo-100 text-indigo-700 border-indigo-200'
}

const statusColors = {
  scheduled: 'bg-slate-100 text-slate-600',
  checked_in: 'bg-emerald-100 text-emerald-700',
  checked_out: 'bg-blue-100 text-blue-700',
  cancelled: 'bg-red-100 text-red-600'
}

export default function Hospital_NurseShifts() {
  const navigate = useNavigate()
  const [shifts, setShifts] = useState<NurseShift[]>([])
  const [loading, setLoading] = useState(true)
  const [currentShift, setCurrentShift] = useState<NurseShift | null>(null)

  useEffect(() => {
    const session = localStorage.getItem('hospital.session')
    if (!session) {
      navigate('/hospital/nurse/login')
      return
    }
    loadShifts()
    loadCurrentShift()
  }, [navigate])

  const loadShifts = async () => {
    try {
      setLoading(true)
      const res: any = await hospitalApi.getMyNurseShifts({ limit: 30 })
      setShifts(res.items || [])
    } catch (e) {
      console.error('Failed to load shifts:', e)
    } finally {
      setLoading(false)
    }
  }

  const loadCurrentShift = async () => {
    try {
      const res: any = await hospitalApi.getCurrentNurseShift()
      setCurrentShift(res)
    } catch (e) {
      console.error('Failed to load current shift:', e)
    }
  }

  const handleCheckIn = async () => {
    if (!currentShift) return
    try {
      await hospitalApi.checkInNurseShift(currentShift._id)
      loadCurrentShift()
      loadShifts()
    } catch (e) {
      console.error('Failed to check in:', e)
    }
  }

  const handleCheckOut = async () => {
    if (!currentShift) return
    try {
      await hospitalApi.checkOutNurseShift(currentShift._id)
      loadCurrentShift()
      loadShifts()
    } catch (e) {
      console.error('Failed to check out:', e)
    }
  }

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 px-6 py-4">
        <div className="flex items-center justify-between max-w-5xl mx-auto">
          <div className="flex items-center gap-3">
            <button 
              onClick={() => navigate('/hospital/nurse/dashboard')}
              className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-slate-600" />
            </button>
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-lg bg-rose-100 flex items-center justify-center">
                <Calendar className="w-5 h-5 text-rose-600" />
              </div>
              <h1 className="text-xl font-bold text-slate-800">My Shifts</h1>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto p-6">
        {/* Current Shift Card */}
        {currentShift && (
          <div className="bg-white rounded-xl border border-slate-200 p-6 mb-6 shadow-sm">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-lg font-semibold text-slate-800 mb-1">Today's Shift</h2>
                <p className="text-slate-500">{formatDate(currentShift.date)}</p>
              </div>
              <span className={`px-3 py-1 rounded-full text-sm font-medium capitalize ${statusColors[currentShift.status]}`}>
                {currentShift.status.replace('_', ' ')}
              </span>
            </div>

            <div className="mt-4 flex items-center gap-6">
              <div className="flex items-center gap-2">
                {(() => {
                  const Icon = shiftIcons[currentShift.shiftType]
                  return <Icon className="w-5 h-5 text-slate-500" />
                })()}
                <span className="font-medium capitalize">{currentShift.shiftType} Shift</span>
              </div>
              <div className="flex items-center gap-2 text-slate-500">
                <Clock className="w-4 h-4" />
                <span>{formatTime(currentShift.startTime)} - {formatTime(currentShift.endTime)}</span>
              </div>
            </div>

            {currentShift.wardAssignments.length > 0 && (
              <div className="mt-3 flex items-center gap-2 text-slate-500">
                <MapPin className="w-4 h-4" />
                <span>{currentShift.wardAssignments.join(', ')}</span>
              </div>
            )}

            {/* Actions */}
            <div className="mt-6 flex items-center gap-3">
              {currentShift.status === 'scheduled' && (
                <button
                  onClick={handleCheckIn}
                  className="px-6 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-medium rounded-lg transition-colors flex items-center gap-2"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  Check In
                </button>
              )}
              {currentShift.status === 'checked_in' && (
                <button
                  onClick={handleCheckOut}
                  className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors flex items-center gap-2"
                >
                  <XCircle className="w-4 h-4" />
                  Check Out
                </button>
              )}
              {currentShift.lateMinutes > 0 && (
                <span className="text-sm text-amber-600">
                  Late by {currentShift.lateMinutes} minutes
                </span>
              )}
            </div>
          </div>
        )}

        {/* Shift History */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-200">
            <h2 className="text-lg font-semibold text-slate-800">Shift History</h2>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-8 h-8 border-4 border-rose-200 border-t-rose-600 rounded-full animate-spin" />
            </div>
          ) : shifts.length === 0 ? (
            <div className="px-6 py-12 text-center">
              <Calendar className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <h3 className="text-lg font-medium text-slate-700">No shifts scheduled</h3>
              <p className="text-slate-500">Contact your supervisor for shift assignments.</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {shifts.map((shift) => {
                const Icon = shiftIcons[shift.shiftType]
                return (
                  <div key={shift._id} className="px-6 py-4 hover:bg-slate-50 transition-colors">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-4">
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${shiftColors[shift.shiftType]}`}>
                          <Icon className="w-5 h-5" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-slate-800 capitalize">{shift.shiftType} Shift</span>
                            <span className="text-sm text-slate-500">{formatDate(shift.date)}</span>
                          </div>
                          <div className="flex items-center gap-4 mt-1 text-sm text-slate-500">
                            <span className="flex items-center gap-1">
                              <Clock className="w-4 h-4" />
                              {formatTime(shift.startTime)} - {formatTime(shift.endTime)}
                            </span>
                            {shift.wardAssignments.length > 0 && (
                              <span className="flex items-center gap-1">
                                <MapPin className="w-4 h-4" />
                                {shift.wardAssignments.join(', ')}
                              </span>
                            )}
                          </div>
                          {shift.tasksAssigned > 0 && (
                            <div className="flex items-center gap-4 mt-2 text-sm">
                              <span className="flex items-center gap-1 text-slate-600">
                                <Users className="w-4 h-4" />
                                {shift.tasksAssigned} tasks assigned
                              </span>
                              <span className="flex items-center gap-1 text-emerald-600">
                                <CheckCircle2 className="w-4 h-4" />
                                {shift.tasksCompleted} completed
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium capitalize ${statusColors[shift.status]}`}>
                        {shift.status.replace('_', ' ')}
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
