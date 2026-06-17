type Row = {
  id: string
  name: string
  category: string
  unit: string
  currentStock: number
  minStock: number
  avgCost: number
  earliestExpiry?: string
  lastPurchase?: string
  lastSupplier?: string
  draftId?: string
  invoiceNo?: string
  quantity?: number
  purchaseCost?: number
  mrp?: number
  expiry?: string
  batchNo?: string
  supplierName?: string
  date?: string
}

// Helper to determine item status for display
function getItemStatus(r: Row): string {
  const currentStock = Number(r.currentStock) || 0
  const minStock = Number(r.minStock) || 0
  
  // Out of stock: currentStock is 0
  if (currentStock === 0) return 'Out of Stock'
  
  // Expired: expiry date is in the past
  const expiryStr = String(r.earliestExpiry || '').slice(0, 10)
  if (expiryStr && expiryStr !== '-') {
    try {
      const expiryDate = new Date(expiryStr)
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      if (expiryDate < today) return 'Expired'
    } catch {}
  }
  
  // Expiring soon: expiry within 30 days
  if (expiryStr && expiryStr !== '-') {
    try {
      const expiryDate = new Date(expiryStr)
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      const thirtyDaysFromNow = new Date(today)
      thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30)
      if (expiryDate <= thirtyDaysFromNow && expiryDate >= today) {
        return 'Expiring Soon'
      }
    } catch {}
  }
  
  // Low stock: currentStock <= minStock
  if (minStock > 0 && currentStock <= minStock) return 'Low Stock'
  
  // In stock
  return 'In Stock'
}

// Helper to get status badge color
function getStatusColor(status: string): string {
  switch (status) {
    case 'Out of Stock':
      return 'bg-rose-100 text-rose-700 border-rose-200'
    case 'Low Stock':
      return 'bg-amber-100 text-amber-700 border-amber-200'
    case 'Expired':
      return 'bg-red-100 text-red-700 border-red-200'
    case 'Expiring Soon':
      return 'bg-orange-100 text-orange-700 border-orange-200'
    case 'In Stock':
    default:
      return 'bg-emerald-100 text-emerald-700 border-emerald-200'
  }
}


type Props = {
  rows?: Row[]
  pending?: boolean
  onEdit?: (id: string) => void
  onEditDraft?: (id: string) => void
  onDelete?: (id: string) => void
  onApprove?: (id: string) => void
  onReject?: (id: string) => void
  page?: number
  totalPages?: number
  total?: number
  limit?: number
  onChangeLimit?: (n: number) => void
  onPrev?: () => void
  onNext?: () => void
}

