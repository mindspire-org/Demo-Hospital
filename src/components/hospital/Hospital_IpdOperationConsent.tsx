import { useEffect, useState } from 'react'
import { hospitalApi } from '../../utils/api'
import { printConsentForm } from '../../utils/printConsentForm'
import { 
  FileSignature, Printer, Plus, 
  User, Calendar, Info, ShieldCheck,
  Stethoscope, Activity, Pencil, Trash2
} from 'lucide-react'
import Toast, { type ToastState } from '../ui/Toast'
import { useEncounterDefaults } from '../../hooks/useEncounterDefaults'
import { ClinicalDialogShell, clinicalInp, clinicalLbl } from '../ui/ClinicalDialog'
import ConfirmDialog from '../ui/ConfirmDialog'

export default function Hospital_IpdOperationConsent({ encounterId }: { encounterId: string }){
  const [records, setRecords] = useState<any[]>([])
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [toast, setToast] = useState<ToastState>(null)
  const [editing, setEditing] = useState<any | null>(null)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
  const encDefaults = useEncounterDefaults(encounterId)

  useEffect(()=>{ if(encounterId){ reload() } }, [encounterId])

  async function reload(){
    setLoading(true)
    try{
      const res = await hospitalApi.listIpdClinicalNotes(encounterId, { type: 'operation-consent', limit: 200 }) as any
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
          type: 'operation-consent',
          sign: d.signature || '',
          data: d,
        })
      }
      setOpen(false); setEditing(null)
      setToast({ type: 'success', message: 'Operation consent saved successfully' })
      await reload()
    }catch(e: any){ setToast({ type: 'error', message: e?.message || 'Failed to save consent' }) }
  }

  const deleteRow = async () => {
    if (!confirmDeleteId) return
    try {
      await hospitalApi.deleteIpdClinicalNote(confirmDeleteId)
      setConfirmDeleteId(null)
      await reload()
    } catch (e: any) { alert(e?.message || 'Failed to delete') }
  }

  const onEdit = (r: any) => { setEditing(r); setOpen(true) }
  const onAdd = () => { setEditing(null); setOpen(true) }
  const onClose = () => { setOpen(false); setEditing(null) }

  const print = (r: any) => {
    void printConsentForm({
      ...r,
      patientName: r.patientName,
      mrn: r.mrNumber,
      date: r.date,
      time: r.time,
      guardianName: r.guardianName,
      relation: r.relation,
    })
  }

  return (
    <div className="space-y-6">
      <Toast toast={toast} onClose={()=>setToast(null)} />
      
      {/* Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between rounded-3xl border border-slate-200 bg-white p-6 shadow-sm overflow-hidden relative">
        <div className="absolute right-0 top-0 opacity-[0.03] pointer-events-none transform translate-x-1/4 -translate-y-1/4">
          <FileSignature className="h-48 w-48 text-indigo-600" />
        </div>
        <div className="flex items-center gap-4 relative z-10">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-500/10 text-indigo-600">
            <FileSignature className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-xl font-black tracking-tight text-slate-900 uppercase">Operation Consent</h1>
            <p className="text-xs font-bold uppercase tracking-widest text-slate-400">Surgical Authorization Record</p>
          </div>
        </div>
        <button 
          onClick={onAdd} 
          className="group flex items-center gap-2 rounded-2xl bg-indigo-600 px-6 py-3 text-sm font-black text-white shadow-xl shadow-indigo-600/20 transition hover:bg-indigo-700 active:scale-95 relative z-10"
        >
          <Plus className="h-4 w-4 transition-transform group-hover:rotate-90" />
          New Authorization
        </button>
      </div>

      {loading ? (
        <div className="flex min-h-[200px] flex-col items-center justify-center p-8 text-slate-400">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-indigo-600" />
          <p className="mt-4 text-xs font-bold uppercase tracking-widest">Loading Authorizations...</p>
        </div>
      ) : records.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-4 rounded-3xl border-2 border-dashed border-slate-200 bg-white/50 p-12 text-center transition-all hover:bg-white">
          <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-slate-100 text-slate-400">
            <ShieldCheck className="h-8 w-8" />
          </div>
          <div>
            <h3 className="text-lg font-black text-slate-900 uppercase">No Consent Recorded</h3>
            <p className="text-sm font-medium text-slate-500">Document surgical consent before any invasive procedure.</p>
          </div>
        </div>
      ) : (
        <div className="grid gap-6">
          {records.map(r => (
            <div key={r.id} className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-lg shadow-slate-200/30 transition-all hover:shadow-xl hover:shadow-slate-200/40">
              <div className="bg-slate-900 px-8 py-4 flex items-center justify-between">
                <div className="flex items-center gap-3 text-white">
                  <ShieldCheck className="h-5 w-5 text-indigo-400" />
                  <span className="text-xs font-black uppercase tracking-widest">Surgical Consent Authorization</span>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={()=>onEdit(r)} className="flex items-center gap-1 rounded-lg bg-white/10 px-3 py-1.5 text-[10px] font-bold text-white transition hover:bg-white/20"><Pencil className="h-3 w-3" />Edit</button>
                  <button onClick={()=>setConfirmDeleteId(r.id)} className="flex items-center gap-1 rounded-lg bg-rose-500/20 px-3 py-1.5 text-[10px] font-bold text-rose-200 transition hover:bg-rose-500/30"><Trash2 className="h-3 w-3" />Delete</button>
                  <button onClick={() => print(r)} className="flex items-center gap-1 rounded-lg bg-white/10 px-3 py-1.5 text-[10px] font-bold text-white transition hover:bg-white/20"><Printer className="h-3 w-3" />Print</button>
                </div>
              </div>
              <div className="p-8">
                <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-4">
                  <Detail label="Patient" value={r.patientName} icon={User} />
                  <Detail label="MR Number" value={r.mrNumber} icon={Info} />
                  <Detail label="Guardian" value={r.guardianName} subValue={r.relation} icon={User} />
                  <Detail label="Procedure" value={r.proposedProcedure} icon={Stethoscope} />
                  <Detail label="Doctor" value={r.doctorName} icon={Activity} />
                  <Detail label="Date/Time" value={`${r.date} @ ${r.time}`} icon={Calendar} />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <OperationDialog open={open} onClose={onClose} onSave={add} defaults={encDefaults} initial={editing} />
      <ConfirmDialog open={!!confirmDeleteId} title="Delete Consent" message="Are you sure you want to delete this operation consent?" confirmText="Delete" onCancel={()=>setConfirmDeleteId(null)} onConfirm={deleteRow} />
    </div>
  )
}

function Detail({ label, value, subValue, icon: Icon }: any) {
  return (
    <div className="space-y-1">
      <div className="flex items-center gap-2 mb-1.5">
        <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-slate-50 text-indigo-600 shadow-sm">
          <Icon className="h-3.5 w-3.5" />
        </div>
        <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">{label}</span>
      </div>
      <div className="text-sm font-black text-slate-900 uppercase truncate">{value || '-'}</div>
      {subValue && <div className="text-[10px] font-bold text-slate-400 italic">({subValue})</div>}
    </div>
  )
}

function OperationDialog({ open, onClose, onSave, defaults, initial }: any) {
  const [form, setForm] = useState({
    mrNumber: '', patientName: '', guardianName: '', relation: '',
    proposedProcedure: '', anesthesiaType: 'General', doctorName: '', signature: '',
    date: new Date().toISOString().slice(0, 10),
    time: new Date().toTimeString().slice(0, 5),
  })

  useEffect(()=>{
    if (!open) return
    if (initial) {
      setForm({
        mrNumber: initial.mrNumber || '',
        patientName: initial.patientName || '',
        guardianName: initial.guardianName || '',
        relation: initial.relation || '',
        proposedProcedure: initial.proposedProcedure || '',
        anesthesiaType: initial.anesthesiaType || 'General',
        doctorName: initial.doctorName || '',
        signature: initial.signature || '',
        date: initial.date || new Date().toISOString().slice(0, 10),
        time: initial.time || new Date().toTimeString().slice(0, 5),
      })
      return
    }
    setForm(prev => ({
      ...prev,
      mrNumber: prev.mrNumber || defaults?.mrn || '',
      patientName: prev.patientName || defaults?.patientName || '',
      guardianName: prev.guardianName || defaults?.fatherName || '',
      relation: prev.relation || defaults?.guardianRel || '',
      doctorName: prev.doctorName || defaults?.doctorName || '',
    }))
  }, [open, defaults, initial])

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    onSave(form)
  }

  return (
    <ClinicalDialogShell open={open} title={initial ? 'Edit Operation Consent' : 'Record Operation Consent'} subtitle="Formal Surgical Authorization" icon={FileSignature} onClose={onClose} onSubmit={submit} submitText="Finalize Consent" maxWidth="max-w-4xl">
      <div className="space-y-6">
        <div className="grid gap-3 sm:grid-cols-4">
          <div><label className={clinicalLbl}>MR Number</label><input value={form.mrNumber} onChange={e=>setForm({...form,mrNumber:e.target.value})} className={clinicalInp} /></div>
          <div><label className={clinicalLbl}>Patient Name</label><input value={form.patientName} onChange={e=>setForm({...form,patientName:e.target.value})} className={clinicalInp} /></div>
          <div><label className={clinicalLbl}>Guardian Name</label><input value={form.guardianName} onChange={e=>setForm({...form,guardianName:e.target.value})} className={clinicalInp} /></div>
          <div><label className={clinicalLbl}>Relation</label><input value={form.relation} onChange={e=>setForm({...form,relation:e.target.value})} className={clinicalInp} /></div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-slate-400"><Stethoscope className="h-4 w-4" /><span className="text-[10px] font-black uppercase tracking-widest">Surgical Details</span></div>
            <div><label className={clinicalLbl}>Proposed Procedure</label><textarea value={form.proposedProcedure} onChange={e=>setForm({...form,proposedProcedure:e.target.value})} rows={3} className={clinicalInp+' resize-none'}></textarea></div>
            <div><label className={clinicalLbl}>Type of Anesthesia</label><input value={form.anesthesiaType} onChange={e=>setForm({...form,anesthesiaType:e.target.value})} placeholder="e.g. General, Spinal, Local" className={clinicalInp} /></div>
          </div>
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-slate-400"><Calendar className="h-4 w-4" /><span className="text-[10px] font-black uppercase tracking-widest">Schedule & Verification</span></div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className={clinicalLbl}>Date</label><input type="date" value={form.date} onChange={e=>setForm({...form,date:e.target.value})} className={clinicalInp} /></div>
              <div><label className={clinicalLbl}>Time</label><input type="time" value={form.time} onChange={e=>setForm({...form,time:e.target.value})} className={clinicalInp} /></div>
            </div>
            <div><label className={clinicalLbl}>Operating Surgeon</label><input value={form.doctorName} onChange={e=>setForm({...form,doctorName:e.target.value})} placeholder="Dr. Full Name" className={clinicalInp} /></div>
            <div><label className={clinicalLbl}>Digital Signature</label><input value={form.signature} onChange={e=>setForm({...form,signature:e.target.value})} placeholder="Full signature name" className={clinicalInp} /></div>
          </div>
        </div>
      </div>
    </ClinicalDialogShell>
  )
}
