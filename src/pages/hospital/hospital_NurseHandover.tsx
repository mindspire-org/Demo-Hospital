import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { 
  ClipboardList, 
  ArrowLeft, 
  ArrowRightLeft,
  User,
  Clock,
  Send,
  CheckCircle2,
  AlertCircle
} from 'lucide-react'
import { hospitalApi } from '../../utils/api'

interface Shift {
  _id: string
  date: string
  shiftType: string
  status: string
  handoverFromNotes?: string
  handoverToNotes?: string
  handoverCompleted: boolean
}

export default function Hospital_NurseHandover() {
  const navigate = useNavigate()
  const [currentShift, setCurrentShift] = useState<Shift | null>(null)
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    const session = localStorage.getItem('hospital.session')
    if (!session) {
      navigate('/hospital/nurse/login')
      return
    }
    loadCurrentShift()
  }, [navigate])

  const loadCurrentShift = async () => {
    try {
      setLoading(true)
      const res: any = await hospitalApi.getCurrentNurseShift()
      setCurrentShift(res)
      if (res?.handoverToNotes) {
        setNotes(res.handoverToNotes)
      }
    } catch (e) {
      console.error('Failed to load shift:', e)
    } finally {
      setLoading(false)
    }
  }

  const handleGiveHandover = async () => {
    if (!currentShift) return
    try {
      setSubmitting(true)
      await hospitalApi.giveHandover(currentShift._id, notes)
      setSuccess(true)
      setTimeout(() => setSuccess(false), 2000)
      loadCurrentShift()
    } catch (e) {
      console.error('Failed to give handover:', e)
    } finally {
      setSubmitting(false)
    }
  }

  const handleReceiveHandover = async () => {
    if (!currentShift) return
    try {
      setSubmitting(true)
      await hospitalApi.receiveHandover(currentShift._id, notes)
      setSuccess(true)
      setTimeout(() => setSuccess(false), 2000)
      loadCurrentShift()
    } catch (e) {
      console.error('Failed to receive handover:', e)
    } finally {
      setSubmitting(false)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    })
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 px-6 py-4">
        <div className="flex items-center justify-between max-w-4xl mx-auto">
          <div className="flex items-center gap-3">
            <button 
              onClick={() => navigate('/hospital/nurse/dashboard')}
              className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-slate-600" />
            </button>
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-lg bg-rose-100 flex items-center justify-center">
                <ArrowRightLeft className="w-5 h-5 text-rose-600" />
              </div>
              <h1 className="text-xl font-bold text-slate-800">Shift Handover</h1>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto p-6">
        {success && (
          <div className="mb-6 p-4 bg-emerald-50 border border-emerald-200 rounded-lg flex items-center gap-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-600" />
            <span className="text-emerald-700 font-medium">Handover notes saved successfully!</span>
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="w-8 h-8 border-4 border-rose-200 border-t-rose-600 rounded-full animate-spin" />
          </div>
        ) : !currentShift ? (
          <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
            <Clock className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <h3 className="text-lg font-medium text-slate-700">No active shift</h3>
            <p className="text-slate-500">You don't have an active shift for today.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Current Shift Info */}
            <div className="bg-white rounded-xl border border-slate-200 p-6">
              <h2 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
                <User className="w-5 h-5 text-slate-500" />
                Current Shift
              </h2>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-slate-500">Date</p>
                  <p className="font-medium text-slate-800">{formatDate(currentShift.date)}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-500">Shift Type</p>
                  <p className="font-medium text-slate-800 capitalize">{currentShift.shiftType}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-500">Status</p>
                  <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium capitalize ${
                    currentShift.status === 'checked_in' 
                      ? 'bg-emerald-100 text-emerald-700' 
                      : 'bg-slate-100 text-slate-600'
                  }`}>
                    {currentShift.status.replace('_', ' ')}
                  </span>
                </div>
                <div>
                  <p className="text-sm text-slate-500">Handover Status</p>
                  <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
                    currentShift.handoverCompleted 
                      ? 'bg-emerald-100 text-emerald-700' 
                      : 'bg-amber-100 text-amber-700'
                  }`}>
                    {currentShift.handoverCompleted ? 'Completed' : 'Pending'}
                  </span>
                </div>
              </div>
            </div>

            {/* Incoming Handover (if received) */}
            {currentShift.handoverFromNotes && (
              <div className="bg-blue-50 rounded-xl border border-blue-200 p-6">
                <h2 className="text-lg font-semibold text-blue-800 mb-4 flex items-center gap-2">
                  <ArrowRightLeft className="w-5 h-5" />
                  Incoming Handover Notes
                </h2>
                <div className="bg-white rounded-lg p-4 border border-blue-100">
                  <p className="text-slate-700 whitespace-pre-wrap">{currentShift.handoverFromNotes}</p>
                </div>
              </div>
            )}

            {/* Outgoing Handover Form */}
            <div className="bg-white rounded-xl border border-slate-200 p-6">
              <h2 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
                <ClipboardList className="w-5 h-5 text-slate-500" />
                {currentShift.status === 'checked_in' ? 'Outgoing Handover Notes' : 'Receive Handover Notes'}
              </h2>
              
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder={`Include important patient updates, pending tasks, and any critical information for the next nurse...`}
                rows={8}
                className="w-full px-4 py-3 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500"
              />

              <div className="mt-4 flex items-center gap-3">
                {currentShift.status === 'checked_in' ? (
                  <button
                    onClick={handleGiveHandover}
                    disabled={submitting || !notes.trim()}
                    className="px-6 py-3 bg-rose-600 hover:bg-rose-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2"
                  >
                    <Send className="w-4 h-4" />
                    {submitting ? 'Saving...' : 'Give Handover'}
                  </button>
                ) : (
                  <button
                    onClick={handleReceiveHandover}
                    disabled={submitting || !notes.trim()}
                    className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    {submitting ? 'Saving...' : 'Acknowledge Handover'}
                  </button>
                )}
              </div>
            </div>

            {/* Handover Guidelines */}
            <div className="bg-amber-50 rounded-xl border border-amber-200 p-6">
              <h3 className="font-semibold text-amber-800 mb-3 flex items-center gap-2">
                <AlertCircle className="w-5 h-5" />
                Handover Guidelines
              </h3>
              <ul className="space-y-2 text-sm text-amber-700">
                <li>• Include patient condition updates and vital sign changes</li>
                <li>• Note any pending tasks or medications due</li>
                <li>• Mention any patient complaints or concerns</li>
                <li>• Report any abnormal lab results or diagnostic findings</li>
                <li>• Communicate any special instructions from doctors</li>
                <li>• Note any equipment issues or maintenance needs</li>
              </ul>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
