/**
 * Centralized Expenses — department-wise tabs, modern UI.
 * Fetches expenses from every module via /finance/expenses/by-department.
 * Posts new expenses to the unified finance journal.
 */
import { useEffect, useState } from 'react'
import { financeApi } from '../../utils/api'
import { fmtRs, todayIso } from '../../components/finance/finance_ui'
import { HeroHeader, HeroButton, KpiCard, SectionCard, ModernTable } from '../../components/finance/finance_modern'
import DateRangeFilter from '../../components/finance/finance_DateRange'
import { printFinanceReport } from '../../components/finance/finance_print'
import DatePickerModern from '../../components/DatePickerModern'
import { Receipt, RefreshCw, Plus, Printer, Building2, DollarSign, TrendingUp, LayoutGrid } from 'lucide-react'

const DEPT_TABS = [
  { key: '', label: 'All Departments', icon: LayoutGrid, color: 'from-indigo-500 to-blue-600' },
  { key: 'hospital', label: 'Hospital', icon: Building2, color: 'from-blue-500 to-cyan-600' },
  { key: 'pharmacy', label: 'Pharmacy', icon: Building2, color: 'from-emerald-500 to-teal-600' },
  { key: 'lab', label: 'Lab', icon: Building2, color: 'from-purple-500 to-violet-600' },
  { key: 'indoor-pharmacy', label: 'Indoor Pharmacy', icon: Building2, color: 'from-amber-500 to-orange-600' },
  { key: 'aesthetic', label: 'Aesthetic', icon: Building2, color: 'from-pink-500 to-rose-600' },
  { key: 'ambulance', label: 'Ambulance', icon: Building2, color: 'from-red-500 to-rose-600' },
  { key: 'equipment', label: 'Equipment', icon: Building2, color: 'from-slate-500 to-gray-600' },
] as const

