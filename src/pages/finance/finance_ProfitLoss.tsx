import { useEffect, useState } from 'react'
import { financeApi } from '../../features/finance/finance.api'
import Toast, { type ToastState } from '../../components/ui/Toast'
import { exportToPdf } from '../../utils/financeExportPdf'

type PnLRow = {
  code: string
  name: string
  subType: string
  module?: string | null
  debit: number
  credit: number
  balance: number
}

export default function Finance_ProfitLoss() {
  const [incomeRows, setIncomeRows] = useState<PnLRow[]>([])
  const [expenseRows, setExpenseRows] = useState<PnLRow[]>([])
  const [loading, setLoading] = useState(false)
  const [toast, setToast] = useState<ToastState>(null)

  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [totalIncome, setTotalIncome] = useState(0)
  const [totalExpense, setTotalExpense] = useState(0)
  const [netProfit, setNetProfit] = useState(0)
  const [moduleRevenue, setModuleRevenue] = useState<Record<string, number>>({})

  useEffect(() => {
    loadReport()
  }, [dateFrom, dateTo])

  async function loadReport() {
    setLoading(true)
    try {
      const res: any = await financeApi.profitLoss({ from: dateFrom || undefined, to: dateTo || undefined })
      setIncomeRows(res.income || [])
      setExpenseRows(res.expenses || [])
      setTotalIncome(res.totalIncome || 0)
      setTotalExpense(res.totalExpense || 0)
      setNetProfit(res.netProfit || 0)
      setModuleRevenue(res.moduleRevenue || {})
    } catch (e: any) {
      setToast({ type: 'error', message: e?.message || 'Failed to load profit & loss' })
    } finally {
      setLoading(false)
    }
  }

  function handleExportPdf() {
    const rows = [
      ...incomeRows.map(r => [r.code, r.name, r.balance.toFixed(2)]),
      ['', 'TOTAL INCOME', totalIncome.toFixed(2)],
      ['', '', ''],
      ...expenseRows.map(r => [r.code, r.name, r.balance.toFixed(2)]),
      ['', 'TOTAL EXPENSES', totalExpense.toFixed(2)],
      ['', '', ''],
      ['', netProfit >= 0 ? 'NET PROFIT' : 'NET LOSS', Math.abs(netProfit).toFixed(2)]
    ]

    exportToPdf({
      title: 'Profit & Loss Statement',
      subtitle: `Period: ${dateFrom || 'Start'} to ${dateTo || 'Today'}`,
      filename: `profit-loss-${dateFrom || 'all'}-${dateTo || 'all'}`,
      headers: ['Code', 'Account Name', 'Balance'],
      rows: rows
    })
  }

  return (
    <div className="p-6">
      <Toast toast={toast} onClose={() => setToast(null)} />

      <div className="bg-linear-to-r from-blue-600 to-indigo-700 rounded-lg shadow p-5 mb-6 flex items-center justify-between text-white">
        <div>
          <h1 className="text-2xl font-semibold">Profit & Loss Statement</h1>
          <p className="text-sm text-blue-100 mt-1">Income and Expense summary for the selected period</p>
        </div>
        <button onClick={handleExportPdf} className="px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg">
          Export PDF
        </button>
      </div>

      <div className="bg-white rounded-lg shadow p-4 mb-4">
        <div className="flex gap-3">
          <div>
            <label className="block text-sm font-medium mb-1">From Date</label>
            <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="px-3 py-2 border rounded-lg" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">To Date</label>
            <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="px-3 py-2 border rounded-lg" />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="bg-green-50 px-4 py-3 font-semibold text-green-800">INCOME</div>
          {loading ? <div className="p-4 text-center">Loading...</div> : (
            <table className="w-full text-sm">
              <tbody className="divide-y">
                {incomeRows.map((r, i) => (
                  <tr key={i} className="hover:bg-gray-50">
                    <td className="px-4 py-2">{r.code}</td>
                    <td className="px-4 py-2">{r.name}</td>
                    <td className="px-4 py-2">
                      {r.module ? <span className="px-1.5 py-0.5 rounded text-xs bg-purple-100 text-purple-800">{r.module}</span> : '—'}
                    </td>
                    <td className="px-4 py-2 text-right">{r.balance.toFixed(2)}</td>
                  </tr>
                ))}
                <tr className="bg-green-100 font-bold">
                  <td colSpan={3} className="px-4 py-2">Total Income</td>
                  <td className="px-4 py-2 text-right">{totalIncome.toFixed(2)}</td>
                </tr>
              </tbody>
            </table>
          )}
        </div>

        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="bg-red-50 px-4 py-3 font-semibold text-red-800">EXPENSES</div>
          {loading ? <div className="p-4 text-center">Loading...</div> : (
            <table className="w-full text-sm">
              <tbody className="divide-y">
                {expenseRows.map((r, i) => (
                  <tr key={i} className="hover:bg-gray-50">
                    <td className="px-4 py-2">{r.code}</td>
                    <td className="px-4 py-2">{r.name}</td>
                    <td className="px-4 py-2">
                      {r.module ? <span className="px-1.5 py-0.5 rounded text-xs bg-purple-100 text-purple-800">{r.module}</span> : '—'}
                    </td>
                    <td className="px-4 py-2 text-right">{r.balance.toFixed(2)}</td>
                  </tr>
                ))}
                <tr className="bg-red-100 font-bold">
                  <td colSpan={3} className="px-4 py-2">Total Expenses</td>
                  <td className="px-4 py-2 text-right">{totalExpense.toFixed(2)}</td>
                </tr>
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Module-wise Revenue Breakdown */}
      {Object.keys(moduleRevenue).length > 0 && (
        <div className="mt-6 bg-white rounded-lg shadow overflow-hidden">
          <div className="bg-purple-50 px-4 py-3 font-semibold text-purple-800">REVENUE BY MODULE</div>
          <div className="grid grid-cols-3 md:grid-cols-5 gap-4 p-4">
            {Object.entries(moduleRevenue).map(([mod, amount]) => (
              <div key={mod} className="bg-purple-50 rounded-lg p-3 text-center">
                <p className="text-xs text-purple-600 font-medium uppercase">{mod}</p>
                <p className="text-lg font-bold text-purple-900">{Number(amount).toFixed(2)}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className={`mt-6 rounded-lg shadow p-6 text-center ${netProfit >= 0 ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'}`}>
        <div className="text-2xl font-bold">
          {netProfit >= 0 ? 'Net Profit' : 'Net Loss'}: {Math.abs(netProfit).toFixed(2)}
        </div>
      </div>
    </div>
  )
}
