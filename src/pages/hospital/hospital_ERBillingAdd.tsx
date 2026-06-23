import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { hospitalApi } from '../../utils/api'
import { getLocalDate } from '../../utils/date'
import Hospital_ErPaymentSlip from '../../components/hospital/Hospital_ErPaymentSlip'

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
        <div className="absolute z-100 mt-1 max-h-48 w-full min-w-[200px] overflow-y-auto rounded-md border border-slate-200 bg-white py-1 shadow-xl">
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

type BedLocation = {
  floor: string
  type: 'room' | 'ward'
  location: string
  bed: string
}

function DoctorSelect({ doctors, onSelect, initialValue = '' }: { doctors: any[], onSelect: (doc: any) => void, initialValue?: string }) {
  const [q, setQ] = useState(initialValue)
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  const filtered = useMemo(() => {
    const s = q.toLowerCase().trim()
    if (!s) return doctors
    return doctors.filter(doc => (doc.name || '').toLowerCase().includes(s))
  }, [doctors, q])

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
        value={q}
        autoComplete="off"
        onChange={e => { setQ(e.target.value); setOpen(true) }}
        onFocus={() => setOpen(true)}
        placeholder="Search doctor..."
        className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
      />
      {open && filtered.length > 0 && (
        <div className="absolute z-100 mt-1 max-h-48 w-full min-w-[200px] overflow-y-auto rounded-md border border-slate-200 bg-white py-1 shadow-xl">
          {filtered.map(doc => (
            <button
              key={doc.id || doc._id}
              type="button"
              className="w-full px-3 py-2 text-left hover:bg-slate-50 focus:bg-slate-50 focus:outline-none"
              onClick={() => {
                onSelect(doc)
                setQ(doc.name)
                setOpen(false)
              }}
            >
              <span className="text-sm font-medium text-slate-900">{doc.name}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

function formatBedLocation(bedLoc?: BedLocation) {
  if (!bedLoc) return '-'
  return `${bedLoc.floor} / ${bedLoc.location} / Bed: ${bedLoc.bed}`
}

export default function Hospital_ERBilling() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  
  const urlEncounterId = String(id || searchParams.get('encounter') || '')
  const [availableEncounters, setAvailableEncounters] = useState<any[]>([])
  const [loadingEncounters, setLoadingEncounters] = useState(false)

  // Date filters - default to empty (reset)
  const [fromDate, setFromDate] = useState<string>('')
  const [toDate, setToDate] = useState<string>('')
  
  // Patient search query
  const [searchQuery, setSearchQuery] = useState<string>('')

  const encounterIdFromUrl = urlEncounterId

  const [openCharge, setOpenCharge] = useState(false)
  const [editCharge, setEditCharge] = useState<null | { id: string; description: string; qty: number; unitPrice: number }>(null)
  const [openCollectPayment, setOpenCollectPayment] = useState<null | { id: string; description: string; remaining: number }>(null)
  const [openAdvance, setOpenAdvance] = useState(false)

  const [slipOpen, setSlipOpen] = useState(false)
  const [slipData, setSlipData] = useState<any | null>(null)

  const [loadingEnc, setLoadingEnc] = useState(false)
  const [encounterId, setEncounterId] = useState<string>('')
  const [fullPatient, setFullPatient] = useState<any>(null)
  const [tokenData, setTokenData] = useState<any>(null)
  const [mrn, setMrn] = useState<string>('')
  const [patientName, setPatientName] = useState<string>('')
  const [tokenNo, setTokenNo] = useState<string>('')
  const [charges, setCharges] = useState<Array<{ id: string; description: string; qty: number; unitPrice: number; amount: number; paidAmount: number; date?: string }>>([])
  const [loadingCharges, setLoadingCharges] = useState(false)
  const [payments, setPayments] = useState<any[]>([])

  const [svcCatalog, setSvcCatalog] = useState<Array<{ id: string; name: string; price: number }>>([])

  const [toast, setToast] = useState<{ type: 'success'|'error'|'info'; message: string } | null>(null)
  const [confirmDel, setConfirmDel] = useState<{ open: boolean; chargeId: string } | null>(null)

  const [erDepartmentId, setErDepartmentId] = useState<string>('')
  const [openDoctorService, setOpenDoctorService] = useState(false)
  const [doctors, setDoctors] = useState<Array<{ id: string; name: string }>>([])

  useEffect(() => {
    let cancelled = false
    async function loadDoctors() {
      try {
        const res: any = await hospitalApi.listDoctors({ active: true, limit: 500 })
        const rows: any[] = res?.doctors || res || []
        if (cancelled) return
        setDoctors(rows.map((d: any) => ({ id: String(d._id || d.id), name: String(d.name || '') })))
      } catch {
        if (!cancelled) setDoctors([])
      }
    }
    loadDoctors()
    return () => { cancelled = true }
  }, [])

  useEffect(() => {
    let cancelled = false
    async function loadErDept() {
      try {
        const deps: any = await hospitalApi.listDepartments({ limit: 1000 })
        const list: any[] = deps?.departments || deps || []
        const er = list.find((d: any) => String(d?.name || '').trim().toLowerCase() === 'emergency')
        if (!cancelled && er) setErDepartmentId(String(er._id || er.id))
      } catch {}
    }
    loadErDept()
    return () => { cancelled = true }
  }, [])

  useEffect(() => {
    if (!urlEncounterId && erDepartmentId) {
      loadEncounters()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [urlEncounterId, erDepartmentId])

  async function loadEncounters() {
    if (!erDepartmentId) return
    setLoadingEncounters(true)
    try {
      const res: any = await hospitalApi.listEREncounters({
        status: 'in-progress',
        departmentId: erDepartmentId,
        from: fromDate || undefined,
        to: toDate || undefined,
        limit: 500
      })
      
      let encounters = res?.encounters || []
      setAvailableEncounters(encounters)
    } catch {
      setAvailableEncounters([])
    } finally {
      setLoadingEncounters(false)
    }
  }

  // Filtered encounters based on search query
  const filteredEncounters = useMemo(() => {
    if (!searchQuery.trim()) return availableEncounters
    const q = searchQuery.toLowerCase().trim()
    return availableEncounters.filter((enc: any) => {
      const patientName = String(enc.patientId?.fullName || enc.patientName || '').toLowerCase()
      const mrn = String(enc.patientId?.mrn || enc.mrn || '').toLowerCase()
      const tokenNo = String(enc.tokenId?.tokenNo || enc.tokenNo || '').toLowerCase()
      return patientName.includes(q) || mrn.includes(q) || tokenNo.includes(q)
    })
  }, [availableEncounters, searchQuery])

  useEffect(() => {
    if (!toast) return
    const t = window.setTimeout(() => setToast(null), 3000)
    return () => window.clearTimeout(t)
  }, [toast])

  useEffect(() => {
    let cancelled = false
    async function load(){
      if (!encounterIdFromUrl) return
      setLoadingEnc(true)
      try{
        const res: any = await hospitalApi.getEREncounterById(encounterIdFromUrl)
        const enc: any = res?.encounter
        const patient = enc?.patientId || {}
        const token = enc?.tokenId || {}
        if (!cancelled){
          setEncounterId(String(enc?._id || ''))
          setFullPatient(patient)
          setTokenData(token)
          setMrn(String(patient.mrn || enc?.mrn || ''))
          setPatientName(String(patient.fullName || patient.name || enc?.patientName || ''))
          setTokenNo(String(token.tokenNo || enc?.tokenNo || ''))
        }
      }catch{
        if (!cancelled){ setEncounterId(''); setMrn(''); setPatientName(''); setTokenNo('') }
      }finally{
        if (!cancelled) setLoadingEnc(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [encounterIdFromUrl])

  async function reloadCharges(){
    if (!encounterId) { setCharges([]); return }
    setLoadingCharges(true)
    try{
      const res: any = await hospitalApi.listErCharges(encounterId, { limit: 200 })
      const rows: any[] = res?.charges || []
      setCharges(rows.map((c: any) => ({
        id: String(c._id || c.id),
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

  const [billingTotals, setBillingTotals] = useState<any>(null)

  async function reloadBillingSummary(): Promise<{ payments: any[]; totals: any } | null>{
    if (!encounterId) { setPayments([]); setBillingTotals(null); return null }
    try{
      const payRes: any = await hospitalApi.erListPayments(encounterId, { limit: 500 })
      const payments = payRes?.payments || []
      const totals = payRes?.totals || null
      setPayments(payments)
      setBillingTotals(totals)
      return { payments, totals }
    }catch{
      setPayments([])
      setBillingTotals(null)
      return null
    }
  }

  useEffect(() => { reloadCharges(); reloadBillingSummary() }, [encounterId])

  useEffect(() => {
    if (!encounterId) return
    const t = setInterval(() => {
      if (document.hidden) return
      reloadBillingSummary().catch(()=>{})
    }, 15000)
    return () => clearInterval(t)
  }, [encounterId])

  useEffect(() => {
    let cancelled = false
    async function loadSvc(){
      try{
        const res: any = await hospitalApi.listErServices({ active: true, limit: 200 })
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

  const total = billingTotals?.grandTotal ?? (charges || []).reduce((s, c) => s + Number(c.amount || 0), 0)
  const paid = billingTotals?.totalPaidToCharges ?? (charges || []).reduce((s, c) => s + Number(c.paidAmount || 0), 0)
  
  const advanceTotal = billingTotals?.unallocatedAdvance ?? 0
  const netDue = billingTotals?.netOutstanding ?? Math.max(0, total - (billingTotals?.totalDirectPaid || 0) - (billingTotals?.totalSettlements || 0))

  // Use backend paidAmount directly - auto-allocation happens on server
  const chargesWithStatus = useMemo(() => {
    return (charges || []).map((c: any) => {
      const amt = Math.max(0, Number(c.amount || 0))
      const paidAmt = Math.max(0, Number(c.paidAmount || 0))
      const remaining = Math.max(0, amt - paidAmt)
      const rowStatus = amt <= 0 ? 'Unpaid' : remaining <= 0 ? 'Paid' : paidAmt > 0 ? 'Partial' : 'Unpaid'
      return { ...c, rowPaid: paidAmt, rowRemaining: remaining, rowStatus }
    })
  }, [charges])

  async function saveAdvance(d: { amount: number; method: string; refNo?: string; notes?: string }) {
    if (!encounterId) return
    const amt = Number(d.amount || 0)
    if (amt <= 0) { setToast({ type: 'error', message: 'Advance amount must be greater than 0' }); return }
    try {
      const res: any = await hospitalApi.erCreatePayment(encounterId, {
        amount: amt,
        method: 'Advance',
        paymentMode: d.method,
        refNo: d.refNo || '',
        notes: d.notes || '',
        receivedBy: 'hospital',
      } as any)
      const pay = res?.payment
      setOpenAdvance(false)
      // Use totals returned from payment creation API (most accurate)
      const apiTotals = res?.totals
      const freshBilling = await reloadBillingSummary()
      const freshTotals = freshBilling?.totals
      // Prefer fresh totals over stale state values - handle null/undefined but not 0
      const totals = freshTotals ?? apiTotals ?? { grandTotal: total, totalPaidToCharges: paid, netOutstanding: netDue, unallocatedAdvance: advanceTotal + amt }
      // Ensure we have the latest patient data from both sources
      // Patient fields from populated patientId: cnicNormalized, fatherName, phoneNormalized, guardianRel, gender, age, address
      const patient = fullPatient || tokenData?.patientId || tokenData || {}
      setSlipData({
        encounterId,
        patientName,
        mrn,
        phone: patient?.phoneNormalized || patient?.phone || '',
        cnic: patient?.cnicNormalized || patient?.cnic || '',
        address: patient?.address || '',
        age: patient?.age || '',
        gender: patient?.gender || '',
        guardian: patient?.fatherName || patient?.guardianName || patient?.guardian || '',
        department: 'Emergency',
        tokenNo,
        isAdvance: true,
        payment: { 
          amount: amt, 
          method: 'Advance', 
          refNo: d.refNo, 
          receivedAt: pay?.receivedAt || new Date().toISOString() 
        },
        totals: {
          total: typeof totals?.grandTotal === 'number' ? totals.grandTotal : (total || 0),
          paid: typeof totals?.totalPaidToCharges === 'number' ? totals.totalPaidToCharges : (paid || 0),
          pending: typeof totals?.netOutstanding === 'number' ? totals.netOutstanding : (netDue || 0),
          unallocatedAdvance: typeof totals?.unallocatedAdvance === 'number' ? totals.unallocatedAdvance : (advanceTotal + amt || 0)
        }
      })
      setSlipOpen(true)
      setToast({ type: 'success', message: 'Advance recorded' })
    } catch (e: any) { setToast({ type: 'error', message: e?.message || 'Failed to record advance' }) }
  }

  if (!encounterIdFromUrl) {
    return (
      <div className="space-y-4 p-4 md:p-6">
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <div className="text-lg font-semibold text-slate-900">ER Billing</div>
          <div className="mt-1 text-sm text-slate-600">Select an active ER token to manage billing.</div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4">
          {/* Date Filters and Search */}
          <div className="mb-4 flex flex-wrap items-end gap-3 border-b border-slate-100 pb-4">
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
            <button
              onClick={() => { setFromDate(getLocalDate()); setToDate(getLocalDate()); }}
              className="rounded-md bg-sky-600 px-4 py-2 text-sm font-medium text-white hover:bg-sky-700"
            >
              Today
            </button>
            <button
              onClick={() => { setFromDate(''); setToDate(''); }}
              className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Reset
            </button>
            <button
              onClick={loadEncounters}
              disabled={loadingEncounters}
              className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
            >
              {loadingEncounters ? 'Loading...' : 'Apply Filters'}
            </button>
            <div className="flex-1 min-w-[200px]">
              <label className="text-xs font-medium text-slate-600">Search (Name, MR No, Token No)</label>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search patients..."
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>
          </div>

          {loadingEncounters ? (
            <div className="py-8 text-center text-slate-500">Loading active ER encounters...</div>
          ) : availableEncounters.length === 0 ? (
            <div className="py-8 text-center text-slate-500">
              <div className="text-lg mb-2">No active ER encounters found</div>
              <div className="text-sm">Go to <button onClick={() => navigate('/hospital/emergency')} className="text-indigo-600 hover:underline">Emergency Queue</button> to create an encounter.</div>
            </div>
          ) : filteredEncounters.length === 0 ? (
            <div className="py-8 text-center text-slate-500">
              <div className="text-lg mb-2">No matching encounters found</div>
              <div className="text-sm">Try adjusting your date range or search query.</div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead className="bg-slate-100/50 text-slate-700 border-b-2 border-slate-300">
                  <tr>
                    <th className="px-3 py-3 text-[13px] font-extrabold uppercase tracking-wider">Patient Name</th>
                    <th className="px-3 py-3 text-[13px] font-extrabold uppercase tracking-wider">MR</th>
                    <th className="px-3 py-3 text-[13px] font-extrabold uppercase tracking-wider">Token</th>
                    <th className="px-3 py-3 text-[13px] font-extrabold uppercase tracking-wider">Admit Date/Time</th>
                    <th className="px-3 py-3 text-[13px] font-extrabold uppercase tracking-wider">Bed No</th>
                    <th className="px-3 py-3 text-[13px] font-extrabold uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {filteredEncounters.map((enc: any) => (
                    <tr key={String(enc._id)} className="hover:bg-slate-50">
                      <td className="px-3 py-2 font-medium text-slate-900">
                        {enc.patientId?.fullName || enc.patientName || 'Unknown'}
                      </td>
                      <td className="px-3 py-2 text-slate-600">
                        {enc.patientId?.mrn || enc.mrn || '-'}
                      </td>
                      <td className="px-3 py-2 text-slate-600">
                        #{enc.tokenId?.tokenNo || enc.tokenNo || String(enc._id).slice(-6)}
                      </td>
                      <td className="px-3 py-2 text-slate-600">
                        {enc.startAt ? new Date(enc.startAt).toLocaleString() : enc.createdAt ? new Date(enc.createdAt).toLocaleString() : '-'}
                      </td>
                      <td className="px-3 py-2 text-slate-600">
                        {formatBedLocation(enc.bedLocation || enc.bedId)}
                      </td>
                      <td className="px-3 py-2">
                        <button
                          onClick={() => {
                            const isReception = window.location.pathname.startsWith('/reception')
                            const basePath = isReception ? '/reception/er-billing/add' : '/hospital/er-billing'
                            navigate(`${basePath}?encounter=${String(enc._id)}`)
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
            <div className="text-lg font-semibold text-slate-900">ER Billing</div>
            <div className="mt-1 text-sm text-slate-600">Manage emergency services, charges, and payments.</div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button onClick={()=>{
              const isReception = window.location.pathname.startsWith('/reception')
              navigate(isReception ? '/reception/er-billing/add' : '/hospital/er-billing')
            }} className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">Back to ER Billing Add</button>
          </div>
        </div>
      </div>

      <div className="space-y-3">
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 pb-4">
            <div>
              <div className="text-sm font-semibold text-slate-800">{patientName || 'ER Billing'}</div>
              <div className="text-xs text-slate-500">
                Token #{tokenNo || '-'} {mrn ? `• MR: ${mrn}` : ''}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button disabled={!encounterId || loadingEnc} onClick={()=>setOpenCharge(true)} className="btn disabled:opacity-50">Add Service</button>
              <button disabled={!encounterId || loadingEnc} onClick={()=>setOpenDoctorService(true)} className="btn-outline-navy disabled:opacity-50">Doctor Services</button>
              <button disabled={!encounterId || loadingEnc} onClick={()=>setOpenAdvance(true)} className="btn-outline-navy disabled:opacity-50">Add Advance</button>
              <button disabled={!encounterId || loadingCharges} onClick={async()=>{ await reloadCharges(); await reloadBillingSummary() }} className="btn-outline-navy disabled:opacity-50">Refresh</button>
            </div>
          </div>

          {encounterId && (
            <>
              {/* Simplified Ledger Widgets */}
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
            </>
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
            <div className="mt-3 text-sm text-rose-600">{loadingEnc ? 'Loading encounter…' : 'Encounter not found for this token.'}</div>
          ) : (
            <div className="mt-3 overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead className="bg-slate-100/50 text-slate-700 border-b-2 border-slate-300">
                  <tr>
                    <th className="px-3 py-3 text-[13px] font-extrabold uppercase tracking-wider">Date</th>
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
                    <tr><td colSpan={9} className="px-3 py-6 text-center text-slate-500">Loading…</td></tr>
                  ) : chargesWithStatus.length === 0 ? (
                    <tr><td colSpan={9} className="px-3 py-6 text-center text-slate-500">No services added.</td></tr>
                  ) : chargesWithStatus.map((c: any) => (
                    <tr key={c.id}>
                      <td className="px-3 py-2 text-xs text-slate-500">{c.date ? new Date(c.date).toLocaleString() : '-'}</td>
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
                          {!c.rowRemaining || c.rowRemaining <= 0 ? (
                             <span className="text-xs text-emerald-600 font-medium">✓ Fully Paid</span>
                          ) : (
                            <button
                              onClick={()=>setEditCharge({ id: c.id, description: c.description, qty: c.qty, unitPrice: c.unitPrice })}
                              className="rounded-md border border-slate-300 px-2 py-1 text-xs hover:bg-slate-50"
                            >
                              Edit
                            </button>
                          )}
                          <button
                            onClick={async()=>{
                              setConfirmDel({ open: true, chargeId: c.id })
                            }}
                            className="rounded-md border border-rose-300 px-2 py-1 text-xs text-rose-700 hover:bg-rose-50"
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
                const qty = Number(fd.get('qty') || 1)
                const unitPrice = Number(fd.get('unitPrice') || 0)
                if (!description){ setToast({ type: 'error', message: 'Service is required' }); return }
                await hospitalApi.updateErCharge(editCharge.id, { description, qty, unitPrice })
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
              <label className="block text-xs font-medium text-slate-600">Service</label>
              <input
                name="description"
                defaultValue={editCharge.description}
                placeholder="Select or type service"
                list="er-service-suggestions"
                className="w-full rounded-md border border-slate-300 px-3 py-2"
                onChange={(e)=>{
                  try{
                    const v = String(e.currentTarget.value||'').trim().toLowerCase()
                    const m = svcCatalog.find(s => String(s.name||'').trim().toLowerCase() === v)
                    if (!m) return
                    const form = e.currentTarget.form
                    const amtEl = form?.querySelector<HTMLInputElement>('input[name="unitPrice"]')
                    if (amtEl && (!amtEl.value || Number(amtEl.value) === 0)) amtEl.value = String(m.price || 0)
                  }catch{}
                }}
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
                    await hospitalApi.deleteErCharge(id)
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

      <Hospital_ErPaymentSlip
        open={slipOpen}
        onClose={() => setSlipOpen(false)}
        data={slipData || { encounterId: '', patientName: '', payment: { amount: 0 }, totals: { total: 0, paid: 0, pending: 0 } }}
        autoPrint
      />

      {openCharge && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <form
            data-er-charge-form="true"
            onSubmit={async (e)=>{
              e.preventDefault()
              if (!encounterId) return
              const fd = new FormData(e.currentTarget)
              const description = String(fd.get('description') || '').trim()
              const qty = Number(fd.get('qty') || 1)
              const unitPrice = Number(fd.get('unitPrice') || 0)
              if (!description){ setToast({ type: 'error', message: 'Service is required' }); return }
              try{
                await hospitalApi.createErCharge(encounterId, { description, qty, unitPrice, billedBy: 'hospital' })
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
                    const form = document.querySelector('form[data-er-charge-form="true"]')
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

      {openDoctorService && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <form
            data-er-doctor-form="true"
            onSubmit={async (e)=>{
              e.preventDefault()
              if (!encounterId) return
              const fd = new FormData(e.currentTarget)
              const doctorId = String(fd.get('doctorId') || '').trim()
              const serviceType = String(fd.get('serviceType') || '').trim()
              const fee = Number(fd.get('fee') || 0)
              if (!doctorId){ setToast({ type: 'error', message: 'Doctor is required' }); return }
              if (!serviceType){ setToast({ type: 'error', message: 'Service type is required' }); return }
              const doctor = doctors.find(d => d.id === doctorId)
              const description = `Doctor Service - ${doctor?.name || doctorId} (${serviceType})`
              try{
                await hospitalApi.createErCharge(encounterId, { description, qty: 1, unitPrice: fee, billedBy: 'hospital' })
                setOpenDoctorService(false)
                await reloadCharges()
                await reloadBillingSummary()
                setToast({ type: 'success', message: 'Doctor service added' })
              }catch(e: any){
                setToast({ type: 'error', message: e?.message || 'Failed to add doctor service' })
              }
            }}
            className="w-full max-w-md overflow-hidden rounded-xl bg-white shadow-2xl ring-1 ring-black/5"
          >
            <div className="border-b border-slate-200 px-5 py-3 font-semibold text-slate-800">Doctor Services</div>
            <div className="space-y-3 px-5 py-4 text-sm">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Doctor</label>
                <DoctorSelect
                  doctors={doctors}
                  onSelect={(doc) => {
                    const form = document.querySelector('form[data-er-doctor-form="true"]')
                    if (!form) return
                    const idEl = form.querySelector<HTMLInputElement>('input[name="doctorId"]')
                    if (idEl) idEl.value = String(doc.id || doc._id || '')
                  }}
                />
                <input name="doctorId" type="hidden" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Service Type</label>
                <select name="serviceType" className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500">
                  <option value="">Select type...</option>
                  <option value="Visit">Visit</option>
                  <option value="Minor Surgery">Minor Surgery</option>
                  <option value="Major Surgery">Major Surgery</option>
                  <option value="Anesthesia">Anesthesia</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Fee</label>
                <input name="fee" type="number" defaultValue={0} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500" />
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 border-t border-slate-200 px-5 py-3">
              <button type="button" onClick={()=>setOpenDoctorService(false)} className="btn-outline-navy">Cancel</button>
              <button type="submit" className="btn">Add</button>
            </div>
          </form>
        </div>
      )}

      {openAdvance && (
        <AdvanceDialog open={openAdvance} onClose={()=>setOpenAdvance(false)} onSave={saveAdvance} />
      )}

      {openCollectPayment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <form
            onSubmit={async (e)=>{
              e.preventDefault()
              if (!encounterId || !openCollectPayment) return
              const fd = new FormData(e.currentTarget)
              const amount = Math.min(
                Number(fd.get('amount') || 0),
                openCollectPayment.remaining
              )
              const method = String(fd.get('method') || 'Cash')
              const refNo = String(fd.get('refNo') || '')
              if (amount <= 0) { setToast({ type: 'error', message: 'Amount must be greater than 0' }); return }
              try{
                const res: any = await hospitalApi.erCreatePayment(encounterId, {
                  amount,
                  method,
                  paymentMode: method,
                  refNo,
                  notes: `Payment for: ${openCollectPayment.description}`,
                  receivedBy: 'hospital',
                } as any)
                const pay = res?.payment
                setOpenCollectPayment(null)
                // Use totals returned from payment creation API (most accurate)
                const apiTotals = res?.totals
                const freshBilling = await reloadBillingSummary()
                await reloadCharges()
                const freshTotals = freshBilling?.totals
                // Prefer fresh totals over stale state values - handle null/undefined but not 0
                const totals = freshTotals ?? apiTotals ?? { grandTotal: total, totalPaidToCharges: paid, netOutstanding: netDue, unallocatedAdvance: advanceTotal }
                // Ensure we have the latest patient data from both sources
                // Patient fields from populated patientId: cnicNormalized, fatherName, phoneNormalized, guardianRel, gender, age, address
                const patient = fullPatient || tokenData?.patientId || tokenData || {}
                setSlipData({
                  encounterId,
                  patientName,
                  mrn,
                  phone: patient?.phoneNormalized || patient?.phone || '',
                  cnic: patient?.cnicNormalized || patient?.cnic || '',
                  address: patient?.address || '',
                  age: patient?.age || '',
                  gender: patient?.gender || '',
                  guardian: patient?.fatherName || patient?.guardianName || patient?.guardian || '',
                  department: 'Emergency',
                  tokenNo,
                  payment: { 
                    amount, 
                    method, 
                    refNo, 
                    receivedAt: pay?.receivedAt || new Date().toISOString() 
                  },
                  totals: {
                    total: typeof totals?.grandTotal === 'number' ? totals.grandTotal : (total || 0),
                    paid: typeof totals?.totalPaidToCharges === 'number' ? totals.totalPaidToCharges : (paid || 0),
                    pending: typeof totals?.netOutstanding === 'number' ? totals.netOutstanding : (netDue || 0),
                    unallocatedAdvance: typeof totals?.unallocatedAdvance === 'number' ? totals.unallocatedAdvance : (advanceTotal || 0)
                  }
                })
                setSlipOpen(true)
                setToast({ type: 'success', message: 'Payment collected' })
              }catch(e: any){
                setToast({ type: 'error', message: e?.message || 'Failed to collect payment' })
              }
            }}
            className="w-full max-w-md overflow-hidden rounded-xl bg-white shadow-2xl ring-1 ring-black/5"
          >
            <div className="border-b border-slate-200 px-5 py-3 font-semibold text-slate-800">Collect Payment</div>
            <div className="space-y-3 px-5 py-4 text-sm">
              <div className="rounded-lg bg-slate-50 p-3">
                <div className="text-xs text-slate-500">Service</div>
                <div className="font-medium text-slate-900">{openCollectPayment.description}</div>
                <div className="mt-1 text-xs text-slate-500">Remaining: <span className="font-semibold text-rose-700">Rs{openCollectPayment.remaining.toFixed(0)}</span></div>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600">Amount</label>
                <input name="amount" type="number" step="0.01" max={openCollectPayment.remaining} placeholder={`Max: Rs${openCollectPayment.remaining.toFixed(0)}`} className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600">Payment Mode</label>
                <select name="method" className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2">
                  {['Cash','Card','Bank','Online'].map(m => (<option key={m} value={m}>{m}</option>))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600">Ref No</label>
                <input name="refNo" placeholder="optional" className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2" />
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 border-t border-slate-200 px-5 py-3">
              <button type="button" onClick={()=>setOpenCollectPayment(null)} className="btn-outline-navy">Cancel</button>
              <button type="submit" className="btn">Collect</button>
            </div>
          </form>
        </div>
      )}

      {toast && (
        <div className="fixed right-4 top-16 z-60 max-w-sm">
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
