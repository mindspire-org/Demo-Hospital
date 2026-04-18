import { useEffect, useState } from 'react'
import { hospitalApi } from '../../utils/api'
import { previewErReferralPdf } from '../../utils/erReferralPdf'
import Toast, { type ToastState } from '../../components/ui/Toast'

export default function Hospital_ERReferrals() {
  const [status, setStatus] = useState<'New' | 'Accepted' | 'Rejected' | 'In-Progress' | 'Completed' | ''>('')
  const [priority, setPriority] = useState<'Regular' | 'Urgent' | 'Critical' | ''>('')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [q, setQ] = useState('')
  const [loading, setLoading] = useState(false)
  const [rows, setRows] = useState<any[]>([])
  const [toast, setToast] = useState<ToastState>(null)
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(20)
  const [total, setTotal] = useState(0)
  const totalPages = Math.max(1, Math.ceil(total / limit))

  useEffect(() => { load() }, [status, priority, page, limit])

  async function load() {
    setLoading(true)
    try {
      const res = await hospitalApi.listErReferrals({ 
        status: status || undefined, 
        priority: priority || undefined, 
        q: q || undefined, 
        from: from || undefined, 
        to: to || undefined, 
        page, 
        limit 
      }) as any
      setRows(res?.referrals || [])
      setTotal(res?.total || 0)
      if (res?.page) setPage(res.page)
    } catch {
      try {
        const raw = localStorage.getItem('hospital.er.referrals') || '[]'
        let items = JSON.parse(raw) as any[]
        if (status) items = items.filter(r => r.status === status)
        if (priority) items = items.filter(r => r.priority === priority)
        if (q) { const qq = q.toLowerCase(); items = items.filter(r => `${r.serial} ${r?.patientSnapshot?.fullName || ''} ${r?.patientSnapshot?.mrn || ''}`.toLowerCase().includes(qq)) }
        if (from) { const dd = new Date(from).getTime(); items = items.filter(r => new Date(r.referralDate || r.createdAt).getTime() >= dd) }
        if (to) { const dd = new Date(to).getTime() + 86400000 - 1; items = items.filter(r => new Date(r.referralDate || r.createdAt).getTime() <= dd) }
        setRows(items)
        setTotal(items.length)
      } catch { setRows([]); setTotal(0) }
    } finally { setLoading(false) }
  }

  async function acceptAndStart(id: string) {
    try {
      await hospitalApi.updateErReferralStatus(id, 'accept')
      await hospitalApi.startErVisitFromReferral(id, { departmentId: '', doctorId: undefined })
      await load()
    } catch {
      updateLocal(id, { status: 'In-Progress' })
      await load()
    }
  }
  async function reject(id: string) {
    try { await hospitalApi.updateErReferralStatus(id, 'reject'); await load() } catch { updateLocal(id, { status: 'Rejected' }); await load() }
  }
  function updateLocal(id: string, patch: any) {
    try {
      const key = 'hospital.er.referrals'
      const arr = JSON.parse(localStorage.getItem(key) || '[]') as any[]
      const idx = arr.findIndex(x => String(x._id || x.id) === String(id))
      if (idx >= 0) { arr[idx] = { ...arr[idx], ...patch }; localStorage.setItem(key, JSON.stringify(arr)) }
    } catch { }
  }

  function numericDate(s?: string) { if (!s) return ''; const d = new Date(s); return isNaN(d as any) ? '' : d.toLocaleDateString() }
  function formatTime(hm?: string) { return hm || '' }

  async function completeVisit(id: string) {
    try {
      await hospitalApi.completeErVisitFromReferral(id)
      await load()
    } catch (e: any) {
      setToast({ type: 'error', message: e?.message || 'Failed to complete visit' })
    }
  }

  async function printReferral(referral: any) {
    try {
      const s: any = await hospitalApi.getSettings()
      const settings = { name: s?.name || 'Hospital', address: s?.address || '', phone: s?.phone || '', logoDataUrl: s?.logoDataUrl || '' }
      const p = referral.patientSnapshot || referral.patient || {}
      const patient = {
        name: p.fullName || p.name || '-',
        mrn: p.mrn || p.mrNumber || '-',
        gender: p.gender || '-',
        fatherName: p.fatherHusbandName || p.fatherName || '',
        age: p.age || '',
        phone: p.phone || p.phoneNormalized || '',
        address: p.address || '',
        cnic: p.cnic || p.cnicNormalized || ''
      }
      const data = {
        settings,
        patient,
        referral: {
          serial: referral.serial || '-',
          date: referral.referralDate || referral.createdAt,
          time: referral.referralTime || '',
          priority: referral.priority || 'Regular',
          reason: referral.reasonOfReferral || '',
          provisionalDiagnosis: referral.provisionalDiagnosis || '',
          vitals: referral.vitals || {},
          referredTo: {
            department: referral.referredTo?.departmentName || 'Emergency',
            doctor: referral.referredTo?.doctorName || '-'
          },
          condition: referral.condition || {},
          remarks: referral.remarks || '',
          referredBy: referral.referredBy?.doctorName || ''
        }
      }
      await previewErReferralPdf(data)
    } catch (e: any) {
      setToast({ type: 'error', message: e?.message || 'Failed to open print preview' })
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="text-xl font-semibold text-slate-900">ER Referrals</div>
        <div className="text-sm text-slate-600">{loading ? 'Loading…' : `Showing ${rows.length} of ${total} items`}</div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <div className="grid gap-3 md:grid-cols-7 items-end">
          <div>
            <label className="mb-1 block text-sm text-slate-700">Status</label>
            <select value={status} onChange={e => setStatus(e.target.value as any)} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm">
              <option value="">All</option>
              <option>New</option>
              <option>Accepted</option>
              <option>Rejected</option>
              <option>In-Progress</option>
              <option>Completed</option>
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm text-slate-700">Priority</label>
            <select value={priority} onChange={e => setPriority(e.target.value as any)} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm">
              <option value="">All</option>
              <option value="Regular">Regular</option>
              <option value="Urgent">Urgent</option>
              <option value="Critical">Critical</option>
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm text-slate-700">From</label>
            <input type="date" value={from} onChange={e => setFrom(e.target.value)} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="mb-1 block text-sm text-slate-700">To</label>
            <input type="date" value={to} onChange={e => setTo(e.target.value)} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" />
          </div>
          <div className="md:col-span-2">
            <label className="mb-1 block text-sm text-slate-700">Search</label>
            <input value={q} onChange={e => setQ(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') { load() } }} placeholder="serial / patient / MRN" className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" />
          </div>
          <div>
            <button onClick={() => { setPage(1); load(); }} className="btn w-full">Apply</button>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white">
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-slate-100/50 text-slate-700 border-b-2 border-slate-300">
              <tr>
                <th className="px-4 py-3 text-[13px] font-extrabold uppercase tracking-wider">Serial</th>
                <th className="px-4 py-3 text-[13px] font-extrabold uppercase tracking-wider">MRN</th>
                <th className="px-4 py-3 text-[13px] font-extrabold uppercase tracking-wider">Patient</th>
                <th className="px-4 py-3 text-[13px] font-extrabold uppercase tracking-wider">Priority</th>
                <th className="px-4 py-3 text-[13px] font-extrabold uppercase tracking-wider">Reason</th>
                <th className="px-4 py-3 text-[13px] font-extrabold uppercase tracking-wider">Diagnosis</th>
                <th className="px-4 py-3 text-[13px] font-extrabold uppercase tracking-wider">Referred To</th>
                <th className="px-4 py-3 text-[13px] font-extrabold uppercase tracking-wider">Date</th>
                <th className="px-4 py-3 text-[13px] font-extrabold uppercase tracking-wider">Time</th>
                <th className="px-4 py-3 text-[13px] font-extrabold uppercase tracking-wider">Status</th>
                <th className="px-4 py-3 text-[13px] font-extrabold uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-slate-700">
              {rows.map(r => {
                const id = String(r._id || r.id)
                const p = r.patientSnapshot || r.patient || {}
                const mrn = p.mrn || p.mrNumber || '-'
                const name = p.fullName || p.name || '-'
                const refTo = r.referredTo?.departmentName || r.referredTo?.doctorName || r.referredTo?.departmentId || r.referredTo?.doctorId || '-'
                return (
                  <tr key={id} className="hover:bg-slate-50/50">
                    <td className="px-4 py-2 font-mono text-xs">{r.serial || id.slice(-6)}</td>
                    <td className="px-4 py-2">{mrn}</td>
                    <td className="px-4 py-2 capitalize">{name}</td>
                    <td className="px-4 py-2"><PriorityBadge priority={r.priority} /></td>
                    <td className="px-4 py-2">{r.reasonOfReferral || '-'}</td>
                    <td className="px-4 py-2">{r.provisionalDiagnosis || '-'}</td>
                    <td className="px-4 py-2">{refTo}</td>
                    <td className="px-4 py-2">{numericDate(r.referralDate || r.createdAt)}</td>
                    <td className="px-4 py-2">{formatTime(r.referralTime)}</td>
                    <td className="px-4 py-2"><StatusBadge status={r.status} /></td>
                    <td className="px-4 py-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <button className="rounded-md border border-slate-300 px-2 py-1 text-xs hover:bg-slate-50" onClick={() => printReferral(r)}>Print</button>
                        {r.status === 'New' && (<button className="btn-outline-navy" onClick={() => acceptAndStart(id)}>Accept</button>)}
                        {(r.status === 'New' || r.status === 'Accepted') && (<button className="btn-outline-navy" onClick={() => reject(id)}>Reject</button>)}
                        {r.status === 'In-Progress' && (<button className="btn bg-emerald-600 hover:bg-emerald-700" onClick={() => completeVisit(id)}>Complete</button>)}
                      </div>
                    </td>
                  </tr>
                )
              })}
              {rows.length === 0 && (
                <tr><td colSpan={11} className="px-4 py-10 text-center text-slate-500">No referrals</td></tr>
              )}
            </tbody>
          </table>
        </div>
        
        {/* Pagination */}
        <div className="flex items-center justify-between px-4 py-3 border-t border-slate-200">
          <div className="flex items-center gap-2">
            <span className="text-sm text-slate-600">Rows per page:</span>
            <select 
              value={limit} 
              onChange={e => { setLimit(Number(e.target.value)); setPage(1); }}
              className="rounded-md border border-slate-300 px-2 py-1 text-sm"
            >
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
          </div>
          {totalPages > 1 && (
            <div className="flex items-center gap-2">
              <button 
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="rounded-md border border-slate-300 px-3 py-1 text-sm hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Previous
              </button>
              <span className="text-sm text-slate-600">
                Page {page} of {totalPages}
              </span>
              <button 
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="rounded-md border border-slate-300 px-3 py-1 text-sm hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
          )}
        </div>
      </div>

      <Toast toast={toast} onClose={() => setToast(null)} />
    </div>
  )
}

function StatusBadge({ status }: { status?: string }) {
  const map: any = { New: 'bg-sky-600', Accepted: 'bg-emerald-600', Rejected: 'bg-rose-600', 'In-Progress': 'bg-amber-600', Completed: 'bg-slate-700' }
  const cls = map[status || ''] || 'bg-slate-500'
  return <span className={`rounded-full px-2 py-0.5 text-white text-xs ${cls}`}>{status || '—'}</span>
}

function PriorityBadge({ priority }: { priority?: string }) {
  const map: any = { Regular: 'bg-slate-500', Urgent: 'bg-amber-600', Critical: 'bg-rose-600' }
  const cls = map[priority || ''] || 'bg-slate-500'
  return <span className={`rounded-full px-2 py-0.5 text-white text-xs ${cls}`}>{priority || 'Regular'}</span>
}