export default function Store_InventoryTable({ 
  rows = [], 
  pending,
  onEdit, 
  onEditDraft,
  onDelete,
  onApprove,
  onReject,
  page, 
  totalPages, 
  total,
  limit, 
  onChangeLimit, 
  onPrev, 
  onNext 
}: Props) {
  const hasRows = rows.length > 0

  const headers = pending
    ? ['Sr. No.', 'Invoice #', 'Item Name', 'Category', 'Qty', 'Unit', 'Unit Cost', 'Min Stock', 'Expiry', 'Supplier', 'Actions']
    : [
      'Sr. No.',
      'Item Name',
      'Category',
      'Unit',
      'Current Stock',
      'Min Stock',
      'Unit Cost',
      'Earliest Expiry',
      'Last Purchase',
      'Last Supplier',
      'Status',
      'Actions',
    ]

  const formatCurrency = (n: number) => 
    new Intl.NumberFormat('en-PK', { style: 'currency', currency: 'PKR', maximumFractionDigits: 0 }).format(n)

  const formatDate = (d?: string) => {
    if (!d) return '-'
    try {
      return new Date(d).toISOString().slice(0, 10)
    } catch {
      return String(d).slice(0, 10)
    }
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white">
      <div className="overflow-x-auto">
        <table className="min-w-full text-left text-sm table-fixed">
          <thead className="bg-slate-100/50 text-slate-700 border-b-2 border-slate-300">
            <tr>
              {pending ? (
                <>
                  <th className="w-[60px] px-4 py-3 text-[13px] font-extrabold uppercase tracking-wider">Sr. No.</th>
                  <th className="w-[120px] px-4 py-3 text-[13px] font-extrabold uppercase tracking-wider">Invoice #</th>
                  <th className="w-[200px] px-4 py-3 text-[13px] font-extrabold uppercase tracking-wider">Item Name</th>
                  <th className="w-[120px] px-4 py-3 text-[13px] font-extrabold uppercase tracking-wider">Category</th>
                  <th className="w-[80px] px-4 py-3 text-[13px] font-extrabold uppercase tracking-wider text-center">Qty</th>
                  <th className="w-[80px] px-4 py-3 text-[13px] font-extrabold uppercase tracking-wider text-center">Unit</th>
                  <th className="w-[110px] px-4 py-3 text-[13px] font-extrabold uppercase tracking-wider text-center">Unit Cost</th>
                  <th className="w-[100px] px-4 py-3 text-[13px] font-extrabold uppercase tracking-wider text-center">Min Stk</th>
                  <th className="w-[110px] px-4 py-3 text-[13px] font-extrabold uppercase tracking-wider">Expiry</th>
                  <th className="w-[150px] px-4 py-3 text-[13px] font-extrabold uppercase tracking-wider">Supplier</th>
                  <th className="w-[180px] px-4 py-3 text-[13px] font-extrabold uppercase tracking-wider">Actions</th>
                </>
              ) : (
                <>
                  <th className="w-[60px] px-4 py-3 text-[13px] font-extrabold uppercase tracking-wider">Sr. No.</th>
                  <th className="w-[200px] px-4 py-3 text-[13px] font-extrabold uppercase tracking-wider">Item Name</th>
                  <th className="w-[120px] px-4 py-3 text-[13px] font-extrabold uppercase tracking-wider">Category</th>
                  <th className="w-[80px] px-4 py-3 text-[13px] font-extrabold uppercase tracking-wider text-center">Unit</th>
                  <th className="w-[90px] px-4 py-3 text-[13px] font-extrabold uppercase tracking-wider text-center">Stock</th>
                  <th className="w-[90px] px-4 py-3 text-[13px] font-extrabold uppercase tracking-wider text-center">Min Stk</th>
                  <th className="w-[110px] px-4 py-3 text-[13px] font-extrabold uppercase tracking-wider text-center">Unit Cost</th>
                  <th className="w-[110px] px-4 py-3 text-[13px] font-extrabold uppercase tracking-wider">Expiry</th>
                  <th className="w-[110px] px-4 py-3 text-[13px] font-extrabold uppercase tracking-wider">Purchase</th>
                  <th className="w-[150px] px-4 py-3 text-[13px] font-extrabold uppercase tracking-wider">Supplier</th>
                  <th className="w-[120px] px-4 py-3 text-[13px] font-extrabold uppercase tracking-wider">Status</th>
                  <th className="w-[140px] px-4 py-3 text-[13px] font-extrabold uppercase tracking-wider">Actions</th>
                </>
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 text-slate-700">
            {!hasRows && (
              <tr>
                <td colSpan={headers.length} className="px-4 py-12 text-center text-slate-500">
                  No inventory items
                </td>
              </tr>
            )}
            {hasRows && rows.map((r, idx) => (
              <tr key={r.id || r.draftId} className={pending ? 'bg-sky-50 hover:bg-sky-100' : 'hover:bg-slate-50'}>
                {pending ? (
                  <>
                    <td className="px-4 py-2 font-medium text-slate-500">
                      {idx + 1 + ((page || 1) - 1) * (limit || 20)}
                    </td>
                    <td className="px-4 py-2 font-medium break-words">{r.invoiceNo || '-'}</td>
                    <td className="px-4 py-2 font-medium break-words text-slate-900">{r.name}</td>
                    <td className="px-4 py-2 break-words">{r.category || '-'}</td>
                    <td className="px-4 py-2 text-center">{r.quantity || 0}</td>
                    <td className="px-4 py-2 text-center">{r.unit}</td>
                    <td className="px-4 py-2 text-center">{formatCurrency(r.purchaseCost || 0)}</td>
                    <td className="px-4 py-2 text-center">{r.minStock ?? '-'}</td>
                    <td className="px-4 py-2 whitespace-nowrap">{formatDate(r.expiry)}</td>
                    <td className="px-4 py-2 break-words">{r.supplierName || '-'}</td>
                    <td className="px-4 py-2">
                      <div className="flex gap-2">
                        <button 
                          onClick={() => onEditDraft?.(r.draftId || '')} 
                          className="rounded-md bg-blue-600 px-2 py-1 text-xs font-medium text-white hover:bg-blue-700 shadow-sm"
                        >
                          Edit
                        </button>
                        <button 
                          onClick={() => onApprove?.(r.draftId || '')} 
                          className="rounded-md bg-emerald-600 px-2 py-1 text-xs font-medium text-white hover:bg-emerald-700 shadow-sm"
                        >
                          Approve
                        </button>
                        <button 
                          onClick={() => onReject?.(r.draftId || '')} 
                          className="rounded-md bg-rose-600 px-2 py-1 text-xs font-medium text-white hover:bg-rose-700 shadow-sm"
                        >
                          Reject
                        </button>
                      </div>
                    </td>
                  </>
                ) : (
                  <>
                    <td className="px-4 py-2 font-medium text-slate-500">
                      {idx + 1 + ((page || 1) - 1) * (limit || 20)}
                    </td>
                    <td className="px-4 py-2 font-medium break-words text-slate-900">{r.name}</td>
                    <td className="px-4 py-2 break-words">{r.category || '-'}</td>
                    <td className="px-4 py-2 text-center">{r.unit}</td>
                    <td className="px-4 py-2 text-center">{r.currentStock}</td>
                    <td className="px-4 py-2 text-center">{r.minStock ?? '-'}</td>
                    <td className="px-4 py-2 text-center">{formatCurrency(r.avgCost)}</td>
                    <td className="px-4 py-2 whitespace-nowrap">{formatDate(r.earliestExpiry)}</td>
                    <td className="px-4 py-2 whitespace-nowrap">{formatDate(r.lastPurchase)}</td>
                    <td className="px-4 py-2 break-words">{r.lastSupplier || '-'}</td>
                    <td className="px-4 py-2">
                      <span className={`inline-block px-2 py-1 text-xs font-medium rounded-full border ${getStatusColor(getItemStatus(r))}`}>
                        {getItemStatus(r)}
                      </span>
                    </td>
                    <td className="px-4 py-2">
                      <div className="flex gap-2">
                        <button 
                          onClick={() => onEdit?.(r.id)} 
                          className="rounded-md bg-blue-600 px-2 py-1 text-xs font-medium text-white hover:bg-blue-700 shadow-sm"
                        >
                          Edit
                        </button>
                        <button 
                          onClick={() => onDelete?.(r.id)} 
                          className="rounded-md bg-rose-600 px-2 py-1 text-xs font-medium text-white hover:bg-rose-700 shadow-sm"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {(page != null && totalPages != null) && (
        <div className="flex items-center justify-between border-t border-slate-200 px-4 py-3 text-sm text-slate-600">
          <div>
            {total != null ? `${total} items — ` : ''}Page {page} of {totalPages}
          </div>
          <div className="flex items-center gap-2">
            {onChangeLimit && (
              <select
                className="rounded-md border border-slate-300 px-2 py-1 text-sm text-slate-700"
                value={(limit ?? 20)}
                onChange={e => onChangeLimit?.(parseInt(e.target.value))}
              >
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
                <option value={1000000}>All</option>
              </select>
            )}
            <button 
              onClick={onPrev} 
              disabled={!onPrev || (page <= 1)} 
              className="rounded-md border border-slate-200 px-2 py-1 disabled:opacity-50"
            >
              Prev
            </button>
            <button 
              onClick={onNext} 
              disabled={!onNext || (page >= totalPages)} 
              className="rounded-md border border-slate-200 px-2 py-1 disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
