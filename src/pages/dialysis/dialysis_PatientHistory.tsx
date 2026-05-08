import { useEffect, useMemo, useState } from 'react'
import { dialysisApi } from '../../utils/api'
import { BookOpen, Search, ChevronLeft, ChevronRight, User, Calendar, Clock, Printer } from 'lucide-react'
import { printDialysisSessionReport } from '../../utils/printDialysisSessionReport'

type PatientRow = {
  _id: string
  dialysisPatientId: string
  mrn?: string
  status?: string
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

type SessionRow = {
  _id: string
  dateIso?: string
  tokenNo?: string
  timeStarted?: string
  timeCompleted?: string
  dialyzerTypeName?: string
  sessionTypeName?: string
  status?: string
  [key: string]: any
}

export default function Dialysis_PatientHistory() {
  const [q, setQ] = useState('')
  const [patients, setPatients] = useState<PatientRow[]>([])
  const [loading, setLoading] = useState(false)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)

  // Expanded patient detail
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [sessions, setSessions] = useState<SessionRow[]>([])
  const [center, setCenter] = useState<any>(null)
  const [loadingSessions, setLoadingSessions] = useState(false)

  async function loadPatients() {
    setLoading(true)
    try {
      const res: any = await dialysisApi.listDialysisPatients({ q, page, limit: 20 })
      const items = res?.items || []
      setPatients(items.map((x: any) => ({
        _id: String(x._id),
        dialysisPatientId: String(x.dialysisPatientId || ''),
        mrn: x.mrn,
        status: x.status,
        labPatient: x.labPatient || null,
      })))
      setTotalPages(Math.max(1, Math.ceil((res?.total || items.length) / 20)))
    } catch {
      setPatients([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadPatients() }, [page])

  const filtered = useMemo(() => {
    const qq = q.trim().toLowerCase()
    if (!qq) return patients
    return patients.filter(r => {
      const lp: any = r.labPatient || {}
      const bag = [r.dialysisPatientId, r.mrn, lp.fullName, lp.phone, lp.cnic].filter(Boolean).join(' ').toLowerCase()
      return bag.includes(qq)
    })
  }, [q, patients])

  async function toggleExpand(p: PatientRow) {
    if (expandedId === p._id) {
      setExpandedId(null)
      setSessions([])
      return
    }
    setExpandedId(p._id)
    setLoadingSessions(true)
    try {
      const [sRes, cRes]: any = await Promise.all([
        dialysisApi.listSessions({ dialysisPatientId: p._id, limit: 200 }),
        dialysisApi.getSettings(),
      ])
      setSessions((sRes?.items || []).map((x: any) => ({ ...x, _id: String(x._id) })))
      setCenter(cRes || null)
    } catch {
      setSessions([])
    } finally {
      setLoadingSessions(false)
    }
  }

  function handlePrint(p: PatientRow, s: SessionRow) {
    const lp: any = p.labPatient || {}
    printDialysisSessionReport({
      center: center || undefined,
      patient: {
        dialysisPatientId: p.dialysisPatientId,
        mrn: p.mrn || lp.mrn,
        fullName: lp.fullName,
        fatherName: lp.fatherName,
        phone: lp.phoneNormalized || lp.phone,
        cnic: lp.cnicNormalized || lp.cnic,
        gender: lp.gender,
        age: lp.age,
        address: lp.address,
      },
      session: s,
    })
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="rounded-xl border border-slate-200 bg-white p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-100 text-teal-600">
              <BookOpen className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">Patient History</h2>
              <p className="text-xs text-slate-500">Complete treatment history for all dialysis patients</p>
            </div>
          </div>
          <button
            onClick={() => loadPatients()}
            disabled={loading}
            className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-50"
          >
            {loading ? 'Loading…' : 'Refresh'}
          </button>
        </div>

        {/* Search */}
        <div className="mt-4 relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            value={q}
            onChange={e => { setQ(e.target.value); setPage(1) }}
            placeholder="Search by Dialysis ID, MRN, name, phone, CNIC..."
            className="w-full rounded-lg border border-slate-200 py-2.5 pl-10 pr-4 text-sm outline-none focus:border-teal-400 focus:ring-2 focus:ring-teal-100"
          />
        </div>
      </div>

      {/* Patient List */}
      {filtered.length === 0 && !loading && (
        <div className="rounded-xl border border-slate-200 bg-white p-10 text-center text-slate-400">
          <BookOpen className="mx-auto mb-2 h-8 w-8 opacity-30" />
          <p className="text-sm">No patients found</p>
        </div>
      )}

      {filtered.map(p => {
        const lp: any = p.labPatient || {}
        const isExpanded = expandedId === p._id
        const isDischarged = p.status === 'discharged'

        return (
          <div key={p._id} className={`rounded-xl border bg-white transition-all ${isExpanded ? 'border-teal-300 shadow-lg shadow-teal-50' : 'border-slate-200'}`}>
            {/* Patient Row */}
            <button
              onClick={() => toggleExpand(p)}
              className="flex w-full items-center gap-4 p-4 text-left hover:bg-slate-50 transition-colors"
            >
              <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${isDischarged ? 'bg-rose-100 text-rose-600' : 'bg-teal-100 text-teal-600'}`}>
                <User className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-slate-900">{lp.fullName || '-'}</span>
                  {isDischarged && (
                    <span className="rounded-full bg-rose-100 px-2 py-0.5 text-[10px] font-bold text-rose-600">DISCHARGED</span>
                  )}
                </div>
                <div className="mt-0.5 flex flex-wrap gap-x-4 text-xs text-slate-500">
                  <span>ID: <strong className="text-teal-700">{p.dialysisPatientId}</strong></span>
                  <span>MRN: {p.mrn || lp.mrn || '-'}</span>
                  <span>Phone: {lp.phone || '-'}</span>
                  <span>{lp.age || '-'} / {lp.gender || '-'}</span>
                </div>
              </div>
              <div className="shrink-0 text-xs text-slate-400">
                {isExpanded ? '▲ Collapse' : '▼ View History'}
              </div>
            </button>

            {/* Expanded Session History */}
            {isExpanded && (
              <div className="border-t border-slate-100 px-4 pb-4">
                {loadingSessions ? (
                  <div className="py-8 text-center text-sm text-slate-400">Loading sessions...</div>
                ) : sessions.length === 0 ? (
                  <div className="py-8 text-center text-sm text-slate-400">No sessions recorded</div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-slate-100 text-sm">
                      <thead>
                        <tr className="text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                          <th className="px-3 py-2.5">Date</th>
                          <th className="px-3 py-2.5">Token #</th>
                          <th className="px-3 py-2.5">Type</th>
                          <th className="px-3 py-2.5">Start</th>
                          <th className="px-3 py-2.5">End</th>
                          <th className="px-3 py-2.5">Dialyzer</th>
                          <th className="px-3 py-2.5">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50">
                        {sessions.map(s => (
                          <tr key={String(s._id)} className="hover:bg-slate-50">
                            <td className="px-3 py-2"><div className="flex items-center gap-1.5"><Calendar className="h-3.5 w-3.5 text-slate-400" />{s.dateIso || '-'}</div></td>
                            <td className="px-3 py-2 font-semibold text-teal-700">{s.tokenNo || '-'}</td>
                            <td className="px-3 py-2">{s.sessionTypeName || '-'}</td>
                            <td className="px-3 py-2"><div className="flex items-center gap-1"><Clock className="h-3 w-3 text-slate-400" />{s.timeStarted || '-'}</div></td>
                            <td className="px-3 py-2">{s.timeCompleted || '-'}</td>
                            <td className="px-3 py-2">{s.dialyzerTypeName || '-'}</td>
                            <td className="px-3 py-2">
                              <button
                                onClick={(e) => { e.stopPropagation(); handlePrint(p, s) }}
                                className="inline-flex items-center gap-1 rounded-md bg-blue-600 px-2 py-1 text-xs font-semibold text-white hover:bg-blue-700"
                              >
                                <Printer className="h-3 w-3" /> Print
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </div>
        )
      })}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm text-slate-600">
          <span>Page {page} of {totalPages}</span>
          <div className="flex items-center gap-2">
            <button
              disabled={page <= 1}
              onClick={() => setPage(p => Math.max(1, p - 1))}
              className="rounded-lg border border-slate-200 px-3 py-1.5 hover:bg-slate-50 disabled:opacity-40"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              disabled={page >= totalPages}
              onClick={() => setPage(p => p + 1)}
              className="rounded-lg border border-slate-200 px-3 py-1.5 hover:bg-slate-50 disabled:opacity-40"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
