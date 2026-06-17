import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { CalendarDays, CheckCircle2, XCircle, ListChecks, RefreshCw, Plus, User, Clock, Phone, FlaskConical, Pencil, FileText, Search } from 'lucide-react'
import { labApi } from '../../utils/api'
import PatientImageCapture from '../../components/lab/PatientImageCapture'
import { getLocalDate } from '../../utils/date'
import Lab_ConfirmDialog from '../../components/lab/lab_ConfirmDialog'
import { useLabSession } from '../../hooks/useLabSession'

function todayIso() { return getLocalDate() }

type TestLite = { id: string; name: string; price?: number }

type AppointmentRow = {
  id: string
  dateIso: string
  time?: string
  tests: string[]
  status: 'booked' | 'confirmed' | 'cancelled' | 'converted'
  patientId?: string
  mrn?: string
  patientName?: string
  phoneNormalized?: string
  gender?: string
  age?: string
  notes?: string
  orderId?: string
}

function normDigits(s?: string) { return String(s || '').replace(/\D+/g, '').slice(0, 11) }

export default function Lab_Appointments() {
  const session = useLabSession()
  const navigate = useNavigate()
  const [dateIso, setDateIso] = useState(todayIso())
  const [status, setStatus] = useState<'all' | AppointmentRow['status']>('all')
  const [query, setQuery] = useState('')

  const [tests, setTests] = useState<TestLite[]>([])
  const testsMap = useMemo(() => Object.fromEntries(tests.map(t => [t.id, t.name])), [tests])

  const [rows, setRows] = useState<AppointmentRow[]>([])
  const [loading, setLoading] = useState(false)
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(10)
  const [total, setTotal] = useState(0)

  // Edit modal
  const [editOpen, setEditOpen] = useState(false)
  const [editRow, setEditRow] = useState<AppointmentRow | null>(null)
  const [editForm, setEditForm] = useState({
    dateIso: '',
    time: '',
    patientName: '',
    phone: '',
    gender: '',
    age: '',
    notes: '',
    testIds: [] as string[],
    testSearch: '',
  })
  const editUpdate = (k: keyof typeof editForm, v: any) => setEditForm(prev => ({ ...prev, [k]: v }))

  // Create form
  const [form, setForm] = useState({
    phone: '',
    patientName: '',
    gender: '',
    age: '',
    time: '',
    notes: '',
    testIds: [] as string[],
    testSearch: '',
  })
  const [patientImage, setPatientImage] = useState<string | null>(null)
  const update = (k: keyof typeof form, v: any) => setForm(prev => ({ ...prev, [k]: v }))

  // patient suggestions
  const [phoneSuggestOpen, setPhoneSuggestOpen] = useState(false)
  const [phoneSuggestItems, setPhoneSuggestItems] = useState<any[]>([])
  const phoneSuggestWrapRef = useRef<HTMLDivElement>(null)
  const phoneSuggestQueryRef = useRef<string>('')

  const [selectedPatient, setSelectedPatient] = useState<any | null>(null)

  // test suggestions
  const [testSuggestOpen, setTestSuggestOpen] = useState(false)
  const testSuggestWrapRef = useRef<HTMLDivElement>(null)

  const [notice, setNotice] = useState<{ kind: 'success' | 'error'; text: string } | null>(null)
  const showNotice = (kind: 'success' | 'error', text: string) => {
    setNotice({ kind, text })
    try { setTimeout(() => setNotice(null), 2500) } catch {}
  }

  // Delete confirmation dialog state
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<AppointmentRow | null>(null)

  function openEdit(r: AppointmentRow) {
    setEditRow(r)
    setEditForm({
      dateIso: r.dateIso || todayIso(),
      time: r.time || '',
      patientName: r.patientName || '',
      phone: normDigits(r.phoneNormalized || ''),
      gender: r.gender || '',
      age: r.age || '',
      notes: r.notes || '',
      testIds: Array.isArray(r.tests) ? r.tests.slice() : [],
      testSearch: '',
    })
    setEditOpen(true)
  }

  async function saveEdit() {
    if (!editRow) return
    if (!editForm.dateIso) { showNotice('error', 'Select date'); return }
    if (!editForm.patientName.trim()) { showNotice('error', 'Enter patient name'); return }

    try {
      const payload: any = {
        dateIso: editForm.dateIso,
        time: editForm.time || undefined,
        tests: editForm.testIds,
        notes: editForm.notes || undefined,
      }

      if (!editRow.patientId) {
        payload.patientName = editForm.patientName.trim()
        payload.phone = editForm.phone ? normDigits(editForm.phone) : undefined
        payload.gender = editForm.gender || undefined
        payload.age = editForm.age || undefined
      }

      await labApi.updateAppointment(editRow.id, payload)
      showNotice('success', 'Appointment updated')
      setEditOpen(false)
      setEditRow(null)
      await load()
    } catch (e: any) {
      showNotice('error', e?.message || 'Failed to update appointment')
    }
  }

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (phoneSuggestWrapRef.current && !phoneSuggestWrapRef.current.contains(e.target as any)) setPhoneSuggestOpen(false)
      if (testSuggestWrapRef.current && !testSuggestWrapRef.current.contains(e.target as any)) setTestSuggestOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [])

  useEffect(() => {
    ; (async () => {
      try {
        const tst: any = await labApi.listTests({ limit: 1000 })
        const list = (tst?.items || []).map((t: any) => ({ id: String(t._id), name: t.name, price: Number(t.price || 0) }))
        setTests(list)
      } catch {
        setTests([])
      }
    })()
  }, [])

  useEffect(() => { load() }, [dateIso, status, page, limit])

  async function load() {
    setLoading(true)
    try {
      const params: any = { date: dateIso, page, limit }
      if (status !== 'all') params.status = status
      const res: any = await labApi.listAppointments(params)
      const arr: any[] = (res?.appointments || [])
      const mapped: AppointmentRow[] = arr.map(a => ({
        id: String(a._id),
        dateIso: String(a.dateIso || '').slice(0, 10),
        time: a.time || undefined,
        tests: Array.isArray(a.tests) ? a.tests.map((x: any) => String(x)) : [],
        status: (String(a.status || 'booked') as any),
        patientId: a.patientId ? String(a.patientId) : undefined,
        mrn: a.mrn || undefined,
        patientName: a.patientName || undefined,
        phoneNormalized: a.phoneNormalized || undefined,
        gender: a.gender || undefined,
        age: a.age || undefined,
        notes: a.notes || undefined,
        orderId: a.orderId ? String(a.orderId) : undefined,
      }))
      setRows(mapped)
      setTotal(res?.total || 0)
    } catch {
      setRows([])
      setTotal(0)
    }
    setLoading(false)
  }

  async function runPhoneSuggestLookup(digits: string) {
    try {
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

  function onPhoneChange(e: React.ChangeEvent<HTMLInputElement>) {
    const digitsOnly = normDigits(e.target.value)
    update('phone', digitsOnly)
    setSelectedPatient(null)
    if ((window as any)._labApptPhoneSuggestDeb) clearTimeout((window as any)._labApptPhoneSuggestDeb)
    if (digitsOnly.length >= 3) {
      ; (window as any)._labApptPhoneSuggestDeb = setTimeout(() => runPhoneSuggestLookup(digitsOnly), 250)
    } else {
      setPhoneSuggestItems([])
      setPhoneSuggestOpen(false)
    }
  }

  function selectPhoneSuggestion(p: any) {
    setSelectedPatient(p)
    update('patientName', p.fullName || '')
    update('phone', p.phoneNormalized || normDigits(form.phone))
    update('gender', p.gender || '')
    update('age', (p.age != null && p.age !== '') ? String(p.age) : '')
    setPhoneSuggestOpen(false)
  }

  function clearForm() {
    setForm({ phone: '', patientName: '', gender: '', age: '', time: '', notes: '', testIds: [], testSearch: '' })
    setPatientImage(null)
    setSelectedPatient(null)
    setPhoneSuggestItems([])
    setPhoneSuggestOpen(false)
  }

  async function createAppointment() {
    if (!dateIso) { showNotice('error', 'Select date'); return }
    if (!form.patientName.trim()) { showNotice('error', 'Enter patient name'); return }
    if (!form.phone.trim()) { showNotice('error', 'Enter phone'); return }

    try {
      const payload: any = {
        dateIso,
        time: form.time || undefined,
        tests: form.testIds,
        notes: form.notes || undefined,
      }
      if (selectedPatient?._id) payload.patientId = String(selectedPatient._id)
      else {
        payload.patientName = form.patientName.trim()
        payload.phone = form.phone.trim()
        payload.gender = form.gender || undefined
        payload.age = form.age || undefined
      }

      await labApi.createAppointment(payload)
      showNotice('success', 'Appointment created')
      clearForm()
      await load()
    } catch (e: any) {
      showNotice('error', e?.message || 'Failed to create appointment')
    }
  }

  async function setRowStatus(id: string, st: 'booked' | 'confirmed' | 'cancelled') {
    try {
      await labApi.updateAppointmentStatus(id, st)
      await load()
    } catch (e: any) {
      showNotice('error', e?.message || 'Failed to update status')
    }
  }

  async function convertToToken(id: string) {
    try {
      const row = rows.find(r => r.id === id)
      if (!row) return
      navigate('/lab/orders', {
        state: {
          appointmentId: id,
          patient: {
            mrn: row.mrn || undefined,
            fullName: row.patientName || '',
            phone: row.phoneNormalized || undefined,
            age: row.age || undefined,
            gender: row.gender || undefined,
          },
          preSelectedTests: row.tests || [],
          fromAppointment: true
        }
      })
    } catch (e: any) {
      showNotice('error', e?.message || 'Failed to convert')
    }
  }

  async function confirmDelete(){
    if (!deleteTarget) return
    try {
      await labApi.deleteAppointment(deleteTarget.id)
      showNotice('success', 'Appointment deleted')
      setDeleteConfirmOpen(false)
      setDeleteTarget(null)
      await load()
    } catch (e: any) {
      showNotice('error', e?.message || 'Failed to delete appointment')
    }
  }

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return rows
    return rows.filter(r => {
      const testNames = (r.tests || []).map(tid => testsMap[tid] || tid).join(' | ')
      return [r.patientName, r.phoneNormalized, r.mrn, r.time, r.status, testNames]
        .filter(Boolean)
        .some(v => String(v).toLowerCase().includes(q))
    })
  }, [rows, query, testsMap])

  return (
    <div className="space-y-6 p-1">
      {/* Hero Header */}
      <div className="relative overflow-hidden rounded-3xl bg-linear-to-r from-indigo-600 via-violet-700 to-purple-800 p-8 shadow-2xl text-white">
        <div className="absolute top-0 right-0 -mr-20 -mt-20 h-80 w-80 rounded-full bg-white/10 blur-3xl" />
        <div className="absolute bottom-0 left-0 -ml-20 -mb-20 h-64 w-64 rounded-full bg-indigo-500/20 blur-3xl" />
        <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center gap-5">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white/20 backdrop-blur-md shadow-inner ring-1 ring-white/30 transition-transform hover:scale-105">
              <CalendarDays className="h-8 w-8 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-black tracking-tight text-white">Lab Appointments</h1>
              <p className="mt-1 text-sm font-medium text-indigo-100 opacity-90">Streamlined booking & session management</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3">
             <div className="flex items-center gap-2 rounded-2xl bg-white/10 p-1.5 backdrop-blur-md ring-1 ring-white/20 shadow-lg">
               <input 
                type="date" 
                value={dateIso} 
                onChange={e => setDateIso(e.target.value)} 
                className="bg-transparent px-4 py-2 text-sm font-black text-white outline-none scheme-dark cursor-pointer" 
               />
             </div>
             <button 
              onClick={load} 
              disabled={loading}
              className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/20 backdrop-blur-md hover:bg-white/30 transition-all active:scale-90 ring-1 ring-white/20 shadow-lg disabled:opacity-50"
             >
               <RefreshCw className={`h-6 w-6 ${loading ? 'animate-spin' : ''}`} />
             </button>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: 'Total', value: rows.length, icon: ListChecks, gradient: 'from-indigo-500 to-indigo-600', colorCls: 'text-indigo-600', bgCls: 'bg-indigo-50' },
          { label: 'Confirmed', value: rows.filter(r => r.status === 'confirmed').length, icon: CheckCircle2, gradient: 'from-emerald-500 to-teal-600', colorCls: 'text-emerald-600', bgCls: 'bg-emerald-50' },
          { label: 'Booked', value: rows.filter(r => r.status === 'booked').length, icon: Clock, gradient: 'from-amber-500 to-orange-600', colorCls: 'text-amber-600', bgCls: 'bg-amber-50' },
          { label: 'Converted', value: rows.filter(r => r.status === 'converted').length, icon: FileText, gradient: 'from-violet-500 to-purple-600', colorCls: 'text-violet-600', bgCls: 'bg-violet-50' },
        ].map((card, i) => (
          <div key={i} className="group relative overflow-hidden rounded-2xl border border-slate-200/60 bg-white p-6 shadow-sm transition-all hover:shadow-xl hover:-translate-y-1">
            <div className={`absolute -right-4 -top-4 h-24 w-24 rounded-full bg-linear-to-br ${card.gradient} opacity-0 group-hover:opacity-10 transition-opacity duration-500`} />
            <div className="relative flex items-center justify-between">
              <div>
                <p className="text-[11px] font-black uppercase tracking-widest text-slate-400">{card.label}</p>
                <p className="mt-1 text-3xl font-black text-slate-900">{card.value}</p>
              </div>
              <div className={`flex h-12 w-12 items-center justify-center rounded-2xl ${card.bgCls} ${card.colorCls} shadow-sm group-hover:scale-110 transition-transform duration-500`}>
                <card.icon className="h-6 w-6" />
              </div>
            </div>
          </div>
        ))}
      </div>

      {notice && (
        <div className={`rounded-xl border p-4 shadow-sm animate-in slide-in-from-top-2 duration-300 ${notice.kind === 'success' ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-rose-200 bg-rose-50 text-rose-800'}`}>
          <div className="flex items-center gap-2 font-bold text-sm">
            {notice.kind === 'success' ? <CheckCircle2 className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
            {notice.text}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        <div className="lg:col-span-1">
          <div className="sticky top-24 space-y-6 rounded-3xl border border-slate-200/60 bg-white p-7 shadow-sm">
            <div className="flex items-center gap-4 border-b border-slate-100 pb-5">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-100 text-indigo-600 shadow-inner">
                <Plus className="h-6 w-6" />
              </div>
              <h2 className="text-xl font-black text-slate-800 tracking-tight">New Appointment</h2>
            </div>
            <div className="space-y-5">
              <div className="space-y-2">
                <label className="text-[11px] font-black uppercase tracking-widest text-slate-400 ml-1">Patient Phone *</label>
                <div className="relative" ref={phoneSuggestWrapRef}>
                  <Phone className="absolute left-4 top-1/2 h-4.5 w-4.5 -translate-y-1/2 text-slate-400" />
                  <input value={form.phone} onChange={onPhoneChange} placeholder="03xxxxxxxxx" className="w-full rounded-2xl border border-slate-200 bg-slate-50/50 py-3.5 pl-12 pr-5 text-sm font-bold text-slate-700 outline-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-500/5 transition-all shadow-inner placeholder:text-slate-300" />
                  {phoneSuggestOpen && (
                    <div className="absolute z-40 mt-2 max-h-72 w-full overflow-y-auto rounded-2xl border border-slate-200 bg-white p-2 shadow-2xl ring-1 ring-black/5 animate-in fade-in zoom-in-95 duration-200">
                      {phoneSuggestItems.map(p => (
                        <button key={p._id} onClick={() => selectPhoneSuggestion(p)} className="flex w-full flex-col px-4 py-3 text-left hover:bg-indigo-50 rounded-xl transition-colors mb-1 last:mb-0 group">
                          <span className="text-sm font-black text-slate-800 group-hover:text-indigo-700">{p.fullName}</span>
                          <span className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">MRN: {p.mrn} · Phone: {p.phoneNormalized}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-[11px] font-black uppercase tracking-widest text-slate-400 ml-1">Patient Name *</label>
                <div className="relative">
                  <User className="absolute left-4 top-1/2 h-4.5 w-4.5 -translate-y-1/2 text-slate-400" />
                  <input value={form.patientName} onChange={e => update('patientName', e.target.value)} placeholder="Full name" className="w-full rounded-2xl border border-slate-200 bg-slate-50/50 py-3.5 pl-12 pr-5 text-sm font-bold text-slate-700 outline-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-500/5 transition-all shadow-inner placeholder:text-slate-300" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[11px] font-black uppercase tracking-widest text-slate-400 ml-1">Gender</label>
                  <select value={form.gender} onChange={e => update('gender', e.target.value)} className="w-full rounded-2xl border border-slate-200 bg-slate-50/50 py-3.5 px-4 text-sm font-bold text-slate-700 outline-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-500/5 transition-all shadow-inner cursor-pointer">
                    <option value="">Select</option><option>Male</option><option>Female</option><option>Other</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-[11px] font-black uppercase tracking-widest text-slate-400 ml-1">Age</label>
                  <input value={form.age} onChange={e => update('age', e.target.value)} placeholder="Years" className="w-full rounded-2xl border border-slate-200 bg-slate-50/50 py-3.5 px-4 text-sm font-bold text-slate-700 outline-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-500/5 transition-all shadow-inner placeholder:text-slate-300" />
                </div>
              </div>
              <div className="space-y-2" ref={testSuggestWrapRef}>
                <label className="text-[11px] font-black uppercase tracking-widest text-slate-400 ml-1">Select Tests</label>
                <div className="relative">
                  <FlaskConical className="absolute left-4 top-1/2 h-4.5 w-4.5 -translate-y-1/2 text-slate-400" />
                  <input value={form.testSearch} onChange={e => { update('testSearch', e.target.value); setTestSuggestOpen(e.target.value.trim().length > 0) }} onFocus={() => { if (form.testSearch.trim().length > 0) setTestSuggestOpen(true) }} placeholder="Search diagnostic tests..." className="w-full rounded-2xl border border-slate-200 bg-slate-50/50 py-3.5 pl-12 pr-5 text-sm font-bold text-slate-700 outline-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-500/5 transition-all shadow-inner placeholder:text-slate-300" />
                  {testSuggestOpen && (
                    <div className="absolute z-40 mt-2 max-h-72 w-full overflow-y-auto rounded-2xl border border-slate-200 bg-white p-2 shadow-2xl ring-1 ring-black/5 animate-in fade-in zoom-in-95 duration-200">
                      {tests.filter(t => !form.testIds.includes(t.id) && t.name.toLowerCase().includes(form.testSearch.toLowerCase())).length === 0 ? (
                        <div className="px-4 py-6 text-center text-xs font-black text-slate-300 uppercase tracking-widest">No tests found</div>
                      ) : (
                        tests.filter(t => !form.testIds.includes(t.id) && t.name.toLowerCase().includes(form.testSearch.toLowerCase())).slice(0, 20).map(t => (
                          <button key={t.id} onClick={() => { update('testIds', [...form.testIds, t.id]); update('testSearch', ''); setTestSuggestOpen(false) }} className="flex w-full items-center justify-between px-4 py-3 text-left hover:bg-indigo-50 rounded-xl transition-colors mb-1 last:mb-0 group">
                            <span className="text-sm font-black text-slate-700 group-hover:text-indigo-700">{t.name}</span>
                            <span className="text-[10px] font-black text-emerald-600 bg-emerald-50 px-2 py-1 rounded-lg ring-1 ring-emerald-100 uppercase">Rs {t.price}</span>
                          </button>
                        ))
                      )}
                    </div>
                  )}
                </div>
                {form.testIds.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {form.testIds.map(id => {
                      const t = tests.find(x => x.id === id)
                      return (
                        <span key={id} className="inline-flex items-center gap-2 rounded-xl bg-indigo-50 px-3 py-1.5 text-[10px] font-black uppercase tracking-tight text-indigo-700 ring-1 ring-indigo-100 shadow-sm">
                          {t?.name || id}
                          <button onClick={() => update('testIds', form.testIds.filter(x => x !== id))} className="ml-1 text-indigo-300 hover:text-indigo-600 transition-colors"><XCircle className="h-4 w-4" /></button>
                        </span>
                      )
                    })}
                  </div>
                )}
              </div>
              <PatientImageCapture value={patientImage} onChange={setPatientImage} className="mt-2" />
              <div className="pt-4 flex gap-3">
                <button onClick={clearForm} className="w-1/3 rounded-2xl border border-slate-200 bg-slate-50 py-4 text-sm font-bold uppercase tracking-widest text-slate-500 hover:bg-slate-100 transition-all active:scale-95">Reset</button>
                <button onClick={createAppointment} className="flex-1 rounded-2xl bg-linear-to-r from-indigo-600 to-violet-700 py-4 text-sm font-black uppercase tracking-widest text-white shadow-xl shadow-indigo-200 hover:shadow-indigo-300 hover:-translate-y-0.5 active:translate-y-0 active:scale-95 transition-all">Confirm Appointment</button>
              </div>
            </div>
          </div>
        </div>

        <div className="lg:col-span-2 space-y-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-5 rounded-3xl border border-slate-200/60 bg-white p-5 shadow-sm">
             <div className="flex items-center gap-2 overflow-x-auto pb-1 md:pb-0 no-scrollbar w-full md:w-auto">
                {(['all', 'booked', 'confirmed', 'converted', 'cancelled'] as const).map(s => (
                  <button key={s} onClick={() => setStatus(s)} className={`whitespace-nowrap rounded-xl px-5 py-2.5 text-[10px] font-black uppercase tracking-widest transition-all ${status === s ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-100' : 'bg-slate-50 text-slate-400 hover:bg-slate-100 hover:text-slate-600'}`}>{s}</button>
                ))}
             </div>
             <div className="relative w-full md:w-auto md:min-w-[280px]">
                <Search className="absolute left-4 top-1/2 h-4.5 w-4.5 -translate-y-1/2 text-slate-400" />
                <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Quick search..." className="w-full rounded-2xl border border-slate-200 bg-slate-50/50 py-3 pl-11 pr-5 text-sm font-bold text-slate-700 outline-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-500/5 transition-all shadow-inner" />
             </div>
          </div>

          <div className="overflow-hidden rounded-3xl border border-slate-200/60 bg-white shadow-sm">
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm border-separate border-spacing-0">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-200">
                    <th className="px-6 py-5 text-left text-[11px] font-black uppercase tracking-widest text-slate-400">Patient</th>
                    <th className="px-6 py-5 text-left text-[11px] font-black uppercase tracking-widest text-slate-400">Details</th>
                    <th className="px-6 py-5 text-left text-[11px] font-black uppercase tracking-widest text-slate-400">Tests</th>
                    <th className="px-6 py-5 text-center text-[11px] font-black uppercase tracking-widest text-slate-400">Status</th>
                    <th className="px-6 py-5 text-right text-[11px] font-black uppercase tracking-widest text-slate-400">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {loading ? (
                    <tr><td colSpan={5} className="px-6 py-24 text-center"><RefreshCw className="h-10 w-10 animate-spin text-indigo-500 opacity-50 mx-auto" /><p className="text-xs font-black text-slate-400 mt-4 uppercase tracking-widest">Refreshing...</p></td></tr>
                  ) : filtered.length === 0 ? (
                    <tr><td colSpan={5} className="px-6 py-24 text-center text-slate-400 font-black uppercase tracking-widest">No sessions</td></tr>
                  ) : (
                    filtered.map(r => (
                      <tr key={r.id} className="group hover:bg-slate-50/50 transition-colors">
                        <td className="px-6 py-5">
                          <div className="flex items-center gap-4">
                            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white transition-all shadow-inner"><User className="h-5 w-5" /></div>
                            <div><div className="font-black text-slate-900 text-base">{r.patientName}</div><div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{r.mrn || 'WALK-IN'}</div></div>
                          </div>
                        </td>
                        <td className="px-6 py-5"><div className="space-y-1.5"><div className="text-xs font-bold text-slate-600">{r.phoneNormalized}</div><div className="text-xs font-black text-indigo-600">{r.time || 'UNSCHEDULED'}</div></div></td>
                        <td className="px-6 py-5"><div className="max-w-[200px]"><p className="truncate text-xs font-black text-slate-700">{(r.tests || []).map(tid => testsMap[tid] || tid).join(', ')}</p><p className="text-[10px] font-black text-indigo-500 uppercase tracking-tighter">{(r.tests || []).length} Tests</p></div></td>
                        <td className="px-6 py-5 text-center"><span className={`inline-flex items-center rounded-xl px-3 py-1.5 text-[10px] font-black uppercase tracking-widest border-2 ${r.status === 'confirmed' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : r.status === 'converted' ? 'bg-violet-50 text-violet-700 border-violet-100' : r.status === 'cancelled' ? 'bg-rose-50 text-rose-700 border-rose-100' : 'bg-amber-50 text-amber-700 border-amber-100'}`}>{r.status}</span></td>
                        <td className="px-6 py-5">
                          <div className="flex items-center justify-end gap-1">
                            {r.status !== 'converted' && <button title="Edit Appointment" onClick={() => openEdit(r)} className="p-2 text-slate-400 hover:text-slate-900"><Pencil className="h-4 w-4" /></button>}
                            {r.status === 'booked' && <button title="Confirm Appointment" onClick={() => setRowStatus(r.id, 'confirmed')} className="p-2 text-emerald-400 hover:text-emerald-700"><CheckCircle2 className="h-4 w-4" /></button>}
                            {r.status !== 'cancelled' && r.status !== 'converted' && <button title="Cancel Appointment" onClick={() => setRowStatus(r.id, 'cancelled')} className="p-2 text-rose-400 hover:text-rose-700"><XCircle className="h-4 w-4" /></button>}
                            {!r.orderId && r.status !== 'cancelled' && session.isMainLab && <button title="Convert to Token" onClick={() => convertToToken(r.id)} className="p-2 text-indigo-500 hover:text-indigo-700"><FlaskConical className="h-4 w-4" /></button>}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            {total > 0 && (
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-slate-200 bg-slate-50 px-6 py-4">
                <div className="flex items-center gap-4">
                  <span className="text-xs font-bold text-slate-500">
                    Showing {(page - 1) * limit + 1} to {Math.min(page * limit, total)} of {total} entries
                  </span>
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-bold text-slate-400">Show</span>
                    <select
                      value={limit}
                      onChange={e => { setLimit(Number(e.target.value)); setPage(1); }}
                      className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-bold text-slate-600 outline-none cursor-pointer focus:border-indigo-400"
                    >
                      {[10, 25, 50, 100].map(v => (
                        <option key={v} value={v}>{v}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="rounded-xl bg-white px-4 py-2 text-xs font-bold text-slate-600 shadow-sm ring-1 ring-slate-200 hover:bg-slate-50 disabled:opacity-50 transition-all">Prev</button>
                  <button onClick={() => setPage(p => p + 1)} disabled={page * limit >= total} className="rounded-xl bg-white px-4 py-2 text-xs font-bold text-slate-600 shadow-sm ring-1 ring-slate-200 hover:bg-slate-50 disabled:opacity-50 transition-all">Next</button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {editOpen && editRow && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
          <div className="w-full max-w-3xl rounded-3xl bg-white shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between bg-slate-50 border-b border-slate-100 px-6 py-4">
              <h2 className="text-xl font-black text-slate-800 tracking-tight">Edit Appointment</h2>
              <button onClick={() => { setEditOpen(false); setEditRow(null) }} className="p-2 rounded-xl text-slate-400 hover:bg-white transition-all"><XCircle className="h-6 w-6" /></button>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="space-y-1.5"><label className="text-[11px] font-black uppercase text-slate-400 tracking-widest">Date</label><input type="date" value={editForm.dateIso} onChange={e => editUpdate('dateIso', e.target.value)} className="w-full rounded-xl border border-slate-200 bg-slate-50/50 py-3 px-4 text-sm font-bold text-slate-700" /></div>
                <div className="space-y-1.5"><label className="text-[11px] font-black uppercase text-slate-400 tracking-widest">Time</label><input type="time" value={editForm.time} onChange={e => editUpdate('time', e.target.value)} className="w-full rounded-xl border border-slate-200 bg-slate-50/50 py-3 px-4 text-sm font-bold text-slate-700" /></div>
              </div>
              <div className="mt-6 flex justify-end gap-3">
                <button onClick={() => { setEditOpen(false); setEditRow(null) }} className="rounded-xl px-6 py-3 text-sm font-black uppercase text-slate-400 hover:text-slate-600 transition-all">Cancel</button>
                <button onClick={saveEdit} className="rounded-xl bg-indigo-600 px-8 py-3 text-sm font-black uppercase tracking-widest text-white shadow-lg shadow-indigo-100 hover:bg-indigo-700 transition-all">Update Session</button>
              </div>
            </div>
          </div>
        </div>
      )}

      <Lab_ConfirmDialog open={deleteConfirmOpen} title="Delete Appointment" message={deleteTarget ? `Are you sure you want to delete appointment for "${deleteTarget.patientName}"?` : 'Delete this session?'} confirmText="Delete" onCancel={() => { setDeleteConfirmOpen(false); setDeleteTarget(null) }} onConfirm={confirmDelete} />
    </div>
  )
}
