import { useEffect, useState, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { hospitalApi } from '../../utils/api'
import Toast, { type ToastState } from '../../components/ui/Toast'
import Store_InventoryTable from '../../components/hospital/store_InventoryTable'
import Store_PurchaseView from '../../components/hospital/store_PurchaseView'

type InventoryItem = {
  id: string
  name: string
  category: string
  categoryName?: string
  unit: string
  currentStock: number
  minStock: number
  avgCost: number
  stockValue: number
  earliestExpiry?: string
  lastPurchase?: string
  lastSupplier?: string
  description?: string
  barcode?: string
  location?: string
}

type EditForm = {
  id: string
  name: string
  category: string
  unit: string
  currentStock: number
  minStock: number
  avgCost: number
  earliestExpiry?: string
  description: string
  barcode: string
  location: string
}

export default function Store_Inventory() {
  const [items, setItems] = useState<InventoryItem[]>([])
  const [query, setQuery] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('')
  const [stockFilter, setStockFilter] = useState('')
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [pages, setPages] = useState(1)
  const [total, setTotal] = useState(0)
  const cancelledRef = useRef(false)
  const loadingRef = useRef(false)
  const [pendingRows, setPendingRows] = useState<any[]>([])
  const [pendingPage, setPendingPage] = useState(1)
  const [pendingPages, setPendingPages] = useState(1)
  const [pendingTotal, setPendingTotal] = useState(0)
  const [viewPurchaseId, setViewPurchaseId] = useState<string | null>(null)
  const [toast, setToast] = useState<ToastState>(null)
  const navigate = useNavigate()

  // Edit dialog state
  const [editOpen, setEditOpen] = useState(false)
  const [editForm, setEditForm] = useState<EditForm | null>(null)
  const [editLoading, setEditLoading] = useState(false)

  // Delete confirmation state
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deleteItemId, setDeleteItemId] = useState<string | null>(null)
  const [deleteLoading, setDeleteLoading] = useState(false)

  const loadPendingItems = async (p = 1) => {
    try {
      const res = await hospitalApi.listStorePurchaseDraftLines({
        search: query || undefined,
        page: p,
        limit: 20,
      }) as any
      const pending = (res.items || []).map((it: any) => ({
        id: it.draftId || it._id,
        draftId: it.draftId || it._id,
        invoiceNo: it.invoiceNo || '-',
        name: it.itemName || '-',
        category: it.category || '-',
        quantity: it.quantity || 0,
        unit: it.unit || 'pcs',
        purchaseCost: it.purchaseCost || 0,
        minStock: it.minStock ?? '-',
        expiry: it.expiry || '-',
        supplierName: it.supplierName || '-',
        date: it.date,
      }))
      setPendingRows(pending)
      setPendingPage(res.page || 1)
      setPendingPages(res.totalPages || 1)
      setPendingTotal(res.total || 0)
    } catch {
      setPendingRows([])
    }
  }

  const approveOne = async (id: string) => {
    setPendingRows(prev => prev.filter(r => r.draftId !== id))
    try {
      await hospitalApi.approveStorePurchaseDraft(id)
      setToast({ type: 'success', message: 'Item approved' })
      loadItems(page)
    } catch (err: any) {
      setToast({ type: 'error', message: err?.message || 'Failed to approve' })
    }
  }

  const rejectOne = async (id: string) => {
    setPendingRows(prev => prev.filter(r => r.draftId !== id))
    try {
      await hospitalApi.deleteStorePurchaseDraft(id)
      setToast({ type: 'error', message: 'Item rejected' })
    } catch (err: any) {
      setToast({ type: 'error', message: err?.message || 'Failed to reject' })
    }
  }

  const editDraft = (id: string) => {
    navigate(`/hospital/store/add-purchase?draftId=${id}`)
  }

  const loadItems = async (p = 1) => {
    if (loadingRef.current || cancelledRef.current) return
    loadingRef.current = true
    setLoading(true)
    try {
      const res = await hospitalApi.listStoreInventory({
        category: categoryFilter || undefined,
        status: stockFilter || undefined,
        search: query || undefined,
        page: p,
        limit: 20,
      }) as any
      if (cancelledRef.current) return
      const inventory = (res.items || res.data || res || []).map((i: any) => ({
        id: String(i._id || i.id),
        name: i.name,
        category: i.category,
        categoryName: i.category || '-',
        unit: i.unit || 'pcs',
        currentStock: i.currentStock || 0,
        minStock: i.minStock || 0,
        avgCost: i.avgCost || 0,
        stockValue: (i.currentStock || 0) * (i.avgCost || 0),
        earliestExpiry: i.earliestExpiry,
        lastPurchase: i.lastPurchase,
        lastSupplier: i.lastSupplier,
        location: i.location,
      })) as InventoryItem[]
      setItems(inventory)
      const pg = res.pagination || {}
      setPage(pg.page || 1)
      setPages(pg.pages || 1)
      setTotal(pg.total || 0)
    } catch {
      if (!cancelledRef.current) setItems([])
    } finally {
      loadingRef.current = false
      if (!cancelledRef.current) setLoading(false)
    }
  }

  useEffect(() => {
    cancelledRef.current = false
    const timer = setTimeout(() => {
      if (!cancelledRef.current) loadItems(1)
    }, 100)
    return () => {
      cancelledRef.current = true
      clearTimeout(timer)
    }
  }, [categoryFilter, stockFilter, query])

  useEffect(() => {
    setPage(1)
    setPendingPage(1)
  }, [categoryFilter, stockFilter, query])

  useEffect(() => {
    if (stockFilter === 'pending') {
      loadPendingItems(pendingPage)
    }
  }, [stockFilter, pendingPage])

  const handleEdit = (item: InventoryItem) => {
    setEditForm({
      id: item.id,
      name: item.name,
      category: item.category || '',
      unit: item.unit,
      currentStock: item.currentStock,
      minStock: item.minStock,
      avgCost: item.avgCost,
      earliestExpiry: item.earliestExpiry || '',
      description: item.description || '',
      barcode: item.barcode || '',
      location: item.location || '',
    })
    setEditOpen(true)
  }

  const handleEditSubmit = async () => {
    if (!editForm) return
    setEditLoading(true)
    try {
      await hospitalApi.storeUpdateItem(editForm.id, {
        name: editForm.name,
        category: editForm.category,
        unit: editForm.unit,
        currentStock: editForm.currentStock,
        minStock: editForm.minStock,
        avgCost: editForm.avgCost,
        earliestExpiry: editForm.earliestExpiry,
        description: editForm.description,
        barcode: editForm.barcode,
        location: editForm.location,
      })
      setToast({ type: 'success', message: 'Item updated successfully' })
      setEditOpen(false)
      loadItems(page)
    } catch (err: any) {
      setToast({ type: 'error', message: err?.message || 'Failed to update item' })
    } finally {
      setEditLoading(false)
    }
  }

  const handleDeleteClick = (id: string) => {
    setDeleteItemId(id)
    setDeleteOpen(true)
  }

  const handleDeleteConfirm = async () => {
    if (!deleteItemId) return
    setDeleteLoading(true)
    try {
      await hospitalApi.deleteStoreItem(deleteItemId)
      setToast({ type: 'success', message: 'Item deleted successfully' })
      setDeleteOpen(false)
      loadItems(page)
    } catch (err: any) {
      setToast({ type: 'error', message: err?.message || 'Failed to delete item' })
    } finally {
      setDeleteLoading(false)
    }
  }

  const totalValue = items.reduce((sum, i) => sum + i.stockValue, 0)

  return (
    <div className="p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-xl font-semibold text-slate-800">Inventory / Stock</h2>
        <div className="flex gap-2">
          <Link to="/hospital/store/add-purchase" className="rounded-md bg-sky-600 px-3 py-1.5 text-white hover:bg-sky-700">
            + Add Item
          </Link>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4">
        <div className="rounded-lg border border-slate-200 bg-white p-3 shadow-sm">
          <div className="text-sm text-slate-500">Total Items</div>
          <div className="text-xl font-bold text-slate-800">{total}</div>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-3 shadow-sm">
          <div className="text-sm text-slate-500">Total Stock Value</div>
          <div className="text-xl font-bold text-emerald-600">
            {totalValue.toLocaleString('en-PK', { style: 'currency', currency: 'PKR', maximumFractionDigits: 0 })}
          </div>
        </div>
        <div className="rounded-lg border border-rose-200 bg-rose-50 p-3">
          <div className="text-sm text-rose-600">Out of Stock</div>
          <div className="text-xl font-bold text-rose-700">{items.filter(i => i.currentStock === 0).length}</div>
        </div>
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
          <div className="text-sm text-amber-600">Low Stock</div>
          <div className="text-xl font-bold text-amber-700">{items.filter(i => i.currentStock > 0 && i.currentStock < i.minStock).length}</div>
        </div>
      </div>

      {/* Filters */}
      <div className="mt-4 flex flex-wrap gap-3">
        <input
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Search items..."
          className="flex-1 rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-violet-500"
        />
        <input
          value={categoryFilter}
          onChange={e => setCategoryFilter(e.target.value)}
          placeholder="Filter by category..."
          className="rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-violet-500"
        />
      </div>

      {/* Tabs */}
      <div className="mt-4 flex gap-2 border-b border-slate-200">
        <button
          onClick={() => setStockFilter('')}
          className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
            stockFilter === '' ? 'border-sky-600 text-sky-700' : 'border-transparent text-slate-600 hover:text-slate-800'
          }`}
        >
          All Items
        </button>
        <button
          onClick={() => setStockFilter('pending')}
          className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
            stockFilter === 'pending' ? 'border-sky-600 text-sky-700' : 'border-transparent text-slate-600 hover:text-slate-800'
          }`}
        >
          Pending Review
        </button>
        <button
          onClick={() => setStockFilter('low')}
          className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
            stockFilter === 'low' ? 'border-sky-600 text-sky-700' : 'border-transparent text-slate-600 hover:text-slate-800'
          }`}
        >
          Low Stock
        </button>
        <button
          onClick={() => setStockFilter('expiring')}
          className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
            stockFilter === 'expiring' ? 'border-sky-600 text-sky-700' : 'border-transparent text-slate-600 hover:text-slate-800'
          }`}
        >
          Expiring Soon
        </button>
        <button
          onClick={() => setStockFilter('out')}
          className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
            stockFilter === 'out' ? 'border-sky-600 text-sky-700' : 'border-transparent text-slate-600 hover:text-slate-800'
          }`}
        >
          Out of Stock
        </button>
      </div>

      {/* Table */}
      <div className="mt-5">
        {loading && stockFilter !== 'pending' ? (
          <div className="text-center text-slate-500 py-12">Loading...</div>
        ) : stockFilter === 'pending' ? (
          <Store_InventoryTable
            rows={pendingRows}
            pending={true}
            onEditDraft={editDraft}
            onApprove={approveOne}
            onReject={rejectOne}
            page={pendingPage}
            totalPages={pendingPages}
            total={pendingTotal}
            limit={20}
            onChangeLimit={() => {}}
            onPrev={() => setPendingPage(p => Math.max(1, p - 1))}
            onNext={() => setPendingPage(p => Math.min(pendingPages, p + 1))}
          />
        ) : (
          <Store_InventoryTable
            rows={items.map(item => ({
              id: item.id,
              name: item.name,
              category: item.categoryName || item.category,
              unit: item.unit,
              currentStock: item.currentStock,
              minStock: item.minStock,
              avgCost: item.avgCost,
              earliestExpiry: item.earliestExpiry,
              lastPurchase: item.lastPurchase,
              lastSupplier: item.lastSupplier,
            }))}
            onEdit={(id) => {
              const item = items.find(i => i.id === id)
              if (item) handleEdit(item)
            }}
            onDelete={handleDeleteClick}
            page={page}
            totalPages={pages}
            total={total}
            limit={20}
            onChangeLimit={() => {}}
            onPrev={() => loadItems(page - 1)}
            onNext={() => loadItems(page + 1)}
          />
        )}
      </div>

      <Toast toast={toast} onClose={() => setToast(null)} />

      {/* Purchase View Modal */}
      <Store_PurchaseView
        purchaseId={viewPurchaseId}
        onClose={() => setViewPurchaseId(null)}
        autoPrint={false}
      />

      {/* Edit Item Dialog */}
      {editOpen && editForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-lg rounded-xl border border-slate-200 bg-white shadow-xl">
            <div className="border-b border-slate-200 px-6 py-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-slate-800">Edit Item</h3>
              <button onClick={() => setEditOpen(false)} className="text-slate-500 hover:text-slate-700 text-xl">✖</button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">Item Name</label>
                  <input
                    value={editForm.name}
                    onChange={e => setEditForm({ ...editForm, name: e.target.value })}
                    className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">Category</label>
                  <input
                    value={editForm.category}
                    onChange={e => setEditForm({ ...editForm, category: e.target.value })}
                    className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                  />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">Unit</label>
                  <select
                    value={editForm.unit}
                    onChange={e => setEditForm({ ...editForm, unit: e.target.value })}
                    className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                  >
                    <option value="pcs">Pcs</option>
                    <option value="pack">Pack</option>
                    <option value="box">Box</option>
                    <option value="bottle">Bottle</option>
                    <option value="tube">Tube</option>
                    <option value="set">Set</option>
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">Current Stock</label>
                  <input
                    type="number"
                    value={editForm.currentStock}
                    onChange={e => setEditForm({ ...editForm, currentStock: Number(e.target.value) })}
                    className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">Min Stock</label>
                  <input
                    type="number"
                    value={editForm.minStock}
                    onChange={e => setEditForm({ ...editForm, minStock: Number(e.target.value) })}
                    className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                  />
                </div>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Average Cost</label>
                <input
                  type="number"
                  step="0.01"
                  value={editForm.avgCost}
                  onChange={e => setEditForm({ ...editForm, avgCost: Number(e.target.value) })}
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">Location</label>
                  <input
                    value={editForm.location}
                    onChange={e => setEditForm({ ...editForm, location: e.target.value })}
                    className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">Earliest Expiry</label>
                  <input
                    type="date"
                    value={(editForm.earliestExpiry || '').slice(0,10)}
                    onChange={e => setEditForm({ ...editForm, earliestExpiry: e.target.value })}
                    className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                  />
                </div>
              </div>
            </div>
            <div className="border-t border-slate-200 px-6 py-4 flex justify-end gap-3">
              <button
                onClick={() => setEditOpen(false)}
                className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                onClick={handleEditSubmit}
                disabled={editLoading}
                className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
              >
                {editLoading ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      {deleteOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-sm rounded-xl border border-slate-200 bg-white shadow-xl">
            <div className="p-6">
              <div className="flex items-center justify-center w-12 h-12 mx-auto bg-rose-100 rounded-full mb-4">
                <svg className="w-6 h-6 text-rose-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-slate-800 text-center">Delete Item?</h3>
              <p className="text-sm text-slate-500 text-center mt-2">
                This action cannot be undone. This will permanently delete the inventory item.
              </p>
            </div>
            <div className="border-t border-slate-200 px-6 py-4 flex justify-center gap-3">
              <button
                onClick={() => setDeleteOpen(false)}
                className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteConfirm}
                disabled={deleteLoading}
                className="rounded-md bg-rose-600 px-4 py-2 text-sm font-medium text-white hover:bg-rose-700 disabled:opacity-50"
              >
                {deleteLoading ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
