import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { hospitalApi } from '../../utils/api'
import { 
  Activity, 
  AlertTriangle,
  Bed,
  Heart,
  UserPlus,
  Wind,
  BarChart3,
  ClipboardList
} from 'lucide-react'

type ICUAdmission = {
  _id: string
  encounterId: string
  patientId?: { _id: string; fullName: string; mrNumber: string; age?: number; gender?: string }
  bedId?: { _id: string; name: string }
  admittedAt: string
  reason: string
  severity: 'mild' | 'moderate' | 'severe' | 'critical'
  status: 'active' | 'transferred' | 'discharged' | 'deceased'
  ventilatorRequired: boolean
  referredFrom?: string
  attendingDoctorId?: { _id: string; name: string }
  primaryDiagnosis?: string
}

type ICUBed = {
  _id: string
  name: string
  type?: string
  status: 'available' | 'occupied' | 'maintenance'
  ventilatorAvailable: boolean
}

export default function Hospital_ICUDashboard() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [admissions, setAdmissions] = useState<ICUAdmission[]>([])
  const [beds, setBeds] = useState<ICUBed[]>([])
  const [showAdmitModal, setShowAdmitModal] = useState(false)

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    setError(null)
    try {
      const [admissionsRes, bedsRes] = await Promise.all([
        hospitalApi.listICUAdmissions({ status: 'active', limit: 100 }) as any,
        hospitalApi.listICUBeds({ limit: 50 }) as any,
      ])
      setAdmissions(admissionsRes?.admissions || [])
      setBeds(bedsRes?.beds || [])
    } catch (e: any) {
      setError(e?.message || 'Failed to load ICU dashboard')
    } finally {
      setLoading(false)
    }
  }

  // Stats
  const stats = {
    totalPatients: admissions.length,
    critical: admissions.filter(a => a.severity === 'critical').length,
    severe: admissions.filter(a => a.severity === 'severe').length,
    onVentilator: admissions.filter(a => a.ventilatorRequired).length,
    availableBeds: beds.filter(b => b.status === 'available').length,
    occupiedBeds: beds.filter(b => b.status === 'occupied').length,
    totalBeds: beds.length,
  }

  const getSeverityBadge = (severity: string) => {
    const colors: Record<string, string> = {
      mild: 'bg-green-100 text-green-700',
      moderate: 'bg-yellow-100 text-yellow-700',
      severe: 'bg-orange-100 text-orange-700',
      critical: 'bg-red-100 text-red-700',
    }
    return (
      <span className={`rounded px-2 py-0.5 text-xs font-medium ${colors[severity] || colors.moderate}`}>
        {severity.toUpperCase()}
      </span>
    )
  }

  const getBedStatusColor = (status: string) => {
    switch (status) {
      case 'available': return 'bg-green-500'
      case 'occupied': return 'bg-amber-500'
      default: return 'bg-slate-400'
    }
  }

  const formatDuration = (admittedAt: string) => {
    const start = new Date(admittedAt)
    const now = new Date()
    const hours = Math.floor((now.getTime() - start.getTime()) / (1000 * 60 * 60))
    const days = Math.floor(hours / 24)
    if (days > 0) return `${days}d ${hours % 24}h`
    return `${hours}h`
  }

  return (
    <div className="space-y-5">
      {/* Hero */}
      <div className="relative overflow-hidden rounded-xl bg-gradient-to-r from-rose-600 via-red-600 to-pink-600 p-6 text-white dark:from-rose-800 dark:via-red-800 dark:to-pink-800">
        <div className="flex items-center justify-between">
          <div className="max-w-xl">
            <h1 className="text-2xl font-bold">Intensive Care Unit</h1>
            <p className="mt-1 text-sm/6 opacity-90">Monitor critically ill patients, manage ICU beds, and track patient severity scores.</p>
          </div>
          <div className="hidden md:block">
            <Heart className="h-20 w-20 opacity-30" />
          </div>
        </div>
      </div>

      {error && (
        <div className="rounded-md border border-rose-200 bg-rose-50 p-3 text-rose-700 text-sm dark:border-rose-900 dark:bg-rose-900/30 dark:text-rose-400">{error}</div>
      )}

      {loading ? (
        <div className="py-12 text-center text-slate-500 dark:text-slate-400">Loading...</div>
      ) : (
        <>
          {/* Stats */}
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4 lg:grid-cols-6">
            <StatCard label="ICU Patients" value={stats.totalPatients} icon={<Bed className="h-5 w-5 text-rose-500" />} />
            <StatCard label="Critical" value={stats.critical} icon={<AlertTriangle className="h-5 w-5 text-red-500" />} highlight />
            <StatCard label="Severe" value={stats.severe} icon={<Activity className="h-5 w-5 text-orange-500" />} />
            <StatCard label="On Ventilator" value={stats.onVentilator} icon={<Wind className="h-5 w-5 text-blue-500" />} />
            <StatCard label="Available Beds" value={stats.availableBeds} icon={<Bed className="h-5 w-5 text-green-500" />} />
            <StatCard label="Occupied Beds" value={`${stats.occupiedBeds}/${stats.totalBeds}`} icon={<Bed className="h-5 w-5 text-amber-500" />} />
          </div>

      {/* Critical Alerts */}
      {stats.critical > 0 && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 dark:border-red-900 dark:bg-red-900/30">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400" />
            <span className="font-semibold text-red-800 dark:text-red-300">{stats.critical} Critical Patients</span>
          </div>
          <p className="mt-1 text-sm text-red-700 dark:text-red-400">
            Immediate attention required. Review patient list below.
          </p>
        </div>
      )}

      {/* Actions */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setShowAdmitModal(true)}
          className="inline-flex items-center gap-2 rounded-md bg-rose-600 px-4 py-2 text-sm font-medium text-white hover:bg-rose-700 dark:bg-rose-700 dark:hover:bg-rose-600"
        >
          <UserPlus className="h-4 w-4" />
          Admit to ICU
        </button>
        <button
          onClick={() => navigate('/hospital/icu/beds')}
          className="inline-flex items-center gap-2 rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-700"
        >
          <Bed className="h-4 w-4" />
          Manage Beds
        </button>
        <button
          onClick={() => navigate('/hospital/icu/monitoring')}
          className="inline-flex items-center gap-2 rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-700"
        >
          <Activity className="h-4 w-4" />
          Monitoring
        </button>
        <button
          onClick={() => navigate('/hospital/icu/reports')}
          className="inline-flex items-center gap-2 rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-700"
        >
          <BarChart3 className="h-4 w-4" />
          Reports
        </button>
      </div>

      {/* ICU Beds Grid */}
      <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800">
        <h2 className="text-base font-semibold text-slate-800 dark:text-slate-200">ICU Beds</h2>
        <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8">
          {beds.map((bed) => (
            <div
              key={bed._id}
              className={`rounded-lg border p-3 ${
                bed.status === 'available' ? 'border-green-200 bg-green-50 cursor-pointer hover:bg-green-100 dark:border-green-900 dark:bg-green-900/20 dark:hover:bg-green-900/30' :
                bed.status === 'occupied' ? 'border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-900/20' :
                'border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-700/50'
              }`}
              onClick={() => {
                if (bed.status === 'occupied') {
                  const admission = admissions.find(a => a.bedId?._id === bed._id)
                  if (admission) navigate(`/hospital/patient/${admission.encounterId}`)
                }
              }}
            >
              <div className="flex items-center justify-between">
                <span className="font-medium text-slate-800 dark:text-slate-200">{bed.name}</span>
                <span className={`h-2.5 w-2.5 rounded-full ${getBedStatusColor(bed.status)}`} />
              </div>
              <div className="mt-1 text-xs text-slate-500 capitalize dark:text-slate-400">{bed.status}</div>
              {bed.ventilatorAvailable && (
                <div className="mt-1 flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400">
                  <Wind className="h-3 w-3" />
                  Vent
                </div>
              )}
            </div>
          ))}
          {beds.length === 0 && (
            <div className="col-span-full py-4 text-center text-sm text-slate-500 dark:text-slate-400">
              No ICU beds configured. <button onClick={() => navigate('/hospital/icu/beds')} className="text-rose-600 hover:underline dark:text-rose-400">Add beds</button>
            </div>
          )}
        </div>
      </div>

      {/* Active ICU Patients */}
      <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800">
        <h2 className="text-base font-semibold text-slate-800 dark:text-slate-200">Active ICU Patients</h2>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-700">
                <th className="px-3 py-2 text-left font-medium text-slate-600 dark:text-slate-400">Patient</th>
                <th className="px-3 py-2 text-left font-medium text-slate-600 dark:text-slate-400">Bed</th>
                <th className="px-3 py-2 text-left font-medium text-slate-600 dark:text-slate-400">Diagnosis</th>
                <th className="px-3 py-2 text-left font-medium text-slate-600 dark:text-slate-400">Severity</th>
                <th className="px-3 py-2 text-left font-medium text-slate-600 dark:text-slate-400">Duration</th>
                <th className="px-3 py-2 text-left font-medium text-slate-600 dark:text-slate-400">Ventilator</th>
                <th className="px-3 py-2 text-left font-medium text-slate-600 dark:text-slate-400">Attending</th>
                <th className="px-3 py-2 text-left font-medium text-slate-600 dark:text-slate-400">Actions</th>
              </tr>
            </thead>
            <tbody>
              {admissions.map((admission) => (
                <tr 
                  key={admission._id} 
                  className={`border-b border-slate-100 hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-700/50 ${
                    admission.severity === 'critical' ? 'bg-red-50 dark:bg-red-900/20' : ''
                  }`}
                >
                  <td className="px-3 py-2">
                    <button
                      onClick={() => navigate(`/hospital/patient/${admission.encounterId}`)}
                      className="text-rose-600 hover:underline font-medium dark:text-rose-400"
                    >
                      {admission.patientId?.fullName || 'Unknown'}
                    </button>
                    <div className="text-xs text-slate-500 dark:text-slate-400">
                      MR#: {admission.patientId?.mrNumber || '-'} | {admission.patientId?.age || '?'}y {admission.patientId?.gender || ''}
                    </div>
                  </td>
                  <td className="px-3 py-2 dark:text-slate-300">{admission.bedId?.name || '-'}</td>
                  <td className="px-3 py-2 max-w-xs truncate dark:text-slate-300">{admission.primaryDiagnosis || admission.reason}</td>
                  <td className="px-3 py-2">{getSeverityBadge(admission.severity)}</td>
                  <td className="px-3 py-2 whitespace-nowrap dark:text-slate-300">{formatDuration(admission.admittedAt)}</td>
                  <td className="px-3 py-2">
                    {admission.ventilatorRequired ? (
                      <span className="inline-flex items-center gap-1 text-blue-600 dark:text-blue-400">
                        <Wind className="h-4 w-4" />
                        Yes
                      </span>
                    ) : (
                      <span className="text-slate-500 dark:text-slate-400">No</span>
                    )}
                  </td>
                  <td className="px-3 py-2 dark:text-slate-300">{admission.attendingDoctorId?.name || '-'}</td>
                  <td className="px-3 py-2">
                    <div className="flex gap-1">
                      <button
                        onClick={() => navigate(`/hospital/patient/${admission.encounterId}`)}
                        className="rounded px-2 py-1 text-xs text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-700"
                      >
                        Profile
                      </button>
                      <button
                        onClick={() => navigate(`/hospital/icu/transfer/${admission._id}`)}
                        className="rounded px-2 py-1 text-xs text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-700"
                      >
                        Transfer
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {admissions.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-3 py-6 text-center text-slate-500 dark:text-slate-400">
                    No active ICU patients.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Quick Links */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <QuickLink
          icon={<Activity className="h-6 w-6" />}
          label="GCS Scoring"
          onClick={() => navigate('/hospital/icu/scoring')}
        />
        <QuickLink
          icon={<ClipboardList className="h-6 w-6" />}
          label="Flowsheet"
          onClick={() => navigate('/hospital/icu/monitoring')}
        />
        <QuickLink
          icon={<Wind className="h-6 w-6" />}
          label="Ventilator Settings"
          onClick={() => navigate('/hospital/icu/ventilator')}
        />
        <QuickLink
          icon={<BarChart3 className="h-6 w-6" />}
          label="PHC Reports"
          onClick={() => navigate('/hospital/icu/reports')}
        />
      </div>
      </>
      )}

      {/* Admit Modal */}
      {showAdmitModal && (
        <ICUAdmitModal
          onClose={() => setShowAdmitModal(false)}
          onCreated={() => { setShowAdmitModal(false); load() }}
        />
      )}
    </div>
  )
}

function StatCard({ label, value, icon, highlight }: { label: string; value: number | string; icon?: React.ReactNode; highlight?: boolean }) {
  return (
    <div className={`rounded-xl border p-4 ${highlight ? 'border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-900/30' : 'border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800'}`}>
      <div className="flex items-center justify-between">
        <div className="text-sm text-slate-500 dark:text-slate-400">{label}</div>
        {icon}
      </div>
      <div className={`mt-1 text-2xl font-semibold ${highlight ? 'text-red-700 dark:text-red-400' : 'text-slate-800 dark:text-slate-100'}`}>{value}</div>
    </div>
  )
}

function QuickLink({ icon, label, onClick }: { icon: React.ReactNode; label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="flex flex-col items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white p-4 text-slate-700 hover:bg-slate-50 hover:border-rose-300 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700 dark:hover:border-rose-700"
    >
      <div className="text-rose-500 dark:text-rose-400">{icon}</div>
      <span className="text-sm font-medium">{label}</span>
    </button>
  )
}

function ICUAdmitModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [loading, setLoading] = useState(false)
  const [patients, setPatients] = useState<any[]>([])
  const [doctors, setDoctors] = useState<any[]>([])
  const [beds, setBeds] = useState<any[]>([])
  const [form, setForm] = useState({
    encounterId: '',
    bedId: '',
    reason: '',
    severity: 'moderate' as 'mild' | 'moderate' | 'severe' | 'critical',
    ventilatorRequired: false,
    attendingDoctorId: '',
    primaryDiagnosis: '',
    notes: '',
  })

  useEffect(() => {
    async function loadOptions() {
      try {
        const [admissionsRes, doctorsRes, bedsRes] = await Promise.all([
          hospitalApi.listIPDAdmissions({ status: 'admitted', limit: 100 }) as any,
          hospitalApi.listDoctors({ limit: 100 }) as any,
          hospitalApi.listICUBeds({ status: 'available', limit: 50 }) as any,
        ])
        setPatients(admissionsRes?.admissions || [])
        setDoctors(doctorsRes?.doctors || [])
        setBeds(bedsRes?.beds || [])
      } catch {}
    }
    loadOptions()
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.encounterId || !form.reason) return
    setLoading(true)
    try {
      await hospitalApi.createICUAdmission({
        encounterId: form.encounterId,
        bedId: form.bedId || undefined,
        reason: form.reason,
        severity: form.severity,
        ventilatorRequired: form.ventilatorRequired,
        attendingDoctorId: form.attendingDoctorId || undefined,
        primaryDiagnosis: form.primaryDiagnosis || undefined,
        notes: form.notes || undefined,
        referredFrom: 'ipd',
      })
      onCreated()
    } catch (e: any) {
      alert(e?.message || 'Failed to admit to ICU')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-lg rounded-xl bg-white p-6 shadow-xl dark:bg-slate-800">
        <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100">Admit to ICU</h2>
        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Patient (IPD) *</label>
            <select
              value={form.encounterId}
              onChange={(e) => setForm({ ...form, encounterId: e.target.value })}
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200"
              required
            >
              <option value="">Select patient</option>
              {patients.map((p: any) => (
                <option key={p._id} value={p._id}>
                  {p.patientId?.fullName} - Bed: {p.bedLabel || p.bedId} ({p.departmentId?.name || 'N/A'})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Reason for ICU *</label>
            <textarea
              value={form.reason}
              onChange={(e) => setForm({ ...form, reason: e.target.value })}
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200"
              rows={2}
              placeholder="e.g., Respiratory failure requiring ventilation"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">ICU Bed</label>
              <select
                value={form.bedId}
                onChange={(e) => setForm({ ...form, bedId: e.target.value })}
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200"
              >
                <option value="">Auto-assign</option>
                {beds.map((b: any) => (
                  <option key={b._id} value={b._id}>
                    {b.name} {b.ventilatorAvailable ? '(Vent)' : ''}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Severity</label>
              <select
                value={form.severity}
                onChange={(e) => setForm({ ...form, severity: e.target.value as any })}
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200"
              >
                <option value="mild">Mild</option>
                <option value="moderate">Moderate</option>
                <option value="severe">Severe</option>
                <option value="critical">Critical</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Attending Doctor</label>
              <select
                value={form.attendingDoctorId}
                onChange={(e) => setForm({ ...form, attendingDoctorId: e.target.value })}
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200"
              >
                <option value="">Select</option>
                {doctors.map((d: any) => (
                  <option key={d._id} value={d._id}>{d.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Primary Diagnosis</label>
              <input
                type="text"
                value={form.primaryDiagnosis}
                onChange={(e) => setForm({ ...form, primaryDiagnosis: e.target.value })}
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200"
                placeholder="e.g., ARDS"
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="ventilatorRequired"
              checked={form.ventilatorRequired}
              onChange={(e) => setForm({ ...form, ventilatorRequired: e.target.checked })}
              className="h-4 w-4 rounded border-slate-300 dark:border-slate-600 dark:bg-slate-700"
            />
            <label htmlFor="ventilatorRequired" className="text-sm text-slate-700 dark:text-slate-300">
              Ventilator Required
            </label>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Notes</label>
            <textarea
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200"
              rows={2}
            />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-700"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="rounded-md bg-rose-600 px-4 py-2 text-sm font-medium text-white hover:bg-rose-700 disabled:opacity-50 dark:bg-rose-700 dark:hover:bg-rose-600"
            >
              {loading ? 'Admitting...' : 'Admit to ICU'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
