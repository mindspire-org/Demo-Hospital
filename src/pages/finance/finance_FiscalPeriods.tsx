import { useEffect, useState } from 'react'
import { financeApi } from '../../utils/api'
import Toast from '../../components/ui/Toast'

export default function Finance_FiscalPeriods() {
  const [periods, setPeriods] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

  // Create form
  const [name, setName] = useState('')
  const [type, setType] = useState<'yearly' | 'quarterly' | 'monthly'>('yearly')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')

  async function fetchPeriods() {
    setLoading(true)
    try {
      const res = await financeApi.listFiscalPeriods()
      setPeriods(Array.isArray(res) ? res : [])
    } catch { setPeriods([]) }
    finally { setLoading(false) }
  }

  useEffect(() => { fetchPeriods() }, [])

  async function handleCreate() {
    if (!name || !startDate || !endDate) {
      setToast({ type: 'error', message: 'Name, start date, and end date are required' })
      return
    }
    try {
      await financeApi.createFiscalPeriod({ name, type, startDate, endDate })
      setToast({ type: 'success', message: 'Fiscal period created' })
      setName(''); setStartDate(''); setEndDate('')
      fetchPeriods()
    } catch (e: any) {
      setToast({ type: 'error', message: e?.message || 'Failed to create' })
    }
  }

  async function handleClose(id: string) {
    if (!confirm('Close this period? No more vouchers can be posted to it.')) return
    try {
      await financeApi.closeFiscalPeriod(id)
      setToast({ type: 'success', message: 'Period closed' })
      fetchPeriods()
    } catch (e: any) {
      setToast({ type: 'error', message: e?.message || 'Failed to close' })
    }
  }

  async function handleYearEndClose(id: string) {
    if (!confirm('Perform year-end close? This will zero all Income/Expense accounts and transfer net profit to General Fund. This action creates a closing Journal Voucher.')) return
    try {
      const res = await financeApi.yearEndCloseFiscalPeriod(id)
      setToast({ type: 'success', message: `Year-end close complete. Net profit: PKR ${Number(res.netProfit || 0).toLocaleString()}. Accounts closed: ${res.accountsClosed || 0}` })
      fetchPeriods()
    } catch (e: any) {
      setToast({ type: 'error', message: e?.message || 'Failed to perform year-end close' })
    }
  }

  async function handleLock(id: string) {
    if (!confirm('Lock this period permanently? This cannot be undone.')) return
    try {
      await financeApi.lockFiscalPeriod(id)
      setToast({ type: 'success', message: 'Period locked permanently' })
      fetchPeriods()
    } catch (e: any) {
      setToast({ type: 'error', message: e?.message || 'Failed to lock' })
    }
  }

  async function handleReopen(id: string) {
    if (!confirm('Reopen this period? This will reverse the year-end closing entry.')) return
    try {
      await financeApi.reopenFiscalPeriod(id)
      setToast({ type: 'success', message: 'Period reopened' })
      fetchPeriods()
    } catch (e: any) {
      setToast({ type: 'error', message: e?.message || 'Failed to reopen' })
    }
  }

  const statusColor: Record<string, string> = {
    open: 'bg-emerald-100 text-emerald-700',
    closed: 'bg-amber-100 text-amber-700',
    locked: 'bg-rose-100 text-rose-700',
  }

  return (
    <div className="w-full p-3 sm:p-4 space-y-4">
      <Toast toast={toast} onClose={() => setToast(null)} />

      <div className="text-xl font-semibold text-slate-800">Fiscal Periods</div>

      {/* Create form */}
      <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-3">
        <div className="text-sm font-semibold text-slate-600">Create New Period</div>
        <div className="grid gap-3 sm:grid-cols-5">
          <input value={name} onChange={e => setName(e.target.value)} placeholder="Period name (e.g. FY 2025-26)" className="rounded-md border border-slate-300 px-3 py-2 text-sm" />
          <select value={type} onChange={e => setType(e.target.value as any)} className="rounded-md border border-slate-300 px-3 py-2 text-sm">
            <option value="yearly">Yearly</option>
            <option value="quarterly">Quarterly</option>
            <option value="monthly">Monthly</option>
          </select>
          <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="rounded-md border border-slate-300 px-3 py-2 text-sm" />
          <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="rounded-md border border-slate-300 px-3 py-2 text-sm" />
          <button onClick={handleCreate} className="rounded-md bg-navy px-4 py-2 text-sm font-medium text-white hover:opacity-90">Create</button>
        </div>
      </div>

      {/* Period list */}
      <div className="space-y-3">
        {periods.map(p => (
          <div key={p._id} className="rounded-xl border border-slate-200 bg-white p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="font-semibold text-slate-800">{p.name}</div>
                <div className="mt-1 text-xs text-slate-500">
                  {p.startDate} → {p.endDate} &nbsp;|&nbsp; Type: {p.type}
                  {p.closedBy && <> &nbsp;|&nbsp; Closed by: {p.closedBy} &nbsp;|&nbsp; {p.closedAt?.slice(0, 10)}</>}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className={`rounded px-2 py-1 text-xs font-medium ${statusColor[p.status] || 'bg-slate-100 text-slate-700'}`}>{p.status.toUpperCase()}</span>
                {p.status === 'open' && p.type === 'yearly' && (
                  <button onClick={() => handleYearEndClose(p._id)} className="rounded bg-rose-600 px-3 py-1 text-xs font-medium text-white hover:bg-rose-700">Year-End Close</button>
                )}
                {p.status === 'open' && (
                  <button onClick={() => handleClose(p._id)} className="rounded bg-amber-500 px-3 py-1 text-xs font-medium text-white hover:bg-amber-600">Close</button>
                )}
                {p.status === 'closed' && (
                  <>
                    <button onClick={() => handleLock(p._id)} className="rounded bg-rose-600 px-3 py-1 text-xs font-medium text-white hover:bg-rose-700">Lock</button>
                    <button onClick={() => handleReopen(p._id)} className="rounded bg-emerald-500 px-3 py-1 text-xs font-medium text-white hover:bg-emerald-600">Reopen</button>
                  </>
                )}
              </div>
            </div>
          </div>
        ))}
        {periods.length === 0 && !loading && (
          <div className="rounded-xl border border-slate-200 bg-white p-8 text-center text-slate-400">No fiscal periods created yet</div>
        )}
      </div>
    </div>
  )
}
