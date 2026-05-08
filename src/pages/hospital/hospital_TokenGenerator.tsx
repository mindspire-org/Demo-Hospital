import { useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { logAudit } from '../../utils/hospital_audit'
import { corporateApi, hospitalApi } from '../../utils/api'
import { getLocalDate } from '../../utils/date'
import Hospital_TokenSlip, { type TokenSlipData } from '../../components/hospital/Hospital_TokenSlip'
import { printConsentForm } from '../../utils/printConsentForm'
import { FileText } from 'lucide-react'

type SearchOption = { value: string; label: string }
function MultiSearchSelect({ options, selected, onToggle, placeholder }: { options: SearchOption[]; selected: string[]; onToggle: (v: string) => void; placeholder?: string }) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (!ref.current) return
      if (!ref.current.contains(e.target as any)) setOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [])
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return options.filter(o => !q || o.label.toLowerCase().includes(q)).slice(0, 100)
  }, [options, query])
  const selectedLabels = useMemo(() => {
    return selected.map(id => options.find(o => String(o.value) === String(id))?.label).filter(Boolean) as string[]
  }, [options, selected])
  return (
    <div ref={ref} className="relative">
      <div
        className="w-full min-h-[42px] rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none transition-shadow focus-within:border-violet-400 focus-within:ring-2 focus-within:ring-violet-100 dark:bg-slate-900 dark:border-slate-700 dark:text-white dark:focus-within:border-violet-500 dark:focus-within:ring-violet-900/40 cursor-text flex flex-wrap gap-1.5 items-center"
        onClick={() => { setOpen(true); (ref.current?.querySelector('input') as HTMLElement)?.focus() }}
      >
        {selectedLabels.length > 0 ? selectedLabels.map(label => (
          <span key={label} className="inline-flex items-center gap-1 rounded-md bg-violet-100 px-2 py-0.5 text-xs font-medium text-violet-700 dark:bg-violet-900/40 dark:text-violet-400">
            {label}
            <button type="button" onClick={(e) => { e.stopPropagation(); const opt = options.find(o => o.label === label); if (opt) onToggle(String(opt.value)) }} className="text-violet-400 hover:text-violet-700 dark:hover:text-violet-300">×</button>
          </span>
        )) : (
          <span className="text-slate-400 dark:text-slate-500">{placeholder || 'Select...'}</span>
        )}
        <input
          value={open ? query : ''}
          onFocus={() => { setOpen(true); setQuery('') }}
          onChange={e => setQuery(e.target.value)}
          onKeyDown={e => { if (e.key === 'Escape') { setOpen(false); setQuery('') } }}
          className="min-w-[60px] flex-1 border-0 bg-transparent p-0 text-sm outline-none placeholder:text-slate-400 dark:placeholder:text-slate-500"
          placeholder={selectedLabels.length > 0 ? 'Add more...' : ''}
        />
      </div>
      {open && (
        <div className="absolute z-20 mt-1 max-h-64 w-full overflow-y-auto rounded-lg border border-slate-200 bg-white shadow-xl dark:bg-slate-800 dark:border-slate-700">
          {filtered.length === 0 ? (
            <div className="px-3 py-2 text-sm text-slate-500 dark:text-slate-400">No results</div>
          ) : filtered.map(opt => {
            const isSelected = selected.includes(String(opt.value))
            return (
              <button
                type="button"
                key={String(opt.value)}
                onClick={() => { onToggle(String(opt.value)); setQuery('') }}
                className={`flex w-full items-center justify-between px-3 py-2 text-left hover:bg-slate-50 dark:hover:bg-slate-700/60 ${isSelected ? 'bg-violet-50 dark:bg-slate-700/40' : ''}`}
              >
                <div className="text-sm text-slate-800 dark:text-slate-200">{opt.label}</div>
                {isSelected && <span className="text-xs text-violet-600 dark:text-violet-400">✓</span>}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
function SearchSelect({ options, value, onChange, placeholder }: { options: SearchOption[]; value: string; onChange: (v: string) => void; placeholder?: string }) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [highlightIdx, setHighlightIdx] = useState(-1)
  const ref = useRef<HTMLDivElement>(null)
  const listRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (!ref.current) return
      if (!ref.current.contains(e.target as any)) setOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [])
  const selectedLabel = useMemo(() => (options.find(o => String(o.value) === String(value))?.label || ''), [options, value])
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return options.filter(o => !q || o.label.toLowerCase().includes(q)).slice(0, 100)
  }, [options, query])
  // Reset highlight when filtered list changes
  useEffect(() => { setHighlightIdx(-1) }, [filtered])
  // Scroll highlighted item into view
  useEffect(() => {
    if (highlightIdx < 0 || !listRef.current) return
    const el = listRef.current.children[highlightIdx] as HTMLElement | undefined
    el?.scrollIntoView({ block: 'nearest' })
  }, [highlightIdx])
  function onKeyDown(e: React.KeyboardEvent) {
    if (!open) {
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp' || e.key === 'Enter') { setOpen(true); setQuery(''); e.preventDefault() }
      return
    }
    if (e.key === 'ArrowDown') { e.preventDefault(); setHighlightIdx(i => Math.min(i + 1, filtered.length - 1)) }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setHighlightIdx(i => Math.max(i - 1, 0)) }
    else if (e.key === 'Enter') {
      e.preventDefault()
      if (highlightIdx >= 0 && highlightIdx < filtered.length) { onChange(String(filtered[highlightIdx].value)); setOpen(false); setQuery('') }
    }
    else if (e.key === 'Escape') { setOpen(false); setQuery('') }
  }
  return (
    <div ref={ref} className="relative">
      <input
        value={open ? query : selectedLabel}
        onFocus={() => { setOpen(true); setQuery('') }}
        onChange={e => { setQuery(e.target.value); setHighlightIdx(-1) }}
        onKeyDown={onKeyDown}
        placeholder={placeholder}
        className="w-full rounded-md border border-slate-300 px-3 py-2 outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-200"
      />
      <button type="button" onClick={() => setOpen(o => !o)} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-500">▾</button>
      {open && (
        <div ref={listRef} className="absolute z-20 mt-1 max-h-64 w-full overflow-y-auto rounded-md border border-slate-200 bg-white shadow-lg">
          {filtered.length === 0 ? (
            <div className="px-3 py-2 text-sm text-slate-500">No results</div>
          ) : filtered.map((opt, idx) => (
            <button
              type="button"
              key={String(opt.value)}
              onClick={() => { onChange(String(opt.value)); setOpen(false); setQuery('') }}
              className={`flex w-full items-center justify-between px-3 py-2 text-left ${idx === highlightIdx ? 'bg-violet-50' : 'hover:bg-slate-50'}`}
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

export default function Hospital_TokenGenerator() {
  const [searchParams] = useSearchParams()
  const tokenId = searchParams.get('tokenId')
  const isEditMode = Boolean(tokenId)
  const [departments, setDepartments] = useState<Array<{ id: string; name: string; fee?: number }>>([])
  const [doctors, setDoctors] = useState<Array<{ id: string; name: string; publicFee?: number; privateFee?: number; fee?: number }>>([])
  const [companies, setCompanies] = useState<Array<{ id: string; name: string }>>([])
  const [erServices, setErServices] = useState<Array<{ id: string; name: string; category?: string; price?: number }>>([])
  const lastAutoConsultationFeeRef = useRef<string | null>(null)
  const feeManuallyEditedRef = useRef(false)
  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const dRes = await hospitalApi.listDepartments() as any
        const deps = (dRes.departments || dRes || []).map((d: any) => ({ id: String(d._id || d.id), name: d.name, fee: Number(d.opdBaseFee ?? d.baseFee ?? d.fee ?? 0) }))
        const docRes = await hospitalApi.listDoctors() as any
        const docs = (docRes.doctors || docRes || []).map((r: any) => ({
          id: String(r._id || r.id),
          name: r.name,
          publicFee: Number(r.opdPublicFee ?? r.opdBaseFee ?? r.baseFee ?? r.fee ?? 0),
          privateFee: Number(r.opdPrivateFee ?? r.opdBaseFee ?? r.baseFee ?? r.fee ?? 0),
          fee: Number(r.opdBaseFee ?? r.baseFee ?? r.fee ?? 0),
        }))
        // load corporate companies
        let comps: Array<{ id: string; name: string }> = []
        try {
          const cRes = await corporateApi.listCompanies() as any
          comps = (cRes?.companies || []).map((c: any) => ({ id: String(c._id || c.id), name: c.name }))
        } catch { }
        // load ER services
        let srvs: Array<{ id: string; name: string; category?: string; price?: number }> = []
        try {
          const sRes = await hospitalApi.listErServices({ active: true, limit: 200 }) as any
          srvs = (sRes?.services || sRes || []).map((s: any) => ({ id: String(s._id || s.id), name: s.name, category: s.category, price: Number(s.price ?? 0) }))
        } catch { }
        if (!cancelled) { setDepartments(deps); setDoctors(docs); setCompanies(comps); setErServices(srvs) }
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
    departmentId: string
    visitCategory: 'general' | 'private'
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
    procedures: string[]
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
    procedures: [],
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



  // procedureFees and finalFee are defined after isER (below)

  const update = (key: keyof typeof form, value: string) => setForm(prev => ({ ...prev, [key]: value }))

  const toggleProcedure = (id: string) => {
    setForm(prev => {
      const exists = prev.procedures.includes(id)
      return { ...prev, procedures: exists ? prev.procedures.filter(p => p !== id) : [...prev.procedures, id] }
    })
  }

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
      procedures: [],
    })
  }

  const [showSlip, setShowSlip] = useState(false)
  const [slipData, setSlipData] = useState<TokenSlipData | null>(null)

  const printQuickConsent = async (data: any) => {
    if (!data) return
    const now = new Date()
    void printConsentForm({
      patientName: data.patientName || '',
      mrn: data.mrn || '',
      age: data.age || '',
      gender: data.gender || '',
      address: data.address || '',
      bedLabel: data.bedLabel || '',
      doctorName: data.doctorName || '',
      cnic: data.cnic || '',
      contact: data.phone || '',
      doa: now.toLocaleString(),
      panel: data.corporateCompanyName || '',
      guardianName: data.guardianName || '',
      relation: data.guardianRel || '',
      patientOrGuardianName: data.guardianName || '',
      patientRelation: data.guardianRel || '',
      patientTelephone: data.phone || '',
      patientAddress: data.address || '',
      patientCnic: data.cnic || '',
      doctorOnDutyName: '',
      doctorOnDutyDesignation: '',
      nurseOnDutyName: '',
      nurseOnDutyDesignation: '',
      date: now.toISOString().slice(0, 10),
      time: now.toTimeString().slice(0, 5),
    })
  }

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

  const procedureFees = useMemo(() => {
    if (!isER || form.procedures.length === 0) return { total: 0, items: [] as Array<{ id: string; name: string; price: number }> }
    const items = form.procedures
      .map(id => { const svc = erServices.find(s => s.id === id); return svc ? { id: svc.id, name: svc.name, price: svc.price || 0 } : null })
      .filter(Boolean) as Array<{ id: string; name: string; price: number }>
    return { total: items.reduce((s, i) => s + i.price, 0), items }
  }, [isER, form.procedures, erServices])

  const finalFee = useMemo(() => {
    const fee = parseFloat(form.consultationFee || '0') + procedureFees.total
    const discount = parseFloat(form.discount || '0')
    const f = Math.max(fee - discount, 0)
    return isNaN(f) ? 0 : f
  }, [form.consultationFee, form.discount, procedureFees.total])

  const [ipdBeds, setIpdBeds] = useState<Array<{ _id: string; label: string; charges?: number; floorName?: string; locationType?: 'room'|'ward'; locationName?: string }>>([])
  const [ipdBedId, setIpdBedId] = useState('')
  const [ipdDeposit, setIpdDeposit] = useState('')

  const ipdBedOptions = useMemo(() => {
    const items = (ipdBeds || []).slice()
    const locSort = (b: any) => `${String(b.floorName || '')}__${String(b.locationType || '')}__${String(b.locationName || '')}__${String(b.label || '')}`.toLowerCase()
    items.sort((a: any, b: any) => locSort(a).localeCompare(locSort(b)))
    return items
  }, [ipdBeds])

  useEffect(() => {
    let cancelled = false
    async function loadBeds() {
      if (!isIPD) return
      try {
        const res = await hospitalApi.listBeds({ status: 'available' }) as any
        if (!cancelled) setIpdBeds(res.beds || [])
      } catch { }
    }
    loadBeds()
    return () => { cancelled = true }
  }, [isIPD])

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
        const docBase = form.visitCategory === 'private' ? selDoc?.privateFee : selDoc?.publicFee
        const depBase = departments.find(d => String(d.id) === String(form.departmentId))?.fee
        const base = Number.isFinite(docBase as any) && Number(docBase) > 0
          ? Number(docBase)
          : (Number.isFinite(depBase as any) && Number(depBase) > 0 ? Number(depBase) : 0)
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
          const rule = candidates[0] || null
          const selDoc = doctors.find(d => String(d.id) === String(form.doctor))
          const docBase = form.visitCategory === 'private' ? selDoc?.privateFee : selDoc?.publicFee
          const depBase = departments.find(d => String(d.id) === String(form.departmentId))?.fee
          let base = Number.isFinite(docBase!) && Number(docBase) > 0 ? Number(docBase) : (Number.isFinite(depBase!) && Number(depBase) > 0 ? Number(depBase) : NaN)
          if (!Number.isFinite(base) || base <= 0) base = await getBaseFromQuote()
          let eff = Number(base || 0)
          if (rule) {
            const mode = rule.mode; const val = Number(rule.value || 0)
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

  // Default consultation fee to the selected doctor's public/private fee and update instantly when switching category.
  // Do not overwrite if the user manually edited the fee.
  useEffect(() => {
    if (!form.doctor) return
    const selDoc = doctors.find(d => String(d.id) === String(form.doctor))
    if (!selDoc) return
    const base = form.visitCategory === 'private' ? selDoc.privateFee : selDoc.publicFee
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
  const [phoneSuggestHighlightIdx, setPhoneSuggestHighlightIdx] = useState(-1)
  const phoneSuggestWrapRef = useRef<HTMLDivElement>(null)
  const phoneSuggestQueryRef = useRef<string>('')
  // Name search suggestions
  const [nameSuggestOpen, setNameSuggestOpen] = useState(false)
  const [nameSuggestItems, setNameSuggestItems] = useState<any[]>([])
  const [nameSuggestHighlightIdx, setNameSuggestHighlightIdx] = useState(-1)
  const nameSuggestWrapRef = useRef<HTMLDivElement>(null)
  const nameSuggestQueryRef = useRef<string>('')
  const [toast, setToast] = useState<null | { type: 'success' | 'error'; message: string }>(null)
  const showToast = (type: 'success' | 'error', message: string) => {
    setToast({ type, message })
    setTimeout(() => setToast(null), 2500)
  }

  const focusNextField = (el: HTMLElement | null) => {
    if (!el) return
    const formEl = (el as any).form as HTMLFormElement | null
    if (!formEl) return
    const focusables = Array.from(
      formEl.querySelectorAll<HTMLElement>('input, select, textarea, button, [tabindex]:not([tabindex="-1"])')
    ).filter(x => {
      if (!x) return false
      if ((x as any).disabled) return false
      if (x.getAttribute('aria-disabled') === 'true') return false
      if (x.getAttribute('type') === 'hidden') return false
      if (x.tabIndex < 0) return false
      const rect = x.getBoundingClientRect?.()
      if (rect && rect.width === 0 && rect.height === 0) return false
      return true
    })
    const idx = focusables.indexOf(el)
    if (idx < 0) return
    for (let i = idx + 1; i < focusables.length; i++) {
      const n = focusables[i]
      if (!n) continue
      n.focus?.()
      break
    }
  }

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

  const lookupMrnAndAutofill = async (mrRaw: string) => {
    const mr = String(mrRaw || '').trim()
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

  async function onMrnKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key !== 'Enter') return
    e.preventDefault()
    const mr = (form.mrNumber || '').trim()
    await lookupMrnAndAutofill(mr)
    focusNextField(e.currentTarget)
  }

  const onMrnPaste = async (e: React.ClipboardEvent<HTMLInputElement>) => {
    const text = (e.clipboardData?.getData('text') || '').trim()
    if (!text) return
    e.preventDefault()
    update('mrNumber', text)
    await lookupMrnAndAutofill(text)
    focusNextField(e.currentTarget)
  }

  const onPhoneKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!phoneSuggestOpen || phoneSuggestItems.length === 0) return
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setPhoneSuggestHighlightIdx(i => {
        const next = i < 0 ? 0 : Math.min(i + 1, phoneSuggestItems.length - 1)
        return next
      })
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setPhoneSuggestHighlightIdx(i => Math.max(i - 1, 0))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      const idx = phoneSuggestHighlightIdx >= 0 ? phoneSuggestHighlightIdx : 0
      const p = phoneSuggestItems[idx]
      if (p) {
        selectPhoneSuggestion(p)
        setPhoneSuggestOpen(false)
        setPhoneSuggestHighlightIdx(-1)
        focusNextField(e.currentTarget)
      }
    } else if (e.key === 'Escape') {
      setPhoneSuggestOpen(false)
      setPhoneSuggestHighlightIdx(-1)
    }
  }

  const onNameKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!nameSuggestOpen || nameSuggestItems.length === 0) return
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setNameSuggestHighlightIdx(i => {
        const next = i < 0 ? 0 : Math.min(i + 1, nameSuggestItems.length - 1)
        return next
      })
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setNameSuggestHighlightIdx(i => Math.max(i - 1, 0))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      const idx = nameSuggestHighlightIdx >= 0 ? nameSuggestHighlightIdx : 0
      const p = nameSuggestItems[idx]
      if (p) {
        selectNameSuggestion(p)
        setNameSuggestOpen(false)
        setNameSuggestHighlightIdx(-1)
        focusNextField(e.currentTarget)
      }
    } else if (e.key === 'Escape') {
      setNameSuggestOpen(false)
      setNameSuggestHighlightIdx(-1)
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
    if (!form.departmentId) {
      showToast('error', 'Please select a department before generating a token')
      return
    }
    try {
      if (isEditMode) {
        if (!tokenId) return
        const feeGross = Math.max(0, Number(form.consultationFee || 0))
        const disc = Math.max(0, Number(form.discount || 0))
        const payload: any = {
          departmentId: form.departmentId,
          doctorId: form.doctor || undefined,
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
        logAudit('token_edit', `tokenId=${tokenId}, dept=${form.departmentId}, doctor=${selDoc?.name || 'N/A'}, grossFee=${feeGross}, discount=${disc}`)
        showToast('success', 'Token updated')
        return
      }
      // Inline IPD admit flow: if department is IPD, require bed and admit immediately
      if (isIPD) {
        if (!ipdBedId) { showToast('error', 'Please select a bed for IPD admission'); return }
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
        createdTokenId = String(res?.token?._id || '')
        if (!createdTokenId) throw new Error('Failed to create token for admission')
        try {
          await hospitalApi.admitFromOpdToken({ tokenId: createdTokenId, bedId: ipdBedId, deposit: isNaN(depAmt) ? undefined : depAmt })
        } catch (admitErr: any) {
          try {
            await hospitalApi.deleteToken(createdTokenId)
          } catch {}
          throw admitErr
        }
        logAudit('token_generate', `ipd_admit dept=IPD, bed=${ipdBedId}`)
        // Show print slip with full details
        const corpName = (form.billingType === 'Corporate' && form.corporateCompanyId) ? (companies.find(c => c.id === String(form.corporateCompanyId))?.name || '') : ''
        const resolvedMrn = String(res?.token?.patientId?.mrn || res?.token?.mrn || form.mrNumber || '').trim()
        const slip: TokenSlipData = {
          tokenNo: res?.token?.tokenNo || 'N/A',
          departmentName: (departments.find(d => String(d.id) === String(form.departmentId))?.name) || '-',
          doctorName: (doctors.find(d => String(d.id) === String(form.doctor))?.name) || '-',
          patientName: res?.token?.patientName || form.patientName || '-',
          phone: form.phone || '',
          mrn: resolvedMrn,
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
          tokenType: form.visitCategory === 'private' ? 'Private' : 'General',
          ...(corpName ? { corporateCompanyName: corpName } : {}),
          ...(form.billingType === 'Corporate' && form.corporatePreAuthNo ? { corporatePreAuthNo: form.corporatePreAuthNo } : {}),
          ...(form.billingType === 'Corporate' && form.corporateCoPayPercent ? { corporateCoPayPercent: Number(form.corporateCoPayPercent) } : {}),
        }
        setSlipData(slip)
        setShowSlip(true)
        reset()
        setIpdBedId(''); setIpdDeposit('')
        return
      }
      const payload: any = {
        departmentId: form.departmentId,
        doctorId: form.doctor || undefined,
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
      else if (form.billingType === 'Card') payload.paidMethod = 'Bank'
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
        payload.chiefComplaint = form.chiefComplaint
        if (form.procedures.length > 0) {
          payload.procedures = form.procedures
          payload.procedureDetails = procedureFees.items.map(i => ({ serviceId: i.id, name: i.name, price: i.price }))
          payload.procedureTotal = procedureFees.total
        }
      }
      payload.portal = window.location.pathname.startsWith('/reception') ? 'reception' : 'hospital'
      const res = await hospitalApi.createOpdToken(payload) as any
      const tokenNo = res?.token?.tokenNo || 'N/A'
      const resolvedMrn = String(res?.token?.patientId?.mrn || res?.token?.mrn || form.mrNumber || '').trim() || undefined
      // Prepare slip and show (OPD)
      const corpName = (form.billingType === 'Corporate' && form.corporateCompanyId) ? (companies.find(c => c.id === String(form.corporateCompanyId))?.name || '') : ''
      const slip: TokenSlipData = {
        tokenNo,
        departmentName: selDept?.name || '-',
        doctorName: selDoc?.name || '-',
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
        tokenType: form.visitCategory === 'private' ? 'Private' : 'General',
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
      reset()
    } catch (err: any) {
      showToast('error', err?.message || 'Failed to generate token')
      // Do NOT reset form on error — preserve user-entered data so they can fix and retry
    }
  }

  const inp = "w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none transition-shadow focus:border-violet-400 focus:ring-2 focus:ring-violet-100 dark:bg-slate-900 dark:border-slate-700 dark:text-white dark:placeholder-slate-500 dark:focus:border-violet-500 dark:focus:ring-violet-900/40"
  const sel = "w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none transition-shadow focus:border-violet-400 focus:ring-2 focus:ring-violet-100 dark:bg-slate-900 dark:border-slate-700 dark:text-white dark:focus:border-violet-500 dark:focus:ring-violet-900/40"
  const lbl = "mb-1.5 block text-xs font-semibold tracking-wide text-slate-500 uppercase dark:text-slate-400"

  return (
    <div className="hospital-scope min-h-dvh bg-slate-50 text-slate-900 dark:bg-[#0b1220] dark:text-slate-100">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-200 bg-white px-6 py-4 dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-violet-600 text-white">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" /></svg>
          </div>
          <div>
            <h1 className="text-lg font-bold text-slate-900 dark:text-white">{isEditMode ? 'Edit Token' : 'Token Generator'}</h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">Fill patient details and generate token <span className="hidden sm:inline text-slate-400 dark:text-slate-500">• Tab between fields • ↑↓ in dropdowns • Enter to select</span></p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button type="button" onClick={reset} className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 transition hover:bg-slate-100 dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-800">Reset</button>
        </div>
      </div>

      {loadingToken && (
        <div className="mx-6 mt-4 flex items-center gap-2 rounded-lg border border-violet-200 bg-violet-50 px-4 py-2.5 text-sm text-violet-700 dark:border-violet-800 dark:bg-violet-900/20 dark:text-violet-400">
          <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
          Loading token data…
        </div>
      )}

      <form
        onSubmit={generateToken}
        className="space-y-0"
        onKeyDown={(e) => {
          if (e.key !== 'Enter') return
          if (e.defaultPrevented) return
          const t = e.target as any
          if (!t) return
          const tag = String(t.tagName || '').toLowerCase()
          if (tag === 'textarea') return
          if (tag === 'button') return
          if (tag === 'input') {
            const type = String(t.type || '').toLowerCase()
            if (type === 'submit' || type === 'button' || type === 'reset') return
          }
          e.preventDefault()
          focusNextField(t as HTMLElement)
        }}
      >
        {/* Two-column layout */}
        <section className="grid grid-cols-1 gap-0 lg:grid-cols-2 lg:divide-x lg:divide-slate-200 dark:lg:divide-slate-800">
          {/* LEFT: Patient Information */}
          <div className="p-6">
            <h3 className="mb-4 flex items-center gap-2 text-sm font-bold text-slate-800 dark:text-slate-200">
              <span className="flex h-6 w-6 items-center justify-center rounded-md bg-violet-100 text-xs font-bold text-violet-700 dark:bg-violet-900/40 dark:text-violet-400">1</span>
              Patient Information
            </h3>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="md:col-span-2">
                <label className={lbl}>Phone</label>
                <div ref={phoneSuggestWrapRef} className="relative">
                  <input className={inp} placeholder="03XXXXXXXXX" value={form.phone} maxLength={11} onChange={onPhoneChange} onBlur={onPhoneBlurNew} onFocus={() => { if (phoneSuggestItems.length > 0) { setPhoneSuggestOpen(true); setPhoneSuggestHighlightIdx(-1) } }} onKeyDown={onPhoneKeyDown} ref={phoneRef} />
                  {phoneSuggestOpen && (
                    <div className="absolute z-20 mt-1 max-h-56 w-full overflow-y-auto rounded-lg border border-slate-200 bg-white shadow-xl dark:bg-slate-800 dark:border-slate-700">
                      {phoneSuggestItems.length === 0 ? (
                        <div className="px-3 py-2 text-sm text-slate-500 dark:text-slate-400">No results</div>
                      ) : phoneSuggestItems.map((p: any, idx: number) => (
                        <button type="button" key={p._id || idx} onClick={() => { selectPhoneSuggestion(p); setPhoneSuggestHighlightIdx(-1) }} className={`flex w-full flex-col items-start px-3 py-2 text-left transition ${idx === phoneSuggestHighlightIdx ? 'bg-violet-50 dark:bg-slate-700/60' : 'hover:bg-violet-50 dark:hover:bg-slate-700/60'}`}>
                          <div className="text-sm font-medium text-slate-800 dark:text-slate-200">{p.fullName || 'Unnamed'} <span className="text-xs text-slate-500 dark:text-slate-400">{p.mrn || '-'}</span></div>
                          <div className="text-xs text-slate-500 dark:text-slate-400">{p.phoneNormalized || ''} • Age: {p.age || '-'} • {p.gender || '-'}</div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              <div className="md:col-span-2">
                <label className={lbl}>Patient Name</label>
                <div ref={nameSuggestWrapRef} className="relative">
                  <input className={inp} placeholder="Full name" value={form.patientName} onChange={onNameChange} onFocus={() => { if (nameSuggestItems.length > 0) { setNameSuggestOpen(true); setNameSuggestHighlightIdx(-1) } }} onKeyDown={onNameKeyDown} ref={nameRef} />
                  {nameSuggestOpen && (
                    <div className="absolute z-20 mt-1 max-h-56 w-full overflow-y-auto rounded-lg border border-slate-200 bg-white shadow-xl dark:bg-slate-800 dark:border-slate-700">
                      {nameSuggestItems.length === 0 ? (
                        <div className="px-3 py-2 text-sm text-slate-500 dark:text-slate-400">No results</div>
                      ) : nameSuggestItems.map((p: any, idx: number) => (
                        <button type="button" key={p._id || idx} onClick={() => { selectNameSuggestion(p); setNameSuggestHighlightIdx(-1) }} className={`flex w-full flex-col items-start px-3 py-2 text-left transition ${idx === nameSuggestHighlightIdx ? 'bg-violet-50 dark:bg-slate-700/60' : 'hover:bg-violet-50 dark:hover:bg-slate-700/60'}`}>
                          <div className="text-sm font-medium text-slate-800 dark:text-slate-200">{p.fullName || 'Unnamed'} <span className="text-xs text-slate-500 dark:text-slate-400">{p.mrn || '-'}</span></div>
                          <div className="text-xs text-slate-500 dark:text-slate-400">{p.phoneNormalized || ''} • Age: {p.age || '-'} • {p.gender || '-'}</div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              <div className="md:col-span-2">
                <label className={lbl}>MR Number <span className="normal-case text-slate-400 dark:text-slate-500">(Enter ↵ to search)</span></label>
                <input className={inp} value={form.mrNumber} onChange={e => update('mrNumber', e.target.value)} onKeyDown={onMrnKeyDown} onPaste={onMrnPaste} />
              </div>
              <div>
                <label className={lbl}>Age</label>
                <input className={inp} placeholder="25" value={form.age} onChange={e => update('age', e.target.value)} />
              </div>
              <div>
                <label className={lbl}>Gender</label>
                <select className={sel} value={form.gender} onChange={e => update('gender', e.target.value)}>
                  <option value="">Select</option>
                  <option className="dark:bg-slate-900">Male</option>
                  <option className="dark:bg-slate-900">Female</option>
                  <option className="dark:bg-slate-900">Other</option>
                </select>
              </div>
              <div>
                <label className={lbl}>Guardian Relation</label>
                <select className={sel} value={form.guardianRel} onChange={e => update('guardianRel', e.target.value)}>
                  <option value="">Select</option>
                  <option className="dark:bg-slate-900" value="S/O">S/O</option>
                  <option className="dark:bg-slate-900" value="D/O">D/O</option>
                  <option className="dark:bg-slate-900" value="W/O">W/O</option>
                  <option className="dark:bg-slate-900" value="Father">Father</option>
                  <option className="dark:bg-slate-900" value="Husband">Husband</option>
                  <option className="dark:bg-slate-900" value="Mother">Mother</option>
                  <option className="dark:bg-slate-900" value="Guardian">Guardian</option>
                </select>
              </div>
              <div>
                <label className={lbl}>Guardian Name</label>
                <input className={inp} placeholder="Father/Guardian" value={form.guardianName} onChange={e => update('guardianName', e.target.value)} />
              </div>
              <div>
                <label className={lbl}>CNIC</label>
                <input className={inp} placeholder="13-digit CNIC" value={form.cnic} onChange={e => update('cnic', e.target.value)} />
              </div>
              <div>
                <label className={lbl}>Address</label>
                <input className={inp} placeholder="Residential address" value={form.address} onChange={e => update('address', e.target.value)} />
              </div>
            </div>
          </div>

          {/* RIGHT: Visit & Billing */}
          <div className="border-t border-slate-200 p-6 dark:border-slate-800 lg:border-t-0">
            <h3 className="mb-4 flex items-center gap-2 text-sm font-bold text-slate-800 dark:text-slate-200">
              <span className="flex h-6 w-6 items-center justify-center rounded-md bg-violet-100 text-xs font-bold text-violet-700 dark:bg-violet-900/40 dark:text-violet-400">2</span>
              Visit & Billing
            </h3>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="md:col-span-2">
                <label className={lbl}>Doctor</label>
                <SearchSelect options={doctors.map(d => ({ value: d.id, label: d.name }))} value={form.doctor} onChange={(v) => update('doctor', v)} placeholder="Type or ↓ to select doctor" />
              </div>
              <div>
                <label className={lbl}>Department</label>
                <SearchSelect options={departments.map(d => ({ value: d.id, label: d.name }))} value={form.departmentId} onChange={(v) => update('departmentId', v)} placeholder="Type or ↓ to select" />
              </div>
              {!isIPD && (
                <div>
                  <label className={lbl}>Token Type</label>
                  <select value={form.visitCategory} onChange={e => { lastAutoConsultationFeeRef.current = null; feeManuallyEditedRef.current = false; update('visitCategory', e.target.value as any) }} className={sel}>
                    <option className="dark:bg-slate-900" value="public">General</option>
                    <option className="dark:bg-slate-900" value="private">Private</option>
                  </select>
                </div>
              )}
              <div>
                <label className={lbl}>Billing Type</label>
                <select className={sel} value={form.billingType} onChange={e => update('billingType', e.target.value)}>
                  <option className="dark:bg-slate-900">Cash</option>
                  <option className="dark:bg-slate-900">Card</option>
                  <option className="dark:bg-slate-900">Corporate</option>
                </select>
              </div>
              {form.billingType === 'Corporate' && (
                <div>
                  <label className={lbl}>Corporate Company</label>
                  <select value={form.corporateCompanyId} onChange={e => update('corporateCompanyId', e.target.value)} className={sel}>
                    <option className="dark:bg-slate-900" value="">None</option>
                    {companies.map(c => (<option className="dark:bg-slate-900" key={c.id} value={c.id}>{c.name}</option>))}
                  </select>
                </div>
              )}
              {form.billingType === 'Corporate' && form.corporateCompanyId && (
                <>
                  <div>
                    <label className={lbl}>Pre-Auth No</label>
                    <input value={form.corporatePreAuthNo} onChange={e => update('corporatePreAuthNo', e.target.value)} className={inp} placeholder="Optional" />
                  </div>
                  <div>
                    <label className={lbl}>Co-Pay %</label>
                    <input value={form.corporateCoPayPercent} onChange={e => update('corporateCoPayPercent', e.target.value)} className={inp} placeholder="0-100" />
                  </div>
                  <div>
                    <label className={lbl}>Coverage Cap</label>
                    <input value={form.corporateCoverageCap} onChange={e => update('corporateCoverageCap', e.target.value)} className={inp} placeholder="e.g., 5000" />
                  </div>
                </>
              )}
              {isIPD && (
                <>
                  <div>
                    <label className={lbl}>Select Bed</label>
                    <select value={ipdBedId} onChange={(e) => { setIpdBedId(e.target.value); const opt = (e.target as HTMLSelectElement).selectedOptions?.[0] as any; const chargesAttr = opt?.getAttribute?.('data-charges'); if (chargesAttr !== null && chargesAttr !== undefined) setIpdDeposit(chargesAttr) }} className={sel}>
                      <option className="dark:bg-slate-900" value="">Available beds</option>
                      {ipdBedOptions.map(b => (<option className="dark:bg-slate-900" key={b._id} value={String(b._id)} data-charges={b.charges ?? ''}>{`${b.floorName ? `${b.floorName} / ` : ''}${b.locationName ? `${b.locationName} / ` : ''}${b.label}`}{b.charges != null ? ` - (Rs. ${b.charges})` : ''}</option>))}
                    </select>
                  </div>
                  <div>
                    <label className={lbl}>Bed Charges</label>
                    <input value={ipdDeposit} onChange={e => setIpdDeposit(e.target.value)} className={inp} placeholder="Rs. 1000" />
                  </div>
                </>
              )}
              {isER && (
                <>
                  <div>
                    <label className={lbl}>Triage Level</label>
                    <select value={form.triage} onChange={e => update('triage', e.target.value as any)} className={sel}>
                      <option className="dark:bg-slate-900" value="red">🔴 Red (Critical)</option>
                      <option className="dark:bg-slate-900" value="yellow">🟡 Yellow (Urgent)</option>
                      <option className="dark:bg-slate-900" value="green">🟢 Green (Minor)</option>
                    </select>
                  </div>
                  <div>
                    <label className={lbl}>Arrival Mode</label>
                    <select value={form.arrivalMode} onChange={e => update('arrivalMode', e.target.value as any)} className={sel}>
                      <option className="dark:bg-slate-900" value="walk-in">Walk-in</option>
                      <option className="dark:bg-slate-900" value="ambulance">Ambulance</option>
                      <option className="dark:bg-slate-900" value="referral">Referral</option>
                    </select>
                  </div>
                  <div className="md:col-span-2">
                    <label className={lbl}>Chief Complaint</label>
                    <input value={form.chiefComplaint} onChange={e => update('chiefComplaint', e.target.value)} className={inp} placeholder="Describe the patient's main complaint" />
                  </div>
                  <div className="md:col-span-2">
                    <label className={lbl}>Procedures <span className="normal-case text-slate-400 dark:text-slate-500">(Emergency Services)</span></label>
                    <MultiSearchSelect
                      options={erServices.map(s => ({ value: s.id, label: s.name + (s.price ? ` — Rs. ${s.price}` : '') }))}
                      selected={form.procedures}
                      onToggle={toggleProcedure}
                      placeholder="Select emergency services..."
                    />
                  </div>
                </>
              )}
            </div>
          </div>
        </section>

        {/* Fee Summary Bar */}
        <section className="border-t border-slate-200 bg-white px-6 py-4 dark:border-slate-800 dark:bg-slate-900">
            <div className="flex flex-wrap items-end gap-6">
              <div className="min-w-[120px]">
                <label className={lbl}>Consultation Fee</label>
                <input className={inp} placeholder="0" value={form.consultationFee} onChange={e => { feeManuallyEditedRef.current = true; update('consultationFee', e.target.value) }} />
              </div>
              {isER && procedureFees.items.length > 0 && (
                <div className="min-w-[120px]">
                  <label className={lbl}>Procedure Charges</label>
                  <div className="flex h-[42px] items-center rounded-lg border border-violet-300 bg-violet-50 px-3 text-sm font-bold text-violet-700 dark:bg-violet-900/20 dark:border-violet-800 dark:text-violet-400">
                    Rs. {procedureFees.total.toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                  </div>
                  <div className="mt-1 space-y-0.5">
                    {procedureFees.items.map(item => (
                      <div key={item.id} className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
                        <span className="truncate max-w-[100px]">{item.name}</span>
                        <span>Rs. {item.price}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              <div className="min-w-[100px]">
                <label className={lbl}>Discount</label>
                <input className={inp} placeholder="0" value={form.discount} onChange={e => update('discount', e.target.value) } />
              </div>
              <div className="min-w-[140px]">
                <label className={lbl}>Payable</label>
                <div className="flex h-[42px] items-center rounded-lg border border-emerald-300 bg-emerald-50 px-3 text-sm font-bold text-emerald-700 dark:bg-emerald-900/20 dark:border-emerald-800 dark:text-emerald-400">
                  Rs. {(isIPD ? (Number(ipdDeposit || '0') || 0).toFixed(0) : finalFee.toFixed(0)).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                </div>
              </div>
              <div className="flex-1" />
              <div className="flex gap-2">
                {isIPD && (
                  <button 
                    type="button" 
                    onClick={() => void printQuickConsent({
                      tokenNo: 'PRE-ADMIT',
                      departmentName: 'IPD',
                      doctorName: doctors.find(d => String(d.id) === String(form.doctor))?.name || '-',
                      patientName: form.patientName,
                      phone: form.phone,
                      mrn: form.mrNumber,
                      age: form.age,
                      gender: form.gender,
                      guardianRel: form.guardianRel,
                      guardianName: form.guardianName,
                      cnic: form.cnic,
                      address: form.address,
                      amount: Number(ipdDeposit || 0),
                      discount: Number(form.discount || 0),
                      payable: Number(ipdDeposit || 0) - Number(form.discount || 0),
                      createdAt: new Date().toISOString(),
                      tokenType: 'IPD Admission',
                      bedLabel: ipdBeds.find(b => b._id === ipdBedId)?.label || '-'
                    })}
                    className="flex h-[42px] items-center gap-2 rounded-lg bg-sky-100 px-6 text-sm font-bold text-sky-700 shadow-sm transition hover:bg-sky-200 active:scale-95 dark:bg-sky-900/40 dark:text-sky-400"
                  >
                    <FileText size={16} className="stroke-3" />
                    Print Consent
                  </button>
                )}
                <button type="submit" className="flex h-[42px] items-center gap-2 rounded-lg bg-violet-600 px-6 text-sm font-bold text-white shadow-md shadow-violet-200 transition hover:bg-violet-700 active:scale-[0.98] dark:bg-violet-600 dark:shadow-none dark:hover:bg-violet-500">
                  {isEditMode ? 'Update Token' : 'Generate Token'} <span className="ml-1 text-violet-200">↵</span>
                </button>
              </div>
            </div>
        </section>
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
              <button onClick={() => { if (confirmPatient) skipLookupKeyRef.current = confirmPatient.key; setConfirmPatient(null); setTimeout(() => { if (focusAfterConfirm === 'phone') phoneRef.current?.focus(); else if (focusAfterConfirm === 'name') nameRef.current?.focus(); setFocusAfterConfirm(null) }, 0) }} className="rounded-lg border border-slate-200 px-4 py-2 text-sm text-slate-600 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-800">Cancel</button>
              <button onClick={() => {
                const p = confirmPatient.patient
                try { setForm(prev => ({ ...prev, patientName: p.fullName || prev.patientName, guardianName: p.fatherName || prev.guardianName, guardianRel: p.guardianRel || prev.guardianRel, address: p.address || prev.address, gender: p.gender || prev.gender, age: p.age || prev.age, mrNumber: p.mrn || prev.mrNumber, phone: p.phoneNormalized || prev.phone, cnic: p.cnicNormalized || prev.cnic })) } finally { if (confirmPatient) skipLookupKeyRef.current = confirmPatient.key; setConfirmPatient(null) }
              }} className="rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-violet-700 dark:bg-violet-600 dark:hover:bg-violet-500">Apply</button>
            </div>
          </div>
        </div>
      )}
      {showPhonePicker && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-xl bg-white shadow-2xl ring-1 ring-black/5 dark:bg-slate-900 dark:ring-white/10">
            <div className="border-b border-slate-200 px-5 py-3 text-base font-semibold text-slate-800 dark:border-slate-800 dark:text-slate-100">Select Patient <span className="font-normal text-slate-500">(Phone: {form.phone})</span></div>
            <div className="max-h-80 overflow-y-auto p-2 dark:bg-slate-900">
              {phonePatients.map((p, idx) => (
                <button key={p._id || idx} onClick={() => {
                  setForm(prev => ({ ...prev, patientName: p.fullName || prev.patientName, guardianName: p.fatherName || prev.guardianName, guardianRel: p.guardianRel || prev.guardianRel, address: p.address || prev.address, gender: p.gender || prev.gender, age: p.age || prev.age, mrNumber: p.mrn || prev.mrNumber, phone: p.phoneNormalized || prev.phone, cnic: p.cnicNormalized || prev.cnic }))
                  setShowPhonePicker(false); showToast('success', 'Patient selected')
                }} className="mb-1.5 w-full rounded-lg border border-slate-100 p-3 text-left transition hover:border-violet-200 hover:bg-violet-50 dark:border-slate-800 dark:hover:border-violet-800 dark:hover:bg-slate-800">
                  <div className="text-sm font-medium text-slate-800 dark:text-slate-200">{p.fullName || 'Unnamed'}</div>
                  <div className="text-xs text-slate-500 dark:text-slate-400">{p.mrn || '-'} • {p.phoneNormalized || ''}</div>
                </button>
              ))}
            </div>
            <div className="flex items-center justify-end gap-2 border-t border-slate-200 px-5 py-3 dark:border-slate-800">
              <button onClick={() => { setShowPhonePicker(false); showToast('success', 'You can create a new patient under this phone') }} className="rounded-lg border border-slate-200 px-4 py-2 text-sm text-slate-600 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-800">Cancel</button>
              <button onClick={() => { clearPatientFieldsKeepPhone(); setShowPhonePicker(false) }} className="rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-violet-700 dark:bg-violet-600 dark:hover:bg-violet-500">Create New Patient</button>
            </div>
          </div>
        </div>
      )}
      {toast && (
        <div className={`fixed bottom-5 right-5 z-50 flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium shadow-lg transition-all ${toast.type === 'success' ? 'bg-emerald-600 text-white' : 'bg-rose-600 text-white'}`}>
          <span className="text-base">{toast.type === 'success' ? '✓' : '✕'}</span> {toast.message}
        </div>
      )}
    </div>
  )
}
