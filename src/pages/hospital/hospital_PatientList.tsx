import { useEffect, useMemo, useState } from 'react'
import { hospitalApi } from '../../utils/api'
import { useNavigate, useLocation } from 'react-router-dom'
import Toast, { type ToastState } from '../../components/ui/Toast'
import { getLocalDate } from '../../utils/date'
import { User, ArrowRightLeft, LogOut, Wallet, Clock, Users, Activity, FileDown, Printer } from 'lucide-react'
import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'

type BedLocation = {
  floor: string
  type: 'room' | 'ward'
  location: string
  bed: string
}

type BedOption = {
  _id: string
  label: string
  floorName?: string
  locationName?: string
  locationType?: 'room' | 'ward'
}

type Row = {
  id: string
  mrn: string
  name: string
  guardianName?: string
  doctor: string
  bed: string
  bedLocation?: BedLocation
  admitted: string
  status: 'admitted'|'discharged'
  admissionNo?: string
  tokenNo?: string
  encounterId?: string
}

function formatDate(s?: string) {
  if (!s) return '-'
  const d = new Date(s)
  return d.toLocaleDateString()
}

function getPatientProfileBasePath(pathname: string) {
  return pathname.startsWith('/doctor') ? '/doctor/patient' : '/hospital/patient'
}

