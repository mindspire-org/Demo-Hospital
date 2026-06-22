import { useEffect, useMemo, useRef, useState } from 'react'
import { financeApi } from '../../utils/api'
import Toast, { type ToastState } from '../../components/ui/Toast'
import { exportToPdf } from '../../utils/financeExportPdf'

const currencies = ['PKR', 'USD', 'EUR', 'GBP']

const ACCOUNT_MODULES = ['opd','er','ipd','lab','pharmacy','diagnostic','dialysis','aesthetic','general'] as const
const ACCOUNT_TYPES = ['ASSETS','LIABILITIES','EQUITY','INCOME','EXPENSE'] as const

type Account = {
  _id: string
  code?: string
  name: string
  type: string
  subType?: string
  module?: string
  parentId?: string
  isGroup?: boolean
  linkedUserId?: string
  linkedUsername?: string
  balance: number
  active: boolean
  currency?: string
  tax?: number
  systemNames?: string[]
}

export default function Finance_ChartOfAccounts() {
  const [accounts, setAccounts] = useState<Account[]>([])
  const [loading, setLoading] = useState(false)
  const [toast, setToast] = useState<ToastState>(null)
  const [search, setSearch] = useState('')
  const [filterType, setFilterType] = useState<string>('')
  const [filterSubType, setFilterSubType] = useState<string>('')
  const [filterModule, setFilterModule] = useState<string>('')
  const [filterActive, setFilterActive] = useState<boolean | ''>('')

  // Pagination
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)
  const [limit, setLimit] = useState(0)

  // All accounts for widgets (independent of pagination)
  const [allAccounts, setAllAccounts] = useState<Account[]>([])

  // Modal states
  const [showCreate, setShowCreate] = useState(false)
  const [showEdit, setShowEdit] = useState<Account | null>(null)
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)
  const [importing, setImporting] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    type: '',
    subType: '',
    module: '',
    isGroup: false,
    active: true,
    currency: 'PKR',
    tax: 0,
    systemNames: '',
  })

  const refresh = async () => {
    setLoading(true)
    try {
      const res: any = await financeApi.listChartOfAccounts({
        type: filterType || undefined,
        subType: filterSubType || undefined,
        module: filterModule || undefined,
        active: filterActive !== '' ? filterActive : undefined,
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

  // Fetch ALL accounts for widgets (no pagination)
  const refreshAllAccounts = async () => {
    try {
      const res: any = await financeApi.listChartOfAccounts({
        type: filterType || undefined,
        subType: filterSubType || undefined,
        module: filterModule || undefined,
        active: filterActive !== '' ? filterActive : undefined,
        page: 1,
        limit: 0, // 0 = all records
      })
      setAllAccounts(res.accounts || [])
    } catch (e) {
      console.error(e)
    }
  }

  useEffect(() => {
    refresh()
  }, [filterType, filterSubType, filterModule, filterActive, page, limit])

  useEffect(() => {
    refreshAllAccounts()
  }, [filterType, filterSubType, filterModule, filterActive])

  const filtered = useMemo(() => {
    if (!search) return accounts
    const s = search.toLowerCase()
    return accounts.filter(a =>
      (a.code?.toLowerCase().includes(s)) ||
      (a.name?.toLowerCase().includes(s)) ||
      (a.type?.toLowerCase().includes(s))
    )
  }, [accounts, search])

  const handleCreate = async () => {
    if (!formData.name || !formData.type) {
      setToast({ type: 'error', message: 'Name and Type are required' })
      return
    }
    try {
      const payload = { ...formData, systemNames: formData.systemNames ? formData.systemNames.split(',').map(s => s.trim()).filter(Boolean) : [] }
      await financeApi.createChartOfAccount(payload)
      setToast({ type: 'success', message: 'Account created successfully' })
      setShowCreate(false)
      setFormData({ code: '', name: '', type: '', subType: '', module: '', isGroup: false, active: true, currency: 'PKR', tax: 0, systemNames: '' })
      refresh()
      refreshAllAccounts()
    } catch (e: any) {
      setToast({ type: 'error', message: e?.message || 'Failed to create account' })
    }
  }

  const handleUpdate = async () => {
    if (!showEdit) return
    try {
      const payload = { ...formData, systemNames: formData.systemNames ? formData.systemNames.split(',').map(s => s.trim()).filter(Boolean) : [] }
      await financeApi.updateChartOfAccount(showEdit._id, payload)
      setToast({ type: 'success', message: 'Account updated successfully' })
      setShowEdit(null)
      refresh()
      refreshAllAccounts()
    } catch (e: any) {
      setToast({ type: 'error', message: e?.message || 'Failed to update account' })
    }
  }

  const handleDelete = async () => {
    if (!deleteConfirm) return
    try {
      await financeApi.deleteChartOfAccount(deleteConfirm)
      setToast({ type: 'success', message: 'Account deleted successfully' })
      setDeleteConfirm(null)
      refresh()
      refreshAllAccounts()
    } catch (e: any) {
      setToast({ type: 'error', message: e?.message || 'Failed to delete account' })
    }
  }

  const handleExportCSV = () => {
    const headers = ['Code', 'Name', 'Account Type', 'Detail Type', 'Balance', 'Tax', 'Currency', 'Active']
    const rows = accounts.map(a => [
      `"${(a.code || '').replace(/"/g, '""')}"`,
      `"${a.name.replace(/"/g, '""')}"`,
      `"${a.type.replace(/"/g, '""')}"`,
      `"${(a.subType || '').replace(/"/g, '""')}"`,
      a.balance,
      a.tax ?? 0,
      a.currency || 'PKR',
      a.active ? 'true' : 'false',
    ].join(','))
    const csv = [headers.join(','), ...rows].join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `chart_of_accounts_${new Date().toISOString().slice(0, 10)}.csv`
    link.click()
    URL.revokeObjectURL(url)
    setToast({ type: 'success', message: `Exported ${accounts.length} accounts` })
  }

  const handleExportPdf = () => {
    exportToPdf({
      title: 'Chart of Accounts',
      subtitle: `${allAccounts.length} accounts | Active: ${allAccounts.filter(a => a.active).length}`,
      filename: `chart-of-accounts-${new Date().toISOString().slice(0, 10)}`,
      headers: ['Code', 'Name', 'Account Type', 'Detail Type', 'Balance', 'Currency', 'Active'],
      rows: allAccounts.map(a => [a.code || '-', a.name, a.type, a.subType || '-', a.balance.toFixed(2), a.currency || 'PKR', a.active ? 'Yes' : 'No'])
    })
  }

  const handleImportCSV = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setImporting(true)
    try {
      const text = await file.text()
      const lines = text.split(/\r?\n/).filter(l => l.trim())
      if (lines.length < 2) {
        setToast({ type: 'error', message: 'CSV file is empty or has no data rows' })
        setImporting(false)
        e.target.value = ''
        return
      }

      // Parse header - map to internal fields
      const headerLine = lines[0]
      const headers = parseCSVLine(headerLine).map(h => h.trim().toLowerCase())
      const codeIdx = headers.indexOf('code')
      const nameIdx = headers.indexOf('name')
      const typeIdx = headers.indexOf('account type')
      const subTypeIdx = headers.indexOf('detail type')
      const currencyIdx = headers.indexOf('currency')
      const activeIdx = headers.indexOf('active')
      const systemNamesIdx = headers.indexOf('system names')

      if (nameIdx === -1 || typeIdx === -1) {
        setToast({ type: 'error', message: 'CSV must have "Name" and "Account Type" columns' })
        setImporting(false)
        e.target.value = ''
        return
      }

      const accountsToImport: Array<{ code?: string; name: string; type: string; subType?: string; currency?: string; active?: boolean; tax?: number; systemNames?: string[] }> = []
      for (let i = 1; i < lines.length; i++) {
        const cols = parseCSVLine(lines[i])
        const name = (cols[nameIdx] || '').trim()
        const type = (cols[typeIdx] || '').trim()
        if (!name || !type) continue
        accountsToImport.push({
          code: codeIdx >= 0 ? (cols[codeIdx] || '').trim() || undefined : undefined,
          name,
          type,
          subType: subTypeIdx >= 0 ? (cols[subTypeIdx] || '').trim() || undefined : undefined,
          currency: currencyIdx >= 0 ? (cols[currencyIdx] || '').trim() || 'PKR' : 'PKR',
          active: activeIdx >= 0 ? (cols[activeIdx] || '').trim().toLowerCase() === 'true' : true,
          systemNames: systemNamesIdx >= 0 ? (cols[systemNamesIdx] || '').trim().split(',').map((s: string) => s.trim()).filter(Boolean) : undefined,
        })
      }

      if (accountsToImport.length === 0) {
        setToast({ type: 'error', message: 'No valid rows found in CSV' })
        setImporting(false)
        e.target.value = ''
        return
      }

      const res: any = await financeApi.importChartOfAccounts(accountsToImport)
      const msg = [
        `Imported: ${res.imported}`,
        res.skipped > 0 ? `Skipped: ${res.skipped}` : '',
        res.errors > 0 ? `Errors: ${res.errors}` : '',
      ].filter(Boolean).join(' | ')
      setToast({ type: res.imported > 0 ? 'success' : 'error', message: msg })
      refresh()
    } catch (err: any) {
      setToast({ type: 'error', message: err?.message || 'Import failed' })
    }
    setImporting(false)
    e.target.value = ''
  }

  const parseCSVLine = (line: string): string[] => {
    const result: string[] = []
    let current = ''
    let inQuotes = false
    for (let i = 0; i < line.length; i++) {
      const ch = line[i]
      if (inQuotes) {
        if (ch === '"' && line[i + 1] === '"') {
          current += '"'
          i++
        } else if (ch === '"') {
          inQuotes = false
        } else {
          current += ch
        }
      } else {
        if (ch === '"') {
          inQuotes = true
        } else if (ch === ',') {
          result.push(current)
          current = ''
        } else {
          current += ch
        }
      }
    }
    result.push(current)
    return result
  }

  const openEdit = (account: Account) => {
    setFormData({
      code: account.code || '',
      name: account.name,
      type: account.type,
      subType: account.subType || '',
      module: account.module || '',
      isGroup: account.isGroup || false,
      active: account.active,
      currency: account.currency || 'PKR',
      tax: account.tax ?? 0,
      systemNames: (account.systemNames || []).join(', '),
    })
    setShowEdit(account)
  }

  return (
    <div className="p-6">
      <Toast toast={toast} onClose={() => setToast(null)} />

      {/* Header Card */}
      <div className="bg-linear-to-r from-blue-600 to-indigo-700 rounded-lg shadow p-5 mb-6 flex items-center justify-between text-white">
        <div>
          <h1 className="text-2xl font-semibold">Chart of Accounts</h1>
          <p className="text-sm text-blue-100 mt-1">Manage your general ledger accounts</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleExportCSV}
            className="px-4 py-2 bg-white/20 text-white font-medium rounded-lg hover:bg-white/30 shadow border border-white/30"
          >
            Export CSV
          </button>
          <button
            onClick={handleExportPdf}
            className="px-4 py-2 bg-white/20 text-white font-medium rounded-lg hover:bg-white/30 shadow border border-white/30"
          >
            Export PDF
          </button>
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={importing}
            className="px-4 py-2 bg-white/20 text-white font-medium rounded-lg hover:bg-white/30 shadow border border-white/30 disabled:opacity-50"
          >
            {importing ? 'Importing...' : 'Import CSV'}
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv"
            onChange={handleImportCSV}
            className="hidden"
          />
          <button
            onClick={() => setShowCreate(true)}
            className="px-4 py-2 bg-white text-blue-700 font-medium rounded-lg hover:bg-blue-50 shadow"
          >
            + New Account
          </button>
        </div>
      </div>

      {/* Summary Widgets */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-lg shadow p-4 border-l-4 border-indigo-500">
          <p className="text-sm text-gray-500 font-medium">Total Accounts</p>
          <p className="text-2xl font-bold text-indigo-700">{allAccounts.length}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-4 border-l-4 border-emerald-500">
          <p className="text-sm text-gray-500 font-medium">Active Accounts</p>
          <p className="text-2xl font-bold text-emerald-600">
            {allAccounts.filter(a => a.active).length}
          </p>
        </div>
        <div className="bg-white rounded-lg shadow p-4 border-l-4 border-rose-500">
          <p className="text-sm text-gray-500 font-medium">Inactive Accounts</p>
          <p className="text-2xl font-bold text-rose-600">
            {allAccounts.filter(a => !a.active).length}
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="grid grid-cols-5 gap-4 mb-4">
        <input
          type="text"
          placeholder="Search accounts..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="px-3 py-2 border rounded-lg"
        />
        <select
          value={filterType}
          onChange={e => setFilterType(e.target.value)}
          className="px-3 py-2 border rounded-lg"
        >
          <option value="">All Account Types</option>
          {ACCOUNT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
        <select
          value={filterModule}
          onChange={e => setFilterModule(e.target.value)}
          className="px-3 py-2 border rounded-lg"
        >
          <option value="">All Modules</option>
          {ACCOUNT_MODULES.map(m => <option key={m} value={m}>{m.charAt(0).toUpperCase() + m.slice(1)}</option>)}
        </select>
        <input
          type="text"
          placeholder="Detail Type..."
          value={filterSubType}
          onChange={e => setFilterSubType(e.target.value)}
          className="px-3 py-2 border rounded-lg"
        />
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
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Account Type</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Detail Type</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Module</th>
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
                <td className="px-4 py-3 text-sm">
                  {account.module ? (
                    <span className="px-2 py-1 rounded text-xs bg-purple-100 text-purple-800">{account.module}</span>
                  ) : (
                    <span className="text-gray-400">—</span>
                  )}
                </td>
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
                    onClick={() => setDeleteConfirm(account._id)}
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
                <label className="block text-sm font-medium mb-1">Account Type *</label>
                <input
                  type="text"
                  value={formData.type}
                  onChange={e => setFormData({ ...formData, type: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                  placeholder="e.g., Asset, Income, Expense"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Detail Type</label>
                <input
                  type="text"
                  value={formData.subType}
                  onChange={e => setFormData({ ...formData, subType: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                  placeholder="e.g., CASH, BANK, REVENUE"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Module</label>
                <select
                  value={formData.module}
                  onChange={e => setFormData({ ...formData, module: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                >
                  <option value="">— None —</option>
                  {ACCOUNT_MODULES.map(m => <option key={m} value={m}>{m.charAt(0).toUpperCase() + m.slice(1)}</option>)}
                </select>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="isGroupCreate"
                  checked={formData.isGroup}
                  onChange={e => setFormData({ ...formData, isGroup: e.target.checked })}
                  className="w-4 h-4"
                />
                <label htmlFor="isGroupCreate" className="text-sm">Is Group Account</label>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Currency</label>
                  <select
                    value={formData.currency}
                    onChange={e => setFormData({ ...formData, currency: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg"
                  >
                    {currencies.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Tax (%)</label>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    step={0.01}
                    value={formData.tax}
                    onChange={e => setFormData({ ...formData, tax: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border rounded-lg"
                    placeholder="e.g., 16"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">System Names (comma-separated)</label>
                <input
                  type="text"
                  value={formData.systemNames}
                  onChange={e => setFormData({ ...formData, systemNames: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                  placeholder="e.g., CASH, OPD_REVENUE"
                />
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
                <label className="block text-sm font-medium mb-1">Account Type *</label>
                <input
                  type="text"
                  value={formData.type}
                  onChange={e => setFormData({ ...formData, type: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                  placeholder="e.g., Asset, Income, Expense"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Detail Type</label>
                <input
                  type="text"
                  value={formData.subType}
                  onChange={e => setFormData({ ...formData, subType: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                  placeholder="e.g., CASH, BANK, REVENUE"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Module</label>
                <select
                  value={formData.module}
                  onChange={e => setFormData({ ...formData, module: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                >
                  <option value="">— None —</option>
                  {ACCOUNT_MODULES.map(m => <option key={m} value={m}>{m.charAt(0).toUpperCase() + m.slice(1)}</option>)}
                </select>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="isGroupEdit"
                  checked={formData.isGroup}
                  onChange={e => setFormData({ ...formData, isGroup: e.target.checked })}
                  className="w-4 h-4"
                />
                <label htmlFor="isGroupEdit" className="text-sm">Is Group Account</label>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Currency</label>
                  <select
                    value={formData.currency}
                    onChange={e => setFormData({ ...formData, currency: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg"
                  >
                    {currencies.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Tax (%)</label>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    step={0.01}
                    value={formData.tax}
                    onChange={e => setFormData({ ...formData, tax: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border rounded-lg"
                    placeholder="e.g., 16"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">System Names (comma-separated)</label>
                <input
                  type="text"
                  value={formData.systemNames}
                  onChange={e => setFormData({ ...formData, systemNames: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                  placeholder="e.g., CASH, OPD_REVENUE"
                />
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

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-sm">
            <h2 className="text-lg font-semibold text-gray-900 mb-2">Confirm Delete</h2>
            <p className="text-sm text-gray-600 mb-6">
              Are you sure you want to delete this account? This action cannot be undone.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="flex-1 px-4 py-2 border rounded-lg hover:bg-gray-50 text-sm font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm font-medium"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
