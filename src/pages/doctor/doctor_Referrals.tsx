import { useEffect, useRef, useState } from 'react'
import { hospitalApi } from '../../utils/api'
import Toast from '../../components/ui/Toast'
import Doctor_IpdReferralForm from '../../components/doctor/Doctor_IpdReferralForm'
import { previewIpdReferralPdf } from '../../utils/ipdReferralPdf'
import { Printer, Trash2, Edit3, RefreshCw } from 'lucide-react'

type DoctorSession = { id: string; name: string; username: string }

type IpdReferral = {
  id: string
  patientId: string
  patientName?: string
  mrNo?: string
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
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [editOpen, setEditOpen] = useState(false)
  const [editing, setEditing] = useState<IpdReferral | null>(null)
  const [settings, setSettings] = useState<any>(null)
  const referralFormRef = useRef<any>(null)

  useEffect(() => {
    try {
      const raw = localStorage.getItem('doctor.session')
      const sess = raw ? JSON.parse(raw) : null
      setDoc(sess)
    } catch {}
  }, [])

  useEffect(() => {
    if (doc?.id) {
      loadReferrals()
      loadSettings()
    }
  }, [doc?.id, statusFilter, from, to])

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
      const params: any = { referredByDoctorId: doc.id, limit: 100 }
      if (statusFilter !== 'all') params.status = statusFilter
      if (from) params.from = from
      if (to) params.to = to
      const res: any = await hospitalApi.listIpdReferrals(params)
      const rows: any[] = res?.referrals || []
      const items: IpdReferral[] = rows.map((r: any) => {
        const patientData = r.patientId?._id ? r.patientId : r.patientSnapshot
        const referredToData = r.referredTo || {}
        return {
          id: String(r._id || r.id),
          patientId: String(r.patientId?._id || r.patientId || r.patientSnapshot?._id),
          patientName: patientData?.fullName || patientData?.name || '-',
          mrNo: patientData?.mrn || patientData?.mrNumber || '-',
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
      })
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
        gender: '-',
        fatherName: '',
        age: '',
        phone: '',
        address: '',
        cnic: '',
      }

      const referralObj = {
        date: r.referralDate || new Date().toISOString().slice(0, 10),
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
    const colors: Record<string, string> = {
      New: 'bg-blue-100 text-blue-800',
      Accepted: 'bg-green-100 text-green-800',
      Rejected: 'bg-red-100 text-red-800',
      Admitted: 'bg-purple-100 text-purple-800',
    }
    return colors[status] || 'bg-gray-100 text-gray-800'
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h1 className="text-xl font-semibold text-slate-800">My IPD Referrals</h1>
        <div className="flex items-center gap-2 flex-wrap">
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value as any)}
            className="rounded-md border border-slate-300 px-3 py-2 text-sm"
          >
            <option value="all">All Status</option>
            <option value="New">New</option>
            <option value="Accepted">Accepted</option>
            <option value="Rejected">Rejected</option>
            <option value="Admitted">Admitted</option>
          </select>
          <input
            type="date"
            value={from}
            onChange={e => setFrom(e.target.value)}
            className="rounded-md border border-slate-300 px-3 py-2 text-sm"
            placeholder="From"
          />
          <span className="text-slate-500">to</span>
          <input
            type="date"
            value={to}
            onChange={e => setTo(e.target.value)}
            className="rounded-md border border-slate-300 px-3 py-2 text-sm"
            placeholder="To"
          />
          <button
            onClick={loadReferrals}
            className="rounded-md bg-sky-600 px-3 py-2 text-sm font-medium text-white hover:bg-sky-700"
          >
            <RefreshCw className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white">
        <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
          <div className="font-medium text-slate-800">IPD Referrals ({referrals.length})</div>
        </div>

        {loading ? (
          <div className="px-4 py-8 text-center text-slate-500">Loading...</div>
        ) : referrals.length === 0 ? (
          <div className="px-4 py-8 text-center text-slate-500">No referrals found</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3 text-left font-medium text-slate-700">Patient</th>
                  <th className="px-4 py-3 text-left font-medium text-slate-700">MRN</th>
                  <th className="px-4 py-3 text-left font-medium text-slate-700">Date</th>
                  <th className="px-4 py-3 text-left font-medium text-slate-700">Reason</th>
                  <th className="px-4 py-3 text-left font-medium text-slate-700">Referred To</th>
                  <th className="px-4 py-3 text-left font-medium text-slate-700">Status</th>
                  <th className="px-4 py-3 text-center font-medium text-slate-700">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {referrals.map(r => (
                  <tr key={r.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3">
                      <div className="font-medium text-slate-800">{r.patientName}</div>
                    </td>
                    <td className="px-4 py-3 text-slate-600">{r.mrNo}</td>
                    <td className="px-4 py-3 text-slate-600">
                      {r.referralDate ? new Date(r.referralDate).toLocaleDateString() : new Date(r.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3 text-slate-600 max-w-xs truncate" title={r.reasonOfReferral}>
                      {r.reasonOfReferral || '-'}
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {r.referredTo?.department || '-'} / {r.referredTo?.doctor || '-'}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${statusBadge(r.status)}`}>
                        {r.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => handlePrint(r)}
                          className="rounded-md border border-slate-300 p-1.5 text-slate-600 hover:bg-slate-50"
                          title="Print"
                        >
                          <Printer className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => openEdit(r)}
                          className="rounded-md border border-slate-300 p-1.5 text-slate-600 hover:bg-slate-50"
                          title="Edit"
                        >
                          <Edit3 className="h-4 w-4" />
                        </button>
                        {r.status === 'New' && (
                          <button
                            onClick={() => setDeleteId(r.id)}
                            className="rounded-md border border-slate-300 p-1.5 text-rose-600 hover:bg-rose-50"
                            title="Reject"
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
      </div>

      {/* Delete/Reject Confirmation */}
      {deleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-sm rounded-xl bg-white p-4 shadow-lg">
            <div className="mb-3 text-center">
              <div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-rose-100">
                <Trash2 className="h-5 w-5 text-rose-600" />
              </div>
              <h3 className="text-lg font-semibold text-slate-800">Reject Referral?</h3>
              <p className="text-sm text-slate-600">This will mark the referral as rejected.</p>
            </div>
            <div className="flex justify-center gap-2">
              <button
                onClick={() => setDeleteId(null)}
                className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(deleteId)}
                className="rounded-md bg-rose-600 px-4 py-2 text-sm font-medium text-white hover:bg-rose-700"
              >
                Reject
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal with IPD Referral Form */}
      {editOpen && editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-4xl max-h-[90vh] rounded-xl bg-white shadow-lg flex flex-col">
            <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
              <h3 className="text-lg font-semibold text-slate-800">Edit IPD Referral</h3>
              <div className="flex items-center gap-2">
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
                  className="rounded-md border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  Print
                </button>
                <button
                  onClick={() => setEditOpen(false)}
                  className="rounded-md bg-slate-800 px-3 py-1.5 text-sm font-medium text-white hover:bg-slate-900"
                >
                  Close
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-4">
              <Doctor_IpdReferralForm
                ref={referralFormRef}
                mrn={editing.mrNo}
                doctor={{ id: doc?.id, name: doc?.name }}
                initialData={{
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
