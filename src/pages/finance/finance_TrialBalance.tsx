import { useEffect, useState } from 'react'
import { financeApi } from '../../features/finance/finance.api'
import Toast, { type ToastState } from '../../components/ui/Toast'
import { exportToPdf } from '../../utils/financeExportPdf'

type TrialBalanceRow = {
  code: string
  name: string
  type: string
  subType: string
  module?: string | null
  debit: number
  credit: number
  balance: number
  debitBalance: number
  creditBalance: number
}

export default function Finance_TrialBalance() {
  const [rows, setRows] = useState<TrialBalanceRow[]>([])
  const [loading, setLoading] = useState(false)
  const [toast, setToast] = useState<ToastState>(null)

  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [totalDebit, setTotalDebit] = useState(0)
  const [totalCredit, setTotalCredit] = useState(0)
  const [balanced, setBalanced] = useState(true)

  useEffect(() => {
    loadReport()
  }, [dateFrom, dateTo])

  async function loadReport() {
    setLoading(true)
    try {
      const res: any = await financeApi.trialBalance({ from: dateFrom || undefined, to: dateTo || undefined })
      setRows(res.rows || [])
      setTotalDebit(res.totalDebit || 0)
      setTotalCredit(res.totalCredit || 0)
      setBalanced(res.balanced ?? true)
    } catch (e: any) {
      setToast({ type: 'error', message: e?.message || 'Failed to load trial balance' })
    } finally {
      setLoading(false)
    }
  }

  function handleExport() {
    const headers = ['Code', 'Name', 'Account Type', 'Detail Type', 'Debit', 'Credit', 'Balance']
    const csv = [
      headers.join(','),
      ...rows.map(r => [r.code, r.name, r.type, r.subType, r.debit, r.credit, r.balance].join(',')),
      ['', '', '', '', totalDebit, totalCredit, ''],
    ].join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `trial-balance-${dateFrom || 'all'}-${dateTo || 'all'}.csv`
    a.click()
  }

  function handleExportPdf() {
    exportToPdf({
      title: 'Trial Balance',
      subtitle: `Period: ${dateFrom || 'Start'} to ${dateTo || 'Today'}`,
      filename: `trial-balance-${dateFrom || 'all'}-${dateTo || 'all'}`,
      headers: ['Code', 'Name', 'Account Type', 'Detail Type', 'Debit', 'Credit', 'Balance'],
      rows: rows.map(r => [r.code, r.name, r.type, r.subType, r.debit.toFixed(2), r.credit.toFixed(2), r.balance.toFixed(2)]),
      footers: [['', '', '', 'TOTALS', totalDebit.toFixed(2), totalCredit.toFixed(2), (totalDebit - totalCredit).toFixed(2)]]
    })
  }

  return (
    <div className="p-6">
      <Toast toast={toast} onClose={() => setToast(null)} />

      <div className="bg-gradient-to-r from-blue-600 to-indigo-700 rounded-lg shadow p-5 mb-6 flex items-center justify-between text-white">
        <div>
          <h1 className="text-2xl font-semibold">Trial Balance</h1>
          <p className="text-sm text-blue-100 mt-1">Verifies that debits equal credits across all accounts</p>
        </div>
        <div className="flex gap-2">
          <button onClick={handleExport} className="px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg">
            Export CSV
          </button>
          <button onClick={handleExportPdf} className="px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg">
            Export PDF
          </button>
        </div>
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

      <div className="bg-white rounded-lg shadow overflow-hidden">
        {loading ? (
          <div className="p-8 text-center">Loading...</div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left">Code</th>
                    <th className="px-4 py-3 text-left">Name</th>
                    <th className="px-4 py-3 text-left">Account Type</th>
                    <th className="px-4 py-3 text-left">Detail Type</th>
                    <th className="px-4 py-3 text-left">Module</th>
                    <th className="px-4 py-3 text-right">Debit</th>
                    <th className="px-4 py-3 text-right">Credit</th>
                    <th className="px-4 py-3 text-right">Balance</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {rows.map((r, i) => (
                    <tr key={i} className="hover:bg-gray-50">
                      <td className="px-4 py-2">{r.code}</td>
                      <td className="px-4 py-2">{r.name}</td>
                      <td className="px-4 py-2">{r.type}</td>
                      <td className="px-4 py-2">{r.subType}</td>
                      <td className="px-4 py-2">
                        {r.module ? <span className="px-1.5 py-0.5 rounded text-xs bg-purple-100 text-purple-800">{r.module}</span> : '—'}
                      </td>
                      <td className="px-4 py-2 text-right">{r.debit.toFixed(2)}</td>
                      <td className="px-4 py-2 text-right">{r.credit.toFixed(2)}</td>
                      <td className="px-4 py-2 text-right font-medium">{r.balance.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-gray-100 font-bold">
                  <tr>
                    <td colSpan={5} className="px-4 py-3">TOTALS</td>
                    <td className="px-4 py-3 text-right">{totalDebit.toFixed(2)}</td>
                    <td className="px-4 py-3 text-right">{totalCredit.toFixed(2)}</td>
                    <td className="px-4 py-3 text-right">{(totalDebit - totalCredit).toFixed(2)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
            <div className={`p-4 text-center font-medium ${balanced ? 'text-green-600' : 'text-red-600'}`}>
              {balanced ? '✓ Trial Balance is Balanced' : '✗ Trial Balance is NOT Balanced'}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
