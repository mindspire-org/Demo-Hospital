import { Printer } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { ipdApi } from '../../../../features/hospital/ipd'
import ConfirmDialog from '../../../common/ConfirmDialog'

const COLUMNS = [
  { key: 'gloves', label: 'گلووز' },
  { key: 'mask', label: 'ماسک' },
  { key: 'gown', label: 'گاؤن' },
  { key: 'cap', label: 'کپ' },
  { key: 'isolation', label: 'آئسولیشن' },
] as const

type ColumnKey = (typeof COLUMNS)[number]['key']

type ChecklistRow = {
  id: number
  text: string
}

const ROWS: ChecklistRow[] = [
  { id: 1, text: 'کیا مریض کو ڈسچارج سے پہلے اپنی بیماری کی ہسٹری کے بارے میں آگاہ کیا گیا ہے؟' },
  { id: 2, text: 'کیا تمام سٹاف نے ہاتھ دھونے کے اصول صحیح طریقے سے اپنائے؟' },
  { id: 3, text: 'کیا تمام سٹاف نے گلووز دستانے استعمال کئے؟' },
  { id: 4, text: 'کیا کپ/کیپ پہن رکھی ہے؟' },
  { id: 5, text: 'کیا مریض کو آئسولیشن کی ضرورت ہے؟' },
  { id: 6, text: 'کیا مریض کو میسک/ماسک لگا کر صفائی خیال رکھا گیا؟' },
  { id: 7, text: 'کیا مریض کے ساتھ والے اٹینڈنٹ کو میسک/ماسک لگا کر صفائی خیال رکھا گیا؟' },
  { id: 8, text: 'کیا مریض سے ڈائریکٹ رابطے وقت گلووز دستانے استعمال کئے؟' },
  { id: 9, text: 'کیا انفیکشن کنٹرول کے اصولوں پر عمل کیا جا رہا ہے؟' },
  { id: 10, text: 'کیا استعمال شدہ سامان صحیح طریقے سے تلف کیا گیا؟' },
  { id: 11, text: 'کیا کچرا/ویسٹ مناسب ڈبوں میں ڈالا گیا؟' },
  { id: 12, text: 'کیا وارڈ/کمرے کی صفائی روزانہ ہو رہی ہے؟' },
  { id: 13, text: 'کیا مریض سے متعلقہ شخص کو ہدایات دی گئیں؟' },
  { id: 14, text: 'کیا ہاتھ لگانے سے پہلے صفائی کا خاص خیال رکھا گیا؟' },
  { id: 15, text: 'کیا مریض کے ساتھ صفائی کے احتیاطی تدابیر اختیار کی گئیں؟' },
]

type InfectionControlRecord = {
  _id: string
  rows?: Array<{
    id: number
    text: string
    gloves?: boolean
    mask?: boolean
    gown?: boolean
    cap?: boolean
    isolation?: boolean
  }>
  date?: string
  patientName?: string
  patientSign?: string
  headNurseName?: string
  headNurseSign?: string
  dutyNurseName?: string
  dutyNurseSign?: string
  status?: 'draft' | 'completed'
  recordedBy?: string
  createdAt?: string
}

type FormData = {
  checks: Record<number, Record<ColumnKey, boolean>>
  patientName: string
  patientSign: string
  headNurseName: string
  headNurseSign: string
  dutyNurseName: string
  dutyNurseSign: string
  date: string
}

function emptyChecks(): FormData['checks'] {
  const obj: any = {}
  for (const r of ROWS) {
    const rowObj: any = {}
    for (const c of COLUMNS) rowObj[c.key] = false
    obj[r.id] = rowObj
  }
  return obj
}

