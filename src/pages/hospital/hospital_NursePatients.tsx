import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { 
  Users, 
  ArrowLeft, 
  Search,
  User,
  BedDouble,
  HeartPulse,
  ArrowRight
} from 'lucide-react'
import { hospitalApi } from '../../utils/api'

interface Patient {
  _id: string
  name: string
  mrn: string
  gender?: string
  age?: number
  location?: string
  ward?: string
  bedNumber?: string
  tasksCount: number
  lastVitals?: string
}

export default function Hospital_NursePatients() {
  const navigate = useNavigate()
  const [patients, setPatients] = useState<Patient[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
    const session = localStorage.getItem('hospital.session')
    if (!session) {
      navigate('/hospital/nurse/login')
      return
    }
    loadPatients()
  }, [navigate])

  const loadPatients = async () => {
    try {
      setLoading(true)
      // Get pending tasks to find unique patients under care
      const res: any = await hospitalApi.getPendingNurseTasks()
      const tasks = res.items || []
      
      // Group by patient
      const patientMap = new Map<string, Patient>()
      tasks.forEach((task: any) => {
        if (!patientMap.has(task.patientId._id || task.patientId)) {
          patientMap.set(task.patientId._id || task.patientId, {
            _id: task.patientId._id || task.patientId,
            name: task.patientName,
            mrn: task.patientMrn,
            location: task.location,
            ward: task.ward,
            bedNumber: task.bedNumber,
            tasksCount: 1
          })
        } else {
          const patient = patientMap.get(task.patientId._id || task.patientId)!
          patient.tasksCount++
        }
      })
      
      setPatients(Array.from(patientMap.values()))
    } catch (e) {
      console.error('Failed to load patients:', e)
    } finally {
      setLoading(false)
    }
  }

  const filteredPatients = patients.filter(p => 
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.mrn.toLowerCase().includes(searchQuery.toLowerCase())
  )

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
            <h1 className="text-xl font-bold text-slate-800">My Patients</h1>
          </div>
          
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search patients..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-rose-500 w-64"
            />
          </div>
        </div>
      </div>

      {/* Patient List */}
      <div className="max-w-7xl mx-auto p-6">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="w-8 h-8 border-4 border-rose-200 border-t-rose-600 rounded-full animate-spin" />
          </div>
        ) : filteredPatients.length === 0 ? (
          <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
            <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-4">
              <Users className="w-8 h-8 text-slate-400" />
            </div>
            <h3 className="text-lg font-medium text-slate-700 mb-1">No patients under care</h3>
            <p className="text-slate-500">You don't have any assigned patients at the moment.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredPatients.map((patient) => (
              <div 
                key={patient._id}
                className="bg-white rounded-xl border border-slate-200 p-6 hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => navigate(`/hospital/nurse/vitals?patientId=${patient._id}`)}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="w-12 h-12 rounded-xl bg-rose-100 flex items-center justify-center">
                    <User className="w-6 h-6 text-rose-600" />
                  </div>
                  <div className="flex items-center gap-1 px-2 py-1 bg-amber-50 rounded-lg border border-amber-200">
                    <span className="text-sm font-medium text-amber-700">{patient.tasksCount}</span>
                    <span className="text-xs text-amber-600">tasks</span>
                  </div>
                </div>
                
                <h3 className="font-semibold text-slate-800 mb-1">{patient.name}</h3>
                <p className="text-sm text-slate-500 mb-3">MRN: {patient.mrn}</p>
                
                <div className="flex items-center gap-4 text-sm text-slate-500 mb-4">
                  {patient.ward && (
                    <span className="flex items-center gap-1">
                      <BedDouble className="w-4 h-4" />
                      {patient.ward} {patient.bedNumber && `• ${patient.bedNumber}`}
                    </span>
                  )}
                </div>
                
                <button className="w-full py-2 px-4 bg-slate-100 hover:bg-rose-100 text-slate-700 hover:text-rose-700 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2">
                  <HeartPulse className="w-4 h-4" />
                  Record Vitals
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
