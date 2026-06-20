import { useState, useEffect, useCallback } from 'react'
import { DoorOpen, DoorClosed, Clock, Users } from 'lucide-react'
import { ShiftOpenDialog } from './ShiftOpenDialog'
import { ShiftCloseDialog } from './ShiftCloseDialog'
import financeApi from '../../features/finance/finance.api'
import type { Shift, ShiftSummary } from '../../features/finance/shift.types'
import { STATUS_COLORS, STATUS_LABELS } from '../../features/finance/shift.types'

interface ShiftDashboardProps {
  counterId: string
  counterName: string
}

export function ShiftDashboard({ counterId, counterName }: ShiftDashboardProps) {
  const [currentShift, setCurrentShift] = useState<Shift | null>(null)
  const [shiftSummary, setShiftSummary] = useState<ShiftSummary | null>(null)
  const [recentShifts, setRecentShifts] = useState<Shift[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [openDialog, setOpenDialog] = useState(false)
  const [closeDialog, setCloseDialog] = useState(false)

  const loadData = useCallback(async () => {
    try {
      setIsLoading(true)
      
      const current = await financeApi.getCurrentShift(counterId)
      setCurrentShift(current.shift || null)
      
      const from = new Date()
      from.setDate(from.getDate() - 30)
      const summary = await financeApi.getShiftSummary({
        from: from.toISOString().split('T')[0],
        to: new Date().toISOString().split('T')[0],
        counterId
      })
      setShiftSummary(summary.summary)
      
      const shifts = await financeApi.listShifts({ counterId, limit: 5 })
      setRecentShifts(shifts.shifts || [])
    } catch (error) {
      console.error('Failed to load shift data:', error)
    } finally {
      setIsLoading(false)
    }
  }, [counterId])

  useEffect(() => {
    loadData()
  }, [loadData])

  const handleOpenSuccess = () => {
    loadData()
  }

  const handleCloseSuccess = () => {
    loadData()
  }

  if (isLoading) {
    return (
      <div className="bg-white/70 backdrop-blur-md border border-white/50 shadow-xl rounded-lg p-8">
        <div className="flex items-center justify-center">
          <div className="animate-pulse flex space-x-4">
            <div className="h-4 bg-slate-200 rounded w-32"></div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <>
      <div className="space-y-4">
        <div className="bg-linear-to-br from-white to-slate-50/80 backdrop-blur-md border border-white/60 shadow-xl rounded-lg overflow-hidden">
          <div className={`h-1 ${currentShift ? STATUS_COLORS[currentShift.status] : 'bg-slate-300'}`} />
          <div className="px-6 py-4 pb-2">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <Clock className="w-5 h-5 text-slate-500" />
                  {counterName} - Shift Status
                </h3>
                <p className="text-sm text-slate-500 mt-1">
                  {currentShift ? `Active since ${new Date(currentShift.startTime).toLocaleTimeString()}` : 'No active shift'}
                </p>
              </div>
              <div className="flex gap-2">
                {!currentShift || currentShift.status === 'closed' || currentShift.status === 'reconciled' ? (
                  <button
                    onClick={() => setOpenDialog(true)}
                    className="flex items-center gap-2 rounded-lg bg-linear-to-r from-emerald-500 to-teal-600 px-4 py-2 font-medium text-white shadow-lg transition hover:from-emerald-600 hover:to-teal-700"
                  >
                    <DoorOpen className="w-4 h-4" />
                    Open New Shift
                  </button>
                ) : currentShift.status === 'open' ? (
                  <button
                    onClick={() => setCloseDialog(true)}
                    className="flex items-center gap-2 rounded-lg bg-linear-to-r from-rose-500 to-pink-600 px-4 py-2 font-medium text-white shadow-lg transition hover:from-rose-600 hover:to-pink-700"
                  >
                    <DoorClosed className="w-4 h-4" />
                    Close Shift
                  </button>
                ) : (
                  <button
                    onClick={() => setOpenDialog(true)}
                    className="flex items-center gap-2 rounded-lg bg-linear-to-r from-emerald-500 to-teal-600 px-4 py-2 font-medium text-white shadow-lg transition hover:from-emerald-600 hover:to-teal-700"
                  >
                    <DoorOpen className="w-4 h-4" />
                    Open New Shift
                  </button>
                )}
              </div>
            </div>
          </div>
          
          {currentShift && (
            <div className="px-6 pb-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-white/60 rounded-lg p-3">
                  <p className="text-xs text-slate-500">Status</p>
                  <span className={`inline-block mt-1 px-2 py-1 rounded text-xs font-medium text-white ${STATUS_COLORS[currentShift.status]}`}>
                    {STATUS_LABELS[currentShift.status]}
                  </span>
                </div>
                <div className="bg-white/60 rounded-lg p-3">
                  <p className="text-xs text-slate-500">Collections</p>
                  <p className="font-bold text-emerald-600">
                    PKR {currentShift.collections.total.toLocaleString()}
                  </p>
                </div>
                <div className="bg-white/60 rounded-lg p-3">
                  <p className="text-xs text-slate-500">Expenses</p>
                  <p className="font-bold text-rose-600">
                    PKR {currentShift.expenses.total.toLocaleString()}
                  </p>
                </div>
                <div className="bg-white/60 rounded-lg p-3">
                  <p className="text-xs text-slate-500">Expected Cash</p>
                  <p className="font-bold text-slate-700">
                    PKR {currentShift.expectedCash.toLocaleString()}
                  </p>
                </div>
              </div>
              
              <div className="mt-4 flex items-center gap-2 text-sm text-slate-500">
                <Users className="w-4 h-4" />
                Opened by {currentShift.openedBy.username} at{' '}
                {new Date(currentShift.startTime).toLocaleString()}
              </div>
            </div>
          )}
        </div>

        {shiftSummary && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white/70 backdrop-blur-md border border-white/50 shadow-lg rounded-lg p-4">
              <p className="text-xs text-slate-500">Total Shifts (30d)</p>
              <p className="text-2xl font-bold">{shiftSummary.totalShifts}</p>
            </div>
            <div className="bg-white/70 backdrop-blur-md border border-white/50 shadow-lg rounded-lg p-4">
              <p className="text-xs text-slate-500">Total Collections</p>
              <p className="text-2xl font-bold text-emerald-600">
                PKR {(shiftSummary.totalCollections / 1000).toFixed(0)}K
              </p>
            </div>
            <div className="bg-white/70 backdrop-blur-md border border-white/50 shadow-lg rounded-lg p-4">
              <p className="text-xs text-slate-500">With Variance</p>
              <p className="text-2xl font-bold text-amber-600">
                {shiftSummary.shiftsWithVariance}
              </p>
            </div>
            <div className="bg-white/70 backdrop-blur-md border border-white/50 shadow-lg rounded-lg p-4">
              <p className="text-xs text-slate-500">Avg Variance</p>
              <p className={`text-2xl font-bold ${shiftSummary.avgVariance === 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                PKR {shiftSummary.avgVariance.toFixed(0)}
              </p>
            </div>
          </div>
        )}

        {recentShifts.length > 0 && (
          <div className="bg-white/70 backdrop-blur-md border border-white/50 shadow-lg rounded-lg">
            <div className="px-6 py-4 pb-2">
              <h4 className="text-sm font-semibold">Recent Shifts</h4>
            </div>
            <div className="px-6 pb-4">
              <div className="space-y-2">
                {recentShifts.map((shift) => (
                  <div
                    key={shift._id}
                    className="flex items-center justify-between p-2 rounded-lg bg-slate-50/50 hover:bg-slate-100/50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-2 h-2 rounded-full ${STATUS_COLORS[shift.status]}`} />
                      <div>
                        <p className="font-medium text-sm">{shift.shiftName}</p>
                        <p className="text-xs text-slate-500">
                          {new Date(shift.startTime).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-medium text-sm">PKR {shift.collections.total.toLocaleString()}</p>
                      <p className={`text-xs ${shift.variance === 0 ? 'text-emerald-600' : 'text-amber-600'}`}>
                        {shift.variance === 0 ? '✓ Balanced' : `Variance: PKR ${shift.variance}`}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      <ShiftOpenDialog
        open={openDialog}
        onOpenChange={setOpenDialog}
        onSuccess={handleOpenSuccess}
        counterId={counterId}
        counterName={counterName}
      />

      <ShiftCloseDialog
        open={closeDialog}
        onOpenChange={setCloseDialog}
        onSuccess={handleCloseSuccess}
        shift={currentShift}
      />
    </>
  )
}
