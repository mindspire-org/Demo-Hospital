import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { hospitalApi } from '../../../utils/api'
import {
  ArrowLeft,
  Bed,
  AlertTriangle,
  Activity,
  Stethoscope,
  Eye,
  Filter,
  RefreshCw,
  LogIn,
} from 'lucide-react'

type Referral = {
  _id: string
  encounterId?: { _id: string } | string
  patientId?: { _id: string; fullName: string; mrNumber: string; age?: number; gender?: string }
  bedId?: { _id: string; name: string }
  admittedAt: string
  reason: string
  severity: 'mild' | 'moderate' | 'severe' | 'critical'
  status: 'active' | 'transferred' | 'discharged' | 'deceased'
  referredFrom?: 'ipd' | 'er' | 'ot'
  referringPhysicianId?: { name: string }
  attendingDoctorId?: { name: string }
  primaryDiagnosis?: string
  ventilatorRequired?: boolean
}

const sourceLabels: Record<string, string> = {
  ipd: 'IPD Ward',
  er: 'Emergency',
  ot: 'Operation Theatre',
}

const sourceColors: Record<string, string> = {
  ipd: 'bg-blue-100 text-blue-700 border-blue-200',
  er: 'bg-rose-100 text-rose-700 border-rose-200',
  ot: 'bg-violet-100 text-violet-700 border-violet-200',
}

