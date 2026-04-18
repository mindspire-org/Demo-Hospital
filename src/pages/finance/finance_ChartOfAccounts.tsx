import { useEffect, useMemo, useState } from 'react'
import { financeApi } from '../../utils/api'
import Toast, { type ToastState } from '../../components/ui/Toast'

const portals = ['hospital', 'lab', 'pharmacy', 'diagnostic', 'reception', 'finance', 'aesthetic', 'dialysis']
const accountTypes = ['Asset', 'Liability', 'Equity', 'Income', 'Expense']
const subTypes = ['CASH', 'RECEIVABLE', 'PAYABLE', 'USER_ACCOUNT', 'REVENUE', 'BANK']

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

export default function Finance_ChartOfAccounts() {
  const [accounts, setAccounts] = useState<Account[]>([])
  const [loading, setLoading] = useState(false)
  const [toast, setToast] = useState<ToastState>(null)
  const [search, setSearch] = useState('')
  const [filterPortal, setFilterPortal] = useState<string>('')
  const [filterType, setFilterType] = useState<string>('')
  const [filterActive, setFilterActive] = useState<boolean | ''>('')

  // Modal states
  const [showCreate, setShowCreate] = useState(false)
  const [showEdit, setShowEdit] = useState<Account | null>(null)
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    type: '',
    subType: '',
    portal: '',
    active: true,
  })

  const refresh = async () => {
    setLoading(true)
    try {
      const res = await financeApi.listChartOfAccounts({
        portal: filterPortal || undefined,
        type: filterType || undefined,
        active: filterActive !== '' ? filterActive : undefined,
      })
      setAccounts(res || [])
    } catch (e) {
      console.error(e)
      setToast({ type: 'error', message: 'Failed to load accounts' })
    }
    setLoading(false)
  }

  useEffect(() => {
    refresh()
  }, [filterPortal, filterType, filterActive])

  const filtered = useMemo(() => {
    if (!search) return accounts
    const s = search.toLowerCase()
    return accounts.filter(a =>
      (a.code?.toLowerCase().includes(s)) ||
      (a.name?.toLowerCase().includes(s)) ||
      (a.type?.toLowerCase().includes(s)) ||
      (a.portal?.toLowerCase().includes(s))
    )
  }, [accounts, search])

  const handleCreate = async () => {
    if (!formData.name || !formData.type) {
      setToast({ type: 'error', message: 'Name and Type are required' })
      return
    }
    try {
      await financeApi.createChartOfAccount(formData)
      setToast({ type: 'success', message: 'Account created successfully' })
      setShowCreate(false)
      setFormData({ code: '', name: '', type: '', subType: '', portal: '', active: true })
      refresh()
    } catch (e: any) {
      setToast({ type: 'error', message: e?.message || 'Failed to create account' })
    }
  }

  const handleUpdate = async () => {
    if (!showEdit) return
    try {
      await financeApi.updateChartOfAccount(showEdit._id, formData)
      setToast({ type: 'success', message: 'Account updated successfully' })
      setShowEdit(null)
      refresh()
    } catch (e: any) {
      setToast({ type: 'error', message: e?.message || 'Failed to update account' })
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this account?')) return
    try {
      await financeApi.deleteChartOfAccount(id)
      setToast({ type: 'success', message: 'Account deleted successfully' })
      refresh()
    } catch (e: any) {
      setToast({ type: 'error', message: e?.message || 'Failed to delete account' })
    }
  }

  const openEdit = (account: Account) => {
    setFormData({
      code: account.code || '',
      name: account.name,
      type: account.type,
      subType: account.subType || '',
      portal: account.portal || '',
      active: account.active,
    })
    setShowEdit(account)
  }

  return (
    <div className="p-6">
      <Toast toast={toast} onClose={() => setToast(null)} />

      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold">Chart of Accounts</h1>
        <button
          onClick={() => setShowCreate(true)}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          + New Account
        </button>
      </div>

      {/* Filters */}
      <div className="grid grid-cols-4 gap-4 mb-4">
        <input
          type="text"
          placeholder="Search accounts..."
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
        <select
          value={filterType}
          onChange={e => setFilterType(e.target.value)}
          className="px-3 py-2 border rounded-lg"
        >
          <option value="">All Types</option>
          {accountTypes.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
        <select
          value={String(filterActive)}
          onChange={e => setFilterActive(e.target.value === '' ? '' : e.target.value === 'true')}
          className="px-3 py-2 border rounded-lg"
        >
          <option value="">All Status</option>
          <option value="true">Active</option>
          <option value="false">Inactive</option>
        </select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg shadow overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Code</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Name</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Type</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">SubType</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Portal</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Balance</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Status</th>
              <th className="px-4 py-3 text-right text-sm font-medium text-gray-700">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(account => (
              <tr key={account._id} className="border-t hover:bg-gray-50">
                <td className="px-4 py-3 text-sm">{account.code || '-'}</td>
                <td className="px-4 py-3 text-sm font-medium">{account.name}</td>
                <td className="px-4 py-3 text-sm">
                  <span className="px-2 py-1 rounded text-xs bg-blue-100 text-blue-800">{account.type}</span>
                </td>
                <td className="px-4 py-3 text-sm">{account.subType || '-'}</td>
                <td className="px-4 py-3 text-sm">{account.portal || '-'}</td>
                <td className="px-4 py-3 text-sm font-mono">{account.balance.toLocaleString()}</td>
                <td className="px-4 py-3 text-sm">
                  <span className={`px-2 py-1 rounded text-xs ${account.active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                    {account.active ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td className="px-4 py-3 text-right space-x-2">
                  <button
                    onClick={() => openEdit(account)}
                    className="text-blue-600 hover:text-blue-800 text-sm"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(account._id)}
                    className="text-red-600 hover:text-red-800 text-sm"
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-gray-500">
                  {loading ? 'Loading...' : 'No accounts found'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Create Modal */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-semibold mb-4">Create Account</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Code (optional)</label>
                <input
                  type="text"
                  value={formData.code}
                  onChange={e => setFormData({ ...formData, code: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                  placeholder="e.g., REC-001"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Name *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                  placeholder="e.g., ali/reception"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Type *</label>
                <select
                  value={formData.type}
                  onChange={e => setFormData({ ...formData, type: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                >
                  <option value="">Select type</option>
                  {accountTypes.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">SubType</label>
                <select
                  value={formData.subType}
                  onChange={e => setFormData({ ...formData, subType: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                >
                  <option value="">Select subtype</option>
                  {subTypes.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Portal</label>
                <select
                  value={formData.portal}
                  onChange={e => setFormData({ ...formData, portal: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                >
                  <option value="">Select portal</option>
                  {portals.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="active"
                  checked={formData.active}
                  onChange={e => setFormData({ ...formData, active: e.target.checked })}
                  className="w-4 h-4"
                />
                <label htmlFor="active" className="text-sm">Active</label>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowCreate(false)}
                className="flex-1 px-4 py-2 border rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleCreate}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Create
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {showEdit && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-semibold mb-4">Edit Account</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Code</label>
                <input
                  type="text"
                  value={formData.code}
                  onChange={e => setFormData({ ...formData, code: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Name *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Type *</label>
                <select
                  value={formData.type}
                  onChange={e => setFormData({ ...formData, type: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                >
                  <option value="">Select type</option>
                  {accountTypes.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">SubType</label>
                <select
                  value={formData.subType}
                  onChange={e => setFormData({ ...formData, subType: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                >
                  <option value="">Select subtype</option>
                  {subTypes.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Portal</label>
                <select
                  value={formData.portal}
                  onChange={e => setFormData({ ...formData, portal: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                >
                  <option value="">Select portal</option>
                  {portals.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="activeEdit"
                  checked={formData.active}
                  onChange={e => setFormData({ ...formData, active: e.target.checked })}
                  className="w-4 h-4"
                />
                <label htmlFor="activeEdit" className="text-sm">Active</label>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowEdit(null)}
                className="flex-1 px-4 py-2 border rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleUpdate}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Update
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
