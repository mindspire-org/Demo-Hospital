import { useState } from 'react'
import { Loader2, DoorClosed, Calculator, AlertTriangle, X } from 'lucide-react'
import financeApi from '../../features/finance/finance.api'
import type { Shift } from '../../features/finance/shift.types'

interface ShiftCloseDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
  shift: Shift | null
}

export function ShiftCloseDialog({ open, onOpenChange, onSuccess, shift }: ShiftCloseDialogProps) {
  const [actualCash, setActualCash] = useState('')
  const [varianceReason, setVarianceReason] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  if (!open || !shift) return null

  const expectedCash = (shift.openingFloat || 0) + (shift.collections?.total || 0) - (shift.expenses?.total || 0)
  const actualCashNum = Number(actualCash) || 0
  const variance = actualCashNum - expectedCash
  const showApprovalField = Math.abs(variance) > 5000

  const handleClose = async () => {
    if (showApprovalField && !varianceReason.trim()) {
      alert('Please provide a reason for the variance')
      return
    }

    setIsSubmitting(true)
    try {
      await financeApi.closeShift(shift._id, { actualCash: actualCashNum, notes: varianceReason })
      alert('Shift closed successfully!')
      onOpenChange(false)
      onSuccess?.()
      setActualCash('')
      setVarianceReason('')
    } catch (error: any) {
      alert(error?.message || 'Failed to close shift')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-lg rounded-xl bg-white shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between border-b px-6 py-4">
          <div className="flex items-center gap-2">
            <DoorClosed className="h-5 w-5 text-rose-500" />
            <h2 className="text-lg font-semibold">Close Shift</h2>
          </div>
          <button
            onClick={() => onOpenChange(false)}
            className="rounded-full p-1 hover:bg-slate-100"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          <div className="bg-slate-50 rounded-lg p-4 space-y-3 border border-slate-200">
            <h4 className="font-medium text-sm flex items-center gap-2">
              <Calculator className="w-4 h-4 text-blue-500" />
              Cash Reconciliation
            </h4>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-slate-500">Opening Float:</span>
                <p className="font-medium">Rs. {(shift.openingFloat || 0).toLocaleString()}</p>
              </div>
              <div>
                <span className="text-slate-500">Collections:</span>
                <p className="font-medium text-emerald-600">+ Rs. {(shift.collections?.total || 0).toLocaleString()}</p>
              </div>
              <div>
                <span className="text-slate-500">Expenses:</span>
                <p className="font-medium text-rose-600">- Rs. {(shift.expenses?.total || 0).toLocaleString()}</p>
              </div>
              <div className="col-span-2 border-t pt-2 mt-1">
                <span className="text-slate-500">Expected Cash:</span>
                <p className="font-bold text-lg">Rs. {expectedCash.toLocaleString()}</p>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <label htmlFor="actualCash" className="block text-sm font-medium text-slate-700">
              Actual Cash Count (PKR)
            </label>
            <input
              id="actualCash"
              type="number"
              value={actualCash}
              onChange={(e) => setActualCash(e.target.value)}
              placeholder="0.00"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-lg focus:border-rose-500 focus:outline-none focus:ring-2 focus:ring-rose-500/20"
            />
          </div>

          {actualCashNum > 0 && (
            <div className={`p-4 rounded-lg border ${
              variance === 0 
                ? 'bg-emerald-50 border-emerald-200' 
                : Math.abs(variance) <= 100 
                  ? 'bg-amber-50 border-amber-200'
                  : 'bg-rose-50 border-rose-200'
            }`}>
              <div className="flex items-center justify-between">
                <span className="font-medium">Variance:</span>
                <span className={`font-bold text-lg ${
                  variance === 0 
                    ? 'text-emerald-600' 
                    : Math.abs(variance) <= 100 
                      ? 'text-amber-600'
                      : 'text-rose-600'
                }`}>
                  {variance > 0 ? '+' : ''}Rs. {variance.toLocaleString()}
                </span>
              </div>
              {variance !== 0 && (
                <p className="text-sm mt-2 text-slate-500">
                  {variance > 0 
                    ? 'Cash exceeds expected amount' 
                    : 'Cash is short from expected amount'}
                </p>
              )}
              {showApprovalField && (
                <div className="flex items-start gap-2 mt-3 text-amber-700">
                  <AlertTriangle className="w-4 h-4 mt-0.5" />
                  <p className="text-sm">
                    Variance exceeds Rs. 5,000. Supervisor approval required.
                  </p>
                </div>
              )}
            </div>
          )}

          {showApprovalField && (
            <div className="space-y-2">
              <label htmlFor="varianceReason" className="block text-sm font-medium text-amber-700">
                Variance Reason * (Required for approval)
              </label>
              <textarea
                id="varianceReason"
                value={varianceReason}
                onChange={(e) => setVarianceReason(e.target.value)}
                placeholder="Explain the reason for the variance (e.g., miscount, refund not recorded, etc.)"
                rows={3}
                className="w-full resize-none rounded-lg border border-amber-300 px-3 py-2 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/20"
              />
            </div>
          )}
        </div>

        <div className="flex gap-3 border-t px-6 py-4">
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
            className="flex-1 rounded-lg border border-slate-300 px-4 py-2 font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleClose}
            disabled={isSubmitting || actualCashNum <= 0 || (showApprovalField && !varianceReason.trim())}
            className="flex-1 rounded-lg bg-linear-to-r from-rose-500 to-red-600 px-4 py-2 font-medium text-white shadow-lg transition hover:from-rose-600 hover:to-red-700 disabled:opacity-50"
          >
            {isSubmitting ? (
              <span className="flex items-center justify-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                Closing...
              </span>
            ) : (
              <span className="flex items-center justify-center gap-2">
                <DoorClosed className="h-4 w-4" />
                Close Shift
              </span>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
