import { useEffect, useState } from 'react'
import { hospitalApi } from '../../utils/api'
import { getLocalDate } from '../../utils/date'
import { useHospitalSettings } from '../../components/hospital/store_IssueSlip'

type ReportType = 'stock' | 'department-usage' | 'expiry' | 'consumption' | 'supplier-purchases'

interface PaginationInfo {
  page: number
  limit: number
  total: number
  totalPages: number
}

export default function Store_Reports() {
  const settings = useHospitalSettings()
  const [activeReport, setActiveReport] = useState<ReportType>('stock')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [search, setSearch] = useState('')
  const [data, setData] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  
  // Pagination state
  const [pagination, setPagination] = useState<PaginationInfo | null>(null)
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(20)

  const reportConfig: Record<ReportType, { title: string; description: string }> = {
    stock: { title: 'Current Stock Report', description: 'Complete inventory with stock levels and values' },
    'department-usage': { title: 'Department Usage Report', description: 'Items issued to each department' },
    expiry: { title: 'Expiry Report', description: 'Items nearing expiry or already expired' },
    consumption: { title: 'Monthly Consumption Report', description: 'Item consumption trends over time' },
    'supplier-purchases': { title: 'Supplier Purchase Report', description: 'Purchases grouped by supplier' },
  }

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      try {
        // Apply pagination for all reports
        const params: any = { from, to, page, limit, search }
        
        const res = await hospitalApi.getStoreReport(activeReport, params) as any
        if (!cancelled) {
          setData(res.data || res.items || res || [])
          // Set pagination for all reports
          if (res.pagination) {
            setPagination(res.pagination)
          } else {
            setPagination(null)
          }
        }
      } catch {
        // API not ready - show empty state
        if (!cancelled) {
          setData([])
          setPagination(null)
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [activeReport, from, to, page, limit, search])

  const formatCurrency = (n: number) => new Intl.NumberFormat('en-PK', { style: 'currency', currency: 'PKR', maximumFractionDigits: 0 }).format(n)

  const handlePrint = () => {
    const reportTitle = reportConfig[activeReport].title
    const reportDesc = reportConfig[activeReport].description
    const headers = data.length > 0 ? ['Sr. No.', ...Object.keys(data[0])] : []
    
    const escapeHtml = (v: any) =>
      String(v ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;')

    const logo = settings?.logoDataUrl || ''
    const hospitalName = settings?.name || 'Hospital'
    const address = settings?.address || ''
    const phone = settings?.phone || ''

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>${escapeHtml(reportTitle)}</title>
        <style>
          body { font-family: Arial, sans-serif; color: #111827; margin: 0; padding: 0; }
          .page { width: 210mm; min-height: 297mm; padding: 14mm; box-sizing: border-box; }
          .header { display: flex; justify-content: space-between; align-items: flex-start; gap: 16px; border-bottom: 2px solid #e2e8f0; padding-bottom: 20px; margin-bottom: 20px; }
          .brand { display: flex; gap: 12px; align-items: center; }
          .brand img { height: 56px; width: 56px; object-fit: contain; }
          .brand h1 { margin: 0; font-size: 20px; letter-spacing: 0.2px; }
          .brand .muted { color: #475569; font-size: 12px; margin-top: 2px; }
          .docTitle { text-align: right; }
          .docTitle .label { font-size: 12px; color: #64748b; text-transform: uppercase; letter-spacing: 0.08em; }
          .docTitle .value { font-size: 18px; font-weight: 700; margin-top: 6px; }

          table { width: 100%; border-collapse: collapse; margin-top: 18px; }
          thead th { background: #f1f5f9; color: #475569; font-size: 12px; text-transform: uppercase; letter-spacing: 0.06em; text-align: left; padding: 10px; border-bottom: 2px solid #e2e8f0; }
          tbody td { padding: 10px; border-bottom: 1px solid #e2e8f0; font-size: 13px; }
          td.num, th.num { text-align: right; font-variant-numeric: tabular-nums; }
          
          @media print {
            @page { size: A4; margin: 0; }
            html, body { -webkit-print-color-adjust: exact; print-color-adjust: exact; background: #fff !important; color: #000 !important; }
            .page, .page * { color: #000 !important; background: transparent !important; background-color: transparent !important; border-color: #000 !important; }
          }
        </style>
      </head>
      <body>
        <div class="page">
          <div class="header">
            <div class="brand">
              ${logo ? `<img src="${escapeHtml(logo)}" alt="Logo" />` : ''}
              <div>
                <h1>${escapeHtml(hospitalName)}</h1>
                ${address ? `<div class="muted">${escapeHtml(address)}</div>` : ''}
                ${phone ? `<div class="muted">Phone: ${escapeHtml(phone)}</div>` : ''}
              </div>
            </div>
            <div class="docTitle">
              <div class="label">${escapeHtml(reportTitle)}</div>
              <div class="value">Report</div>
            </div>
          </div>

          <div style="margin-bottom: 20px; font-size: 13px; color: #475569;">
            <p style="margin: 4px 0;">${escapeHtml(reportDesc)}</p>
            <p style="margin: 4px 0;">Generated on: <strong>${new Date().toLocaleString()}</strong></p>
            ${from || to ? `<p style="margin: 4px 0;">Period: <strong>${from || 'Start'}</strong> to <strong>${to || 'End'}</strong></p>` : ''}
          </div>

          <table>
            <thead>
              <tr>
                ${headers.map(h => `<th>${escapeHtml(h.replace(/([A-Z])/g, ' $1').replace(/_/g, ' '))}</th>`).join('')}
              </tr>
            </thead>
            <tbody>
              ${data.map((row, idx) => `
                <tr>
                  ${headers.map(h => {
                    if (h === 'Sr. No.') {
                      return `<td>${idx + 1 + (pagination ? (pagination.page - 1) * pagination.limit : 0)}</td>`
                    }
                    const val = row[h]
                    const isCurrency = typeof val === 'number' && (h.toLowerCase().includes('value') || h.toLowerCase().includes('paid') || h.toLowerCase().includes('outstanding'))
                    return `<td class="${isCurrency ? 'num' : ''}">${isCurrency ? formatCurrency(val) : escapeHtml(val)}</td>`
                  }).join('')}
                </tr>
              `).join('')}
            </tbody>
          </table>
          
          <div style="margin-top: 40px; border-top: 1px solid #e2e8f0; padding-top: 10px; text-align: center; font-size: 11px; color: #64748b;">
            This is a computer generated report.
          </div>
        </div>
      </body>
      </html>
    `

    try {
      const api = (window as any).electronAPI
      if (api && typeof api.printPreviewHtml === 'function') {
        api.printPreviewHtml(html)
        return
      }
    } catch {}

    // Browser fallback: Use a hidden iframe instead of a new tab
    const frame = document.createElement('iframe')
    frame.style.position = 'fixed'
    frame.style.right = '0'
    frame.style.bottom = '0'
    frame.style.width = '0'
    frame.style.height = '0'
    frame.style.border = '0'
    document.body.appendChild(frame)
    const doc = frame.contentWindow?.document || frame.contentDocument
    if (!doc) return
    doc.open()
    doc.write(html)
    doc.close()
    frame.onload = () => {
      try {
        frame.contentWindow?.focus()
        frame.contentWindow?.print()
      } catch {}
      setTimeout(() => {
        try { document.body.removeChild(frame) } catch {}
      }, 500)
    }
  }

  const exportCSV = () => {
    if (data.length === 0) return
    const originalHeaders = Object.keys(data[0])
    const headers = ['Sr. No.', ...originalHeaders]
    const lines = [headers.join(',')]
    for (let i = 0; i < data.length; i++) {
      const row = data[i]
      const srNo = i + 1 + (pagination ? (pagination.page - 1) * pagination.limit : 0)
      const rowData = [srNo, ...originalHeaders.map(h => row[h])]
      lines.push(rowData.join(','))
    }
    const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${activeReport}-report-${getLocalDate()}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const renderTable = () => {
    if (loading) return <div className="py-8 text-center text-slate-500">Loading...</div>
    if (data.length === 0) return <div className="py-8 text-center text-slate-500">No data available</div>

    const originalHeaders = Object.keys(data[0])
    const headers = ['Sr. No.', ...originalHeaders]

    return (
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b-2 border-slate-300 text-left">
              {headers.map(h => (
                <th key={h} className="px-3 py-3 text-sm font-bold text-slate-900 uppercase tracking-wider">
                  {h.replace(/([A-Z])/g, ' $1').replace(/_/g, ' ')}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map((row, idx) => (
              <tr key={idx} className="border-b border-slate-100 hover:bg-slate-50">
                {headers.map(h => {
                  if (h === 'Sr. No.') {
                    return (
                      <td key={h} className="px-3 py-2 font-medium text-slate-500">
                        {idx + 1 + (pagination ? (pagination.page - 1) * pagination.limit : 0)}
                      </td>
                    )
                  }
                  return (
                    <td key={h} className="px-3 py-2">
                      {typeof row[h] === 'number' && (h.includes('value') || h.includes('Value') || h.includes('Cost') || h.includes('cost') || h.includes('paid') || h.includes('outstanding'))
                        ? formatCurrency(row[h])
                        : h === 'status'
                          ? <span className={`inline-block px-2 py-1 text-xs font-medium rounded-full border ${
                              row[h] === 'Out of Stock' ? 'bg-rose-100 text-rose-700 border-rose-200'
                              : row[h] === 'Low Stock' ? 'bg-amber-100 text-amber-700 border-amber-200'
                              : row[h] === 'Expired' ? 'bg-red-100 text-red-700 border-red-200'
                              : row[h] === 'Expiring Soon' ? 'bg-orange-100 text-orange-700 border-orange-200'
                              : 'bg-emerald-100 text-emerald-700 border-emerald-200'
                            }`}>{row[h]}</span>
                          : row[h]}
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )
  }

  const renderPagination = () => {
    if (!pagination) return null

    const { page: currentPage, limit: currentLimit, total, totalPages } = pagination
    const startItem = (currentPage - 1) * currentLimit + 1
    const endItem = Math.min(currentPage * currentLimit, total)

    return (
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 pt-4 print:hidden">
        <div className="text-sm text-slate-600">
          Showing <span className="font-medium">{startItem}</span> to <span className="font-medium">{endItem}</span> of <span className="font-medium">{total}</span> items
        </div>
        
        <div className="flex items-center gap-2">
          {/* Page size selector */}
          <select
            value={currentLimit}
            onChange={(e) => {
              setLimit(Number(e.target.value))
              setPage(1)
            }}
            className="rounded-md border border-slate-300 px-2 py-1 text-sm"
          >
            <option value={10}>10 / page</option>
            <option value={20}>20 / page</option>
            <option value={50}>50 / page</option>
            <option value={100}>100 / page</option>
            <option value={1000000}>All</option>
          </select>

          {/* Pagination controls */}
          <div className="flex items-center gap-1">
            <button
              onClick={() => setPage(1)}
              disabled={currentPage === 1}
              className="rounded-md border border-slate-300 px-2 py-1 text-sm hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
              title="First page"
            >
              {'<<'}
            </button>
            <button
              onClick={() => setPage(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1}
              className="rounded-md border border-slate-300 px-2 py-1 text-sm hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
              title="Previous page"
            >
              {'<'}
            </button>
            
            <span className="px-3 py-1 text-sm text-slate-600">
              Page <span className="font-medium">{currentPage}</span> of <span className="font-medium">{totalPages}</span>
            </span>
            
            <button
              onClick={() => setPage(Math.min(totalPages, currentPage + 1))}
              disabled={currentPage === totalPages}
              className="rounded-md border border-slate-300 px-2 py-1 text-sm hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
              title="Next page"
            >
              {'>'}
            </button>
            <button
              onClick={() => setPage(totalPages)}
              disabled={currentPage === totalPages}
              className="rounded-md border border-slate-300 px-2 py-1 text-sm hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
              title="Last page"
            >
              {'>>'}
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 print:p-0">
      <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
        <h2 className="text-xl font-semibold text-slate-800">Reports</h2>
        <div className="flex gap-2">
          <button 
            onClick={handlePrint} 
            className="rounded-md bg-sky-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-sky-700 shadow-sm transition"
          >
            Print
          </button>
          <button 
            onClick={exportCSV} 
            className="rounded-md bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-700 shadow-sm transition"
          >
            Export CSV
          </button>
        </div>
      </div>

      {/* Report Type Tabs */}
      <div className="mt-4 flex flex-wrap gap-2 print:hidden">
        {(Object.entries(reportConfig) as [ReportType, { title: string; description: string }][]).map(([key, config]) => (
          <button
            key={key}
            onClick={() => {
              setActiveReport(key)
              setPage(1) // Reset to first page when switching reports
            }}
            className={`rounded-lg px-6 py-2.5 text-base font-bold transition duration-200 ${
              activeReport === key
                ? 'bg-sky-600 text-white shadow-md ring-2 ring-sky-300'
                : 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 hover:border-slate-300'
            }`}
          >
            {config.title}
          </button>
        ))}
      </div>

      {/* Search and Date Filters */}
      <div className="mt-4 flex flex-wrap gap-3 print:hidden">
        <div className="flex-1 min-w-[200px]">
          <input
            type="text"
            placeholder="Search by item name..."
            value={search}
            onChange={e => {
              setSearch(e.target.value)
              setPage(1) // Reset to first page on search
            }}
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
          />
        </div>
        <div className="flex gap-2">
          <input
            type="date"
            value={from}
            onChange={e => {
              setFrom(e.target.value)
              setPage(1)
            }}
            className="rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm"
          />
          <input
            type="date"
            value={to}
            onChange={e => {
              setTo(e.target.value)
              setPage(1)
            }}
            className="rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm"
          />
          <button
            onClick={() => { 
              setFrom('')
              setTo('')
              setSearch('')
              setPage(1)
            }}
            className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 transition"
          >
            Clear
          </button>
        </div>
      </div>

      {/* Report Content */}
      <div id="report-content" className="mt-6 rounded-xl border border-slate-200 bg-white p-5 shadow-sm print:border-none print:shadow-none">
        <div className="mb-4">
          <h3 className="text-lg font-semibold text-slate-800">{reportConfig[activeReport].title}</h3>
          <p className="text-sm text-slate-500">{reportConfig[activeReport].description}</p>
        </div>
        {renderTable()}
        {renderPagination()}
      </div>
    </div>
  )
}
