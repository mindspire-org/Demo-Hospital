import { FileText, Truck, Building2, Calendar, Package, Phone, CheckCircle, Clock, Send, XCircle, Pencil, Trash2, RotateCcw, ChevronDown, MessageSquare, Printer } from 'lucide-react'
import type { PurchaseOrder } from './pharmacy_CreatePurchaseOrderDialog'

type Props = {
  order: PurchaseOrder & { _id?: string; createdAt?: string; updatedAt?: string }
  onViewPDF: (order: PurchaseOrder) => void
  onPrintThermal?: (order: PurchaseOrder) => void
  onEdit?: (order: PurchaseOrder) => void
  onDelete?: (order: PurchaseOrder) => void
  onStatusChange?: (order: PurchaseOrder, status: PurchaseOrder['status']) => void
}

const statusConfig: Record<string, { label: string; color: string; bgColor: string; icon: any }> = {
  draft: { label: 'Draft', color: 'text-slate-600', bgColor: 'bg-slate-100', icon: FileText },
  sent: { label: 'Sent', color: 'text-blue-600', bgColor: 'bg-blue-100', icon: Send },
  confirmed: { label: 'Confirmed', color: 'text-emerald-600', bgColor: 'bg-emerald-100', icon: CheckCircle },
  partially_received: { label: 'Partially Received', color: 'text-amber-600', bgColor: 'bg-amber-100', icon: RotateCcw },
  received: { label: 'Received', color: 'text-emerald-600', bgColor: 'bg-emerald-100', icon: CheckCircle },
  cancelled: { label: 'Cancelled', color: 'text-rose-600', bgColor: 'bg-rose-100', icon: XCircle },
}

const statusOptions = [
  { value: 'draft', label: 'Draft' },
  { value: 'sent', label: 'Sent' },
  { value: 'confirmed', label: 'Confirmed' },
  { value: 'received', label: 'Received' },
  { value: 'cancelled', label: 'Cancelled' },
]

