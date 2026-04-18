import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { financeApi } from '../../utils/api'
import Toast, { type ToastState } from '../../components/ui/Toast'

const portals = ['hospital', 'lab', 'pharmacy', 'diagnostic', 'reception', 'finance', 'aesthetic', 'dialysis']

type Account = {
  _id: string
  code?: string
  name: string
  type: string
  subType?: string
  portal?: string
  linkedUserId?: string
  linkedUsername?: string
  balance: number
  active: boolean
}

export default function Finance_UserAccounts() {
  const navigate = useNavigate()
  const [accounts, setAccounts] = useState<Account[]>([])
  const [loading, setLoading] = useState(false)
  const [toast, setToast] = useState<ToastState>(null)
  const [search, setSearch] = useState('')
  const [filterPortal, setFilterPortal] = useState<string>('')

  const refresh = async () => {
    setLoading(true)
    try {
      const res = await financeApi.listChartOfAccounts({
        portal: filterPortal || undefined,
        active: true,
      })
      // Filter for user accounts client-side
      const userAccounts = (res || []).filter((a: Account) => a.subType === 'USER_ACCOUNT')
      setAccounts(userAccounts)
    } catch (e) {
      console.error(e)
      setToast({ type: 'error', message: 'Failed to load user accounts' })
    }
    setLoading(false)
  }

  useEffect(() => {
    refresh()
  }, [filterPortal])

  const filtered = useMemo(() => {
    if (!search) return accounts
    const s = search.toLowerCase()
    return accounts.filter(a =>
      (a.name?.toLowerCase().includes(s)) ||
      (a.linkedUsername?.toLowerCase().includes(s)) ||
      (a.portal?.toLowerCase().includes(s))
    )
  }, [accounts, search])

  const viewLedger = (accountId: string) => {
    navigate(`/finance/ledger/${accountId}`)
  }

  return (
    <div className="p-6">
      <Toast toast={toast} onClose={() => setToast(null)} />

      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold">User Accounts</h1>
        <p className="text-gray-600 text-sm">
          These are user-linked accounts for cash handling across all portals
        </p>
      </div>

      {/* Filters */}
      <div className="grid grid-cols-3 gap-4 mb-4">
        <input
          type="text"
          placeholder="Search by name or username..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="px-3 py-2 border rounded-lg"
        />
        <select
          value={filterPortal}
          onChange={e => setFilterPortal(e.target.value)}
          className="px-3 py-2 border rounded-lg"
        >
          <option value="">All Portals</option>
          {portals.map(p => <option key={p} value={p}>{p}</option>)}
        </select>
        <button
          onClick={refresh}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          Refresh
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-lg shadow p-4">
          <p className="text-sm text-gray-600">Total User Accounts</p>
          <p className="text-2xl font-semibold">{accounts.length}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <p className="text-sm text-gray-600">With Positive Balance</p>
          <p className="text-2xl font-semibold text-green-600">
            {accounts.filter(a => a.balance > 0).length}
          </p>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <p className="text-sm text-gray-600">With Negative Balance</p>
          <p className="text-2xl font-semibold text-red-600">
            {accounts.filter(a => a.balance < 0).length}
          </p>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <p className="text-sm text-gray-600">Zero Balance</p>
          <p className="text-2xl font-semibold text-gray-600">
            {accounts.filter(a => a.balance === 0).length}
          </p>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg shadow overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Username</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Account Name</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Portal</th>
              <th className="px-4 py-3 text-right text-sm font-medium text-gray-700">Balance (PKR)</th>
              <th className="px-4 py-3 text-center text-sm font-medium text-gray-700">Status</th>
              <th className="px-4 py-3 text-right text-sm font-medium text-gray-700">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(account => (
              <tr key={account._id} className="border-t hover:bg-gray-50">
                <td className="px-4 py-3 text-sm font-medium">
                  {account.linkedUsername || account.name.split('/')[0] || '-'}
                </td>
                <td className="px-4 py-3 text-sm">{account.name}</td>
                <td className="px-4 py-3 text-sm">
                  <span className="px-2 py-1 rounded text-xs bg-purple-100 text-purple-800">
                    {account.portal || '-'}
                  </span>
                </td>
                <td className="px-4 py-3 text-sm text-right font-mono font-medium">
                  <span className={account.balance < 0 ? 'text-red-600' : account.balance > 0 ? 'text-green-600' : ''}>
                    {account.balance.toLocaleString()}
                  </span>
                </td>
                <td className="px-4 py-3 text-center">
                  <span className={`px-2 py-1 rounded text-xs ${account.active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                    {account.active ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td className="px-4 py-3 text-right">
                  <button
                    onClick={() => viewLedger(account._id)}
                    className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                  >
                    View Ledger
                  </button>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                  {loading ? 'Loading...' : 'No user accounts found'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
