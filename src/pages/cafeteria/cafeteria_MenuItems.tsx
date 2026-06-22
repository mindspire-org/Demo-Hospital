import { useState, useEffect, useCallback } from 'react'
import { Plus, Pencil, Trash2, Search, Loader2, PackagePlus, AlertTriangle } from 'lucide-react'
import { cafeteriaApi } from '../../features/cafeteria'

export default function Cafeteria_MenuItems() {
  const [items, setItems] = useState<any[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<any>(null)
  const [showStock, setShowStock] = useState<any>(null)
  const [form, setForm] = useState({ name: '', category: 'General', price: 0, costPrice: 0, stockQty: 0, lowStockThreshold: 5 })
  const [stockForm, setStockForm] = useState({ adjustment: 0, reason: '' })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const r = await cafeteriaApi.listMenuItems({ q: search, limit: 500 })
      setItems(r?.items || [])
    } catch {} finally { setLoading(false) }
  }, [search])

  useEffect(() => { const t = setTimeout(load, 300); return () => clearTimeout(t) }, [load])

  function openCreate() {
    setEditing(null)
    setForm({ name: '', category: 'General', price: 0, costPrice: 0, stockQty: 0, lowStockThreshold: 5 })
    setShowForm(true)
  }

  function openEdit(item: any) {
    setEditing(item)
    setForm({ name: item.name, category: item.category || 'General', price: item.price, costPrice: item.costPrice || 0, stockQty: item.stockQty || 0, lowStockThreshold: item.lowStockThreshold || 5 })
    setShowForm(true)
  }

  async function save(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError('')
    try {
      if (editing) {
        await cafeteriaApi.updateMenuItem(editing._id, form)
      } else {
        await cafeteriaApi.createMenuItem(form)
      }
      setShowForm(false)
      load()
    } catch (err: any) { setError(err?.message || 'Save failed') } finally { setSaving(false) }
  }

  async function remove(id: string) {
    if (!confirm('Delete this item?')) return
    try { await cafeteriaApi.deleteMenuItem(id); load() } catch {}
  }

  async function saveStock() {
    if (!showStock || stockForm.adjustment === 0) return
    try {
      await cafeteriaApi.adjustStock(showStock._id, stockForm)
      setShowStock(null)
      setStockForm({ adjustment: 0, reason: '' })
      load()
    } catch {}
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-slate-100">Menu Items</h1>
          <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">Manage cafeteria menu and inventory</p>
        </div>
        <button onClick={openCreate} className="flex items-center gap-2 rounded-xl bg-orange-600 px-5 py-2.5 text-sm font-bold text-white shadow-sm shadow-orange-600/20 transition-all hover:bg-orange-700 hover:shadow-md active:scale-[0.98]">
          <Plus className="h-4 w-4" /> Add Item
        </button>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search items..."
          className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-4 text-sm shadow-sm transition-all focus:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-400/15 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
        />
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-50 dark:border-slate-800/50">
              <th className="px-5 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-slate-400">Name</th>
              <th className="px-5 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-slate-400">Category</th>
              <th className="px-5 py-3 text-right text-[10px] font-bold uppercase tracking-wider text-slate-400">Price</th>
              <th className="px-5 py-3 text-right text-[10px] font-bold uppercase tracking-wider text-slate-400">Cost</th>
              <th className="px-5 py-3 text-right text-[10px] font-bold uppercase tracking-wider text-slate-400">Stock</th>
              <th className="px-5 py-3 text-center text-[10px] font-bold uppercase tracking-wider text-slate-400">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} className="py-10 text-center"><Loader2 className="mx-auto h-5 w-5 animate-spin text-slate-300" /></td></tr>
            ) : items.length === 0 ? (
              <tr><td colSpan={6} className="py-10 text-center text-sm text-slate-400 dark:text-slate-500">No items found</td></tr>
            ) : items.map(item => (
              <tr key={item._id} className="border-b border-slate-50 transition hover:bg-slate-50 dark:border-slate-800/30 dark:hover:bg-slate-800/40">
                <td className="px-5 py-3 font-semibold text-slate-800 dark:text-slate-200">{item.name}</td>
                <td className="px-5 py-3">
                  <span className="inline-flex rounded-full bg-slate-100 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:bg-slate-800 dark:text-slate-400">{item.category}</span>
                </td>
                <td className="px-5 py-3 text-right font-bold text-slate-900 dark:text-slate-100">Rs {Number(item.price).toLocaleString()}</td>
                <td className="px-5 py-3 text-right text-slate-500 dark:text-slate-400">Rs {Number(item.costPrice || 0).toLocaleString()}</td>
                <td className="px-5 py-3 text-right">
                  <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${item.stockQty <= item.lowStockThreshold ? 'bg-amber-50 text-amber-600 dark:bg-amber-950/30 dark:text-amber-400' : 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/20 dark:text-emerald-400'}`}>
                    {item.stockQty}
                    {item.stockQty <= item.lowStockThreshold && <AlertTriangle className="ml-1 h-3 w-3" />}
                  </span>
                </td>
                <td className="px-5 py-3">
                  <div className="flex items-center justify-center gap-1">
                    <button onClick={() => setShowStock(item)} className="flex h-8 w-8 items-center justify-center rounded-lg text-sky-500 transition hover:bg-sky-50 dark:hover:bg-sky-950/20" title="Adjust stock">
                      <PackagePlus className="h-4 w-4" />
                    </button>
                    <button onClick={() => openEdit(item)} className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800" title="Edit">
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button onClick={() => remove(item._id)} className="flex h-8 w-8 items-center justify-center rounded-lg text-red-400 transition hover:bg-red-50 dark:hover:bg-red-950/20" title="Delete">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Item Form Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4" onClick={() => setShowForm(false)}>
          <div className="w-full max-w-md overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-900" onClick={e => e.stopPropagation()}>
            <div className="border-b border-slate-50 px-6 py-4 dark:border-slate-800/50">
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">{editing ? 'Edit Item' : 'Add Menu Item'}</h3>
            </div>
            <div className="px-6 py-4">
              {error && <div className="mb-4 rounded-xl bg-red-50 px-3.5 py-2.5 text-sm font-semibold text-red-600 dark:bg-red-950/20 dark:text-red-400">{error}</div>}
              <form onSubmit={save} className="space-y-3">
                <div>
                  <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-slate-400">Name</label>
                  <input type="text" required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm transition-all focus:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-400/15 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100" />
                </div>
                <div>
                  <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-slate-400">Category</label>
                  <input type="text" value={form.category} onChange={e => setForm({ ...form, category: e.target.value })} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm transition-all focus:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-400/15 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-slate-400">Price (Rs)</label>
                    <input type="number" step="0.01" required value={form.price} onChange={e => setForm({ ...form, price: Number(e.target.value) })} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm transition-all focus:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-400/15 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100" />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-slate-400">Cost (Rs)</label>
                    <input type="number" step="0.01" value={form.costPrice} onChange={e => setForm({ ...form, costPrice: Number(e.target.value) })} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm transition-all focus:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-400/15 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-slate-400">Stock Qty</label>
                    <input type="number" value={form.stockQty} onChange={e => setForm({ ...form, stockQty: Number(e.target.value) })} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm transition-all focus:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-400/15 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100" />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-slate-400">Low Stock Alert</label>
                    <input type="number" value={form.lowStockThreshold} onChange={e => setForm({ ...form, lowStockThreshold: Number(e.target.value) })} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm transition-all focus:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-400/15 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100" />
                  </div>
                </div>
                <div className="flex gap-3 pt-2">
                  <button type="button" onClick={() => setShowForm(false)} className="flex-1 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800">Cancel</button>
                  <button type="submit" disabled={saving} className="flex-1 rounded-xl bg-orange-600 px-4 py-2.5 text-sm font-bold text-white shadow-sm shadow-orange-600/20 transition-all hover:bg-orange-700 hover:shadow-md disabled:opacity-50">
                    {saving ? 'Saving...' : 'Save'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Stock Adjustment Modal */}
      {showStock && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4" onClick={() => setShowStock(null)}>
          <div className="w-full max-w-sm overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-900" onClick={e => e.stopPropagation()}>
            <div className="border-b border-slate-50 px-6 py-4 dark:border-slate-800/50">
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">Adjust Stock</h3>
              <p className="mt-0.5 text-xs text-slate-400">{showStock.name} — Current: <span className="font-bold text-slate-600">{showStock.stockQty}</span></p>
            </div>
            <div className="px-6 py-4 space-y-3">
              <div>
                <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-slate-400">Adjustment (+/-)</label>
                <input type="number" value={stockForm.adjustment} onChange={e => setStockForm({ ...stockForm, adjustment: Number(e.target.value) })} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm transition-all focus:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-400/15 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100" />
              </div>
              <div>
                <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-slate-400">Reason</label>
                <input type="text" value={stockForm.reason} onChange={e => setStockForm({ ...stockForm, reason: e.target.value })} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm transition-all focus:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-400/15 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100" />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowStock(null)} className="flex-1 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800">Cancel</button>
                <button onClick={saveStock} className="flex-1 rounded-xl bg-sky-600 px-4 py-2.5 text-sm font-bold text-white shadow-sm shadow-sky-600/20 transition-all hover:bg-sky-700 hover:shadow-md">Apply</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
