import { useEffect, useState } from 'react'
import { campApi } from '../../features/camp/camp.api'
import { Plus, Search, Trash2, Edit3 } from 'lucide-react'

export default function Camp_Patients() {
  const [patients, setPatients] = useState<any[]>([])
  const [camps, setCamps] = useState<any[]>([])
  const [q, setQ] = useState('')
  const [campFilter, setCampFilter] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<any>(null)
  const [form, setForm] = useState<any>({ campId: '', tokenNo: '', fullName: '', age: '', gender: '', phone: '', address: '', mrn: '', chiefComplaint: '', vitals: {} })

  const load = async () => {
    const [p, c] = await Promise.all([
      campApi.listPatients({ campId: campFilter, q }),
      campApi.listCamps({ status: 'active' }),
    ])
    setPatients((p as any)?.items || [])
    setCamps((c as any)?.items || [])
  }

  useEffect(() => { load() }, [q, campFilter])

  const resetForm = () => {
    setForm({ campId: '', tokenNo: '', fullName: '', age: '', gender: '', phone: '', address: '', mrn: '', chiefComplaint: '', vitals: {} })
    setEditing(null)
  }

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (editing) {
      await campApi.updatePatient(editing._id, form)
    } else {
      await campApi.createPatient(form)
    }
    setShowForm(false)
    resetForm()
    load()
  }

  const onEdit = (item: any) => {
    setEditing(item)
    setForm({
      campId: item.campId || '',
      tokenNo: item.tokenNo || '',
      fullName: item.fullName || '',
      age: item.age || '',
      gender: item.gender || '',
      phone: item.phone || '',
      address: item.address || '',
      mrn: item.mrn || '',
      chiefComplaint: item.chiefComplaint || '',
      vitals: item.vitals || {},
    })
    setShowForm(true)
  }

  const onDelete = async (id: string) => {
    if (!confirm('Delete this patient record?')) return
    await campApi.deletePatient(id)
    load()
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-slate-900">Camp Patients</h1>
        <button onClick={() => { resetForm(); setShowForm(true) }} className="flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700">
          <Plus className="h-4 w-4" /> Register Patient
        </button>
      </div>

      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search patients..." className="w-full rounded-xl border border-slate-200 bg-white pl-9 pr-4 py-2 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200" />
        </div>
        <select value={campFilter} onChange={e => setCampFilter(e.target.value)} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-emerald-500">
          <option value="">All Camps</option>
          {camps.map((c: any) => <option key={c._id} value={c._id}>{c.name}</option>)}
        </select>
      </div>

      {showForm && (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-800 mb-4">{editing ? 'Edit Patient' : 'Register Patient'}</h2>
          <form onSubmit={onSubmit} className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <select required value={form.campId} onChange={e => setForm({ ...form, campId: e.target.value })} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none focus:border-emerald-500">
              <option value="">Select Camp</option>
              {camps.map((c: any) => <option key={c._id} value={c._id}>{c.name}</option>)}
            </select>
            <input required value={form.tokenNo} onChange={e => setForm({ ...form, tokenNo: e.target.value })} placeholder="Token No" className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none focus:border-emerald-500" />
            <input required value={form.fullName} onChange={e => setForm({ ...form, fullName: e.target.value })} placeholder="Full Name" className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none focus:border-emerald-500" />
            <input value={form.age} onChange={e => setForm({ ...form, age: e.target.value })} placeholder="Age" className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none focus:border-emerald-500" />
            <select value={form.gender} onChange={e => setForm({ ...form, gender: e.target.value })} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none focus:border-emerald-500">
              <option value="">Gender</option>
              <option>Male</option>
              <option>Female</option>
              <option>Other</option>
            </select>
            <input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} placeholder="Phone" className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none focus:border-emerald-500" />
            <input value={form.mrn} onChange={e => setForm({ ...form, mrn: e.target.value })} placeholder="MRN (if known)" className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none focus:border-emerald-500" />
            <input value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} placeholder="Address" className="md:col-span-2 rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none focus:border-emerald-500" />
            <textarea value={form.chiefComplaint} onChange={e => setForm({ ...form, chiefComplaint: e.target.value })} placeholder="Chief Complaint" className="md:col-span-3 rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none focus:border-emerald-500" rows={2} />
            <div className="md:col-span-3 flex gap-2">
              <button type="submit" className="rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-emerald-700">{editing ? 'Update' : 'Register'}</button>
              <button type="button" onClick={() => { setShowForm(false); resetForm() }} className="rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50">Cancel</button>
            </div>
          </form>
        </div>
      )}

      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-slate-500">
            <tr><th className="px-6 py-3 font-medium">Token</th><th className="px-6 py-3 font-medium">Name</th><th className="px-6 py-3 font-medium">Age/Gender</th><th className="px-6 py-3 font-medium">Phone</th><th className="px-6 py-3 font-medium">Complaint</th><th className="px-6 py-3 font-medium text-right">Actions</th></tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {patients.length === 0 ? (
              <tr><td colSpan={6} className="px-6 py-8 text-center text-slate-400">No patients found</td></tr>
            ) : (
              patients.map((p: any) => (
                <tr key={p._id} className="hover:bg-slate-50">
                  <td className="px-6 py-3 font-medium text-slate-800">{p.tokenNo}</td>
                  <td className="px-6 py-3">{p.fullName}</td>
                  <td className="px-6 py-3 text-slate-500">{p.age} / {p.gender}</td>
                  <td className="px-6 py-3 text-slate-500">{p.phone || '-'}</td>
                  <td className="px-6 py-3 text-slate-500 max-w-xs truncate">{p.chiefComplaint || '-'}</td>
                  <td className="px-6 py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button onClick={() => onEdit(p)} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"><Edit3 className="h-4 w-4" /></button>
                      <button onClick={() => onDelete(p._id)} className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600"><Trash2 className="h-4 w-4" /></button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
