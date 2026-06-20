import { useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { logAudit } from '../../utils/hospital_audit'
import { corporateApi, hospitalApi } from '../../utils/api'
import { invalidateCache } from '../../utils/apiCache'
import { getLocalDate } from '../../utils/date'
import Hospital_TokenSlip, { type TokenSlipData } from '../../components/hospital/Hospital_TokenSlip'

type SearchOption = { value: string; label: string }
function SearchSelect({ options, value, onChange, placeholder, onEnter }: { options: SearchOption[]; value: string; onChange: (v: string) => void; placeholder?: string; onEnter?: (e: React.KeyboardEvent<HTMLInputElement>) => void }) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [activeIdx, setActiveIdx] = useState(-1)
  const ref = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (!ref.current) return
      if (!ref.current.contains(e.target as any)) { setOpen(false); setActiveIdx(-1) }
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [])

  const selectedLabel = useMemo(() => (options.find(o => String(o.value) === String(value))?.label || ''), [options, value])
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return options.filter(o => !q || o.label.toLowerCase().includes(q)).slice(0, 100)
  }, [options, query])

  useEffect(() => {
    if (activeIdx < 0 || !listRef.current) return
    const el = listRef.current.querySelector<HTMLElement>(`[data-idx="${activeIdx}"]`)
    el?.scrollIntoView({ block: 'nearest' })
  }, [activeIdx])

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!open && (e.key === 'ArrowDown' || e.key === 'ArrowUp')) {
      setOpen(true); setActiveIdx(0); e.preventDefault(); return
    }
    if (e.key === 'Escape') { setOpen(false); setActiveIdx(-1); e.preventDefault(); return }
    if (e.key === 'Tab') { setOpen(false); setActiveIdx(-1); return }
    if (!open) {
      if (e.key === 'Enter' && onEnter) { onEnter(e) }
      return
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActiveIdx(i => Math.min(i + 1, filtered.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActiveIdx(i => Math.max(i - 1, 0))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      if (activeIdx >= 0 && activeIdx < filtered.length) {
        onChange(String(filtered[activeIdx].value))
        setOpen(false); setQuery(''); setActiveIdx(-1)
      }
    }
  }

  return (
    <div ref={ref} className="relative">
      <input
        ref={inputRef}
        value={open ? query : selectedLabel}
        onFocus={() => { setOpen(true); setQuery('') }}
        onChange={e => { setQuery(e.target.value); setOpen(true); setActiveIdx(-1) }}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        className="w-full rounded-md border border-slate-300 px-3 py-2 outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-200"
      />
      <button type="button" tabIndex={-1} onClick={() => setOpen(o => !o)} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-500">▾</button>
      {open && (
        <div ref={listRef} className="absolute z-20 mt-1 max-h-64 w-full overflow-y-auto rounded-md border border-slate-200 bg-white shadow-lg">
          {filtered.length === 0 ? (
            <div className="px-3 py-2 text-sm text-slate-500">No results</div>
          ) : filtered.map((opt, idx) => (
            <button
              type="button"
              key={String(opt.value)}
              data-idx={idx}
              onClick={() => { onChange(String(opt.value)); setOpen(false); setQuery(''); setActiveIdx(-1) }}
              onMouseEnter={() => setActiveIdx(idx)}
              className={`flex w-full items-center justify-between px-3 py-2 text-left transition ${
                idx === activeIdx ? 'bg-violet-50 dark:bg-violet-900/40' : 'hover:bg-slate-50'
              }`}
            >
              <div className="text-sm text-slate-800">{opt.label}</div>
              {String(opt.value) === String(value) ? <span className="text-xs text-violet-600">✓</span> : null}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

function MultiSearchSelect({ options, value, onChange, placeholder, onEnter }: { options: SearchOption[]; value: string[]; onChange: (v: string[]) => void; placeholder?: string; onEnter?: (e: React.KeyboardEvent<HTMLInputElement>) => void }) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [activeIdx, setActiveIdx] = useState(-1)
  const ref = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (!ref.current) return
      if (!ref.current.contains(e.target as any)) { setOpen(false); setActiveIdx(-1) }
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return options.filter(o => !q || o.label.toLowerCase().includes(q)).slice(0, 100)
  }, [options, query])

  const toggle = (id: string) => {
    if (value.includes(id)) {
      onChange(value.filter(v => v !== id))
    } else {
      onChange([...value, id])
    }
  }

  useEffect(() => {
    if (activeIdx < 0 || !listRef.current) return
    const el = listRef.current.querySelector<HTMLElement>(`[data-idx="${activeIdx}"]`)
    el?.scrollIntoView({ block: 'nearest' })
  }, [activeIdx])

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!open && (e.key === 'ArrowDown' || e.key === 'ArrowUp')) {
      setOpen(true); setActiveIdx(0); e.preventDefault(); return
    }
    if (e.key === 'Escape') { setOpen(false); setActiveIdx(-1); e.preventDefault(); return }
    if (e.key === 'Tab') { setOpen(false); setActiveIdx(-1); return }
    if (!open) {
      if (e.key === 'Enter' && onEnter) { onEnter(e) }
      return
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActiveIdx(i => Math.min(i + 1, filtered.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActiveIdx(i => Math.max(i - 1, 0))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      if (activeIdx >= 0 && activeIdx < filtered.length) {
        toggle(String(filtered[activeIdx].value))
        setQuery(''); setActiveIdx(-1)
      }
    }
  }

  return (
    <div ref={ref} className="relative">
      <div
        className="min-h-[42px] w-full rounded-md border border-slate-300 px-3 py-2 outline-none focus-within:border-violet-500 focus-within:ring-2 focus-within:ring-violet-200 dark:bg-slate-900 dark:border-slate-700 flex flex-wrap gap-1 cursor-text"
        onClick={() => { inputRef.current?.focus(); setOpen(true) }}
      >
        {value.length === 0 && !query && <span className="text-slate-400 text-sm">{placeholder}</span>}
        {value.map(id => {
          const opt = options.find(o => String(o.value) === String(id))
          if (!opt) return null
          return (
            <span key={id} className="inline-flex items-center gap-1 rounded bg-violet-100 px-2 py-0.5 text-xs font-medium text-violet-700 dark:bg-violet-900/30 dark:text-violet-300">
              {opt.label}
              <button type="button" tabIndex={-1} onClick={(e) => { e.stopPropagation(); toggle(id) }} className="hover:text-violet-900">×</button>
            </span>
          )
        })}
        <input
          ref={inputRef}
          value={query}
          onChange={e => { setOpen(true); setQuery(e.target.value); setActiveIdx(-1) }}
          onFocus={() => setOpen(true)}
          onKeyDown={handleKeyDown}
          className="flex-1 bg-transparent outline-none text-sm dark:text-white"
          size={query.length || 1}
        />
      </div>
      {open && (
        <div ref={listRef} className="absolute z-20 mt-1 max-h-64 w-full overflow-y-auto rounded-md border border-slate-200 bg-white shadow-lg dark:bg-slate-800 dark:border-slate-700">
          {filtered.length === 0 ? (
            <div className="px-3 py-2 text-sm text-slate-500">No results</div>
          ) : filtered.map((opt, idx) => (
            <button
              type="button"
              key={String(opt.value)}
              data-idx={idx}
              onClick={() => { toggle(String(opt.value)); setQuery(''); setActiveIdx(-1) }}
              onMouseEnter={() => setActiveIdx(idx)}
              className={`flex w-full items-center justify-between px-3 py-2 text-left transition ${
                idx === activeIdx ? 'bg-violet-50 dark:bg-violet-900/40' : 'hover:bg-slate-50 dark:hover:bg-slate-700/50'
              }`}
            >
              <div className="text-sm text-slate-800 dark:text-slate-200">{opt.label}</div>
              {value.includes(String(opt.value)) ? <span className="text-xs text-violet-600">✓</span> : null}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

export default function Hospital_TokenGenerator() {
  const [searchParams, setSearchParams] = useSearchParams()
  const tokenId = searchParams.get('tokenId')
  const isEditMode = Boolean(tokenId)
  const [departments, setDepartments] = useState<Array<{ id: string; name: string; fee?: number }>>([])
  const [doctors, setDoctors] = useState<Array<{ id: string; name: string; publicFee?: number; privateFee?: number; subsidizedFee?: number; fee?: number }>>([])
  const [services, setServices] = useState<Array<{ id: string; name: string; price: number }>>([])
  const [companies, setCompanies] = useState<Array<{ id: string; name: string }>>([])
  const [billingRules, setBillingRules] = useState<Record<string, { feeMode?: 'department-only' | 'doctor-only' | 'both' | 'none'; doctorCommissionPercent?: number }>>({})
  const lastAutoConsultationFeeRef = useRef<string | null>(null)
  const feeManuallyEditedRef = useRef(false)
  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const dRes = await hospitalApi.listDepartments({ limit: 1000 }) as any
        const deps = (dRes.departments || dRes || []).map((d: any) => ({ id: String(d._id || d.id), name: d.name, fee: Number(d.opdBaseFee ?? d.baseFee ?? d.fee ?? 0) }))
        const docRes = await hospitalApi.listDoctors() as any
        const docs = (docRes.doctors || docRes || []).map((r: any) => ({
          id: String(r._id || r.id),
          name: r.name,
          publicFee: Number(r.opdPublicFee ?? r.opdBaseFee ?? r.baseFee ?? r.fee ?? 0),
          privateFee: Number(r.opdPrivateFee ?? r.opdBaseFee ?? r.baseFee ?? r.fee ?? 0),
          subsidizedFee: Number(r.opdSubsidizedFee ?? r.opdBaseFee ?? r.baseFee ?? r.fee ?? 0),
          fee: Number(r.opdBaseFee ?? r.baseFee ?? r.fee ?? 0),
        }))
        // load services
        try {
          const sRes = await hospitalApi.listErServices({ limit: 1000, active: true }) as any
          const svcs = (sRes.services || sRes || []).map((s: any) => ({ id: String(s._id || s.id), name: s.name, price: Number(s.price || 0) }))
          if (!cancelled) setServices(svcs)
        } catch { }
        // load corporate companies
        let comps: Array<{ id: string; name: string }> = []
        try {
          const cRes = await corporateApi.listCompanies() as any
          comps = (cRes?.companies || []).map((c: any) => ({ id: String(c._id || c.id), name: c.name }))
        } catch { }
        // load billing rules from settings
        try {
          const settingsRes = await hospitalApi.getSettings() as any
          const s = settingsRes?.settings || settingsRes
          if (s?.departmentBillingRules) setBillingRules(s.departmentBillingRules)
        } catch { }
        if (!cancelled) { setDepartments(deps); setDoctors(docs); setCompanies(comps) }
      } catch { }
    }

    load()
    return () => { cancelled = true }
  }, [])
  const [form, setForm] = useState<{
    phone: string
    mrNumber: string
    patientName: string
    age: string
    gender: string
    guardianRel: string
    guardianName: string
    cnic: string
    address: string
    doctor: string
    serviceIds: string[]
    departmentId: string
    visitCategory: 'general' | 'private' | 'subsidized'
    billingType: string
    consultationFee: string
    discount: string
    corporateCompanyId: string
    corporatePreAuthNo: string
    corporateCoPayPercent: string
    corporateCoverageCap: string
    // ER fields
    triage: 'red' | 'yellow' | 'green'
    arrivalMode: 'walk-in' | 'ambulance' | 'referral'
    chiefComplaint: string
  }>({
    phone: '',
    mrNumber: '',
    patientName: '',
    age: '',
    gender: '',
    guardianRel: '',
    guardianName: '',
    cnic: '',
    address: '',
    doctor: '',
    serviceIds: [],
    departmentId: '',
    visitCategory: 'general',
    billingType: 'Cash',
    consultationFee: '',
    discount: '0',
    corporateCompanyId: '',
    corporatePreAuthNo: '',
    corporateCoPayPercent: '',
    corporateCoverageCap: '',
    // ER fields
    triage: 'green',
    arrivalMode: 'walk-in',
    chiefComplaint: '',
  })

  const [loadingToken, setLoadingToken] = useState(false)

  useEffect(() => {
    let cancelled = false
    async function loadTokenForEdit() {
      if (!tokenId) return
      try {
        setLoadingToken(true)
        const res: any = await hospitalApi.getToken(String(tokenId))
        const t: any = res?.token
        if (!t) throw new Error('Token not found')

        const p: any = t.patientId || {}
        const docId = t.doctorId?._id || t.doctorId
        const depId = t.departmentId?._id || t.departmentId
        const svcIds = Array.isArray(t.serviceIds) ? t.serviceIds.map((s: any) => s._id || s) : []

        setForm(prev => ({
          ...prev,
          phone: String(p.phoneNormalized || prev.phone || ''),
          mrNumber: String(p.mrn || t.mrn || prev.mrNumber || ''),
          patientName: String(p.fullName || t.patientName || prev.patientName || ''),
          age: String(p.age || prev.age || ''),
          gender: String(p.gender || prev.gender || ''),
          guardianRel: String(p.guardianRel || prev.guardianRel || ''),
          guardianName: String(p.fatherName || prev.guardianName || ''),
          cnic: String(p.cnicNormalized || prev.cnic || ''),
          address: String(p.address || prev.address || ''),
          doctor: docId ? String(docId) : '',
          serviceIds: svcIds,
          departmentId: depId ? String(depId) : prev.departmentId,
          consultationFee: String(Number(t.fee || 0) + Number(t.discount || 0)),
          discount: String(Number(t.discount || 0)),
        }))
      } catch (e: any) {
        showToast('error', e?.message || 'Failed to load token for edit')
      } finally {
        if (!cancelled) setLoadingToken(false)
      }
    }
    loadTokenForEdit()
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tokenId])



  const finalFee = useMemo(() => {
    const fee = parseFloat(form.consultationFee || '0')
    const discount = parseFloat(form.discount || '0')
    const f = Math.max(fee - discount, 0)
    return isNaN(f) ? 0 : f
  }, [form.consultationFee, form.discount])

  const update = (key: keyof typeof form, value: string) => setForm(prev => ({ ...prev, [key]: value }))

  const reset = () => {
    lastAutoConsultationFeeRef.current = null
    feeManuallyEditedRef.current = false
    setForm({
      phone: '',
      mrNumber: '',
      patientName: '',
      age: '',
      gender: '',
      guardianRel: '',
      guardianName: '',
      cnic: '',
      address: '',
      doctor: '',
      serviceIds: [],
      departmentId: '',
      visitCategory: 'general',
      billingType: 'Cash',
      consultationFee: '',
      discount: '0',
      corporateCompanyId: '',
      corporatePreAuthNo: '',
      corporateCoPayPercent: '',
      corporateCoverageCap: '',
      // ER fields
      triage: 'green',
      arrivalMode: 'walk-in',
      chiefComplaint: '',
    })
    setErBedId('')
    setIpdPackageAmount('')
    setIpdAdvancedAmount('')
  }

  const [showSlip, setShowSlip] = useState(false)
  const [slipData, setSlipData] = useState<TokenSlipData | null>(null)

  // IPD inline admit state
  const isIPD = useMemo(() => {
    const dep = departments.find(d => String(d.id) === String(form.departmentId))
    return (dep?.name || '').trim().toLowerCase() === 'ipd'
  }, [departments, form.departmentId])

  // ER check
  const isER = useMemo(() => {
    const dep = departments.find(d => String(d.id) === String(form.departmentId))
    const name = (dep?.name || '').trim().toLowerCase()
    return name === 'emergency' || name === 'er'
  }, [departments, form.departmentId])

  // ICU check
  const isICU = useMemo(() => {
    const dep = departments.find(d => String(d.id) === String(form.departmentId))
    const name = (dep?.name || '').trim().toLowerCase()
    return name === 'icu' || name.includes('intensive care')
  }, [departments, form.departmentId])
  const [ipdBeds, setIpdBeds] = useState<Array<{ _id: string; label: string; charges?: number; floorName?: string; locationType?: 'room'|'ward'; locationName?: string }>>([])
  const [ipdBedId, setIpdBedId] = useState('')
  const [ipdDeposit, setIpdDeposit] = useState('')
  const [ipdPackageAmount, setIpdPackageAmount] = useState('')
  const [ipdAdvancedAmount, setIpdAdvancedAmount] = useState('')
  const [ipdBedFeeInPackage, setIpdBedFeeInPackage] = useState(false)

  const ipdPendingAmount = useMemo(() => {
    const pkg = Math.max(0, Number(ipdPackageAmount || 0))
    const bed = Math.max(0, Number(ipdDeposit || 0))
    const adv = Math.max(0, Number(ipdAdvancedAmount || 0))
    const total = ipdBedFeeInPackage ? pkg : pkg + bed
    return Math.max(0, total - adv)
  }, [ipdPackageAmount, ipdAdvancedAmount, ipdDeposit, ipdBedFeeInPackage])

  // ER bed selection state
  const [erBedId, setErBedId] = useState('')

  const ipdBedOptions = useMemo(() => {
    let items = (ipdBeds || []).slice()
    // When Emergency is selected, only show ER category beds
    if (isER) {
      items = items.filter((b: any) => String(b.category || '').toUpperCase() === 'ER')
    }
    // When ICU is selected, only show ICU-related beds
    if (isICU) {
      items = items.filter((b: any) => {
        const cat = String(b.category || '').toLowerCase()
        const loc = String(b.locationName || '').toLowerCase()
        const floor = String(b.floorName || '').toLowerCase()
        const label = String(b.label || '').toLowerCase()
        return cat.includes('icu') || cat.includes('intensive') ||
               loc.includes('icu') || loc.includes('intensive') ||
               floor.includes('icu') || floor.includes('intensive') ||
               label.includes('icu') || label.includes('intensive')
      })
    }
    // Sort ascending: floor -> location type -> location name -> bed label (A-Z)
    items.sort((a: any, b: any) => {
      const aFloor = String(a.floorName || '').toLowerCase()
      const bFloor = String(b.floorName || '').toLowerCase()
      if (aFloor !== bFloor) return aFloor.localeCompare(bFloor)
      const aType = String(a.locationType || '').toLowerCase()
      const bType = String(b.locationType || '').toLowerCase()
      if (aType !== bType) return aType.localeCompare(bType)
      const aLoc = String(a.locationName || '').toLowerCase()
      const bLoc = String(b.locationName || '').toLowerCase()
      if (aLoc !== bLoc) return aLoc.localeCompare(bLoc)
      const aLabel = String(a.label || '').toLowerCase()
      const bLabel = String(b.label || '').toLowerCase()
      return aLabel.localeCompare(bLabel)
    })
    return items
  }, [ipdBeds, isER, isICU])

  useEffect(() => {
    let cancelled = false
    async function loadBeds() {
      if (!isIPD && !isER && !isICU) return
      try {
        const res = await hospitalApi.listBeds({ status: 'available' }) as any
        if (!cancelled) setIpdBeds(res.beds || [])
      } catch { }
    }
    loadBeds()
    return () => { cancelled = true }
  }, [isIPD, isER, isICU])

  // When a bed is selected, auto-fill Bed Charges from bed.charges
  useEffect(() => {
    if (!ipdBedId) { setIpdDeposit(''); return }
    const sel = ipdBeds.find(b => String(b._id) === String(ipdBedId))
    if (sel && sel.charges != null) setIpdDeposit(String(sel.charges))
  }, [ipdBedId, ipdBeds])

  // Auto-quote fee when department/doctor/visitCategory/corporate changes
  useEffect(() => {
    let cancelled = false
    async function run() {
      if (!form.departmentId) return
      const getBaseFromQuote = async (): Promise<number> => {
        try {
          const res = await hospitalApi.quoteOPDPrice({
            departmentId: form.departmentId,
            doctorId: form.doctor || undefined,
            visitType: undefined,
            visitCategory: form.visitCategory || undefined,
          }) as any
          const feeCandidate = [res?.fee, res?.feeResolved, res?.pricing?.feeResolved, res?.amount, res?.price, res?.data?.fee]
            .map((x: any) => Number(x))
            .find(n => Number.isFinite(n) && n >= 0)
          return feeCandidate ?? 0
        } catch { return 0 }
      }

      // For non-corporate billing, prefer instant local fee resolution so switching Token Type
      // updates the fee immediately and predictably.
      if (form.billingType !== 'Corporate') {
        const selDoc = doctors.find(d => String(d.id) === String(form.doctor))
        const docBase = form.visitCategory === 'private' ? selDoc?.privateFee : form.visitCategory === 'subsidized' ? selDoc?.subsidizedFee : selDoc?.publicFee
        const depBase = departments.find(d => String(d.id) === String(form.departmentId))?.fee
        const rule = billingRules[String(form.departmentId)]
        const feeMode = rule?.feeMode || 'both'
        let base = 0
        if (feeMode === 'none') {
          base = 0
        } else if (feeMode === 'department-only') {
          base = Number.isFinite(depBase as any) && Number(depBase) > 0 ? Number(depBase) : 0
        } else if (feeMode === 'doctor-only') {
          base = Number.isFinite(docBase as any) && Number(docBase) > 0 ? Number(docBase) : 0
        } else {
          // both: prefer doctor fee, fall back to department fee
          base = Number.isFinite(docBase as any) && Number(docBase) > 0
            ? Number(docBase)
            : (Number.isFinite(depBase as any) && Number(depBase) > 0 ? Number(depBase) : 0)
        }
        const nextFee = String(Number(base || 0))
        if (!cancelled) {
          setForm(prev => {
            if (feeManuallyEditedRef.current) return prev
            lastAutoConsultationFeeRef.current = nextFee
            feeManuallyEditedRef.current = false
            return { ...prev, consultationFee: nextFee }
          })
        }
        return
      }

      if (form.billingType === 'Corporate' && form.corporateCompanyId) {
        // Local corporate compute to avoid relying on backend quote behavior
        try {
          const r = await corporateApi.listRateRules({ companyId: form.corporateCompanyId, scope: 'OPD' }) as any
          const rules: any[] = (r?.rules || []).filter((x: any) => x && x.active !== false)
          const today = getLocalDate()
          const valid = rules.filter((x: any) => (!x.effectiveFrom || String(x.effectiveFrom).slice(0, 10) <= today) && (!x.effectiveTo || today <= String(x.effectiveTo).slice(0, 10)))
          const pri = (x: any) => (x?.priority ?? 100)
          const docMatch = form.doctor ? valid.filter(x => x.ruleType === 'doctor' && String(x.refId) === String(form.doctor)).sort((a: any, b: any) => pri(a) - pri(b))[0] : null
          const depMatch = valid.filter(x => x.ruleType === 'department' && String(x.refId) === String(form.departmentId)).sort((a: any, b: any) => pri(a) - pri(b))[0] || null
          const defMatch = valid.filter(x => x.ruleType === 'default').sort((a: any, b: any) => pri(a) - pri(b))[0] || null
          const candidates = [docMatch, depMatch, defMatch].filter(Boolean) as any[]
          candidates.sort((a: any, b: any) => {
            const d = pri(a) - pri(b)
            if (d !== 0) return d
            const rank = (t: string) => t === 'doctor' ? 0 : t === 'department' ? 1 : 2
            return rank(a.ruleType) - rank(b.ruleType)
          })
          const corpRule = candidates[0] || null
          const selDoc = doctors.find(d => String(d.id) === String(form.doctor))
          const docBase = form.visitCategory === 'private' ? selDoc?.privateFee : form.visitCategory === 'subsidized' ? selDoc?.subsidizedFee : selDoc?.publicFee
          const depBase = departments.find(d => String(d.id) === String(form.departmentId))?.fee
          const depRule = billingRules[String(form.departmentId)]
          const feeMode = depRule?.feeMode || 'both'
          let base = 0
          if (feeMode === 'none') {
            base = 0
          } else if (feeMode === 'department-only') {
            base = Number.isFinite(depBase as any) && Number(depBase) > 0 ? Number(depBase) : 0
          } else if (feeMode === 'doctor-only') {
            base = Number.isFinite(docBase as any) && Number(docBase) > 0 ? Number(docBase) : 0
          } else {
            base = Number.isFinite(docBase as any) && Number(docBase) > 0 ? Number(docBase) : (Number.isFinite(depBase as any) && Number(depBase) > 0 ? Number(depBase) : NaN)
          }
          if (!Number.isFinite(base) || base <= 0) base = await getBaseFromQuote()
          let eff = Number(base || 0)
          if (corpRule) {
            const mode = corpRule.mode; const val = Number(corpRule.value || 0)
            if (mode === 'fixedPrice') eff = Math.max(0, val)
            else if (mode === 'percentDiscount') eff = Math.max(0, eff - (eff * (val / 100)))
            else if (mode === 'fixedDiscount') eff = Math.max(0, eff - val)
          }
          if (!cancelled) setForm(prev => ({ ...prev, consultationFee: String(eff) }))
          return
        } catch {
          // fall through to plain quote as last resort
        }
      }

      // No corporate or failed local compute: use backend quote
      try {
        const res = await hospitalApi.quoteOPDPrice({
          departmentId: form.departmentId,
          doctorId: form.doctor || undefined,
          visitType: undefined,
          corporateId: form.billingType === 'Corporate' ? (form.corporateCompanyId || undefined) : undefined,
          visitCategory: form.visitCategory || undefined,
        }) as any
        if (!cancelled) {
          const feeCandidate = [res?.fee, res?.feeResolved, res?.pricing?.feeResolved, res?.amount, res?.price, res?.data?.fee]
            .map((x: any) => Number(x))
            .find(n => Number.isFinite(n) && n >= 0)
          if (feeCandidate != null) {
            const nextFee = String(feeCandidate)
            setForm(prev => {
              if (feeManuallyEditedRef.current) return prev
              lastAutoConsultationFeeRef.current = nextFee
              feeManuallyEditedRef.current = false
              return { ...prev, consultationFee: nextFee }
            })
          }
        }
      } catch { }
    }
    run()
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.departmentId, form.doctor, form.visitCategory, form.corporateCompanyId, form.billingType])

  // Default consultation fee to the selected doctor's public/private/subsidized fee and update instantly when switching category.
  // Do not overwrite if the user manually edited the fee.
  useEffect(() => {
    if (!form.doctor) return
    const selDoc = doctors.find(d => String(d.id) === String(form.doctor))
    if (!selDoc) return
    const base = form.visitCategory === 'private' ? selDoc.privateFee : form.visitCategory === 'subsidized' ? selDoc.subsidizedFee : selDoc.publicFee
    if (!Number.isFinite(base as any)) return
    const nextFee = String(Number(base || 0))
    setForm(prev => {
      if (feeManuallyEditedRef.current) return prev
      lastAutoConsultationFeeRef.current = nextFee
      feeManuallyEditedRef.current = false
      return { ...prev, consultationFee: nextFee }
    })
  }, [doctors, form.doctor, form.visitCategory])

  const [confirmPatient, setConfirmPatient] = useState<null | { summary: string; patient: any; key: string }>(null)
  const [focusAfterConfirm, setFocusAfterConfirm] = useState<null | 'phone' | 'name'>(null)
  const phoneRef = useRef<HTMLInputElement>(null)
  const nameRef = useRef<HTMLInputElement>(null)
  const skipLookupKeyRef = useRef<string | null>(null)
  const lastPromptKeyRef = useRef<string | null>(null)
  const [phonePatients, setPhonePatients] = useState<any[]>([])
  const [showPhonePicker, setShowPhonePicker] = useState(false)
  const [phoneSuggestOpen, setPhoneSuggestOpen] = useState(false)
  const [phoneSuggestItems, setPhoneSuggestItems] = useState<any[]>([])
  const phoneSuggestWrapRef = useRef<HTMLDivElement>(null)
  const phoneSuggestQueryRef = useRef<string>('')
  // Name search suggestions
  const [nameSuggestOpen, setNameSuggestOpen] = useState(false)
  const [nameSuggestItems, setNameSuggestItems] = useState<any[]>([])
  const nameSuggestWrapRef = useRef<HTMLDivElement>(null)
  const nameSuggestQueryRef = useRef<string>('')
  const [toast, setToast] = useState<null | { type: 'success' | 'error'; message: string }>(null)
  const showToast = (type: 'success' | 'error', message: string) => {
    setToast({ type, message })
    setTimeout(() => setToast(null), 2500)
  }

  const [dupModal, setDupModal] = useState<{ open: boolean; patientName?: string; mrn?: string }>({ open: false })

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (!phoneSuggestWrapRef.current) return
      if (!phoneSuggestWrapRef.current.contains(e.target as any)) setPhoneSuggestOpen(false)
      if (!nameSuggestWrapRef.current) return
      if (!nameSuggestWrapRef.current.contains(e.target as any)) setNameSuggestOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [])

  async function onMrnKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key !== 'Enter') return
    e.preventDefault()
    const mr = (form.mrNumber || '').trim()
    if (!mr) return
    try {
      const r: any = await hospitalApi.searchPatients({ mrn: mr, limit: 5 })
      const list: any[] = Array.isArray(r?.patients) ? r.patients : []
      // Prefer exact MRN match (case-insensitive), else take first
      const p = list.find(x => String(x.mrn || '').trim().toLowerCase() === mr.toLowerCase()) || list[0]
      if (!p) { showToast('error', 'No patient found for this MR number'); return }
      setForm(prev => ({
        ...prev,
        patientName: p.fullName || prev.patientName,
        guardianName: p.fatherName || prev.guardianName,
        guardianRel: p.guardianRel || prev.guardianRel,
        address: p.address || prev.address,
        gender: p.gender || prev.gender,
        age: p.age || prev.age,
        mrNumber: p.mrn || mr,
        phone: p.phoneNormalized || prev.phone,
        cnic: p.cnicNormalized || p.cnic || prev.cnic,
      }))
      showToast('success', 'Patient found and autofilled')
    } catch {
      showToast('error', 'No patient found for this MR number')
    }
  }



  async function onPhoneChange(e: React.ChangeEvent<HTMLInputElement>) {
    const newPhone = e.target.value
    const digitsOnly = String(newPhone || '').replace(/\D+/g, '').slice(0, 11)
    // Update form with normalized phone number
    update('phone', digitsOnly)

    // Reset previous selections when phone changes
    setPhonePatients([])
    setShowPhonePicker(false)
    skipLookupKeyRef.current = null
    lastPromptKeyRef.current = null

    const digits = digitsOnly

    // Incremental suggestions once 3+ digits are typed
    if (digits.length >= 3) {
      clearTimeout((window as any).phoneSuggestTimeout)
        ; (window as any).phoneSuggestTimeout = setTimeout(() => {
          runPhoneSuggestLookup(digits)
        }, 250)
    } else {
      setPhoneSuggestItems([])
      setPhoneSuggestOpen(false)
    }

    // Auto-fill if phone number is complete (at least 10 digits)
    if (digits.length >= 10) {
      // Debounce the lookup to avoid too many API calls
      clearTimeout((window as any).phoneLookupTimeout)
        ; (window as any).phoneLookupTimeout = setTimeout(() => {
          autoFillPatientByPhone(digitsOnly)
        }, 500)
    }
  }

  async function runPhoneSuggestLookup(digits: string) {
    try {
      phoneSuggestQueryRef.current = digits
      const r: any = await hospitalApi.searchPatients({ phone: digits, limit: 8 })
      const list: any[] = Array.isArray(r?.patients) ? r.patients : []
      if (phoneSuggestQueryRef.current !== digits) return
      setPhoneSuggestItems(list)
      setPhoneSuggestOpen(list.length > 0)
    } catch {
      setPhoneSuggestItems([])
      setPhoneSuggestOpen(false)
    }
  }

  function selectPhoneSuggestion(p: any) {
    setForm(prev => ({
      ...prev,
      patientName: p.fullName || prev.patientName,
      guardianName: p.fatherName || prev.guardianName,
      guardianRel: p.guardianRel || prev.guardianRel,
      address: p.address || prev.address,
      gender: p.gender || prev.gender,
      age: p.age || prev.age,
      mrNumber: p.mrn || prev.mrNumber,
      phone: p.phoneNormalized || prev.phone,
      cnic: p.cnicNormalized || prev.cnic,
    }))
    setPhoneSuggestOpen(false)
    showToast('success', 'Patient selected')
  }

  async function runNameSuggestLookup(nameQuery: string) {
    try {
      nameSuggestQueryRef.current = nameQuery
      const r: any = await hospitalApi.searchPatients({ name: nameQuery, limit: 8 })
      const list: any[] = Array.isArray(r?.patients) ? r.patients : []
      if (nameSuggestQueryRef.current !== nameQuery) return
      setNameSuggestItems(list)
      setNameSuggestOpen(list.length > 0)
    } catch {
      setNameSuggestItems([])
      setNameSuggestOpen(false)
    }
  }

  function selectNameSuggestion(p: any) {
    setForm(prev => ({
      ...prev,
      patientName: p.fullName || prev.patientName,
      guardianName: p.fatherName || prev.guardianName,
      guardianRel: p.guardianRel || prev.guardianRel,
      address: p.address || prev.address,
      gender: p.gender || prev.gender,
      age: p.age || prev.age,
      mrNumber: p.mrn || prev.mrNumber,
      phone: p.phoneNormalized || prev.phone,
      cnic: p.cnicNormalized || prev.cnic,
    }))
    setNameSuggestOpen(false)
    showToast('success', 'Patient selected')
  }

  function onNameChange(e: React.ChangeEvent<HTMLInputElement>) {
    const newName = e.target.value
    update('patientName', newName)
    setNameSuggestOpen(false)
    const trimmed = newName.trim()
    if (trimmed.length >= 2) {
      clearTimeout((window as any).nameSuggestTimeout)
        ; (window as any).nameSuggestTimeout = setTimeout(() => {
        runNameSuggestLookup(trimmed)
      }, 300)
    } else {
      setNameSuggestItems([])
      setNameSuggestOpen(false)
    }
  }

  function clearPatientFieldsKeepPhone() {
    setForm(prev => ({
      ...prev,
      patientName: '',
      guardianName: '',
      guardianRel: '',
      address: '',
      gender: '',
      age: '',
      mrNumber: '',
      cnic: '',
      // keep phone as-is
      phone: prev.phone,
    }))
    setShowPhonePicker(false)
    setPhoneSuggestOpen(false)
    showToast('success', 'Cleared patient details — you can enter a new patient with same phone')
  }

  async function autoFillPatientByPhone(phoneNumber: string) {
    const digits = phoneNumber.replace(/\D+/g, '')
    if (!digits || digits.length < 10) return // Need at least 10 digits for phone lookup

    try {
      const r: any = await hospitalApi.searchPatients({ phone: digits, limit: 10 })
      const list: any[] = Array.isArray(r?.patients) ? r.patients : []

      if (list.length > 1) {
        // Multiple patients under same phone - show picker
        setPhonePatients(list)
        setShowPhonePicker(true)
        showToast('success', `${list.length} patients found - select one`)
      } else if (list.length === 1) {
        // One match: still show picker so user can choose it OR create a new patient under same phone.
        setPhonePatients(list)
        setShowPhonePicker(true)
        showToast('success', 'Patient found - select or create new')
      } else {
        // No patients - allow creating new under this phone
        showToast('success', 'New patient - you can create under this phone')
      }
    } catch {
      showToast('error', 'Failed to lookup patient data')
    }
  }

  async function onPhoneBlurNew() {
    await autoFillPatientByPhone(form.phone || '')
  }



  const generateToken = async (e: React.FormEvent) => {
    e.preventDefault()
    const selDoc = doctors.find(d => String(d.id) === String(form.doctor))
    const selDept = departments.find(d => String(d.id) === String(form.departmentId))
    
    // Check if at least one department or at least one service is selected
    if (!form.departmentId && form.serviceIds.length === 0) {
      showToast('error', 'Please select a department or at least one service before generating a token')
      return
    }

    try {
      if (isEditMode) {
        if (!tokenId) return
        const feeGross = Math.max(0, Number(form.consultationFee || 0))
        const disc = Math.max(0, Number(form.discount || 0))
        const payload: any = {
          departmentId: form.departmentId || undefined,
          doctorId: form.doctor || undefined,
          serviceIds: form.serviceIds || undefined,
          patientName: form.patientName || undefined,
          phone: form.phone || undefined,
          gender: form.gender || undefined,
          guardianRel: form.guardianRel || undefined,
          guardianName: form.guardianName || undefined,
          cnic: form.cnic || undefined,
          address: form.address || undefined,
          age: form.age || undefined,
          mrn: form.mrNumber || undefined,
          overrideFee: feeGross,
          discount: disc,
        }
        await hospitalApi.updateToken(String(tokenId), payload)
        invalidateCache('/hospital/tokens')
        logAudit('token_edit', `tokenId=${tokenId}, dept=${form.departmentId}, doctor=${selDoc?.name || 'N/A'}, grossFee=${feeGross}, discount=${disc}`)
        showToast('success', 'Token updated')
        // Reset form and exit edit mode after successful update
        reset()
        setSearchParams({})
        return
      }
      // Inline IPD/ICU admit flow: if department is IPD or ICU, require bed and admit immediately
      if (isIPD || isICU) {
        if (!ipdBedId) { showToast('error', `Please select a bed for ${isICU ? 'ICU' : 'IPD'} admission`); return }
        let createdTokenId: string = ''
        const payload: any = {
          departmentId: form.departmentId,
          doctorId: form.doctor || undefined,
          discount: Number(form.discount) || 0,
          paymentRef: undefined,
        }
        if (form.billingType === 'Corporate' && form.corporateCompanyId) {
          payload.corporateId = form.corporateCompanyId
          if (form.corporatePreAuthNo) payload.corporatePreAuthNo = form.corporatePreAuthNo
          if (form.corporateCoPayPercent) payload.corporateCoPayPercent = Number(form.corporateCoPayPercent)
          if (form.corporateCoverageCap) payload.corporateCoverageCap = Number(form.corporateCoverageCap)
        }
        if (form.billingType === 'Cash') payload.paidMethod = 'Cash'
        else if (form.billingType === 'Bank') payload.paidMethod = 'Bank'
        // Patient demographics for saving/updating patient
        payload.patientName = form.patientName || undefined
        payload.phone = form.phone || undefined
        payload.gender = form.gender || undefined
        payload.guardianRel = form.guardianRel || undefined
        payload.guardianName = form.guardianName || undefined
        payload.cnic = form.cnic || undefined
        payload.address = form.address || undefined
        payload.age = form.age || undefined
        if (form.mrNumber) payload.mrn = form.mrNumber
        else if (form.patientName) payload.patientName = form.patientName
        const rawDeposit = String(ipdDeposit || '').trim()
        const cleanedDeposit = rawDeposit.replace(/[^0-9.]/g, '')
        const depAmt = cleanedDeposit ? parseFloat(cleanedDeposit) : NaN
        payload.portal = 'hospital'
        const res = await hospitalApi.createOpdToken({ ...payload, overrideFee: isNaN(depAmt) ? undefined : depAmt }) as any
        invalidateCache('/hospital/tokens')
        createdTokenId = String(res?.token?._id || '')
        if (!createdTokenId) throw new Error('Failed to create token for admission')
        try {
          await hospitalApi.admitFromOpdToken({
            tokenId: createdTokenId,
            bedId: ipdBedId,
            deposit: isNaN(depAmt) ? undefined : depAmt,
            packageAmount: Number(ipdPackageAmount || 0) || undefined,
            advancedAmount: Number(ipdAdvancedAmount || 0) || undefined,
            bedFeeIncludedInPackage: ipdBedFeeInPackage,
          })
        } catch (admitErr: any) {
          const errMsg = String(admitErr?.message || admitErr || '')
          if (errMsg.toLowerCase().includes('already admitted') || errMsg.toLowerCase().includes('discharge the current admission')) {
            setDupModal({ open: true, patientName: form.patientName, mrn: form.mrNumber })
            return // Token was created but admission blocked — do not delete token, do not show slip
          }
          try {
            await hospitalApi.deleteToken(createdTokenId)
          } catch {}
          throw admitErr
        }
        logAudit('token_generate', `ipd_admit dept=IPD, bed=${ipdBedId}`)
        // Show print slip with full details
        const corpName = (form.billingType === 'Corporate' && form.corporateCompanyId) ? (companies.find(c => c.id === String(form.corporateCompanyId))?.name || '') : ''
        const pkgAmt = Number(ipdPackageAmount || 0)
        const advAmt = Number(ipdAdvancedAmount || 0)
        const slip: TokenSlipData = {
          tokenNo: res?.token?.tokenNo || 'N/A',
          departmentName: (departments.find(d => String(d.id) === String(form.departmentId))?.name) || '-',
          doctorName: (doctors.find(d => String(d.id) === String(form.doctor))?.name) || '-',
          patientName: res?.token?.patientName || form.patientName || '-',
          phone: form.phone || '',
          mrn: (res?.token?.mrn || form.mrNumber || ''),
          age: form.age || '',
          gender: form.gender || '',
          guardianRel: form.guardianRel || '',
          guardianName: form.guardianName || '',
          cnic: form.cnic || '',
          address: form.address || '',
          amount: isNaN(depAmt) ? 0 : depAmt,
          discount: 0,
          payable: isNaN(depAmt) ? 0 : depAmt,
          createdAt: res?.token?.createdAt,
          tokenType: form.visitCategory === 'private' ? 'Private' : form.visitCategory === 'subsidized' ? 'Subsidized' : 'General',
          ...(corpName ? { corporateCompanyName: corpName } : {}),
          ...(form.billingType === 'Corporate' && form.corporatePreAuthNo ? { corporatePreAuthNo: form.corporatePreAuthNo } : {}),
          ...(form.billingType === 'Corporate' && form.corporateCoPayPercent ? { corporateCoPayPercent: Number(form.corporateCoPayPercent) } : {}),
          ...(pkgAmt > 0 ? {
            packageAmount: pkgAmt,
            advancedAmount: advAmt,
            pendingAmount: ipdPendingAmount,
            bedFeeIncludedInPackage: ipdBedFeeInPackage,
            bedCharges: isNaN(depAmt) ? 0 : depAmt,
          } : {}),
        }
        setSlipData(slip)
        setShowSlip(true)
        reset()
        setIpdBedId(''); setIpdDeposit(''); setIpdPackageAmount(''); setIpdAdvancedAmount(''); setIpdBedFeeInPackage(false)
        return
      }
      const payload: any = {
        departmentId: form.departmentId || undefined,
        doctorId: form.doctor || undefined,
        serviceIds: form.serviceIds || undefined,
        visitCategory: form.visitCategory || undefined,
        visitType: 'new',
        discount: Number(form.discount) || 0,
        paymentRef: undefined,
      }
      if (form.billingType === 'Corporate' && form.corporateCompanyId) {
        payload.corporateId = form.corporateCompanyId
        if (form.corporatePreAuthNo) payload.corporatePreAuthNo = form.corporatePreAuthNo
        if (form.corporateCoPayPercent) payload.corporateCoPayPercent = Number(form.corporateCoPayPercent)
        if (form.corporateCoverageCap) payload.corporateCoverageCap = Number(form.corporateCoverageCap)
      }
      if (form.billingType === 'Cash') payload.paidMethod = 'Cash'
      else if (form.billingType === 'Bank') payload.paidMethod = 'Bank'
      // Patient demographics for saving/updating patient
      payload.patientName = form.patientName || undefined
      payload.phone = form.phone || undefined
      payload.gender = form.gender || undefined
      payload.guardianRel = form.guardianRel || undefined
      payload.guardianName = form.guardianName || undefined
      payload.cnic = form.cnic || undefined
      payload.address = form.address || undefined
      payload.age = form.age || undefined
      if (form.mrNumber) payload.mrn = form.mrNumber
      else if (form.patientName) payload.patientName = form.patientName
      // If corporate is selected, ensure backend uses the resolved corporate fee
      if (form.billingType === 'Corporate' && form.corporateCompanyId) {
        const feeNum = Number(form.consultationFee)
        if (Number.isFinite(feeNum)) payload.overrideFee = feeNum
      }
      // Add ER-specific fields if Emergency department
      if (isER) {
        payload.triage = form.triage
        payload.arrivalMode = form.arrivalMode
        if (erBedId) payload.bedId = erBedId
      }
      payload.portal = window.location.pathname.startsWith('/reception') ? 'reception' : 'hospital'
      const res = await hospitalApi.createOpdToken(payload) as any
      invalidateCache('/hospital/tokens')
      const tokenNo = res?.token?.tokenNo || 'N/A'
      const resolvedMrn = String(res?.token?.patientId?.mrn || res?.token?.mrn || form.mrNumber || '').trim() || undefined
      // Prepare slip and show (OPD)
      const corpName = (form.billingType === 'Corporate' && form.corporateCompanyId) ? (companies.find(c => c.id === String(form.corporateCompanyId))?.name || '') : ''
      const slip: TokenSlipData = {
        tokenNo,
        departmentName: selDept?.name || '-',
        doctorName: selDoc?.name || '-',
        serviceName: services.filter(s => form.serviceIds.includes(s.id)).map(s => s.name).join(', ') || undefined,
        patientName: form.patientName,
        phone: form.phone || undefined,
        mrn: resolvedMrn,
        age: form.age || undefined,
        gender: form.gender || undefined,
        guardianRel: form.guardianRel || undefined,
        guardianName: form.guardianName || undefined,
        cnic: form.cnic || undefined,
        address: form.address || undefined,
        amount: Number(res?.pricing?.feeResolved ?? res?.pricing?.finalFee ?? finalFee ?? 0),
        discount: Number((res?.pricing?.discount ?? form.discount) || 0),
        payable: Number((res?.pricing?.finalFee ?? finalFee)),
        createdAt: res?.token?.createdAt,
        tokenType: form.visitCategory === 'private' ? 'Private' : form.visitCategory === 'subsidized' ? 'Subsidized' : 'General',
        fbr: {
          status: res?.token?.fbrStatus || res?.fbrStatus || res?.fbr?.status,
          qrCode: res?.token?.fbrQrCode || res?.fbrQrCode || res?.fbr?.qrCode,
          fbrInvoiceNo: res?.token?.fbrInvoiceNo || res?.fbrInvoiceNo || res?.fbr?.fbrInvoiceNo || res?.fbr?.invoiceNumber,
          mode: res?.token?.fbrMode || res?.fbrMode || res?.fbr?.mode,
          error: res?.token?.fbrError || res?.fbrError || res?.fbr?.error,
        } as any,
        ...(corpName ? { corporateCompanyName: corpName } : {}),
        ...(form.billingType === 'Corporate' && form.corporatePreAuthNo ? { corporatePreAuthNo: form.corporatePreAuthNo } : {}),
        ...(form.billingType === 'Corporate' && form.corporateCoPayPercent ? { corporateCoPayPercent: Number(form.corporateCoPayPercent) } : {}),
      }
      setSlipData(slip)
      setShowSlip(true)
      logAudit('token_generate', `patient=${form.patientName || 'N/A'}, dept=${form.departmentId}, doctor=${selDoc?.name || 'N/A'}, fee=${res?.pricing?.finalFee ?? finalFee}`)
    } catch (err: any) {
      showToast('error', err?.message || 'Failed to generate token')
    }
    reset()
  }

  // Global keyboard shortcuts: Ctrl+Enter / F12 = Generate Token
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'F12' || ((e.ctrlKey || e.metaKey) && e.key === 'Enter')) {
        e.preventDefault()
        generateToken({ preventDefault: () => {} } as any)
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [form, ipdBedId, ipdDeposit, ipdPackageAmount, ipdAdvancedAmount, erBedId])

  // Helper: move focus to next input on Enter (unless Shift is held)
  function onEnterNext(e: React.KeyboardEvent<HTMLElement>) {
    if (e.key !== 'Enter' || e.shiftKey) return
    e.preventDefault()
    const focusable = Array.from(
      document.querySelectorAll<HTMLElement>(
        'input:not([type="hidden"]):not([disabled]), select:not([disabled]), textarea:not([disabled]), button[type="submit"]:not([disabled])'
      )
    ).filter(el => !el.closest('[role="listbox"]') && el.offsetParent !== null)
    const idx = focusable.indexOf(e.currentTarget as HTMLElement)
    if (idx >= 0 && idx < focusable.length - 1) {
      focusable[idx + 1].focus()
      if ((focusable[idx + 1] as HTMLInputElement).select) (focusable[idx + 1] as HTMLInputElement).select()
    }
  }

  return (
    <div className="hospital-scope min-h-dvh bg-slate-50 p-6 text-slate-900 dark:bg-[#0b1220] dark:text-slate-100">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-800 dark:text-slate-100">Token Generator</h2>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Create OPD, IPD or ER tokens for patients</p>
        </div>
        <div className="hidden sm:flex items-center gap-2 text-[11px] text-slate-400 font-medium">
          <kbd className="rounded-md border border-slate-200 bg-white px-2 py-1 font-mono text-slate-500 shadow-sm dark:border-slate-700 dark:bg-slate-800">Enter</kbd> Next field
          <span className="text-slate-300">·</span>
          <kbd className="rounded-md border border-slate-200 bg-white px-2 py-1 font-mono text-slate-500 shadow-sm dark:border-slate-700 dark:bg-slate-800">Ctrl+Enter</kbd> Generate
          <span className="text-slate-300">·</span>
          <kbd className="rounded-md border border-slate-200 bg-white px-2 py-1 font-mono text-slate-500 shadow-sm dark:border-slate-700 dark:bg-slate-800">F12</kbd> Generate
        </div>
      </div>
      {loadingToken && (
        <div className="mb-4 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 shadow-sm dark:border-slate-700 dark:bg-slate-800">Loading token...</div>
      )}
      <form onSubmit={generateToken} className="space-y-6">
        <section className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:bg-slate-800 dark:border-slate-700">
            <h3 className="mb-4 flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              <span className="h-1.5 w-1.5 rounded-full bg-rose-400"></span> Patient Information
            </h3>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="md:col-span-2">
                <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">Phone</label>
                <div ref={phoneSuggestWrapRef} className="relative">
                  <div className="flex items-center gap-2">
                    <input
                      className="w-full rounded-md border border-slate-300 px-3 py-2 outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-200 dark:bg-slate-900 dark:border-slate-700 dark:text-white dark:placeholder-slate-500"
                      placeholder="Type phone to search"
                      value={form.phone}
                      maxLength={11}
                      onChange={onPhoneChange}
                      onBlur={onPhoneBlurNew}
                      onFocus={() => { if (phoneSuggestItems.length > 0) setPhoneSuggestOpen(true) }}
                      onKeyDown={onEnterNext}
                      ref={phoneRef}
                    />
                  </div>
                  {phoneSuggestOpen && (
                    <div className="absolute z-20 mt-1 max-h-64 w-full overflow-y-auto rounded-md border border-slate-200 bg-white shadow-lg dark:bg-slate-800 dark:border-slate-700">
                      {phoneSuggestItems.length === 0 ? (
                        <div className="px-3 py-2 text-sm text-slate-500 dark:text-slate-400">No results</div>
                      ) : (
                        phoneSuggestItems.map((p: any, idx: number) => (
                          <button
                            type="button"
                            key={p._id || idx}
                            onClick={() => selectPhoneSuggestion(p)}
                            className="flex w-full flex-col items-start px-3 py-2 text-left hover:bg-slate-50 dark:hover:bg-slate-700/50"
                          >
                            <div className="text-sm font-medium text-slate-800 dark:text-slate-200">{p.fullName || 'Unnamed'} <span className="text-xs text-slate-500 dark:text-slate-400">{p.mrn || '-'}</span></div>
                            <div className="text-xs text-slate-600 dark:text-slate-400">{p.phoneNormalized || ''} • Age: {p.age || '-'} • {p.gender || '-'}</div>
                            {p.address && <div className="text-xs text-slate-500 dark:text-slate-400 truncate">{p.address}</div>}
                          </button>
                        ))
                      )}
                    </div>
                  )}
                </div>
              </div>
              <div className="md:col-span-2">
                <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">Patient Name</label>
                <div ref={nameSuggestWrapRef} className="relative">
                  <input className="w-full rounded-md border border-slate-300 px-3 py-2 outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-200 dark:bg-slate-900 dark:border-slate-700 dark:text-white dark:placeholder-slate-500" placeholder="Type name to search" value={form.patientName} onChange={onNameChange} onFocus={() => { if (nameSuggestItems.length > 0) setNameSuggestOpen(true) }} onKeyDown={onEnterNext} ref={nameRef} />
                  {nameSuggestOpen && (
                    <div className="absolute z-20 mt-1 max-h-64 w-full overflow-y-auto rounded-md border border-slate-200 bg-white shadow-lg dark:bg-slate-800 dark:border-slate-700">
                      {nameSuggestItems.length === 0 ? (
                        <div className="px-3 py-2 text-sm text-slate-500 dark:text-slate-400">No results</div>
                      ) : (
                        nameSuggestItems.map((p: any, idx: number) => (
                          <button
                            type="button"
                            key={p._id || idx}
                            onClick={() => selectNameSuggestion(p)}
                            className="flex w-full flex-col items-start px-3 py-2 text-left hover:bg-slate-50 dark:hover:bg-slate-700/50"
                          >
                            <div className="text-sm font-medium text-slate-800 dark:text-slate-200">{p.fullName || 'Unnamed'} <span className="text-xs text-slate-500 dark:text-slate-400">{p.mrn || '-'}</span></div>
                            <div className="text-xs text-slate-600 dark:text-slate-400">{p.phoneNormalized || ''} • Age: {p.age || '-'} • {p.gender || '-'}</div>
                            {p.address && <div className="text-xs text-slate-500 dark:text-slate-400 truncate">{p.address}</div>}
                          </button>
                        ))
                      )}
                    </div>
                  )}
                </div>
              </div>
              <div className="md:col-span-2">
                <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">Search by MR Number</label>
                <input className="w-full rounded-md border border-slate-300 px-3 py-2 outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-200 dark:bg-slate-900 dark:border-slate-700 dark:text-white dark:placeholder-slate-500" placeholder="Enter MR# (e.g., MR-15)" value={form.mrNumber} onChange={e => update('mrNumber', e.target.value)} onKeyDown={onMrnKeyDown} />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">Age</label>
                <input className="w-full rounded-md border border-slate-300 px-3 py-2 outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-200 dark:bg-slate-900 dark:border-slate-700 dark:text-white dark:placeholder-slate-500" placeholder="e.g., 25" value={form.age} onChange={e => update('age', e.target.value)} onKeyDown={onEnterNext} />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">Gender</label>
                <select className="w-full rounded-md border border-slate-300 px-3 py-2 outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-200 dark:bg-slate-900 dark:border-slate-700 dark:text-white" value={form.gender} onChange={e => update('gender', e.target.value)} onKeyDown={onEnterNext}>
                  <option value="">Select gender</option>
                  <option className="dark:bg-slate-900">Male</option>
                  <option className="dark:bg-slate-900">Female</option>
                  <option className="dark:bg-slate-900">Other</option>
                </select>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">Guardian</label>
                <select className="w-full rounded-md border border-slate-300 px-3 py-2 outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-200 dark:bg-slate-900 dark:border-slate-700 dark:text-white" value={form.guardianRel} onChange={e => update('guardianRel', e.target.value)} onKeyDown={onEnterNext}>
                  <option value="">Select</option>
                  <option className="dark:bg-slate-900" value="S/O">S/O (Son of)</option>
                  <option className="dark:bg-slate-900" value="D/O">D/O (Daughter of)</option>
                  <option className="dark:bg-slate-900" value="W/O">W/O (Wife of)</option>
                  <option className="dark:bg-slate-900" value="Father">Father</option>
                  <option className="dark:bg-slate-900" value="Husband">Husband</option>
                  <option className="dark:bg-slate-900" value="Mother">Mother</option>
                  <option className="dark:bg-slate-900" value="Guardian">Guardian</option>
                </select>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">Guardian Name</label>
                <input className="w-full rounded-md border border-slate-300 px-3 py-2 outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-200 dark:bg-slate-900 dark:border-slate-700 dark:text-white dark:placeholder-slate-500" placeholder="Father/Guardian Name" value={form.guardianName} onChange={e => update('guardianName', e.target.value)} onKeyDown={onEnterNext} />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">CNIC</label>
                <input className="w-full rounded-md border border-slate-300 px-3 py-2 outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-200 dark:bg-slate-900 dark:border-slate-700 dark:text-white dark:placeholder-slate-500" placeholder="13-digit CNIC (no dashes)" value={form.cnic} onChange={e => update('cnic', e.target.value)} onKeyDown={onEnterNext} />
              </div>
              <div className="md:col-span-2">
                <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">Address</label>
                <textarea className="w-full rounded-md border border-slate-300 px-3 py-2 outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-200 dark:bg-slate-900 dark:border-slate-700 dark:text-white dark:placeholder-slate-500" rows={3} placeholder="Residential Address" value={form.address} onChange={e => update('address', e.target.value)} onKeyDown={onEnterNext} />
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:bg-slate-800 dark:border-slate-700">
            <h3 className="mb-4 flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              <span className="h-1.5 w-1.5 rounded-full bg-sky-400"></span> Visit & Billing
            </h3>
            <div className="grid grid-cols-1 gap-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">Doctor</label>
                <SearchSelect
                  options={doctors.map(d => ({ value: d.id, label: d.name }))}
                  value={form.doctor}
                  onChange={(v) => update('doctor', v)}
                  placeholder="Select doctor"
                  onEnter={onEnterNext}
                />
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Doctor selection is optional.</p>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">Service(s) (Optional)</label>
                <MultiSearchSelect
                  options={services.map(s => ({ value: s.id, label: `${s.name} (Rs ${s.price})` }))}
                  value={form.serviceIds}
                  onChange={(ids) => {
                    update('serviceIds' as any, ids as any)
                    // Auto-fill fee by summing selected services
                    const total = services
                      .filter(s => ids.includes(s.id))
                      .reduce((sum, s) => sum + s.price, 0)
                    if (ids.length > 0) {
                      update('consultationFee', String(total))
                      feeManuallyEditedRef.current = true
                    }
                  }}
                  placeholder="Select service(s)"
                  onEnter={onEnterNext}
                />
              </div>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">Department</label>
                  <SearchSelect
                    options={departments.map(d => ({ value: d.id, label: d.name }))}
                    value={form.departmentId}
                    onChange={(v) => update('departmentId', v)}
                    placeholder="Select department"
                    onEnter={onEnterNext}
                  />
                </div>
                {!isIPD && (
                  <div>
                    <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">Token Type</label>
                    <select
                      value={form.visitCategory}
                      onChange={e => {
                        lastAutoConsultationFeeRef.current = null
                        feeManuallyEditedRef.current = false
                        update('visitCategory', e.target.value as any)
                      }}
                      onKeyDown={onEnterNext}
                      className="w-full rounded-md border border-slate-300 px-3 py-2 outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-200 dark:bg-slate-900 dark:border-slate-700 dark:text-white"
                    >
                      <option className="dark:bg-slate-900" value="general">General</option>
                      <option className="dark:bg-slate-900" value="private">Private</option>
                      <option className="dark:bg-slate-900" value="subsidized">Subsidized</option>
                    </select>
                  </div>
                )}
              </div>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">Billing Type</label>
                  <select className="w-full rounded-md border border-slate-300 px-3 py-2 outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-200 dark:bg-slate-900 dark:border-slate-700 dark:text-white" value={form.billingType} onChange={e => update('billingType', e.target.value)} onKeyDown={onEnterNext}>
                    <option className="dark:bg-slate-900">Cash</option>
                    <option className="dark:bg-slate-900">Bank</option>
                    <option className="dark:bg-slate-900">Corporate</option>
                  </select>
                </div>
                {form.billingType === 'Corporate' && (
                  <>
                    <div>
                      <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">Corporate Company</label>
                      <select value={form.corporateCompanyId} onChange={e => update('corporateCompanyId', e.target.value)} onKeyDown={onEnterNext} className="w-full rounded-md border border-slate-300 px-3 py-2 outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-200 dark:bg-slate-900 dark:border-slate-700 dark:text-white">
                        <option className="dark:bg-slate-900" value="">None</option>
                        {companies.map(c => (
                          <option className="dark:bg-slate-900" key={c.id} value={c.id}>{c.name}</option>
                        ))}
                      </select>
                    </div>
                    {form.corporateCompanyId && (
                      <div className="grid grid-cols-1 gap-4 md:grid-cols-3 md:col-span-2">
                        <div>
                          <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">Pre-Auth No</label>
                          <input value={form.corporatePreAuthNo} onChange={e => update('corporatePreAuthNo', e.target.value)} onKeyDown={onEnterNext} className="w-full rounded-md border border-slate-300 px-3 py-2 outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-200 dark:bg-slate-900 dark:border-slate-700 dark:text-white dark:placeholder-slate-500" placeholder="Optional" />
                        </div>
                        <div>
                          <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">Co-Pay %</label>
                          <input value={form.corporateCoPayPercent} onChange={e => update('corporateCoPayPercent', e.target.value)} onKeyDown={onEnterNext} className="w-full rounded-md border border-slate-300 px-3 py-2 outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-200 dark:bg-slate-900 dark:border-slate-700 dark:text-white dark:placeholder-slate-500" placeholder="0-100" />
                        </div>
                        <div>
                          <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">Coverage Cap</label>
                          <input value={form.corporateCoverageCap} onChange={e => update('corporateCoverageCap', e.target.value)} onKeyDown={onEnterNext} className="w-full rounded-md border border-slate-300 px-3 py-2 outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-200 dark:bg-slate-900 dark:border-slate-700 dark:text-white dark:placeholder-slate-500" placeholder="e.g., 5000" />
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
              {(isIPD || isICU) && (
                <>
                  <div>
                    <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">Select Bed</label>
                    <SearchSelect
                      options={ipdBedOptions.map(b => ({ value: String(b._id), label: `${b.floorName ? `${b.floorName} / ` : ''}${b.locationName ? `${b.locationName} / ` : ''}${b.label}${b.charges != null ? ` - (Rs. ${b.charges})` : ''}` }))}
                      value={ipdBedId}
                      onChange={(v) => {
                        setIpdBedId(v)
                        const sel = ipdBeds.find(b => String(b._id) === String(v))
                        if (sel && sel.charges != null) setIpdDeposit(String(sel.charges))
                      }}
                      placeholder="Search and select a bed..."
                      onEnter={onEnterNext}
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">Bed Charges</label>
                    <input value={ipdDeposit} onChange={e => setIpdDeposit(e.target.value)} onKeyDown={onEnterNext} className="w-full rounded-md border border-slate-300 px-3 py-2 outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-200 dark:bg-slate-900 dark:border-slate-700 dark:text-white dark:placeholder-slate-500" placeholder="e.g., Rs. 1000" />
                  </div>
                  {isIPD && (
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                      <div>
                        <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">Package Amount</label>
                        <input value={ipdPackageAmount} onChange={e => setIpdPackageAmount(e.target.value)} onKeyDown={onEnterNext} className="w-full rounded-md border border-slate-300 px-3 py-2 outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-200 dark:bg-slate-900 dark:border-slate-700 dark:text-white dark:placeholder-slate-500" placeholder="Total package cost" />
                      </div>
                      <div>
                        <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">Advance Amount</label>
                        <input value={ipdAdvancedAmount} onChange={e => setIpdAdvancedAmount(e.target.value)} onKeyDown={onEnterNext} className="w-full rounded-md border border-slate-300 px-3 py-2 outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-200 dark:bg-slate-900 dark:border-slate-700 dark:text-white dark:placeholder-slate-500" placeholder="Deposit paid" />
                      </div>
                      <div>
                        <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">Pending Amount</label>
                        <div className="flex h-10 items-center rounded-md border border-rose-200 bg-rose-50 px-3 text-sm font-semibold text-rose-700 dark:bg-rose-900/30 dark:border-rose-800 dark:text-rose-400">Rs. {ipdPendingAmount.toFixed(2)}</div>
                      </div>
                    </div>
                  )}
                  {isIPD && Number(ipdPackageAmount || 0) > 0 && (
                    <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 dark:bg-slate-900/50 dark:border-slate-700">
                      <input
                        id="bedFeeInPackage"
                        type="checkbox"
                        checked={ipdBedFeeInPackage}
                        onChange={e => setIpdBedFeeInPackage(e.target.checked)}
                        className="h-4 w-4 rounded border-slate-300 text-violet-600 focus:ring-violet-500"
                      />
                      <label htmlFor="bedFeeInPackage" className="text-sm text-slate-700 dark:text-slate-300 cursor-pointer select-none">
                        Bed charges <strong>{ipdBedFeeInPackage ? 'included' : 'NOT included'}</strong> in package
                      </label>
                      <span className="ml-auto text-xs text-slate-400">
                        {ipdBedFeeInPackage
                          ? 'Bed fee is part of package'
                          : `Bed fee Rs ${(Number(ipdDeposit || 0)).toFixed(2)} will be charged separately`}
                      </span>
                    </div>
                  )}
                </>
              )}
              {isER && (
                <>
                  <div>
                    <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">Triage Level</label>
                    <select
                      value={form.triage}
                      onChange={e => update('triage', e.target.value as any)}
                      onKeyDown={onEnterNext}
                      className="w-full rounded-md border border-slate-300 px-3 py-2 outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-200 dark:bg-slate-900 dark:border-slate-700 dark:text-white"
                    >
                      <option className="dark:bg-slate-900" value="red">Red (Critical)</option>
                      <option className="dark:bg-slate-900" value="yellow">Yellow (Urgent)</option>
                      <option className="dark:bg-slate-900" value="green">Green (Minor)</option>
                    </select>
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">Arrival Mode</label>
                    <select
                      value={form.arrivalMode}
                      onChange={e => update('arrivalMode', e.target.value as any)}
                      onKeyDown={onEnterNext}
                      className="w-full rounded-md border border-slate-300 px-3 py-2 outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-200 dark:bg-slate-900 dark:border-slate-700 dark:text-white"
                    >
                      <option className="dark:bg-slate-900" value="walk-in">Walk-in</option>
                      <option className="dark:bg-slate-900" value="ambulance">Ambulance</option>
                      <option className="dark:bg-slate-900" value="referral">Referral</option>
                    </select>
                  </div>
                  <div className="md:col-span-2">
                    <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">Select Bed <span className="text-slate-400">(Optional)</span></label>
                    <SearchSelect
                      options={ipdBedOptions.map(b => ({ value: String(b._id), label: `${b.floorName ? `${b.floorName} / ` : ''}${b.locationName ? `${b.locationName} / ` : ''}${b.label}${b.charges != null ? ` - (Rs. ${b.charges})` : ''}` }))}
                      value={erBedId}
                      onChange={(v) => setErBedId(v)}
                      placeholder="Search and select a bed (optional)..."
                      onEnter={onEnterNext}
                    />
                  </div>
                </>
              )}
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:bg-slate-800 dark:border-slate-700">
          <h3 className="mb-4 flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400"></span> Fee Details
          </h3>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">Consultation Fee</label>
              <input
                className="w-full rounded-md border border-slate-300 px-3 py-2 outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-200 dark:bg-slate-900 dark:border-slate-700 dark:text-white dark:placeholder-slate-500"
                placeholder="Fee"
                value={form.consultationFee}
                onChange={e => {
                  feeManuallyEditedRef.current = true
                  update('consultationFee', e.target.value)
                }}
                onKeyDown={onEnterNext}
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">Discount</label>
              <input className="w-full rounded-md border border-slate-300 px-3 py-2 outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-200 dark:bg-slate-900 dark:border-slate-700 dark:text-white dark:placeholder-slate-500" placeholder="0" value={form.discount} onChange={e => update('discount', e.target.value)} onKeyDown={onEnterNext} />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">Final Fee</label>
              <div className="flex h-10 items-center rounded-md border border-emerald-200 bg-emerald-50 px-3 text-sm font-semibold text-emerald-700 dark:bg-emerald-900/30 dark:border-emerald-800 dark:text-emerald-400">Rs. {(isIPD ? (Number(ipdDeposit || '0') || 0).toFixed(2) : finalFee.toFixed(2))}</div>
            </div>
          </div>
        </section>



          <div className="flex items-center justify-end gap-3 pt-2">
            <button type="button" onClick={reset} className="rounded-lg border border-slate-300 bg-white px-5 py-2.5 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50 active:scale-95 transition-all dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700">Reset Form</button>
            <button type="submit" className="rounded-lg bg-linear-to-r from-violet-700 to-indigo-600 px-6 py-2.5 text-sm font-semibold text-white shadow-lg shadow-violet-500/25 hover:shadow-violet-500/40 hover:brightness-110 active:scale-95 transition-all dark:from-violet-600 dark:to-indigo-500">
              {isEditMode ? 'Update Token' : 'Generate Token'}
            </button>
          </div>
      </form>
      {showSlip && slipData && (
        <Hospital_TokenSlip open={showSlip} onClose={() => setShowSlip(false)} data={slipData} autoPrint={false} />
      )}


      {confirmPatient && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-xl bg-white shadow-2xl ring-1 ring-black/5 dark:bg-slate-900 dark:ring-white/10">
            <div className="border-b border-slate-200 px-5 py-3 text-base font-semibold text-slate-800 dark:border-slate-800 dark:text-slate-100">Confirm Patient</div>
            <div className="px-5 py-4 text-sm whitespace-pre-wrap text-slate-700 dark:text-slate-300">{confirmPatient.summary}</div>
            <div className="flex items-center justify-end gap-2 border-t border-slate-200 px-5 py-3 dark:border-slate-800">
              <button onClick={() => { if (confirmPatient) skipLookupKeyRef.current = confirmPatient.key; setConfirmPatient(null); setTimeout(() => { if (focusAfterConfirm === 'phone') phoneRef.current?.focus(); else if (focusAfterConfirm === 'name') nameRef.current?.focus(); setFocusAfterConfirm(null) }, 0) }} className="rounded-md border border-slate-300 px-3 py-1.5 text-sm dark:border-slate-600 dark:text-slate-300">Cancel</button>
              <button onClick={() => {
                const p = confirmPatient.patient
                try {
                  setForm(prev => ({
                    ...prev,
                    patientName: p.fullName || prev.patientName,
                    guardianName: p.fatherName || prev.guardianName,
                    guardianRel: p.guardianRel || prev.guardianRel,
                    address: p.address || prev.address,
                    gender: p.gender || prev.gender,
                    age: p.age || prev.age,
                    mrNumber: p.mrn || prev.mrNumber,
                    phone: p.phoneNormalized || prev.phone,
                    cnic: p.cnicNormalized || prev.cnic,
                  }))
                } finally { if (confirmPatient) skipLookupKeyRef.current = confirmPatient.key; setConfirmPatient(null) }
              }} className="rounded-md bg-violet-700 px-3 py-1.5 text-sm font-medium text-white dark:bg-violet-600">Apply</button>
            </div>
          </div>
        </div>
      )}
      {showPhonePicker && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-xl bg-white shadow-2xl ring-1 ring-black/5 dark:bg-slate-900 dark:ring-white/10">
            <div className="border-b border-slate-200 px-5 py-3 text-base font-semibold text-slate-800 dark:border-slate-800 dark:text-slate-100">Select Patient (Phone: {form.phone})</div>
            <div className="max-h-96 overflow-y-auto p-2 dark:bg-slate-900">
              {phonePatients.map((p, idx) => (
                <button key={p._id || idx} onClick={() => {
                  setForm(prev => ({
                    ...prev,
                    patientName: p.fullName || prev.patientName,
                    guardianName: p.fatherName || prev.guardianName,
                    guardianRel: p.guardianRel || prev.guardianRel,
                    address: p.address || prev.address,
                    gender: p.gender || prev.gender,
                    age: p.age || prev.age,
                    mrNumber: p.mrn || prev.mrNumber,
                    phone: p.phoneNormalized || prev.phone,
                    cnic: p.cnicNormalized || prev.cnic,
                  }))
                  setShowPhonePicker(false)
                  showToast('success', 'Patient selected')
                }} className="mb-2 w-full rounded-lg border border-slate-200 p-3 text-left hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800">
                  <div className="text-sm font-medium text-slate-800 dark:text-slate-200">{p.fullName || 'Unnamed'}</div>
                  <div className="text-xs text-slate-500 dark:text-slate-400">{p.mrn || '-'} • {p.phoneNormalized || ''}</div>
                  {p.address && <div className="text-[11px] text-slate-400 dark:text-slate-500">{p.address}</div>}
                </button>
              ))}
            </div>
            <div className="flex items-center justify-end gap-2 border-t border-slate-200 px-5 py-3 dark:border-slate-800">
              <button onClick={() => { setShowPhonePicker(false); showToast('success', 'You can create a new patient under this phone') }} className="rounded-md border border-slate-300 px-3 py-1.5 text-sm dark:border-slate-600 dark:text-slate-300">Cancel</button>
              <button onClick={() => {
                // Create new patient under this phone number
                clearPatientFieldsKeepPhone()
                setShowPhonePicker(false)
              }} className="rounded-md bg-violet-700 px-3 py-1.5 text-sm font-medium text-white dark:bg-violet-600">Create New Patient</button>
            </div>
          </div>
        </div>
      )}
      {dupModal.open && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/50 px-4">
          <div className="w-full max-w-md rounded-xl bg-white shadow-2xl ring-1 ring-black/5 p-5">
            <div className="flex items-center gap-2 text-amber-600 mb-2">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5"><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
              <span className="font-semibold">Patient Already Admitted</span>
            </div>
            <p className="text-sm text-slate-700 mb-1">
              <strong>{dupModal.patientName || 'This patient'}</strong> is currently admitted in the hospital.
            </p>
            {dupModal.mrn && <p className="text-sm text-slate-500 mb-3">MR # {dupModal.mrn}</p>}
            <p className="text-sm text-slate-600 mb-4">Please discharge the current admission before creating a new one.</p>
            <div className="flex justify-end">
              <button onClick={() => setDupModal({ open: false })} className="rounded-md bg-amber-600 px-4 py-2 text-sm font-medium text-white hover:bg-amber-700">OK</button>
            </div>
          </div>
        </div>
      )}
      {toast && (
        <div className={`fixed bottom-4 right-4 z-50 rounded-md px-4 py-2 text-sm shadow-lg ${toast.type === 'success' ? 'bg-emerald-600 text-white' : 'bg-rose-600 text-white'}`}>
          {toast.message}
        </div>
      )}
    </div>
  )
}
