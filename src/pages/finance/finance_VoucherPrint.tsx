import { useEffect, useState } from 'react'
import { financeApi } from '../../features/finance/finance.api'
import Toast, { type ToastState } from '../../components/ui/Toast'

type Voucher = {
  _id: string
  voucherNo: string
  voucherType: 'BPV' | 'BRV' | 'CPV' | 'CRV' | 'JV' | 'CONTRA'
  dateIso: string
  payee?: string
  narration?: string
  module?: string
  isExpense?: boolean
  status: 'draft' | 'pending_approval' | 'approved' | 'posted' | 'cancelled'
  totalDebit: number
  totalCredit: number
  lines: Array<{ accountCode: string; accountName: string; debit?: number; credit?: number }>
  printedAt?: string
}

const voucherTypeLabels: Record<string, string> = {
  BPV: 'Bank Payment', BRV: 'Bank Receipt', CPV: 'Cash Payment',
  CRV: 'Cash Receipt', CONTRA: 'Contra', JV: 'Journal',
}

const statusColors: Record<string, string> = {
  draft: 'bg-yellow-100 text-yellow-800',
  pending_approval: 'bg-amber-100 text-amber-800',
  approved: 'bg-blue-100 text-blue-800',
  posted: 'bg-green-100 text-green-800',
  cancelled: 'bg-red-100 text-red-800',
}

