import { useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'

import { hospitalApi } from '../../utils/api'
import { getLocalDate } from '../../utils/date'
import { fmtDateTime12 } from '../../utils/timeFormat'
import Hospital_ErPaymentSlip from '../../components/hospital/Hospital_ErPaymentSlip'
import Toast, { type ToastState } from '../../components/ui/Toast'

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

type BedLocation = {
  floor: string
  type: 'room' | 'ward'
  location: string
  bed: string
}

function formatBedLocation(bedLoc?: BedLocation) {
  if (!bedLoc) return '-'
  return `${bedLoc.floor} / ${bedLoc.location} / Bed: ${bedLoc.bed}` 
}

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
    <div className="relative" ref={ref}>
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
        <div className="absolute z-70 mt-1 max-h-60 w-full overflow-auto rounded-md border border-slate-200 bg-white py-1 shadow-lg">
          {filtered.map(svc => (
            <button
              key={svc.id || svc._id}
              type="button"
              className="flex w-full flex-col px-3 py-2 text-left hover:bg-slate-50 focus:bg-slate-50 focus:outline-none"
              onClick={() => {
                onSelect(svc)
                setQ(svc.name || svc.description)
                setOpen(false)
              }}
            >
              <div className="text-sm font-medium text-slate-900">{svc.name || svc.description}</div>
              <div className="text-xs text-slate-500">Rs{svc.price || svc.amount}</div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

export default function Reception_ERBillingCollect(){
  const [params] = useSearchParams()
  const preTokenId = String(params.get('tokenId') || '')

  const [q, setQ] = useState('')
  const [list, setList] = useState<any[]>([])
  const [loading, setLoading] = useState(false)

  // Date filters - default to today
  const [fromDate, setFromDate] = useState<string>(() => getLocalDate())
  const [toDate, setToDate] = useState<string>(() => getLocalDate())

  const [tokenId, setTokenId] = useState<string>(preTokenId)
  const [token, setToken] = useState<any|null>(null)
  const [encounterId, setEncounterId] = useState<string>('')

  const [charges, setCharges] = useState<any[]>([])
  const [payments, setPayments] = useState<any[]>([])
  const [billingSummary, setBillingSummary] = useState<any>(null)

  const [method, setMethod] = useState('Cash')
  const [refNo, setRefNo] = useState('')
  const [collecting, setCollecting] = useState(false)
  const [collectAmount, setCollectAmount] = useState<string>('')
  const [toast, setToast] = useState<ToastState>(null)

  const [allocMode, setAllocMode] = useState<'auto'|'manual'>('auto')
  const [allocSelected, setAllocSelected] = useState<Record<string, boolean>>({})
  const [allocAmounts, setAllocAmounts] = useState<Record<string, string>>({})

  const panelRef = useRef<HTMLDivElement|null>(null)
  const [flash, setFlash] = useState(false)
  const [showPanel, setShowPanel] = useState<boolean>(!!preTokenId)
  const tokenIdRef = useRef<string>(tokenId)
  const [openAdvance, setOpenAdvance] = useState(false)
  const [openReturnAdvance, setOpenReturnAdvance] = useState(false)
  const [openCharge, setOpenCharge] = useState(false)
  const [svcCatalog, setSvcCatalog] = useState<any[]>([])

  const [slipOpen, setSlipOpen] = useState(false)
  const [slipData, setSlipData] = useState<any|null>(null)

  useEffect(() => {
    let cancelled = false
    async function loadSvc(){
      try{
        const res: any = await hospitalApi.listErServices({ active: true, limit: 500 })
        const rows: any[] = res?.services || []
        if (cancelled) return
        setSvcCatalog(rows.map((r:any)=>({ id: String(r._id||r.id), name: String(r.name||''), price: Number(r.price||0) })))
      }catch{
        if (!cancelled) setSvcCatalog([])
      }
    }
    loadSvc()
    return ()=>{ cancelled = true }
  }, [])

  useEffect(()=>{ if(preTokenId){ setTokenId(preTokenId); setShowPanel(true) } }, [preTokenId])

  useEffect(()=>{ tokenIdRef.current = tokenId }, [tokenId])

  useEffect(()=>{ if (tokenId) loadToken(tokenId) }, [tokenId])

  useEffect(()=>{
    if (!token) return
    try { panelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }) } catch {}
    setFlash(true)
    const t = setTimeout(()=> setFlash(false), 1600)
    return ()=> clearTimeout(t)
  }, [token])

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
      const res: any = await hospitalApi.listEREncounters({ status: 'admitted' as any, limit: 500 })
      let rows: any[] = res?.encounters || []

      // Filter by date range only if dates are set
      if (fromDate && toDate) {
        const from = new Date(fromDate)
        from.setHours(0, 0, 0, 0)
        const to = new Date(toDate)
        to.setHours(23, 59, 59, 999)
        rows = rows.filter((enc: any) => {
          const encDate = new Date(enc.startAt || enc.createdAt || 0)
          return encDate >= from && encDate <= to
        })
      }

      const filtered = q.trim()
        ? rows.filter(enc => {
          const s = q.trim().toLowerCase()
          const pat = enc.patientId || {}
          const bedLoc = enc.bedLocation || enc.bedId
          const tokenNo = String(enc.tokenId?.tokenNo || enc.tokenNo || '')
          return tokenNo.toLowerCase().includes(s) ||
            String(pat.fullName||'').toLowerCase().includes(s) ||
            String(pat.mrn||'').toLowerCase().includes(s) ||
            formatBedLocation(bedLoc).toLowerCase().includes(s)
        })
        : rows

      setList(filtered.map(enc => ({
        id: String(enc.tokenId?._id || enc.tokenId || enc._id),
        encounterId: String(enc._id),
        tokenNo: enc.tokenId?.tokenNo || enc.tokenNo || '-',
        patientName: enc.patientId?.fullName || enc.patientName || '-',
        mrn: enc.patientId?.mrn || enc.mrn || '-',
        createdAt: enc.startAt || enc.createdAt,
        bedLocation: enc.bedLocation || enc.bedId,
      })))

      // Only auto-select first patient on initial load when no patient is selected
      if (!tokenIdRef.current && filtered.length){
        setTokenId(String(filtered[0].tokenId?._id || filtered[0].tokenId || filtered[0]._id))
      }
    }catch{ setList([]) }
    setLoading(false)
  }

  function openCart(id: string){
    setTokenId(id)
    setShowPanel(true)
  }

  async function loadToken(id: string){
    try{
      const tRes: any = await hospitalApi.getToken(id)
      const t = tRes?.token
      setToken(t || null)
      const encId = String(t?.encounterId?._id || t?.encounterId || '')
      setEncounterId(encId)
      if (encId){
        const [ch, pay, summary] = await Promise.all([
          hospitalApi.erListBillingItems(encId, { limit: 500 }) as any,
          hospitalApi.erListPayments(encId, { limit: 500 }) as any,
          hospitalApi.erBillingSummary(encId).catch(() => null) as any,
        ])
        setCharges(ch?.items || [])
        setPayments(pay?.payments || [])
        setBillingSummary(summary?.totals || null)
      } else {
        setCharges([]); setPayments([]); setBillingSummary(null);
      }
    }catch{
      setToken(null)
      setEncounterId('')
      setCharges([])
      setPayments([])
      setBillingSummary(null)
    }
  }

  // Use unified billing summary from API as the single source of truth
  const total = billingSummary?.grandTotal ?? (charges || []).reduce((s, c) => s + Number(c.amount || 0), 0)
  const totalPaidFromCharges = billingSummary?.totalPaidToCharges ?? (charges || []).reduce((s, c) => s + Number(c.paidAmount || 0), 0)
  const totalReceived = billingSummary?.totalReceived ?? totalPaidFromCharges
  const advanceRemaining = billingSummary?.unallocatedAdvance ?? Math.max(0, totalReceived - totalPaidFromCharges)
  const advanceTotal = advanceRemaining // Alias for backward compatibility with existing UI
  const netDue = billingSummary?.netOutstanding ?? Math.max(0, total - totalReceived)
  const pending = billingSummary?.pending ?? Math.max(0, total - totalPaidFromCharges)
  const paid = totalPaidFromCharges // Total allocated to charges (for backward compatibility)

  useEffect(()=>{ setCollectAmount(pending.toFixed(2)) }, [tokenId, pending])

  async function collect(){
    if (!tokenId || !encounterId) return
    const amt = Math.max(0, parseFloat(String(collectAmount||'0')) || 0)
    if (amt <= 0) return
    if (amt > pending){ setToast({ type: 'error', message: 'Collect exceeds pending' }); return }
    setCollecting(true)
    try{
      const portal = window.location.pathname.startsWith('/reception') ? 'reception' : 'hospital'
      
      // Build allocations based on mode
      let allocations: Array<{ billingItemId: string; amount: number }> = []
      if (allocMode === 'manual') {
        // Manual: use user-specified amounts
        for (const c of charges) {
          const id = String(c._id || c.id || '')
          if (!allocSelected[id]) continue
          const allocAmt = Math.max(0, parseFloat(allocAmounts[id] || '0') || 0)
          if (allocAmt > 0) allocations.push({ billingItemId: id, amount: allocAmt })
        }
      } else {
        // Auto: distribute FIFO to selected charges (or all if none selected)
        const selectedIds = Object.keys(allocSelected).filter(k => allocSelected[k])
        const eligible = selectedIds.length > 0
          ? charges.filter((c: any) => allocSelected[String(c._id || c.id)])
          : charges
        let left = amt
        for (const c of eligible) {
          if (left <= 0) break
          const id = String(c._id || c.id || '')
          const remaining = Math.max(0, Number(c.amount || 0) - Number(c.paidAmount || 0))
          if (remaining <= 0) continue
          const take = Math.min(remaining, left)
          if (take > 0) {
            allocations.push({ billingItemId: id, amount: take })
            left -= take
          }
        }
      }
      
      const res: any = await hospitalApi.erCreatePayment(encounterId, { amount: amt, method, paymentMode: method, refNo, receivedBy: getReceptionUser(), portal, allocations } as any)
      const pay = res?.payment

      const [ch2, pay2, summary] = await Promise.all([
        hospitalApi.erListBillingItems(encounterId, { limit: 500 }) as any,
        hospitalApi.erListPayments(encounterId, { limit: 500 }) as any,
        hospitalApi.erBillingSummary(encounterId).catch(() => null) as any,
      ])
      setCharges(ch2?.items || [])
      setPayments(pay2?.payments || [])
      setBillingSummary(summary?.totals || null)
      setAllocSelected({})
      setAllocAmounts({})

      // Get fresh totals - use API response or billing summary
      const apiTotals = res?.totals
      const freshTotals = apiTotals || summary?.totals
      // Patient data from populated token
      const patient = token?.patientId || token || {}
      setSlipData({
        encounterId,
        patientName: patient?.fullName || token?.patientName || '-',
        mrn: patient?.mrn || token?.mrn || '',
        phone: patient?.phoneNormalized || patient?.phone || '',
        cnic: patient?.cnicNormalized || patient?.cnic || '',
        address: patient?.address || '',
        age: patient?.age || '',
        gender: patient?.gender || '',
        guardian: patient?.fatherName || patient?.guardianName || patient?.guardian || '',
        department: 'Emergency',
        tokenNo: token?.tokenNo || '',
        payment: { amount: Number(pay?.amount || amt), method: pay?.method || method, refNo: pay?.refNo || refNo, receivedAt: pay?.receivedAt || pay?.createdAt || new Date().toISOString() },
        totals: {
          total: typeof freshTotals?.grandTotal === 'number' ? freshTotals.grandTotal : (total || 0),
          paid: typeof freshTotals?.totalPaidToCharges === 'number' ? freshTotals.totalPaidToCharges : (paid || 0),
          pending: typeof freshTotals?.netOutstanding === 'number' ? freshTotals.netOutstanding : (netDue || 0),
          unallocatedAdvance: typeof freshTotals?.unallocatedAdvance === 'number' ? freshTotals.unallocatedAdvance : (advanceTotal || 0)
        },
      })
      setSlipOpen(true)

      setRefNo('')
      setCollectAmount('')
    }catch(e: any){
      setToast({ type: 'error', message: e?.message || 'Failed to record payment' })
    }
    setCollecting(false)
  }

  async function saveAdvance(d: { amount: number; method: string; refNo?: string; notes?: string }) {
    if (!tokenId || !encounterId) return
    const amt = Number(d.amount || 0)
    if (amt <= 0) { setToast({ type: 'error', message: 'Advance amount must be greater than 0' }); return }
    try {
      const portal = window.location.pathname.startsWith('/reception') ? 'reception' : 'hospital'
      const res: any = await hospitalApi.erCreatePayment(encounterId, {
        amount: amt,
        method: 'Advance',
        paymentMode: d.method,
        refNo: d.refNo || '',
        notes: d.notes || '',
        receivedBy: getReceptionUser(),
        portal
      } as any)
      const pay = res?.payment
      // Reload data to get fresh totals
      await loadToken(tokenId)
      setOpenAdvance(false)
      // Open print slip for advance
      const apiTotals = res?.totals
      const freshTotals = apiTotals || billingSummary
      const patient = token?.patientId || token || {}
      setSlipData({
        encounterId,
        patientName: patient?.fullName || token?.patientName || '-',
        mrn: patient?.mrn || token?.mrn || '',
        phone: patient?.phoneNormalized || patient?.phone || '',
        cnic: patient?.cnicNormalized || patient?.cnic || '',
        address: patient?.address || '',
        age: patient?.age || '',
        gender: patient?.gender || '',
        guardian: patient?.fatherName || patient?.guardianName || patient?.guardian || '',
        department: 'Emergency',
        tokenNo: token?.tokenNo || '',
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
    if (!tokenId || !encounterId) return
    const amt = Number(d.amount || 0)
    if (amt <= 0) { setToast({ type: 'error', message: 'Return amount must be greater than 0' }); return }
    if (amt > advanceTotal) { setToast({ type: 'error', message: 'Return amount cannot exceed available advance' }); return }
    try {
      const portal = window.location.pathname.startsWith('/reception') ? 'reception' : 'hospital'
      // Create a refund payment with type: 'refund'
      const res: any = await hospitalApi.erCreatePayment(encounterId, {
        amount: amt,
        type: 'refund',
        method: 'Advance Return',
        refNo: d.refNo || '',
        notes: d.notes || '',
        receivedBy: getReceptionUser(),
        portal
      } as any)
      const pay = res?.payment
      // Reload data to get fresh totals
      await loadToken(tokenId)
      setOpenReturnAdvance(false)
      // Open print slip for advance return
      const apiTotals = res?.totals
      const freshTotals = apiTotals || billingSummary
      const patient = token?.patientId || token || {}
      setSlipData({
        encounterId,
        patientName: patient?.fullName || token?.patientName || '-',
        mrn: patient?.mrn || token?.mrn || '',
        phone: patient?.phoneNormalized || patient?.phone || '',
        cnic: patient?.cnicNormalized || patient?.cnic || '',
        address: patient?.address || '',
        age: patient?.age || '',
        gender: patient?.gender || '',
        guardian: patient?.fatherName || patient?.guardianName || patient?.guardian || '',
        department: 'Emergency',
        tokenNo: token?.tokenNo || '',
        isAdvanceReturn: true,
        payment: { amount: amt, method: 'Advance Return', refNo: d.refNo, receivedAt: pay?.receivedAt || new Date().toISOString() },
        totals: {
          total: typeof freshTotals?.grandTotal === 'number' ? freshTotals.grandTotal : (total || 0),
          paid: typeof freshTotals?.totalPaidToCharges === 'number' ? freshTotals.totalPaidToCharges : (paid || 0),
          pending: typeof freshTotals?.netOutstanding === 'number' ? freshTotals.netOutstanding : (netDue || 0),
          unallocatedAdvance: typeof freshTotals?.unallocatedAdvance === 'number' ? freshTotals.unallocatedAdvance : (advanceTotal - amt || 0)
        },
      })
      setSlipOpen(true)
      setToast({ type: 'success', message: 'Advance returned successfully' })
    } catch (e: any) {
      setToast({ type: 'error', message: e?.message || 'Failed to return advance' })
    }
  }

  const patientName = token?.patientId?.fullName || token?.patientName || '-'
  const mrn = token?.patientId?.mrn || token?.mrn || ''
  const pendingLabel = pending <= 0 ? 'Rs 0.00' : currency(pending)

  return (
    <div className="space-y-4 p-4">
      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <div className="text-lg font-semibold">ER Billing</div>
        {/* Date Filters */}
        <div className="mt-3 flex flex-wrap items-end gap-3">
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-slate-600">From Date</label>
            <input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-slate-600">To Date</label>
            <input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>
          <div className="flex-1 min-w-[200px]">
            <label className="text-xs font-medium text-slate-600">Search (Name, MR No, Token No)</label>
            <input value={q} onChange={e=>setQ(e.target.value)} placeholder="Search by Token, MRN or Patient Name" className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" />
          </div>
          <button onClick={search} className="btn" disabled={loading}>{loading? 'Searching...' : 'Search'}</button>
        </div>

        <div className="mt-3 overflow-x-auto text-sm">
          <table className="min-w-full">
            <thead className="bg-slate-100/50 text-slate-700 border-b-2 border-slate-300">
              <tr>
                <th className="px-2 py-3 text-[13px] font-extrabold uppercase tracking-wider text-left">Patient</th>
                <th className="px-2 py-3 text-[13px] font-extrabold uppercase tracking-wider text-left">MRN</th>
                <th className="px-2 py-3 text-[13px] font-extrabold uppercase tracking-wider text-left">Token</th>
                <th className="px-2 py-3 text-[13px] font-extrabold uppercase tracking-wider text-left">Bed</th>
                <th className="px-2 py-3 text-[13px] font-extrabold uppercase tracking-wider text-left">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {list.length===0 ? (
                <tr><td colSpan={5} className="px-2 py-6 text-center text-slate-500">{loading ? 'Loading...' : 'No ER billing records found. Tokens will appear here once billing charges are added.'}</td></tr>
              ) : list.map(r => (
                <tr key={r.id}>
                  <td className="px-2 py-2">{r.patientName}</td>
                  <td className="px-2 py-2">{r.mrn}</td>
                  <td className="px-2 py-2 font-medium">{r.tokenNo}</td>
                  <td className="px-2 py-2">{formatBedLocation(r.bedLocation)}</td>
                  <td className="px-2 py-2"><button className="btn-outline-navy" onClick={()=>openCart(r.id)}>Collect</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div ref={panelRef} className={`rounded-xl border border-slate-200 bg-white p-4 ${flash ? 'ring-2 ring-emerald-300' : ''}`}>
        {!showPanel || !tokenId ? (
          <div className="text-sm text-slate-500">Select a patient/token above to open billing.</div>
        ) : !token ? (
          <div className="text-sm text-slate-500">Loading token...</div>
        ) : !encounterId ? (
          <div className="text-sm text-rose-600">No encounter found for this token.</div>
        ) : (
          <div className="space-y-3">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <div className="text-lg font-semibold">{patientName}</div>
                <div className="text-xs text-slate-500">{mrn ? `MRN: ${mrn} · ` : ''}Token: {token?.tokenNo || '-'}</div>
              </div>
              <div className="flex gap-4">
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

            <div className="grid gap-4 lg:grid-cols-2">
              <div className="rounded-xl border border-slate-200 p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="text-sm font-semibold">Charges</div>
                  <button onClick={() => setOpenCharge(true)} className="btn-sm py-1 px-3">Add Charge</button>
                </div>
                <div className="mt-2 overflow-x-auto text-sm">
                  <table className="min-w-full">
                    <thead className="bg-slate-100/50 text-slate-700 border-b-2 border-slate-300"><tr><th className="px-2 py-3 text-[13px] font-extrabold uppercase tracking-wider text-left">Charge</th><th className="px-2 py-3 text-[13px] font-extrabold uppercase tracking-wider text-right">Amount</th><th className="px-2 py-3 text-[13px] font-extrabold uppercase tracking-wider text-right">Remaining</th></tr></thead>
                    <tbody className="divide-y">
                      {charges.length===0 ? <tr><td colSpan={3} className="px-2 py-4 text-center text-slate-500">No charges</td></tr> : charges.map((c:any)=>{
                        const isFullyPaid = Number(c.remaining || 0) <= 0 && Number(c.paidAmount || 0) > 0
                        const isPartiallyPaid = Number(c.paidAmount || 0) > 0 && Number(c.remaining || 0) > 0
                        return (
                          <tr key={String(c._id||c.id)}>
                            <td className="px-2 py-1">
                              <div>{c.description || '-'}</div>
                              {isFullyPaid && <span className="inline-flex items-center rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-medium text-emerald-700">Paid</span>}
                              {isPartiallyPaid && <span className="inline-flex items-center rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-medium text-amber-700">Partial</span>}
                            </td>
                            <td className="px-2 py-1 text-right">{currency(Number(c.amount||0))}</td>
                            <td className="px-2 py-1 text-right">{currency(Number(c.remaining||0))}</td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="rounded-xl border border-slate-200 p-4">
                <div className="text-sm font-semibold">Collect Payment</div>
                <div className="mt-2 space-y-2 text-sm">
                  <div className="flex items-center justify-between">
                    <div className="text-slate-600">Pending</div>
                    <div className="font-semibold">{pendingLabel}</div>
                  </div>

                  <div>
                    <div className="text-xs text-slate-600">Method</div>
                    <select value={method} onChange={e=>setMethod(e.target.value)} className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2">
                      <option>Cash</option>
                      <option>Bank</option>
                    </select>
                  </div>
                  <div>
                    <div className="text-xs text-slate-600">Reference / Notes</div>
                    <input value={refNo} onChange={e=>setRefNo(e.target.value)} className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2" placeholder="Txn # / Notes" />
                  </div>
                  <div>
                    <div className="text-xs text-slate-600">Collect Amount</div>
                    <input type="number" value={collectAmount} onChange={e=>setCollectAmount(e.target.value)} className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2" />
                  </div>

                  <div className="rounded-md border border-slate-200 bg-slate-50 p-2">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="text-xs font-semibold text-slate-700">Apply payment to charges</div>
                      <div className="flex items-center gap-2">
                        <button type="button" onClick={()=>setAllocMode('auto')} className={allocMode==='auto' ? 'btn-outline-navy text-xs py-1 px-2' : 'rounded-md border border-slate-300 bg-white px-2 py-1 text-xs'}>Auto</button>
                        <button type="button" onClick={()=>setAllocMode('manual')} className={allocMode==='manual' ? 'btn-outline-navy text-xs py-1 px-2' : 'rounded-md border border-slate-300 bg-white px-2 py-1 text-xs'}>Manual</button>
                      </div>
                    </div>
                    <div className="mt-2 max-h-40 overflow-auto">
                      {(charges || []).map((c:any)=>{
                        const id = String(c?._id||c.id||'')
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

                  <div className="flex gap-2">
                    <button onClick={collect} disabled={collecting || pending<=0} className="btn flex-1 disabled:opacity-50">{collecting? 'Saving...' : `Collect Payment`}</button>
                  </div>

                  <div className="pt-2">
                    <div className="text-sm font-semibold">Previous Payments</div>
                    <div className="mt-2 overflow-x-auto">
                      <table className="min-w-full text-sm">
                        <thead className="bg-slate-100/50 text-slate-700 border-b-2 border-slate-300"><tr><th className="px-2 py-3 text-[13px] font-extrabold uppercase tracking-wider text-left">Date</th><th className="px-2 py-3 text-[13px] font-extrabold uppercase tracking-wider text-left">Method</th><th className="px-2 py-3 text-[13px] font-extrabold uppercase tracking-wider text-left">Performed By</th><th className="px-2 py-3 text-[13px] font-extrabold uppercase tracking-wider text-right">Amount</th></tr></thead>
                        <tbody className="divide-y">
                          {payments.length===0 ? <tr><td colSpan={4} className="px-2 py-4 text-center text-slate-500">None</td></tr> : payments.map((p:any)=>(
                            <tr key={String(p._id||p.id)}>
                              <td className="px-2 py-1">{fmtDateTime12(p.receivedAt||p.createdAt||new Date().toISOString())}</td>
                              <td className="px-2 py-1">{p.method || '-'}</td>
                              <td className="px-2 py-1">{p.createdByUsername || p.createdBy || '-'}</td>
                              <td className="px-2 py-1 text-right">{currency(Number(p.amount||0))}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      <Hospital_ErPaymentSlip
        open={slipOpen}
        onClose={()=>setSlipOpen(false)}
        data={slipData || { encounterId: '', patientName: '', payment: { amount: 0 }, totals: { total: 0, paid: 0, pending: 0 } }}
        autoPrint
      />

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

      {openCharge && (
        <ChargeDialog 
          open={openCharge} 
          onClose={() => setOpenCharge(false)} 
          svcCatalog={svcCatalog}
          onSave={async (d) => {
            if (!encounterId) return
            try {
              const res: any = await hospitalApi.createErCharge(encounterId, { description: d.description, qty: d.qty, unitPrice: d.unitPrice, billedBy: 'reception' })
              setOpenCharge(false)
              // API now returns updated totals with auto-allocated advances
              if (res?.totals) {
                setBillingSummary(res.totals)
              }
              await loadToken(tokenId)
              setToast({ type: 'success', message: 'Charge added' })
            } catch (e: any) {
              setToast({ type: 'error', message: e?.message || 'Failed to add charge' })
            }
          }}
          billingFormRef={panelRef}
        />
      )}

      <Toast toast={toast} onClose={()=>setToast(null)} />
    </div>
  )
}

function ChargeDialog({ open, onClose, onSave, svcCatalog, billingFormRef }: { open: boolean; onClose: ()=>void; onSave: (d: { description: string; qty: number; unitPrice: number })=>void; svcCatalog: any[]; billingFormRef: React.RefObject<HTMLDivElement | null> }){
  if(!open) return null
  const submit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    onSave({ 
      description: String(fd.get('description')||''), 
      qty: Number(fd.get('qty')||1),
      unitPrice: parseFloat(String(fd.get('unitPrice')||'0')) || 0 
    })
  }
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <form onSubmit={submit} className="w-full max-w-md overflow-hidden rounded-xl bg-white shadow-2xl ring-1 ring-black/5">
        <div className="border-b border-slate-200 px-5 py-3 font-semibold text-slate-800">Add Charge</div>
        <div className="space-y-3 px-5 py-4 text-sm">
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Service</label>
            <ServiceSelect
              svcCatalog={svcCatalog}
              onSelect={(svc) => {
                const form = billingFormRef.current?.querySelector('form')
                if (!form) return
                const rateEl = form.querySelector<HTMLInputElement>('input[name="unitPrice"]')
                if (rateEl) rateEl.value = String(svc.price || 0)
              }}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-600">Qty</label>
              <input name="qty" type="number" defaultValue={1} className="w-full rounded-md border border-slate-300 px-3 py-2" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600">Rate</label>
              <input name="unitPrice" type="number" step="0.01" defaultValue={0} className="w-full rounded-md border border-slate-300 px-3 py-2" />
            </div>
          </div>
        </div>
        <div className="flex items-center justify-end gap-2 border-t border-slate-200 px-5 py-3">
          <button type="button" onClick={onClose} className="btn-outline-navy">Cancel</button>
          <button type="submit" className="btn">Add</button>
        </div>
      </form>
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
            {['Cash','Bank'].map(m => (<option key={m} value={m}>{m}</option>))}
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
        <div className="border-b border-slate-200 px-5 py-3 font-semibold text-rose-700">Return Advance</div>
        <div className="space-y-3 px-5 py-4 text-sm">
          <div className="rounded-lg bg-rose-50 p-3 text-xs text-rose-700">
            Available Advance: <span className="font-bold">Rs {maxAmount.toFixed(2)}</span>
          </div>

          <label htmlFor="ret-amount" className="block text-xs font-medium text-slate-600">Return Amount</label>
          <input 
            id="ret-amount" 
            name="amount" 
            type="number" 
            step="0.01" 
            max={maxAmount}
            placeholder={`Max: ${maxAmount.toFixed(2)}`} 
            className="w-full rounded-md border border-slate-300 px-3 py-2" 
          />

          <label htmlFor="ret-method" className="block text-xs font-medium text-slate-600">Return Method</label>
          <select id="ret-method" name="method" className="w-full rounded-md border border-slate-300 px-3 py-2">
            {['Cash','Bank'].map(m => (<option key={m} value={m}>{m}</option>))}
          </select>

          <label htmlFor="ret-ref" className="block text-xs font-medium text-slate-600">Ref No</label>
          <input id="ret-ref" name="refNo" placeholder="optional" className="w-full rounded-md border border-slate-300 px-3 py-2" />

          <label htmlFor="ret-notes" className="block text-xs font-medium text-slate-600">Notes</label>
          <input id="ret-notes" name="notes" placeholder="optional" className="w-full rounded-md border border-slate-300 px-3 py-2" />
        </div>
        <div className="flex items-center justify-end gap-2 border-t border-slate-200 px-5 py-3">
          <button type="button" onClick={onClose} className="btn-outline-navy">Cancel</button>
          <button type="submit" className="btn bg-rose-600 hover:bg-rose-700">Return Advance</button>
        </div>
      </form>
    </div>
  )
}
