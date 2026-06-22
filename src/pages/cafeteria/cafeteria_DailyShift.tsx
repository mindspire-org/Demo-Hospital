import { useState, useEffect, useCallback } from 'react'
import { Clock4, Loader2, Wallet, TrendingUp, ShoppingBag, ArrowRightLeft, CalendarDays, Banknote, CreditCard, Building2, UtensilsCrossed, Package, Bike } from 'lucide-react'
import { cafeteriaApi } from '../../features/cafeteria'
import DatePicker from '../../components/cafeteria/DatePicker'

export default function Cafeteria_DailyShift() {
  const [todayShift, setTodayShift] = useState<any>(null)
  const [shifts, setShifts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const [openCash, setOpenCash] = useState(0)
  const [openNotes, setOpenNotes] = useState('')
  const [closeCash, setCloseCash] = useState(0)
  const [closeNotes, setCloseNotes] = useState('')

  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [t, h] = await Promise.all([
        cafeteriaApi.getTodayShift(),
        cafeteriaApi.listShifts({ from: from || undefined, to: to || undefined, limit: 30 }),
      ])
      setTodayShift(t)
      setShifts(h?.items || [])
      if (t?.status === 'open') {
        setCloseCash(t.expectedCash || 0)
      }
    } catch {} finally { setLoading(false) }
  }, [from, to])

  useEffect(() => { load() }, [load])

  async function handleOpen() {
    setActionLoading(true)
    setError('')
    try {
      await cafeteriaApi.openShift({ openingCash: openCash, notes: openNotes })
      setSuccess('Shift opened successfully')
      setOpenCash(0)
      setOpenNotes('')
      setTimeout(() => setSuccess(''), 3000)
      load()
    } catch (err: any) { setError(err?.message || 'Failed to open shift') } finally { setActionLoading(false) }
  }

  async function handleClose() {
    setActionLoading(true)
    setError('')
    try {
      await cafeteriaApi.closeShift({ closingCash: closeCash, notes: closeNotes })
      setSuccess('Shift closed successfully')
      setCloseCash(0)
      setCloseNotes('')
      setTimeout(() => setSuccess(''), 3000)
      load()
    } catch (err: any) { setError(err?.message || 'Failed to close shift') } finally { setActionLoading(false) }
  }

  const isOpen = todayShift?.status === 'open'

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-slate-100">Daily Opening / Closing</h1>
          <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">Manage daily cash register shifts</p>
        </div>
        <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-400 shadow-sm dark:border-slate-700 dark:bg-slate-800">
          <Clock4 className="h-4 w-4" />
        </div>
      </div>

      {error && <div className="rounded-xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-600 dark:bg-red-950/20 dark:text-red-400">{error}</div>}
      {success && <div className="rounded-xl bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-600 dark:bg-emerald-950/20 dark:text-emerald-400">{success}</div>}

      {loading ? (
        <div className="h-48 animate-pulse rounded-2xl border border-slate-100 bg-slate-50 dark:border-slate-800 dark:bg-slate-800" />
      ) : !todayShift ? (
        <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex flex-col items-center text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400">
              <Wallet className="h-6 w-6" />
            </div>
            <h3 className="mt-3 text-base font-bold text-slate-800 dark:text-slate-200">No shift open today</h3>
            <p className="mt-1 text-sm text-slate-400">Open a new shift to start tracking sales</p>
          </div>
          <div className="mt-5 max-w-sm space-y-3">
            <div>
              <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-slate-400">Opening Cash (Rs)</label>
              <input type="number" step="0.01" value={openCash} onChange={e => setOpenCash(Number(e.target.value))} className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium shadow-sm transition-all focus:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-400/15 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100" placeholder="0" />
            </div>
            <div>
              <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-slate-400">Notes</label>
              <input type="text" value={openNotes} onChange={e => setOpenNotes(e.target.value)} className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium shadow-sm transition-all focus:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-400/15 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100" placeholder="Optional notes" />
            </div>
            <button onClick={handleOpen} disabled={actionLoading} className="flex w-full items-center justify-center gap-2 rounded-xl bg-orange-600 px-4 py-3 text-sm font-bold text-white shadow-lg shadow-orange-600/20 transition-all hover:bg-orange-700 active:scale-[0.98] disabled:opacity-50">
              {actionLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wallet className="h-4 w-4" />}
              Open Shift
            </button>
          </div>
        </div>
      ) : (
        <>
          {/* Today's Shift Summary */}
          <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${isOpen ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400' : 'bg-slate-100 text-slate-400 dark:bg-slate-800'}`}>
                  <Clock4 className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">Shift - {todayShift.date}</h3>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    {isOpen ? 'Open' : 'Closed'} - Opened at {new Date(todayShift.openedAt).toLocaleTimeString()}
                  </p>
                </div>
              </div>
              <span className={`rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-wider ${isOpen ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/20 dark:text-emerald-400' : 'bg-slate-100 text-slate-400 dark:bg-slate-800'}`}>
                {isOpen ? 'Live' : 'Closed'}
              </span>
            </div>

            <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
              {[
                { label: 'Opening Cash', value: `Rs ${Number(todayShift.openingCash || 0).toLocaleString()}`, icon: Wallet, color: 'text-sky-600 bg-sky-50 dark:bg-sky-950/20 dark:text-sky-400' },
                { label: 'Total Revenue', value: `Rs ${Number(todayShift.totalRevenue || 0).toLocaleString()}`, icon: TrendingUp, color: 'text-orange-600 bg-orange-50 dark:bg-orange-950/20 dark:text-orange-400' },
                { label: 'Total Sales', value: String(todayShift.salesCount || 0), icon: ShoppingBag, color: 'text-violet-600 bg-violet-50 dark:bg-violet-950/20 dark:text-violet-400' },
                { label: 'Total Profit', value: `Rs ${Number(todayShift.totalProfit || 0).toLocaleString()}`, icon: ArrowRightLeft, color: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-950/20 dark:text-emerald-400' },
              ].map(s => {
                const Icon = s.icon
                return (
                  <div key={s.label} className="rounded-xl border border-slate-50 p-3 dark:border-slate-800/50">
                    <div className={`inline-flex h-8 w-8 items-center justify-center rounded-lg ${s.color}`}>
                      <Icon className="h-4 w-4" />
                    </div>
                    <p className="mt-2 text-lg font-extrabold text-slate-900 dark:text-slate-100">{s.value}</p>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{s.label}</p>
                  </div>
                )
              })}
            </div>

            {/* Payment Breakdown */}
            <div className="mt-4 grid grid-cols-3 gap-3">
              {[
                { label: 'Cash', value: todayShift.paymentBreakdown?.Cash || 0, icon: Banknote, color: 'text-emerald-600 dark:text-emerald-400' },
                { label: 'Card', value: todayShift.paymentBreakdown?.Card || 0, icon: CreditCard, color: 'text-sky-600 dark:text-sky-400' },
                { label: 'Bank', value: todayShift.paymentBreakdown?.Bank || 0, icon: Building2, color: 'text-violet-600 dark:text-violet-400' },
              ].map(p => {
                const Icon = p.icon
                return (
                  <div key={p.label} className="flex items-center gap-2 rounded-xl bg-slate-50 px-3 py-2.5 dark:bg-slate-800/50">
                    <Icon className={`h-4 w-4 ${p.color}`} />
                    <div>
                      <p className="text-xs font-bold text-slate-800 dark:text-slate-200">Rs {Number(p.value).toLocaleString()}</p>
                      <p className="text-[10px] font-medium text-slate-400">{p.label}</p>
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Order Type Breakdown */}
            <div className="mt-3 grid grid-cols-3 gap-3">
              {[
                { label: 'Dining', value: todayShift.orderTypeBreakdown?.Dining || 0, icon: UtensilsCrossed, color: 'text-emerald-600 dark:text-emerald-400' },
                { label: 'Take Away', value: todayShift.orderTypeBreakdown?.['Take Away'] || 0, icon: Package, color: 'text-sky-600 dark:text-sky-400' },
                { label: 'Delivery', value: todayShift.orderTypeBreakdown?.Delivery || 0, icon: Bike, color: 'text-violet-600 dark:text-violet-400' },
              ].map(o => {
                const Icon = o.icon
                return (
                  <div key={o.label} className="flex items-center gap-2 rounded-xl bg-slate-50 px-3 py-2.5 dark:bg-slate-800/50">
                    <Icon className={`h-4 w-4 ${o.color}`} />
                    <div>
                      <p className="text-xs font-bold text-slate-800 dark:text-slate-200">{o.value} orders</p>
                      <p className="text-[10px] font-medium text-slate-400">{o.label}</p>
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Close Shift Form */}
            {isOpen && (
              <div className="mt-5 rounded-xl border border-orange-100 bg-orange-50/50 p-4 dark:border-orange-900/20 dark:bg-orange-950/10">
                <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200">Close Shift</h4>
                <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div>
                    <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-slate-400">Closing Cash (Rs)</label>
                    <input type="number" step="0.01" value={closeCash} onChange={e => setCloseCash(Number(e.target.value))} className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium shadow-sm transition-all focus:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-400/15 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100" />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-slate-400">Notes</label>
                    <input type="text" value={closeNotes} onChange={e => setCloseNotes(e.target.value)} className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium shadow-sm transition-all focus:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-400/15 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100" placeholder="Optional" />
                  </div>
                </div>
                <div className="mt-3 flex items-center justify-between rounded-lg bg-white px-4 py-2.5 text-sm dark:bg-slate-800">
                  <span className="font-medium text-slate-500">Expected Cash: <span className="font-bold text-slate-800 dark:text-slate-200">Rs {Number(todayShift.expectedCash || 0).toLocaleString()}</span></span>
                  {closeCash > 0 && (
                    <span className={`font-bold ${Math.abs(closeCash - (todayShift.expectedCash || 0)) < 1 ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'}`}>
                      Diff: Rs {(closeCash - (todayShift.expectedCash || 0)).toFixed(2)}
                    </span>
                  )}
                </div>
                <button onClick={handleClose} disabled={actionLoading} className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-slate-800 px-4 py-3 text-sm font-bold text-white shadow-lg transition-all hover:bg-slate-900 active:scale-[0.98] disabled:opacity-50 dark:bg-slate-700 dark:hover:bg-slate-600">
                  {actionLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Clock4 className="h-4 w-4" />}
                  Close Shift
                </button>
              </div>
            )}

            {!isOpen && todayShift.closingCash > 0 && (
              <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
                <div className="rounded-xl bg-slate-50 px-4 py-3 dark:bg-slate-800/50">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Closing Cash</p>
                  <p className="mt-0.5 text-lg font-extrabold text-slate-900 dark:text-slate-100">Rs {Number(todayShift.closingCash).toLocaleString()}</p>
                </div>
                <div className="rounded-xl bg-slate-50 px-4 py-3 dark:bg-slate-800/50">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Expected Cash</p>
                  <p className="mt-0.5 text-lg font-extrabold text-slate-900 dark:text-slate-100">Rs {Number(todayShift.expectedCash).toLocaleString()}</p>
                </div>
                <div className={`rounded-xl px-4 py-3 ${Math.abs(todayShift.cashDifference) < 1 ? 'bg-emerald-50 dark:bg-emerald-950/20' : 'bg-amber-50 dark:bg-amber-950/20'}`}>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Cash Difference</p>
                  <p className={`mt-0.5 text-lg font-extrabold ${Math.abs(todayShift.cashDifference) < 1 ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'}`}>Rs {Number(todayShift.cashDifference).toLocaleString()}</p>
                </div>
              </div>
            )}
          </div>
        </>
      )}

      {/* Shift History */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Shift History</h2>
          <div className="flex items-end gap-3">
            <DatePicker value={from} onChange={setFrom} label="From" />
            <DatePicker value={to} onChange={setTo} label="To" />
          </div>
        </div>

        <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-50 dark:border-slate-800/50">
                <th className="px-5 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-slate-400">Date</th>
                <th className="px-5 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-slate-400">Status</th>
                <th className="px-5 py-3 text-right text-[10px] font-bold uppercase tracking-wider text-slate-400">Opening</th>
                <th className="px-5 py-3 text-right text-[10px] font-bold uppercase tracking-wider text-slate-400">Closing</th>
                <th className="px-5 py-3 text-right text-[10px] font-bold uppercase tracking-wider text-slate-400">Revenue</th>
                <th className="px-5 py-3 text-right text-[10px] font-bold uppercase tracking-wider text-slate-400">Sales</th>
                <th className="px-5 py-3 text-right text-[10px] font-bold uppercase tracking-wider text-slate-400">Diff</th>
              </tr>
            </thead>
            <tbody>
              {shifts.length === 0 ? (
                <tr><td colSpan={7} className="py-10 text-center text-sm text-slate-400 dark:text-slate-500">No shifts found</td></tr>
              ) : shifts.map(s => (
                <tr key={s._id} className="border-b border-slate-50 transition hover:bg-slate-50 dark:border-slate-800/30 dark:hover:bg-slate-800/40">
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-2">
                      <CalendarDays className="h-3.5 w-3.5 text-slate-400" />
                      <span className="font-semibold text-slate-800 dark:text-slate-200">{s.date}</span>
                    </div>
                  </td>
                  <td className="px-5 py-3">
                    <span className={`inline-flex rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${s.status === 'open' ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/20 dark:text-emerald-400' : 'bg-slate-100 text-slate-400 dark:bg-slate-800'}`}>
                      {s.status}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-right font-medium text-slate-600 dark:text-slate-300">Rs {Number(s.openingCash).toLocaleString()}</td>
                  <td className="px-5 py-3 text-right font-medium text-slate-600 dark:text-slate-300">{s.closingCash ? `Rs ${Number(s.closingCash).toLocaleString()}` : '-'}</td>
                  <td className="px-5 py-3 text-right font-bold text-slate-900 dark:text-slate-100">Rs {Number(s.totalRevenue || 0).toLocaleString()}</td>
                  <td className="px-5 py-3 text-right font-medium text-slate-600 dark:text-slate-300">{s.salesCount || 0}</td>
                  <td className={`px-5 py-3 text-right font-bold ${s.cashDifference !== undefined && Math.abs(s.cashDifference) < 1 ? 'text-emerald-600 dark:text-emerald-400' : s.cashDifference ? 'text-amber-600 dark:text-amber-400' : 'text-slate-400'}`}>
                    {s.cashDifference !== undefined ? `Rs ${Number(s.cashDifference).toLocaleString()}` : '-'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
