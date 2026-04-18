import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'

import { hospitalApi } from '../../utils/api'
import Store_ConfirmDialog from '../../components/hospital/Store_ConfirmDialog'
import Toast, { type ToastState } from '../../components/ui/Toast'

type EmergencyStatus = 'active' | 'admitted' | 'discharged'

type EmergencyRow = {
  id: string
  tokenNo: string
  time: string
  mrn: string
  patientName: string
  age?: string
  gender?: string
  phone?: string
  doctor?: string
  status: EmergencyStatus
  triage?: 'red'|'yellow'|'green'
  arrivalMode?: string
  chiefComplaint?: string
  encounterId?: string
}

function Badge({ tone, children }: { tone: 'slate'|'amber'|'emerald'|'rose'|'violet'; children: React.ReactNode }){
  const map: Record<string,string> = {
    slate: 'bg-slate-100 text-slate-700 border-slate-200',
    amber: 'bg-amber-50 text-amber-700 border-amber-200',
    emerald: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    rose: 'bg-rose-50 text-rose-700 border-rose-200',
    violet: 'bg-violet-50 text-violet-700 border-violet-200',
  }
  return <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${map[tone]}`}>{children}</span>
}

export default function Hospital_EmergencyQueue(){
  const navigate = useNavigate()
  const [rows, setRows] = useState<EmergencyRow[]>([])
  const [loading, setLoading] = useState(false)
  const [q, setQ] = useState('')
  const [status, setStatus] = useState<'All'|EmergencyStatus>('All')
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [confirmRow, setConfirmRow] = useState<EmergencyRow | null>(null)
  const [toast, setToast] = useState<ToastState>(null)

  useEffect(() => {
    let cancelled = false
    async function load(){
      setLoading(true)
      try{
        const deps: any = await hospitalApi.listDepartments() as any
        const list: any[] = deps?.departments || deps || []
        const er = list.find((d: any) => String(d?.name || '').trim().toLowerCase() === 'emergency')
        const departmentId = er?._id || er?.id
        if (!departmentId){
          if (!cancelled) setRows([])
          return
        }
        const res: any = await hospitalApi.listTokens({ departmentId: String(departmentId), status: 'queued' })
        const res2: any = await hospitalApi.listTokens({ departmentId: String(departmentId), status: 'in-progress' })
        const toks: any[] = [...(res?.tokens || []), ...(res2?.tokens || [])]
        const mapped: EmergencyRow[] = toks.map((t: any) => {
          const p = t.patientId || {}
          const docName = t.doctorId?.name || t.doctorId?.fullName || t.doctorId?.username || ''
          const when = t.createdAt ? new Date(t.createdAt) : null
          const time = when ? when.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''
          const st: EmergencyStatus = (t.status === 'queued' || t.status === 'in-progress') ? 'active' : (t.status === 'completed' ? 'discharged' : 'active')
          const enc = t.encounterId || t.encounter || {}
          return {
            id: String(t._id || t.id),
            tokenNo: String(t.tokenNo || ''),
            time,
            mrn: String(p.mrn || t.mrn || ''),
            patientName: String(p.fullName || t.patientName || ''),
            age: String(p.age || ''),
            gender: String(p.gender || ''),
            phone: String(p.phoneNormalized || ''),
            doctor: docName ? String(docName) : undefined,
            status: st,
            triage: enc.triage || t.triage || undefined,
            arrivalMode: enc.arrivalMode || t.arrivalMode || undefined,
            chiefComplaint: enc.chiefComplaint || t.chiefComplaint || undefined,
            encounterId: t.encounterId?._id || t.encounterId || undefined,
          }
        })
        if (!cancelled) setRows(mapped)
      }catch{
        if (!cancelled) setRows([])
      }finally{
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [])

  const filtered = useMemo(()=>{
    const qq = q.trim().toLowerCase()
    return rows.filter(r => {
      if (status !== 'All' && r.status !== status) return false
      if (!qq) return true
      const hay = [r.tokenNo, r.mrn, r.patientName, r.phone, r.time, r.gender, r.status, r.triage, r.arrivalMode, r.chiefComplaint].filter(Boolean).join(' ').toLowerCase()
      return hay.includes(qq)
    })
  }, [q, rows, status])

  const openChart = (r: EmergencyRow) => {
    navigate(`/hospital/emergency/${encodeURIComponent(r.id)}`)
  }

  const handleDischarge = (r: EmergencyRow) => {
    setConfirmRow(r)
    setConfirmOpen(true)
  }

  const onConfirmDischarge = async () => {
    if (!confirmRow) return
    if (!confirmRow.encounterId) {
      setToast({ type: 'error', message: 'No encounter found for this token' })
      setConfirmOpen(false)
      setConfirmRow(null)
      return
    }
    setConfirmOpen(false)
    try {
      await hospitalApi.dischargeER(confirmRow.encounterId, { disposition: 'discharged' })
      setRows(prev => prev.map(row => row.id === confirmRow.id ? { ...row, status: 'discharged' } : row))
      setToast({ type: 'success', message: 'Patient discharged successfully' })
    } catch (e: any) {
      setToast({ type: 'error', message: e?.message || 'Failed to discharge' })
    } finally {
      setConfirmRow(null)
    }
  }

  const onCancelDischarge = () => {
    setConfirmOpen(false)
    setConfirmRow(null)
  }

  const triageTone = (t?: EmergencyRow['triage']) => {
    if (t === 'red') return 'rose'
    if (t === 'yellow') return 'amber'
    if (t === 'green') return 'emerald'
    return 'slate'
  }

  const statusTone = (s: EmergencyRow['status']) => {
    if (s === 'active') return 'violet'
    if (s === 'admitted') return 'amber'
    return 'emerald'
  }

  return (
    <div className="p-4 md:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold text-slate-800">Emergency</h2>
          <div className="mt-1 text-sm text-slate-600">Queue & active cases (frontend scaffold)</div>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-2 md:grid-cols-3">
        <input
          value={q}
          onChange={e=>setQ(e.target.value)}
          placeholder="Search by token#, MR#, patient, phone..."
          className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-200"
        />
        <select value={status} onChange={e=>setStatus(e.target.value as any)} className="rounded-md border border-slate-300 px-2 py-2 text-sm">
          <option value="All">All Status</option>
          <option value="active">Active</option>
          <option value="admitted">Admitted</option>
          <option value="discharged">Discharged</option>
        </select>
        <div className="flex items-center justify-end text-sm text-slate-600">Rows: <span className="ml-1 font-semibold text-slate-800">{filtered.length}</span></div>
      </div>

      <div className="mt-4 overflow-hidden rounded-xl border border-slate-200 bg-white">
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead className="bg-slate-100/50 text-slate-700 border-b-2 border-slate-300">
            <tr>
              <th className="px-4 py-3 text-[13px] font-extrabold uppercase tracking-wider text-left">Time</th>
              <th className="px-4 py-3 text-[13px] font-extrabold uppercase tracking-wider text-left">Token</th>
              <th className="px-4 py-3 text-[13px] font-extrabold uppercase tracking-wider text-left">MRN</th>
              <th className="px-4 py-3 text-[13px] font-extrabold uppercase tracking-wider text-left">Patient</th>
              <th className="px-4 py-3 text-[13px] font-extrabold uppercase tracking-wider text-left">Triage</th>
              <th className="px-4 py-3 text-[13px] font-extrabold uppercase tracking-wider text-left">Arrival Mode</th>
              <th className="px-4 py-3 text-[13px] font-extrabold uppercase tracking-wider text-left">Chief Complaint</th>
              <th className="px-4 py-3 text-[13px] font-extrabold uppercase tracking-wider text-left">Status</th>
              <th className="px-4 py-3 text-[13px] font-extrabold uppercase tracking-wider text-left">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {loading && (
              <tr><td colSpan={9} className="px-4 py-8 text-center text-slate-500">Loading…</td></tr>
            )}
            {filtered.map(r => (
              <tr key={r.id} className="hover:bg-slate-50">
                <td className="px-4 py-2">{r.time}</td>
                <td className="px-4 py-2 font-medium">{r.tokenNo}</td>
                <td className="px-4 py-2">{r.mrn}</td>
                <td className="px-4 py-2">{r.patientName}</td>
                <td className="px-4 py-2">
                  <Badge tone={triageTone(r.triage) as any}>{String(r.triage || '—').toUpperCase()}</Badge>
                </td>
                <td className="px-4 py-2">{r.arrivalMode || '—'}</td>
                <td className="px-4 py-2">{r.chiefComplaint || '—'}</td>
                <td className="px-4 py-2">
                  <Badge tone={statusTone(r.status) as any}>{r.status.toUpperCase()}</Badge>
                </td>
                <td className="px-4 py-2">
                  <div className="flex gap-2">
                    <button onClick={()=>openChart(r)} className="rounded-md border border-slate-300 px-3 py-1.5 text-sm hover:bg-slate-50">Open</button>
                    {(r.status === 'active' || r.status === 'admitted') && (
                      <button onClick={()=>handleDischarge(r)} className="rounded-md bg-emerald-600 text-white px-3 py-1.5 text-sm hover:bg-emerald-700">Discharge</button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Store_ConfirmDialog
        open={confirmOpen}
        title="Discharge Patient"
        message={confirmRow ? `Are you sure you want to discharge ${confirmRow.patientName}?` : ''}
        onCancel={onCancelDischarge}
        onConfirm={onConfirmDischarge}
        confirmText="Discharge"
        confirmStyle="primary"
      />
      <Toast toast={toast} onClose={() => setToast(null)} />
    </div>
  )
}
