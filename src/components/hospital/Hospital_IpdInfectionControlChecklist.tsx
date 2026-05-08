import { useEffect, useMemo, useState } from 'react'
import { hospitalApi } from '../../utils/api'
import { useEncounterDefaults } from '../../hooks/useEncounterDefaults'
import { 
  ShieldAlert, Plus, CheckCircle2, ClipboardCheck, 
  User, Clock, 
  Activity, AlertCircle, Sparkles, Pencil, Trash2, Printer
} from 'lucide-react'
import { ClinicalDialogShell, clinicalInp, clinicalLbl } from '../ui/ClinicalDialog'
import ConfirmDialog from '../ui/ConfirmDialog'

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

type RecordItem = { id: string; createdAt?: string; parsed?: any }

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
  const [items, setItems] = useState<RecordItem[]>([])
  const [open, setOpen] = useState(false)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
  const encDefaults = useEncounterDefaults(encounterId)

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
      const res = (await hospitalApi.listIpdClinicalNotes(encounterId, { type: 'infection-control', limit: 200 })) as any
      const rows = (res?.notes || []) as any[]

      const filtered: RecordItem[] = rows.map((n: any) => ({
        id: String(n?._id || n?.id || Math.random()),
        createdAt: n?.recordedAt || n?.createdAt,
        parsed: n?.data || null,
      }))

      setItems(filtered)
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
      await hospitalApi.createIpdClinicalNote(encounterId, {
        type: 'infection-control',
        data: { ...form, checks: form.checks },
        sign: form.headNurseSign,
      })
      setOpen(false)
      await reload()
    } catch (e: any) {
      setError(e?.message || 'Failed to save')
    } finally {
      setLoading(false)
    }
  }

  const deleteRow = async () => {
    if (!confirmDeleteId) return
    try {
      await hospitalApi.deleteIpdClinicalNote(confirmDeleteId)
      setConfirmDeleteId(null)
      await reload()
    } catch (e: any) { alert(e?.message || 'Failed to delete') }
  }

  const printRecord = (it: RecordItem) => {
    const p = it.parsed || {}
    const w = window.open('', '_blank'); if (!w) return
    const esc = (v?: string) => String(v||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
    const checkHtml = (checked: boolean) => checked ? '<span style="color:#10b981;font-weight:900">✓</span>' : '<span style="color:#cbd5e1">—</span>'
    const rowsHtml = ROWS.map(r => `<tr><td style="padding:6px;text-align:right">${r.id}</td><td style="padding:6px;text-align:right">${esc(r.text)}</td>${COLUMNS.map(c => `<td style="padding:6px;text-align:center">${checkHtml(!!p.checks?.[r.id]?.[c.key])}</td>`).join('')}</tr>`).join('')
    const colsHtml = COLUMNS.map(c => `<th style="padding:6px;text-align:center;font-size:11px">${esc(c.label)}</th>`).join('')
    w.document.write(`<!doctype html><html><head><meta charset="utf-8"/><style>@page{size:A4;margin:12mm}body{font-family:system-ui;color:#111;font-size:12px}table{border-collapse:collapse;width:100%}th,td{border:1px solid #e2e8f0}</style></head><body dir="rtl"><h2 style="text-align:center">Infection Control Checklist</h2><table><thead><tr><th style="padding:6px;text-align:right">#</th><th style="padding:6px;text-align:right">ہدایات</th>${colsHtml}</tr></thead><tbody>${rowsHtml}</tbody></table><div style="margin-top:12px;font-size:11px">مریض: ${esc(p.patientName)} | ہیڈ نرس: ${esc(p.headNurseName)} | ڈیوٹی نرس: ${esc(p.dutyNurseName)} | تاریخ: ${esc(p.date)}</div><script>setTimeout(()=>window.print(),200)</script></body></html>`)
    w.document.close(); w.focus()
  }

  return (
    <div className="space-y-6">
      {/* Page Header Card */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between rounded-3xl border border-slate-200 bg-white p-6 shadow-sm overflow-hidden relative">
        <div className="absolute right-0 top-0 opacity-[0.03] pointer-events-none transform translate-x-1/4 -translate-y-1/4">
          <ShieldAlert className="h-48 w-48 text-indigo-600" />
        </div>
        <div className="flex items-center gap-4 relative z-10">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-500/10 text-indigo-600">
            <ShieldAlert className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-xl font-black tracking-tight text-slate-900 uppercase">Infection Control</h1>
            <p className="text-xs font-bold uppercase tracking-widest text-slate-400">انفیکشن کنٹرول چیک لسٹ</p>
          </div>
        </div>
        <button 
          onClick={()=>setOpen(true)} 
          className="group flex items-center gap-2 rounded-2xl bg-indigo-600 px-6 py-3 text-sm font-black text-white shadow-xl shadow-indigo-600/20 transition hover:bg-indigo-700 active:scale-95 relative z-10"
        >
          <Plus className="h-4 w-4 transition-transform group-hover:rotate-90" />
          Record New Audit
        </button>
      </div>

      {error && (
        <div className="flex items-center gap-3 rounded-2xl border border-rose-200 bg-rose-50 px-6 py-4 text-sm font-bold text-rose-700">
          <AlertCircle className="h-5 w-5" />
          {error}
        </div>
      )}

      <div className="space-y-8">
        {loading ? (
          <div className="flex min-h-[200px] flex-col items-center justify-center p-8 text-slate-400">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-indigo-600" />
            <p className="mt-4 text-xs font-bold uppercase tracking-widest">Scanning Records...</p>
          </div>
        ) : sorted.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-4 rounded-3xl border-2 border-dashed border-slate-200 bg-white/50 p-12 text-center transition-all hover:bg-white">
            <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-slate-100 text-slate-400">
              <Sparkles className="h-8 w-8" />
            </div>
            <div>
              <h3 className="text-lg font-black text-slate-900 uppercase">No Infection Audits</h3>
              <p className="text-sm font-medium text-slate-500">Prepare your first infection control checklist for this patient.</p>
            </div>
          </div>
        ) : (
          sorted.map((it) => (
            <div key={it.id} className="animate-in fade-in slide-in-from-bottom-2 duration-300">
              <div className="flex items-center justify-end gap-2 mb-2">
                <button onClick={()=>printRecord(it)} className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"><Printer className="h-3 w-3" />Print</button>
                <button onClick={()=>setConfirmDeleteId(it.id)} className="inline-flex items-center gap-1 rounded-lg border border-rose-200 px-2.5 py-1 text-xs font-semibold text-rose-600 transition hover:bg-rose-50"><Trash2 className="h-3 w-3" />Delete</button>
              </div>
              <RecordCard record={it} />
            </div>
          ))
        )}
      </div>

      <ChecklistDialog open={open} onClose={() => setOpen(false)} onSave={save} defaults={encDefaults} />
      <ConfirmDialog open={!!confirmDeleteId} title="Delete Audit Record" message="Are you sure you want to delete this infection control audit?" confirmText="Delete" onCancel={()=>setConfirmDeleteId(null)} onConfirm={deleteRow} />
    </div>
  )
}

