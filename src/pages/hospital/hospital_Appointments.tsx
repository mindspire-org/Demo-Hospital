import { useEffect, useMemo, useRef, useState } from 'react'
import { hospitalApi } from '../../utils/api'
import ConfirmDialog from '../../components/ui/ConfirmDialog'

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
  const [showBooking, setShowBooking] = useState(false)

  const [newPat, setNewPat] = useState({ name: '', phone: '', gender: '', age: '', notes: '' })
  const [booking, setBooking] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [info, setInfo] = useState<string | null>(null)

  const [apptMap, setApptMap] = useState<Record<string, any[]>>({})
  const [tokenMap, setTokenMap] = useState<Record<string, number[]>>({})

  // Book Appointment dialog

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
    setError(null); setInfo(null)
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
      setInfo('Appointment updated')
      setEditOpen(false)
      setEditRow(null)
      await loadSchedules()
      await loadApptTable()
    }catch(e:any){
      setError(e?.message || 'Failed to update appointment')
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
    setPhoneSuggestOpen(false)
  }

  async function book(){
    setError(null); setInfo(null)
    if (!doctorId){ setError('Select a doctor'); return }
    if (!selectedScheduleId){ setError('Select a schedule'); return }
    if (!selectedSlotNo){ setError('Select a slot'); return }
    const isExisting = !!selectedPatient
    if (!isExisting && !newPat.name){ setError('Enter patient name for new patient'); return }
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
      setInfo('Appointment booked')
      setSelectedSlotNo(null)
      setSelectedPatient(null)
      setNewPat({ name: '', phone: '', gender: '', age: '', notes: '' })
      await loadSchedules()
      await loadApptTable()
    }catch(e:any){ setError(e?.message || 'Failed to book appointment') }
    setBooking(false)
  }

  async function updateStatus(id: string, status: 'booked'|'confirmed'|'checked-in'|'cancelled'|'no-show'){
    try{ await hospitalApi.updateAppointmentStatus(id, status as any); await loadSchedules(); await loadApptTable() } catch(e:any){ setError(e?.message||'Failed to update status') }
  }

  async function convert(id: string){
    setError(null); setInfo(null)
    try{
      const res: any = await hospitalApi.convertAppointmentToToken(id)
      const tok = res?.token
      if (tok && tok.tokenNo){ setInfo(`Converted to Token #${tok.tokenNo}`) }
      await loadSchedules(); await loadApptTable()
    }catch(e:any){ setError(e?.message||'Failed to convert to token') }
  }

  async function removeAppointment(appt: any){
    if (!appt) return
    if (appt.tokenId){ setError('Converted appointment cannot be deleted'); return }
    setConfirmDeleteAppt(appt)
  }
  async function doConfirmDeleteAppt(){
    const appt = confirmDeleteAppt
    setConfirmDeleteAppt(null)
    if (!appt) return
    setError(null); setInfo(null)
    try{
      await hospitalApi.deleteAppointment(String(appt._id))
      setInfo('Appointment deleted')
      await loadSchedules(); await loadApptTable()
    }catch(e:any){
      setError(e?.message || 'Failed to delete appointment')
    }
  }

  const inp = "w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none transition-shadow focus:border-violet-400 focus:ring-2 focus:ring-violet-100 dark:bg-slate-900 dark:border-slate-700 dark:text-white dark:placeholder-slate-500 dark:focus:border-violet-500 dark:focus:ring-violet-900/40"
  const sel = "w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none transition-shadow focus:border-violet-400 focus:ring-2 focus:ring-violet-100 dark:bg-slate-900 dark:border-slate-700 dark:text-white dark:focus:border-violet-500 dark:focus:ring-violet-900/40"
  const lbl = "mb-1.5 block text-xs font-semibold tracking-wide text-slate-500 uppercase dark:text-slate-400"

  const statusBadge = (s: string) => {
    const m: Record<string, string> = {
      booked: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
      confirmed: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
      'checked-in': 'bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-400',
      cancelled: 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400',
      'no-show': 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
    }
    return `inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${m[s] || m.booked}`
  }

  return (
    <div className="hospital-scope min-h-dvh bg-slate-50 text-slate-900 dark:bg-[#0b1220] dark:text-slate-100">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-200 bg-white px-6 py-4 dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-violet-600 text-white">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
          </div>
          <div>
            <h1 className="text-lg font-bold text-slate-900 dark:text-white">Appointments</h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">Select doctor & date to view schedules</p>
          </div>
        </div>
        <button onClick={()=>setShowBooking(v=>!v)} className={`flex items-center gap-1.5 rounded-lg px-4 py-2 text-xs font-bold transition ${showBooking ? 'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400' : 'bg-violet-600 text-white shadow-sm shadow-violet-200 hover:bg-violet-700 dark:shadow-none dark:hover:bg-violet-500'}`}>
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
          {showBooking ? 'Close' : 'New Appointment'}
        </button>
      </div>

      {/* Alerts */}
      {error && <div className="mx-6 mt-4 flex items-center gap-2 rounded-lg border border-rose-200 bg-rose-50 px-4 py-2.5 text-sm text-rose-700 dark:border-rose-800 dark:bg-rose-900/20 dark:text-rose-400"><span>✕</span> {error}</div>}
      {info && <div className="mx-6 mt-4 flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-sm text-emerald-700 dark:border-emerald-800 dark:bg-emerald-900/20 dark:text-emerald-400"><span>✓</span> {info}</div>}

      {/* Filter Bar */}
      <div className="border-b border-slate-200 bg-white px-6 py-3 dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-wrap items-end gap-4">
          <div className="min-w-[180px] flex-1">
            <label className={lbl}>Doctor</label>
            <select value={doctorId} onChange={e=>setDoctorId(e.target.value)} className={sel}>
              <option value="">All doctors</option>
              {doctors.map(d=> <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
          </div>
          <div className="min-w-[160px]">
            <label className={lbl}>Date</label>
            <input type="date" value={dateIso} onChange={e=>setDateIso(e.target.value)} className={sel} />
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
            {loading ? <><svg className="h-3.5 w-3.5 animate-spin" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg> Loading…</> : <span className="font-medium text-slate-700 dark:text-slate-300">{schedules.length} schedule{schedules.length!==1?'s':''}</span>}
          </div>
        </div>
      </div>

      <div className="p-6 space-y-5">
        {/* Schedule Cards with Slot Grid */}
        {schedules.map(s => {
          const slots = slotsBySchedule[String(s._id)] || []
          const isSel = selectedScheduleId === String(s._id)
          const apptCount = (apptMap[String(s._id)]||[]).length
          const freeCount = slots.filter(sl=>sl.status==='free').length
          return (
            <div key={String(s._id)} className={`rounded-xl border bg-white transition-shadow ${isSel ? 'border-violet-300 shadow-md shadow-violet-100 dark:border-violet-700 dark:shadow-none' : 'border-slate-200 dark:border-slate-700 dark:bg-slate-900'}`}>
              <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-3">
                  <div className={`flex h-8 w-8 items-center justify-center rounded-lg text-xs font-bold ${isSel ? 'bg-violet-600 text-white' : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'}`}>{s.startTime.slice(0,5)}</div>
                  <div>
                    <div className="text-sm font-semibold text-slate-800 dark:text-slate-200">{s.startTime} — {s.endTime}</div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400">{s.slotMinutes} min slots • {freeCount} available • {apptCount} booked</div>
                  </div>
                </div>
                <button onClick={()=>{ setSelectedScheduleId(String(s._id)); setSelectedSlotNo(null) }} className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${isSel ? 'bg-violet-600 text-white' : 'border border-slate-200 text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-800'}`}>
                  {isSel ? '✓ Selected' : 'Select'}
                </button>
              </div>
              <div className="p-4">
                <div className="flex flex-wrap gap-2">
                  {slots.map(sl => {
                    const taken = sl.status !== 'free'
                    const selected = isSel && selectedSlotNo === sl.slotNo
                    let cls = ''
                    if (selected) cls = 'border-violet-500 bg-violet-600 text-white shadow-sm'
                    else if (sl.status === 'appt') cls = 'border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-800 dark:bg-sky-900/20 dark:text-sky-400'
                    else if (sl.status === 'token') cls = 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-800 dark:bg-amber-900/20 dark:text-amber-400'
                    else cls = 'border-slate-200 bg-white text-slate-700 hover:border-violet-300 hover:bg-violet-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:border-violet-600'
                    return (
                      <button key={sl.slotNo}
                        disabled={taken}
                        onClick={()=> { setSelectedScheduleId(String(s._id)); setSelectedSlotNo(sl.slotNo) }}
                        className={`relative rounded-lg border px-3 py-2 text-left text-xs transition ${cls} ${taken ? 'cursor-default' : 'cursor-pointer'}`}
                        title={taken ? (sl.status==='token' ? 'Taken (Token)' : 'Taken (Appointment)') : 'Available'}
                      >
                        <div className="font-semibold">{sl.start}</div>
                        {sl.status==='appt' && <div className="mt-0.5 truncate text-[10px] opacity-80">{sl.appt?.patientName || '—'}</div>}
                        {sl.status==='token' && <div className="mt-0.5 text-[10px] opacity-80">Token</div>}
                        {selected && <div className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-white text-violet-600 text-[10px] font-bold shadow">✓</div>}
                      </button>
                    )
                  })}
                </div>
              </div>
            </div>
          )
        })}
        {(!loading && schedules.length===0) && (
          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 bg-white py-12 text-slate-400 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-500">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
            <div className="text-sm font-medium">No schedules for this doctor on {dateIso}</div>
          </div>
        )}

        {/* Book Appointment Section */}
        {(showBooking || selectedSlotNo) && (
          <div className="rounded-xl border border-violet-200 bg-violet-50/50 dark:border-violet-800 dark:bg-violet-900/10">
            <div className="flex items-center gap-2 border-b border-violet-200 px-4 py-3 dark:border-violet-800">
              <span className="flex h-6 w-6 items-center justify-center rounded-md bg-violet-600 text-[10px] font-bold text-white">+</span>
              <span className="text-sm font-bold text-violet-800 dark:text-violet-300">{selectedSlotNo ? `Book Appointment — Slot ${selectedSlotNo}` : 'New Appointment'}</span>
              {!selectedSlotNo && <span className="text-[11px] text-violet-500 dark:text-violet-400">Select a slot below or fill details directly</span>}
            </div>
            <div className="p-4">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
                <div>
                  <label className={lbl}>Schedule</label>
                  <select value={selectedScheduleId} onChange={e=>{ setSelectedScheduleId(e.target.value); setSelectedSlotNo(null) }} className={sel}>
                    <option value="">Select schedule</option>
                    {schedules.map((s:any)=> (
                      <option key={String(s._id)} value={String(s._id)}>{s.startTime}–{s.endTime} ({s.slotMinutes}m)</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className={lbl}>Slot</label>
                  <select value={selectedSlotNo ?? ''} onChange={e=>setSelectedSlotNo(e.target.value ? Number(e.target.value) : null)} className={sel} disabled={!selectedScheduleId}>
                    <option value="">{selectedScheduleId ? 'Select slot' : 'Pick schedule first'}</option>
                    {(slotsBySchedule[selectedScheduleId]||[]).filter(sl=>sl.status==='free').map(sl=> (
                      <option key={sl.slotNo} value={sl.slotNo}>{sl.start} – {sl.end} (Slot {sl.slotNo})</option>
                    ))}
                  </select>
                </div>
                <div className="md:col-span-2">
                  <label className={lbl}>Phone</label>
                  <div ref={phoneSuggestWrapRef} className="relative">
                    <input className={inp} placeholder="03XXXXXXXXX" value={newPat.phone} onChange={onPhoneChange} maxLength={11} onFocus={()=>{ if (phoneSuggestItems.length>0) setPhoneSuggestOpen(true) }} ref={phoneRef} />
                    {phoneSuggestOpen && (
                      <div className="absolute z-20 mt-1 max-h-56 w-full overflow-y-auto rounded-lg border border-slate-200 bg-white shadow-xl dark:bg-slate-800 dark:border-slate-700">
                        {phoneSuggestItems.length === 0 ? (
                          <div className="px-3 py-2 text-sm text-slate-500">No results</div>
                        ) : phoneSuggestItems.map((p:any, idx:number) => (
                          <button type="button" key={p._id||idx} onClick={()=>selectPhoneSuggestion(p)} className="flex w-full flex-col items-start px-3 py-2 text-left transition hover:bg-violet-50 dark:hover:bg-slate-700/60">
                            <div className="text-sm font-medium text-slate-800 dark:text-slate-200">{p.fullName||'Unnamed'} <span className="text-xs text-slate-500 dark:text-slate-400">{p.mrn||'-'}</span></div>
                            <div className="text-xs text-slate-500 dark:text-slate-400">{p.phoneNormalized||''} • Age: {p.age||'-'} • {p.gender||'-'}</div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
                <div>
                  <label className={lbl}>MR Number</label>
                  <input className={inp} placeholder="MR-15" onKeyDown={onMrnKeyDown} />
                </div>
                <div>
                  <label className={lbl}>Patient Name</label>
                  <input className={inp} placeholder="Full name" value={newPat.name} onChange={e=>setNewPat(v=>({...v, name:e.target.value}))} ref={nameRef} />
                </div>
                <div>
                  <label className={lbl}>Age</label>
                  <input className={inp} placeholder="25" value={newPat.age} onChange={e=>setNewPat(v=>({...v, age:e.target.value}))} />
                </div>
                <div>
                  <label className={lbl}>Gender</label>
                  <select className={sel} value={newPat.gender} onChange={e=>setNewPat(v=>({...v, gender:e.target.value}))}>
                    <option value="">Select</option>
                    <option>Male</option>
                    <option>Female</option>
                    <option>Other</option>
                  </select>
                </div>
                <div className="md:col-span-2">
                  <label className={lbl}>Notes <span className="normal-case text-slate-400 dark:text-slate-500">(optional)</span></label>
                  <input className={inp} placeholder="Any notes for the doctor" value={newPat.notes} onChange={e=>setNewPat(v=>({...v, notes:e.target.value}))} />
                </div>
              </div>
              {selectedPatient && (
                <div className="mt-3 flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-700 dark:border-emerald-800 dark:bg-emerald-900/20 dark:text-emerald-400">
                  <span className="font-semibold">✓ {selectedPatient.fullName||'-'}</span> — MRN {selectedPatient.mrn||'-'}
                  <button onClick={()=>setSelectedPatient(null)} className="ml-auto rounded border border-emerald-300 px-2 py-0.5 text-[11px] transition hover:bg-emerald-100 dark:border-emerald-700 dark:hover:bg-emerald-900/30">Clear</button>
                </div>
              )}
              <div className="mt-4 flex items-center justify-end gap-2">
                <button onClick={()=>{ setSelectedPatient(null); setNewPat({ name:'', phone:'', gender:'', age:'', notes:'' }); setPhoneSuggestOpen(false); setSelectedSlotNo(null); setShowBooking(false) }} className="rounded-lg border border-slate-200 px-4 py-2 text-xs font-medium text-slate-600 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-800">Cancel</button>
                <button onClick={book} disabled={booking} className="rounded-lg bg-violet-600 px-5 py-2 text-xs font-bold text-white shadow-sm shadow-violet-200 transition hover:bg-violet-700 active:scale-[0.98] disabled:opacity-60 dark:shadow-none dark:hover:bg-violet-500">
                  {booking ? 'Booking…' : 'Confirm Booking'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Appointments List */}
        <div className="rounded-xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900">
          <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3 dark:border-slate-800">
            <div className="text-sm font-bold text-slate-800 dark:text-slate-200">
              {dateIso}{doctorId ? ` — ${doctors.find(d=>d.id===doctorId)?.name||doctorId}` : ''}
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400">{tblLoading ? 'Loading…' : `${tblTotal} appointment${tblTotal!==1?'s':''}`}</div>
          </div>
          {apptRows.length === 0 && !tblLoading ? (
            <div className="flex flex-col items-center py-10 text-slate-400 dark:text-slate-500">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 mb-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
              <span className="text-sm">No appointments</span>
            </div>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {apptRows.map((appt:any) => {
                const sched = schedules.find(s=> String(s._id)===String(appt.scheduleId))
                const startStr = appt.slotStart || (sched ? fromMin(toMin(sched.startTime)+(Number(appt.slotNo||1)-1)*Math.max(5, Number(sched.slotMinutes||15))) : '-')
                const endStr = appt.slotEnd || ''
                return (
                  <div key={String(appt._id)} className="flex items-center gap-4 px-5 py-3 transition hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                    <div className="min-w-[70px]">
                      <div className="text-sm font-bold text-slate-800 dark:text-slate-200">{startStr}</div>
                      {endStr && <div className="text-[10px] text-slate-400 dark:text-slate-500">— {endStr}</div>}
                    </div>
                    <div className="min-w-[140px] flex-1">
                      <div className="text-sm font-medium text-slate-800 dark:text-slate-200">{appt.patientName || appt.mrn || '—'}</div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400">{appt.phoneNormalized || '-'}</div>
                    </div>
                    <div className={statusBadge(appt.status)}>{appt.status}</div>
                    <div className="flex items-center gap-1.5 ml-auto">
                      {!appt.tokenId && appt.status !== 'cancelled' && (
                        <button onClick={()=>openEdit(appt)} className="rounded-md border border-slate-200 px-2 py-1 text-[11px] font-medium text-slate-600 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-800">Edit</button>
                      )}
                      {!appt.tokenId && (
                        <button onClick={()=>convert(String(appt._id))} className="rounded-md border border-violet-200 bg-violet-50 px-2 py-1 text-[11px] font-medium text-violet-700 transition hover:bg-violet-100 dark:border-violet-800 dark:bg-violet-900/20 dark:text-violet-400 dark:hover:bg-violet-900/40">→ Token</button>
                      )}
                      {!appt.tokenId && (
                        <button onClick={()=>removeAppointment(appt)} className="rounded-md border border-rose-200 px-2 py-1 text-[11px] font-medium text-rose-600 transition hover:bg-rose-50 dark:border-rose-800 dark:text-rose-400 dark:hover:bg-rose-900/20">Delete</button>
                      )}
                      {appt.status !== 'confirmed' && appt.status !== 'checked-in' && appt.status !== 'cancelled' && (
                        <button onClick={()=>updateStatus(String(appt._id), 'confirmed')} className="rounded-md border border-emerald-200 bg-emerald-50 px-2 py-1 text-[11px] font-medium text-emerald-700 transition hover:bg-emerald-100 dark:border-emerald-800 dark:bg-emerald-900/20 dark:text-emerald-400 dark:hover:bg-emerald-900/40">Confirm</button>
                      )}
                      {appt.status !== 'checked-in' && appt.status !== 'cancelled' && (
                        <button onClick={()=>updateStatus(String(appt._id), 'checked-in')} className="rounded-md border border-sky-200 bg-sky-50 px-2 py-1 text-[11px] font-medium text-sky-700 transition hover:bg-sky-100 dark:border-sky-800 dark:bg-sky-900/20 dark:text-sky-400 dark:hover:bg-sky-900/40">Check-in</button>
                      )}
                      {appt.status !== 'cancelled' && (
                        <button onClick={()=>updateStatus(String(appt._id), 'cancelled')} className="rounded-md border border-rose-200 bg-rose-50 px-2 py-1 text-[11px] font-medium text-rose-600 transition hover:bg-rose-100 dark:border-rose-800 dark:bg-rose-900/20 dark:text-rose-400 dark:hover:bg-rose-900/40">Cancel</button>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
          {tblTotal > 0 && (
            <div className="flex items-center justify-between border-t border-slate-100 px-5 py-2.5 dark:border-slate-800">
              <div className="text-[11px] text-slate-500 dark:text-slate-400">
                {Math.min((tblPage-1)*tblLimit+1, tblTotal)}–{Math.min((tblPage-1)*tblLimit+apptRows.length, tblTotal)} of {tblTotal}
              </div>
              <div className="flex items-center gap-2">
                <select value={tblLimit} onChange={e=>{ setTblLimit(parseInt(e.target.value)); setTblPage(1) }} className="rounded-md border border-slate-200 px-2 py-1 text-[11px] text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400">
                  <option value={10}>10</option><option value={20}>20</option><option value={50}>50</option><option value={100}>100</option>
                </select>
                <button disabled={tblLoading||tblPage<=1} onClick={()=>setTblPage(p=>Math.max(1,p-1))} className="rounded-md border border-slate-200 px-2 py-1 text-[11px] text-slate-600 disabled:opacity-40 dark:border-slate-700 dark:text-slate-400">←</button>
                <span className="text-[11px] text-slate-500 dark:text-slate-400">{tblPage}/{tblTotalPages}</span>
                <button disabled={tblLoading||tblPage>=tblTotalPages} onClick={()=>setTblPage(p=>Math.min(tblTotalPages,p+1))} className="rounded-md border border-slate-200 px-2 py-1 text-[11px] text-slate-600 disabled:opacity-40 dark:border-slate-700 dark:text-slate-400">→</button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Edit Modal */}
      {editOpen && editRow && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
          <div className="w-full max-w-2xl rounded-xl bg-white shadow-2xl ring-1 ring-black/5 dark:bg-slate-900 dark:ring-white/10">
            <div className="flex items-center justify-between border-b border-slate-200 px-5 py-3 dark:border-slate-800">
              <div>
                <div className="text-base font-bold text-slate-800 dark:text-slate-100">Edit Appointment</div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400">{editRow.patientId ? 'Linked patient — fields locked' : 'Patient fields editable'}</div>
              </div>
              <button onClick={()=>{ setEditOpen(false); setEditRow(null) }} className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs text-slate-600 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-800">Close</button>
            </div>
            <div className="p-5">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <label className={lbl}>Doctor</label>
                  <select value={editForm.doctorId} onChange={e=>editUpdate('doctorId', e.target.value)} className={sel}>
                    <option value="">Select doctor</option>
                    {doctors.map(d=> <option key={d.id} value={d.id}>{d.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className={lbl}>Schedule</label>
                  <select value={editForm.scheduleId} onChange={e=>editUpdate('scheduleId', e.target.value)} className={sel}>
                    <option value="">Select schedule</option>
                    {schedules.filter(s=> !editForm.doctorId || String(s.doctorId||'') === String(editForm.doctorId)).map((s:any)=> (
                      <option key={String(s._id)} value={String(s._id)}>{String(s.dateIso||dateIso)} {s.startTime}–{s.endTime} ({s.slotMinutes}m)</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className={lbl}>Slot No</label>
                  <input value={editForm.slotNo} onChange={e=>editUpdate('slotNo', e.target.value.replace(/\D+/g,''))} className={inp} placeholder="e.g., 3" />
                </div>
                <div>
                  <label className={lbl}>Current Slot</label>
                  <input value={`${editRow.slotStart||''}${editRow.slotEnd?' – '+editRow.slotEnd:''} (Slot ${editRow.slotNo||'-'})`} disabled className={`${inp} bg-slate-50 text-slate-500 dark:bg-slate-800 dark:text-slate-500`} />
                </div>
                <div>
                  <label className={lbl}>Patient Name</label>
                  <input value={editForm.patientName} disabled={!!editRow.patientId} onChange={e=>editUpdate('patientName', e.target.value)} className={`${inp} ${editRow.patientId ? 'bg-slate-50 text-slate-500 dark:bg-slate-800 dark:text-slate-500' : ''}`} />
                </div>
                <div>
                  <label className={lbl}>Phone</label>
                  <input value={editForm.phone} disabled={!!editRow.patientId} maxLength={11} onChange={e=>editUpdate('phone', String(e.target.value||'').replace(/\D+/g,'').slice(0,11))} className={`${inp} ${editRow.patientId ? 'bg-slate-50 text-slate-500 dark:bg-slate-800 dark:text-slate-500' : ''}`} />
                </div>
                <div>
                  <label className={lbl}>Age</label>
                  <input value={editForm.age} disabled={!!editRow.patientId} onChange={e=>editUpdate('age', e.target.value)} className={`${inp} ${editRow.patientId ? 'bg-slate-50 text-slate-500 dark:bg-slate-800 dark:text-slate-500' : ''}`} />
                </div>
                <div>
                  <label className={lbl}>Gender</label>
                  <select value={editForm.gender} disabled={!!editRow.patientId} onChange={e=>editUpdate('gender', e.target.value)} className={`${sel} ${editRow.patientId ? 'bg-slate-50 text-slate-500 dark:bg-slate-800 dark:text-slate-500' : ''}`}>
                    <option value="">Select</option><option>Male</option><option>Female</option><option>Other</option>
                  </select>
                </div>
                <div className="md:col-span-2">
                  <label className={lbl}>Notes</label>
                  <input value={editForm.notes} onChange={e=>editUpdate('notes', e.target.value)} className={inp} />
                </div>
              </div>
              <div className="mt-5 flex items-center justify-end gap-2">
                <button onClick={()=>{ setEditOpen(false); setEditRow(null) }} className="rounded-lg border border-slate-200 px-4 py-2 text-xs font-medium text-slate-600 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-800">Cancel</button>
                <button onClick={saveEdit} className="rounded-lg bg-violet-600 px-5 py-2 text-xs font-bold text-white shadow-sm shadow-violet-200 transition hover:bg-violet-700 active:scale-[0.98] dark:shadow-none dark:hover:bg-violet-500">Save Changes</button>
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
    </div>
  )
}
