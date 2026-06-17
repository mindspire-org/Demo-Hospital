import { useEffect, useMemo, useState } from 'react'
import { hospitalApi } from '../../utils/api'
import Toast, { type ToastState } from '../../components/ui/Toast'
import { Users, CalendarCheck2, CalendarX2, Clock, CalendarRange, RefreshCw, Download, Cpu, Printer } from 'lucide-react'
import { fmt12 } from '../../utils/timeFormat'
import SearchableSelect from '../../components/common/SearchableSelect'

type Attendance = { id?: string; staffId: string; date: string; shiftId?: string; status: 'present'|'absent'|'leave'; clockIn?: string; clockOut?: string; notes?: string }
type Staff = { id: string; name: string; position?: string; phone?: string; shiftId?: string; biometricEnrollId?: string }

type Shift = { id: string; name: string; start?: string; end?: string; lateThreshold?: number }

function today(){ return new Date().toISOString().slice(0,10) }

export default function Hospital_StaffAttendance(){
  const [date, setDate] = useState<string>(today())
  const [shiftId, setShiftId] = useState<string>('')
  const [limit, setLimit] = useState<number>(10)
  const [page, setPage] = useState<number>(1)
  const [selectedStaffId, setSelectedStaffId] = useState<string>('')
  const [selectedStatus, setSelectedStatus] = useState<string>('')
  const [sortDir, setSortDir] = useState<'asc'|'desc'>('asc')

  const [lastSyncFinishedAt, setLastSyncFinishedAt] = useState<string>('')
  const [syncing, setSyncing] = useState<boolean>(false)

  const [staff, setStaff] = useState<Staff[]>([])
  const [shifts, setShifts] = useState<Shift[]>([])
  const [att, setAtt] = useState<Attendance[]>([])
  const [toast, setToast] = useState<ToastState>(null)

  useEffect(() => {
    let mounted = true
    ;(async () => {
      try {
        const [staffRes, shiftRes] = await Promise.all([
          (hospitalApi as any).listStaff(),
          (hospitalApi as any).listShifts(),
        ])
        if (!mounted) return
        const rawStaff: any[] = (staffRes?.staff || staffRes?.items || staffRes || [])
        const list = rawStaff.map((x:any)=>({ 
          id: x._id, 
          name: x.name, 
          position: x.position || x.role || '', 
          phone: x.phone, 
          shiftId: x.shiftId,
          biometricEnrollId: x.biometric?.enrollId || x.biometricEnrollId || ''
        }))
        setStaff(list)
        const rawShifts: any[] = (shiftRes?.items || shiftRes?.shifts || shiftRes || [])
        setShifts(rawShifts.map((x:any)=>({ id: x._id, name: x.name, start: x.start, end: x.end, lateThreshold: Number(x.lateThreshold||0) })))
      } catch (e) { console.error(e) }
    })()
    return ()=>{ mounted = false }
  }, [])

  useEffect(() => {
    let mounted = true
    ;(async () => {
      try {
        const res = await hospitalApi.listAttendance({ date, shiftId: shiftId || undefined, page: 1, limit: 500 })
        if (!mounted) return
        setAtt((res.items||[]).map((x:any)=>({ id: x._id || `${x.staffId}-${x.date}-${x.shiftId||''}`, staffId: x.staffId, date: x.date, shiftId: x.shiftId, status: x.status, clockIn: x.clockIn, clockOut: x.clockOut, notes: x.notes })))
      } catch (e) { console.error(e) }
    })()
    return ()=>{ mounted = false }
  }, [date, shiftId])

  useEffect(() => {
    let mounted = true
    let t: any = null
    const check = async () => {
      try {
        const s: any = await (hospitalApi as any).biometricStatus?.()
        if (!mounted) return
        const finishedAt = String(s?.finishedAt || '')
        const running = !!s?.running
        if (!running && finishedAt && finishedAt !== lastSyncFinishedAt) {
          setLastSyncFinishedAt(finishedAt)
          try {
            const res = await hospitalApi.listAttendance({ date, shiftId: shiftId || undefined, page: 1, limit: 500 })
            if (!mounted) return
            setAtt((res.items||[]).map((x:any)=>({ id: x._id || `${x.staffId}-${x.date}-${x.shiftId||''}`, staffId: x.staffId, date: x.date, shiftId: x.shiftId, status: x.status, clockIn: x.clockIn, clockOut: x.clockOut, notes: x.notes })))
          } catch {}
        }
      } catch {}
    }
    check().catch(() => {})
    t = setInterval(() => { check().catch(() => {}) }, 5000)
    return () => { mounted = false; try { clearInterval(t) } catch {} }
  }, [date, shiftId, lastSyncFinishedAt])

  const getStaffStatus = (s: Staff) => {
    const rec = att.find(a=> a.staffId===s.id && a.date===date && (s.shiftId ? (a.shiftId||'')===s.shiftId : true)) || att.find(a=> a.staffId===s.id && a.date===date) || null
    if (!rec) return 'absent'
    if (rec.status === 'leave') return 'leave'
    if (rec.status === 'absent') return 'absent'
    
    if (rec.clockIn) {
      const sh = shifts.find(sh => sh.id === (rec.shiftId || s.shiftId))
      if (sh?.start) {
        const [h, m] = sh.start.split(':').map(Number)
        const startMin = (h || 0) * 60 + (m || 0) + (sh.lateThreshold || 0)
        const [ih, im] = rec.clockIn.split(':').map(Number)
        const inMin = (ih || 0) * 60 + (im || 0)
        if (inMin > startMin) return 'late'
      }
      return 'present'
    }
    return 'absent'
  }

  const filteredStaff = useMemo(() => {
    const list = staff.filter(s => {
      const matchesStaff = selectedStaffId ? s.id === selectedStaffId : true
      const matchesStatus = selectedStatus ? getStaffStatus(s) === selectedStatus : true
      return matchesStaff && matchesStatus
    })

    // Sort by Biometric Enroll ID
    return list.sort((a, b) => {
      const aid = Number(a.biometricEnrollId || 999999)
      const bid = Number(b.biometricEnrollId || 999999)
      return sortDir === 'asc' ? aid - bid : bid - aid
    })
  }, [staff, selectedStaffId, selectedStatus, att, date, shifts, sortDir])

  const staffRows = useMemo(() => {
    if (limit === -1) return filteredStaff
    return filteredStaff.slice((page - 1) * limit, page * limit)
  }, [filteredStaff, page, limit])

  const total = filteredStaff.length
  const totalPages = limit === -1 ? 1 : Math.max(1, Math.ceil(total / limit))

  const presentCount = useMemo(() => att.filter(a => a.date === date && a.status === 'present').length, [att, date])
  const absentCount = useMemo(() => att.filter(a => a.date === date && a.status === 'absent').length, [att, date])
  const leaveCount = useMemo(() => att.filter(a => a.date === date && a.status === 'leave').length, [att, date])
  const lateCount = useMemo(() => {
    let c = 0
    for (const a of att) {
      if (a.date !== date || a.status !== 'present' || !a.clockIn) continue
      const s = staff.find(st => st.id === a.staffId)
      const sh = shifts.find(sh => sh.id === (a.shiftId || s?.shiftId))
      if (!sh?.start) continue
      const [h, m] = sh.start.split(':').map(Number)
      const startMin = (h || 0) * 60 + (m || 0) + (sh.lateThreshold || 0)
      const [ih, im] = a.clockIn.split(':').map(Number)
      const inMin = (ih || 0) * 60 + (im || 0)
      if (inMin > startMin) c++
    }
    return c
  }, [att, date, staff, shifts])

  const shiftName = (id?: string)=> id ? (shifts.find(s=>s.id===id)?.name || '—') : '—'

  const exportCsv = () => {
    const rows = [['Date','Shift','Staff','Position','Phone','Clock In','Clock Out','Status']]
    filteredStaff.forEach(s => {
      const rec = att.find(a=> a.staffId===s.id && a.date===date && (s.shiftId ? (a.shiftId||'')===s.shiftId : true)) || att.find(a=> a.staffId===s.id && a.date===date) || null
      const status = getStaffStatus(s)
      rows.push([date, shiftName(s.shiftId), s.name, s.position||'', s.phone||'', rec?.clockIn ? fmt12(rec.clockIn) : '', rec?.clockOut ? fmt12(rec.clockOut) : '', status])
    })
    const csv = rows.map(r=> r.map(x=> `"${String(x).replace(/"/g,'""')}"`).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `attendance_${date}.csv`; a.click(); URL.revokeObjectURL(a.href)
  }

  const printAttendance = () => {
    const win = window.open('', '_blank')
    if (!win) return
    const html = `
      <html>
        <head>
          <title>Attendance Report - ${date}</title>
          <style>
            body { font-family: sans-serif; padding: 20px; color: #333; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th, td { border: 1px solid #ddd; padding: 10px; text-align: left; font-size: 12px; }
            th { bg-color: #f5f5f5; font-weight: bold; }
            h2 { margin-bottom: 5px; }
            .meta { font-size: 14px; color: #666; margin-bottom: 20px; }
            .status { text-transform: capitalize; font-weight: bold; }
            @media print { .no-print { display: none; } }
          </style>
        </head>
        <body>
          <h2>Staff Attendance Report</h2>
          <div class="meta">Date: ${date} | Total Records: ${filteredStaff.length}</div>
          <table>
            <thead>
              <tr>
                <th>Staff</th>
                <th>Position</th>
                <th>Shift</th>
                <th>Clock In</th>
                <th>Clock Out</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              ${filteredStaff.map(s => {
                const rec = att.find(a=> a.staffId===s.id && a.date===date && (s.shiftId ? (a.shiftId||'')===s.shiftId : true)) || att.find(a=> a.staffId===s.id && a.date===date) || null
                const status = getStaffStatus(s)
                return `
                  <tr>
                    <td>${s.name}</td>
                    <td>${s.position || '—'}</td>
                    <td>${shiftName(s.shiftId)}</td>
                    <td>${rec?.clockIn ? fmt12(rec.clockIn) : '—'}</td>
                    <td>${rec?.clockOut ? fmt12(rec.clockOut) : '—'}</td>
                    <td class="status">${status}</td>
                  </tr>
                `
              }).join('')}
            </tbody>
          </table>
          <script>window.print();</script>
        </body>
      </html>
    `
    win.document.write(html)
    win.document.close()
  }

  function nowTime(){ const d=new Date(); return `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}` }
  const quickClockRow = async (s: Staff, type: 'in'|'out') => {
    const rec = att.find(a=> a.staffId===s.id && (s.shiftId ? (a.shiftId||'')===s.shiftId : true) && a.date===date) || att.find(a=> a.staffId===s.id && a.date===date)
    if (type==='in' && rec?.clockIn) return
    if (type==='out' && rec?.clockOut) return
    const payload: any = { staffId: s.id, date, shiftId: s.shiftId || undefined, status: 'present' }
    if (type==='in') payload.clockIn = nowTime(); else payload.clockOut = nowTime()
    const saved: any = await hospitalApi.upsertAttendance(payload)
    const doc: any = saved?.doc || saved?.attendance || saved
    const normalized: Attendance = {
      id: String(doc?._id || `${payload.staffId}-${payload.date}-${payload.shiftId||''}`),
      staffId: String(doc?.staffId || payload.staffId),
      date: String(doc?.date || payload.date),
      shiftId: doc?.shiftId || payload.shiftId,
      status: (doc?.status || payload.status) as any,
      clockIn: doc?.clockIn || payload.clockIn,
      clockOut: doc?.clockOut || payload.clockOut,
      notes: doc?.notes,
    }
    setAtt(prev => {
      const idx = prev.findIndex(a => a.staffId === normalized.staffId && a.date === normalized.date && String(a.shiftId||'') === String(normalized.shiftId||''))
      if (idx >= 0) {
        const copy = prev.slice()
        copy[idx] = { ...copy[idx], ...normalized }
        return copy
      }
      return [normalized, ...prev]
    })
  }

  const fetchFromMachine = async () => {
    try {
      setSyncing(true)
      // Try backend first; if it can't reach the device, try local fetcher
      try {
        await (hospitalApi as any).fetchBiometricNow?.()
      } catch (backendErr: any) {
        const msg = String(backendErr?.message || '').toLowerCase()
        if (msg.includes('unreachable') || msg.includes('biometric is disabled') || msg.includes('econnrefused') || msg.includes('503') || msg.includes('not set')) {
          console.log('[biometric] Backend cannot reach device, trying local fetcher...')
          try {
            await (hospitalApi as any).fetchBiometricViaLocal()
            const res = await hospitalApi.listAttendance({ date, shiftId: shiftId || undefined, page: 1, limit: 500 })
            setAtt((res.items||[]).map((x:any)=>({ id: x._id || `${x.staffId}-${x.date}-${x.shiftId||''}`, staffId: x.staffId, date: x.date, shiftId: x.shiftId, status: x.status, clockIn: x.clockIn, clockOut: x.clockOut, notes: x.notes })))
            setToast({ type: 'success', message: 'Synced via local fetcher' })
            return
          } catch (localErr: any) {
            throw new Error('Device unreachable from server and local fetcher not running')
          }
        }
        throw backendErr
      }
      const startedAt = Date.now()
      while (Date.now() - startedAt < 60000) {
        try {
          const s: any = await (hospitalApi as any).biometricStatus?.()
          if (!s?.running) break
        } catch {}
        await new Promise(r => setTimeout(r, 1500))
      }
      const res = await hospitalApi.listAttendance({ date, shiftId: shiftId || undefined, page: 1, limit: 500 })
      setAtt((res.items||[]).map((x:any)=>({ id: x._id || `${x.staffId}-${x.date}-${x.shiftId||''}`, staffId: x.staffId, date: x.date, shiftId: x.shiftId, status: x.status, clockIn: x.clockIn, clockOut: x.clockOut, notes: x.notes })))
    } catch (e: any) {
      setToast({ type: 'error', message: e?.message || 'Failed to fetch from machine' })
    } finally {
      setSyncing(false)
    }
  }

  const summaryCards = [
    { title: 'Total Staff', value: String(staff.length), icon: Users, tone: 'from-sky-500 to-sky-600', sub: 'On roster' },
    { title: 'Present', value: String(presentCount), icon: CalendarCheck2, tone: 'from-emerald-500 to-emerald-600', sub: `${staff.length ? Math.round((presentCount/Math.max(1,staff.length))*100) : 0}% today` },
    { title: 'Absent', value: String(absentCount), icon: CalendarX2, tone: 'from-rose-500 to-rose-600', sub: 'Not checked in' },
    { title: 'On Leave', value: String(leaveCount), icon: CalendarRange, tone: 'from-amber-500 to-amber-600', sub: 'Approved' },
    { title: 'Late', value: String(lateCount), icon: Clock, tone: 'from-indigo-500 to-indigo-600', sub: 'After shift start' },
  ]

  return (
    <div className="space-y-6 pb-8 bg-slate-50/50 dark:bg-slate-900/50 -m-6 p-6 min-h-screen">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-extrabold text-slate-900 dark:text-slate-100 tracking-tight">Staff Attendance</h2>
        <div className="flex items-center gap-2">
          <button
            onClick={fetchFromMachine}
            disabled={syncing}
            className={`btn flex items-center gap-2 ${syncing ? 'opacity-60 cursor-not-allowed' : ''} dark:bg-slate-800 dark:text-slate-200 dark:border-slate-700`}
            title="Sync biometric logs"
          >
            <Cpu className={`h-4 w-4 ${syncing ? 'animate-pulse' : ''}`} /> {syncing ? 'Syncing…' : 'Fetch from Machine'}
          </button>
          <button onClick={()=>{ setPage(1); setDate(d => d) }} className="btn flex items-center gap-2 dark:bg-slate-800 dark:text-slate-200 dark:border-slate-700">
            <RefreshCw className="h-4 w-4" /> Refresh
          </button>
          <button onClick={exportCsv} className="btn flex items-center gap-2 dark:bg-slate-800 dark:text-slate-200 dark:border-slate-700">
            <Download className="h-4 w-4" /> Export CSV
          </button>
          <button onClick={printAttendance} className="btn flex items-center gap-2 dark:bg-slate-800 dark:text-slate-200 dark:border-slate-700">
            <Printer className="h-4 w-4" /> Print
          </button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {summaryCards.map(({ title, value, icon: Icon, tone, sub }) => (
          <div key={title} className={`group relative overflow-hidden rounded-xl p-3.5 shadow-sm transition-all hover:shadow-md hover:-translate-y-0.5 bg-gradient-to-br ${tone}`}>
            <div className="absolute -right-3 -bottom-3 h-16 w-16 rounded-full bg-white/10" />
            <div className="relative flex items-center justify-between gap-2">
              <div className="min-w-0">
                <div className="text-[9px] font-bold uppercase tracking-widest text-white/70 truncate">{title}</div>
                <div className="mt-1 text-xl font-extrabold text-white tabular-nums">{value}</div>
                <div className="mt-0.5 text-[9px] font-medium text-white/60 truncate">{sub}</div>
              </div>
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/20 text-white">
                <Icon className="h-4 w-4" />
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-6 shadow-sm">
        <div className="grid gap-6 md:grid-cols-4">
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Date</label>
            <input type="date" value={date} onChange={e=>setDate(e.target.value)} className="w-full bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-sky-500 transition-all h-11 px-4 text-slate-900 dark:text-slate-100" />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Shift</label>
            <select value={shiftId} onChange={e=>setShiftId(e.target.value)} className="w-full bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-sky-500 transition-all h-11 px-4 appearance-none text-slate-900 dark:text-slate-100">
              <option value="">All Shifts</option>
              {shifts.map(s=> (<option key={s.id} value={s.id}>{s.name}</option>))}
            </select>
          </div>
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Staff Member</label>
            <SearchableSelect
              value={selectedStaffId}
              onChange={setSelectedStaffId}
              options={[{ value: '', label: 'All Staff' }, ...staff.map(s => ({ value: s.id, label: s.name }))]}
              placeholder="Search staff..."
              className="h-11"
            />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Status</label>
            <select value={selectedStatus} onChange={e=>setSelectedStatus(e.target.value)} className="w-full bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-sky-500 transition-all h-11 px-4 appearance-none text-slate-900 dark:text-slate-100">
              <option value="">All Statuses</option>
              <option value="present">Present</option>
              <option value="absent">Absent</option>
              <option value="leave">Leave</option>
              <option value="late">Late</option>
            </select>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between">
          <h3 className="font-bold text-slate-900 dark:text-slate-100">Attendance Records</h3>
          <select value={limit} onChange={e=>{ setLimit(parseInt(e.target.value)); setPage(1) }} className="bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 rounded-lg text-sm font-medium focus:ring-2 focus:ring-sky-500 h-9 px-3 text-slate-900 dark:text-slate-100">
            <option value={10}>10 / page</option>
            <option value={25}>25 / page</option>
            <option value={50}>50 / page</option>
            <option value={100}>100 / page</option>
            <option value={-1}>All</option>
          </select>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead>
              <tr className="bg-slate-50/80 dark:bg-slate-900/50">
                <th 
                  className="px-6 py-3.5 text-[11px] font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400 cursor-pointer hover:text-sky-600 transition-colors"
                  onClick={() => setSortDir(prev => prev === 'asc' ? 'desc' : 'asc')}
                >
                  <div className="flex items-center gap-1">
                    ID {sortDir === 'asc' ? '↑' : '↓'}
                  </div>
                </th>
                <th className="px-6 py-3.5 text-[11px] font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400">Staff</th>
                <th className="px-6 py-3.5 text-[11px] font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400">Position</th>
                <th className="px-6 py-3.5 text-[11px] font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400">Phone</th>
                <th className="px-6 py-3.5 text-[11px] font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400">Shift</th>
                <th className="px-6 py-3.5 text-[11px] font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400">Clock In</th>
                <th className="px-6 py-3.5 text-[11px] font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400">Clock Out</th>
                <th className="px-6 py-3.5 text-[11px] font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400">Status</th>
                <th className="px-6 py-3.5 text-[11px] font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
              {staffRows.map(s => {
                const rec = att.find(a=> a.staffId===s.id && a.date===date && (s.shiftId ? (a.shiftId||'')===s.shiftId : true)) || att.find(a=> a.staffId===s.id && a.date===date) || null
                const canClockIn = !(rec && rec.clockIn)
                const canClockOut = !(rec && rec.clockOut)
                const status = getStaffStatus(s)
                const statusColor: Record<string,string> = { 
                  present: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400', 
                  absent: 'bg-rose-100 text-rose-700 dark:bg-rose-500/10 dark:text-rose-400', 
                  leave: 'bg-amber-100 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400',
                  late: 'bg-orange-100 text-orange-700 dark:bg-orange-500/10 dark:text-orange-400'
                }
                return (
                  <tr key={s.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/50 transition">
                    <td className="px-6 py-3 font-mono text-slate-700 dark:text-slate-300">{s.biometricEnrollId || '—'}</td>
                    <td className="px-6 py-3 font-medium text-slate-900 dark:text-slate-100">{s.name}</td>
                    <td className="px-6 py-3 text-slate-600 dark:text-slate-400">{s.position || '—'}</td>
                    <td className="px-6 py-3 text-slate-600 dark:text-slate-400">{s.phone || '—'}</td>
                    <td className="px-6 py-3 text-slate-600 dark:text-slate-400">{shiftName(s.shiftId)}</td>
                    <td className="px-6 py-3 font-mono text-slate-700 dark:text-slate-300">{rec?.clockIn ? fmt12(rec.clockIn) : '—'}</td>
                    <td className="px-6 py-3 font-mono text-slate-700 dark:text-slate-300">{rec?.clockOut ? fmt12(rec.clockOut) : '—'}</td>
                    <td className="px-6 py-3">
                      <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-bold ${statusColor[status] || 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-400'}`}>{status.charAt(0).toUpperCase() + status.slice(1)}</span>
                    </td>
                    <td className="px-6 py-3">
                      <div className="flex items-center gap-2">
                        <button disabled={!canClockIn} onClick={()=>quickClockRow(s,'in')} className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${canClockIn? 'bg-sky-50 text-sky-700 hover:bg-sky-100 border border-sky-200 dark:bg-sky-500/10 dark:text-sky-400 dark:border-sky-500/20' : 'bg-slate-50 text-slate-400 cursor-not-allowed border border-slate-100 dark:bg-slate-900 dark:text-slate-600 dark:border-slate-800'}`}>Clock In</button>
                        <button disabled={!canClockOut} onClick={()=>quickClockRow(s,'out')} className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${canClockOut? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20' : 'bg-slate-50 text-slate-400 cursor-not-allowed border border-slate-100 dark:bg-slate-900 dark:text-slate-600 dark:border-slate-800'}`}>Clock Out</button>
                      </div>
                    </td>
                  </tr>
                )
              })}
              {staffRows.length === 0 && (
                <tr>
                  <td colSpan={9} className="px-6 py-16 text-center text-slate-400 dark:text-slate-500 font-medium">No staff records found</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="flex items-center justify-between border-t border-slate-100 dark:border-slate-700 px-6 py-3 text-sm text-slate-500 dark:text-slate-400">
          <div>
            {total > 0 ? (
              <>Showing {Math.min((page-1)*limit + 1, total)}–{Math.min((page-1)*limit + staffRows.length, total)} of {total}</>
            ) : 'No results'}
          </div>
          <div className="flex items-center gap-2">
            <button disabled={page<=1} onClick={()=>setPage(p=>Math.max(1,p-1))} className="rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-1.5 text-xs font-semibold hover:bg-slate-50 dark:hover:bg-slate-900 disabled:opacity-40 transition-all text-slate-700 dark:text-slate-300">Prev</button>
            <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Page {page} of {totalPages}</span>
            <button disabled={page>=totalPages} onClick={()=>setPage(p=>Math.min(totalPages,p+1))} className="rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-1.5 text-xs font-semibold hover:bg-slate-50 dark:hover:bg-slate-900 disabled:opacity-40 transition-all text-slate-700 dark:text-slate-300">Next</button>
          </div>
        </div>
      </div>
      <Toast toast={toast} onClose={()=>setToast(null)} />
    </div>
  )
}
