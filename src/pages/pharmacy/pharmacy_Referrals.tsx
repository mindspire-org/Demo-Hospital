import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { hospitalApi } from '../../utils/api'
import Toast, { type ToastState } from '../../components/ui/Toast'
import ConfirmDialog from '../../components/ui/ConfirmDialog'
import MiniDashboard from '../../components/common/MiniDashboard'
import { ArrowRightLeft, Clock, CheckCircle, XCircle, List } from 'lucide-react'

export default function Pharmacy_Referrals(){
  const [list, setList] = useState<any[]>([])
  const [status, setStatus] = useState<'pending'|'completed'|'cancelled'|'all'>('pending')
  const [q, setQ] = useState('')
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(20)
  const [total, setTotal] = useState(0)
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const navigate = useNavigate()
  const [toast, setToast] = useState<ToastState>(null)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string>('')

  useEffect(()=>{ load() }, [status, page, limit, from, to])

  async function load(){
    try{
      const res: any = await hospitalApi.listReferrals({ type: 'pharmacy', status: status==='all'?undefined:status, from: from||undefined, to: to||undefined, page, limit })
      setList(res?.referrals || [])
      setTotal(Number(res?.total || 0))
    }catch{ setList([]); setTotal(0) }
  }

  async function mark(id: string, st: 'completed'|'cancelled'|'pending'){
    try{ await hospitalApi.updateReferralStatus(id, st); await load() }
    catch(e: any){ setToast({ type: 'error', message: e?.message || 'Failed' }) }
  }
  async function remove(id: string){
    setConfirmDeleteId(String(id))
  }

  async function confirmDelete(){
    const id = confirmDeleteId
    setConfirmDeleteId('')
    if (!id) return
    try{ await hospitalApi.deleteReferral(id); await load(); setToast({ type: 'success', message: 'Deleted' }) }
    catch(e: any){ setToast({ type: 'error', message: e?.message || 'Failed' }) }
  }

  const filtered = useMemo(()=>{
    const s = q.trim().toLowerCase()
    return (list||[]).filter((r: any)=> !s || `${r.encounterId?.patientId?.fullName||''} ${r.encounterId?.patientId?.mrn||''} ${r.doctorId?.name||''}`.toLowerCase().includes(s))
  }, [list, q])

  const pendingCount = list.filter((r: any) => r.status === 'pending').length
  const completedCount = list.filter((r: any) => r.status === 'completed').length
  const cancelledCount = list.filter((r: any) => r.status === 'cancelled').length

  return (
    <>
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-sky-100 text-sky-600"><ArrowRightLeft className="h-5 w-5" /></div>
        <h1 className="text-xl font-bold text-slate-800">Pharmacy Referrals</h1>
      </div>

      <MiniDashboard cards={[
        { label: 'Total', value: total, icon: List, color: 'bg-indigo-500' },
        { label: 'Pending', value: pendingCount, icon: Clock, color: 'bg-amber-500' },
        { label: 'Completed', value: completedCount, icon: CheckCircle, color: 'bg-emerald-500' },
        { label: 'Cancelled', value: cancelledCount, icon: XCircle, color: 'bg-rose-500' },
      ]} />

      <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm">
        <div className="mb-3 text-[11px] font-bold uppercase tracking-wider text-slate-500">Filters</div>
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <label className="mb-1 block text-[11px] font-bold uppercase tracking-wider text-slate-500">From</label>
            <input type="date" value={from} onChange={e=>{ setPage(1); setFrom(e.target.value) }} className="rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-indigo-400 focus:ring-2 focus:ring-indigo-50 outline-none" />
          </div>
          <div>
            <label className="mb-1 block text-[11px] font-bold uppercase tracking-wider text-slate-500">To</label>
            <input type="date" value={to} onChange={e=>{ setPage(1); setTo(e.target.value) }} className="rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-indigo-400 focus:ring-2 focus:ring-indigo-50 outline-none" />
          </div>
          <div>
            <label className="mb-1 block text-[11px] font-bold uppercase tracking-wider text-slate-500">Status</label>
            <select value={status} onChange={e=>{ setPage(1); setStatus(e.target.value as any) }} className="rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-indigo-400 outline-none">
              <option value="pending">Pending</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
              <option value="all">All</option>
            </select>
          </div>
          <div>
            <label className="mb-1 block text-[11px] font-bold uppercase tracking-wider text-slate-500">Per Page</label>
            <select value={limit} onChange={e=>{ setPage(1); setLimit(parseInt(e.target.value)||20) }} className="rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-indigo-400 outline-none">
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={50}>50</option>
            </select>
          </div>
          <div className="flex-1 min-w-[180px]">
            <label className="mb-1 block text-[11px] font-bold uppercase tracking-wider text-slate-500">Search</label>
            <input value={q} onChange={e=>setQ(e.target.value)} placeholder="Patient, doctor, MRN" className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-indigo-400 focus:ring-2 focus:ring-indigo-50 outline-none" />
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white">
        <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3 text-sm">
          <div className="font-medium text-slate-800">Results</div>
          <div className="text-slate-600">{total ? `${(page-1)*limit+1}-${Math.min(page*limit,total)} of ${total}` : ''}</div>
        </div>
        <div className="divide-y divide-slate-200">
          {filtered.map((r: any) => (
            <div key={r._id} className="px-4 py-3 text-sm">
              <div className="font-medium">{r.encounterId?.patientId?.fullName || '-'} <span className="text-xs text-slate-500">{r.encounterId?.patientId?.mrn || ''}</span></div>
              <div className="text-xs text-slate-600">{new Date(r.createdAt).toLocaleString()} • Status: {r.status} • By: Dr. {r.doctorId?.name || '-'}</div>
              {r.notes && <div className="mt-1 text-xs text-slate-700"><span className="font-semibold">Notes:</span> {r.notes}</div>}
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <button className="btn" disabled={!r.prescriptionId} onClick={()=>navigate(`/pharmacy/prescriptions/${r.prescriptionId}`)}>Open Intake</button>
                <button className="rounded-md border border-emerald-300 bg-emerald-50 px-3 py-1 text-sm text-emerald-700" onClick={()=>mark(r._id, 'completed')}>Mark Completed</button>
                <button className="rounded-md border border-slate-300 px-3 py-1 text-sm" onClick={()=>mark(r._id, 'pending')}>Mark Pending</button>
                <button className="rounded-md border border-rose-300 bg-rose-50 px-3 py-1 text-sm text-rose-700" onClick={()=>remove(r._id)}>Delete</button>
              </div>
            </div>
          ))}
          {filtered.length===0 && <div className="px-4 py-8 text-center text-slate-500 text-sm">No referrals</div>}
        </div>
        <div className="flex items-center justify-between px-4 py-3 text-sm">
          <button className="rounded-md border border-slate-300 px-3 py-1 disabled:opacity-50" disabled={page<=1} onClick={()=>setPage(p=>Math.max(1,p-1))}>Prev</button>
          <div className="text-slate-600">Page {page}</div>
          <button className="rounded-md border border-slate-300 px-3 py-1 disabled:opacity-50" disabled={page*limit>=total} onClick={()=>setPage(p=>p+1)}>Next</button>
        </div>
      </div>
    </div>
    <ConfirmDialog
      open={!!confirmDeleteId}
      title="Confirm"
      message="Delete this referral?"
      confirmText="Delete"
      onCancel={()=>setConfirmDeleteId('')}
      onConfirm={confirmDelete}
    />
    <Toast toast={toast} onClose={()=>setToast(null)} />
    </>
  )
}
