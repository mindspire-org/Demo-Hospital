import { useEffect, useMemo, useRef, useState } from 'react'
import { hospitalApi, ipdApi } from '../../../../utils/api'
import ConfirmDialog from '../../../common/ConfirmDialog'

type RecordItem = { id: string; createdAt?: string; parsed?: any }

export default function Hospital_IpdSurgicalSafetySignOut({ encounterId }: { encounterId: string }) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [items, setItems] = useState<RecordItem[]>([])
  const [open, setOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingData, setEditingData] = useState<any>(null)
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
  const [deleteId, setDeleteId] = useState<string | null>(null)

  const sorted = useMemo(() => {
    return [...items].sort((a, b) => {
      const da = a.createdAt ? new Date(a.createdAt).getTime() : 0
      const db = b.createdAt ? new Date(b.createdAt).getTime() : 0
      return db - da
    })
  }, [items])

  useEffect(() => {
    if (encounterId) void reload()
  }, [encounterId])

  async function reload() {
    setLoading(true)
    setError(null)
    try {
      const res = (await ipdApi.listIpdSurgicalSafety(encounterId, { limit: 200 })) as any
      const rows = (res?.surgicalSafetyRecords || []) as any[]

      const filtered: RecordItem[] = rows
        .filter((n: any) => n?.signOut?.signOutCompletedAt) // Only show completed Sign Out records
        .map((n: any) => ({
          id: String(n?._id || n?.id || Math.random()),
          createdAt: n?.signOut?.signOutCompletedAt || n?.createdAt,
          parsed: n?.signOut || null,
        }))
      setItems(filtered)
    } catch (e: any) {
      setError(e?.message || 'Failed to load records')
    } finally {
      setLoading(false)
    }
  }

  async function save(form: any) {
    setLoading(true)
    setError(null)
    try {
      await ipdApi.createIpdSurgicalSafety(encounterId, {
        signOut: {
          procedureNameRecorded: form.procedureRecorded ? 'Procedure recorded' : '',
          procedureCompleted: form.procedureRecorded,
          instrumentCountCorrect: form.countsComplete,
          spongeCountCorrect: form.countsComplete,
          sharpsCountCorrect: form.countsComplete,
          specimenLabeled: form.specimenLabelled,
          specimenDetails: form.specimenLabelled ? 'Specimen labeled' : '',
          equipmentIssues: form.equipmentProblems,
          keyConcernsForRecovery: form.keyConcerns,
          postOpInstructionsGiven: form.keyConcerns ? true : false,
          signOutCompletedAt: form.date ? new Date(form.date).toISOString() : new Date().toISOString(),
          signOutCompletedBy: form.doctorName,
        },
        surgeonSignature: form.signature,
        status: 'completed',
      })
      setOpen(false)
      await reload()
    } catch (e: any) {
      setError(e?.message || 'Failed to save')
    } finally {
      setLoading(false)
    }
  }

  async function update(form: any) {
    if (!editingId) return
    setLoading(true)
    setError(null)
    try {
      await ipdApi.updateIpdSurgicalSafety(editingId, {
        signOut: {
          procedureNameRecorded: form.procedureRecorded ? 'Procedure recorded' : '',
          procedureCompleted: form.procedureRecorded,
          instrumentSpongeNeedleCountsCorrect: form.countsCorrect,
          specimenLabeled: form.specimenLabeled,
          equipmentProblemsAddressed: form.equipmentProblems,
          recoveryManagementPlanReviewed: form.recoveryPlanReview,
          signOutCompletedAt: form.date ? new Date(form.date).toISOString() : new Date().toISOString(),
          signOutCompletedBy: form.doctorName,
        },
        surgeonSignature: form.signature,
        status: 'sign-out-complete',
      })
      setEditingId(null); setEditingData(null); setOpen(false); await reload()
    } catch (e: any) {
      setError(e?.message || 'Failed to update')
    } finally {
      setLoading(false)
    }
  }

  const remove = (id: string) => { setDeleteId(id); setDeleteConfirmOpen(true) }

  const handleDeleteConfirm = async () => {
    if (!deleteId) return
    setLoading(true)
    try {
      await ipdApi.deleteIpdSurgicalSafety(deleteId)
      await reload()
    } catch (e: any) {
      setError(e?.message || 'Failed to delete')
    } finally {
      setLoading(false)
      setDeleteId(null)
    }
  }

  const startEdit = (it: RecordItem) => {
    setEditingId(it.id)
    setEditingData(it.parsed)
    setOpen(true)
  }

  return (
    <div className="space-y-3">
      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-base font-semibold text-slate-900">Surgical Safety Checklist - Sign Out</div>
            <div className="mt-1 text-sm text-slate-600">Before patient leaves operating room</div>
          </div>
          <button onClick={() => setOpen(true)} className="rounded-md bg-slate-800 px-3 py-2 text-sm font-medium text-white hover:bg-slate-900">Add Form</button>
        </div>

        {error && <div className="mt-3 rounded-md border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">{error}</div>}

        <div className="mt-4 space-y-3">
          {loading && <div className="text-sm text-slate-600">Loading...</div>}
          {!loading && sorted.length === 0 && <div className="text-sm text-slate-600">No records yet.</div>}

          {sorted.map((it) => (
            <div key={it.id} className="rounded-lg border border-slate-200 bg-white p-4">
              <div className="flex items-center justify-between">
                <div className="text-sm font-semibold text-slate-900">Record</div>
                <div className="flex items-center gap-2">
                  <div className="text-xs text-slate-500">{it.createdAt ? new Date(it.createdAt).toLocaleString() : '-'}</div>
                  <div className="flex gap-1">
                    <button onClick={() => startEdit(it)} className="rounded px-2 py-0.5 text-xs text-blue-600 hover:bg-blue-50">Edit</button>
                    <button onClick={() => remove(it.id)} className="rounded px-2 py-0.5 text-xs text-red-600 hover:bg-red-50">Delete</button>
                  </div>
                </div>
              </div>

              {it.parsed ? (
                <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
                  <Field label="Procedure recorded" value={it.parsed?.procedureCompleted ? 'Yes' : 'No'} />
                  <Field label="Instrument/needle/sponge counts complete" value={it.parsed?.instrumentCountCorrect ? 'Yes' : 'No'} />
                  <Field label="Specimen labelled" value={it.parsed?.specimenLabeled ? 'Yes' : 'No'} />
                  <Field label="Any equipment problems" value={it.parsed?.equipmentIssues || '-'} />
                  <Field label="Key concerns for recovery/management" value={it.parsed?.keyConcernsForRecovery || '-'} />
                  <Field label="Doctor Name" value={it.parsed?.signOutCompletedBy} />
                  <Field label="Date" value={it.parsed?.signOutCompletedAt?.slice(0, 10)} />
                </div>
              ) : (
                <div className="mt-3 text-sm text-slate-600">Invalid record data.</div>
              )}
            </div>
          ))}
        </div>
      </div>

      <SignOutDialog key={editingId || 'add'} open={open} onClose={() => { setOpen(false); setEditingId(null); setEditingData(null) }} onSave={editingId ? update : save} initial={editingData} />
      <ConfirmDialog
        open={deleteConfirmOpen}
        title="Delete Record"
        message="Are you sure you want to delete this surgical safety record?"
        onConfirm={() => { handleDeleteConfirm(); setDeleteConfirmOpen(false) }}
        onCancel={() => { setDeleteConfirmOpen(false); setDeleteId(null) }}
      />
    </div>
  )
}

