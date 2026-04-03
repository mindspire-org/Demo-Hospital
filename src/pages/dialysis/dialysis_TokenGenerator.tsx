import { useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { dialysisApi } from '../../utils/api'
import Dialysis_TokenSlip, { type DialysisTokenSlipData } from '../../components/dialysis/Dialysis_TokenSlip'

export default function Dialysis_TokenGenerator() {
  const [form, setForm] = useState({
    phone: '',
    mrNumber: '',
    patientName: '',
    age: '',
    gender: '',
    guardianRel: '',
    guardianName: '',
    cnic: '',
    address: '',
    sessionTypeId: '',
    shiftId: '',
    machineId: '',
    dialyzerTypeId: '',
    duration: '4',
    notes: '',
    fee: '',
    discount: '0',
    receivedAmount: '',
  })

  const [loading, setLoading] = useState(false)
  const [machines, setMachines] = useState<Array<{ _id: string; name: string; status: string; active?: boolean }>>([])
  const [shifts, setShifts] = useState<Array<{ _id: string; name: string; start?: string; end?: string; active?: boolean }>>([])
  const [sessionTypes, setSessionTypes] = useState<Array<{ _id: string; name: string; code?: string; price?: number; active?: boolean }>>([])
  const [dialyzerTypes, setDialyzerTypes] = useState<Array<{ _id: string; name: string; active?: boolean }>>([])
  const [showSlip, setShowSlip] = useState(false)
  const [slipData, setSlipData] = useState<DialysisTokenSlipData | null>(null)
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

  const [phonePatients, setPhonePatients] = useState<any[]>([])
  const [showPhonePicker, setShowPhonePicker] = useState(false)
  const [phoneSuggestOpen, setPhoneSuggestOpen] = useState(false)
  const [phoneSuggestItems, setPhoneSuggestItems] = useState<any[]>([])
  const phoneSuggestWrapRef = useRef<HTMLDivElement>(null)
  const phoneSuggestQueryRef = useRef<string>('')
  const [nameSuggestOpen, setNameSuggestOpen] = useState(false)
  const [nameSuggestItems, setNameSuggestItems] = useState<any[]>([])
  const nameSuggestWrapRef = useRef<HTMLDivElement>(null)
  const nameSuggestQueryRef = useRef<string>('')
  const phoneRef = useRef<HTMLInputElement>(null)
  const nameRef = useRef<HTMLInputElement>(null)
  const [selectedPatientId, setSelectedPatientId] = useState<string>('')
  const [forceCreateSamePhone, setForceCreateSamePhone] = useState(false)
  const [editTokenId, setEditTokenId] = useState<string>('')
  const [editTokenNo, setEditTokenNo] = useState<string>('')

  const [searchParams] = useSearchParams()

  const showToast = (type: 'success' | 'error', message: string) => {
    setToast({ type, message })
    setTimeout(() => setToast(null), 3000)
  }

  useEffect(() => {
    let mounted = true
    ;(async () => {
      try {
        const [mRes, sRes, tRes, dRes] = await Promise.all([
          dialysisApi.listMachines() as any,
          dialysisApi.listShifts() as any,
          dialysisApi.listSessionTypes() as any,
          dialysisApi.listDialyzerTypes() as any,
        ])

        if (!mounted) return

        const mItems = (mRes?.items || mRes || []).map((x: any) => ({ ...x, _id: String(x._id || x.id) }))
        const sItems = (sRes?.items || sRes || []).map((x: any) => ({ ...x, _id: String(x._id || x.id) }))
        const tItems = (tRes?.items || tRes || []).map((x: any) => ({ ...x, _id: String(x._id || x.id) }))
        const dItems = (dRes?.items || dRes || []).map((x: any) => ({ ...x, _id: String(x._id || x.id) }))

        setMachines(mItems)
        setShifts(sItems)
        setSessionTypes(tItems)
        setDialyzerTypes(dItems)

        setForm(prev => ({
          ...prev,
          sessionTypeId: prev.sessionTypeId || String(tItems[0]?._id || ''),
          shiftId: prev.shiftId || String(sItems[0]?._id || ''),
          dialyzerTypeId: prev.dialyzerTypeId || String(dItems[0]?._id || ''),
        }))
      } catch {
        // ignore
      }
    })()

    return () => { mounted = false }
  }, [])

  // Load existing token for editing
  useEffect(() => {
    const tokenId = searchParams.get('tokenId')
    if (!tokenId) return

    let mounted = true
    ;(async () => {
      try {
        const res: any = await dialysisApi.getToken(tokenId)
        if (!mounted || !res?.token) return

        const t = res.token
        setEditTokenId(String(t._id || ''))
        setEditTokenNo(t.tokenNo || '')
        setSelectedPatientId(t.patientId || '')
        setForm({
          phone: t.phone || '',
          mrNumber: t.mrn || '',
          patientName: t.patientName || '',
          age: t.age || '',
          gender: t.gender || '',
          guardianRel: t.guardianRel || '',
          guardianName: t.guardianName || '',
          cnic: t.cnic || '',
          address: t.address || '',
          sessionTypeId: t.sessionTypeId || '',
          shiftId: t.shiftId || '',
          machineId: t.machineId || '',
          dialyzerTypeId: t.dialyzerTypeId || '',
          duration: String(t.duration || '4'),
          notes: t.notes || '',
          fee: String(t.fee || '0'),
          discount: String(t.discount || '0'),
          receivedAmount: String(t.receivedAmount || '0'),
        })
      } catch (err: any) {
        showToast('error', err?.message || 'Failed to load token')
      }
    })()

    return () => { mounted = false }
  }, [searchParams])

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (phoneSuggestWrapRef.current && !phoneSuggestWrapRef.current.contains(e.target as Node)) {
        setPhoneSuggestOpen(false)
      }
      if (nameSuggestWrapRef.current && !nameSuggestWrapRef.current.contains(e.target as Node)) {
        setNameSuggestOpen(false)
      }
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [])

  // Auto-populate fee from session type price
  useEffect(() => {
    if (form.sessionTypeId) {
      const st = sessionTypes.find(s => s._id === form.sessionTypeId)
      if (st && st.price !== undefined && st.price > 0) {
        setForm(prev => ({ ...prev, fee: String(st.price) }))
      }
    }
  }, [form.sessionTypeId, sessionTypes])

  const update = (key: keyof typeof form, value: string) => {
    setForm(prev => ({ ...prev, [key]: value }))
  }

  const finalFee = useMemo(() => {
    const fee = parseFloat(form.fee || '0')
    const discount = parseFloat(form.discount || '0')
    return Math.max(fee - discount, 0)
  }, [form.fee, form.discount])

  const receivedNum = useMemo(() => {
    const received = parseFloat(form.receivedAmount || '0')
    return Math.max(0, Math.min(finalFee, received))
  }, [form.receivedAmount, finalFee])

  const receivableNum = useMemo(() => {
    return Math.max(0, finalFee - receivedNum)
  }, [finalFee, receivedNum])

  // Auto-set received amount to full fee when fee changes (for new tokens)
  useEffect(() => {
    if (!editTokenId && finalFee > 0) {
      setForm(prev => ({ ...prev, receivedAmount: String(finalFee) }))
    }
  }, [finalFee, editTokenId])


  async function runPhoneSuggestLookup(digits: string) {
    try {
      phoneSuggestQueryRef.current = digits
      const r: any = await dialysisApi.searchPatients({ phone: digits, limit: 8 })
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
    setSelectedPatientId(String(p._id || ''))
    setForceCreateSamePhone(false)
    setPhoneSuggestOpen(false)
    showToast('success', 'Patient selected')
  }

  async function runNameSuggestLookup(nameQuery: string) {
    try {
      nameSuggestQueryRef.current = nameQuery
      const r: any = await dialysisApi.searchPatients({ name: nameQuery, limit: 8 })
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
    setSelectedPatientId(String(p._id || ''))
    setForceCreateSamePhone(false)
    setNameSuggestOpen(false)
    showToast('success', 'Patient selected')
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
      phone: prev.phone,
    }))
    setSelectedPatientId('')
    setForceCreateSamePhone(true)
    setShowPhonePicker(false)
    setPhoneSuggestOpen(false)
    showToast('success', 'Cleared patient details — you can enter a new patient with same phone')
  }

  async function autoFillPatientByPhone(phoneNumber: string) {
    const digits = phoneNumber.replace(/\D+/g, '')
    if (!digits || digits.length < 10) return

    try {
      const r: any = await dialysisApi.searchPatients({ phone: digits, limit: 10 })
      const list: any[] = Array.isArray(r?.patients) ? r.patients : []

      if (list.length > 1) {
        setPhonePatients(list)
        setShowPhonePicker(true)
        showToast('success', `${list.length} patients found - select one`)
      } else if (list.length === 1) {
        setPhonePatients(list)
        setShowPhonePicker(true)
        showToast('success', 'Patient found - select or create new')
      } else {
        showToast('success', 'New patient - you can create under this phone')
      }
    } catch {
      showToast('error', 'Failed to lookup patient data')
    }
  }

  async function onMrnKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key !== 'Enter') return
    e.preventDefault()
    const mr = (form.mrNumber || '').trim()
    if (!mr) return
    try {
      const r: any = await dialysisApi.searchPatients({ mrn: mr, limit: 5 })
      const list: any[] = Array.isArray(r?.patients) ? r.patients : []
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
        cnic: p.cnicNormalized || prev.cnic,
      }))
      setSelectedPatientId(String(p._id || ''))
      setForceCreateSamePhone(false)
      showToast('success', 'Patient found and autofilled')
    } catch {
      showToast('error', 'No patient found for this MR number')
    }
  }

  async function onPhoneChange(phone: string) {
    const digits = phone.replace(/\D+/g, '').slice(0, 11)
    update('phone', digits)

    setPhonePatients([])
    setShowPhonePicker(false)
    setSelectedPatientId('')
    setForceCreateSamePhone(false)

    if (digits.length >= 3) {
      clearTimeout((window as any).phoneSuggestTimeout)
      ;(window as any).phoneSuggestTimeout = setTimeout(() => {
        runPhoneSuggestLookup(digits)
      }, 250)
    } else {
      setPhoneSuggestItems([])
      setPhoneSuggestOpen(false)
    }

    if (digits.length >= 10) {
      clearTimeout((window as any).phoneLookupTimeout)
      ;(window as any).phoneLookupTimeout = setTimeout(() => {
        autoFillPatientByPhone(digits)
      }, 500)
    }
  }

  async function onNameChange(name: string) {
    update('patientName', name)
    setNameSuggestOpen(false)
    const trimmed = name.trim()
    if (trimmed.length >= 2) {
      clearTimeout((window as any).nameSuggestTimeout)
      ;(window as any).nameSuggestTimeout = setTimeout(() => {
        runNameSuggestLookup(trimmed)
      }, 300)
    } else {
      setNameSuggestItems([])
      setNameSuggestOpen(false)
    }
  }

  const reset = () => {
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
      sessionTypeId: sessionTypes[0]?._id || '',
      shiftId: shifts[0]?._id || '',
      machineId: '',
      dialyzerTypeId: dialyzerTypes[0]?._id || '',
      duration: '4',
      notes: '',
      fee: '',
      discount: '0',
      receivedAmount: '',
    })
    setSelectedPatientId('')
    setForceCreateSamePhone(false)
    setPhonePatients([])
    setShowPhonePicker(false)
    setPhoneSuggestOpen(false)
    setNameSuggestOpen(false)
    setEditTokenId('')
    setEditTokenNo('')
  }

  const generateToken = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!form.patientName.trim()) {
      showToast('error', 'Patient name is required')
      return
    }
    if (!form.phone || form.phone.length < 10) {
      showToast('error', 'Valid phone number is required')
      return
    }

    setLoading(true)
    try {
      const sessionType = sessionTypes.find(t => t._id === form.sessionTypeId)
      const shift = shifts.find(s => s._id === form.shiftId)
      const machine = machines.find(m => m._id === form.machineId)
      const dialyzerType = dialyzerTypes.find(d => d._id === form.dialyzerTypeId)

      let mrnToUse = String(form.mrNumber || '').trim()
      let patientIdToUse = selectedPatientId || undefined

      // If editing existing token, skip patient creation
      if (!editTokenId && !mrnToUse) {
        const pr: any = await dialysisApi.findOrCreatePatient({
          selectId: patientIdToUse,
          fullName: form.patientName,
          phone: form.phone,
          cnic: form.cnic,
          gender: form.gender,
          age: form.age,
          guardianName: form.guardianName,
          guardianRel: form.guardianRel,
          address: form.address,
          forceCreate: forceCreateSamePhone,
        })
        const p = pr?.patient
        if (p) {
          mrnToUse = String(p.mrn || '').trim()
          patientIdToUse = String(p._id || '') || patientIdToUse
          setForm(prev => ({ ...prev, mrNumber: mrnToUse }))
          setSelectedPatientId(patientIdToUse || '')
          setForceCreateSamePhone(false)
        }
      }

      const tokenData = {
        patientId: patientIdToUse,
        mrn: mrnToUse,
        patientName: form.patientName,
        phone: form.phone,
        age: form.age,
        gender: form.gender,
        sessionTypeId: form.sessionTypeId,
        sessionTypeName: sessionType?.name,
        shiftId: form.shiftId,
        shiftName: shift?.name,
        machineId: form.machineId,
        machineName: machine?.name,
        dialyzerTypeId: form.dialyzerTypeId,
        dialyzerTypeName: dialyzerType?.name,
        duration: parseInt(form.duration) || 4,
        notes: form.notes,
        fee: parseFloat(form.fee || '0'),
        discount: parseFloat(form.discount || '0'),
        receivedAmount: receivedNum,
      }

      let token: any
      if (editTokenId) {
        // Update existing token
        const res: any = await dialysisApi.updateToken(editTokenId, tokenData)
        token = res?.token
      } else {
        // Create new token
        const res: any = await dialysisApi.createToken(tokenData)
        token = res?.token
      }

      const slip: DialysisTokenSlipData = {
        tokenNo: token?.tokenNo || editTokenNo,
        patientName: form.patientName,
        phone: form.phone,
        mrn: mrnToUse,
        age: form.age,
        gender: form.gender,
        guardianRel: form.guardianRel,
        guardianName: form.guardianName,
        cnic: form.cnic,
        address: form.address,
        sessionType: sessionType?.name,
        shift: shift?.name,
        machine: machine?.name,
        dialyzerType: dialyzerType?.name,
        duration: form.duration,
        amount: parseFloat(form.fee || '0'),
        discount: parseFloat(form.discount || '0'),
        payable: finalFee,
        createdAt: token?.createdAt || new Date().toISOString(),
      }

      setSlipData(slip)
      setShowSlip(true)
      showToast('success', editTokenId ? `Token ${token?.tokenNo || editTokenNo} updated successfully` : `Token ${token?.tokenNo} generated successfully`)
      reset()
    } catch (err: any) {
      showToast('error', err?.message || 'Failed to save token')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-[70dvh] rounded-xl bg-gradient-to-br from-teal-500/20 via-cyan-300/20 to-emerald-300/20 dark:from-teal-900/30 dark:via-cyan-900/20 dark:to-emerald-900/20 p-6">
      {toast && (
        <div className={`fixed right-4 top-4 z-50 rounded-xl border px-4 py-3 shadow-lg ${
          toast.type === 'success' 
            ? 'border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-800 dark:text-emerald-300' 
            : 'border-rose-200 dark:border-rose-800 bg-rose-50 dark:bg-rose-900/30 text-rose-800 dark:text-rose-300'
        }`}>
          {toast.message}
        </div>
      )}

      <div className="w-full rounded-xl bg-white dark:bg-slate-800 p-6 shadow-lg">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">
              {editTokenId ? `Edit Token #${editTokenNo}` : 'Dialysis Token Generator'}
            </h1>
            <p className="text-slate-600 dark:text-slate-400 mt-1">
              {editTokenId ? 'Update token details' : 'Generate tokens for dialysis sessions'}
            </p>
          </div>
          <div className={`rounded-full px-4 py-2 text-sm font-medium ${editTokenId ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300' : 'bg-teal-100 dark:bg-teal-900/30 text-teal-700 dark:text-teal-300'}`}>
            {editTokenId ? 'Edit Mode' : 'New Token'}
          </div>
        </div>

        <form onSubmit={generateToken} className="space-y-6">
          {/* Patient Information */}
          <div className="rounded-xl border border-slate-200 dark:border-slate-700 p-5">
            <h3 className="mb-4 text-sm font-semibold text-slate-800 dark:text-slate-200">Patient Information</h3>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <div className="relative" ref={phoneSuggestWrapRef}>
                <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400">Phone</label>
                <input
                  type="tel"
                  value={form.phone}
                  onChange={e => onPhoneChange(e.target.value)}
                  onBlur={() => autoFillPatientByPhone(form.phone || '')}
                  ref={phoneRef}
                  placeholder="03XX-XXXXXXX"
                  className="w-full rounded-md border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 dark:text-slate-200 px-3 py-2 text-sm focus:border-teal-500 focus:ring-2 focus:ring-teal-200"
                />
                {phoneSuggestOpen && phoneSuggestItems.length > 0 && (
                  <div className="absolute z-20 mt-1 w-full rounded-md border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 shadow-lg">
                    {phoneSuggestItems.map(p => (
                      <button
                        type="button"
                        key={String(p._id)}
                        onClick={() => selectPhoneSuggestion(p)}
                        className="flex w-full items-center justify-between px-3 py-2 text-left hover:bg-slate-50 dark:hover:bg-slate-600"
                      >
                        <div>
                          <div className="text-sm font-medium text-slate-800 dark:text-slate-200">{p.fullName}</div>
                          <div className="text-xs text-slate-500 dark:text-slate-400">{p.phoneNormalized || ''} • MRN: {p.mrn || '-'}</div>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400">MR Number</label>
                <input
                  value={form.mrNumber}
                  onChange={e => update('mrNumber', e.target.value)}
                  onKeyDown={onMrnKeyDown}
                  placeholder="MRN"
                  className="w-full rounded-md border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 dark:text-slate-200 px-3 py-2 text-sm focus:border-teal-500 focus:ring-2 focus:ring-teal-200"
                />
              </div>

              <div className="relative" ref={nameSuggestWrapRef}>
                <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400">Patient Name</label>
                <input
                  value={form.patientName}
                  onChange={e => onNameChange(e.target.value)}
                  ref={nameRef}
                  placeholder="Full name"
                  className="w-full rounded-md border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 dark:text-slate-200 px-3 py-2 text-sm focus:border-teal-500 focus:ring-2 focus:ring-teal-200"
                />
                {nameSuggestOpen && nameSuggestItems.length > 0 && (
                  <div className="absolute z-20 mt-1 w-full rounded-md border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 shadow-lg">
                    {nameSuggestItems.map(p => (
                      <button
                        type="button"
                        key={String(p._id)}
                        onClick={() => selectNameSuggestion(p)}
                        className="flex w-full items-center justify-between px-3 py-2 text-left hover:bg-slate-50 dark:hover:bg-slate-600"
                      >
                        <div>
                          <div className="text-sm font-medium text-slate-800 dark:text-slate-200">{p.fullName}</div>
                          <div className="text-xs text-slate-500 dark:text-slate-400">{p.mrn || '-'} • {p.phoneNormalized || ''}</div>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400">Age</label>
                <input
                  value={form.age}
                  onChange={e => update('age', e.target.value)}
                  placeholder="Age"
                  className="w-full rounded-md border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 dark:text-slate-200 px-3 py-2 text-sm focus:border-teal-500 focus:ring-2 focus:ring-teal-200"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400">Gender</label>
                <select
                  value={form.gender}
                  onChange={e => update('gender', e.target.value)}
                  className="w-full rounded-md border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 dark:text-slate-200 px-3 py-2 text-sm focus:border-teal-500 focus:ring-2 focus:ring-teal-200"
                >
                  <option value="">Select</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400">Guardian Relation</label>
                <select
                  value={form.guardianRel}
                  onChange={e => update('guardianRel', e.target.value)}
                  className="w-full rounded-md border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 dark:text-slate-200 px-3 py-2 text-sm focus:border-teal-500 focus:ring-2 focus:ring-teal-200"
                >
                  <option value="">Select</option>
                  <option value="S/O">S/O (Son of)</option>
                  <option value="D/O">D/O (Daughter of)</option>
                  <option value="W/O">W/O (Wife of)</option>
                  <option value="Father">Father</option>
                  <option value="Husband">Husband</option>
                  <option value="Mother">Mother</option>
                  <option value="Guardian">Guardian</option>
                </select>
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400">Guardian Name</label>
                <input
                  value={form.guardianName}
                  onChange={e => update('guardianName', e.target.value)}
                  placeholder="Guardian name"
                  className="w-full rounded-md border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 dark:text-slate-200 px-3 py-2 text-sm focus:border-teal-500 focus:ring-2 focus:ring-teal-200"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400">CNIC</label>
                <input
                  value={form.cnic}
                  onChange={e => update('cnic', e.target.value)}
                  placeholder="CNIC"
                  className="w-full rounded-md border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 dark:text-slate-200 px-3 py-2 text-sm focus:border-teal-500 focus:ring-2 focus:ring-teal-200"
                />
              </div>

              <div className="sm:col-span-2 lg:col-span-3">
                <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400">Address</label>
                <input
                  value={form.address}
                  onChange={e => update('address', e.target.value)}
                  placeholder="Address"
                  className="w-full rounded-md border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 dark:text-slate-200 px-3 py-2 text-sm focus:border-teal-500 focus:ring-2 focus:ring-teal-200"
                />
              </div>
            </div>
          </div>

          {/* Session Details */}
          <div className="rounded-xl border border-slate-200 dark:border-slate-700 p-5">
            <h3 className="mb-4 text-sm font-semibold text-slate-800 dark:text-slate-200">Session Details</h3>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400">Session Type</label>
                <select
                  value={form.sessionTypeId}
                  onChange={e => update('sessionTypeId', e.target.value)}
                  className="w-full rounded-md border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 dark:text-slate-200 px-3 py-2 text-sm focus:border-teal-500 focus:ring-2 focus:ring-teal-200"
                >
                  {sessionTypes.length === 0 && <option value="">No session types</option>}
                  {sessionTypes.map(t => (
                    <option key={t._id} value={t._id}>{t.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400">Shift</label>
                <select
                  value={form.shiftId}
                  onChange={e => update('shiftId', e.target.value)}
                  className="w-full rounded-md border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 dark:text-slate-200 px-3 py-2 text-sm focus:border-teal-500 focus:ring-2 focus:ring-teal-200"
                >
                  {shifts.length === 0 && <option value="">No shifts</option>}
                  {shifts.map(s => (
                    <option key={s._id} value={s._id}>
                      {s.name}{s.start && s.end ? ` (${s.start} - ${s.end})` : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400">Machine</label>
                <select
                  value={form.machineId}
                  onChange={e => update('machineId', e.target.value)}
                  className="w-full rounded-md border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 dark:text-slate-200 px-3 py-2 text-sm focus:border-teal-500 focus:ring-2 focus:ring-teal-200"
                >
                  <option value="">Select Machine</option>
                  {machines.filter(m => (m.active ?? true) !== false).map(m => (
                    <option key={m._id} value={m._id}>{m.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400">Dialyzer Type</label>
                <select
                  value={form.dialyzerTypeId}
                  onChange={e => update('dialyzerTypeId', e.target.value)}
                  className="w-full rounded-md border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 dark:text-slate-200 px-3 py-2 text-sm focus:border-teal-500 focus:ring-2 focus:ring-teal-200"
                >
                  <option value="">Select Dialyzer</option>
                  {dialyzerTypes.filter(d => (d.active ?? true) !== false).map(d => (
                    <option key={d._id} value={d._id}>{d.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400">Duration (hours)</label>
                <select
                  value={form.duration}
                  onChange={e => update('duration', e.target.value)}
                  className="w-full rounded-md border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 dark:text-slate-200 px-3 py-2 text-sm focus:border-teal-500 focus:ring-2 focus:ring-teal-200"
                >
                  <option value="3">3 hours</option>
                  <option value="4">4 hours</option>
                  <option value="5">5 hours</option>
                  <option value="6">6 hours</option>
                </select>
              </div>

              <div className="sm:col-span-2 lg:col-span-1">
                <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400">Notes</label>
                <input
                  value={form.notes}
                  onChange={e => update('notes', e.target.value)}
                  placeholder="Special instructions"
                  className="w-full rounded-md border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 dark:text-slate-200 px-3 py-2 text-sm focus:border-teal-500 focus:ring-2 focus:ring-teal-200"
                />
              </div>
            </div>
          </div>

          {/* Billing */}
          <div className="rounded-xl border border-slate-200 dark:border-slate-700 p-5">
            <h3 className="mb-4 text-sm font-semibold text-slate-800 dark:text-slate-200">Billing</h3>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400">Session Fee (Rs.)</label>
                <input
                  type="number"
                  value={form.fee}
                  onChange={e => update('fee', e.target.value)}
                  placeholder="0"
                  className="w-full rounded-md border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 dark:text-slate-200 px-3 py-2 text-sm focus:border-teal-500 focus:ring-2 focus:ring-teal-200"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400">Discount (Rs.)</label>
                <input
                  type="number"
                  value={form.discount}
                  onChange={e => update('discount', e.target.value)}
                  placeholder="0"
                  className="w-full rounded-md border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 dark:text-slate-200 px-3 py-2 text-sm focus:border-teal-500 focus:ring-2 focus:ring-teal-200"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400">Payable Amount</label>
                <div className="rounded-md border border-teal-300 dark:border-teal-700 bg-teal-50 dark:bg-teal-900/30 px-3 py-2 text-lg font-bold text-teal-700 dark:text-teal-300">
                  Rs. {finalFee.toLocaleString()}
                </div>
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400">Received (Rs.)</label>
                <input
                  type="number"
                  value={form.receivedAmount}
                  onChange={e => update('receivedAmount', e.target.value)}
                  placeholder="0"
                  className="w-full rounded-md border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 dark:text-slate-200 px-3 py-2 text-sm focus:border-teal-500 focus:ring-2 focus:ring-teal-200"
                />
              </div>
            </div>

            <div className="mt-4 flex items-center justify-between">
              <div className="text-sm text-slate-600 dark:text-slate-400">
                Pending: <span className="font-semibold text-slate-800 dark:text-slate-200">Rs. {receivableNum.toLocaleString()}</span>
              </div>
              <div className="flex items-center gap-3">
                {editTokenId && (
                  <button
                    type="button"
                    onClick={reset}
                    className="rounded-md border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-600"
                  >
                    Cancel Edit
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={reset}
              className="rounded-md border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-600"
            >
              Reset
            </button>
            <button
              type="submit"
              disabled={loading}
              className="rounded-md bg-teal-600 px-6 py-2 text-sm font-semibold text-white hover:bg-teal-700 disabled:opacity-50"
            >
              {loading ? 'Generating...' : 'Generate Token'}
            </button>
          </div>
        </form>
      </div>

      <Dialysis_TokenSlip open={showSlip} onClose={() => setShowSlip(false)} data={slipData!} autoPrint />

      {showPhonePicker && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-lg overflow-hidden rounded-xl bg-white dark:bg-slate-800 shadow-2xl">
            <div className="bg-gradient-to-r from-teal-500 to-cyan-500 px-5 py-4 text-white">
              <div className="text-lg font-bold">Select Patient</div>
              <div className="text-sm opacity-90">Multiple records found for this phone</div>
            </div>
            <div className="max-h-[60vh] overflow-y-auto p-5">
              {phonePatients.map((p: any) => (
                <button
                  key={String(p._id)}
                  type="button"
                  onClick={() => {
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
                    setSelectedPatientId(String(p._id || ''))
                    setForceCreateSamePhone(false)
                    setShowPhonePicker(false)
                    showToast('success', 'Patient selected')
                  }}
                  className="mb-2 w-full rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 p-3 text-left hover:bg-slate-50 dark:hover:bg-slate-600"
                >
                  <div className="text-sm font-medium text-slate-800 dark:text-slate-200">{p.fullName || 'Unnamed'}</div>
                  <div className="text-xs text-slate-500 dark:text-slate-400">{p.mrn || '-'} • {p.phoneNormalized || ''}</div>
                </button>
              ))}
            </div>
            <div className="flex items-center justify-end gap-2 border-t border-slate-200 dark:border-slate-700 px-5 py-3">
              <button
                type="button"
                onClick={() => { setShowPhonePicker(false); showToast('success', 'You can create a new patient under this phone') }}
                className="rounded-md border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 dark:text-slate-200 px-3 py-1.5 text-sm"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  clearPatientFieldsKeepPhone()
                  setTimeout(() => nameRef.current?.focus(), 50)
                }}
                className="rounded-md bg-teal-600 px-3 py-1.5 text-sm text-white"
              >
                Create New Patient
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
