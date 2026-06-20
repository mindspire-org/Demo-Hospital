import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { icuApi, hospitalApi } from '../../utils/api'
import { DollarSign, Bed, FileText, ArrowUpRight } from 'lucide-react'

type ICUAdmission = {
  _id: string
  encounterId: string | { _id: string }
  patientId?: { _id: string; fullName?: string; mrNumber?: string; age?: number; gender?: string }
  bedId?: { _id: string; name?: string }
  admittedAt: string
  reason: string
  severity: 'mild' | 'moderate' | 'severe' | 'critical'
  status: 'active' | 'transferred' | 'discharged' | 'deceased'
  ventilatorRequired: boolean
  attendingDoctorId?: { _id: string; name?: string }
  primaryDiagnosis?: string
}

export default function Hospital_ICUBilling() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const urlAdmissionId = searchParams.get('admission') || ''

  const [admissions, setAdmissions] = useState<ICUAdmission[]>([])
  const [selectedAdmissionId, setSelectedAdmissionId] = useState(urlAdmissionId)
  const [selectedAdmission, setSelectedAdmission] = useState<ICUAdmission | null>(null)
  const [encounterBilling, setEncounterBilling] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [toast, setToast] = useState<{ type: 'success'|'error'; message: string } | null>(null)

  useEffect(() => { loadAdmissions() }, [])
  useEffect(() => { if (selectedAdmissionId) loadAdmissionDetail(selectedAdmissionId) }, [selectedAdmissionId])

  async function loadAdmissions() {
    try {
      const res = await icuApi.listICUAdmissions({ status: 'active', limit: 100 }) as any
      setAdmissions(res?.admissions || [])
    } catch {}
  }

  async function loadAdmissionDetail(id: string) {
    setLoading(true)
    try {
      const res = await icuApi.listICUAdmissions({ limit: 200 }) as any
      const a = res?.admissions?.find((x: any) => x._id === id)
      setSelectedAdmission(a || null)
      if (a?.encounterId) {
        const encId = typeof a.encounterId === 'string' ? a.encounterId : a.encounterId?._id
        await loadEncounterBilling(encId)
      } else {
        setEncounterBilling(null)
      }
    } catch {}
    setLoading(false)
  }

  async function loadEncounterBilling(encounterId: string) {
    try {
      const [itemsRes, paymentsRes] = await Promise.all([
        hospitalApi.listIpdBillingItems(encounterId).catch(() => ({ items: [] })),
        hospitalApi.listIpdPayments(encounterId).catch(() => ({ payments: [] })),
      ])
      const items = (itemsRes as any)?.items || []
      const payments = (paymentsRes as any)?.payments || []
      const totalCharges = items.reduce((s: number, c: any) => s + (Number(c.amount || 0)), 0)
      const totalPaid = payments.reduce((s: number, p: any) => s + (Number(p.amount || 0)), 0)
      setEncounterBilling({ items, payments, totalCharges, totalPaid, balance: totalCharges - totalPaid })
    } catch {
      setEncounterBilling(null)
    }
  }

  const patientName = selectedAdmission?.patientId?.fullName || 'Select an admission'
  const mrNumber = selectedAdmission?.patientId?.mrNumber || '-'
  const diagnosis = selectedAdmission?.primaryDiagnosis || selectedAdmission?.reason || '-'

  const getEncounterId = (a: ICUAdmission | null): string => {
    if (!a) return ''
    const e = a.encounterId as any
    return String(e?._id || e || '')
  }

  const encId = getEncounterId(selectedAdmission)

  const formatDuration = (admittedAt: string) => {
    const start = new Date(admittedAt)
    const now = new Date()
    const hours = Math.floor((now.getTime() - start.getTime()) / (1000 * 60 * 60))
    const days = Math.floor(hours / 24)
    if (days > 0) return `${days}d ${hours % 24}h`
    return `${hours}h`
  }

  return (
    <div className="space-y-5">
      {/* Hero */}
      <div className="relative overflow-hidden rounded-xl bg-linear-to-r from-rose-600 via-red-600 to-pink-600 p-6 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">ICU Billing</h1>
            <p className="mt-1 text-sm/6 opacity-90">View and manage billing for ICU admissions.</p>
          </div>
          <DollarSign className="h-16 w-16 opacity-30" />
        </div>
      </div>

      {toast && (
        <div className={`rounded-md p-3 text-sm ${toast.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-rose-50 text-rose-700 border border-rose-200'}`}>
          {toast.message}
          <button onClick={() => setToast(null)} className="ml-2 text-xs underline">Dismiss</button>
        </div>
      )}

      {/* Admission Selector */}
      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <label className="block text-sm font-medium text-slate-700">Select ICU Admission</label>
        <select
          value={selectedAdmissionId}
          onChange={e => setSelectedAdmissionId(e.target.value)}
          className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
        >
          <option value="">-- Select an admission --</option>
          {admissions.map(a => (
            <option key={a._id} value={a._id}>
              {a.patientId?.fullName || 'Unknown'} — {a.bedId?.name || 'No Bed'}
            </option>
          ))}
        </select>
      </div>

      {selectedAdmission && (
        <>
          {/* Patient Card */}
          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <div className="text-lg font-semibold text-slate-800">{patientName}</div>
                <div className="text-sm text-slate-500">MR#: {mrNumber} | Diagnosis: {diagnosis}</div>
                <div className="text-xs text-slate-400 mt-0.5">
                  Bed: {selectedAdmission.bedId?.name || '-'} | Duration: {formatDuration(selectedAdmission.admittedAt)} | Ventilator: {selectedAdmission.ventilatorRequired ? 'Yes' : 'No'}
                </div>
              </div>
              <div className="flex gap-2">
                {encId && (
                  <>
                    <button
                      onClick={() => navigate(`/hospital/patient/${encId}`)}
                      className="inline-flex items-center gap-1 rounded-md border border-slate-300 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50"
                    >
                      <Bed className="h-3.5 w-3.5" /> Profile
                    </button>
                    <button
                      onClick={() => navigate(`/hospital/ipd/admissions/${encId}/billing`)}
                      className="inline-flex items-center gap-1 rounded-md bg-rose-600 px-3 py-1.5 text-sm text-white hover:bg-rose-700"
                    >
                      <FileText className="h-3.5 w-3.5" /> Full Billing
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Summary Cards */}
          {encounterBilling && (
            <div className="grid grid-cols-3 gap-4">
              <div className="rounded-xl border border-slate-200 bg-white p-4 text-center">
                <div className="text-sm text-slate-500">Total Charges</div>
                <div className="mt-1 text-xl font-semibold text-slate-800">Rs {encounterBilling.totalCharges.toLocaleString()}</div>
              </div>
              <div className="rounded-xl border border-slate-200 bg-white p-4 text-center">
                <div className="text-sm text-slate-500">Total Paid</div>
                <div className="mt-1 text-xl font-semibold text-emerald-600">Rs {encounterBilling.totalPaid.toLocaleString()}</div>
              </div>
              <div className={`rounded-xl border p-4 text-center ${encounterBilling.balance > 0 ? 'border-rose-200 bg-rose-50' : 'border-green-200 bg-green-50'}`}>
                <div className="text-sm text-slate-500">Balance</div>
                <div className={`mt-1 text-xl font-semibold ${encounterBilling.balance > 0 ? 'text-rose-700' : 'text-green-700'}`}>Rs {encounterBilling.balance.toLocaleString()}</div>
              </div>
            </div>
          )}

          {/* ICU Charges */}
          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-base font-semibold text-slate-800">ICU Charges</h2>
              {encId && (
                <button
                  onClick={() => navigate(`/hospital/ipd/admissions/${encId}/billing`)}
                  className="inline-flex items-center gap-1 rounded-md bg-rose-600 px-3 py-1.5 text-sm text-white hover:bg-rose-700"
                >
                  <ArrowUpRight className="h-3.5 w-3.5" /> Manage in Full Billing
                </button>
              )}
            </div>

            {loading ? (
              <div className="py-6 text-center text-slate-500">Loading...</div>
            ) : encounterBilling?.items?.length ? (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50">
                      <th className="px-3 py-2 text-left font-medium text-slate-600">Description</th>
                      <th className="px-3 py-2 text-right font-medium text-slate-600">Qty</th>
                      <th className="px-3 py-2 text-right font-medium text-slate-600">Unit Price</th>
                      <th className="px-3 py-2 text-right font-medium text-slate-600">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {encounterBilling.items.map((c: any) => (
                      <tr key={c._id || c.id} className="border-b border-slate-100">
                        <td className="px-3 py-2">{c.description || c.name}</td>
                        <td className="px-3 py-2 text-right">{c.qty || 1}</td>
                        <td className="px-3 py-2 text-right">Rs {Number(c.unitPrice || 0).toLocaleString()}</td>
                        <td className="px-3 py-2 text-right font-medium">Rs {Number(c.amount || 0).toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="py-6 text-center text-slate-500">No charges found. Add charges via the full billing page.</div>
            )}
          </div>

          {/* Payments */}
          {encounterBilling?.payments?.length > 0 && (
            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <h2 className="text-base font-semibold text-slate-800 mb-3">Payments</h2>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50">
                      <th className="px-3 py-2 text-left font-medium text-slate-600">Date</th>
                      <th className="px-3 py-2 text-left font-medium text-slate-600">Method</th>
                      <th className="px-3 py-2 text-left font-medium text-slate-600">Ref#</th>
                      <th className="px-3 py-2 text-right font-medium text-slate-600">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {encounterBilling.payments.map((p: any) => (
                      <tr key={p._id || p.id} className="border-b border-slate-100">
                        <td className="px-3 py-2">{p.receivedAt ? new Date(p.receivedAt).toLocaleDateString() : '-'}</td>
                        <td className="px-3 py-2">{p.method || '-'}</td>
                        <td className="px-3 py-2">{p.refNo || '-'}</td>
                        <td className="px-3 py-2 text-right font-medium text-emerald-600">Rs {Number(p.amount || 0).toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
