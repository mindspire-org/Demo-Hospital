import { useEffect, useMemo, useState } from 'react'
import { labApi } from '../../features/lab/lab.api'
import {
  Building,
  Plus,
  Search,
  Edit2,
  Trash2,
  TrendingUp,
  Coins,
  CheckCircle,
  XCircle,
  Download,
} from 'lucide-react'
import MiniDashboard from '../../components/common/MiniDashboard'
import { useLabSession } from '../../hooks/useLabSession'

type CollectionCenter = {
  _id: string
  name: string
  code: string
  address?: string
  contactPerson?: string
  phone?: string
  email?: string
  status: 'Active' | 'Inactive'
  allowedTestIds?: string[]
  commissionPercent: number
  totalTokens: number
  totalRevenue: number
  totalCommission: number
  balanceDue: number
  parentCenterId?: string
  pairedCenterIds?: string[]
  isHead?: boolean
  region?: string
  createdAt: string
}

const initialFormData: {
  name: string
  code: string
  address: string
  contactPerson: string
  phone: string
  email: string
  status: 'Active' | 'Inactive'
  allowedTestIds: string[]
  commissionPercent: number
  parentCenterId: string
  isHead: boolean
  region: string
} = {
  name: '',
  code: '',
  address: '',
  contactPerson: '',
  phone: '',
  email: '',
  status: 'Active',
  allowedTestIds: [],
  commissionPercent: 0,
  parentCenterId: '',
  isHead: false,
  region: '',
}

