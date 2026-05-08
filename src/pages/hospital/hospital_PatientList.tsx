import { useEffect, useMemo, useState } from 'react'
import { hospitalApi } from '../../utils/api'
import { useNavigate, useLocation } from 'react-router-dom'
import Toast, { type ToastState } from '../../components/ui/Toast'

type Row = {
  id: string
  mrn: string
  name: string
  doctor: string
  bed: string
  admitted: string
  status: 'admitted'|'discharged'
  admissionNo?: string
  tokenNo?: string
  pendingAmount?: number
}

function formatDate(s?: string) {
  if (!s) return '-'
  const d = new Date(s)
  return d.toLocaleDateString()
}

function getPatientProfileBasePath(pathname: string) {
  return pathname.startsWith('/doctor') ? '/doctor/patient' : '/hospital/patient'
}

export default function Hospital_PatientList() {
  const navigate = useNavigate()
  const location = useLocation()
  const patientProfileBase = getPatientProfileBasePath(location.pathname)
  const [q, setQ] = useState('')
  const [rowsPerPage, setRowsPerPage] = useState(20)
  const [rows, setRows] = useState<Row[]>([])
  const [loading, setLoading] = useState(false)
  const [toast, setToast] = useState<ToastState>(null)

  useEffect(()=>{ load() }, [])
  async function load(){
    setLoading(true)
    try {
      const res = await hospitalApi.listIPDAdmissions({ status: 'admitted', limit: 200 }) as any
      const admissions = res.admissions || []
      
      // Fetch billing summaries for all admitted patients to get pending amounts
      const summaries = await Promise.all(
        admissions.map(async (a: any) => {
          try {
            const s: any = await hospitalApi.listIpdPayments(String(a._id))
            return { id: String(a._id), pending: s?.totals?.netOutstanding || 0 }
          } catch {
            return { id: String(a._id), pending: 0 }
          }
        })
      )
      const pendingMap = Object.fromEntries(summaries.map(s => [s.id, s.pending]))

      const items: Row[] = admissions.map((e: any)=>({
        id: String(e._id),
        mrn: e.patientId?.mrn || '-',
        name: e.patientId?.fullName || '-',
        doctor: e.doctorId?.name || '-',
        bed: e.bedLabel || e.bedId || '-',
        admitted: e.startAt,
        status: e.status,
        admissionNo: e.admissionNo,
        tokenNo: (e.tokenId as any)?.tokenNo,
        pendingAmount: pendingMap[String(e._id)] || 0
      }))
      setRows(items)
    } finally { setLoading(false) }
  }

  const filtered = useMemo(() => {
    const query = q.toLowerCase()
    return rows.filter(p => {
      const hay = `${p.name} ${p.mrn} ${p.bed} ${p.doctor}`.toLowerCase()
      return hay.includes(query)
    })
  }, [q, rows])

  async function discharge(id: string){
    try { await hospitalApi.dischargeIPD(id); await load() } catch (e: any){ setToast({ type: 'error', message: e?.message || 'Failed' }) }
  }

  // Transfer bed modal state
  const [transferOpen, setTransferOpen] = useState(false)
  const [transferEncounterId, setTransferEncounterId] = useState<string | null>(null)
  const [bedsAvail, setBedsAvail] = useState<Array<{ _id: string; label: string }>>([])
  const [newBedId, setNewBedId] = useState('')

  async function openTransfer(id: string){
    setTransferEncounterId(id)
    setNewBedId('')
    setTransferOpen(true)
    try {
      const res = await hospitalApi.listBeds({ status: 'available' }) as any
      setBedsAvail(res.beds || [])
    } catch {}
  }

  async function submitTransfer(e: React.FormEvent){
    e.preventDefault()
    if (!transferEncounterId || !newBedId) return
    try {
      await hospitalApi.transferIPDBed(transferEncounterId, { newBedId })
      setTransferOpen(false)
      setTransferEncounterId(null)
      await load()
    } catch (err: any){
      setToast({ type: 'error', message: err?.message || 'Failed to transfer bed' })
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="text-xl font-bold text-slate-800">IPD Patient List</div>
        <div className="flex items-center gap-3">
          <input value={q} onChange={e=>setQ(e.target.value)} placeholder="Search by name, MRN, or bed" className="w-64 rounded-md border border-slate-300 px-3 py-2 text-sm" />
          <select value={rowsPerPage} onChange={e=>setRowsPerPage(parseInt(e.target.value))} className="rounded-md border border-slate-300 px-2 py-1 text-sm text-slate-700">
            <option value={20}>20</option>
            <option value={50}>50</option>
          </select>
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white">
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-slate-100/50 text-slate-700 border-b-2 border-slate-300">
              <tr>
                <th className="px-4 py-3 text-[13px] font-extrabold uppercase tracking-wider">SR.NO</th>
                <th className="px-4 py-3 text-[13px] font-extrabold uppercase tracking-wider">Token #</th>
                <th className="px-4 py-3 text-[13px] font-extrabold uppercase tracking-wider">MRN</th>
                <th className="px-4 py-3 text-[13px] font-extrabold uppercase tracking-wider">Patient</th>
                <th className="px-4 py-3 text-[13px] font-extrabold uppercase tracking-wider">Doctor</th>
                <th className="px-4 py-3 text-[13px] font-extrabold uppercase tracking-wider">Bed</th>
                <th className="px-4 py-3 text-[13px] font-extrabold uppercase tracking-wider">Admitted</th>
                <th className="px-4 py-3 text-[13px] font-extrabold uppercase tracking-wider">Admission #</th>
                <th className="px-4 py-3 text-[13px] font-extrabold uppercase tracking-wider">Status</th>
                <th className="px-4 py-3 text-[13px] font-extrabold uppercase tracking-wider text-right">Pending Amount</th>
                <th className="px-4 py-3 text-[13px] font-extrabold uppercase tracking-wider">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-slate-700">
              {loading && (
                <tr><td colSpan={11} className="px-4 py-6 text-center text-slate-500">Loading...</td></tr>
              )}
              {!loading && filtered.slice(0, rowsPerPage).map((p, idx) => (
                <tr key={p.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-4 py-2">{idx + 1}</td>
                  <td className="px-4 py-2 font-mono text-xs">{p.tokenNo || '-'}</td>
                  <td className="px-4 py-2 font-semibold text-slate-900">{p.mrn}</td>
                  <td className="px-4 py-2 capitalize font-medium">{p.name}</td>
                  <td className="px-4 py-2">{p.doctor}</td>
                  <td className="px-4 py-2">
                    <span className="inline-flex items-center rounded-md bg-sky-50 px-2 py-1 text-xs font-medium text-sky-700 ring-1 ring-inset ring-sky-700/10">{p.bed}</span>
                  </td>
                  <td className="px-4 py-2 text-slate-500">{formatDate(p.admitted)}</td>
                  <td className="px-4 py-2 font-mono text-xs">{p.admissionNo || '-'}</td>
                  <td className="px-4 py-2">
                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${p.status === 'admitted' ? 'bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-600/20' : 'bg-slate-50 text-slate-700 ring-1 ring-inset ring-slate-600/20'}`}>
                      {p.status === 'admitted' ? 'Admitted' : 'Discharged'}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-right">
                    <span className={`font-bold tabular-nums ${p.pendingAmount && p.pendingAmount > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                      {p.pendingAmount ? `Rs ${p.pendingAmount.toLocaleString()}` : 'Rs 0'}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-right">
                    {p.status === 'admitted' ? (
                      <div className="flex justify-end gap-2">
                        <button onClick={()=>navigate(`${patientProfileBase}/${p.id}`)} className="rounded-lg bg-white px-3 py-1.5 text-xs font-bold text-slate-700 shadow-sm ring-1 ring-inset ring-slate-300 hover:bg-slate-50 transition-all">Profile</button>
                        <button onClick={()=>openTransfer(p.id)} className="rounded-lg bg-white px-3 py-1.5 text-xs font-bold text-violet-700 shadow-sm ring-1 ring-inset ring-violet-300 hover:bg-violet-50 transition-all">Transfer</button>
                        <button onClick={()=>discharge(p.id)} className="rounded-lg bg-rose-600 px-3 py-1.5 text-xs font-bold text-white shadow-sm hover:bg-rose-500 transition-all">Discharge</button>
                      </div>
                    ) : (
                      <span className="text-xs text-slate-500">—</span>
                    )}
                  </td>
                </tr>
              ))}
              {!loading && filtered.length === 0 && (
                <tr>
                  <td colSpan={11} className="px-4 py-12 text-center text-slate-500">No patients</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
      {transferOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <form onSubmit={submitTransfer} className="w-full max-w-md rounded-lg bg-white p-4 shadow">
            <div className="text-base font-semibold text-slate-800">Transfer Bed</div>
            <div className="mt-3">
              <div className="mb-1 text-sm text-slate-700">Select new bed</div>
              <select value={newBedId} onChange={e=>setNewBedId(e.target.value)} className="w-full rounded-md border border-slate-300 px-3 py-2">
                <option value="">Available beds</option>
                {bedsAvail.map(b => <option key={b._id} value={b._id}>{b.label}</option>)}
              </select>
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <button type="button" onClick={()=>setTransferOpen(false)} className="rounded-md border border-slate-300 px-3 py-1.5 text-sm">Cancel</button>
              <button type="submit" disabled={!newBedId} className="rounded-md bg-violet-700 px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50">Transfer</button>
            </div>
          </form>
        </div>
      )}
      <Toast toast={toast} onClose={()=>setToast(null)} />
    </div>
  )
}