function Field({ label, value }: { label: string; value: any }) {
  return (
    <div className="rounded-md border border-slate-100 bg-slate-50 p-2">
      <div className="text-[11px] font-semibold text-slate-600">{label}</div>
      <div className="mt-1 text-sm text-slate-900">{value || '-'}</div>
    </div>
  )
}

function SignOutDialog({ open, onClose, onSave, initial }: { open: boolean; onClose: () => void; onSave: (d: any) => void; initial?: any }) {
  const [form, setForm] = useState({
    procedureRecorded: false,
    countsCorrect: false,
    specimenLabeled: false,
    equipmentProblems: '',
    keyConcerns: '',
    doctorName: '',
    signature: '',
    date: new Date().toISOString().slice(0, 10),
  })

  useEffect(() => {
    if (open) {
      if (initial) {
        setForm({
          procedureRecorded: !!initial.procedureCompleted,
          countsCorrect: !!initial.instrumentSpongeNeedleCountsCorrect,
          specimenLabeled: !!initial.specimenLabeled,
          equipmentProblems: initial.equipmentProblemsAddressed || '',
          keyConcerns: initial.recoveryManagementPlanReviewed || '',
          doctorName: initial.signOutCompletedBy || '',
          signature: '',
          date: initial.signOutCompletedAt ? initial.signOutCompletedAt.slice(0, 10) : new Date().toISOString().slice(0, 10),
        })
      } else {
        setForm({
          procedureRecorded: false,
          countsCorrect: false,
          specimenLabeled: false,
          equipmentProblems: '',
          keyConcerns: '',
          doctorName: '',
          signature: '',
          date: new Date().toISOString().slice(0, 10),
        })
      }
    }
  }, [open, initial])
  const [doctors, setDoctors] = useState<Array<{ _id: string; name: string }>>([])
  const [doctorSearch, setDoctorSearch] = useState('')
  const [showDoctorDropdown, setShowDoctorDropdown] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const filteredDoctors = doctors.filter(d => d.name.toLowerCase().includes(doctorSearch.toLowerCase()))

  useEffect(() => {
    if (open) {
      setDoctorSearch('')
      setShowDoctorDropdown(false)
      ;(async () => {
        try {
          const res = await hospitalApi.listDoctors() as any
          const items = (res?.doctors || res || []) as Array<{ _id: string; name: string }>
          setDoctors(items)
        } catch {
          setDoctors([])
        }
      })()
    }
  }, [open])

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowDoctorDropdown(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-xl bg-white p-6">
        <h3 className="mb-4 text-lg font-semibold">{initial ? 'Edit Sign Out' : 'Sign Out'}</h3>

        <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
          <div className="text-sm font-semibold text-slate-800">Before patient leaves operating room</div>

          <div className="mt-3 grid grid-cols-1 gap-2 text-sm">
            <Checkbox label="Nurse verbally confirms: name of procedure recorded" checked={form.procedureRecorded} onChange={(v) => setForm({ ...form, procedureRecorded: v })} />
            <Checkbox label="Instrument, sponge and needle counts complete" checked={form.countsCorrect} onChange={(v) => setForm({ ...form, countsCorrect: v })} />
            <Checkbox label="Specimen is labelled (including patient name)" checked={form.specimenLabeled} onChange={(v) => setForm({ ...form, specimenLabeled: v })} />
          </div>

          <div className="mt-4">
            <Textarea label="Any equipment problems to be addressed?" value={form.equipmentProblems} onChange={(v) => setForm({ ...form, equipmentProblems: v })} />
          </div>

          <div className="mt-4">
            <Textarea label="Surgeon, anesthesia professional and nurse review: key concerns for recovery and management" value={form.keyConcerns} onChange={(v) => setForm({ ...form, keyConcerns: v })} />
          </div>

          <div className="mt-4 grid grid-cols-3 gap-4">
            <div ref={dropdownRef} className="relative">
              <label className="mb-1 block text-sm font-medium text-slate-700">Doctor Name</label>
              <input
                type="text"
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                value={form.doctorName || doctorSearch}
                onChange={(e) => { setDoctorSearch(e.target.value); setShowDoctorDropdown(true); setForm({ ...form, doctorName: '' }); }}
                onFocus={() => setShowDoctorDropdown(true)}
                placeholder="Search doctor..."
              />
              {showDoctorDropdown && filteredDoctors.length > 0 && (
                <div className="absolute left-0 right-0 z-10 mt-1 max-h-40 overflow-auto rounded-md border border-slate-300 bg-white shadow-lg">
                  {filteredDoctors.map(d => (
                    <div
                      key={d._id}
                      onClick={() => { setForm({ ...form, doctorName: d.name }); setDoctorSearch(d.name); setShowDoctorDropdown(false); }}
                      className="cursor-pointer px-3 py-2 text-sm hover:bg-slate-100"
                    >
                      {d.name}
                    </div>
                  ))}
                </div>
              )}
            </div>
            <Input label="Signature" value={form.signature} onChange={(v) => setForm({ ...form, signature: v })} />
            <Input label="Date" type="date" value={form.date} onChange={(v) => setForm({ ...form, date: v })} />
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-2">
          <button onClick={onClose} className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">Cancel</button>
          <button onClick={() => onSave(form)} className="rounded-md bg-slate-800 px-4 py-2 text-sm font-medium text-white hover:bg-slate-900">Save</button>
        </div>
      </div>
    </div>
  )
}

function Checkbox({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-center gap-2 text-sm text-slate-800">
      <input type="checkbox" className="h-4 w-4" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span>{label}</span>
    </label>
  )
}

function Input({
  label,
  value,
  onChange,
  placeholder,
  type,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  placeholder?: string
  type?: string
}) {
  return (
    <div>
      <label className="mb-1 block text-sm font-medium text-slate-700">{label}</label>
      <input
        type={type || 'text'}
        className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  )
}

function Textarea({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <label className="mb-1 block text-sm font-medium text-slate-700">{label}</label>
      <textarea className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" rows={3} value={value} onChange={(e) => onChange(e.target.value)} />
    </div>
  )
}
