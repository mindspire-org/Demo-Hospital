import { useEffect, useMemo, useState } from 'react'
import { hospitalApi } from '../../utils/api'
import { X, ArrowRight, Bed, User, Building2, Wallet } from 'lucide-react'

type Props = {
  open: boolean
  onClose: () => void
  sourceEncounter: {
    _id: string
    type: 'ER' | 'IPD'
    patientId?: { _id?: string; fullName?: string; mrn?: string } | string
    doctorId?: { _id?: string; name?: string } | string
    departmentId?: { _id?: string; name?: string } | string
    bedId?: string
    deposit?: number
    advancedAmount?: number
    corporateId?: string
    corporatePreAuthNo?: string
    corporateCoPayPercent?: number
    corporateCoverageCap?: number
  } | null
  onTransferred: () => void
}

export default function PatientTransferDialog({ open, onClose, sourceEncounter, onTransferred }: Props) {
  const [departments, setDepartments] = useState<Array<{ id: string; name: string }>>([])
  const [doctors, setDoctors] = useState<Array<{ id: string; name: string }>>([])
  const [beds, setBeds] = useState<Array<{ _id: string; label: string; floorName?: string; locationName?: string; category?: string }>>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const [targetType, setTargetType] = useState<'IPD' | 'ER'>('IPD')
  const [departmentId, setDepartmentId] = useState('')
  const [doctorId, setDoctorId] = useState('')
  const [bedId, setBedId] = useState('')
  const [deposit, setDeposit] = useState('')

  const isERToIPD = sourceEncounter?.type === 'ER' && targetType === 'IPD'

  // Reset form when source changes
  useEffect(() => {
    if (!sourceEncounter) return
    setTargetType(sourceEncounter.type === 'ER' ? 'IPD' : 'ER')
    setDepartmentId('')
    setDoctorId('')
    setBedId('')
    setDeposit('')
    setError('')
  }, [sourceEncounter])

  // Load departments, doctors, beds
  useEffect(() => {
    if (!open) return
    let cancelled = false
    async function load() {
      try {
        const dRes = await hospitalApi.listDepartments({ limit: 1000 }) as any
        const deps = (dRes.departments || []).map((d: any) => ({ id: String(d._id || d.id), name: d.name }))
        if (!cancelled) setDepartments(deps)
      } catch {}
      try {
        const docRes = await hospitalApi.listDoctors() as any
        const docs = (docRes.doctors || []).map((d: any) => ({ id: String(d._id || d.id), name: d.name }))
        if (!cancelled) setDoctors(docs)
      } catch {}
    }
    load()
    return () => { cancelled = true }
  }, [open])

  // Load available beds when target type changes
  useEffect(() => {
    if (!open) return
    let cancelled = false
    async function loadBeds() {
      try {
        const res = await hospitalApi.listBeds({ status: 'available' }) as any
        const allBeds = (res.beds || []).map((b: any) => ({
          _id: String(b._id),
          label: b.label,
          floorName: b.floorName,
          locationName: b.locationName,
          category: b.category,
        }))
        if (!cancelled) setBeds(allBeds)
      } catch {}
    }
    loadBeds()
    return () => { cancelled = true }
  }, [open, targetType])

  const filteredBeds = useMemo(() => {
    if (targetType === 'ER') {
      return beds.filter(b => {
        const cat = String(b.category || '').toLowerCase()
        const loc = String(b.locationName || '').toLowerCase()
        const floor = String(b.floorName || '').toLowerCase()
        const label = String(b.label || '').toLowerCase()
        return cat.includes('er') || cat.includes('emergency') || loc.includes('er') || loc.includes('emergency') || floor.includes('er') || floor.includes('emergency') || label.includes('er') || label.includes('emergency')
      })
    }
    // IPD: all available beds (could also filter by ward if needed)
    return beds
  }, [beds, targetType])

  const patientName = useMemo(() => {
    if (!sourceEncounter) return ''
    const p = sourceEncounter.patientId as any
    return p?.fullName || p?.name || 'Unknown'
  }, [sourceEncounter])

  const sourceLabel = useMemo(() => {
    if (!sourceEncounter) return ''
    const dept = sourceEncounter.departmentId as any
    const deptName = dept?.name || ''
    return `${sourceEncounter.type}${deptName ? ` — ${deptName}` : ''}`
  }, [sourceEncounter])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!sourceEncounter) return
    if (!departmentId) { setError('Please select a target department'); return }
    if (!bedId) { setError('Please select a bed'); return }

    setLoading(true)
    setError('')
    try {
      const corp = sourceEncounter.corporateId ? String(sourceEncounter.corporateId) : undefined
      const payload: any = {
        sourceEncounterId: String(sourceEncounter._id),
        targetType,
        departmentId,
        doctorId: doctorId || undefined,
        bedId: bedId || undefined,
        deposit: isERToIPD && deposit ? Number(deposit) : undefined,
        corporateId: corp,
        corporatePreAuthNo: sourceEncounter.corporatePreAuthNo || undefined,
        corporateCoPayPercent: sourceEncounter.corporateCoPayPercent || undefined,
        corporateCoverageCap: sourceEncounter.corporateCoverageCap || undefined,
      }
      await hospitalApi.transferPatient(payload)
      onTransferred()
      onClose()
    } catch (e: any) {
      const msg = e?.error || e?.message || 'Transfer failed'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  if (!open || !sourceEncounter) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-slate-200 bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
          <div>
            <h3 className="text-lg font-bold text-slate-800">Transfer Patient</h3>
            <p className="text-xs text-slate-500">Move patient between departments with auto-discharge</p>
          </div>
          <button onClick={onClose} className="rounded-lg p-1 hover:bg-slate-100"><X className="h-5 w-5 text-slate-500" /></button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 p-5">
          {/* Patient Info */}
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
            <div className="flex items-center gap-3">
              <div className="rounded-full bg-violet-100 p-2 text-violet-600"><User className="h-4 w-4" /></div>
              <div>
                <div className="text-sm font-semibold text-slate-800">{patientName}</div>
                <div className="text-xs text-slate-500">Current: {sourceLabel}</div>
              </div>
            </div>
          </div>

          {/* Transfer Direction */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">Transfer To</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => { if (sourceEncounter.type !== 'IPD') { setTargetType('IPD'); setDepartmentId(''); setBedId('') } }}
                className={`rounded-lg border px-3 py-2.5 text-sm font-medium transition ${targetType === 'IPD' ? 'border-sky-300 bg-sky-50 text-sky-700' : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'} ${sourceEncounter.type === 'IPD' ? 'opacity-50 cursor-not-allowed' : ''}`}
                disabled={sourceEncounter.type === 'IPD'}
              >
                <div className="flex items-center gap-2"><Bed className="h-4 w-4" /> IPD</div>
              </button>
              <button
                type="button"
                onClick={() => { if (sourceEncounter.type !== 'ER') { setTargetType('ER'); setDepartmentId(''); setBedId('') } }}
                className={`rounded-lg border px-3 py-2.5 text-sm font-medium transition ${targetType === 'ER' ? 'border-rose-300 bg-rose-50 text-rose-700' : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'} ${sourceEncounter.type === 'ER' ? 'opacity-50 cursor-not-allowed' : ''}`}
                disabled={sourceEncounter.type === 'ER'}
              >
                <div className="flex items-center gap-2"><Building2 className="h-4 w-4" /> Emergency</div>
              </button>
            </div>
          </div>

          {/* Department */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">Target Department</label>
            <select
              value={departmentId}
              onChange={e => setDepartmentId(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-200"
              required
            >
              <option value="">Select department...</option>
              {departments.map(d => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>
          </div>

          {/* Doctor */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">Doctor (Optional)</label>
            <select
              value={doctorId}
              onChange={e => setDoctorId(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-200"
            >
              <option value="">Select doctor...</option>
              {doctors.map(d => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>
          </div>

          {/* Bed */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">Select Bed</label>
            <select
              value={bedId}
              onChange={e => setBedId(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-200"
              required
            >
              <option value="">{filteredBeds.length === 0 ? 'Loading beds...' : 'Select bed...'}</option>
              {filteredBeds.map(b => (
                <option key={b._id} value={b._id}>
                  {b.label}{b.floorName ? ` — ${b.floorName}` : ''}{b.locationName ? ` / ${b.locationName}` : ''}{b.category ? ` (${b.category})` : ''}
                </option>
              ))}
            </select>
            {targetType === 'ER' && (
              <p className="mt-1 text-xs text-amber-600">Only ER/emergency beds are shown.</p>
            )}
          </div>

          {/* Deposit (ER → IPD only) */}
          {isERToIPD && (
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">Deposit / Advance</label>
              <div className="relative">
                <Wallet className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  type="number"
                  value={deposit}
                  onChange={e => setDeposit(e.target.value)}
                  placeholder="e.g., 5000"
                  className="w-full rounded-lg border border-slate-300 pl-10 pr-3 py-2.5 text-sm outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-200"
                />
              </div>
              <p className="mt-1 text-xs text-slate-500">Any existing advance from ER will be auto-transferred.</p>
            </div>
          )}

          {error && (
            <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</div>
          )}

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 rounded-lg bg-violet-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-violet-700 disabled:opacity-60"
            >
              {loading ? 'Transferring...' : (
                <span className="flex items-center justify-center gap-2">
                  Transfer <ArrowRight className="h-4 w-4" />
                </span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
