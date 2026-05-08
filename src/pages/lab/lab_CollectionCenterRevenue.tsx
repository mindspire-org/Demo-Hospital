import { useEffect, useState } from 'react'
import { labApi } from '../../features/lab/lab.api'
import {
  TrendingUp,
  Calendar,
  Building,
  Coins,
  FileText,
  Filter,
  ArrowRight,
  Printer,
  Download,
} from 'lucide-react'

type RevenueItem = {
  centerId: string
  centerName: string
  totalTokens: number
  totalRevenue: number
  totalCommission: number
  totalNetAmount: number
}

type TokenItem = {
  _id: string
  tokenNo: string
  patient?: {
    fullName?: string
  }
  generatedAt: string
  collectionCenterId?: string
  collectionCenterName?: string
  net?: number
  centerCommissionAmount?: number
  centerNetAmount?: number
  status?: string
}

export default function Lab_CollectionCenterRevenue() {
  const [revenueData, setRevenueData] = useState<RevenueItem[]>([])
  const [tokensData, setTokensData] = useState<TokenItem[]>([])
  const [loading, setLoading] = useState(true)
  const [dateFrom, setDateFrom] = useState(new Date().toISOString().split('T')[0])
  const [dateTo, setDateTo] = useState(new Date().toISOString().split('T')[0])
  const [centers, setCenters] = useState<{_id: string, name: string}[]>([])
  const [selectedCenter, setSelectedCenter] = useState('')
  
  // Pagination state
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState<number | 'all'>(25)
  const [total, setTotal] = useState(0)
  const [totalPages, setTotalPages] = useState(1)

  useEffect(() => {
    loadActiveCenters()
  }, [])

  useEffect(() => {
    loadRevenueReport()
  }, [dateFrom, dateTo, selectedCenter, page, limit])

  async function loadActiveCenters() {
    try {
      const res: any = await labApi.listActiveCollectionCenters()
      setCenters(res.items || [])
    } catch (err) {
      console.error('Failed to load centers:', err)
    }
  }

  async function loadRevenueReport() {
    try {
      setLoading(true)
      const params: any = { from: dateFrom, to: dateTo }
      
      // Load aggregated summary data
      let items: RevenueItem[] = []
      if (selectedCenter) {
        const res: any = await labApi.getCollectionCenterRevenue(selectedCenter, params)
        if (res.center && res.summary) {
          items = [{
            centerId: res.center._id,
            centerName: res.center.name,
            totalTokens: res.summary.totalTokens,
            totalRevenue: res.summary.totalRevenue,
            totalCommission: res.summary.totalCommission,
            totalNetAmount: res.summary.totalNetAmount,
          }]
        }
      } else {
        const res: any = await labApi.getCollectionCentersRevenueSummary(params)
        items = res.items || []
      }
      setRevenueData(items)
      
      // Load detailed tokens data for the table with pagination
      const tokenParams: any = { 
        from: dateFrom, 
        to: dateTo,
        page,
        limit: limit === 'all' ? undefined : limit
      }
      
      let tokens: TokenItem[] = []
      let res: any
      if (selectedCenter) {
        res = await labApi.getCollectionCenterTokens(selectedCenter, tokenParams)
      } else {
        // Load tokens from all centers with collection center info
        // Use 'any' to get only tokens with a collection center assigned
        res = await labApi.listTokens({ ...tokenParams, collectionCenterId: 'any' })
      }
      
      tokens = res.items || []
      setTokensData(tokens)
      setTotal(res.total || tokens.length)
      setTotalPages(res.totalPages || 1)
    } catch (err) {
      console.error('Failed to load revenue report:', err)
    } finally {
      setLoading(false)
    }
  }

  const totals = {
    tokens: revenueData.reduce((sum, item) => sum + item.totalTokens, 0),
    revenue: revenueData.reduce((sum, item) => sum + item.totalRevenue, 0),
    commission: revenueData.reduce((sum, item) => sum + item.totalCommission, 0),
    net: revenueData.reduce((sum, item) => sum + item.totalNetAmount, 0),
  }

  // Print report functionality - shows individual tokens
  function printReport() {
    const win = window.open('', 'print', 'width=1000,height=800')
    if (!win) return
    
    const rowsHtml = tokensData.map((token, idx) => `
      <tr>
        <td style="text-align:center">${idx + 1}</td>
        <td style="font-family:monospace;font-weight:bold">${token.tokenNo}</td>
        <td>${token.patient?.fullName || '-'}</td>
        <td>${new Date(token.generatedAt).toLocaleDateString('en-GB')}</td>
        <td>${token.collectionCenterName || 'Main Lab'}</td>
        <td style="text-align:right">Rs ${Number(token.net || 0).toLocaleString()}</td>
        <td style="text-align:right;color:#2563eb">Rs ${Number(token.centerCommissionAmount || 0).toLocaleString()}</td>
        <td style="text-align:right;color:#059669">Rs ${Number(token.centerNetAmount || 0).toLocaleString()}</td>
      </tr>
    `).join('')
    
    const grandTotalRevenue = tokensData.reduce((sum, t) => sum + (t.net || 0), 0)
    const grandTotalCommission = tokensData.reduce((sum, t) => sum + (t.centerCommissionAmount || 0), 0)
    const grandTotalNet = tokensData.reduce((sum, t) => sum + (t.centerNetAmount || 0), 0)
    
    win.document.write(`<!doctype html><html><head><title>Center Revenue Report - Tokens</title>
      <style>
        body{font-family:system-ui,-apple-system,Segoe UI,Roboto,Arial;padding:24px;color:#0f172a}
        h1{font-size:20px;margin:0 0 8px 0}
        .subtitle{font-size:12px;color:#64748b;margin-bottom:16px}
        .meta{font-size:11px;color:#64748b;margin-bottom:12px}
        table{width:100%;border-collapse:collapse;font-size:11px;margin-top:16px}
        th,td{border:1px solid #cbd5e1;padding:8px;text-align:left}
        th{background:#f1f5f9;font-weight:bold;font-size:10px;text-transform:uppercase;letter-spacing:0.5px}
        .totals{background:#0f172a;color:#fff;font-weight:bold;font-size:12px}
        .totals td{border-color:#334155}
        tr:nth-child(even){background:#f8fafc}
      </style>
    </head><body>`)
    win.document.write(`<h1>Collection Center Revenue Report - Token Details</h1>`)
    win.document.write(`<div class="subtitle">Period: ${dateFrom} to ${dateTo}</div>`)
    win.document.write(`<div class="meta">Generated: ${new Date().toLocaleString()} | Total Tokens: ${tokensData.length}</div>`)
    win.document.write(`<table>
      <thead>
        <tr>
          <th style="text-align:center;width:40px">#</th>
          <th>Token No</th>
          <th>Patient</th>
          <th>Date</th>
          <th>Center</th>
          <th style="text-align:right">Revenue</th>
          <th style="text-align:right">Commission</th>
          <th style="text-align:right">Net</th>
        </tr>
      </thead>
      <tbody>${rowsHtml}</tbody>
      <tfoot>
        <tr class="totals">
          <td colspan="5" style="text-align:center">GRAND TOTAL (${tokensData.length} tokens)</td>
          <td style="text-align:right">Rs ${grandTotalRevenue.toLocaleString()}</td>
          <td style="text-align:right">Rs ${grandTotalCommission.toLocaleString()}</td>
          <td style="text-align:right">Rs ${grandTotalNet.toLocaleString()}</td>
        </tr>
      </tfoot>
    </table>`)
    win.document.write('</body></html>')
    win.document.close(); win.focus(); win.print()
  }

  // Export CSV functionality - exports individual tokens
  function exportCSV() {
    const headers = ['#', 'Token No', 'Patient', 'Date', 'Center', 'Revenue', 'Commission', 'Net to Lab']
    const rows = tokensData.map((token, idx) => [
      idx + 1,
      token.tokenNo,
      token.patient?.fullName || '-',
      new Date(token.generatedAt).toLocaleDateString('en-GB'),
      token.collectionCenterName || 'Main Lab',
      token.net || 0,
      token.centerCommissionAmount || 0,
      token.centerNetAmount || 0
    ])
    // Add totals row
    const grandTotalRevenue = tokensData.reduce((sum, t) => sum + (t.net || 0), 0)
    const grandTotalCommission = tokensData.reduce((sum, t) => sum + (t.centerCommissionAmount || 0), 0)
    const grandTotalNet = tokensData.reduce((sum, t) => sum + (t.centerNetAmount || 0), 0)
    rows.push(['TOTAL', '', '', '', `${tokensData.length} tokens`, grandTotalRevenue, grandTotalCommission, grandTotalNet])
    
    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    link.setAttribute('href', url)
    link.setAttribute('download', `center-revenue-tokens-${dateFrom}-to-${dateTo}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  return (
    <div className="p-4 md:p-6 w-full min-h-[calc(100dvh-3.5rem)] bg-slate-50 dark:bg-slate-900/50">
      {/* Header */}
      <div className="rounded-2xl bg-linear-to-r from-violet-600 via-sky-600 to-emerald-500 p-5 text-white shadow-lg shadow-sky-200/50 mb-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-2xl font-bold">Center Revenue Report</h2>
            <div className="mt-0.5 text-sm text-sky-100">Analyze revenue and commissions generated by collection centers</div>
          </div>
          <div className="flex items-center gap-3">
            <button 
              onClick={printReport}
              disabled={revenueData.length === 0}
              className="inline-flex items-center gap-2 rounded-lg border border-white/30 bg-white/20 px-3 py-1.5 text-sm font-medium text-white backdrop-blur-sm hover:bg-white/30 disabled:opacity-50"
          >
            <Printer className="h-4 w-4" />
            Print Report
          </button>
          <button 
            onClick={exportCSV}
            disabled={revenueData.length === 0}
            className="inline-flex items-center gap-2 rounded-lg bg-white/30 px-3 py-1.5 text-sm font-semibold text-white backdrop-blur-sm hover:bg-white/40 disabled:opacity-50"
          >
            <Download className="h-4 w-4" />
            Export CSV
          </button>
        </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5 shadow-sm border-t-4 border-t-blue-500">
          <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-2">
            <FileText className="h-4 w-4" /> Total Tokens
          </p>
          <p className="text-3xl font-black text-slate-800 dark:text-white mt-2">{totals.tokens}</p>
          <p className="text-[10px] text-slate-400 mt-1 italic">Across all selected centers</p>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5 shadow-sm border-t-4 border-t-emerald-500">
          <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-2">
            <TrendingUp className="h-4 w-4" /> Gross Revenue
          </p>
          <p className="text-3xl font-black text-emerald-600 dark:text-emerald-400 mt-2">Rs {totals.revenue.toLocaleString()}</p>
          <p className="text-[10px] text-slate-400 mt-1 italic">Total billing amount</p>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5 shadow-sm border-t-4 border-t-blue-600" style={{ borderTopColor: 'var(--navy)' }}>
          <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-2">
            <Coins className="h-4 w-4 text-blue-600" /> Center Commission
          </p>
          <p className="text-3xl font-black text-blue-700 dark:text-blue-400 mt-2">Rs {totals.commission.toLocaleString()}</p>
          <p className="text-[10px] text-slate-400 mt-1 italic">Payable to centers</p>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5 shadow-sm border-t-4 border-t-indigo-600">
          <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-2">
            <ArrowRight className="h-4 w-4 text-indigo-600" /> Net to Lab
          </p>
          <p className="text-3xl font-black text-indigo-700 dark:text-indigo-400 mt-2">Rs {totals.net.toLocaleString()}</p>
          <p className="text-[10px] text-slate-400 mt-1 italic">Profit after commission</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6 mb-8 shadow-sm">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-6 items-end">
          <div>
            <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-2">
              <Calendar className="h-3.5 w-3.5" /> Date From
            </label>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => { setDateFrom(e.target.value); setPage(1) }}
              className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:text-white transition-all font-medium"
            />
          </div>
          <div>
            <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-2">
              <Calendar className="h-3.5 w-3.5" /> Date To
            </label>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => { setDateTo(e.target.value); setPage(1) }}
              className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:text-white transition-all font-medium"
            />
          </div>
          <div>
            <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-2">
              <Building className="h-3.5 w-3.5" /> Collection Center
            </label>
            <select
              value={selectedCenter}
              onChange={(e) => { setSelectedCenter(e.target.value); setPage(1) }}
              className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:text-white transition-all font-medium"
            >
              <option value="">All Centers Summary</option>
              {centers.map(c => (
                <option key={c._id} value={c._id}>{c.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-2">
              <FileText className="h-3.5 w-3.5" /> Show
            </label>
            <select
              value={limit}
              onChange={(e) => { setLimit(e.target.value === 'all' ? 'all' : Number(e.target.value)); setPage(1) }}
              className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:text-white transition-all font-medium"
            >
              <option value={10}>10 per page</option>
              <option value={25}>25 per page</option>
              <option value={50}>50 per page</option>
              <option value={100}>100 per page</option>
              <option value="all">All</option>
            </select>
          </div>
          <div>
            <button
              onClick={loadRevenueReport}
              className="w-full px-6 py-2.5 text-white font-bold rounded-lg hover:opacity-90 flex items-center justify-center gap-2 shadow-lg shadow-blue-500/20 active:scale-[0.98] transition-all"
              style={{ backgroundColor: 'var(--navy)' }}
            >
              <Filter className="h-4 w-4" />
              Generate Report
            </button>
          </div>
        </div>
      </div>

      {/* Revenue Table - Detailed Token View */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-md">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-700">
                <th className="px-4 py-4 text-center text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest w-16">#</th>
                <th className="px-4 py-4 text-left text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">Token No</th>
                <th className="px-4 py-4 text-left text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">Patient</th>
                <th className="px-4 py-4 text-left text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">Date</th>
                <th className="px-4 py-4 text-left text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">Center</th>
                <th className="px-4 py-4 text-right text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">Revenue</th>
                <th className="px-4 py-4 text-right text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">Commission</th>
                <th className="px-4 py-4 text-right text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">Net</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
              {loading ? (
                <tr>
                  <td colSpan={8} className="px-6 py-16 text-center">
                    <div className="flex flex-col items-center justify-center gap-4">
                      <div className="animate-spin h-10 w-10 border-4 border-purple-500 border-t-transparent rounded-full" />
                      <span className="text-lg font-bold text-slate-400">Compiling financial data...</span>
                    </div>
                  </td>
                </tr>
              ) : tokensData.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-16 text-center">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <FileText className="h-12 w-12 text-slate-200" />
                      <p className="text-slate-500 font-bold text-lg">No revenue records found</p>
                      <p className="text-slate-400 text-sm">Try selecting a different date range or center</p>
                    </div>
                  </td>
                </tr>
              ) : (
                <>
                  {tokensData.map((token, idx) => (
                    <tr key={token._id} className="hover:bg-slate-50 dark:hover:bg-slate-900/30 transition-colors">
                      <td className="px-4 py-4 text-center">
                        <span className="text-sm font-bold text-slate-400">
                          {((page - 1) * (limit === 'all' ? tokensData.length : (limit as number))) + idx + 1}
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        <span className="font-mono font-bold text-slate-800 dark:text-white text-sm">{token.tokenNo}</span>
                      </td>
                      <td className="px-4 py-4">
                        <span className="font-semibold text-slate-800 dark:text-white">{token.patient?.fullName || '-'}</span>
                      </td>
                      <td className="px-4 py-4">
                        <span className="text-sm text-slate-600 dark:text-slate-400">
                          {new Date(token.generatedAt).toLocaleDateString('en-GB', { 
                            day: '2-digit', 
                            month: 'short', 
                            year: 'numeric' 
                          })}
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-2">
                          <div className="p-1.5 bg-blue-50 dark:bg-blue-900/20 rounded">
                            <Building className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
                          </div>
                          <span className="text-xs font-medium text-slate-700 dark:text-slate-300">{token.collectionCenterName || 'Main Lab'}</span>
                        </div>
                      </td>
                      <td className="px-4 py-4 text-right">
                        <span className="text-sm font-bold text-slate-800 dark:text-white">
                          Rs {Number(token.net || 0).toLocaleString()}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-right">
                        <span className="text-sm font-bold text-blue-600 dark:text-blue-400">
                          Rs {Number(token.centerCommissionAmount || 0).toLocaleString()}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-right">
                        <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400">
                          Rs {Number(token.centerNetAmount || 0).toLocaleString()}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {/* Total Row - only show on last page or when showing all */}
                  {(limit === 'all' || page >= totalPages) && (
                    <tr className="bg-slate-900 text-white font-black border-t-2">
                      <td className="px-4 py-5 text-center text-lg" colSpan={5}>GRAND TOTAL ({total} tokens)</td>
                      <td className="px-4 py-5 text-right text-lg text-emerald-400">
                        Rs {tokensData.reduce((sum, t) => sum + (t.net || 0), 0).toLocaleString()}
                      </td>
                      <td className="px-4 py-5 text-right text-lg text-blue-400">
                        Rs {tokensData.reduce((sum, t) => sum + (t.centerCommissionAmount || 0), 0).toLocaleString()}
                      </td>
                      <td className="px-4 py-5 text-right text-lg text-indigo-400">
                        Rs {tokensData.reduce((sum, t) => sum + (t.centerNetAmount || 0), 0).toLocaleString()}
                      </td>
                    </tr>
                  )}
                </>
              )}
            </tbody>
          </table>
        </div>
        
        {/* Pagination */}
        {limit !== 'all' && totalPages > 1 && (
          <div className="flex items-center justify-between px-6 py-4 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50">
            <div className="text-sm text-slate-600 dark:text-slate-400">
              Showing <span className="font-semibold">{((page - 1) * (limit as number)) + 1}</span> to <span className="font-semibold">{Math.min(page * (limit as number), total)}</span> of <span className="font-semibold">{total}</span> tokens
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-3 py-1.5 text-sm font-medium text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Previous
              </button>
              <span className="px-3 py-1.5 text-sm font-medium text-slate-700 dark:text-slate-300">
                Page {page} of {totalPages}
              </span>
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="px-3 py-1.5 text-sm font-medium text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Next
              </button>
            </div>
          </div>
        )}
        {limit === 'all' && total > 0 && (
          <div className="flex items-center justify-center px-6 py-4 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50">
            <div className="text-sm text-slate-600 dark:text-slate-400">
              Showing all <span className="font-semibold">{total}</span> tokens
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
