import { useEffect, useState } from 'react'
import { financeApi } from '../../utils/api'
import Toast, { type ToastState } from '../../components/ui/Toast'

type Account = {
  _id: string
  name: string
  type: string
  subType?: string
  code?: string
}

type Transaction = {
  id: string
  dateIso: string
  createdAt: string
  account: string
  type: 'Credit' | 'Debit'
  amount: number
  description: string
}

export default function Finance_AccountTransactions() {
  const [accounts, setAccounts] = useState<Account[]>([])
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(false)
  const [toast, setToast] = useState<ToastState>(null)

  const [accountId, setAccountId] = useState('')
  const [transactionType, setTransactionType] = useState<'Credit' | 'Debit'>('Credit')
  const [amount, setAmount] = useState('')
  const [description, setDescription] = useState('')

  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)
  const [limit, setLimit] = useState(20)

  // Modal state
  const [showAddModal, setShowAddModal] = useState(false)

  // Searchable account dropdown state
  const [accountDropdownOpen, setAccountDropdownOpen] = useState(false)
  const [accountSearch, setAccountSearch] = useState('')

  // Table filters
  const [filterAccount, setFilterAccount] = useState('')
  const [filterType, setFilterType] = useState('')

  const filteredAccounts = accounts.filter(a =>
    a.name.toLowerCase().includes(accountSearch.toLowerCase()) ||
    (a.code && a.code.toLowerCase().includes(accountSearch.toLowerCase()))
  )

  const selectedAccount = accounts.find(a => a._id === accountId)

  const loadAccounts = async () => {
    try {
      const res: any = await financeApi.listChartOfAccounts({ active: true, page: 1, limit: 0 })
      setAccounts(res.accounts || [])
    } catch (e) {
      console.error(e)
      setToast({ type: 'error', message: 'Failed to load accounts' })
    }
  }

  const loadTransactions = async () => {
    setLoading(true)
    try {
      const res: any = await financeApi.listAccountTransactions({ from, to, page, limit, accountId: filterAccount || undefined, transactionType: filterType as 'Credit' | 'Debit' | undefined })
      setTransactions(res.transactions || [])
      setTotalPages(res.totalPages || 1)
      setTotal(res.total || 0)
    } catch (e) {
      console.error(e)
      setToast({ type: 'error', message: 'Failed to load transactions' })
    }
    setLoading(false)
  }

  useEffect(() => {
    loadAccounts()
    loadTransactions()
  }, [page, from, to, limit, filterAccount, filterType])

  // Close account dropdown when clicking outside
  useEffect(() => {
    if (!accountDropdownOpen) return
    const handleClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      if (!target.closest('.account-dropdown')) {
        setAccountDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [accountDropdownOpen])

  // Reset dropdown state when modal opens/closes
  useEffect(() => {
    setAccountDropdownOpen(false)
    setAccountSearch('')
  }, [showAddModal])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!accountId || !amount) {
      setToast({ type: 'error', message: 'Account and Amount are required' })
      return
    }

    setLoading(true)
    try {
      await financeApi.createAccountTransaction({
        accountId,
        transactionType,
        amount: Number(amount),
        description: description || undefined,
      })
      setToast({ type: 'success', message: 'Transaction recorded successfully' })
      setShowAddModal(false)
      // Reset form
      setAccountId('')
      setTransactionType('Credit')
      setAmount('')
      setDescription('')
      // Reload transactions
      loadTransactions()
    } catch (e: any) {
      setToast({ type: 'error', message: e?.message || 'Failed to record transaction' })
    }
    setLoading(false)
  }

  return (
    <div className="p-6">
      <Toast toast={toast} onClose={() => setToast(null)} />

      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold">Account Transactions</h1>
        <button
          onClick={() => setShowAddModal(true)}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          + Add New Transaction
        </button>
      </div>

      {/* Add Transaction Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-semibold mb-4">Add New Transaction</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Account *</label>
                <div className="relative account-dropdown">
                  <input
                    type="text"
                    value={accountDropdownOpen ? accountSearch : (selectedAccount ? `${selectedAccount.name} (${selectedAccount.type})` : '')}
                    onChange={e => {
                      setAccountSearch(e.target.value)
                      if (!accountDropdownOpen) setAccountDropdownOpen(true)
                      if (accountId) setAccountId('')
                    }}
                    onFocus={() => {
                      setAccountDropdownOpen(true)
                      setAccountSearch('')
                      if (accountId) setAccountId('')
                    }}
                    placeholder="Search or select account..."
                    className="w-full px-3 py-2 border rounded-lg text-sm"
                    required={!accountId}
                  />
                  {accountDropdownOpen && (
                    <div className="absolute z-10 w-full mt-1 bg-white border rounded-lg shadow-lg max-h-60 overflow-auto">
                      {filteredAccounts.length === 0 && (
                        <div className="px-3 py-2 text-sm text-gray-500">No accounts found</div>
                      )}
                      {filteredAccounts.map(a => (
                        <button
                          key={a._id}
                          type="button"
                          onClick={() => {
                            setAccountId(a._id)
                            setAccountDropdownOpen(false)
                            setAccountSearch('')
                          }}
                          className={`w-full px-3 py-2 text-left text-sm hover:bg-gray-100 ${
                            accountId === a._id ? 'bg-blue-50 text-blue-700' : ''
                          }`}
                        >
                          {a.code && <span className="text-gray-400 mr-2">{a.code}</span>}
                          {a.name} <span className="text-gray-400">({a.type})</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Transaction Type *</label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setTransactionType('Credit')}
                    className={`flex-1 px-4 py-2 border rounded-lg text-sm font-medium ${
                      transactionType === 'Credit'
                        ? 'bg-green-600 text-white border-green-600'
                        : 'bg-white text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    Credit
                  </button>
                  <button
                    type="button"
                    onClick={() => setTransactionType('Debit')}
                    className={`flex-1 px-4 py-2 border rounded-lg text-sm font-medium ${
                      transactionType === 'Debit'
                        ? 'bg-red-600 text-white border-red-600'
                        : 'bg-white text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    Debit
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Amount (PKR) *</label>
                <input
                  type="number"
                  value={amount}
                  onChange={e => setAmount(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg"
                  placeholder="Enter amount"
                  min="1"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Description</label>
                <input
                  type="text"
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg"
                  placeholder="Enter description..."
                />
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 px-4 py-2 border rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  {loading ? 'Recording...' : 'Record'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Transactions List */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-4 border-b">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-medium">Transaction History</h2>
          </div>

          <div className="flex gap-4 flex-wrap">
            <div>
              <label className="block text-sm font-medium mb-1">Account</label>
              <select
                value={filterAccount}
                onChange={e => { setFilterAccount(e.target.value); setPage(1) }}
                className="px-3 py-2 border rounded-lg"
              >
                <option value="">All Accounts</option>
                {accounts.map(a => (
                  <option key={a._id} value={a._id}>{a.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Type</label>
              <select
                value={filterType}
                onChange={e => { setFilterType(e.target.value); setPage(1) }}
                className="px-3 py-2 border rounded-lg"
              >
                <option value="">All Types</option>
                <option value="Credit">Credit</option>
                <option value="Debit">Debit</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">From Date</label>
              <input
                type="date"
                value={from}
                onChange={e => setFrom(e.target.value)}
                className="px-3 py-2 border rounded-lg"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">To Date</label>
              <input
                type="date"
                value={to}
                onChange={e => setTo(e.target.value)}
                className="px-3 py-2 border rounded-lg"
              />
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Date</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Account</th>
                <th className="px-4 py-3 text-center text-sm font-medium text-gray-700">Type</th>
                <th className="px-4 py-3 text-right text-sm font-medium text-gray-700">Amount</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Description</th>
              </tr>
            </thead>
            <tbody>
              {transactions.map((t) => (
                <tr key={t.id} className="border-t hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm">{new Date(t.dateIso).toLocaleDateString()}</td>
                  <td className="px-4 py-3 text-sm font-medium">{t.account}</td>
                  <td className="px-4 py-3 text-center">
                    <span className={`px-2 py-1 rounded text-xs font-medium ${
                      t.type === 'Credit' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                    }`}>
                      {t.type}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-right font-mono font-semibold">
                    {t.amount.toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">{t.description || '-'}</td>
                </tr>
              ))}
              {transactions.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-gray-500">
                    {loading ? 'Loading...' : 'No transactions found'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

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
              {total} transaction{total !== 1 ? 's' : ''}
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
