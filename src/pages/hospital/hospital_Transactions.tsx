import { useEffect, useMemo, useState } from 'react'
import { hospitalApi } from '../../utils/api'
import { fmtDateTime12 } from '../../utils/timeFormat'
import { Download, Filter, Printer, RefreshCw } from 'lucide-react'

function ServicesCell({ services }: { services?: string }) {
  const [expanded, setExpanded] = useState(false)
  if (!services) return <span>-</span>
  const list = services.split(',').map(s => s.trim()).filter(Boolean)
  if (list.length <= 2) return <div className="text-xs wrap-break-word">{services}</div>

  const visible = expanded ? list : list.slice(0, 2)
  return (
    <div className="text-xs">
      <div className="wrap-break-word">
        {visible.join(', ')}
        {!expanded && '...'}
      </div>
      <button 
        onClick={() => setExpanded(!expanded)} 
        className="text-[10px] font-bold text-violet-600 hover:underline mt-0.5 uppercase tracking-tighter"
      >
        {expanded ? 'Show Less' : `Show All (${list.length})`}
      </button>
    </div>
  )
}

type Transaction = {
  id: string
  dateIso: string
  createdAt: string
  type: 'General' | 'Private' | 'Subsidized' | 'Other'
  refType: string
  refId: string
  memo: string
  fee?: number
  totalAmount: number
  discount?: number
  tokenDiscount?: number
  netAmount: number
  paymentMethod: 'cash' | 'bank' | 'other'
  patientName?: string
  mrn?: string
  doctorName?: string
  departmentName?: string
  serviceNames?: string
  tokenNo?: string
  isReturned?: boolean
  status: string
  createdByUsername?: string
}

