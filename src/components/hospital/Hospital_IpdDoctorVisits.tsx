import { useEffect, useState } from 'react'
import { hospitalApi } from '../../utils/api'
import { 
  Stethoscope, Plus, Save, X, Clock, 
  Activity, ClipboardList, Info, CheckCircle2
} from 'lucide-react'
import Toast, { type ToastState } from '../ui/Toast'
import { ClinicalDatePicker } from '../ui/ClinicalDialog'

export default function Hospital_IpdDoctorVisits({ encounterId }: { encounterId: string }){
  const [visits, setVisits] = useState<any[]>([])
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [toast, setToast] = useState<ToastState>(null)

  useEffect(()=>{ if(encounterId){ reload() } }, [encounterId])

  async function reload(){
    setLoading(true)
    try{
      const res = await hospitalApi.listIpdDoctorVisits(encounterId, { limit: 200 }) as any
      setVisits(res.visits || [])
    }catch{} finally { setLoading(false) }
  }

  const saveVisit = async (v: any) => {
    try{
      await hospitalApi.createIpdDoctorVisit(encounterId, v)
      setOpen(false)
      setToast({ type: 'success', message: 'Doctor visit recorded successfully' })
      await reload()
    }catch(e: any){ setToast({ type: 'error', message: e?.message || 'Failed to save visit' }) }
  }

  return (
    <div className="space-y-6">
      <Toast toast={toast} onClose={()=>setToast(null)} />
      
      {/* Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between rounded-3xl border border-slate-200 bg-white p-6 shadow-sm overflow-hidden relative">
        <div className="absolute right-0 top-0 opacity-[0.03] pointer-events-none transform translate-x-1/4 -translate-y-1/4">
          <Stethoscope className="h-48 w-48 text-indigo-600" />
        </div>
        <div className="flex items-center gap-4 relative z-10">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-500/10 text-indigo-600">
            <Stethoscope className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-xl font-black tracking-tight text-slate-900 uppercase">Consultant Visits</h1>
            <p className="text-xs font-bold uppercase tracking-widest text-slate-400">Daily Medical Rounds Record</p>
          </div>
        </div>
        <button 
          onClick={()=>setOpen(true)} 
          className="group flex items-center gap-2 rounded-2xl bg-indigo-600 px-6 py-3 text-sm font-black text-white shadow-xl shadow-indigo-600/20 transition hover:bg-indigo-700 active:scale-95 relative z-10"
        >
          <Plus className="h-4 w-4 transition-transform group-hover:rotate-90" />
          New Round Entry
        </button>
      </div>

      {loading ? (
        <div className="flex min-h-[200px] flex-col items-center justify-center p-8 text-slate-400">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-indigo-600" />
          <p className="mt-4 text-xs font-bold uppercase tracking-widest">Loading Records...</p>
        </div>
      ) : visits.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-4 rounded-3xl border-2 border-dashed border-slate-200 bg-white/50 p-12 text-center transition-all hover:bg-white">
          <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-slate-100 text-slate-400">
            <ClipboardList className="h-8 w-8" />
          </div>
          <div>
            <h3 className="text-lg font-black text-slate-900 uppercase">No Clinical Rounds</h3>
            <p className="text-sm font-medium text-slate-500">Document the first consultant round for this admission.</p>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {visits.map(v => (
            <div key={v._id} className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-lg shadow-slate-200/30 transition-all hover:shadow-xl hover:shadow-slate-200/40 animate-in fade-in slide-in-from-bottom-2 duration-300">
              <div className="bg-slate-900 px-8 py-4 flex items-center justify-between">
                <div className="flex items-center gap-3 text-white">
                  <Activity className="h-5 w-5 text-indigo-400" />
                  <span className="text-xs font-black uppercase tracking-widest">Physician Round Summary</span>
                </div>
                <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-400">
                  <Clock className="h-3 w-3" />
                  {new Date(v.when || v.createdAt).toLocaleString()}
                </div>
              </div>
              <div className="p-8">
                <div className="grid gap-8 lg:grid-cols-12">
                  {/* Left Column: Progress Notes */}
                  <div className="lg:col-span-8 space-y-6">
                    <SoapSection label="Subjective" value={v.subjective} icon={Info} theme="sky" />
                    <SoapSection label="Objective / Exam" value={v.objective} icon={Stethoscope} theme="rose" />
                    <SoapSection label="Assessment" value={v.assessment} icon={ClipboardList} theme="amber" />
                    <SoapSection label="Management Plan" value={v.plan} icon={CheckCircle2} theme="emerald" />
                  </div>

                  {/* Right Column: Meta & Signature */}
                  <div className="lg:col-span-4 space-y-6">
                    <div className="rounded-2xl bg-slate-50/50 p-6 border border-slate-100 space-y-6">
                      <div className="space-y-1">
                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Attending Physician</span>
                        <p className="text-sm font-black text-slate-900 uppercase">Dr. {v.doctorId?.name || '-'}</p>
                      </div>
                      <div className="h-px bg-slate-200" />
                      <div className="space-y-2">
                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Notes / Instructions</span>
                        <p className="text-xs font-medium text-slate-600 italic leading-relaxed">
                          {v.plan ? 'Systematic management plan recorded for this patient round.' : 'No additional clinical notes recorded.'}
                        </p>
                      </div>
                    </div>
                    <div className="rounded-2xl border-2 border-dashed border-slate-100 p-6 flex flex-col items-center justify-center text-center">
                      <div className="h-10 w-1.5 rounded-full bg-indigo-100 mb-3" />
                      <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Verified Clinical Entry</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <VisitDialog open={open} onClose={()=>setOpen(false)} onSave={saveVisit} />
    </div>
  )
}

