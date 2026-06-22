import { useEffect, useState } from 'react'
import { financeApi } from '../../features/finance/finance.api'
import Toast, { type ToastState } from '../../components/ui/Toast'
import { exportToPdf } from '../../utils/financeExportPdf'

type BalanceSheetRow = {
  code: string
  name: string
  subType: string
  module?: string | null
  balance: number
}

export default function Finance_BalanceSheet() {
  const [assetRows, setAssetRows] = useState<BalanceSheetRow[]>([])
  const [liabilityRows, setLiabilityRows] = useState<BalanceSheetRow[]>([])
  const [equityRows, setEquityRows] = useState<BalanceSheetRow[]>([])
  const [loading, setLoading] = useState(false)
  const [toast, setToast] = useState<ToastState>(null)

  const [asOf, setAsOf] = useState('')
  const [totalAssets, setTotalAssets] = useState(0)
  const [totalLiabilities, setTotalLiabilities] = useState(0)
  const [totalEquity, setTotalEquity] = useState(0)
  const [totalLiabilitiesAndEquity, setTotalLiabilitiesAndEquity] = useState(0)
  const [balanced, setBalanced] = useState(true)
  const [retainedEarnings, setRetainedEarnings] = useState(0)

  useEffect(() => {
    loadReport()
  }, [asOf])

  async function loadReport() {
    setLoading(true)
    try {
      const res: any = await financeApi.balanceSheet({ asOf: asOf || undefined })
      setAssetRows(res.assets || [])
      setLiabilityRows(res.liabilities || [])
      setEquityRows(res.equity || [])
      setTotalAssets(res.totalAssets || 0)
      setTotalLiabilities(res.totalLiabilities || 0)
      setTotalEquity(res.totalEquity || 0)
      setTotalLiabilitiesAndEquity(res.totalLiabilitiesAndEquity || 0)
      setBalanced(res.balanced ?? true)
      setRetainedEarnings(res.retainedEarnings || 0)
    } catch (e: any) {
      setToast({ type: 'error', message: e?.message || 'Failed to load balance sheet' })
    } finally {
      setLoading(false)
    }
  }

  function handleExportPdf() {
    const rows = [
      ['ASSETS', '', ''],
      ...assetRows.map(r => [r.code, r.name, r.balance.toFixed(2)]),
      ['Total Assets', '', totalAssets.toFixed(2)],
      ['', '', ''],
      ['LIABILITIES', '', ''],
      ...liabilityRows.map(r => [r.code, r.name, r.balance.toFixed(2)]),
      ['Total Liabilities', '', totalLiabilities.toFixed(2)],
      ['', '', ''],
      ['EQUITY', '', ''],
      ...equityRows.map(r => [r.code, r.name, r.balance.toFixed(2)]),
      ['Total Equity', '', totalEquity.toFixed(2)],
      ['', '', ''],
      ['Total Liabilities + Equity', '', totalLiabilitiesAndEquity.toFixed(2)]
    ]

    exportToPdf({
      title: 'Balance Sheet',
      subtitle: `As of: ${asOf || 'Today'}`,
      filename: `balance-sheet-${asOf || 'today'}`,
      headers: ['Code', 'Account Name', 'Balance'],
      rows: rows
    })
  }

  return (
    <div className="p-6">
      <Toast toast={toast} onClose={() => setToast(null)} />

      <div className="bg-linear-to-r from-blue-600 to-indigo-700 rounded-lg shadow p-5 mb-6 flex items-center justify-between text-white">
        <div>
          <h1 className="text-2xl font-semibold">Balance Sheet</h1>
          <p className="text-sm text-blue-100 mt-1">Assets = Liabilities + Equity as of selected date</p>
        </div>
        <button onClick={handleExportPdf} className="px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg">
          Export PDF
        </button>
      </div>

      <div className="bg-white rounded-lg shadow p-4 mb-4">
        <div>
          <label className="block text-sm font-medium mb-1">As Of Date</label>
          <input type="date" value={asOf} onChange={e => setAsOf(e.target.value)} className="px-3 py-2 border rounded-lg w-48" />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="bg-blue-50 px-4 py-3 font-semibold text-blue-800">ASSETS</div>
          {loading ? <div className="p-4 text-center">Loading...</div> : (
            <table className="w-full text-sm">
              <tbody className="divide-y">
                {assetRows.map((r, i) => (
                  <tr key={i} className="hover:bg-gray-50">
                    <td className="px-4 py-2">{r.code}</td>
                    <td className="px-4 py-2">{r.name}</td>
                    <td className="px-4 py-2">
                      {r.module ? <span className="px-1.5 py-0.5 rounded text-xs bg-purple-100 text-purple-800">{r.module}</span> : '—'}
                    </td>
                    <td className="px-4 py-2 text-right">{r.balance.toFixed(2)}</td>
                  </tr>
                ))}
                <tr className="bg-blue-100 font-bold">
                  <td colSpan={3} className="px-4 py-2">Total Assets</td>
                  <td className="px-4 py-2 text-right">{totalAssets.toFixed(2)}</td>
                </tr>
              </tbody>
            </table>
          )}
        </div>

        <div>
          <div className="bg-white rounded-lg shadow overflow-hidden mb-4">
            <div className="bg-yellow-50 px-4 py-3 font-semibold text-yellow-800">LIABILITIES</div>
            {loading ? <div className="p-4 text-center">Loading...</div> : (
              <table className="w-full text-sm">
                <tbody className="divide-y">
                  {liabilityRows.map((r, i) => (
                    <tr key={i} className="hover:bg-gray-50">
                      <td className="px-4 py-2">{r.code}</td>
                      <td className="px-4 py-2">{r.name}</td>
                      <td className="px-4 py-2">
                        {r.module ? <span className="px-1.5 py-0.5 rounded text-xs bg-purple-100 text-purple-800">{r.module}</span> : '—'}
                      </td>
                      <td className="px-4 py-2 text-right">{r.balance.toFixed(2)}</td>
                    </tr>
                  ))}
                  <tr className="bg-yellow-100 font-bold">
                    <td colSpan={3} className="px-4 py-2">Total Liabilities</td>
                    <td className="px-4 py-2 text-right">{totalLiabilities.toFixed(2)}</td>
                  </tr>
                </tbody>
              </table>
            )}
          </div>

          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="bg-purple-50 px-4 py-3 font-semibold text-purple-800">EQUITY</div>
            {loading ? <div className="p-4 text-center">Loading...</div> : (
              <table className="w-full text-sm">
                <tbody className="divide-y">
                  {equityRows.map((r, i) => (
                    <tr key={i} className="hover:bg-gray-50">
                      <td className="px-4 py-2">{r.code}</td>
                      <td className="px-4 py-2">{r.name}</td>
                      <td className="px-4 py-2">
                        {r.module ? <span className="px-1.5 py-0.5 rounded text-xs bg-purple-100 text-purple-800">{r.module}</span> : '—'}
                      </td>
                      <td className="px-4 py-2 text-right">{r.balance.toFixed(2)}</td>
                    </tr>
                  ))}
                  <tr className="bg-purple-100 font-bold">
                    <td colSpan={3} className="px-4 py-2">Total Equity</td>
                    <td className="px-4 py-2 text-right">{totalEquity.toFixed(2)}</td>
                  </tr>
                </tbody>
              </table>
            )}
          </div>

          <div className={`mt-4 rounded-lg shadow p-4 text-center ${balanced ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'}`}>
            <div className="text-xl font-bold">Total L + E: {totalLiabilitiesAndEquity.toFixed(2)}</div>
          </div>
        </div>
      </div>

      <div className={`mt-6 rounded-lg shadow p-6 text-center ${balanced ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'}`}>
        <div className="text-2xl font-bold">
          {balanced ? '✓ Balanced' : '✗ Not Balanced'}: Assets ({totalAssets.toFixed(2)}) = L + E ({totalLiabilitiesAndEquity.toFixed(2)})
        </div>
        <div className="text-sm mt-2">Retained Earnings: {retainedEarnings.toFixed(2)}</div>
      </div>
    </div>
  )
}
