import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { icuApi } from '../../utils/api'
import { Bed, Heart, Search, Filter, Wind } from 'lucide-react'

type ICUAdmission = {
  _id: string
  encounterId: string | { _id: string }
  patientId?: { _id: string; fullName?: string; mrNumber?: string; age?: number; gender?: string }
  bedId?: { _id: string; name?: string }
  admittedAt: string
  reason: string
  severity: 'mild' | 'moderate' | 'severe' | 'critical'
  status: 'active' | 'transferred' | 'discharged' | 'deceased'
  ventilatorRequired: boolean
  attendingDoctorId?: { _id: string; name?: string }
  primaryDiagnosis?: string
  notes?: string
}

export default function Hospital_ICUPatients() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [admissions, setAdmissions] = useState<ICUAdmission[]>([])
  const [q, setQ] = useState('')
  const [severityFilter, setSeverityFilter] = useState<string>('')
  const [statusFilter, setStatusFilter] = useState<string>('active')

  useEffect(() => { load() }, [severityFilter, statusFilter])

  async function load() {
    setLoading(true)
    setError(null)
    try {
      const params: any = { limit: 200 }
      if (statusFilter) params.status = statusFilter
      if (severityFilter) params.severity = severityFilter
      const res = await icuApi.listICUAdmissions(params) as any
      setAdmissions(res?.admissions || [])
    } catch (e: any) {
      setError(e?.message || 'Failed to load ICU patients')
    } finally {
      setLoading(false)
    }
  }

  const filtered = admissions.filter(a => {
    const name = a.patientId?.fullName || ''
    const mr = a.patientId?.mrNumber || ''
    const diag = a.primaryDiagnosis || a.reason || ''
    const search = q.toLowerCase()
    return name.toLowerCase().includes(search) ||
           mr.toLowerCase().includes(search) ||
           diag.toLowerCase().includes(search)
  })

  const getSeverityBadge = (severity: string) => {
    const map: Record<string, string> = {
      mild: 'bg-green-100 text-green-700',
      moderate: 'bg-yellow-100 text-yellow-700',
      severe: 'bg-orange-100 text-orange-700',
      critical: 'bg-red-100 text-red-700',
    }
    return map[severity] || 'bg-slate-100 text-slate-700'
  }

  const getStatusBadge = (status: string) => {
    const map: Record<string, string> = {
      active: 'bg-blue-100 text-blue-700',
      transferred: 'bg-purple-100 text-purple-700',
      discharged: 'bg-green-100 text-green-700',
      deceased: 'bg-gray-100 text-gray-700',
    }
    return map[status] || 'bg-slate-100 text-slate-700'
  }

  const formatDuration = (admittedAt: string) => {
    const start = new Date(admittedAt)
    const now = new Date()
    const hours = Math.floor((now.getTime() - start.getTime()) / (1000 * 60 * 60))
    const days = Math.floor(hours / 24)
    if (days > 0) return `${days}d ${hours % 24}h`
    return `${hours}h`
  }

  const getEncounterId = (a: ICUAdmission): string => {
    const e = a.encounterId as any
    return String(e?._id || e || '')
  }

  return (
    <div className="space-y-5">
      {/* Hero */}
      <div className="relative overflow-hidden rounded-xl bg-linear-to-r from-rose-600 via-red-600 to-pink-600 p-6 text-white">
        <div className="flex items-center justify-between">
          <div className="max-w-xl">
            <h1 className="text-2xl font-bold">ICU Patients</h1>
            <p className="mt-1 text-sm/6 opacity-90">View and manage all ICU admissions, monitor severity, and track patient status.</p>
          </div>
          <div className="hidden md:block">
            <Bed className="h-16 w-16 opacity-30" />
          </div>
        </div>
      </div>

      {error && (
        <div className="rounded-md border border-rose-200 bg-rose-50 p-3 text-rose-700 text-sm">{error}</div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={q}
            onChange={e => setQ(e.target.value)}
            placeholder="Search patient, MR#, diagnosis..."
            className="w-full rounded-md border border-slate-300 pl-9 pr-3 py-2 text-sm focus:border-rose-500 focus:outline-none focus:ring-1 focus:ring-rose-500"
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-slate-500" />
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="rounded-md border border-slate-300 px-3 py-2 text-sm"
          >
            <option value="">All Status</option>
            <option value="active">Active</option>
            <option value="transferred">Transferred</option>
            <option value="discharged">Discharged</option>
            <option value="deceased">Deceased</option>
          </select>
        </div>
        <select
          value={severityFilter}
          onChange={e => setSeverityFilter(e.target.value)}
          className="rounded-md border border-slate-300 px-3 py-2 text-sm"
        >
          <option value="">All Severity</option>
          <option value="mild">Mild</option>
          <option value="moderate">Moderate</option>
          <option value="severe">Severe</option>
          <option value="critical">Critical</option>
        </select>
        <button
          onClick={() => navigate('/hospital/icu')}
          className="inline-flex items-center gap-2 rounded-md bg-rose-600 px-4 py-2 text-sm font-medium text-white hover:bg-rose-700"
        >
          <Heart className="h-4 w-4" />
          Admit Patient
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatCard label="Total" value={admissions.length} />
        <StatCard label="Critical" value={admissions.filter(a => a.severity === 'critical').length} color="text-red-600" />
        <StatCard label="On Ventilator" value={admissions.filter(a => a.ventilatorRequired).length} color="text-blue-600" />
        <StatCard label="Active" value={admissions.filter(a => a.status === 'active').length} color="text-emerald-600" />
      </div>

      {/* Table */}
      {loading ? (
        <div className="py-12 text-center text-slate-500">Loading...</div>
      ) : (
        <div className="rounded-xl border border-slate-200 bg-white overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50">
                <th className="px-3 py-2 text-left font-medium text-slate-600">Patient</th>
                <th className="px-3 py-2 text-left font-medium text-slate-600">Bed</th>
                <th className="px-3 py-2 text-left font-medium text-slate-600">Diagnosis / Reason</th>
                <th className="px-3 py-2 text-left font-medium text-slate-600">Severity</th>
                <th className="px-3 py-2 text-left font-medium text-slate-600">Duration</th>
                <th className="px-3 py-2 text-left font-medium text-slate-600">Ventilator</th>
                <th className="px-3 py-2 text-left font-medium text-slate-600">Doctor</th>
                <th className="px-3 py-2 text-left font-medium text-slate-600">Status</th>
                <th className="px-3 py-2 text-left font-medium text-slate-600">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(a => (
                <tr key={a._id} className={`border-b border-slate-100 hover:bg-slate-50 ${a.severity === 'critical' ? 'bg-red-50' : ''}`}>
                  <td className="px-3 py-2">
                    <div className="font-medium text-slate-800">{a.patientId?.fullName || 'Unknown'}</div>
                    <div className="text-xs text-slate-500">
                      MR#: {a.patientId?.mrNumber || '-'} | {a.patientId?.age || '?'}y {a.patientId?.gender || ''}
                    </div>
                  </td>
                  <td className="px-3 py-2">{a.bedId?.name || '-'}</td>
                  <td className="px-3 py-2 max-w-xs truncate">{a.primaryDiagnosis || a.reason}</td>
                  <td className="px-3 py-2">
                    <span className={`rounded px-2 py-0.5 text-xs font-medium ${getSeverityBadge(a.severity)}`}>
                      {a.severity.toUpperCase()}
                    </span>
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap">{formatDuration(a.admittedAt)}</td>
                  <td className="px-3 py-2">
                    {a.ventilatorRequired ? (
                      <span className="inline-flex items-center gap-1 text-blue-600">
                        <Wind className="h-3.5 w-3.5" /> Yes
                      </span>
                    ) : (
                      <span className="text-slate-500">No</span>
                    )}
                  </td>
                  <td className="px-3 py-2">{a.attendingDoctorId?.name || '-'}</td>
                  <td className="px-3 py-2">
                    <span className={`rounded px-2 py-0.5 text-xs font-medium ${getStatusBadge(a.status)}`}>
                      {a.status}
                    </span>
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex gap-1">
                      {getEncounterId(a) && (
                        <button
                          onClick={() => navigate(`/hospital/patient/${getEncounterId(a)}`)}
                          className="rounded px-2 py-1 text-xs text-rose-600 hover:bg-rose-50"
                        >
                          Profile
                        </button>
                      )}
                      <button
                        onClick={() => navigate(`/hospital/icu/billing?admission=${a._id}`)}
                        className="rounded px-2 py-1 text-xs text-emerald-600 hover:bg-emerald-50"
                      >
                        Bill
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={9} className="px-3 py-8 text-center text-slate-500">
                    No ICU patients found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

function StatCard({ label, value, color = 'text-slate-800' }: { label: string; value: number | string; color?: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="text-sm text-slate-500">{label}</div>
      <div className={`mt-1 text-2xl font-semibold ${color}`}>{value}</div>
    </div>
  )
}
