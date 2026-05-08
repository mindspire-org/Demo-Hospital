import { useEffect, useMemo, useState } from 'react'
import { Plus, Search, Tag } from 'lucide-react'
import { api } from '../../api'

type Pkg = {
  _id?: string
  name: string
  description?: string
  tests: Array<{ testId: string; testName: string; price: number }>
  price: number
  discountPct: number
  isActive: boolean
}

type Test = { _id: string; name: string; price?: number }

export default function Lab_TestPackages() {
  const [items, setItems] = useState<Pkg[]>([])
  const [tests, setTests] = useState<Test[]>([])
  const [editing, setEditing] = useState<Pkg | null>(null)
  const [q, setQ] = useState('')

  async function load() {
    const [p, t] = await Promise.all([api('/lab/test-packages'), api('/lab/tests?limit=1000')])
    setItems(p.items || [])
    setTests(t.items || [])
  }
  useEffect(() => { load() }, [])

  async function save(p: Pkg) {
    if (p._id) await api(`/lab/test-packages/${p._id}`, { method: 'PUT', body: JSON.stringify(p) })
    else await api('/lab/test-packages', { method: 'POST', body: JSON.stringify(p) })
    setEditing(null); load()
  }
  async function del(id?: string) {
    if (!id || !confirm('Delete this package?')) return
    await api(`/lab/test-packages/${id}`, { method: 'DELETE' })
    load()
  }

  const rows = useMemo(() => {
    const f = q.trim().toLowerCase()
    if (!f) return items
    return items.filter(p => (p.name || '').toLowerCase().includes(f) || (p.description || '').toLowerCase().includes(f) || (p.tests || []).some(t => (t.testName || '').toLowerCase().includes(f)))
  }, [items, q])

  return (
    <div className="space-y-4 p-4 md:p-6">
      {/* Header */}
      <div className="rounded-2xl bg-linear-to-r from-violet-600 via-sky-600 to-emerald-500 p-5 text-white shadow-lg shadow-sky-200/50">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-2xl font-bold">Test Packages</h2>
            <div className="mt-0.5 text-sm text-sky-100">Bundle tests into discounted packages</div>
          </div>
          <button
            onClick={() => setEditing({ name: '', tests: [], price: 0, discountPct: 0, isActive: true })}
            className="inline-flex items-center gap-2 rounded-lg border border-white/30 bg-white/20 px-3 py-2 text-sm font-semibold text-white backdrop-blur-sm hover:bg-white/30"
          >
            <Plus className="h-4 w-4" /> New Package
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-indigo-200 bg-linear-to-br from-indigo-50 to-white p-4 shadow-sm">
          <div className="text-xs font-medium text-indigo-700">Total Packages</div>
          <div className="text-3xl font-extrabold tracking-tight text-indigo-900">{items.length}</div>
        </div>
        <div className="rounded-xl border border-emerald-200 bg-linear-to-br from-emerald-50 to-white p-4 shadow-sm">
          <div className="text-xs font-medium text-emerald-700">Active</div>
          <div className="text-3xl font-extrabold tracking-tight text-emerald-900">{items.filter(x => x.isActive).length}</div>
        </div>
        <div className="rounded-xl border border-slate-200 bg-linear-to-br from-slate-50 to-white p-4 shadow-sm">
          <div className="text-xs font-medium text-slate-700">Tests Catalog</div>
          <div className="text-3xl font-extrabold tracking-tight text-slate-900">{tests.length}</div>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            value={q}
            onChange={e => setQ(e.target.value)}
            placeholder="Search packages, tests, description..."
            className="w-full rounded-md border border-slate-300 py-2 pl-9 pr-3 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
          />
        </div>
        <button onClick={load} className="inline-flex items-center gap-2 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 hover:bg-slate-50">
          Refresh
        </button>
      </div>

      <div className="overflow-auto rounded-xl border border-slate-200 bg-white">
        <table className="w-full text-sm">
          <thead className="border-b-2 border-slate-200 bg-slate-50">
            <tr className="text-left text-xs font-extrabold uppercase tracking-wider text-slate-500">
              <th className="px-4 py-3">Package</th>
              <th className="px-4 py-3">Tests</th>
              <th className="px-4 py-3">Price</th>
              <th className="px-4 py-3">Discount</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {!rows.length && (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-slate-400">No packages found.</td>
              </tr>
            )}
            {rows.map(p => (
              <tr key={p._id} className="hover:bg-slate-50/60">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-50 text-indigo-700 ring-1 ring-indigo-200">
                      <Tag className="h-4 w-4" />
                    </span>
                    <div>
                      <div className="font-semibold text-slate-900">{p.name}</div>
                      {p.description && <div className="text-xs text-slate-500">{p.description}</div>}
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3 text-xs text-slate-600">{p.tests.map(t => t.testName).join(', ')}</td>
                <td className="px-4 py-3 font-semibold text-slate-900">{p.price}</td>
                <td className="px-4 py-3 text-slate-700">{p.discountPct}%</td>
                <td className="px-4 py-3">
                  {p.isActive ? (
                    <span className="inline-flex items-center rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-bold text-emerald-700 ring-1 ring-emerald-200">Active</span>
                  ) : (
                    <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-500 ring-1 ring-slate-200">Inactive</span>
                  )}
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-end gap-2">
                    <button onClick={() => setEditing(p)} className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50">Edit</button>
                    <button onClick={() => del(p._id)} className="rounded-md border border-rose-300 bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-100">Delete</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {editing && <Editor pkg={editing} tests={tests} onClose={() => setEditing(null)} onSave={save} />}
    </div>
  )
}

function Editor({ pkg, tests, onClose, onSave }: { pkg: Pkg; tests: Test[]; onClose: () => void; onSave: (p: Pkg) => void }) {
  const [v, setV] = useState<Pkg>(pkg)
  function toggle(t: Test) {
    const has = v.tests.some(x => x.testId === t._id)
    setV({ ...v, tests: has ? v.tests.filter(x => x.testId !== t._id) : [...v.tests, { testId: t._id, testName: t.name, price: t.price || 0 }] })
  }
  const sum = v.tests.reduce((a, b) => a + (b.price || 0), 0)
  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40">
      <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded bg-white p-4 shadow-xl">
        <h3 className="mb-3 font-semibold">{v._id ? 'Edit' : 'New'} package</h3>
        <div className="grid grid-cols-2 gap-3 text-sm">
          <label className="block"><span className="text-xs">Name *</span><input value={v.name} onChange={e => setV({ ...v, name: e.target.value })} className="w-full rounded border px-2 py-1" /></label>
          <label className="block"><span className="text-xs">Description</span><input value={v.description || ''} onChange={e => setV({ ...v, description: e.target.value })} className="w-full rounded border px-2 py-1" /></label>
          <label className="block"><span className="text-xs">Price (sum: {sum})</span><input type="number" value={v.price} onChange={e => setV({ ...v, price: Number(e.target.value) })} className="w-full rounded border px-2 py-1" /></label>
          <label className="block"><span className="text-xs">Discount %</span><input type="number" value={v.discountPct} onChange={e => setV({ ...v, discountPct: Number(e.target.value) })} className="w-full rounded border px-2 py-1" /></label>
          <label className="col-span-2 flex items-center gap-2"><input type="checkbox" checked={v.isActive} onChange={e => setV({ ...v, isActive: e.target.checked })} /> Active</label>
        </div>
        <div className="mt-3">
          <div className="mb-1 text-xs font-semibold">Tests in this package ({v.tests.length})</div>
          <div className="max-h-72 overflow-auto rounded border">
            <table className="w-full text-sm">
              <tbody>
                {tests.map(t => {
                  const sel = v.tests.some(x => x.testId === t._id)
                  return (
                    <tr key={t._id} className={`cursor-pointer ${sel ? 'bg-emerald-50' : ''}`} onClick={() => toggle(t)}>
                      <td className="w-8 px-2 py-1"><input type="checkbox" readOnly checked={sel} /></td>
                      <td className="px-2 py-1">{t.name}</td>
                      <td className="px-2 py-1 text-right">{t.price || 0}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <button onClick={() => onSave(v)} className="rounded bg-blue-700 px-4 py-1.5 text-sm text-white">Save</button>
          <button onClick={onClose} className="rounded border px-4 py-1.5 text-sm">Close</button>
        </div>
      </div>
    </div>
  )
}
