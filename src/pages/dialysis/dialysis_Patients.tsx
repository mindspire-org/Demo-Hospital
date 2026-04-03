import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { dialysisApi } from '../../utils/api'

type Row = {
  _id: string
  dialysisPatientId: string
  mrn?: string
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

export default function Dialysis_Patients() {
  const navigate = useNavigate()
  const [q, setQ] = useState('')
  const [rows, setRows] = useState<Row[]>([])
  const [loading, setLoading] = useState(false)

  async function load() {
    setLoading(true)
    try {
      const res: any = await dialysisApi.listDialysisPatients({ q, limit: 100 })
      const items: any[] = res?.items || []
      setRows(items.map(x => ({
        _id: String(x._id),
        dialysisPatientId: String(x.dialysisPatientId || ''),
        mrn: x.mrn,
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
    <div className="min-h-[70dvh] rounded-xl bg-gradient-to-br from-teal-500/20 via-cyan-300/20 to-emerald-300/20 p-6">
      <div className="w-full rounded-xl bg-white p-6 shadow-lg">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-bold text-slate-800">Dialysis Patients</h2>
            <div className="text-sm text-slate-500">Registry (auto-added when a token is generated)</div>
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
          <input
            value={q}
            onChange={e => setQ(e.target.value)}
            placeholder="Search by Dialysis ID, MRN, name, phone, CNIC..."
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-200"
          />
        </div>

        <div className="mt-6 overflow-hidden rounded-xl border border-slate-200">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-gradient-to-r from-teal-500 to-cyan-500 text-white">
              <tr className="text-left">
                <th className="px-3 py-3 font-semibold">Dialysis ID</th>
                <th className="px-3 py-3 font-semibold">MRN</th>
                <th className="px-3 py-3 font-semibold">Patient</th>
                <th className="px-3 py-3 font-semibold">Phone</th>
                <th className="px-3 py-3 font-semibold">Age/Gender</th>
                <th className="px-3 py-3 font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 bg-white text-slate-700">
              {loading ? (
                <tr>
                  <td className="px-4 py-8 text-center text-slate-500" colSpan={6}>Loading...</td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td className="px-4 py-8 text-center text-slate-500" colSpan={6}>No patients</td>
                </tr>
              ) : (
                filtered.map(r => {
                  const lp: any = r.labPatient || {}
                  return (
                    <tr key={r._id} className="hover:bg-slate-50">
                      <td className="px-3 py-2.5 font-semibold text-teal-700">{r.dialysisPatientId || '-'}</td>
                      <td className="px-3 py-2.5">{r.mrn || lp.mrn || '-'}</td>
                      <td className="px-3 py-2.5">
                        <div>
                          <div className="font-medium">{lp.fullName || '-'}</div>
                          <div className="text-xs text-slate-500">{lp.fatherName || '-'}</div>
                        </div>
                      </td>
                      <td className="px-3 py-2.5">{lp.phone || '-'}</td>
                      <td className="px-3 py-2.5">{lp.age || '-'} / {lp.gender || '-'}</td>
                      <td className="px-3 py-2.5">
                        <button
                          onClick={() => openSessions(r)}
                          className="rounded-md bg-teal-100 px-3 py-1.5 text-xs font-semibold text-teal-700 hover:bg-teal-200"
                          type="button"
                        >
                          Open Sessions
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
