import React, { useState, useEffect, useRef } from 'react'
import { hospitalApi } from '../../utils/api'
import Toast from '../../components/ui/Toast'
import Doctor_IpdReferralForm from '../../components/doctor/Doctor_IpdReferralForm'
import { previewIpdReferralPdf } from '../../utils/ipdReferralPdf'
import { Printer, Trash2, Edit3, RefreshCw, FileText, Activity, FlaskConical, Pill, AlertCircle, Search } from 'lucide-react'

type DoctorSession = { id: string; name: string; username: string }

type ReferralType = 'lab' | 'pharmacy' | 'diagnostic' | 'ipd' | 'er'

type UnifiedReferral = {
  id: string
  type: ReferralType
  patientId: string
  patientName?: string
  mrNo?: string
  gender?: string
  fatherName?: string
  age?: string
  phone?: string
  address?: string
  cnic?: string
  status: string
  date: string
  time?: string
  reason?: string
  provisionalDiagnosis?: string
  vitals?: { bp?: string; pulse?: number; temperature?: number; rr?: number }
  referredTo?: { departmentId?: string; doctorId?: string; department?: string; doctor?: string }
  condition?: { stability?: string; consciousness?: string }
  remarks?: string
  signStamp?: string
  createdAt: string
  referredBy?: string
  tests?: string[] // For lab/diag
  notes?: string   // For lab/pharm/diag
}

