import { useEffect, useState } from 'react'
import { financeApi } from '../../utils/api'
import Hospital_CashCountSlipDialog, { type CashCountEntry } from '../../components/hospital/hospital_CashCountSlipDialog'
import Toast, { type ToastState } from '../../components/ui/Toast'
import { Plus, Search, FileDown, Printer, Calendar, Wallet, User, History } from 'lucide-react'

function iso(d: Date){ return d.toISOString().slice(0,10) }

export default function Hospital_CashSessions(){
  // No cash drawer sessions — only Manager Cash Count

  // Manager Cash Count (Hospital)
  const [addOpen, setAddOpen] = useState(false)
  const [ccDate, setCcDate] = useState<string>(iso(new Date()))
  const [ccAmount, setCcAmount] = useState<string>('')
  const [ccReceiver, setCcReceiver] = useState('')
  const [ccHandoverBy, setCcHandoverBy] = useState('')
  const [ccNote, setCcNote] = useState('')
  const [ccList, setCcList] = useState<CashCountEntry[]>([])
  const [ccFrom, setCcFrom] = useState<string>('')
  const [ccTo, setCcTo] = useState<string>('')
  const [ccSearch, setCcSearch] = useState<string>('')
  const [ccPage, setCcPage] = useState<number>(1)
  const [ccLimit, setCcLimit] = useState<number>(20)
  const [ccTotalPages, setCcTotalPages] = useState<number>(1)
  const [ccLoading, setCcLoading] = useState<boolean>(false)
  const [openSlip, setOpenSlip] = useState<boolean>(false)
  const [slipEntry, setSlipEntry] = useState<CashCountEntry | null>(null)
  const [ccSummary, setCcSummary] = useState<{ amount: number; count: number }>({ amount: 0, count: 0 })
  const [toast, setToast] = useState<ToastState>(null)

  // No cash drawer session calls needed

  async function fetchCounts(p=ccPage, l=ccLimit){
    setCcLoading(true)
    try {
      const res: any = await financeApi.listCashCounts({ from: ccFrom || undefined, to: ccTo || undefined, search: ccSearch || undefined, page: p, limit: l })
      const items: CashCountEntry[] = Array.isArray(res?.items) ? res.items.map((x:any)=>({
        id: x._id || x.id,
        date: x.date,
        amount: x.amount,
        note: x.note,
        user: x.user,
        receiver: x.receiver,
        handoverBy: x.handoverBy,
        createdAt: x.createdAt
      })) : []
      setCcList(items)
      setCcTotalPages(Number(res?.totalPages || 1))
    } catch { setCcList([]); setCcTotalPages(1) }
    setCcLoading(false)
  }
  useEffect(()=>{ fetchCounts(1, ccLimit); setCcPage(1) }, [ccFrom, ccTo, ccSearch])
  useEffect(()=>{ fetchCounts(ccPage, ccLimit) }, [ccPage, ccLimit])

  async function fetchSummary(){
    try {
      const s: any = await financeApi.cashCountSummary({ from: ccFrom || undefined, to: ccTo || undefined, search: ccSearch || undefined })
      setCcSummary({ amount: Number(s?.amount || 0), count: Number(s?.count || 0) })
    } catch { setCcSummary({ amount: 0, count: 0 }) }
  }
  useEffect(()=>{ fetchSummary() }, [ccFrom, ccTo, ccSearch])

  const addCount = async () => {
    const amt = parseFloat(String(ccAmount||'').trim())
    if (!isFinite(amt) || amt <= 0) { setToast({ type: 'error', message: 'Enter a valid amount' }); return }
    let created: any
    try {
      created = await financeApi.createCashCount({
        date: ccDate || iso(new Date()),
        amount: +amt.toFixed(2),
        note: ccNote.trim() || undefined,
        receiver: ccReceiver.trim() || undefined,
        handoverBy: ccHandoverBy.trim() || undefined,
      })
    } catch (e) { setToast({ type: 'error', message: 'Failed to save' }); return }
    const entry: CashCountEntry = {
      id: created?._id || crypto.randomUUID(),
      date: created?.date || ccDate || iso(new Date()),
      amount: created?.amount ?? +amt.toFixed(2),
      note: created?.note || (ccNote.trim() || undefined),
      user: created?.user || 'manager',
      receiver: created?.receiver || (ccReceiver.trim() || undefined),
      handoverBy: created?.handoverBy || (ccHandoverBy.trim() || undefined),
      createdAt: created?.createdAt || new Date().toISOString()
    }
    setSlipEntry(entry)
    setOpenSlip(true)
    // reset
    setCcAmount(''); setCcNote(''); setCcReceiver(''); setCcHandoverBy(''); setCcDate(iso(new Date()))
    setAddOpen(false)
    setCcPage(1)
    fetchCounts(1, ccLimit)
  }

  const ccAmountOf = (e: CashCountEntry) => {
    const a = typeof e.amount === 'number' && isFinite(e.amount) ? Number(e.amount) : 0
    if (a > 0) return a
    return Object.entries(e.counts||{}).reduce((s,[den,qty])=> s + Number(den)*Number(qty||0), 0)
  }
  const printSlip = (e: CashCountEntry) => { setSlipEntry(e); setOpenSlip(true) }

  function exportCSV(){
    const rows = [['Date','Amount','Receiver','Handover By','Note'], ...ccList.map(e=>[e.date, String(ccAmountOf(e)), e.receiver||'', e.handoverBy||'', e.note||''])]
    const csv = rows.map(r=> r.map(v=>`"${String(v).replace(/"/g,'""')}"`).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href=url; a.download=`hospital-cash-counts.csv`; a.click(); setTimeout(()=>URL.revokeObjectURL(url), 1000)
  }

  

  return (
    <div className="space-y-6 pb-8 bg-slate-50/50 dark:bg-slate-900/50 -m-6 p-6 min-h-screen">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 dark:text-slate-100 tracking-tight">Manager Cash Sessions</h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm font-medium mt-1">Add manager cash counts, browse history, and print slips.</p>
        </div>
        <div className="flex items-center gap-2">
          <button 
            type="button" 
            onClick={() => setAddOpen(true)} 
            className="btn flex items-center gap-2 shadow-lg shadow-emerald-500/20"
          >
            <Plus className="h-4 w-4" /> Add Cash Count
          </button>
        </div>
      </div>

      {/* Summary Widgets */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4 shadow-sm flex items-center justify-between">
          <div>
            <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Total Handed Over</div>
            <div className="text-2xl font-black text-slate-900 dark:text-slate-100 tabular-nums">PKR {ccSummary.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
          </div>
          <div className="h-12 w-12 rounded-xl bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center text-blue-600">
            <Wallet className="h-6 w-6" />
          </div>
        </div>
        <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4 shadow-sm flex items-center justify-between">
          <div>
            <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Total Sessions</div>
            <div className="text-2xl font-black text-slate-900 dark:text-slate-100 tabular-nums">{ccSummary.count}</div>
          </div>
          <div className="h-12 w-12 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 flex items-center justify-center text-emerald-600">
            <History className="h-6 w-6" />
          </div>
        </div>
        <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4 shadow-sm flex items-center justify-between">
          <div>
            <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Date Range</div>
            <div className="text-sm font-bold text-slate-700 dark:text-slate-300">{ccFrom || 'Start'} — {ccTo || 'Today'}</div>
          </div>
          <div className="h-12 w-12 rounded-xl bg-amber-50 dark:bg-amber-900/20 flex items-center justify-center text-amber-600">
            <Calendar className="h-6 w-6" />
          </div>
        </div>
      </div>

      {/* Cash Count History */}
      <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-sm overflow-hidden transition-all">
        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-700 flex flex-wrap items-center justify-between gap-4">
          <h3 className="font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <History className="h-5 w-5 text-slate-400" />
            Cash Count History
          </h3>
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-900 p-1 rounded-xl border border-slate-200 dark:border-slate-700">
              <input type="date" value={ccFrom} onChange={e=>setCcFrom(e.target.value)} className="bg-transparent border-none text-xs focus:ring-0 text-slate-700 dark:text-slate-200" />
              <span className="text-slate-400">to</span>
              <input type="date" value={ccTo} onChange={e=>setCcTo(e.target.value)} className="bg-transparent border-none text-xs focus:ring-0 text-slate-700 dark:text-slate-200" />
            </div>
            <div className="relative">
              <input 
                placeholder="Search sessions..." 
                value={ccSearch} 
                onChange={e=>setCcSearch(e.target.value)} 
                className="pl-9 pr-4 py-2 text-xs bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 w-48 transition-all" 
              />
              <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
            </div>
            <select value={ccLimit} onChange={e=>{ setCcLimit(parseInt(e.target.value)||20); setCcPage(1) }} className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 px-3 py-2 text-xs font-medium focus:ring-2 focus:ring-blue-500">
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={50}>50</option>
            </select>
            <button type="button" onClick={exportCSV} className="btn-outline-navy flex items-center gap-2 py-2">
              <FileDown className="h-3.5 w-3.5" /> CSV
            </button>
          </div>
        </div>
        
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead>
              <tr className="bg-slate-50/80 dark:bg-slate-900/50 border-b border-slate-100 dark:border-slate-700">
                <th className="px-6 py-4 text-[11px] font-bold uppercase tracking-widest text-slate-500">Date</th>
                <th className="px-6 py-4 text-[11px] font-bold uppercase tracking-widest text-slate-500 text-right">Amount</th>
                <th className="px-6 py-4 text-[11px] font-bold uppercase tracking-widest text-slate-500">Receiver</th>
                <th className="px-6 py-4 text-[11px] font-bold uppercase tracking-widest text-slate-500">Handover By</th>
                <th className="px-6 py-4 text-[11px] font-bold uppercase tracking-widest text-slate-500">Note</th>
                <th className="px-6 py-4 text-[11px] font-bold uppercase tracking-widest text-slate-500 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 dark:divide-slate-700">
              {ccList.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center">
                    <div className="flex flex-col items-center gap-2">
                      <History className="h-8 w-8 text-slate-200" />
                      <span className="text-slate-400 font-medium">{ccLoading? 'Loading sessions...' : 'No cash sessions found'}</span>
                    </div>
                  </td>
                </tr>
              ) : ccList.map(e => (
                <tr key={e.id} className="group hover:bg-slate-50/50 dark:hover:bg-slate-900/50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="font-bold text-slate-900 dark:text-slate-100">{new Date(e.date).toLocaleDateString()}</div>
                    {e.createdAt && <div className="text-[10px] text-slate-400">{new Date(e.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>}
                  </td>
                  <td className="px-6 py-4 text-right font-black text-slate-900 dark:text-slate-100 tabular-nums">
                    {ccAmountOf(e).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <User className="h-3.5 w-3.5 text-slate-400" />
                      <span className="font-medium text-slate-700 dark:text-slate-300">{e.receiver || '-'}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 font-medium text-slate-600 dark:text-slate-400">{e.handoverBy || '-'}</td>
                  <td className="px-6 py-4 max-w-xs truncate text-xs text-slate-500 dark:text-slate-400" title={e.note}>{e.note || '—'}</td>
                  <td className="px-6 py-4 text-right">
                    <button 
                      type="button" 
                      onClick={()=>printSlip(e)} 
                      className="p-1.5 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 dark:bg-blue-900/20 dark:text-blue-400 transition-colors inline-flex items-center gap-1.5 text-xs font-bold"
                    >
                      <Printer className="h-3.5 w-3.5" /> Slip
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-700 flex flex-col sm:flex-row items-center justify-between gap-4 bg-slate-50/30 dark:bg-slate-900/10">
          <div className="text-sm text-slate-500 font-medium">
            Page <span className="font-bold text-slate-900 dark:text-slate-100">{ccPage}</span> of <span className="font-bold text-slate-900 dark:text-slate-100">{ccTotalPages}</span> — Total PKR <span className="font-bold text-emerald-600">{ccList.reduce((s,e)=> s + ccAmountOf(e), 0).toLocaleString()}</span>
          </div>
          <div className="flex items-center gap-2">
            <button 
              type="button" 
              disabled={ccPage<=1} 
              onClick={()=>setCcPage(p=>Math.max(1,p-1))} 
              className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-bold disabled:opacity-40 transition-all hover:bg-slate-50"
            >
              Prev
            </button>
            <button 
              type="button" 
              disabled={ccPage>=ccTotalPages} 
              onClick={()=>setCcPage(p=>Math.min(ccTotalPages,p+1))} 
              className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-bold disabled:opacity-40 transition-all hover:bg-slate-50"
            >
              Next
            </button>
          </div>
        </div>
      </div>

      {/* Add Cash Count Dialog */}
      {addOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/20">
              <h3 className="font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <Wallet className="h-5 w-5 text-emerald-500" />
                Add Manager Cash Count
              </h3>
              <button onClick={() => setAddOpen(false)} className="p-1 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors">
                <Plus className="h-5 w-5 rotate-45 text-slate-400" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Date</label>
                  <input type="date" value={ccDate} onChange={e=>setCcDate(e.target.value)} className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 px-4 py-2.5 text-sm" />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Amount</label>
                  <div className="relative">
                    <input value={ccAmount} onChange={e=>setCcAmount(e.target.value)} placeholder="0.00" className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 pl-12 pr-4 py-2.5 text-sm font-bold tabular-nums" />
                    <span className="absolute left-4 top-2.5 text-xs font-bold text-slate-400">PKR</span>
                  </div>
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Receiver (Manager Name)</label>
                <div className="relative">
                  <input value={ccReceiver} onChange={e=>setCcReceiver(e.target.value)} placeholder="Who is receiving the cash?" className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 pl-10 pr-4 py-2.5 text-sm" />
                  <User className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Handover By</label>
                <div className="relative">
                  <input value={ccHandoverBy} onChange={e=>setCcHandoverBy(e.target.value)} placeholder="Who is handing over?" className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 pl-10 pr-4 py-2.5 text-sm" />
                  <User className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Note (Optional)</label>
                <textarea value={ccNote} onChange={e=>setCcNote(e.target.value)} placeholder="Add any details..." rows={2} className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 px-4 py-2.5 text-sm resize-none" />
              </div>
            </div>
            <div className="px-6 py-4 bg-slate-50 dark:bg-slate-900/50 flex items-center justify-end gap-3">
              <button type="button" onClick={() => setAddOpen(false)} className="px-4 py-2 text-sm font-bold text-slate-500 hover:text-slate-700 transition-colors">Cancel</button>
              <button type="button" onClick={addCount} className="btn px-6 shadow-lg shadow-emerald-500/20">Save & Print Slip</button>
            </div>
          </div>
        </div>
      )}

      <Hospital_CashCountSlipDialog open={openSlip} onClose={()=>setOpenSlip(false)} entry={slipEntry} />
      <Toast toast={toast} onClose={()=>setToast(null)} />
    </div>
  )
}
