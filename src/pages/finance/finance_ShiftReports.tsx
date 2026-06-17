import { useState, useEffect, useCallback } from 'react'
import {
  Clock, Filter, Download, ChevronDown, ChevronUp,
  AlertTriangle, TrendingUp, TrendingDown, DollarSign, RefreshCw
} from 'lucide-react'
import financeApi from '../../features/finance/finance.api'
import type { Shift } from '../../features/finance/shift.types'
import { SHIFT_TYPE_LABELS, STATUS_COLORS, STATUS_LABELS } from '../../features/finance/shift.types'

interface Filters {
  from: string
  to: string
  shiftType: string
  counterId: string
  status: string
}

export default function Finance_ShiftReports() {
  const [shifts, setShifts] = useState<Shift[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showFilters, setShowFilters] = useState(false)
  const [expandedShift, setExpandedShift] = useState<string | null>(null)
  const [filters, setFilters] = useState<Filters>({
    from: new Date(new Date().setDate(new Date().getDate() - 30)).toISOString().split('T')[0],
    to: new Date().toISOString().split('T')[0],
    shiftType: '',
    counterId: '',
    status: ''
  })

  const loadShifts = useCallback(async () => {
    try {
      setIsLoading(true)
      const params: any = {}
      if (filters.from) params.from = filters.from
      if (filters.to) params.to = filters.to
      if (filters.shiftType) params.shiftType = filters.shiftType
      if (filters.counterId) params.counterId = filters.counterId
      if (filters.status) params.status = filters.status
      params.limit = 100

      const result = await financeApi.listShifts(params)
      setShifts(result.shifts || [])
    } catch (error) {
      console.error('Failed to load shifts:', error)
      alert('Failed to load shift reports')
    } finally {
      setIsLoading(false)
    }
  }, [filters])

  useEffect(() => {
    loadShifts()
  }, [loadShifts])

  const handleExport = () => {
    const rows = shifts.map(s => ({
      'Shift Name': s.shiftName,
      'Type': s.shiftType,
      'Counter': s.counterName,
      'Status': s.status,
      'Opened By': s.openedBy.username,
      'Opened At': new Date(s.startTime).toLocaleString(),
      'Closed By': s.closedBy?.username || '-',
      'Closed At': s.endTime ? new Date(s.endTime).toLocaleString() : '-',
      'Opening Float': s.openingFloat,
      'Collections': s.collections.total,
      'Expenses': s.expenses.total,
      'Expected Cash': s.expectedCash,
      'Actual Cash': s.actualCash,
      'Variance': s.variance,
      'Variance Reason': s.varianceReason || '-'
    }))

    const headers = Object.keys(rows[0] || {})
    const csv = [
      headers.join(','),
      ...rows.map(r => headers.map(h => `"${(r as any)[h]}"`).join(','))
    ].join('\n')

    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `shift-reports-${filters.from}-to-${filters.to}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const stats = {
    totalShifts: shifts.length,
    totalCollections: shifts.reduce((s, sh) => s + (sh.collections?.total || 0), 0),
    totalExpenses: shifts.reduce((s, sh) => s + (sh.expenses?.total || 0), 0),
    totalVariance: shifts.reduce((s, sh) => s + Math.abs(sh.variance || 0), 0),
    openShifts: shifts.filter(s => s.status === 'open').length,
    closedShifts: shifts.filter(s => s.status === 'closed').length
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Clock className="h-6 w-6 text-violet-500" />
            Shift Reports
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            View and filter all shift records with detailed summaries
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center gap-2 rounded-lg border border-slate-300 px-4 py-2 font-medium text-slate-700 transition hover:bg-slate-50"
          >
            <Filter className="h-4 w-4" />
            {showFilters ? 'Hide' : 'Show'} Filters
          </button>
          <button
            onClick={handleExport}
            disabled={shifts.length === 0}
            className="flex items-center gap-2 rounded-lg bg-linear-to-r from-emerald-500 to-teal-600 px-4 py-2 font-medium text-white shadow-lg transition hover:from-emerald-600 hover:to-teal-700 disabled:opacity-50"
          >
            <Download className="h-4 w-4" />
            Export CSV
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
        <div className="bg-white rounded-xl border border-slate-200/60 shadow-sm p-4">
          <p className="text-xs text-slate-500">Total Shifts</p>
          <p className="text-2xl font-bold text-slate-900">{stats.totalShifts}</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200/60 shadow-sm p-4">
          <p className="text-xs text-slate-500">Open</p>
          <p className="text-2xl font-bold text-emerald-600">{stats.openShifts}</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200/60 shadow-sm p-4">
          <p className="text-xs text-slate-500">Closed</p>
          <p className="text-2xl font-bold text-blue-600">{stats.closedShifts}</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200/60 shadow-sm p-4">
          <p className="text-xs text-slate-500">Collections</p>
          <p className="text-lg font-bold text-emerald-600">PKR {(stats.totalCollections / 1000).toFixed(0)}K</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200/60 shadow-sm p-4">
          <p className="text-xs text-slate-500">Expenses</p>
          <p className="text-lg font-bold text-rose-600">PKR {(stats.totalExpenses / 1000).toFixed(0)}K</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200/60 shadow-sm p-4">
          <p className="text-xs text-slate-500">Total Variance</p>
          <p className={`text-lg font-bold ${stats.totalVariance === 0 ? 'text-emerald-600' : 'text-amber-600'}`}>
            PKR {stats.totalVariance.toLocaleString()}
          </p>
        </div>
      </div>

      {/* Filters Panel */}
      {showFilters && (
        <div className="bg-white rounded-xl border border-slate-200/60 shadow-sm p-4 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">From Date</label>
              <input
                type="date"
                value={filters.from}
                onChange={(e) => setFilters(f => ({ ...f, from: e.target.value }))}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-500/20"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">To Date</label>
              <input
                type="date"
                value={filters.to}
                onChange={(e) => setFilters(f => ({ ...f, to: e.target.value }))}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-500/20"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Shift Type</label>
              <select
                value={filters.shiftType}
                onChange={(e) => setFilters(f => ({ ...f, shiftType: e.target.value }))}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-500/20"
              >
                <option value="">All Types</option>
                <option value="morning">Morning</option>
                <option value="evening">Evening</option>
                <option value="night">Night</option>
                <option value="custom">Custom</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Status</label>
              <select
                value={filters.status}
                onChange={(e) => setFilters(f => ({ ...f, status: e.target.value }))}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-500/20"
              >
                <option value="">All Status</option>
                <option value="open">Open</option>
                <option value="closing">Closing</option>
                <option value="closed">Closed</option>
                <option value="reconciled">Reconciled</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Counter</label>
              <input
                type="text"
                placeholder="Search counter..."
                value={filters.counterId}
                onChange={(e) => setFilters(f => ({ ...f, counterId: e.target.value }))}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-500/20"
              />
            </div>
          </div>
        </div>
      )}

      {/* Shifts Table */}
      <div className="bg-white rounded-xl border border-slate-200/60 shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center">
            <div className="animate-pulse flex justify-center">
              <RefreshCw className="h-8 w-8 text-slate-300 animate-spin" />
            </div>
            <p className="mt-2 text-sm text-slate-500">Loading shifts...</p>
          </div>
        ) : shifts.length === 0 ? (
          <div className="p-12 text-center">
            <Clock className="h-12 w-12 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500">No shifts found for the selected filters.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3 text-left font-medium text-slate-700">Shift</th>
                  <th className="px-4 py-3 text-left font-medium text-slate-700">Counter</th>
                  <th className="px-4 py-3 text-left font-medium text-slate-700">Status</th>
                  <th className="px-4 py-3 text-right font-medium text-slate-700">Collections</th>
                  <th className="px-4 py-3 text-right font-medium text-slate-700">Expenses</th>
                  <th className="px-4 py-3 text-right font-medium text-slate-700">Variance</th>
                  <th className="px-4 py-3 text-left font-medium text-slate-700">Opened By</th>
                  <th className="px-4 py-3 text-left font-medium text-slate-700">Duration</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {shifts.map((shift) => (
                  <>
                    <tr
                      key={shift._id}
                      className="hover:bg-slate-50/50 transition-colors cursor-pointer"
                      onClick={() => setExpandedShift(expandedShift === shift._id ? null : shift._id)}
                    >
                      <td className="px-4 py-3">
                        <div>
                          <p className="font-medium text-slate-900">{shift.shiftName}</p>
                          <p className="text-xs text-slate-500">{SHIFT_TYPE_LABELS[shift.shiftType]}</p>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-slate-600">{shift.counterName}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium text-white ${STATUS_COLORS[shift.status]}`}>
                          {STATUS_LABELS[shift.status]}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right font-medium text-emerald-600">
                        PKR {(shift.collections?.total || 0).toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-right font-medium text-rose-600">
                        PKR {(shift.expenses?.total || 0).toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className={`font-medium ${
                          (shift.variance || 0) === 0 ? 'text-emerald-600' : 'text-amber-600'
                        }`}>
                          PKR {Math.abs(shift.variance || 0).toLocaleString()}
                          {(shift.variance || 0) !== 0 && (
                            shift.variance! > 0 ? (
                              <TrendingUp className="inline h-3 w-3 ml-1" />
                            ) : (
                              <TrendingDown className="inline h-3 w-3 ml-1" />
                            )
                          )}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-600">
                        <div>
                          <p className="text-sm">{shift.openedBy.username}</p>
                          <p className="text-xs text-slate-400">
                            {new Date(shift.startTime).toLocaleDateString()}
                          </p>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-slate-600">
                        {shift.endTime ? (
                          <span className="text-sm">
                            {Math.round((new Date(shift.endTime).getTime() - new Date(shift.startTime).getTime()) / (1000 * 60 * 60))}h
                          </span>
                        ) : (
                          <span className="text-xs text-slate-400">In progress</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {expandedShift === shift._id ? (
                          <ChevronUp className="h-4 w-4 text-slate-400" />
                        ) : (
                          <ChevronDown className="h-4 w-4 text-slate-400" />
                        )}
                      </td>
                    </tr>
                    {expandedShift === shift._id && (
                      <tr>
                        <td colSpan={9} className="px-4 py-4 bg-slate-50/50">
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="bg-white rounded-lg p-4 border border-slate-200">
                              <h4 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
                                <DollarSign className="h-4 w-4 text-emerald-500" />
                                Collections by Module
                              </h4>
                              <div className="space-y-2">
                                {Object.entries(shift.collections || {}).filter(([k]) => k !== 'total').map(([key, value]) => (
                                  <div key={key} className="flex justify-between text-sm">
                                    <span className="text-slate-600 capitalize">{key}:</span>
                                    <span className="font-medium">PKR {Number(value).toLocaleString()}</span>
                                  </div>
                                ))}
                                <div className="border-t pt-2 flex justify-between font-semibold">
                                  <span>Total:</span>
                                  <span className="text-emerald-600">PKR {(shift.collections?.total || 0).toLocaleString()}</span>
                                </div>
                              </div>
                            </div>

                            <div className="bg-white rounded-lg p-4 border border-slate-200">
                              <h4 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
                                <AlertTriangle className="h-4 w-4 text-rose-500" />
                                Expenses
                              </h4>
                              <div className="space-y-2">
                                {Object.entries(shift.expenses || {}).filter(([k]) => k !== 'total').map(([key, value]) => (
                                  <div key={key} className="flex justify-between text-sm">
                                    <span className="text-slate-600 capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}:</span>
                                    <span className="font-medium">PKR {Number(value).toLocaleString()}</span>
                                  </div>
                                ))}
                                <div className="border-t pt-2 flex justify-between font-semibold">
                                  <span>Total:</span>
                                  <span className="text-rose-600">PKR {(shift.expenses?.total || 0).toLocaleString()}</span>
                                </div>
                              </div>
                            </div>

                            <div className="bg-white rounded-lg p-4 border border-slate-200">
                              <h4 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
                                <Clock className="h-4 w-4 text-blue-500" />
                                Cash Reconciliation
                              </h4>
                              <div className="space-y-2 text-sm">
                                <div className="flex justify-between">
                                  <span className="text-slate-600">Opening Float:</span>
                                  <span className="font-medium">PKR {(shift.openingFloat || 0).toLocaleString()}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-slate-600">Collections:</span>
                                  <span className="font-medium text-emerald-600">+ PKR {(shift.collections?.total || 0).toLocaleString()}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-slate-600">Expenses:</span>
                                  <span className="font-medium text-rose-600">- PKR {(shift.expenses?.total || 0).toLocaleString()}</span>
                                </div>
                                <div className="border-t pt-2 flex justify-between font-semibold">
                                  <span>Expected:</span>
                                  <span>PKR {shift.expectedCash.toLocaleString()}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-slate-600">Actual:</span>
                                  <span className="font-medium">PKR {(shift.actualCash || 0).toLocaleString()}</span>
                                </div>
                                <div className="flex justify-between font-semibold">
                                  <span>Variance:</span>
                                  <span className={`${(shift.variance || 0) === 0 ? 'text-emerald-600' : 'text-amber-600'}`}>
                                    PKR {(shift.variance || 0).toLocaleString()}
                                  </span>
                                </div>
                                {shift.varianceReason && (
                                  <div className="mt-2 p-2 bg-amber-50 rounded text-xs text-amber-700">
                                    <span className="font-medium">Reason:</span> {shift.varianceReason}
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