export default function ICU_Referrals() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [referrals, setReferrals] = useState<Referral[]>([])
  const [sourceFilter, setSourceFilter] = useState<'all' | 'ipd' | 'er' | 'ot'>('all')

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    try {
      const res = await hospitalApi.listICUAdmissions({ limit: 500 }) as any
      const all = (res?.admissions || []) as Referral[]
      // Only show admissions that were referred from another department
      const filtered = all.filter((a: Referral) => !!a.referredFrom)
      setReferrals(filtered)
    } catch {
      setReferrals([])
    }
    setLoading(false)
  }

  const displayed = sourceFilter === 'all'
    ? referrals
    : referrals.filter(r => r.referredFrom === sourceFilter)

  function getEncounterId(r: Referral): string {
    const e = r.encounterId as any
    return String(e?._id || e || '')
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button onClick={() => navigate('/hospital/icu')} className="text-slate-600 hover:text-slate-800">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h1 className="text-xl font-semibold text-slate-800">ICU Referrals</h1>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <div className="rounded-xl border border-slate-200 bg-white p-3">
          <div className="text-xs text-slate-500">Total Referrals</div>
          <div className="mt-1 text-xl font-bold text-slate-800">{referrals.length}</div>
        </div>
        <div className="rounded-xl border border-blue-200 bg-blue-50 p-3">
          <div className="text-xs text-blue-600">From IPD</div>
          <div className="mt-1 text-xl font-bold text-blue-800">{referrals.filter(r => r.referredFrom === 'ipd').length}</div>
        </div>
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-3">
          <div className="text-xs text-rose-600">From ER</div>
          <div className="mt-1 text-xl font-bold text-rose-800">{referrals.filter(r => r.referredFrom === 'er').length}</div>
        </div>
        <div className="rounded-xl border border-violet-200 bg-violet-50 p-3">
          <div className="text-xs text-violet-600">From OT</div>
          <div className="mt-1 text-xl font-bold text-violet-800">{referrals.filter(r => r.referredFrom === 'ot').length}</div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <Filter className="h-4 w-4 text-slate-500" />
        <span className="text-sm text-slate-600">Filter by source:</span>
        {(['all', 'ipd', 'er', 'ot'] as const).map((key) => (
          <button
            key={key}
            onClick={() => setSourceFilter(key)}
            className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
              sourceFilter === key
                ? 'bg-slate-800 text-white border-slate-800'
                : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
            }`}
          >
            {key === 'all' ? 'All' : sourceLabels[key]}
          </button>
        ))}
        <button
          onClick={load}
          className="ml-auto inline-flex items-center gap-1 rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50"
        >
          <RefreshCw className="h-3 w-3" />
          Refresh
        </button>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-slate-200 bg-white">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50">
                <th className="px-3 py-2 text-left font-medium text-slate-600">Patient</th>
                <th className="px-3 py-2 text-left font-medium text-slate-600">Referred From</th>
                <th className="px-3 py-2 text-left font-medium text-slate-600">Reason / Diagnosis</th>
                <th className="px-3 py-2 text-left font-medium text-slate-600">Severity</th>
                <th className="px-3 py-2 text-left font-medium text-slate-600">Referring Doctor</th>
                <th className="px-3 py-2 text-left font-medium text-slate-600">Bed</th>
                <th className="px-3 py-2 text-left font-medium text-slate-600">Date</th>
                <th className="px-3 py-2 text-left font-medium text-slate-600">Status</th>
                <th className="px-3 py-2 text-left font-medium text-slate-600">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-slate-500">
                    <RefreshCw className="mx-auto mb-2 h-6 w-6 animate-spin text-slate-300" />
                    Loading referrals...
                  </td>
                </tr>
              ) : displayed.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-slate-500">
                    <Stethoscope className="mx-auto mb-2 h-8 w-8 text-slate-300" />
                    No ICU referrals found.
                    <div className="mt-1 text-xs text-slate-400">
                      Patients referred from IPD, ER, or OT will appear here.
                    </div>
                  </td>
                </tr>
              ) : (
                displayed.map((r) => (
                  <tr key={r._id} className="border-b border-slate-100 hover:bg-slate-50">
                    <td className="px-3 py-2">
                      <div className="font-medium text-slate-800">
                        {r.patientId?.fullName || 'Unknown'}
                      </div>
                      <div className="text-xs text-slate-500">
                        MR#: {r.patientId?.mrNumber || '-'} · {r.patientId?.age || '?'}y · {r.patientId?.gender || ''}
                      </div>
                    </td>
                    <td className="px-3 py-2">
                      {r.referredFrom && (
                        <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium ${sourceColors[r.referredFrom]}`}>
                          {r.referredFrom === 'ipd' && <Bed className="h-3 w-3" />}
                          {r.referredFrom === 'er' && <AlertTriangle className="h-3 w-3" />}
                          {r.referredFrom === 'ot' && <Activity className="h-3 w-3" />}
                          {sourceLabels[r.referredFrom]}
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-2 max-w-xs truncate text-slate-700" title={r.reason}>
                      {r.reason}
                      {r.primaryDiagnosis && (
                        <div className="text-xs text-slate-500">{r.primaryDiagnosis}</div>
                      )}
                    </td>
                    <td className="px-3 py-2">
                      <span className={`rounded px-1.5 py-0.5 text-xs font-medium ${
                        r.severity === 'critical' ? 'bg-red-100 text-red-700' :
                        r.severity === 'severe' ? 'bg-orange-100 text-orange-700' :
                        r.severity === 'moderate' ? 'bg-yellow-100 text-yellow-700' :
                        'bg-green-100 text-green-700'
                      }`}>
                        {r.severity}
                      </span>
                      {r.ventilatorRequired && (
                        <span className="ml-1 rounded bg-blue-100 px-1.5 py-0.5 text-xs text-blue-700" title="Ventilator required">Vent</span>
                      )}
                    </td>
                    <td className="px-3 py-2 text-slate-700">
                      {r.referringPhysicianId?.name || '-'}
                    </td>
                    <td className="px-3 py-2 text-slate-700">
                      {r.bedId?.name || (
                        <span className="text-xs text-slate-400 italic">Unassigned</span>
                      )}
                    </td>
                    <td className="px-3 py-2 text-xs text-slate-500">
                      {r.admittedAt ? new Date(r.admittedAt).toLocaleDateString() : '-'}
                    </td>
                    <td className="px-3 py-2">
                      <span className={`rounded-full border px-2 py-0.5 text-xs font-medium ${
                        r.status === 'active' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                        r.status === 'discharged' ? 'bg-slate-100 text-slate-600 border-slate-200' :
                        r.status === 'transferred' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                        'bg-red-50 text-red-700 border-red-200'
                      }`}>
                        {r.status}
                      </span>
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex gap-1">
                        <button
                          onClick={() => navigate(`/hospital/patient/${getEncounterId(r)}`)}
                          className="rounded px-2 py-1 text-xs text-slate-600 hover:bg-slate-100"
                          title="View patient profile"
                        >
                          <Eye className="h-3.5 w-3.5" />
                        </button>
                        {r.status === 'active' && (
                          <button
                            onClick={() => navigate(`/hospital/icu/monitoring?admission=${r._id}`)}
                            className="rounded px-2 py-1 text-xs text-rose-600 hover:bg-rose-50"
                            title="Open in ICU monitoring"
                          >
                            <LogIn className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