export default function Finance_VoucherPrint() {
  const [vouchers, setVouchers] = useState<Voucher[]>([])
  const [loading, setLoading] = useState(false)
  const [toast, setToast] = useState<ToastState>(null)
  const [selected, setSelected] = useState<Set<string>>(new Set())

  // Filters
  const [filterType, setFilterType] = useState('')
  const [filterStatus, setFilterStatus] = useState('posted')
  const [dateFrom, setDateFrom] = useState(new Date().toISOString().slice(0, 10))
  const [dateTo, setDateTo] = useState(new Date().toISOString().slice(0, 10))

  useEffect(() => { loadVouchers() }, [])

  async function loadVouchers() {
    setLoading(true)
    setSelected(new Set())
    try {
      const res: any = await financeApi.listVouchers({
        type: filterType || undefined,
        status: filterStatus || undefined,
        from: dateFrom || undefined,
        to: dateTo || undefined,
        limit: 0,
      })
      setVouchers(res.vouchers || [])
    } catch (e: any) {
      setToast({ type: 'error', message: e?.message || 'Failed to load vouchers' })
    } finally {
      setLoading(false)
    }
  }

  function toggleSelect(id: string) {
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function toggleSelectAll() {
    if (selected.size === vouchers.length) {
      setSelected(new Set())
    } else {
      setSelected(new Set(vouchers.map(v => v._id)))
    }
  }

  async function handlePrintSelected() {
    if (selected.size === 0) {
      setToast({ type: 'error', message: 'Select at least one voucher to print' })
      return
    }

    // Open a new window and compose all selected vouchers into one printable document
    const printWindow = window.open('', '_blank')
    if (!printWindow) {
      setToast({ type: 'error', message: 'Pop-up blocked. Please allow pop-ups for this site.' })
      return
    }

    printWindow.document.write(`<!DOCTYPE html><html><head><title>Voucher Print</title>
      <style>
        body { font-family: Arial, sans-serif; margin: 30px; color: #333; }
        .voucher-page { page-break-after: always; margin-bottom: 40px; padding-bottom: 20px; border-bottom: 2px dashed #ccc; }
        .voucher-page:last-child { border-bottom: none; page-break-after: auto; }
        h2 { color: #1a365d; border-bottom: 2px solid #1a365d; padding-bottom: 6px; margin-top: 0; }
        .meta { display: flex; gap: 30px; margin: 12px 0; flex-wrap: wrap; }
        .meta div { min-width: 150px; }
        table { width: 100%; border-collapse: collapse; margin-top: 12px; }
        th { background: #1a365d; color: #fff; padding: 6px 10px; text-align: left; font-size: 13px; }
        td { padding: 6px 10px; border: 1px solid #ddd; font-size: 13px; }
        .total-row { font-weight: bold; background: #f0f4f8; }
        .footer { margin-top: 30px; display: flex; justify-content: space-between; }
        .signature { text-align: center; min-width: 160px; }
        .signature-line { border-top: 1px solid #333; margin-top: 40px; padding-top: 4px; font-size: 12px; }
        @media print { .voucher-page { page-break-after: always; } .no-print { display: none; } }
      </style>
    </head><body>`)

    for (const id of selected) {
      const v = vouchers.find(x => x._id === id)
      if (!v) continue

      const totalDebit = (v.lines || []).reduce((s, l) => s + (l.debit || 0), 0)
      const totalCredit = (v.lines || []).reduce((s, l) => s + (l.credit || 0), 0)

      const linesHtml = (v.lines || []).map(l => `
        <tr>
          <td>${l.accountCode || ''}</td>
          <td>${l.accountName || ''}</td>
          <td style="text-align:right">${l.debit ? Number(l.debit).toLocaleString() : ''}</td>
          <td style="text-align:right">${l.credit ? Number(l.credit).toLocaleString() : ''}</td>
        </tr>
      `).join('')

      printWindow.document.write(`
        <div class="voucher-page">
          <h2>${voucherTypeLabels[v.voucherType] || v.voucherType} Voucher</h2>
          <div class="meta">
            <div><strong>Voucher No:</strong> ${v.voucherNo}</div>
            <div><strong>Date:</strong> ${v.dateIso}</div>
            <div><strong>Status:</strong> ${v.status.toUpperCase()}</div>
          </div>
          <div class="meta">
            <div><strong>Payee:</strong> ${v.payee || '—'}</div>
            <div><strong>Module:</strong> ${v.module || '—'}</div>
          </div>
          ${v.narration ? `<p style="margin:8px 0"><strong>Narration:</strong> ${v.narration}</p>` : ''}
          <table>
            <thead>
              <tr>
                <th>Account Code</th>
                <th>Account Name</th>
                <th style="text-align:right">Debit</th>
                <th style="text-align:right">Credit</th>
              </tr>
            </thead>
            <tbody>
              ${linesHtml}
              <tr class="total-row">
                <td colspan="2" style="text-align:right"><strong>TOTAL</strong></td>
                <td style="text-align:right"><strong>${totalDebit.toLocaleString()}</strong></td>
                <td style="text-align:right"><strong>${totalCredit.toLocaleString()}</strong></td>
              </tr>
            </tbody>
          </table>
          <div class="footer">
            <div class="signature"><div class="signature-line">Prepared By</div></div>
            <div class="signature"><div class="signature-line">Approved By</div></div>
            <div class="signature"><div class="signature-line">Received By</div></div>
          </div>
        </div>
      `)
    }

    printWindow.document.write(`
      <div class="no-print" style="position:fixed;top:10px;right:10px;z-index:9999">
        <button onclick="window.print()" style="padding:10px 24px;background:#1a365d;color:#fff;border:none;border-radius:6px;font-size:16px;cursor:pointer">Print</button>
        <button onclick="window.close()" style="padding:10px 24px;background:#666;color:#fff;border:none;border-radius:6px;font-size:16px;cursor:pointer;margin-left:8px">Close</button>
      </div>
    </body></html>`)
    printWindow.document.close()
  }

  const allSelected = vouchers.length > 0 && selected.size === vouchers.length

  return (
    <div className="p-6">
      <Toast toast={toast} onClose={() => setToast(null)} />

      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold">Voucher Print</h1>
        <button
          onClick={handlePrintSelected}
          disabled={selected.size === 0}
          className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
        >
          Print {selected.size > 0 ? `${selected.size} Voucher${selected.size > 1 ? 's' : ''}` : 'Selected'}
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <div className="flex flex-wrap gap-4 items-end">
          <div>
            <label className="block text-sm font-medium mb-1">From Date</label>
            <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="px-3 py-2 border rounded-lg" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">To Date</label>
            <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="px-3 py-2 border rounded-lg" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Voucher Type</label>
            <select value={filterType} onChange={e => setFilterType(e.target.value)} className="px-3 py-2 border rounded-lg">
              <option value="">All Types</option>
              <option value="BPV">Bank Payment</option>
              <option value="BRV">Bank Receipt</option>
              <option value="CPV">Cash Payment</option>
              <option value="CRV">Cash Receipt</option>
              <option value="JV">Journal</option>
              <option value="CONTRA">Contra</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Status</label>
            <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="px-3 py-2 border rounded-lg">
              <option value="">All Status</option>
              <option value="draft">Draft</option>
              <option value="pending_approval">Pending Approval</option>
              <option value="approved">Approved</option>
              <option value="posted">Posted</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
          <button onClick={loadVouchers} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
            Load Vouchers
          </button>
        </div>
      </div>

      {/* Selection info */}
      {vouchers.length > 0 && (
        <div className="bg-blue-50 rounded-lg p-3 mb-4 flex items-center justify-between">
          <span className="text-sm text-blue-800">
            {vouchers.length} voucher{vouchers.length !== 1 ? 's' : ''} found · {selected.size} selected
          </span>
          <label className="flex items-center gap-2 text-sm text-blue-800 cursor-pointer">
            <input type="checkbox" checked={allSelected} onChange={toggleSelectAll} className="rounded" />
            Select All
          </label>
        </div>
      )}

      {/* Vouchers Table */}
      <div className="bg-white rounded-lg shadow overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-center w-10">
                <input type="checkbox" checked={allSelected} onChange={toggleSelectAll} className="rounded" />
              </th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Voucher No</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Type</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Date</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Payee</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Narration</th>
              <th className="px-4 py-3 text-right text-sm font-medium text-gray-700">Debit</th>
              <th className="px-4 py-3 text-right text-sm font-medium text-gray-700">Credit</th>
              <th className="px-4 py-3 text-center text-sm font-medium text-gray-700">Status</th>
              <th className="px-4 py-3 text-center text-sm font-medium text-gray-700">Printed</th>
            </tr>
          </thead>
          <tbody>
            {vouchers.map((v) => (
              <tr
                key={v._id}
                className={`border-t ${selected.has(v._id) ? 'bg-indigo-50' : 'hover:bg-gray-50'} cursor-pointer`}
                onClick={() => toggleSelect(v._id)}
              >
                <td className="px-4 py-3 text-center" onClick={e => e.stopPropagation()}>
                  <input type="checkbox" checked={selected.has(v._id)} onChange={() => toggleSelect(v._id)} className="rounded" />
                </td>
                <td className="px-4 py-3 text-sm font-medium">{v.voucherNo}</td>
                <td className="px-4 py-3 text-sm">{voucherTypeLabels[v.voucherType] || v.voucherType}</td>
                <td className="px-4 py-3 text-sm">{v.dateIso}</td>
                <td className="px-4 py-3 text-sm">{v.payee || '—'}</td>
                <td className="px-4 py-3 text-sm text-gray-600 max-w-[200px] truncate">{v.narration || '—'}</td>
                <td className="px-4 py-3 text-sm text-right font-mono">{v.totalDebit.toLocaleString()}</td>
                <td className="px-4 py-3 text-sm text-right font-mono">{v.totalCredit.toLocaleString()}</td>
                <td className="px-4 py-3 text-center">
                  <span className={`px-2 py-1 rounded text-xs ${statusColors[v.status] || 'bg-gray-100 text-gray-800'}`}>{v.status}</span>
                </td>
                <td className="px-4 py-3 text-center text-xs text-gray-500">{v.printedAt ? new Date(v.printedAt).toLocaleDateString() : '—'}</td>
              </tr>
            ))}
            {vouchers.length === 0 && (
              <tr>
                <td colSpan={10} className="px-4 py-8 text-center text-gray-500">
                  {loading ? 'Loading...' : 'No vouchers found. Adjust filters and click Load Vouchers.'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
