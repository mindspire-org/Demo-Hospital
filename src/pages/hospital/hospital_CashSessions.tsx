import { useEffect, useState } from 'react'
import { financeApi } from '../../utils/api'
import Hospital_CashCountSlipDialog, { type CashCountEntry } from '../../components/hospital/hospital_CashCountSlipDialog'
import Toast, { type ToastState } from '../../components/ui/Toast'
import { Wallet, History, Search, Filter, Plus, FileSpreadsheet, Printer, ChevronLeft, ChevronRight, Calendar, DollarSign, User, FileText } from 'lucide-react'

function iso(d: Date){ return d.toISOString().slice(0,10) }

export default function Hospital_CashSessions(){
  // Manager Cash Count (Hospital)
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
    }
    setSlipEntry(entry)
    setOpenSlip(true)
    setCcAmount(''); setCcNote(''); setCcReceiver(''); setCcHandoverBy(''); setCcDate(iso(new Date()))
    setCcPage(1)
    fetchCounts(1, ccLimit)
    setToast({ type: 'success', message: 'Cash count added successfully' })
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
    <div className="space-y-6 p-1">
      {/* Hero Header */}
      <div className="relative overflow-hidden rounded-2xl bg-linear-to-r from-emerald-600 to-teal-600 p-6 shadow-lg text-white">
        <div className="absolute top-0 right-0 -mr-16 -mt-16 h-64 w-64 rounded-full bg-white/10" />
        <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="rounded-xl bg-white/20 p-3 backdrop-blur-md">
              <Wallet className="h-8 w-8 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-black tracking-tight">Manager Cash Sessions</h1>
              <p className="text-emerald-50 text-sm font-medium opacity-90">Manage and track daily cash handovers and counts</p>
            </div>
          </div>
          <button
            onClick={exportCSV}
            className="flex items-center justify-center gap-2 rounded-xl bg-white/20 px-4 py-2.5 text-sm font-bold backdrop-blur-md hover:bg-white/30 transition-all"
          >
            <FileSpreadsheet className="h-4 w-4" /> Export CSV
          </button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* New Entry Form */}
        <div className="lg:col-span-2 space-y-6">
          <div className="rounded-2xl border border-slate-200/60 bg-white p-6 shadow-sm">
            <div className="mb-6 flex items-center gap-3">
              <div className="rounded-lg bg-emerald-100 p-2 text-emerald-600">
                <Plus className="h-5 w-5" />
              </div>
              <h2 className="text-lg font-bold text-slate-800">New Cash Count</h2>
            </div>
            
            <div className="grid gap-5 md:grid-cols-2">
              <div className="space-y-1.5">
                <label className="text-[11px] font-black uppercase tracking-wider text-slate-400">Date</label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input type="date" value={ccDate} onChange={e=>setCcDate(e.target.value)} className="w-full rounded-xl border border-slate-200 bg-slate-50/30 py-2.5 pl-10 pr-4 text-sm font-semibold text-slate-700 outline-none focus:border-emerald-400 focus:ring-4 focus:ring-emerald-500/10 transition-all" />
                </div>
              </div>
              
              <div className="space-y-1.5">
                <label className="text-[11px] font-black uppercase tracking-wider text-slate-400">Amount (PKR)</label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input value={ccAmount} onChange={e=>setCcAmount(e.target.value)} placeholder="0.00" className="w-full rounded-xl border border-slate-200 bg-slate-50/30 py-2.5 pl-10 pr-4 text-sm font-semibold text-slate-700 outline-none focus:border-emerald-400 focus:ring-4 focus:ring-emerald-500/10 transition-all" />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-black uppercase tracking-wider text-slate-400">Receiver</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input value={ccReceiver} onChange={e=>setCcReceiver(e.target.value)} placeholder="Manager name" className="w-full rounded-xl border border-slate-200 bg-slate-50/30 py-2.5 pl-10 pr-4 text-sm font-semibold text-slate-700 outline-none focus:border-emerald-400 focus:ring-4 focus:ring-emerald-500/10 transition-all" />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-black uppercase tracking-wider text-slate-400">Handover By</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input value={ccHandoverBy} onChange={e=>setCcHandoverBy(e.target.value)} placeholder="Name of person handing over" className="w-full rounded-xl border border-slate-200 bg-slate-50/30 py-2.5 pl-10 pr-4 text-sm font-semibold text-slate-700 outline-none focus:border-emerald-400 focus:ring-4 focus:ring-emerald-500/10 transition-all" />
                </div>
              </div>

              <div className="md:col-span-2 space-y-1.5">
                <label className="text-[11px] font-black uppercase tracking-wider text-slate-400">Notes (Optional)</label>
                <div className="relative">
                  <FileText className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                  <textarea value={ccNote} onChange={e=>setCcNote(e.target.value)} placeholder="Add any specific details here..." rows={2} className="w-full rounded-xl border border-slate-200 bg-slate-50/30 py-2.5 pl-10 pr-4 text-sm font-semibold text-slate-700 outline-none focus:border-emerald-400 focus:ring-4 focus:ring-emerald-500/10 transition-all" />
                </div>
              </div>
            </div>

            <div className="mt-6 flex justify-end">
              <button
                type="button"
                onClick={addCount}
                className="flex items-center gap-2 rounded-xl bg-emerald-600 px-8 py-3 text-sm font-black text-white shadow-lg shadow-emerald-200 hover:bg-emerald-700 active:scale-95 transition-all"
              >
                <Plus className="h-4 w-4" /> Save Entry
              </button>
            </div>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="space-y-6">
          <div className="rounded-2xl border border-slate-200/60 bg-white p-6 shadow-sm">
            <h3 className="text-sm font-black uppercase tracking-wider text-slate-400 mb-6">Cash Summary</h3>
            <div className="space-y-5">
              <div className="flex items-center justify-between p-4 rounded-2xl bg-indigo-50/50 border border-indigo-100/50">
                <div>
                  <p className="text-[11px] font-black text-indigo-400 uppercase tracking-widest">Total Amount</p>
                  <p className="text-2xl font-black text-indigo-700">Rs {ccSummary.amount.toLocaleString()}</p>
                </div>
                <div className="rounded-xl bg-indigo-100 p-2.5 text-indigo-600">
                  <Wallet className="h-6 w-6" />
                </div>
              </div>
              <div className="flex items-center justify-between p-4 rounded-2xl bg-amber-50/50 border border-amber-100/50">
                <div>
                  <p className="text-[11px] font-black text-amber-400 uppercase tracking-widest">Total Entries</p>
                  <p className="text-2xl font-black text-amber-700">{ccSummary.count}</p>
                </div>
                <div className="rounded-xl bg-amber-100 p-2.5 text-amber-600">
                  <History className="h-6 w-6" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* History Table */}
      <div className="rounded-2xl border border-slate-200/60 bg-white shadow-sm overflow-hidden">
        <div className="border-b border-slate-100 p-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-indigo-100 p-2 text-indigo-600">
                <History className="h-5 w-5" />
              </div>
              <h2 className="text-lg font-bold text-slate-800">Count History</h2>
            </div>
            
            <div className="flex flex-wrap items-center gap-3">
              <div className="relative group">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
                <input
                  placeholder="Search counts..."
                  value={ccSearch}
                  onChange={e=>setCcSearch(e.target.value)}
                  className="w-full md:w-64 rounded-xl border border-slate-200 bg-slate-50/50 py-2.5 pl-10 pr-4 text-sm font-medium outline-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-500/10 transition-all"
                />
              </div>
              
              <div className="flex items-center gap-2 border border-slate-200 rounded-xl p-1 bg-slate-50/50">
                <input type="date" value={ccFrom} onChange={e=>setCcFrom(e.target.value)} className="bg-transparent text-xs font-bold text-slate-600 px-2 py-1 outline-none" />
                <span className="text-slate-300">|</span>
                <input type="date" value={ccTo} onChange={e=>setCcTo(e.target.value)} className="bg-transparent text-xs font-bold text-slate-600 px-2 py-1 outline-none" />
              </div>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm border-separate border-spacing-0">
            <thead>
              <tr className="bg-slate-50/50 border-b border-slate-100">
                <th className="px-6 py-4 text-[11px] font-black uppercase tracking-wider text-slate-500">Date</th>
                <th className="px-6 py-4 text-[11px] font-black uppercase tracking-wider text-slate-500 text-right">Amount (PKR)</th>
                <th className="px-6 py-4 text-[11px] font-black uppercase tracking-wider text-slate-500">Receiver</th>
                <th className="px-6 py-4 text-[11px] font-black uppercase tracking-wider text-slate-500">Handover By</th>
                <th className="px-6 py-4 text-[11px] font-black uppercase tracking-wider text-slate-500">Note</th>
                <th className="px-6 py-4 text-[11px] font-black uppercase tracking-wider text-slate-500 text-center">Slip</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {ccList.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-slate-400">
                    <div className="flex flex-col items-center gap-2">
                      <Wallet className="h-10 w-10 opacity-10" />
                      <p className="font-medium">{ccLoading? 'Refreshing data...' : 'No cash counts found.'}</p>
                    </div>
                  </td>
                </tr>
              ) : (
                ccList.map(e => (
                  <tr key={e.id} className="hover:bg-slate-50/50 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2 text-slate-600">
                        <Calendar className="h-3.5 w-3.5 text-slate-400" />
                        <span className="font-semibold">{new Date(e.date).toLocaleDateString()}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <span className="text-sm font-black text-emerald-600">Rs {ccAmountOf(e).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2 text-slate-600">
                        <User className="h-3.5 w-3.5 text-slate-400" />
                        <span className="font-medium">{e.receiver || '—'}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 font-medium text-slate-600">{e.handoverBy || '—'}</td>
                    <td className="px-6 py-4 text-slate-500 max-w-[200px] truncate">{e.note || '—'}</td>
                    <td className="px-6 py-4 text-center">
                      <button
                        onClick={()=>printSlip(e)}
                        className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-slate-50 text-slate-400 hover:bg-indigo-50 hover:text-indigo-600 transition-all active:scale-90 shadow-sm"
                        title="Print Slip"
                      >
                        <Printer className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
            {ccList.length > 0 && (
              <tfoot className="bg-slate-50/30">
                <tr>
                  <td colSpan={6} className="px-6 py-4">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 text-[11px] font-black uppercase tracking-widest text-slate-400">
                      <div className="flex items-center gap-6">
                        <p>Page Total: <span className="text-emerald-600 ml-1">Rs {ccList.reduce((s,e)=> s + ccAmountOf(e), 0).toLocaleString()}</span></p>
                        <div className="h-4 w-px bg-slate-200 hidden md:block" />
                        <p>Grand Total: <span className="text-indigo-600 ml-1">Rs {ccSummary.amount.toLocaleString()}</span></p>
                      </div>
                      
                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2">
                          <label className="text-[10px]">Per Page:</label>
                          <select value={ccLimit} onChange={e=>{ setCcLimit(parseInt(e.target.value)||20); setCcPage(1) }} className="bg-white border border-slate-200 rounded-lg px-2 py-1 outline-none text-slate-600 font-bold">
                            <option value={10}>10</option>
                            <option value={20}>20</option>
                            <option value={50}>50</option>
                          </select>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          <button disabled={ccPage<=1} onClick={()=>setCcPage(p=>Math.max(1,p-1))} className="p-1.5 rounded-lg border border-slate-200 hover:bg-white disabled:opacity-30 transition-all"><ChevronLeft className="h-3.5 w-3.5" /></button>
                          <span className="min-w-[60px] text-center">{ccPage} of {ccTotalPages}</span>
                          <button disabled={ccPage>=ccTotalPages} onClick={()=>setCcPage(p=>Math.min(ccTotalPages,p+1))} className="p-1.5 rounded-lg border border-slate-200 hover:bg-white disabled:opacity-30 transition-all"><ChevronRight className="h-3.5 w-3.5" /></button>
                        </div>
                      </div>
                    </div>
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>

      <Hospital_CashCountSlipDialog open={openSlip} onClose={()=>setOpenSlip(false)} entry={slipEntry} />
      <Toast toast={toast} onClose={()=>setToast(null)} />
    </div>
  )
}

