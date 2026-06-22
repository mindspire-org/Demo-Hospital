import { useState, useEffect, useCallback } from 'react'
import { Plus, Pencil, Trash2, Search, Tag, TrendingDown } from 'lucide-react'
import { cafeteriaApi } from '../../features/cafeteria'

export default function Cafeteria_Deals() {
  const [deals, setDeals] = useState<any[]>([])
  const [menuItems, setMenuItems] = useState<any[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<any>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const [form, setForm] = useState({
    name: '',
    description: '',
    category: 'Combo',
    dealPrice: 0,
    active: true,
    validFrom: '',
    validTo: '',
    items: [] as { menuItemId: string; name: string; qty: number; originalPrice: number }[],
  })

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [r, m] = await Promise.all([
        cafeteriaApi.listDeals({ q: search }),
        cafeteriaApi.listMenuItems({ limit: 500 }),
      ])
      setDeals(r?.items || [])
      setMenuItems((m?.items || []).filter((i: any) => i.active))
    } catch {} finally { setLoading(false) }
  }, [search])

  useEffect(() => { const t = setTimeout(load, 300); return () => clearTimeout(t) }, [load])

  function openCreate() {
    setEditing(null)
    setForm({ name: '', description: '', category: 'Combo', dealPrice: 0, active: true, validFrom: '', validTo: '', items: [] })
    setShowForm(true)
  }

  function openEdit(deal: any) {
    setEditing(deal)
    setForm({
      name: deal.name,
      description: deal.description || '',
      category: deal.category || 'Combo',
      dealPrice: deal.dealPrice,
      active: deal.active,
      validFrom: deal.validFrom || '',
      validTo: deal.validTo || '',
      items: (deal.items || []).map((i: any) => ({ menuItemId: String(i.menuItemId || ''), name: i.name, qty: i.qty, originalPrice: i.originalPrice })),
    })
    setShowForm(true)
  }

  function addItemToDeal() {
    setForm(prev => ({ ...prev, items: [...prev.items, { menuItemId: '', name: '', qty: 1, originalPrice: 0 }] }))
  }

  function updateDealItem(idx: number, field: string, value: any) {
    setForm(prev => {
      const items = [...prev.items]
      items[idx] = { ...items[idx], [field]: value }
      if (field === 'menuItemId') {
        const mi = menuItems.find((m: any) => String(m._id) === value)
        if (mi) {
          items[idx].name = mi.name
          items[idx].originalPrice = Number(mi.price)
        }
      }
      return { ...prev, items }
    })
  }

  function removeDealItem(idx: number) {
    setForm(prev => ({ ...prev, items: prev.items.filter((_, i) => i !== idx) }))
  }

  const originalTotal = form.items.reduce((s, i) => s + i.originalPrice * i.qty, 0)
  const savings = originalTotal - form.dealPrice

  async function save(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name || !form.dealPrice) return
    if (form.items.length === 0) { setError('Add at least one item'); return }
    setSaving(true)
    setError('')
    try {
      if (editing) {
        await cafeteriaApi.updateDeal(editing._id, form)
      } else {
        await cafeteriaApi.createDeal(form)
      }
      setShowForm(false)
      load()
    } catch (err: any) { setError(err?.message || 'Save failed') } finally { setSaving(false) }
  }

  async function remove(id: string) {
    if (!confirm('Delete this deal?')) return
    try { await cafeteriaApi.deleteDeal(id); load() } catch {}
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-slate-100">Deals & Combos</h1>
          <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">Create and manage special offers</p>
        </div>
        <button onClick={openCreate} className="flex items-center gap-2 rounded-xl bg-orange-600 px-5 py-2.5 text-sm font-bold text-white shadow-sm shadow-orange-600/20 transition-all hover:bg-orange-700 hover:shadow-md active:scale-[0.98]">
          <Plus className="h-4 w-4" /> New Deal
        </button>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
        <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search deals..." className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-4 text-sm shadow-sm transition-all focus:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-400/15 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100" />
      </div>

      {loading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-40 animate-pulse rounded-2xl border border-slate-100 bg-slate-50 dark:border-slate-800 dark:bg-slate-800" />
          ))}
        </div>
      ) : deals.length === 0 ? (
        <div className="flex h-64 flex-col items-center justify-center text-center">
          <Tag className="h-10 w-10 text-slate-200 dark:text-slate-700" />
          <p className="mt-3 text-sm font-medium text-slate-400 dark:text-slate-500">No deals yet</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {deals.map(deal => (
            <div key={deal._id} className="group relative overflow-hidden rounded-2xl border border-slate-100 bg-white p-5 shadow-sm transition-all hover:shadow-lg dark:border-slate-800 dark:bg-slate-900">
              <div className="absolute right-0 top-0 h-20 w-20 -translate-y-6 translate-x-6 rounded-full bg-linear-to-br from-orange-500 to-amber-500 opacity-10 blur-2xl" />
              <div className="relative">
                <div className="flex items-start justify-between">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400">
                    <Tag className="h-5 w-5" />
                  </div>
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${deal.active ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/20 dark:text-emerald-400' : 'bg-slate-100 text-slate-400 dark:bg-slate-800'}`}>
                    {deal.active ? 'Active' : 'Inactive'}
                  </span>
                </div>
                <h3 className="mt-3 text-sm font-bold text-slate-800 dark:text-slate-200">{deal.name}</h3>
                {deal.description && <p className="mt-0.5 text-xs text-slate-400">{deal.description}</p>}
                <div className="mt-3 flex flex-wrap gap-1">
                  {deal.items?.slice(0, 3).map((it: any, i: number) => (
                    <span key={i} className="rounded-lg bg-slate-50 px-2 py-0.5 text-[10px] font-medium text-slate-500 dark:bg-slate-800 dark:text-slate-400">{it.name} x{it.qty}</span>
                  ))}
                  {deal.items?.length > 3 && <span className="rounded-lg bg-slate-50 px-2 py-0.5 text-[10px] font-medium text-slate-400 dark:bg-slate-800">+{deal.items.length - 3} more</span>}
                </div>
                <div className="mt-4 flex items-end justify-between">
                  <div>
                    <p className="text-xl font-extrabold text-orange-600 dark:text-orange-400">Rs {Number(deal.dealPrice).toLocaleString()}</p>
                    {deal.originalTotal > deal.dealPrice && (
                      <p className="text-[10px] font-semibold text-slate-400 line-through">Rs {Number(deal.originalTotal).toLocaleString()}</p>
                    )}
                  </div>
                  {deal.savings > 0 && (
                    <span className="flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-600 dark:bg-emerald-950/20 dark:text-emerald-400">
                      <TrendingDown className="h-3 w-3" /> Save Rs {Number(deal.savings).toLocaleString()}
                    </span>
                  )}
                </div>
                <div className="mt-4 flex items-center gap-1 border-t border-slate-50 pt-3 dark:border-slate-800/50">
                  <button onClick={() => openEdit(deal)} className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800">
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button onClick={() => remove(deal._id)} className="flex h-8 w-8 items-center justify-center rounded-lg text-red-400 transition hover:bg-red-50 dark:hover:bg-red-950/20">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4" onClick={() => setShowForm(false)}>
          <div className="w-full max-w-lg overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-900" onClick={e => e.stopPropagation()}>
            <div className="border-b border-slate-50 px-6 py-4 dark:border-slate-800/50">
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">{editing ? 'Edit Deal' : 'New Deal / Combo'}</h3>
            </div>
            <div className="max-h-[70vh] overflow-y-auto px-6 py-4">
              {error && <div className="mb-4 rounded-xl bg-red-50 px-3.5 py-2.5 text-sm font-semibold text-red-600 dark:bg-red-950/20 dark:text-red-400">{error}</div>}
              <form onSubmit={save} className="space-y-3">
                <div>
                  <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-slate-400">Deal Name</label>
                  <input type="text" required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm transition-all focus:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-400/15 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100" />
                </div>
                <div>
                  <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-slate-400">Description</label>
                  <input type="text" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm transition-all focus:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-400/15 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-slate-400">Deal Price (Rs)</label>
                    <input type="number" step="0.01" required value={form.dealPrice} onChange={e => setForm({ ...form, dealPrice: Number(e.target.value) })} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm transition-all focus:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-400/15 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100" />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-slate-400">Category</label>
                    <input type="text" value={form.category} onChange={e => setForm({ ...form, category: e.target.value })} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm transition-all focus:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-400/15 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100" />
                  </div>
                </div>

                <div className="rounded-xl border border-slate-100 p-3 dark:border-slate-800/50">
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Items in Deal</span>
                    <button type="button" onClick={addItemToDeal} className="flex items-center gap-1 rounded-lg bg-orange-50 px-2 py-1 text-[10px] font-bold text-orange-600 transition hover:bg-orange-100 dark:bg-orange-950/20 dark:text-orange-400">
                      <Plus className="h-3 w-3" /> Add Item
                    </button>
                  </div>
                  {form.items.length === 0 ? (
                    <p className="py-3 text-center text-xs text-slate-400">No items added yet</p>
                  ) : (
                    <div className="space-y-2">
                      {form.items.map((it, idx) => (
                        <div key={idx} className="flex items-center gap-2">
                          <select value={it.menuItemId} onChange={e => updateDealItem(idx, 'menuItemId', e.target.value)} className="flex-1 rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs dark:border-slate-700 dark:bg-slate-800">
                            <option value="">Select item</option>
                            {menuItems.map((mi: any) => <option key={mi._id} value={mi._id}>{mi.name} (Rs {mi.price})</option>)}
                          </select>
                          <input type="number" min="1" value={it.qty} onChange={e => updateDealItem(idx, 'qty', Number(e.target.value))} className="w-14 rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-center text-xs dark:border-slate-700 dark:bg-slate-800" placeholder="Qty" />
                          <button type="button" onClick={() => removeDealItem(idx)} className="flex h-7 w-7 items-center justify-center rounded-lg text-red-400 transition hover:bg-red-50 dark:hover:bg-red-950/20">
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      ))}
                      {originalTotal > 0 && (
                        <div className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 text-xs dark:bg-slate-800/50">
                          <span className="font-medium text-slate-500">Original: Rs {originalTotal.toLocaleString()}</span>
                          {savings > 0 && <span className="font-bold text-emerald-600 dark:text-emerald-400">Save: Rs {savings.toLocaleString()}</span>}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-3">
                  <button type="button" onClick={() => setForm({ ...form, active: !form.active })} className={`relative h-6 w-11 rounded-full transition-colors ${form.active ? 'bg-orange-600' : 'bg-slate-300 dark:bg-slate-700'}`} role="switch" aria-checked={form.active}>
                    <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${form.active ? 'translate-x-5' : 'translate-x-0.5'}`} />
                  </button>
                  <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">Active</span>
                </div>

                <div className="flex gap-3 pt-2">
                  <button type="button" onClick={() => setShowForm(false)} className="flex-1 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800">Cancel</button>
                  <button type="submit" disabled={saving} className="flex-1 rounded-xl bg-orange-600 px-4 py-2.5 text-sm font-bold text-white shadow-sm shadow-orange-600/20 transition-all hover:bg-orange-700 hover:shadow-md disabled:opacity-50">
                    {saving ? 'Saving...' : 'Save Deal'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
