import { useEffect, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Search, Filter, RefreshCw, FileText, Package, Trash2, AlertTriangle, MessageCircle, ChevronDown } from 'lucide-react'
import { pharmacyApi } from '../../utils/api'
import Pharmacy_CreatePurchaseOrderDialog, { type PurchaseOrder } from '../../components/pharmacy/pharmacy_CreatePurchaseOrderDialog'
import Pharmacy_PurchaseOrderCard from '../../components/pharmacy/pharmacy_PurchaseOrderCard'
import Pharmacy_PurchaseOrderPDF from '../../components/pharmacy/pharmacy_PurchaseOrderPDF'
import Pharmacy_POReceiptDialog from '../../components/pharmacy/pharmacy_POReceiptDialog'
import { downloadPurchaseOrderPDF } from '../../utils/pharmacy_PDFGenerator'

const statusOptions = [
  { value: '', label: 'All Status' },
  { value: 'draft', label: 'Draft' },
  { value: 'sent', label: 'Sent' },
  { value: 'confirmed', label: 'Confirmed' },
  { value: 'partially_received', label: 'Partially Received' },
  { value: 'received', label: 'Received' },
  { value: 'cancelled', label: 'Cancelled' },
]

export default function Pharmacy_PurchaseOrdersPage() {
  const navigate = useNavigate()
  const [settings, setSettings] = useState<any>(null)
  const [orders, setOrders] = useState<(PurchaseOrder & { _id?: string; createdAt?: string; updatedAt?: string })[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [limit] = useState(12)
  
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [pdfDialogOpen, setPdfDialogOpen] = useState(false)
  const [thermalDialogOpen, setThermalDialogOpen] = useState(false)
  const [selectedOrder, setSelectedOrder] = useState<PurchaseOrder | null>(null)
  const [editingOrder, setEditingOrder] = useState<PurchaseOrder | null>(null)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [orderToDelete, setOrderToDelete] = useState<PurchaseOrder | null>(null)
  const [deleteLoading, setDeleteLoading] = useState(false)

  const [lowStockItems, setLowStockItems] = useState<any[]>([])

  const [suppliers, setSuppliers] = useState<any[]>([])
  const [whatsappModalOpen, setWhatsappModalOpen] = useState(false)
  const [whatsappPhone, setWhatsappPhone] = useState('')

  // Fetch low stock items
  const fetchLowStock = useCallback(async () => {
    try {
      const res: any = await pharmacyApi.listInventoryFiltered({ status: 'low', limit: 50 })
      setLowStockItems(res?.items || [])
    } catch (e) {
      console.error('Failed to load low stock items', e)
    }
  }, [])

  // Fetch suppliers for WhatsApp
  const fetchSuppliers = useCallback(async () => {
    try {
      const res: any = await pharmacyApi.listAllSuppliers()
      setSuppliers(res?.items || res || [])
    } catch (e) {
      console.error('Failed to fetch suppliers', e)
    }
  }, [])

  useEffect(() => {
    fetchLowStock()
    fetchSuppliers()
  }, [fetchLowStock, fetchSuppliers])

  // Load settings
  useEffect(() => {
    pharmacyApi.getSettings().then(s => setSettings(s)).catch(() => setSettings(null))
  }, [])

  // Fetch orders
  const fetchOrders = useCallback(async () => {
    setLoading(true)
    setError('')
    
    try {
      const params: any = { q: searchQuery || undefined, page, limit }
      if (statusFilter) params.status = statusFilter
      const res: any = await pharmacyApi.listPurchaseOrders(params)
      
      const items = res?.items || []
      const total = res?.total || 0
      
      setOrders(items)
      setTotalPages(Math.ceil(total / limit) || 1)
    } catch (e: any) {
      setError(e?.message || 'Failed to load purchase orders')
    } finally {
      setLoading(false)
    }
  }, [searchQuery, statusFilter, page, limit])

  useEffect(() => {
    const onAdd = () => handleCreateNew()
    const onRefresh = () => fetchOrders()

    window.addEventListener('pharmacy:po:add', onAdd)
    window.addEventListener('pharmacy:po:refresh', onRefresh)

    return () => {
      window.removeEventListener('pharmacy:po:add', onAdd)
      window.removeEventListener('pharmacy:po:refresh', onRefresh)
    }
  }, [fetchOrders])

  useEffect(() => {
    fetchOrders()
  }, [fetchOrders])

  // Handle create/update order
  const handleSaveOrder = async (order: PurchaseOrder) => {
    try {
      if (editingOrder && order.id) {
        // Update existing
        await pharmacyApi.updatePurchaseOrder(order.id, order)
      } else {
        // Create new
        await pharmacyApi.createPurchaseOrder(order)
      }
      
      setCreateDialogOpen(false)
      setEditingOrder(null)
      fetchOrders()
    } catch (e: any) {
      alert(e?.message || 'Failed to save purchase order')
    }
  }

  // Handle delete - open confirmation dialog
  const handleDeleteClick = (order: PurchaseOrder) => {
    setOrderToDelete(order)
    setDeleteDialogOpen(true)
  }

  // Confirm delete
  const handleConfirmDelete = async () => {
    if (!orderToDelete?.id) return
    
    setDeleteLoading(true)
    try {
      await pharmacyApi.deletePurchaseOrder(orderToDelete.id)
      fetchOrders()
      setDeleteDialogOpen(false)
      setOrderToDelete(null)
    } catch (e: any) {
      alert(e?.message || 'Failed to delete purchase order')
    } finally {
      setDeleteLoading(false)
    }
  }

  // Cancel delete
  const handleCancelDelete = () => {
    setDeleteDialogOpen(false)
    setOrderToDelete(null)
  }

  // Handle status change
  const handleStatusChange = async (order: PurchaseOrder, status: PurchaseOrder['status']) => {
    try {
      if (!order.id) return
      
      switch (status) {
        case 'sent':
          await pharmacyApi.sendPurchaseOrder(order.id)
          break
        case 'confirmed':
          await pharmacyApi.confirmPurchaseOrder(order.id)
          break
        case 'received':
          await pharmacyApi.receivePurchaseOrder(order.id, false)
          break
        case 'partially_received':
          await pharmacyApi.receivePurchaseOrder(order.id, true)
          break
        case 'cancelled':
          await pharmacyApi.cancelPurchaseOrder(order.id)
          break
      }
      
      fetchOrders()
    } catch (e: any) {
      alert(e?.message || 'Failed to update status')
    }
  }

  // Handle view PDF
  const handleViewPDF = (order: PurchaseOrder) => {
    setSelectedOrder(order)
    // Directly download the PDF using utility
    downloadPurchaseOrderPDF(order, {
      name: settings?.pharmacyName || 'PHARMACY',
      phone: settings?.phone || '',
      address: settings?.address || '',
      logo: settings?.logoDataUrl || '',
    })
    // Optionally also open the dialog if they want to print
    setPdfDialogOpen(true)
  }

  const handlePrintThermal = (order: PurchaseOrder) => {
    setSelectedOrder(order)
    setThermalDialogOpen(true)
  }

  // Handle edit
  const handleEdit = (order: PurchaseOrder) => {
    navigate(`/pharmacy/purchase-orders/edit/${order.id || order._id}`)
  }

  const handleCreateNew = () => {
    navigate('/pharmacy/purchase-orders/create')
  }

  /* 
  const handleCreateFromLowStock = () => {
    if (lowStockItems.length === 0) return
    
    const newOrder: PurchaseOrder = {
      date: new Date().toISOString().split('T')[0],
      items: lowStockItems.map(item => ({
        id: crypto.randomUUID(),
        inventoryItemId: item._id || item.id,
        name: item.name,
        genericName: item.genericName,
        category: item.category,
        quantity: Math.max(1, (item.minStock || 0) - (item.onHand || 0)),
        unit: 'packs',
        estimatedUnitPrice: item.lastSalePerPack || 0,
      })),
      subtotal: 0,
      taxPercent: 0,
      taxAmount: 0,
      shippingCost: 0,
      discount: 0,
      total: 0,
      status: 'draft'
    }
    
    setEditingOrder(newOrder)
    setCreateDialogOpen(true)
  }
  */

  const handleWhatsAppLowStock = () => {
    console.log('WhatsApp Low Stock clicked, count:', lowStockItems.length)
    if (lowStockItems.length === 0) return
    
    let message = `*OFFICIAL PURCHASE ORDER*\n`
    message += `*Pharmacy:* ${settings?.pharmacyName || 'Our Pharmacy'}\n`
    message += `*Date:* ${new Date().toLocaleDateString()}\n\n`
    message += `Dear Supplier,\n\n`
    message += `Please find the list of required medicines below:\n\n`

    lowStockItems.forEach((item, index) => {
      const required = Math.max(1, (item.minStock || 0) - (item.onHand || 0))
      message += `${index + 1}. *${item.name}*\n`
      if (item.genericName) message += `   Generic: ${item.genericName}\n`
      message += `   Current Stock: ${item.onHand || 0}\n`
      message += `   Min Required: ${item.minStock || 0}\n`
      message += `   *Required Quantity:* ${required} Packs\n\n`
    })
    
    message += `Total Items: ${lowStockItems.length}\n\n`
    message += `Please confirm receipt and expected delivery time.\n`
    message += `_Sent via HMS Pharmacy System_`
    
    const encodedMessage = encodeURIComponent(message)
    let phone = whatsappPhone.replace(/\D/g, '')
    
    // Auto-fix for common Pakistan numbers starting with 0 (e.g. 03001234567 -> 923001234567)
    if (phone.startsWith('0') && phone.length === 11) {
      phone = '92' + phone.substring(1)
    }

    const url = phone ? `https://wa.me/${phone}?text=${encodedMessage}` : `https://wa.me/?text=${encodedMessage}`
    window.open(url, '_blank')
    setWhatsappModalOpen(false)
    setWhatsappPhone('')
  }

  return (
    <div className="p-4 md:p-6">
      {/* WhatsApp Modal */}
      {whatsappModalOpen && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/60 px-4">
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-2xl animate-in zoom-in duration-200">
            <div className="mb-4 flex items-center gap-3 text-emerald-600">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100">
                <MessageCircle className="h-5 w-5" />
              </div>
              <h3 className="text-lg font-bold text-slate-800">Send to WhatsApp</h3>
            </div>
            
            <p className="mb-4 text-sm text-slate-600">
              Select a supplier from your list or enter a number manually.
            </p>

            <div className="space-y-4 mb-6">
              <div>
                <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-500">Select Registered Supplier</label>
                <div className="relative">
                  <select
                    onChange={e => setWhatsappPhone(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 appearance-none"
                  >
                    <option value="">— Choose a Supplier —</option>
                    {suppliers.filter(s => s.phone).map(s => (
                      <option key={s._id || s.id} value={s.phone}>
                        {s.name} ({s.phone})
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                </div>
              </div>

              <div className="relative flex items-center py-2">
                <div className="grow border-t border-slate-200"></div>
                <span className="shrink mx-4 text-xs font-medium text-slate-400 uppercase tracking-widest">OR</span>
                <div className="grow border-t border-slate-200"></div>
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-500">Enter Number Manually</label>
                <input
                  type="text"
                  value={whatsappPhone}
                  onChange={e => setWhatsappPhone(e.target.value)}
                  placeholder="e.g. 923001234567"
                  className="w-full rounded-lg border border-slate-300 px-4 py-3 text-sm focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 outline-none transition-all"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3">
              <button
                onClick={() => { setWhatsappModalOpen(false); setWhatsappPhone('') }}
                className="rounded-lg border border-slate-300 bg-white px-5 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                onClick={handleWhatsAppLowStock}
                className="rounded-lg bg-emerald-600 px-6 py-2.5 text-sm font-bold text-white hover:bg-emerald-700 transition-all active:scale-95 shadow-lg shadow-emerald-200"
              >
                Send Message
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Purchase Orders</h1>
          <p className="text-slate-500 mt-1">Manage and track your purchase orders</p>
        </div>
        
        <button
          onClick={handleCreateNew}
          className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-blue-700 transition-colors shadow-sm"
        >
          <Plus className="h-4 w-4" />
          Purchase Order
        </button>
      </div>

      {/* Stats */}
      <div className="mb-6 grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50">
              <FileText className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-800">{orders.length}</p>
              <p className="text-xs text-slate-500">Total Orders</p>
            </div>
          </div>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-50">
              <Package className="h-5 w-5 text-amber-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-800">
                {orders.filter(o => o.status === 'draft' || o.status === 'sent').length}
              </p>
              <p className="text-xs text-slate-500">Pending</p>
            </div>
          </div>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-50">
              <FileText className="h-5 w-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-800">
                {orders.filter(o => o.status === 'confirmed').length}
              </p>
              <p className="text-xs text-slate-500">Confirmed</p>
            </div>
          </div>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-50">
              <FileText className="h-5 w-5 text-purple-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-800">
                {orders.filter(o => o.status === 'received' || o.status === 'partially_received').length}
              </p>
              <p className="text-xs text-slate-500">Received</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="mb-6 flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => { setSearchQuery(e.target.value); setPage(1) }}
            placeholder="Search by PO number, supplier, company..."
            className="w-full rounded-lg border border-slate-300 bg-white pl-10 pr-4 py-2.5 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none"
          />
        </div>

        <div className="flex items-center gap-2">
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <select
              value={statusFilter}
              onChange={e => { setStatusFilter(e.target.value); setPage(1) }}
              className="appearance-none rounded-lg border border-slate-300 bg-white pl-10 pr-8 py-2.5 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none"
            >
              {statusOptions.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>

          <button
            onClick={fetchOrders}
            className="rounded-lg border border-slate-300 bg-white p-2.5 text-slate-600 hover:bg-slate-50 transition-colors"
            title="Refresh"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="mb-6 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {error}
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-slate-300 border-t-blue-600" />
        </div>
      )}

      {/* Empty State */}
      {!loading && orders.length === 0 && (
        <div className="rounded-xl border border-slate-200 bg-white p-12 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-slate-100">
            <FileText className="h-8 w-8 text-slate-400" />
          </div>
          <h3 className="text-lg font-semibold text-slate-800">No Purchase Orders</h3>
          <p className="mt-1 text-sm text-slate-500 max-w-sm mx-auto">
            Get started by creating your first purchase order to send to your suppliers.
          </p>
          <button
            onClick={handleCreateNew}
            className="mt-4 inline-flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
          >
            <Plus className="h-4 w-4" />
            Create Purchase Order
          </button>
        </div>
      )}

      {/* Orders Grid */}
      {!loading && orders.length > 0 && (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {orders.map(order => (
              <Pharmacy_PurchaseOrderCard
                key={order.id || order._id}
                order={order}
                onViewPDF={handleViewPDF}
                onPrintThermal={handlePrintThermal}
                onEdit={handleEdit}
                onDelete={handleDeleteClick}
                onStatusChange={handleStatusChange}
              />
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="mt-6 flex items-center justify-between">
              <p className="text-sm text-slate-500">
                Page {page} of {totalPages}
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Previous
                </button>
                <button
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Dialogs */}
      <Pharmacy_CreatePurchaseOrderDialog
        open={createDialogOpen}
        onClose={() => {
          setCreateDialogOpen(false)
          setEditingOrder(null)
        }}
        onSave={handleSaveOrder}
        initial={editingOrder}
        title={editingOrder ? 'Edit Purchase Order' : 'Create Purchase Order'}
        submitLabel={editingOrder ? 'Update Purchase Order' : 'Create Purchase Order'}
      />

      <Pharmacy_PurchaseOrderPDF
        open={pdfDialogOpen}
        order={selectedOrder}
        onClose={() => {
          setPdfDialogOpen(false)
          setSelectedOrder(null)
        }}
      />

      <Pharmacy_POReceiptDialog
        open={thermalDialogOpen}
        order={selectedOrder}
        onClose={() => {
          setThermalDialogOpen(false)
          setSelectedOrder(null)
        }}
        autoPrint={true}
      />

      {/* Delete Confirmation Dialog */}
      {deleteDialogOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4 py-4">
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-2xl">
            <div className="mb-4 flex items-center gap-3 text-rose-600">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-rose-100">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <h3 className="text-lg font-semibold text-slate-800">Delete Purchase Order</h3>
            </div>
            <p className="mb-6 text-sm text-slate-600">
              Are you sure you want to delete <span className="font-semibold">{orderToDelete?.poNumber || 'this order'}</span>? This action cannot be undone.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={handleCancelDelete}
                className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmDelete}
                disabled={deleteLoading}
                className="inline-flex items-center gap-2 rounded-lg bg-rose-600 px-4 py-2 text-sm font-medium text-white hover:bg-rose-700 transition-colors disabled:opacity-50"
              >
                {deleteLoading ? (
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                ) : (
                  <Trash2 className="h-4 w-4" />
                )}
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
