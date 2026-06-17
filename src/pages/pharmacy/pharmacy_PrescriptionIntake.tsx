import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { hospitalApi, labApi } from '../../utils/api'
import Toast from '../../components/ui/Toast'

export default function Pharmacy_PrescriptionIntake(){
  const { id } = useParams()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string>('')
  const [header, setHeader] = useState<{ patient?: string; mrn?: string; doctor?: string; date?: string } | null>(null)
  const [items, setItems] = useState<Array<{ name: string; frequency?: string; duration?: string; notes?: string; qty: number }>>([])
  const [toast, setToast] = useState<{type: 'success'|'error', message: string} | null>(null)

  useEffect(() => { (async () => {
    if (!id) { setError('Missing id'); setLoading(false); return }
    try {
      let prescriptionData: any = null
      let itemsData: any[] = []
      let doctorName = '-'
      let patientData: any = null
      let createdAt = Date.now()

      try {
        const res = await hospitalApi.getPrescription(id) as any
        if (res?.prescription) {
          prescriptionData = res.prescription
          itemsData = prescriptionData.items || []
          doctorName = prescriptionData.encounterId?.doctorId?.name || '-'
          patientData = prescriptionData.encounterId?.patientId
          createdAt = prescriptionData.createdAt
        }
      } catch (e) {
        // If prescription not found, try fetching as a referral
        const res = await hospitalApi.getReferral(id) as any
        if (res?.referral) {
          const ref = res.referral
          doctorName = ref.doctorId?.name || ref.encounterId?.doctorId?.name || '-'
          patientData = ref.patientId || ref.encounterId?.patientId
          createdAt = ref.createdAt
          
          // Map referral "tests" or "notes" to medicine items if it's a pharmacy referral
          if (ref.type === 'pharmacy') {
            itemsData = (ref.tests || []).map((t: string) => ({
              name: t,
              notes: ref.notes
            }))
          }
        }
      }

      if (!patientData && !itemsData.length) {
        throw new Error('Record not found or has no medicines')
      }

      const dt = new Date(createdAt || Date.now())
      let patName = patientData?.fullName || '-'
      let mrn = patientData?.mrn || ''
      
      try {
        if (mrn) {
          const resp: any = await labApi.getPatientByMrn(mrn)
          patName = resp?.patient?.fullName || patName
        }
      } catch {}

      setHeader({ patient: patName, mrn, doctor: doctorName, date: dt.toLocaleString() })
      
      const mapped = itemsData.map((m: any) => ({
        name: String(m.name||'').trim(),
        frequency: m.frequency || undefined,
        duration: m.duration || undefined,
        notes: m.notes || undefined,
        qty: (()=>{ 
          const doseStr = String(m.dose || '').replace(/[^\d]/g,'')
          const n = parseInt(doseStr)
          return isNaN(n) || n<=0 ? 1 : n 
        })(),
      }))
      setItems(mapped)
      setError('')
    } catch (e: any) {
      setError(e?.message || 'Failed to load record')
    } finally {
      setLoading(false)
    }
  })() }, [id])

  const canProcess = useMemo(() => items.length > 0 && items.every(it => it.name && it.qty>0), [items])

  const process = () => {
    try {
      const lines = items.map(it => ({ name: it.name, qty: Math.max(1, it.qty|0) }))
      localStorage.setItem('pharmacy.pos.pendingAddLines', JSON.stringify(lines))
      navigate('/pharmacy/pos')
    } catch (e) {
      setToast({ type: 'error', message: 'Failed to forward to POS' })
    }
  }

  return (
    <div className="space-y-4">
      <div className="text-xl font-semibold text-slate-800">Process Prescription</div>
      {loading && <div className="text-sm text-slate-600">Loading...</div>}
      {error && !loading && <div className="rounded-md border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">{error}</div>}

      {header && (
        <div className="rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-700">
          <div className="flex flex-wrap items-center gap-4">
            <div><span className="font-semibold">Patient:</span> {header.patient}</div>
            <div><span className="font-semibold">MR:</span> {header.mrn}</div>
            <div><span className="font-semibold">Doctor:</span> {header.doctor}</div>
            <div className="ml-auto"><span className="font-semibold">Date:</span> {header.date}</div>
          </div>
        </div>
      )}

      <div className="rounded-xl border border-slate-200 bg-white">
        <div className="border-b border-slate-200 px-4 py-3 font-medium text-slate-800">Medicines</div>
        <div className="p-4">
          <div className="overflow-x-auto">
            <table className="w-full table-fixed border-collapse text-sm">
              <thead>
                <tr className="bg-slate-50 text-slate-600">
                  <th className="border border-slate-200 px-2 py-1 text-left">Medicine</th>
                  <th className="w-28 border border-slate-200 px-2 py-1">Frequency</th>
                  <th className="w-24 border border-slate-200 px-2 py-1">Duration</th>
                  <th className="w-24 border border-slate-200 px-2 py-1">Qty</th>
                </tr>
              </thead>
              <tbody>
                {items.map((m, i) => (
                  <tr key={i}>
                    <td className="border border-slate-200 px-2 py-1 align-top">
                      <div>{m.name}</div>
                      {m.notes && <div className="text-[10px] text-slate-500 italic">Note: {m.notes}</div>}
                    </td>
                    <td className="border border-slate-200 px-2 py-1 text-center align-top">{m.frequency || '-'}</td>
                    <td className="border border-slate-200 px-2 py-1 text-center align-top">{m.duration || '-'}</td>
                    <td className="border border-slate-200 px-2 py-1 text-center align-top">
                      <input type="number" min={1} value={m.qty}
                        onChange={e=>setItems(arr => arr.map((x, idx) => idx===i ? { ...x, qty: Math.max(1, parseInt(e.target.value)||1) } : x))}
                        className="w-20 rounded-md border border-slate-300 px-2 py-1 text-sm" />
                    </td>
                  </tr>
                ))}
                {items.length===0 && <tr><td colSpan={4} className="px-3 py-6 text-center text-slate-500">No medicines</td></tr>}
              </tbody>
            </table>
          </div>
          <div className="mt-4 flex items-center justify-end">
            <button disabled={!canProcess} onClick={process} className="btn disabled:opacity-50">Process Prescription</button>
          </div>
        </div>
      </div>
      {toast && <Toast toast={toast} onClose={()=>setToast(null)} />}
    </div>
  )
}
