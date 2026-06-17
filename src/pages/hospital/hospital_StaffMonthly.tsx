import { useEffect, useMemo, useState } from 'react'
import { hospitalApi } from '../../utils/api'
import Hospital_StaffReportDialog from '../../components/hospital/hospital_StaffReportDialog'
import SearchableSelect from '../../components/common/SearchableSelect'
import { 
  Calendar, 
  User, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  XCircle, 
  LogOut, 
  Download, 
  FileText, 
  ClipboardList,
  TrendingDown,
  Timer
} from 'lucide-react'

type Staff = { id: string; name: string; position?: string; shiftId?: string; salary?: number }
type Attendance = { id?: string; staffId: string; date: string; shiftId?: string; status: 'present'|'absent'|'leave'; clockIn?: string; clockOut?: string; notes?: string }
type Shift = { id: string; name: string; start?: string; end?: string; lateThreshold?: number }

function toMinutes(hm?: string){ if(!hm) return 0; const [h,m] = (hm||'').split(':').map(n=>parseInt(n||'0')); return (h*60 + m) }
function fmtHours(min: number){ const h = Math.floor(min/60); const m = Math.round(min%60); return `${h}h ${m}m` }
function to12Hour(hm?: string){ if(!hm) return ''; const [h,m] = hm.split(':').map(n=>parseInt(n||'0')); const ampm = h >= 12 ? 'PM' : 'AM'; const h12 = h % 12 || 12; return `${h12}:${String(m).padStart(2,'0')} ${ampm}` }

