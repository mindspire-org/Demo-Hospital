import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { hospitalApi } from '../../utils/api'
import Hospital_IpdPaymentSlip from '../../components/hospital/Hospital_IpdPaymentSlip'

function ServiceSelect({ svcCatalog, onSelect, initialValue = '' }: { svcCatalog: any[], onSelect: (svc: any) => void, initialValue?: string }) {
  const [q, setQ] = useState(initialValue)
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  const filtered = useMemo(() => {
    const s = q.toLowerCase().trim()
    if (!s) return svcCatalog
    return svcCatalog.filter(svc => (svc.name || svc.description || '').toLowerCase().includes(s))
  }, [svcCatalog, q])

  useEffect(() => {
    const clickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', clickOutside)
    return () => document.removeEventListener('mousedown', clickOutside)
  }, [])

  return (
    <div className="relative w-full" ref={ref}>
      <input
        name="description"
        value={q}
        autoComplete="off"
        onChange={e => { setQ(e.target.value); setOpen(true) }}
        onFocus={() => setOpen(true)}
        placeholder="Search service..."
        className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
      />
      {open && filtered.length > 0 && (
        <div className="absolute z-[100] mt-1 max-h-48 w-full min-w-[200px] overflow-y-auto rounded-md border border-slate-200 bg-white py-1 shadow-xl">
          {filtered.map(svc => (
            <button
              key={svc.id || svc._id}
              type="button"
              className="w-full px-3 py-2 text-left hover:bg-slate-50 focus:bg-slate-50 focus:outline-none"
              onClick={() => {
                onSelect(svc)
                setQ(svc.name || svc.description)
                setOpen(false)
              }}
            >
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-slate-900">{svc.name || svc.description}</span>
                <span className="text-xs text-slate-500">Rs{svc.price || svc.amount}</span>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

export default function Hospital_IPDBilling() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  
  const urlEncounterId = String(id || searchParams.get('encounterId') || '')
  const [availableAdmissions, setAvailableAdmissions] = useState<any[]>([])
  const [loadingAdmissions, setLoadingAdmissions] = useState(false)

  const encounterId = urlEncounterId

  const [openCharge, setOpenCharge] = useState(false)
  const [editCharge, setEditCharge] = useState<null | { id: string; description: string; qty: number; unitPrice: number; type: string }>(null)
  const [openAdvance, setOpenAdvance] = useState(false)

  const [loadingEnc, setLoadingEnc] = useState(false)
  const [enc, setEnc] = useState<any>(null)
  const [mrn, setMrn] = useState<string>('')
  const [charges, setCharges] = useState<Array<{ id: string; type: string; description: string; qty: number; unitPrice: number; amount: number; paidAmount?: number; date?: string }>>([])
  const [loadingCharges, setLoadingCharges] = useState(false)
  const [payments, setPayments] = useState<any[]>([])

  const [svcCatalog, setSvcCatalog] = useState<Array<{ id: string; name: string; price: number }>>([])
  const [billingTotals, setBillingTotals] = useState<any>(null)

  const [toast, setToast] = useState<{ type: 'success'|'error'|'info'; message: string } | null>(null)
  const [confirmDel, setConfirmDel] = useState<{ open: boolean; chargeId: string } | null>(null)
  const [slipOpen, setSlipOpen] = useState(false)
  const [slipData, setSlipData] = useState<any|null>(null)

  useEffect(() => {
    if (!urlEncounterId) {
      setLoadingAdmissions(true)
      hospitalApi.listIPDAdmissions({ status: 'admitted', limit: 50 })
        .then((res: any) => {
          setAvailableAdmissions(res?.admissions || [])
        })
        .catch(() => setAvailableAdmissions([]))
        .finally(() => setLoadingAdmissions(false))
    }
  }, [urlEncounterId])

  useEffect(() => {
    if (!toast) return
    const t = window.setTimeout(() => setToast(null), 3000)
    return () => window.clearTimeout(t)
  }, [toast])

  // Load IPD services catalog
  useEffect(() => {
    hospitalApi.listIpdServices({ active: true, limit: 500 })
      .then((res: any) => {
        const items = (res?.items || res?.services || []);
        setSvcCatalog(items.map((s: any) => ({ id: String(s._id || s.id), name: String(s.name || ''), price: Number(s.price || 0) })))
      })
      .catch(() => setSvcCatalog([]))
  }, [])

  useEffect(() => {
    let cancelled = false
    async function load(){
      if (!encounterId) return
      setLoadingEnc(true)
      try{
        const res: any = await hospitalApi.getIPDAdmissionById(encounterId)
        const e: any = res?.encounter
        const pmrn = String(e?.patientId?.mrn || '')
        if (!cancelled){
          setEnc(e)
          setMrn(pmrn)
        }
      }catch{
        if (!cancelled){ setEnc(null); setMrn('') }
      }finally{
        if (!cancelled) setLoadingEnc(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [encounterId])

  async function reloadCharges(){
    if (!encounterId) { setCharges([]); return }
    setLoadingCharges(true)
    try{
      const res: any = await hospitalApi.listIpdBillingItems(encounterId, { limit: 200 })
      const rows: any[] = res?.items || []
      setCharges(rows.map((c: any) => ({
        id: String(c._id || c.id),
        type: String(c.type || 'service'),
        description: String(c.description || ''),
        qty: Number(c.qty || 0),
        unitPrice: Number(c.unitPrice || 0),
        amount: Number(c.amount || 0),
        paidAmount: Number(c.paidAmount || 0),
        date: c.date ? String(c.date) : (c.createdAt ? String(c.createdAt) : ''),
      })))
    }catch{
      setCharges([])
    }finally{
      setLoadingCharges(false)
    }
  }

  const total = billingTotals?.grandTotal ?? (charges || []).reduce((s, c) => s + Number(c.amount || 0), 0)
  const paid = billingTotals?.totalPaidToCharges ?? 0
  const advanceTotal = billingTotals?.unallocatedAdvance ?? 0
  const netDue = billingTotals?.netOutstanding ?? Math.max(0, total - paid)

  async function reloadBillingSummary(){
    if (!encounterId) { setPayments([]); setBillingTotals(null); return }
    try{
      const payRes: any = await hospitalApi.listIpdPayments(encounterId, { limit: 500 })
      setPayments(payRes?.payments || [])
      setBillingTotals(payRes?.totals || null)
    }catch{
      setPayments([])
      setBillingTotals(null)
    }
  }

  useEffect(() => { reloadCharges(); reloadBillingSummary() }, [encounterId])

  const payStatus = useMemo(() => {
    const t = total
    const p = paid
    const pen = netDue
    if (t <= 0) return 'Unpaid'
    if (pen <= 0) return 'Paid'
    if (p > 0) return 'Partial'
    return 'Unpaid'
  }, [total, paid, netDue])

  const chargesWithAlloc = useMemo(() => {
    return (charges || []).map(c => {
      const amt = Math.max(0, Number(c.amount || 0))
      const paidHere = Math.max(0, Number(c.paidAmount || 0))
      const remaining = Math.max(0, amt - paidHere)
      const rowStatus = amt <= 0 ? 'Unpaid' : remaining <= 0 ? 'Paid' : paidHere > 0 ? 'Partial' : 'Unpaid'
      return { ...c, rowPaid: paidHere, rowRemaining: remaining, rowStatus }
    })
  }, [charges])

  async function saveAdvance(d: { amount: number; method: string; refNo?: string; notes?: string }) {
    if (!encounterId) return
    const amt = Number(d.amount || 0)
    if (amt <= 0) { setToast({ type: 'error', message: 'Advance amount must be greater than 0' }); return }
    try {
      const res: any = await hospitalApi.createIpdPayment(encounterId, {
        amount: amt,
        method: 'Advance',
        refNo: d.refNo || '',
        notes: d.notes || '',
        receivedBy: 'hospital',
      } as any)
      const pay = res?.payment
      setOpenAdvance(false)
      await reloadBillingSummary()
      // Open print slip for advance
      const apiTotals = res?.totals
      const freshTotals = apiTotals || billingTotals
      const patient = enc?.patientId || {}
      setSlipData({
        encounterId,
        patientName: patient?.fullName || enc?.patientName || '-',
        mrn: patient?.mrn || enc?.mrn || '',
        phone: patient?.phoneNormalized || patient?.phone || '',
        cnic: patient?.cnicNormalized || patient?.cnic || '',
        address: patient?.address || '',
        age: patient?.age || '',
        gender: patient?.gender || '',
        guardian: patient?.fatherName || patient?.guardianName || patient?.guardian || '',
        department: 'IPD',
        admissionNo: enc?.admissionNo || '',
        bedLabel: enc?.bedLabel || '',
        isAdvance: true,
        payment: { amount: amt, method: 'Advance', refNo: d.refNo, receivedAt: pay?.receivedAt || new Date().toISOString() },
        totals: {
          total: typeof freshTotals?.grandTotal === 'number' ? freshTotals.grandTotal : (total || 0),
          paid: typeof freshTotals?.totalPaidToCharges === 'number' ? freshTotals.totalPaidToCharges : (paid || 0),
          pending: typeof freshTotals?.netOutstanding === 'number' ? freshTotals.netOutstanding : (netDue || 0),
          unallocatedAdvance: typeof freshTotals?.unallocatedAdvance === 'number' ? freshTotals.unallocatedAdvance : (advanceTotal + amt || 0)
        },
      })
      setSlipOpen(true)
      setToast({ type: 'success', message: 'Advance recorded' })
    } catch (e: any) { setToast({ type: 'error', message: e?.message || 'Failed to record advance' }) }
  }

  const discharge = () => {
    if (!encounterId) { setToast({ type: 'error', message: 'Encounter not loaded yet' }); return }
    navigate(`/hospital/ipd/discharge/${encounterId}`)
  }

  if (!encounterId) {
    return (
      <div className="space-y-4 p-4 md:p-6">
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <div className="text-lg font-semibold text-slate-900">IPD Billing</div>
          <div className="mt-1 text-sm text-slate-600">Select an admitted IPD patient to manage billing.</div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4">
          {loadingAdmissions ? (
            <div className="py-8 text-center text-slate-500">Loading admitted patients...</div>
          ) : availableAdmissions.length === 0 ? (
            <div className="py-8 text-center text-slate-500">
              <div className="text-lg mb-2">No admitted IPD patients found</div>
              <div className="text-sm">Go to <button onClick={() => navigate('/hospital/ipd')} className="text-indigo-600 hover:underline">IPD Queue</button> to admit a patient.</div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead className="bg-slate-100/50 text-slate-700 border-b-2 border-slate-300">
                  <tr>
                    <th className="px-3 py-3 text-[13px] font-extrabold uppercase tracking-wider">Patient Name</th>
                    <th className="px-3 py-3 text-[13px] font-extrabold uppercase tracking-wider">MRN</th>
                    <th className="px-3 py-3 text-[13px] font-extrabold uppercase tracking-wider">Admission No</th>
                    <th className="px-3 py-3 text-[13px] font-extrabold uppercase tracking-wider">Bed</th>
                    <th className="px-3 py-3 text-[13px] font-extrabold uppercase tracking-wider">Doctor</th>
                    <th className="px-3 py-3 text-[13px] font-extrabold uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {availableAdmissions.map((a: any) => (
                    <tr key={String(a._id || a.id)} className="hover:bg-slate-50">
                      <td className="px-3 py-2 font-medium text-slate-900">
                        {a.patientId?.fullName || 'Unknown'}
                      </td>
                      <td className="px-3 py-2 text-slate-600">
                        {a.patientId?.mrn || '-'}
                      </td>
                      <td className="px-3 py-2 text-slate-600">
                        {a.admissionNo || '-'}
                      </td>
                      <td className="px-3 py-2 text-slate-600">
                        {a.bedLabel || a.bedId || '-'}
                      </td>
                      <td className="px-3 py-2 text-slate-600">
                        {a.doctorId?.name || '-'}
                      </td>
                      <td className="px-3 py-2">
                        <button
                          onClick={() => {
                            const isReception = window.location.pathname.startsWith('/reception')
                            const basePath = isReception ? '/reception/ipd-billing' : '/hospital/ipd-billing'
                            navigate(`${basePath}?encounterId=${String(a._id || a.id)}`)
                          }}
                          className="rounded-md bg-violet-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-violet-700"
                        >
                          Open
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4 p-4 md:p-6">
      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-lg font-semibold text-slate-900">IPD Billing</div>
            <div className="mt-1 text-sm text-slate-600">Manage in-patient services, charges, and payments.</div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button onClick={discharge} className="rounded-md bg-rose-600 px-3 py-2 text-sm font-medium text-white hover:bg-rose-700">Discharge</button>
            <button onClick={()=>{
              const isReception = window.location.pathname.startsWith('/reception')
              navigate(isReception ? '/reception/ipd-billing' : '/hospital/ipd-billing')
            }} className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">Back to IPD Billing Add</button>
          </div>
        </div>
      </div>

      <div className="space-y-3">
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 pb-4">
            <div>
              <div className="text-sm font-semibold text-slate-800">IPD Billing</div>
              <div className="text-xs text-slate-500">
                Admission: {enc?.admissionNo || encounterId.slice(-6)} {mrn ? `· MRN: ${mrn}` : ''} · Status: <span className={payStatus==='Paid' ? 'font-semibold text-emerald-700' : payStatus==='Partial' ? 'font-semibold text-amber-700' : 'font-semibold text-rose-700'}>{payStatus}</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button disabled={!encounterId || loadingEnc} onClick={()=>setOpenCharge(true)} className="btn disabled:opacity-50">Add Service</button>
              <button disabled={!encounterId || loadingEnc} onClick={()=>setOpenAdvance(true)} className="btn-outline-navy disabled:opacity-50">Add Advance</button>
              <button disabled={!encounterId || loadingCharges} onClick={async()=>{ await reloadCharges(); await reloadBillingSummary() }} className="btn-outline-navy disabled:opacity-50">Refresh</button>
            </div>
          </div>

          {encounterId && (
            <div className="mt-4 grid grid-cols-4 gap-4">
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 shadow-sm">
                <div className="text-[10px] uppercase tracking-wider text-slate-500 font-bold">Total Bill</div>
                <div className="text-xl font-bold text-slate-900">Rs{total.toFixed(0)}</div>
              </div>
              <div className="rounded-lg border border-indigo-200 bg-indigo-50 p-3 shadow-sm">
                <div className="text-[10px] uppercase tracking-wider text-indigo-700 font-bold">Advance Available</div>
                <div className="text-xl font-bold text-indigo-700">Rs{advanceTotal.toFixed(0)}</div>
              </div>
              <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 shadow-sm">
                <div className="text-[10px] uppercase tracking-wider text-emerald-700 font-bold">Total Paid</div>
                <div className="text-xl font-bold text-emerald-700">Rs{paid.toFixed(0)}</div>
                <div className="text-[10px] text-emerald-600 font-medium">Cleared Amount</div>
              </div>
              <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 shadow-sm">
                <div className="text-[10px] uppercase tracking-wider text-rose-700 font-bold">Remaining/Net Due</div>
                <div className="text-xl font-bold text-rose-700">Rs{netDue.toFixed(0)}</div>
              </div>
            </div>
          )}

          {payments.some(p => ['advance', 'advance settlement'].includes(String(p.method || '').toLowerCase())) && (
            <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
              <div className="flex items-center justify-between">
                <div className="text-sm font-semibold text-slate-700">Advances Detail</div>
                <div className="text-xs text-indigo-600 font-medium italic">Current Balance: Rs{advanceTotal.toFixed(0)}</div>
              </div>
              <div className="mt-2 overflow-x-auto text-xs">
                <table className="min-w-full">
                  <thead className="text-slate-500 font-medium">
                    <tr>
                      <th className="px-2 py-1 text-left">Date</th>
                      <th className="px-2 py-1 text-left">Type</th>
                      <th className="px-2 py-1 text-left">Ref/Notes</th>
                      <th className="px-2 py-1 text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {payments.filter(p => ['advance', 'advance settlement'].includes(String(p.method || '').toLowerCase())).map((a: any) => (
                      <tr key={String(a._id || a.id)}>
                        <td className="px-2 py-1">{a.receivedAt ? new Date(a.receivedAt).toLocaleString() : '-'}</td>
                        <td className="px-2 py-1 font-medium">{a.method}</td>
                        <td className="px-2 py-1">{a.refNo || a.notes || '-'}</td>
                        <td className="px-2 py-1 text-right">Rs{Number(a.amount || 0).toFixed(0)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {!encounterId ? (
            <div className="mt-3 text-sm text-rose-600">{loadingEnc ? 'Loading encounter...' : 'Encounter not found.'}</div>
          ) : (
            <div className="mt-3 overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead className="bg-slate-100/50 text-slate-700 border-b-2 border-slate-300">
                  <tr>
                    <th className="px-3 py-3 text-[13px] font-extrabold uppercase tracking-wider">Date</th>
                    <th className="px-3 py-3 text-[13px] font-extrabold uppercase tracking-wider">Type</th>
                    <th className="px-3 py-3 text-[13px] font-extrabold uppercase tracking-wider">Service</th>
                    <th className="px-3 py-3 text-[13px] font-extrabold uppercase tracking-wider">Qty</th>
                    <th className="px-3 py-3 text-[13px] font-extrabold uppercase tracking-wider">Rate</th>
                    <th className="px-3 py-3 text-[13px] font-extrabold uppercase tracking-wider">Amount</th>
                    <th className="px-3 py-3 text-[13px] font-extrabold uppercase tracking-wider">Paid</th>
                    <th className="px-3 py-3 text-[13px] font-extrabold uppercase tracking-wider">Remaining</th>
                    <th className="px-3 py-3 text-[13px] font-extrabold uppercase tracking-wider">Status</th>
                    <th className="px-3 py-3 text-[13px] font-extrabold uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {loadingCharges ? (
                    <tr><td colSpan={10} className="px-3 py-6 text-center text-slate-500">Loading...</td></tr>
                  ) : chargesWithAlloc.length === 0 ? (
                    <tr><td colSpan={10} className="px-3 py-6 text-center text-slate-500">No services added.</td></tr>
                  ) : chargesWithAlloc.map((c: any) => (
                    <tr key={c.id}>
                      <td className="px-3 py-2 text-xs text-slate-500">{c.date ? new Date(c.date).toLocaleString() : '-'}</td>
                      <td className="px-3 py-2 text-xs text-slate-600 capitalize">{c.type || 'service'}</td>
                      <td className="px-3 py-2">{c.description}</td>
                      <td className="px-3 py-2">{c.qty}</td>
                      <td className="px-3 py-2">Rs{Number(c.unitPrice||0).toFixed(0)}</td>
                      <td className="px-3 py-2 font-medium">Rs{Number(c.amount||0).toFixed(0)}</td>
                      <td className="px-3 py-2">Rs{Number(c.rowPaid||0).toFixed(0)}</td>
                      <td className="px-3 py-2">Rs{Number(c.rowRemaining||0).toFixed(0)}</td>
                      <td className="px-3 py-2">
                        <span className={c.rowStatus==='Paid' ? 'rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-700' : c.rowStatus==='Partial' ? 'rounded-full bg-amber-50 px-2 py-0.5 text-xs font-semibold text-amber-700' : 'rounded-full bg-rose-50 px-2 py-0.5 text-xs font-semibold text-rose-700'}>
                          {c.rowStatus}
                        </span>
                      </td>
                      <td className="px-3 py-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <button
                            onClick={()=>setEditCharge({ id: c.id, description: c.description, qty: c.qty, unitPrice: c.unitPrice, type: c.type || 'service' })}
                            className="rounded-md border border-slate-300 px-2 py-1 text-xs hover:bg-slate-50"
                          >
                            Edit
                          </button>
                          <button
                            onClick={async()=>{
                              setConfirmDel({ open: true, chargeId: c.id })
                            }}
                            className="rounded-md border border-slate-300 px-2 py-1 text-xs hover:bg-slate-50"
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="mt-3 flex items-center justify-end gap-3 text-sm">
                <div className="text-slate-600">Total</div>
                <div className="text-base font-semibold text-slate-900">Rs{Number(total||0).toFixed(0)}</div>
              </div>
            </div>
          )}
        </div>
      </div>

      {editCharge && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <form
            onSubmit={async (e)=>{
              e.preventDefault()
              try{
                const fd = new FormData(e.currentTarget)
                const description = String(fd.get('description') || '').trim()
                const type = String(fd.get('type') || 'service')
                const qty = Number(fd.get('qty') || 1)
                const unitPrice = Number(fd.get('unitPrice') || 0)
                if (!description){ setToast({ type: 'error', message: 'Service is required' }); return }
                await hospitalApi.updateIpdBillingItem(editCharge.id, { type: type as any, description, qty, unitPrice })
                setEditCharge(null)
                await reloadCharges()
                await reloadBillingSummary()
                setToast({ type: 'success', message: 'Service updated' })
              }catch(err:any){
                setToast({ type: 'error', message: err?.message || 'Failed to update service' })
              }
            }}
            className="w-full max-w-md overflow-hidden rounded-xl bg-white shadow-2xl ring-1 ring-black/5"
          >
            <div className="border-b border-slate-200 px-5 py-3 font-semibold text-slate-800">Edit Service</div>
            <div className="space-y-3 px-5 py-4 text-sm">
              <div>
                <label className="block text-xs font-medium text-slate-600">Type</label>
                <select name="type" defaultValue={editCharge.type} className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2">
                  {['bed','procedure','medication','service'].map(t => (<option key={t} value={t}>{t}</option>))}
                </select>
              </div>
              <label className="block text-xs font-medium text-slate-600">Service</label>
              <input
                name="description"
                defaultValue={editCharge.description}
                placeholder="Select or type service"
                className="w-full rounded-md border border-slate-300 px-3 py-2"
              />
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-600">Qty</label>
                  <input name="qty" type="number" defaultValue={editCharge.qty} className="w-full rounded-md border border-slate-300 px-3 py-2" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600">Rate</label>
                  <input name="unitPrice" type="number" defaultValue={editCharge.unitPrice} className="w-full rounded-md border border-slate-300 px-3 py-2" />
                </div>
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 border-t border-slate-200 px-5 py-3">
              <button type="button" onClick={()=>setEditCharge(null)} className="btn-outline-navy">Cancel</button>
              <button type="submit" className="btn">Save</button>
            </div>
          </form>
        </div>
      )}

      {confirmDel?.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-md overflow-hidden rounded-xl bg-white shadow-2xl ring-1 ring-black/5">
            <div className="border-b border-slate-200 px-5 py-3 font-semibold text-slate-800">Confirm</div>
            <div className="px-5 py-4 text-sm text-slate-700">Delete this service charge?</div>
            <div className="flex items-center justify-end gap-2 border-t border-slate-200 px-5 py-3">
              <button type="button" onClick={()=>setConfirmDel(null)} className="btn-outline-navy">Cancel</button>
              <button
                type="button"
                onClick={async()=>{
                  const id = confirmDel.chargeId
                  setConfirmDel(null)
                  try{
                    await hospitalApi.deleteIpdBillingItem(id)
                    await reloadCharges()
                    await reloadBillingSummary()
                    setToast({ type: 'success', message: 'Deleted' })
                  }catch(e:any){
                    setToast({ type: 'error', message: e?.message || 'Failed to delete' })
                  }
                }}
                className="btn"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {openCharge && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <form
            data-ipd-charge-form="true"
            onSubmit={async (e)=>{
              e.preventDefault()
              if (!encounterId) return
              const fd = new FormData(e.currentTarget)
              const description = String(fd.get('description') || '').trim()
              const qty = Number(fd.get('qty') || 1)
              const unitPrice = Number(fd.get('unitPrice') || 0)
              if (!description){ setToast({ type: 'error', message: 'Service is required' }); return }
              try{
                await hospitalApi.createIpdBillingItem(encounterId, { type: 'service', description, qty, unitPrice, billedBy: 'hospital' })
                setOpenCharge(false)
                await reloadCharges()
                await reloadBillingSummary()
                setToast({ type: 'success', message: 'Service added' })
              }catch(e: any){
                setToast({ type: 'error', message: e?.message || 'Failed to add service' })
              }
            }}
            className="w-full max-w-md overflow-hidden rounded-xl bg-white shadow-2xl ring-1 ring-black/5"
          >
            <div className="border-b border-slate-200 px-5 py-3 font-semibold text-slate-800">Add Service</div>
            <div className="space-y-3 px-5 py-4 text-sm">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Service</label>
                <ServiceSelect
                  svcCatalog={svcCatalog}
                  onSelect={(svc) => {
                    const form = document.querySelector('form[data-ipd-charge-form="true"]')
                    if (!form) return
                    const rateEl = form.querySelector<HTMLInputElement>('input[name="unitPrice"]')
                    if (rateEl) rateEl.value = String(svc.price || 0)
                  }}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-600">Qty</label>
                  <input name="qty" type="number" defaultValue={1} className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600">Rate</label>
                  <input name="unitPrice" type="number" defaultValue={0} className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2" />
                </div>
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 border-t border-slate-200 px-5 py-3">
              <button type="button" onClick={()=>setOpenCharge(false)} className="btn-outline-navy">Cancel</button>
              <button type="submit" className="btn">Add</button>
            </div>
          </form>
        </div>
      )}

      {openAdvance && (
        <AdvanceDialog open={openAdvance} onClose={()=>setOpenAdvance(false)} onSave={saveAdvance} />
      )}

      <Hospital_IpdPaymentSlip
        open={slipOpen}
        onClose={()=>setSlipOpen(false)}
        data={slipData || { encounterId: '', patientName: '', payment: { amount: 0 }, totals: { total: 0, paid: 0, pending: 0 } }}
        autoPrint
      />

      {toast && (
        <div className="fixed right-4 top-16 z-[60] max-w-sm">
          <div className={toast.type==='success' ? 'rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800 shadow' : toast.type==='error' ? 'rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800 shadow' : 'rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 shadow'}>
            <div className="flex items-start justify-between gap-3">
              <div>{toast.message}</div>
              <button type="button" className="text-slate-500 hover:text-slate-700" onClick={()=>setToast(null)}>×</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function AdvanceDialog({ open, onClose, onSave }: { open: boolean; onClose: ()=>void; onSave: (d: { amount: number; method: string; refNo?: string; notes?: string })=>void }){
  if(!open) return null
  const submit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    onSave({
      amount: parseFloat(String(fd.get('amount')||'0')) || 0,
      method: String(fd.get('method')||'Cash'),
      refNo: String(fd.get('refNo')||''),
      notes: String(fd.get('notes')||''),
    })
  }
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <form onSubmit={submit} className="w-full max-w-md overflow-hidden rounded-xl bg-white shadow-2xl ring-1 ring-black/5">
        <div className="border-b border-slate-200 px-5 py-3 font-semibold text-slate-800">Add Advance</div>
        <div className="space-y-3 px-5 py-4 text-sm">
          <label htmlFor="adv-amount" className="block text-xs font-medium text-slate-600">Amount</label>
          <input id="adv-amount" name="amount" type="number" step="0.01" placeholder="e.g. 5000" className="w-full rounded-md border border-slate-300 px-3 py-2" />

          <label htmlFor="adv-method" className="block text-xs font-medium text-slate-600">Payment Mode</label>
          <select id="adv-method" name="method" className="w-full rounded-md border border-slate-300 px-3 py-2">
            {['Cash','Card','Bank','Online'].map(m => (<option key={m} value={m}>{m}</option>))}
          </select>

          <label htmlFor="adv-ref" className="block text-xs font-medium text-slate-600">Ref No</label>
          <input id="adv-ref" name="refNo" placeholder="optional" className="w-full rounded-md border border-slate-300 px-3 py-2" />

          <label htmlFor="adv-notes" className="block text-xs font-medium text-slate-600">Notes</label>
          <input id="adv-notes" name="notes" placeholder="optional" className="w-full rounded-md border border-slate-300 px-3 py-2" />
        </div>
        <div className="flex items-center justify-end gap-2 border-t border-slate-200 px-5 py-3">
          <button type="button" onClick={onClose} className="btn-outline-navy">Cancel</button>
          <button type="submit" className="btn">Save</button>
        </div>
      </form>
    </div>
  )
}
