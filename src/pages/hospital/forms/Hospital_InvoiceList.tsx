import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api as coreApi, hospitalApi } from '../../../utils/api'

export default function Hospital_InvoiceList(){
  const navigate = useNavigate()
  const [q, setQ] = useState('')
  const [encounterType, setEncounterType] = useState<'ALL'|'IPD'|'EMERGENCY'>('ALL')
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(20)
  const [total, setTotal] = useState(0)
  const [rows, setRows] = useState<any[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(()=>{ load() }, [page, limit, encounterType])

  async function load(){
    setLoading(true)
    try {
      // Use the new invoice collection API
      const params: any = { page, limit, status: 'final' }
      if (encounterType !== 'ALL') params.encounterType = encounterType
      
      const res: any = await hospitalApi.listInvoices(params).catch(()=>null)
      let invoices = res?.invoices||[]
      
      // Filter by search query (client-side for now)
      if (q) {
        const sq = q.toLowerCase()
        invoices = invoices.filter((inv: any) => 
          inv.patientName?.toLowerCase().includes(sq) ||
          inv.mrn?.toLowerCase().includes(sq) ||
          inv.cnic?.toLowerCase().includes(sq) ||
          inv.phone?.toLowerCase().includes(sq) ||
          inv.department?.toLowerCase().includes(sq)
        )
      }
      
      const mapped = invoices.map((inv:any)=> ({
        invoiceId: String(inv._id),
        encounterId: String(inv.encounterId),
        encounterType: inv.encounterType,
        patientName: inv.patientName || inv.patientId?.fullName,
        mrn: inv.mrn || inv.patientId?.mrn,
        cnic: inv.cnic || inv.patientId?.cnicNormalized,
        phone: inv.phone || inv.patientId?.phoneNormalized,
        department: inv.department || inv.departmentId?.name,
        totalAmount: inv.totalAmount,
        totalPaid: inv.totalPaid,
        netOutstanding: inv.netOutstanding,
        createdAt: inv.createdAt,
        invoiceNo: inv.invoiceNo,
      }))
      setRows(mapped)
      setTotal(res?.total||mapped.length)
    } finally { setLoading(false) }
  }

  function sr(idx: number){ return (page-1)*limit + idx + 1 }

  async function onPrint(encounterId: string, encounterType?: string){
    try {
      const endpoint = encounterType === 'EMERGENCY' 
        ? `/hospital/er/encounters/${encodeURIComponent(encounterId)}/final-invoice/print`
        : `/hospital/ipd/admissions/${encodeURIComponent(encounterId)}/final-invoice/print`
      const html = await coreApi(endpoint) as any
      
      // Use Electron print preview if available
      const api: any = (window as any).electronAPI
      try {
        if (api && typeof api.printPreviewHtml === 'function'){
          await api.printPreviewHtml(String(html), {})
          return
        }
      } catch {}
      
      // Fallback to browser window
      const w = window.open('', '_blank'); if (!w) return
      w.document.write(String(html)); w.document.close(); w.focus()
    } catch {}
  }

  return (
    <div className="space-y-4">
      {/* Header with title and filters */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-extrabold text-slate-900">Final Invoices</h1>
            <p className="text-sm text-slate-500 mt-1">Manage IPD and Emergency invoices</p>
          </div>
          
          {/* Filters */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Encounter Type Filter */}
            <select 
              className="border border-slate-300 rounded-md px-3 py-2 text-sm bg-white hover:border-slate-400 focus:border-sky-500 focus:ring-1 focus:ring-sky-500 outline-none transition-colors"
              value={encounterType}
              onChange={e=>{ setEncounterType(e.target.value as any); setPage(1) }}
            >
              <option value="ALL">All Department</option>
              <option value="IPD">IPD</option>
              <option value="EMERGENCY">Emergency</option>
            </select>
            
            {/* Search */}
            <div className="flex items-center gap-2">
              <input 
                className="border border-slate-300 rounded-md px-3 py-2 text-sm w-64 hover:border-slate-400 focus:border-sky-500 focus:ring-1 focus:ring-sky-500 outline-none transition-colors" 
                placeholder="Search name / MRN / CNIC / phone..." 
                value={q} 
                onChange={e=>setQ(e.target.value)} 
                onKeyDown={e=>{ if (e.key==='Enter') { setPage(1); load() } }} 
              />
              <button 
                className="bg-sky-600 hover:bg-sky-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed" 
                onClick={()=>{ setPage(1); load() }} 
                disabled={loading}
              >
                {loading ? 'Loading...' : 'Search'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Invoices Table */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-auto">
          <table className="min-w-[900px] w-full">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr className="text-left">
                <th className="px-4 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wider">Sr #</th>
                <th className="px-4 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wider">Invoice #</th>
                <th className="px-4 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wider">Type</th>
                <th className="px-4 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wider">Patient</th>
                <th className="px-4 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wider">MRN</th>
                <th className="px-4 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wider">Department</th>
                <th className="px-4 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wider text-right">Total</th>
                <th className="px-4 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wider text-right">Paid</th>
                <th className="px-4 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wider text-right">Balance</th>
                <th className="px-4 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wider">Created</th>
                <th className="px-4 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="text-sm divide-y divide-slate-100">
              {rows.map((r, i)=> (
                <tr key={r.invoiceId} className="hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3 text-slate-500">{sr(i)}</td>
                  <td className="px-4 py-3 font-medium text-slate-900">{r.invoiceNo||'-'}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                      r.encounterType === 'EMERGENCY' 
                        ? 'bg-rose-100 text-rose-700 border border-rose-200' 
                        : 'bg-sky-100 text-sky-700 border border-sky-200'
                    }`}>
                      {r.encounterType === 'EMERGENCY' ? 'ER' : 'IPD'}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-medium text-slate-900">{r.patientName||'-'}</td>
                  <td className="px-4 py-3 text-slate-600">{r.mrn||'-'}</td>
                  <td className="px-4 py-3 text-slate-600">{r.department||'-'}</td>
                  <td className="px-4 py-3 text-right font-mono text-slate-700">Rs {r.totalAmount?.toLocaleString()||'0'}</td>
                  <td className="px-4 py-3 text-right font-mono text-emerald-600">Rs {r.totalPaid?.toLocaleString()||'0'}</td>
                  <td className="px-4 py-3 text-right font-mono">
                    <span className={r.netOutstanding > 0 ? 'text-rose-600' : r.netOutstanding < 0 ? 'text-emerald-600' : 'text-slate-500'}>
                      {r.netOutstanding > 0 ? '-' : r.netOutstanding < 0 ? '+' : ''}
                      Rs {Math.abs(r.netOutstanding||0).toLocaleString()}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-500 text-xs">{new Date(r.createdAt||'').toLocaleString?.()||''}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <button 
                        className="bg-sky-50 hover:bg-sky-100 text-sky-700 border border-sky-200 px-3 py-1.5 rounded-md text-xs font-medium transition-colors"
                        onClick={()=> navigate(`/hospital/${r.encounterType === 'EMERGENCY' ? 'er' : 'ipd'}/admissions/${encodeURIComponent(r.encounterId)}/invoice`)}
                      >
                        Edit
                      </button>
                      <button 
                        className="bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 px-3 py-1.5 rounded-md text-xs font-medium transition-colors"
                        onClick={()=> onPrint(String(r.encounterId), r.encounterType)}
                      >
                        Print
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {rows.length===0 && (
                <tr>
                  <td className="px-4 py-12 text-center text-slate-500" colSpan={11}>
                    <div className="flex flex-col items-center gap-2">
                      <svg className="w-12 h-12 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      <p>{loading? 'Loading invoices...':'No invoices found'}</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2 text-sm text-slate-600">
          <span>Rows per page:</span>
          <select 
            className="border border-slate-300 rounded-md px-2 py-1 text-sm bg-white hover:border-slate-400 focus:border-sky-500 focus:ring-1 focus:ring-sky-500 outline-none" 
            value={limit} 
            onChange={e=>{ setLimit(parseInt(e.target.value)||20); setPage(1) }}
          >
            {[10,20,50,100].map(n=> <option key={n} value={n}>{n}</option>)}
          </select>
          <span className="ml-4">Page {page} of {Math.max(1, Math.ceil(total/limit)||1)}</span>
        </div>
        <div className="flex items-center gap-2">
          <button 
            className="px-4 py-2 rounded-md text-sm font-medium border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors" 
            disabled={page<=1} 
            onClick={()=> setPage(p=>Math.max(1,p-1))}
          >
            Previous
          </button>
          <button 
            className="px-4 py-2 rounded-md text-sm font-medium bg-sky-600 text-white hover:bg-sky-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors" 
            disabled={page>=Math.ceil(total/limit)} 
            onClick={()=> setPage(p=>p+1)}
          >
            Next
          </button>
        </div>
      </div>
    </div>
  )
}
