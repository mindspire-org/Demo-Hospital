import { useEffect, useMemo, useRef, useState } from 'react'
import { useLocation, useSearchParams } from 'react-router-dom'
import { corporateApi, labApi } from '../../utils/api'
import { invalidateCache } from '../../utils/apiCache'
import PatientImageCapture from '../../components/lab/PatientImageCapture'
import { printLabTokenSlip } from '../../utils/printLabToken'
import Toast, { type ToastState } from '../../components/ui/Toast'
import Lab_SampleCollectionDialog from '../../components/lab/lab_SampleCollectionDialog'

type LabTest = { id: string; name: string; price: number }
type LabPackage = { id: string; name: string; price: number; discountPct?: number; tests?: Array<{ testId: string; testName: string; price: number }> }
type SearchOption = { value: string; label: string }

function MultiSelect({ options, selectedIds, onToggle, placeholder, onEnter }: { options: SearchOption[]; selectedIds: string[]; onToggle: (id: string) => void; placeholder?: string; onEnter?: (e: React.KeyboardEvent<HTMLInputElement>) => void }) {
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

  const selectedLabels = useMemo(() => {
    return selectedIds.map(id => options.find(o => o.value === id)?.label).filter(Boolean)
  }, [options, selectedIds])

  // Scroll active item into view
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
        onToggle(String(filtered[activeIdx].value))
        setQuery('')
        setActiveIdx(-1)
      }
    }
  }

  return (
    <div ref={ref} className="relative">
      <div
        className="w-full min-h-[42px] rounded-xl border border-slate-200 bg-white px-3 py-2 cursor-text flex flex-wrap gap-1.5 items-center shadow-sm transition focus-within:border-violet-400 focus-within:ring-4 focus-within:ring-violet-100 dark:bg-slate-900/60 dark:border-slate-800 dark:focus-within:border-violet-500 dark:focus-within:ring-violet-900/30"
        onClick={() => inputRef.current?.focus()}
      >
        {selectedLabels.map((label, idx) => (
          <span key={selectedIds[idx]} className="inline-flex items-center gap-1.5 rounded-lg bg-violet-600 px-2 py-1 text-xs font-bold text-white shadow-sm shadow-violet-200">
            {label}
            <button type="button" onClick={e => { e.stopPropagation(); onToggle(selectedIds[idx]) }} className="hover:text-violet-200 transition-colors" tabIndex={-1}>
              <svg className="size-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </span>
        ))}
        <input
          ref={inputRef}
          value={query}
          onChange={e => { setQuery(e.target.value); setOpen(true); setActiveIdx(-1) }}
          onFocus={() => { setOpen(true) }}
          onKeyDown={handleKeyDown}
          placeholder={selectedIds.length === 0 ? (placeholder || 'Search tests...') : ''}
          className="flex-1 min-w-[120px] bg-transparent text-sm font-semibold text-slate-900 outline-none placeholder:text-slate-400 dark:text-white"
          aria-autocomplete="list"
          aria-expanded={open}
          role="combobox"
        />
        <button
          type="button"
          tabIndex={-1}
          onClick={() => { setOpen(o => !o); inputRef.current?.focus() }}
          className="ml-auto text-slate-400 hover:text-slate-600 transition-colors"
        >
          <svg className={`size-4 transition-transform ${open ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" /></svg>
        </button>
      </div>

      {open && (
        <div ref={listRef} role="listbox" className="absolute z-50 mt-1.5 max-h-64 w-full overflow-y-auto rounded-xl border border-slate-200 bg-white/95 p-1 shadow-xl backdrop-blur-md dark:bg-slate-800 dark:border-slate-700 animate-in fade-in zoom-in-95 duration-100">
          {filtered.length === 0 ? (
            <div className="px-4 py-3 text-sm text-slate-500 dark:text-slate-400">No results found</div>
          ) : filtered.map((opt, idx) => {
            const isSelected = selectedIds.includes(String(opt.value))
            const isActive = idx === activeIdx
            return (
              <button
                type="button"
                key={String(opt.value)}
                data-idx={idx}
                role="option"
                aria-selected={isSelected}
                onMouseEnter={() => setActiveIdx(idx)}
                onClick={() => { onToggle(String(opt.value)); setQuery(''); inputRef.current?.focus() }}
                className={`flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-left transition-colors ${
                  isActive ? 'bg-violet-100 text-violet-800 dark:bg-violet-900/40 dark:text-violet-200' :
                  isSelected ? 'bg-violet-50 text-violet-700 dark:bg-violet-900/20 dark:text-violet-300' :
                  'text-slate-700 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-700/50'
                }`}
              >
                <div className="text-sm font-semibold">{opt.label}</div>
                {isSelected && (
                  <svg className="size-4 shrink-0 text-violet-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                )}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

function formatPKR(n: number) {
  try { return n.toLocaleString('en-PK', { style: 'currency', currency: 'PKR' }) } catch { return `PKR ${n.toFixed(2)}` }
}

export default function Lab_Orders() {
  const [searchParams] = useSearchParams()
  const tokenId = searchParams.get('tokenId')
  const isEditMode = Boolean(tokenId)
  const location = useLocation() as any
  const [tests, setTests] = useState<LabTest[]>([])
  useEffect(()=>{
    let mounted = true
    ;(async()=>{
      try {
        const res = await labApi.listTests({ limit: 1000 })
        if (!mounted) return
        setTests((res.items||[]).map((x:any)=>({ id: x._id, name: x.name, price: Number(x.price||0) })))
      } catch(e){ console.error(e); setTests([]) }
    })()
    return ()=>{ mounted = false }
  }, [])

  useEffect(() => {
    let mounted = true
    ;(async () => {
      try {
        const res: any = await labApi.listActiveCollectionCenters()
        if (!mounted) return
        setCollectionCenters(res.items || [])
      } catch {}
    })()
    return () => { mounted = false }
  }, [])

  useEffect(() => {
    let mounted = true
    ;(async () => {
      try {
        const res: any = await labApi.listPackages({ active: 'true', limit: 100 })
        if (!mounted) return
        setPackages((res.items || []).map((x: any) => ({ id: String(x._id), name: x.name, price: Number(x.price || 0), discountPct: Number(x.discountPct || 0), tests: Array.isArray(x.tests) ? x.tests.map((t: any) => ({ testId: String(t.testId), testName: String(t.testName || ''), price: Number(t.price || 0) })) : [] })) )
      } catch (e) {
        console.error('Failed to load packages', e)
      }
    })()
    return () => { mounted = false }
  }, [])

  

  const [fullName, setFullName] = useState('')
  const [phone, setPhone] = useState('')
  const [age, setAge] = useState('')
  const [gender, setGender] = useState('')
  const [address, setAddress] = useState('')
  const [guardianRelation, setGuardianRelation] = useState('')
  const [guardianName, setGuardianName] = useState('')
  const [cnic, setCnic] = useState('')
  const [mrNumber, setMrNumber] = useState('')
  const [referring, setReferring] = useState('')
  const [fromReferralId, setFromReferralId] = useState<string>('')

  const [patientPickOpen, setPatientPickOpen] = useState(false)
  const [patientPickMatches, setPatientPickMatches] = useState<any[]>([])
  const [patientPickContinue, setPatientPickContinue] = useState<null | ((selectId?: string) => Promise<any>)>(null)
  const [patientPickSkipKey, setPatientPickSkipKey] = useState<string>('')
  const [forceCreateNextSubmit, setForceCreateNextSubmit] = useState(false)

  const [selectedTestIds, setSelectedTestIds] = useState<string[]>([])
  const [selectedPackageIds, setSelectedPackageIds] = useState<string[]>([])
  const [packages, setPackages] = useState<LabPackage[]>([])
  const [sampleType, setSampleType] = useState<'normal' | 'urgent' | 'stat'>('normal')
  const [collectionCenters, setCollectionCenters] = useState<any[]>([])
  const [selectedCenterId, setSelectedCenterId] = useState('')
  const [discount, setDiscount] = useState('0')
  const [discountType, setDiscountType] = useState<'PKR' | 'percent'>('PKR')
  const [receivedAmount, setReceivedAmount] = useState('0')
  // Corporate billing fields
  const [companies, setCompanies] = useState<Array<{ id: string; name: string }>>([])
  const [corpCompanyId, setCorpCompanyId] = useState('')
  const [corpPreAuthNo, setCorpPreAuthNo] = useState('')
  const [corpCoPayPercent, setCorpCoPayPercent] = useState('')
  const [billingType, setBillingType] = useState<'Cash'|'Card'|'Corporate'>('Cash')
  const [submitting, setSubmitting] = useState(false)
  const [patientImage, setPatientImage] = useState<string | null>(null)
  // Corporate rules and computed prices for tests
  const [corpTestPriceMap, setCorpTestPriceMap] = useState<Record<string, number>>({})
  const [confirmPatient, setConfirmPatient] = useState<null | { summary: string; patient: any; key: string }>(null)
  const [focusAfterConfirm, setFocusAfterConfirm] = useState<null | 'phone' | 'name'>(null)
  const [toast, setToast] = useState<ToastState>(null)
  const phoneRef = useRef<HTMLInputElement>(null)
  const nameRef = useRef<HTMLInputElement>(null)
  const skipLookupKeyRef = useRef<string | null>(null)
  const lastPromptKeyRef = useRef<string | null>(null)
  const subActionRef = useRef<'create' | 'convert'>('create')
  const [phonePatients, setPhonePatients] = useState<any[]>([])
  const [showPhonePicker, setShowPhonePicker] = useState(false)
  const [phoneSuggestOpen, setPhoneSuggestOpen] = useState(false)
  // Convert to Sample dialog state
  const [convertDialogOpen, setConvertDialogOpen] = useState(false)
  const [convertDialogTokenNo, setConvertDialogTokenNo] = useState('')
  const [convertDialogTokenId, setConvertDialogTokenId] = useState('')
  const [convertDialogPatientName, setConvertDialogPatientName] = useState('')
  const [convertDialogTests, setConvertDialogTests] = useState<string[]>([])
  const [phoneSuggestItems, setPhoneSuggestItems] = useState<any[]>([])
  const [phoneSuggestActiveIdx, setPhoneSuggestActiveIdx] = useState(-1)
  const phoneSuggestWrapRef = useRef<HTMLDivElement>(null)
  const phoneSuggestQueryRef = useRef<string>('')
  // Name search suggestions
  const [nameSuggestOpen, setNameSuggestOpen] = useState(false)
  const [nameSuggestItems, setNameSuggestItems] = useState<any[]>([])
  const [nameSuggestActiveIdx, setNameSuggestActiveIdx] = useState(-1)
  const nameSuggestWrapRef = useRef<HTMLDivElement>(null)
  const nameSuggestQueryRef = useRef<string>('')

  useEffect(() => {
    // If user changes identifying inputs, allow prompting again.
    setPatientPickSkipKey('')
  }, [phone, fullName])

  const clearPatientFieldsKeepPhone = () => {
    const digits = String(phone || '').replace(/\D+/g, '')
    const norm = (s: string)=> String(s||'').trim().toLowerCase().replace(/\s+/g,' ')
    const key = `${digits}|${norm(fullName)}`
    setMrNumber('')
    setFullName('')
    setAge('')
    setGender('')
    setAddress('')
    setGuardianName('')
    setGuardianRelation('')
    setCnic('')
    setShowPhonePicker(false)
    setPhonePatients([])
    setPhoneSuggestOpen(false)
    setPhoneSuggestItems([])
    skipLookupKeyRef.current = key
    lastPromptKeyRef.current = key
    setPatientPickSkipKey('')
    setForceCreateNextSubmit(true)
    setTimeout(() => { try { nameRef.current?.focus() } catch {} }, 50)
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

  // Re-compute effective prices when corporate changes or tests change
  useEffect(()=>{
    let cancelled = false
    async function loadRules(){
      if (!corpCompanyId){ setCorpTestPriceMap({}); return }
      try {
        const r = await corporateApi.listRateRules({ companyId: corpCompanyId, scope: 'LAB' }) as any
        const rules: any[] = (r?.rules || [])
          .filter((x:any)=> x && x.active !== false)
        const d = new Date(); const today = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
        const valid = rules.filter((x:any)=> (!x.effectiveFrom || String(x.effectiveFrom).slice(0,10) <= today) && (!x.effectiveTo || today <= String(x.effectiveTo).slice(0,10)))
        // Build a map of effective price per test using priority (lower first)
        const def = valid.filter(x=>x.ruleType==='default').sort((a:any,b:any)=> (a.priority??100) - (b.priority??100))[0] || null
        const map: Record<string, number> = {}
        const apply = (base: number, rule: any)=>{
          const mode = rule?.mode
          const val = Number(rule?.value||0)
          if (mode === 'fixedPrice') return Math.max(0, val)
          if (mode === 'percentDiscount') return Math.max(0, base - (base * (val/100)))
          if (mode === 'fixedDiscount') return Math.max(0, base - val)
          return base
        }
        for (const t of tests){
          const base = Number(t.price||0)
          const specific = valid.filter(x=> x.ruleType==='test' && String(x.refId)===String(t.id)).sort((a:any,b:any)=> (a.priority??100) - (b.priority??100))[0] || null
          const rule = specific || def
          map[t.id] = rule ? apply(base, rule) : base
        }
        if (!cancelled){ setCorpTestPriceMap(map) }
      } catch { if (!cancelled){ setCorpTestPriceMap({}) } }
    }
    loadRules()
    return ()=>{ cancelled = true }
  }, [corpCompanyId, tests])

  // Debounced phone-based autofill similar to Hospital/Diagnostic token pages
  async function autoFillByPhone(phoneNumber: string){
    const digits = (phoneNumber||'').replace(/\D+/g,'')
    if (!digits || digits.length < 10) return
    try{
      const r: any = await labApi.searchPatients({ phone: digits, limit: 10 })
      const list: any[] = Array.isArray(r?.patients) ? r.patients : []
      if (list.length > 1){
        setPhonePatients(list)
        setShowPhonePicker(true)
      } else if (list.length === 1){
        const p = list[0]
        if (p.fullName) setFullName(String(p.fullName))
        if (p.mrn) setMrNumber(String(p.mrn))
        if (p.phoneNormalized) setPhone(String(p.phoneNormalized))
        if (p.age) setAge(String(p.age))
        if (p.gender) setGender(String(p.gender))
        if (p.address) setAddress(String(p.address))
        // Always set guardian fields - clear if not present to avoid persisting from previous patient
        setGuardianName(p.fatherName ? String(p.fatherName) : '')
        setGuardianRelation(p.guardianRel ? (String(p.guardianRel)==='S/O' ? 'Father' : (String(p.guardianRel)==='D/O' ? 'Mother' : String(p.guardianRel))) : '')
        if (p.cnicNormalized) setCnic(String(p.cnicNormalized))
      }
    } catch {}
  }

  function onPhoneChange(e: any){
    const prevDigits = String(phone || '').replace(/\D+/g,'')
    const v = String(e?.target?.value ?? '')
    const nextDigits = v.replace(/\D+/g,'').slice(0, 11)
    setPhone(nextDigits)
    if (mrNumber && prevDigits !== nextDigits) {
      setMrNumber('')
    }
    skipLookupKeyRef.current = null; lastPromptKeyRef.current = null
    ;(window as any)._labPhoneDeb && clearTimeout((window as any)._labPhoneDeb)
    const digits = nextDigits
    // Incremental dropdown suggestions when 3+ digits
    if ((window as any)._labPhoneSuggestDeb) clearTimeout((window as any)._labPhoneSuggestDeb)
    if (digits.length >= 3){
      ;(window as any)._labPhoneSuggestDeb = setTimeout(()=> runPhoneSuggestLookup(digits), 250)
    } else {
      setPhoneSuggestItems([])
      setPhoneSuggestOpen(false)
    }
    if (digits.length >= 10){
      ;(window as any)._labPhoneDeb = setTimeout(()=> autoFillByPhone(v), 500)
    }
  }

  async function runPhoneSuggestLookup(digits: string){
    try{
      phoneSuggestQueryRef.current = digits
      const r: any = await labApi.searchPatients({ phone: digits, limit: 8 })
      const list: any[] = Array.isArray(r?.patients) ? r.patients : []
      if (phoneSuggestQueryRef.current !== digits) return
      setPhoneSuggestItems(list)
      setPhoneSuggestOpen(list.length > 0)
    } catch {
      setPhoneSuggestItems([])
      setPhoneSuggestOpen(false)
    }
  }

  function selectPhoneSuggestion(p: any){
    try{
      if (p.fullName) setFullName(String(p.fullName))
      if (p.mrn) setMrNumber(String(p.mrn))
      if (p.phoneNormalized) setPhone(String(p.phoneNormalized))
      if (p.age) setAge(String(p.age))
      if (p.gender) setGender(String(p.gender))
      if (p.address) setAddress(String(p.address))
      // Always set guardian fields - clear if not present to avoid persisting from previous patient
      setGuardianName(p.fatherName ? String(p.fatherName) : '')
      setGuardianRelation(p.guardianRel ? (String(p.guardianRel)==='S/O' ? 'Father' : (String(p.guardianRel)==='D/O' ? 'Mother' : String(p.guardianRel))) : '')
      if (p.cnicNormalized) setCnic(String(p.cnicNormalized))
    } finally {
      setPhoneSuggestOpen(false)
      setPhoneSuggestActiveIdx(-1)
      setTimeout(() => nameRef.current?.focus(), 50)
    }
  }

  function handlePhoneSuggestKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!phoneSuggestOpen || phoneSuggestItems.length === 0) return
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setPhoneSuggestActiveIdx(i => Math.min(i + 1, phoneSuggestItems.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setPhoneSuggestActiveIdx(i => Math.max(i - 1, 0))
    } else if (e.key === 'Enter' && phoneSuggestActiveIdx >= 0) {
      e.preventDefault()
      selectPhoneSuggestion(phoneSuggestItems[phoneSuggestActiveIdx])
    } else if (e.key === 'Escape') {
      e.preventDefault()
      setPhoneSuggestOpen(false)
      setPhoneSuggestActiveIdx(-1)
    }
  }

  async function runNameSuggestLookup(nameQuery: string) {
    try {
      nameSuggestQueryRef.current = nameQuery
      const r: any = await labApi.searchPatients({ name: nameQuery, limit: 8 })
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
    try {
      if (p.fullName) setFullName(String(p.fullName))
      if (p.mrn) setMrNumber(String(p.mrn))
      if (p.phoneNormalized) setPhone(String(p.phoneNormalized))
      if (p.age) setAge(String(p.age))
      if (p.gender) setGender(String(p.gender))
      if (p.address) setAddress(String(p.address))
      // Always set guardian fields - clear if not present to avoid persisting from previous patient
      setGuardianName(p.fatherName ? String(p.fatherName) : '')
      setGuardianRelation(p.guardianRel ? (String(p.guardianRel)==='S/O' ? 'Father' : (String(p.guardianRel)==='D/O' ? 'Mother' : String(p.guardianRel))) : '')
      if (p.cnicNormalized) setCnic(String(p.cnicNormalized))
    } finally {
      setNameSuggestOpen(false)
      setNameSuggestActiveIdx(-1)
    }
  }

  function handleNameSuggestKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!nameSuggestOpen || nameSuggestItems.length === 0) return
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setNameSuggestActiveIdx(i => Math.min(i + 1, nameSuggestItems.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setNameSuggestActiveIdx(i => Math.max(i - 1, 0))
    } else if (e.key === 'Enter' && nameSuggestActiveIdx >= 0) {
      e.preventDefault()
      selectNameSuggestion(nameSuggestItems[nameSuggestActiveIdx])
    } else if (e.key === 'Escape') {
      e.preventDefault()
      setNameSuggestOpen(false)
      setNameSuggestActiveIdx(-1)
    }
  }

  function onNameChange(e: React.ChangeEvent<HTMLInputElement>) {
    const newName = e.target.value
    setFullName(newName)
    skipLookupKeyRef.current = null
    lastPromptKeyRef.current = null
    setNameSuggestOpen(false)
    const trimmed = newName.trim()
    if (trimmed.length >= 2) {
      clearTimeout((window as any).labNameSuggestTimeout)
        ; (window as any).labNameSuggestTimeout = setTimeout(() => {
        runNameSuggestLookup(trimmed)
      }, 300)
    } else {
      setNameSuggestItems([])
      setNameSuggestOpen(false)
    }
  }

  const getEffectivePrice = (id: string): number => {
    const base = (tests.find(t=>t.id===id)?.price) || 0
    if (!corpCompanyId) return base
    const v = corpTestPriceMap[id]
    return v != null ? v : base
  }

  const selectedPackages = useMemo(() => packages.filter(pkg => selectedPackageIds.includes(pkg.id)), [packages, selectedPackageIds])
  const selectedPackageTestIds = useMemo(() => new Set(selectedPackages.flatMap(pkg => pkg.tests?.map(t => t.testId) || [])), [selectedPackages])
  const standaloneSelectedTests = useMemo(() => selectedTestIds.filter(id => !selectedPackageTestIds.has(id)), [selectedTestIds, selectedPackageTestIds])
  const selectedTests = useMemo(() => standaloneSelectedTests.map(id => tests.find(t => t.id === id)).filter(Boolean) as LabTest[], [standaloneSelectedTests, tests])

  const getPackagePrice = (pkg: LabPackage): number => {
    const base = pkg.price || pkg.tests?.reduce((sum, t) => sum + Number(t.price || 0), 0) || 0
    if (!pkg.discountPct) return base
    return Math.max(0, base - (base * pkg.discountPct / 100))
  }

  const packageSubtotal = useMemo(() => selectedPackages.reduce((sum, pkg) => sum + getPackagePrice(pkg), 0), [selectedPackages])
  const subtotal = useMemo(() => packageSubtotal + selectedTests.reduce((s, t) => s + getEffectivePrice(t.id), 0), [packageSubtotal, selectedTests, corpCompanyId, corpTestPriceMap])
  const discountVal = Number(discount) || 0
  const discountNum = useMemo(() => {
    if (discountType === 'percent') {
      return Math.round((subtotal * discountVal / 100) * 100) / 100
    }
    return discountVal
  }, [subtotal, discountVal, discountType])
  const net = Math.max(0, subtotal - discountNum)
  const receivedNum = Math.max(0, Math.min(net, Number(receivedAmount) || 0))
  const receivableNum = Math.max(0, net - receivedNum)

  // Auto-set received amount to full net amount when tests are selected or net changes
  useEffect(() => {
    setReceivedAmount(String(net))
  }, [net])

  // Load corporate companies once
  useEffect(()=>{
    let mounted = true
    ;(async()=>{
      try {
        const res = await corporateApi.listCompanies() as any
        if (!mounted) return
        const arr = (res?.companies||[]).map((c:any)=>({ id: String(c._id||c.id), name: c.name }))
        setCompanies(arr)
      } catch {}
    })()
    return ()=>{ mounted = false }
  }, [])

  useEffect(()=>{
    const st = (location?.state || {}) as any
    if (!st) return
    const p = st.patient || {}
    try {
      if (p.mrn) setMrNumber(String(p.mrn))
      if (p.fullName) setFullName(String(p.fullName))
      if (p.phone) setPhone(String(p.phone))
      if (p.gender) setGender(String(p.gender))
      if (p.address) setAddress(String(p.address))
      // Always set guardian fields - clear if not present to avoid persisting from previous patient
      setGuardianName(p.fatherName ? String(p.fatherName) : '')
      if (p.cnic) setCnic(String(p.cnic))
    } catch {}
    // Fetch complete patient details from backend if MRN is provided
    if (p.mrn) {
      (async () => {
        try {
          const r = await labApi.getPatientByMrn(String(p.mrn))
          const pr = r?.patient
          if (pr) {
            if (pr.fullName) setFullName(String(pr.fullName))
            if (pr.phoneNormalized) setPhone(String(pr.phoneNormalized))
            if (pr.age) setAge(String(pr.age))
            if (pr.gender) setGender(String(pr.gender))
            if (pr.address) setAddress(String(pr.address))
            // Always set guardian fields - clear if not present to avoid persisting from previous patient
            setGuardianName(pr.fatherName ? String(pr.fatherName) : '')
            setGuardianRelation(pr.guardianRel ? (String(pr.guardianRel)==='S/O'?'Father':(String(pr.guardianRel)==='D/O'?'Mother':String(pr.guardianRel))) : '')
            if (pr.cnicNormalized) setCnic(String(pr.cnicNormalized))
          }
        } catch {}
      })()
    }
    if (st.referringConsultant) setReferring(String(st.referringConsultant))
    if (st.fromReferralId) setFromReferralId(String(st.fromReferralId))
    // Auto-select tests if coming from appointment conversion
    if (st.preSelectedTests && Array.isArray(st.preSelectedTests) && st.preSelectedTests.length > 0) {
      setSelectedTestIds(st.preSelectedTests.map((id: string) => String(id)))
    }
  }, [location])

  const onSubmit = async (action: 'create' | 'convert' = 'create') => {
    if (submitting) return
    subActionRef.current = action
    if (!fullName.trim() || !phone.trim() || (selectedTestIds.length === 0 && selectedPackageIds.length === 0)) {
      setToast({ type: 'error', message: 'Please select at least one test or package before generating the token.' })
      return
    }
    setSubmitting(true)
    try {
      // 1) Find or create patient (phone-driven)
      let patient: any | null = null
      try {
        const basePayload: any = {
          fullName: fullName.trim(),
          guardianName: guardianName.trim() || undefined,
          phone: phone.trim() || undefined,
          cnic: cnic.trim() || undefined,
          gender: gender || undefined,
          address: address.trim() || undefined,
          age: age.trim() || undefined,
          guardianRel: guardianRelation || undefined,
        }
        if (forceCreateNextSubmit) basePayload.forceCreate = true

        const skipKey = `${phone.trim()}|${fullName.trim()}`
        if (patientPickSkipKey && patientPickSkipKey === skipKey) {
          setToast({ type: 'error', message: 'Please select an existing patient from the list, or change phone/name to create a new patient.' })
          return
        }

        let resp = await labApi.findOrCreatePatient(basePayload)
        if (forceCreateNextSubmit) setForceCreateNextSubmit(false)
        if (resp?.needSelection && Array.isArray(resp.matches) && resp.matches.length) {
          setPatientPickMatches(resp.matches)
          setPatientPickOpen(true)
          setPatientPickContinue(() => async (selectId?: string) => {
            const r2 = await labApi.findOrCreatePatient({ ...basePayload, selectId })
            const resolved = r2?.patient || null
            if (!resolved) throw new Error('Patient not resolved')
            return resolved
          })
          return
        }
        patient = resp?.patient || null
      } catch (e: any) {
        setToast({ type: 'error', message: e?.message || 'Failed to find/create patient' })
        return
      }
      await submitWithResolvedPatient(patient, action)
    } finally {
      setSubmitting(false)
    }
  }

  async function submitWithResolvedPatient(patient: any, action: 'create' | 'convert' = 'create') {
    if (!patient){ setToast({ type: 'error', message: 'Patient not resolved' }); return }
    // update MR number display
    try { setMrNumber(String(patient.mrn||'')) } catch {}
    // populate gender from patient record if available
    try { if (patient.gender) setGender(String(patient.gender)) } catch {}

    // Create token only - order will be created when converting to sample
    try {
      const patientSnap = {
        mrn: String(patient.mrn||''),
        fullName: fullName.trim(),
        phone: phone.trim(),
        age: age.trim() || undefined,
        gender: gender || undefined,
        address: address.trim() || undefined,
        guardianRelation: guardianRelation || undefined,
        guardianName: guardianName.trim() || undefined,
        cnic: cnic.trim() || undefined,
      }

      let tokenNo = ''
      let createdAtIso = ''
      let createdToken: any = null
      let convertedOrderId = ''
      if (isEditMode) {
        if (!tokenId) return
        const tokenData: any = {
          patientId: String(patient._id),
          patient: patientSnap,
          tests: selectedTestIds,
          packageIds: selectedPackageIds.length ? selectedPackageIds : undefined,
          sampleType,
          referringConsultant: referring.trim() || undefined,
          portal: window.location.pathname.startsWith('/reception') ? 'reception' : 'lab',
          collectionCenterId: selectedCenterId || undefined,
          collectionCenterName: selectedCenterId ? collectionCenters.find(c => c._id === selectedCenterId)?.name : undefined,
          paymentMethod: billingType,
        }
        if (billingType === 'Corporate' && corpCompanyId) tokenData.corporateId = corpCompanyId
        await labApi.updateToken(String(tokenId), tokenData)
        invalidateCache('/lab/tokens')
        tokenNo = String(loadedTokenNoRef.current || '')
        createdAtIso = String(loadedTokenCreatedAtRef.current || new Date().toISOString())
        setToast({ type: 'success', message: `Token ${tokenNo || ''} updated` })
      } else {
        // Create token
        const selectedCenter = selectedCenterId ? collectionCenters.find(c => c._id === selectedCenterId) : null
        const commissionPercent = selectedCenter ? (selectedCenter.commissionPercent || 0) : 0
        const commissionAmount = Math.round((net * commissionPercent / 100) * 100) / 100
        const centerNetAmount = Math.round((net - commissionAmount) * 100) / 100

        const tokenData: any = {
          patientId: String(patient._id),
          patient: patientSnap,
          tests: selectedTestIds,
          packageIds: selectedPackageIds.length ? selectedPackageIds : undefined,
          sampleType,
          referringConsultant: referring.trim() || undefined,
          portal: window.location.pathname.startsWith('/reception') ? 'reception' : 'lab',
          collectionCenterId: selectedCenterId || undefined,
          collectionCenterName: selectedCenter?.name || undefined,
          centerCommissionPercent: commissionPercent,
          centerCommissionAmount: commissionAmount,
          centerNetAmount: centerNetAmount,
          // Financial data
          subtotal,
          discount: discountNum,
          net,
          receivedAmount: receivedNum,
          paymentMethod: billingType,
        }
        if (billingType === 'Corporate' && corpCompanyId) tokenData.corporateId = corpCompanyId
        if (fromReferralId) tokenData.referralId = fromReferralId

        createdToken = await labApi.createToken(tokenData)
        invalidateCache('/lab/tokens')
        tokenNo = String(createdToken?.tokenNo || '')
        createdAtIso = String(createdToken?.createdAt || new Date().toISOString())

        if (action === 'convert' && createdToken?._id) {
          const convertPayload = {
            tests: selectedTestIds,
            packageIds: selectedPackageIds.length ? selectedPackageIds : undefined,
            subtotal,
            discount: discountNum,
            net,
            receivedAmount: receivedNum,
            paymentMethod: billingType,
            referringConsultant: referring.trim() || undefined,
            corporateId: (billingType === 'Corporate' && corpCompanyId) ? corpCompanyId : undefined,
            corporatePreAuthNo: (billingType === 'Corporate' && corpPreAuthNo) ? corpPreAuthNo : undefined,
            corporateCoPayPercent: (billingType === 'Corporate' && corpCoPayPercent) ? Number(corpCoPayPercent) : undefined,
          }
          const convertRes: any = await labApi.convertTokenToSample(createdToken._id, convertPayload)
          convertedOrderId = convertRes?.order?._id || convertRes?.order?.id || ''
          setToast({ type: 'success', message: `Token ${tokenNo} generated and converted to sample` })
        } else {
          setToast({ type: 'success', message: `Token ${tokenNo || ''} created` })
        }

        // Update appointment status to 'converted' if we came from an appointment
        const st = (location?.state || {}) as any
        if (st?.appointmentId && st?.fromAppointment) {
          try {
            await labApi.updateAppointmentStatus(String(st.appointmentId), 'converted')
          } catch (e) {
            console.error('Failed to update appointment status:', e)
          }
        }
      }

      // Print token slip
      const rows = [
        ...selectedPackages.map(pkg => ({ name: `Package: ${pkg.name}`, price: getPackagePrice(pkg) })),
        ...selectedTests.map(t => ({ name: t.name, price: Number(t.price || 0) })),
      ]
      let printedBy = 'admin'
      try {
        const ls = localStorage.getItem('lab.session'); if (ls){ const s = JSON.parse(ls||'{}'); printedBy = s?.username || printedBy }
        if (printedBy === 'admin'){
          const du = localStorage.getItem('diagnostic.user'); if (du){ const u = JSON.parse(du||'{}'); printedBy = u?.username || u?.name || printedBy }
        }
        if (printedBy === 'admin'){
          const hs = localStorage.getItem('hospital.session'); if (hs){ const h = JSON.parse(hs||'{}'); printedBy = h?.username || printedBy }
        }
      } catch {}
      await printLabTokenSlip({
        tokenNo,
        createdAt: createdAtIso,
        patient: { fullName: fullName.trim(), mrn: String(patient?.mrn || '').trim() || undefined, phone: phone.trim(), age: age.trim() || undefined, gender: gender || undefined },
        tests: rows,
        subtotal,
        discount: discountNum,
        net,
        receivedAmount: receivedNum,
        receivableAmount: receivableNum,
        printedBy,
        corporateName: (billingType === 'Corporate' && corpCompanyId) ? (companies.find(c=>c.id===corpCompanyId)?.name || '') : undefined,
        corporatePreAuthNo: (billingType === 'Corporate' && corpPreAuthNo) ? corpPreAuthNo : undefined,
        corporateCoPayPercent: (billingType === 'Corporate' && corpCoPayPercent) ? Number(corpCoPayPercent) : undefined,
      })

      // Show Convert to Sample dialog immediately after printing slip
      if (action === 'convert' && createdToken?._id) {
        setConvertDialogTokenNo(tokenNo)
        setConvertDialogTokenId(String(createdToken._id))
        setConvertDialogPatientName(fullName.trim())
        setConvertDialogTests(selectedTestIds)
        setConvertDialogOpen(true)
      }

      if (!isEditMode) {
        // Clear form (create mode only)
        setFullName('')
        setPhone('')
        setAge('')
        setGender('')
        setAddress('')
        setGuardianRelation('')
        setGuardianName('')
        setCnic('')
        setMrNumber('')
        setReferring('')
        setSelectedCenterId('')
        setSelectedTestIds([])
        setSelectedPackageIds([])
        setSampleType('normal')
        setDiscount('0')
        setDiscountType('PKR')
        setReceivedAmount('0')
        setCorpCompanyId('')
        setCorpPreAuthNo('')
        setCorpCoPayPercent('')
        setCorpTestPriceMap({})
        setPatientImage(null)
        setConfirmPatient(null)
        setFocusAfterConfirm(null)
        setPhonePatients([])
        setShowPhonePicker(false)
        setPhoneSuggestOpen(false)
        setPhoneSuggestItems([])
        phoneSuggestQueryRef.current = ''
        skipLookupKeyRef.current = null
        lastPromptKeyRef.current = null
      }
    } catch (e: any) {
      console.error(e)
      setToast({ type: 'error', message: e?.message || 'Failed to create token' })
    }
  }

  const loadedTokenNoRef = useRef<string>('')
  const loadedTokenCreatedAtRef = useRef<string>('')

  useEffect(() => {
    let cancelled = false
    async function loadTokenForEdit() {
      if (!tokenId) return
      try {
        const res: any = await labApi.getToken(String(tokenId))
        const t: any = res?.token || res
        if (!t) throw new Error('Token not found')

        loadedTokenNoRef.current = String(t.tokenNo || '')
        loadedTokenCreatedAtRef.current = String(t.generatedAt || t.createdAt || '')

        const p: any = t.patient || t.patientId || {}
        if (cancelled) return
        setFullName(String(p.fullName || p.name || ''))
        setPhone(String(p.phone || p.phoneNormalized || ''))
        setAge(String(p.age || ''))
        setGender(String(p.gender || ''))
        setAddress(String(p.address || ''))
        setGuardianRelation(String(p.guardianRelation || p.guardianRel || ''))
        setGuardianName(String(p.guardianName || p.fatherName || ''))
        setCnic(String(p.cnic || p.cnicNormalized || ''))
        setMrNumber(String(p.mrn || p.mrNumber || ''))
        setReferring(String(t.referringConsultant || ''))
        setSelectedCenterId(String(t.collectionCenterId || ''))
        setSelectedTestIds(Array.isArray(t.tests) ? t.tests.map(String) : [])
        setSelectedPackageIds(Array.isArray(t.packageIds) ? t.packageIds.map(String) : [])
        setSampleType(t.sampleType === 'urgent' || t.sampleType === 'stat' ? t.sampleType : 'normal')
        const cid = String(t.corporateId || '')
        setCorpCompanyId(cid)
        if (cid) setBillingType('Corporate')
      } catch (e: any) {
        setToast({ type: 'error', message: e?.message || 'Failed to load token for edit' })
      }
    }
    loadTokenForEdit()
    return () => { cancelled = true }
  }, [tokenId])

  // Lookup existing patient only when both phone and name are present
  async function lookupExistingByPhoneAndName(source: 'phone'|'name' = 'phone'){
    const digits = (phone||'').replace(/\D+/g,'')
    const nameEntered = (fullName||'').trim()
    if (!digits || !nameEntered) return
    try{
      const norm = (s: string)=> String(s||'').trim().toLowerCase().replace(/\s+/g,' ')
      const key = `${digits}|${norm(nameEntered)}`
      if (skipLookupKeyRef.current === key || lastPromptKeyRef.current === key) return
      const r: any = await labApi.searchPatients({ phone: digits, limit: 10 })
      const list: any[] = Array.isArray(r?.patients) ? r.patients : []
      if (!list.length) return
      const p = list.find(x => norm(x.fullName) === norm(nameEntered))
      if (!p) return // no exact name match; don't prompt
      const summary = [
        `Found existing patient. Apply details?`,
        `MRN: ${p.mrn||'-'}`,
        `Name: ${p.fullName||'-'}`,
        `Phone: ${p.phoneNormalized||digits}`,
        `Age: ${p.age || (age?.trim()||'-')}`,
        p.gender? `Gender: ${p.gender}` : null,
        p.address? `Address: ${p.address}` : null,
        p.fatherName? `Guardian: ${p.fatherName}` : null,
        `Guardian Relation: ${p.guardianRel || (guardianRelation||'-')}`,
        p.cnicNormalized? `CNIC: ${p.cnicNormalized}` : null,
      ].filter(Boolean).join('\n')
      // Open non-blocking modal to avoid Electron focus freeze on native confirm
      setTimeout(()=> { setFocusAfterConfirm(source); lastPromptKeyRef.current = key; setConfirmPatient({ summary, patient: p, key }) }, 0)
    } catch {}
  }

  // Global keyboard shortcuts: Ctrl+Enter / F12 = Generate Token, Ctrl+Shift+Enter = Generate & Convert
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'F12' || ((e.ctrlKey || e.metaKey) && e.key === 'Enter')) {
        e.preventDefault()
        if (e.shiftKey) {
          onSubmit('convert')
        } else {
          onSubmit('create')
        }
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [fullName, phone, selectedTestIds, selectedPackageIds])

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

  // Escape closes all open overlays / modals
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      if (confirmPatient) { setConfirmPatient(null); return }
      if (showPhonePicker) { setShowPhonePicker(false); return }
      if (patientPickOpen) { setPatientPickOpen(false); return }
      setPhoneSuggestOpen(false)
      setNameSuggestOpen(false)
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [confirmPatient, showPhonePicker, patientPickOpen])

  const fldCls = "w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 shadow-xs outline-none transition placeholder:text-slate-400 focus:border-violet-400 focus:ring-2 focus:ring-violet-100 dark:border-slate-700 dark:bg-slate-800/70 dark:text-white dark:placeholder-slate-500 dark:focus:border-violet-500 dark:focus:ring-violet-900/30"
  const selCls = fldCls

  return (
    <div className="min-h-dvh bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <div className="mx-auto max-w-7xl px-4 py-5 sm:px-6">

      {/* ── Page Title ── */}
      <div className="mb-5 flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold tracking-tight text-slate-900 dark:text-white">Token Generation</h1>
          <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">Register patient, select tests and generate a lab token</p>
        </div>
        <div className="hidden sm:flex items-center gap-2 text-[11px] text-slate-400 font-medium">
          <kbd className="rounded border border-slate-200 bg-slate-100 px-1.5 py-0.5 font-mono text-slate-500 dark:border-slate-700 dark:bg-slate-800">Enter</kbd> Next field
          <span className="text-slate-300">·</span>
          <kbd className="rounded border border-slate-200 bg-slate-100 px-1.5 py-0.5 font-mono text-slate-500 dark:border-slate-700 dark:bg-slate-800">Ctrl+Enter</kbd> Generate
          <span className="text-slate-300">·</span>
          <kbd className="rounded border border-slate-200 bg-slate-100 px-1.5 py-0.5 font-mono text-slate-500 dark:border-slate-700 dark:bg-slate-800">F12</kbd> Generate
          <span className="text-slate-300">·</span>
          <kbd className="rounded border border-slate-200 bg-slate-100 px-1.5 py-0.5 font-mono text-slate-500 dark:border-slate-700 dark:bg-slate-800">Esc</kbd> Close dialogs
        </div>
      </div>

      <form onSubmit={e => { e.preventDefault(); onSubmit() }} className="space-y-4">
        <section className="grid grid-cols-1 gap-4 xl:grid-cols-[1fr_420px]">

          {/* ══ PATIENT INFORMATION ══ */}
          <div className="rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
            {/* Card header */}
            <div className="flex items-center gap-2.5 border-b border-slate-100 px-5 py-3.5 dark:border-slate-800">
              <span className="flex h-6 w-6 items-center justify-center rounded-md bg-violet-50 dark:bg-violet-900/30">
                <svg className="h-3.5 w-3.5 text-violet-600 dark:text-violet-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
              </span>
              <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100">Patient Information</h3>
            </div>
            <div className="p-5">
            <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">MR Number</label>
                <input className={fldCls} placeholder="Enter MR# (e.g., MR-15)" value={mrNumber} onChange={e => setMrNumber(e.target.value)} onBlur={async () => { const mr = mrNumber.trim(); if (!mr) return; try { const r = await labApi.getPatientByMrn(mr); const p = r.patient; setFullName(p.fullName || ''); setPhone(p.phoneNormalized || ''); setAge(p.age ? String(p.age) : ''); setGender(p.gender || ''); setAddress(p.address || ''); { const rel = String(p.guardianRel || ''); setGuardianRelation(rel === 'S/O' ? 'Father' : (rel === 'D/O' ? 'Mother' : rel || '')); } setGuardianName(p.fatherName || ''); setCnic(p.cnicNormalized || ''); } catch {} }} onKeyDown={async (e) => { if (e.key !== 'Enter') return; e.preventDefault(); const mr = mrNumber.trim(); if (!mr) return; try { const r = await labApi.getPatientByMrn(mr); const p = r.patient; setFullName(p.fullName || ''); setPhone(p.phoneNormalized || ''); setAge(p.age ? String(p.age) : ''); setGender(p.gender || ''); setAddress(p.address || ''); { const rel = String(p.guardianRel || ''); setGuardianRelation(rel === 'S/O' ? 'Father' : (rel === 'D/O' ? 'Mother' : rel || '')); } setGuardianName(p.fatherName || ''); setCnic(p.cnicNormalized || ''); } catch {} }} />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Collection Center</label>
                <select
                  value={selectedCenterId}
                  onChange={e => setSelectedCenterId(e.target.value)}
                  onKeyDown={onEnterNext}
                  className={selCls}
                >
                  <option value="">Main Lab (Internal)</option>
                  {collectionCenters.map(c => (
                    <option key={c._id} value={c._id}>{c.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Phone</label>
                <div ref={phoneSuggestWrapRef} className="relative">
                  <input
                    autoFocus
                    className={fldCls}
                    placeholder="Type phone to search"
                    value={phone}
                    maxLength={11}
                    onChange={onPhoneChange}
                    onBlur={() => lookupExistingByPhoneAndName('phone')}
                    onFocus={() => { if (phoneSuggestItems.length > 0) setPhoneSuggestOpen(true) }}
                    onKeyDown={handlePhoneSuggestKeyDown}
                    ref={phoneRef}
                    aria-autocomplete="list"
                    aria-expanded={phoneSuggestOpen}
                    aria-haspopup="listbox"
                  />
                  {phoneSuggestOpen && (
                    <div role="listbox" className="absolute z-20 mt-2 max-h-72 w-full overflow-y-auto rounded-2xl border border-slate-200 bg-white shadow-xl shadow-slate-200/60 dark:border-slate-800 dark:bg-slate-900 dark:shadow-none">
                      {phoneSuggestItems.length === 0 ? (
                        <div className="px-3 py-2 text-sm text-slate-500 dark:text-slate-400">No results</div>
                      ) : (
                        phoneSuggestItems.map((p: any, idx: number) => (
                          <button
                            type="button"
                            key={p._id || idx}
                            role="option"
                            aria-selected={idx === phoneSuggestActiveIdx}
                            onClick={() => selectPhoneSuggestion(p)}
                            onMouseEnter={() => setPhoneSuggestActiveIdx(idx)}
                            className={`flex w-full flex-col items-start gap-0.5 px-4 py-3 text-left transition ${
                              idx === phoneSuggestActiveIdx
                                ? 'bg-violet-100 dark:bg-violet-900/40'
                                : 'hover:bg-violet-50/60 dark:hover:bg-violet-900/20'
                            }`}
                          >
                            <div className="text-sm font-bold text-slate-900 dark:text-slate-100">{p.fullName || 'Unnamed'} <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">{p.mrn || '-'}</span></div>
                            <div className="text-xs font-medium text-slate-600 dark:text-slate-400">{p.phoneNormalized || ''} • Age: {p.age || '-'} • {p.gender || '-'}</div>
                            {p.address && <div className="text-xs text-slate-500 dark:text-slate-400 truncate">{p.address}</div>}
                          </button>
                        ))
                      )}
                    </div>
                  )}
                </div>
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Patient Name</label>
                <div ref={nameSuggestWrapRef} className="relative">
                  <input className={fldCls} placeholder="Type name to search" value={fullName} onChange={onNameChange} onBlur={() => lookupExistingByPhoneAndName('name')} onFocus={() => { if (nameSuggestItems.length > 0) setNameSuggestOpen(true) }} onKeyDown={handleNameSuggestKeyDown} ref={nameRef} aria-autocomplete="list" aria-expanded={nameSuggestOpen} aria-haspopup="listbox" />
                  {nameSuggestOpen && (
                    <div role="listbox" className="absolute z-20 mt-2 max-h-72 w-full overflow-y-auto rounded-2xl border border-slate-200 bg-white shadow-xl shadow-slate-200/60 dark:border-slate-800 dark:bg-slate-900 dark:shadow-none">
                      {nameSuggestItems.length === 0 ? (
                        <div className="px-3 py-2 text-sm text-slate-500 dark:text-slate-400">No results</div>
                      ) : (
                        nameSuggestItems.map((p: any, idx: number) => (
                          <button
                            type="button"
                            key={p._id || idx}
                            role="option"
                            aria-selected={idx === nameSuggestActiveIdx}
                            onClick={() => selectNameSuggestion(p)}
                            onMouseEnter={() => setNameSuggestActiveIdx(idx)}
                            className={`flex w-full flex-col items-start gap-0.5 px-4 py-3 text-left transition ${
                              idx === nameSuggestActiveIdx
                                ? 'bg-violet-100 dark:bg-violet-900/40'
                                : 'hover:bg-violet-50/60 dark:hover:bg-violet-900/20'
                            }`}
                          >
                            <div className="text-sm font-bold text-slate-900 dark:text-slate-100">{p.fullName || 'Unnamed'} <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">{p.mrn || '-'}</span></div>
                            <div className="text-xs font-medium text-slate-600 dark:text-slate-400">{p.phoneNormalized || ''} • Age: {p.age || '-'} • {p.gender || '-'}</div>
                            {p.address && <div className="text-xs text-slate-500 dark:text-slate-400 truncate">{p.address}</div>}
                          </button>
                        ))
                      )}
                    </div>
                  )}
                </div>
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Age</label>
                <input className={fldCls} placeholder="e.g., 25" value={age} onChange={e => setAge(e.target.value)} onKeyDown={onEnterNext} />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Gender</label>
                <select className={selCls} value={gender} onChange={e => setGender(e.target.value)} onKeyDown={onEnterNext}>
                  <option value="">Select gender</option>
                  <option className="dark:bg-slate-900">Male</option>
                  <option className="dark:bg-slate-900">Female</option>
                  <option className="dark:bg-slate-900">Other</option>
                </select>
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Guardian</label>
                <select className={selCls} value={guardianRelation} onChange={e => setGuardianRelation(e.target.value)} onKeyDown={onEnterNext}>
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
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Guardian Name</label>
                <input className={fldCls} placeholder="Father/Guardian Name" value={guardianName} onChange={e => setGuardianName(e.target.value)} onKeyDown={onEnterNext} />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">CNIC</label>
                <input className={fldCls} placeholder="13-digit CNIC (no dashes)" value={cnic} onChange={e => setCnic(e.target.value)} onKeyDown={onEnterNext} />
              </div>
              <div className="md:col-span-3">
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Address</label>
                <textarea className={fldCls} rows={3} placeholder="Residential Address" value={address} onChange={e => setAddress(e.target.value)} onKeyDown={onEnterNext} />
              </div>
              <div className="md:col-span-3">
                <PatientImageCapture value={patientImage} onChange={setPatientImage} />
              </div>
            </div>
            </div>{/* end p-5 */}
          </div>

          {/* ══ TESTS & BILLING ══ */}
          <div className="rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3.5 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <span className="flex h-6 w-6 items-center justify-center rounded-md bg-emerald-50 dark:bg-emerald-900/30">
                  <svg className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
                </span>
                <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100">Tests &amp; Billing</h3>
              </div>
              <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-400">Pending: {formatPKR(receivableNum)}</span>
            </div>
            <div className="p-5">
            <div className="grid grid-cols-1 gap-3">
              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Select Tests</label>
                <MultiSelect
                  options={tests.map(t => ({ value: t.id, label: `${t.name} (${formatPKR(getEffectivePrice(t.id))})` }))}
                  selectedIds={selectedTestIds}
                  onToggle={id => setSelectedTestIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])}
                  placeholder="Select tests..."
                  onEnter={onEnterNext}
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Select Packages</label>
                <MultiSelect
                  options={packages.map(pkg => ({ value: pkg.id, label: `${pkg.name} (${formatPKR(getPackagePrice(pkg))})` }))}
                  selectedIds={selectedPackageIds}
                  onToggle={id => setSelectedPackageIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])}
                  placeholder="Select packages..."
                  onEnter={onEnterNext}
                />
              </div>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Sample Type</label>
                  <select
                    value={sampleType}
                    onChange={e => setSampleType(e.target.value as any)}
                    onKeyDown={onEnterNext}
                    className={selCls}
                  >
                    <option value="normal">Normal</option>
                    <option value="urgent">Urgent</option>
                    <option value="stat">Stat</option>
                  </select>
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Billing Type</label>
                  <select
                    value={billingType}
                    onChange={e => {
                      const v = e.target.value as any
                      setBillingType(v)
                      if (v !== 'Corporate') {
                        setCorpCompanyId('')
                        setCorpPreAuthNo('')
                        setCorpCoPayPercent('')
                      }
                    }}
                    onKeyDown={onEnterNext}
                    className={selCls}
                  >
                    <option value="Cash">Cash</option>
                    <option value="Card">Card</option>
                    <option value="Corporate">Corporate</option>
                  </select>
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Referring Consultant</label>
                  <input value={referring} onChange={e => setReferring(e.target.value)} onKeyDown={onEnterNext} className={fldCls} placeholder="Optional" />
                </div>
              </div>
              {billingType === 'Corporate' && (
                <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                  <div>
                    <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Corporate Company</label>
                    <select value={corpCompanyId} onChange={e => setCorpCompanyId(e.target.value)} onKeyDown={onEnterNext} className={selCls}>
                      <option value="">None</option>
                      {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Pre-Auth No</label>
                    <input value={corpPreAuthNo} onChange={e => setCorpPreAuthNo(e.target.value)} onKeyDown={onEnterNext} className={fldCls} placeholder="Optional" />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Co-Pay %</label>
                    <input value={corpCoPayPercent} onChange={e => setCorpCoPayPercent(e.target.value)} onKeyDown={onEnterNext} className={fldCls} placeholder="0-100" />
                  </div>
                </div>
              )}
            </div>
            </div>{/* end p-5 */}
          </div>
        </section>

        {/* ══ FEE DETAILS ══ */}
        <section className="rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3.5 dark:border-slate-800">
            <div className="flex items-center gap-2.5">
              <span className="flex h-6 w-6 items-center justify-center rounded-md bg-sky-50 dark:bg-sky-900/30">
                <svg className="h-3.5 w-3.5 text-sky-600 dark:text-sky-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
              </span>
              <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100">Fee Details</h3>
            </div>
            <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-400">{selectedTestIds.length} test{selectedTestIds.length !== 1 ? 's' : ''} · {selectedPackageIds.length} pkg</span>
          </div>
          <div className="p-5">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Subtotal</label>
              <div className="flex h-10 items-center rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm font-bold text-slate-700 dark:border-slate-700 dark:bg-slate-800/50 dark:text-slate-300">{formatPKR(subtotal)}</div>
            </div>
            <div>
              <div className="mb-1.5 flex items-center justify-between">
                <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Discount</label>
                <div className="flex gap-1 bg-slate-100 p-0.5 rounded-lg text-xs dark:bg-slate-800">
                  <button
                    type="button"
                    onClick={() => setDiscountType('PKR')}
                    className={`px-2 py-0.5 rounded-md font-bold transition-all ${discountType === 'PKR' ? 'bg-white text-slate-800 shadow-xs dark:bg-slate-700 dark:text-white' : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'}`}
                  >
                    PKR
                  </button>
                  <button
                    type="button"
                    onClick={() => setDiscountType('percent')}
                    className={`px-2 py-0.5 rounded-md font-bold transition-all ${discountType === 'percent' ? 'bg-white text-slate-800 shadow-xs dark:bg-slate-700 dark:text-white' : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'}`}
                  >
                    %
                  </button>
                </div>
              </div>
              <div className="relative">
                <input
                  value={discount}
                  onChange={e => setDiscount(e.target.value)}
                  onKeyDown={onEnterNext}
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 pr-10 text-sm text-slate-900 shadow-xs outline-none transition placeholder:text-slate-400 focus:border-rose-400 focus:ring-2 focus:ring-rose-100 dark:border-slate-700 dark:bg-slate-800/70 dark:text-white dark:focus:border-rose-500 dark:focus:ring-rose-900/30"
                  placeholder="0"
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                  {discountType === 'PKR' ? 'PKR' : '%'}
                </span>
              </div>
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Net Amount</label>
              <div className="flex h-10 items-center rounded-lg border border-emerald-200 bg-emerald-50 px-3 text-sm font-bold text-emerald-700 dark:border-emerald-900/50 dark:bg-emerald-900/20 dark:text-emerald-300">{formatPKR(net)}</div>
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Received</label>
              <input value={receivedAmount} onChange={e => setReceivedAmount(e.target.value)} onKeyDown={onEnterNext} className={fldCls} placeholder="0" />
            </div>
          </div>
          </div>{/* end p-5 */}

          {/* Action bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 bg-slate-50 px-5 py-3.5 dark:border-slate-800 dark:bg-slate-800/40">
            <div className="text-sm text-slate-500 dark:text-slate-400">
              Pending: <span className="font-semibold text-slate-800 dark:text-slate-200">{formatPKR(receivableNum)}</span>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setFullName('')
                  setPhone('')
                  setAge('')
                  setGender('')
                  setAddress('')
                  setGuardianRelation('')
                  setGuardianName('')
                  setCnic('')
                  setMrNumber('')
                  setReferring('')
                  setSelectedCenterId('')
                  setFromReferralId('')
                  setSelectedTestIds([])
                  setDiscount('0')
                  setDiscountType('PKR')
                  setReceivedAmount('0')
                  setCorpCompanyId('')
                  setCorpPreAuthNo('')
                  setCorpCoPayPercent('')
                  setCorpTestPriceMap({})
                  setConfirmPatient(null)
                  setFocusAfterConfirm(null)
                  setPhonePatients([])
                  setShowPhonePicker(false)
                  setPhoneSuggestOpen(false)
                  setPhoneSuggestItems([])
                  phoneSuggestQueryRef.current = ''
                  skipLookupKeyRef.current = null
                  lastPromptKeyRef.current = null
                }}
                className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 active:scale-[0.99] dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
              >
                Reset
              </button>
              <button
                type="button"
                onClick={() => onSubmit('create')}
                disabled={submitting || !fullName || !phone || (selectedTests.length === 0 && selectedPackageIds.length === 0)}
                className="rounded-lg border border-slate-800 bg-slate-800 px-5 py-2 text-sm font-semibold text-white transition hover:bg-slate-700 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-40 dark:border-slate-600 dark:bg-slate-700 dark:hover:bg-slate-600"
              >
                {submitting ? 'Generating...' : 'Generate Token'}
              </button>
              <button
                type="button"
                onClick={() => onSubmit('convert')}
                disabled={submitting || !fullName || !phone || (selectedTests.length === 0 && selectedPackageIds.length === 0)}
                className="rounded-lg bg-violet-600 px-5 py-2 text-sm font-semibold text-white transition hover:bg-violet-700 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-40"
              >
                {submitting ? 'Generating...' : 'Generate & Convert to Sample'}
              </button>
            </div>
          </div>
        </section>
      </form>
      </div>

      {confirmPatient && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-md rounded-xl bg-white shadow-2xl ring-1 ring-black/5">
            <div className="border-b border-slate-200 px-5 py-3 text-base font-semibold text-slate-800">Confirm Patient</div>
            <div className="px-5 py-4 text-sm whitespace-pre-wrap text-slate-700">{confirmPatient.summary}</div>
            <div className="flex items-center justify-end gap-2 border-t border-slate-200 px-5 py-3">
              <button onClick={()=> { if (confirmPatient) skipLookupKeyRef.current = confirmPatient.key; setConfirmPatient(null); setTimeout(()=>{ if (focusAfterConfirm==='phone') phoneRef.current?.focus(); else if (focusAfterConfirm==='name') nameRef.current?.focus(); setFocusAfterConfirm(null) }, 0) }} className="rounded-md border border-slate-300 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50">Cancel</button>
              <button onClick={()=>{
                const p = confirmPatient.patient
                try{
                  if (p.fullName) setFullName(String(p.fullName))
                  if (p.mrn) setMrNumber(String(p.mrn))
                  if (p.phoneNormalized) setPhone(String(p.phoneNormalized))
                  if (p.age) setAge(String(p.age))
                  if (p.gender) setGender(String(p.gender))
                  if (p.address) setAddress(String(p.address))
                  // Always set guardian fields - clear if not present to avoid persisting from previous patient
                  setGuardianName(p.fatherName ? String(p.fatherName) : '')
                  setGuardianRelation(p.guardianRel ? (String(p.guardianRel)==='S/O' ? 'Father' : (String(p.guardianRel)==='D/O' ? 'Mother' : String(p.guardianRel))) : '')
                  if (p.cnicNormalized) setCnic(String(p.cnicNormalized))
                } finally { if (confirmPatient) skipLookupKeyRef.current = confirmPatient.key; setConfirmPatient(null) }
              }} className="rounded-md bg-violet-700 px-3 py-1.5 text-sm font-medium text-white hover:bg-violet-800">Apply</button>
            </div>
          </div>
        </div>
      )}
      {showPhonePicker && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-lg rounded-xl bg-white shadow-2xl ring-1 ring-black/5">
            <div className="border-b border-slate-200 px-5 py-3 text-base font-semibold text-slate-800">Select Patient (Phone: {phone})</div>
            <div className="max-h-96 overflow-y-auto p-2">
              {phonePatients.map((p, idx) => (
                <button
                  key={p._id || idx}
                  onClick={()=>{
                    try{
                      if (p.fullName) setFullName(String(p.fullName))
                      if (p.mrn) setMrNumber(String(p.mrn))
                      if (p.phoneNormalized) setPhone(String(p.phoneNormalized))
                      if (p.age) setAge(String(p.age))
                      if (p.gender) setGender(String(p.gender))
                      if (p.address) setAddress(String(p.address))
                      // Always set guardian fields - clear if not present to avoid persisting from previous patient
                      setGuardianName(p.fatherName ? String(p.fatherName) : '')
                      setGuardianRelation(p.guardianRel ? (String(p.guardianRel)==='S/O' ? 'Father' : (String(p.guardianRel)==='D/O' ? 'Mother' : String(p.guardianRel))) : '')
                      if (p.cnicNormalized) setCnic(String(p.cnicNormalized))
                    } finally { setShowPhonePicker(false) }
                  }}
                  className="mb-2 w-full rounded-lg border border-slate-200 p-3 text-left hover:bg-slate-50"
                >
                  <div className="text-sm font-medium text-slate-800">{p.fullName || 'Unnamed'}</div>
                  <div className="text-xs text-slate-600">MRN: {p.mrn || '-'} • Age: {p.age || '-'} • {p.gender || '-'}</div>
                  {p.address && <div className="text-xs text-slate-500 truncate">{p.address}</div>}
                </button>
              ))}
            </div>
            <div className="flex items-center justify-end gap-2 border-t border-slate-200 px-5 py-3">
              <button onClick={()=> setShowPhonePicker(false)} className="rounded-md border border-slate-300 px-3 py-1.5 text-sm">Cancel</button>
              <button onClick={clearPatientFieldsKeepPhone} className="rounded-md bg-violet-700 px-3 py-1.5 text-sm font-medium text-white">Create New Patient</button>
            </div>
          </div>
        </div>
      )}
      {patientPickOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-lg rounded-xl bg-white shadow-2xl ring-1 ring-black/5">
            <div className="border-b border-slate-200 px-5 py-3 text-base font-semibold text-slate-800">Select Patient</div>
            <div className="max-h-96 overflow-y-auto p-2">
              {patientPickMatches.map((p, idx) => (
                <button
                  key={p._id || idx}
                  onClick={async () => {
                    if (!patientPickContinue) return
                    try {
                      const resolved = await patientPickContinue(String(p?._id || ''))
                      setPatientPickOpen(false)
                      await submitWithResolvedPatient(resolved, subActionRef.current)
                    } catch (e: any) {
                      setToast({ type: 'error', message: e?.message || 'Failed to select patient' })
                    }
                  }}
                  className="mb-2 w-full rounded-lg border border-slate-200 p-3 text-left hover:bg-slate-50"
                >
                  <div className="text-sm font-medium text-slate-800">{p.fullName || 'Unnamed'}</div>
                  <div className="text-xs text-slate-500">{p.mrn || '-'}{p.fatherName ? ` • ${p.fatherName}` : ''}</div>
                </button>
              ))}
            </div>
            <div className="flex items-center justify-end gap-2 border-t border-slate-200 px-5 py-3">
              <button onClick={() => { setPatientPickOpen(false); setPatientPickSkipKey(`${phone.trim()}|${fullName.trim()}`) }} className="rounded-md border border-slate-300 px-3 py-1.5 text-sm">Cancel</button>
              <button onClick={async () => {
                if (!patientPickContinue) return
                try {
                  const resolved = await patientPickContinue(undefined)
                  setPatientPickOpen(false)
                  await submitWithResolvedPatient(resolved, subActionRef.current)
                } catch (e: any) {
                  setToast({ type: 'error', message: e?.message || 'Failed to create patient' })
                }
              }} className="rounded-md bg-violet-700 px-3 py-1.5 text-sm font-medium text-white">Create New Patient</button>
            </div>
          </div>
        </div>
      )}
      <Lab_SampleCollectionDialog
        open={convertDialogOpen}
        onClose={() => { setConvertDialogOpen(false); setConvertDialogTokenId(''); setConvertDialogTests([]) }}
        tokenNo={convertDialogTokenNo}
        tokenId={convertDialogTokenId}
        patientName={convertDialogPatientName}
        tests={convertDialogTests}
        onConvert={() => {
          setToast({ type: 'success', message: 'Sample collection recorded' })
          setConvertDialogOpen(false)
          setConvertDialogTokenId('')
          setConvertDialogTests([])
        }}
      />
      <Toast toast={toast} onClose={() => setToast(null)} />
    </div>
  )
}