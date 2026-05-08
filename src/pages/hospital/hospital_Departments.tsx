import { useEffect, useState } from 'react'
import { hospitalApi } from '../../utils/api'
import Toast, { type ToastState } from '../../components/ui/Toast'
import { Building2, Search, Plus, Pencil, Trash2, FileSpreadsheet, ChevronLeft, ChevronRight, X, Stethoscope, DollarSign, CalendarDays, Filter } from 'lucide-react'

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
      const res: any = await hospitalApi.listDepartments()
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
    <div className="min-h-screen bg-slate-50/50 p-4 transition-colors duration-300 dark:bg-slate-950 lg:p-8">
      {/* Header */}
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-lg shadow-indigo-500/20">
            <Building2 className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-2xl font-black tracking-tight text-slate-800 dark:text-white">Departments</h1>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">{total} departments registered</p>
          </div>
        </div>
        <button onClick={openAdd} className="flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-xs font-black uppercase tracking-widest text-white shadow-lg shadow-indigo-500/20 hover:bg-indigo-700 transition-colors">
          <Plus className="h-4 w-4" /> Add Department
        </button>
      </div>

      {/* Filters & Search */}
      <div className="mb-6 rounded-2xl border border-slate-100 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-4 border-b border-slate-50 pb-4 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-indigo-600" />
            <span className="text-xs font-black uppercase tracking-widest text-slate-800 dark:text-white">Filters & Search</span>
          </div>
          <button onClick={exportCSV} className="flex items-center gap-2 rounded-lg bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-600 hover:bg-emerald-100 dark:bg-emerald-900/20">
            <FileSpreadsheet className="h-3.5 w-3.5" /> Export CSV
          </button>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-4">
          <div className="space-y-1">
            <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">From Date</label>
            <input type="date" value={from} onChange={e=>handleFromChange(e.target.value)} className="w-full rounded-xl border border-slate-100 bg-slate-50/50 px-3 py-2 text-sm font-semibold outline-none focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-800 dark:bg-slate-800/50" />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">To Date</label>
            <input type="date" value={to} onChange={e=>handleToChange(e.target.value)} className="w-full rounded-xl border border-slate-100 bg-slate-50/50 px-3 py-2 text-sm font-semibold outline-none focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-800 dark:bg-slate-800/50" />
          </div>
          <div className="space-y-1 sm:col-span-2">
            <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Search</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input value={query} onChange={e=>handleSearch(e.target.value)} placeholder="Search departments..." className="w-full rounded-xl border border-slate-100 bg-slate-50/50 py-2.5 pl-10 pr-4 text-sm font-semibold outline-none focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-800 dark:bg-slate-800/50" />
            </div>
          </div>
        </div>
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-20">
          <div className="flex flex-col items-center gap-3">
            <div className="h-10 w-10 animate-spin rounded-full border-2 border-indigo-200 border-t-indigo-600" />
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Loading departments...</p>
          </div>
        </div>
      )}

      {/* Department Cards Grid */}
      {!loading && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.length === 0 ? (
            <div className="col-span-full flex flex-col items-center justify-center py-20 text-slate-400">
              <Building2 className="h-12 w-12 opacity-10" />
              <p className="mt-2 text-sm font-bold">No departments found</p>
            </div>
          ) : (
            items.map(dep => (
              <div key={dep.id} className="group relative overflow-hidden rounded-2xl border border-slate-100 bg-white p-5 shadow-sm transition-all duration-200 hover:shadow-md dark:border-slate-800 dark:bg-slate-900">
                {/* Decorative accent */}
                <div className="absolute -right-4 -top-4 h-20 w-20 rounded-full bg-indigo-50 opacity-50 dark:bg-indigo-900/20" />
                
                <div className="relative flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-indigo-600/10">
                      <Building2 className="h-5 w-5 text-indigo-600" />
                    </div>
                    <div>
                      <h3 className="text-base font-black text-slate-800 dark:text-white">{dep.name}</h3>
                      <div className="flex items-center gap-2 mt-0.5">
                        <CalendarDays className="h-3 w-3 text-slate-400" />
                        <span className="text-[10px] font-bold text-slate-400">{dep.createdAt}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-1.5">
                    <button onClick={()=>openEdit(dep.id)} title="Edit" className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-50 text-slate-500 transition-colors hover:bg-indigo-50 hover:text-indigo-600 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-indigo-900/30">
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    <button onClick={()=>setDeleteId(dep.id)} title="Delete" className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-50 text-slate-500 transition-colors hover:bg-rose-50 hover:text-rose-600 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-rose-900/30">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>

                {dep.description && (
                  <p className="relative mt-3 text-sm font-medium text-slate-500 dark:text-slate-400">{dep.description}</p>
                )}

                {/* Fee info */}
                <div className="relative mt-4 flex flex-wrap items-center gap-4 border-t border-slate-50 pt-3 dark:border-slate-800">
                  <div className="flex items-center gap-1.5">
                    <DollarSign className="h-3.5 w-3.5 text-emerald-500" />
                    <span className="text-xs font-bold text-slate-600 dark:text-slate-300">Base Fee: <span className="text-emerald-600">Rs {dep.baseFee ?? 0}</span></span>
                  </div>
                  {dep.doctorFees && dep.doctorFees.length > 0 && (
                    <div className="flex items-center gap-1.5">
                      <Stethoscope className="h-3.5 w-3.5 text-violet-500" />
                      <span className="text-xs font-bold text-slate-600 dark:text-slate-300">{dep.doctorFees.length} doctor price{dep.doctorFees.length > 1 ? 's' : ''}</span>
                    </div>
                  )}
                  {dep.name.toLowerCase() === 'emergency' && (
                    <div className="flex items-center gap-1.5 ml-auto rounded-lg bg-amber-50 px-2.5 py-1 dark:bg-amber-900/20">
                      <DollarSign className="h-3.5 w-3.5 text-amber-600" />
                      <span className="text-xs font-black text-amber-700 dark:text-amber-400">Total: Rs {(dep.baseFee ?? 0) + (dep.doctorFees?.reduce((sum, d) => sum + d.price, 0) ?? 0)}</span>
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Pagination */}
      <div className="mt-6 flex items-center justify-between rounded-2xl border border-slate-100 bg-white px-6 py-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-black uppercase tracking-widest text-slate-400">Show</span>
            <select value={limit} onChange={(e) => { setLimit(Number(e.target.value)); setPage(1); }} className="rounded-xl border border-slate-200 bg-white px-3 py-1 text-xs font-bold outline-none focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-700 dark:bg-slate-800">
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={50}>50</option>
            </select>
          </div>
          <p className="text-[11px] font-black uppercase tracking-widest text-slate-400">
            {((page - 1) * limit) + 1}–{Math.min(page * limit, total)} of {total}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button disabled={page <= 1} onClick={() => setPage(p => p - 1)} className="flex h-9 w-9 items-center justify-center rounded-xl bg-white text-slate-400 shadow-sm transition-all hover:bg-slate-50 hover:text-slate-600 disabled:opacity-30 dark:bg-slate-800">
            <ChevronLeft className="h-5 w-5" />
          </button>
          <span className="text-xs font-black text-slate-600 dark:text-slate-300">{page} / {totalPages}</span>
          <button disabled={page >= totalPages} onClick={() => setPage(p => p + 1)} className="flex h-9 w-9 items-center justify-center rounded-xl bg-white text-slate-400 shadow-sm transition-all hover:bg-slate-50 hover:text-slate-600 disabled:opacity-30 dark:bg-slate-800">
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Add Modal */}
      {showAdd && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-black/5 dark:bg-slate-900">
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4 dark:border-slate-800">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-600/10">
                  <Plus className="h-4 w-4 text-indigo-600" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-800 dark:text-white">Add Department</h3>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Create a new department</p>
                </div>
              </div>
              <button onClick={()=>setShowAdd(false)} className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="space-y-4 p-5">
              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Name</label>
                <input value={addForm.name} onChange={e=>setAddForm(f=>({ ...f, name: e.target.value }))} placeholder="Department name" className="w-full rounded-xl border border-slate-100 bg-slate-50/50 px-4 py-2.5 text-sm font-semibold outline-none focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-800 dark:bg-slate-800/50" />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Description</label>
                <textarea value={addForm.description} onChange={e=>setAddForm(f=>({ ...f, description: e.target.value }))} placeholder="Optional description" rows={3} className="w-full rounded-xl border border-slate-100 bg-slate-50/50 px-4 py-2.5 text-sm font-semibold outline-none focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-800 dark:bg-slate-800/50" />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Department Price</label>
                <input type="number" value={addForm.baseFee} onChange={e=>setAddForm(f=>({ ...f, baseFee: e.target.value }))} placeholder="Base price when no doctor selected" className="w-full rounded-xl border border-slate-100 bg-slate-50/50 px-4 py-2.5 text-sm font-semibold outline-none focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-800 dark:bg-slate-800/50" />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Doctor Prices</label>
                <div className="space-y-2">
                  {addForm.doctorFees.map((row, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <select value={row.doctorId} onChange={e=>setAddForm(f=>{ const arr=[...f.doctorFees]; arr[idx]={ ...arr[idx], doctorId: e.target.value }; return { ...f, doctorFees: arr } })} className="flex-1 rounded-xl border border-slate-100 bg-slate-50/50 px-3 py-2 text-sm font-semibold outline-none focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-800 dark:bg-slate-800/50">
                        <option value="">Select doctor</option>
                        {doctors.map(d => (<option key={d.id} value={d.id}>{d.name}</option>))}
                      </select>
                      <input type="number" value={row.price} onChange={e=>setAddForm(f=>{ const arr=[...f.doctorFees]; arr[idx]={ ...arr[idx], price: e.target.value }; return { ...f, doctorFees: arr } })} placeholder="Price" className="w-28 rounded-xl border border-slate-100 bg-slate-50/50 px-3 py-2 text-sm font-semibold outline-none focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-800 dark:bg-slate-800/50" />
                      <button onClick={()=>setAddForm(f=>({ ...f, doctorFees: f.doctorFees.filter((_,i)=>i!==idx) }))} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-50 text-slate-500 hover:bg-rose-50 hover:text-rose-600 dark:bg-slate-800 dark:text-slate-400" title="Remove">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                  <button onClick={()=>setAddForm(f=>({ ...f, doctorFees: [...f.doctorFees, { doctorId: '', price: '' }] }))} className="flex items-center gap-2 rounded-xl border border-dashed border-slate-200 px-4 py-2 text-xs font-bold text-slate-500 hover:bg-slate-50 dark:border-slate-700">
                    <Plus className="h-3.5 w-3.5" /> Add Price
                  </button>
                </div>
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 border-t border-slate-100 px-5 py-4 dark:border-slate-800">
              <button onClick={()=>setShowAdd(false)} className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300">Cancel</button>
              <button onClick={saveAdd} className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-bold text-white hover:bg-indigo-700">Save</button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {editId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-black/5 dark:bg-slate-900">
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4 dark:border-slate-800">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-violet-600/10">
                  <Pencil className="h-4 w-4 text-violet-600" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-800 dark:text-white">Edit Department</h3>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Update department details</p>
                </div>
              </div>
              <button onClick={()=>setEditId(null)} className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="space-y-4 p-5">
              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Name</label>
                <input value={editForm.name} onChange={e=>setEditForm(f=>({ ...f, name: e.target.value }))} className="w-full rounded-xl border border-slate-100 bg-slate-50/50 px-4 py-2.5 text-sm font-semibold outline-none focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-800 dark:bg-slate-800/50" />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Description</label>
                <textarea value={editForm.description} onChange={e=>setEditForm(f=>({ ...f, description: e.target.value }))} rows={3} className="w-full rounded-xl border border-slate-100 bg-slate-50/50 px-4 py-2.5 text-sm font-semibold outline-none focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-800 dark:bg-slate-800/50" />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Department Price</label>
                <input type="number" value={editForm.baseFee} onChange={e=>setEditForm(f=>({ ...f, baseFee: e.target.value }))} className="w-full rounded-xl border border-slate-100 bg-slate-50/50 px-4 py-2.5 text-sm font-semibold outline-none focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-800 dark:bg-slate-800/50" />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Doctor Prices</label>
                <div className="space-y-2">
                  {editForm.doctorFees.map((row, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <select value={row.doctorId} onChange={e=>setEditForm(f=>{ const arr=[...f.doctorFees]; arr[idx]={ ...arr[idx], doctorId: e.target.value }; return { ...f, doctorFees: arr } })} className="flex-1 rounded-xl border border-slate-100 bg-slate-50/50 px-3 py-2 text-sm font-semibold outline-none focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-800 dark:bg-slate-800/50">
                        <option value="">Select doctor</option>
                        {doctors.map(d => (<option key={d.id} value={d.id}>{d.name}</option>))}
                      </select>
                      <input type="number" value={row.price} onChange={e=>setEditForm(f=>{ const arr=[...f.doctorFees]; arr[idx]={ ...arr[idx], price: e.target.value }; return { ...f, doctorFees: arr } })} placeholder="Price" className="w-28 rounded-xl border border-slate-100 bg-slate-50/50 px-3 py-2 text-sm font-semibold outline-none focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-800 dark:bg-slate-800/50" />
                      <button onClick={()=>setEditForm(f=>({ ...f, doctorFees: f.doctorFees.filter((_,i)=>i!==idx) }))} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-50 text-slate-500 hover:bg-rose-50 hover:text-rose-600 dark:bg-slate-800 dark:text-slate-400" title="Remove">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                  <button onClick={()=>setEditForm(f=>({ ...f, doctorFees: [...f.doctorFees, { doctorId: '', price: '' }] }))} className="flex items-center gap-2 rounded-xl border border-dashed border-slate-200 px-4 py-2 text-xs font-bold text-slate-500 hover:bg-slate-50 dark:border-slate-700">
                    <Plus className="h-3.5 w-3.5" /> Add Price
                  </button>
                </div>
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 border-t border-slate-100 px-5 py-4 dark:border-slate-800">
              <button onClick={()=>setEditId(null)} className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300">Cancel</button>
              <button onClick={saveEdit} className="rounded-xl bg-violet-600 px-4 py-2 text-sm font-bold text-white hover:bg-violet-700">Save</button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Modal */}
      {deleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
          <div className="w-full max-w-sm overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-black/5 dark:bg-slate-900">
            <div className="flex items-center gap-3 border-b border-slate-100 px-5 py-4 dark:border-slate-800">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-rose-600/10">
                <Trash2 className="h-4 w-4 text-rose-600" />
              </div>
              <h3 className="text-sm font-black text-slate-800 dark:text-white">Delete Department</h3>
            </div>
            <div className="px-5 py-4 text-sm text-slate-600 dark:text-slate-400">
              Are you sure you want to delete this department? This action cannot be undone.
            </div>
            <div className="flex items-center justify-end gap-2 border-t border-slate-100 px-5 py-4 dark:border-slate-800">
              <button onClick={()=>setDeleteId(null)} className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300">Cancel</button>
              <button onClick={confirmDelete} className="rounded-xl bg-rose-600 px-4 py-2 text-sm font-bold text-white hover:bg-rose-700">Delete</button>
            </div>
          </div>
        </div>
      )}

      <Toast toast={toast} onClose={()=>setToast(null)} />
    </div>
  )
}
