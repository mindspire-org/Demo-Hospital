import { useState } from 'react'
import { X, DollarSign, CheckCircle } from 'lucide-react'

type PaymentModalProps = {
  isOpen: boolean
  onClose: () => void
  onSubmit: (amount: number, method: string, note: string) => Promise<void>
  patientName: string
  tokenNo: string
  receivableAmount: number
}

export default function PaymentModal({ isOpen, onClose, onSubmit, patientName, tokenNo, receivableAmount }: PaymentModalProps) {
  const [amount, setAmount] = useState('')
  const [method, setMethod] = useState('cash')
  const [note, setNote] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)

  if (!isOpen) return null

  const handleClose = () => {
    setAmount('')
    setMethod('cash')
    setNote('')
    setSuccess(false)
    onClose()
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const amountNum = Number(amount)
    if (!amountNum || amountNum <= 0) {
      alert('Please enter a valid amount')
      return
    }
    if (amountNum > receivableAmount) {
      alert(`Amount cannot exceed receivable amount (Rs ${receivableAmount})`)
      return
    }
    
    setLoading(true)
    try {
      await onSubmit(amountNum, method, note)
      setSuccess(true)
      // Auto-close after 2 seconds
      setTimeout(() => {
        handleClose()
      }, 2000)
    } catch (error) {
      console.error('Payment error:', error)
      alert('Failed to process payment')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="relative w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
        {!success ? (
          <>
            <button
              onClick={handleClose}
              className="absolute right-4 top-4 rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="mb-4">
              <div className="flex items-center gap-2 text-xl font-bold text-slate-900">
                <DollarSign className="h-6 w-6 text-emerald-600" />
                Receive Payment
              </div>
              <div className="mt-2 text-sm text-slate-600">
                <div>Patient: <span className="font-semibold">{patientName}</span></div>
                <div>Sr#: <span className="font-mono font-semibold">{tokenNo}</span></div>
                <div className="mt-1 text-base">
                  Outstanding Balance: <span className="font-bold text-rose-600">Rs {receivableAmount}</span>
                </div>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Amount <span className="text-rose-500">*</span>
                </label>
                <input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="Enter amount"
                  min="1"
                  max={receivableAmount}
                  step="1"
                  required
                  className="w-full rounded-md border border-slate-300 px-3 py-2 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Payment Method <span className="text-rose-500">*</span>
                </label>
                <select
                  value={method}
                  onChange={(e) => setMethod(e.target.value)}
                  required
                  className="w-full rounded-md border border-slate-300 px-3 py-2 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200"
                >
                  <option value="cash">Cash</option>
                  <option value="card">Card</option>
                  <option value="bank_transfer">Bank Transfer</option>
                  <option value="cheque">Cheque</option>
                  <option value="online">Online Payment</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Note (Optional)
                </label>
                <textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Add payment note..."
                  rows={2}
                  className="w-full rounded-md border border-slate-300 px-3 py-2 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={handleClose}
                  disabled={loading}
                  className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
                >
                  {loading ? 'Processing...' : 'Receive Payment'}
                </button>
              </div>
            </form>
          </>
        ) : (
          <div className="flex flex-col items-center justify-center py-8">
            <div className="mb-4 rounded-full bg-emerald-100 p-3">
              <CheckCircle className="h-12 w-12 text-emerald-600" />
            </div>
            <h3 className="text-xl font-bold text-slate-900 mb-2">Payment Received!</h3>
            <p className="text-sm text-slate-600 text-center">
              Payment of Rs {amount} has been successfully recorded.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
