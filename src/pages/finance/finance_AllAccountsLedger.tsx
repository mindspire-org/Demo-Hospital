import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { financeApi } from '../../utils/api'
import Toast, { type ToastState } from '../../components/ui/Toast'
import { exportToPdf } from '../../utils/financeExportPdf'

type Account = {
  _id: string
  code?: string
  name: string
  type: string
  subType?: string
  portal?: string
  active: boolean
  currency?: string
  balance: number
}

export default function Finance_AllAccountsLedger() {
  const navigate = useNavigate()
  const [accounts, setAccounts] = useState<Account[]>([])
  const [loading, setLoading] = useState(false)
  const [toast, setToast] = useState<ToastState>(null)
  const [typeFilter, setTypeFilter] = useState('')
  const [subTypeFilter, setSubTypeFilter] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [activeFilter, setActiveFilter] = useState('')
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)
  const [limit, setLimit] = useState(0)

  // Build unique subType options from loaded accounts
  const subTypeOptions = Array.from(new Set(accounts.map(a => a.subType).filter(Boolean))).sort()

  const loadAccounts = async () => {
    setLoading(true)
    try {
      const res: any = await financeApi.listAllAccountsLedger({
        type: typeFilter || undefined,
        subType: subTypeFilter || undefined,
        search: searchQuery || undefined,
        active: activeFilter !== '' ? activeFilter === 'true' : undefined,
        page,
        limit,
      })
      setAccounts(res.accounts || [])
      setTotal(res.total || 0)
      setTotalPages(res.totalPages || 1)
    } catch (e) {
      console.error(e)
      setToast({ type: 'error', message: 'Failed to load accounts' })
    }
    setLoading(false)
  }

  useEffect(() => {
    loadAccounts()
  }, [typeFilter, activeFilter, page, limit])

  const handleRowClick = (accountId: string) => {
    navigate(`/finance/ledger/${accountId}`)
  }

  const totalBalance = accounts.reduce((sum, acc) => sum + acc.balance, 0)

  function handleExportPdf() {
    exportToPdf({
      title: 'Accounts Ledger',
      subtitle: `${accounts.length} accounts | Total Balance: ${totalBalance.toFixed(2)}`,
      filename: `accounts-ledger-${new Date().toISOString().slice(0, 10)}`,
      headers: ['Code', 'Name', 'Account Type', 'Detail Type', 'Balance', 'Status'],
      rows: accounts.map(a => [a.code || '-', a.name, a.type, a.subType || '-', a.balance.toFixed(2), a.active ? 'Active' : 'Inactive'])
    })
  }

  return (
    <div className="p-6">
      <Toast toast={toast} onClose={() => setToast(null)} />

      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold">Accounts Ledger</h1>
        <button
          onClick={handleExportPdf}
          className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
        >
          Export PDF
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <div className="flex flex-wrap gap-4 items-end">
          <div className="flex-1 min-w-[200px]">
            <label className="block text-sm font-medium mb-1">Search (Name / Code / Type / Detail)</label>
            <input
              type="text"
              placeholder="e.g. CASH, 2000, Asset..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && loadAccounts()}
              className="w-full px-3 py-2 border rounded-lg"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Account Type</label>
            <select
              value={typeFilter}
              onChange={e => setTypeFilter(e.target.value)}
              className="px-3 py-2 border rounded-lg"
            >
              <option value="">All Types</option>
              <option value="ASSETS">Assets</option>
              <option value="LIABILITIES">Liabilities</option>
              <option value="EQUITY">Equity</option>
              <option value="INCOME">Income</option>
              <option value="EXPENSE">Expense</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Detail Type</label>
            <select
              value={subTypeFilter}
              onChange={e => setSubTypeFilter(e.target.value)}
              className="px-3 py-2 border rounded-lg min-w-[150px]"
            >
              <option value="">All Detail Types</option>
              {subTypeOptions.map(st => (
                <option key={st} value={st}>{st}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Status</label>
            <select
              value={activeFilter}
              onChange={e => setActiveFilter(e.target.value)}
              className="px-3 py-2 border rounded-lg"
            >
              <option value="">All</option>
              <option value="true">Active</option>
              <option value="false">Inactive</option>
            </select>
          </div>

          <button
            onClick={loadAccounts}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Filter
          </button>

          <button
            onClick={() => { setSearchQuery(''); setTypeFilter(''); setSubTypeFilter(''); setActiveFilter(''); setPage(1); }}
            className="px-4 py-2 border rounded-lg hover:bg-gray-50 text-sm"
          >
            Clear
          </button>
        </div>
      </div>

      {/* Summary */}
      <div className="bg-blue-50 rounded-lg p-4 mb-6">
        <div className="flex justify-between items-center">
          <span className="text-sm text-blue-800">Total Accounts</span>
          <span className="text-lg font-semibold text-blue-800">{accounts.length}</span>
        </div>
      </div>

      {/* Accounts Table */}
      <div className="bg-white rounded-lg shadow overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Code</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Name</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Account Type</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Detail Type</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Portal</th>
              <th className="px-4 py-3 text-right text-sm font-medium text-gray-700">Balance</th>
              <th className="px-4 py-3 text-center text-sm font-medium text-gray-700">Status</th>
            </tr>
          </thead>
          <tbody>
            {accounts.map((acc) => (
              <tr
                key={acc._id}
                onClick={() => handleRowClick(acc._id)}
                className="border-t hover:bg-blue-50 cursor-pointer"
              >
                <td className="px-4 py-3 text-sm">{acc.code || '-'}</td>
                <td className="px-4 py-3 text-sm font-medium">{acc.name}</td>
                <td className="px-4 py-3 text-sm">
                  <span className={`px-2 py-1 rounded text-xs ${
                    acc.type === 'Asset' ? 'bg-green-100 text-green-800' :
                    acc.type === 'Liability' ? 'bg-red-100 text-red-800' :
                    acc.type === 'Income' ? 'bg-blue-100 text-blue-800' :
                    acc.type === 'Expense' ? 'bg-orange-100 text-orange-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {acc.type}
                  </span>
                </td>
                <td className="px-4 py-3 text-sm text-gray-600">{acc.subType || '-'}</td>
                <td className="px-4 py-3 text-sm text-gray-600">{acc.portal || '-'}</td>
                <td className="px-4 py-3 text-sm text-right font-mono font-semibold">
                  {acc.balance.toLocaleString()}
                </td>
                <td className="px-4 py-3 text-center">
                  <span className={`px-2 py-1 rounded text-xs ${
                    acc.active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                  }`}>
                    {acc.active ? 'Active' : 'Inactive'}
                  </span>
                </td>
              </tr>
            ))}
            {accounts.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-gray-500">
                  {loading ? 'Loading...' : 'No accounts found'}
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
              {total} account{total !== 1 ? 's' : ''}
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

      <p className="text-sm text-gray-500 mt-4 text-center">
        Click on any account to view its detailed ledger
      </p>
    </div>
  )
}