export default function Doctor_Referrals() {
  const [doc, setDoc] = useState<DoctorSession | null>(null)
  const [referrals, setReferrals] = useState<UnifiedReferral[]>([])
  const [loading, setLoading] = useState(false)
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [typeFilter, setTypeFilter] = useState<string>('all')
  const [departmentFilter, setDepartmentFilter] = useState<string>('all')
  const [departments, setDepartments] = useState<any[]>([])
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [q, setQ] = useState('')
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null)
  const [deleteId, setDeleteId] = useState<{id: string, type: ReferralType} | null>(null)
  const [editOpen, setEditOpen] = useState(false)
  const [editing, setEditing] = useState<UnifiedReferral | null>(null)
  const [settings, setSettings] = useState<any>(null)
  const referralFormRef = useRef<any>(null)
  
  // Stats
  const [stats, setStats] = useState({ total: 0, today: 0, lab: 0, pharmacy: 0, diagnostic: 0, ipd: 0, er: 0 })

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
      setPage(1) // Reset to first page when filters change
    }
  }, [doc?.id, statusFilter, typeFilter, departmentFilter, from, to, q])

  useEffect(() => {
    if (doc?.id) {
      loadReferrals()
      loadSettings()
      loadDepartments()
    }
  }, [doc?.id, statusFilter, typeFilter, departmentFilter, from, to, q, page, limit])

  async function loadSettings() {
    try {
      const s = await hospitalApi.getSettings() as any
      setSettings(s)
    } catch {}
  }

  async function loadDepartments() {
    try {
      const res = await hospitalApi.listDepartments({ limit: 1000 }) as any
      const deps = res?.departments || res || []
      setDepartments(Array.isArray(deps) ? deps : [])
    } catch {}
  }

  async function loadReferrals() {
    if (!doc?.id) return
    setLoading(true)
    try {
      const commonParams: any = { doctorId: doc.id, page: 1, limit: 1000 } // Fetch more for local filtering/stats if needed, but pagination is better
      if (from) commonParams.from = from
      if (to) commonParams.to = to
      if (q) commonParams.q = q

      // We need to fetch from multiple endpoints. 
      // For proper pagination, this is tricky if we merge on client.
      // But user wants "all referrals", so we'll fetch them and merge.
      
      const fetchPromises = []
      
      // 1. OPD Referrals (Lab, Pharmacy, Diagnostic)
      const opdTypes: ReferralType[] = ['lab', 'pharmacy', 'diagnostic']
      opdTypes.forEach(t => {
        if (typeFilter === 'all' || typeFilter === t) {
          const p = { ...commonParams, type: t }
          if (statusFilter !== 'all') {
            const opdStatusMap: Record<string, string> = {
              'new': 'pending',
              'accepted': 'completed',
              'rejected': 'cancelled'
            }
            p.status = opdStatusMap[statusFilter.toLowerCase()] || statusFilter.toLowerCase()
          }
          fetchPromises.push(hospitalApi.listReferrals(p).then((res: any) => ({ type: t, data: res })))
        }
      })

      // 2. IPD Referrals
      if (typeFilter === 'all' || typeFilter === 'ipd') {
        const ipdParams = { ...commonParams, referredByDoctorId: doc.id }
        if (statusFilter !== 'all') ipdParams.status = statusFilter
        if (departmentFilter !== 'all') ipdParams.departmentId = departmentFilter
        fetchPromises.push(hospitalApi.listIpdReferrals(ipdParams).then((res: any) => ({ type: 'ipd', data: res })))
      }

      // 3. ER Referrals
      if (typeFilter === 'all' || typeFilter === 'er') {
        const erParams = { ...commonParams, referredByDoctorId: doc.id }
        if (statusFilter !== 'all') erParams.status = statusFilter
        if (departmentFilter !== 'all') erParams.departmentId = departmentFilter
        fetchPromises.push(hospitalApi.listErReferrals(erParams).then((res: any) => ({ type: 'er', data: res })))
      }

      const results = await Promise.all(fetchPromises)
      
      let allItems: UnifiedReferral[] = []
      
      for (const res of results) {
        const { type, data } = res
        const rows = data?.referrals || data?.items || []
        
        const mapped = rows.map((r: any) => {
          // Robust patient data extraction
          let patientData = r.patientSnapshot || r.patientId
          if (type === 'lab' || type === 'pharmacy' || type === 'diagnostic') {
            patientData = r.encounterId?.patientId || patientData
          }
          
          const referredToData = r.referredTo || {}
          
          let ageStr = patientData?.age || ''
          let fatherName = patientData?.fatherName || patientData?.fatherHusbandName || ''
          let phone = patientData?.phone || patientData?.phoneNormalized || ''
          let address = patientData?.address || ''
          let cnic = patientData?.cnic || patientData?.cnicNormalized || ''
          let gender = patientData?.gender || '-'
          
          const mrn = patientData?.mrn || patientData?.mrNumber || r.mrn || r.mrNo || r.patientMrn
          
          // Basic mapping based on type
          let status = r.status || 'New'
          if (type === 'lab' || type === 'pharmacy' || type === 'diagnostic') {
            status = r.status === 'pending' ? 'New' : (r.status === 'completed' ? 'Accepted' : (r.status === 'cancelled' ? 'Rejected' : r.status))
          }

          return {
            id: String(r._id || r.id),
            type: type as ReferralType,
            patientId: String(r.patientId?._id || r.patientId || r.patientSnapshot?._id || r.encounterId?.patientId?._id || ''),
            patientName: patientData?.fullName || patientData?.name || patientData?.patientName || '-',
            mrNo: mrn || '-',
            gender, fatherName, age: ageStr, phone, address, cnic,
            status,
            date: r.referralDate || r.createdAt,
            time: r.referralTime,
            reason: r.reasonOfReferral || r.notes || (r.tests && r.tests.length > 0 ? `Tests: ${r.tests.join(', ')}` : ''),
            provisionalDiagnosis: r.provisionalDiagnosis,
            vitals: r.vitals,
            referredTo: {
              departmentId: referredToData.departmentId,
              doctorId: referredToData.doctorId,
              department: referredToData.departmentName || referredToData.department || (type === 'lab' ? 'Laboratory' : type === 'pharmacy' ? 'Pharmacy' : type === 'diagnostic' ? 'Diagnostic' : '-'),
              doctor: referredToData.doctorName || referredToData.doctor || '-',
            },
            condition: r.condition,
            remarks: r.remarks,
            signStamp: r.signStamp,
            createdAt: r.createdAt,
            referredBy: r.referredBy?.doctorName || r.referredBy || r.doctorId?.name || 'Self',
            tests: r.tests,
            notes: r.notes,
          }
        })
        allItems = [...allItems, ...mapped]
      }

      // Sort by date descending
      allItems.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      
      // Client-side filtering for department (for OPD types which aren't filtered by server)
      if (departmentFilter !== 'all') {
        allItems = allItems.filter(r => {
          if (r.type === 'ipd' || r.type === 'er') return true // Server already filtered these
          return false // OPD referrals (lab/pharm/diag) don't have a departmentId
        })
      }

      // Calculate Stats (on all items fetched for current doctor)
      const today = new Date().toISOString().slice(0, 10)
      const newStats = {
        total: allItems.length,
        today: allItems.filter(r => r.createdAt.startsWith(today)).length,
        lab: allItems.filter(r => r.type === 'lab').length,
        pharmacy: allItems.filter(r => r.type === 'pharmacy').length,
        diagnostic: allItems.filter(r => r.type === 'diagnostic').length,
        ipd: allItems.filter(r => r.type === 'ipd').length,
        er: allItems.filter(r => r.type === 'er').length,
      }
      setStats(newStats)

      setTotal(allItems.length)
      // Client-side pagination for merged results
      const paginated = allItems.slice((page - 1) * limit, page * limit)
      setReferrals(paginated)

    } catch (e: any) {
      setToast({ type: 'error', message: e?.message || 'Failed to load referrals' })
    } finally {
      setLoading(false)
    }
  }

  async function handleDelete(deleteInfo: {id: string, type: ReferralType}) {
    try {
      if (deleteInfo.type === 'ipd') {
        await hospitalApi.updateIpdReferralStatus(deleteInfo.id, 'reject')
      } else if (deleteInfo.type === 'er') {
        await hospitalApi.updateErReferralStatus(deleteInfo.id, 'reject')
      } else {
        await hospitalApi.updateReferralStatus(deleteInfo.id, 'cancelled')
      }
      setToast({ type: 'success', message: 'Referral rejected' })
      setDeleteId(null)
      loadReferrals()
    } catch (e: any) {
      setToast({ type: 'error', message: e?.message || 'Failed to delete' })
    }
  }

  async function handlePrint(r: UnifiedReferral) {
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

      // Format date properly
      let formattedDate = r.date || new Date().toISOString().slice(0, 10)
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
        time: r.time || new Date(r.createdAt).toTimeString().slice(0, 5),
        reason: r.reason || '-',
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

  function openEdit(r: UnifiedReferral) {
    if (r.type !== 'ipd' && r.type !== 'er') {
      setToast({ type: 'error', message: 'Editing only supported for IPD/ER referrals here.' })
      return
    }
    setEditing(r)
    setEditOpen(true)
  }

  const statusBadge = (status: string) => {
    const s = status.toLowerCase()
    if (s === 'new' || s === 'pending') return 'bg-blue-100 text-blue-800'
    if (s === 'accepted' || s === 'completed' || s === 'admitted') return 'bg-green-100 text-green-800'
    if (s === 'rejected' || s === 'cancelled') return 'bg-red-100 text-red-800'
    return 'bg-gray-100 text-gray-800'
  }

  const typeBadge = (type: ReferralType) => {
    const colors: Record<ReferralType, string> = {
      lab: 'bg-violet-100 text-violet-800',
      pharmacy: 'bg-emerald-100 text-emerald-800',
      diagnostic: 'bg-amber-100 text-amber-800',
      ipd: 'bg-indigo-100 text-indigo-800',
      er: 'bg-rose-100 text-rose-800',
    }
    return colors[type] || 'bg-gray-100 text-gray-800'
  }

  const typeIcon = (type: ReferralType) => {
    switch (type) {
      case 'lab': return <FlaskConical className="h-4 w-4" />
      case 'pharmacy': return <Pill className="h-4 w-4" />
      case 'diagnostic': return <Activity className="h-4 w-4" />
      case 'ipd': return <FileText className="h-4 w-4" />
      case 'er': return <AlertCircle className="h-4 w-4" />
    }
  }

  return (
    <div className="space-y-6">
      {/* Header & Filters */}
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <h1 className="text-2xl font-bold text-slate-800">My Referrals</h1>
          <button
            onClick={loadReferrals}
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
                <Activity className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Today's Referrals</p>
                <p className="text-xl font-bold text-slate-900">{stats.today}</p>
              </div>
            </div>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-violet-100 p-2 text-violet-600">
                <FlaskConical className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Lab / Diag</p>
                <p className="text-xl font-bold text-slate-900">{stats.lab + stats.diagnostic}</p>
              </div>
            </div>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-rose-100 p-2 text-rose-600">
                <AlertCircle className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">IPD / ER</p>
                <p className="text-xl font-bold text-slate-900">{stats.ipd + stats.er}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Filters Bar */}
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3 items-end">
            <div className="lg:col-span-1">
              <label className="mb-1 block text-xs font-semibold text-slate-500 uppercase">Search</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  value={q}
                  onChange={e => setQ(e.target.value)}
                  placeholder="Patient, MRN..."
                  className="w-full rounded-lg border border-slate-300 pl-9 pr-3 py-2 text-sm focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
                />
              </div>
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-500 uppercase">Type</label>
              <select
                value={typeFilter}
                onChange={e => setTypeFilter(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
              >
                <option value="all">All Types</option>
                <option value="lab">Lab</option>
                <option value="pharmacy">Pharmacy</option>
                <option value="diagnostic">Diagnostic</option>
                <option value="ipd">IPD</option>
                <option value="er">ER</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-500 uppercase">Status</label>
              <select
                value={statusFilter}
                onChange={e => setStatusFilter(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
              >
                <option value="all">All Status</option>
                <option value="New">New / Pending</option>
                <option value="Accepted">Accepted / Completed</option>
                <option value="Rejected">Rejected / Cancelled</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-500 uppercase">Department</label>
              <select
                value={departmentFilter}
                onChange={e => setDepartmentFilter(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
              >
                <option value="all">All Departments</option>
                {departments.map(d => (
                  <option key={d._id || d.id} value={d._id || d.id}>{d.name}</option>
                ))}
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
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4 bg-slate-50/50">
          <div className="font-bold text-slate-800">Referral List ({total})</div>
          <div className="text-sm text-slate-500">
            Showing {total === 0 ? 0 : (page - 1) * limit + 1}-{Math.min(page * limit, total)} of {total}
          </div>
        </div>

        {loading ? (
          <div className="px-6 py-20 text-center">
            <RefreshCw className="h-10 w-10 animate-spin mx-auto text-sky-500 mb-4" />
            <p className="text-slate-500 font-medium">Loading referrals...</p>
          </div>
        ) : referrals.length === 0 ? (
          <div className="px-6 py-20 text-center">
            <FileText className="h-12 w-12 mx-auto text-slate-300 mb-4" />
            <p className="text-slate-500 font-medium">No referrals found matching your filters</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase text-[10px] font-bold tracking-wider">
                  <th className="px-6 py-3 text-left">Type</th>
                  <th className="px-6 py-3 text-left">Patient Details</th>
                  <th className="px-6 py-3 text-left">Referral Info</th>
                  <th className="px-6 py-3 text-left">Referred To</th>
                  <th className="px-6 py-3 text-left">Status</th>
                  <th className="px-6 py-3 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {referrals.map(r => (
                  <tr key={`${r.type}-${r.id}`} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold ${typeBadge(r.type)}`}>
                        {typeIcon(r.type)}
                        {r.type.toUpperCase()}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-bold text-slate-900">{r.patientName}</div>
                      <div className="text-xs text-slate-500 font-medium">MRN: {r.mrNo}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-xs font-bold text-slate-700">
                        {r.date ? new Date(r.date).toLocaleDateString() : new Date(r.createdAt).toLocaleDateString()}
                      </div>
                      <div className="text-xs text-slate-500 max-w-[200px] truncate mt-0.5" title={r.reason}>
                        {r.reason || '-'}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-xs font-bold text-slate-700">{r.referredTo?.department}</div>
                      <div className="text-[10px] text-slate-500 font-medium">Dr. {r.referredTo?.doctor}</div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-block rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ${statusBadge(r.status)}`}>
                        {r.status}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => handlePrint(r)}
                          className="rounded-lg border border-slate-200 p-2 text-slate-600 hover:bg-white hover:border-sky-500 hover:text-sky-600 transition-all shadow-sm"
                          title="Print Referral"
                        >
                          <Printer className="h-4 w-4" />
                        </button>
                        {(r.type === 'ipd' || r.type === 'er') && (
                          <button
                            onClick={() => openEdit(r)}
                            className="rounded-lg border border-slate-200 p-2 text-slate-600 hover:bg-white hover:border-amber-500 hover:text-amber-600 transition-all shadow-sm"
                            title="Edit Referral"
                          >
                            <Edit3 className="h-4 w-4" />
                          </button>
                        )}
                        {r.status.toLowerCase() === 'new' && (
                          <button
                            onClick={() => setDeleteId({id: r.id, type: r.type})}
                            className="rounded-lg border border-slate-200 p-2 text-rose-500 hover:bg-rose-50 hover:border-rose-200 transition-all shadow-sm"
                            title="Reject Referral"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Controls */}
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
                Page {page} of {Math.ceil(total / limit)}
              </div>
              <button
                onClick={() => setPage(p => Math.min(Math.ceil(total / limit), p + 1))}
                disabled={page >= Math.ceil(total / limit)}
                className="rounded-lg px-4 py-2 text-xs font-bold text-slate-600 hover:bg-white hover:shadow-sm border border-transparent hover:border-slate-200 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Delete/Reject Confirmation */}
      {deleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="mb-4 text-center">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-rose-100 text-rose-600">
                <Trash2 className="h-7 w-7" />
              </div>
              <h3 className="text-xl font-bold text-slate-900">Reject Referral?</h3>
              <p className="text-sm text-slate-500 mt-2">Are you sure you want to mark this referral as rejected? This action cannot be undone.</p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteId(null)}
                className="flex-1 rounded-xl border border-slate-200 py-3 text-sm font-bold text-slate-700 hover:bg-slate-50 transition-all"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(deleteId)}
                className="flex-1 rounded-xl bg-rose-600 py-3 text-sm font-bold text-white shadow-lg shadow-rose-200 hover:bg-rose-700 transition-all active:scale-95"
              >
                Confirm Reject
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal with IPD Referral Form */}
      {editOpen && editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 sm:p-6">
          <div className="w-full max-w-5xl max-h-[95vh] rounded-2xl bg-white shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-bottom-4 duration-300">
            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4 bg-slate-50/50">
              <div className="flex items-center gap-3">
                <div className={`rounded-lg p-2 ${typeBadge(editing.type)}`}>
                  {typeIcon(editing.type)}
                </div>
                <h3 className="text-xl font-bold text-slate-800">Edit {editing.type.toUpperCase()} Referral</h3>
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
                  className="inline-flex items-center gap-2 rounded-lg border border-slate-300 px-4 py-2 text-sm font-bold text-slate-700 hover:bg-white hover:border-sky-500 hover:text-sky-600 transition-all shadow-sm"
                >
                  <Printer className="h-4 w-4" />
                  Print
                </button>
                <button
                  onClick={() => setEditOpen(false)}
                  className="rounded-lg bg-slate-800 px-4 py-2 text-sm font-bold text-white hover:bg-slate-900 transition-all active:scale-95 shadow-lg shadow-slate-200"
                >
                  Close
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-6 bg-slate-50/30">
              <Doctor_IpdReferralForm
                ref={referralFormRef}
                mrn={editing.mrNo}
                doctor={{ id: doc?.id, name: doc?.name }}
                initialData={{
                  referralDate: editing.date,
                  referralTime: editing.time,
                  reasonOfReferral: editing.reason,
                  provisionalDiagnosis: editing.provisionalDiagnosis,
                  vitals: editing.vitals ? {
                    bp: editing.vitals.bp,
                    pulse: String(editing.vitals.pulse || ''),
                    temperature: String(editing.vitals.temperature || ''),
                    rr: String(editing.vitals.rr || ''),
                  } : undefined,
                  referredTo: editing.referredTo,
                  condition: editing.condition as any,
                  remarks: editing.remarks,
                  signStamp: editing.signStamp,
                }}
                onSaved={() => {
                  setEditOpen(false)
                  loadReferrals()
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
