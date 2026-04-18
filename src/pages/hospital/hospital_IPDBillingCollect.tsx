import { useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { hospitalApi } from '../../utils/api'
import Toast, { type ToastState } from '../../components/ui/Toast'
import { fmtDateTime12 } from '../../utils/timeFormat'
import Hospital_IpdPaymentSlip from '../../components/hospital/Hospital_IpdPaymentSlip'

function getReceptionUser(){
  try{
    // Try hospital session first
    const hospitalSession = localStorage.getItem('hospital.session')
    if (hospitalSession) {
      const obj = JSON.parse(hospitalSession)
      return obj?.username || obj?.name || 'hospital'
    }
    // Fall back to reception session
    const receptionSession = localStorage.getItem('reception.session')
    if (!receptionSession) return 'reception'
    const obj = JSON.parse(receptionSession)
    return obj?.username || obj?.name || 'reception'
  }catch{ return 'reception' }
}

function currency(n: number){ return `Rs ${Number(n||0).toFixed(2)}` }

export default function Reception_IPDBillingCollect(){
  const [params] = useSearchParams()
  const preEncounterId = String(params.get('encounterId') || '')
  const [q, setQ] = useState('')
  const [list, setList] = useState<any[]>([])
  const [loading, setLoading] = useState(false)

  const [encId, setEncId] = useState<string>(preEncounterId)
  const [enc, setEnc] = useState<any|null>(null)
  const [charges, setCharges] = useState<any[]>([])
  const [payments, setPayments] = useState<any[]>([])
  const [method, setMethod] = useState('Cash')
  const [refNo, setRefNo] = useState('')
  const [discount, setDiscount] = useState<string>('0')
  const [collecting, setCollecting] = useState(false)
  const [collectAmount, setCollectAmount] = useState<string>('')
  const [toast, setToast] = useState<ToastState>(null)
  const panelRef = useRef<HTMLDivElement|null>(null)
  const [flash, setFlash] = useState(false)
  const [showPanel, setShowPanel] = useState<boolean>(!!preEncounterId)
  const encIdRef = useRef<string>(encId)
  const [openAdvance, setOpenAdvance] = useState(false)
  const [openReturnAdvance, setOpenReturnAdvance] = useState(false)
  const [allocMode, setAllocMode] = useState<'auto'|'manual'>('auto')
  const [allocSelected, setAllocSelected] = useState<Record<string, boolean>>({})
  const [allocAmounts, setAllocAmounts] = useState<Record<string, string>>({})
  const [slipOpen, setSlipOpen] = useState(false)
  const [slipData, setSlipData] = useState<any|null>(null)

  useEffect(()=>{ if(preEncounterId){ setEncId(preEncounterId); setShowPanel(true) } }, [preEncounterId])

  useEffect(()=>{ encIdRef.current = encId }, [encId])

  useEffect(()=>{ if (encId) loadEncounter(encId) }, [encId])

  // When encounter loads, scroll into view and flash highlight
  useEffect(()=>{
    if (!enc) return
    try { panelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }) } catch {}
    setFlash(true)
    const t = setTimeout(()=> setFlash(false), 1600)
    return ()=> clearTimeout(t)
  }, [enc])

  // Auto-load admitted queue on mount and refresh periodically
  useEffect(()=>{
    let timer: any
    const run = () => { search().catch(()=>{}) }
    run()
    timer = setInterval(run, 15000)
    return ()=> { if (timer) clearInterval(timer) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function search(){
    setLoading(true)
    try{
      const res = await hospitalApi.listIPDAdmissions({ q, status: 'admitted', limit: 40 }) as any
      const rows = (res.admissions||[]).map((a:any)=>({
        id: String(a._id),
        info: `${a.patientId?.fullName||'-'} · ${a.patientId?.mrn||''}`,
        admissionNo: a.admissionNo,
        bed: a.bedLabel || a.bedId || '-',
        doctor: a.doctorId?.name || '-',
        startAt: a.startAt
      }))
      rows.sort((a:any,b:any)=> new Date(b.startAt).getTime() - new Date(a.startAt).getTime())
      setList(rows)
      // Only auto-select first patient on initial load when no patient is selected
      if (!encIdRef.current && rows.length){
        setEncId(rows[0].id)
      }
    }catch{ setList([]) }
    setLoading(false)
  }

  function openCart(id: string){
    setEncId(id)
    setShowPanel(true)
  }

  const [billingTotals, setBillingTotals] = useState<any>(null)

  async function loadEncounter(id: string){
    try{
      const [e, bi, pay] = await Promise.all([
        hospitalApi.getIPDAdmissionById(id) as any,
        hospitalApi.listIpdBillingItems(id, { limit: 500 }) as any,
        hospitalApi.listIpdPayments(id, { limit: 500 }) as any,
      ])
      setEnc((e||{}).encounter || null)
      setCharges((bi.items||[]))
      setPayments((pay.payments||[]))
      setBillingTotals(pay?.totals || null)
    }catch{
      setEnc(null); setCharges([]); setPayments([]); setBillingTotals(null);
    }
  }

  // Init allocation selections/amounts when charges change
  useEffect(()=>{
    const nextSel: Record<string, boolean> = {}
    const nextAmt: Record<string, string> = {}
    for (const c of (charges || [])){
      const id = String(c?._id || '')
      if (!id) continue
      const remaining = Math.max(0, Number(c.remaining != null ? c.remaining : (Number(c.amount||0) - Number(c.paidAmount||0))) || 0)
      nextSel[id] = remaining > 0
      nextAmt[id] = remaining > 0 ? remaining.toFixed(2) : '0'
    }
    setAllocSelected(nextSel)
    setAllocAmounts(nextAmt)
  }, [encId, charges.length])

  function buildAllocations(totalToAllocate: number){
    const out: Array<{ billingItemId: string; amount: number }> = []
    let left = Math.max(0, Number(totalToAllocate || 0))
    const rows = (charges || [])
      .map(c => ({
        id: String(c?._id || ''),
        label: String(c?.description || ''),
        amount: Number(c.amount || 0),
        paidAmount: Number(c.paidAmount || 0),
        remaining: Math.max(0, Number(c.remaining != null ? c.remaining : (Number(c.amount||0) - Number(c.paidAmount||0))) || 0),
        date: c?.date || c?.createdAt,
      }))
      .filter(r => r.id && r.remaining > 0)
      .sort((a, b) => new Date(a.date || 0 as any).getTime() - new Date(b.date || 0 as any).getTime())

    if (allocMode === 'manual'){
      for (const r of rows){
        if (!allocSelected[r.id]) continue
        const want = Math.max(0, parseFloat(String(allocAmounts[r.id] || '0')) || 0)
        const take = Math.min(r.remaining, want)
        if (take > 0) out.push({ billingItemId: r.id, amount: Number(take.toFixed(2)) })
      }
      return out
    }

    // auto: allocate FIFO into selected charges
    for (const r of rows){
      if (left <= 0) break
      if (!allocSelected[r.id]) continue
      const take = Math.min(r.remaining, left)
      if (take > 0) {
        out.push({ billingItemId: r.id, amount: Number(take.toFixed(2)) })
        left = Number((left - take).toFixed(2))
      }
    }
    return out
  }

  const total = billingTotals?.grandTotal ?? (charges || []).reduce((s, c) => s + Number(c.amount || 0), 0)
  const paid = billingTotals?.totalPaidToCharges ?? 0
  const advanceTotal = billingTotals?.unallocatedAdvance ?? 0
  const netDue = billingTotals?.netOutstanding ?? Math.max(0, total - paid)
  const pending = netDue
  const discountNum = Math.max(0, parseFloat(String(discount||'0')) || 0)
  const pendingAfterDiscount = Math.max(0, pending - discountNum)

  // Reset discount and default collect amount when encounter/figures change
  useEffect(()=>{
    setDiscount('0')
    setCollectAmount(pending.toFixed(2))
  }, [encId, total, paid])

  async function collect(){
    if (!enc || !encId) return
    const disc = Math.max(0, parseFloat(String(discount||'0')) || 0)
    const amt = Math.max(0, parseFloat(String(collectAmount||'0')) || 0)
    if ((disc + amt) <= 0) return
    if ((disc + amt) > pending){ setToast({ type: 'error', message: 'Discount + Collect exceeds pending' }); return }
    setCollecting(true)
    try{
      const portal = window.location.pathname.startsWith('/reception') ? 'reception' : 'hospital'
      // Post discount first (as a payment with method 'Discount')
      if (disc > 0){
        await hospitalApi.createIpdPayment(encId, { amount: disc, method: 'Discount', refNo: 'discount', receivedBy: getReceptionUser(), portal } as any)
      }
      // Post cash/card/online collected amount
      if (amt > 0){
        const allocations = buildAllocations(amt)
        await hospitalApi.createIpdPayment(encId, { amount: amt, method, refNo, receivedBy: getReceptionUser(), portal, allocations } as any)
      }
      // Reload fresh data
      const [e, bi, pay] = await Promise.all([
        hospitalApi.getIPDAdmissionById(encId) as any,
        hospitalApi.listIpdBillingItems(encId, { limit: 500 }) as any,
        hospitalApi.listIpdPayments(encId, { limit: 500 }) as any,
      ])
      setEnc((e||{}).encounter || null)
      setCharges((bi.items||[]))
      setPayments((pay.payments||[]))
      setBillingTotals(pay?.totals || null)
      // Open print slip for payment
      const freshTotals = pay?.totals
      const patient = (e||{}).encounter?.patientId || {}
      const encData = (e||{}).encounter || {}
      setSlipData({
        encounterId: encId,
        patientName: patient?.fullName || encData?.patientName || '-',
        mrn: patient?.mrn || encData?.mrn || '',
        phone: patient?.phoneNormalized || patient?.phone || '',
        cnic: patient?.cnicNormalized || patient?.cnic || '',
        address: patient?.address || '',
        age: patient?.age || '',
        gender: patient?.gender || '',
        guardian: patient?.fatherName || patient?.guardianName || patient?.guardian || '',
        department: 'IPD',
        admissionNo: encData?.admissionNo || '',
        bedLabel: encData?.bedLabel || encData?.bedId || '',
        payment: { amount: amt + disc, method: amt > 0 ? method : 'Discount', refNo, receivedAt: new Date().toISOString() },
        totals: {
          total: typeof freshTotals?.grandTotal === 'number' ? freshTotals.grandTotal : (total || 0),
          paid: typeof freshTotals?.totalPaidToCharges === 'number' ? freshTotals.totalPaidToCharges : (paid || 0),
          pending: typeof freshTotals?.netOutstanding === 'number' ? freshTotals.netOutstanding : (netDue || 0),
          unallocatedAdvance: typeof freshTotals?.unallocatedAdvance === 'number' ? freshTotals.unallocatedAdvance : (advanceTotal || 0)
        },
      })
      setSlipOpen(true)
      setRefNo('')
      setDiscount('0')
      setCollectAmount('')
      setToast({ type: 'success', message: 'Payment recorded' })
    }catch(e: any){ setToast({ type: 'error', message: e?.message || 'Failed to record payment' }) }
    setCollecting(false)
  }

  async function saveAdvance(d: { amount: number; method: string; refNo?: string; notes?: string }) {
    if (!encId) return
    const amt = Number(d.amount || 0)
    if (amt <= 0) { setToast({ type: 'error', message: 'Advance amount must be greater than 0' }); return }
    try {
      const portal = window.location.pathname.startsWith('/reception') ? 'reception' : 'hospital'
      const res: any = await hospitalApi.createIpdPayment(encId, {
        amount: amt,
        method: 'Advance',
        refNo: d.refNo || '',
        notes: d.notes || '',
        receivedBy: getReceptionUser(),
        portal
      } as any)
      const pay = res?.payment
      await loadEncounter(encId)
      setOpenAdvance(false)
      // Open print slip for advance
      const apiTotals = res?.totals
      const freshTotals = apiTotals || billingTotals
      const patient = enc?.patientId || {}
      setSlipData({
        encounterId: encId,
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
        bedLabel: enc?.bedLabel || enc?.bedId || '',
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
    } catch (e: any) {
      setToast({ type: 'error', message: e?.message || 'Failed to record advance' })
    }
  }

  async function returnAdvance(d: { amount: number; method: string; refNo?: string; notes?: string }) {
    if (!encId) return
    const amt = Number(d.amount || 0)
    if (amt <= 0) { setToast({ type: 'error', message: 'Return amount must be greater than 0' }); return }
    if (amt > advanceTotal) { setToast({ type: 'error', message: 'Return amount cannot exceed available advance' }); return }
    try {
      const portal = window.location.pathname.startsWith('/reception') ? 'reception' : 'hospital'
      // Create a refund payment with type: 'refund'
      const res: any = await hospitalApi.createIpdPayment(encId, {
        amount: amt,
        type: 'refund',
        method: 'Advance Return',
        refNo: d.refNo || '',
        notes: d.notes || '',
        receivedBy: getReceptionUser(),
        portal
      } as any)
      const pay = res?.payment
      await loadEncounter(encId)
      setOpenReturnAdvance(false)
      // Open print slip for advance return
      const apiTotals = res?.totals
      const freshTotals = apiTotals || billingTotals
      const patient = enc?.patientId || {}
      setSlipData({
        encounterId: encId,
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
        bedLabel: enc?.bedLabel || enc?.bedId || '',
        isAdvance: true,
        isAdvanceReturn: true,
        payment: { amount: amt, method: 'Advance Return', refNo: d.refNo, receivedAt: pay?.receivedAt || new Date().toISOString() },
        totals: {
          total: typeof freshTotals?.grandTotal === 'number' ? freshTotals.grandTotal : (total || 0),
          paid: typeof freshTotals?.totalPaidToCharges === 'number' ? freshTotals.totalPaidToCharges : (paid || 0),
          pending: typeof freshTotals?.netOutstanding === 'number' ? freshTotals.netOutstanding : (netDue || 0),
          unallocatedAdvance: typeof freshTotals?.unallocatedAdvance === 'number' ? freshTotals.unallocatedAdvance : Math.max(0, advanceTotal - amt)
        },
      })
      setSlipOpen(true)
      setToast({ type: 'success', message: 'Advance returned successfully' })
    } catch (e: any) {
      setToast({ type: 'error', message: e?.message || 'Failed to return advance' })
    }
  }

  return (
    <>
    <div className="space-y-4">
      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <div className="text-lg font-semibold">IPD Billing Collect</div>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <input value={q} onChange={e=>setQ(e.target.value)} placeholder="Search by MRN, Name or Admission No" className="min-w-[280px] flex-1 rounded-md border border-slate-300 px-3 py-2" />
          <button onClick={search} className="btn" disabled={loading}>{loading? 'Searching...' : 'Search'}</button>
        </div>
        {list.length>0 && (
          <div className="mt-3 overflow-x-auto text-sm">
            <table className="min-w-full">
              <thead className="bg-slate-100/50 text-slate-700 border-b-2 border-slate-300"><tr><th className="px-3 py-3 text-[13px] font-extrabold uppercase tracking-wider text-left">Patient</th><th className="px-3 py-3 text-[13px] font-extrabold uppercase tracking-wider text-left">Admission No</th><th className="px-3 py-3 text-[13px] font-extrabold uppercase tracking-wider text-left">Bed</th><th className="px-3 py-3 text-[13px] font-extrabold uppercase tracking-wider text-left">Actions</th></tr></thead>
              <tbody>
                {list.map(r=> (
                  <tr key={r.id} className="border-b">
                    <td className="px-3 py-2">{r.info}</td>
                    <td className="px-3 py-2">{r.admissionNo}</td>
                    <td className="px-3 py-2">{r.bed}</td>
                    <td className="px-3 py-2"><button className="btn-outline-navy" onClick={()=> openCart(r.id)}>Collect</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {enc && showPanel && (
        <div ref={panelRef} className={`rounded-xl border border-slate-200 bg-white p-4 ${flash? 'ring-2 ring-violet-400':''}`}>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <div className="font-medium">{enc?.patientId?.fullName || '-'}</div>
              <div className="text-xs text-slate-600">MRN: {enc?.patientId?.mrn || '-'} · Admission: {enc?.admissionNo || '-'}</div>
            </div>
            <div className="text-right flex items-center gap-4">
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-2 text-center min-w-[100px]">
                <div className="text-[10px] uppercase font-bold text-slate-500">Total Bill</div>
                <div className="text-lg font-bold text-slate-900">{currency(total)}</div>
              </div>
              <div className="rounded-lg border border-indigo-200 bg-indigo-50 p-2 text-center min-w-[100px]">
                <div className="text-[10px] uppercase font-bold text-indigo-700">Advance</div>
                <div className="text-lg font-bold text-indigo-700">{currency(advanceTotal)}</div>
              </div>
              <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-2 text-center min-w-[100px]">
                <div className="text-[10px] uppercase font-bold text-emerald-700">Paid</div>
                <div className="text-lg font-bold text-emerald-700">{currency(paid)}</div>
              </div>
              <div className="rounded-lg border border-rose-200 bg-rose-50 p-2 text-center min-w-[100px]">
                <div className="text-[10px] uppercase font-bold text-rose-700">Net Due</div>
                <div className="text-lg font-bold text-rose-700">{currency(netDue)}</div>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => setOpenAdvance(true)} className="btn-outline-navy py-1 px-3">Add Advance</button>
                {advanceTotal > 0 && (
                  <button onClick={() => setOpenReturnAdvance(true)} className="btn-outline-navy py-1 px-3 text-rose-700 border-rose-300 hover:bg-rose-50">Return Advance</button>
                )}
              </div>
            </div>
          </div>

          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <div className="rounded-lg border p-3">
              <div className="font-medium mb-2">Charges</div>
              {charges.length===0 ? (<div className="text-sm text-slate-500">No charges</div>) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full text-sm">
                    <thead className="bg-slate-100/50 text-slate-700 border-b-2 border-slate-300"><tr><th className="px-2 py-3 text-[13px] font-extrabold uppercase tracking-wider text-left">Charge</th><th className="px-2 py-3 text-[13px] font-extrabold uppercase tracking-wider text-right">Amount</th><th className="px-2 py-3 text-[13px] font-extrabold uppercase tracking-wider text-right">Remaining</th></tr></thead>
                    <tbody className="divide-y">
                      {charges.map((c:any)=> (
                        <tr key={String(c._id)}>
                          <td className="px-2 py-1">{c.description}</td>
                          <td className="px-2 py-1 text-right">{currency(Number(c.amount||0))}</td>
                          <td className="px-2 py-1 text-right">{currency(Number(c.remaining != null ? c.remaining : Math.max(0, Number(c.amount||0)-Number(c.paidAmount||0))))}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot><tr><th className="px-2 py-1 text-right">Total</th><th className="px-2 py-1 text-right">{currency(total)}</th></tr></tfoot>
                  </table>
                </div>
              )}
            </div>
            <div className="rounded-lg border p-3">
              <div className="font-medium mb-2">Collect Payment</div>
              <div className="grid gap-2 text-sm">
                <div className="flex items-center justify-between"><div>Pending</div><div className="font-semibold">{currency(pending)}</div></div>
                {advanceTotal > 0 && (
                  <div className="flex items-center justify-between text-indigo-700"><div>Net Due</div><div className="font-bold text-lg">{currency(netDue)}</div></div>
                )}
                <label className="text-xs text-slate-600">Discount</label>
                <input value={discount} onChange={(e)=>{ const v = e.target.value; setDiscount(v); const n = Math.max(0, parseFloat(v||'0')||0); const after = Math.max(0, pending - n); setCollectAmount(after.toFixed(2)) }} placeholder="0" className="rounded-md border border-slate-300 px-2 py-1 w-40" />
                <label className="text-xs text-slate-600">Method</label>
                <select value={method} onChange={e=>setMethod(e.target.value)} className="rounded-md border border-slate-300 px-2 py-1 w-40">
                  <option>Cash</option>
                  <option>Card</option>
                  <option>Online</option>
                  </select>
                <label className="text-xs text-slate-600">Reference / Notes</label>
                <input value={refNo} onChange={e=>setRefNo(e.target.value)} placeholder="Txn # / Notes" className="rounded-md border border-slate-300 px-2 py-1" />
                <label className="text-xs text-slate-600">Collect Amount</label>
                <input value={collectAmount} onChange={e=>setCollectAmount(e.target.value)} placeholder={pendingAfterDiscount.toFixed(2)} className="rounded-md border border-slate-300 px-2 py-1 w-40" />

                <div className="mt-2 rounded-md border border-slate-200 bg-slate-50 p-2">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="text-xs font-semibold text-slate-700">Apply payment to charges</div>
                    <div className="flex items-center gap-2">
                      <button type="button" onClick={()=>setAllocMode('auto')} className={allocMode==='auto' ? 'btn-outline-navy text-xs py-1 px-2' : 'rounded-md border border-slate-300 bg-white px-2 py-1 text-xs'}>Auto</button>
                      <button type="button" onClick={()=>setAllocMode('manual')} className={allocMode==='manual' ? 'btn-outline-navy text-xs py-1 px-2' : 'rounded-md border border-slate-300 bg-white px-2 py-1 text-xs'}>Manual</button>
                    </div>
                  </div>
                  <div className="mt-2 max-h-40 overflow-auto">
                    {(charges || []).map((c:any)=>{
                      const id = String(c?._id||'')
                      const remaining = Math.max(0, Number(c.remaining != null ? c.remaining : (Number(c.amount||0)-Number(c.paidAmount||0))) || 0)
                      if (!id) return null
                      const disabled = remaining <= 0
                      return (
                        <div key={id} className="flex items-center gap-2 py-1 text-xs">
                          <input type="checkbox" checked={!!allocSelected[id]} disabled={disabled} onChange={e=> setAllocSelected(prev=> ({ ...prev, [id]: e.target.checked }))} />
                          <div className="min-w-0 flex-1 truncate text-slate-700">{String(c.description||'')}</div>
                          <div className="w-[90px] text-right text-slate-600">{currency(remaining)}</div>
                          <input
                            disabled={allocMode !== 'manual' || disabled || !allocSelected[id]}
                            value={allocAmounts[id] ?? ''}
                            onChange={e=> setAllocAmounts(prev=> ({ ...prev, [id]: e.target.value }))}
                            className="w-[90px] rounded border border-slate-300 px-2 py-1 text-right"
                            placeholder="0"
                          />
                        </div>
                      )
                    })}
                  </div>
                  {allocMode === 'manual' && (
                    <div className="mt-2 text-[11px] text-slate-600">Manual mode: enter amounts per selected charge ({'<='} remaining).</div>
                  )}
                  {allocMode === 'auto' && (
                    <div className="mt-2 text-[11px] text-slate-600">Auto mode: collected amount will be distributed FIFO into selected charges.</div>
                  )}
                </div>
                <div className="flex gap-2 mt-2">
                  <button className="btn flex-1" disabled={(pending<=0) || collecting || ((parseFloat(collectAmount||'0')||0) <= 0 && (parseFloat(discount||'0')||0) <= 0)} onClick={collect}>{collecting? 'Saving...' : `Collect ${currency(Math.max(0, parseFloat(String(collectAmount||'0'))||0))}`}</button>
                </div>
              </div>
              <div className="mt-4">
                <div className="font-medium mb-1">Previous Payments</div>
                {payments.length===0 ? (<div className="text-sm text-slate-500">None</div>) : (
                  <div className="overflow-x-auto">
                    <table className="min-w-full text-sm">
                      <thead className="bg-slate-100/50 text-slate-700 border-b-2 border-slate-300"><tr><th className="px-2 py-3 text-[13px] font-extrabold uppercase tracking-wider text-left">Date/Time</th><th className="px-2 py-3 text-[13px] font-extrabold uppercase tracking-wider text-left">Method</th><th className="px-2 py-3 text-[13px] font-extrabold uppercase tracking-wider text-left">Ref</th><th className="px-2 py-3 text-[13px] font-extrabold uppercase tracking-wider text-left">Performed By</th><th className="px-2 py-3 text-[13px] font-extrabold uppercase tracking-wider text-right">Amount</th></tr></thead>
                      <tbody className="divide-y">
                        {payments.map((p:any)=> (
                          <tr key={String(p._id)}><td className="px-2 py-1">{fmtDateTime12(p.receivedAt||p.createdAt||'')}</td><td className="px-2 py-1">{p.method||'-'}</td><td className="px-2 py-1">{p.refNo||''}</td><td className="px-2 py-1">{p.createdByUsername || p.createdBy || '-'}</td><td className="px-2 py-1 text-right">{currency(Number(p.amount||0))}</td></tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
    <Toast toast={toast} onClose={()=>setToast(null)} />
    {openAdvance && (
      <AdvanceDialog open={openAdvance} onClose={()=>setOpenAdvance(false)} onSave={saveAdvance} />
    )}
    {openReturnAdvance && (
      <ReturnAdvanceDialog 
        open={openReturnAdvance} 
        onClose={()=>setOpenReturnAdvance(false)} 
        onSave={returnAdvance}
        maxAmount={advanceTotal}
      />
    )}

    <Hospital_IpdPaymentSlip
      open={slipOpen}
      onClose={()=>setSlipOpen(false)}
      data={slipData || { encounterId: '', patientName: '', payment: { amount: 0 }, totals: { total: 0, paid: 0, pending: 0 } }}
      autoPrint
    />
    </>
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

function ReturnAdvanceDialog({ open, onClose, onSave, maxAmount }: { open: boolean; onClose: ()=>void; onSave: (d: { amount: number; method: string; refNo?: string; notes?: string })=>void; maxAmount: number }){
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
        <div className="border-b border-rose-200 bg-rose-50 px-5 py-3 font-semibold text-rose-800">Return Advance</div>
        <div className="space-y-3 px-5 py-4 text-sm">
          <div className="rounded-md bg-rose-50 p-2 text-rose-700 text-xs">
            Available Advance: Rs {Number(maxAmount||0).toFixed(2)}
          </div>
          <label htmlFor="ret-amount" className="block text-xs font-medium text-slate-600">Return Amount</label>
          <input id="ret-amount" name="amount" type="number" step="0.01" max={maxAmount} placeholder="e.g. 1000" className="w-full rounded-md border border-rose-300 px-3 py-2" required />

          <label htmlFor="ret-method" className="block text-xs font-medium text-slate-600">Return Method</label>
          <select id="ret-method" name="method" className="w-full rounded-md border border-slate-300 px-3 py-2">
            {['Cash','Card','Bank','Online'].map(m => (<option key={m} value={m}>{m}</option>))}
          </select>

          <label htmlFor="ret-ref" className="block text-xs font-medium text-slate-600">Ref No</label>
          <input id="ret-ref" name="refNo" placeholder="optional" className="w-full rounded-md border border-slate-300 px-3 py-2" />

          <label htmlFor="ret-notes" className="block text-xs font-medium text-slate-600">Notes</label>
          <input id="ret-notes" name="notes" placeholder="optional" className="w-full rounded-md border border-slate-300 px-3 py-2" />
        </div>
        <div className="flex items-center justify-end gap-2 border-t border-slate-200 px-5 py-3">
          <button type="button" onClick={onClose} className="btn-outline-navy">Cancel</button>
          <button type="submit" className="rounded-md bg-rose-600 px-4 py-2 text-sm font-medium text-white hover:bg-rose-700">Return</button>
        </div>
      </form>
    </div>
  )
}
