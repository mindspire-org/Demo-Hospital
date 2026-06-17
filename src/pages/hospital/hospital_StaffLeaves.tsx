import React, { useEffect, useState, useCallback, useMemo } from 'react'
import { hospitalApi } from '../../utils/api'
import Toast, { type ToastState } from '../../components/ui/Toast'
import { 
  CalendarRange, 
  Plus, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  Trash2,
  CalendarDays,
  User
} from 'lucide-react'

type LeaveRequest = {
  _id: string
  staffId: string
  type: 'annual' | 'casual' | 'sick' | 'other'
  startDate: string
  endDate: string
  isHalfDay: boolean
  halfDayType?: 'first_half' | 'second_half'
  reason?: string
  status: 'pending' | 'approved' | 'rejected'
  appliedDate: string
  rejectionReason?: string
}

type Staff = { 
  id: string; 
  name: string; 
  leaveQuotas?: { annual: number; casual: number; sick: number }; 
  leaveBalances?: { annual: number; casual: number; sick: number } 
}

export default function Hospital_StaffLeaves() {
  const [leaves, setLeaves] = useState<LeaveRequest[]>([])
  const [staffList, setStaffList] = useState<Staff[]>([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [toast, setToast] = useState<ToastState | null>(null)
  const [selectedStaffId, setSelectedStaffId] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [addFormStaffId, setAddFormStaffId] = useState('')
  
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(10)
  const [total, setTotal] = useState(0)
  const [totalPages, setTotalPages] = useState(1)

  const fetchLeaves = useCallback(async () => {
    try {
      setLoading(true)
      const res = await (hospitalApi as any).listLeaves({ 
        status: statusFilter || undefined, 
        staffId: selectedStaffId || undefined,
        from: fromDate || undefined,
        to: toDate || undefined,
        page,
        limit: limit === -1 ? 10000 : limit
      }) as { items: LeaveRequest[], total?: number, totalPages?: number }
      
      setLeaves(res.items || [])
      setTotal(res.total || res.items?.length || 0)
      setTotalPages(res.totalPages || 1)
    } catch (e) { 
      console.error(e) 
    } finally {
      setLoading(false)
    }
  }, [statusFilter, selectedStaffId, fromDate, toDate, page, limit])

  const fetchStaff = useCallback(async () => {
    try {
      const res = await hospitalApi.listStaff() as { staff: any[] }
      setStaffList((res.staff || []).map((x: any) => ({ 
        id: x._id, 
        name: x.name, 
        leaveQuotas: x.leaveQuotas, 
        leaveBalances: x.leaveBalances 
      })))
    } catch (e) { console.error(e) }
  }, [])

  useEffect(() => {
    fetchStaff()
  }, [fetchStaff])

  useEffect(() => {
    fetchLeaves()
  }, [fetchLeaves])

  const summary = useMemo(() => {
    const counts = { pending: 0, approved: 0, rejected: 0 }
    // If we have total counts from backend we should use them, 
    // but for now we calculate from the current list or fetch separately
    // To be accurate with server-side pagination, we'd need a separate summary API or total counts in response
    leaves.forEach(l => {
      if (l.status === 'pending') counts.pending++
      else if (l.status === 'approved') counts.approved++
      else if (l.status === 'rejected') counts.rejected++
    })
    return counts
  }, [leaves])

  const handleApprove = async (id: string, status: 'approved' | 'rejected', reason?: string) => {
    try {
      await (hospitalApi as any).approveLeave(id, { status, rejectionReason: reason })
      setToast({ message: `Leave ${status} successfully`, type: 'success' })
      fetchLeaves()
      fetchStaff()
    } catch (e: any) {
      setToast({ message: e.message || 'Failed to update leave', type: 'error' })
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this leave request?')) return
    try {
      await (hospitalApi as any).deleteLeave(id)
      setToast({ message: 'Leave request deleted', type: 'success' })
      fetchLeaves()
    } catch (e: any) {
      setToast({ message: e.message || 'Failed to delete leave', type: 'error' })
    }
  }

  const handleAdd = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    const data = {
      staffId: fd.get('staffId') as string,
      type: fd.get('type') as string,
      startDate: fd.get('startDate') as string,
      endDate: fd.get('endDate') as string,
      isHalfDay: fd.get('isHalfDay') === 'on',
      halfDayType: (fd.get('halfDayType') as string) || undefined,
      reason: (fd.get('reason') as string) || '',
    }

    if (data.isHalfDay && !data.halfDayType) {
      setToast({ message: 'Please select half-day type (First/Second Half)', type: 'error' })
      return
    }

    try {
      await (hospitalApi as any).createLeave(data)
      setToast({ message: 'Leave request submitted', type: 'success' })
      setShowAdd(false)
      fetchLeaves()
    } catch (e: any) {
      setToast({ message: e.message || 'Failed to submit leave', type: 'error' })
    }
  }

  return (
    <div className="space-y-6 pb-8 bg-slate-50/50 dark:bg-slate-900/50 -m-6 p-6 min-h-screen">
      <Toast toast={toast} onClose={() => setToast(null)} />
      
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-extrabold text-slate-900 dark:text-slate-100 tracking-tight flex items-center gap-3">
          <CalendarRange className="h-8 w-8 text-blue-600" />
          Staff Leave Management
        </h2>
        <button 
          onClick={() => { setAddFormStaffId(''); setShowAdd(true); }}
          className="btn flex items-center gap-2"
        >
          <Plus className="h-4 w-4" /> New Leave Request
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-100 dark:border-amber-900/30 rounded-2xl p-4 flex items-center justify-between shadow-sm">
          <div>
            <div className="text-xs font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider mb-1">Pending Requests</div>
            <div className="text-3xl font-black text-amber-700 dark:text-amber-300 tabular-nums">{summary.pending}</div>
          </div>
          <div className="h-12 w-12 rounded-xl bg-amber-100 dark:bg-amber-900/40 flex items-center justify-center text-amber-600">
            <Clock className="h-6 w-6" />
          </div>
        </div>
        <div className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-900/30 rounded-2xl p-4 flex items-center justify-between shadow-sm">
          <div>
            <div className="text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider mb-1">Approved</div>
            <div className="text-3xl font-black text-emerald-700 dark:text-emerald-300 tabular-nums">{summary.approved}</div>
          </div>
          <div className="h-12 w-12 rounded-xl bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center text-emerald-600">
            <CheckCircle2 className="h-6 w-6" />
          </div>
        </div>
        <div className="bg-rose-50 dark:bg-rose-900/20 border border-rose-100 dark:border-rose-900/30 rounded-2xl p-4 flex items-center justify-between shadow-sm">
          <div>
            <div className="text-xs font-bold text-rose-600 dark:text-rose-400 uppercase tracking-wider mb-1">Rejected</div>
            <div className="text-3xl font-black text-rose-700 dark:text-rose-300 tabular-nums">{summary.rejected}</div>
          </div>
          <div className="h-12 w-12 rounded-xl bg-rose-100 dark:bg-rose-900/40 flex items-center justify-center text-rose-600">
            <XCircle className="h-6 w-6" />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 bg-white dark:bg-slate-800 p-4 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700">
        <div>
          <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Staff Member</label>
          <select 
            value={selectedStaffId} 
            onChange={e => { setSelectedStaffId(e.target.value); setPage(1); }}
            className="w-full rounded-md border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 px-3 py-2 text-sm"
          >
            <option value="">All Staff</option>
            {staffList.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Status</label>
          <select 
            value={statusFilter} 
            onChange={e => { setStatusFilter(e.target.value); setPage(1); }}
            className="w-full rounded-md border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 px-3 py-2 text-sm"
          >
            <option value="">All Statuses</option>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
          </select>
        </div>
        <div>
          <label className="block text-xs font-bold text-slate-500 uppercase mb-1">From Date</label>
          <input 
            type="date" 
            value={fromDate} 
            onChange={e => { setFromDate(e.target.value); setPage(1); }}
            className="w-full rounded-md border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="block text-xs font-bold text-slate-500 uppercase mb-1">To Date</label>
          <input 
            type="date" 
            value={toDate} 
            onChange={e => { setToDate(e.target.value); setPage(1); }}
            className="w-full rounded-md border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 px-3 py-2 text-sm"
          />
        </div>
        <div className="flex flex-col justify-end">
          <button 
            onClick={() => { setFromDate(''); setToDate(''); setSelectedStaffId(''); setStatusFilter(''); setPage(1); }}
            className="w-full py-2 px-4 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 rounded-md text-sm font-medium transition-colors"
          >
            Clear Filters
          </button>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/20">
          <h3 className="font-bold text-slate-800 dark:text-slate-100">Leave Records</h3>
          <select 
            value={limit} 
            onChange={e => { setLimit(Number(e.target.value)); setPage(1); }}
            className="rounded-md border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 px-3 py-1 text-sm font-medium focus:ring-2 focus:ring-blue-500/20 transition-all"
          >
            <option value={10}>10 / page</option>
            <option value={25}>25 / page</option>
            <option value={50}>50 / page</option>
            <option value={100}>100 / page</option>
            <option value={-1}>All</option>
          </select>
        </div>
        <table className="w-full text-left border-collapse">
          <thead className="bg-slate-50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-700">
            <tr>
              <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Staff</th>
              <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Type</th>
              <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Dates</th>
              <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Reason</th>
              <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Status</th>
              <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
            {loading ? (
              <tr><td colSpan={6} className="px-6 py-10 text-center text-slate-400">Loading...</td></tr>
            ) : leaves.length === 0 ? (
              <tr><td colSpan={6} className="px-6 py-10 text-center text-slate-400">No leave requests found</td></tr>
            ) : leaves.map(leave => {
              const staff = staffList.find(s => s.id === leave.staffId)
              return (
                <tr key={leave._id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400">
                        <User className="h-4 w-4" />
                      </div>
                      <div>
                        <div className="font-semibold text-slate-800 dark:text-slate-100">{staff?.name || 'Unknown'}</div>
                        <div className="text-xs text-slate-400">Applied: {leave.appliedDate}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${
                      leave.type === 'annual' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400' :
                      leave.type === 'sick' ? 'bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-400' :
                      leave.type === 'casual' ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400' :
                      'bg-slate-100 text-slate-800 dark:bg-slate-700 dark:text-slate-300'
                    }`}>
                      {leave.type}
                    </span>
                    {leave.isHalfDay && (
                      <span className="ml-2 text-[10px] font-bold text-indigo-500 uppercase tracking-tight">Half Day</span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300 font-mono">
                      <CalendarDays className="h-4 w-4 text-slate-400" />
                      {leave.startDate} {leave.endDate !== leave.startDate && `to ${leave.endDate}`}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="max-w-xs truncate text-sm text-slate-600 dark:text-slate-400" title={leave.reason}>
                      {leave.reason || '—'}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className={`flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider ${
                      leave.status === 'approved' ? 'text-emerald-600' :
                      leave.status === 'rejected' ? 'text-rose-600' :
                      'text-amber-500'
                    }`}>
                      {leave.status === 'approved' ? <CheckCircle2 className="h-4 w-4" /> :
                       leave.status === 'rejected' ? <XCircle className="h-4 w-4" /> :
                       <Clock className="h-4 w-4 animate-pulse" />}
                      {leave.status}
                    </div>
                    {leave.status === 'rejected' && leave.rejectionReason && (
                      <div className="mt-1 text-[10px] text-rose-500 max-w-[120px] truncate" title={leave.rejectionReason}>
                        {leave.rejectionReason}
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      {leave.status === 'pending' && (
                        <>
                          <button 
                            onClick={() => handleApprove(leave._id, 'approved')}
                            className="p-1.5 bg-emerald-50 text-emerald-600 rounded-md hover:bg-emerald-100 transition-colors"
                            title="Approve"
                          >
                            <CheckCircle2 className="h-4 w-4" />
                          </button>
                          <button 
                            onClick={() => {
                              const reason = prompt('Enter rejection reason:')
                              if (reason !== null) handleApprove(leave._id, 'rejected', reason)
                            }}
                            className="p-1.5 bg-rose-50 text-rose-600 rounded-md hover:bg-rose-100 transition-colors"
                            title="Reject"
                          >
                            <XCircle className="h-4 w-4" />
                          </button>
                        </>
                      )}
                      <button 
                        onClick={() => handleDelete(leave._id)}
                        className="p-1.5 bg-slate-50 text-slate-400 rounded-md hover:bg-slate-100 hover:text-rose-500 transition-colors"
                        title="Delete"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
        
        {/* Server-side Pagination */}
        <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-700 flex items-center justify-between text-sm text-slate-500 bg-slate-50/50 dark:bg-slate-900/20">
          <div>
            {total > 0 ? (
              <>Showing <span className="font-bold text-slate-700 dark:text-slate-200">{(page - 1) * (limit === -1 ? total : limit) + 1}</span> to <span className="font-bold text-slate-700 dark:text-slate-200">{Math.min(page * (limit === -1 ? total : limit), total)}</span> of <span className="font-bold text-slate-700 dark:text-slate-200">{total}</span> records</>
            ) : (
              'No records found'
            )}
          </div>
          <div className="flex items-center gap-2">
            <button 
              disabled={page <= 1 || loading} 
              onClick={() => setPage(p => Math.max(1, p - 1))}
              className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-white dark:hover:bg-slate-800 disabled:opacity-40 transition-all font-medium"
            >
              Previous
            </button>
            <div className="px-4 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg font-bold text-slate-700 dark:text-slate-200">
              Page {page} of {totalPages}
            </div>
            <button 
              disabled={page >= totalPages || loading} 
              onClick={() => setPage(p => p + 1)}
              className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-white dark:hover:bg-slate-800 disabled:opacity-40 transition-all font-medium"
            >
              Next
            </button>
          </div>
        </div>
      </div>

      {showAdd && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <form onSubmit={handleAdd} className="w-full max-w-lg bg-white dark:bg-slate-800 rounded-xl shadow-2xl ring-1 ring-black/5 flex flex-col overflow-hidden">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-700 px-6 py-4">
              <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100">Submit Leave Request</h3>
              <button type="button" onClick={() => setShowAdd(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">×</button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Staff Member</label>
                <select 
                  name="staffId" 
                  value={addFormStaffId}
                  onChange={e => setAddFormStaffId(e.target.value)}
                  className="w-full rounded-md border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 px-3 py-2 text-sm" 
                  required
                >
                  <option value="">— Select Staff —</option>
                  {staffList.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
                {addFormStaffId && (
                  <div className="mt-2 grid grid-cols-3 gap-2 p-2 bg-slate-50 dark:bg-slate-900/30 rounded-lg border border-slate-100 dark:border-slate-700">
                    {(() => {
                      const s = staffList.find(x => x.id === addFormStaffId)
                      return (
                        <>
                          <div className="text-center">
                            <div className="text-[10px] text-slate-400 uppercase font-bold">Annual</div>
                            <div className="text-xs font-bold text-slate-700 dark:text-slate-300">{(s?.leaveBalances?.annual || 0)}/{(s?.leaveQuotas?.annual || 0)}</div>
                          </div>
                          <div className="text-center border-x border-slate-100 dark:border-slate-700">
                            <div className="text-[10px] text-slate-400 uppercase font-bold">Casual</div>
                            <div className="text-xs font-bold text-slate-700 dark:text-slate-300">{(s?.leaveBalances?.casual || 0)}/{(s?.leaveQuotas?.casual || 0)}</div>
                          </div>
                          <div className="text-center">
                            <div className="text-[10px] text-slate-400 uppercase font-bold">Sick</div>
                            <div className="text-xs font-bold text-slate-700 dark:text-slate-300">{(s?.leaveBalances?.sick || 0)}/{(s?.leaveQuotas?.sick || 0)}</div>
                          </div>
                        </>
                      )
                    })()}
                  </div>
                )}
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Leave Type</label>
                  <select name="type" className="w-full rounded-md border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 px-3 py-2 text-sm" required>
                    <option value="annual">Annual Leave</option>
                    <option value="casual">Casual Leave</option>
                    <option value="sick">Sick Leave</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Half Day?</label>
                  <div className="flex items-center gap-4 py-2">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" name="isHalfDay" className="rounded border-slate-300" />
                      <span className="text-sm text-slate-600 dark:text-slate-400">Yes</span>
                    </label>
                    <select name="halfDayType" className="flex-1 rounded-md border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 px-2 py-1 text-xs">
                      <option value="">— N/A —</option>
                      <option value="first_half">First Half</option>
                      <option value="second_half">Second Half</option>
                    </select>
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Start Date</label>
                  <input type="date" name="startDate" className="w-full rounded-md border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 px-3 py-2 text-sm" required />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">End Date</label>
                  <input type="date" name="endDate" className="w-full rounded-md border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 px-3 py-2 text-sm" required />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Reason</label>
                <textarea name="reason" rows={3} className="w-full rounded-md border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 px-3 py-2 text-sm" placeholder="Optional..."></textarea>
              </div>
            </div>
            <div className="bg-slate-50 dark:bg-slate-900/50 px-6 py-4 flex justify-end gap-3 border-t border-slate-200 dark:border-slate-700">
              <button type="button" onClick={() => setShowAdd(false)} className="btn-outline-navy">Cancel</button>
              <button type="submit" className="btn">Submit Request</button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}
