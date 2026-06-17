import { useEffect, useMemo, useRef, useState } from 'react'
import { labApi } from '../../utils/api'
import Toast, { type ToastState } from '../../components/ui/Toast'
import { 
  Pencil, 
  Trash2, 
  X, 
  Save, 
  ChevronLeft, 
  ChevronRight, 
  Search, 
  Download, 
  Upload, 
  ArrowUpDown, 
  ArrowUp, 
  ArrowDown,
  Users,
  UserPlus,
  Baby,
  CalendarDays,
  RefreshCw,
  Filter
} from 'lucide-react'

type PatientRow = {
  _id: string
  mrn: string
  fullName: string
  fatherName?: string
  phoneNormalized?: string
  cnicNormalized?: string
  gender?: string
  age?: string
  guardianRel?: string
  address?: string
  createdAtIso?: string
}

type SortDir = 'asc' | 'desc' | null
type SortKey = keyof PatientRow

export default function Hospital_Patients() {
  const [patients, setPatients] = useState<PatientRow[]>([])
  const [loading, setLoading] = useState(false)
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)
  const [limit, setLimit] = useState<number>(50)
  const [toast, setToast] = useState<ToastState>(null)

  // Sort state
  const [sortKey, setSortKey] = useState<SortKey | null>(null)
  const [sortDir, setSortDir] = useState<SortDir>(null)

  // Import state
  const [importing, setImporting] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Edit modal state
  const [editOpen, setEditOpen] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState({
    fullName: '',
    fatherName: '',
    phone: '',
    cnic: '',
    gender: '',
    age: '',
    address: '',
  })

  // Delete confirm state
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [deleteName, setDeleteName] = useState('')

  // Widget states
  const [stats, setStats] = useState({
    total: 0,
    male: 0,
    female: 0,
    today: 0
  })

  async function load() {
    setLoading(true)
    try {
      const res = await labApi.listPatients({ search: search || undefined, page, limit: limit || undefined }) as any
      setPatients(res.items || [])
      setTotal(res.total || 0)
      setTotalPages(res.totalPages || 1)
      
      // Derive simple stats from current page for widgets (or could fetch from a real stats API if available)
      // For total count, we use the 'total' from response
      const todayIso = new Date().toISOString().split('T')[0]
      const items = res.items || []
      setStats({
        total: res.total || 0,
        male: items.filter((p: any) => p.gender?.toLowerCase() === 'male').length,
        female: items.filter((p: any) => p.gender?.toLowerCase() === 'female').length,
        today: items.filter((p: any) => p.createdAtIso?.startsWith(todayIso)).length
      })
    } catch (e: any) {
      setToast({ type: 'error', message: e?.message || 'Failed to load patients' })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [page, limit])

  function handleSearch() {
    setPage(1)
    setTimeout(() => load(), 0)
  }

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      if (sortDir === 'asc') setSortDir('desc')
      else if (sortDir === 'desc') { setSortKey(null); setSortDir(null) }
    } else {
      setSortKey(key)
      setSortDir('asc')
    }
  }

  const sorted = (() => {
    if (!sortKey || !sortDir) return patients
    return [...patients].sort((a, b) => {
      const va = (a[sortKey] ?? '').toString().toLowerCase()
      const vb = (b[sortKey] ?? '').toString().toLowerCase()
      return sortDir === 'asc' ? va.localeCompare(vb) : vb.localeCompare(va)
    })
  })()

  async function handleExport() {
    try {
      await labApi.exportPatientsCsv()
      setToast({ type: 'success', message: 'CSV exported' })
    } catch (e: any) {
      setToast({ type: 'error', message: e?.message || 'Export failed' })
    }
  }

  async function handleImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setImporting(true)
    try {
      const text = await file.text()
      const res = await labApi.importPatientsCsv(text) as any
      setToast({ type: 'success', message: `Imported: ${res.inserted}, Skipped (duplicates): ${res.skipped}${res.errors?.length ? ', Errors: ' + res.errors.length : ''}` })
      await load()
    } catch (err: any) {
      setToast({ type: 'error', message: err?.message || 'Import failed' })
    } finally {
      setImporting(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  function openEdit(p: PatientRow) {
    setEditId(p._id)
    setEditForm({
      fullName: p.fullName || '',
      fatherName: p.fatherName || '',
      phone: p.phoneNormalized || '',
      cnic: p.cnicNormalized || '',
      gender: p.gender || '',
      age: p.age || '',
      address: p.address || '',
    })
    setEditOpen(true)
  }

  async function saveEdit() {
    if (!editId) return
    try {
      await labApi.updatePatient(editId, {
        fullName: editForm.fullName,
        fatherName: editForm.fatherName,
        phone: editForm.phone,
        cnic: editForm.cnic,
        gender: editForm.gender,
        age: editForm.age,
        address: editForm.address,
      })
      setEditOpen(false)
      setToast({ type: 'success', message: 'Patient updated' })
      await load()
    } catch (e: any) {
      setToast({ type: 'error', message: e?.message || 'Failed to update patient' })
    }
  }

  function openDelete(id: string, name: string) {
    setDeleteId(id)
    setDeleteName(name)
    setDeleteOpen(true)
  }

  async function confirmDelete() {
    if (!deleteId) return
    setDeleteOpen(false)
    try {
      await labApi.deletePatient(deleteId)
      setToast({ type: 'success', message: 'Patient deleted' })
      await load()
    } catch (e: any) {
      setToast({ type: 'error', message: e?.message || 'Failed to delete patient' })
    }
  }

  return (
    <div className="space-y-6 pb-8 bg-slate-50/50 dark:bg-slate-900/50 -m-6 p-6 min-h-screen">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-extrabold text-slate-900 dark:text-slate-100 tracking-tight">Patients Registry</h2>
          <p className="text-slate-500 dark:text-slate-400 text-sm font-medium mt-1">Manage hospital patient records and registrations</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleExport}
            className="btn-outline-navy flex items-center gap-2 bg-white dark:bg-slate-800"
          >
            <Download className="h-4 w-4" /> Export CSV
          </button>
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={importing}
            className="btn-outline-navy flex items-center gap-2 bg-white dark:bg-slate-800"
          >
            <Upload className="h-4 w-4" /> {importing ? 'Importing...' : 'Import CSV'}
          </button>
          <input ref={fileInputRef} type="file" accept=".csv" onChange={handleImport} className="hidden" />
          <button onClick={() => { setPage(1); load(); }} className="btn-outline-navy flex items-center gap-2 bg-white dark:bg-slate-800">
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} /> Refresh
          </button>
        </div>
      </div>

      {/* Stats Widgets */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: 'Total Patients', value: stats.total, icon: Users, tone: 'from-blue-500 to-blue-600', sub: 'All time' },
          { label: 'New Today', value: stats.today, icon: UserPlus, tone: 'from-emerald-500 to-emerald-600', sub: 'Registrations' },
          { label: 'Male Patients', value: stats.male, icon: Users, tone: 'from-sky-500 to-sky-600', sub: 'Active' },
          { label: 'Female Patients', value: stats.female, icon: Users, tone: 'from-rose-500 to-rose-600', sub: 'Active' },
        ].map((item, idx) => (
          <div key={idx} className={`group relative overflow-hidden rounded-2xl p-4 shadow-sm transition-all hover:shadow-md hover:-translate-y-0.5 bg-gradient-to-br ${item.tone}`}>
            <div className="absolute -right-4 -bottom-4 h-20 w-20 rounded-full bg-white/10" />
            <div className="relative flex items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="text-[10px] font-bold uppercase tracking-widest text-white/70">{item.label}</div>
                <div className="mt-1 text-2xl font-black text-white tabular-nums">{item.value.toLocaleString()}</div>
                <div className="mt-0.5 text-[10px] font-medium text-white/60">{item.sub}</div>
              </div>
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/20 text-white backdrop-blur-sm">
                <item.icon className="h-5 w-5" />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Filter & Search Bar */}
      <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4 shadow-sm">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="relative flex-1">
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleSearch() }}
              placeholder="Search by name, MRN, phone, CNIC..."
              className="w-full bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 rounded-xl pl-10 pr-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 transition-all text-slate-900 dark:text-slate-100"
            />
            <Search className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleSearch}
              className="btn px-6 py-2.5 h-[42px] flex items-center gap-2"
            >
              <Search className="h-4 w-4" /> Search
            </button>
            <div className="h-8 w-px bg-slate-200 dark:bg-slate-700 mx-1 hidden md:block" />
            <select
              value={limit || 'all'}
              onChange={e => {
                const v = e.target.value
                setLimit(v === 'all' ? 0 : Number(v))
                setPage(1)
              }}
              className="bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-200 focus:ring-2 focus:ring-blue-500 transition-all appearance-none pr-10 relative"
              style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' fill=\'none\' viewBox=\'0 0 24 24\' stroke=\'currentColor\'%3E%3Cpath stroke-linecap=\'round\' stroke-linejoin=\'round\' stroke-width=\'2\' d=\'M19 9l-7 7-7-7\'/%3E%3C/svg%3E")', backgroundRepeat: 'no-repeat', backgroundPosition: 'right 0.75rem center', backgroundSize: '1rem' }}
            >
              <option value={50}>50 / page</option>
              <option value={100}>100 / page</option>
              <option value={200}>200 / page</option>
              <option value="all">Show All</option>
            </select>
          </div>
        </div>
      </div>

      {/* Data Table */}
      <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-sm overflow-hidden transition-all">
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead>
              <tr className="bg-slate-50/80 dark:bg-slate-900/50 border-b border-slate-100 dark:border-slate-700">
                <th className="px-6 py-4 text-[11px] font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400">SR.NO</th>
                {([
                  ['mrn', 'MRN'],
                  ['fullName', 'Patient Name'],
                  ['phoneNormalized', 'Phone'],
                  ['cnicNormalized', 'CNIC'],
                  ['gender', 'Gender'],
                  ['age', 'Age'],
                  ['address', 'Address'],
                ] as [SortKey, string][]).map(([key, label]) => (
                  <th
                    key={key}
                    onClick={() => toggleSort(key)}
                    className="px-6 py-4 text-[11px] font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400 cursor-pointer select-none hover:bg-slate-100/50 dark:hover:bg-slate-900/50 transition-colors"
                  >
                    <div className="flex items-center gap-1.5">
                      {label}
                      {sortKey === key ? (
                        sortDir === 'asc' ? <ArrowUp className="h-3 w-3 text-blue-500" /> : <ArrowDown className="h-3 w-3 text-blue-500" />
                      ) : (
                        <ArrowUpDown className="h-3 w-3 opacity-20" />
                      )}
                    </div>
                  </th>
                ))}
                <th className="px-6 py-4 text-[11px] font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 dark:divide-slate-700">
              {loading && patients.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-6 py-12 text-center">
                    <div className="flex flex-col items-center gap-2">
                      <RefreshCw className="h-8 w-8 text-blue-500 animate-spin" />
                      <span className="text-slate-400 font-medium">Fetching patients...</span>
                    </div>
                  </td>
                </tr>
              ) : sorted.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-6 py-12 text-center">
                    <div className="flex flex-col items-center gap-2">
                      <Search className="h-8 w-8 text-slate-200" />
                      <span className="text-slate-400 font-medium">No patients found matching your search</span>
                    </div>
                  </td>
                </tr>
              ) : sorted.map((p, idx) => (
                <tr key={p._id} className="group hover:bg-slate-50/50 dark:hover:bg-slate-900/50 transition-colors">
                  <td className="px-6 py-4 text-slate-500 dark:text-slate-500 font-medium">{(page - 1) * (limit || total) + idx + 1}</td>
                  <td className="px-6 py-4">
                    <span className="font-mono text-[11px] font-bold bg-slate-100 dark:bg-slate-700 px-2 py-0.5 rounded text-slate-700 dark:text-slate-300">{p.mrn}</span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-col">
                      <span className="font-bold text-slate-900 dark:text-slate-100 capitalize">{p.fullName}</span>
                      {p.fatherName && <span className="text-[10px] text-slate-400 font-medium">S/O: {p.fatherName}</span>}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-slate-600 dark:text-slate-400 font-medium">{p.phoneNormalized || '—'}</td>
                  <td className="px-6 py-4 text-slate-600 dark:text-slate-400 text-xs">{p.cnicNormalized || '—'}</td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                      p.gender?.toLowerCase() === 'male' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' :
                      p.gender?.toLowerCase() === 'female' ? 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400' :
                      'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-400'
                    }`}>
                      {p.gender || 'Other'}
                    </span>
                  </td>
                  <td className="px-6 py-4 font-bold text-slate-700 dark:text-slate-300">{p.age || '—'}</td>
                  <td className="px-6 py-4 max-w-[180px] truncate text-slate-500 dark:text-slate-400 text-xs" title={p.address}>{p.address || '—'}</td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2 transition-opacity">
                      <button
                        onClick={() => openEdit(p)}
                        className="p-1.5 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 dark:bg-blue-900/20 dark:text-blue-400 transition-colors"
                        title="Edit Patient"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => openDelete(p._id, p.fullName)}
                        className="p-1.5 rounded-lg bg-rose-50 text-rose-600 hover:bg-rose-100 dark:bg-rose-900/20 dark:text-rose-400 transition-colors"
                        title="Delete Patient"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        <div className="px-6 py-4 bg-slate-50/50 dark:bg-slate-900/50 border-t border-slate-100 dark:border-slate-700 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="text-sm text-slate-500 dark:text-slate-400 font-medium">
            {total > 0 ? (
              <>Showing <span className="font-bold text-slate-900 dark:text-slate-100">{(page - 1) * (limit || total) + 1}</span> to <span className="font-bold text-slate-900 dark:text-slate-100">{Math.min(page * (limit || total), total)}</span> of <span className="font-bold text-slate-900 dark:text-slate-100">{total}</span> records</>
            ) : 'No records available'}
          </div>
          {totalPages > 1 && (
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-40 transition-all shadow-sm"
              >
                <ChevronLeft className="h-4 w-4" /> Prev
              </button>
              <div className="px-4 py-1.5 bg-blue-600 text-white rounded-xl text-sm font-bold shadow-md">
                Page {page} of {totalPages}
              </div>
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-40 transition-all shadow-sm"
              >
                Next <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Edit Modal */}
      {editOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-lg rounded-lg bg-white p-5 shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <div className="text-base font-semibold text-slate-800">Edit Patient</div>
              <button onClick={() => setEditOpen(false)} className="rounded-md p-1 hover:bg-slate-100">
                <X className="h-4 w-4 text-slate-500" />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600">Full Name</label>
                <input value={editForm.fullName} onChange={e => setEditForm(f => ({ ...f, fullName: e.target.value }))} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600">Father Name</label>
                <input value={editForm.fatherName} onChange={e => setEditForm(f => ({ ...f, fatherName: e.target.value }))} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600">Phone</label>
                <input value={editForm.phone} onChange={e => setEditForm(f => ({ ...f, phone: e.target.value }))} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600">CNIC</label>
                <input value={editForm.cnic} onChange={e => setEditForm(f => ({ ...f, cnic: e.target.value }))} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600">Gender</label>
                <select value={editForm.gender} onChange={e => setEditForm(f => ({ ...f, gender: e.target.value }))} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm">
                  <option value="">Select</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600">Age</label>
                <input value={editForm.age} onChange={e => setEditForm(f => ({ ...f, age: e.target.value }))} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" />
              </div>
              <div className="col-span-2">
                <label className="mb-1 block text-xs font-medium text-slate-600">Address</label>
                <input value={editForm.address} onChange={e => setEditForm(f => ({ ...f, address: e.target.value }))} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" />
              </div>
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <button onClick={() => setEditOpen(false)} className="rounded-md border border-slate-300 px-3 py-1.5 text-sm">Cancel</button>
              <button onClick={saveEdit} className="inline-flex items-center gap-1 rounded-md bg-navy px-3 py-1.5 text-sm font-medium text-white hover:bg-navy-700">
                <Save className="h-3.5 w-3.5" />
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirm Modal */}
      {deleteOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-sm rounded-lg bg-white p-4 shadow-xl">
            <div className="text-base font-semibold text-slate-800">Confirm Delete</div>
            <div className="mt-3 text-sm text-slate-600">
              Are you sure you want to delete patient <span className="font-medium text-slate-800 capitalize">{deleteName}</span>? This action cannot be undone.
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <button onClick={() => setDeleteOpen(false)} className="rounded-md border border-slate-300 px-3 py-1.5 text-sm">Cancel</button>
              <button onClick={confirmDelete} className="rounded-md bg-rose-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-rose-700">Delete</button>
            </div>
          </div>
        </div>
      )}

      <Toast toast={toast} onClose={() => setToast(null)} />
    </div>
  )
}