function RecordCard({ record }: { record: RecordItem }) {
  const p = record.parsed || {}
  return (
    <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-xl shadow-slate-200/30 transition-all hover:shadow-2xl hover:shadow-slate-200/40">
      <div className="bg-slate-900 px-8 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <ClipboardCheck className="h-5 w-5 text-indigo-400" />
          <span className="text-xs font-black uppercase tracking-widest text-white">Infection Control Audit Record</span>
        </div>
        <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-400">
          <Clock className="h-3 w-3" />
          {record.createdAt ? new Date(record.createdAt).toLocaleString() : '-'}
        </div>
      </div>

      <div className="p-8 space-y-8">
        <div className="overflow-x-auto rounded-2xl border border-slate-100 shadow-sm bg-white">
          <table className="w-full text-sm" dir="rtl">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr>
                <th className="px-6 py-4 text-right text-[10px] font-black uppercase tracking-widest text-slate-400 w-16">#</th>
                <th className="px-4 py-4 text-right text-[10px] font-black uppercase tracking-widest text-slate-400">ہدایات</th>
                {COLUMNS.map((c) => (
                  <th key={c.key} className="px-3 py-4 text-center text-[10px] font-black uppercase tracking-widest text-slate-400">{c.label}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 font-medium">
              {ROWS.map((r) => (
                <tr key={r.id} className="group hover:bg-slate-50/50 transition-colors">
                  <td className="px-6 py-3 text-right text-slate-300 font-bold">{r.id}</td>
                  <td className="px-4 py-3 text-right text-slate-700 leading-relaxed font-bold">{r.text}</td>
                  {COLUMNS.map((c) => (
                    <td key={c.key} className="px-3 py-3 text-center">
                      {p.checks?.[r.id]?.[c.key] ? (
                        <div className="mx-auto flex h-6 w-6 items-center justify-center rounded-lg bg-emerald-500 text-white shadow-lg shadow-emerald-500/20">
                          <CheckCircle2 className="h-4 w-4" />
                        </div>
                      ) : (
                        <div className="mx-auto h-6 w-6 rounded-lg border-2 border-slate-100 bg-slate-50" />
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="grid gap-6 md:grid-cols-3" dir="rtl">
          <DetailField label="مریض" value={p.patientName} sign={p.patientSign} icon={User} />
          <DetailField label="نرس (ہیڈ)" value={p.headNurseName} sign={p.headNurseSign} icon={ShieldAlert} />
          <DetailField label="نرس (ڈیوٹی)" value={p.dutyNurseName} sign={p.dutyNurseSign} icon={Activity} />
        </div>
      </div>
    </div>
  )
}

function DetailField({ label, value, sign, icon: Icon }: any) {
  return (
    <div className="rounded-2xl border border-slate-100 bg-slate-50/50 p-4 space-y-1">
      <div className="flex items-center gap-2 mb-2">
        <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-white shadow-sm text-indigo-600">
          <Icon className="h-3.5 w-3.5" />
        </div>
        <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">{label}</span>
      </div>
      <div className="text-sm font-black text-slate-900">{value || '-'}</div>
      <div className="text-[10px] font-bold text-slate-400 italic">Sign: {sign || '[Verified]'}</div>
    </div>
  )
}

function ChecklistDialog({ open, onClose, onSave, defaults }: { open: boolean; onClose: () => void; onSave: (d: FormData) => void; defaults?: any }) {
  const [form, setForm] = useState<FormData>({
    checks: emptyChecks(), patientName: '', patientSign: '', headNurseName: '', headNurseSign: '', dutyNurseName: '', dutyNurseSign: '',
    date: new Date().toISOString().slice(0, 10),
  })

  useEffect(() => {
    if (open) {
      setForm(prev => ({
        ...prev,
        checks: emptyChecks(),
        patientName: prev.patientName || defaults?.patientName || '',
        date: new Date().toISOString().slice(0, 10),
      }))
    }
  }, [open, defaults])

  const toggle = (rowId: number, colKey: ColumnKey) => {
    setForm((prev) => ({ ...prev, checks: { ...prev.checks, [rowId]: { ...prev.checks[rowId], [colKey]: !prev.checks[rowId]?.[colKey] } } }))
  }

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    onSave(form)
  }

  return (
    <ClinicalDialogShell open={open} title="Infection Control Audit" subtitle="نرسنگ انفیکشن کنٹرول چیک لسٹ" icon={ShieldAlert} onClose={onClose} onSubmit={submit} submitText="Finalize Audit" maxWidth="max-w-6xl">
      <div className="space-y-6">
        <div className="overflow-x-auto rounded-xl border border-slate-100">
          <table className="w-full text-sm" dir="rtl">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr>
                <th className="px-4 py-3 text-right text-[10px] font-black uppercase tracking-widest text-slate-400 w-12">#</th>
                <th className="px-3 py-3 text-right text-[10px] font-black uppercase tracking-widest text-slate-400">ہدایات</th>
                {COLUMNS.map((c) => (
                  <th key={c.key} className="px-2 py-3 text-center text-[10px] font-black uppercase tracking-widest text-slate-400">{c.label}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {ROWS.map((r) => (
                <tr key={r.id} className="hover:bg-slate-50/50">
                  <td className="px-4 py-3 text-right text-slate-400 font-bold">{r.id}</td>
                  <td className="px-3 py-3 text-right text-slate-800 font-bold leading-relaxed">{r.text}</td>
                  {COLUMNS.map((c) => (
                    <td key={c.key} className="px-2 py-3 text-center">
                      <label className="relative flex cursor-pointer items-center justify-center">
                        <input type="checkbox" className="sr-only peer" checked={!!form.checks?.[r.id]?.[c.key]} onChange={() => toggle(r.id, c.key)} />
                        <div className="h-7 w-7 rounded-lg border-2 border-slate-100 bg-slate-50 transition-all peer-checked:border-emerald-500 peer-checked:bg-emerald-500 peer-checked:text-white flex items-center justify-center">
                          <CheckCircle2 className="h-4 w-4 opacity-0 peer-checked:opacity-100 transition-opacity" />
                        </div>
                      </label>
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="grid gap-4 md:grid-cols-3" dir="rtl">
          <div className="space-y-3">
            <div><label className={clinicalLbl}>مریض کا نام</label><input value={form.patientName} onChange={e=>setForm({...form,patientName:e.target.value})} className={clinicalInp+' text-right'} dir="rtl" /></div>
            <div><label className={clinicalLbl}>مریض کے دستخط</label><input value={form.patientSign} onChange={e=>setForm({...form,patientSign:e.target.value})} className={clinicalInp+' text-right'} dir="rtl" /></div>
          </div>
          <div className="space-y-3">
            <div><label className={clinicalLbl}>نرس کا نام (ہیڈ)</label><input value={form.headNurseName} onChange={e=>setForm({...form,headNurseName:e.target.value})} className={clinicalInp+' text-right'} dir="rtl" /></div>
            <div><label className={clinicalLbl}>نرس کے دستخط</label><input value={form.headNurseSign} onChange={e=>setForm({...form,headNurseSign:e.target.value})} className={clinicalInp+' text-right'} dir="rtl" /></div>
          </div>
          <div className="space-y-3">
            <div><label className={clinicalLbl}>ڈیوٹی نرس کا نام</label><input value={form.dutyNurseName} onChange={e=>setForm({...form,dutyNurseName:e.target.value})} className={clinicalInp+' text-right'} dir="rtl" /></div>
            <div><label className={clinicalLbl}>ڈیوٹی نرس کے دستخط</label><input value={form.dutyNurseSign} onChange={e=>setForm({...form,dutyNurseSign:e.target.value})} className={clinicalInp+' text-right'} dir="rtl" /></div>
          </div>
        </div>
        <div dir="rtl" className="max-w-xs">
          <label className={clinicalLbl}>تاریخ</label>
          <input type="date" value={form.date} onChange={e=>setForm({...form,date:e.target.value})} className={clinicalInp+' text-right'} dir="rtl" />
        </div>
      </div>
    </ClinicalDialogShell>
  )
}

