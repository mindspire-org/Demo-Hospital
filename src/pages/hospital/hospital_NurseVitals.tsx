import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { 
  Thermometer, 
  ArrowLeft, 
  HeartPulse,
  Activity,
  Wind,
  Scale,
  Ruler,
  Droplets,
  Clock,
  CheckCircle2,
  AlertCircle
} from 'lucide-react'
import { hospitalApi } from '../../utils/api'

interface VitalsForm {
  bp: string
  pulse: string
  temp: string
  spo2: string
  rr: string
  painScale: string
  weight: string
  height: string
  bsr: string
  intakeIV: string
  urine: string
  notes: string
}

const initialVitals: VitalsForm = {
  bp: '',
  pulse: '',
  temp: '',
  spo2: '',
  rr: '',
  painScale: '',
  weight: '',
  height: '',
  bsr: '',
  intakeIV: '',
  urine: '',
  notes: ''
}

export default function Hospital_NurseVitals() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const patientId = searchParams.get('patientId')
  
  const [form, setForm] = useState<VitalsForm>(initialVitals)
  const [patients, setPatients] = useState<any[]>([])
  const [selectedPatient, setSelectedPatient] = useState<string>(patientId || '')
  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState(false)

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
      const res: any = await hospitalApi.getPendingNurseTasks()
      const tasks = res.items || []
      
      // Get unique patients
      const patientMap = new Map()
      tasks.forEach((task: any) => {
        const id = task.patientId._id || task.patientId
        if (!patientMap.has(id)) {
          patientMap.set(id, {
            _id: id,
            name: task.patientName,
            mrn: task.patientMrn
          })
        }
      })
      
      setPatients(Array.from(patientMap.values()))
    } catch (e) {
      console.error('Failed to load patients:', e)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedPatient) return
    
    try {
      setSubmitting(true)
      
      // Create a vitals task for the selected patient
      const patient = patients.find(p => p._id === selectedPatient)
      if (!patient) return
      
      await hospitalApi.createNurseTask({
        assignedTo: JSON.parse(localStorage.getItem('hospital.session') || '{}').id,
        patientId: selectedPatient,
        patientMrn: patient.mrn,
        patientName: patient.name,
        taskType: 'vitals',
        priority: 'routine',
        scheduledTime: new Date().toISOString(),
        location: 'IPD'
      })
      
      setSuccess(true)
      setTimeout(() => {
        setSuccess(false)
        setForm(initialVitals)
      }, 2000)
    } catch (e) {
      console.error('Failed to submit vitals:', e)
    } finally {
      setSubmitting(false)
    }
  }

  const handleChange = (field: keyof VitalsForm, value: string) => {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  const isAbnormal = (field: string, value: string) => {
    const num = parseFloat(value)
    if (isNaN(num)) return false
    
    switch (field) {
      case 'temp': return num < 36 || num > 37.5
      case 'pulse': return num < 60 || num > 100
      case 'spo2': return num < 95
      case 'rr': return num < 12 || num > 20
      case 'painScale': return num > 5
      case 'bsr': return num > 140 || num < 70
      default: return false
    }
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
                <Thermometer className="w-5 h-5 text-rose-600" />
              </div>
              <h1 className="text-xl font-bold text-slate-800">Record Vitals</h1>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto p-6">
        {loading && (
          <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg flex items-center gap-3">
            <div className="w-5 h-5 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
            <span className="text-blue-700 font-medium">Loading patients...</span>
          </div>
        )}

        {success && (
          <div className="mb-6 p-4 bg-emerald-50 border border-emerald-200 rounded-lg flex items-center gap-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-600" />
            <span className="text-emerald-700 font-medium">Vitals recorded successfully!</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Patient Selection */}
          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <h2 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
              <HeartPulse className="w-5 h-5 text-slate-500" />
              Select Patient
            </h2>
            <select
              value={selectedPatient}
              onChange={(e) => setSelectedPatient(e.target.value)}
              className="w-full px-4 py-3 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500"
              required
            >
              <option value="">Select a patient...</option>
              {patients.map((p) => (
                <option key={p._id} value={p._id}>
                  {p.name} ({p.mrn})
                </option>
              ))}
            </select>
          </div>

          {/* Vital Signs */}
          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <h2 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
              <Activity className="w-5 h-5 text-slate-500" />
              Vital Signs
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Blood Pressure */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Blood Pressure (mmHg)
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={form.bp}
                    onChange={(e) => handleChange('bp', e.target.value)}
                    placeholder="120/80"
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500"
                  />
                  <HeartPulse className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                </div>
              </div>

              {/* Pulse */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Pulse (bpm)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    value={form.pulse}
                    onChange={(e) => handleChange('pulse', e.target.value)}
                    placeholder="72"
                    className={`w-full px-4 py-2.5 border rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500 ${
                      isAbnormal('pulse', form.pulse) ? 'border-red-300 bg-red-50' : 'border-slate-200'
                    }`}
                  />
                  <Activity className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                </div>
                {isAbnormal('pulse', form.pulse) && (
                  <p className="mt-1 text-xs text-red-600 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" /> Abnormal value (Normal: 60-100)
                  </p>
                )}
              </div>

              {/* Temperature */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Temperature (°C)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.1"
                    value={form.temp}
                    onChange={(e) => handleChange('temp', e.target.value)}
                    placeholder="37.0"
                    className={`w-full px-4 py-2.5 border rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500 ${
                      isAbnormal('temp', form.temp) ? 'border-red-300 bg-red-50' : 'border-slate-200'
                    }`}
                  />
                  <Thermometer className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                </div>
                {isAbnormal('temp', form.temp) && (
                  <p className="mt-1 text-xs text-red-600 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" /> Abnormal value (Normal: 36-37.5)
                  </p>
                )}
              </div>

              {/* SpO2 */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  SpO2 (%)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    value={form.spo2}
                    onChange={(e) => handleChange('spo2', e.target.value)}
                    placeholder="98"
                    className={`w-full px-4 py-2.5 border rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500 ${
                      isAbnormal('spo2', form.spo2) ? 'border-red-300 bg-red-50' : 'border-slate-200'
                    }`}
                  />
                  <Wind className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                </div>
                {isAbnormal('spo2', form.spo2) && (
                  <p className="mt-1 text-xs text-red-600 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" /> Low oxygen (Normal: ≥95%)
                  </p>
                )}
              </div>

              {/* Respiratory Rate */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Respiratory Rate (breaths/min)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    value={form.rr}
                    onChange={(e) => handleChange('rr', e.target.value)}
                    placeholder="16"
                    className={`w-full px-4 py-2.5 border rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500 ${
                      isAbnormal('rr', form.rr) ? 'border-red-300 bg-red-50' : 'border-slate-200'
                    }`}
                  />
                  <Wind className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                </div>
                {isAbnormal('rr', form.rr) && (
                  <p className="mt-1 text-xs text-red-600 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" /> Abnormal value (Normal: 12-20)
                  </p>
                )}
              </div>

              {/* Pain Scale */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Pain Scale (0-10)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min="0"
                    max="10"
                    value={form.painScale}
                    onChange={(e) => handleChange('painScale', e.target.value)}
                    placeholder="0"
                    className={`w-full px-4 py-2.5 border rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500 ${
                      isAbnormal('painScale', form.painScale) ? 'border-red-300 bg-red-50' : 'border-slate-200'
                    }`}
                  />
                </div>
                {isAbnormal('painScale', form.painScale) && (
                  <p className="mt-1 text-xs text-red-600 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" /> High pain level reported
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Additional Measurements */}
          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <h2 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
              <Scale className="w-5 h-5 text-slate-500" />
              Additional Measurements
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Weight */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Weight (kg)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.1"
                    value={form.weight}
                    onChange={(e) => handleChange('weight', e.target.value)}
                    placeholder="70.5"
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500"
                  />
                  <Scale className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                </div>
              </div>

              {/* Height */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Height (cm)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    value={form.height}
                    onChange={(e) => handleChange('height', e.target.value)}
                    placeholder="175"
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500"
                  />
                  <Ruler className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                </div>
              </div>

              {/* Blood Sugar */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Blood Sugar (mg/dL)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    value={form.bsr}
                    onChange={(e) => handleChange('bsr', e.target.value)}
                    placeholder="100"
                    className={`w-full px-4 py-2.5 border rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500 ${
                      isAbnormal('bsr', form.bsr) ? 'border-red-300 bg-red-50' : 'border-slate-200'
                    }`}
                  />
                  <Droplets className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                </div>
                {isAbnormal('bsr', form.bsr) && (
                  <p className="mt-1 text-xs text-red-600">Abnormal value</p>
                )}
              </div>
            </div>
          </div>

          {/* I/O Chart */}
          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <h2 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
              <Clock className="w-5 h-5 text-slate-500" />
              Intake/Output (Optional)
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  IV Intake (mL)
                </label>
                <input
                  type="text"
                  value={form.intakeIV}
                  onChange={(e) => handleChange('intakeIV', e.target.value)}
                  placeholder="e.g., 500 mL NS"
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Urine Output (mL)
                </label>
                <input
                  type="text"
                  value={form.urine}
                  onChange={(e) => handleChange('urine', e.target.value)}
                  placeholder="e.g., 400 mL"
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500"
                />
              </div>
            </div>
          </div>

          {/* Notes */}
          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <h2 className="text-lg font-semibold text-slate-800 mb-4">Notes</h2>
            <textarea
              value={form.notes}
              onChange={(e) => handleChange('notes', e.target.value)}
              placeholder="Any additional observations..."
              rows={3}
              className="w-full px-4 py-3 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500"
            />
          </div>

          {/* Submit */}
          <div className="flex items-center justify-end gap-4">
            <button
              type="button"
              onClick={() => navigate('/hospital/nurse/dashboard')}
              className="px-6 py-3 text-slate-600 hover:text-slate-800 font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || !selectedPatient}
              className="px-6 py-3 bg-rose-600 hover:bg-rose-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50"
            >
              {submitting ? 'Recording...' : 'Record Vitals'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
