import { useEffect, useMemo, useState } from 'react'
import { financeApi } from '../../utils/api'
import Toast, { type ToastState } from '../../components/ui/Toast'

type Handover = {
  _id: string
  fromAccountId: { _id: string; name: string }
  toAccountId: { _id: string; name: string }
  amount: number
  shiftId?: string
  shiftName?: string
  handoverBy: string
  receivedBy?: string
  status: 'pending' | 'approved' | 'rejected'
  notes?: string
  approvedAt?: string
  approvedBy?: string
  createdAt: string
}

export default function Finance_PendingHandovers() {
  const [handovers, setHandovers] = useState<Handover[]>([])
  const [loading, setLoading] = useState(false)
  const [toast, setToast] = useState<ToastState>(null)
  const [filterStatus, setFilterStatus] = useState<string>('pending')

  const refresh = async () => {
    setLoading(true)
    try {
      let res
      if (filterStatus === 'pending') {
        res = await financeApi.getPendingHandovers()
      } else {
        res = await financeApi.listCashHandovers({ status: filterStatus })
      }
      setHandovers(res || [])
    } catch (e) {
      console.error(e)
      setToast({ type: 'error', message: 'Failed to load handovers' })
    }
    setLoading(false)
  }

  useEffect(() => {
    refresh()
  }, [filterStatus])

  const handleApprove = async (id: string) => {
    if (!confirm('Are you sure you want to approve this handover?')) return
    try {
      await financeApi.approveCashHandover(id)
      setToast({ type: 'success', message: 'Handover approved successfully' })
      refresh()
    } catch (e: any) {
      setToast({ type: 'error', message: e?.message || 'Failed to approve handover' })
    }
  }

  const handleReject = async (id: string) => {
    const reason = prompt('Enter rejection reason:')
    if (reason === null) return
    try {
      await financeApi.rejectCashHandover(id, reason)
      setToast({ type: 'success', message: 'Handover rejected' })
      refresh()
    } catch (e: any) {
      setToast({ type: 'error', message: e?.message || 'Failed to reject handover' })
    }
  }

  const pendingCount = useMemo(() =>
    handovers.filter(h => h.status === 'pending').length,
    [handovers]
  )

  return (
    <div className="p-6">
      <Toast toast={toast} onClose={() => setToast(null)} />

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold">Cash Handovers</h1>
          {pendingCount > 0 && (
            <p className="text-amber-600 mt-1">
              {pendingCount} pending {pendingCount === 1 ? 'handover' : 'handovers'} require approval
            </p>
          )}
        </div>
        <select
          value={filterStatus}
          onChange={e => setFilterStatus(e.target.value)}
          className="px-3 py-2 border rounded-lg"
        >
          <option value="pending">Pending</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
          <option value="">All</option>
        </select>
      </div>

      <div className="bg-white rounded-lg shadow overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Date</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">From</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">To</th>
              <th className="px-4 py-3 text-right text-sm font-medium text-gray-700">Amount</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Handover By</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Status</th>
              <th className="px-4 py-3 text-right text-sm font-medium text-gray-700">Actions</th>
            </tr>
          </thead>
          <tbody>
            {handovers.map(h => (
              <tr key={h._id} className="border-t hover:bg-gray-50">
                <td className="px-4 py-3 text-sm">
                  {new Date(h.createdAt).toLocaleDateString()}
                </td>
                <td className="px-4 py-3 text-sm font-medium">{h.fromAccountId?.name || 'Unknown'}</td>
                <td className="px-4 py-3 text-sm">{h.toAccountId?.name || 'Unknown'}</td>
                <td className="px-4 py-3 text-sm text-right font-mono font-medium">
                  {h.amount.toLocaleString()}
                </td>
                <td className="px-4 py-3 text-sm">{h.handoverBy}</td>
                <td className="px-4 py-3 text-sm">
                  <span className={`px-2 py-1 rounded text-xs ${
                    h.status === 'pending' ? 'bg-amber-100 text-amber-800' :
                    h.status === 'approved' ? 'bg-green-100 text-green-800' :
                    'bg-red-100 text-red-800'
                  }`}>
                    {h.status}
                  </span>
                </td>
                <td className="px-4 py-3 text-right">
                  {h.status === 'pending' && (
                    <div className="space-x-2">
                      <button
                        onClick={() => handleApprove(h._id)}
                        className="text-green-600 hover:text-green-800 text-sm font-medium"
                      >
                        Approve
                      </button>
                      <button
                        onClick={() => handleReject(h._id)}
                        className="text-red-600 hover:text-red-800 text-sm font-medium"
                      >
                        Reject
                      </button>
                    </div>
                  )}
                  {h.status === 'approved' && h.approvedAt && (
                    <span className="text-xs text-gray-500">
                      Approved by {h.approvedBy} on {new Date(h.approvedAt).toLocaleDateString()}
                    </span>
                  )}
                </td>
              </tr>
            ))}
            {handovers.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-gray-500">
                  {loading ? 'Loading...' : 'No handovers found'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
