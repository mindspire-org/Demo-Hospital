import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { Activity, RefreshCw, Wallet, Clock, Users, AlertTriangle, FileDown, Printer } from 'lucide-react'
import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'

import { hospitalApi } from '../../utils/api'
import { fmt12 } from '../../utils/timeFormat'
import { getLocalDate } from '../../utils/date'
import Store_ConfirmDialog from '../../components/hospital/Store_ConfirmDialog'
import Toast, { type ToastState } from '../../components/ui/Toast'

type EmergencyStatus = 'active' | 'admitted' | 'discharged'

type BedLocation = {
  floor: string
  type: 'room' | 'ward'
  location: string
  bed: string
}

type EmergencyRow = {
  id: string
  tokenNo: string
  time: string
  mrn: string
  patientName: string
  age?: string
  gender?: string
  phone?: string
  doctor?: string
  status: EmergencyStatus
  triage?: 'red'|'yellow'|'green'
  arrivalMode?: string
  encounterId?: string
  bedLabel?: string
  bedLocation?: BedLocation
  createdAtMs?: number
}

function Badge({ tone, children }: { tone: 'slate'|'amber'|'emerald'|'rose'|'violet'; children: React.ReactNode }){
  const map: Record<string,string> = {
    slate: 'bg-slate-100 text-slate-700 border-slate-200',
    amber: 'bg-amber-50 text-amber-700 border-amber-200',
    emerald: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    rose: 'bg-rose-50 text-rose-700 border-rose-200',
    violet: 'bg-violet-50 text-violet-700 border-violet-200',
  }
  return <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${map[tone]}`}>{children}</span>
}

export default function Hospital_EmergencyQueue(){
  const navigate = useNavigate()
  const location = useLocation()
  const basePath = location.pathname.startsWith('/doctor') ? '/doctor/emergency' : '/hospital/emergency'
  const [rows, setRows] = useState<EmergencyRow[]>([])
  const [loading, setLoading] = useState(false)
  const [loadingStats, setLoadingStats] = useState(false)
  const [q, setQ] = useState('')
  const [status, setStatus] = useState<'All'|EmergencyStatus>('All')
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [confirmRow, setConfirmRow] = useState<EmergencyRow | null>(null)
  const [toast, setToast] = useState<ToastState>(null)
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [erAdvance, setErAdvance] = useState<number>(0)
  const [erPending, setErPending] = useState<number>(0)
  const [lastUpdatedAt, setLastUpdatedAt] = useState<string>('—')
  const [rowBilling, setRowBilling] = useState<Map<string, { advance: number; pending: number }>>(new Map())

  useEffect(() => {
    let cancelled = false
    async function load(){
      setLoading(true)
      setLoadingStats(true)
      try{
        const deps: any = await hospitalApi.listDepartments({ limit: 1000 }) as any
        const list: any[] = deps?.departments || deps || []
        const er = list.find((d: any) => String(d?.name || '').trim().toLowerCase() === 'emergency')
        const departmentId = er?._id || er?.id
        if (!departmentId){
          if (!cancelled) setRows([])
          return
        }
        // Use encounters as source of truth (like IPD)
        const encRes: any = await hospitalApi.listEREncounters({ 
          status: 'in-progress', 
          departmentId: String(departmentId),
          from, 
          to, 
          limit: 500 
        })
        const encounters: any[] = encRes?.encounters || []
        const mapped: EmergencyRow[] = encounters.map((enc: any) => {
          const p = enc.patientId || {}
          const docName = enc.doctorId?.name || enc.doctorId?.fullName || ''
          const when = enc.startAt ? new Date(enc.startAt) : (enc.createdAt ? new Date(enc.createdAt) : null)
          const time = when ? fmt12(`${String(when.getHours()).padStart(2,'0')}:${String(when.getMinutes()).padStart(2,'0')}`) : ''
          const st: EmergencyStatus = enc.status === 'discharged' ? 'discharged' : (enc.status === 'admitted' ? 'admitted' : 'active')
          const token = enc.tokenId || {}
          return {
            id: String(enc._id),
            tokenNo: String(token.tokenNo || enc.tokenNo || ''),
            time,
            mrn: String(p.mrn || enc.mrn || ''),
            patientName: String(p.fullName || enc.patientName || ''),
            age: String(p.age || ''),
            gender: String(p.gender || ''),
            phone: String(p.phoneNormalized || p.phone || ''),
            doctor: docName ? String(docName) : undefined,
            status: st,
            triage: enc.triage || undefined,
            arrivalMode: enc.arrivalMode || undefined,
            encounterId: String(enc._id),
            bedLabel: enc.bedLabel || enc.erBedNumber || '-',
            bedLocation: enc.bedLocation || undefined,
            createdAtMs: when ? when.getTime() : undefined,
          }
        })
        if (!cancelled) {
          setRows(mapped)
          setLastUpdatedAt(new Date().toLocaleString())
          // Load per-row billing summaries
          const newBilling = new Map<string, { advance: number; pending: number }>()
          await Promise.all(
            mapped
              .filter(r => r.encounterId)
              .map(async r => {
                try {
                  const res: any = await hospitalApi.erBillingSummary(String(r.encounterId))
                  const totals = res?.totals || {}
                  newBilling.set(r.id, {
                    advance: Number(totals?.unallocatedAdvance || 0),
                    pending: Number(totals?.netOutstanding || totals?.pending || 0),
                  })
                } catch {}
              })
          )
          if (!cancelled) {
            setRowBilling(newBilling)
            // Aggregate actual unallocated advance + net outstanding from per-row data
            let totalUnallocated = 0
            let totalPending = 0
            for (const v of newBilling.values()) {
              totalUnallocated += v.advance || 0
              totalPending += v.pending || 0
            }
            setErAdvance(totalUnallocated)
            setErPending(totalPending)
          }
        }
      }catch{
        if (!cancelled) setRows([])
      }finally{
        if (!cancelled) setLoading(false)
        if (!cancelled) setLoadingStats(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [from, to])

  function formatBedLocation(bedLoc?: BedLocation) {
    if (!bedLoc) return '-'
    return `${bedLoc.floor} / ${bedLoc.location} / Bed: ${bedLoc.bed}`
  }

  const filtered = useMemo(()=>{
    const qq = q.trim().toLowerCase()
    return rows.filter(r => {
      if (status !== 'All' && r.status !== status) return false
      if (!qq) return true
      const hay = [r.tokenNo, r.mrn, r.patientName, r.phone, r.time, r.gender, r.status, r.triage, r.arrivalMode, formatBedLocation(r.bedLocation)].filter(Boolean).join(' ').toLowerCase()
      return hay.includes(qq)
    })
  }, [q, rows, status])

  const kpis = useMemo(() => {
    const active = rows.filter(r => r.status === 'active').length
    const admitted = rows.filter(r => r.status === 'admitted').length
    const discharged = rows.filter(r => r.status === 'discharged').length
    const red = rows.filter(r => r.triage === 'red').length
    const yellow = rows.filter(r => r.triage === 'yellow').length
    const green = rows.filter(r => r.triage === 'green').length
    return { active, admitted, discharged, red, yellow, green }
  }, [rows])

  const openChart = (r: EmergencyRow) => {
    navigate(`${basePath}/${encodeURIComponent(r.id)}`)
  }

  const handleDischarge = (r: EmergencyRow) => {
    setConfirmRow(r)
    setConfirmOpen(true)
  }

  const onConfirmDischarge = async () => {
    if (!confirmRow) return
    if (!confirmRow.encounterId) {
      setToast({ type: 'error', message: 'No encounter found for this token' })
      setConfirmOpen(false)
      setConfirmRow(null)
      return
    }
    setConfirmOpen(false)
    try {
      await hospitalApi.dischargeER(confirmRow.encounterId, { disposition: 'discharged' })
      setRows(prev => prev.map(row => row.id === confirmRow.id ? { ...row, status: 'discharged' } : row))
      setToast({ type: 'success', message: 'Patient discharged successfully' })
    } catch (e: any) {
      const errMsg = e?.message || e?.error || 'Failed to discharge'
      // Show billing block error with details
      setToast({ type: 'error', message: errMsg })
    } finally {
      setConfirmRow(null)
    }
  }

  const onCancelDischarge = () => {
    setConfirmOpen(false)
    setConfirmRow(null)
  }

  const triageTone = (t?: EmergencyRow['triage']) => {
    if (t === 'red') return 'rose'
    if (t === 'yellow') return 'amber'
    if (t === 'green') return 'emerald'
    return 'slate'
  }

  const statusTone = (s: EmergencyRow['status']) => {
    if (s === 'active') return 'violet'
    if (s === 'admitted') return 'amber'
    return 'emerald'
  }

  const handleExportPdf = () => {
    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' })
    const nowStr = new Date().toLocaleString()

    // Title
    doc.setFontSize(18)
    doc.setTextColor(220, 38, 38)
    doc.text('Emergency Department Summary', 14, 18)

    doc.setFontSize(10)
    doc.setTextColor(100, 100, 100)
    doc.text(`Generated: ${nowStr}`, 14, 26)

    // KPIs as a compact table
    const kpiRows = [
      ['Active', String(kpis.active), 'Admitted', String(kpis.admitted)],
      ['Discharged', String(kpis.discharged), 'Red Triage', String(kpis.red)],
      ['Yellow Triage', String(kpis.yellow), 'Green Triage', String(kpis.green)],
      ['Advance Available', `Rs ${Number(erAdvance || 0).toLocaleString()}`, 'Pending Payments', `Rs ${Number(erPending || 0).toLocaleString()}`],
    ]

    autoTable(doc, {
      startY: 32,
      head: [['Metric', 'Value', 'Metric', 'Value']],
      body: kpiRows,
      theme: 'grid',
      headStyles: { fillColor: [220, 38, 38], textColor: 255, fontStyle: 'bold' },
      styles: { fontSize: 10, cellPadding: 3 },
      columnStyles: {
        0: { fontStyle: 'bold', fillColor: [245, 245, 245] },
        2: { fontStyle: 'bold', fillColor: [245, 245, 245] },
      },
    })

    const finalY = (doc as any).lastAutoTable?.finalY || 50

    // Patient queue table
    const tableHead = [['Time', 'Token', 'MRN', 'Patient', 'Triage', 'Arrival', 'Bed', 'Advance', 'Pending', 'Status']]
    const tableBody = filtered.map(r => [
      r.time,
      r.tokenNo,
      r.mrn,
      r.patientName,
      String(r.triage || '—').toUpperCase(),
      r.arrivalMode || '—',
      formatBedLocation(r.bedLocation),
      `Rs ${(rowBilling.get(r.id)?.advance || 0).toLocaleString()}`,
      `Rs ${(rowBilling.get(r.id)?.pending || 0).toLocaleString()}`,
      r.status.toUpperCase(),
    ])

    autoTable(doc, {
      startY: finalY + 6,
      head: tableHead,
      body: tableBody,
      theme: 'striped',
      headStyles: { fillColor: [59, 130, 246], textColor: 255, fontStyle: 'bold' },
      styles: { fontSize: 9, cellPadding: 2 },
      alternateRowStyles: { fillColor: [248, 250, 252] },
    })

    doc.save(`emergency-queue-${new Date().toISOString().slice(0,10)}.pdf`)
  }

  const handlePrint = () => {
    const nowStr = new Date().toLocaleString()
    const printContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Emergency Department Summary</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 20px; color: #1e293b; }
          h1 { color: #dc2626; margin-bottom: 5px; }
          .timestamp { color: #64748b; font-size: 12px; margin-bottom: 20px; }
          h2 { color: #1e40af; border-bottom: 2px solid #3b82f6; padding-bottom: 5px; margin-top: 25px; }
          .kpi-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 20px; }
          .kpi-card { border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px; background: #f8fafc; }
          .kpi-label { font-size: 11px; color: #64748b; text-transform: uppercase; font-weight: bold; }
          .kpi-value { font-size: 20px; font-weight: bold; color: #0f172a; margin-top: 4px; }
          table { width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 12px; }
          th { background: #3b82f6; color: white; padding: 8px 6px; text-align: left; font-weight: bold; }
          td { padding: 6px; border-bottom: 1px solid #e2e8f0; }
          tr:nth-child(even) { background: #f8fafc; }
          .triage-red { background: #fef2f2; color: #dc2626; font-weight: bold; }
          .triage-yellow { background: #fffbeb; color: #d97706; font-weight: bold; }
          .triage-green { background: #f0fdf4; color: #16a34a; font-weight: bold; }
          @media print { body { padding: 0; } }
        </style>
      </head>
      <body>
        <h1>Emergency Department Summary</h1>
        <div class="timestamp">Generated: ${nowStr}</div>

        <h2>Key Metrics</h2>
        <div class="kpi-grid">
          <div class="kpi-card"><div class="kpi-label">Active</div><div class="kpi-value">${kpis.active}</div></div>
          <div class="kpi-card"><div class="kpi-label">Admitted</div><div class="kpi-value">${kpis.admitted}</div></div>
          <div class="kpi-card"><div class="kpi-label">Discharged</div><div class="kpi-value">${kpis.discharged}</div></div>
          <div class="kpi-card"><div class="kpi-label">Red Triage</div><div class="kpi-value">${kpis.red}</div></div>
          <div class="kpi-card"><div class="kpi-label">Yellow Triage</div><div class="kpi-value">${kpis.yellow}</div></div>
          <div class="kpi-card"><div class="kpi-label">Green Triage</div><div class="kpi-value">${kpis.green}</div></div>
          <div class="kpi-card"><div class="kpi-label">Advance Available</div><div class="kpi-value">Rs ${Number(erAdvance || 0).toLocaleString()}</div></div>
          <div class="kpi-card"><div class="kpi-label">Pending Payments</div><div class="kpi-value">Rs ${Number(erPending || 0).toLocaleString()}</div></div>
        </div>

        <h2>Patient Queue (${filtered.length} records)</h2>
        <table>
          <thead>
            <tr>
              <th>Time</th><th>Token</th><th>MRN</th><th>Patient</th><th>Triage</th><th>Arrival</th><th>Bed</th><th>Advance</th><th>Pending</th><th>Status</th>
            </tr>
          </thead>
          <tbody>
            ${filtered.map(r => `
              <tr>
                <td>${r.time}</td>
                <td>${r.tokenNo}</td>
                <td>${r.mrn}</td>
                <td>${r.patientName}</td>
                <td class="triage-${r.triage || 'none'}">${String(r.triage || '—').toUpperCase()}</td>
                <td>${r.arrivalMode || '—'}</td>
                <td>${formatBedLocation(r.bedLocation)}</td>
                <td>Rs ${(rowBilling.get(r.id)?.advance || 0).toLocaleString()}</td>
                <td>Rs ${(rowBilling.get(r.id)?.pending || 0).toLocaleString()}</td>
                <td>${r.status.toUpperCase()}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </body>
      </html>
    `

    const printWindow = window.open('', '_blank')
    if (printWindow) {
      printWindow.document.write(printContent)
      printWindow.document.close()
      printWindow.focus()
      setTimeout(() => printWindow.print(), 300)
    }
  }

  return (
    <div className="p-4 md:p-6 space-y-4 bg-slate-50/50 min-h-screen">
      <div className="rounded-2xl bg-gradient-to-r from-rose-600 via-orange-500 to-amber-500 p-5 text-white shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="text-lg font-extrabold">Emergency Department</div>
            <div className="mt-1 text-xs/relaxed text-white/90">Real-time patient queue, triage analytics & activity monitoring.</div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => { setFrom(getLocalDate()); setTo(getLocalDate()) }}
              className="inline-flex items-center gap-2 rounded-lg bg-white/15 px-3 py-2 text-sm font-semibold hover:bg-white/20"
            >
              <RefreshCw className="h-4 w-4" /> Today
            </button>
            <button
              onClick={() => { setFrom(''); setTo('') }}
              className="inline-flex items-center gap-2 rounded-lg bg-white/15 px-3 py-2 text-sm font-semibold hover:bg-white/20"
            >
              Reset
            </button>
            <button
              onClick={handleExportPdf}
              className="inline-flex items-center gap-2 rounded-lg bg-white/15 px-3 py-2 text-sm font-semibold hover:bg-white/20"
            >
              <FileDown className="h-4 w-4" /> Export PDF
            </button>
            <button
              onClick={handlePrint}
              className="inline-flex items-center gap-2 rounded-lg bg-white/15 px-3 py-2 text-sm font-semibold hover:bg-white/20"
            >
              <Printer className="h-4 w-4" /> Print Summary
            </button>
          </div>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-slate-200 bg-white p-3">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">Active</div>
              <div className="text-lg font-extrabold text-slate-900">{kpis.active}</div>
            </div>
            <div className="rounded-lg bg-violet-50 p-2 text-violet-600"><Activity className="h-4 w-4" /></div>
          </div>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-3">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">Admitted</div>
              <div className="text-lg font-extrabold text-slate-900">{kpis.admitted}</div>
            </div>
            <div className="rounded-lg bg-sky-50 p-2 text-sky-600"><Users className="h-4 w-4" /></div>
          </div>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-3">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">Discharged</div>
              <div className="text-lg font-extrabold text-slate-900">{kpis.discharged}</div>
            </div>
            <div className="rounded-lg bg-emerald-50 p-2 text-emerald-600"><Activity className="h-4 w-4" /></div>
          </div>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-3">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">Red</div>
              <div className="text-lg font-extrabold text-slate-900">{kpis.red}</div>
            </div>
            <div className="rounded-lg bg-rose-50 p-2 text-rose-600"><AlertTriangle className="h-4 w-4" /></div>
          </div>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-3">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">Yellow</div>
              <div className="text-lg font-extrabold text-slate-900">{kpis.yellow}</div>
            </div>
            <div className="rounded-lg bg-amber-50 p-2 text-amber-700"><AlertTriangle className="h-4 w-4" /></div>
          </div>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-3">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">Green</div>
              <div className="text-lg font-extrabold text-slate-900">{kpis.green}</div>
            </div>
            <div className="rounded-lg bg-emerald-50 p-2 text-emerald-700"><AlertTriangle className="h-4 w-4" /></div>
          </div>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-3">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">Advance Available</div>
              <div className="text-lg font-extrabold text-slate-900">Rs {Number(erAdvance || 0).toLocaleString()}</div>
            </div>
            <div className="rounded-lg bg-indigo-50 p-2 text-indigo-600"><Wallet className="h-4 w-4" /></div>
          </div>
          {loadingStats && <div className="mt-2 text-xs text-slate-400">Loading…</div>}
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-3">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">Pending Payments</div>
              <div className="text-lg font-extrabold text-slate-900">Rs {Number(erPending || 0).toLocaleString()}</div>
            </div>
            <div className="rounded-lg bg-amber-50 p-2 text-amber-700"><Clock className="h-4 w-4" /></div>
          </div>
          {loadingStats && <div className="mt-2 text-xs text-slate-400">Loading…</div>}
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-4 py-3">
          <div className="text-sm font-extrabold text-slate-800">Patient Queue</div>
          <div className="text-[11px] text-slate-500">
            <span className="font-semibold text-slate-700">{rows.length}</span> records
            <span className="mx-2 text-slate-300">|</span>
            <span className="font-semibold text-slate-700">{filtered.length}</span> results
          </div>
        </div>
        <div className="p-4">
          <div className="grid grid-cols-1 gap-2 md:grid-cols-5">
            <input
              type="date"
              value={from}
              onChange={e => setFrom(e.target.value)}
              className="rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-200"
            />
            <input
              type="date"
              value={to}
              onChange={e => setTo(e.target.value)}
              className="rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-200"
            />
            <input
              value={q}
              onChange={e=>setQ(e.target.value)}
              placeholder="Search by token#, MR#, patient, phone..."
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-200"
            />
            <select value={status} onChange={e=>setStatus(e.target.value as any)} className="rounded-md border border-slate-300 px-2 py-2 text-sm">
              <option value="All">All Status</option>
              <option value="active">Active</option>
              <option value="admitted">Admitted</option>
              <option value="discharged">Discharged</option>
            </select>
            <div className="flex flex-col items-end justify-center text-sm text-slate-600">
              <div>Rows: <span className="ml-1 font-semibold text-slate-800">{filtered.length}</span></div>
              <div className="text-[11px] text-slate-400">Updated: {lastUpdatedAt}</div>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-100/50 text-slate-700 border-b-2 border-slate-300">
              <tr>
                <th className="px-4 py-3 text-[13px] font-extrabold uppercase tracking-wider text-left">Time</th>
                <th className="px-4 py-3 text-[13px] font-extrabold uppercase tracking-wider text-left">Token</th>
                <th className="px-4 py-3 text-[13px] font-extrabold uppercase tracking-wider text-left">MRN</th>
                <th className="px-4 py-3 text-[13px] font-extrabold uppercase tracking-wider text-left">Patient</th>
                <th className="px-4 py-3 text-[13px] font-extrabold uppercase tracking-wider text-left">Triage</th>
                <th className="px-4 py-3 text-[13px] font-extrabold uppercase tracking-wider text-left">Arrival Mode</th>
                <th className="px-4 py-3 text-[13px] font-extrabold uppercase tracking-wider text-left">Bed</th>
                <th className="px-4 py-3 text-[13px] font-extrabold uppercase tracking-wider text-left">Advance</th>
                <th className="px-4 py-3 text-[13px] font-extrabold uppercase tracking-wider text-left">Pending</th>
                <th className="px-4 py-3 text-[13px] font-extrabold uppercase tracking-wider text-left">Status</th>
                <th className="px-4 py-3 text-[13px] font-extrabold uppercase tracking-wider text-left">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {loading && (
                <tr><td colSpan={11} className="px-4 py-8 text-center text-slate-500">Loading…</td></tr>
              )}
              {!loading && filtered.length === 0 && (
                <tr><td colSpan={11} className="px-4 py-10 text-center text-slate-400">0 records</td></tr>
              )}
              {filtered.map(r => (
                <tr key={r.id} className="hover:bg-slate-50">
                  <td className="px-4 py-2">{r.time}</td>
                  <td className="px-4 py-2 font-medium">{r.tokenNo}</td>
                  <td className="px-4 py-2">{r.mrn}</td>
                  <td className="px-4 py-2">{r.patientName}</td>
                  <td className="px-4 py-2">
                    <Badge tone={triageTone(r.triage) as any}>{String(r.triage || '—').toUpperCase()}</Badge>
                  </td>
                  <td className="px-4 py-2">{r.arrivalMode || '—'}</td>
                  <td className="px-4 py-2">{formatBedLocation(r.bedLocation)}</td>
                  <td className="px-4 py-2">
                    <div className="text-xs font-medium text-indigo-700">Rs{(rowBilling.get(r.id)?.advance || 0).toLocaleString()}</div>
                  </td>
                  <td className="px-4 py-2">
                    <div className="text-xs font-medium text-rose-700">Rs{(rowBilling.get(r.id)?.pending || 0).toLocaleString()}</div>
                  </td>
                  <td className="px-4 py-2">
                    <Badge tone={statusTone(r.status) as any}>{r.status.toUpperCase()}</Badge>
                  </td>
                  <td className="px-4 py-2">
                    <div className="flex gap-2">
                      <button onClick={()=>openChart(r)} className="rounded-md border border-slate-300 px-3 py-1.5 text-sm hover:bg-slate-50">Open</button>
                      {(r.status === 'active' || r.status === 'admitted') && (
                        <button onClick={()=>handleDischarge(r)} className="rounded-md bg-emerald-600 text-white px-3 py-1.5 text-sm hover:bg-emerald-700">Discharge</button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <Store_ConfirmDialog
        open={confirmOpen}
        title="Discharge Patient"
        message={confirmRow ? `Are you sure you want to discharge ${confirmRow.patientName}?` : ''}
        onCancel={onCancelDischarge}
        onConfirm={onConfirmDischarge}
        confirmText="Discharge"
        confirmStyle="primary"
      />
      <Toast toast={toast} onClose={() => setToast(null)} />
    </div>
  )
}
