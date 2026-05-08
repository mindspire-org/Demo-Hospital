import { useEffect, useState } from 'react'
import { hospitalApi } from '../../utils/api'
import { 
  Activity, Save, X, Activity as VitalIcon, 
  Brain, Droplets, Wind, Clock,
  ClipboardList, Printer, Pencil, Trash2
} from 'lucide-react'
import Toast, { type ToastState } from '../ui/Toast'
import ConfirmDialog from '../ui/ConfirmDialog'

const inp = 'w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none transition-shadow focus:border-sky-400 focus:ring-2 focus:ring-sky-100'
const lbl = 'mb-1.5 block text-xs font-semibold tracking-wide text-slate-500 uppercase'

type IcuEntry = {
  _id: string
  encounterId: string
  recordedAt: string
  vitals: {
    bpSys?: number
    bpDia?: number
    hr?: number
    rr?: number
    temp?: number
    spo2?: number
  }
  gcs: {
    eye?: number
    verbal?: number
    motor?: number
    total?: number
  }
  scores: {
    apache2?: number
    sofa?: number
  }
  intake: {
    oral?: number
    iv?: number
    ng?: number
  }
  output: {
    urine?: number
    drain?: number
    emesis?: number
  }
  ventilator: {
    mode?: string
    fio2?: number
    peep?: number
    vt?: number
    rate?: number
  }
  notes?: string
}

