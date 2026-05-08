import { useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { 
  Search, Users, Wallet, CreditCard, Plus, 
  Minus, Receipt, History, User, CheckCircle, Clock,
  Tag
} from 'lucide-react'
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
  const [_showPanel, setShowPanel] = useState<boolean>(!!preEncounterId)
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

  const [activeTab, setActiveTab] = useState<'queue' | 'billing'>('queue')

  return (
    <div className="min-h-screen bg-[#F8FAFC] p-4 lg:p-8 font-['Poppins',sans-serif]">
      {/* Page Header */}
      <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">IPD Revenue Center</h1>
          <p className="text-sm font-medium text-slate-500">Collect payments, manage advances & view billing history</p>
        </div>
        
        {/* Eye-catching Tabs */}
        <div className="inline-flex items-center gap-1 rounded-2xl bg-white p-1.5 shadow-sm ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800">
          <button 
            onClick={() => setActiveTab('queue')}
            className={`flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-bold transition-all ${activeTab === 'queue' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200 dark:shadow-none' : 'text-slate-500 hover:bg-slate-50'}`}
          >
            <Users size={18} />
            Patient Queue
          </button>
          <button 
            onClick={() => setActiveTab('billing')}
            className={`flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-bold transition-all ${activeTab === 'billing' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200 dark:shadow-none' : 'text-slate-500 hover:bg-slate-50'}`}
          >
            <Wallet size={18} />
            Billing Terminal
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-8">
        {activeTab === 'queue' && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-300">
            <div className="rounded-3xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900 overflow-hidden">
              <div className="border-b border-slate-100 p-6 dark:border-slate-800">
                <div className="relative group">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors">
                    <Search size={20} />
                  </div>
                  <input 
                    value={q} 
                    onChange={e => setQ(e.target.value)} 
                    placeholder="Search admitted patients by MRN, Name or Admission No..." 
                    className="w-full rounded-2xl border-2 border-slate-50 bg-slate-50/50 py-4 pl-12 pr-4 text-sm font-semibold outline-none transition-all focus:border-indigo-400 focus:bg-white dark:border-slate-800 dark:bg-slate-800/50 dark:focus:bg-slate-900" 
                  />
                  <button 
                    onClick={search} 
                    className="absolute right-3 top-1/2 -translate-y-1/2 rounded-xl bg-indigo-600 px-6 py-2 text-xs font-black uppercase tracking-widest text-white transition-all hover:bg-indigo-700 active:scale-95 disabled:opacity-50" 
                    disabled={loading}
                  >
                    {loading ? 'Searching...' : 'Refresh'}
                  </button>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="bg-slate-50/50 text-slate-500 dark:bg-slate-800/50">
                    <tr>
                      <th className="px-6 py-4 text-[11px] font-black uppercase tracking-[0.15em]">Patient Identity</th>
                      <th className="px-6 py-4 text-[11px] font-black uppercase tracking-[0.15em]">Admission Details</th>
                      <th className="px-6 py-4 text-[11px] font-black uppercase tracking-[0.15em]">Location</th>
                      <th className="px-6 py-4 text-[11px] font-black uppercase tracking-[0.15em] text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {list.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="px-6 py-12 text-center text-slate-400">
                          <Users size={48} className="mx-auto mb-4 opacity-10" />
                          <p className="font-bold">No admitted patients found</p>
                        </td>
                      </tr>
                    ) : (
                      list.map(r => (
                        <tr key={r.id} className="group hover:bg-slate-50/80 transition-colors dark:hover:bg-slate-800/30">
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <div className="h-10 w-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold dark:bg-indigo-900/30 dark:text-indigo-400">
                                {r.info?.[0]}
                              </div>
                              <div>
                                <div className="text-sm font-bold text-slate-900 dark:text-white">{r.info}</div>
                                <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">#{r.id.slice(-6)}</div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="text-sm font-bold text-slate-700 dark:text-slate-300">{r.admissionNo}</div>
                            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">Doctor: {r.doctor}</div>
                          </td>
                          <td className="px-6 py-4">
                            <span className="inline-flex items-center rounded-lg bg-sky-50 px-2.5 py-1 text-[10px] font-black uppercase tracking-widest text-sky-700 ring-1 ring-inset ring-sky-700/10 dark:bg-sky-900/20 dark:text-sky-400">
                              Bed: {r.bed}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <button 
                              className="rounded-xl bg-white px-4 py-2 text-xs font-black uppercase tracking-widest text-indigo-600 shadow-sm ring-1 ring-inset ring-indigo-200 transition-all hover:bg-indigo-600 hover:text-white hover:shadow-indigo-200 active:scale-95 dark:bg-slate-900 dark:ring-slate-700" 
                              onClick={() => { openCart(r.id); setActiveTab('billing'); }}
                            >
                              Open Billing
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'billing' && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-300">
            {!enc ? (
              <div className="rounded-3xl border-2 border-dashed border-slate-200 p-20 text-center dark:border-slate-800">
                <Wallet size={64} className="mx-auto mb-6 text-slate-200" />
                <h3 className="text-xl font-black text-slate-900 dark:text-white">Terminal Standby</h3>
                <p className="mx-auto mt-2 max-w-xs text-sm font-medium text-slate-500">Please select a patient from the queue to start a billing session</p>
                <button onClick={() => setActiveTab('queue')} className="mt-8 rounded-2xl bg-indigo-600 px-8 py-3 text-sm font-black uppercase tracking-widest text-white shadow-xl shadow-indigo-100 transition-all hover:bg-indigo-700 hover:shadow-indigo-200">Return to Queue</button>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
                {/* Billing Summary Bar */}
                <div className="lg:col-span-12">
                  <div ref={panelRef} className={`rounded-4xl bg-slate-900 p-8 text-white shadow-2xl transition-all duration-500 overflow-hidden relative ${flash ? 'ring-4 ring-indigo-500' : ''}`}>
                    {/* Decorative Background */}
                    <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-600 rounded-full blur-[100px] opacity-20 -mr-32 -mt-32"></div>
                    <div className="absolute bottom-0 left-0 w-64 h-64 bg-violet-600 rounded-full blur-[100px] opacity-20 -ml-32 -mb-32"></div>

                    <div className="relative flex flex-wrap items-center justify-between gap-6">
                      <div className="flex items-center gap-4">
                        <div className="h-16 w-16 rounded-2xl bg-white/10 backdrop-blur-md flex items-center justify-center border border-white/10">
                          <User size={32} className="text-indigo-400" />
                        </div>
                        <div>
                          <h2 className="text-2xl font-black tracking-tight">{enc?.patientId?.fullName || '-'}</h2>
                          <div className="flex items-center gap-3 mt-1">
                            <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">MRN: {enc?.patientId?.mrn || '-'}</span>
                            <span className="h-1 w-1 rounded-full bg-slate-600"></span>
                            <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Admission: {enc?.admissionNo || '-'}</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-4">
                        <div className="rounded-2xl bg-white/5 p-4 border border-white/10 min-w-[140px]">
                          <div className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Total Bill</div>
                          <div className="text-xl font-black tabular-nums">{currency(total)}</div>
                        </div>
                        <div className="rounded-2xl bg-indigo-500/10 p-4 border border-indigo-500/20 min-w-[140px]">
                          <div className="text-[10px] font-black uppercase tracking-widest text-indigo-400 mb-1">Advance</div>
                          <div className="text-xl font-black tabular-nums text-indigo-400">{currency(advanceTotal)}</div>
                        </div>
                        <div className="rounded-2xl bg-emerald-500/10 p-4 border border-emerald-500/20 min-w-[140px]">
                          <div className="text-[10px] font-black uppercase tracking-widest text-emerald-400 mb-1">Total Paid</div>
                          <div className="text-xl font-black tabular-nums text-emerald-400">{currency(paid)}</div>
                        </div>
                        <div className="rounded-2xl bg-rose-500/10 p-4 border border-rose-500/20 min-w-[140px]">
                          <div className="text-[10px] font-black uppercase tracking-widest text-rose-400 mb-1">Net Outstanding</div>
                          <div className="text-xl font-black tabular-nums text-rose-400">{currency(netDue)}</div>
                        </div>
                        
                        <div className="flex flex-col gap-2 ml-4">
                          <button onClick={() => setOpenAdvance(true)} className="flex items-center gap-2 rounded-xl bg-white px-5 py-2.5 text-xs font-black uppercase tracking-widest text-slate-900 transition-all hover:bg-indigo-50 hover:shadow-lg hover:shadow-indigo-500/20 active:scale-95">
                            <Plus size={16} /> Add Advance
                          </button>
                          {advanceTotal > 0 && (
                            <button onClick={() => setOpenReturnAdvance(true)} className="flex items-center gap-2 rounded-xl bg-white/10 px-5 py-2.5 text-xs font-black uppercase tracking-widest text-rose-400 border border-white/10 transition-all hover:bg-rose-500/10 active:scale-95">
                              <Minus size={16} /> Refund
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Left: Charges Details */}
                <div className="lg:col-span-7">
                  <div className="rounded-3xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900 overflow-hidden">
                    <div className="border-b border-slate-100 p-6 flex items-center justify-between dark:border-slate-800">
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center dark:bg-amber-900/30 dark:text-amber-400">
                          <Receipt size={18} />
                        </div>
                        <h3 className="text-base font-bold text-slate-800 dark:text-slate-100">Billed Services</h3>
                      </div>
                      <span className="px-3 py-1 bg-slate-50 dark:bg-slate-800 rounded-lg text-[10px] font-black text-slate-400 uppercase tracking-widest">{charges.length} Items</span>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-sm">
                        <thead className="bg-slate-50/50 text-slate-500 dark:bg-slate-800/50">
                          <tr>
                            <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest">Service Description</th>
                            <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-right">Amount</th>
                            <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-right">Unpaid</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                          {charges.length === 0 ? (
                            <tr><td colSpan={3} className="px-6 py-12 text-center text-slate-400 font-medium">No charges recorded yet</td></tr>
                          ) : (
                            charges.map((c: any) => (
                              <tr key={String(c._id)} className="hover:bg-slate-50/50 transition-colors">
                                <td className="px-6 py-4">
                                  <div className="font-bold text-slate-800 dark:text-slate-200">{c.description}</div>
                                  <div className="text-[10px] font-bold text-slate-400 uppercase mt-0.5">{fmtDateTime12(c.createdAt)}</div>
                                </td>
                                <td className="px-6 py-4 text-right font-bold text-slate-900 dark:text-white">{currency(Number(c.amount || 0))}</td>
                                <td className="px-6 py-4 text-right">
                                  <span className={`font-black tabular-nums ${Number(c.remaining || 0) > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                                    {currency(Number(c.remaining != null ? c.remaining : Math.max(0, Number(c.amount || 0) - Number(c.paidAmount || 0))))}
                                  </span>
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                        {charges.length > 0 && (
                          <tfoot className="bg-slate-50 dark:bg-slate-800/50 border-t-2 border-slate-100 dark:border-slate-800">
                            <tr>
                              <th className="px-6 py-4 text-xs font-black uppercase tracking-widest text-slate-500">Gross Total</th>
                              <th colSpan={2} className="px-6 py-4 text-right text-lg font-black text-slate-900 dark:text-white">{currency(total)}</th>
                            </tr>
                          </tfoot>
                        )}
                      </table>
                    </div>
                  </div>

                  {/* Previous Payments History */}
                  <div className="mt-8 rounded-3xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900 overflow-hidden">
                    <div className="border-b border-slate-100 p-6 flex items-center gap-3 dark:border-slate-800">
                      <div className="h-8 w-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center dark:bg-emerald-900/30 dark:text-emerald-400">
                        <History size={18} />
                      </div>
                      <h3 className="text-base font-bold text-slate-800 dark:text-slate-100">Transaction History</h3>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-sm">
                        <thead className="bg-slate-50/50 text-slate-500 dark:bg-slate-800/50">
                          <tr>
                            <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest">Timestamp</th>
                            <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest">Type</th>
                            <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest">User</th>
                            <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-right">Amount</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                          {payments.length === 0 ? (
                            <tr><td colSpan={4} className="px-6 py-12 text-center text-slate-400 font-medium">No transactions yet</td></tr>
                          ) : (
                            payments.map((p: any) => (
                              <tr key={String(p._id)} className="hover:bg-slate-50/50 transition-colors">
                                <td className="px-6 py-4 text-[11px] font-bold text-slate-500">{fmtDateTime12(p.receivedAt || p.createdAt || '')}</td>
                                <td className="px-6 py-4">
                                  <div className="flex items-center gap-2">
                                    <span className={`h-2 w-2 rounded-full ${p.method === 'Discount' ? 'bg-amber-500' : 'bg-emerald-500'}`}></span>
                                    <span className="font-bold text-slate-700 dark:text-slate-300">{p.method || '-'}</span>
                                  </div>
                                  <div className="text-[10px] font-bold text-slate-400 uppercase mt-0.5">{p.refNo || 'N/A'}</div>
                                </td>
                                <td className="px-6 py-4 text-[11px] font-black uppercase text-slate-400">{p.createdByUsername || p.createdBy || '-'}</td>
                                <td className="px-6 py-4 text-right font-black text-slate-900 dark:text-white">{currency(Number(p.amount || 0))}</td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>

                {/* Right: Payment Terminal */}
                <div className="lg:col-span-5">
                  <div className="sticky top-28 space-y-6">
                    <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                      <div className="mb-6 flex items-center gap-3">
                        <div className="h-10 w-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center dark:bg-indigo-900/30 dark:text-indigo-400">
                          <CreditCard size={20} />
                        </div>
                        <h3 className="text-lg font-bold text-slate-900 dark:text-white">Collect Payment</h3>
                      </div>

                      <div className="space-y-6">
                        <div className="grid grid-cols-2 gap-4">
                          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 dark:bg-slate-800 dark:border-slate-700">
                            <div className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Outstanding</div>
                            <div className="text-xl font-black tabular-nums text-slate-900 dark:text-white">{currency(pending)}</div>
                          </div>
                          <div className="p-4 rounded-2xl bg-indigo-50/50 border border-indigo-100 dark:bg-indigo-900/20 dark:border-indigo-800">
                            <div className="text-[10px] font-black uppercase tracking-widest text-indigo-500 mb-1">Due After Disc.</div>
                            <div className="text-xl font-black tabular-nums text-indigo-600 dark:text-indigo-400">{currency(pendingAfterDiscount)}</div>
                          </div>
                        </div>

                        <div className="space-y-4">
                          <div className="group">
                            <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-2 px-1 flex items-center gap-2">
                              <Tag size={12} className="text-amber-500" /> Apply Discount
                            </label>
                            <input 
                              value={discount} 
                              onChange={(e) => { 
                                const v = e.target.value; 
                                setDiscount(v); 
                                const n = Math.max(0, parseFloat(v || '0') || 0); 
                                const after = Math.max(0, pending - n); 
                                setCollectAmount(after.toFixed(2)) 
                              }} 
                              placeholder="0.00" 
                              className="w-full rounded-2xl border-2 border-slate-100 bg-slate-50/50 py-3.5 px-4 text-sm font-bold outline-none transition-all focus:border-indigo-400 focus:bg-white dark:bg-slate-800 dark:border-slate-800" 
                            />
                          </div>

                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest mb-2 px-1">Payment Method</label>
                              <select value={method} onChange={e=>setMethod(e.target.value)} className="w-full rounded-2xl border-2 border-slate-100 bg-slate-50/50 py-3.5 px-4 text-sm font-bold outline-none cursor-pointer focus:border-indigo-400 dark:bg-slate-800 dark:border-slate-800">
                                <option>Cash</option>
                                <option>Card</option>
                                <option>Online</option>
                              </select>
                            </div>
                            <div>
                              <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest mb-2 px-1">Reference / Note</label>
                              <input value={refNo} onChange={e=>setRefNo(e.target.value)} placeholder="Txn # / Note" className="w-full rounded-2xl border-2 border-slate-100 bg-slate-50/50 py-3.5 px-4 text-sm font-bold outline-none focus:border-indigo-400 dark:bg-slate-800 dark:border-slate-800" />
                            </div>
                          </div>

                          <div>
                            <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest mb-2 px-1">Collection Amount (PKR)</label>
                            <div className="relative group">
                              <div className="absolute left-4 top-1/2 -translate-y-1/2 font-bold text-slate-400 group-focus-within:text-emerald-600">Rs</div>
                              <input 
                                value={collectAmount} 
                                onChange={e=>setCollectAmount(e.target.value)} 
                                placeholder={pendingAfterDiscount.toFixed(2)} 
                                className="w-full rounded-2xl border-2 border-emerald-100 bg-emerald-50/20 py-5 pl-10 pr-4 text-2xl font-black tabular-nums text-emerald-600 outline-none transition-all focus:border-emerald-500 focus:bg-white dark:bg-emerald-900/10 dark:border-emerald-900/30" 
                              />
                            </div>
                          </div>
                        </div>

                        {/* Allocation Settings */}
                        <div className="rounded-2xl bg-slate-50 p-6 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
                          <div className="flex items-center justify-between mb-4">
                            <div className="text-[11px] font-black uppercase tracking-widest text-slate-500">Allocation Mode</div>
                            <div className="flex bg-white rounded-xl p-1 shadow-sm ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800">
                              <button type="button" onClick={()=>setAllocMode('auto')} className={`px-4 py-1.5 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all ${allocMode==='auto' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-600'}`}>Auto</button>
                              <button type="button" onClick={()=>setAllocMode('manual')} className={`px-4 py-1.5 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all ${allocMode==='manual' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-600'}`}>Manual</button>
                            </div>
                          </div>
                          
                          <div className="max-h-48 overflow-y-auto space-y-2 pr-2 custom-scrollbar">
                            {(charges || []).map((c:any)=>{
                              const id = String(c?._id||'')
                              const remaining = Math.max(0, Number(c.remaining != null ? c.remaining : (Number(c.amount||0)-Number(c.paidAmount||0))) || 0)
                              if (!id) return null
                              const disabled = remaining <= 0
                              return (
                                <div key={id} className={`flex items-center gap-3 p-2 rounded-xl transition-all ${allocSelected[id] ? 'bg-white dark:bg-slate-900 shadow-sm ring-1 ring-slate-100 dark:ring-slate-800' : 'opacity-60'}`}>
                                  <input type="checkbox" checked={!!allocSelected[id]} disabled={disabled} onChange={e=> setAllocSelected(prev=> ({ ...prev, [id]: e.target.checked }))} className="w-4 h-4 rounded-lg accent-indigo-600" />
                                  <div className="min-w-0 flex-1">
                                    <div className="text-[11px] font-bold truncate text-slate-800 dark:text-slate-200 uppercase">{String(c.description||'')}</div>
                                    <div className="text-[10px] font-bold text-slate-400">Unpaid: {currency(remaining)}</div>
                                  </div>
                                  {allocMode === 'manual' && (
                                    <input
                                      disabled={disabled || !allocSelected[id]}
                                      value={allocAmounts[id] ?? ''}
                                      onChange={e=> setAllocAmounts(prev=> ({ ...prev, [id]: e.target.value }))}
                                      className="w-20 rounded-lg border-2 border-slate-100 bg-slate-50 py-1.5 px-2 text-right text-xs font-black outline-none focus:border-indigo-400 dark:bg-slate-800 dark:border-slate-800"
                                      placeholder="0"
                                    />
                                  )}
                                </div>
                              )
                            })}
                          </div>
                          
                          <p className="mt-4 text-[9px] font-bold text-slate-400 uppercase tracking-widest leading-relaxed">
                            {allocMode === 'auto' ? '• System will distribute amount FIFO among selected items' : '• Manually specify how much to pay for each selected item'}
                          </p>
                        </div>

                        <button 
                          className="w-full rounded-2xl bg-indigo-600 py-5 text-sm font-black uppercase tracking-[0.2em] text-white shadow-xl shadow-indigo-100 transition-all hover:bg-indigo-700 hover:shadow-indigo-200 active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-3" 
                          disabled={(pending<=0) || collecting || ((parseFloat(collectAmount||'0')||0) <= 0 && (parseFloat(discount||'0')||0) <= 0)} 
                          onClick={collect}
                        >
                          {collecting ? <Clock className="animate-spin" size={20} /> : <CheckCircle size={20} />}
                          {collecting ? 'Processing...' : `Post Payment • ${currency(Math.max(0, parseFloat(String(collectAmount||'0'))||0))}`}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <Toast toast={toast} onClose={()=>setToast(null)} />
      
      {openAdvance && <AdvanceDialog open={openAdvance} onClose={()=>setOpenAdvance(false)} onSave={saveAdvance} />}
      {openReturnAdvance && <ReturnAdvanceDialog open={openReturnAdvance} onClose={()=>setOpenReturnAdvance(false)} onSave={returnAdvance} maxAmount={advanceTotal} />}

      <Hospital_IpdPaymentSlip
        open={slipOpen}
        onClose={()=>setSlipOpen(false)}
        data={slipData || { encounterId: '', patientName: '', payment: { amount: 0 }, totals: { total: 0, paid: 0, pending: 0 } }}
        autoPrint
      />
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
