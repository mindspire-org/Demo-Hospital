import { useState } from 'react'
import { Loader2, DoorOpen, X } from 'lucide-react'
import financeApi from '../../features/finance/finance.api'

interface ShiftOpenDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
  counterId: string
  counterName: string
}

const SHIFT_TYPES = [
  { value: 'morning', label: 'Morning Shift (08:00 - 16:00)' },
  { value: 'evening', label: 'Evening Shift (16:00 - 00:00)' },
  { value: 'night', label: 'Night Shift (00:00 - 08:00)' },
  { value: 'custom', label: 'Custom Shift' }
]

export function ShiftOpenDialog({ open, onOpenChange, onSuccess, counterId, counterName }: ShiftOpenDialogProps) {
  const [shiftType, setShiftType] = useState('morning')
  const [shiftName, setShiftName] = useState('Morning Shift')
  const [openingFloat, setOpeningFloat] = useState('')
  const [notes, setNotes] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleShiftTypeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value
    setShiftType(value)
    const selected = SHIFT_TYPES.find(s => s.value === value)
    setShiftName(selected?.label.split(' (')[0] || 'Custom Shift')
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!shiftType || !counterId) {
      alert('Please select a shift type')
      return
    }

    setIsSubmitting(true)
    try {
      await financeApi.openShift({
        shiftType: shiftType as any,
        shiftName,
        counterId,
        counterName,
        openingFloat: Number(openingFloat) || 0,
        notes
      })
      onOpenChange(false)
      onSuccess?.()
      setShiftType('morning')
      setShiftName('Morning Shift')
      setOpeningFloat('')
      setNotes('')
    } catch (error: any) {
      alert(error?.message || 'Failed to open shift')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b px-6 py-4">
          <div className="flex items-center gap-2">
            <DoorOpen className="h-5 w-5 text-emerald-500" />
            <h2 className="text-lg font-semibold">Open New Shift</h2>
          </div>
          <button
            onClick={() => onOpenChange(false)}
            className="rounded-full p-1 hover:bg-slate-100"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 p-6">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Shift Type
            </label>
            <select
              value={shiftType}
              onChange={handleShiftTypeChange}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
            >
              {SHIFT_TYPES.map(type => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="shiftName" className="mb-1 block text-sm font-medium text-slate-700">
              Shift Name
            </label>
            <input
              id="shiftName"
              type="text"
              value={shiftName}
              onChange={(e) => setShiftName(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
            />
          </div>

          <div>
            <label htmlFor="openingFloat" className="mb-1 block text-sm font-medium text-slate-700">
              Opening Float (PKR)
            </label>
            <input
              id="openingFloat"
              type="number"
              value={openingFloat}
              onChange={(e) => setOpeningFloat(e.target.value)}
              placeholder="0.00"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
            />
            <p className="mt-1 text-xs text-slate-500">
              Cash amount available at the start of the shift
            </p>
          </div>

          <div>
            <label htmlFor="notes" className="mb-1 block text-sm font-medium text-slate-700">
              Notes (Optional)
            </label>
            <textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Any special instructions or observations..."
              rows={3}
              className="w-full resize-none rounded-lg border border-slate-300 px-3 py-2 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
              className="flex-1 rounded-lg border border-slate-300 px-4 py-2 font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 rounded-lg bg-linear-to-r from-emerald-500 to-teal-600 px-4 py-2 font-medium text-white shadow-lg transition hover:from-emerald-600 hover:to-teal-700 disabled:opacity-50"
            >
              {isSubmitting ? (
                <span className="flex items-center justify-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Opening...
                </span>
              ) : (
                <span className="flex items-center justify-center gap-2">
                  <DoorOpen className="h-4 w-4" />
                  Open Shift
                </span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
