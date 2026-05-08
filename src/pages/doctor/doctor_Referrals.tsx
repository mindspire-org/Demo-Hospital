import { useEffect, useRef, useState, useMemo } from 'react'
import { hospitalApi, labApi } from '../../utils/api'
import Toast from '../../components/ui/Toast'
import Doctor_IpdReferralForm from '../../components/doctor/Doctor_IpdReferralForm'
import { previewIpdReferralPdf } from '../../utils/ipdReferralPdf'
import { 
  Printer, 
  Trash2, 
  Edit3, 
  RefreshCw, 
  Plus, 
  Filter, 
  FileStack, 
  CheckCircle2, 
  Clock, 
  Ban,
  ArrowUpRight,
  Search,
  UserPlus,
  CalendarDays
} from 'lucide-react'

type DoctorSession = { id: string; name: string; username: string }

type IpdReferral = {
  id: string
  patientId: string
  patientName?: string
  mrNo?: string
  gender?: string
  fatherName?: string
  age?: string
  phone?: string
  address?: string
  cnic?: string
  status: 'New' | 'Accepted' | 'Rejected' | 'Admitted'
  referralDate?: string
  referralTime?: string
  reasonOfReferral?: string
  provisionalDiagnosis?: string
  vitals?: { bp?: string; pulse?: number; temperature?: number; rr?: number }
  referredTo?: { departmentId?: string; doctorId?: string; department?: string; doctor?: string }
  condition?: { stability?: 'Stable' | 'Unstable'; consciousness?: 'Conscious' | 'Unconscious' }
  remarks?: string
  signStamp?: string
  createdAt: string
  referredBy?: string
}