export default function Hospital_PatientList() {
  const navigate = useNavigate()
  const location = useLocation()
  const patientProfileBase = getPatientProfileBasePath(location.pathname)
  const [q, setQ] = useState('')
  const [rowsPerPage, setRowsPerPage] = useState(20)
  const [rows, setRows] = useState<Row[]>([])
  const [loading, setLoading] = useState(false)
  const [toast, setToast] = useState<ToastState>(null)
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [lastUpdatedAt, setLastUpdatedAt] = useState<string>('—')
  const [ipdAdvance, setIpdAdvance] = useState<number>(0)
  const [ipdPending, setIpdPending] = useState<number>(0)
  const [rowBilling, setRowBilling] = useState<Map<string, { advance: number; pending: number }>>(new Map())

  useEffect(()=>{ load() }, [from, to])
  async function load(){
    setLoading(true)
    try {
      const res = await hospitalApi.listIPDAdmissions({ status: 'admitted', from, to, limit: 200 }) as any
      const items: Row[] = (res.admissions || []).map((e: any)=>({
        id: String(e._id),
        mrn: e.patientId?.mrn || '-',
        name: e.patientId?.fullName || '-',
        guardianName: e.patientId?.guardianName || e.patientId?.fatherName || '-',
        doctor: e.doctorId?.name || '-',
        bed: e.bedLabel || e.bedId || '-',
        bedLocation: e.bedLocation,
        admitted: e.startAt,
        status: e.status,
        admissionNo: e.admissionNo,
        tokenNo: (e.tokenId as any)?.tokenNo,
        encounterId: String(e._id),
      }))
      setRows(items)
      setLastUpdatedAt(new Date().toLocaleString())
      // Load per-row billing summaries
      const newBilling = new Map<string, { advance: number; pending: number }>()
      await Promise.all(
        items
          .filter(r => r.encounterId)
          .map(async r => {
            try {
              const res: any = await hospitalApi.ipdBillingSummary(String(r.encounterId))
              const totals = res?.totals || {}
              newBilling.set(r.id, {
                advance: Number(totals?.unallocatedAdvance || 0),
                pending: Number(totals?.netOutstanding || totals?.pending || 0),
              })
            } catch {}
          })
      )
      setRowBilling(newBilling)
      let totalUnallocated = 0
      let totalPending = 0
      for (const v of newBilling.values()) {
        totalUnallocated += v.advance || 0
        totalPending += v.pending || 0
      }
      setIpdAdvance(totalUnallocated)
      setIpdPending(totalPending)
    } finally { setLoading(false) }
  }

  const filtered = useMemo(() => {
    const query = q.toLowerCase()
    return rows.filter(p => {
      const hay = `${p.name} ${p.mrn} ${p.bed} ${p.doctor} ${p.guardianName}`.toLowerCase()
      return hay.includes(query)
    })
  }, [q, rows])

  const kpis = useMemo(() => {
    const admitted = rows.filter(r => r.status === 'admitted').length
    const discharged = rows.filter(r => r.status === 'discharged').length
    return { admitted, discharged, total: rows.length }
  }, [rows])


  // Transfer bed modal state
  const [transferOpen, setTransferOpen] = useState(false)
  const [transferEncounterId, setTransferEncounterId] = useState<string | null>(null)
  const [bedsAvail, setBedsAvail] = useState<Array<BedOption>>([])
  const [newBedId, setNewBedId] = useState('')

  // Discharge confirmation modal state
  const [dischargeOpen, setDischargeOpen] = useState(false)
  const [dischargeId, setDischargeId] = useState<string | null>(null)
  const [dischargeName, setDischargeName] = useState<string>('')
  const [dischargeBedLocation, setDischargeBedLocation] = useState<BedLocation | undefined>()
  const [dischargeSummary, setDischargeSummary] = useState('')
  const [dischargeError, setDischargeError] = useState('')
  const [dischargeBilling, setDischargeBilling] = useState<{ pending: number; advance: number } | null>(null)

  async function openDischargeConfirm(id: string, name: string, bedLoc?: BedLocation) {
    setDischargeId(id)
    setDischargeName(name)
    setDischargeBedLocation(bedLoc)
    setDischargeSummary('')
    setDischargeError('')
    setDischargeBilling(null)
    setDischargeOpen(true)
    // Pre-load billing summary
    try {
      const res: any = await hospitalApi.ipdBillingSummary(id)
      const totals = res?.totals || {}
      setDischargeBilling({
        pending: Number(totals?.netOutstanding || totals?.pending || 0),
        advance: Number(totals?.unallocatedAdvance || 0),
      })
    } catch {}
  }

  function formatBedLocation(bedLoc?: BedLocation) {
    if (!bedLoc) return '-'
    return `${bedLoc.floor} / ${bedLoc.location} / Bed: ${bedLoc.bed}`
  }

  function formatBedOptionLabel(bed: BedOption) {
    const location = bed.locationName || '-'
    const floor = bed.floorName || '-'
    return `${floor} / ${location} / Bed: ${bed.label}`
  }

  async function confirmDischarge() {
    if (!dischargeId) return
    setDischargeError('')
    try {
      await hospitalApi.dischargeIPD(dischargeId, { dischargeSummary: dischargeSummary.trim() || undefined })
      setDischargeOpen(false)
      await load()
      setToast({ type: 'success', message: 'Patient discharged successfully' })
    } catch (e: any) {
      const errMsg = e?.message || e?.error || 'Failed to discharge'
      setDischargeError(errMsg)
    }
  }

  async function openTransfer(id: string){
    setTransferEncounterId(id)
    setNewBedId('')
    setTransferOpen(true)
    try {
      const res = await hospitalApi.listBeds({ status: 'available' }) as any
      setBedsAvail(res.beds || [])
    } catch {}
  }

  async function submitTransfer(e: React.FormEvent){
    e.preventDefault()
    if (!transferEncounterId || !newBedId) return
    try {
      await hospitalApi.transferIPDBed(transferEncounterId, { newBedId })
      setTransferOpen(false)
      setTransferEncounterId(null)
      await load()
    } catch (err: any){
      setToast({ type: 'error', message: err?.message || 'Failed to transfer bed' })
    }
  }

  const handleExportPdf = () => {
    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' })
    const nowStr = new Date().toLocaleString()

    // Title
    doc.setFontSize(18)
    doc.setTextColor(37, 99, 235)
    doc.text('IPD Patient List Summary', 14, 18)

    doc.setFontSize(10)
    doc.setTextColor(100, 100, 100)
    doc.text(`Generated: ${nowStr}`, 14, 26)

    // KPIs as a compact table
    const kpiRows = [
      ['Total Patients', String(kpis.total), 'Admitted', String(kpis.admitted)],
      ['Advance Available', `Rs ${Number(ipdAdvance || 0).toLocaleString()}`, 'Pending Payments', `Rs ${Number(ipdPending || 0).toLocaleString()}`],
    ]

    autoTable(doc, {
      startY: 32,
      head: [['Metric', 'Value', 'Metric', 'Value']],
      body: kpiRows,
      theme: 'grid',
      headStyles: { fillColor: [37, 99, 235], textColor: 255, fontStyle: 'bold' },
      styles: { fontSize: 10, cellPadding: 3 },
      columnStyles: {
        0: { fontStyle: 'bold', fillColor: [245, 245, 245] },
        2: { fontStyle: 'bold', fillColor: [245, 245, 245] },
      },
    })

    const finalY = (doc as any).lastAutoTable?.finalY || 50

    // Patient queue table
    const tableHead = [['Token', 'MRN', 'Patient', 'Guardian', 'Doctor', 'Bed', 'Admitted', 'Admission#', 'Advance', 'Pending', 'Status']]
    const tableBody = filtered.slice(0, rowsPerPage).map(p => [
      p.tokenNo || '-',
      p.mrn,
      p.name,
      p.guardianName || '-',
      p.doctor,
      formatBedLocation(p.bedLocation),
      formatDate(p.admitted),
      p.admissionNo || '-',
      `Rs ${(rowBilling.get(p.id)?.advance || 0).toLocaleString()}`,
      `Rs ${(rowBilling.get(p.id)?.pending || 0).toLocaleString()}`,
      p.status === 'admitted' ? 'Admitted' : 'Discharged',
    ])

    autoTable(doc, {
      startY: finalY + 6,
      head: tableHead,
      body: tableBody,
      theme: 'striped',
      headStyles: { fillColor: [37, 99, 235], textColor: 255, fontStyle: 'bold' },
      styles: { fontSize: 9, cellPadding: 2 },
      alternateRowStyles: { fillColor: [248, 250, 252] },
    })

    doc.save(`ipd-patient-list-${new Date().toISOString().slice(0,10)}.pdf`)
  }

  const handlePrint = () => {
    const nowStr = new Date().toLocaleString()
    const printContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>IPD Patient List Summary</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 20px; color: #1e293b; }
          h1 { color: #2563eb; margin-bottom: 5px; }
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
          .status-admitted { background: #dbeafe; color: #1d4ed8; font-weight: bold; padding: 2px 6px; border-radius: 4px; }
          .status-discharged { background: #f1f5f9; color: #64748b; font-weight: bold; padding: 2px 6px; border-radius: 4px; }
          @media print { body { padding: 0; } }
        </style>
      </head>
      <body>
        <h1>IPD Patient List Summary</h1>
        <div class="timestamp">Generated: ${nowStr}</div>

        <h2>Key Metrics</h2>
        <div class="kpi-grid">
          <div class="kpi-card"><div class="kpi-label">Total Patients</div><div class="kpi-value">${kpis.total}</div></div>
          <div class="kpi-card"><div class="kpi-label">Admitted</div><div class="kpi-value">${kpis.admitted}</div></div>
          <div class="kpi-card"><div class="kpi-label">Advance Available</div><div class="kpi-value">Rs ${Number(ipdAdvance || 0).toLocaleString()}</div></div>
          <div class="kpi-card"><div class="kpi-label">Pending Payments</div><div class="kpi-value">Rs ${Number(ipdPending || 0).toLocaleString()}</div></div>
        </div>

        <h2>Patient Queue (${filtered.length} records)</h2>
        <table>
          <thead>
            <tr>
              <th>Token</th><th>MRN</th><th>Patient</th><th>Guardian</th><th>Doctor</th><th>Bed</th><th>Admitted</th><th>Admission#</th><th>Advance</th><th>Pending</th><th>Status</th>
            </tr>
          </thead>
          <tbody>
            ${filtered.slice(0, rowsPerPage).map(p => `
              <tr>
                <td>${p.tokenNo || '-'}</td>
                <td>${p.mrn}</td>
                <td>${p.name}</td>
                <td>${p.guardianName || '-'}</td>
                <td>${p.doctor}</td>
                <td>${formatBedLocation(p.bedLocation)}</td>
                <td>${formatDate(p.admitted)}</td>
                <td>${p.admissionNo || '-'}</td>
                <td>Rs ${(rowBilling.get(p.id)?.advance || 0).toLocaleString()}</td>
                <td>Rs ${(rowBilling.get(p.id)?.pending || 0).toLocaleString()}</td>
                <td><span class="status-${p.status}">${p.status === 'admitted' ? 'Admitted' : 'Discharged'}</span></td>
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
    <div className="space-y-4">
      <div className="rounded-2xl bg-linear-to-r from-blue-600 via-indigo-500 to-violet-500 p-5 text-white shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="text-lg font-extrabold">IPD Patient List</div>
            <div className="mt-1 text-xs/relaxed text-white/90">Inpatient admissions, bed management & billing overview.</div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => { setFrom(getLocalDate()); setTo(getLocalDate()) }} disabled={loading} className="inline-flex items-center gap-2 rounded-lg bg-white/15 px-3 py-2 text-sm font-semibold hover:bg-white/20 disabled:opacity-50">
              <Activity className="h-4 w-4" /> Today
            </button>
            <button onClick={load} disabled={loading} className="inline-flex items-center gap-2 rounded-lg bg-white/15 px-3 py-2 text-sm font-semibold hover:bg-white/20 disabled:opacity-50">
              <Activity className="h-4 w-4" /> {loading ? 'Loading...' : 'Refresh'}
            </button>
            <button onClick={handleExportPdf} className="inline-flex items-center gap-2 rounded-lg bg-white/15 px-3 py-2 text-sm font-semibold hover:bg-white/20">
              <FileDown className="h-4 w-4" /> Export PDF
            </button>
            <button onClick={handlePrint} className="inline-flex items-center gap-2 rounded-lg bg-white/15 px-3 py-2 text-sm font-semibold hover:bg-white/20">
              <Printer className="h-4 w-4" /> Print Summary
            </button>
          </div>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-slate-200 bg-white p-3">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">Total Patients</div>
              <div className="text-lg font-extrabold text-slate-900">{kpis.total}</div>
            </div>
            <div className="rounded-lg bg-violet-50 p-2 text-violet-600"><Users className="h-4 w-4" /></div>
          </div>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-3">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">Admitted</div>
              <div className="text-lg font-extrabold text-slate-900">{kpis.admitted}</div>
            </div>
            <div className="rounded-lg bg-sky-50 p-2 text-sky-600"><Activity className="h-4 w-4" /></div>
          </div>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-3">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">Advance Available</div>
              <div className="text-lg font-extrabold text-slate-900">Rs {Number(ipdAdvance || 0).toLocaleString()}</div>
            </div>
            <div className="rounded-lg bg-indigo-50 p-2 text-indigo-600"><Wallet className="h-4 w-4" /></div>
          </div>
          {loading && <div className="mt-2 text-xs text-slate-400">Loading…</div>}
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-3">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">Pending Payments</div>
              <div className="text-lg font-extrabold text-slate-900">Rs {Number(ipdPending || 0).toLocaleString()}</div>
            </div>
            <div className="rounded-lg bg-amber-50 p-2 text-amber-700"><Clock className="h-4 w-4" /></div>
          </div>
          {loading && <div className="mt-2 text-xs text-slate-400">Loading…</div>}
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
            <div className="flex gap-2">
              <button
                onClick={() => { setFrom(getLocalDate()); setTo(getLocalDate()) }}
                className="rounded-md bg-sky-600 px-4 py-2 text-sm font-medium text-white hover:bg-sky-700"
              >
                Today
              </button>
              <button
                onClick={() => { setFrom(''); setTo('') }}
                className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Reset
              </button>
            </div>
            <input
              value={q}
              onChange={e=>setQ(e.target.value)}
              placeholder="Search by name, MRN, or bed"
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-200"
            />
            <select value={rowsPerPage} onChange={e=>setRowsPerPage(parseInt(e.target.value))} className="rounded-md border border-slate-300 px-2 py-2 text-sm text-slate-700">
              <option value={20}>20 rows</option>
              <option value={50}>50 rows</option>
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
                <th className="px-4 py-3 text-[13px] font-extrabold uppercase tracking-wider text-left">Token #</th>
                <th className="px-4 py-3 text-[13px] font-extrabold uppercase tracking-wider text-left">MRN</th>
                <th className="px-4 py-3 text-[13px] font-extrabold uppercase tracking-wider text-left">Patient</th>
                <th className="px-4 py-3 text-[13px] font-extrabold uppercase tracking-wider text-left">Guardian Name</th>
                <th className="px-4 py-3 text-[13px] font-extrabold uppercase tracking-wider text-left">Doctor</th>
                <th className="px-4 py-3 text-[13px] font-extrabold uppercase tracking-wider text-left">Bed</th>
                <th className="px-4 py-3 text-[13px] font-extrabold uppercase tracking-wider text-left">Admitted</th>
                <th className="px-4 py-3 text-[13px] font-extrabold uppercase tracking-wider text-left">Admission #</th>
                <th className="px-4 py-3 text-[13px] font-extrabold uppercase tracking-wider text-left">Advance</th>
                <th className="px-4 py-3 text-[13px] font-extrabold uppercase tracking-wider text-left">Pending</th>
                <th className="px-4 py-3 text-[13px] font-extrabold uppercase tracking-wider text-left">Status</th>
                <th className="px-4 py-3 text-[13px] font-extrabold uppercase tracking-wider text-left">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-slate-700">
              {loading && (
                <tr><td colSpan={12} className="px-4 py-6 text-center text-slate-500">Loading...</td></tr>
              )}
              {!loading && filtered.slice(0, rowsPerPage).map((p) => (
                <tr key={p.id} className="hover:bg-slate-50/50">
                  <td className="px-4 py-2 font-mono text-xs">{p.tokenNo || '-'}</td>
                  <td className="px-4 py-2">{p.mrn}</td>
                  <td className="px-4 py-2 capitalize">{p.name}</td>
                  <td className="px-4 py-2 capitalize">{p.guardianName || '-'}</td>
                  <td className="px-4 py-2">{p.doctor}</td>
                  <td className="px-4 py-2">{formatBedLocation(p.bedLocation)}</td>
                  <td className="px-4 py-2">{formatDate(p.admitted)}</td>
                  <td className="px-4 py-2 font-mono text-xs">{p.admissionNo || '-'}</td>
                  <td className="px-4 py-2">
                    <div className="text-xs font-medium text-indigo-700">Rs{(rowBilling.get(p.id)?.advance || 0).toLocaleString()}</div>
                  </td>
                  <td className="px-4 py-2">
                    <div className="text-xs font-medium text-rose-700">Rs{(rowBilling.get(p.id)?.pending || 0).toLocaleString()}</div>
                  </td>
                  <td className="px-4 py-2"><span className="rounded-full bg-navy px-2 py-1 text-xs text-white">{p.status === 'admitted' ? 'Admitted' : 'Discharged'}</span></td>
                  <td className="px-4 py-2">
                    {p.status === 'admitted' ? (
                      <div className="flex items-center gap-2">
                        <button
                          onClick={()=>navigate(`${patientProfileBase}/${p.id}`)}
                          className="inline-flex items-center rounded-md border border-slate-300 bg-white p-2 text-slate-700 hover:bg-slate-50"
                          title="View Profile"
                        >
                          <User className="h-4 w-4" />
                        </button>
                        <button
                          onClick={()=>openTransfer(p.id)}
                          className="inline-flex items-center rounded-md border border-indigo-300 bg-indigo-50 p-2 text-indigo-700 hover:bg-indigo-100"
                          title="Transfer Bed"
                        >
                          <ArrowRightLeft className="h-4 w-4" />
                        </button>
                        <button
                          onClick={()=>openDischargeConfirm(p.id, p.name, p.bedLocation)}
                          className="inline-flex items-center rounded-md border border-rose-300 bg-rose-50 p-2 text-rose-700 hover:bg-rose-100"
                          title="Discharge"
                        >
                          <LogOut className="h-4 w-4" />
                        </button>
                      </div>
                    ) : (
                      <span className="text-xs text-slate-500">—</span>
                    )}
                  </td>
                </tr>
              ))}
              {!loading && filtered.length === 0 && (
                <tr>
                  <td colSpan={12} className="px-4 py-12 text-center text-slate-500">No patients</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
      {transferOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <form onSubmit={submitTransfer} className="w-full max-w-md rounded-lg bg-white p-4 shadow">
            <div className="text-base font-semibold text-slate-800">Transfer Bed</div>
            <div className="mt-3">
              <div className="mb-1 text-sm text-slate-700">Select new bed</div>
              <select value={newBedId} onChange={e=>setNewBedId(e.target.value)} className="w-full rounded-md border border-slate-300 px-3 py-2">
                <option value="">Select available bed</option>
                {bedsAvail.map(b => <option key={b._id} value={b._id}>{formatBedOptionLabel(b)}</option>)}
              </select>
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <button type="button" onClick={()=>setTransferOpen(false)} className="rounded-md border border-slate-300 px-3 py-1.5 text-sm">Cancel</button>
              <button type="submit" disabled={!newBedId} className="rounded-md bg-violet-700 px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50">Transfer</button>
            </div>
          </form>
        </div>
      )}
      {dischargeOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-xl bg-white p-5 shadow-lg">
            <div className="text-base font-semibold text-slate-800">Confirm Discharge</div>
            <div className="mt-2 text-sm text-slate-600">
              Are you sure you want to discharge <span className="font-medium text-slate-800 capitalize">{dischargeName}</span>?
            </div>
            <div className="mt-3 rounded-lg bg-slate-50 p-3 text-sm border border-slate-100">
              <div className="text-slate-500 text-[10px] font-bold uppercase tracking-wider mb-1">Current Bed</div>
              <div className="font-medium text-slate-700">{formatBedLocation(dischargeBedLocation)}</div>
            </div>
            {dischargeBilling && (dischargeBilling.pending > 0 || dischargeBilling.advance > 0) && (
              <div className={`mt-3 rounded-lg p-3 text-sm border ${dischargeBilling.pending > 0 ? 'bg-rose-50 border-rose-100' : 'bg-amber-50 border-amber-100'}`}>
                <div className={`text-[10px] font-bold uppercase tracking-wider mb-1 ${dischargeBilling.pending > 0 ? 'text-rose-600' : 'text-amber-600'}`}>Billing Alert</div>
                {dischargeBilling.pending > 0 && (
                  <div className="text-rose-700 font-medium">Pending: Rs {dischargeBilling.pending.toLocaleString()}</div>
                )}
                {dischargeBilling.advance > 0 && (
                  <div className="text-amber-700 font-medium">Unallocated Advance: Rs {dischargeBilling.advance.toLocaleString()}</div>
                )}
                <div className="text-xs mt-1 text-slate-500">Discharge may be blocked until billing is settled.</div>
              </div>
            )}
            <div className="mt-3">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1 block">Discharge Summary (optional)</label>
              <textarea
                value={dischargeSummary}
                onChange={e => setDischargeSummary(e.target.value)}
                placeholder="Enter discharge summary…"
                rows={3}
                className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700 focus:border-sky-400 focus:bg-white focus:ring-2 focus:ring-sky-400/20 outline-none transition-all resize-none"
              />
            </div>
            {dischargeError && (
              <div className="mt-3 rounded-lg bg-rose-50 border border-rose-100 p-3 text-sm text-rose-700">
                <span className="font-semibold">Error:</span> {dischargeError}
              </div>
            )}
            <div className="mt-4 flex justify-end gap-2">
              <button type="button" onClick={()=>setDischargeOpen(false)} className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 transition-all">Cancel</button>
              <button onClick={confirmDischarge} disabled={!!dischargeBilling && dischargeBilling.pending > 0} className="rounded-lg bg-rose-600 px-4 py-2 text-sm font-medium text-white hover:bg-rose-700 transition-all disabled:opacity-40 disabled:cursor-not-allowed">Discharge</button>
            </div>
          </div>
        </div>
      )}
      <Toast toast={toast} onClose={()=>setToast(null)} />
    </div>
  )
}
