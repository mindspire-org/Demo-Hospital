import { useEffect, useState } from 'react'
import { financeApi } from '../../utils/api'
import Toast, { type ToastState } from '../../components/ui/Toast'

export default function Finance_Budgets() {
  const [budgets, setBudgets] = useState<any[]>([])
  const [comparison, setComparison] = useState<any[]>([])
  const [toast, setToast] = useState<ToastState>(null)
  const [tab, setTab] = useState<'budgets' | 'vsActual' | 'costCenter'>('budgets')
  const [year, setYear] = useState(new Date().getFullYear())
  const [costCenterPnL, setCostCenterPnL] = useState<any>(null)

  // Create form
  const [newName, setNewName] = useState('')
  const [newCostCenter, setNewCostCenter] = useState('')
  const [newCategory, setNewCategory] = useState('')
  const [newAmount, setNewAmount] = useState('')
  const [newMonth, setNewMonth] = useState('')

  async function fetchBudgets() {
    try {
      const res = await financeApi.listBudgets({ year })
      setBudgets(Array.isArray(res) ? res : [])
    } catch { setBudgets([]) }
  }

  async function fetchVsActual() {
    try {
      const res = await financeApi.budgetVsActual({ year })
      setComparison(Array.isArray(res) ? res : [])
    } catch { setComparison([]) }
  }

  async function fetchCostCenterPnL() {
    try {
      const res = await financeApi.costCenterPnL({ year })
      setCostCenterPnL(res)
    } catch { setCostCenterPnL(null) }
  }

  useEffect(() => { fetchBudgets() }, [year])

  async function handleCreate() {
    if (!newName || !newAmount || !year) { setToast({ type: 'error', message: 'Name, amount, and year are required' }); return }
    try {
      await financeApi.createBudget({ name: newName, costCenter: newCostCenter || undefined, expenseCategory: newCategory || undefined, budgetAmount: parseFloat(newAmount), year, month: newMonth ? parseInt(newMonth) : undefined })
      setToast({ type: 'success', message: 'Budget created' })
      setNewName(''); setNewAmount(''); setNewCostCenter(''); setNewCategory(''); setNewMonth('')
      fetchBudgets()
    } catch (e: any) { setToast({ type: 'error', message: e?.message || 'Failed' }) }
  }

  const tabs = [
    { key: 'budgets', label: 'Budgets' },
    { key: 'vsActual', label: 'Budget vs Actual' },
    { key: 'costCenter', label: 'Cost Center P&L' },
  ]

  return (
    <div className="w-full p-3 sm:p-4 space-y-4">
      <Toast toast={toast} onClose={() => setToast(null)} />
      <div className="text-xl font-semibold text-slate-800">Budgets</div>

      <div className="flex gap-1 border-b border-slate-200">
        {tabs.map(t => (
          <button key={t.key} onClick={() => { setTab(t.key as any); if (t.key === 'vsActual') fetchVsActual(); if (t.key === 'costCenter') fetchCostCenterPnL() }}
            className={`px-4 py-2 text-sm font-medium ${tab === t.key ? 'border-b-2 border-navy text-navy' : 'text-slate-500 hover:text-slate-700'}`}>{t.label}</button>
        ))}
      </div>

      <div className="flex items-center gap-2">
        <label className="text-sm text-slate-600">Year:</label>
        <input type="number" value={year} onChange={e => setYear(parseInt(e.target.value) || new Date().getFullYear())} className="rounded-md border border-slate-300 px-3 py-1.5 text-sm w-24" />
      </div>

      {tab === 'budgets' && (
        <>
          <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-3">
            <div className="text-sm font-semibold text-slate-600">Add Budget</div>
            <div className="grid gap-3 sm:grid-cols-5">
              <input value={newName} onChange={e => setNewName(e.target.value)} placeholder="Budget name" className="rounded-md border border-slate-300 px-3 py-2 text-sm" />
              <select value={newCostCenter} onChange={e => setNewCostCenter(e.target.value)} className="rounded-md border border-slate-300 px-3 py-2 text-sm">
                <option value="">Cost Center...</option>
                <option value="opd">OPD</option><option value="lab">Lab</option><option value="pharmacy">Pharmacy</option>
                <option value="diagnostic">Diagnostic</option><option value="general">General</option>
              </select>
              <input value={newCategory} onChange={e => setNewCategory(e.target.value)} placeholder="Expense Category" className="rounded-md border border-slate-300 px-3 py-2 text-sm" />
              <input value={newAmount} onChange={e => setNewAmount(e.target.value)} placeholder="Budget Amount" type="number" className="rounded-md border border-slate-300 px-3 py-2 text-sm" />
              <button onClick={handleCreate} className="rounded-md bg-navy px-4 py-2 text-sm font-medium text-white hover:opacity-90">Add</button>
            </div>
          </div>
          <div className="space-y-2">
            {budgets.map((b: any) => (
              <div key={b._id} className="rounded-xl border border-slate-200 bg-white p-3">
                <span className="font-medium text-slate-800">{b.name}</span>
                <span className="ml-2 text-xs text-slate-500">{b.costCenter || '—'} | {b.expenseCategory || '—'}</span>
                <span className="ml-2 font-semibold text-slate-800">PKR {Number(b.budgetAmount).toLocaleString()}</span>
              </div>
            ))}
          </div>
        </>
      )}

      {tab === 'vsActual' && (
        <div className="overflow-x-auto">
          <table className="w-full text-sm border border-slate-200">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-3 py-2 text-left">Budget</th>
                <th className="px-3 py-2 text-left">Cost Center</th>
                <th className="px-3 py-2 text-right">Budgeted</th>
                <th className="px-3 py-2 text-right">Actual</th>
                <th className="px-3 py-2 text-right">Variance</th>
                <th className="px-3 py-2 text-right">Utilization</th>
              </tr>
            </thead>
            <tbody>
              {comparison.map((r: any, i: number) => (
                <tr key={i} className="border-t border-slate-100">
                  <td className="px-3 py-2">{r.name}</td>
                  <td className="px-3 py-2">{r.costCenter || '—'}</td>
                  <td className="px-3 py-2 text-right">{Number(r.budgetAmount).toLocaleString()}</td>
                  <td className="px-3 py-2 text-right">{Number(r.actualAmount).toLocaleString()}</td>
                  <td className={`px-3 py-2 text-right ${r.variance >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>{Number(r.variance).toLocaleString()}</td>
                  <td className="px-3 py-2 text-right">{r.utilizationPercent}%</td>
                </tr>
              ))}
            </tbody>
          </table>
          {comparison.length === 0 && <div className="p-8 text-center text-slate-400">No budget data. Create budgets first.</div>}
        </div>
      )}

      {tab === 'costCenter' && costCenterPnL && (
        <div className="overflow-x-auto">
          <table className="w-full text-sm border border-slate-200">
            <thead className="bg-slate-50">
              <tr><th className="px-3 py-2 text-left">Cost Center</th><th className="px-3 py-2 text-right">Income</th><th className="px-3 py-2 text-right">Expense</th><th className="px-3 py-2 text-right">Net Profit</th></tr>
            </thead>
            <tbody>
              {(costCenterPnL.costCenters || []).map((cc: any, i: number) => (
                <tr key={i} className="border-t border-slate-100">
                  <td className="px-3 py-2 font-medium">{cc.costCenter}</td>
                  <td className="px-3 py-2 text-right text-emerald-600">{Number(cc.income).toLocaleString()}</td>
                  <td className="px-3 py-2 text-right text-rose-600">{Number(cc.expense).toLocaleString()}</td>
                  <td className={`px-3 py-2 text-right font-semibold ${cc.netProfit >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>{Number(cc.netProfit).toLocaleString()}</td>
                </tr>
              ))}
              <tr className="border-t-2 border-slate-300 bg-slate-50 font-bold">
                <td className="px-3 py-2">TOTAL</td>
                <td className="px-3 py-2 text-right">{Number(costCenterPnL.totalIncome).toLocaleString()}</td>
                <td className="px-3 py-2 text-right">{Number(costCenterPnL.totalExpense).toLocaleString()}</td>
                <td className={`px-3 py-2 text-right ${costCenterPnL.totalNetProfit >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>{Number(costCenterPnL.totalNetProfit).toLocaleString()}</td>
              </tr>
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