export default function Doctor_Referrals() {
  const [doc, setDoc] = useState<DoctorSession | null>(null)
  const [referrals, setReferrals] = useState<IpdReferral[]>([])
  const [loading, setLoading] = useState(false)
  const [statusFilter, setStatusFilter] = useState<'all' | 'New' | 'Accepted' | 'Rejected' | 'Admitted'>('all')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [editOpen, setEditOpen] = useState(false)
  const [editing, setEditing] = useState<IpdReferral | null>(null)
  const [settings, setSettings] = useState<any>(null)
  const referralFormRef = useRef<any>(null)
  
  // Pagination state
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(20)
  const [total, setTotal] = useState(0)

  useEffect(() => {
    try {
      const raw = localStorage.getItem('doctor.session')
      const sess = raw ? JSON.parse(raw) : null
      setDoc(sess)
    } catch {}
  }, [])

  useEffect(() => {
    if (doc?.id) {
      setPage(1)
    }
  }, [doc?.id, statusFilter, from, to])

  useEffect(() => {
    if (doc?.id) {
      loadReferrals()
      loadSettings()
    }
  }, [doc?.id, statusFilter, from, to, page, limit])

  // Stats calculation
  const stats = useMemo(() => {
    const counts = { new: 0, accepted: 0, rejected: 0, admitted: 0 }
    referrals.forEach(r => {
      if (r.status === 'New') counts.new++
      if (r.status === 'Accepted') counts.accepted++
      if (r.status === 'Rejected') counts.rejected++
      if (r.status === 'Admitted') counts.admitted++
    })
    return counts
  }, [referrals])

  const filteredReferrals = useMemo(() => {
    if (!searchTerm.trim()) return referrals
    const q = searchTerm.toLowerCase()
    return referrals.filter(r => 
      r.patientName?.toLowerCase().includes(q) || 
      r.mrNo?.toLowerCase().includes(q) ||
      r.reasonOfReferral?.toLowerCase().includes(q)
    )
  }, [referrals, searchTerm])

  async function loadSettings() {
    try {
      const s = await hospitalApi.getSettings() as any
      setSettings(s)
    } catch {}
  }

  async function loadReferrals() {
    if (!doc?.id) return
    setLoading(true)
    try {
      const params: any = { referredByDoctorId: doc.id, page, limit }
      if (statusFilter !== 'all') params.status = statusFilter
      if (from) params.from = from
      if (to) params.to = to
      const res: any = await hospitalApi.listIpdReferrals(params)
      const totalCount = res?.total || 0
      setTotal(totalCount)
      const rows: any[] = res?.referrals || []
      const items: IpdReferral[] = await Promise.all(rows.map(async (r: any) => {
        const patientData = r.patientId?._id ? r.patientId : r.patientSnapshot
        const referredToData = r.referredTo || {}
        
        let ageStr = patientData?.age || ''
        let fatherName = patientData?.fatherName || patientData?.fatherHusbandName || ''
        let phone = patientData?.phone || patientData?.phoneNormalized || ''
        let address = patientData?.address || ''
        let cnic = patientData?.cnic || patientData?.cnicNormalized || ''
        let gender = patientData?.gender || '-'
        
        const mrn = patientData?.mrn || patientData?.mrNumber
        if ((!ageStr || !fatherName || !phone || !address) && mrn) {
          try {
            const resp: any = await labApi.getPatientByMrn(mrn)
            const lp = resp?.patient
            if (lp) {
              if (!ageStr && lp.dob) {
                try {
                  const dob = new Date(lp.dob)
                  if (!isNaN(dob as any)) {
                    const years = Math.floor((Date.now() - dob.getTime()) / 31557600000)
                    ageStr = String(Math.max(0, years))
                  }
                } catch {}
              }
              if (!gender || gender === '-') gender = lp.gender || gender
              if (!fatherName) fatherName = lp.fatherName || ''
              if (!phone) phone = lp.phone || lp.phoneNormalized || ''
              if (!address) address = lp.address || ''
              if (!cnic) cnic = lp.cnic || lp.cnicNormalized || ''
            }
          } catch {}
        }
        
        if (!ageStr && patientData?.dob) {
          try {
            const dob = new Date(patientData.dob)
            if (!isNaN(dob as any)) {
              const years = Math.floor((Date.now() - dob.getTime()) / 31557600000)
              ageStr = String(Math.max(0, years))
            }
          } catch {}
        }
        
        return {
          id: String(r._id || r.id),
          patientId: String(r.patientId?._id || r.patientId || r.patientSnapshot?._id),
          patientName: patientData?.fullName || patientData?.name || '-',
          mrNo: patientData?.mrn || patientData?.mrNumber || '-',
          gender: gender,
          fatherName: fatherName,
          age: ageStr,
          phone: phone,
          address: address,
          cnic: cnic,
          status: r.status || 'New',
          referralDate: r.referralDate,
          referralTime: r.referralTime,
          reasonOfReferral: r.reasonOfReferral,
          provisionalDiagnosis: r.provisionalDiagnosis,
          vitals: r.vitals,
          referredTo: {
            departmentId: referredToData.departmentId,
            doctorId: referredToData.doctorId,
            department: referredToData.departmentName || referredToData.department || '-',
            doctor: referredToData.doctorName || referredToData.doctor || '-',
          },
          condition: r.condition,
          remarks: r.remarks,
          signStamp: r.signStamp,
          createdAt: r.createdAt,
          referredBy: r.referredBy?.doctorName || r.referredBy || r.doctorId?.name,
        }
      }))
      setReferrals(items)
    } catch (e: any) {
      setToast({ type: 'error', message: e?.message || 'Failed to load referrals' })
    } finally {
      setLoading(false)
    }
  }

  async function handleDelete(id: string) {
    try {
      await hospitalApi.updateIpdReferralStatus(id, 'reject')
      setToast({ type: 'success', message: 'Referral rejected' })
      setDeleteId(null)
      loadReferrals()
    } catch (e: any) {
      setToast({ type: 'error', message: e?.message || 'Failed to delete' })
    }
  }

  async function handlePrint(r: IpdReferral) {
    try {
      const settingsNorm = {
        name: settings?.name || 'Hospital',
        address: settings?.address || '',
        phone: settings?.phone || '',
        logoDataUrl: settings?.logoDataUrl || ''
      }

      const patientObj = {
        name: r.patientName || '-',
        mrn: r.mrNo || '-',
        gender: r.gender || '-',
        fatherName: r.fatherName || '',
        age: r.age || '',
        phone: r.phone || '',
        address: r.address || '',
        cnic: r.cnic || '',
      }

      let formattedDate = r.referralDate || new Date().toISOString().slice(0, 10)
      try {
        if (formattedDate) {
          const d = new Date(formattedDate)
          if (!isNaN(d as any)) {
            formattedDate = d.toLocaleDateString('en-GB')
          }
        }
      } catch {}

      const referralObj = {
        date: formattedDate,
        time: r.referralTime || new Date().toTimeString().slice(0, 5),
        reason: r.reasonOfReferral || '-',
        provisionalDiagnosis: r.provisionalDiagnosis || '-',
        vitals: {
          bp: r.vitals?.bp || '-',
          pulse: String(r.vitals?.pulse || '-'),
          temperature: String(r.vitals?.temperature || '-'),
          rr: String(r.vitals?.rr || '-'),
        },
        referredTo: {
          department: r.referredTo?.department || '-',
          doctor: r.referredTo?.doctor || '-',
        },
        condition: {
          stability: r.condition?.stability || 'Stable',
          consciousness: r.condition?.consciousness || 'Conscious',
        },
        remarks: r.remarks || '-',
        signStamp: r.signStamp || '',
        referredBy: r.referredBy || doc?.name || '',
      }

      await previewIpdReferralPdf({
        settings: settingsNorm,
        patient: patientObj,
        referral: referralObj,
      })
    } catch (e: any) {
      setToast({ type: 'error', message: e?.message || 'Failed to print' })
    }
  }

  function openEdit(r: IpdReferral) {
    setEditing(r)
    setEditOpen(true)
  }

  const statusBadge = (status: string) => {
    switch (status) {
      case 'New': return 'bg-sky-50 text-sky-700 border-sky-100 ring-sky-500/10'
      case 'Accepted': return 'bg-emerald-50 text-emerald-700 border-emerald-100 ring-emerald-500/10'
      case 'Rejected': return 'bg-rose-50 text-rose-700 border-rose-100 ring-rose-500/10'
      case 'Admitted': return 'bg-violet-50 text-violet-700 border-violet-100 ring-violet-500/10'
      default: return 'bg-slate-50 text-slate-700 border-slate-100 ring-slate-500/10'
    }
  }

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto animate-in fade-in duration-500">
      {/* Header Section */}
      <div className="flex items-center justify-between flex-wrap gap-4 px-2">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Referral Management</h1>
          <p className="text-slate-500 text-sm mt-1">Track and manage IPD & Emergency patient referrals.</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={loadReferrals}
            className="p-2.5 text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-all shadow-sm active:scale-95"
            title="Refresh List"
          >
            <RefreshCw className={`h-5 w-5 ${loading ? 'animate-spin text-sky-600' : ''}`} />
          </button>
          <button 
            onClick={() => { setEditing(null); setEditOpen(true) }}
            className="flex items-center gap-2 px-5 py-2.5 bg-sky-600 text-white rounded-xl hover:bg-sky-700 transition-all font-semibold shadow-md shadow-sky-100 active:scale-95"
          >
            <UserPlus className="h-4 w-4" />
            <span>New Referral</span>
          </button>
        </div>
      </div>

      {/* Mini Dashboard */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 px-1">
        {[
          { label: 'Pending New', value: stats.new, icon: Clock, color: 'sky', border: 'border-sky-100' },
          { label: 'Accepted', value: stats.accepted, icon: CheckCircle2, color: 'emerald', border: 'border-emerald-100' },
          { label: 'Admitted', value: stats.admitted, icon: ArrowUpRight, color: 'violet', border: 'border-violet-100' },
          { label: 'Rejected', value: stats.rejected, icon: Ban, color: 'rose', border: 'border-rose-100' },
        ].map((stat, i) => (
          <div key={i} className={`bg-white p-5 rounded-2xl border ${stat.border} shadow-sm hover:shadow-md transition-all group`}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">{stat.label}</p>
                <h3 className="text-2xl font-black text-slate-900 mt-1">{stat.value}</h3>
              </div>
              <div className={`p-3 bg-${stat.color}-50 rounded-xl group-hover:scale-110 transition-transform`}>
                <stat.icon className={`h-6 w-6 text-${stat.color}-600`} />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Filters & Dashboard Controls */}
      <div className="flex flex-col lg:flex-row gap-6 px-1">
        {/* Left: Search & Status */}
        <div className="flex-1 space-y-4">
          <div className="bg-white border border-slate-200 rounded-3xl shadow-sm p-5 h-full flex flex-col justify-center">
            <div className="flex flex-col sm:flex-row gap-4 items-center">
              <div className="relative flex-1 w-full">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  placeholder="Search by Patient Name or MRN..."
                  className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm focus:ring-4 focus:ring-sky-500/10 focus:border-sky-500 outline-none transition-all font-medium"
                />
              </div>
              <div className="flex items-center gap-3 bg-slate-50 border border-slate-200 p-2 rounded-2xl w-full sm:w-auto">
                <div className="p-2 bg-white rounded-xl shadow-sm">
                  <Filter className="h-4 w-4 text-sky-600" />
                </div>
                <select
                  value={statusFilter}
                  onChange={e => setStatusFilter(e.target.value as any)}
                  className="bg-transparent border-none text-sm font-bold text-slate-700 focus:ring-0 cursor-pointer pr-10"
                >
                  <option value="all">All Referrals</option>
                  <option value="New">Pending New</option>
                  <option value="Accepted">Accepted</option>
                  <option value="Rejected">Rejected</option>
                  <option value="Admitted">Admitted</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Right: Modern Queue Period Selector (Matching Reference) */}
        <div className="w-full lg:w-[420px]">
          <div className="bg-white border border-slate-200 rounded-3xl shadow-sm overflow-hidden flex flex-col">
            <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/30 flex items-center gap-3">
              <div className="p-2 bg-sky-50 rounded-xl">
                <CalendarDays className="h-5 w-5 text-sky-600" />
              </div>
              <h2 className="text-[13px] font-black text-slate-500 uppercase tracking-[0.15em]">Referral Period</h2>
            </div>
            
            <div className="p-6">
              <div className="grid grid-cols-2 gap-6">
                {/* From Date */}
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block ml-1">From</label>
                  <div className="relative group">
                    <input
                      type="date"
                      value={from}
                      onChange={e => setFrom(e.target.value)}
                      className="w-full pl-4 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 focus:ring-4 focus:ring-sky-500/10 focus:border-sky-500 outline-none transition-all cursor-pointer group-hover:bg-white"
                    />
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none opacity-40">
                      <Clock className="h-4 w-4 text-slate-400" />
                    </div>
                  </div>
                </div>

                {/* To Date */}
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block ml-1">To</label>
                  <div className="relative group">
                    <input
                      type="date"
                      value={to}
                      onChange={e => setTo(e.target.value)}
                      className="w-full pl-4 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 focus:ring-4 focus:ring-sky-500/10 focus:border-sky-500 outline-none transition-all cursor-pointer group-hover:bg-white"
                    />
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none opacity-40">
                      <Clock className="h-4 w-4 text-slate-400" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Referrals Table Container */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden mx-1">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200">
                <th className="px-6 py-4 text-[11px] font-bold text-slate-500 uppercase tracking-widest">Patient Details</th>
                <th className="px-6 py-4 text-[11px] font-bold text-slate-500 uppercase tracking-widest text-center">Referral Info</th>
                <th className="px-6 py-4 text-[11px] font-bold text-slate-500 uppercase tracking-widest">Referred To</th>
                <th className="px-6 py-4 text-[11px] font-bold text-slate-500 uppercase tracking-widest">Status</th>
                <th className="px-6 py-4 text-[11px] font-bold text-slate-500 uppercase tracking-widest text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <RefreshCw className="h-8 w-8 text-sky-500 animate-spin" />
                      <span className="text-sm font-medium text-slate-500">Retrieving referrals...</span>
                    </div>
                  </td>
                </tr>
              ) : filteredReferrals.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-20 text-center">
                    <div className="flex flex-col items-center gap-4">
                      <div className="p-4 bg-slate-50 rounded-full">
                        <FileStack className="h-10 w-10 text-slate-300" />
                      </div>
                      <div>
                        <p className="text-lg font-bold text-slate-700">No referrals found</p>
                        <p className="text-sm text-slate-500 mt-1">Try adjusting your filters or search term.</p>
                      </div>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredReferrals.map((r, i) => (
                  <tr key={r.id} className="hover:bg-slate-50/50 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 bg-slate-100 rounded-full flex items-center justify-center font-bold text-slate-400 group-hover:bg-sky-50 group-hover:text-sky-500 transition-all">
                          {r.patientName?.charAt(0)}
                        </div>
                        <div>
                          <div className="font-bold text-slate-900">{r.patientName}</div>
                          <div className="text-[11px] text-slate-500 font-medium mt-0.5">MRN: {r.mrNo} • {r.gender} • {r.age}y</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-center">
                        <div className="text-sm font-semibold text-slate-700">
                          {r.referralDate ? new Date(r.referralDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }) : '—'}
                        </div>
                        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter mt-1 truncate max-w-[140px] mx-auto" title={r.reasonOfReferral}>
                          {r.reasonOfReferral || 'No Reason'}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700">
                          <span className="p-1 bg-slate-100 rounded text-[10px]">{r.referredTo?.department || 'OPD'}</span>
                        </div>
                        <div className="text-[11px] text-slate-500 font-medium italic">Dr. {r.referredTo?.doctor || 'General Duty'}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-3 py-1 rounded-full border text-[10px] font-black uppercase tracking-widest ${statusBadge(r.status)}`}>
                        {r.status}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handlePrint(r)}
                          className="p-2 text-slate-400 hover:text-sky-600 hover:bg-sky-50 rounded-lg transition-all"
                          title="Print Referral"
                        >
                          <Printer className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => openEdit(r)}
                          className="p-2 text-slate-400 hover:text-sky-600 hover:bg-sky-50 rounded-lg transition-all"
                          title="Edit Details"
                        >
                          <Edit3 className="h-4 w-4" />
                        </button>
                        {r.status === 'New' && (
                          <button
                            onClick={() => setDeleteId(r.id)}
                            className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all"
                            title="Reject Referral"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Improved Pagination */}
        {total > limit && (
          <div className="bg-slate-50/50 border-t border-slate-100 px-6 py-4 flex items-center justify-between">
            <div className="text-xs font-bold text-slate-400 uppercase tracking-widest">
              Showing {Math.min((page - 1) * limit + 1, total)} to {Math.min(page * limit, total)} of {total}
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="px-4 py-1.5 text-xs font-bold text-slate-600 bg-white border border-slate-200 rounded-lg disabled:opacity-40 hover:bg-slate-50 transition-all shadow-sm"
              >
                Previous
              </button>
              <div className="flex items-center gap-1">
                {[...Array(Math.ceil(total / limit))].map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setPage(i + 1)}
                    className={`w-8 h-8 rounded-lg text-xs font-bold transition-all ${
                      page === i + 1 ? 'bg-sky-600 text-white shadow-md shadow-sky-100' : 'text-slate-500 hover:bg-slate-100'
                    }`}
                  >
                    {i + 1}
                  </button>
                ))}
              </div>
              <button
                onClick={() => setPage(p => Math.min(Math.ceil(total / limit), p + 1))}
                disabled={page >= Math.ceil(total / limit)}
                className="px-4 py-1.5 text-xs font-bold text-slate-600 bg-white border border-slate-200 rounded-lg disabled:opacity-40 hover:bg-slate-50 transition-all shadow-sm"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modals & Overlays */}
      {deleteId && (
        <div className="fixed inset-0 z-100 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="text-center">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-rose-50 border border-rose-100">
                <Trash2 className="h-7 w-7 text-rose-600" />
              </div>
              <h3 className="text-xl font-bold text-slate-900">Reject Referral?</h3>
              <p className="text-sm text-slate-500 mt-2 leading-relaxed">This patient referral will be marked as rejected and archived. This action can be reversed by editing.</p>
            </div>
            <div className="flex gap-3 mt-8">
              <button
                onClick={() => setDeleteId(null)}
                className="flex-1 px-4 py-2.5 text-sm font-bold text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(deleteId)}
                className="flex-1 px-4 py-2.5 text-sm font-bold text-white bg-rose-600 rounded-xl hover:bg-rose-700 shadow-md shadow-rose-100"
              >
                Reject Referral
              </button>
            </div>
          </div>
        </div>
      )}

      {editOpen && (
        <div className="fixed inset-0 z-100 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="w-full max-w-5xl max-h-[92vh] rounded-3xl bg-white shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-bottom-4 duration-300">
            <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/50 px-8 py-5">
              <div>
                <h3 className="text-xl font-bold text-slate-900">{editing ? 'Modify Referral' : 'Create New Referral'}</h3>
                <p className="text-xs text-slate-500 mt-0.5 font-medium uppercase tracking-wider">Patient Transfer Protocol</p>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={async () => {
                    try {
                      const s: any = settings || await hospitalApi.getSettings()
                      const settingsNorm = { name: s?.name || 'Hospital', address: s?.address || '', phone: s?.phone || '', logoDataUrl: s?.logoDataUrl || '' }
                      const d = referralFormRef.current?.getPreviewData?.()
                      if (!d) { setToast({ type: 'error', message: 'Form not ready' }); return }
                      await previewIpdReferralPdf({ settings: settingsNorm, patient: d.patient, referral: d.referral })
                    } catch (e: any) {
                      setToast({ type: 'error', message: e?.message || 'Failed to print' })
                    }
                  }}
                  className="flex items-center gap-2 px-4 py-2 text-sm font-bold text-slate-700 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-all shadow-sm"
                >
                  <Printer className="h-4 w-4" />
                  <span>Print Preview</span>
                </button>
                <button
                  onClick={() => setEditOpen(false)}
                  className="p-2 text-slate-400 hover:text-slate-900 hover:bg-slate-100 rounded-full transition-all"
                >
                  <Plus className="h-6 w-6 rotate-45" />
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto custom-scrollbar p-8">
              <Doctor_IpdReferralForm
                ref={referralFormRef}
                mrn={editing?.mrNo}
                doctor={{ id: doc?.id, name: doc?.name }}
                initialData={editing ? {
                  referralDate: editing.referralDate,
                  referralTime: editing.referralTime,
                  reasonOfReferral: editing.reasonOfReferral,
                  provisionalDiagnosis: editing.provisionalDiagnosis,
                  vitals: editing.vitals ? {
                    bp: editing.vitals.bp,
                    pulse: String(editing.vitals.pulse || ''),
                    temperature: String(editing.vitals.temperature || ''),
                    rr: String(editing.vitals.rr || ''),
                  } : undefined,
                  referredTo: editing.referredTo,
                  condition: editing.condition,
                  remarks: editing.remarks,
                  signStamp: editing.signStamp,
                } : undefined}
                onSaved={() => {
                  setEditOpen(false)
                  loadReferrals()
                  setToast({ type: 'success', message: 'Referral processed successfully' })
                }}
              />
            </div>
          </div>
        </div>
      )}

      {toast && <Toast toast={toast} onClose={() => setToast(null)} />}
    </div>
  )
}
