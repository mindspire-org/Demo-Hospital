import { useEffect, useState } from 'react'
import { hospitalApi } from '../../utils/api'
import { 
  History, Activity, Stethoscope, ClipboardList, 
  User, Clock, Pill, ShieldAlert, Plus,
  FileText, Info, CheckCircle2, Printer, Pencil, Trash2
} from 'lucide-react'
import { ClinicalDialogShell, clinicalInp, clinicalLbl } from '../ui/ClinicalDialog'
import ConfirmDialog from '../ui/ConfirmDialog'

export default function Hospital_IpdHistoryExamination({ encounterId }: { encounterId: string }){
  const [records, setRecords] = useState<any[]>([])
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [editing, setEditing] = useState<any | null>(null)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)

  useEffect(()=>{ if(encounterId){ reload() } }, [encounterId])

  async function reload(){
    setLoading(true)
    try{
      const res = await hospitalApi.listIpdClinicalNotes(encounterId, { type: 'history-exam', limit: 200 }) as any
      const items = (res.notes || []).map((n: any) => ({
        id: String(n._id),
        recordedAt: String(n.recordedAt || n.createdAt || ''),
        ...n.data,
        signature: n.sign || '',
      }))
      setRecords(items)
    }catch{} finally { setLoading(false) }
  }

  const add = async (d: any) => {
    try{
      if (editing?.id) {
        await hospitalApi.updateIpdClinicalNote(editing.id, {
          sign: d.signature || '',
          data: d,
        })
      } else {
        await hospitalApi.createIpdClinicalNote(encounterId, {
          type: 'history-exam',
          sign: d.signature || '',
          data: d,
        })
      }
      setOpen(false)
      setEditing(null)
      await reload()
    }catch(e: any){ alert(e?.message || 'Failed to save history form') }
  }

  const onEdit = (r: any) => {
    setEditing(r)
    setOpen(true)
  }

  const deleteRow = async () => {
    if (!confirmDeleteId) return
    try {
      await hospitalApi.deleteIpdClinicalNote(confirmDeleteId)
      setConfirmDeleteId(null)
      await reload()
    } catch (e: any) { alert(e?.message || 'Failed to delete') }
  }

  const printRecord = async (r: any) => {
    const s: any = await hospitalApi.getSettings().catch(()=>({}))
    const hospitalName = String(s?.name || 'Hospital')
    const hospitalAddress = String(s?.address || '')
    const hospitalPhone = String(s?.phone || '')
    const hospitalLogo = String(s?.logoUrl || s?.logo || '')

    const esc = (v?: string)=> (v||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')

    const overlay = document.createElement('div')
    overlay.id = 'hx-print-overlay'
    overlay.style.cssText = 'position:fixed;inset:0;z-index:99999;background:rgba(0,0,0,0.5);display:flex;align-items:center;justify-content:center;padding:16px;'

    const vit = r?.vitals || {}
    const brandLine = [hospitalAddress, hospitalPhone ? `Phone: ${hospitalPhone}` : ''].filter(Boolean).join(' | ')

    overlay.innerHTML = `
    <style>
      @page { size: A4; margin: 10mm; }
      @media print {
        body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        body * { visibility: hidden !important; }
        #hx-print-overlay, #hx-print-overlay * { visibility: visible !important; }
        #hx-print-overlay { position: fixed !important; inset: 0 !important; background: transparent !important; padding: 0 !important; }
        #hx-sheet { width: auto !important; max-height: none !important; overflow: visible !important; border-radius: 0 !important; box-shadow: none !important; }
        #hx-actions { display: none !important; }
      }
    </style>
    <div id="hx-sheet" style="position:relative;width:210mm;max-height:90vh;overflow:auto;background:white;border-radius:12px;box-shadow:0 25px 50px -12px rgba(0,0,0,0.25);padding:18px;font-family:system-ui,-apple-system,Segoe UI,Roboto,Arial,sans-serif;color:#0f172a;">
      <div id="hx-actions" style="display:flex;justify-content:flex-end;gap:8px;margin-bottom:12px;">
        <button id="hx-print-btn" style="cursor:pointer;border:1px solid #4f46e5;background:#4f46e5;color:white;padding:6px 14px;border-radius:10px;font-size:12px;font-weight:800;">Print</button>
        <button id="hx-close-btn" style="cursor:pointer;border:1px solid #cbd5e1;background:white;color:#334155;padding:6px 14px;border-radius:10px;font-size:12px;font-weight:800;">Close</button>
      </div>

      <div style="border:1px solid #cbd5e1;border-radius:12px;overflow:hidden;">
        <div style="background:linear-gradient(90deg,#0f172a,#1e293b);color:#fff;padding:12px 14px;display:flex;gap:12px;align-items:center;">
          ${hospitalLogo ? `<div style=\"width:44px;height:44px;border-radius:10px;background:#fff;display:flex;align-items:center;justify-content:center;overflow:hidden;\"><img src=\"${esc(hospitalLogo)}\" style=\"width:100%;height:100%;object-fit:contain;\" /></div>` : `<div style=\"width:44px;height:44px;border-radius:10px;background:rgba(255,255,255,0.12);\"></div>`}
          <div style="flex:1;min-width:0;">
            <div style="font-size:16px;font-weight:900;letter-spacing:0.06em;text-transform:uppercase;line-height:1.1;">${esc(hospitalName)}</div>
            <div style="font-size:11px;opacity:0.92;margin-top:2px;">${esc(brandLine)}</div>
            <div style="margin-top:6px;font-size:11px;font-weight:900;letter-spacing:0.18em;text-transform:uppercase;opacity:0.95;">History & Physical Examination</div>
          </div>
          <div style="text-align:right;">
            <div style="font-size:10px;font-weight:900;letter-spacing:0.18em;text-transform:uppercase;opacity:0.8;">MR No</div>
            <div style="font-size:13px;font-weight:900;font-family:ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,monospace;">${esc(r?.mrNumber)}</div>
          </div>
        </div>

        <div style="padding:10px 14px;font-size:11px;color:#0f172a;display:grid;grid-template-columns:1.2fr 1fr 1fr;gap:10px;align-items:end;">
          <div>
            <div style="font-size:10px;font-weight:900;letter-spacing:0.12em;text-transform:uppercase;color:#64748b;">Patient</div>
            <div style="margin-top:2px;font-size:12px;font-weight:800;">${esc(r?.patientName)}</div>
          </div>
          <div>
            <div style="font-size:10px;font-weight:900;letter-spacing:0.12em;text-transform:uppercase;color:#64748b;">Date / Time</div>
            <div style="margin-top:2px;font-size:12px;font-weight:800;">${esc(r?.date)} ${esc(r?.time)}</div>
          </div>
          <div>
            <div style="font-size:10px;font-weight:900;letter-spacing:0.12em;text-transform:uppercase;color:#64748b;">Doctor</div>
            <div style="margin-top:2px;font-size:12px;font-weight:800;">${esc(r?.doctorName)}</div>
          </div>
        </div>
      </div>

      <div style="margin-top:10px;font-size:11px;">
        ${row('Presenting Complaints', r?.presentingComplaints)}
        ${row('Medication History', r?.medicationHistory)}
        ${row('Family History', r?.familyHistory)}
        ${row('Allergies', r?.allergies)}
        <div style="margin-top:8px;border:1px solid #e2e8f0;border-radius:10px;overflow:hidden;">
          <div style="background:#f8fafc;padding:7px 10px;font-size:11px;font-weight:900;letter-spacing:0.12em;text-transform:uppercase;color:#64748b;">Vitals</div>
          <div style="display:grid;grid-template-columns:1fr 1fr 1fr 1fr;gap:1px;background:#e2e8f0;">
            ${cell('BP', vit?.bp)}
            ${cell('Pulse', vit?.pulse)}
            ${cell('Temp', vit?.temp)}
            ${cell('R/R', vit?.rr)}
          </div>
        </div>
        ${row('General Physical Examination', r?.generalPhysicalExamination)}
        ${row('Provisional Diagnosis', r?.provisionalDiagnosis)}
        ${row('Investigations', r?.investigations)}
        ${row('Final Diagnosis', r?.finalDiagnosis)}
        ${row('Treatment Plan', r?.treatmentPlan)}
        <div style="margin-top:8px;display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;">
          ${mini('General Status', r?.generalStatus)}
          ${mini('Weight', r?.weight ? String(r?.weight)+' kg' : '')}
          ${mini('Height', r?.height)}
        </div>
        ${row('Advised Diet', r?.advisedDiet)}
      </div>

      <div style="margin-top:12px;border-top:1px solid #e2e8f0;padding-top:8px;font-size:10px;color:#64748b;display:flex;justify-content:space-between;gap:10px;">
        <div style="font-weight:700;">Recorded: ${esc(r?.recordedAt ? new Date(r.recordedAt).toLocaleString() : '')}</div>
        <div style="font-weight:700;">Signature: ${esc(r?.signature || '')}</div>
      </div>
      <div style="margin-top:6px;font-size:9px;color:#94a3b8;display:flex;justify-content:space-between;">
        <div>${esc(hospitalName)} | PHC Standard Clinical Documentation</div>
        <div>Printed: ${new Date().toLocaleString()}</div>
      </div>
    </div>
    `

    function row(label: string, val: any){
      return `
      <div style="margin-top:8px;border:1px solid #e2e8f0;border-radius:10px;overflow:hidden;">
        <div style="background:#f8fafc;padding:7px 10px;font-size:11px;font-weight:900;letter-spacing:0.12em;text-transform:uppercase;color:#64748b;">${esc(label)}</div>
        <div style="padding:8px 10px;min-height:40px;white-space:pre-wrap;line-height:1.4;color:#0f172a;">${esc(String(val||'')) || '<span style=\"color:#cbd5e1;font-style:italic\">Not recorded</span>'}</div>
      </div>`
    }
    function cell(label: string, val: any){
      return `
      <div style="background:white;padding:8px 10px;">
        <div style="font-size:10px;font-weight:900;letter-spacing:0.12em;text-transform:uppercase;color:#64748b;">${esc(label)}</div>
        <div style="margin-top:2px;font-size:12px;font-weight:800;color:#0f172a;">${esc(String(val||'')) || '—'}</div>
      </div>`
    }
    function mini(label: string, val: any){
      return `
      <div style="border:1px solid #e2e8f0;border-radius:10px;padding:8px 10px;background:#f8fafc;display:flex;justify-content:space-between;gap:8px;">
        <div style="font-size:10px;font-weight:900;letter-spacing:0.12em;text-transform:uppercase;color:#64748b;">${esc(label)}</div>
        <div style="font-size:12px;font-weight:900;color:#0f172a;">${esc(String(val||'')) || '—'}</div>
      </div>`
    }

    document.body.appendChild(overlay)
    const onClose = ()=> { try { overlay.remove(); document.removeEventListener('keydown', onKey) } catch {} }
    const onPrint = ()=> {
      const btns = document.getElementById('hx-actions') as HTMLElement|null
      if (btns) btns.style.display = 'none'
      try { window.print() } catch {}
      setTimeout(()=>{ if (btns) btns.style.display = 'flex' }, 500)
    }
    const onKey = (e: KeyboardEvent)=> { if (e.key === 'Escape') onClose() }
    document.getElementById('hx-close-btn')?.addEventListener('click', onClose)
    document.getElementById('hx-print-btn')?.addEventListener('click', onPrint)
    document.addEventListener('keydown', onKey)
  }

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-500/10 text-indigo-600">
            <History className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-xl font-black tracking-tight text-slate-900 uppercase">History & Examination</h1>
            <p className="text-xs font-bold uppercase tracking-widest text-slate-400">Standard PHC Medical Record</p>
          </div>
        </div>
        <button 
          onClick={()=>setOpen(true)} 
          className="group flex items-center gap-2 rounded-2xl bg-indigo-600 px-6 py-3 text-sm font-black text-white shadow-xl shadow-indigo-600/20 transition hover:bg-indigo-700 active:scale-95"
        >
          <Plus className="h-4 w-4 transition-transform group-hover:rotate-90" />
          Prepare New Form
        </button>
      </div>

      {loading ? (
        <div className="flex min-h-[200px] flex-col items-center justify-center p-8 text-slate-400">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-indigo-600" />
          <p className="mt-4 text-xs font-bold uppercase tracking-widest">Loading Clinical Data...</p>
        </div>
      ) : records.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-4 rounded-3xl border-2 border-dashed border-slate-200 bg-white/50 p-12 text-center transition-all hover:bg-white">
          <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-slate-100 text-slate-400">
            <History className="h-8 w-8" />
          </div>
          <div>
            <h3 className="text-lg font-black text-slate-900 uppercase">No Clinical History</h3>
            <p className="text-sm font-medium text-slate-500">Record a standard PHC history form for this patient.</p>
          </div>
          <button onClick={()=>setOpen(true)} className="text-xs font-black uppercase tracking-widest text-indigo-600 hover:underline">
            Click here to add one
          </button>
        </div>
      ) : (
        <div className="space-y-8 pb-10">
          {records.map(r => (
            <div key={r.id} className="animate-in fade-in slide-in-from-bottom-2 duration-300">
              <div className="flex items-center justify-end gap-2 mb-2">
                <button
                  onClick={()=>void printRecord(r)}
                  className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-[11px] font-black text-slate-700 shadow-sm transition hover:bg-slate-50 active:scale-[0.99]"
                >
                  <Printer className="h-4 w-4" />
                  Print
                </button>
                <button
                  onClick={()=>onEdit(r)}
                  className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-3 py-2 text-[11px] font-black text-white shadow-sm transition hover:bg-slate-800 active:scale-[0.99]"
                >
                  <Pencil className="h-4 w-4" />
                  Edit
                </button>
                <button
                  onClick={()=>setConfirmDeleteId(r.id)}
                  className="inline-flex items-center gap-2 rounded-xl border border-rose-200 px-3 py-2 text-[11px] font-black text-rose-600 shadow-sm transition hover:bg-rose-50 active:scale-[0.99]"
                >
                  <Trash2 className="h-4 w-4" />
                  Delete
                </button>
              </div>
              <HistoryFormDisplay data={r} />
              <div className="mt-4 flex items-center justify-end gap-2 text-[10px] font-black uppercase tracking-widest text-slate-400">
                <Clock className="h-3 w-3" />
                Record Finalized: {new Date(r.recordedAt).toLocaleString()}
              </div>
            </div>
          ))}
        </div>
      )}

      <HistoryDialog open={open} onClose={()=>{ setOpen(false); setEditing(null) }} onSave={add} encounterId={encounterId} initial={editing} />
      <ConfirmDialog open={!!confirmDeleteId} title="Delete History Record" message="Are you sure you want to delete this history & examination record?" confirmText="Delete" onCancel={()=>setConfirmDeleteId(null)} onConfirm={deleteRow} />
    </div>
  )
}

function HistoryFormDisplay({ data }: { data: any }) {
  return (
    <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-xl shadow-slate-200/30 transition-all hover:shadow-2xl hover:shadow-slate-200/40">
      {/* Form Header - Minimal */}
      <div className="border-b border-slate-100 bg-slate-50/50 p-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-lg shadow-indigo-100">
              <FileText className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-black tracking-tight uppercase text-slate-900 leading-none">History & Physical Examination</h2>
              <p className="mt-1 text-[10px] font-black uppercase tracking-widest text-slate-400">Formal Medical Record</p>
            </div>
          </div>
          <div className="flex items-center gap-6">
            <div className="text-right">
              <span className="block text-[9px] font-black uppercase tracking-widest text-slate-400 leading-none mb-1">Date & Time</span>
              <span className="text-xs font-bold text-slate-700">{data.date || '-'} at {data.time || '-'}</span>
            </div>
            <div className="h-8 w-px bg-slate-200" />
            <div className="text-right">
              <span className="block text-[9px] font-black uppercase tracking-widest text-slate-400 leading-none mb-1">MR Number</span>
              <span className="text-xs font-black font-mono text-indigo-600">{data.mrNumber || '-'}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Clinical Flow - Systematic Layout */}
      <div className="p-8 space-y-8">
        <ClinicalRow label="Presenting Complaints" value={data.presentingComplaints} icon={Stethoscope} />
        <ClinicalRow label="Medication History" value={data.medicationHistory} icon={Pill} />
        <ClinicalRow label="Family / Personal History" value={data.familyHistory} icon={User} />
        <ClinicalRow label="Allergies" value={data.allergies} icon={ShieldAlert} />

        {/* Vitals Grid - Minimal Table Style */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-slate-400">
            <Activity className="h-4 w-4" />
            <span className="text-[10px] font-black uppercase tracking-widest">Baseline Vitals</span>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-slate-100 overflow-hidden rounded-2xl border border-slate-100">
            <VitalCell label="Blood Pressure" value={data.vitals?.bp} unit="mmHg" />
            <VitalCell label="Pulse Rate" value={data.vitals?.pulse} unit="bpm" />
            <VitalCell label="Body Temp" value={data.vitals?.temp} unit="°F" />
            <VitalCell label="Resp Rate" value={data.vitals?.rr} unit="/min" />
          </div>
        </div>

        <ClinicalRow label="General Physical Examination" value={data.generalPhysicalExamination} icon={ClipboardList} />
        
        <div className="grid gap-8 md:grid-cols-2">
          <ClinicalRow label="Provisional Diagnosis" value={data.provisionalDiagnosis} icon={Info} />
          <ClinicalRow label="Investigations" value={data.investigations} icon={ClipboardList} />
        </div>

        <ClinicalRow label="Final Diagnosis" value={data.finalDiagnosis} icon={CheckCircle2} />
        <ClinicalRow label="Treatment Plan" value={data.treatmentPlan} icon={ClipboardList} />

        {/* Footer Metrics & Signature */}
        <div className="pt-8 border-t border-slate-100 grid gap-8 md:grid-cols-3">
          <div className="flex items-center justify-between p-4 rounded-2xl bg-slate-50 border border-slate-100">
            <span className="text-[10px] font-black uppercase text-slate-400">General Status</span>
            <span className="text-sm font-bold text-slate-900">{data.generalStatus || '-'}</span>
          </div>
          <div className="flex items-center justify-between p-4 rounded-2xl bg-slate-50 border border-slate-100">
            <span className="text-[10px] font-black uppercase text-slate-400">Body Weight</span>
            <span className="text-sm font-bold text-slate-900">{data.weight || '-'} kg</span>
          </div>
          <div className="flex items-center justify-between p-4 rounded-2xl bg-slate-50 border border-slate-100">
            <span className="text-[10px] font-black uppercase text-slate-400">Patient Height</span>
            <span className="text-sm font-bold text-slate-900">{data.height || '-'}</span>
          </div>
        </div>

        <ClinicalRow label="Advised Diet" value={data.advisedDiet} icon={Info} />

        <div className="flex items-center justify-between pt-6">
          <div className="text-[10px] font-bold text-slate-400 italic">PHC Standard Clinical Documentation</div>
          <div className="text-right">
            <span className="block text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1">Attending Physician</span>
            <p className="text-sm font-black text-slate-900 uppercase">Dr. {data.doctorName || '-'}</p>
          </div>
        </div>
      </div>
    </div>
  )
}

function ClinicalRow({ label, value, icon: Icon }: any) {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 text-slate-400">
        <Icon className="h-3.5 w-3.5" />
        <span className="text-[10px] font-black uppercase tracking-widest">{label}:</span>
      </div>
      <div className="rounded-xl bg-slate-50/50 p-4 text-sm font-medium text-slate-700 leading-relaxed min-h-12 border border-slate-50">
        {value || <span className="text-slate-300 italic text-xs">Not recorded</span>}
      </div>
    </div>
  )
}

function VitalCell({ label, value, unit }: any) {
  return (
    <div className="bg-white p-4">
      <span className="block text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1">{label}</span>
      <div className="flex items-baseline gap-1">
        <span className="text-base font-black text-slate-900">{value || '--'}</span>
        <span className="text-[9px] font-bold text-slate-400">{unit}</span>
      </div>
    </div>
  )
}

function HistoryDialog({ open, onClose, onSave, encounterId, initial }: any) {
  const [form, setForm] = useState({
    mrNumber: '', patientName: '', age: '', gender: '', bedLabel: '',
    date: new Date().toISOString().slice(0, 10),
    time: new Date().toTimeString().slice(0, 5),
    presentingComplaints: '', medicationHistory: '', familyHistory: '', allergies: '',
    vitals: { vitalc: '', bp: '', pulse: '', temp: '', rr: '' },
    generalPhysicalExamination: '', provisionalDiagnosis: '', investigations: '',
    finalDiagnosis: '', treatmentPlan: '', generalStatus: '', weight: '', height: '',
    advisedDiet: '', doctorName: '', signature: '',
  })

  useEffect(()=>{
    if (!open) return

    if (initial) {
      setForm({
        mrNumber: initial.mrNumber || '',
        patientName: initial.patientName || '',
        age: initial.age || '',
        gender: initial.gender || '',
        bedLabel: initial.bedLabel || '',
        date: initial.date || new Date().toISOString().slice(0, 10),
        time: initial.time || new Date().toTimeString().slice(0, 5),
        presentingComplaints: initial.presentingComplaints || '',
        medicationHistory: initial.medicationHistory || '',
        familyHistory: initial.familyHistory || '',
        allergies: initial.allergies || '',
        vitals: {
          vitalc: initial.vitals?.vitalc || '',
          bp: initial.vitals?.bp || '',
          pulse: initial.vitals?.pulse || '',
          temp: initial.vitals?.temp || '',
          rr: initial.vitals?.rr || '',
        },
        generalPhysicalExamination: initial.generalPhysicalExamination || '',
        provisionalDiagnosis: initial.provisionalDiagnosis || '',
        investigations: initial.investigations || '',
        finalDiagnosis: initial.finalDiagnosis || '',
        treatmentPlan: initial.treatmentPlan || '',
        generalStatus: initial.generalStatus || '',
        weight: initial.weight || '',
        height: initial.height || '',
        advisedDiet: initial.advisedDiet || '',
        doctorName: initial.doctorName || '',
        signature: initial.signature || '',
      })
      return
    }

    ;(async()=>{
      try{
        const res = await hospitalApi.getIPDAdmissionById(String(encounterId)) as any
        const enc = res?.encounter || null
        const p = enc?.patientId || res?.patient || res?.patientId
        const mr = String(p?.mrNumber || p?.mrNo || p?.mr || p?.mrn || '')
        const name = String(p?.fullName || p?.name || '')
        const age = String(p?.age || '')
        const gender = String(p?.gender || '')
        const bed = String(enc?.bedLabel || enc?.bedId || '')
        const doc = String(enc?.doctorId?.name || '')
        setForm(prev => ({
          ...prev,
          mrNumber: prev.mrNumber || mr,
          patientName: prev.patientName || name,
          age: prev.age || age,
          gender: prev.gender || gender,
          bedLabel: prev.bedLabel || bed,
          doctorName: prev.doctorName || doc,
        }))
      }catch{}
    })()
  }, [open, initial, encounterId])

  const updateVitals = (key: string, value: string) => {
    setForm({ ...form, vitals: { ...form.vitals, [key]: value } })
  }

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    onSave(form)
  }

  return (
    <ClinicalDialogShell open={open} title={initial ? 'Edit History & Examination' : 'History & Physical Examination'} subtitle="Standard PHC Medical Record" icon={History} onClose={onClose} onSubmit={submit} submitText="Finalize Record" maxWidth="max-w-4xl">
      <div className="space-y-6">
        <div className="grid gap-3 sm:grid-cols-4">
          <div><label className={clinicalLbl}>MR Number</label><input value={form.mrNumber} onChange={e=>setForm({...form,mrNumber:e.target.value})} placeholder="e.g. MR-2024" className={clinicalInp} /></div>
          <div><label className={clinicalLbl}>Patient Name</label><input value={form.patientName} onChange={e=>setForm({...form,patientName:e.target.value})} placeholder="Full Name" className={clinicalInp} /></div>
          <div><label className={clinicalLbl}>Age</label><input value={form.age} onChange={e=>setForm({...form,age:e.target.value})} placeholder="e.g. 45Y" className={clinicalInp} /></div>
          <div><label className={clinicalLbl}>Gender</label><input value={form.gender} onChange={e=>setForm({...form,gender:e.target.value})} placeholder="Male/Female" className={clinicalInp} /></div>
          <div><label className={clinicalLbl}>Bed</label><input value={form.bedLabel} onChange={e=>setForm({...form,bedLabel:e.target.value})} placeholder="Bed #" className={clinicalInp} /></div>
          <div><label className={clinicalLbl}>Doctor</label><input value={form.doctorName} onChange={e=>setForm({...form,doctorName:e.target.value})} placeholder="Dr. Name" className={clinicalInp} /></div>
          <div><label className={clinicalLbl}>Date</label><input type="date" value={form.date} onChange={e=>setForm({...form,date:e.target.value})} className={clinicalInp} /></div>
          <div><label className={clinicalLbl}>Time</label><input type="time" value={form.time} onChange={e=>setForm({...form,time:e.target.value})} className={clinicalInp} /></div>
        </div>

        <div className="space-y-3">
          <div className="flex items-center gap-2 text-slate-400"><Stethoscope className="h-4 w-4" /><span className="text-[10px] font-black uppercase tracking-widest">Clinical History</span></div>
          <div><label className={clinicalLbl}>Presenting Complaints</label><textarea value={form.presentingComplaints} onChange={e=>setForm({...form,presentingComplaints:e.target.value})} rows={2} className={clinicalInp+' resize-none'}></textarea></div>
          <div className="grid gap-3 md:grid-cols-2">
            <div><label className={clinicalLbl}>Medication History</label><textarea value={form.medicationHistory} onChange={e=>setForm({...form,medicationHistory:e.target.value})} rows={2} className={clinicalInp+' resize-none'}></textarea></div>
            <div><label className={clinicalLbl}>Family / Personal History</label><textarea value={form.familyHistory} onChange={e=>setForm({...form,familyHistory:e.target.value})} rows={2} className={clinicalInp+' resize-none'}></textarea></div>
          </div>
          <div><label className={clinicalLbl}>Allergies</label><input value={form.allergies} onChange={e=>setForm({...form,allergies:e.target.value})} placeholder="Known allergies..." className={clinicalInp} /></div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-slate-400"><Activity className="h-4 w-4" /><span className="text-[10px] font-black uppercase tracking-widest">Baseline Vitals</span></div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className={clinicalLbl}>BP</label><input value={form.vitals.bp} onChange={e=>updateVitals('bp',e.target.value)} placeholder="120/80" className={clinicalInp} /></div>
              <div><label className={clinicalLbl}>Pulse</label><input value={form.vitals.pulse} onChange={e=>updateVitals('pulse',e.target.value)} placeholder="72" className={clinicalInp} /></div>
              <div><label className={clinicalLbl}>Temp</label><input value={form.vitals.temp} onChange={e=>updateVitals('temp',e.target.value)} placeholder="98.6" className={clinicalInp} /></div>
              <div><label className={clinicalLbl}>R/R</label><input value={form.vitals.rr} onChange={e=>updateVitals('rr',e.target.value)} placeholder="18" className={clinicalInp} /></div>
            </div>
          </div>
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-slate-400"><User className="h-4 w-4" /><span className="text-[10px] font-black uppercase tracking-widest">Physical Status</span></div>
            <div className="grid grid-cols-3 gap-3">
              <div><label className={clinicalLbl}>General Status</label><input value={form.generalStatus} onChange={e=>setForm({...form,generalStatus:e.target.value})} className={clinicalInp} /></div>
              <div><label className={clinicalLbl}>Weight (kg)</label><input value={form.weight} onChange={e=>setForm({...form,weight:e.target.value})} className={clinicalInp} /></div>
              <div><label className={clinicalLbl}>Height</label><input value={form.height} onChange={e=>setForm({...form,height:e.target.value})} className={clinicalInp} /></div>
            </div>
            <div><label className={clinicalLbl}>General Physical Examination</label><textarea value={form.generalPhysicalExamination} onChange={e=>setForm({...form,generalPhysicalExamination:e.target.value})} rows={2} className={clinicalInp+' resize-none'}></textarea></div>
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex items-center gap-2 text-slate-400"><ClipboardList className="h-4 w-4" /><span className="text-[10px] font-black uppercase tracking-widest">Medical Conclusion</span></div>
          <div className="grid gap-3 md:grid-cols-2">
            <div><label className={clinicalLbl}>Provisional Diagnosis</label><textarea value={form.provisionalDiagnosis} onChange={e=>setForm({...form,provisionalDiagnosis:e.target.value})} rows={2} className={clinicalInp+' resize-none'}></textarea></div>
            <div><label className={clinicalLbl}>Investigations</label><textarea value={form.investigations} onChange={e=>setForm({...form,investigations:e.target.value})} rows={2} className={clinicalInp+' resize-none'}></textarea></div>
            <div><label className={clinicalLbl}>Final Diagnosis</label><textarea value={form.finalDiagnosis} onChange={e=>setForm({...form,finalDiagnosis:e.target.value})} rows={2} className={clinicalInp+' resize-none'}></textarea></div>
            <div><label className={clinicalLbl}>Treatment Plan</label><textarea value={form.treatmentPlan} onChange={e=>setForm({...form,treatmentPlan:e.target.value})} rows={2} className={clinicalInp+' resize-none'}></textarea></div>
          </div>
          <div><label className={clinicalLbl}>Advised Diet</label><input value={form.advisedDiet} onChange={e=>setForm({...form,advisedDiet:e.target.value})} className={clinicalInp} /></div>
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          <div><label className={clinicalLbl}>Physician Name</label><input value={form.doctorName} onChange={e=>setForm({...form,doctorName:e.target.value})} placeholder="Dr. Full Name" className={clinicalInp} /></div>
          <div><label className={clinicalLbl}>Digital Signature</label><input value={form.signature} onChange={e=>setForm({...form,signature:e.target.value})} placeholder="Full signature name" className={clinicalInp} /></div>
        </div>
      </div>
    </ClinicalDialogShell>
  )
}

