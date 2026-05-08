import { useEffect, useState } from 'react'
import { ArrowDownLeft, ArrowUpRight, Download, FileText, Plus, RefreshCw, Search, ListChecks, Wallet, History } from 'lucide-react'
import Lab_CashMovementSlipDialog, { type CashMovementEntry } from '../../components/lab/lab_CashMovementSlipDialog'
import DatePickerModern from '../../components/DatePickerModern'
import { labApi } from '../../utils/api'

function todayStr(){ const d=new Date(); const y=d.getFullYear(); const m=String(d.getMonth()+1).padStart(2,'0'); const day=String(d.getDate()).padStart(2,'0'); return `${y}-${m}-${day}` }

export default function Lab_PayInOut(){
  const [date, setDate] = useState<string>(todayStr())
  const [type, setType] = useState<'IN'|'OUT'>('IN')
  const [category, setCategory] = useState('')
  const [amount, setAmount] = useState<string>('')
  const [note, setNote] = useState('')
  const [receiver, setReceiver] = useState('')
  const [handoverBy, setHandoverBy] = useState('')
  const [list, setList] = useState<CashMovementEntry[]>([])
  const [from] = useState<string>('')
  const [to] = useState<string>('')
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState<'Any'|'IN'|'OUT'>('Any')
  const [page, setPage] = useState(1)
  const [limit] = useState(20)
  const [totalPages, setTotalPages] = useState(1)
  const [loading, setLoading] = useState(false)
  const [summary, setSummary] = useState<{IN:number; OUT:number; NET:number}>({ IN: 0, OUT: 0, NET: 0 })
  const [openSlip, setOpenSlip] = useState(false)
  const [slipEntry, setSlipEntry] = useState<CashMovementEntry | null>(null)

  async function fetchMovements(p=page, l=limit){
    setLoading(true)
    try {
      const res: any = await labApi.listCashMovements({ from: from || undefined, to: to || undefined, search: search || undefined, type: typeFilter==='Any'? undefined : typeFilter, page: p, limit: l })
      const items: any[] = Array.isArray(res?.items) ? res.items.map((x:any)=>({ id: x._id || x.id, date: x.date, type: x.type, category: x.category, amount: x.amount, note: x.note, user: x.user, receiver: x.receiver, handoverBy: x.handoverBy })) : []
      setList(items)
      setTotalPages(Number(res?.totalPages || 1))
    } catch {}
    setLoading(false)
  }
  async function fetchSummary(){
    try {
      const s: any = await labApi.cashMovementSummary({ from: from || undefined, to: to || undefined, type: typeFilter==='Any'? undefined : typeFilter })
      const IN = Number(s?.inAmount || 0); const OUT = Number(s?.outAmount || 0)
      setSummary({ IN, OUT, NET: IN - OUT })
    } catch { setSummary({ IN: 0, OUT: 0, NET: 0 }) }
  }
  useEffect(()=>{ fetchMovements(1, limit); setPage(1); fetchSummary() }, [from, to, search, typeFilter])
  useEffect(()=>{ fetchMovements(page, limit) }, [page, limit])

  const add = async () => {
    const amt = parseFloat(String(amount||'').trim()); if (!isFinite(amt) || amt <= 0) { alert('Enter a valid amount'); return }
    let created: any
    try { created = await labApi.createCashMovement({ date: date || todayStr(), type, category: category.trim() || '-', amount: +amt.toFixed(2), note: note.trim() || undefined, receiver: receiver.trim() || undefined, handoverBy: handoverBy.trim() || undefined }) } 
    catch (e: any){ alert('Failed to save'); return }
    setPage(1); fetchMovements(1, limit); fetchSummary(); setCategory(''); setAmount(''); setNote(''); setReceiver(''); setHandoverBy(''); setType('IN'); setDate(todayStr())
    setSlipEntry({ id: created?._id || crypto.randomUUID(), date: created?.date || date || todayStr(), type: created?.type || type, category: created?.category || (category.trim() || '-'), amount: created?.amount ?? +amt.toFixed(2), note: created?.note || (note.trim() || undefined), user: created?.user || 'admin', receiver: created?.receiver || (receiver.trim() || undefined), handoverBy: created?.handoverBy || (handoverBy.trim() || undefined) })
    setOpenSlip(true)
  }

  const totals = summary; const print = (e: CashMovementEntry) => { setSlipEntry(e); setOpenSlip(true) }
  function exportCSV(){
    const rows = [['Date','Type','Category','Amount','Receiver','Handover By','Note'], ...list.map(e=>[e.date, e.type, e.category, String(e.amount), e.receiver||'', e.handoverBy||'', e.note||''])]
    const csv = rows.map(r=> r.map(v=>`"${String(v).replace(/"/g,'""')}"`).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' }); const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href=url; a.download=`lab-cash-movements.csv`; a.click(); setTimeout(()=>URL.revokeObjectURL(url), 1000)
  }

  return (
    <div className="space-y-6 p-1">
      <div className="relative overflow-hidden rounded-3xl bg-linear-to-r from-amber-600 via-orange-700 to-rose-800 p-8 shadow-2xl text-white">
        <div className="absolute top-0 right-0 -mr-20 -mt-20 h-80 w-80 rounded-full bg-white/10 blur-3xl" />
        <div className="absolute bottom-0 left-0 -ml-20 -mb-20 h-64 w-64 rounded-full bg-amber-500/20 blur-3xl" />
        <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center gap-5">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white/20 backdrop-blur-md shadow-inner ring-1 ring-white/30 transition-transform hover:rotate-3"><Wallet className="h-8 w-8 text-white" /></div>
            <div><h1 className="text-3xl font-black tracking-tight text-white">Pay In / Pay Out</h1><p className="mt-1 text-sm font-medium text-amber-100 opacity-90">Record and monitor laboratory cash movements</p></div>
          </div>
          <div className="flex flex-wrap items-center gap-3">
             <button onClick={() => { fetchMovements(1, limit); setPage(1); fetchSummary() }} disabled={loading} className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10 backdrop-blur-md hover:bg-white/20 transition-all active:scale-90 ring-1 ring-white/10 shadow-lg disabled:opacity-50"><RefreshCw className={`h-5 w-5 ${loading ? 'animate-spin' : ''}`} /></button>
             <button onClick={exportCSV} className="flex items-center gap-2 rounded-2xl bg-white/10 px-6 py-3 text-sm font-black uppercase tracking-widest backdrop-blur-md hover:bg-white/20 transition-all active:scale-95 ring-1 ring-white/10 shadow-lg"><Download className="h-4 w-4" /> Export CSV</button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: 'Total Pay In', value: totals.IN, icon: ArrowDownLeft, gradient: 'from-emerald-500 to-teal-600', color: 'text-emerald-600', bg: 'bg-emerald-50', unit: 'Rs' },
          { label: 'Total Pay Out', value: totals.OUT, icon: ArrowUpRight, gradient: 'from-rose-500 to-red-600', color: 'text-rose-600', bg: 'bg-rose-50', unit: 'Rs' },
          { label: 'Net Balance', value: totals.NET, icon: Wallet, gradient: totals.NET >= 0 ? 'from-amber-500 to-orange-600' : 'from-rose-500 to-red-600', color: totals.NET >= 0 ? 'text-amber-600' : 'text-rose-600', bg: totals.NET >= 0 ? 'bg-amber-50' : 'bg-rose-50', unit: 'Rs' },
          { label: 'Transactions', value: list.length, icon: ListChecks, gradient: 'from-indigo-500 to-violet-600', color: 'text-indigo-600', bg: 'bg-indigo-50', unit: '#' },
        ].map((card, i) => (
          <div key={i} className="group relative overflow-hidden rounded-2xl border border-slate-200/60 bg-white p-6 shadow-sm transition-all hover:shadow-xl hover:-translate-y-1">
            <div className={`absolute -right-4 -top-4 h-24 w-24 rounded-full bg-linear-to-br ${card.gradient} opacity-0 group-hover:opacity-10 transition-opacity duration-500`} />
            <div className="relative flex items-center justify-between">
              <div><p className="text-[11px] font-black uppercase tracking-widest text-slate-400">{card.label}</p><p className="mt-1 text-2xl font-black text-slate-900">{card.unit === 'Rs' ? `Rs ${card.value.toLocaleString()}` : card.value}</p></div>
              <div className={`flex h-12 w-12 items-center justify-center rounded-2xl ${card.bg} ${card.color} shadow-sm group-hover:scale-110 transition-transform duration-500`}><card.icon className="h-6 w-6" /></div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        <div className="lg:col-span-1">
          <div className="sticky top-24 space-y-6 rounded-3xl border border-slate-200/60 bg-white p-7 shadow-sm">
            <div className="flex items-center gap-4 border-b border-slate-100 pb-5">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-100 text-amber-600 shadow-inner"><Plus className="h-6 w-6" /></div>
              <h2 className="text-xl font-black text-slate-800 tracking-tight">New Transaction</h2>
            </div>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5"><label className="text-[11px] font-black uppercase tracking-widest text-slate-400 ml-1">Date</label><DatePickerModern value={date} onChange={v => setDate(v)} /></div>
                <div className="space-y-1.5"><label className="text-[11px] font-black uppercase tracking-widest text-slate-400 ml-1">Type</label><select value={type} onChange={e => setType(e.target.value as any)} className="w-full rounded-2xl border border-slate-200 bg-slate-50/50 py-3 px-4 text-sm font-bold text-slate-700 outline-none focus:border-amber-400 focus:ring-4 focus:ring-amber-500/5 transition-all shadow-inner"><option value="IN">Pay In (+)</option><option value="OUT">Pay Out (-)</option></select></div>
              </div>
              <div className="space-y-1.5"><label className="text-[11px] font-black uppercase tracking-widest text-slate-400 ml-1">Category</label><input value={category} onChange={e => setCategory(e.target.value)} placeholder="e.g. Petty Cash, Tea, etc." className="w-full rounded-2xl border border-slate-200 bg-slate-50/50 py-3 px-4 text-sm font-bold text-slate-700 outline-none focus:border-amber-400 focus:ring-4 focus:ring-amber-500/5 transition-all shadow-inner placeholder:text-slate-300" /></div>
              <div className="space-y-1.5"><label className="text-[11px] font-black uppercase tracking-widest text-slate-400 ml-1">Amount (PKR)</label><input type="number" value={amount} onChange={e => setAmount(e.target.value)} placeholder="0.00" className="w-full rounded-2xl border border-slate-200 bg-slate-50/50 py-3 px-4 text-sm font-black text-slate-700 outline-none focus:border-amber-400 focus:ring-4 focus:ring-amber-500/5 transition-all shadow-inner placeholder:text-slate-300" /></div>
              <div className="space-y-1.5"><label className="text-[11px] font-black uppercase tracking-widest text-slate-400 ml-1">Receiver</label><input value={receiver} onChange={e => setReceiver(e.target.value)} placeholder="Name of receiver" className="w-full rounded-2xl border border-slate-200 bg-slate-50/50 py-3 px-4 text-sm font-bold text-slate-700 outline-none focus:border-amber-400 focus:ring-4 focus:ring-amber-500/5 transition-all shadow-inner placeholder:text-slate-300" /></div>
              <div className="space-y-1.5"><label className="text-[11px] font-black uppercase tracking-widest text-slate-400 ml-1">Handover By</label><input value={handoverBy} onChange={e => setHandoverBy(e.target.value)} placeholder="Name of person handing over" className="w-full rounded-2xl border border-slate-200 bg-slate-50/50 py-3 px-4 text-sm font-bold text-slate-700 outline-none focus:border-amber-400 focus:ring-4 focus:ring-amber-500/5 transition-all shadow-inner placeholder:text-slate-300" /></div>
              <div className="space-y-1.5"><label className="text-[11px] font-black uppercase tracking-widest text-slate-400 ml-1">Note (Optional)</label><textarea value={note} onChange={e => setNote(e.target.value)} placeholder="Additional details..." rows={2} className="w-full rounded-2xl border border-slate-200 bg-slate-50/50 py-3 px-4 text-sm font-bold text-slate-700 outline-none focus:border-amber-400 focus:ring-4 focus:ring-amber-500/5 transition-all shadow-inner placeholder:text-slate-300" /></div>
              <div className="pt-4"><button onClick={add} className="w-full rounded-2xl bg-linear-to-r from-amber-600 to-orange-700 py-4 text-sm font-black uppercase tracking-widest text-white shadow-xl shadow-amber-200 hover:shadow-amber-300 hover:-translate-y-0.5 active:translate-y-0 active:scale-95 transition-all">Add Entry</button></div>
            </div>
          </div>
        </div>

        <div className="lg:col-span-2 space-y-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-5 rounded-3xl border border-slate-200/60 bg-white p-5 shadow-sm">
             <div className="flex items-center gap-3"><div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600"><History className="h-5 w-5" /></div><h2 className="text-xl font-black text-slate-800 tracking-tight">Recent Activity</h2></div>
             <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
                <div className="relative flex-1 md:w-64"><Search className="absolute left-4 top-1/2 h-4.5 w-4.5 -translate-y-1/2 text-slate-400" /><input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search..." className="w-full rounded-2xl border border-slate-200 bg-slate-50/50 py-3 pl-11 pr-5 text-sm font-bold text-slate-700 outline-none focus:border-amber-400 focus:ring-4 focus:ring-amber-500/5 transition-all shadow-inner" /></div>
                <select value={typeFilter} onChange={e => setTypeFilter(e.target.value as any)} className="rounded-xl border border-slate-200 bg-white py-3 px-4 text-xs font-black uppercase tracking-widest text-slate-500 outline-none hover:bg-slate-50 transition-all cursor-pointer"><option value="Any">All Types</option><option value="IN">Pay In</option><option value="OUT">Pay Out</option></select>
             </div>
          </div>
          <div className="overflow-hidden rounded-3xl border border-slate-200/60 bg-white shadow-sm">
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm border-separate border-spacing-0">
                <thead><tr className="bg-slate-50/80 border-b border-slate-200"><th className="px-6 py-5 text-left text-[11px] font-black uppercase tracking-widest text-slate-400">Date & Type</th><th className="px-6 py-5 text-left text-[11px] font-black uppercase tracking-widest text-slate-400">Category</th><th className="px-6 py-5 text-right text-[11px] font-black uppercase tracking-widest text-slate-400">Amount</th><th className="px-6 py-5 text-left text-[11px] font-black uppercase tracking-widest text-slate-400">Handover Info</th><th className="px-6 py-5 text-right text-[11px] font-black uppercase tracking-widest text-slate-400">Action</th></tr></thead>
                <tbody className="divide-y divide-slate-100">
                  {loading ? (<tr><td colSpan={5} className="px-6 py-24 text-center"><RefreshCw className="h-10 w-10 animate-spin text-amber-500 opacity-40 mx-auto" /><p className="text-xs font-black text-slate-400 mt-4 uppercase tracking-widest">Loading history...</p></td></tr>) : list.length === 0 ? (<tr><td colSpan={5} className="px-6 py-24 text-center text-slate-300 font-black uppercase tracking-widest opacity-20"><Wallet className="h-14 w-14 mx-auto mb-4" />No records found</td></tr>) : (
                    list.map((e: any) => (
                      <tr key={e.id} className="group hover:bg-slate-50/50 transition-colors">
                        <td className="px-6 py-5"><div className="flex items-center gap-4"><div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl transition-all shadow-inner ${e.type === 'IN' ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>{e.type === 'IN' ? <ArrowDownLeft className="h-5 w-5" /> : <ArrowUpRight className="h-5 w-5" />}</div><div><div className="font-black text-slate-900 text-sm leading-tight">{new Date(e.date).toLocaleDateString()}</div><div className={`mt-0.5 text-[10px] font-black uppercase tracking-widest ${e.type === 'IN' ? 'text-emerald-500' : 'text-rose-500'}`}>{e.type === 'IN' ? 'Incoming Cash' : 'Outgoing Cash'}</div></div></div></td>
                        <td className="px-6 py-5"><div className="text-xs font-black text-slate-700 tracking-tight uppercase">{e.category}</div>{e.note && <div className="text-[10px] text-slate-400 font-medium italic mt-0.5 truncate max-w-[150px]">{e.note}</div>}</td>
                        <td className="px-6 py-5 text-right"><div className={`text-sm font-black tabular-nums ${e.type === 'IN' ? 'text-emerald-600' : 'text-rose-600'}`}>{e.type === 'IN' ? '+' : '-'} Rs {e.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div></td>
                        <td className="px-6 py-5"><div className="text-xs font-bold text-slate-600">Rec: {e.receiver || '-'}</div><div className="text-[10px] text-slate-400 font-bold uppercase tracking-tighter">H/O: {e.handoverBy || '-'}</div></td>
                        <td className="px-6 py-5 text-right"><button onClick={() => print(e)} className="p-3 rounded-2xl bg-slate-50 text-slate-400 hover:bg-white hover:text-indigo-600 hover:shadow-lg transition-all active:scale-90" title="Print Slip"><FileText className="h-5 w-5" /></button></td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
          <div className="flex items-center justify-between px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400 bg-white rounded-3xl border border-slate-200/60 shadow-sm">
            <button disabled={page<=1} onClick={()=>setPage(p=>Math.max(1,p-1))} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 disabled:opacity-30 transition-all">Prev</button>
            <span>Page {page} of {totalPages}</span>
            <button disabled={page>=totalPages} onClick={()=>setPage(p=>p+1)} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 disabled:opacity-30 transition-all">Next</button>
          </div>
        </div>
      </div>
      <Lab_CashMovementSlipDialog open={openSlip} onClose={() => setOpenSlip(false)} entry={slipEntry} />
    </div>
  )
}
