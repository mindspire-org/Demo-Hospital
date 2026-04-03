import { useEffect, useState, useRef } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { hospitalApi } from '../../utils/api'
import { Plus, Trash2, ArrowLeft, Save, Pause, List } from 'lucide-react'
import Toast, { type ToastState } from '../../components/ui/Toast'

type Supplier = { id: string; name: string; company?: string; phone?: string; address?: string }
type InventoryItem = { id: string; name: string; category?: string; unit: string; currentStock: number; avgCost: number; minStock: number; earliestExpiry?: string }

type PurchaseLine = {
  tempId: string
  itemId?: string
  itemName: string
  category?: string
  quantity: number
  unit: string
  purchaseCost: number
  minStock?: number
  expiry?: string
  subtotal: number
}

export default function Store_AddPurchase() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const draftId = searchParams.get('draftId')
  const isEditMode = Boolean(draftId)
  
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([])
  const [loading, setLoading] = useState(false)
  const [toast, setToast] = useState<ToastState>(null)
  const [activeItemIndex, setActiveItemIndex] = useState<string | null>(null)
  const [itemSearchQuery, setItemSearchQuery] = useState('')
  const itemInputRefs = useRef<(HTMLInputElement | null)[]>([])

  const [form, setForm] = useState({
    date: new Date().toISOString().slice(0, 10),
    invoiceNo: '',
    supplierId: '',
    supplierName: '',
    paymentMode: 'credit' as 'cash' | 'credit' | 'bank',
    storeLocation: '',
  })

  const [lines, setLines] = useState<PurchaseLine[]>([
    { tempId: '1', itemName: '', quantity: 1, unit: 'pcs', purchaseCost: 0, subtotal: 0 }
  ])

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const [supRes, invRes] = await Promise.all([
          hospitalApi.listStoreSuppliers() as any,
          hospitalApi.listStoreInventory({ limit: 1000 }) as any
        ])
        if (!cancelled) {
          setSuppliers((supRes.suppliers || supRes.data || supRes || []).map((s: any) => ({
            id: String(s._id || s.id),
            name: s.name,
            company: s.company,
            phone: s.phone,
            address: s.address,
          })))
          setInventoryItems((invRes.items || invRes.data || invRes || []).map((i: any) => ({
            id: String(i._id || i.id),
            name: i.name,
            category: i.categoryName || i.category,
            unit: i.unit,
            currentStock: i.currentStock,
            avgCost: i.avgCost,
            minStock: i.minStock || 0,
            earliestExpiry: i.earliestExpiry,
          })))
        }
      } catch {
        // API not ready
      }
    }
    load()
    return () => { cancelled = true }
  }, [])

  // Load draft data if editing
  useEffect(() => {
    if (!draftId) return
    let cancelled = false
    async function loadDraft() {
      try {
        const draft = await hospitalApi.getStorePurchaseDraft(draftId!) as any
        if (cancelled || !draft) return
        setForm({
          date: draft.date || new Date().toISOString().slice(0, 10),
          invoiceNo: draft.invoiceNo || '',
          supplierId: draft.supplierId || '',
          supplierName: draft.supplierName || '',
          paymentMode: draft.paymentMode || 'credit',
          storeLocation: draft.storeLocation || '',
        })
        if (draft.lines && draft.lines.length > 0) {
          setLines(draft.lines.map((l: any) => ({
            tempId: Math.random().toString(),
            itemId: l.itemId,
            itemName: l.itemName || '',
            category: l.category,
            quantity: l.quantity || 1,
            unit: l.unit || 'pcs',
            purchaseCost: l.purchaseCost || 0,
            minStock: l.minStock,
            expiry: l.expiry,
            subtotal: (l.quantity || 0) * (l.purchaseCost || 0),
          })))
        }
      } catch (err: any) {
        setToast({ type: 'error', message: err?.message || 'Failed to load draft' })
      }
    }
    loadDraft()
    return () => { cancelled = true }
  }, [draftId])

  const updateLine = (tempId: string, field: keyof PurchaseLine, value: any) => {
    setLines(prev => prev.map(l => {
      if (l.tempId !== tempId) return l
      const updated = { ...l, [field]: value }
      if (field === 'quantity' || field === 'purchaseCost') {
        updated.subtotal = Number(updated.quantity) * Number(updated.purchaseCost)
      }
      return updated
    }))
  }

  const addLine = () => {
    setLines(prev => [...prev, {
      tempId: Date.now().toString(),
      itemName: '',
      quantity: 1,
      unit: 'pcs',
      purchaseCost: 0,
      subtotal: 0,
    }])
  }

  const selectInventoryItem = (tempId: string, item: InventoryItem) => {
    setLines(prev => prev.map(l => {
      if (l.tempId !== tempId) return l
      return {
        ...l,
        itemId: item.id,
        itemName: item.name,
        category: item.category || '',
        unit: item.unit,
        purchaseCost: item.avgCost || 0,
        minStock: item.minStock,
        expiry: item.earliestExpiry,
        subtotal: l.quantity * (item.avgCost || 0),
      }
    }))
    setActiveItemIndex(null)
    setItemSearchQuery('')
  }

  const handleItemNameChange = (tempId: string, value: string) => {
    setLines(prev => prev.map(l => {
      if (l.tempId !== tempId) return l
      return { ...l, itemName: value, itemId: undefined }
    }))
    setActiveItemIndex(tempId)
    setItemSearchQuery(value)
  }

  const handleItemInputBlur = (e: React.FocusEvent, tempId: string) => {
    setTimeout(() => {
      const relatedTarget = e.relatedTarget as HTMLElement
      if (!relatedTarget || !relatedTarget.closest('.inventory-dropdown')) {
        if (activeItemIndex === tempId) {
          const line = lines.find(l => l.tempId === tempId)
          if (line && line.itemName.trim()) {
            const match = inventoryItems.find(inv => 
              inv.name.toLowerCase().trim() === line.itemName.toLowerCase().trim()
            )
            if (match) {
              selectInventoryItem(tempId, match)
              return
            }
          }
          setActiveItemIndex(null)
        }
      }
    }, 150)
  }

  const removeLine = (tempId: string) => {
    if (lines.length > 1) {
      setLines(prev => prev.filter(l => l.tempId !== tempId))
    }
  }

  const formatCurrency = (n: number) => new Intl.NumberFormat('en-PK', { style: 'currency', currency: 'PKR', maximumFractionDigits: 0 }).format(n || 0)

  // Held purchases (backend persistence)
  type HeldPurchase = { 
    _id?: string
    id?: string
    createdAtIso?: string 
    createdAt?: string 
    heldAt?: string
    form: typeof form
    lines: PurchaseLine[]
    totalAmount: number
  }
  const [heldOpen, setHeldOpen] = useState(false)
  const [heldPurchases, setHeldPurchases] = useState<HeldPurchase[]>([])
  
  const refreshHeld = async () => {
    try {
      const res: any = await hospitalApi.listStoreHeldPurchases()
      setHeldPurchases(res?.items || [])
    } catch {
      setHeldPurchases([])
    }
  }
  
  useEffect(() => {
    if (heldOpen) refreshHeld()
  }, [heldOpen])

  const holdPurchase = async () => {
    if (lines.length === 0 || lines.every(l => !l.itemName.trim())) {
      setToast({ type: 'error', message: 'Add at least one item to hold' })
      return
    }
    try {
      await hospitalApi.createStoreHeldPurchase({
        form: { ...form },
        lines: [...lines],
        totalAmount,
      })
      
      // Reset form
      setForm({
        date: new Date().toISOString().slice(0, 10),
        invoiceNo: '',
        supplierId: '',
        supplierName: '',
        paymentMode: 'credit',
        storeLocation: '',
      })
      setLines([{ tempId: '1', itemName: '', quantity: 1, unit: 'pcs', purchaseCost: 0, subtotal: 0 }])
      
      setToast({ type: 'success', message: 'Purchase held successfully' })
      refreshHeld()
    } catch {
      setToast({ type: 'error', message: 'Failed to hold purchase' })
    }
  }

  const restoreHeld = async (id: string) => {
    try {
      const res: any = await hospitalApi.restoreStoreHeldPurchase(id)
      const held = res?.held
      if (!held) return
      
      setForm(held.form)
      setLines(held.lines)
      
      setHeldOpen(false)
      setToast({ type: 'success', message: 'Held purchase restored' })
      refreshHeld()
    } catch {
      setToast({ type: 'error', message: 'Failed to restore held purchase' })
    }
  }

  const deleteHeld = async (id: string) => {
    try {
      await hospitalApi.deleteStoreHeldPurchase(id)
      refreshHeld()
    } catch {}
  }

  // Load held purchases on mount for the count
  useEffect(() => {
    refreshHeld()
  }, [])

  const totalAmount = lines.reduce((sum, l) => sum + l.subtotal, 0)

  const handleSubmit = async () => {
    if (!form.invoiceNo.trim()) {
      setToast({ type: 'error', message: 'Invoice number is required' })
      return
    }
    if (!form.supplierId) {
      setToast({ type: 'error', message: 'Supplier is required' })
      return
    }
    const validLines = lines.filter(l => l.itemName.trim() && l.quantity > 0 && l.purchaseCost > 0)
    if (validLines.length === 0) {
      setToast({ type: 'error', message: 'Add at least one valid item' })
      return
    }

    setLoading(true)
    try {
      if (isEditMode && draftId) {
        // Update draft
        await hospitalApi.updateStorePurchaseDraft(draftId, {
          date: form.date,
          invoiceNo: form.invoiceNo.trim(),
          supplierId: form.supplierId,
          supplierName: form.supplierName,
          paymentMode: form.paymentMode,
          storeLocation: form.storeLocation?.trim() || undefined,
          lines: validLines.map(l => ({
            itemName: l.itemName,
            category: l.category,
            quantity: l.quantity,
            unit: l.unit,
            purchaseCost: l.purchaseCost,
            minStock: l.minStock,
            expiry: l.expiry,
          })),
          totalAmount,
        })
        setToast({ type: 'success', message: 'Draft updated successfully' })
      } else {
        // Create new purchase
        await hospitalApi.createStorePurchase({
          date: form.date,
          invoiceNo: form.invoiceNo.trim(),
          supplierId: form.supplierId,
          supplierName: form.supplierName,
          paymentMode: form.paymentMode,
          storeLocation: form.storeLocation?.trim() || undefined,
          items: validLines.map(l => ({
            itemName: l.itemName,
            category: l.category,
            quantity: l.quantity,
            unit: l.unit,
            purchaseCost: l.purchaseCost,
            minStock: l.minStock,
            expiry: l.expiry,
          })),
          totalAmount,
        })
        setToast({ type: 'success', message: 'Purchase recorded successfully' })
      }
      setTimeout(() => navigate('/hospital/store/inventory'), 1000)
    } catch (err: any) {
      setToast({ type: 'error', message: err?.message || 'Failed to save' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="sticky top-0 z-10 border-b border-slate-200 bg-white px-6 py-4 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/hospital/store/purchase-history')}
              className="rounded-lg border border-slate-300 p-2 text-slate-600 hover:bg-slate-50"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <div>
              <h1 className="text-xl font-bold text-slate-800">{isEditMode ? 'Edit Draft' : 'Record Purchase'}</h1>
              <p className="text-sm text-slate-500">{isEditMode ? 'Update purchase draft' : 'Add new items to store inventory'}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setHeldOpen(true)}
              className="flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 shadow-sm transition-all"
            >
              <List className="h-4 w-4" />
              Held ({heldPurchases.length})
            </button>
            <button
              onClick={holdPurchase}
              disabled={loading}
              className="flex items-center gap-2 rounded-lg border border-amber-300 bg-amber-50 px-4 py-2.5 text-sm font-semibold text-amber-700 hover:bg-amber-100 shadow-sm transition-all disabled:opacity-50"
            >
              <Pause className="h-4 w-4" />
              Hold
            </button>
            <button
              onClick={handleSubmit}
              disabled={loading}
              className="flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 shadow-md transition-all disabled:opacity-50"
            >
              <Save className="h-4 w-4" />
              {loading ? 'Saving...' : (isEditMode ? 'Update Draft' : 'Save Purchase')}
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="mx-auto max-w-6xl p-6">
        {/* Form Sections */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Supplier Information */}
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-slate-500">
              Supplier Information
            </h2>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  Supplier <span className="text-rose-500">*</span>
                </label>
                <select
                  value={form.supplierId}
                  onChange={e => {
                    const sup = suppliers.find(s => s.id === e.target.value)
                    setForm(f => ({ ...f, supplierId: e.target.value, supplierName: sup?.name || '' }))
                  }}
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                >
                  <option value="">Select supplier</option>
                  {suppliers.map(s => (
                    <option key={s.id} value={s.id}>
                      {s.name} {s.company ? `(${s.company})` : ''}
                    </option>
                  ))}
                </select>
              </div>
          </div>

          {/* Purchase Details */}
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-slate-500">
              Purchase Details
            </h2>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">Date</label>
                  <input
                    type="date"
                    value={form.date}
                    onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
                    className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">
                    Invoice No <span className="text-rose-500">*</span>
                  </label>
                  <input
                    value={form.invoiceNo}
                    onChange={e => setForm(f => ({ ...f, invoiceNo: e.target.value }))}
                    placeholder="Supplier invoice number"
                    className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">Payment Mode</label>
                  <select
                    value={form.paymentMode}
                    onChange={e => setForm(f => ({ ...f, paymentMode: e.target.value as any }))}
                    className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                  >
                    <option value="credit">Credit (Pay Later)</option>
                    <option value="cash">Cash</option>
                    <option value="bank">Bank Transfer</option>
                  </select>
                </div>
              </div>
          </div>
        </div>

        {/* Items Section */}
        <div className="mt-6 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-500">
              Purchase Items
            </h2>
            <button
              onClick={addLine}
              className="flex items-center gap-1 rounded-md border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              <Plus className="h-4 w-4" />
              Add Item
            </button>
          </div>

          {/* Items Grid - No horizontal scroll */}
          <div className="space-y-4">
            {lines.map((line, index) => (
              <div key={line.tempId} className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                {/* Row 1: Item Name, Category, Qty */}
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 mb-3">
                  <div>
                    <label className="mb-1 block text-xs font-medium text-slate-500">Item Name</label>
                    <div className="relative">
                      <input
                        ref={el => { itemInputRefs.current[index] = el }}
                        type="text"
                        value={line.itemName}
                        onChange={e => handleItemNameChange(line.tempId, e.target.value)}
                        onFocus={() => { setActiveItemIndex(line.tempId); setItemSearchQuery(line.itemName || '') }}
                        onBlur={(e) => handleItemInputBlur(e, line.tempId)}
                        placeholder="Search items..."
                        className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                        autoComplete="off"
                      />
                      {activeItemIndex === line.tempId && inventoryItems.length > 0 && (
                        <div className="inventory-dropdown absolute z-50 mt-1 max-h-48 w-full min-w-[250px] overflow-y-auto rounded-md border border-slate-200 bg-white shadow-xl">
                          {(itemSearchQuery
                            ? inventoryItems.filter(inv => inv.name?.toLowerCase().includes(itemSearchQuery.toLowerCase()))
                            : inventoryItems.slice(0, 10)
                          ).slice(0, 10).map(inv => (
                            <div
                              key={inv.id}
                              className="inventory-dropdown-item cursor-pointer px-3 py-2 text-sm hover:bg-blue-50"
                              onMouseDown={(e) => { e.preventDefault(); selectInventoryItem(line.tempId, inv) }}
                            >
                              <div className="font-medium text-slate-800">{inv.name}</div>
                              <div className="text-xs text-slate-500">
                                {inv.category || 'General'} • Stock: {inv.currentStock || 0} {inv.unit || 'units'}
                              </div>
                            </div>
                          ))}
                          {itemSearchQuery && inventoryItems.filter(inv => inv.name?.toLowerCase().includes(itemSearchQuery.toLowerCase())).length === 0 && (
                            <div className="px-3 py-2 text-sm text-slate-500">No matching items found</div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-slate-500">Category</label>
                    <input
                      value={line.category || ''}
                      onChange={e => updateLine(line.tempId, 'category', e.target.value)}
                      placeholder="Category"
                      className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-slate-500">Quantity</label>
                    <input
                      type="number"
                      min="1"
                      value={line.quantity}
                      onChange={e => updateLine(line.tempId, 'quantity', Number(e.target.value))}
                      className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                    />
                  </div>
                </div>

                {/* Row 2: Unit, Cost/Unit, Min Stock */}
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 mb-3">
                  <div>
                    <label className="mb-1 block text-xs font-medium text-slate-500">Unit</label>
                    <select
                      value={line.unit}
                      onChange={e => updateLine(line.tempId, 'unit', e.target.value)}
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
                    <label className="mb-1 block text-xs font-medium text-slate-500">Cost/Unit</label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={line.purchaseCost}
                      onChange={e => updateLine(line.tempId, 'purchaseCost', Number(e.target.value))}
                      className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-slate-500">Min Stock</label>
                    <input
                      type="number"
                      min="0"
                      value={line.minStock || ''}
                      onChange={e => updateLine(line.tempId, 'minStock', Number(e.target.value) || undefined)}
                      className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                    />
                  </div>
                </div>

                {/* Row 3: Expiry and Subtotal with Delete */}
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 items-end">
                  <div className="sm:w-1/2">
                    <label className="mb-1 block text-xs font-medium text-slate-500">Expiry</label>
                    <input
                      type="date"
                      value={line.expiry || ''}
                      onChange={e => updateLine(line.tempId, 'expiry', e.target.value || undefined)}
                      className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                    />
                  </div>
                  <div className="flex items-center justify-between sm:justify-end gap-4">
                    <div className="text-right">
                      <div className="text-xs text-slate-500">Subtotal</div>
                      <div className="font-semibold text-slate-700">{formatCurrency(line.subtotal)}</div>
                    </div>
                    <button
                      onClick={() => removeLine(line.tempId)}
                      disabled={lines.length === 1}
                      className="rounded p-2 text-rose-500 hover:bg-rose-50 disabled:opacity-50"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Store Location - Below Items Table */}
          <div className="mt-4 pt-4 border-t border-slate-200">
            <div className="max-w-md">
              <label className="mb-1 block text-sm font-medium text-slate-700">Store Location</label>
              <input
                value={form.storeLocation}
                onChange={e => setForm(f => ({ ...f, storeLocation: e.target.value }))}
                placeholder="e.g. Main Store, Warehouse A, etc."
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Total */}
          <div className="mt-4 flex justify-end border-t border-slate-200 pt-4">
            <div className="text-right">
              <div className="text-sm text-slate-500">Total Amount</div>
              <div className="text-3xl font-bold text-slate-800">{formatCurrency(totalAmount)}</div>
            </div>
          </div>
        </div>
      </div>

      <Toast toast={toast} onClose={() => setToast(null)} />

      {/* Held Purchases Modal */}
      {heldOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-2xl max-h-[80vh] overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-xl">
            <div className="sticky top-0 bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-slate-800">Held Purchases</h3>
              <button onClick={() => setHeldOpen(false)} className="text-slate-500 hover:text-slate-700 text-xl">✖</button>
            </div>
            <div className="p-6">
              {heldPurchases.length === 0 ? (
                <div className="text-center text-slate-500 py-8">No held purchases</div>
              ) : (
                <div className="space-y-3">
                  {heldPurchases.map((held, idx) => (
                    <div key={held.id || idx} className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 p-4">
                      <div className="space-y-1">
                        <div className="font-medium text-slate-800">
                          {held.form.invoiceNo || 'No Invoice'} • {held.form.supplierName || 'No Supplier'}
                        </div>
                        <div className="text-sm text-slate-500">
                          {held.lines?.length || 0} items • Total: {formatCurrency(held.totalAmount || 0)}
                        </div>
                        <div className="text-xs text-slate-400">
                          Held: {held.heldAt ? new Date(held.heldAt).toLocaleString() : '-'}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => held.id && restoreHeld(held.id)}
                          className="rounded-md bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700"
                        >
                          Restore
                        </button>
                        <button
                          onClick={() => held.id && deleteHeld(held.id)}
                          className="rounded-md border border-rose-200 bg-rose-50 px-3 py-1.5 text-sm font-medium text-rose-600 hover:bg-rose-100"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