export default function Hospital_IpdInfectionControlChecklist({ encounterId }: { encounterId: string }) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [items, setItems] = useState<InfectionControlRecord[]>([])
  const [open, setOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingData, setEditingData] = useState<InfectionControlRecord | null>(null)
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
      const res = (await ipdApi.listIpdInfectionControls(encounterId, { limit: 200 })) as any
      setItems(res?.infectionControls || [])
    } catch (e: any) {
      setError(e?.message || 'Failed to load records')
    } finally {
      setLoading(false)
    }
  }

  async function save(form: FormData) {
    setLoading(true)
    setError(null)
    try {
      // Convert checks object to array format expected by backend
      const rowsArray = ROWS.map((r) => ({
        id: r.id,
        text: r.text,
        ...form.checks[r.id],
      }))
      await ipdApi.createIpdInfectionControl(encounterId, {
        rows: rowsArray,
        date: form.date,
        patientName: form.patientName,
        patientSign: form.patientSign,
        headNurseName: form.headNurseName,
        headNurseSign: form.headNurseSign,
        dutyNurseName: form.dutyNurseName,
        dutyNurseSign: form.dutyNurseSign,
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

  async function update(form: FormData) {
    if (!editingId) return
    setLoading(true)
    setError(null)
    try {
      const rowsArray = ROWS.map((r) => ({
        id: r.id,
        text: r.text,
        ...form.checks[r.id],
      }))
      await ipdApi.updateIpdInfectionControl(editingId, {
        rows: rowsArray,
        date: form.date,
        patientName: form.patientName,
        patientSign: form.patientSign,
        headNurseName: form.headNurseName,
        headNurseSign: form.headNurseSign,
        dutyNurseName: form.dutyNurseName,
        dutyNurseSign: form.dutyNurseSign,
      })
      setEditingId(null); setEditingData(null)
      await reload()
    } catch (e: any) {
      setError(e?.message || 'Failed to update')
    } finally {
      setLoading(false)
    }
  }

  async function remove(id: string) {
    setDeleteId(id)
    setDeleteConfirmOpen(true)
  }

  async function handleDeleteConfirm() {
    if (!deleteId) return
    try { await ipdApi.deleteIpdInfectionControl(deleteId); await reload() } catch (e: any) { alert(e?.message || 'Failed to delete') }
    setDeleteId(null)
  }

  function startEdit(it: InfectionControlRecord) {
    setEditingId(it._id)
    setEditingData(it)
    setOpen(true)
  }

  return (
    <div className="space-y-3">
      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-base font-semibold text-slate-900">انفیکشن کنٹرول چیک لسٹ</div>
            <div className="mt-1 text-sm text-slate-600" dir="rtl">نرسنگ چیک لسٹ</div>
          </div>
          <button onClick={() => setOpen(true)} className="rounded-md bg-slate-800 px-3 py-2 text-sm font-medium text-white hover:bg-slate-900">Add Form</button>
        </div>

        {error && <div className="mt-3 rounded-md border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">{error}</div>}

        <div className="mt-4 space-y-3">
          {loading && <div className="text-sm text-slate-600">Loading...</div>}
          {!loading && sorted.length === 0 && <div className="text-sm text-slate-600">No records yet.</div>}

          {sorted.map((it) => (
            <div key={it._id} className="rounded-lg border border-slate-200 bg-white p-4">
              <div className="flex items-center justify-between">
                <div className="text-sm font-semibold text-slate-900">Record</div>
                <div className="flex items-center gap-2">
          <button type="button" onClick={() => window.print()} className="btn-outline-navy flex items-center gap-2 print:hidden"><Printer className="h-4 w-4"/> Print</button>
                  <div className="text-xs text-slate-500">{it.createdAt ? new Date(it.createdAt).toLocaleString() : '-'}</div>
                  <div className="flex gap-1 print:hidden">
                    <button onClick={() => startEdit(it)} className="rounded px-2 py-0.5 text-xs text-blue-600 hover:bg-blue-50">Edit</button>
                    <button onClick={() => remove(it._id)} className="rounded px-2 py-0.5 text-xs text-red-600 hover:bg-red-50">Delete</button>
                  </div>
                </div>
              </div>

              {it.rows ? (
                <div className="mt-3 space-y-3">
                  <div className="overflow-x-auto rounded-lg border border-slate-200">
                    <table className="min-w-[900px] w-full text-sm" dir="rtl">
                      <thead className="bg-slate-50">
                        <tr>
                          <th className="px-3 py-2 text-right font-semibold text-slate-700">#</th>
                          <th className="px-3 py-2 text-right font-semibold text-slate-700">ہدایات</th>
                          {COLUMNS.map((c) => (
                            <th key={c.key} className="px-3 py-2 text-center font-semibold text-slate-700">{c.label}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200">
                        {ROWS.map((r) => {
                          const rowData = it.rows?.find((row) => row.id === r.id)
                          return (
                            <tr key={r.id}>
                              <td className="px-3 py-2 text-right text-slate-700">{r.id}</td>
                              <td className="px-3 py-2 text-right text-slate-800">{r.text}</td>
                              {COLUMNS.map((c) => (
                                <td key={c.key} className="px-3 py-2 text-center">
                                  <span className={`inline-block h-4 w-4 rounded border ${rowData?.[c.key] ? 'bg-slate-800 border-slate-800' : 'bg-white border-slate-300'}`} />
                                </td>
                              ))}
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-sm" dir="rtl">
                    <Field label="مریض کا نام" value={it.patientName} />
                    <Field label="مریض کے دستخط" value={it.patientSign} />
                    <Field label="نرس کا نام" value={it.headNurseName} />
                    <Field label="نرس کے دستخط" value={it.headNurseSign} />
                    <Field label="ڈیوٹی نرس کا نام" value={it.dutyNurseName} />
                    <Field label="ڈیوٹی نرس کے دستخط" value={it.dutyNurseSign} />
                  </div>

                  <div className="grid grid-cols-1 gap-3 text-sm" dir="rtl">
                    <Field label="تاریخ" value={it.date} />
                  </div>
                </div>
              ) : (
                <div className="mt-3 text-sm text-slate-600">Invalid record data.</div>
              )}
            </div>
          ))}
        </div>
      </div>

      <ChecklistDialog key={editingId || 'add'} open={open} onClose={() => { setOpen(false); setEditingId(null); setEditingData(null) }} onSave={editingId ? update : save} initial={editingData} />
      <ConfirmDialog
        open={deleteConfirmOpen}
        title="Delete Infection Control Record"
        message="Are you sure you want to delete this infection control record?"
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

function ChecklistDialog({ open, onClose, onSave, initial }: { open: boolean; onClose: () => void; onSave: (d: FormData) => void; initial?: InfectionControlRecord | null }) {
  const buildChecksFromInitial = () => {
    const obj: any = {}
    for (const r of ROWS) {
      const rowObj: any = {}
      const rowData = initial?.rows?.find((row) => row.id === r.id)
      for (const c of COLUMNS) rowObj[c.key] = rowData?.[c.key] || false
      obj[r.id] = rowObj
    }
    return obj
  }
  const [form, setForm] = useState<FormData>({
    checks: initial ? buildChecksFromInitial() : emptyChecks(),
    patientName: initial?.patientName || '',
    patientSign: initial?.patientSign || '',
    headNurseName: initial?.headNurseName || '',
    headNurseSign: initial?.headNurseSign || '',
    dutyNurseName: initial?.dutyNurseName || '',
    dutyNurseSign: initial?.dutyNurseSign || '',
    date: initial?.date || new Date().toISOString().slice(0, 10),
  })

  useEffect(() => {
    if (open) {
      setForm({
        checks: initial ? buildChecksFromInitial() : emptyChecks(),
        patientName: initial?.patientName || '',
        patientSign: initial?.patientSign || '',
        headNurseName: initial?.headNurseName || '',
        headNurseSign: initial?.headNurseSign || '',
        dutyNurseName: initial?.dutyNurseName || '',
        dutyNurseSign: initial?.dutyNurseSign || '',
        date: initial?.date || new Date().toISOString().slice(0, 10),
      })
    }
  }, [open])

  if (!open) return null

  const toggle = (rowId: number, colKey: ColumnKey) => {
    setForm((prev) => ({
      ...prev,
      checks: {
        ...prev.checks,
        [rowId]: {
          ...prev.checks[rowId],
          [colKey]: !prev.checks[rowId]?.[colKey],
        },
      },
    }))
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="max-h-[90vh] w-full max-w-6xl overflow-y-auto rounded-xl bg-white p-6">
        <h3 className="mb-4 text-lg font-semibold" dir="rtl">{initial ? 'انفیکشن کنٹرول چیک لسٹ میں ترمیم' : 'انفیکشن کنٹرول چیک لسٹ'}</h3>

        <div className="overflow-x-auto rounded-lg border border-slate-200">
          <table className="min-w-[1100px] w-full text-sm" dir="rtl">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-3 py-2 text-right font-semibold text-slate-700">#</th>
                <th className="px-3 py-2 text-right font-semibold text-slate-700">ہدایات</th>
                {COLUMNS.map((c) => (
                  <th key={c.key} className="px-3 py-2 text-center font-semibold text-slate-700">{c.label}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {ROWS.map((r) => (
                <tr key={r.id}>
                  <td className="px-3 py-2 text-right text-slate-700">{r.id}</td>
                  <td className="px-3 py-2 text-right text-slate-800">{r.text}</td>
                  {COLUMNS.map((c) => (
                    <td key={c.key} className="px-3 py-2 text-center">
                      <input
                        type="checkbox"
                        className="h-4 w-4"
                        checked={!!form.checks?.[r.id]?.[c.key]}
                        onChange={() => toggle(r.id, c.key)}
                      />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-4 space-y-4" dir="rtl">
          <div className="grid grid-cols-2 gap-4">
            <Input label="مریض کا نام" value={form.patientName} onChange={(v) => setForm({ ...form, patientName: v })} />
            <Input label="مریض کے دستخط" value={form.patientSign} onChange={(v) => setForm({ ...form, patientSign: v })} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input label="نرس کا نام" value={form.headNurseName} onChange={(v) => setForm({ ...form, headNurseName: v })} />
            <Input label="نرس کے دستخط" value={form.headNurseSign} onChange={(v) => setForm({ ...form, headNurseSign: v })} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input label="ڈیوٹی نرس کا نام" value={form.dutyNurseName} onChange={(v) => setForm({ ...form, dutyNurseName: v })} />
            <Input label="ڈیوٹی نرس کے دستخط" value={form.dutyNurseSign} onChange={(v) => setForm({ ...form, dutyNurseSign: v })} />
          </div>

          <div className="grid grid-cols-1 gap-4">
            <Input label="تاریخ" type="date" value={form.date} onChange={(v) => setForm({ ...form, date: v })} />
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

function Input({
  label,
  value,
  onChange,
  type,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  type?: string
}) {
  return (
    <div>
      <label className="mb-1 block text-sm font-medium text-slate-700" dir="rtl">{label}</label>
      <input
        type={type || 'text'}
        className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  )
}
