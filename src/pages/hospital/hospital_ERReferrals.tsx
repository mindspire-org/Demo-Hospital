import React, { useEffect, useState, useMemo } from 'react'
import { hospitalApi } from '../../utils/api'
import { previewErReferralPdf } from '../../utils/erReferralPdf'
import Toast, { type ToastState } from '../../components/ui/Toast'
import { 
  AlertCircle, 
  Activity, 
  Clock, 
  Search, 
  Printer, 
  CheckCircle2, 
  XCircle, 
  Play,
  RefreshCw,
  FileText
} from 'lucide-react'

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

  const [deps, setDeps] = useState<any[]>([])
  const [docs, setDocs] = useState<any[]>([])
  const [beds, setBeds] = useState<any[]>([])
  const [openAdmitEr, setOpenAdmitEr] = useState<{ open: boolean; id?: string } | null>(null)
  const [admitErForm, setAdmitErForm] = useState({ 
    departmentId: '', 
    doctorId: '', 
    bedId: '',
    triage: 'green',
    arrivalMode: 'referral'
  })

  useEffect(() => { load() }, [status, priority, page, limit])
  useEffect(() => {
    (async () => {
      try {
        const [a, b, c] = await Promise.all([
          hospitalApi.listDepartments({ limit: 1000 }) as any,
          hospitalApi.listDoctors() as any,
          hospitalApi.listBeds() as any
        ])
        setDeps((a?.departments || a) || [])
        setDocs((b?.doctors || b) || [])
        setBeds((c?.beds || c) || [])
      } catch { }
    })()
  }, [])

  function bedDisplayName(b: any) {
    const floor = String(b?.floorName || '').trim()
    const loc = String(b?.locationName || '').trim()
    const label = String(b?.label || '').trim()
    const parts = [floor, loc, label].filter(Boolean)
    return parts.join('/') || label || '-'
  }

  // Stats calculation
  const stats = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10)
    return {
      total: total,
      today: rows.filter(r => (r.referralDate || r.createdAt)?.startsWith(today)).length,
      critical: rows.filter(r => r.priority === 'Critical').length,
      inProgress: rows.filter(r => r.status === 'In-Progress').length
    }
  }, [rows, total])

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

  async function handleAccept(id: string) {
    try {
      await hospitalApi.updateErReferralStatus(id, 'accept')
      setToast({ type: 'success', message: 'Referral accepted' })
      await load()
    } catch (e: any) {
      setToast({ type: 'error', message: e?.message || 'Failed to accept referral' })
    }
  }

  async function admitErSubmit(e: React.FormEvent) {
    e.preventDefault()
    const id = openAdmitEr?.id
    if (!id) return
    if (!admitErForm.departmentId) {
      setToast({ type: 'error', message: 'Please select a department' })
      return
    }
    if (!admitErForm.bedId) {
      setToast({ type: 'error', message: 'Bed selection is mandatory' })
      return
    }
    try {
      await hospitalApi.startErVisitFromReferral(id, { 
        departmentId: admitErForm.departmentId, 
        doctorId: admitErForm.doctorId || undefined,
        bedId: admitErForm.bedId,
        triage: admitErForm.triage,
        arrivalMode: admitErForm.arrivalMode
      })
      setToast({ type: 'success', message: 'Patient admitted to ER successfully' })
      setOpenAdmitEr(null)
      setAdmitErForm({ departmentId: '', doctorId: '', bedId: '', triage: 'green', arrivalMode: 'referral' })
      await load()
    } catch (e: any) {
      setToast({ type: 'error', message: e?.message || 'Failed to admit patient' })
    }
  }

  async function reject(id: string) {
    try { 
      await hospitalApi.updateErReferralStatus(id, 'reject')
      setToast({ type: 'success', message: 'Referral rejected' })
      await load() 
    } catch { 
      updateLocal(id, { status: 'Rejected' })
      await load() 
    }
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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">ER Referrals</h1>
          <p className="text-sm text-slate-500 font-medium">Manage and track emergency room referrals</p>
        </div>
        <button
          onClick={() => { setPage(1); load(); }}
          className="flex items-center gap-2 rounded-lg bg-sky-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-sky-700 transition-all active:scale-95"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Widgets */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-sky-100 p-2 text-sky-600">
              <FileText className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Total Referrals</p>
              <p className="text-xl font-bold text-slate-900">{stats.total}</p>
            </div>
          </div>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-emerald-100 p-2 text-emerald-600">
              <Clock className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Today's Referrals</p>
              <p className="text-xl font-bold text-slate-900">{stats.today}</p>
            </div>
          </div>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-rose-100 p-2 text-rose-600">
              <AlertCircle className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Critical Priority</p>
              <p className="text-xl font-bold text-slate-900">{stats.critical}</p>
            </div>
          </div>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-amber-100 p-2 text-amber-600">
              <Activity className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">In-Progress Visits</p>
              <p className="text-xl font-bold text-slate-900">{stats.inProgress}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-6 items-end">
          <div className="lg:col-span-1">
            <label className="mb-1 block text-xs font-semibold text-slate-500 uppercase">Status</label>
            <select
              value={status}
              onChange={e => setStatus(e.target.value as any)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
            >
              <option value="">All Status</option>
              <option>New</option>
              <option>Accepted</option>
              <option>Rejected</option>
              <option>In-Progress</option>
              <option>Completed</option>
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-500 uppercase">Priority</label>
            <select
              value={priority}
              onChange={e => setPriority(e.target.value as any)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
            >
              <option value="">All Priorities</option>
              <option value="Regular">Regular</option>
              <option value="Urgent">Urgent</option>
              <option value="Critical">Critical</option>
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-500 uppercase">From</label>
            <input
              type="date"
              value={from}
              onChange={e => setFrom(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-500 uppercase">To</label>
            <input
              type="date"
              value={to}
              onChange={e => setTo(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
            />
          </div>
          <div className="lg:col-span-2">
            <label className="mb-1 block text-xs font-semibold text-slate-500 uppercase">Search</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                value={q}
                onChange={e => setQ(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') { load() } }}
                placeholder="Serial / Patient / MRN"
                className="w-full rounded-lg border border-slate-300 pl-9 pr-3 py-2 text-sm focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4 bg-slate-50/50">
          <div className="font-bold text-slate-800">Referral List ({total})</div>
          <div className="text-sm text-slate-500 font-medium">
            Showing {rows.length === 0 ? 0 : (page - 1) * limit + 1}-{Math.min(page * limit, total)} of {total}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase text-[10px] font-bold tracking-wider">
                <th className="px-6 py-3">Serial</th>
                <th className="px-6 py-3">Patient Details</th>
                <th className="px-6 py-3">Priority</th>
                <th className="px-6 py-3">Referral Info</th>
                <th className="px-6 py-3">Referred To</th>
                <th className="px-6 py-3 text-center">Status</th>
                <th className="px-6 py-3 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {rows.map(r => {
                const id = String(r._id || r.id)
                const p = r.patientSnapshot || r.patient || {}
                const mrn = p.mrn || p.mrNumber || '-'
                const name = p.fullName || p.name || '-'
                return (
                  <tr key={id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-mono text-[10px] font-bold text-sky-600 bg-sky-50 px-2 py-0.5 rounded border border-sky-100 inline-block">
                        {r.serial || id.slice(-6)}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-bold text-slate-900">{name}</div>
                      <div className="text-[10px] text-slate-500 font-bold tracking-tight">MRN: {mrn}</div>
                    </td>
                    <td className="px-6 py-4">
                      <PriorityBadge priority={r.priority} />
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-[11px] font-bold text-slate-700">{numericDate(r.referralDate || r.createdAt)}</div>
                      <div className="text-[10px] text-slate-500 font-medium mt-0.5 line-clamp-1 max-w-[150px]" title={r.reasonOfReferral}>
                        {r.reasonOfReferral || '-'}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-[11px] font-bold text-slate-700">{r.referredTo?.departmentName || 'Emergency'}</div>
                      <div className="text-[10px] text-slate-500 font-medium mt-0.5">{r.referredTo?.doctorName || '-'}</div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <StatusBadge status={r.status} />
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => printReferral(r)}
                          className="rounded-lg border border-slate-200 p-2 text-slate-600 hover:bg-white hover:border-sky-500 hover:text-sky-600 transition-all shadow-sm"
                          title="Print Referral"
                        >
                          <Printer className="h-4 w-4" />
                        </button>
                        
                        {r.status === 'New' && (
                          <>
                            <button
                              onClick={() => handleAccept(id)}
                              className="rounded-lg border border-slate-200 p-2 text-emerald-600 hover:bg-emerald-50 hover:border-emerald-200 transition-all shadow-sm"
                              title="Accept Referral"
                            >
                              <CheckCircle2 className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => reject(id)}
                              className="rounded-lg border border-slate-200 p-2 text-rose-600 hover:bg-rose-50 hover:border-rose-200 transition-all shadow-sm"
                              title="Reject Referral"
                            >
                              <XCircle className="h-4 w-4" />
                            </button>
                          </>
                        )}

                        {(r.status === 'New' || r.status === 'Accepted') && (
                          <button
                            onClick={() => {
                              setOpenAdmitEr({ open: true, id });
                              setAdmitErForm({ 
                                departmentId: r.referredTo?.departmentId || '', 
                                doctorId: r.referredTo?.doctorId || '',
                                bedId: '',
                                triage: 'green',
                                arrivalMode: 'referral'
                              });
                            }}
                            className="flex items-center gap-1.5 rounded-lg bg-sky-600 px-3 py-1.5 text-[11px] font-bold text-white hover:bg-sky-700 transition-all shadow-sm active:scale-95"
                            title="Admit to ER"
                          >
                            <Play className="h-3 w-3 fill-current" />
                            Admit to ER
                          </button>
                        )}

                        {r.status === 'In-Progress' && (
                          <button
                            onClick={() => completeVisit(id)}
                            className="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-[11px] font-bold text-white hover:bg-emerald-700 transition-all shadow-sm active:scale-95"
                            title="Complete ER Visit"
                          >
                            <CheckCircle2 className="h-3 w-3" />
                            Complete
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-6 py-20 text-center">
                    <FileText className="h-12 w-12 mx-auto text-slate-200 mb-3" />
                    <p className="text-slate-500 font-medium">No referrals found</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {total > 0 && (
          <div className="flex items-center justify-between border-t border-slate-200 px-6 py-4 bg-slate-50/30 text-sm">
            <div className="flex items-center gap-3">
              <span className="text-slate-500 font-medium text-xs uppercase tracking-wider">Rows per page:</span>
              <select
                value={limit}
                onChange={e => { setLimit(Number(e.target.value)); setPage(1) }}
                className="rounded-lg border border-slate-300 px-2 py-1 text-xs font-bold focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
              >
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="rounded-lg px-4 py-2 text-xs font-bold text-slate-600 hover:bg-white hover:shadow-sm border border-transparent hover:border-slate-200 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
              >
                Prev
              </button>
              <div className="bg-white border border-slate-200 rounded-lg px-4 py-2 text-xs font-bold text-slate-700 shadow-sm">
                Page {page} of {totalPages}
              </div>
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="rounded-lg px-4 py-2 text-xs font-bold text-slate-600 hover:bg-white hover:shadow-sm border border-transparent hover:border-slate-200 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Admit to ER Modal */}
      {openAdmitEr?.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl animate-in zoom-in-95 duration-200 overflow-hidden">
            <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <h3 className="text-lg font-bold text-slate-800">Admit to ER</h3>
              <button onClick={() => setOpenAdmitEr(null)} className="text-slate-400 hover:text-slate-600 transition-colors">
                <XCircle className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={admitErSubmit} className="p-6 space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Select Department</label>
                <select
                  value={admitErForm.departmentId}
                  onChange={e => setAdmitErForm(f => ({ ...f, departmentId: e.target.value }))}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm focus:border-sky-500 focus:ring-1 focus:ring-sky-500 outline-none transition-all"
                  required
                >
                  <option value="">Select Department</option>
                  {deps.map((d: any) => (
                    <option key={String(d._id || d.id)} value={String(d._id || d.id)}>{d.name}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Select Doctor (Optional)</label>
                <select
                  value={admitErForm.doctorId}
                  onChange={e => setAdmitErForm(f => ({ ...f, doctorId: e.target.value }))}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm focus:border-sky-500 focus:ring-1 focus:ring-sky-500 outline-none transition-all"
                >
                  <option value="">Select Doctor</option>
                  {docs.map((d: any) => (
                    <option key={String(d._id || d.id)} value={String(d._id || d.id)}>{d.name}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Select Bed <span className="text-rose-500">*</span></label>
                <select
                  value={admitErForm.bedId}
                  onChange={e => setAdmitErForm(f => ({ ...f, bedId: e.target.value }))}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm focus:border-sky-500 focus:ring-1 focus:ring-sky-500 outline-none transition-all"
                  required
                >
                  <option value="">Select Bed</option>
                  {beds.map((b: any) => (
                    <option 
                      key={String(b._id || b.id)} 
                      value={String(b._id || b.id)}
                      disabled={String(b?.status || '').toLowerCase() === 'occupied'}
                    >
                      {bedDisplayName(b)} {String(b?.status || '').toLowerCase() === 'occupied' ? '(Occupied)' : ''}
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Triage <span className="text-rose-500">*</span></label>
                  <select
                    value={admitErForm.triage}
                    onChange={e => setAdmitErForm(f => ({ ...f, triage: e.target.value }))}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm focus:border-sky-500 focus:ring-1 focus:ring-sky-500 outline-none transition-all"
                    required
                  >
                    <option value="red">🔴 Red (Emergency)</option>
                    <option value="yellow">🟡 Yellow (Urgent)</option>
                    <option value="green">🟢 Green (Non-Urgent)</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Arrival Mode <span className="text-rose-500">*</span></label>
                  <select
                    value={admitErForm.arrivalMode}
                    onChange={e => setAdmitErForm(f => ({ ...f, arrivalMode: e.target.value }))}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm focus:border-sky-500 focus:ring-1 focus:ring-sky-500 outline-none transition-all"
                    required
                  >
                    <option value="referral">Referral</option>
                    <option value="walk-in">Walk-in</option>
                    <option value="ambulance">Ambulance</option>
                  </select>
                </div>
              </div>
              <div className="pt-4 flex gap-3">
                <button
                  type="button"
                  onClick={() => setOpenAdmitEr(null)}
                  className="flex-1 rounded-xl border border-slate-200 py-3 text-sm font-bold text-slate-700 hover:bg-slate-50 transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 rounded-xl bg-sky-600 py-3 text-sm font-bold text-white shadow-lg shadow-sky-200 hover:bg-sky-700 transition-all active:scale-95 flex items-center justify-center gap-2"
                >
                  <Play className="h-4 w-4 fill-current" />
                  Admit to ER
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <Toast toast={toast} onClose={() => setToast(null)} />
    </div>
  )
}

function StatusBadge({ status }: { status?: string }) {
  const map: any = { 
    New: 'bg-sky-100 text-sky-800 border-sky-200', 
    Accepted: 'bg-emerald-100 text-emerald-800 border-emerald-200', 
    Rejected: 'bg-rose-100 text-rose-800 border-rose-200', 
    'In-Progress': 'bg-amber-100 text-amber-800 border-amber-200', 
    Completed: 'bg-slate-100 text-slate-800 border-slate-200' 
  }
  const cls = map[status || ''] || 'bg-slate-100 text-slate-800 border-slate-200'
  return (
    <span className={`inline-flex rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider border ${cls}`}>
      {status || '—'}
    </span>
  )
}

function PriorityBadge({ priority }: { priority?: string }) {
  const map: any = { 
    Regular: 'bg-slate-100 text-slate-800 border-slate-200', 
    Urgent: 'bg-amber-100 text-amber-800 border-amber-200', 
    Critical: 'bg-rose-100 text-rose-800 border-rose-200' 
  }
  const cls = map[priority || ''] || 'bg-slate-100 text-slate-800 border-slate-200'
  return (
    <span className={`inline-flex rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider border ${cls}`}>
      {priority || 'Regular'}
    </span>
  )
}
