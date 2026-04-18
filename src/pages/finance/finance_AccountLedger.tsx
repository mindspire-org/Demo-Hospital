import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { financeApi } from '../../utils/api'
import Toast, { type ToastState } from '../../components/ui/Toast'

type JournalLine = {
  account: string
  debit: number
  credit: number
  tags?: any
}

type Journal = {
  _id: string
  dateIso: string
  refType?: string
  refId?: string
  memo?: string
  lines: JournalLine[]
  status: string
  createdAt: string
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
  const [journals, setJournals] = useState<Journal[]>([])
  const [loading, setLoading] = useState(false)
  const [toast, setToast] = useState<ToastState>(null)
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')

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
      const res = await financeApi.getAccountLedger(accountId, { from, to })
      setJournals(res || [])
    } catch (e) {
      console.error(e)
      setToast({ type: 'error', message: 'Failed to load ledger' })
    }
    setLoading(false)
  }

  useEffect(() => {
    loadAccount()
    loadLedger()
  }, [accountId])

  const filteredJournals = journals.filter(j =>
    j.lines.some(l => l.account === account?.name)
  )

  const calculateRunningBalance = () => {
    let balance = 0
    return filteredJournals.map(j => {
      const line = j.lines.find(l => l.account === account?.name)
      const debit = line?.debit || 0
      const credit = line?.credit || 0
      balance += debit - credit
      return { ...j, debit, credit, runningBalance: balance }
    })
  }

  const journalWithBalance = calculateRunningBalance()

  return (
    <div className="p-6">
      <Toast toast={toast} onClose={() => setToast(null)} />

      <div className="flex items-center gap-4 mb-6">
        <button
          onClick={() => navigate('/finance/chart-of-accounts')}
          className="text-blue-600 hover:text-blue-800"
        >
          ← Back to Chart of Accounts
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
            <div className="text-right">
              <p className="text-sm text-gray-600">Current Balance</p>
              <p className="text-2xl font-mono font-semibold">{account.balance.toLocaleString()}</p>
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
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Memo</th>
              <th className="px-4 py-3 text-right text-sm font-medium text-gray-700">Debit</th>
              <th className="px-4 py-3 text-right text-sm font-medium text-gray-700">Credit</th>
              <th className="px-4 py-3 text-right text-sm font-medium text-gray-700">Balance</th>
              <th className="px-4 py-3 text-center text-sm font-medium text-gray-700">Status</th>
            </tr>
          </thead>
          <tbody>
            {journalWithBalance.map((j) => (
              <tr key={j._id} className="border-t hover:bg-gray-50">
                <td className="px-4 py-3 text-sm">{new Date(j.dateIso).toLocaleDateString()}</td>
                <td className="px-4 py-3 text-sm">
                  {j.refType && <span className="text-gray-600">{j.refType}</span>}
                  {j.refId && <span className="text-gray-400 ml-1">#{j.refId.slice(-6)}</span>}
                </td>
                <td className="px-4 py-3 text-sm">{j.memo || '-'}</td>
                <td className="px-4 py-3 text-sm text-right font-mono">
                  {j.debit > 0 ? j.debit.toLocaleString() : '-'}
                </td>
                <td className="px-4 py-3 text-sm text-right font-mono">
                  {j.credit > 0 ? j.credit.toLocaleString() : '-'}
                </td>
                <td className="px-4 py-3 text-sm text-right font-mono font-medium">
                  {j.runningBalance.toLocaleString()}
                </td>
                <td className="px-4 py-3 text-center">
                  <span className={`px-2 py-1 rounded text-xs ${j.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                    {j.status}
                  </span>
                </td>
              </tr>
            ))}
            {journalWithBalance.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-gray-500">
                  {loading ? 'Loading...' : 'No transactions found'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