export default function Finance_Expenses(){
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [activeDept, setActiveDept] = useState('')
  const [q, setQ] = useState('')
  const [rows, setRows] = useState<any[]>([])
  const [total, setTotal] = useState(0)
  const [grandTotal, setGrand] = useState(0)
  const [deptSummary, setDeptSummary] = useState<Record<string, { count: number; total: number }>>({})
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const [showAdd, setShowAdd] = useState(false)
  const [draft, setDraft] = useState<any>({ dateIso: todayIso(), category: 'Utilities', amount: 0, method: 'Cash' })

  async function load(){
    setLoading(true); setErr(null)
    try {
      const res: any = await financeApi.listExpensesByDepartment({ from, to, department: activeDept, q, limit: 200 })
      setRows(res?.rows || [])
      setTotal(res?.total || 0)
      setGrand(res?.grandTotal || 0)
      setDeptSummary(res?.deptSummary || {})
    } catch (e: any) { setErr(e?.message || 'Failed to load expenses') }
    finally { setLoading(false) }
  }
  useEffect(() => { load() /* eslint-disable-next-line */ }, [from, to, activeDept])

  async function createExpense(){
    if (!draft.amount || Number(draft.amount) <= 0){ setErr('Amount must be > 0'); return }
    try {
      await financeApi.createExpense({
        dateIso: draft.dateIso,
        category: draft.category,
        categoryName: draft.categoryName || draft.category,
        departmentName: draft.departmentName,
        amount: Number(draft.amount),
        method: draft.method,
        ref: draft.ref,
        note: draft.note,
      })
      setShowAdd(false); setDraft({ dateIso: todayIso(), category: 'Utilities', amount: 0, method: 'Cash' })
      await load()
    } catch (e: any) { setErr(e?.message || 'Create failed') }
  }

  async function remove(id: string){
    if (!confirm('Delete this expense and reverse its journal?')) return
    try { await financeApi.deleteExpense(id); await load() }
    catch (e: any) { setErr(e?.message || 'Delete failed') }
  }

  const deptCount = Object.keys(deptSummary).length

  return (
    <div className="min-h-[calc(100dvh-3.5rem)] bg-slate-50 dark:bg-slate-950">
      {/* Hero */}
      <HeroHeader
        icon={Receipt}
        title="Expense History"
        subtitle="Track expenses from every department — centralized across all portals."
        gradient="from-rose-600 via-pink-600 to-fuchsia-600"
        actions={
          <>
            <DateRangeFilter value={{ from, to }} onChange={r => { setFrom(r.from); setTo(r.to) }} />
            <HeroButton icon={RefreshCw} onClick={load}>Refresh</HeroButton>
            <HeroButton icon={Printer} onClick={() => printFinanceReport({
              title: 'Expense History',
              subtitle: `Period ${from || '—'} → ${to || '—'}`,
              columns: [
                { header: 'Date',       key: 'date' },
                { header: 'Department', render: (r: any) => r.departmentName || '—' },
                { header: 'Category',   render: (r: any) => r.categoryName || r.category || r.type },
                { header: 'Description', key: 'note' },
                { header: 'Method',     render: (r: any) => r.method || '—' },
                { header: 'Ref',        render: (r: any) => r.ref || '—' },
                { header: 'Amount',     render: (r: any) => fmtRs(r.amount), align: 'right' },
              ],
              rows,
              totals: [{ label: 'Total', value: fmtRs(grandTotal) }],
            })}>Print</HeroButton>
            <HeroButton icon={Plus} variant="solid" onClick={() => setShowAdd(true)}>Add Expense</HeroButton>
          </>
        }
      />

      <div className="mx-auto max-w-7xl space-y-6 px-6 py-6">
        {err && <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-800 dark:bg-rose-950 dark:text-rose-300">{err}</div>}

        {/* KPI Cards */}
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          <KpiCard icon={DollarSign} label="Grand Total" value={fmtRs(grandTotal)} tone="bad" gradient="from-rose-500 to-pink-600" />
          <KpiCard icon={Receipt} label="Total Entries" value={total} gradient="from-blue-500 to-indigo-600" />
          <KpiCard icon={Building2} label="Departments" value={deptCount} gradient="from-emerald-500 to-teal-600" />
          <KpiCard icon={TrendingUp} label="Avg per Entry" value={total > 0 ? fmtRs(grandTotal / total) : '—'} gradient="from-amber-500 to-orange-600" />
        </div>

        {/* Department Tabs */}
        <SectionCard>
          <div className="flex items-center gap-2 overflow-x-auto border-b border-slate-100 px-4 dark:border-slate-800">
            {DEPT_TABS.map(tab => {
              const TabIcon = tab.icon
              const isActive = activeDept === tab.key
              const sum = deptSummary[tab.key]
              return (
                <button
                  key={tab.key}
                  onClick={() => setActiveDept(tab.key)}
                  className={`flex items-center gap-2 whitespace-nowrap border-b-2 px-4 py-3 text-sm font-medium transition ${
                    isActive
                      ? 'border-rose-500 text-rose-600 dark:border-rose-400 dark:text-rose-400'
                      : 'border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
                  }`}
                >
                  <TabIcon className="h-4 w-4" />
                  {tab.label}
                  {sum && (
                    <span className={`ml-1 rounded-full px-2 py-0.5 text-xs ${isActive ? 'bg-rose-100 text-rose-700 dark:bg-rose-900 dark:text-rose-300' : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'}`}>
                      {sum.count}
                    </span>
                  )}
                </button>
              )
            })}
          </div>

          {/* Search bar */}
          <div className="flex items-center gap-3 border-b border-slate-100 px-4 py-3 dark:border-slate-800">
            <input
              type="text"
              placeholder="Search description, ref, category..."
              value={q}
              onChange={e => setQ(e.target.value)}
              className="flex-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm placeholder:text-slate-400 focus:border-rose-400 focus:outline-none focus:ring-1 focus:ring-rose-400 dark:border-slate-700 dark:bg-slate-800 dark:placeholder:text-slate-500"
            />
            <button onClick={load} className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800">
              <RefreshCw className="h-4 w-4" />
            </button>
          </div>

          {/* Department Summary Cards (when viewing all) */}
          {!activeDept && deptCount > 0 && (
            <div className="grid grid-cols-2 gap-3 border-b border-slate-100 p-4 dark:border-slate-800 md:grid-cols-4 lg:grid-cols-7">
              {DEPT_TABS.filter(t => t.key && deptSummary[t.key]).map(tab => {
                const sum = deptSummary[tab.key]!
                return (
                  <div key={tab.key} className="rounded-xl border border-slate-100 bg-slate-50/50 p-3 dark:border-slate-800 dark:bg-slate-800/50">
                    <div className="text-xs font-medium text-slate-500 dark:text-slate-400">{tab.label}</div>
                    <div className="mt-1 text-lg font-bold text-slate-900 dark:text-white">{fmtRs(sum.total)}</div>
                    <div className="text-xs text-slate-400">{sum.count} entries</div>
                  </div>
                )
              })}
            </div>
          )}

          {/* Active department total */}
          {activeDept && deptSummary[activeDept] && (
            <div className="flex items-center justify-between border-b border-slate-100 px-4 py-2 dark:border-slate-800">
              <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                {DEPT_TABS.find(t => t.key === activeDept)?.label || activeDept}
              </span>
              <span className="text-sm font-bold text-rose-600 dark:text-rose-400">
                Total: {fmtRs(deptSummary[activeDept].total)} · {deptSummary[activeDept].count} entries
              </span>
            </div>
          )}

          {/* Table */}
          <ModernTable
            columns={[
              { key: 'date', header: 'Date', render: (r: any) => <span className="text-xs text-slate-500">{r.dateIso || r.date}</span> },
              { key: 'departmentName', header: 'Department', render: (r: any) => (
                <span className="inline-flex items-center gap-1.5">
                  <span className={`h-2 w-2 rounded-full ${DEPT_TABS.find(t => t.key === r.department)?.color ? `bg-gradient-to-r ${DEPT_TABS.find(t => t.key === r.department)?.color}` : 'bg-slate-400'}`} />
                  {r.departmentName || '—'}
                </span>
              )},
              { key: 'category', header: 'Category', render: (r: any) => r.categoryName || r.category || r.type || '—' },
              { key: 'note', header: 'Description', render: (r: any) => <span className="max-w-[200px] truncate">{r.note || ''}</span> },
              { key: 'createdBy', header: 'User', render: (r: any) => r.createdByUsername || r.createdBy || '—' },
              { key: 'method', header: 'Method', render: (r: any) => r.method ? <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs dark:bg-slate-800">{r.method}</span> : '—' },
              { key: 'ref', header: 'Ref', render: (r: any) => r.ref || '—' },
              { key: 'amount', header: 'Amount', render: (r: any) => <span className="font-semibold text-rose-600 dark:text-rose-400">{fmtRs(r.amount)}</span>, className: 'text-right', headerClassName: 'text-right' },
              { key: 'actions', header: '', render: (r: any) => (
                <button onClick={() => remove(r._id)} className="text-xs text-rose-500 hover:underline">Delete</button>
              )},
            ]}
            rows={rows.map(r => ({ ...r, id: r._id }))}
            empty={loading ? 'Loading expenses...' : 'No expenses in the selected period.'}
            maxHeight="60vh"
          />

          <div className="flex items-center justify-between border-t border-slate-100 px-5 py-3 text-xs text-slate-500 dark:border-slate-800">
            <span>Showing {rows.length} of {total} entries</span>
            <span className="font-semibold text-rose-600 dark:text-rose-400">Grand Total: {fmtRs(grandTotal)}</span>
          </div>
        </SectionCard>
      </div>

      {/* Add Expense Modal */}
      {showAdd && (
        <div className="fixed inset-0 z-30 flex items-center justify-center bg-black/40">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl dark:bg-slate-900">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Add Expense</h3>
            <div className="mt-4 space-y-3">
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-500 dark:text-slate-400">Date</label>
                <DatePickerModern value={draft.dateIso} onChange={v => setDraft((d: any) => ({ ...d, dateIso: v }))} className="w-full" />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-500 dark:text-slate-400">Category *</label>
                <select value={draft.category} onChange={e => setDraft((d: any) => ({ ...d, category: e.target.value }))} className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white">
                  <option>Utilities</option><option>Maintenance</option><option>Medical Supplies</option><option>Rent</option><option>Salary</option><option>Other</option>
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-500 dark:text-slate-400">Department</label>
                <input value={draft.departmentName || ''} onChange={e => setDraft((d: any) => ({ ...d, departmentName: e.target.value }))} className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white" placeholder="e.g. Hospital, Pharmacy..." />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-500 dark:text-slate-400">Amount *</label>
                  <input type="number" value={draft.amount} onChange={e => setDraft((d: any) => ({ ...d, amount: e.target.value }))} className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white" />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-500 dark:text-slate-400">Method</label>
                  <select value={draft.method} onChange={e => setDraft((d: any) => ({ ...d, method: e.target.value }))} className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white">
                    <option>Cash</option><option>Bank</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-500 dark:text-slate-400">Ref</label>
                <input value={draft.ref || ''} onChange={e => setDraft((d: any) => ({ ...d, ref: e.target.value }))} className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white" />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-500 dark:text-slate-400">Note</label>
                <input value={draft.note || ''} onChange={e => setDraft((d: any) => ({ ...d, note: e.target.value }))} className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white" />
              </div>
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button onClick={() => setShowAdd(false)} className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300">Cancel</button>
              <button onClick={createExpense} className="rounded-lg bg-rose-600 px-4 py-2 text-sm font-medium text-white hover:bg-rose-700">Save Expense</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
