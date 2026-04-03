import { useEffect, useState, useRef } from 'react'
import { Link } from 'react-router-dom'
import { hospitalApi } from '../../utils/api'
import { getLocalDate } from '../../utils/date'
import Pagination from '../../components/ui/Pagination'

type Issue = {
  id: string
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
  const cancelledRef = useRef(false)
  const loadingRef = useRef(false)

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
      const depRes: any = await hospitalApi.listDepartments()
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
  const getPerformedBy = (issue: Issue) => issue.createdBy?.fullName || issue.createdBy?.email || '-'

  const exportCSV = () => {
    const header = ['Date & Time', 'Department', 'Issued To', 'Performed By', 'Items', 'Amount']
    const lines = [header.join(',')]
    for (const i of items) {
      lines.push([
        formatDateTime(i.date),
        i.departmentName,
        i.issuedTo || '',
        getPerformedBy(i),
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
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-xl font-semibold text-slate-800">Issue History</h2>
        <div className="flex gap-2">
          <button onClick={exportCSV} className="rounded-md border border-slate-300 px-3 py-1.5 text-sm hover:bg-slate-50">
            Export CSV
          </button>
          <Link to="/hospital/store/issues" className="rounded-md bg-emerald-600 px-3 py-1.5 text-white hover:bg-emerald-700">
            + New Issue
          </Link>
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
              <tr className="border-b border-slate-200 text-left">
                <th className="px-3 py-2 font-medium text-slate-600">Date & Time</th>
                <th className="px-3 py-2 font-medium text-slate-600">Department</th>
                <th className="px-3 py-2 font-medium text-slate-600">Issued To</th>
                <th className="px-3 py-2 font-medium text-slate-600">Performed By</th>
                <th className="px-3 py-2 font-medium text-slate-600">Items</th>
                <th className="px-3 py-2 font-medium text-slate-600 text-right">Value</th>
                <th className="px-3 py-2 font-medium text-slate-600"></th>
              </tr>
            </thead>
            <tbody>
              {items.length === 0 ? (
                <tr><td colSpan={7} className="px-3 py-8 text-center text-slate-500">No issues found</td></tr>
              ) : (
                items.map(issue => (
                  <tr key={issue.id} className="border-b border-slate-100 hover:bg-slate-50">
                    <td className="px-3 py-2 text-slate-700">{formatDateTime(issue.date)}</td>
                    <td className="px-3 py-2 font-medium text-slate-800">{issue.departmentName}</td>
                    <td className="px-3 py-2 text-slate-600">{issue.issuedTo || '-'}</td>
                    <td className="px-3 py-2 text-slate-600">{getPerformedBy(issue)}</td>
                    <td className="px-3 py-2 text-slate-600">{issue.itemCount} items</td>
                    <td className="px-3 py-2 text-right font-medium text-slate-700">{formatCurrency(issue.totalAmount)}</td>
                    <td className="px-3 py-2">
                      <Link to={`/hospital/store/issue/${issue.id}`} className="text-sky-700 hover:underline text-xs">
                        View
                      </Link>
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
    </div>
  )
}
