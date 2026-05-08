import React, { useEffect, useState } from 'react'
import { hospitalApi } from '../../utils/api'
import { 
  Plus, Clock, 
  Activity, ClipboardList, Info, CheckCircle2,
  Stethoscope
} from 'lucide-react'
import Toast, { type ToastState } from '../ui/Toast'
import { ClinicalDialogShell, clinicalInp, clinicalLbl } from '../ui/ClinicalDialog'

type VisitRow = {
  _id: string
  when: string
  doctorName?: string
  subjective?: string
  objective?: string
  assessment?: string
  plan?: string
}

export default function DailyProgressSheet({ encounterId }: { encounterId: string }){
  const [rows, setRows] = useState<VisitRow[]>([])
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [toast, setToast] = useState<ToastState>(null)

  useEffect(()=>{ if(encounterId){ reload() } }, [encounterId])

  async function reload(){
    setLoading(true)
    try{
      const res = await hospitalApi.listIpdDoctorVisits(encounterId, { limit: 200 }) as any
      const items = (res?.visits || []).map((v: any)=>({
        _id: String(v._id),
        when: String(v.when || v.createdAt || new Date().toISOString()),
        doctorName: v?.doctorId?.name,
        subjective: v.subjective,
        objective: v.objective,
        assessment: v.assessment,
        plan: v.plan,
      })) as VisitRow[]
      const filtered = items.filter(r => {
        const s = (r.subjective||'').trim()
        const o = (r.objective||'').trim()
        const a = (r.assessment||'').trim()
        const p = (r.plan||'').trim()
        return !!(s || o || a || p)
      })
      filtered.sort((a,b)=> new Date(b.when).getTime() - new Date(a.when).getTime())
      setRows(filtered)
    }catch{} finally { setLoading(false) }
  }

  async function handleCreate(d: { doctorId?: string; date?: string; time?: string; subjective?: string; objective?: string; assessment?: string; plan?: string }){
    try{
      const hasAny = [d.subjective, d.objective, d.assessment, d.plan].some(x => (x||'').trim().length>0)
      if (!hasAny){ setToast({ type: 'error', message: 'Please enter at least one of Subjective, Objective, Assessment, or Plan' }); return }
      const when = d.date && d.time ? `${d.date}T${d.time}` : undefined
      await hospitalApi.createIpdDoctorVisit(encounterId, {
        doctorId: d.doctorId,
        when,
        subjective: d.subjective,
        objective: d.objective,
        assessment: d.assessment,
        plan: d.plan,
      })
      await reload(); setOpen(false)
      setToast({ type: 'success', message: 'Progress entry saved successfully' })
    }catch(e: any){ setToast({ type: 'error', message: e?.message || 'Failed to create progress entry' }) }
  }

  return (
    <div className="space-y-6">
      <Toast toast={toast} onClose={()=>setToast(null)} />
      
      {/* Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between rounded-3xl border border-slate-200 bg-white p-6 shadow-sm overflow-hidden relative mt-4">
        <div className="absolute right-0 top-0 opacity-[0.03] pointer-events-none transform translate-x-1/4 -translate-y-1/4">
          <Activity className="h-48 w-48 text-indigo-600" />
        </div>
        <div className="flex items-center gap-4 relative z-10">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-500/10 text-indigo-600">
            <ClipboardList className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-xl font-black tracking-tight text-slate-900 uppercase">Daily Progress</h1>
            <p className="text-xs font-bold uppercase tracking-widest text-slate-400">Clinical SOAP Documentation</p>
          </div>
        </div>
        <button 
          onClick={()=>setOpen(true)} 
          className="group flex items-center gap-2 rounded-2xl bg-indigo-600 px-6 py-3 text-sm font-black text-white shadow-xl shadow-indigo-600/20 transition hover:bg-indigo-700 active:scale-95 relative z-10"
        >
          <Plus className="h-4 w-4 transition-transform group-hover:rotate-90" />
          Add Progress
        </button>
      </div>

      {loading ? (
        <div className="flex min-h-[200px] flex-col items-center justify-center p-8 text-slate-400">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-indigo-600" />
          <p className="mt-4 text-xs font-bold uppercase tracking-widest">Loading records...</p>
        </div>
      ) : rows.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-4 rounded-3xl border-2 border-dashed border-slate-200 bg-white/50 p-12 text-center transition-all hover:bg-white">
          <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-slate-100 text-slate-400">
            <ClipboardList className="h-8 w-8" />
          </div>
          <div>
            <h3 className="text-lg font-black text-slate-900 uppercase">No Clinical Progress</h3>
            <p className="text-sm font-medium text-slate-500">Document the daily medical assessment for this patient.</p>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {rows.map(r => (
            <div key={r._id} className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-lg shadow-slate-200/30 transition-all hover:shadow-xl hover:shadow-slate-200/40 animate-in fade-in slide-in-from-bottom-2 duration-300">
              <div className="bg-slate-900 px-8 py-4 flex items-center justify-between">
                <div className="flex items-center gap-3 text-white">
                  <Activity className="h-5 w-5 text-indigo-400" />
                  <span className="text-xs font-black uppercase tracking-widest">Medical Progress Summary</span>
                </div>
                <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-400">
                  <Clock className="h-3 w-3" />
                  {new Date(r.when).toLocaleString()}
                </div>
              </div>
              <div className="p-8">
                <div className="grid gap-8 lg:grid-cols-12">
                  <div className="lg:col-span-8 space-y-6">
                    <SoapSection label="Subjective" value={r.subjective} icon={Info} theme="sky" />
                    <SoapSection label="Objective" value={r.objective} icon={Stethoscope} theme="rose" />
                    <SoapSection label="Assessment" value={r.assessment} icon={ClipboardList} theme="amber" />
                    <SoapSection label="Plan" value={r.plan} icon={CheckCircle2} theme="emerald" />
                  </div>
                  <div className="lg:col-span-4 space-y-6">
                    <div className="rounded-2xl bg-slate-50/50 p-6 border border-slate-100 space-y-6">
                      <div className="space-y-1">
                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Documenting Physician</span>
                        <p className="text-sm font-black text-slate-900 uppercase">Dr. {r.doctorName || '-'}</p>
                      </div>
                      <div className="h-px bg-slate-200" />
                      <div className="space-y-2">
                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Clinical Verification</span>
                        <p className="text-xs font-medium text-slate-600 italic leading-relaxed">
                          Daily progress and SOAP documentation verified for this clinical encounter.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <DailyProgressDialog open={open} onClose={()=>setOpen(false)} onSave={handleCreate} />
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
        {value || <span className="text-slate-300 italic">No notes recorded</span>}
      </div>
    </div>
  )
}

function DailyProgressDialog({ open, onClose, onSave }: { open: boolean; onClose: ()=>void; onSave: (d: { doctorId?: string; date?: string; time?: string; subjective?: string; objective?: string; assessment?: string; plan?: string })=>void }){
  const [doctors, setDoctors] = useState<Array<{ _id: string; name: string }>>([])
  
  useEffect(()=>{ 
    if(open){ 
      (async()=>{ 
        try { 
          const res = await hospitalApi.listDoctors() as any; 
          const items = (res?.doctors || res || []) as Array<{ _id: string; name: string }>; 
          setDoctors(items) 
        } catch { 
          setDoctors([]) 
        } 
      })() 
    } 
  }, [open])

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    const fd = new FormData(e.currentTarget as HTMLFormElement)
    onSave({
      doctorId: String(fd.get('doctorId')||''),
      date: String(fd.get('date')||''),
      time: String(fd.get('time')||''),
      subjective: String(fd.get('subjective')||''),
      objective: String(fd.get('objective')||''),
      assessment: String(fd.get('assessment')||''),
      plan: String(fd.get('plan')||''),
    })
  }

  return (
    <ClinicalDialogShell
      open={open}
      title="Add Daily Progress"
      subtitle="Systematic SOAP Assessment"
      icon={Activity}
      onClose={onClose}
      onSubmit={submit}
      submitText="Save Progress"
      maxWidth="max-w-4xl"
    >
      <div className="space-y-5">
        <div className="grid gap-3 sm:grid-cols-3">
          <div>
            <label className={clinicalLbl}>Date</label>
            <input name="date" type="date" required defaultValue={new Date().toISOString().slice(0, 10)} className={clinicalInp} />
          </div>
          <div>
            <label className={clinicalLbl}>Time</label>
            <input name="time" type="time" required defaultValue={new Date().toTimeString().slice(0, 5)} className={clinicalInp} />
          </div>
          <div>
            <label className={clinicalLbl}>Attending Doctor</label>
            <select name="doctorId" required className={clinicalInp}>
              <option value="">Select Doctor</option>
              {doctors.map(d => (<option key={d._id} value={d._id}>{d.name}</option>))}
            </select>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className={clinicalLbl}>Subjective</label>
            <textarea name="subjective" placeholder="Patient's complaints and feelings..." rows={3} className={clinicalInp + ' resize-none'} />
          </div>
          <div>
            <label className={clinicalLbl}>Objective</label>
            <textarea name="objective" placeholder="Physical examination and observations..." rows={3} className={clinicalInp + ' resize-none'} />
          </div>
          <div>
            <label className={clinicalLbl}>Assessment</label>
            <textarea name="assessment" placeholder="Clinical assessment and diagnosis status..." rows={3} className={clinicalInp + ' resize-none'} />
          </div>
          <div>
            <label className={clinicalLbl}>Plan</label>
            <textarea name="plan" placeholder="Treatment orders and medications..." rows={3} className={clinicalInp + ' resize-none'} />
          </div>
        </div>
      </div>
    </ClinicalDialogShell>
  )
}