export default function Pharmacy_PurchaseOrderCard({ 
  order, 
  onViewPDF, 
  onPrintThermal,
  onEdit,
  onDelete,
  onStatusChange,
}: Props) {
  const currentStatus = statusConfig[order.status || 'draft']
  const StatusIcon = currentStatus.icon
  const itemCount = order.items?.length || 0
  
  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '-'
    const date = new Date(dateStr)
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
  }

  const handleWhatsApp = () => {
    let phone = order.contactPhone || ''
    // Clean phone number
    phone = phone.replace(/\D/g, '')
    
    // Auto-fix for common Pakistan numbers starting with 0
    if (phone.startsWith('0') && phone.length === 11) {
      phone = '92' + phone.substring(1)
    }

    const itemsCount = order.items?.length || 0
    const itemsList = order.items?.map((item, index) => {
      const generic = item.genericName ? ` (${item.genericName})` : ''
      return `${index + 1}. *${item.name.trim()}*${generic}\n   Quantity: ${item.quantity} ${item.unit}`
    }).join('\n\n') || ''
    
    let message = `*OFFICIAL PURCHASE ORDER*\n` +
      `*PO Number:* ${order.poNumber || 'New Order'}\n` +
      `*Order Date:* ${formatDate(order.date)}\n` +
      `*Expected Delivery:* ${formatDate(order.expectedDeliveryDate)}\n\n` +
      `Hello ${order.supplierName || 'Supplier'},\n\n` +
      `Please find the details of our purchase order below:\n\n` +
      `*ORDER SUMMARY:*\n` +
      `- Total Unique Items: ${itemsCount}\n` +
      `- Total Amount: PKR ${order.total?.toFixed(2) || '0.00'}\n\n` +
      `*DETAILED LIST:*\n${itemsList}\n\n` +
      `Please confirm receipt of this order and let us know the expected delivery time.\n\n` +
      `Thank you.`

    // Safety check for extremely long lists (to avoid URL length issues)
    if (message.length > 4000) {
      const truncatedList = order.items?.slice(0, 20).map((item, index) => {
        return `${index + 1}. *${item.name.trim()}* (Qty: ${item.quantity})`
      }).join('\n') || ''
      
      message = `*OFFICIAL PURCHASE ORDER*\n` +
        `*PO Number:* ${order.poNumber || 'New Order'}\n` +
        `*Order Date:* ${formatDate(order.date)}\n\n` +
        `Hello ${order.supplierName || 'Supplier'},\n\n` +
        `We have a large order for you with *${itemsCount} items* (Total: PKR ${order.total?.toFixed(2)}).\n\n` +
        `*First 20 Items:*\n${truncatedList}\n\n` +
        `...and ${itemsCount - 20} more items.\n\n` +
        `*Please check the official PDF for the full list.*`
    }

    const encodedMessage = encodeURIComponent(message)
    const url = phone ? `https://wa.me/${phone}?text=${encodedMessage}` : `https://wa.me/?text=${encodedMessage}`
    window.open(url, '_blank')
  }

  const handleStatusSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newStatus = e.target.value as PurchaseOrder['status']
    if (newStatus && newStatus !== order.status && onStatusChange) {
      onStatusChange(order, newStatus)
    }
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white shadow-sm hover:shadow-md transition-shadow overflow-hidden">
      {/* Header */}
      <div className="border-b border-slate-100 px-4 py-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-base font-semibold text-slate-800 truncate">
                {order.poNumber || 'Draft PO'}
              </h3>
              <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${currentStatus.bgColor} ${currentStatus.color}`}>
                <StatusIcon className="h-3.5 w-3.5" />
                {currentStatus.label}
              </span>
            </div>
            <p className="mt-0.5 text-xs text-slate-500">
              Created {formatDate(order.createdAt || order.date)}
            </p>
          </div>
          
          <div className="flex items-center gap-1">
            {onEdit && (
              <button
                onClick={() => onEdit(order)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-blue-600 transition-colors"
                title="Edit"
              >
                <Pencil className="h-4 w-4" />
              </button>
            )}
            {onDelete && (
              <button
                onClick={() => onDelete(order)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition-colors"
                title="Delete"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="p-4 space-y-4">
        {/* Supplier & Company */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="flex items-start gap-2">
            <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-blue-50">
              <Truck className="h-3.5 w-3.5 text-blue-600" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-medium text-slate-500">Supplier</p>
              <p className="text-sm font-medium text-slate-800 truncate">{order.supplierName || order.supplierCustom || '-'}</p>
              {order.contactPhone && (
                <p className="text-xs text-slate-500 flex items-center gap-1">
                  <Phone className="h-3 w-3" />
                  {order.contactPhone}
                </p>
              )}
            </div>
          </div>

          {order.companyName && (
            <div className="flex items-start gap-2">
              <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-purple-50">
                <Building2 className="h-3.5 w-3.5 text-purple-600" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-medium text-slate-500">Company</p>
                <p className="text-sm font-medium text-slate-800 truncate">{order.companyName}</p>
              </div>
            </div>
          )}
        </div>

        {/* Dates */}
        <div className="flex flex-wrap gap-4 text-xs text-slate-600">
          <div className="flex items-center gap-1.5">
            <Calendar className="h-3.5 w-3.5 text-slate-400" />
            <span>Order: {formatDate(order.date)}</span>
          </div>
          {order.expectedDeliveryDate && (
            <div className="flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5 text-slate-400" />
              <span>Delivery: {formatDate(order.expectedDeliveryDate)}</span>
            </div>
          )}
        </div>

        {/* Items Summary */}
        <div className="rounded-lg bg-slate-50 border border-slate-100 p-3">
          <div className="flex items-center gap-2 mb-2">
            <Package className="h-4 w-4 text-slate-500" />
            <span className="text-sm font-medium text-slate-700">{itemCount} Item{itemCount !== 1 ? 's' : ''}</span>
          </div>
          <div className="space-y-1 max-h-20 overflow-y-auto">
            {order.items?.slice(0, 3).map((item, idx) => (
              <div key={idx} className="flex items-center justify-between text-xs">
                <span className="text-slate-600 truncate flex-1">{item.name}</span>
                <span className="text-slate-500 ml-2">x{item.quantity} {item.unit}</span>
              </div>
            ))}
            {itemCount > 3 && (
              <p className="text-xs text-slate-400 italic">+{itemCount - 3} more items...</p>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100">
          <button
            onClick={() => onViewPDF(order)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-blue-200 bg-blue-50 px-3 py-1.5 text-sm font-medium text-blue-700 hover:bg-blue-100 transition-colors"
          >
            <FileText className="h-3.5 w-3.5" />
            PDF
          </button>

          {onPrintThermal && (
            <button
              onClick={() => onPrintThermal(order)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-100 transition-colors"
            >
              <Printer className="h-3.5 w-3.5" />
              Thermal
            </button>
          )}
          
          <button
            onClick={handleWhatsApp}
            className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-sm font-medium text-emerald-700 hover:bg-emerald-100 transition-colors"
          >
            <MessageSquare className="h-3.5 w-3.5" />
            WhatsApp
          </button>
          
          {/* Status Dropdown */}
          {onStatusChange && (
            <div className="relative ml-auto">
              <select
                value={order.status || 'draft'}
                onChange={handleStatusSelect}
                className="appearance-none rounded-lg border border-slate-300 bg-white pl-3 pr-8 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none cursor-pointer"
              >
                {statusOptions.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
