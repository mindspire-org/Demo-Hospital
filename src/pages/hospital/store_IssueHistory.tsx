import { useEffect, useState, useRef } from 'react'
import { hospitalApi } from '../../utils/api'
import { getLocalDate } from '../../utils/date'
import Pagination from '../../components/ui/Pagination'
import Toast, { type ToastState } from '../../components/ui/Toast'
import { printIssueSlipA4, useHospitalSettings } from '../../components/hospital/store_IssueSlip'
import Store_IssueModal from '../../components/hospital/Store_IssueModal'

type Issue = {
  id: string
  issueNo?: string
  date: string
  departmentId: string
  departmentName: string
  issuedTo?: string
  itemCount: number
  totalAmount: number
  createdAt: string
  createdBy?: { fullName?: string; email?: string }
}

 type Department = {
   id: string
   name: string
 }

export default function Store_IssueHistory() {
  const [items, setItems] = useState<Issue[]>([])
  const [query, setQuery] = useState('')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [departmentFilter, setDepartmentFilter] = useState('')
  const [departments, setDepartments] = useState<Department[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [pages, setPages] = useState(1)
  const [total, setTotal] = useState(0)
  const [limit, setLimit] = useState(20)
  const [toast, setToast] = useState<ToastState>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [deleteLoading, setDeleteLoading] = useState(false)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editIssueId, setEditIssueId] = useState<string | null>(null)
  const cancelledRef = useRef(false)
  const loadingRef = useRef(false)
  const settings = useHospitalSettings()

  const loadItems = async (p = 1, l = limit) => {
    // Prevent concurrent calls
    if (loadingRef.current || cancelledRef.current) return
    loadingRef.current = true
    setLoading(true)
    try {
      const res = await hospitalApi.listStoreIssues({
        from: from || undefined,
        to: to || undefined,
        departmentId: departmentFilter || undefined,
        search: query || undefined,
        page: p,
        limit: l,
      }) as any
      if (cancelledRef.current) return
      const issues = (res.issues || res.data || res || []).map((i: any) => ({
        id: String(i._id || i.id),
        issueNo: i.issueNo,
        date: i.date,
        departmentId: i.departmentId,
        departmentName: i.departmentName || 'Unknown',
        issuedTo: i.issuedTo,
        itemCount: i.items?.length || 0,
        totalAmount: i.totalAmount || 0,
        createdAt: i.createdAt,
        createdBy: i.createdBy,
      })) as Issue[]
      setItems(issues)
      const pg = res.pagination || {}
      setPage(pg.page || 1)
      setPages(pg.pages || 1)
      setTotal(pg.total || 0)
    } catch {
      if (!cancelledRef.current) setItems([])
    } finally {
      loadingRef.current = false
      if (!cancelledRef.current) setLoading(false)
    }
  }

  const loadDepartments = async () => {
    try {
      const depRes: any = await hospitalApi.listDepartments({ limit: 1000 })
      const depArray: any[] = (depRes?.departments || depRes?.data || depRes || []) as any[]
      const deps: Department[] = depArray.map((d: any) => ({
        id: String(d._id || d.id),
        name: String(d.name || ''),
      })).filter(d => d.id && d.name)
      setDepartments(deps)
    } catch {
      setDepartments([])
    }
  }

  // Single effect for all data loading
  useEffect(() => {
    cancelledRef.current = false
    const timer = setTimeout(() => {
      if (!cancelledRef.current) loadItems(1)
    }, 100)
    return () => {
      cancelledRef.current = true
      clearTimeout(timer)
    }
  }, [from, to, departmentFilter, query, limit])

  useEffect(() => {
    loadDepartments()
  }, [])

  const handleOpenNewIssue = () => {
    setEditIssueId(null)
    setIsModalOpen(true)
  }

  const handleEditIssue = (id: string) => {
    setEditIssueId(id)
    setIsModalOpen(true)
  }

  const handleModalClose = () => {
    setIsModalOpen(false)
    setEditIssueId(null)
  }

  const handleModalSuccess = () => {
    loadItems(page)
  }

  const handleDeleteClick = (id: string) => {
    setDeleteId(id)
  }

  const handleDeleteConfirm = async () => {
    if (!deleteId) return
    setDeleteLoading(true)
    try {
      await hospitalApi.deleteStoreIssue(deleteId)
      setToast({ type: 'success', message: 'Issue deleted successfully' })
      setDeleteId(null)
      loadItems(page)
    } catch (err: any) {
      setToast({ type: 'error', message: err?.message || 'Failed to delete issue' })
    } finally {
      setDeleteLoading(false)
    }
  }

  const handlePrint = async (issueId: string) => {
    try {
      const res = await hospitalApi.getStoreIssue(issueId) as any
      const issue = res.issue || res.data || res
      
      // Fetch department details if departmentId exists
      let department = undefined
      if (issue?.departmentId) {
        try {
          const deptRes = await hospitalApi.listDepartments({ limit: 1000 }) as any
          const depts = deptRes.departments || deptRes.data || deptRes || []
          department = depts.find((d: any) => String(d._id || d.id) === issue.departmentId)
        } catch {
          // Silently fail - will use issue.departmentName only
        }
      }
      
      printIssueSlipA4(issue, department, settings)
    } catch {
      // Silently fail
    }
  }

  const formatDateTime = (dateStr: string) => {
    if (!dateStr) return '-'
    const d = new Date(dateStr)
    return d.toLocaleString('en-PK', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    })
  }
  const formatCurrency = (n: number) => new Intl.NumberFormat('en-PK', { style: 'currency', currency: 'PKR', maximumFractionDigits: 0 }).format(n)
  const getIssueNo = (issue: Issue) => issue.issueNo || issue.id.slice(-8).toUpperCase()

  const exportCSV = () => {
    const header = ['Issue No', 'Date & Time', 'Department', 'Issued To', 'Items', 'Amount']
    const lines = [header.join(',')]
    for (const i of items) {
      lines.push([
        getIssueNo(i),
        formatDateTime(i.date),
        i.departmentName,
        i.issuedTo || '',
        i.itemCount,
        i.totalAmount,
      ].join(','))
    }
    const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `issues-${getLocalDate()}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-xl font-semibold text-slate-800">Issue Stock</h2>
        <div className="flex gap-2">
          <button onClick={exportCSV} className="rounded-md bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-700 shadow-sm">
            Export CSV
          </button>
          <button 
            onClick={handleOpenNewIssue}
            className="rounded-md bg-emerald-600 px-3 py-1.5 text-white hover:bg-emerald-700"
          >
            + New Issue
          </button>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-3">
        <input
          type="date"
          value={from}
          onChange={e => setFrom(e.target.value)}
          className="rounded-md border border-slate-300 px-3 py-2 text-sm"
        />
        <input
          type="date"
          value={to}
          onChange={e => setTo(e.target.value)}
          className="rounded-md border border-slate-300 px-3 py-2 text-sm"
        />
        <select
          value={departmentFilter}
          onChange={e => setDepartmentFilter(e.target.value)}
          className="rounded-md border border-slate-300 px-3 py-2 text-sm"
        >
          <option value="">All Departments</option>
          {departments.map(d => (
            <option key={d.id} value={d.id}>{d.name}</option>
          ))}
        </select>
        <input
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Search..."
          className="flex-1 rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-violet-500"
        />
      </div>

      {loading ? (
        <div className="mt-8 text-center text-slate-500">Loading...</div>
      ) : (
        <div className="mt-5 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b-2 border-slate-300 bg-slate-100/50 text-left">
                <th className="px-3 py-3 text-[13px] font-extrabold text-slate-700 uppercase tracking-wider">Issue No</th>
                <th className="px-3 py-3 text-[13px] font-extrabold text-slate-700 uppercase tracking-wider">Date & Time</th>
                <th className="px-3 py-3 text-[13px] font-extrabold text-slate-700 uppercase tracking-wider">Department</th>
                <th className="px-3 py-3 text-[13px] font-extrabold text-slate-700 uppercase tracking-wider">Issued To</th>
                <th className="px-3 py-3 text-[13px] font-extrabold text-slate-700 uppercase tracking-wider">Items</th>
                <th className="px-3 py-3 text-[13px] font-extrabold text-slate-700 uppercase tracking-wider text-right">Value</th>
                <th className="px-3 py-3 text-[13px] font-extrabold text-slate-700 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody>
              {items.length === 0 ? (
                <tr><td colSpan={7} className="px-3 py-8 text-center text-slate-500">No issues found</td></tr>
              ) : (
                items.map(issue => (
                  <tr key={issue.id} className="border-b border-slate-100 hover:bg-slate-50">
                    <td className="px-3 py-2 font-medium text-slate-800">{getIssueNo(issue)}</td>
                    <td className="px-3 py-2 text-slate-700">{formatDateTime(issue.date)}</td>
                    <td className="px-3 py-2 font-medium text-slate-800">{issue.departmentName}</td>
                    <td className="px-3 py-2 text-slate-600">{issue.issuedTo || '-'}</td>
                    <td className="px-3 py-2 text-slate-600">{issue.itemCount} items</td>
                    <td className="px-3 py-2 text-right font-medium text-slate-700">{formatCurrency(issue.totalAmount)}</td>
                    <td className="px-3 py-2">
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleEditIssue(issue.id)}
                          className="rounded-md bg-blue-600 px-2.5 py-1.5 text-xs font-medium text-white hover:bg-blue-700 shadow-sm"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handlePrint(issue.id)}
                          className="rounded-md bg-emerald-600 px-2.5 py-1.5 text-xs font-medium text-white hover:bg-emerald-700 shadow-sm"
                        >
                          Print
                        </button>
                        <button
                          onClick={() => handleDeleteClick(issue.id)}
                          className="rounded-md bg-rose-600 px-2.5 py-1.5 text-xs font-medium text-white hover:bg-rose-700 shadow-sm"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
          <Pagination
            page={page}
            pages={pages}
            total={total}
            limit={limit}
            onPageChange={(p) => loadItems(p)}
            onLimitChange={(l) => {
              setLimit(l)
              loadItems(1, l)
            }}
          />
        </div>
      )}
      <Toast toast={toast} onClose={() => setToast(null)} />

      {/* Issue Modal */}
      <Store_IssueModal
        isOpen={isModalOpen}
        onClose={handleModalClose}
        onSuccess={handleModalSuccess}
        editIssueId={editIssueId}
      />

      {/* Delete Confirmation Modal */}
      {deleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-sm rounded-xl border border-slate-200 bg-white shadow-xl">
            <div className="p-6">
              <div className="flex items-center justify-center w-12 h-12 mx-auto bg-rose-100 rounded-full mb-4">
                <svg className="w-6 h-6 text-rose-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-slate-800 text-center">Delete Issue?</h3>
              <p className="text-sm text-slate-500 text-center mt-2">
                This action cannot be undone. Stock will be restored to inventory.
              </p>
            </div>
            <div className="border-t border-slate-200 px-6 py-4 flex justify-center gap-3">
              <button
                onClick={() => setDeleteId(null)}
                disabled={deleteLoading}
                className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteConfirm}
                disabled={deleteLoading}
                className="rounded-md bg-rose-600 px-4 py-2 text-sm font-medium text-white hover:bg-rose-700 disabled:opacity-50"
              >
                {deleteLoading ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
