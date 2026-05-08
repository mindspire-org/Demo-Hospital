import { useEffect, useMemo, useState } from 'react'
import { Calendar, Download, Printer, Receipt, RefreshCw, Search, Wallet, ListChecks, Banknote } from 'lucide-react'
import Lab_CashCountSlipDialog, { type CashCountEntry } from '../../components/lab/lab_CashCountSlipDialog'
import { labApi } from '../../utils/api'
import MiniDashboard from '../../components/common/MiniDashboard'

function todayStr(){ const d=new Date(); const y=d.getFullYear(); const m=String(d.getMonth()+1).padStart(2,'0'); const day=String(d.getDate()).padStart(2,'0'); return `${y}-${m}-${day}` }

export default function Pharmacy_ManagerCashCount(){
  const [date, setDate] = useState<string>(todayStr())
  const [note, setNote] = useState('')
  const [amount, setAmount] = useState<string>('')
  const [receiver, setReceiver] = useState('')
  const [handoverBy, setHandoverBy] = useState('')
  const [list, setList] = useState<CashCountEntry[]>([])
  const [from, setFrom] = useState<string>('')
  const [to, setTo] = useState<string>('')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(20)
  const [totalPages, setTotalPages] = useState(1)
  const [loading, setLoading] = useState(false)
  const [openSlip, setOpenSlip] = useState(false)
  const [slipEntry, setSlipEntry] = useState<CashCountEntry | null>(null)
  const [summary, setSummary] = useState<{ amount: number; count: number }>({ amount: 0, count: 0 })

  async function fetchCounts(p=page, l=limit){
    setLoading(true)
    try {
      const res = await labApi.listCashCounts({ from: from || undefined, to: to || undefined, search: search || undefined, page: p, limit: l })
      const items = Array.isArray(res?.items) ? res.items.map((x:any)=>({
        id: x._id || x.id,
        date: x.date,
        amount: x.amount,
        note: x.note,
        user: x.user,
        receiver: x.receiver,
        handoverBy: x.handoverBy,
      })) : []
      setList(items)
      setTotalPages(Number(res?.totalPages || 1))
    } catch {}
    setLoading(false)
  }
  useEffect(()=>{ fetchCounts(1, limit); setPage(1) }, [from, to, search])
  useEffect(()=>{ fetchCounts(page, limit) }, [page, limit])

  async function fetchSummary(){
    try {
      const s = await labApi.cashCountSummary({ from: from || undefined, to: to || undefined, search: search || undefined })
      setSummary({ amount: Number(s?.amount || 0), count: Number(s?.count || 0) })
    } catch { setSummary({ amount: 0, count: 0 }) }
  }
  useEffect(()=>{ fetchSummary() }, [from, to, search])

  const add = async () => {
    const amt = parseFloat(String(amount||'').trim())
    if (!isFinite(amt) || amt <= 0) { alert('Enter a valid amount'); return }
    let created: any
    try {
      created = await labApi.createCashCount({
        date: date || todayStr(),
        amount: +amt.toFixed(2),
        note: note.trim() || undefined,
        receiver: receiver.trim() || undefined,
        handoverBy: handoverBy.trim() || undefined,
      })
    } catch (e) { alert('Failed to save'); return }
    const entry: CashCountEntry = {
      id: created?._id || crypto.randomUUID(),
      date: created?.date || date || todayStr(),
      amount: created?.amount ?? +amt.toFixed(2),
      note: created?.note || (note.trim() || undefined),
      user: created?.user || 'manager',
      receiver: created?.receiver || (receiver.trim() || undefined),
      handoverBy: created?.handoverBy || (handoverBy.trim() || undefined),
    }
    setSlipEntry(entry)
    setOpenSlip(true)
    // reset
    setAmount(''); setNote(''); setReceiver(''); setHandoverBy(''); setDate(todayStr())
    setPage(1)
    fetchCounts(1, limit)
  }

  const filtered = useMemo(()=> list, [list])

  const amountOf = (e: CashCountEntry) => {
    const a = typeof e.amount === 'number' && isFinite(e.amount) ? Number(e.amount) : 0
    if (a > 0) return a
    return Object.entries(e.counts||{}).reduce((s,[den,qty])=> s + Number(den)*Number(qty||0), 0)
  }
  const print = (e: CashCountEntry) => { setSlipEntry(e); setOpenSlip(true) }

  function exportCSV(){
    const rows = [['Date','Amount','Receiver','Handover By','Note'], ...list.map(e=>[e.date, String(amountOf(e)), e.receiver||'', e.handoverBy||'', e.note||''])]
    const csv = rows.map(r=> r.map(v=>`"${String(v).replace(/"/g,'""')}"`).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href=url; a.download=`lab-cash-counts.csv`; a.click(); setTimeout(()=>URL.revokeObjectURL(url), 1000)
  }

  return (
    <div className="space-y-4 p-4 md:p-6">
      {/* Header */}
      <div className="rounded-2xl bg-linear-to-r from-sky-500 to-sky-600 p-5 text-white shadow-lg shadow-sky-200/50">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-2xl font-bold">Manager Cash Count</h2>
            <div className="mt-0.5 text-sm text-sky-100">Record daily cash handover and print slip</div>
          </div>
          <button
            type="button"
            onClick={() => { fetchCounts(1, limit); setPage(1); fetchSummary() }}
            className="inline-flex items-center gap-2 rounded-lg border border-white/30 bg-white/20 px-3 py-2 text-sm font-medium text-white backdrop-blur-sm hover:bg-white/30"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} /> Refresh
          </button>
        </div>
      </div>

      {/* Mini Dashboard */}
      <MiniDashboard cards={[
        { label: 'Grand Total', value: `PKR ${summary.amount.toFixed(0)}`, icon: Banknote, color: 'bg-emerald-500' },
        { label: 'Entries', value: summary.count, icon: ListChecks, color: 'bg-sky-500' },
        { label: 'Page Total', value: `PKR ${filtered.reduce((s,e)=> s + amountOf(e), 0).toFixed(0)}`, icon: Wallet, color: 'bg-indigo-500' },
        { label: 'Avg Per Entry', value: summary.count ? `PKR ${(summary.amount / summary.count).toFixed(0)}` : 'PKR 0', icon: Receipt, color: 'bg-amber-500' },
      ]} />

      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <div className="flex items-center gap-2 text-sm font-bold text-slate-900">
          <Receipt className="h-4 w-4 text-emerald-700" /> Add Count
        </div>
        <div className="mt-3 grid gap-3 md:grid-cols-6">
          <div className="md:col-span-1">
            <label className="mb-1 block text-xs font-medium text-slate-600">Date</label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input type="date" value={date} onChange={e=>setDate(e.target.value)} className="w-full rounded-md border border-slate-300 bg-white py-2 pl-9 pr-3 text-sm text-slate-900 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200" />
            </div>
          </div>
          <div className="md:col-span-1">
            <label className="mb-1 block text-xs font-medium text-slate-600">Amount (PKR)</label>
            <input value={amount} onChange={e=>setAmount(e.target.value)} inputMode="decimal" placeholder="0" className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200" />
          </div>
          <div className="md:col-span-1">
            <label className="mb-1 block text-xs font-medium text-slate-600">Receiver</label>
            <input value={receiver} onChange={e=>setReceiver(e.target.value)} placeholder="Manager name" className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200" />
          </div>
          <div className="md:col-span-1">
            <label className="mb-1 block text-xs font-medium text-slate-600">Handover By</label>
            <input value={handoverBy} onChange={e=>setHandoverBy(e.target.value)} placeholder="Manager handing over" className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200" />
          </div>
          <div className="md:col-span-2">
            <label className="mb-1 block text-xs font-medium text-slate-600">Note</label>
            <input value={note} onChange={e=>setNote(e.target.value)} placeholder="Optional" className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200" />
          </div>
        </div>
        <div className="mt-3">
          <button onClick={add} className="inline-flex items-center gap-2 rounded-md bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700">
            <Wallet className="h-4 w-4" /> Add Count
          </button>
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <div className="flex flex-wrap items-center gap-2">
          <div className="text-base font-bold text-slate-900">Cash Count History</div>
          <div className="ml-auto flex flex-wrap items-center gap-2">
            <input type="date" value={from} onChange={e=>setFrom(e.target.value)} className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900" />
            <input type="date" value={to} onChange={e=>setTo(e.target.value)} className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900" />
            <div className="relative min-w-[220px] flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input placeholder="Search date, amount, receiver, note" value={search} onChange={e=>setSearch(e.target.value)} className="w-full rounded-md border border-slate-300 bg-white py-2 pl-9 pr-3 text-sm text-slate-900" />
            </div>
            <select value={limit} onChange={e=>{ setLimit(parseInt(e.target.value)||20); setPage(1) }} className="rounded-md border border-slate-300 bg-white px-2 py-2 text-xs text-slate-900">
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={50}>50</option>
            </select>
            <div className="text-xs font-medium text-slate-600">Page {page} / {totalPages}</div>
            <button disabled={page<=1} onClick={()=>setPage(p=>Math.max(1,p-1))} className="rounded-md border border-slate-300 px-3 py-2 text-xs font-semibold disabled:opacity-50">Prev</button>
            <button disabled={page>=totalPages} onClick={()=>setPage(p=>Math.min(totalPages,p+1))} className="rounded-md border border-slate-300 px-3 py-2 text-xs font-semibold disabled:opacity-50">Next</button>
            <button onClick={exportCSV} className="inline-flex items-center gap-2 rounded-md border border-slate-300 px-3 py-2 text-xs font-semibold hover:bg-slate-50">
              <Download className="h-4 w-4" /> CSV
            </button>
          </div>
        </div>

        <div className="mt-3 overflow-x-auto rounded-xl border border-slate-200">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b-2 border-slate-200 bg-slate-50 text-xs font-extrabold uppercase tracking-wider text-slate-500">
              <tr>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3 text-right">Amount</th>
                <th className="px-4 py-3">Receiver</th>
                <th className="px-4 py-3">Handover By</th>
                <th className="px-4 py-3">Note</th>
                <th className="px-4 py-3 text-right">Slip</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.length === 0 && (
                <tr><td colSpan={6} className="px-4 py-10 text-center text-slate-500">{loading? 'Loading…' : 'No records yet.'}</td></tr>
              )}
              {filtered.map((e, idx) => (
                <tr key={`${e.id}-${idx}`} className="hover:bg-slate-50/60">
                  <td className="px-4 py-3 text-slate-700 whitespace-nowrap">{new Date(e.date).toLocaleDateString()}</td>
                  <td className="px-4 py-3 text-right font-semibold tabular-nums text-slate-900">{amountOf(e).toFixed(2)}</td>
                  <td className="px-4 py-3 text-slate-700">{e.receiver || '-'}</td>
                  <td className="px-4 py-3 text-slate-700">{e.handoverBy || '-'}</td>
                  <td className="px-4 py-3 text-slate-600">{e.note || ''}</td>
                  <td className="px-4 py-3 text-right">
                    <button onClick={()=>print(e)} className="inline-flex items-center gap-2 rounded-md border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50">
                      <Printer className="h-4 w-4" /> Slip
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t border-slate-200 bg-slate-50 text-xs font-bold text-slate-700">
                <td className="px-4 py-3" colSpan={6}>Page Total — PKR {filtered.reduce((s,e)=> s + amountOf(e), 0).toFixed(2)} | Grand Total — PKR {summary.amount.toFixed(2)} (Entries: {summary.count})</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      <Lab_CashCountSlipDialog open={openSlip} onClose={()=>setOpenSlip(false)} entry={slipEntry} />
    </div>
  )
}