function SoapSection({ label, value, icon: Icon, theme }: any) {
  const colors: Record<string, string> = {
    sky: 'text-sky-600 bg-sky-50',
    rose: 'text-rose-600 bg-rose-50',
    amber: 'text-amber-600 bg-amber-50',
    emerald: 'text-emerald-600 bg-emerald-50',
  }
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <div className={`flex h-7 w-7 items-center justify-center rounded-lg ${colors[theme]}`}>
          <Icon className="h-4 w-4" />
        </div>
        <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-500">{label}</h4>
      </div>
      <div className="rounded-2xl border border-slate-100 bg-white p-4 text-sm font-medium text-slate-700 whitespace-pre-wrap leading-relaxed shadow-sm">
        {value || <span className="text-slate-300 italic">Not recorded</span>}
      </div>
    </div>
  )
}

function VisitDialog({ open, onClose, onSave }: any) {
  const [form, setForm] = useState({
    when: new Date().toISOString().slice(0, 16),
    subjective: '', objective: '', assessment: '', plan: '',
    doctorId: '',
  })
  const [doctors, setDoctors] = useState<any[]>([])

  useEffect(() => {
    if (open) {
      void (async () => {
        try {
          const res: any = await hospitalApi.listDoctors()
          setDoctors(res?.doctors || res || [])
        } catch {}
      })()
    }
  }, [open])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="max-h-[90vh] w-full max-w-4xl flex flex-col overflow-hidden rounded-[2.5rem] bg-white shadow-2xl ring-1 ring-black/5">
        <div className="flex items-center justify-between bg-slate-50 px-8 py-6 border-b border-slate-100">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-600 text-white shadow-lg shadow-indigo-200">
              <Stethoscope className="h-6 w-6" />
            </div>
            <div>
              <h3 className="text-xl font-black tracking-tight text-slate-900 uppercase leading-none">Record Physician Round</h3>
              <p className="mt-1.5 text-[10px] font-black uppercase tracking-widest text-slate-400">Formal Medical Progress Note (SOAP)</p>
            </div>
          </div>
          <button onClick={onClose} className="rounded-xl p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600">
            <X className="h-6 w-6" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-8 space-y-8">
          <div className="grid gap-6 md:grid-cols-2">
            <div>
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1.5 block">Attending Consultant</label>
              <select 
                value={form.doctorId} 
                onChange={e=>setForm({...form, doctorId: e.target.value})}
                className="w-full rounded-2xl border-2 border-slate-100 bg-white px-4 py-3 text-sm font-bold text-slate-900 focus:border-indigo-500 focus:outline-none transition-all"
              >
                <option value="">Select Consultant</option>
                {doctors.map((d: any) => <option key={d._id} value={d._id}>{d.name}</option>)}
              </select>
            </div>
            <div>
              <ClinicalDatePicker label="Visit Date & Time" value={form.when} onChange={v=>setForm({...form, when: v})} />
            </div>
          </div>

          <div className="grid gap-8 md:grid-cols-2">
            <TextArea label="Subjective" value={form.subjective} onChange={(v:any)=>setForm({...form, subjective: v})} placeholder="Patient's complaints and history..." rows={4} />
            <TextArea label="Objective" value={form.objective} onChange={(v:any)=>setForm({...form, objective: v})} placeholder="Physical examination and clinical observations..." rows={4} />
            <TextArea label="Assessment" value={form.assessment} onChange={(v:any)=>setForm({...form, assessment: v})} placeholder="Clinical assessment and diagnosis status..." rows={4} />
            <TextArea label="Management Plan" value={form.plan} onChange={(v:any)=>setForm({...form, plan: v})} placeholder="Orders, medications, and next steps..." rows={4} />
          </div>
        </div>

        <div className="bg-slate-50 px-8 py-6 border-t border-slate-100 flex items-center justify-between">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Standard Physician Clinical Documentation</p>
          <div className="flex gap-3">
            <button onClick={onClose} className="rounded-2xl border border-slate-200 bg-white px-6 py-3 text-sm font-black text-slate-600 transition hover:bg-slate-100">Cancel</button>
            <button onClick={() => onSave(form)} className="flex items-center gap-2 rounded-2xl bg-indigo-600 px-8 py-3 text-sm font-black text-white shadow-xl shadow-indigo-600/20 transition hover:opacity-90">
              <Save className="h-4 w-4" />
              Finalize Note
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

function TextArea({ label, value, onChange, placeholder, rows }: any) {
  return (
    <div className="space-y-1.5">
      <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">{label}</label>
      <textarea
        value={value}
        placeholder={placeholder}
        rows={rows || 3}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-2xl border-2 border-slate-100 bg-white px-4 py-3 text-sm font-medium text-slate-900 focus:border-indigo-500 focus:outline-none transition-all resize-none placeholder:text-slate-300"
      />
    </div>
  )
}
