import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { dialysisApi } from '../../utils/api'
import { Search, Activity, UserMinus, ArrowLeft } from 'lucide-react'

type Row = {
  _id: string
  dialysisPatientId: string
  mrn?: string
  status?: string
  dischargeDate?: string
  dischargeNote?: string
  labPatient?: {
    _id: string
    mrn?: string
    fullName?: string
    fatherName?: string
    phone?: string
    cnic?: string
    gender?: string
    age?: string
    address?: string
  } | null
}

export default function Dialysis_Discharged() {
  const navigate = useNavigate()
  const [q, setQ] = useState('')
  const [rows, setRows] = useState<Row[]>([])
  const [loading, setLoading] = useState(false)

  async function load() {
    setLoading(true)
    try {
      // In a real implementation, you might have a specific filter for discharged
      const res: any = await dialysisApi.listDialysisPatients({ q, limit: 200 })
      const items: any[] = res?.items || []
      setRows(items
        .filter(x => x.status === 'discharged')
        .map(x => ({
          _id: String(x._id),
          dialysisPatientId: String(x.dialysisPatientId || ''),
          mrn: x.mrn,
          status: x.status,
          dischargeDate: x.dischargeDate,
          dischargeNote: x.dischargeNote,
          labPatient: x.labPatient || null,
        })))
    } catch {
      setRows([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  const filtered = useMemo(() => {
    const qq = q.trim().toLowerCase()
    if (!qq) return rows
    return rows.filter(r => {
      const lp: any = r.labPatient || {}
      const bag = [r.dialysisPatientId, r.mrn, lp.fullName, lp.phone, lp.cnic].filter(Boolean).join(' ').toLowerCase()
      return bag.includes(qq)
    })
  }, [q, rows])

  function openSessions(r: Row) {
    navigate(`/dialysis/sessions?dialysisPatientId=${encodeURIComponent(r._id)}`)
  }

  return (
    <div className="min-h-[70dvh] rounded-xl bg-linear-to-br from-rose-500/10 via-slate-100 to-rose-300/10 p-6">
      <div className="w-full rounded-xl bg-white p-6 shadow-lg">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
             <button onClick={() => navigate('/dialysis')} className="rounded-full p-2 hover:bg-slate-100 transition-colors">
                <ArrowLeft className="h-5 w-5 text-slate-600" />
              </button>
              <div>
                <h2 className="text-xl font-bold text-slate-800">Discharged Patients</h2>
                <div className="text-sm text-slate-500">History of patients discharged from dialysis</div>
              </div>
          </div>
          <button
            onClick={load}
            disabled={loading}
            className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
            type="button"
          >
            {loading ? 'Loading…' : 'Refresh'}
          </button>
        </div>

        <div className="mt-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              value={q}
              onChange={e => setQ(e.target.value)}
              placeholder="Search discharged patients by ID, MRN, name..."
              className="w-full rounded-md border border-slate-300 pl-10 pr-3 py-2 text-sm outline-none focus:border-rose-500 focus:ring-2 focus:ring-rose-200"
            />
          </div>
        </div>

        <div className="mt-6 overflow-hidden rounded-xl border border-slate-200">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50 text-slate-700">
              <tr className="text-left">
                <th className="px-3 py-3 font-semibold">Patient</th>
                <th className="px-3 py-3 font-semibold">Discharge Info</th>
                <th className="px-3 py-3 font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 bg-white text-slate-700">
              {loading ? (
                <tr><td className="px-4 py-8 text-center text-slate-500" colSpan={3}>Loading...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td className="px-4 py-12 text-center text-slate-500" colSpan={3}>
                  <UserMinus className="mx-auto h-10 w-10 text-slate-200 mb-2" />
                  No discharged patients found
                </td></tr>
              ) : (
                filtered.map(r => {
                  const lp: any = r.labPatient || {}
                  return (
                    <tr key={r._id} className="hover:bg-slate-50">
                      <td className="px-3 py-3">
                        <div className="font-bold text-slate-900">{lp.fullName || '-'}</div>
                        <div className="text-xs text-slate-500">ID: {r.dialysisPatientId} | MRN: {r.mrn || lp.mrn || '-'}</div>
                        <div className="text-[10px] text-slate-400 uppercase tracking-tighter">{lp.gender} | {lp.age}y</div>
                      </td>
                      <td className="px-3 py-3">
                        <div className="text-xs font-semibold text-rose-700">Date: {r.dischargeDate || '-'}</div>
                        <div className="text-[11px] text-slate-500 line-clamp-1 italic" title={r.dischargeNote}>
                           Note: {r.dischargeNote || 'None'}
                        </div>
                      </td>
                      <td className="px-3 py-3">
                        <button
                          onClick={() => openSessions(r)}
                          className="inline-flex items-center gap-1.5 rounded-md bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-200 transition-colors"
                          type="button"
                        >
                          <Activity className="h-3 w-3" />
                          History
                        </button>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
