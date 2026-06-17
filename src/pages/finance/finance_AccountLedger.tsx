import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { financeApi } from '../../utils/api'
import Toast, { type ToastState } from '../../components/ui/Toast'
import { exportToPdf } from '../../utils/financeExportPdf'

type LedgerEntry = {
  _id: string
  dateIso: string
  refType?: string
  refId?: string
  memo?: string
  debit: number
  credit: number
  balance: number
}

type Account = {
  _id: string
  code?: string
  name: string
  type: string
  balance: number
}

export default function Finance_AccountLedger() {
  const { accountId } = useParams<{ accountId: string }>()
  const navigate = useNavigate()
  const [account, setAccount] = useState<Account | null>(null)
  const [entries, setEntries] = useState<LedgerEntry[]>([])
  const [loading, setLoading] = useState(false)
  const [toast, setToast] = useState<ToastState>(null)
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)
  const [limit, setLimit] = useState(20)

  const loadAccount = async () => {
    if (!accountId) return
    try {
      const res = await financeApi.getChartOfAccount(accountId)
      setAccount(res)
    } catch (e) {
      console.error(e)
      setToast({ type: 'error', message: 'Failed to load account' })
    }
  }

  const loadLedger = async () => {
    if (!accountId) return
    setLoading(true)
    try {
      const res: any = await financeApi.getAccountLedger(accountId, { from, to, page, limit })
      setEntries(res.ledger || [])
      setTotal(res.total || 0)
      setTotalPages(res.totalPages || 1)
    } catch (e) {
      console.error(e)
      setToast({ type: 'error', message: 'Failed to load ledger' })
    }
    setLoading(false)
  }

  useEffect(() => {
    loadAccount()
    loadLedger()
  }, [accountId, page, limit])

  // Entries already have debit, credit, and running balance from backend

  function handleExportPdf() {
    if (!account) return
    exportToPdf({
      title: `${account.name} - Account Ledger`,
      subtitle: `${account.code ? `Code: ${account.code} | ` : ''}Type: ${account.type} | Balance: ${account.balance.toFixed(2)}`,
      filename: `ledger-${account.name.replace(/\s+/g, '-')}-${new Date().toISOString().slice(0, 10)}`,
      headers: ['Date', 'Reference', 'Description', 'Debit', 'Credit', 'Balance'],
      rows: entries.map(e => [
        new Date(e.dateIso).toLocaleDateString(),
        [e.refType, e.refId ? `#${String(e.refId).slice(-6)}` : ''].filter(Boolean).join(' ') || '-',
        e.memo || '-',
        e.debit > 0 ? e.debit.toFixed(2) : '-',
        e.credit > 0 ? e.credit.toFixed(2) : '-',
        e.balance.toFixed(2)
      ])
    })
  }

  return (
    <div className="p-6">
      <Toast toast={toast} onClose={() => setToast(null)} />

      <div className="flex items-center gap-4 mb-6">
        <button
          onClick={() => navigate('/finance/accounts-ledger')}
          className="text-blue-600 hover:text-blue-800"
        >
          ← Back to Accounts Ledger
        </button>
      </div>

      {account && (
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-semibold">{account.name}</h1>
              <p className="text-gray-600 mt-1">
                {account.code && <span className="mr-4">Code: {account.code}</span>}
                Type: <span className="px-2 py-1 rounded text-xs bg-blue-100 text-blue-800">{account.type}</span>
              </p>
            </div>
            <div className="flex items-center gap-4">
              <button
                onClick={handleExportPdf}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
              >
                Export PDF
              </button>
              <div className="text-right">
                <p className="text-sm text-gray-600">Current Balance</p>
                <p className="text-2xl font-mono font-semibold">{account.balance.toLocaleString()}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex gap-4 mb-4">
        <input
          type="date"
          value={from}
          onChange={e => setFrom(e.target.value)}
          className="px-3 py-2 border rounded-lg"
          placeholder="From"
        />
        <input
          type="date"
          value={to}
          onChange={e => setTo(e.target.value)}
          className="px-3 py-2 border rounded-lg"
          placeholder="To"
        />
        <button
          onClick={loadLedger}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          Filter
        </button>
      </div>

      {/* Ledger Table */}
      <div className="bg-white rounded-lg shadow overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Date</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Reference</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Description</th>
              <th className="px-4 py-3 text-right text-sm font-medium text-gray-700">Debit</th>
              <th className="px-4 py-3 text-right text-sm font-medium text-gray-700">Credit</th>
              <th className="px-4 py-3 text-right text-sm font-medium text-gray-700">Balance</th>
            </tr>
          </thead>
          <tbody>
            {entries.map((e) => (
              <tr key={e._id} className="border-t hover:bg-gray-50">
                <td className="px-4 py-3 text-sm">{new Date(e.dateIso).toLocaleDateString()}</td>
                <td className="px-4 py-3 text-sm">
                  {e.refType && <span className="text-gray-600">{e.refType}</span>}
                  {e.refId && <span className="text-gray-400 ml-1">#{String(e.refId).slice(-6)}</span>}
                </td>
                <td className="px-4 py-3 text-sm">{e.memo || '-'}</td>
                <td className="px-4 py-3 text-sm text-right font-mono">
                  {e.debit > 0 ? e.debit.toLocaleString() : '-'}
                </td>
                <td className="px-4 py-3 text-sm text-right font-mono">
                  {e.credit > 0 ? e.credit.toLocaleString() : '-'}
                </td>
                <td className="px-4 py-3 text-sm text-right font-mono font-medium">
                  {e.balance.toLocaleString()}
                </td>
              </tr>
            ))}
            {entries.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                  {loading ? 'Loading...' : 'No transactions found'}
                </td>
              </tr>
            )}
          </tbody>
        </table>

        {/* Pagination */}
        <div className="p-4 border-t flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600">Rows:</span>
            <select
              value={limit}
              onChange={e => { setLimit(Number(e.target.value)); setPage(1) }}
              className="px-2 py-1 border rounded text-sm"
            >
              <option value={20}>20</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
              <option value={0}>All</option>
            </select>
            <span className="text-sm text-gray-500">
              {total} entr{total !== 1 ? 'ies' : 'y'}
            </span>
          </div>
          {totalPages > 1 && (
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-3 py-1 border rounded hover:bg-gray-50 disabled:opacity-50 text-sm"
              >
                Previous
              </button>
              <span className="text-sm text-gray-600">
                Page {page} of {totalPages}
              </span>
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="px-3 py-1 border rounded hover:bg-gray-50 disabled:opacity-50 text-sm"
              >
                Next
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
