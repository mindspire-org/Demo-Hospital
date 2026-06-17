import { useEffect, useState, useMemo } from 'react'
import { labApi } from '../../utils/api'
import {
  Receipt, Download, RefreshCcw, CheckCircle2, Search,
  PieChart, Clock, TestTube
} from 'lucide-react'

type SummaryData = {
  totalTokens: number
  completedTokens: number
  pendingTokens: number
  totalRevenue: number
  totalReceived: number
}

type Financials = {
  openingBalance: number
  cashIn: number
  cashOut: number
  closingBalance: number
}

type TestStat = {
  name: string
  count: number
  completed: number
  revenue: number
}

type DailyBreakdown = {
  date: string
  tokens: number
  revenue: number
  completed: number
}

export default function Lab_Statement() {
  const [from, setFrom] = useState(() => new Date().toISOString().slice(0, 10))
  const [to, setTo] = useState(() => new Date().toISOString().slice(0, 10))
  const [period, setPeriod] = useState<'today' | 'weekly' | 'monthly'>('today')
  const [loading, setLoading] = useState(false)
  const [data, setData] = useState<{
    summary: SummaryData
    financials: Financials
    testWiseStats: TestStat[]
    dailyBreakdown: DailyBreakdown[]
  } | null>(null)

  const [testSearch, setTestSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'completed' | 'generated'>('all')

  useEffect(() => {
    setPeriodDates('today')
  }, [])

  function setPeriodDates(periodType: 'today' | 'weekly' | 'monthly') {
    const today = new Date()
    let fromDate = new Date()
    
    switch (periodType) {
      case 'today':
        fromDate = today
        break
      case 'weekly':
        const dayOfWeek = today.getDay()
        const diff = dayOfWeek === 0 ? 6 : dayOfWeek - 1
        fromDate = new Date(today)
        fromDate.setDate(today.getDate() - diff)
        break
      case 'monthly':
        fromDate = new Date(today.getFullYear(), today.getMonth(), 1)
        break
    }
    
    const nextFrom = fromDate.toISOString().slice(0, 10)
    const nextTo = today.toISOString().slice(0, 10)
    setFrom(nextFrom)
    setTo(nextTo)
    setPeriod(periodType)

    fetchStatement(nextFrom, nextTo)
  }

  async function fetchStatement(fromArg?: string, toArg?: string) {
    setLoading(true)
    try {
      const fromDate = fromArg ?? from
      const toDate = toArg ?? to
      const res: any = await labApi.getStatement({ from: fromDate, to: toDate })
      if (res.success) {
        setData(res)
      }
    } catch (error) {
      console.error('Failed to fetch statement:', error)
    } finally {
      setLoading(false)
    }
  }

  const filteredTestStats = useMemo(() => {
    if (!data?.testWiseStats) return []
    return data.testWiseStats.filter(s => {
      const matchesSearch = s.name.toLowerCase().includes(testSearch.toLowerCase())
      
      // Status filter logic
      let matchesStatus = true
      if (statusFilter === 'completed') {
        matchesStatus = s.completed > 0
      } else if (statusFilter === 'generated') {
        matchesStatus = s.count > 0
      }
      
      return matchesSearch && matchesStatus
    })
  }, [data?.testWiseStats, testSearch, statusFilter])

  const fmtMoney = (n: number) => `Rs ${n.toLocaleString()}`

  function exportCSV() {
    if (!data) return
    
    // Use filtered data instead of all data
    const dataToExport = filteredTestStats.length > 0 ? filteredTestStats : data.testWiseStats
    
    let csv = 'Lab Statement\n'
    csv += `Period: ${from} to ${to}\n\n`
    
    csv += 'Test Wise Breakdown\n'
    csv += 'Test Name,Count,Completed,Revenue\n'
    dataToExport.forEach(s => {
      csv += `"${s.name}",${s.count},${s.completed},${s.revenue}\n`
    })
    
    // Add totals
    const totalCount = dataToExport.reduce((sum, s) => sum + s.count, 0)
    const totalCompleted = dataToExport.reduce((sum, s) => sum + s.completed, 0)
    const totalRevenue = dataToExport.reduce((sum, s) => sum + s.revenue, 0)
    csv += `\nTOTAL,${totalCount},${totalCompleted},${totalRevenue}\n`

    const blob = new Blob([csv], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `Lab_Statement_${from}_to_${to}.csv`
    a.click()
  }

  const completionRate = data && data.summary.totalTokens > 0 
    ? Math.round((data.summary.completedTokens / data.summary.totalTokens) * 100) 
    : 0

  // Calculate filtered summary
  const filteredSummary = useMemo(() => {
    if (!data) return { totalCount: 0, totalCompleted: 0, totalRevenue: 0 }
    return {
      totalCount: filteredTestStats.reduce((sum, s) => sum + s.count, 0),
      totalCompleted: filteredTestStats.reduce((sum, s) => sum + s.completed, 0),
      totalRevenue: filteredTestStats.reduce((sum, s) => sum + s.revenue, 0)
    }
  }, [filteredTestStats, data])

  return (
    <div className="w-full min-h-screen bg-slate-50 px-4 md:px-8 py-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight mb-1">Test Analytics</h1>
          <p className="text-slate-600">Track test performance and token statistics</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={exportCSV}
            disabled={loading || !data}
            className="flex items-center gap-2 rounded-lg bg-white border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-all"
          >
            <Download className="h-4 w-4" />
            Export CSV
          </button>
          <button
            onClick={fetchStatement}
            disabled={loading}
            className="flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 transition-all"
          >
            {loading ? <RefreshCcw className="h-4 w-4 animate-spin" /> : <RefreshCcw className="h-4 w-4" />}
            Refresh
          </button>
        </div>
      </div>

      {/* Period Selector & Date Range */}
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="grid grid-cols-1 gap-6">
          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase mb-3 ml-1">Select Period</label>
            <div className="flex gap-3">
              <button
                onClick={() => setPeriodDates('today')}
                className={`flex-1 rounded-lg px-5 py-2.5 text-sm font-semibold transition-all ${
                  period === 'today'
                    ? 'bg-slate-900 text-white'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                Today
              </button>
              <button
                onClick={() => setPeriodDates('weekly')}
                className={`flex-1 rounded-lg px-5 py-2.5 text-sm font-semibold transition-all ${
                  period === 'weekly'
                    ? 'bg-slate-900 text-white'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                Weekly
              </button>
              <button
                onClick={() => setPeriodDates('monthly')}
                className={`flex-1 rounded-lg px-5 py-2.5 text-sm font-semibold transition-all ${
                  period === 'monthly'
                    ? 'bg-slate-900 text-white'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                Monthly
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-end">
            <div className="md:col-span-4 lg:col-span-3">
              <label className="block text-xs font-bold text-slate-400 uppercase mb-2 ml-1">Date Range (From)</label>
              <input
                type="date"
                value={from}
                onChange={(e) => setFrom(e.target.value)}
                className="w-full rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-medium focus:ring-2 focus:ring-slate-200 focus:border-slate-400 outline-none transition-all"
              />
            </div>
            <div className="md:col-span-4 lg:col-span-3">
              <label className="block text-xs font-bold text-slate-400 uppercase mb-2 ml-1">Date Range (To)</label>
              <input
                type="date"
                value={to}
                onChange={(e) => setTo(e.target.value)}
                className="w-full rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-medium focus:ring-2 focus:ring-slate-200 focus:border-slate-400 outline-none transition-all"
              />
            </div>
            <div className="md:col-span-4 lg:col-span-2">
              <button
                onClick={fetchStatement}
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 rounded-lg bg-slate-900 px-6 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 transition-all h-[42px]"
              >
                Apply Filter
              </button>
            </div>
          </div>
        </div>
      </div>

      {data && (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="mb-3 inline-flex h-9 w-9 items-center justify-center rounded-lg bg-slate-100 text-slate-700">
                <Receipt className="h-5 w-5" />
              </div>
              <div className="text-2xl font-bold text-slate-900 mb-1">{data.summary.totalTokens}</div>
              <div className="text-sm text-slate-600">Total Tokens</div>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="mb-3 inline-flex h-9 w-9 items-center justify-center rounded-lg bg-slate-100 text-slate-700">
                <CheckCircle2 className="h-5 w-5" />
              </div>
              <div className="text-2xl font-bold text-slate-900 mb-1">{data.summary.completedTokens}</div>
              <div className="text-sm text-slate-600">Completed</div>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="mb-3 inline-flex h-9 w-9 items-center justify-center rounded-lg bg-slate-100 text-slate-700">
                <Clock className="h-5 w-5" />
              </div>
              <div className="text-2xl font-bold text-slate-900 mb-1">{data.summary.pendingTokens}</div>
              <div className="text-sm text-slate-600">Pending</div>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="mb-3 inline-flex h-9 w-9 items-center justify-center rounded-lg bg-slate-100 text-slate-700">
                <PieChart className="h-5 w-5" />
              </div>
              <div className="text-2xl font-bold text-slate-900 mb-1">{completionRate}%</div>
              <div className="text-sm text-slate-600">Completion</div>
            </div>
          </div>

          {/* Filtered Summary - Show when search is active */}
          {(testSearch || statusFilter !== 'all') && (
            <div className="rounded-xl bg-white border border-slate-200 p-4 shadow-sm">
              <div className="flex items-center justify-between flex-wrap gap-4">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-slate-900"></div>
                  <span className="text-sm font-semibold text-slate-700">Filtered Results:</span>
                </div>
                <div className="flex items-center gap-6">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-slate-900">{filteredSummary.totalCount}</div>
                    <div className="text-xs text-slate-600">Tests</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-slate-900">{filteredSummary.totalCompleted}</div>
                    <div className="text-xs text-slate-600">Completed</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-slate-900">{fmtMoney(filteredSummary.totalRevenue)}</div>
                    <div className="text-xs text-slate-600">Revenue</div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Test Performance Table */}
          <div className="rounded-xl bg-white shadow-sm overflow-hidden border border-slate-200">
            <div className="px-6 py-4 bg-white flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200">
              <div>
                <h3 className="font-bold text-slate-900 text-lg">Test Performance Details</h3>
                <p className="text-sm text-slate-500 mt-0.5">Breakdown by test type</p>
              </div>
              <div className="relative group">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search tests..."
                  value={testSearch}
                  onChange={(e) => setTestSearch(e.target.value)}
                  className="rounded-lg bg-white border border-slate-200 pl-10 pr-4 py-2 text-sm font-medium text-slate-900 placeholder-slate-400 outline-none transition-all w-64 focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
                />
              </div>
            </div>

            {/* Search Bar and Status Filter */}
            <div className="px-6 py-4 bg-slate-50 border-b border-slate-200">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <span className="text-sm font-semibold text-slate-700">Show:</span>
                  <button
                    onClick={() => setStatusFilter('all')}
                    className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                      statusFilter === 'all'
                        ? 'bg-slate-900 text-white'
                        : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    All Tests
                  </button>
                  <button
                    onClick={() => setStatusFilter('generated')}
                    className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                      statusFilter === 'generated'
                        ? 'bg-slate-900 text-white'
                        : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    Generated Only
                  </button>
                  <button
                    onClick={() => setStatusFilter('completed')}
                    className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                      statusFilter === 'completed'
                        ? 'bg-slate-900 text-white'
                        : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    Completed Only
                  </button>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-sm font-semibold text-slate-500">
                    {filteredTestStats.length} of {data.testWiseStats.length} Tests
                  </div>
                  {(testSearch || statusFilter !== 'all') && (
                    <button 
                      onClick={() => { setTestSearch(''); setStatusFilter('all'); }}
                      className="px-4 py-2 rounded-lg bg-white border border-slate-200 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
                    >
                      Clear Filters
                    </button>
                  )}
                </div>
              </div>
            </div>

            <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
              <table className="w-full text-left text-sm">
                <thead className="sticky top-0 bg-slate-50 border-b-2 border-slate-200 z-10">
                  <tr>
                    <th className="px-6 py-4 text-xs font-black text-slate-600 uppercase tracking-wider">Test Name</th>
                    <th className="px-6 py-4 text-xs font-black text-slate-600 uppercase tracking-wider text-center">Generated</th>
                    <th className="px-6 py-4 text-xs font-black text-slate-600 uppercase tracking-wider text-center">Completed</th>
                    <th className="px-6 py-4 text-xs font-black text-slate-600 uppercase tracking-wider text-right">Revenue</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {filteredTestStats.map((s, i) => (
                    <tr key={i} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4 text-slate-900 font-medium">{s.name}</td>
                      <td className="px-6 py-4 text-center">
                        <span className="inline-flex items-center justify-center min-w-[3rem] px-3 py-2 rounded-lg bg-slate-100 text-slate-900 font-semibold text-base">
                          {s.count}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className="inline-flex items-center justify-center min-w-[3rem] px-3 py-2 rounded-lg bg-slate-100 text-slate-900 font-semibold text-base">
                          {s.completed}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right font-semibold text-slate-900 text-base">
                        {fmtMoney(s.revenue)}
                      </td>
                    </tr>
                  ))}
                  {filteredTestStats.length === 0 && (
                    <tr>
                      <td colSpan={4} className="px-6 py-12 text-center">
                        <div className="flex flex-col items-center gap-3">
                          <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center">
                            <TestTube className="h-8 w-8 text-slate-400" />
                          </div>
                          <p className="text-slate-500 font-medium">No tests found matching your criteria</p>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
                {filteredTestStats.length > 0 && (
                  <tfoot className="sticky bottom-0 bg-slate-50 border-t border-slate-200">
                    <tr>
                      <td className="px-6 py-5 text-right font-bold text-slate-900 text-lg">
                        TOTAL:
                      </td>
                      <td className="px-6 py-5 text-center">
                        <span className="inline-flex items-center justify-center min-w-[3.5rem] px-4 py-2.5 rounded-lg bg-slate-200 text-slate-900 font-bold text-lg">
                          {data.testWiseStats.reduce((sum, s) => sum + s.count, 0)}
                        </span>
                      </td>
                      <td className="px-6 py-5 text-center">
                        <span className="inline-flex items-center justify-center min-w-[3.5rem] px-4 py-2.5 rounded-lg bg-slate-200 text-slate-900 font-bold text-lg">
                          {data.testWiseStats.reduce((sum, s) => sum + s.completed, 0)}
                        </span>
                      </td>
                      <td className="px-6 py-5 text-right font-bold text-slate-900 text-xl">
                        {fmtMoney(data.testWiseStats.reduce((sum, s) => sum + s.revenue, 0))}
                      </td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          </div>
        </>
      )}

      {loading && (
        !data ? (
          <div className="fixed inset-0 bg-white/60 backdrop-blur-[2px] z-50 flex flex-col items-center justify-center gap-6">
            <div className="h-20 w-20 rounded-full border-4 border-slate-200 border-t-slate-900 animate-spin"></div>
            <div className="text-center">
              <p className="text-slate-900 font-bold text-lg tracking-tight">Loading Test Performance Data...</p>
            </div>
          </div>
        ) : null
      )}
    </div>
  )
}
