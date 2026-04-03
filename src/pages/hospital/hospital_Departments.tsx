import { useEffect, useState } from 'react'
import { hospitalApi } from '../../utils/api'
import Toast, { type ToastState } from '../../components/ui/Toast'

type Department = {
  id: string
  name: string
  description?: string
  baseFee?: number
  doctorFees?: Array<{ doctorId: string; price: number }>
  createdAt: string // YYYY-MM-DD
}

export default function Hospital_Departments() {
  const [items, setItems] = useState<Department[]>([])
  const [query, setQuery] = useState('')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(20)
  const [total, setTotal] = useState(0)
  const [totalPages, setTotalPages] = useState(1)
  const [loading, setLoading] = useState(false)
  const [showAdd, setShowAdd] = useState(false)
  const [addForm, setAddForm] = useState({ name: '', description: '', baseFee: '', doctorFees: [] as Array<{ doctorId: string; price: string }> })
  const [editId, setEditId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState({ name: '', description: '', baseFee: '', doctorFees: [] as Array<{ doctorId: string; price: string }> })
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [toast, setToast] = useState<ToastState>(null)

  type DoctorLite = { id: string; name: string }
  const [doctors, setDoctors] = useState<DoctorLite[]>([])
  
  const loadDepartments = async () => {
    setLoading(true)
    try {
      const res: any = await hospitalApi.listDepartments({ 
        page, 
        limit, 
        q: query, 
        from, 
        to 
      })
      const departments = (res.departments || []).map((d: any) => ({
        id: String(d._id || d.id),
        name: d.name,
        description: d.description,
        baseFee: d.opdBaseFee,
        doctorFees: (d.doctorPrices || []).map((p: any) => ({ doctorId: String(p.doctorId), price: Number(p.price)||0 })),
        createdAt: (d.createdAt ? new Date(d.createdAt) : new Date()).toISOString().slice(0,10),
      })) as Department[]
      setItems(departments)
      setTotal(res.total || 0)
      setTotalPages(res.totalPages || 1)
    } catch (err) {
      console.error('Failed to load departments', err)
    } finally {
      setLoading(false)
    }
  }
  
  useEffect(() => {
    let cancelled = false
    async function load(){
      try {
        const docRes = await hospitalApi.listDoctors() as any
        let docs = (docRes.doctors || []).map((r: any) => ({ id: String(r._id || r.id), name: r.name }))
        if (!docs.length){
          try {
            const raw = localStorage.getItem('hospital_doctors')
            if (raw){ const parsed = JSON.parse(raw) as Array<any>; docs = parsed.map(r => ({ id: String(r.id), name: r.name })) }
          } catch {}
        }
        if (!cancelled){ setDoctors(docs) }
      } catch {}
    }
    load()
    return () => { cancelled = true }
  }, [])
  
  useEffect(() => {
    loadDepartments()
  }, [page, limit, query, from, to])

  const openAdd = () => { setAddForm({ name: '', description: '', baseFee: '', doctorFees: [] }); setShowAdd(true) }
  const saveAdd = async () => {
    if (!addForm.name.trim()) return
    const baseFeeNum = Number(addForm.baseFee) || 0
    const doctorPrices = (addForm.doctorFees || [])
      .filter(r => r.doctorId && r.price !== '')
      .map(r => ({ doctorId: r.doctorId, price: Number(r.price) || 0 }))
      .reduce((acc: Array<{ doctorId: string; price: number }>, cur) => { if (!acc.some(x => x.doctorId === cur.doctorId)) acc.push(cur); return acc }, [])
    try {
      await hospitalApi.createDepartment({ name: addForm.name.trim(), description: addForm.description.trim() || undefined, opdBaseFee: baseFeeNum, doctorPrices })
      await loadDepartments()
      setShowAdd(false)
      try { window.dispatchEvent(new CustomEvent('hospital:departments:refresh')) } catch {}
      setToast({ type: 'success', message: 'Saved' })
    } catch (err: any) {
      setToast({ type: 'error', message: err?.message || 'Failed to save' })
    }
  }

  const openEdit = (id: string) => {
    const d = items.find(x => x.id === id)
    if (!d) return
    setEditId(id)
    setEditForm({
      name: d.name,
      description: d.description || '',
      baseFee: d.baseFee != null ? String(d.baseFee) : '',
      doctorFees: (d.doctorFees || []).map(r => ({ doctorId: r.doctorId, price: String(r.price) })),
    })
  }
  const saveEdit = async () => {
    if (!editId) return
    const baseFeeNum = Number(editForm.baseFee) || 0
    const doctorPrices = (editForm.doctorFees || [])
      .filter(r => r.doctorId && r.price !== '')
      .map(r => ({ doctorId: r.doctorId, price: Number(r.price) || 0 }))
      .reduce((acc: Array<{ doctorId: string; price: number }>, cur) => { if (!acc.some(x => x.doctorId === cur.doctorId)) acc.push(cur); return acc }, [])
    try {
      await hospitalApi.updateDepartment(editId, { name: editForm.name.trim() || 'Department', description: editForm.description || undefined, opdBaseFee: baseFeeNum, doctorPrices })
      await loadDepartments()
      setEditId(null)
      try { window.dispatchEvent(new CustomEvent('hospital:departments:refresh')) } catch {}
      setToast({ type: 'success', message: 'Updated' })
    } catch (err: any) {
      setToast({ type: 'error', message: err?.message || 'Failed to update' })
    }
  }

  // Persisting via backend; no localStorage sync

  const confirmDelete = () => {
    if (!deleteId) return
    ;(async()=>{
      try {
        await hospitalApi.deleteDepartment(deleteId)
        await loadDepartments()
        setDeleteId(null)
        try { window.dispatchEvent(new CustomEvent('hospital:departments:refresh')) } catch {}
      } catch (err: any) {
        setToast({ type: 'error', message: err?.message || 'Failed to delete' })
      }
    })()
  }

  const exportCSV = () => {
    const header = ['Name','Description','Created At']
    const lines = [header.join(',')]
    for (const d of items) {
      const row = [d.name, d.description || '', d.createdAt].map(v => typeof v === 'string' && v.includes(',') ? `"${v.replace(/"/g,'""')}"` : String(v))
      lines.push(row.join(','))
    }
    const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `departments-${new Date().toISOString().slice(0,10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }
  
  const handleSearch = (value: string) => {
    setQuery(value)
    setPage(1)
  }
  
  const handleFromChange = (value: string) => {
    setFrom(value)
    setPage(1)
  }
  
  const handleToChange = (value: string) => {
    setTo(value)
    setPage(1)
  }

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-xl font-semibold text-slate-800">Departments</h2>
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <input type="date" value={from} onChange={e=>handleFromChange(e.target.value)} className="rounded-md border border-slate-300 px-2 py-1" />
          <span>to</span>
          <input type="date" value={to} onChange={e=>handleToChange(e.target.value)} className="rounded-md border border-slate-300 px-2 py-1" />
          <button onClick={exportCSV} className="rounded-md border border-slate-300 px-3 py-1.5 hover:bg-slate-50">Export</button>
          <button onClick={openAdd} className="rounded-md bg-sky-600 px-3 py-1.5 text-white hover:bg-sky-700">+ Add Department</button>
        </div>
      </div>

      <div className="mt-4">
        <input
          value={query}
          onChange={e=>handleSearch(e.target.value)}
          placeholder="Search departments..."
          className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-200"
        />
      </div>
      
      {loading && (
        <div className="mt-5 flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-violet-600"></div>
        </div>
      )}

      <div className="mt-5 grid gap-4 md:grid-cols-2">
        {items.map(dep => (
          <div key={dep.id} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">🏥</div>
                  <div className="text-lg font-semibold text-slate-800">{dep.name}</div>
                </div>
                <div className="mt-1 text-xs text-slate-500">{dep.createdAt}</div>
              </div>
              <div className="flex gap-2 text-sm">
                <button onClick={()=>openEdit(dep.id)} title="Edit" className="rounded-md border border-slate-200 px-2 py-1 text-violet-700 hover:bg-violet-50">✏️</button>
                <button onClick={()=>setDeleteId(dep.id)} title="Delete" className="rounded-md border border-slate-200 px-2 py-1 text-rose-700 hover:bg-rose-50">🗑️</button>
              </div>
            </div>
            {dep.description && <p className="mt-2 text-sm text-slate-600">{dep.description}</p>}
          </div>
        ))}
      </div>

      {/* Items per page selector - always visible */}
      <div className="mt-4 flex items-center gap-2 text-sm">
        <span className="text-slate-500">Show:</span>
        <select
          value={limit}
          onChange={(e) => { setLimit(Number(e.target.value)); setPage(1); }}
          className="rounded-md border border-slate-300 bg-white px-2 py-1 text-sm text-slate-700"
        >
          <option value={10}>10 per page</option>
          <option value={20}>20 per page</option>
          <option value={50}>50 per page</option>
        </select>
        <span className="text-slate-500 ml-2">{total} total departments</span>
      </div>

      {/* Pagination navigation - only when multiple pages */}
      {totalPages > 1 && !loading && (
        <div className="mt-3 flex items-center justify-between border-t border-slate-200 bg-slate-50 px-4 py-3 rounded-xl">
          <div className="text-sm text-slate-500">
            Showing {((page - 1) * limit) + 1} to {Math.min(page * limit, total)} of {total} departments
          </div>
          <div className="flex items-center gap-2">
            <button
              disabled={page <= 1}
              onClick={() => setPage(p => p - 1)}
              className="rounded-md border border-slate-300 bg-white px-3 py-1 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50 transition-all"
            >
              Previous
            </button>
            <div className="text-sm font-medium text-slate-700">
              Page {page} of {totalPages}
            </div>
            <button
              disabled={page >= totalPages}
              onClick={() => setPage(p => p + 1)}
              className="rounded-md border border-slate-300 bg-white px-3 py-1 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50 transition-all"
            >
              Next
            </button>
          </div>
        </div>
      )}

      {/* Add Modal */}
      {showAdd && (
        <div className="fixed inset-0 z-20 flex items-center justify-center bg-black/30 p-4">
          <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-5 shadow-lg">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-base font-semibold text-slate-800">Add Department</h3>
                <p className="text-sm text-slate-600">Create a new department.</p>
              </div>
              <button onClick={()=>setShowAdd(false)} className="text-slate-500">✖</button>
            </div>
            <div className="mt-4 space-y-3">
              <div>
                <label className="mb-1 block text-sm text-slate-700">Name</label>
                <input value={addForm.name} onChange={e=>setAddForm(f=>({ ...f, name: e.target.value }))} placeholder="Department name" className="w-full rounded-md border border-slate-300 px-3 py-2 outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-200" />
              </div>
              <div>
                <label className="mb-1 block text-sm text-slate-700">Description</label>
                <textarea value={addForm.description} onChange={e=>setAddForm(f=>({ ...f, description: e.target.value }))} placeholder="Optional description" rows={3} className="w-full rounded-md border border-slate-300 px-3 py-2 outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-200" />
              </div>
              <div>
                <label className="mb-1 block text-sm text-slate-700">Department Price</label>
                <input type="number" value={addForm.baseFee} onChange={e=>setAddForm(f=>({ ...f, baseFee: e.target.value }))} placeholder="Base price when no doctor selected" className="w-full rounded-md border border-slate-300 px-3 py-2 outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-200" />
              </div>
              <div>
                <label className="mb-2 block text-sm text-slate-700">Doctor Prices</label>
                <div className="space-y-2">
                  {addForm.doctorFees.map((row, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <select value={row.doctorId} onChange={e=>setAddForm(f=>{ const arr=[...f.doctorFees]; arr[idx]={ ...arr[idx], doctorId: e.target.value }; return { ...f, doctorFees: arr } })} className="flex-1 rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-200">
                        <option value="">Select doctor</option>
                        {doctors.map(d => (<option key={d.id} value={d.id}>{d.name}</option>))}
                      </select>
                      <input type="number" value={row.price} onChange={e=>setAddForm(f=>{ const arr=[...f.doctorFees]; arr[idx]={ ...arr[idx], price: e.target.value }; return { ...f, doctorFees: arr } })} placeholder="Price" className="w-28 rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-200" />
                      <button onClick={()=>setAddForm(f=>({ ...f, doctorFees: f.doctorFees.filter((_,i)=>i!==idx) }))} className="rounded-md border border-slate-300 px-2 py-2 text-slate-600 hover:bg-slate-50" title="Remove">🗑️</button>
                    </div>
                  ))}
                  <button onClick={()=>setAddForm(f=>({ ...f, doctorFees: [...f.doctorFees, { doctorId: '', price: '' }] }))} className="rounded-md border border-slate-300 px-3 py-1.5 text-sm hover:bg-slate-50">Add Price</button>
                </div>
              </div>
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button onClick={()=>setShowAdd(false)} className="rounded-md border border-slate-300 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50">Cancel</button>
              <button onClick={saveAdd} className="rounded-md bg-sky-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-sky-700">Save</button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {editId && (
        <div className="fixed inset-0 z-20 flex items-center justify-center bg-black/30 p-4">
          <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-5 shadow-lg">
            <h3 className="text-base font-semibold text-slate-800">Edit Department</h3>
            <div className="mt-4 space-y-3">
              <div>
                <label className="mb-1 block text-sm text-slate-700">Name</label>
                <input value={editForm.name} onChange={e=>setEditForm(f=>({ ...f, name: e.target.value }))} className="w-full rounded-md border border-slate-300 px-3 py-2 outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-200" />
              </div>
              <div>
                <label className="mb-1 block text-sm text-slate-700">Description</label>
                <textarea value={editForm.description} onChange={e=>setEditForm(f=>({ ...f, description: e.target.value }))} rows={3} className="w-full rounded-md border border-slate-300 px-3 py-2 outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-200" />
              </div>
              <div>
                <label className="mb-1 block text-sm text-slate-700">Department Price</label>
                <input type="number" value={editForm.baseFee} onChange={e=>setEditForm(f=>({ ...f, baseFee: e.target.value }))} className="w-full rounded-md border border-slate-300 px-3 py-2 outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-200" />
              </div>
              <div>
                <label className="mb-2 block text-sm text-slate-700">Doctor Prices</label>
                <div className="space-y-2">
                  {editForm.doctorFees.map((row, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <select value={row.doctorId} onChange={e=>setEditForm(f=>{ const arr=[...f.doctorFees]; arr[idx]={ ...arr[idx], doctorId: e.target.value }; return { ...f, doctorFees: arr } })} className="flex-1 rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-200">
                        <option value="">Select doctor</option>
                        {doctors.map(d => (<option key={d.id} value={d.id}>{d.name}</option>))}
                      </select>
                      <input type="number" value={row.price} onChange={e=>setEditForm(f=>{ const arr=[...f.doctorFees]; arr[idx]={ ...arr[idx], price: e.target.value }; return { ...f, doctorFees: arr } })} placeholder="Price" className="w-28 rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-200" />
                      <button onClick={()=>setEditForm(f=>({ ...f, doctorFees: f.doctorFees.filter((_,i)=>i!==idx) }))} className="rounded-md border border-slate-300 px-2 py-2 text-slate-600 hover:bg-slate-50" title="Remove">🗑️</button>
                    </div>
                  ))}
                  <button onClick={()=>setEditForm(f=>({ ...f, doctorFees: [...f.doctorFees, { doctorId: '', price: '' }] }))} className="rounded-md border border-slate-300 px-3 py-1.5 text-sm hover:bg-slate-50">Add Price</button>
                </div>
              </div>
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button onClick={()=>setEditId(null)} className="rounded-md border border-slate-300 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50">Cancel</button>
              <button onClick={saveEdit} className="rounded-md bg-violet-700 px-3 py-1.5 text-sm font-medium text-white hover:bg-violet-800">Save</button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Modal */}
      {deleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-sm rounded-xl border border-slate-200 bg-white p-5 shadow-lg">
            <h3 className="text-base font-semibold text-slate-800">Delete Department</h3>
            <p className="mt-2 text-sm text-slate-600">Are you sure you want to delete this department? This action cannot be undone.</p>
            <div className="mt-5 flex justify-end gap-2">
              <button onClick={()=>setDeleteId(null)} className="rounded-md border border-slate-300 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50">Cancel</button>
              <button onClick={confirmDelete} className="rounded-md bg-rose-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-rose-700">Delete</button>
            </div>
          </div>
        </div>
      )}

      <Toast toast={toast} onClose={()=>setToast(null)} />
    </>
  )
}