function toCsv(rows: Transaction[]) {
  const headers = ['Date', 'Type', 'Patient', 'MRN', 'Doctor', 'Department', 'Services', 'Description', 'Token#', 'Fee', 'Discount', 'Net', 'Method', 'Status', 'Performed By']
  const body = rows.map(r => [
    r.dateIso,
    r.type,
    r.patientName || '',
    r.mrn || '',
    r.doctorName || '',
    r.departmentName || '',
    r.serviceNames || '',
    r.memo,
    r.tokenNo || '',
    r.fee || r.totalAmount || 0,
    r.tokenDiscount || r.discount || 0,
    r.netAmount || 0,
    r.paymentMethod || '',
    r.isReturned ? 'Returned' : r.status,
    r.createdByUsername || ''
  ])
  return [headers, ...body].map(arr => arr.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n')
}

export default function Hospital_Transactions() {
  const [from, setFrom] = useState(new Date().toISOString().split('T')[0])
  const [to, setTo] = useState(new Date().toISOString().split('T')[0])
  const [q, setQ] = useState('')
  const [ttype, setTtype] = useState<'All' | Transaction['type']>('All')
  const [method, setMethod] = useState<'all' | 'cash' | 'bank'>('all')
  const [rowsPerPage, setRowsPerPage] = useState<number | 'All'>(50)
  const [page, setPage] = useState(1)
  const [tick, setTick] = useState(0)

  const [selectedDoctorId, setSelectedDoctorId] = useState('')
  const [selectedDepartmentId, setSelectedDepartmentId] = useState('')
  const [selectedServiceName, setSelectedServiceName] = useState('')

  const [doctors, setDoctors] = useState<any[]>([])
  const [departments, setDepartments] = useState<any[]>([])
  const [services, setServices] = useState<any[]>([])

  const [all, setAll] = useState<Transaction[]>([])
  const [total, setTotal] = useState(0)
  const [totalPages, setTotalPages] = useState(1)
  const [summary, setSummary] = useState({ totalRevenue: 0, totalDiscount: 0, totalExpenses: 0, netIncome: 0 })
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    ;(async () => {
      try {
        const [docs, deps, svcs] = await Promise.all([
          hospitalApi.listDoctors({ active: true, limit: 1000 }),
          hospitalApi.listDepartments({ limit: 1000 }),
          hospitalApi.listErServices({ active: true, limit: 1000 })
        ])
        setDoctors(docs?.doctors || [])
        setDepartments(Array.isArray(deps) ? deps : (deps?.departments || []))
        setServices(svcs?.services || [])
      } catch (err) {
        console.error('Failed to load filter options:', err)
      }
    })()
  }, [])

  useEffect(() => {
    const now = new Date();
    // Use local time for initial date selection to avoid showing yesterday's date after midnight
    const localDate = new Date(now.getTime() - (now.getTimezoneOffset() * 60000)).toISOString().split('T')[0];
    setFrom(localDate);
    setTo(localDate);
  }, []);

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    ;(async () => {
      try {
        const params: any = { 
          page, 
          limit: rowsPerPage === 'All' ? 0 : rowsPerPage,
          type: ttype,
          method,
          q: q || undefined,
          doctorId: selectedDoctorId || undefined,
          departmentId: selectedDepartmentId || undefined,
          serviceName: selectedServiceName || undefined
        }
        if (from) params.from = from
        if (to) params.to = to
        
        const res: any = await hospitalApi.listTransactions(params)
        if (!cancelled) {
          setAll(res?.transactions || [])
          setTotal(res?.total || 0)
          setTotalPages(res?.totalPages || 1)
          setSummary(res?.summary || { totalRevenue: 0, totalDiscount: 0, totalExpenses: 0, netIncome: 0 })
        }
      } catch (err) {
        console.error('Failed to load transactions:', err)
        if (!cancelled) {
          setAll([])
          setTotal(0)
          setTotalPages(1)
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => { cancelled = true }
  }, [from, to, ttype, method, q, page, rowsPerPage, tick, selectedDoctorId, selectedDepartmentId, selectedServiceName])
  const filtered = useMemo(() => all, [all])

  const derivedStats = useMemo(() => {
    const methodTotals = { cash: 0, bank: 0, other: 0 }
    const serviceCounts: Record<string, number> = {}
    let totalNet = 0
    let totalDiscount = 0

    filtered.forEach((r) => {
      const net = Math.max(
        0,
        r.netAmount ?? (r.fee || r.totalAmount || 0) - (r.tokenDiscount || r.discount || 0)
      )
      const discount = r.tokenDiscount || r.discount || 0
      const method = (r.paymentMethod || 'other').toLowerCase()

      if (method.includes('cash')) methodTotals.cash += net
      else if (method.includes('bank')) methodTotals.bank += net
      else methodTotals.other += net

      totalNet += net
      totalDiscount += discount

      if (r.serviceNames) {
        r.serviceNames
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean)
          .forEach((name) => {
            serviceCounts[name] = (serviceCounts[name] || 0) + 1
          })
      }
    })

    const sortedServices = Object.entries(serviceCounts).sort((a, b) => b[1] - a[1])

    return {
      methodTotals,
      totalNet,
      totalDiscount,
      count: filtered.length,
      avgTicket: filtered.length ? totalNet / filtered.length : 0,
      topServices: sortedServices.slice(0, 3)
    }
  }, [filtered])

  const formatCurrency = (value: number) =>
    `Rs ${Number(value || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}`

  const dateLabel = useMemo(() => {
    if (!from && !to) return 'All Dates'
    if (from && to && from === to) return fmtDateTime12(`${from}T00:00:00`).split(' ')[0]
    if (from && to) return `${from} → ${to}`
    return from || to || 'All Dates'
  }, [from, to])

  const exportCsv = () => {
    const csv = toCsv(filtered)
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `transactions_${new Date().toISOString().slice(0,10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const printTransactions = () => {
    const dateRange = from || to ? `${from || to}${to ? ' to '+to : ''}` : new Date().toISOString().slice(0,10)
    const docName = selectedDoctorId ? (doctors.find(d=>d._id===selectedDoctorId)?.name || 'Selected Doctor') : 'All Doctors'
    const deptName = selectedDepartmentId ? (departments.find(d=>d._id===selectedDepartmentId)?.name || 'Selected Department') : 'All Departments'
    
    const rows = filtered.map(r => {
      const net = Math.max(0, (r.fee || r.totalAmount || 0) - (r.tokenDiscount || r.discount || 0))
      return `<tr>
        <td>${fmtDateTime12(r.createdAt || r.dateIso)}</td>
        <td>${r.type}</td>
        <td>${r.tokenNo || '-'}</td>
        <td>${r.patientName || '-'}<br/><small style="color:#666">${r.mrn || ''}</small></td>
        <td>${r.doctorName || '-'}</td>
        <td>${r.departmentName || '-'}</td>
        <td>${r.serviceNames || '-'}</td>
        <td class="r">${(r.fee || r.totalAmount || 0).toFixed(2)}</td>
        <td class="r">${(r.tokenDiscount || r.discount || 0).toFixed(2)}</td>
        <td class="r" style="font-weight:bold">${net.toFixed(2)}</td>
        <td>${r.paymentMethod || '-'}</td>
        <td>${r.isReturned ? 'Returned' : r.status}</td>
      </tr>`
    }).join('')

    const html = `<!DOCTYPE html><html><head><title>Transactions Report</title>
      <style>
        @page{size:A4 landscape;margin:10mm}
        body{font-family:Helvetica,Arial,sans-serif;font-size:9px;color:#000;margin:0;padding:10px}
        h2{text-align:center;font-size:16px;margin:0 0 4px}
        .sub{text-align:center;font-size:11px;margin:2px 0;color:#444}
        .sum-box{display:flex;justify-content:space-around;margin:15px 0;padding:10px;border:1px solid #ddd;background:#f9f9f9;border-radius:4px}
        .sum-item{text-align:center}
        .sum-item .lbl{font-size:10px;color:#666;margin-bottom:4px}
        .sum-item .val{font-size:14px;font-weight:bold}
        table{border-collapse:collapse;width:100%;font-size:9px;margin-top:10px}
        th,td{border:1px solid #ccc;padding:6px 4px}
        th{background:#f0f2f5;font-weight:bold;text-align:left}
        .r{text-align:right}
      </style></head><body>
      <h2>Hospital Transactions Report</h2>
      <div class="sub">Date: ${dateRange} &nbsp;|&nbsp; Doctor: ${docName} &nbsp;|&nbsp; Dept: ${deptName} &nbsp;|&nbsp; Type: ${ttype} &nbsp;|&nbsp; Method: ${method}</div>
      
      <div class="sum-box">
        <div class="sum-item"><div class="lbl">Total Revenue</div><div class="val">Rs ${summary.totalRevenue.toFixed(2)}</div></div>
        <div class="sum-item"><div class="lbl">Total Discounts</div><div class="val">Rs ${summary.totalDiscount.toFixed(2)}</div></div>
        <div class="sum-item"><div class="lbl">Net Income</div><div class="val">Rs ${(summary.totalRevenue - summary.totalDiscount).toFixed(2)}</div></div>
      </div>

      <table>
        <thead>
          <tr>
            <th>Date/Time</th>
            <th>Type</th>
            <th>Token#</th>
            <th>Patient / MRN</th>
            <th>Doctor</th>
            <th>Department</th>
            <th>Services</th>
            <th class="r">Fee</th>
            <th class="r">Discount</th>
            <th class="r">Net</th>
            <th>Method</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
      </body></html>`

    if ((window as any).electronAPI?.printHTML) {
      ;(window as any).electronAPI.printHTML(html)
    } else {
      const win = window.open('','_blank')
      if(win){win.document.write(html + '<script>window.onload=function(){window.print()}</script>');win.document.close()}
    }
  }

  const printServicesSummary = () => {
    const counts: Record<string, number> = {}
    let totalCount = 0
    
    filtered.forEach(r => {
      if (r.serviceNames) {
        const list = r.serviceNames.split(',').map(s => s.trim()).filter(Boolean)
        list.forEach(s => {
          counts[s] = (counts[s] || 0) + 1
          totalCount++
        })
      }
    })

    const dateRange = from || to ? `${from || to}${to ? ' to '+to : ''}` : new Date().toISOString().slice(0,10)
    
    const rows = Object.entries(counts)
      .sort((a, b) => b[1] - a[1]) // Sort by count descending
      .map(([name, count]) => `<tr>
        <td>${name}</td>
        <td class="r">${count}</td>
      </tr>`).join('')

    const html = `<!DOCTYPE html><html><head><title>Services Summary</title>
      <style>
        @page{size:A4;margin:15mm}
        body{font-family:Helvetica,Arial,sans-serif;font-size:12px;color:#000;margin:0;padding:20px}
        h2{text-align:center;font-size:18px;margin:0 0 10px}
        .sub{text-align:center;font-size:14px;margin-bottom:20px;color:#444}
        table{border-collapse:collapse;width:100%;max-width:600px;margin:0 auto}
        th,td{border:1px solid #ccc;padding:10px 12px}
        th{background:#f0f2f5;font-weight:bold;text-align:left}
        .r{text-align:right}
        .total-row{font-weight:bold;background:#f9f9f9}
      </style></head><body>
      <h2>Services Summary Report</h2>
      <div class="sub">Date: ${dateRange}</div>
      
      <table>
        <thead>
          <tr>
            <th>Service Name</th>
            <th class="r">Count</th>
          </tr>
        </thead>
        <tbody>
          ${rows}
        </tbody>
        <tfoot>
          <tr class="total-row">
            <td>Total</td>
            <td class="r">${totalCount}</td>
          </tr>
        </tfoot>
      </table>
      </body></html>`

    if ((window as any).electronAPI?.printHTML) {
      ;(window as any).electronAPI.printHTML(html)
    } else {
      const win = window.open('','_blank')
      if(win){win.document.write(html + '<script>window.onload=function(){window.print()}</script>');win.document.close()}
    }
  }

  return (
    <div className="min-h-screen bg-slate-50/80 px-6 py-8 space-y-6">
      <section className="rounded-3xl bg-linear-to-br from-slate-900 via-violet-900 to-slate-900 p-6 text-white shadow-xl">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.5em] text-white/50">Hospital Finance</p>
            <h1 className="mt-2 text-3xl font-semibold">Transactions & Ledger Activity</h1>
            <p className="mt-3 text-sm text-white/70">{dateLabel} · {derivedStats.count} transactions · Average Ticket {formatCurrency(derivedStats.avgTicket)}</p>
            <div className="mt-6 grid gap-3 sm:grid-cols-3">
              <div className="rounded-2xl bg-white/10 p-4">
                <p className="text-xs uppercase tracking-wide text-white/60">Total Revenue</p>
                <p className="mt-1 text-2xl font-semibold">{formatCurrency(summary.totalRevenue)}</p>
              </div>
              <div className="rounded-2xl bg-white/10 p-4">
                <p className="text-xs uppercase tracking-wide text-white/60">Total Discounts</p>
                <p className="mt-1 text-2xl font-semibold text-amber-200">{formatCurrency(summary.totalDiscount)}</p>
              </div>
              <div className="rounded-2xl bg-white/10 p-4">
                <p className="text-xs uppercase tracking-wide text-white/60">Net Income</p>
                <p className="mt-1 text-2xl font-semibold text-emerald-200">{formatCurrency(summary.totalRevenue - summary.totalDiscount)}</p>
              </div>
            </div>
          </div>
          <div className="grid w-full max-w-md gap-3 sm:grid-cols-3">
            {[
              { label: 'Cash', value: derivedStats.methodTotals.cash, tone: 'from-emerald-400 to-emerald-500' },
              { label: 'Bank', value: derivedStats.methodTotals.bank, tone: 'from-sky-400 to-sky-500' },
              { label: 'Other', value: derivedStats.methodTotals.other, tone: 'from-orange-400 to-orange-500' }
            ].map((stat) => (
              <div key={stat.label} className={`rounded-2xl bg-linear-to-br ${stat.tone} p-4 text-sm font-medium text-white shadow-lg`}>
                <p className="text-[11px] uppercase tracking-wide text-white/70">{stat.label}</p>
                <p className="mt-1 text-lg font-semibold">{formatCurrency(stat.value)}</p>
              </div>
            ))}
          </div>
        </div>
        {derivedStats.topServices.length > 0 && (
          <div className="mt-6 flex flex-wrap gap-2 text-xs text-white/70">
            {derivedStats.topServices.map(([name, count]) => (
              <span key={name} className="rounded-full border border-white/20 px-3 py-1 text-white/80">{name} · {count}</span>
            ))}
          </div>
        )}
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-center gap-3 border-b border-slate-100 pb-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-800">
            <Filter className="h-4 w-4 text-violet-600" />
            Advanced Filters
          </div>
          <div className="ml-auto flex flex-wrap gap-2 text-xs">
            <button onClick={()=>setTick(t=>t+1)} className="inline-flex items-center gap-1 rounded-full border border-slate-200 px-3 py-1.5 text-slate-600 transition hover:bg-slate-50">
              <RefreshCw className="h-3.5 w-3.5" /> Refresh
            </button>
            <button onClick={exportCsv} className="inline-flex items-center gap-1 rounded-full border border-slate-200 px-3 py-1.5 text-slate-600 transition hover:bg-slate-50">
              <Download className="h-3.5 w-3.5" /> CSV
            </button>
            <button onClick={printTransactions} className="inline-flex items-center gap-1 rounded-full border border-slate-200 px-3 py-1.5 text-slate-600 transition hover:bg-slate-50">
              <Printer className="h-3.5 w-3.5" /> Transactions
            </button>
            <button onClick={printServicesSummary} className="inline-flex items-center gap-1 rounded-full border border-slate-200 px-3 py-1.5 text-slate-600 transition hover:bg-slate-50">
              <Printer className="h-3.5 w-3.5" /> Services
            </button>
          </div>
        </div>

        <div className="mt-4 grid items-end gap-3 md:grid-cols-4 lg:grid-cols-8">
          <div>
            <label className="mb-1 block text-sm text-slate-700">From</label>
            <input type="date" value={from} onChange={e=>{setFrom(e.target.value); setPage(1)}} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-violet-500" />
          </div>
          <div>
            <label className="mb-1 block text-sm text-slate-700">To</label>
            <input type="date" value={to} onChange={e=>{setTo(e.target.value); setPage(1)}} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-violet-500" />
          </div>
          <div>
            <label className="mb-1 block text-sm text-slate-700">Type</label>
            <select value={ttype} onChange={e=>{setTtype(e.target.value as any); setPage(1)}} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-violet-500">
              <option>All</option>
              <option>General</option>
              <option>Private</option>
              <option>Subsidized</option>
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm text-slate-700">Method</label>
            <select value={method} onChange={e=>{setMethod(e.target.value as any); setPage(1)}} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-violet-500">
              <option value="all">All</option>
              <option value="cash">Cash</option>
              <option value="bank">Bank</option>
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm text-slate-700">Doctor</label>
            <select value={selectedDoctorId} onChange={e=>{setSelectedDoctorId(e.target.value); setPage(1)}} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-violet-500">
              <option value="">All Doctors</option>
              {doctors.map(d => <option key={d._id} value={d._id}>{d.name}</option>)}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm text-slate-700">Department</label>
            <select value={selectedDepartmentId} onChange={e=>{setSelectedDepartmentId(e.target.value); setPage(1)}} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-violet-500">
              <option value="">All Depts</option>
              {departments.map(d => <option key={d._id} value={d._id}>{d.name}</option>)}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm text-slate-700">Service</label>
            <select value={selectedServiceName} onChange={e=>{setSelectedServiceName(e.target.value); setPage(1)}} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-violet-500">
              <option value="">All Services</option>
              {services.map(s => <option key={s._id} value={s.name}>{s.name}</option>)}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm text-slate-700">Rows</label>
            <select value={rowsPerPage} onChange={e=>{setRowsPerPage(e.target.value === 'All' ? 'All' : parseInt(e.target.value)); setPage(1)}} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-violet-500">
              <option value={50}>50</option>
              <option value={100}>100</option>
              <option value={200}>200</option>
              <option value="All">All</option>
            </select>
          </div>
        </div>
        <div className="mt-4 grid items-end gap-3 md:grid-cols-8">
          <div className="md:col-span-6">
            <label className="mb-1 block text-sm text-slate-700">Search</label>
            <input value={q} onChange={e=>{setQ(e.target.value); setPage(1)}} placeholder="Patient, MRN, doctor, description..." className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-violet-500" />
          </div>
          <div className="text-sm text-slate-500 md:col-span-2">{total} results · Page {page}/{totalPages}</div>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-100 px-4 py-4">
          <div>
            <p className="text-base font-semibold text-slate-900">Results</p>
            <p className="text-xs text-slate-500">Live feed from hospital finance ledger</p>
          </div>
          <div className="text-xs text-slate-500">Showing {(page - 1) * (rowsPerPage === 'All' ? filtered.length : Number(rowsPerPage)) + 1}-{Math.min(page * (rowsPerPage === 'All' ? filtered.length : Number(rowsPerPage)), total)} of {total}</div>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-slate-100/50 text-slate-700 border-b-2 border-slate-300">
              <tr>
                <th className="px-3 py-3 text-[13px] font-extrabold uppercase tracking-wider">Date</th>
                <th className="px-3 py-3 text-[13px] font-extrabold uppercase tracking-wider">Type</th>
                <th className="px-3 py-3 text-[13px] font-extrabold uppercase tracking-wider">Token#</th>
                <th className="px-3 py-3 text-[13px] font-extrabold uppercase tracking-wider">Patient</th>
                <th className="px-3 py-3 text-[13px] font-extrabold uppercase tracking-wider">Doctor</th>
                <th className="px-3 py-3 text-[13px] font-extrabold uppercase tracking-wider">Department</th>
                <th className="px-3 py-3 text-[13px] font-extrabold uppercase tracking-wider">Services</th>
                <th className="px-3 py-3 text-[13px] font-extrabold uppercase tracking-wider">Description</th>
                <th className="px-3 py-3 text-[13px] font-extrabold uppercase tracking-wider text-right">Fee</th>
                <th className="px-3 py-3 text-[13px] font-extrabold uppercase tracking-wider text-right">Discount</th>
                <th className="px-3 py-3 text-[13px] font-extrabold uppercase tracking-wider text-right">Net</th>
                <th className="px-3 py-3 text-[13px] font-extrabold uppercase tracking-wider">Method</th>
                <th className="px-3 py-3 text-[13px] font-extrabold uppercase tracking-wider">Performed By</th>
                <th className="px-3 py-3 text-[13px] font-extrabold uppercase tracking-wider">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-slate-700">
              {loading ? (
                <tr>
                  <td colSpan={13} className="px-4 py-12 text-center text-slate-500">Loading...</td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={13} className="px-4 py-12 text-center text-slate-500">No transactions found</td>
                </tr>
              ) : filtered.map(r => (
                <tr key={r.id} className={`hover:bg-slate-50/50 ${r.isReturned ? 'bg-red-50/50' : ''}`}>
                  <td className="px-3 py-2 whitespace-nowrap">{fmtDateTime12(r.createdAt || r.dateIso)}</td>
                  <td className="px-3 py-2">
                    <span className={`inline-flex rounded px-2 py-0.5 text-xs font-medium ${
                      r.type === 'General' ? 'bg-emerald-100 text-emerald-700' :
                      r.type === 'Private' ? 'bg-violet-100 text-violet-700' :
                      r.type === 'Subsidized' ? 'bg-sky-100 text-sky-700' :
                      'bg-slate-100 text-slate-700'
                    }`}>
                      {r.type}
                    </span>
                  </td>
                  <td className="px-3 py-2 font-medium">{r.tokenNo || '-'}</td>
                  <td className="px-3 py-2">
                    <div className="font-medium">{r.patientName || '-'}</div>
                    <div className="text-xs text-slate-500">{r.mrn || ''}</div>
                  </td>
                  <td className="px-3 py-2 text-sm">{r.doctorName || '-'}</td>
                  <td className="px-3 py-2 text-sm">{r.departmentName || '-'}</td>
                  <td className="px-3 py-2">
                    <ServicesCell services={r.serviceNames} />
                  </td>
                  <td className="px-3 py-2 max-w-xs truncate text-sm" title={r.memo}>{r.memo}</td>
                  <td className="px-3 py-2 text-right font-medium">Rs {(r.fee || r.totalAmount || 0).toFixed(2)}</td>
                  <td className="px-3 py-2 text-right text-amber-600">{r.tokenDiscount ? `Rs ${r.tokenDiscount.toFixed(2)}` : '-'}</td>
                  <td className="px-3 py-2 text-right font-semibold">Rs {(r.netAmount || 0).toFixed(2)}</td>
                  <td className="px-3 py-2 capitalize">{r.paymentMethod || '-'}</td>
                  <td className="px-3 py-2">{r.createdByUsername || '-'}</td>
                  <td className="px-3 py-2">
                    {r.isReturned ? (
                      <span className="rounded bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">Returned</span>
                    ) : (
                      <span className={`rounded px-2 py-0.5 text-xs font-medium ${
                        r.status === 'completed' ? 'bg-emerald-100 text-emerald-700' :
                        r.status === 'pending' ? 'bg-amber-100 text-amber-700' :
                        'bg-slate-100 text-slate-700'
                      }`}>
                        {r.status}
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 px-4 py-4 text-sm text-slate-600">
          <div className="flex items-center gap-2">
            <span className="text-xs uppercase tracking-wide text-slate-400">Rows / page</span>
            <select
              value={rowsPerPage}
              onChange={e=>{setRowsPerPage(e.target.value === 'All' ? 'All' : parseInt(e.target.value)); setPage(1)}}
              className="rounded-lg border border-slate-200 px-3 py-1 text-sm"
            >
              <option value={50}>50</option>
              <option value={100}>100</option>
              <option value={200}>200</option>
              <option value="All">All</option>
            </select>
          </div>
          <div className="flex items-center gap-2">
            <button 
              onClick={()=>setPage(p=>Math.max(1, p-1))} 
              disabled={page <= 1}
              className="rounded-full border border-slate-200 px-4 py-1.5 text-sm font-medium transition hover:bg-slate-50 disabled:opacity-50"
            >
              Prev
            </button>
            <button 
              onClick={()=>setPage(p=>Math.min(totalPages, p+1))} 
              disabled={page >= totalPages}
              className="rounded-full border border-slate-200 px-4 py-1.5 text-sm font-medium transition hover:bg-slate-50 disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>
      </section>
    </div>
  )
}
