import { useEffect, useMemo, useRef, useState } from 'react'
import { hospitalApi } from '../../utils/api'
import ConfirmDialog from '../../components/ui/ConfirmDialog'
import { Plus, Search, Calendar, User, Clock, CheckCircle2, XCircle, Pencil, Trash2, ArrowRight, RefreshCw, Filter, ChevronLeft, ChevronRight, UserPlus, Phone, UserCheck, Stethoscope } from 'lucide-react'
import SearchableSelect from '../../components/common/SearchableSelect'
import Toast, { type ToastState } from '../../components/ui/Toast'

function todayIso(){ return new Date().toISOString().slice(0,10) }

 
function toMin(hhmm: string){ const [h,m] = (hhmm||'').split(':').map(x=>parseInt(x,10)||0); return h*60+m }
function fromMin(min: number){ const h = Math.floor(min/60).toString().padStart(2,'0'); const m = (min%60).toString().padStart(2,'0'); return `${h}:${m}` }

export default function Hospital_Appointments(){
  const [doctors, setDoctors] = useState<Array<{ id: string; name: string }>>([])
  const [doctorId, setDoctorId] = useState('')
  const [dateIso, setDateIso] = useState(todayIso())
  const [schedules, setSchedules] = useState<any[]>([])
  const [loading, setLoading] = useState(false)

  const [selectedScheduleId, setSelectedScheduleId] = useState<string>('')
  const [selectedSlotNo, setSelectedSlotNo] = useState<number | null>(null)
  const [selectedPatient, setSelectedPatient] = useState<any | null>(null)

  const [newPat, setNewPat] = useState({ name: '', phone: '', gender: '', age: '', notes: '' })
  const [mrnInput, setMrnInput] = useState('')
  const [booking, setBooking] = useState(false)
  const [toast, setToast] = useState<ToastState>(null)

  const [apptMap, setApptMap] = useState<Record<string, any[]>>({})
  const [tokenMap, setTokenMap] = useState<Record<string, number[]>>({})

  const [addOpen, setAddOpen] = useState(false)

  function resetAddForm() {
    setSelectedScheduleId('')
    setSelectedSlotNo(null)
    setSelectedPatient(null)
    setNewPat({ name: '', phone: '', gender: '', age: '', notes: '' })
    setMrnInput('')
  }

  // Reset form when dialog opens/closes
  useEffect(() => {
    if (!addOpen) {
      resetAddForm()
    }
  }, [addOpen])

  // Server-side pagination state for the appointments list
  const [tblPage, setTblPage] = useState(1)
  const [tblLimit, setTblLimit] = useState(10)
  const [tblTotalPages, setTblTotalPages] = useState(1)
  const [tblTotal, setTblTotal] = useState(0)
  const [tblLoading, setTblLoading] = useState(false)
  const [apptRows, setApptRows] = useState<any[]>([])

  // Edit modal
  const [editOpen, setEditOpen] = useState(false)
  const [editRow, setEditRow] = useState<any | null>(null)
  const [confirmDeleteAppt, setConfirmDeleteAppt] = useState<any | null>(null)
  const [editForm, setEditForm] = useState({
    doctorId: '',
    scheduleId: '',
    slotNo: '',
    patientName: '',
    phone: '',
    gender: '',
    age: '',
    notes: '',
  })
  const editUpdate = (k: keyof typeof editForm, v: any) => setEditForm(prev => ({ ...prev, [k]: v }))

  // Phone suggestions (incremental, like Token Generator)
  const phoneRef = useRef<HTMLInputElement>(null)
  const nameRef = useRef<HTMLInputElement>(null)
  const [phoneSuggestOpen, setPhoneSuggestOpen] = useState(false)
  const [phoneSuggestItems, setPhoneSuggestItems] = useState<any[]>([])
  const phoneSuggestWrapRef = useRef<HTMLDivElement>(null)
  const phoneSuggestQueryRef = useRef<string>('')

  function openEdit(appt: any){
    const dId = String(appt?.doctorId || '')
    const sId = String(appt?.scheduleId || '')
    setEditRow(appt)
    setEditForm({
      doctorId: dId,
      scheduleId: sId,
      slotNo: appt?.slotNo != null ? String(appt.slotNo) : '',
      patientName: appt?.patientName || '',
      phone: String(appt?.phoneNormalized || appt?.phone || ''),
      gender: appt?.gender || '',
      age: (appt?.age != null ? String(appt.age) : ''),
      notes: appt?.notes || '',
    })
    setEditOpen(true)
  }

  async function saveEdit(){
    if (!editRow) return
    try{
      const payload: any = {
        notes: editForm.notes || undefined,
      }

      const nextDoctorId = String(editForm.doctorId || '').trim()
      const nextScheduleId = String(editForm.scheduleId || '').trim()
      const nextSlotNo = editForm.slotNo ? Number(editForm.slotNo) : undefined

      if (nextDoctorId && String(editRow.doctorId||'') !== nextDoctorId) payload.doctorId = nextDoctorId
      if (nextScheduleId && String(editRow.scheduleId||'') !== nextScheduleId) payload.scheduleId = nextScheduleId
      if (nextSlotNo != null && String(editRow.slotNo||'') !== String(nextSlotNo)) payload.slotNo = nextSlotNo

      // If appointment is linked to an existing patient, keep patient snapshot fields locked
      if (!editRow.patientId){
        payload.patientName = editForm.patientName || undefined
        payload.phone = editForm.phone || undefined
        payload.gender = editForm.gender || undefined
        payload.age = editForm.age || undefined
      }
      await hospitalApi.updateAppointment(String(editRow._id), payload)
      setToast({ type: 'success', message: 'Appointment updated' })
      setEditOpen(false)
      setEditRow(null)
      await loadSchedules()
      await loadApptTable()
    }catch(e:any){
      setToast({ type: 'error', message: e?.message || 'Failed to update appointment' })
    }
  }

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (!phoneSuggestWrapRef.current) return
      if (!phoneSuggestWrapRef.current.contains(e.target as any)) setPhoneSuggestOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [])

  useEffect(()=>{ (async()=>{
    try{
      const res: any = await hospitalApi.listDoctors()
      const list = (res?.doctors||[]).map((d: any)=>({ id: String(d._id || d.id), name: d.name }))
      setDoctors(list)
    }catch{}
  })() }, [])

  useEffect(()=>{ if (doctorId && dateIso) loadSchedules() }, [doctorId, dateIso])
  useEffect(()=>{ loadApptTable() }, [doctorId, dateIso, tblPage, tblLimit])

  const selectedSchedule = useMemo(
    () => schedules.find(s => String(s._id) === String(selectedScheduleId)),
    [schedules, selectedScheduleId]
  )


  async function loadSchedules(){
    setLoading(true)
    setSelectedScheduleId('')
    setSelectedSlotNo(null)
    try{
      const res: any = await hospitalApi.listDoctorSchedules({ doctorId, date: dateIso })
      const rows: any[] = res?.schedules || []
      setSchedules(rows)
      if (rows.length && !selectedScheduleId) setSelectedScheduleId(String(rows[0]._id))
      // For each schedule, load appointments and tokens
      const apptMapLocal: Record<string, any[]> = {}
      const tokenMapLocal: Record<string, number[]> = {}
      for (const s of rows){
        try {
          const [ap, tk]: any = await Promise.all([
            hospitalApi.listAppointments({ scheduleId: String(s._id) }),
            hospitalApi.listTokens({ scheduleId: String(s._id) }),
          ])
          apptMapLocal[String(s._id)] = (ap?.appointments || [])
          tokenMapLocal[String(s._id)] = (tk?.tokens || []).map((t: any)=> Number(t.slotNo||0)).filter(Boolean)
        } catch {}
      }
      setApptMap(apptMapLocal)
      setTokenMap(tokenMapLocal)
    }catch{
      // Fallback: some backends 500 on invalid doctorId filter; retry without doctorId then filter client-side
      try {
        const resAll: any = await hospitalApi.listDoctorSchedules({ date: dateIso })
        const allRows: any[] = resAll?.schedules || []
        const rows = doctorId ? allRows.filter((r:any)=> String(r.doctorId||'') === String(doctorId)) : allRows
        setSchedules(rows)
        if (rows.length && !selectedScheduleId) setSelectedScheduleId(String(rows[0]._id))
        const apptMapLocal: Record<string, any[]> = {}
        const tokenMapLocal: Record<string, number[]> = {}
        for (const s of rows){
          try {
            const [ap, tk]: any = await Promise.all([
              hospitalApi.listAppointments({ scheduleId: String(s._id) }),
              hospitalApi.listTokens({ scheduleId: String(s._id) }),
            ])
            apptMapLocal[String(s._id)] = (ap?.appointments || [])
            tokenMapLocal[String(s._id)] = (tk?.tokens || []).map((t: any)=> Number(t.slotNo||0)).filter(Boolean)
          } catch {}
        }
        setApptMap(apptMapLocal)
        setTokenMap(tokenMapLocal)
      } catch {
        setSchedules([])
      }
    }
    setLoading(false)
  }

  async function loadApptTable(){
    if (!dateIso){ setApptRows([]); setTblTotal(0); setTblTotalPages(1); return }
    setTblLoading(true)
    try{
      // Do not send page/limit until backend supports it; paginate on client
      const params: any = { date: dateIso }
      if (doctorId) params.doctorId = doctorId
      const res: any = await hospitalApi.listAppointments(params)
      const arr: any[] = (res?.items ?? res?.appointments ?? (Array.isArray(res)? res : [])) as any[]
      const total = arr.length
      setTblTotal(total)
      const tp = Math.max(1, Math.ceil(total/Math.max(1,tblLimit)))
      setTblTotalPages(tp)
      const start = Math.max(0,(tblPage-1)*tblLimit)
      setApptRows(arr.slice(start, start+tblLimit))
    } catch(e){
      setApptRows([]); setTblTotal(0); setTblTotalPages(1)
    }
    setTblLoading(false)
  }

  const slotsBySchedule = useMemo(()=>{
    const out: Record<string, Array<{ slotNo: number; start: string; end: string; status: 'free'|'appt'|'token'; appt?: any }>> = {}
    for (const s of schedules){
      const total = Math.max(0, Math.floor((toMin(s.endTime) - toMin(s.startTime)) / Math.max(5, Number(s.slotMinutes||15))))
      const appts = (apptMap[String(s._id)] || []) as any[]
      const tkUsed = new Set<number>((tokenMap[String(s._id)]||[]))
      const arr: Array<{ slotNo: number; start: string; end: string; status: 'free'|'appt'|'token'; appt?: any }> = []
      for (let i=1;i<=total;i++){
        const startMin = toMin(s.startTime) + (i-1)*Math.max(5, Number(s.slotMinutes||15))
        const se = { start: fromMin(startMin), end: fromMin(startMin + Math.max(5, Number(s.slotMinutes||15))) }
        const ap = appts.find(a => Number(a.slotNo||0) === i && ['booked','confirmed','checked-in'].includes(String(a.status||'')))
        if (ap) arr.push({ slotNo: i, ...se, status: 'appt', appt: ap })
        else if (tkUsed.has(i)) arr.push({ slotNo: i, ...se, status: 'token' })
        else arr.push({ slotNo: i, ...se, status: 'free' })
      }
      out[String(s._id)] = arr
    }
    return out
  }, [schedules, apptMap, tokenMap])

  

  async function onMrnKeyDown(e: React.KeyboardEvent<HTMLInputElement>){
    if (e.key !== 'Enter') return
    e.preventDefault()
    const mr = String((e.currentTarget.value||'').trim())
    if (!mr) return
    try{
      const r: any = await hospitalApi.searchPatients({ mrn: mr, limit: 5 })
      const list: any[] = Array.isArray(r?.patients) ? r.patients : []
      const p = list.find(x => String(x.mrn||'').trim().toLowerCase() === mr.toLowerCase()) || list[0]
      if (p){
        setSelectedPatient(p)
        setNewPat(v=>({ ...v, name: p.fullName||v.name, phone: p.phoneNormalized||v.phone, gender: p.gender||v.gender, age: (p.age!=null? String(p.age):v.age) }))
        setMrnInput(p.mrn || '')
        setPhoneSuggestOpen(false)
      }
    } catch {}
  }

  function onPhoneChange(e: React.ChangeEvent<HTMLInputElement>){
    const v = e.target.value
    const digits = (v||'').replace(/\D+/g,'').slice(0, 11)
    setNewPat(prev=>({ ...prev, phone: digits }))
    if ((window as any)._apptPhoneSuggestDeb) clearTimeout((window as any)._apptPhoneSuggestDeb)
    if (digits.length >= 3){
      ;(window as any)._apptPhoneSuggestDeb = setTimeout(()=> runPhoneSuggestLookup(digits), 250)
    } else {
      setPhoneSuggestItems([])
      setPhoneSuggestOpen(false)
    }
  }

  async function runPhoneSuggestLookup(digits: string){
    try{
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

  function selectPhoneSuggestion(p: any){
    setSelectedPatient(p)
    setNewPat(v=>({ ...v, name: p.fullName || v.name, phone: p.phoneNormalized || v.phone, gender: p.gender || v.gender, age: (p.age!=null? String(p.age):v.age) }))
    setMrnInput(p.mrn || '')
    setPhoneSuggestOpen(false)
  }

  async function book(){
    if (!doctorId){ setToast({ type: 'error', message: 'Select a doctor' }); return }
    if (!selectedScheduleId){ setToast({ type: 'error', message: 'Select a schedule' }); return }
    if (!selectedSlotNo){ setToast({ type: 'error', message: 'Select a slot' }); return }
    const isExisting = !!selectedPatient
    if (!isExisting && !newPat.name){ setToast({ type: 'error', message: 'Enter patient name for new patient' }); return }
    setBooking(true)
    try{
      const payload: any = {
        doctorId,
        departmentId: String(selectedSchedule?.departmentId || '') || undefined,
        scheduleId: selectedScheduleId,
        slotNo: selectedSlotNo,
        notes: newPat.notes || undefined,
      }
      if (isExisting){
        payload.patientId = String(selectedPatient._id)
      } else {
        payload.patientName = newPat.name
        payload.phone = newPat.phone
        payload.gender = newPat.gender || undefined
        payload.age = newPat.age || undefined
      }
      await hospitalApi.createAppointment(payload)
      setToast({ type: 'success', message: 'Appointment booked' })
      resetAddForm()
      setAddOpen(false)
      await loadSchedules()
      await loadApptTable()
    }catch(e:any){ setToast({ type: 'error', message: e?.message || 'Failed to book appointment' }) }
    setBooking(false)
  }

  async function updateStatus(id: string, status: 'booked'|'confirmed'|'checked-in'|'cancelled'|'no-show'){
    try{ 
      await hospitalApi.updateAppointmentStatus(id, status as any)
      setToast({ type: 'success', message: `Status updated to ${status}` })
      await loadSchedules()
      await loadApptTable() 
    } catch(e:any){ 
      setToast({ type: 'error', message: e?.message||'Failed to update status' }) 
    }
  }

  async function convert(id: string){
    try{
      const res: any = await hospitalApi.convertAppointmentToToken(id)
      const tok = res?.token
      if (tok && tok.tokenNo){ setToast({ type: 'success', message: `Converted to Token #${tok.tokenNo}` }) }
      await loadSchedules(); await loadApptTable()
    }catch(e:any){ setToast({ type: 'error', message: e?.message||'Failed to convert to token' }) }
  }

  async function removeAppointment(appt: any){
    if (!appt) return
    if (appt.tokenId){ setToast({ type: 'error', message: 'Converted appointment cannot be deleted' }); return }
    setConfirmDeleteAppt(appt)
  }
  async function doConfirmDeleteAppt(){
    const appt = confirmDeleteAppt
    setConfirmDeleteAppt(null)
    if (!appt) return
    try{
      await hospitalApi.deleteAppointment(String(appt._id))
      setToast({ type: 'success', message: 'Appointment deleted' })
      await loadSchedules(); await loadApptTable()
    }catch(e:any){
      setToast({ type: 'error', message: e?.message || 'Failed to delete appointment' })
    }
  }

  return (
    <div className="space-y-6 pb-8 bg-slate-50/50 dark:bg-slate-900/50 -m-6 p-6 min-h-screen">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-extrabold text-slate-900 dark:text-slate-100 tracking-tight">Appointments</h2>
          <p className="text-slate-500 dark:text-slate-400 text-sm font-medium mt-1">Manage doctor consultations and patient bookings</p>
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={() => setAddOpen(true)}
            className="btn flex items-center gap-2 shadow-lg shadow-blue-500/20"
          >
            <Plus className="h-4 w-4" /> New Appointment
          </button>
          <button onClick={() => { loadSchedules(); loadApptTable(); }} className="btn-outline-navy flex items-center gap-2 bg-white dark:bg-slate-800">
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} /> Refresh
          </button>
        </div>
      </div>

      {/* Quick Filters */}
      <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4 shadow-sm">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Filter by Doctor</label>
            <SearchableSelect
              value={doctorId}
              onChange={setDoctorId}
              options={[{ value: '', label: 'All Doctors' }, ...doctors.map(d => ({ value: d.id, label: d.name }))]}
              placeholder="Search doctor..."
            />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Select Date</label>
            <div className="relative">
              <input 
                type="date" 
                value={dateIso} 
                onChange={e => setDateIso(e.target.value)} 
                className="w-full bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 rounded-xl pl-10 pr-4 py-2 text-sm focus:ring-2 focus:ring-blue-500 transition-all" 
              />
              <Calendar className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            </div>
          </div>
          <div className="flex items-end justify-end">
            <div className="text-right">
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Total Appointments</div>
              <div className="text-2xl font-black text-slate-900 dark:text-slate-100">{tblTotal}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Appointments list */}
      <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-sm overflow-hidden transition-all">
        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/20">
          <h3 className="font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <Calendar className="h-5 w-5 text-blue-500" />
            Bookings for {new Date(dateIso).toLocaleDateString(undefined, { dateStyle: 'medium' })}
          </h3>
          <div className="flex items-center gap-2">
            <select
              value={tblLimit}
              onChange={e => { setTblLimit(Number(e.target.value)); setTblPage(1); }}
              className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 rounded-lg px-3 py-1 text-xs font-bold text-slate-600 focus:ring-2 focus:ring-blue-500 transition-all"
            >
              <option value={10}>10 / page</option>
              <option value={20}>20 / page</option>
              <option value={50}>50 / page</option>
            </select>
          </div>
        </div>
        
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead>
              <tr className="bg-slate-50/80 dark:bg-slate-900/50 border-b border-slate-100 dark:border-slate-700">
                <th className="px-6 py-4 text-[11px] font-bold uppercase tracking-widest text-slate-500">Time & Slot</th>
                <th className="px-6 py-4 text-[11px] font-bold uppercase tracking-widest text-slate-500">Patient Details</th>
                <th className="px-6 py-4 text-[11px] font-bold uppercase tracking-widest text-slate-500">Doctor</th>
                <th className="px-6 py-4 text-[11px] font-bold uppercase tracking-widest text-slate-500">Status</th>
                <th className="px-6 py-4 text-[11px] font-bold uppercase tracking-widest text-slate-500 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 dark:divide-slate-700">
              {tblLoading && apptRows.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center">
                    <div className="flex flex-col items-center gap-2">
                      <RefreshCw className="h-8 w-8 text-blue-500 animate-spin" />
                      <span className="text-slate-400 font-medium">Fetching bookings...</span>
                    </div>
                  </td>
                </tr>
              ) : apptRows.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center">
                    <div className="flex flex-col items-center gap-2">
                      <Calendar className="h-8 w-8 text-slate-200" />
                      <span className="text-slate-400 font-medium">No appointments scheduled for this date</span>
                    </div>
                  </td>
                </tr>
              ) : apptRows.map((appt: any) => {
                const sched = schedules.find(s => String(s._id) === String(appt.scheduleId))
                const startStr = appt.slotStart || (sched ? fromMin(toMin(sched.startTime) + (Number(appt.slotNo || 1) - 1) * Math.max(5, Number(sched.slotMinutes || 15))) : '-')
                const endStr = appt.slotEnd || ''
                const docName = doctors.find(d => d.id === appt.doctorId)?.name || 'Unknown Doctor'
                
                const statusColors: Record<string, string> = {
                  booked: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
                  confirmed: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
                  'checked-in': 'bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-400',
                  cancelled: 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400',
                  'no-show': 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                }

                return (
                  <tr key={String(appt._id)} className="group hover:bg-slate-50/50 dark:hover:bg-slate-900/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-xl bg-slate-100 dark:bg-slate-800 flex flex-col items-center justify-center border border-slate-200 dark:border-slate-700">
                          <span className="text-[10px] font-bold text-slate-400 uppercase">Slot</span>
                          <span className="text-sm font-black text-slate-700 dark:text-slate-200">{appt.slotNo || '-'}</span>
                        </div>
                        <div>
                          <div className="text-sm font-black text-slate-900 dark:text-slate-100 tabular-nums">{startStr}</div>
                          {endStr && <div className="text-[10px] font-bold text-slate-400 tabular-nums">to {endStr}</div>}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="font-bold text-slate-900 dark:text-slate-100 capitalize">{appt.patientName || appt.mrn || '—'}</span>
                        <span className="text-[10px] text-slate-400 font-medium flex items-center gap-1">
                          <Phone className="h-3 w-3" /> {appt.phoneNormalized || '-'}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 font-medium text-slate-700 dark:text-slate-300">
                      <div className="flex items-center gap-2">
                        <div className="h-2 w-2 rounded-full bg-blue-500" />
                        {docName}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${statusColors[appt.status] || 'bg-slate-100 text-slate-700'}`}>
                        {appt.status}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-1.5">
                        {!appt.tokenId && appt.status !== 'cancelled' && (
                          <button onClick={() => openEdit(appt)} className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors" title="Edit">
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                        )}
                        {appt.status === 'booked' && (
                          <button onClick={() => updateStatus(String(appt._id), 'confirmed')} className="p-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-600 transition-colors" title="Confirm">
                            <CheckCircle2 className="h-3.5 w-3.5" />
                          </button>
                        )}
                        {appt.status !== 'checked-in' && appt.status !== 'cancelled' && (
                          <button onClick={() => updateStatus(String(appt._id), 'checked-in')} className="p-1.5 rounded-lg bg-sky-50 hover:bg-sky-100 text-sky-600 transition-colors" title="Check-in">
                            <UserCheck className="h-3.5 w-3.5" />
                          </button>
                        )}
                        {!appt.tokenId && (
                          <button onClick={() => convert(String(appt._id))} className="p-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-600 transition-colors" title="Convert to Token">
                            <ArrowRight className="h-3.5 w-3.5" />
                          </button>
                        )}
                        {appt.status !== 'cancelled' && (
                          <button onClick={() => updateStatus(String(appt._id), 'cancelled')} className="p-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 transition-colors" title="Cancel">
                            <XCircle className="h-3.5 w-3.5" />
                          </button>
                        )}
                        {!appt.tokenId && (
                          <button onClick={() => removeAppointment(appt)} className="p-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 transition-colors" title="Delete">
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        <div className="px-6 py-4 bg-slate-50/50 dark:bg-slate-900/50 border-t border-slate-100 dark:border-slate-700 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="text-sm text-slate-500 font-medium">
            {tblTotal > 0 ? (
              <>Showing <span className="font-bold text-slate-900 dark:text-slate-100">{(tblPage - 1) * tblLimit + 1}</span> to <span className="font-bold text-slate-900 dark:text-slate-100">{Math.min(tblPage * tblLimit, tblTotal)}</span> of <span className="font-bold text-slate-900 dark:text-slate-100">{tblTotal}</span> records</>
            ) : 'No records found'}
          </div>
          {tblTotalPages > 1 && (
            <div className="flex items-center gap-2">
              <button
                disabled={tblLoading || tblPage <= 1}
                onClick={() => setTblPage(p => Math.max(1, p - 1))}
                className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-50 disabled:opacity-40 transition-all shadow-sm"
              >
                <ChevronLeft className="h-4 w-4" /> Prev
              </button>
              <div className="px-4 py-1.5 bg-blue-600 text-white rounded-xl text-sm font-bold shadow-md">
                Page {tblPage} of {tblTotalPages}
              </div>
              <button
                disabled={tblLoading || tblPage >= tblTotalPages}
                onClick={() => setTblPage(p => Math.min(tblTotalPages, p + 1))}
                className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-50 disabled:opacity-40 transition-all shadow-sm"
              >
                Next <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Book Appointment Dialog */}
      {addOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="w-full max-w-4xl bg-white dark:bg-slate-800 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden flex flex-col max-h-[90vh]">
            <div className="px-8 py-6 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/20">
              <div>
                <h3 className="text-xl font-black text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <UserPlus className="h-6 w-6 text-blue-500" />
                  New Appointment Booking
                </h3>
                <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mt-0.5">Step 1: Select Doctor & Available Slot</p>
              </div>
              <button onClick={() => setAddOpen(false)} className="h-10 w-10 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700 flex items-center justify-center transition-colors">
                <Plus className="h-6 w-6 rotate-45 text-slate-400" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-8 space-y-8">
              {/* Step 1: Doctor & Slots */}
              <div className="grid gap-6 md:grid-cols-2">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Select Doctor</label>
                    <SearchableSelect
                      value={doctorId}
                      onChange={setDoctorId}
                      options={doctors.map(d => ({ value: d.id, label: d.name }))}
                      placeholder="Search doctor..."
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Booking Date</label>
                    <div className="relative">
                      <input 
                        type="date" 
                        value={dateIso} 
                        onChange={e => setDateIso(e.target.value)} 
                        className="w-full bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 rounded-xl pl-10 pr-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 transition-all" 
                      />
                      <Calendar className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
                    </div>
                  </div>
                </div>

                <div className="bg-slate-50 dark:bg-slate-900/50 rounded-2xl p-6 border border-slate-100 dark:border-slate-800">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="text-xs font-black text-slate-900 dark:text-slate-100 uppercase tracking-widest flex items-center gap-2">
                      <Clock className="h-4 w-4 text-blue-500" />
                      Available Time Slots
                    </h4>
                    <span className="text-[10px] font-bold text-slate-400">{schedules.length} Active Schedules</span>
                  </div>
                  
                  <div className="space-y-4 max-h-64 overflow-y-auto pr-2 custom-scrollbar">
                    {schedules.map(s => {
                      const slots = slotsBySchedule[String(s._id)] || []
                      return (
                        <div key={String(s._id)} className="space-y-2">
                          <div className="text-[10px] font-black text-slate-400 uppercase tracking-tighter bg-white dark:bg-slate-800 px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-700 inline-block">
                            {s.startTime} — {s.endTime} ({s.slotMinutes}m)
                          </div>
                          <div className="grid grid-cols-3 gap-2">
                            {slots.map(sl => {
                              const taken = sl.status !== 'free'
                              const isSelected = selectedScheduleId === String(s._id) && selectedSlotNo === sl.slotNo
                              return (
                                <button
                                  key={sl.slotNo}
                                  disabled={taken}
                                  onClick={() => { setSelectedScheduleId(String(s._id)); setSelectedSlotNo(sl.slotNo); }}
                                  className={`p-2 rounded-xl border text-[10px] font-bold transition-all flex flex-col items-center justify-center gap-0.5 ${
                                    isSelected ? 'bg-blue-600 border-blue-600 text-white shadow-lg shadow-blue-500/30 ring-2 ring-blue-500 ring-offset-2' :
                                    taken ? 'bg-slate-100 border-slate-100 text-slate-300 cursor-not-allowed opacity-50' :
                                    'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-blue-500 hover:text-blue-500'
                                  }`}
                                >
                                  <span className="tabular-nums">{sl.start}</span>
                                  {isSelected && <CheckCircle2 className="h-3 w-3" />}
                                </button>
                              )
                            })}
                          </div>
                        </div>
                      )
                    })}
                    {schedules.length === 0 && (
                      <div className="flex flex-col items-center justify-center py-8 text-center opacity-40">
                        <Calendar className="h-10 w-10 mb-2" />
                        <p className="text-xs font-bold">No schedules found</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Step 2: Patient Info */}
              <div className="space-y-6 pt-6 border-t border-slate-100 dark:border-slate-700">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-black text-slate-900 dark:text-slate-100 uppercase tracking-widest flex items-center gap-2">
                    <User className="h-4 w-4 text-blue-500" />
                    Patient Information
                  </h4>
                  {selectedPatient && (
                    <button 
                      onClick={() => {
                        setSelectedPatient(null);
                        setMrnInput('');
                        setNewPat({ name: '', phone: '', gender: '', age: '', notes: '' });
                      }} 
                      className="text-[10px] font-black text-rose-500 uppercase flex items-center gap-1 hover:underline"
                    >
                      <XCircle className="h-3 w-3" /> Clear Selection
                    </button>
                  )}
                </div>

                <div className="grid gap-6 md:grid-cols-3">
                  <div className="md:col-span-2 space-y-2">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Phone Number (Search existing)</label>
                    <div ref={phoneSuggestWrapRef} className="relative">
                      <input
                        className="w-full bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 rounded-xl pl-10 pr-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 transition-all font-bold tabular-nums"
                        placeholder="Type phone to search..."
                        value={newPat.phone}
                        onChange={onPhoneChange}
                        maxLength={11}
                        onFocus={() => { if (phoneSuggestItems.length > 0) setPhoneSuggestOpen(true) }}
                      />
                      <Phone className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
                      {phoneSuggestOpen && (
                        <div className="absolute z-20 mt-2 max-h-64 w-full overflow-y-auto rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-2xl p-2 space-y-1">
                          {phoneSuggestItems.map((p: any) => (
                            <button
                              key={p._id}
                              onClick={() => selectPhoneSuggestion(p)}
                              className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-900 text-left transition-colors border border-transparent hover:border-blue-100"
                            >
                              <div>
                                <div className="text-sm font-black text-slate-900 dark:text-slate-100">{p.fullName}</div>
                                <div className="text-[10px] font-bold text-slate-400">{p.mrn} • {p.gender}</div>
                              </div>
                              <ArrowRight className="h-4 w-4 text-blue-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">MR Number (Optional)</label>
                    <input 
                      className="w-full bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 transition-all font-bold" 
                      placeholder="MR-000" 
                      value={mrnInput}
                      onChange={e => setMrnInput(e.target.value)}
                      onKeyDown={onMrnKeyDown} 
                    />
                  </div>
                  <div className="md:col-span-2 space-y-2">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Patient Full Name</label>
                    <input 
                      className="w-full bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 transition-all font-bold" 
                      placeholder="Enter full name" 
                      value={newPat.name} 
                      onChange={e => setNewPat(v => ({ ...v, name: e.target.value }))} 
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Age</label>
                      <input 
                        className="w-full bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 transition-all font-bold tabular-nums" 
                        placeholder="e.g. 25" 
                        value={newPat.age} 
                        onChange={e => setNewPat(v => ({ ...v, age: e.target.value }))} 
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Gender</label>
                      <select 
                        className="w-full bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 transition-all font-bold" 
                        value={newPat.gender} 
                        onChange={e => setNewPat(v => ({ ...v, gender: e.target.value }))}
                      >
                        <option value="">Select</option>
                        <option>Male</option>
                        <option>Female</option>
                        <option>Other</option>
                      </select>
                    </div>
                  </div>
                  <div className="md:col-span-3 space-y-2">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Clinical Notes</label>
                    <textarea 
                      rows={2}
                      className="w-full bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 transition-all resize-none" 
                      placeholder="Add any specific instructions or symptoms..." 
                      value={newPat.notes} 
                      onChange={e => setNewPat(v => ({ ...v, notes: e.target.value }))} 
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="px-8 py-6 bg-slate-50 dark:bg-slate-900/50 border-t border-slate-100 dark:border-slate-700 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`h-2 w-2 rounded-full ${selectedSlotNo ? 'bg-emerald-500' : 'bg-slate-300 animate-pulse'}`} />
                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                  {selectedSlotNo ? `Slot ${selectedSlotNo} Selected` : 'Select a slot to continue'}
                </span>
              </div>
              <div className="flex items-center gap-3">
                <button onClick={() => setAddOpen(false)} className="px-6 py-2.5 text-sm font-black text-slate-400 hover:text-slate-600 transition-colors uppercase tracking-widest">Cancel</button>
                <button 
                  onClick={book} 
                  disabled={booking || !selectedSlotNo} 
                  className="btn px-10 py-3 shadow-xl shadow-blue-500/30 disabled:opacity-50 disabled:shadow-none"
                >
                  {booking ? 'Confirming...' : 'Confirm Booking'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit modal */}
      {editOpen && editRow && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
          <div className="w-full max-w-2xl rounded-2xl bg-white dark:bg-slate-800 shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-700 px-6 py-4 bg-slate-50/50 dark:bg-slate-900/20">
              <div>
                <div className="text-base font-black text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <Pencil className="h-5 w-5 text-blue-500" />
                  Edit Appointment
                </div>
                <div className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-0.5">{editRow.patientId ? 'Existing Patient (Locked Fields)' : 'Snapshot Booking (Editable)'}</div>
              </div>
              <button onClick={()=>{ setEditOpen(false); setEditRow(null) }} className="p-2 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors">
                <Plus className="h-5 w-5 rotate-45 text-slate-400" />
              </button>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Doctor</label>
                  <select value={editForm.doctorId} onChange={e=>editUpdate('doctorId', e.target.value)} className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 px-4 py-2.5 text-sm font-bold">
                    <option value="">Select doctor</option>
                    {doctors.map(d=> <option key={d.id} value={d.id}>{d.name}</option>)}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Schedule</label>
                  <select value={editForm.scheduleId} onChange={e=>editUpdate('scheduleId', e.target.value)} className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 px-4 py-2.5 text-sm font-bold">
                    <option value="">Select schedule</option>
                    {schedules
                      .filter(s=> !editForm.doctorId || String(s.doctorId||'') === String(editForm.doctorId))
                      .map((s:any)=> (
                        <option key={String(s._id)} value={String(s._id)}>
                          {String(s.dateIso||dateIso)} {s.startTime}-{s.endTime} ({s.slotMinutes}m)
                        </option>
                      ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Slot No</label>
                  <input value={editForm.slotNo} onChange={e=>editUpdate('slotNo', e.target.value.replace(/\D+/g,''))} className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 px-4 py-2.5 text-sm font-bold tabular-nums" placeholder="e.g. 3" />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Current Slot Info</label>
                  <input value={`${editRow.slotStart || ''}${editRow.slotEnd ? ' - ' + editRow.slotEnd : ''} (Slot ${editRow.slotNo || '-'})`} disabled className="w-full rounded-xl border border-slate-100 bg-slate-50 dark:bg-slate-900 px-4 py-2.5 text-sm text-slate-400 font-bold tabular-nums italic" />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Patient Name</label>
                  <input value={editForm.patientName} disabled={!!editRow.patientId} onChange={e=>editUpdate('patientName', e.target.value)} className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 px-4 py-2.5 text-sm font-bold disabled:opacity-50" />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Phone</label>
                  <input
                    value={editForm.phone}
                    disabled={!!editRow.patientId}
                    maxLength={11}
                    onChange={e=>editUpdate('phone', String(e.target.value||'').replace(/\D+/g,'').slice(0, 11))}
                    className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 px-4 py-2.5 text-sm font-bold disabled:opacity-50 tabular-nums"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Age</label>
                  <input value={editForm.age} disabled={!!editRow.patientId} onChange={e=>editUpdate('age', e.target.value)} className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 px-4 py-2.5 text-sm font-bold disabled:opacity-50 tabular-nums" />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Gender</label>
                  <select value={editForm.gender} disabled={!!editRow.patientId} onChange={e=>editUpdate('gender', e.target.value)} className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 px-4 py-2.5 text-sm font-bold disabled:opacity-50">
                    <option value="">Select gender</option>
                    <option>Male</option>
                    <option>Female</option>
                    <option>Other</option>
                  </select>
                </div>
                <div className="md:col-span-2 space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Notes</label>
                  <textarea rows={2} value={editForm.notes} onChange={e=>editUpdate('notes', e.target.value)} className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 px-4 py-2.5 text-sm resize-none" />
                </div>
              </div>
              <div className="mt-6 flex items-center justify-end gap-3">
                <button onClick={()=>{ setEditOpen(false); setEditRow(null) }} className="px-6 py-2 text-sm font-black text-slate-400 hover:text-slate-600 transition-colors uppercase tracking-widest">Cancel</button>
                <button onClick={saveEdit} className="btn px-8 shadow-lg shadow-blue-500/20">Save Changes</button>
              </div>
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={!!confirmDeleteAppt}
        title="Confirm Delete"
        message="Delete this appointment?"
        confirmText="Delete"
        onCancel={()=>setConfirmDeleteAppt(null)}
        onConfirm={doConfirmDeleteAppt}
      />
      <Toast toast={toast} onClose={()=>setToast(null)} />
    </div>
  )
}
