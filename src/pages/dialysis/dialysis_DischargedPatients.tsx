import { useEffect, useMemo, useState } from 'react'
import { dialysisApi } from '../../utils/api'
import { UserMinus, Search, ChevronLeft, ChevronRight, User, RotateCcw, AlertCircle } from 'lucide-react'
import ConfirmDialog from '../../components/ui/ConfirmDialog'

type DischargedRow = {
  _id: string
  dialysisPatientId: string
  mrn?: string
  status?: string
  dischargeReason?: string
  dischargeNotes?: string
  dischargedAt?: string
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

export default function Dialysis_DischargedPatients() {
  const [q, setQ] = useState('')
  const [rows, setRows] = useState<DischargedRow[]>([])
  const [loading, setLoading] = useState(false)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null)
  const [reactivateId, setReactivateId] = useState<string | null>(null)

  async function load() {
    setLoading(true)
    try {
      const res: any = await dialysisApi.listDischargedPatients({ q, page, limit: 20 })
      const items = res?.items || []
      setRows(items.map((x: any) => ({
        _id: String(x._id),
        dialysisPatientId: String(x.dialysisPatientId || ''),
        mrn: x.mrn,
        status: x.status,
        dischargeReason: x.dischargeReason,
        dischargeNotes: x.dischargeNotes,
        dischargedAt: x.dischargedAt,
        labPatient: x.labPatient || null,
      })))
      setTotalPages(Math.max(1, Math.ceil((res?.total || items.length) / 20)))
    } catch {
      setRows([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [page])

  const filtered = useMemo(() => {
    const qq = q.trim().toLowerCase()
    if (!qq) return rows
    return rows.filter(r => {
      const lp: any = r.labPatient || {}
      const bag = [r.dialysisPatientId, r.mrn, lp.fullName, lp.phone, lp.cnic, r.dischargeReason].filter(Boolean).join(' ').toLowerCase()
      return bag.includes(qq)
    })
  }, [q, rows])

  async function doReactivate() {
    const id = reactivateId
    setReactivateId(null)
    if (!id) return
    try {
      await dialysisApi.reactivatePatient(id)
      setToast({ type: 'success', message: 'Patient reactivated successfully' })
      await load()
    } catch (e: any) {
      setToast({ type: 'error', message: e?.message || 'Failed to reactivate patient' })
    }
  }

  return (
    <div className="space-y-4">
      {/* Toast */}
      {toast && (
        <div className="fixed right-4 top-16 z-60 max-w-sm">
          <div className={`rounded-lg border px-4 py-3 text-sm shadow ${toast.type === 'success' ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-rose-200 bg-rose-50 text-rose-800'}`}>
            <div className="flex items-start justify-between gap-3">
              <div>{toast.message}</div>
              <button type="button" className="text-slate-500 hover:text-slate-700" onClick={() => setToast(null)}>×</button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="rounded-xl border border-slate-200 bg-white p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-100 text-rose-600">
              <UserMinus className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">Discharged Patients</h2>
              <p className="text-xs text-slate-500">Patients who have been discharged from dialysis program</p>
            </div>
          </div>
          <button
            onClick={load}
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
            placeholder="Search by Dialysis ID, MRN, name, phone, CNIC, reason..."
            className="w-full rounded-lg border border-slate-200 py-2.5 pl-10 pr-4 text-sm outline-none focus:border-rose-400 focus:ring-2 focus:ring-rose-100"
          />
        </div>
      </div>

      {/* Empty State */}
      {filtered.length === 0 && !loading && (
        <div className="rounded-xl border border-slate-200 bg-white p-10 text-center text-slate-400">
          <UserMinus className="mx-auto mb-2 h-8 w-8 opacity-30" />
          <p className="text-sm">No discharged patients found</p>
        </div>
      )}

      {/* Patient Cards */}
      {filtered.map(r => {
        const lp: any = r.labPatient || {}
        return (
          <div key={r._id} className="rounded-xl border border-slate-200 bg-white p-4 transition-all hover:shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-rose-100 text-rose-600">
                  <User className="h-5 w-5" />
                </div>
                <div>
                  <div className="font-semibold text-slate-900">{lp.fullName || '-'}</div>
                  <div className="mt-0.5 flex flex-wrap gap-x-4 text-xs text-slate-500">
                    <span>ID: <strong className="text-teal-700">{r.dialysisPatientId}</strong></span>
                    <span>MRN: {r.mrn || lp.mrn || '-'}</span>
                    <span>Phone: {lp.phone || '-'}</span>
                    <span>{lp.age || '-'} / {lp.gender || '-'}</span>
                  </div>
                  {(r.dischargeReason || r.dischargeNotes) && (
                    <div className="mt-2 flex items-start gap-1.5 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800">
                      <AlertCircle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                      <div>
                        {r.dischargeReason && <div><strong>Reason:</strong> {r.dischargeReason}</div>}
                        {r.dischargeNotes && <div className="mt-0.5"><strong>Notes:</strong> {r.dischargeNotes}</div>}
                      </div>
                    </div>
                  )}
                </div>
              </div>
              <div className="flex flex-col items-end gap-2">
                {r.dischargedAt && (
                  <span className="text-[10px] text-slate-400">
                    Discharged: {new Date(r.dischargedAt).toLocaleDateString()}
                  </span>
                )}
                <button
                  onClick={() => setReactivateId(r._id)}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-teal-600 px-3 py-1.5 text-xs font-bold text-white shadow-sm hover:bg-teal-700"
                >
                  <RotateCcw className="h-3.5 w-3.5" /> Reactivate
                </button>
              </div>
            </div>
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

      {/* Reactivate Confirm Dialog */}
      <ConfirmDialog
        open={!!reactivateId}
        title="Reactivate Patient"
        message="Are you sure you want to reactivate this patient? They will reappear in the active patients list."
        confirmText="Reactivate"
        onCancel={() => setReactivateId(null)}
        onConfirm={doReactivate}
      />
    </div>
  )
}