export default function Hospital_IpdIcuMonitoring({ encounterId }: { encounterId: string }){
  const [entries, setEntries] = useState<IcuEntry[]>([])
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [toast, setToast] = useState<ToastState>(null)
  const [editEntry, setEditEntry] = useState<IcuEntry | null>(null)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)

  useEffect(()=>{ if(encounterId){ reload() } }, [encounterId])

  async function reload(){
    setLoading(true)
    try {
      const res = await hospitalApi.listIpdClinicalNotes(encounterId, { type: 'icu-monitoring', limit: 200 }) as any
      const docs = (res.notes || []) as any[]
      const mapped = docs.map((n: any) => ({
        _id: String(n._id),
        recordedAt: String(n.recordedAt || n.createdAt || ''),
        ...n.data,
      }))
      mapped.sort((a: any, b: any) => new Date(b.recordedAt).getTime() - new Date(a.recordedAt).getTime())
      setEntries(mapped)
    } catch {
      setEntries([])
    } finally {
      setLoading(false)
    }
  }

  async function handleSave(data: any) {
    try {
      const norm = normalizeIcuPayload(data)
      if (editEntry?._id) {
        await hospitalApi.updateIpdClinicalNote(editEntry._id, {
          recordedAt: norm.recordedAt || new Date().toISOString(),
          data: norm,
        })
      } else {
        await hospitalApi.createIpdClinicalNote(encounterId, {
          type: 'icu-monitoring',
          recordedAt: norm.recordedAt || new Date().toISOString(),
          data: norm,
        })
      }
      setOpen(false)
      setEditEntry(null)
      setToast({ type: 'success', message: 'ICU Monitoring entry saved' })
      await reload()
    } catch (e: any) {
      setToast({ type: 'error', message: e?.message || 'Failed to save entry' })
    }
  }

  function normalizeIcuPayload(raw: any){
    const n = (v: any) => {
      if (v === '' || v === null || v === undefined) return undefined
      const x = Number(v)
      return Number.isFinite(x) ? x : undefined
    }
    const s = (v: any) => {
      const out = String(v ?? '').trim()
      return out ? out : undefined
    }
    const vit = raw?.vitals || {}
    const gcs = raw?.gcs || {}
    const scores = raw?.scores || {}
    const intake = raw?.intake || {}
    const output = raw?.output || {}
    const vent = raw?.ventilator || {}
    return {
      recordedAt: raw?.recordedAt ? new Date(String(raw.recordedAt)).toISOString() : undefined,
      vitals: {
        bpSys: n(vit.bpSys),
        bpDia: n(vit.bpDia),
        hr: n(vit.hr),
        rr: n(vit.rr),
        temp: n(vit.temp),
        spo2: n(vit.spo2),
      },
      gcs: {
        eye: n(gcs.eye),
        verbal: n(gcs.verbal),
        motor: n(gcs.motor),
        total: n(gcs.total),
      },
      scores: {
        apache2: n(scores.apache2),
        sofa: n(scores.sofa),
      },
      intake: {
        oral: n(intake.oral),
        iv: n(intake.iv),
        ng: n(intake.ng),
      },
      output: {
        urine: n(output.urine),
        drain: n(output.drain),
        emesis: n(output.emesis),
      },
      ventilator: {
        mode: s(vent.mode) || 'None',
        fio2: n(vent.fio2),
        peep: n(vent.peep),
        vt: n(vent.vt),
        rate: n(vent.rate),
      },
      notes: s(raw?.notes),
    }
  }

  const deleteEntry = async () => {
    if (!confirmDeleteId) return
    try {
      await hospitalApi.deleteIpdClinicalNote(confirmDeleteId)
      setConfirmDeleteId(null)
      setToast({ type: 'success', message: 'ICU entry deleted' })
      await reload()
    } catch (e: any) {
      setToast({ type: 'error', message: e?.message || 'Failed to delete entry' })
    }
  }

  const printEntry = (entry: IcuEntry) => {
    const esc = (v?: string)=> (v||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
    const vit = entry?.vitals || {}
    const gcs = entry?.gcs || {}
    const sc = entry?.scores || {}
    const ioIn = entry?.intake || {}
    const ioOut = entry?.output || {}
    const vent = entry?.ventilator || {}

    const overlay = document.createElement('div')
    overlay.id = 'icu-print-overlay'
    overlay.style.cssText = 'position:fixed;inset:0;z-index:99999;background:rgba(0,0,0,0.5);display:flex;align-items:center;justify-content:center;padding:16px;'

    overlay.innerHTML = `
    <style>
      @page { size: A4; margin: 10mm; }
      @media print {
        body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        body * { visibility: hidden !important; }
        #icu-print-overlay, #icu-print-overlay * { visibility: visible !important; }
        #icu-print-overlay { position: fixed !important; inset: 0 !important; background: transparent !important; padding: 0 !important; }
        #icu-sheet { width: auto !important; max-height: none !important; overflow: visible !important; border-radius: 0 !important; box-shadow: none !important; }
        #icu-actions { display: none !important; }
      }
    </style>
    <div id="icu-sheet" style="position:relative;width:210mm;max-height:90vh;overflow:auto;background:white;border-radius:12px;box-shadow:0 25px 50px -12px rgba(0,0,0,0.25);padding:18px;font-family:system-ui,-apple-system,Segoe UI,Roboto,Arial,sans-serif;color:#0f172a;">
      <div id="icu-actions" style="display:flex;justify-content:flex-end;gap:8px;margin-bottom:12px;">
        <button id="icu-print-btn" style="cursor:pointer;border:1px solid #0f172a;background:#0f172a;color:white;padding:6px 14px;border-radius:10px;font-size:12px;font-weight:800;">Print</button>
        <button id="icu-close-btn" style="cursor:pointer;border:1px solid #cbd5e1;background:white;color:#334155;padding:6px 14px;border-radius:10px;font-size:12px;font-weight:800;">Close</button>
      </div>

      <div style="border:1px solid #cbd5e1;border-radius:12px;overflow:hidden;">
        <div style="background:#0f172a;color:#fff;padding:12px 14px;">
          <div style="font-size:14px;font-weight:900;letter-spacing:0.18em;text-transform:uppercase;">ICU Monitoring</div>
          <div style="font-size:11px;opacity:0.9;margin-top:4px;">Recorded: ${esc(entry.recordedAt ? new Date(entry.recordedAt).toLocaleString() : '')}</div>
        </div>
        <div style="padding:10px 14px;font-size:11px;color:#0f172a;display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px;">
          ${kv('BP', `${esc(String(vit.bpSys||''))}/${esc(String(vit.bpDia||''))}`)}
          ${kv('HR', esc(String(vit.hr||'')))}
          ${kv('RR', esc(String(vit.rr||'')))}
          ${kv('Temp', esc(String(vit.temp||'')))}
          ${kv('SpO2', esc(String(vit.spo2||'')))}
          ${kv('GCS', esc(String(gcs.total||'')))}
          ${kv('APACHE II', esc(String(sc.apache2||'')))}
          ${kv('SOFA', esc(String(sc.sofa||'')))}
          ${kv('Vent Mode', esc(String(vent.mode||'')))}
        </div>
      </div>

      ${block('Intake (ml)', `Oral: ${esc(String(ioIn.oral||''))} | IV: ${esc(String(ioIn.iv||''))} | NG: ${esc(String(ioIn.ng||''))}`)}
      ${block('Output (ml)', `Urine: ${esc(String(ioOut.urine||''))} | Drain: ${esc(String(ioOut.drain||''))} | Emesis: ${esc(String(ioOut.emesis||''))}`)}
      ${block('Ventilator Settings', `FiO2: ${esc(String(vent.fio2||''))} | PEEP: ${esc(String(vent.peep||''))} | Vt: ${esc(String(vent.vt||''))} | Rate: ${esc(String(vent.rate||''))}`)}
      ${block('Notes', esc(String(entry.notes||'')))}
    </div>
    `

    function kv(k: string, v: string){
      return `<div style="border:1px solid #e2e8f0;border-radius:10px;padding:8px 10px;background:#f8fafc;display:flex;justify-content:space-between;gap:8px;"><div style="font-size:10px;font-weight:900;letter-spacing:0.12em;text-transform:uppercase;color:#64748b;">${esc(k)}</div><div style="font-size:12px;font-weight:900;color:#0f172a;">${v || '—'}</div></div>`
    }
    function block(title: string, text: string){
      return `<div style="margin-top:10px;border:1px solid #e2e8f0;border-radius:12px;overflow:hidden;"><div style="background:#f8fafc;padding:8px 10px;font-size:10px;font-weight:900;letter-spacing:0.12em;text-transform:uppercase;color:#64748b;">${esc(title)}</div><div style="padding:10px;min-height:36px;font-size:11px;white-space:pre-wrap;line-height:1.4;">${text || '<span style=\"color:#cbd5e1;font-style:italic\">Not recorded</span>'}</div></div>`
    }

    document.body.appendChild(overlay)
    const onClose = ()=> { try { overlay.remove(); document.removeEventListener('keydown', onKey) } catch {} }
    const onPrint = ()=> {
      const btns = document.getElementById('icu-actions') as HTMLElement|null
      if (btns) btns.style.display = 'none'
      try { window.print() } catch {}
      setTimeout(()=>{ if (btns) btns.style.display = 'flex' }, 500)
    }
    const onKey = (e: KeyboardEvent)=> { if (e.key === 'Escape') onClose() }
    document.getElementById('icu-close-btn')?.addEventListener('click', onClose)
    document.getElementById('icu-print-btn')?.addEventListener('click', onPrint)
    document.addEventListener('keydown', onKey)
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
      <Toast toast={toast} onClose={()=>setToast(null)} />

      <div className="border-b border-slate-100 bg-slate-50/50 p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-slate-900 text-[10px] font-black text-white">ICU</span>
            <div>
              <div className="text-base font-black text-slate-900">ICU Monitoring</div>
              <div className="text-xs font-bold text-slate-500">Flowsheet entries for critical care</div>
            </div>
          </div>
          <button
            onClick={()=>setOpen(true)}
            className="rounded-xl bg-slate-900 px-4 py-2 text-xs font-black text-white shadow-sm transition hover:bg-slate-800 active:scale-[0.98]"
          >
            + Add Entry
          </button>
        </div>
      </div>

      <div className="p-4">
      {loading ? (
        <div className="flex min-h-[200px] flex-col items-center justify-center p-8 text-slate-400">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-slate-900" />
          <p className="mt-4 text-xs font-bold uppercase tracking-widest">Loading records...</p>
        </div>
      ) : entries.length === 0 ? (
        <div className="rounded-lg border border-dashed border-slate-300 p-8 text-center text-sm text-slate-400">No ICU monitoring entries yet.</div>
      ) : (
        <div className="space-y-4">
          {entries.map(e => (
            <div key={e._id} className="rounded-xl border border-slate-200 p-4 transition-shadow hover:shadow-sm">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <span className="rounded-full bg-slate-100 px-2 py-0.5 font-semibold text-slate-800">
                    {e.recordedAt ? new Date(e.recordedAt).toLocaleString() : '-'}
                  </span>
                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-slate-600">BP: {e?.vitals?.bpSys || '-'} / {e?.vitals?.bpDia || '-'}</span>
                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-slate-600">HR: {e?.vitals?.hr || '-'}</span>
                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-slate-600">SpO2: {e?.vitals?.spo2 || '-'}</span>
                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-slate-600">GCS: {e?.gcs?.total || '-'}</span>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-2.5 py-1 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
                    onClick={() => setEditEntry(e)}
                  >
                    <Pencil className="h-3.5 w-3.5" />
                    Edit
                  </button>
                  <button
                    type="button"
                    className="inline-flex items-center gap-1.5 rounded-lg border border-rose-200 px-2.5 py-1 text-xs font-semibold text-rose-600 transition hover:bg-rose-50"
                    onClick={() => setConfirmDeleteId(e._id)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Delete
                  </button>
                  <button
                    type="button"
                    className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-2.5 py-1 text-xs font-bold text-white shadow-sm transition hover:bg-slate-800"
                    onClick={() => printEntry(e)}
                  >
                    <Printer className="h-3.5 w-3.5" />
                    Print
                  </button>
                </div>
              </div>

              <IcuEntryCard entry={e} />
            </div>
          ))}
        </div>
      )}

      </div>

      <IcuDialog open={open} onClose={()=>setOpen(false)} onSave={handleSave} />
      <IcuDialog open={!!editEntry} onClose={()=>setEditEntry(null)} onSave={handleSave} initial={editEntry} title="Edit ICU Monitoring" />

      <ConfirmDialog
        open={!!confirmDeleteId}
        title="Delete ICU Monitoring Entry"
        message="Are you sure you want to delete this ICU monitoring entry? This action cannot be undone."
        confirmText="Delete"
        onCancel={()=>setConfirmDeleteId(null)}
        onConfirm={deleteEntry}
      />
    </div>
  )
}

function IcuEntryCard({ entry }: { entry: IcuEntry }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition-shadow hover:shadow-md animate-in fade-in slide-in-from-bottom-2 duration-300">
      <div className="bg-slate-900 px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3 text-white">
          <Activity className="h-5 w-5 text-rose-400" />
          <span className="text-xs font-black uppercase tracking-widest">Flowsheet Entry</span>
        </div>
        <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-400">
          <Clock className="h-3 w-3" />
          {new Date(entry.recordedAt).toLocaleString()}
        </div>
      </div>
      <div className="p-6 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {/* Vitals Column */}
        <div className="space-y-4">
          <SectionHeader icon={VitalIcon} label="Vital Signs" color="text-rose-600" />
          <div className="grid grid-cols-2 gap-3">
            <VitalBadge label="BP" value={`${entry.vitals?.bpSys}/${entry.vitals?.bpDia}`} unit="mmHg" />
            <VitalBadge label="HR" value={entry.vitals?.hr} unit="bpm" />
            <VitalBadge label="RR" value={entry.vitals?.rr} unit="/min" />
            <VitalBadge label="Temp" value={entry.vitals?.temp} unit="°C" />
            <VitalBadge label="SpO2" value={entry.vitals?.spo2} unit="%" />
          </div>
        </div>

        {/* GCS & Scores */}
        <div className="space-y-4">
          <SectionHeader icon={Brain} label="Neurology & Scores" color="text-indigo-600" />
          <div className="grid grid-cols-2 gap-3">
            <VitalBadge label="GCS" value={entry.gcs?.total} unit="/15" />
            <VitalBadge label="APACHE II" value={entry.scores?.apache2} />
            <VitalBadge label="SOFA" value={entry.scores?.sofa} />
          </div>
        </div>

        {/* Intake/Output */}
        <div className="space-y-4">
          <SectionHeader icon={Droplets} label="Fluid Balance" color="text-sky-600" />
          <div className="grid grid-cols-1 gap-3">
            <div className="flex items-center justify-between p-3 rounded-2xl bg-sky-50">
              <span className="text-[10px] font-black uppercase text-sky-600">Total Intake</span>
              <span className="text-sm font-black text-sky-900">{(entry.intake?.oral || 0) + (entry.intake?.iv || 0) + (entry.intake?.ng || 0)} ml</span>
            </div>
            <div className="flex items-center justify-between p-3 rounded-2xl bg-rose-50">
              <span className="text-[10px] font-black uppercase text-rose-600">Total Output</span>
              <span className="text-sm font-black text-rose-900">{(entry.output?.urine || 0) + (entry.output?.drain || 0) + (entry.output?.emesis || 0)} ml</span>
            </div>
          </div>
        </div>

        {/* Ventilator */}
        <div className="space-y-4">
          <SectionHeader icon={Wind} label="Ventilator" color="text-emerald-600" />
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 space-y-2">
            <div className="flex justify-between text-xs">
              <span className="font-bold text-slate-500 uppercase">Mode</span>
              <span className="font-black text-slate-900">{entry.ventilator?.mode || 'None'}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="font-bold text-slate-500 uppercase">FiO2</span>
              <span className="font-black text-slate-900">{entry.ventilator?.fio2}%</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function SectionHeader({ icon: Icon, label, color }: any) {
  return (
    <div className="flex items-center gap-2">
      <Icon className={`h-4 w-4 ${color}`} />
      <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400">{label}</h4>
    </div>
  )
}

function VitalBadge({ label, value, unit }: any) {
  return (
    <div className="rounded-2xl bg-slate-50 p-3 border border-slate-100">
      <div className="text-[9px] font-black text-slate-400 uppercase tracking-wider">{label}</div>
      <div className="flex items-baseline gap-1">
        <span className="text-sm font-black text-slate-900">{value || '-'}</span>
        {unit && <span className="text-[8px] font-bold text-slate-400">{unit}</span>}
      </div>
    </div>
  )
}

function IcuDialog({ open, onClose, onSave, initial, title = 'Add ICU Flowsheet Entry' }: any) {
  const [form, setForm] = useState({
    recordedAt: new Date().toISOString().slice(0, 16),
    vitals: { bpSys: '', bpDia: '', hr: '', rr: '', temp: '', spo2: '' },
    gcs: { eye: '', verbal: '', motor: '', total: '' },
    scores: { apache2: '', sofa: '' },
    intake: { oral: '', iv: '', ng: '' },
    output: { urine: '', drain: '', emesis: '' },
    ventilator: { mode: 'None', fio2: '', peep: '', vt: '', rate: '' },
    notes: ''
  })

  useEffect(()=>{
    if (!open) return
    if (!initial) {
      setForm({
        recordedAt: new Date().toISOString().slice(0, 16),
        vitals: { bpSys: '', bpDia: '', hr: '', rr: '', temp: '', spo2: '' },
        gcs: { eye: '', verbal: '', motor: '', total: '' },
        scores: { apache2: '', sofa: '' },
        intake: { oral: '', iv: '', ng: '' },
        output: { urine: '', drain: '', emesis: '' },
        ventilator: { mode: 'None', fio2: '', peep: '', vt: '', rate: '' },
        notes: ''
      })
      return
    }
    setForm({
      recordedAt: String(initial.recordedAt || new Date().toISOString().slice(0, 16)).slice(0, 16),
      vitals: {
        bpSys: String(initial?.vitals?.bpSys ?? ''),
        bpDia: String(initial?.vitals?.bpDia ?? ''),
        hr: String(initial?.vitals?.hr ?? ''),
        rr: String(initial?.vitals?.rr ?? ''),
        temp: String(initial?.vitals?.temp ?? ''),
        spo2: String(initial?.vitals?.spo2 ?? ''),
      },
      gcs: {
        eye: String(initial?.gcs?.eye ?? ''),
        verbal: String(initial?.gcs?.verbal ?? ''),
        motor: String(initial?.gcs?.motor ?? ''),
        total: String(initial?.gcs?.total ?? ''),
      },
      scores: {
        apache2: String(initial?.scores?.apache2 ?? ''),
        sofa: String(initial?.scores?.sofa ?? ''),
      },
      intake: {
        oral: String(initial?.intake?.oral ?? ''),
        iv: String(initial?.intake?.iv ?? ''),
        ng: String(initial?.intake?.ng ?? ''),
      },
      output: {
        urine: String(initial?.output?.urine ?? ''),
        drain: String(initial?.output?.drain ?? ''),
        emesis: String(initial?.output?.emesis ?? ''),
      },
      ventilator: {
        mode: String(initial?.ventilator?.mode ?? 'None'),
        fio2: String(initial?.ventilator?.fio2 ?? ''),
        peep: String(initial?.ventilator?.peep ?? ''),
        vt: String(initial?.ventilator?.vt ?? ''),
        rate: String(initial?.ventilator?.rate ?? ''),
      },
      notes: String(initial?.notes ?? ''),
    })
  }, [open, initial])

  useEffect(() => {
    const total = (Number(form.gcs.eye) || 0) + (Number(form.gcs.verbal) || 0) + (Number(form.gcs.motor) || 0)
    if (total !== Number(form.gcs.total)) {
      setForm(prev => ({ ...prev, gcs: { ...prev.gcs, total: String(total || '') } }))
    }
  }, [form.gcs.eye, form.gcs.verbal, form.gcs.motor])

  if (!open) return null

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    onSave(form)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-3xl rounded-2xl border border-slate-200 bg-white shadow-xl">
        <div className="border-b border-slate-100 px-4 py-3 flex items-center justify-between">
          <div className="text-sm font-bold text-slate-900">{title}</div>
          <button onClick={onClose} className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600">
            <X className="h-4 w-4" />
          </button>
        </div>
        <form onSubmit={submit} className="p-4 max-h-[75vh] overflow-y-auto">
          {/* Recorded At */}
          <div className="mb-3">
            <label className={lbl}>Recorded Date & Time</label>
            <input type="datetime-local" value={form.recordedAt} onChange={e=>setForm({...form, recordedAt: e.target.value})} className={inp} />
          </div>

          {/* Vital Signs */}
          <div className="mb-2 text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5"><Activity className="h-3.5 w-3.5 text-rose-500" />Vital Signs</div>
          <div className="grid gap-3 md:grid-cols-3 mb-4">
            <div><label className={lbl}>BP Sys</label><input value={form.vitals.bpSys} onChange={e=>setForm({...form, vitals:{...form.vitals, bpSys:e.target.value}})} className={inp} placeholder="120" /></div>
            <div><label className={lbl}>BP Dia</label><input value={form.vitals.bpDia} onChange={e=>setForm({...form, vitals:{...form.vitals, bpDia:e.target.value}})} className={inp} placeholder="80" /></div>
            <div><label className={lbl}>HR</label><input value={form.vitals.hr} onChange={e=>setForm({...form, vitals:{...form.vitals, hr:e.target.value}})} className={inp} placeholder="72" /></div>
            <div><label className={lbl}>RR</label><input value={form.vitals.rr} onChange={e=>setForm({...form, vitals:{...form.vitals, rr:e.target.value}})} className={inp} placeholder="16" /></div>
            <div><label className={lbl}>Temp (°C)</label><input value={form.vitals.temp} onChange={e=>setForm({...form, vitals:{...form.vitals, temp:e.target.value}})} className={inp} placeholder="37.0" /></div>
            <div><label className={lbl}>SpO2 (%)</label><input value={form.vitals.spo2} onChange={e=>setForm({...form, vitals:{...form.vitals, spo2:e.target.value}})} className={inp} placeholder="98" /></div>
          </div>

          {/* GCS & Scores */}
          <div className="mb-2 text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5"><Brain className="h-3.5 w-3.5 text-indigo-500" />Glasgow Coma Scale & Scores</div>
          <div className="grid gap-3 md:grid-cols-3 mb-4">
            <div><label className={lbl}>Eye (1-4)</label><select value={form.gcs.eye} onChange={e=>setForm({...form, gcs:{...form.gcs, eye:e.target.value}})} className={inp}><option value="">-</option>{['1','2','3','4'].map(o=><option key={o} value={o}>{o}</option>)}</select></div>
            <div><label className={lbl}>Verbal (1-5)</label><select value={form.gcs.verbal} onChange={e=>setForm({...form, gcs:{...form.gcs, verbal:e.target.value}})} className={inp}><option value="">-</option>{['1','2','3','4','5'].map(o=><option key={o} value={o}>{o}</option>)}</select></div>
            <div><label className={lbl}>Motor (1-6)</label><select value={form.gcs.motor} onChange={e=>setForm({...form, gcs:{...form.gcs, motor:e.target.value}})} className={inp}><option value="">-</option>{['1','2','3','4','5','6'].map(o=><option key={o} value={o}>{o}</option>)}</select></div>
            <div><label className={lbl}>GCS Total</label><input value={form.gcs.total} readOnly className={inp + ' bg-slate-50 opacity-70'} /></div>
            <div><label className={lbl}>APACHE II</label><input value={form.scores.apache2} onChange={e=>setForm({...form, scores:{...form.scores, apache2:e.target.value}})} className={inp} placeholder="0-71" /></div>
            <div><label className={lbl}>SOFA</label><input value={form.scores.sofa} onChange={e=>setForm({...form, scores:{...form.scores, sofa:e.target.value}})} className={inp} placeholder="0-24" /></div>
          </div>

          {/* Intake / Output */}
          <div className="mb-2 text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5"><Droplets className="h-3.5 w-3.5 text-sky-500" />Intake / Output (ml)</div>
          <div className="grid gap-3 md:grid-cols-3 mb-4">
            <div><label className={lbl}>Oral Intake</label><input value={form.intake.oral} onChange={e=>setForm({...form, intake:{...form.intake, oral:e.target.value}})} className={inp} /></div>
            <div><label className={lbl}>IV Fluids</label><input value={form.intake.iv} onChange={e=>setForm({...form, intake:{...form.intake, iv:e.target.value}})} className={inp} /></div>
            <div><label className={lbl}>NG Tube</label><input value={form.intake.ng} onChange={e=>setForm({...form, intake:{...form.intake, ng:e.target.value}})} className={inp} /></div>
            <div><label className={lbl}>Urine Output</label><input value={form.output.urine} onChange={e=>setForm({...form, output:{...form.output, urine:e.target.value}})} className={inp} /></div>
            <div><label className={lbl}>Drainage</label><input value={form.output.drain} onChange={e=>setForm({...form, output:{...form.output, drain:e.target.value}})} className={inp} /></div>
            <div><label className={lbl}>Emesis</label><input value={form.output.emesis} onChange={e=>setForm({...form, output:{...form.output, emesis:e.target.value}})} className={inp} /></div>
          </div>

          {/* Ventilator */}
          <div className="mb-2 text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5"><Wind className="h-3.5 w-3.5 text-emerald-500" />Ventilator Settings</div>
          <div className="grid gap-3 md:grid-cols-3 mb-4">
            <div><label className={lbl}>Mode</label><select value={form.ventilator.mode} onChange={e=>setForm({...form, ventilator:{...form.ventilator, mode:e.target.value}})} className={inp}>{['None','AC','SIMV','PSV','CPAP','BIPAP'].map(o=><option key={o} value={o}>{o}</option>)}</select></div>
            <div><label className={lbl}>FiO2 (%)</label><input value={form.ventilator.fio2} onChange={e=>setForm({...form, ventilator:{...form.ventilator, fio2:e.target.value}})} className={inp} /></div>
            <div><label className={lbl}>PEEP</label><input value={form.ventilator.peep} onChange={e=>setForm({...form, ventilator:{...form.ventilator, peep:e.target.value}})} className={inp} /></div>
            <div><label className={lbl}>Vt (ml)</label><input value={form.ventilator.vt} onChange={e=>setForm({...form, ventilator:{...form.ventilator, vt:e.target.value}})} className={inp} /></div>
            <div><label className={lbl}>Rate</label><input value={form.ventilator.rate} onChange={e=>setForm({...form, ventilator:{...form.ventilator, rate:e.target.value}})} className={inp} /></div>
          </div>

          {/* Clinical Notes */}
          <div className="mb-2 text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5"><ClipboardList className="h-3.5 w-3.5 text-slate-500" />Clinical Notes</div>
          <div className="mb-4">
            <textarea value={form.notes} onChange={e=>setForm({...form, notes:e.target.value})} rows={3} className={inp + ' resize-none'} placeholder="Add any clinical observations, lines, tubes, drains or wound status here..." />
          </div>

          <div className="flex items-center justify-end gap-2">
            <button type="button" onClick={onClose} className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50">Cancel</button>
            <button type="submit" className="flex items-center gap-1.5 rounded-lg bg-slate-900 px-3 py-2 text-xs font-bold text-white hover:bg-slate-800">
              <Save className="h-3.5 w-3.5" />
              Save Entry
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
