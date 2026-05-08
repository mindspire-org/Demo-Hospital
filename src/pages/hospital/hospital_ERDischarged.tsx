import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { hospitalApi } from '../../utils/api'
import { UserMinus, Search, ChevronLeft, ChevronRight, Clock, Activity, FileText, Receipt } from 'lucide-react'
import Toast, { type ToastState } from '../../components/ui/Toast'

type DischargedRow = {
  id: string
  tokenNo: string
  mrn: string
  patientName: string
  patientId?: string
  bed?: string
  admittedAt?: string
  age?: string
  gender?: string
  phone?: string
  doctor?: string
  triage?: 'red' | 'yellow' | 'green'
  arrivalMode?: string
  chiefComplaint?: string
  disposition?: string
  dischargedAt?: string
  encounterId?: string
}

export default function Hospital_ERDischarged() {
  const navigate = useNavigate()
  const [rows, setRows] = useState<DischargedRow[]>([])
  const [loading, setLoading] = useState(false)
  const [q, setQ] = useState('')
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [toast, setToast] = useState<ToastState>(null)

  const apiBase = useMemo(()=>{
    const isFile = typeof window !== 'undefined' && window.location?.protocol === 'file:'
    const isElectronUA = typeof navigator !== 'undefined' && /Electron/i.test(navigator.userAgent || '')
    const envBase = (import.meta as any).env?.VITE_API_URL
    return envBase || ((isFile || isElectronUA) ? 'http://127.0.0.1:4000/api' : 'http://localhost:4000/api')
  }, [])

  const openPrintPreview = async (fullUrl: string) => {
    const api: any = (window as any).electronAPI
    if (api && typeof api.printPreviewHtml === 'function') {
      try {
        const token = ((): string => { try { return localStorage.getItem('hospital.token') || localStorage.getItem('token') || '' } catch { return '' } })()
        const res = await fetch(fullUrl, { headers: token ? { Authorization: `Bearer ${token}` } as any : undefined })
        if (!res.ok){
          const txt = await res.text().catch(()=> 'Failed to load document')
          setToast({ type: 'error', message: String(txt || 'Failed to load document').slice(0, 500) })
          return
        }
        const html = await res.text()
        await api.printPreviewHtml(html, {})
        return
      } catch {}
    }
    try { window.open(fullUrl, '_blank') } catch {}
  }

  const printSummary = (id: string) => openPrintPreview(`${apiBase}/hospital/ipd/admissions/${encodeURIComponent(id)}/discharge-summary/print`)
  const printInvoice = (id: string) => openPrintPreview(`${apiBase}/hospital/ipd/admissions/${encodeURIComponent(id)}/final-invoice/print`)

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      try {
        const deps: any = await hospitalApi.listDepartments() as any
        const list: any[] = deps?.departments || deps || []
        const er = list.find((d: any) => String(d?.name || '').trim().toLowerCase() === 'emergency')
        const departmentId = er?._id || er?.id
        if (!departmentId) {
          if (!cancelled) setRows([])
          setLoading(false)
          return
        }
        const res: any = await hospitalApi.listEREncounters({ status: 'discharged', limit: 20, page })
        const items: any[] = res?.items || res?.encounters || []
        const mapped: DischargedRow[] = items.map((e: any) => {
          const p = e.patientId || {}
          const doc = e.doctorId || {}
          const docName = doc.name || doc.fullName || doc.username || ''
          const bed = e.bedId || {}
          const bedLabel = bed.label || e.bedLabel || ''
          const when = e.endAt || e.dischargedAt || e.updatedAt
          return {
            id: String(e._id || e.id),
            tokenNo: String(e.tokenNo || ''),
            mrn: String(p.mrn || ''),
            patientName: String(p.fullName || ''),
            patientId: String(p._id || ''),
            bed: String(bedLabel || ''),
            admittedAt: e.startAt || e.createdAt,
            age: String(p.age || ''),
            gender: String(p.gender || ''),
            phone: String(p.phoneNormalized || p.phone || ''),
            doctor: docName ? String(docName) : undefined,
            triage: e.triage || undefined,
            arrivalMode: e.arrivalMode || undefined,
            chiefComplaint: e.chiefComplaint || undefined,
            disposition: e.disposition || 'discharged',
            dischargedAt: when ? new Date(when).toLocaleString() : undefined,
            encounterId: String(e._id || e.id),
          }
        })
        if (!cancelled) {
          setRows(mapped)
          const total = res?.total || res?.pagination?.total || items.length
          setTotalPages(Math.max(1, Math.ceil(total / 20)))
        }
      } catch {
        if (!cancelled) setRows([])
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [page])

  const filtered = useMemo(() => {
    const qq = q.trim().toLowerCase()
    if (!qq) return rows
    return rows.filter(r => {
      const hay = [r.tokenNo, r.mrn, r.patientName, r.phone, r.triage, r.arrivalMode, r.chiefComplaint, r.disposition].filter(Boolean).join(' ').toLowerCase()
      return hay.includes(qq)
    })
  }, [q, rows])

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="relative overflow-hidden rounded-2xl bg-linear-to-r from-slate-700 via-slate-800 to-slate-900 p-6 shadow-xl">
        <div className="absolute inset-0 opacity-10 bg-[radial-gradient(circle_at_30%_50%,rgba(255,255,255,0.1),transparent)]" />
        <div className="relative flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/10 backdrop-blur-sm">
              <UserMinus className="h-7 w-7 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-white tracking-tight">ER Discharged Patients</h1>
              <p className="mt-0.5 text-sm font-medium text-white/60">Patients discharged from the Emergency Department</p>
            </div>
          </div>
          <button
            onClick={() => navigate('/hospital/emergency')}
            className="inline-flex items-center gap-1.5 rounded-xl bg-white/10 px-4 py-2.5 text-sm font-bold text-white backdrop-blur-sm hover:bg-white/20 transition-colors"
          >
            <Activity className="h-4 w-4" /> Back to Emergency
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="rounded-2xl border border-slate-200/60 bg-white p-4 shadow-sm">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            value={q}
            onChange={e => { setQ(e.target.value); setPage(1) }}
            placeholder="Search by token#, MR#, patient, phone, triage, complaint..."
            className="w-full rounded-xl border border-slate-200 py-2.5 pl-10 pr-4 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
          />
        </div>
      </div>

      {/* Empty State */}
      {filtered.length === 0 && !loading && (
        <div className="rounded-2xl border border-slate-200/60 bg-white p-12 text-center text-slate-400">
          <UserMinus className="mx-auto mb-3 h-10 w-10 opacity-20" />
          <p className="text-sm font-medium">No discharged ER patients found</p>
        </div>
      )}

      {/* Table */}
      {filtered.length > 0 && (
        <div className="overflow-hidden rounded-2xl border border-slate-200/60 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="bg-linear-to-r from-slate-50 to-slate-100/50 border-b border-slate-200">
                  <th className="px-4 py-3.5 text-left text-[11px] font-black uppercase tracking-wider text-slate-500">SR.NO</th>
                  <th className="px-4 py-3.5 text-left text-[11px] font-black uppercase tracking-wider text-slate-500">MRN</th>
                  <th className="px-4 py-3.5 text-left text-[11px] font-black uppercase tracking-wider text-slate-500">Patient</th>
                  <th className="px-4 py-3.5 text-left text-[11px] font-black uppercase tracking-wider text-slate-500">Doctor</th>
                  <th className="px-4 py-3.5 text-left text-[11px] font-black uppercase tracking-wider text-slate-500">Bed</th>
                  <th className="px-4 py-3.5 text-left text-[11px] font-black uppercase tracking-wider text-slate-500">Admitted</th>
                  <th className="px-4 py-3.5 text-left text-[11px] font-black uppercase tracking-wider text-slate-500">Discharged</th>
                  <th className="px-4 py-3.5 text-left text-[11px] font-black uppercase tracking-wider text-slate-500">Status</th>
                  <th className="px-4 py-3.5 text-left text-[11px] font-black uppercase tracking-wider text-slate-500">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading && (
                  <tr><td colSpan={9} className="px-4 py-12 text-center text-slate-400">
                    <div className="flex flex-col items-center gap-2">
                      <Activity className="h-6 w-6 animate-pulse text-indigo-400" />
                      <span>Loading...</span>
                    </div>
                  </td></tr>
                )}
                {filtered.map((r, idx) => (
                  <tr key={r.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-4 py-3">{idx + 1}</td>
                    <td className="px-4 py-3">{r.mrn || '-'}</td>
                    <td className="px-4 py-3">
                      <div>
                        <button
                          onClick={() => r.encounterId && navigate(`/hospital/patient/${r.encounterId}`)}
                          className="font-semibold text-slate-900 hover:text-indigo-700 hover:underline transition-colors text-left"
                          title="View patient profile"
                        >{r.patientName || '-'}</button>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-slate-600">{r.doctor || '-'}</td>
                    <td className="px-4 py-3">{r.bed || '-'}</td>
                    <td className="px-4 py-3">{r.admittedAt ? new Date(r.admittedAt).toLocaleString() : '-'}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5 text-slate-600">
                        <Clock className="h-3.5 w-3.5 text-slate-400" />
                        {r.dischargedAt || '—'}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="rounded-full bg-emerald-600 px-2 py-1 text-xs text-white">Discharged</span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-2">
                        <button 
                          disabled={!r.encounterId} 
                          onClick={()=> r.encounterId && printSummary(r.encounterId)} 
                          className="inline-flex items-center gap-1.5 rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-1.5 text-xs font-bold text-indigo-700 shadow-sm transition-all hover:bg-indigo-100 hover:shadow active:scale-95 disabled:opacity-50"
                        >
                          <FileText className="h-3.5 w-3.5" /> Summary
                        </button>
                        
                        <button 
                          disabled={!r.encounterId} 
                          onClick={()=> r.encounterId && printInvoice(r.encounterId)} 
                          className="inline-flex items-center gap-1.5 rounded-lg border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-bold text-amber-700 shadow-sm transition-all hover:bg-amber-100 hover:shadow active:scale-95 disabled:opacity-50"
                        >
                          <Receipt className="h-3.5 w-3.5" /> Invoice
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm text-slate-600">
          <span>Page {page} of {totalPages}</span>
          <div className="flex items-center gap-2">
            <button disabled={page <= 1} onClick={() => setPage(p => Math.max(1, p - 1))} className="rounded-lg border border-slate-200 px-3 py-1.5 hover:bg-slate-50 disabled:opacity-40">
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button disabled={page >= totalPages} onClick={() => setPage(p => p + 1)} className="rounded-lg border border-slate-200 px-3 py-1.5 hover:bg-slate-50 disabled:opacity-40">
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      <Toast toast={toast} onClose={() => setToast(null)} />
    </div>
  )
}