export default function Lab_CollectionCenters() {
  const [centers, setCenters] = useState<CollectionCenter[]>([])
  const [tests, setTests] = useState<Array<{ id: string; name: string; category?: string }>>([])
  const [testQ, setTestQ] = useState('')
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('')
  const [showModal, setShowModal] = useState(false)
  const [editingCenter, setEditingCenter] = useState<CollectionCenter | null>(null)
  const [formData, setFormData] = useState(initialFormData)
  const [submitting, setSubmitting] = useState(false)
  
  // Pagination state
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState<number | 'all'>(25)
  const [total, setTotal] = useState(0)
  const [totalPages, setTotalPages] = useState(1)

  useEffect(() => {
    loadCenters()
  }, [searchQuery, statusFilter, page, limit])

  useEffect(() => {
    let mounted = true
    ;(async () => {
      try {
        const res: any = await labApi.listTests({ limit: 2000, activeOnly: 'true' as any })
        if (!mounted) return
        setTests((res.items || []).map((t: any) => ({ id: String(t._id), name: String(t.name || ''), category: t.category })))
      } catch {
        if (mounted) setTests([])
      }
    })()
    return () => { mounted = false }
  }, [])

  async function loadCenters() {
    try {
      setLoading(true)
      const params: any = { page, limit: limit === 'all' ? undefined : limit }
      if (searchQuery) params.q = searchQuery
      if (statusFilter) params.status = statusFilter
      
      const res: any = await labApi.listCollectionCenters(params)
      setCenters(res.items || [])
      setTotal(res.total || 0)
      setTotalPages(res.totalPages || 1)
    } catch (err) {
      console.error('Failed to load collection centers:', err)
    } finally {
      setLoading(false)
    }
  }

  const stats = useMemo(() => {
    return {
      total: centers.length,
      active: centers.filter(c => c.status === 'Active').length,
      totalRevenue: centers.reduce((sum, c) => sum + (c.totalRevenue || 0), 0),
      totalBalanceDue: centers.reduce((sum, c) => sum + (c.balanceDue || 0), 0),
    }
  }, [centers])

  function openAddModal() {
    setEditingCenter(null)
    setFormData(initialFormData)
    setShowModal(true)
  }

  function openEditModal(center: CollectionCenter) {
    setEditingCenter(center)
    setFormData({
      name: center.name,
      code: center.code,
      address: center.address || '',
      contactPerson: center.contactPerson || '',
      phone: center.phone || '',
      email: center.email || '',
      status: center.status,
      allowedTestIds: Array.isArray(center.allowedTestIds) ? center.allowedTestIds.map(String) : [],
      commissionPercent: center.commissionPercent || 0,
      parentCenterId: center.parentCenterId || '',
      isHead: !!center.isHead,
      region: center.region || '',
    })
    setShowModal(true)
  }

  function closeModal() {
    setShowModal(false)
    setEditingCenter(null)
    setFormData(initialFormData)
    setTestQ('')
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!formData.name || !formData.code) return
    
    try {
      setSubmitting(true)
      const payload = { ...formData }
      if (!payload.parentCenterId) {
        delete (payload as any).parentCenterId
      }

      if (editingCenter) {
        await labApi.updateCollectionCenter(editingCenter._id, payload)
      } else {
        await labApi.createCollectionCenter(payload)
      }
      await loadCenters()
      closeModal()
    } catch (err: any) {
      alert(err?.message || 'Failed to save collection center')
    } finally {
      setSubmitting(false)
    }
  }

  function exportCSV() {
    const rows = [
      ['Name', 'Code', 'Region', 'Contact Person', 'Phone', 'Email', 'Address', 'Commission %', 'Status', 'Total Tokens', 'Total Revenue', 'Total Commission', 'Balance Due'],
      ...centers.map(c => [
        c.name, c.code, c.region || '', c.contactPerson || '', c.phone || '', c.email || '', c.address || '',
        c.commissionPercent, c.status, c.totalTokens || 0,
        c.totalRevenue || 0, c.totalCommission || 0, c.balanceDue || 0,
      ]),
    ]
    const csv = rows.map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = `collection-centers-${new Date().toISOString().slice(0,10)}.csv`
    a.click(); URL.revokeObjectURL(url)
  }

  async function handleDelete(center: CollectionCenter) {
    if (!confirm(`Are you sure you want to delete "${center.name}"?`)) return
    
    try {
      await labApi.deleteCollectionCenter(center._id)
      await loadCenters()
    } catch (err: any) {
      alert(err?.message || 'Failed to delete collection center')
    }
  }

  const session = useLabSession()

  return (
    <div className="p-4 md:p-6 w-full min-h-[calc(100dvh-3.5rem)] bg-slate-50 dark:bg-slate-900/50">
      {/* Header */}
      <div className="rounded-2xl bg-linear-to-r from-violet-600 via-sky-600 to-emerald-500 p-5 text-white shadow-lg shadow-sky-200/50 mb-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-2xl font-bold">Collection Centers</h2>
            <div className="mt-0.5 text-sm text-sky-100">Manage external collection centers and their commission rates</div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={exportCSV}
              className="inline-flex items-center gap-2 rounded-lg border border-white/30 bg-white/10 px-3 py-2 text-sm font-semibold text-white backdrop-blur-sm hover:bg-white/20"
              title="Export CSV"
            >
              <Download className="h-4 w-4" />
              Export CSV
            </button>
            {session.isAdmin && (
              <button
                onClick={openAddModal}
                className="inline-flex items-center gap-2 rounded-lg border border-white/30 bg-white/20 px-4 py-2 text-sm font-semibold text-white backdrop-blur-sm hover:bg-white/30"
              >
                <Plus className="h-4 w-4" />
                Add New Center
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Mini Dashboard */}
      <MiniDashboard cards={[
        { label: 'Total Centers', value: stats.total, icon: Building, color: 'bg-sky-500' },
        { label: 'Active', value: stats.active, icon: CheckCircle, color: 'bg-emerald-500' },
        { label: 'Total Revenue', value: `PKR ${stats.totalRevenue.toLocaleString()}`, icon: TrendingUp, color: 'bg-violet-500' },
        { label: 'Balance Due', value: `PKR ${stats.totalBalanceDue.toLocaleString()}`, icon: Coins, color: 'bg-amber-500' },
      ]} />

      {/* Filters */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4 mb-6 shadow-sm">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
            <input
              type="text"
              placeholder="Search by name, code, or contact person..."
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setPage(1) }}
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:text-white transition-all"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setPage(1) }}
            className="px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:text-white transition-all min-w-[150px]"
          >
            <option value="">All Status</option>
            <option value="Active">Active</option>
            <option value="Inactive">Inactive</option>
          </select>
          <select
            value={limit}
            onChange={(e) => { setLimit(e.target.value === 'all' ? 'all' : Number(e.target.value)); setPage(1) }}
            className="px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:text-white transition-all min-w-[100px]"
          >
            <option value={10}>10</option>
            <option value={25}>25</option>
            <option value={50}>50</option>
            <option value={100}>100</option>
            <option value="all">All</option>
          </select>
        </div>
      </div>

      {/* Centers Table */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-700">
                <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Center Details</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Code</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Contact Info</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Commission</th>
                <th className="px-6 py-4 text-center text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Stats</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Financials</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Status</th>
                <th className="px-6 py-4 text-right text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
              {loading ? (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center text-slate-500">
                    <div className="flex flex-col items-center justify-center gap-3">
                      <div className="animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full" />
                      <span className="font-medium">Loading collection centers...</span>
                    </div>
                  </td>
                </tr>
              ) : centers.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <Building className="h-12 w-12 text-slate-300" />
                      <p className="text-slate-500 font-medium">No collection centers found</p>
                      <button onClick={openAddModal} className="text-blue-600 hover:underline text-sm font-semibold">Click here to add your first center</button>
                    </div>
                  </td>
                </tr>
              ) : (
                centers.map((center) => (
                  <tr key={center._id} className="hover:bg-slate-50 dark:hover:bg-slate-900/30 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-lg bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center text-blue-600 font-bold">
                          {center.name.charAt(0)}
                        </div>
                        <div>
                          <p className="font-bold text-slate-800 dark:text-white">{center.name}</p>
                          <div className="flex items-center gap-1 mt-0.5">
                            {center.isHead && <span className="px-1.5 py-0.5 rounded bg-amber-100 text-amber-700 text-[10px] font-bold">HEAD</span>}
                            {center.parentCenterId && <span className="px-1.5 py-0.5 rounded bg-sky-100 text-sky-700 text-[10px] font-bold">CHILD</span>}
                            {center.region && <span className="px-1.5 py-0.5 rounded bg-violet-100 text-violet-700 text-[10px] font-bold">{center.region}</span>}
                            {center.address && (
                              <span className="text-xs text-slate-500 dark:text-slate-400 max-w-[200px] truncate">{center.address}</span>
                            )}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="px-2.5 py-1 bg-slate-100 dark:bg-slate-700 rounded-md text-xs font-bold text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-600">
                        {center.code}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="space-y-1">
                        <p className="text-sm font-medium text-slate-700 dark:text-slate-300">{center.contactPerson || '—'}</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">{center.phone || '—'}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="inline-flex items-center px-2.5 py-1 rounded-full bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 text-xs font-bold border border-blue-100 dark:border-blue-800">
                        {center.commissionPercent}% Rate
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <div className="flex flex-col items-center">
                        <span className="text-sm font-bold text-slate-800 dark:text-white">{center.totalTokens || 0}</span>
                        <span className="text-[10px] text-slate-500 uppercase tracking-tighter">Tokens</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="space-y-1">
                        <div className="flex items-center justify-between gap-4">
                          <span className="text-[10px] text-slate-500 uppercase">Rev:</span>
                          <span className="text-sm font-bold text-slate-800 dark:text-white">Rs {center.totalRevenue.toLocaleString()}</span>
                        </div>
                        <div className="flex items-center justify-between gap-4">
                          <span className="text-[10px] text-slate-500 uppercase">Due:</span>
                          <span className={`text-sm font-bold ${center.balanceDue > 0 ? 'text-orange-600 dark:text-orange-400' : 'text-slate-500'}`}>Rs {center.balanceDue.toLocaleString()}</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                          center.status === 'Active'
                            ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 border border-green-200 dark:border-green-800'
                            : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 border border-red-200 dark:border-red-800'
                        }`}
                      >
                        <div className={`h-1.5 w-1.5 rounded-full ${center.status === 'Active' ? 'bg-green-500' : 'bg-red-500'}`} />
                        {center.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => openEditModal(center)}
                          className="p-2 text-blue-600 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-900/30 rounded-lg transition-colors border border-transparent hover:border-blue-200"
                          title="Edit"
                        >
                          <Edit2 className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(center)}
                          className="p-2 text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/30 rounded-lg transition-colors border border-transparent hover:border-red-200"
                          title="Delete"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        
        {/* Pagination */}
        {limit !== 'all' && totalPages > 1 && (
          <div className="flex items-center justify-between px-6 py-4 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50">
            <div className="text-sm text-slate-600 dark:text-slate-400">
              Showing <span className="font-semibold">{((page - 1) * (limit as number)) + 1}</span> to <span className="font-semibold">{Math.min(page * (limit as number), total)}</span> of <span className="font-semibold">{total}</span> centers
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-3 py-1.5 text-sm font-medium text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Previous
              </button>
              <span className="px-3 py-1.5 text-sm font-medium text-slate-700 dark:text-slate-300">
                Page {page} of {totalPages}
              </span>
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="px-3 py-1.5 text-sm font-medium text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Next
              </button>
            </div>
          </div>
        )}
        {limit === 'all' && total > 0 && (
          <div className="flex items-center justify-center px-6 py-4 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50">
            <div className="text-sm text-slate-600 dark:text-slate-400">
              Showing all <span className="font-semibold">{total}</span> centers
            </div>
          </div>
        )}
      </div>

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="p-4 border-b flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-800">
                {editingCenter ? 'Edit Collection Center' : 'Add Collection Center'}
              </h2>
              <button
                onClick={closeModal}
                className="p-1 text-slate-400 hover:text-slate-600"
              >
                <XCircle className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-4 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Center name"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Code <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                    className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g., CC-001"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Address
                </label>
                <input
                  type="text"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Full address"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Contact Person
                  </label>
                  <input
                    type="text"
                    value={formData.contactPerson}
                    onChange={(e) => setFormData({ ...formData, contactPerson: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Name"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Phone
                  </label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Phone number"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Email
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="email@example.com"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Commission % <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    required
                    value={formData.commissionPercent}
                    onChange={(e) => setFormData({ ...formData, commissionPercent: Number(e.target.value) })}
                    className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Parent Center (Head)
                  </label>
                  <select
                    value={formData.parentCenterId}
                    onChange={(e) => setFormData({ ...formData, parentCenterId: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">None (Top-level)</option>
                    {centers.filter(c => c.isHead || !c.parentCenterId).filter(c => c._id !== editingCenter?._id).map(c => (
                      <option key={c._id} value={c._id}>{c.name} ({c.code})</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Region
                  </label>
                  <input
                    type="text"
                    value={formData.region}
                    onChange={(e) => setFormData({ ...formData, region: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g. North, South, Central"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="isHead"
                    checked={formData.isHead}
                    onChange={(e) => setFormData({ ...formData, isHead: e.target.checked })}
                    className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                  />
                  <label htmlFor="isHead" className="text-sm font-medium text-slate-700">Is Head Center</label>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Status
                  </label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value as 'Active' | 'Inactive' })}
                    className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="Active">Active</option>
                    <option value="Inactive">Inactive</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Allowed Tests (optional)
                </label>
                <div className="rounded-lg border border-slate-200 bg-white p-3">
                  <input
                    value={testQ}
                    onChange={e => setTestQ(e.target.value)}
                    placeholder="Search tests…"
                    className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <div className="mt-2 max-h-56 overflow-y-auto rounded-md border border-slate-200">
                    {tests
                      .filter(t => !testQ || String(t.name || '').toLowerCase().includes(testQ.toLowerCase()))
                      .map(t => {
                        const checked = formData.allowedTestIds.includes(t.id)
                        return (
                          <label key={t.id} className="flex items-center gap-2 px-3 py-2 text-sm hover:bg-slate-50">
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={e => {
                                const on = e.target.checked
                                setFormData(prev => ({
                                  ...prev,
                                  allowedTestIds: on
                                    ? Array.from(new Set([...(prev.allowedTestIds || []), t.id]))
                                    : (prev.allowedTestIds || []).filter(x => x !== t.id),
                                }))
                              }}
                              className="h-4 w-4"
                            />
                            <span className="flex-1 text-slate-800">{t.name}</span>
                            {t.category && <span className="text-xs text-slate-400">{t.category}</span>}
                          </label>
                        )
                      })}
                    {tests.filter(t => !testQ || String(t.name || '').toLowerCase().includes(testQ.toLowerCase())).length === 0 && (
                      <div className="px-3 py-3 text-sm text-slate-500">No tests found.</div>
                    )}
                  </div>
                  <div className="mt-2 flex items-center justify-between text-xs text-slate-500">
                    <div>
                      Selected: <span className="font-semibold text-slate-700">{formData.allowedTestIds.length}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, allowedTestIds: [] }))}
                      className="text-rose-600 hover:underline"
                    >
                      Clear
                    </button>
                  </div>
                  <div className="mt-1 text-xs text-slate-500">
                    If none selected, this center can use all active tests.
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3 pt-4">
                <button
                  type="button"
                  onClick={closeModal}
                  className="flex-1 px-4 py-2 border rounded-lg font-medium text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 px-4 py-2 rounded-lg font-medium text-white hover:opacity-90 disabled:opacity-50"
                  style={{ backgroundColor: 'var(--navy)' }}
                >
                  {submitting ? (
                    <span className="flex items-center justify-center gap-2">
                      <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
                      Saving...
                    </span>
                  ) : (
                    editingCenter ? 'Update Center' : 'Create Center'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
