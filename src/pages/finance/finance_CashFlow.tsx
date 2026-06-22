import { useEffect, useState } from 'react'
import { financeApi } from '../../features/finance/finance.api'
import Toast, { type ToastState } from '../../components/ui/Toast'
import { exportToPdf } from '../../utils/financeExportPdf'

type CashFlowEntry = {
  refType: string
  account: string
  debit: number
  credit: number
  net: number
}

type CashBankRow = {
  code: string
  name: string
  debit: number
  credit: number
  netChange: number
}

export default function Finance_CashFlow() {
  const [operating, setOperating] = useState<CashFlowEntry[]>([])
  const [investing, setInvesting] = useState<CashFlowEntry[]>([])
  const [financing, setFinancing] = useState<CashFlowEntry[]>([])
  const [cashBankRows, setCashBankRows] = useState<CashBankRow[]>([])
  const [loading, setLoading] = useState(false)
  const [toast, setToast] = useState<ToastState>(null)

  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [operatingNet, setOperatingNet] = useState(0)
  const [investingNet, setInvestingNet] = useState(0)
  const [financingNet, setFinancingNet] = useState(0)
  const [netChange, setNetChange] = useState(0)
  const [openingBalance, setOpeningBalance] = useState(0)
  const [closingBalance, setClosingBalance] = useState(0)

  useEffect(() => {
    loadReport()
  }, [dateFrom, dateTo])

  async function loadReport() {
    setLoading(true)
    try {
      const res: any = await financeApi.cashFlow({ from: dateFrom || undefined, to: dateTo || undefined })
      setOperating(res.operating || [])
      setInvesting(res.investing || [])
      setFinancing(res.financing || [])
      setCashBankRows(res.cashBankRows || [])
      setOperatingNet(res.operatingNet || 0)
      setInvestingNet(res.investingNet || 0)
      setFinancingNet(res.financingNet || 0)
      setNetChange(res.netChange || 0)
      setOpeningBalance(res.openingBalance || 0)
      setClosingBalance(res.closingBalance || 0)
    } catch (e: any) {
      setToast({ type: 'error', message: e?.message || 'Failed to load cash flow' })
    } finally {
      setLoading(false)
    }
  }

  function handleExportPdf() {
    const rows = [
      ['OPERATING ACTIVITIES', '', ''],
      ...operating.map(r => [r.refType, r.account, r.net.toFixed(2)]),
      ['Net Cash from Operating', '', operatingNet.toFixed(2)],
      ['', '', ''],
      ['INVESTING ACTIVITIES', '', ''],
      ...investing.map(r => [r.refType, r.account, r.net.toFixed(2)]),
      ['Net Cash from Investing', '', investingNet.toFixed(2)],
      ['', '', ''],
      ['FINANCING ACTIVITIES', '', ''],
      ...financing.map(r => [r.refType, r.account, r.net.toFixed(2)]),
      ['Net Cash from Financing', '', financingNet.toFixed(2)],
      ['', '', ''],
      ['SUMMARY', '', ''],
      ['Net Change in Cash', '', netChange.toFixed(2)],
      ['Opening Balance', '', openingBalance.toFixed(2)],
      ['Closing Balance', '', closingBalance.toFixed(2)]
    ]

    exportToPdf({
      title: 'Cash Flow Statement',
      subtitle: `Period: ${dateFrom || 'Start'} to ${dateTo || 'Today'}`,
      filename: `cash-flow-${dateFrom || 'all'}-${dateTo || 'all'}`,
      headers: ['Type', 'Account/Category', 'Amount'],
      rows: rows
    })
  }

  return (
    <div className="p-6">
      <Toast toast={toast} onClose={() => setToast(null)} />

      <div className="bg-linear-to-r from-blue-600 to-indigo-700 rounded-lg shadow p-5 mb-6 flex items-center justify-between text-white">
        <div>
          <h1 className="text-2xl font-semibold">Cash Flow Statement</h1>
          <p className="text-sm text-blue-100 mt-1">Cash and Bank account movements for the selected period</p>
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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="bg-blue-50 px-4 py-3 font-semibold text-blue-800">OPERATING ACTIVITIES</div>
          {loading ? <div className="p-4 text-center">Loading...</div> : (
            <table className="w-full text-sm">
              <tbody className="divide-y">
                {operating.map((r, i) => (
                  <tr key={i} className="hover:bg-gray-50">
                    <td className="px-4 py-2">{r.refType}</td>
                    <td className="px-4 py-2">{r.account}</td>
                    <td className="px-4 py-2 text-right">{r.net >= 0 ? '+' : ''}{r.net.toFixed(2)}</td>
                  </tr>
                ))}
                <tr className="bg-blue-100 font-bold">
                  <td colSpan={2} className="px-4 py-2">Net Cash from Operating</td>
                  <td className="px-4 py-2 text-right">{operatingNet >= 0 ? '+' : ''}{operatingNet.toFixed(2)}</td>
                </tr>
              </tbody>
            </table>
          )}
        </div>

        <div className="space-y-4">
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="bg-gray-50 px-4 py-3 font-semibold text-gray-800">INVESTING ACTIVITIES</div>
            {loading ? <div className="p-4 text-center">Loading...</div> : (
              <table className="w-full text-sm">
                <tbody className="divide-y">
                  {investing.length === 0 ? <tr><td colSpan={3} className="px-4 py-2 text-center text-gray-500">No investing activities</td></tr> : investing.map((r, i) => (
                    <tr key={i} className="hover:bg-gray-50">
                      <td className="px-4 py-2">{r.refType}</td>
                      <td className="px-4 py-2">{r.account}</td>
                      <td className="px-4 py-2 text-right">{r.net >= 0 ? '+' : ''}{r.net.toFixed(2)}</td>
                    </tr>
                  ))}
                  <tr className="bg-gray-100 font-bold">
                    <td colSpan={2} className="px-4 py-2">Net Cash from Investing</td>
                    <td className="px-4 py-2 text-right">{investingNet >= 0 ? '+' : ''}{investingNet.toFixed(2)}</td>
                  </tr>
                </tbody>
              </table>
            )}
          </div>

          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="bg-gray-50 px-4 py-3 font-semibold text-gray-800">FINANCING ACTIVITIES</div>
            {loading ? <div className="p-4 text-center">Loading...</div> : (
              <table className="w-full text-sm">
                <tbody className="divide-y">
                  {financing.length === 0 ? <tr><td colSpan={3} className="px-4 py-2 text-center text-gray-500">No financing activities</td></tr> : financing.map((r, i) => (
                    <tr key={i} className="hover:bg-gray-50">
                      <td className="px-4 py-2">{r.refType}</td>
                      <td className="px-4 py-2">{r.account}</td>
                      <td className="px-4 py-2 text-right">{r.net >= 0 ? '+' : ''}{r.net.toFixed(2)}</td>
                    </tr>
                  ))}
                  <tr className="bg-gray-100 font-bold">
                    <td colSpan={2} className="px-4 py-2">Net Cash from Financing</td>
                    <td className="px-4 py-2 text-right">{financingNet >= 0 ? '+' : ''}{financingNet.toFixed(2)}</td>
                  </tr>
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden mb-6">
        <div className="bg-green-50 px-4 py-3 font-semibold text-green-800">CASH & BANK ACCOUNTS DETAIL</div>
        {loading ? <div className="p-4 text-center">Loading...</div> : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-2 text-left">Code</th>
                <th className="px-4 py-2 text-left">Account</th>
                <th className="px-4 py-2 text-right">Debit (In)</th>
                <th className="px-4 py-2 text-right">Credit (Out)</th>
                <th className="px-4 py-2 text-right">Net Change</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {cashBankRows.map((r, i) => (
                <tr key={i} className="hover:bg-gray-50">
                  <td className="px-4 py-2">{r.code}</td>
                  <td className="px-4 py-2">{r.name}</td>
                  <td className="px-4 py-2 text-right text-green-600">{r.debit.toFixed(2)}</td>
                  <td className="px-4 py-2 text-right text-red-600">{r.credit.toFixed(2)}</td>
                  <td className="px-4 py-2 text-right font-medium">{r.netChange >= 0 ? '+' : ''}{r.netChange.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
          <div className="p-4 bg-gray-50 rounded">
            <div className="text-sm text-gray-600">Net Change</div>
            <div className={`text-xl font-bold ${netChange >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {netChange >= 0 ? '+' : ''}{netChange.toFixed(2)}
            </div>
          </div>
          <div className="p-4 bg-gray-50 rounded">
            <div className="text-sm text-gray-600">Opening Balance</div>
            <div className="text-xl font-bold">{openingBalance.toFixed(2)}</div>
          </div>
          <div className="p-4 bg-gray-50 rounded">
            <div className="text-sm text-gray-600">Closing Balance</div>
            <div className="text-xl font-bold">{closingBalance.toFixed(2)}</div>
          </div>
          <div className={`p-4 rounded ${Math.abs(closingBalance - openingBalance - netChange) < 0.01 ? 'bg-green-50' : 'bg-red-50'}`}>
            <div className="text-sm font-medium">Verification</div>
            <div className="text-lg font-bold">
              {Math.abs(closingBalance - openingBalance - netChange) < 0.01 ? '✓ Match' : '✗ Mismatch'}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
