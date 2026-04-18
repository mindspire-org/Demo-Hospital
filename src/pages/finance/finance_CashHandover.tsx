import { useEffect, useMemo, useState } from 'react'
import { financeApi } from '../../utils/api'
import Toast, { type ToastState } from '../../components/ui/Toast'

type Account = {
  _id: string
  name: string
  type: string
  subType?: string
  portal?: string
}

export default function Finance_CashHandover() {
  const [accounts, setAccounts] = useState<Account[]>([])
  const [loading, setLoading] = useState(false)
  const [toast, setToast] = useState<ToastState>(null)

  const [fromAccountId, setFromAccountId] = useState('')
  const [toAccountId, setToAccountId] = useState('')
  const [amount, setAmount] = useState('')
  const [shiftId, setShiftId] = useState('')
  const [shiftName, setShiftName] = useState('')
  const [notes, setNotes] = useState('')

  const loadAccounts = async () => {
    try {
      const res = await financeApi.listChartOfAccounts({ active: true })
      setAccounts(res || [])
    } catch (e) {
      console.error(e)
      setToast({ type: 'error', message: 'Failed to load accounts' })
    }
  }

  useEffect(() => {
    loadAccounts()
  }, [])

  const cashAccounts = useMemo(() =>
    accounts.filter(a => a.subType === 'CASH' || a.subType === 'USER_ACCOUNT'),
    [accounts]
  )

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!fromAccountId || !toAccountId || !amount) {
      setToast({ type: 'error', message: 'From account, To account, and Amount are required' })
      return
    }
    if (fromAccountId === toAccountId) {
      setToast({ type: 'error', message: 'From and To accounts must be different' })
      return
    }

    setLoading(true)
    try {
      await financeApi.createCashHandover({
        fromAccountId,
        toAccountId,
        amount: Number(amount),
        shiftId: shiftId || undefined,
        shiftName: shiftName || undefined,
        notes: notes || undefined,
      })
      setToast({ type: 'success', message: 'Cash handover request submitted successfully' })
      // Reset form
      setFromAccountId('')
      setToAccountId('')
      setAmount('')
      setShiftId('')
      setShiftName('')
      setNotes('')
    } catch (e: any) {
      setToast({ type: 'error', message: e?.message || 'Failed to submit handover request' })
    }
    setLoading(false)
  }

  const fromAccount = accounts.find(a => a._id === fromAccountId)

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <Toast toast={toast} onClose={() => setToast(null)} />

      <h1 className="text-2xl font-semibold mb-6">Cash Handover</h1>

      <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow p-6 space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">From Account (Handing Over) *</label>
          <select
            value={fromAccountId}
            onChange={e => setFromAccountId(e.target.value)}
            className="w-full px-3 py-2 border rounded-lg"
            required
          >
            <option value="">Select account</option>
            {cashAccounts.map(a => (
              <option key={a._id} value={a._id}>{a.name} ({a.portal})</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">To Account (Receiving) *</label>
          <select
            value={toAccountId}
            onChange={e => setToAccountId(e.target.value)}
            className="w-full px-3 py-2 border rounded-lg"
            required
          >
            <option value="">Select account</option>
            {accounts
              .filter(a => a._id !== fromAccountId)
              .map(a => (
                <option key={a._id} value={a._id}>{a.name} ({a.type})</option>
              ))}
          </select>
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

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Shift ID (optional)</label>
            <input
              type="text"
              value={shiftId}
              onChange={e => setShiftId(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg"
              placeholder="Shift identifier"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Shift Name (optional)</label>
            <input
              type="text"
              value={shiftName}
              onChange={e => setShiftName(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg"
              placeholder="e.g., Morning Shift"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Notes (optional)</label>
          <textarea
            value={notes}
            onChange={e => setNotes(e.target.value)}
            className="w-full px-3 py-2 border rounded-lg"
            rows={3}
            placeholder="Any additional notes..."
          />
        </div>

        {fromAccount && (
          <div className="bg-blue-50 p-4 rounded-lg">
            <p className="text-sm text-blue-800">
              <strong>Note:</strong> This will create a pending handover request. 
              A finance manager must approve it before the cash is transferred.
            </p>
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? 'Submitting...' : 'Submit Handover Request'}
        </button>
      </form>
    </div>
  )
}
