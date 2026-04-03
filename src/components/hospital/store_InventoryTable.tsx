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

// Helper to determine row status for highlighting
function getRowStatus(r: Row): 'outOfStock' | 'lowStock' | 'expiringSoon' | null {
  // Out of stock: currentStock is 0
  const currentStock = Number(r.currentStock) || 0
  if (currentStock === 0) return 'outOfStock'
  
  // Low stock: currentStock <= minStock
  const minStock = Number(r.minStock) || 0
  if (minStock > 0 && currentStock <= minStock) return 'lowStock'
  
  // Expiring soon: expiry within 30 days
  const expiryStr = String(r.earliestExpiry || '').slice(0, 10)
  if (expiryStr && expiryStr !== '-') {
    try {
      const expiryDate = new Date(expiryStr)
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      const thirtyDaysFromNow = new Date(today)
      thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30)
      if (expiryDate <= thirtyDaysFromNow && expiryDate >= today) {
        return 'expiringSoon'
      }
    } catch {}
  }
  
  return null
}

// Helper to get row classes based on status
function getRowClasses(r: Row): string {
  const status = getRowStatus(r)
  switch (status) {
    case 'outOfStock':
      return 'bg-rose-100 hover:bg-rose-200 border-l-4 border-l-rose-600'
    case 'lowStock':
      return 'bg-yellow-200 hover:bg-yellow-300 border-l-4 border-l-yellow-600'
    case 'expiringSoon':
      return 'bg-orange-200 hover:bg-orange-300 border-l-4 border-l-orange-600'
    default:
      return 'hover:bg-slate-50/50'
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
    ? ['Invoice #', 'Item Name', 'Category', 'Qty', 'Unit', 'Cost/Unit', 'Min Stock', 'Expiry', 'Supplier', 'Actions']
    : [
      'Item Name',
      'Category',
      'Unit',
      'Current Stock',
      'Min Stock',
      'Avg Cost',
      'Earliest Expiry',
      'Last Purchase',
      'Last Supplier',
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
        <table className="min-w-full text-left text-sm">
          <thead className="bg-slate-50 text-slate-700">
            <tr>
              {headers.map(h => (
                <th key={h} className="whitespace-nowrap px-4 py-2 font-medium">{h}</th>
              ))}
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
            {hasRows && rows.map((r) => (
              <tr key={r.id || r.draftId} className={pending ? 'bg-sky-50 hover:bg-sky-100' : getRowClasses(r)}>
                {pending ? (
                  <>
                    <td className="px-4 py-2 font-medium">{r.invoiceNo || '-'}</td>
                    <td className="px-4 py-2 font-medium">{r.name}</td>
                    <td className="px-4 py-2">{r.category || '-'}</td>
                    <td className="px-4 py-2">{r.quantity || 0}</td>
                    <td className="px-4 py-2">{r.unit}</td>
                    <td className="px-4 py-2">{formatCurrency(r.purchaseCost || 0)}</td>
                    <td className="px-4 py-2">{r.minStock ?? '-'}</td>
                    <td className="px-4 py-2">{formatDate(r.expiry)}</td>
                    <td className="px-4 py-2">{r.supplierName || '-'}</td>
                    <td className="px-4 py-2">
                      <div className="flex gap-2">
                        <button 
                          onClick={() => onEditDraft?.(r.draftId || '')} 
                          className="rounded-md bg-blue-800 px-2 py-1 text-xs text-white hover:bg-blue-900"
                        >
                          Edit
                        </button>
                        <button 
                          onClick={() => onApprove?.(r.draftId || '')} 
                          className="rounded-md bg-emerald-600 px-2 py-1 text-xs text-white hover:bg-emerald-700"
                        >
                          Approve
                        </button>
                        <button 
                          onClick={() => onReject?.(r.draftId || '')} 
                          className="rounded-md bg-rose-600 px-2 py-1 text-xs text-white hover:bg-rose-700"
                        >
                          Reject
                        </button>
                      </div>
                    </td>
                  </>
                ) : (
                  <>
                    <td className="px-4 py-2 font-medium">{r.name}</td>
                    <td className="px-4 py-2">{r.category || '-'}</td>
                    <td className="px-4 py-2">{r.unit}</td>
                    <td className="px-4 py-2">{r.currentStock}</td>
                    <td className="px-4 py-2">{r.minStock ?? '-'}</td>
                    <td className="px-4 py-2">{formatCurrency(r.avgCost)}</td>
                    <td className="px-4 py-2">{formatDate(r.earliestExpiry)}</td>
                    <td className="px-4 py-2">{formatDate(r.lastPurchase)}</td>
                    <td className="px-4 py-2">{r.lastSupplier || '-'}</td>
                    <td className="px-4 py-2">
                      <div className="flex gap-2">
                        <button 
                          onClick={() => onEdit?.(r.id)} 
                          className="rounded-md bg-blue-800 px-2 py-1 text-xs text-white hover:bg-blue-900"
                        >
                          Edit
                        </button>
                        <button 
                          onClick={() => onDelete?.(r.id)} 
                          className="rounded-md bg-rose-600 px-2 py-1 text-xs text-white hover:bg-rose-700"
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
