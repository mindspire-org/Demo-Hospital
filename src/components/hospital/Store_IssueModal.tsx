import { useEffect, useState, useCallback, useRef } from 'react'
import { hospitalApi } from '../../utils/api'
import { getLocalDate } from '../../utils/date'
import Toast, { type ToastState } from '../ui/Toast'

// Searchable dropdown component for items
function ItemSearchDropdown({ 
  items, 
  value, 
  onChange, 
  placeholder = 'Search item...' 
}: { 
  items: Array<{ id: string; name: string; currentStock: number; unit: string; avgCost: number }>
  value: string
  onChange: (itemId: string) => void
  placeholder?: string
}) {
  const [isOpen, setIsOpen] = useState(false)
  const [search, setSearch] = useState('')
  const containerRef = useRef<HTMLDivElement>(null)
  
  const selectedItem = items.find(i => i.id === value)
  
  const filteredItems = search.trim() 
    ? items.filter(i => i.name.toLowerCase().includes(search.toLowerCase()))
    : items
  
  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])
  
  // Update search when value changes externally (only when an item is actually selected)
  useEffect(() => {
    if (selectedItem) {
      setSearch(selectedItem.name)
    }
    // Don't reset search when selectedItem is null/undefined - let user keep typing
  }, [selectedItem?.id])
  
  const handleSelect = (itemId: string) => {
    onChange(itemId)
    setIsOpen(false)
    const item = items.find(i => i.id === itemId)
    if (item) setSearch(item.name)
  }
  
  return (
    <div ref={containerRef} className="relative" onClick={(e) => e.stopPropagation()}>
      <input
        type="text"
        value={search}
        onChange={(e) => {
          setSearch(e.target.value)
          setIsOpen(true)
        }}
        onFocus={() => setIsOpen(true)}
        placeholder={placeholder}
        className="w-full rounded border border-slate-200 px-2 py-1 text-sm outline-none focus:border-violet-500"
        autoComplete="off"
      />
      {isOpen && (
        <div 
          className="fixed z-[100] mt-1 max-h-60 w-full min-w-[200px] overflow-auto rounded-md border border-slate-200 bg-white shadow-lg"
          style={{ 
            top: containerRef.current ? containerRef.current.getBoundingClientRect().bottom + 4 : 0,
            left: containerRef.current ? containerRef.current.getBoundingClientRect().left : 0,
            width: containerRef.current ? Math.max(containerRef.current.getBoundingClientRect().width, 200) : 200
          }}
        >
          {filteredItems.length === 0 ? (
            <div className="px-3 py-2 text-sm text-slate-500">No items found</div>
          ) : (
            filteredItems.map(item => (
              <button
                key={item.id}
                type="button"
                onClick={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  handleSelect(item.id)
                }}
                className={`w-full px-3 py-2 text-left text-sm hover:bg-slate-100 ${
                  item.id === value ? 'bg-violet-50 text-violet-700' : 'text-slate-700'
                }`}
              >
                <div className="font-medium">{item.name}</div>
                <div className="text-xs text-slate-500">
                  Stock: {item.currentStock} {item.unit}
                </div>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  )
}

type Department = { id: string; name: string }
type InventoryItem = { id: string; name: string; currentStock: number; unit: string; avgCost: number }

type IssueLine = {
  tempId: string
  itemId: string
  itemName: string
  quantity: number
  unit: string
  costPerUnit: number
  subtotal: number
  availableQty: number
}

type IssueModalProps = {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  editIssueId?: string | null
}

export default function Store_IssueModal({ isOpen, onClose, onSuccess, editIssueId }: IssueModalProps) {
  const [departments, setDepartments] = useState<Department[]>([])
  const [items, setItems] = useState<InventoryItem[]>([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState<ToastState>(null)
  const isEditMode = Boolean(editIssueId)

  const [form, setForm] = useState({
    date: getLocalDate(),
    departmentId: '',
    departmentName: '',
    issuedTo: '',
    notes: '',
  })

  const [lines, setLines] = useState<IssueLine[]>([
    { tempId: '1', itemId: '', itemName: '', quantity: 1, unit: 'pcs', costPerUnit: 0, subtotal: 0, availableQty: 0 },
  ])

  const resetForm = useCallback(() => {
    setForm({
      date: getLocalDate(),
      departmentId: '',
      departmentName: '',
      issuedTo: '',
      notes: '',
    })
    setLines([
      { tempId: '1', itemId: '', itemName: '', quantity: 1, unit: 'pcs', costPerUnit: 0, subtotal: 0, availableQty: 0 },
    ])
  }, [])

  useEffect(() => {
    if (!isOpen) return
    
    let cancelled = false
    async function load() {
      setLoading(true)
      try {
        const [depRes, itemRes] = await Promise.all([
          hospitalApi.listDepartments() as any,
          hospitalApi.listStoreInventory({ limit: 10000 }) as any,
        ])
        if (!cancelled) {
          setDepartments((depRes.departments || depRes.data || depRes || []).map((d: any) => ({
            id: String(d._id || d.id), name: d.name,
          })))
          setItems((itemRes.items || itemRes.data || itemRes || []).filter((i: any) => i.currentStock > 0).map((i: any) => ({
            id: String(i._id || i.id), name: i.name, currentStock: i.currentStock, unit: i.unit || 'pcs', avgCost: i.avgCost || 0,
          })))
        }
      } catch {
        // API not ready
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    
    async function loadIssue() {
      if (!editIssueId) {
        resetForm()
        return
      }
      setLoading(true)
      try {
        const res = await hospitalApi.getStoreIssue(editIssueId) as any
        const issue = res.issue || res.data || res
        if (!cancelled && issue) {
          setForm({
            date: issue.date?.slice(0, 10) || getLocalDate(),
            departmentId: issue.departmentId || '',
            departmentName: issue.departmentName || '',
            issuedTo: issue.issuedTo || '',
            notes: issue.notes || '',
          })
          setLines((issue.items || []).map((item: any, idx: number) => ({
            tempId: String(idx + 1),
            itemId: item.itemId || '',
            itemName: item.itemName || '',
            quantity: item.quantity || 1,
            unit: item.unit || 'pcs',
            costPerUnit: item.costPerUnit || 0,
            subtotal: (item.quantity || 1) * (item.costPerUnit || 0),
            availableQty: item.quantity || 0,
          })))
        }
      } catch (err: any) {
        setToast({ type: 'error', message: 'Failed to load issue' })
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    
    load()
    loadIssue()
    
    return () => { cancelled = true }
  }, [isOpen, editIssueId, resetForm])

  const selectItem = (tempId: string, itemId: string) => {
    const item = items.find(i => i.id === itemId)
    if (!item) return

    setLines(prev => prev.map(l => {
      if (l.tempId !== tempId) return l
      return {
        ...l,
        itemId,
        itemName: item.name,
        unit: item.unit,
        costPerUnit: item.avgCost,
        availableQty: item.currentStock,
        subtotal: l.quantity * item.avgCost,
      }
    }))
  }

  const updateLine = (tempId: string, field: keyof IssueLine, value: any) => {
    setLines(prev => prev.map(l => {
      if (l.tempId !== tempId) return l
      const updated = { ...l, [field]: value }
      if (field === 'quantity' || field === 'costPerUnit') {
        updated.subtotal = Number(updated.quantity) * Number(updated.costPerUnit)
      }
      return updated
    }))
  }

  const addLine = () => {
    setLines(prev => [...prev, {
      tempId: Date.now().toString(),
      itemId: '', itemName: '',
      quantity: 1, unit: 'pcs', costPerUnit: 0, subtotal: 0, availableQty: 0,
    }])
  }

  const removeLine = (tempId: string) => {
    if (lines.length > 1) {
      setLines(prev => prev.filter(l => l.tempId !== tempId))
    }
  }

  const totalAmount = lines.reduce((sum, l) => sum + l.subtotal, 0)

  const handleSubmit = async () => {
    if (!form.departmentId) {
      setToast({ type: 'error', message: 'Department is required' })
      return
    }
    const validLines = lines.filter(l => l.itemId && l.quantity > 0)
    if (validLines.length === 0) {
      setToast({ type: 'error', message: 'Add at least one valid item' })
      return
    }
    
    // For new issues, check stock availability
    if (!isEditMode) {
      for (const l of validLines) {
        if (l.quantity > l.availableQty) {
          setToast({ type: 'error', message: `Quantity for ${l.itemName} exceeds available stock` })
          return
        }
      }
    }

    setSaving(true)
    try {
      const payload = {
        date: form.date,
        departmentId: form.departmentId,
        departmentName: form.departmentName,
        issuedTo: form.issuedTo || undefined,
        notes: form.notes || undefined,
        items: validLines.map(l => ({
          itemId: l.itemId,
          itemName: l.itemName,
          quantity: l.quantity,
          unit: l.unit,
          costPerUnit: l.costPerUnit,
        })),
        totalAmount,
      }

      if (isEditMode && editIssueId) {
        await hospitalApi.updateStoreIssue(editIssueId, payload)
        setToast({ type: 'success', message: 'Issue updated successfully' })
      } else {
        await hospitalApi.createStoreIssue(payload)
        setToast({ type: 'success', message: 'Stock issued successfully' })
      }
      
      onSuccess()
      onClose()
      resetForm()
    } catch (err: any) {
      setToast({ type: 'error', message: err?.message || 'Failed to save issue' })
    } finally {
      setSaving(false)
    }
  }

  const formatCurrency = (n: number) => new Intl.NumberFormat('en-PK', { style: 'currency', currency: 'PKR', maximumFractionDigits: 0 }).format(n)

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-xl">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-slate-800">
            {isEditMode ? 'Edit Issue' : 'Issue Stock to Department'}
          </h2>
          <button 
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 text-2xl leading-none"
          >
            ×
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {loading ? (
            <div className="text-center py-8 text-slate-500">Loading...</div>
          ) : (
            <>
              {/* Header Info */}
              <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                <div>
                  <label className="mb-1 block text-sm text-slate-700">Date</label>
                  <input
                    type="date"
                    value={form.date}
                    onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
                    className="w-full rounded-md border border-slate-300 px-3 py-2 outline-none focus:border-violet-500"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm text-slate-700">Department *</label>
                  <select
                    value={form.departmentId}
                    onChange={e => {
                      const dep = departments.find(d => d.id === e.target.value)
                      setForm(f => ({ ...f, departmentId: e.target.value, departmentName: dep?.name || '' }))
                    }}
                    className="w-full rounded-md border border-slate-300 px-3 py-2 outline-none focus:border-violet-500"
                  >
                    <option value="">Select department</option>
                    {departments.map(d => (
                      <option key={d.id} value={d.id}>{d.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-sm text-slate-700">Issued To</label>
                  <input
                    value={form.issuedTo}
                    onChange={e => setForm(f => ({ ...f, issuedTo: e.target.value }))}
                    placeholder="Staff name (optional)"
                    className="w-full rounded-md border border-slate-300 px-3 py-2 outline-none focus:border-violet-500"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm text-slate-700">Notes</label>
                  <input
                    value={form.notes}
                    onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                    placeholder="Optional notes"
                    className="w-full rounded-md border border-slate-300 px-3 py-2 outline-none focus:border-violet-500"
                  />
                </div>
              </div>

              {/* Items Table */}
              <div className="mt-6">
                <div className="flex items-center justify-between">
                  <h3 className="font-medium text-slate-800">Items to Issue</h3>
                  <button onClick={addLine} className="rounded-md border border-slate-300 px-3 py-1.5 text-sm hover:bg-slate-50">
                    + Add Item
                  </button>
                </div>

                <div className="mt-3 overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-200 text-left text-slate-600">
                        <th className="px-2 py-2">Item</th>
                        <th className="px-2 py-2">Available</th>
                        <th className="px-2 py-2 w-20">Qty</th>
                        <th className="px-2 py-2 w-20">Unit</th>
                        <th className="px-2 py-2 w-28">Cost/Unit</th>
                        <th className="px-2 py-2 text-right">Subtotal</th>
                        <th className="px-2 py-2 w-16"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {lines.map(line => (
                        <tr key={line.tempId} className="border-b border-slate-100">
                          <td className="px-2 py-2">
                            <ItemSearchDropdown
                              items={items}
                              value={line.itemId}
                              onChange={(itemId) => selectItem(line.tempId, itemId)}
                              placeholder="Search item..."
                            />
                          </td>
                          <td className="px-2 py-2 text-slate-600">
                            {line.availableQty > 0 ? `${line.availableQty} ${line.unit}` : '-'}
                          </td>
                          <td className="px-2 py-2">
                            <input
                              type="number"
                              min="1"
                              max={line.availableQty || undefined}
                              value={line.quantity}
                              onChange={e => updateLine(line.tempId, 'quantity', Number(e.target.value))}
                              className="w-16 rounded border border-slate-200 px-2 py-1 text-sm outline-none focus:border-violet-500"
                            />
                          </td>
                          <td className="px-2 py-2 text-slate-600">{line.unit}</td>
                          <td className="px-2 py-2">
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              value={line.costPerUnit}
                              onChange={e => updateLine(line.tempId, 'costPerUnit', Number(e.target.value))}
                              className="w-24 rounded border border-slate-200 px-2 py-1 text-sm outline-none focus:border-violet-500"
                            />
                          </td>
                          <td className="px-2 py-2 text-right font-medium text-slate-700">
                            {formatCurrency(line.subtotal)}
                          </td>
                          <td className="px-2 py-2 text-center">
                            <button
                              onClick={() => removeLine(line.tempId)}
                              className="rounded p-1 text-rose-500 hover:bg-rose-50"
                              disabled={lines.length === 1}
                            >
                              🗑️
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Total */}
              <div className="mt-4 flex justify-end">
                <div className="text-right">
                  <div className="text-sm text-slate-600">Total Value</div>
                  <div className="text-2xl font-bold text-slate-800">{formatCurrency(totalAmount)}</div>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-white border-t border-slate-200 px-6 py-4 flex justify-end gap-3">
          <button
            onClick={onClose}
            disabled={saving}
            className="rounded-md border border-slate-300 px-4 py-2 text-sm hover:bg-slate-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={saving || loading}
            className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
          >
            {saving ? 'Saving...' : isEditMode ? 'Update Issue' : 'Issue Stock'}
          </button>
        </div>
      </div>
      <Toast toast={toast} onClose={() => setToast(null)} />
    </div>
  )
}