export default function Hospital_StaffMonthly(){
  const [month, setMonth] = useState<string>(new Date().toISOString().slice(0,7))
  const [selectedStaffId, setSelectedStaffId] = useState<string>('')
  const [reportOpen, setReportOpen] = useState(false)
  const [showAllDays, setShowAllDays] = useState(false)

  const [staff, setStaff] = useState<Staff[]>([])
  const [att, setAtt] = useState<Attendance[]>([])
  const [shifts, setShifts] = useState<Shift[]>([])

  useEffect(()=>{
    let mounted = true
    ;(async () => {
      try {
        const [staffRes, shiftRes] = await Promise.all([
          hospitalApi.listStaff(),
          hospitalApi.listShifts().catch(()=>({items:[]}))
        ])
        if (!mounted) return
        const raw: any[] = (staffRes?.staff || staffRes?.items || staffRes || [])
        const list = raw.map((x:any)=>({ id: x._id, name: x.name, position: x.position || x.role, shiftId: x.shiftId, salary: x.salary }))
        setStaff(list)
        setShifts((shiftRes?.items||[]).map((x:any)=>({ id: x._id, name: x.name, start: x.start, end: x.end, lateThreshold: Number(x.lateThreshold||0) })))
        if (!selectedStaffId && list[0]) setSelectedStaffId(list[0].id)
      } catch (e) { console.error(e) }
    })()
    return ()=>{ mounted = false }
  }, [])

  useEffect(()=>{
    let mounted = true
    ;(async () => {
      try {
        const from = `${month}-01`
        const to = new Date(Number(month.slice(0,4)), Number(month.slice(5,7)), 0)
        const toStr = `${to.getFullYear()}-${String(month.slice(5,7)).padStart(2,'0')}-${String(to.getDate()).padStart(2,'0')}`
        const res = await hospitalApi.listAttendance({ from, to: toStr, staffId: selectedStaffId || undefined, limit: 1000 })
        if (!mounted) return
        const mapped = (res.items||[]).map((x:any)=>({ id: x._id || `${x.staffId}-${x.date}-${x.shiftId||''}`, staffId: String(x.staffId), date: x.date, shiftId: x.shiftId, status: x.status, clockIn: x.clockIn, clockOut: x.clockOut, notes: x.notes }))
        setAtt(mapped)
      } catch (e) { console.error(e) }
    })()
    return ()=>{ mounted = false }
  }, [month, selectedStaffId])

  const shiftById = useMemo(()=> Object.fromEntries(shifts.map(s => [s.id, s] as const)), [shifts])
  const shiftName = (id?: string) => {
    if (!id) return '—'
    const byId = shiftById[id]?.name
    if (byId) return byId
    const byName = shifts.find(s => String(s.name) === String(id))?.name
    return byName || String(id)
  }

  const days = useMemo(()=>{
    if (!selectedStaffId) return [] as Array<{ date:string; clockIn?:string; clockOut?:string; status:string; shiftId?:string }>
    const byDate: Record<string, { clockIn?:string; clockOut?:string; status:string; shiftId?:string }> = {}
    for (const a of att.filter(x=> String(x.staffId) === String(selectedStaffId))){
      const d = a.date
      if (!byDate[d]) byDate[d] = { status: a.status, clockIn: a.clockIn, clockOut: a.clockOut, shiftId: a.shiftId }
      else {
        const cur = byDate[d]
        if (a.clockIn && (!cur.clockIn || a.clockIn < cur.clockIn)) cur.clockIn = a.clockIn
        if (a.clockOut && (!cur.clockOut || a.clockOut > cur.clockOut)) cur.clockOut = a.clockOut
        if (a.status==='present') cur.status = 'present'
        if (a.shiftId) cur.shiftId = a.shiftId
      }
    }
    const [y,m] = month.split('-').map(n=>parseInt(n||'0'))
    const maxDayInMonth = new Date(y, m, 0).getDate()
    const now = new Date()
    const isCurrentMonth = y === now.getFullYear() && m === (now.getMonth() + 1)
    const totalDays = isCurrentMonth ? now.getDate() : maxDayInMonth
    let list: Array<{ date:string; clockIn?:string; clockOut?:string; status:string; shiftId?:string }>
    if (showAllDays){
      list = []
      for (let d=1; d<=totalDays; d++){
        const date = `${month}-${String(d).padStart(2,'0')}`
        const rec = byDate[date]
        list.push({ date, clockIn: rec?.clockIn, clockOut: rec?.clockOut, status: rec?.status || (rec ? 'present' : 'absent'), shiftId: rec?.shiftId })
      }
    } else {
      list = Object.entries(byDate)
        .map(([date,v])=> ({ date, clockIn: v.clockIn, clockOut: v.clockOut, status: v.status || 'present', shiftId: v.shiftId }))
    }
    list.sort((a,b)=> (a.date < b.date ? -1 : a.date > b.date ? 1 : 0))
    return list
  }, [att, selectedStaffId, month, showAllDays])

  const selectedStaff = useMemo(()=> staff.find(s=>s.id===selectedStaffId) || null, [staff, selectedStaffId])

  const summary = useMemo(() => {
    const counts = { present: 0, late: 0, earlyOut: 0, leave: 0, absent: 0 }
    days.forEach(d => {
      if (d.status === 'present') {
        counts.present++
        const shift = shifts.find(s => s.id === (d.shiftId || selectedStaff?.shiftId))
        if (shift?.start && d.clockIn && toMinutes(d.clockIn) > toMinutes(shift.start) + (shift.lateThreshold || 0)) counts.late++
        if (shift?.end && d.clockOut && toMinutes(d.clockOut) < toMinutes(shift.end)) counts.earlyOut++
      } else if (d.status === 'leave') counts.leave++
      else if (d.status === 'absent') counts.absent++
    })
    return counts
  }, [days, shifts, selectedStaff])

  // Removed unused saveQuick and nowTime functions

  const exportCsv = () => {
    const rowsCsv = [['Month','Staff','Date','Shift','Status','Clock In','Clock Out','Hours']]
    const [year, mon] = month.split('-').map(n=>parseInt(n||'0'))
    const totalDays = new Date(year, mon, 0).getDate()
    const byDate: Record<string, { clockIn?: string; clockOut?: string; status: string; shiftId?: string }> = {}
    for (const a of att.filter(x => String(x.staffId) === String(selectedStaffId))) {
      const d = a.date
      if (!byDate[d]) byDate[d] = { status: a.status, clockIn: a.clockIn, clockOut: a.clockOut, shiftId: a.shiftId }
      else {
        const cur = byDate[d]
        if (a.clockIn && (!cur.clockIn || a.clockIn < cur.clockIn)) cur.clockIn = a.clockIn
        if (a.clockOut && (!cur.clockOut || a.clockOut > cur.clockOut)) cur.clockOut = a.clockOut
        if (a.status === 'present') cur.status = 'present'
        if (a.shiftId) cur.shiftId = a.shiftId
      }
    }
    for (let d=1; d<=totalDays; d++){
      const date = `${month}-${String(d).padStart(2,'0')}`
      const rec = byDate[date]
      const status = rec?.status || 'absent'
      const shiftId = rec?.shiftId || selectedStaff?.shiftId
      const clockIn = rec?.clockIn
      const clockOut = rec?.clockOut
      const minutes = (status==='present' && clockIn && clockOut) ? Math.max(0, toMinutes(clockOut) - toMinutes(clockIn)) : 0
      rowsCsv.push([month, selectedStaff?.name||'', date, shiftName(shiftId), status, to12Hour(clockIn)||'', to12Hour(clockOut)||'', fmtHours(minutes)])
    }
    const csv = rowsCsv.map(r=> r.map(x=>`"${String(x).replace(/"/g,'""')}"`).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `hospital_monthly_${month}_${selectedStaff?.name||''}.csv`; a.click(); URL.revokeObjectURL(a.href)
  }

  const [exportingAll, setExportingAll] = useState(false)
  const [exportingPdf, setExportingPdf] = useState(false)

  const loadJsPDF = () => new Promise<any>((resolve, reject) => {
    const w: any = window as any
    if (w.jspdf && w.jspdf.jsPDF) return resolve(w.jspdf)
    const s = document.createElement('script')
    s.src = 'https://cdn.jsdelivr.net/npm/jspdf@2.5.1/dist/jspdf.umd.min.js'
    s.onload = () => resolve((window as any).jspdf)
    s.onerror = reject
    document.head.appendChild(s)
  })

  const exportAllStaffPdf = async () => {
    if (!staff.length) return
    setExportingPdf(true)
    try {
      const from = `${month}-01`
      const to = new Date(Number(month.slice(0,4)), Number(month.slice(5,7)), 0)
      const toStr = `${to.getFullYear()}-${String(month.slice(5,7)).padStart(2,'0')}-${String(to.getDate()).padStart(2,'0')}`
      const res = await hospitalApi.listAttendance({ from, to: toStr, limit: 10000 })
      const allAtt = (res.items||[]).map((x:any)=>({
        staffId: String(x.staffId), date: x.date, status: x.status, clockIn: x.clockIn, clockOut: x.clockOut, shiftId: x.shiftId
      }))
      const byStaffDate: Record<string, Record<string, { clockIn?:string; clockOut?:string; status:string; shiftId?:string }>> = {}
      for (const a of allAtt) {
        if (!byStaffDate[a.staffId]) byStaffDate[a.staffId] = {}
        const byDate = byStaffDate[a.staffId]
        if (!byDate[a.date]) byDate[a.date] = { status: a.status, clockIn: a.clockIn, clockOut: a.clockOut, shiftId: a.shiftId }
        else {
          const cur = byDate[a.date]
          if (a.clockIn && (!cur.clockIn || a.clockIn < cur.clockIn)) cur.clockIn = a.clockIn
          if (a.clockOut && (!cur.clockOut || a.clockOut > cur.clockOut)) cur.clockOut = a.clockOut
          if (a.status === 'present') cur.status = 'present'
          if (a.shiftId) cur.shiftId = a.shiftId
        }
      }
      const [year, mon] = month.split('-').map(n => parseInt(n || '0'))
      const totalDays = new Date(year, mon, 0).getDate()
      const jspdf = await loadJsPDF()
      const { jsPDF } = jspdf
      const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' })
      const margin = 10
      const pageW = doc.internal.pageSize.getWidth()
      const pageH = doc.internal.pageSize.getHeight()
      const shiftStartMinutes = (id?: string) => {
        const s = id ? shiftById[id] : undefined
        return s?.start ? toMinutes(String(s.start)) : undefined
      }
      const isLate = (shiftId: string | undefined, clockIn: string | undefined) => {
        if (!clockIn) return false
        const start = shiftStartMinutes(shiftId)
        if (start === undefined) return false
        return toMinutes(clockIn) > start + (shiftById[shiftId || '']?.lateThreshold || 0)
      }
      const cols = [
        { title: 'Staff', width: 36 }, { title: 'Date', width: 26 }, { title: 'Shift', width: 28 },
        { title: 'Status', width: 20 }, { title: 'Clock In', width: 22 }, { title: 'Clock Out', width: 22 }, { title: 'Hours', width: 18 },
      ] as const
      let yPos = margin + 10
      const drawHeader = (y0: number, isFirstPage: boolean) => {
        if (isFirstPage) {
          doc.setFont('times', 'normal'); doc.setFontSize(16); doc.text('Staff Monthly Report', margin, margin + 4)
          doc.setFontSize(10); doc.text(`Month: ${month}`, pageW - margin - 40, margin + 4)
          doc.setLineWidth(0.3); doc.line(margin, margin + 8, pageW - margin, margin + 8)
          y0 = margin + 14
        } else { y0 = margin }
        doc.setFontSize(10); doc.setLineWidth(0.2); let xx = margin
        for (const c of cols) { doc.setFont('times', 'bold'); doc.text(c.title, xx + 1, y0); xx += c.width }
        doc.line(margin, y0 + 2, pageW - margin, y0 + 2)
        return y0 + 6
      }
      yPos = drawHeader(yPos, true)
      doc.setFont('times', 'normal'); doc.setFontSize(9)
      for (const s of staff) {
        const byDate = byStaffDate[s.id] || {}
        let presentCount = 0; let absentCount = 0; let lateCount = 0
        for (let d = 1; d <= totalDays; d++) {
          const date = `${month}-${String(d).padStart(2, '0')}`
          const rec = byDate[date]
          const status = rec?.status || 'absent'
          const shiftId = rec?.shiftId || s.shiftId
          const clockIn = rec?.clockIn; const clockOut = rec?.clockOut
          if (status === 'present') { presentCount += 1; if (isLate(shiftId, clockIn)) lateCount += 1 }
          else if (status === 'absent') { absentCount += 1 }
          if (yPos > pageH - margin - 15) { doc.addPage(); yPos = drawHeader(margin, false) }
          const minutes = (status === 'present' && clockIn && clockOut) ? Math.max(0, toMinutes(clockOut) - toMinutes(clockIn)) : 0
          const data = [s.name, date, shiftName(shiftId), status, to12Hour(clockIn) || '', to12Hour(clockOut) || '', fmtHours(minutes)]
          let xx = margin
          for (let i = 0; i < cols.length; i++) { doc.text(String(data[i] || ''), xx + 1, yPos); xx += cols[i].width }
          yPos += 5
        }
        if (yPos > pageH - margin - 15) { doc.addPage(); yPos = drawHeader(margin, false) }
        doc.setFont('times', 'bold'); doc.text(`Totals: Present ${presentCount} | Absent ${absentCount} | Late ${lateCount}`, margin + 1, yPos)
        doc.setFont('times', 'normal'); yPos += 10
      }
      doc.save(`hospital_all_staff_report_${month}.pdf`)
    } catch (e) { console.error('Export all staff PDF failed:', e) } finally { setExportingPdf(false) }
  }

  const exportAllStaffCsv = async () => {
    if (!staff.length) return
    setExportingAll(true)
    try {
      const from = `${month}-01`
      const to = new Date(Number(month.slice(0,4)), Number(month.slice(5,7)), 0)
      const toStr = `${to.getFullYear()}-${String(month.slice(5,7)).padStart(2,'0')}-${String(to.getDate()).padStart(2,'0')}`
      const res = await hospitalApi.listAttendance({ from, to: toStr, limit: 10000 })
      const allAtt = (res.items||[]).map((x:any)=>({
        staffId: String(x.staffId), date: x.date, status: x.status, clockIn: x.clockIn, clockOut: x.clockOut, shiftId: x.shiftId
      }))
      const byStaffDate: Record<string, Record<string, { clockIn?:string; clockOut?:string; status:string; shiftId?:string }>> = {}
      for (const a of allAtt) {
        if (!byStaffDate[a.staffId]) byStaffDate[a.staffId] = {}
        const byDate = byStaffDate[a.staffId]
        if (!byDate[a.date]) byDate[a.date] = { status: a.status, clockIn: a.clockIn, clockOut: a.clockOut, shiftId: a.shiftId }
        else {
          const cur = byDate[a.date]
          if (a.clockIn && (!cur.clockIn || a.clockIn < cur.clockIn)) cur.clockIn = a.clockIn
          if (a.clockOut && (!cur.clockOut || a.clockOut > cur.clockOut)) cur.clockOut = a.clockOut
          if (a.status === 'present') cur.status = 'present'
          if (a.shiftId) cur.shiftId = a.shiftId
        }
      }
      const [yearCsv, monCsv] = month.split('-').map(n => parseInt(n || '0'))
      const totalDays = new Date(yearCsv, monCsv, 0).getDate()
      const rowsCsv = [['Month','Staff','Date','Shift','Status','Clock In','Clock Out','Hours']]
      for (const s of staff) {
        const byDate = byStaffDate[s.id] || {}
        for (let d = 1; d <= totalDays; d++) {
          const date = `${month}-${String(d).padStart(2, '0')}`
          const rec = byDate[date]
          const status = rec?.status || 'absent'
          const shiftId = rec?.shiftId || s.shiftId
          const clockIn = rec?.clockIn; const clockOut = rec?.clockOut
          const minutes = (status === 'present' && clockIn && clockOut) ? Math.max(0, toMinutes(clockOut) - toMinutes(clockIn)) : 0
          rowsCsv.push([month, s.name, date, shiftName(shiftId), status, to12Hour(clockIn) || '', to12Hour(clockOut) || '', fmtHours(minutes)])
        }
      }
      const csv = rowsCsv.map(r => r.map(x => `"${String(x).replace(/"/g,'""')}"`).join(',')).join('\n')
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
      const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `hospital_monthly_all_staff_${month}.csv`; a.click(); URL.revokeObjectURL(a.href)
    } catch (e) { console.error('Export all staff failed:', e) } finally { setExportingAll(false) }
  }

  const getLateMinutes = (d: any) => {
    const shift = shifts.find(s => s.id === (d.shiftId || selectedStaff?.shiftId))
    if (!shift?.start || !d.clockIn) return 0
    const diff = toMinutes(d.clockIn) - (toMinutes(shift.start) + (shift.lateThreshold || 0))
    return diff > 0 ? diff : 0
  }

  const getEarlyOutMinutes = (d: any) => {
    const shift = shifts.find(s => s.id === (d.shiftId || selectedStaff?.shiftId))
    if (!shift?.end || !d.clockOut) return 0
    const diff = toMinutes(shift.end) - toMinutes(d.clockOut)
    return diff > 0 ? diff : 0
  }

  return (
    <div className="space-y-6 w-full min-h-screen bg-slate-50 dark:bg-slate-950 p-4 md:p-6 animate-in fade-in duration-500">
      {/* Header Banner */}
      <div className="rounded-2xl bg-emerald-500 p-6 text-white shadow-lg shadow-emerald-200/50">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-white/20 rounded-xl backdrop-blur-md">
            <ClipboardList className="h-8 w-8 text-white" />
          </div>
          <div>
            <h2 className="text-2xl font-bold">Monthly Report & Salary</h2>
            <p className="text-emerald-50 text-sm opacity-90">View attendance records and calculate monthly salary</p>
          </div>
          <div className="ml-auto flex items-center gap-3">
             <button onClick={exportAllStaffCsv} disabled={exportingAll} className="flex items-center gap-2 px-4 py-2 bg-white/20 hover:bg-white/30 rounded-xl text-sm font-bold backdrop-blur-md transition-all">
              <Download className="h-4 w-4" />
              {exportingAll ? 'Exporting...' : 'All CSV'}
            </button>
            <button onClick={exportAllStaffPdf} disabled={exportingPdf} className="flex items-center gap-2 px-4 py-2 bg-white/20 hover:bg-white/30 rounded-xl text-sm font-bold backdrop-blur-md transition-all">
              <Download className="h-4 w-4" />
              {exportingPdf ? 'Exporting...' : 'PDF Report'}
            </button>
            <button onClick={() => setReportOpen(true)} className="flex items-center gap-2 px-6 py-2 bg-white text-emerald-600 rounded-xl text-sm font-bold hover:bg-emerald-50 transition-all shadow-sm">
              <FileText className="h-4 w-4" />
              Staff Report
            </button>
          </div>
        </div>
      </div>

      {/* Filters Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 p-6 rounded-3xl shadow-sm">
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 font-bold text-xs uppercase tracking-wider ml-1">
            <User className="h-3.5 w-3.5" />
            Select Staff
          </div>
          <SearchableSelect
            value={selectedStaffId} 
            onChange={setSelectedStaffId} 
            options={staff.map(s => ({ value: s.id, label: `${s.name} - ${s.position || ''}` }))}
            className="w-full"
          />
        </div>
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 font-bold text-xs uppercase tracking-wider ml-1">
            <Calendar className="h-3.5 w-3.5" />
            Select Month
          </div>
          <input 
            type="month" 
            value={month} 
            onChange={e=>setMonth(e.target.value)} 
            className="w-full h-12 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 px-4 text-sm font-medium text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all cursor-pointer" 
          />
        </div>
      </div>

      {/* Summary Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {[
          { label: 'Present', count: summary.present, color: 'emerald', bg: 'bg-emerald-50/50 dark:bg-emerald-500/10', border: 'border-emerald-100 dark:border-emerald-500/20', text: 'text-emerald-600 dark:text-emerald-400', iconBg: 'bg-emerald-100 dark:bg-emerald-500/20', icon: CheckCircle2 },
          { label: 'Late', count: summary.late, color: 'amber', bg: 'bg-amber-50/50 dark:bg-amber-500/10', border: 'border-amber-100 dark:border-amber-500/20', text: 'text-amber-600 dark:text-amber-400', iconBg: 'bg-amber-100 dark:bg-amber-500/20', icon: AlertCircle },
          { label: 'Early Out', count: summary.earlyOut, color: 'orange', bg: 'bg-orange-50/50 dark:bg-orange-500/10', border: 'border-orange-100 dark:border-orange-500/20', text: 'text-orange-600 dark:text-orange-400', iconBg: 'bg-orange-100 dark:bg-orange-500/20', icon: TrendingDown },
          { label: 'Leave', count: summary.leave, color: 'blue', bg: 'bg-blue-50/50 dark:bg-blue-500/10', border: 'border-blue-100 dark:border-blue-500/20', text: 'text-blue-600 dark:text-blue-400', iconBg: 'bg-blue-100 dark:bg-blue-500/20', icon: LogOut },
          { label: 'Absent', count: summary.absent, color: 'rose', bg: 'bg-rose-50/50 dark:bg-rose-500/10', border: 'border-rose-100 dark:border-rose-500/20', text: 'text-rose-600 dark:text-rose-400', iconBg: 'bg-rose-100 dark:bg-rose-500/20', icon: XCircle },
        ].map((item, idx) => (
          <div key={idx} className={`rounded-3xl border ${item.border} ${item.bg} p-5 flex flex-col gap-2 transition-all hover:shadow-md hover:scale-[1.02]`}>
            <div className="flex items-center justify-between">
              <div className={`p-2 ${item.iconBg} rounded-xl`}>
                <item.icon className={`h-5 w-5 ${item.text}`} />
              </div>
              <span className={`text-xs font-bold ${item.text} uppercase tracking-tighter`}>{item.label}</span>
            </div>
            <div className={`text-4xl font-black ${item.text} leading-none mt-2`}>{item.count}</div>
          </div>
        ))}
      </div>

      {/* Attendance Records Table */}
      <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-100 dark:border-slate-700 shadow-sm overflow-hidden">
        <div className="px-6 py-5 border-b border-slate-50 dark:border-slate-700 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-2 w-2 rounded-full bg-emerald-500"></div>
            <h3 className="font-bold text-slate-800 dark:text-slate-100">Monthly Attendance Records ({days.length} days)</h3>
          </div>
          <div className="flex items-center gap-3">
             <label className="flex items-center gap-2 text-xs font-bold text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-900 px-3 py-1.5 rounded-full cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">
              <input type="checkbox" checked={showAllDays} onChange={e=>setShowAllDays(e.target.checked)} className="rounded border-slate-300 dark:border-slate-600 bg-transparent text-emerald-600 focus:ring-emerald-500" />
              Show all days
            </label>
            <button onClick={exportCsv} className="p-2 hover:bg-slate-50 dark:hover:bg-slate-900 rounded-xl transition-colors text-slate-400 hover:text-emerald-600" title="Download CSV">
              <Download className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-50/50 dark:bg-slate-900/50 text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 border-b border-slate-50 dark:border-slate-700">
              <tr>
                <th className="px-6 py-4">Date</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Check In</th>
                <th className="px-6 py-4">Check Out</th>
                <th className="px-6 py-4 text-orange-500 dark:text-orange-400">Late Minutes</th>
                <th className="px-6 py-4 text-blue-500 dark:text-blue-400">Early Out Minutes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 dark:divide-slate-700/50">
              {days.map(d => {
                const lateMin = getLateMinutes(d)
                const earlyOutMin = getEarlyOutMinutes(d)
                
                return (
                  <tr key={d.date} className="hover:bg-slate-50/30 dark:hover:bg-slate-900/30 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="font-bold text-slate-700 dark:text-slate-200">{new Date(d.date).toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                        <span className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-tighter">{new Date(d.date).toLocaleDateString(undefined, { weekday: 'long' })}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                        d.status === 'present' ? 'bg-emerald-100 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400' : 
                        d.status === 'leave' ? 'bg-blue-100 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400' : 
                        'bg-rose-100 dark:bg-rose-500/10 text-rose-700 dark:text-rose-400'
                      }`}>
                        {d.status === 'present' ? <CheckCircle2 className="h-3 w-3" /> : d.status === 'leave' ? <LogOut className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
                        {d.status}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <Clock className={`h-3.5 w-3.5 ${d.clockIn ? 'text-emerald-500' : 'text-slate-300 dark:text-slate-600'}`} />
                        <span className={`font-bold text-sm ${d.clockIn ? 'text-slate-700 dark:text-slate-200' : 'text-slate-300 dark:text-slate-600 italic font-medium'}`}>{to12Hour(d.clockIn) || 'Not yet'}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <Clock className={`h-3.5 w-3.5 ${d.clockOut ? 'text-emerald-500' : 'text-slate-300 dark:text-slate-600'}`} />
                        <span className={`font-bold text-sm ${d.clockOut ? 'text-slate-700 dark:text-slate-200' : 'text-slate-300 dark:text-slate-600 italic font-medium'}`}>{to12Hour(d.clockOut) || 'Not yet'}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {lateMin > 0 ? (
                        <div className="flex items-center gap-1 text-orange-600 dark:text-orange-400 font-bold text-sm">
                          <Timer className="h-3.5 w-3.5" />
                          {lateMin} min
                        </div>
                      ) : (
                        <span className="text-slate-200 dark:text-slate-700 text-sm">—</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                       {earlyOutMin > 0 ? (
                        <div className="flex items-center gap-1 text-blue-600 dark:text-blue-400 font-bold text-sm">
                          <TrendingDown className="h-3.5 w-3.5" />
                          {earlyOutMin} min
                        </div>
                      ) : (
                        <span className="text-slate-200 dark:text-slate-700 text-sm">—</span>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          
          {days.length === 0 && (
            <div className="flex flex-col items-center justify-center py-20 bg-slate-50/30 dark:bg-slate-900/30">
              <div className="p-4 bg-white dark:bg-slate-800 rounded-2xl shadow-sm mb-4 border border-slate-100 dark:border-slate-700">
                <ClipboardList className="h-10 w-10 text-slate-300 dark:text-slate-600" />
              </div>
              <h4 className="text-lg font-bold text-slate-800 dark:text-slate-200">No records for this month</h4>
              <p className="text-slate-500 dark:text-slate-400 text-sm">Attendance data will appear here once recorded.</p>
            </div>
          )}
        </div>
      </div>

      <Hospital_StaffReportDialog 
        open={reportOpen} 
        onClose={()=>setReportOpen(false)} 
        staffList={staff as any} 
        initialMonth={month} 
        initialStaffId={selectedStaffId || undefined} 
      />
    </div>
  )
}

