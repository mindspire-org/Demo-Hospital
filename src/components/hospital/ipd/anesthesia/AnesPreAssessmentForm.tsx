import { useEffect, useState, useRef } from 'react'
import { ipdApi, hospitalApi } from '../../../../utils/api'
import Toast, { type ToastState } from '../../../ui/Toast'
import ConfirmDialog from '../../../common/ConfirmDialog'

export default function Hospital_IpdAnesPreAssessment({ encounterId }: { encounterId: string }){
  const [rows, setRows] = useState<Array<{ id: string; when: string; existingProblems?: any; physicalExam?: any; plan?: any; checklist?: any; preInduction?: any; planChange?: any; doctorName?: string }>>([])
  const [open, setOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingData, setEditingData] = useState<any>(null)
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [sortDir] = useState<'asc'|'desc'>('desc')
  const [doctors, setDoctors] = useState<Array<{ _id: string; name: string }>>([])
  const [toast, setToast] = useState<ToastState>(null)

  useEffect(()=>{ (async()=>{ try { const res = await hospitalApi.listDoctors() as any; const items = (res?.doctors || res || []) as Array<{ _id: string; name: string }>; setDoctors(items) } catch { setDoctors([]) } })() }, [])

  useEffect(()=>{ if(encounterId){ reload() } }, [encounterId])

  async function reload(){
    try{
      const res = await ipdApi.listIpdAnesPreAssessments(encounterId, { limit: 200 }) as any
      const items = (res.preAssessments || []).map((n: any)=>({
        id: String(n._id),
        when: String(n.createdAt || ''),
        doctorName: n.anesthesiologistName || '',
        existingProblems: {
          cvs: n.existingProblems?.cvs || '',
          renal: n.existingProblems?.renal || '',
          respiration: n.existingProblems?.respiration || '',
          hepatic: n.existingProblems?.hepatic || '',
          diabetic: n.existingProblems?.diabetic || '',
          git: n.existingProblems?.git || '',
          neurology: n.existingProblems?.neurology || '',
          anesthesiaHistory: n.existingProblems?.anesthesiaHistory || '',
          eventful: n.existingProblems?.eventful || '',
        },
        physicalExam: {
          bp: n.physicalExam?.bp || '',
          pulse: n.physicalExam?.pulse || '',
          temp: n.physicalExam?.temp || '',
          rr: n.physicalExam?.rr || '',
          cvs: n.physicalExam?.cvs || '',
          chest: n.physicalExam?.chest || '',
          teeth: n.physicalExam?.teeth || '',
          mallampatiClass: n.physicalExam?.mallampatiScore || '',
          asaClass: n.physicalExam?.asaClass || ''
        },
        plan: {
          general: n.plan?.general || '',
          spinal: n.plan?.spinal || '',
          local: n.plan?.local || '',
          monitoringCare: n.plan?.monitoringCare || '',
          npo: n.plan?.npo || '',
          fluidsBlood: n.plan?.fluidsBlood || '',
          preAnesthesiaMedication: n.plan?.preAnesthesiaMedication || ''
        },
        checklist: {
          patientIdentified: !!n.checklist?.patientIdentified,
          consentRevised: !!n.checklist?.consentRevised,
          siteChecked: !!n.checklist?.siteChecked
        },
        preInduction: {
          orientation: n.preInduction?.orientation || '',
          bp: n.preInduction?.bp || '',
          pulse: n.preInduction?.pulse || '',
          temp: n.preInduction?.temp || '',
          spo2: n.preInduction?.spo2 || ''
        },
        planChange: {
          changed: !!n.planChange?.changed,
          general: n.planChange?.general || '',
          spinal: n.planChange?.spinal || '',
          local: n.planChange?.local || ''
        },
      }))
      setRows(items)
    }catch{}
  }

  const add = async (d: any) => {
    try{
      await ipdApi.createIpdAnesPreAssessment(encounterId, {
        anesthesiologistName: d.doctorName || undefined,
        existingProblems: {
          cvs: d.cvs || undefined,
          renal: d.renal || undefined,
          respiration: d.respiration || undefined,
          hepatic: d.hepatic || undefined,
          diabetic: d.diabetic || undefined,
          git: d.git || undefined,
          neurology: d.neurology || undefined,
          anesthesiaHistory: d.anesthesiaHistory || undefined,
          eventful: d.eventful || undefined,
        },
        physicalExam: {
          bp: d.bp || undefined,
          pulse: d.pulse || undefined,
          temp: d.temp || undefined,
          rr: d.rr || undefined,
          cvs: d.examCvs || undefined,
          chest: d.chest || undefined,
          teeth: d.teeth || undefined,
          mallampatiScore: d.mallampatiClass || undefined,
          asaClass: d.asaClass || undefined,
        },
        plan: {
          general: d.planGeneral || undefined,
          spinal: d.planSpinal || undefined,
          local: d.planLocal || undefined,
          monitoringCare: d.monitoringCare || undefined,
          npo: d.npo || undefined,
          fluidsBlood: d.fluidsBlood || undefined,
          preAnesthesiaMedication: d.preAnesMed || undefined,
        },
        checklist: {
          patientIdentified: !!d.chkPatient,
          consentRevised: !!d.chkConsent,
          siteChecked: !!d.chkSite,
        },
        preInduction: {
          orientation: d.orientation || undefined,
          bp: d.preBp || undefined,
          pulse: d.prePulse || undefined,
          temp: d.preTemp || undefined,
          spo2: d.preSpo2 || undefined,
        },
        planChange: {
          changed: d.planChanged === 'yes',
          general: d.planChangeGeneral || undefined,
          spinal: d.planChangeSpinal || undefined,
          local: d.planChangeLocal || undefined,
        },
      })
      setOpen(false); await reload()
      setToast({ type: 'success', message: 'Pre-assessment saved successfully' })
    }catch(e: any){ 
      let errorMsg = 'Failed to save pre-assessment'
      try {
        const parsed = JSON.parse(e?.message || '{}')
        errorMsg = parsed?.error || errorMsg
      } catch {
        errorMsg = e?.message || errorMsg
      }
      setToast({ type: 'error', message: errorMsg })
    }
  }

  const update = async (d: any) => {
    if (!editingId) return
    try{
      await ipdApi.updateIpdAnesPreAssessment(editingId, {
        anesthesiologistName: d.doctorName || undefined,
        existingProblems: {
          cvs: d.cvs || undefined, renal: d.renal || undefined, respiration: d.respiration || undefined, hepatic: d.hepatic || undefined,
          diabetic: d.diabetic || undefined, git: d.git || undefined, neurology: d.neurology || undefined, anesthesiaHistory: d.anesthesiaHistory || undefined, eventful: d.eventful || undefined,
        },
        physicalExam: {
          bp: d.bp || undefined, pulse: d.pulse || undefined, temp: d.temp || undefined, rr: d.rr || undefined,
          cvs: d.examCvs || undefined, chest: d.chest || undefined, teeth: d.teeth || undefined,
          mallampatiScore: d.mallampatiClass || undefined, asaClass: d.asaClass || undefined,
        },
        plan: {
          general: d.planGeneral || undefined, spinal: d.planSpinal || undefined, local: d.planLocal || undefined,
          monitoringCare: d.monitoringCare || undefined, npo: d.npo || undefined, fluidsBlood: d.fluidsBlood || undefined, preAnesthesiaMedication: d.preAnesMed || undefined,
        },
        checklist: { patientIdentified: !!d.chkPatient, consentRevised: !!d.chkConsent, siteChecked: !!d.chkSite },
        preInduction: { orientation: d.orientation || undefined, bp: d.preBp || undefined, pulse: d.prePulse || undefined, temp: d.preTemp || undefined, spo2: d.preSpo2 || undefined },
        planChange: { changed: d.planChanged === 'yes', general: d.planChangeGeneral || undefined, spinal: d.planChangeSpinal || undefined, local: d.planChangeLocal || undefined },
      })
      setEditingId(null); setEditingData(null); await reload()
      setToast({ type: 'success', message: 'Pre-assessment updated successfully' })
    }catch(e: any){
      let errorMsg = 'Failed to update pre-assessment'
      try { const parsed = JSON.parse(e?.message || '{}'); errorMsg = parsed?.error || errorMsg } catch { errorMsg = e?.message || errorMsg }
      setToast({ type: 'error', message: errorMsg })
    }
  }

  const remove = async (id: string) => {
    setDeleteId(id)
    setDeleteConfirmOpen(true)
  }

  const handleDeleteConfirm = async () => {
    if (!deleteId) return
    try { await ipdApi.deleteIpdAnesPreAssessment(deleteId); await reload() } catch (e: any) { alert(e?.message || 'Failed to delete') }
    setDeleteId(null)
  }

  const startEdit = (r: any) => {
    setEditingId(r.id)
    setEditingData(r)
    setOpen(true)
  }

  const sorted = [...rows].sort((a,b)=>{
    const ta = new Date(a.when||'').getTime() || 0
    const tb = new Date(b.when||'').getTime() || 0
    return sortDir==='asc' ? ta - tb : tb - ta
  })

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4" data-encounterid={encounterId}>
      <div className="mb-2 flex items-center justify-between print:hidden">
        <div className="text-lg font-semibold text-slate-900">Pre-Anesthesia Assessment</div>
        <div className="flex gap-2 print:hidden">
          <button onClick={()=>setOpen(true)} className="btn">Add Pre-Assessment</button>
        </div>
      </div>
      {rows.length === 0 ? (
        <div className="text-slate-500">No pre-anesthesia assessments recorded.</div>
      ) : (
        <div className="space-y-4 text-sm">
          {sorted.map(r => (
            <div key={r.id} className="overflow-hidden rounded-md border border-slate-200">
              <div className="flex items-center justify-between bg-slate-50 px-3 py-2 text-xs text-slate-600">
                <div>{new Date(r.when).toLocaleString()}</div>
                <div className="flex items-center gap-2">
                  <div>{r.doctorName ? `Dr: ${r.doctorName}` : ''}</div>
                  <div className="flex gap-1 print:hidden">
                    <button onClick={() => startEdit(r)} className="rounded px-2 py-0.5 text-xs text-blue-600 hover:bg-blue-50">Edit</button>
                    <button onClick={() => remove(r.id)} className="rounded px-2 py-0.5 text-xs text-red-600 hover:bg-red-50">Delete</button>
                  </div>
                </div>
              </div>
              <div className="grid gap-3 p-3 grid-cols-1">
                <div>
                  <div className="pb-1 text-base font-semibold text-slate-900">Existing / Present Problem</div>
                  <table className="w-full table-fixed text-xs border border-slate-200 rounded-md overflow-hidden">
                    <thead className="bg-slate-50 text-slate-700">
                      <tr className="text-slate-700">
                        <th className="px-3 py-1.5 text-left font-semibold">CVS</th>
                        <th className="px-3 py-1.5 text-left font-semibold">Renal</th>
                        <th className="px-3 py-1.5 text-left font-semibold">Respiration</th>
                        <th className="px-3 py-1.5 text-left font-semibold">Hepatic</th>
                        <th className="px-3 py-1.5 text-left font-semibold">Diabetic</th>
                        <th className="px-3 py-1.5 text-left font-semibold">GIT</th>
                        <th className="px-3 py-1.5 text-left font-semibold">Neurology</th>
                        <th className="px-3 py-1.5 text-left font-semibold">Anesthesia Hx</th>
                        <th className="px-3 py-1.5 text-left font-semibold">Eventful</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      <tr className="text-slate-700">
                        <td className="px-3 py-1.5 break-words">{r.existingProblems?.cvs || '-'}</td>
                        <td className="px-3 py-1.5 break-words">{r.existingProblems?.renal || '-'}</td>
                        <td className="px-3 py-1.5 break-words">{r.existingProblems?.respiration || '-'}</td>
                        <td className="px-3 py-1.5 break-words">{r.existingProblems?.hepatic || '-'}</td>
                        <td className="px-3 py-1.5 break-words">{r.existingProblems?.diabetic || '-'}</td>
                        <td className="px-3 py-1.5 break-words">{r.existingProblems?.git || '-'}</td>
                        <td className="px-3 py-1.5 break-words">{r.existingProblems?.neurology || '-'}</td>
                        <td className="px-3 py-1.5 break-words">{r.existingProblems?.anesthesiaHistory || '-'}</td>
                        <td className="px-3 py-1.5 break-words">{r.existingProblems?.eventful || '-'}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
                <div>
                  <div className="pb-1 text-base font-semibold text-slate-900">Physical Examination</div>
                  <table className="w-full table-fixed text-xs border border-slate-200 rounded-md overflow-hidden">
                    <thead className="bg-slate-50 text-slate-700">
                      <tr className="text-slate-700">
                        <th className="px-3 py-1.5 text-left font-semibold">BP</th>
                        <th className="px-3 py-1.5 text-left font-semibold">Pulse</th>
                        <th className="px-3 py-1.5 text-left font-semibold">RR</th>
                        <th className="px-3 py-1.5 text-left font-semibold">Temp</th>
                        <th className="px-3 py-1.5 text-left font-semibold">CVS</th>
                        <th className="px-3 py-1.5 text-left font-semibold">Chest</th>
                        <th className="px-3 py-1.5 text-left font-semibold">Teeth</th>
                        <th className="px-3 py-1.5 text-left font-semibold">Mallampati</th>
                        <th className="px-3 py-1.5 text-left font-semibold">ASA</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      <tr className="text-slate-700">
                        <td className="px-3 py-1.5 break-words">{r.physicalExam?.bp || '-'}</td>
                        <td className="px-3 py-1.5 break-words">{r.physicalExam?.pulse || '-'}</td>
                        <td className="px-3 py-1.5 break-words">{r.physicalExam?.rr || '-'}</td>
                        <td className="px-3 py-1.5 break-words">{r.physicalExam?.temp || '-'}</td>
                        <td className="px-3 py-1.5 break-words">{r.physicalExam?.cvs || '-'}</td>
                        <td className="px-3 py-1.5 break-words">{r.physicalExam?.chest || '-'}</td>
                        <td className="px-3 py-1.5 break-words">{r.physicalExam?.teeth || '-'}</td>
                        <td className="px-3 py-1.5 break-words">{r.physicalExam?.mallampatiClass || '-'}</td>
                        <td className="px-3 py-1.5 break-words">{r.physicalExam?.asaClass || '-'}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
                <div>
                  <div className="pb-1 text-base font-semibold text-slate-900">Anesthesia Plan</div>
                  <table className="w-full table-fixed text-xs border border-slate-200 rounded-md overflow-hidden">
                    <thead className="bg-slate-50 text-slate-700">
                      <tr className="text-slate-700">
                        <th className="px-3 py-1.5 text-left font-semibold">General</th>
                        <th className="px-3 py-1.5 text-left font-semibold">Spinal</th>
                        <th className="px-3 py-1.5 text-left font-semibold">Local</th>
                        <th className="px-3 py-1.5 text-left font-semibold">Monitoring Care</th>
                        <th className="px-3 py-1.5 text-left font-semibold">NPO</th>
                        <th className="px-3 py-1.5 text-left font-semibold">Fluid/Blood</th>
                        <th className="px-3 py-1.5 text-left font-semibold">Pre‑Anes Med</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      <tr className="text-slate-700">
                        <td className="px-3 py-1.5 break-words">{r.plan?.general || '-'}</td>
                        <td className="px-3 py-1.5 break-words">{r.plan?.spinal || '-'}</td>
                        <td className="px-3 py-1.5 break-words">{r.plan?.local || '-'}</td>
                        <td className="px-3 py-1.5 break-words">{r.plan?.monitoringCare || '-'}</td>
                        <td className="px-3 py-1.5 break-words">{r.plan?.npo || '-'}</td>
                        <td className="px-3 py-1.5 break-words">{r.plan?.fluidsBlood || '-'}</td>
                        <td className="px-3 py-1.5 break-words">{r.plan?.preAnesthesiaMedication || '-'}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
                <div>
                  <div className="pb-1 text-base font-semibold text-slate-900">Checklist</div>
                  <table className="w-full table-fixed text-xs border border-slate-200 rounded-md overflow-hidden">
                    <thead className="bg-slate-50 text-slate-700">
                      <tr className="text-slate-700">
                        <th className="px-3 py-1.5 text-left font-semibold">Patient Identified</th>
                        <th className="px-3 py-1.5 text-left font-semibold">Consent & Chart Revised</th>
                        <th className="px-3 py-1.5 text-left font-semibold">Site/Procedure Checked</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      <tr className="text-slate-700">
                        <td className="px-3 py-1.5 break-words">{r.checklist?.patientIdentified ? 'Yes' : 'No'}</td>
                        <td className="px-3 py-1.5 break-words">{r.checklist?.consentRevised ? 'Yes' : 'No'}</td>
                        <td className="px-3 py-1.5 break-words">{r.checklist?.siteChecked ? 'Yes' : 'No'}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
                <div>
                  <div className="pb-1 text-base font-semibold text-slate-900">Pre-Induction Re-evaluation</div>
                  <table className="w-full table-fixed text-xs border border-slate-200 rounded-md overflow-hidden">
                    <thead className="bg-slate-50 text-slate-700">
                      <tr className="text-slate-700">
                        <th className="px-3 py-1.5 text-left font-semibold">Orientation</th>
                        <th className="px-3 py-1.5 text-left font-semibold">BP</th>
                        <th className="px-3 py-1.5 text-left font-semibold">Pulse</th>
                        <th className="px-3 py-1.5 text-left font-semibold">Temp</th>
                        <th className="px-3 py-1.5 text-left font-semibold">SpO2</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      <tr className="text-slate-700">
                        <td className="px-3 py-1.5 break-words">{r.preInduction?.orientation || '-'}</td>
                        <td className="px-3 py-1.5 break-words">{r.preInduction?.bp || '-'}</td>
                        <td className="px-3 py-1.5 break-words">{r.preInduction?.pulse || '-'}</td>
                        <td className="px-3 py-1.5 break-words">{r.preInduction?.temp || '-'}</td>
                        <td className="px-3 py-1.5 break-words">{r.preInduction?.spo2 || '-'}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
                <div>
                  <div className="pb-1 text-base font-semibold text-slate-900">Change in Anesthesia Plan (Yes/No)</div>
                  <table className="w-full table-fixed text-xs border border-slate-200 rounded-md overflow-hidden">
                    <thead className="bg-slate-50 text-slate-700">
                      <tr className="text-slate-700">
                        <th className="px-3 py-1.5 text-left font-semibold">Changed</th>
                        <th className="px-3 py-1.5 text-left font-semibold">General</th>
                        <th className="px-3 py-1.5 text-left font-semibold">Spinal</th>
                        <th className="px-3 py-1.5 text-left font-semibold">Local</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      <tr className="text-slate-700">
                        <td className="px-3 py-1.5 break-words">{r.planChange?.changed ? 'Yes' : 'No'}</td>
                        <td className="px-3 py-1.5 break-words">{r.planChange?.general || '-'}</td>
                        <td className="px-3 py-1.5 break-words">{r.planChange?.spinal || '-'}</td>
                        <td className="px-3 py-1.5 break-words">{r.planChange?.local || '-'}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
      <PreDialog key={editingId || 'add'} open={open} onClose={()=>{ setOpen(false); setEditingId(null); setEditingData(null) }} onSave={editingId ? update : add} doctors={doctors} initial={editingData} />
      <ConfirmDialog
        open={deleteConfirmOpen}
        title="Delete Pre-Assessment"
        message="Are you sure you want to delete this pre-assessment?"
        onConfirm={() => { handleDeleteConfirm(); setDeleteConfirmOpen(false) }}
        onCancel={() => { setDeleteConfirmOpen(false); setDeleteId(null) }}
      />
      <Toast toast={toast} onClose={() => setToast(null)} />
    </div>
  )
}

function PreDialog({ open, onClose, onSave, doctors, initial }: { open: boolean; onClose: ()=>void; onSave: (d: any)=>void; doctors: Array<{ _id: string; name: string }>; initial?: any }){
  const now = new Date()
  const defaultDateTime = initial?.when ? new Date(new Date(initial.when).getTime() - (new Date().getTimezoneOffset() * 60000)).toISOString().slice(0, 16) : new Date(now.getTime() - (now.getTimezoneOffset() * 60000)).toISOString().slice(0, 16)
  const [doctorSearch, setDoctorSearch] = useState(initial?.doctorName || '')
  const [showDoctorDropdown, setShowDoctorDropdown] = useState(false)
  const [selectedDoctor, setSelectedDoctor] = useState(initial?.doctorName || '')
  const dropdownRef = useRef<HTMLDivElement>(null)
  const filteredDoctors = doctors.filter(d => d.name.toLowerCase().includes(doctorSearch.toLowerCase()))

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDoctorDropdown(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  if (!open) return null
  const submit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    const get = (k: string) => String(fd.get(k) || '')
    onSave({
      when: get('when'), doctorName: selectedDoctor,
      cvs: get('cvs'), renal: get('renal'), respiration: get('respiration'), hepatic: get('hepatic'), diabetic: get('diabetic'), git: get('git'), neurology: get('neurology'), anesthesiaHistory: get('anesthesiaHistory'), eventful: get('eventful'),
      bp: get('bp'), pulse: get('pulse'), temp: get('temp'), rr: get('rr'), examCvs: get('examCvs'), chest: get('chest'), teeth: get('teeth'), mallampatiClass: get('mallampatiClass'), asaClass: get('asaClass'),
      planGeneral: get('planGeneral'), planSpinal: get('planSpinal'), planLocal: get('planLocal'), monitoringCare: get('monitoringCare'), npo: get('npo'), fluidsBlood: get('fluidsBlood'), preAnesMed: get('preAnesMed'),
      chkPatient: fd.get('chkPatient') ? '1' : '', chkConsent: fd.get('chkConsent') ? '1' : '', chkSite: fd.get('chkSite') ? '1' : '',
      orientation: get('orientation'), preBp: get('preBp'), prePulse: get('prePulse'), preTemp: get('preTemp'), preSpo2: get('preSpo2'),
      planChanged: get('planChanged'), planChangeGeneral: get('planChangeGeneral'), planChangeSpinal: get('planChangeSpinal'), planChangeLocal: get('planChangeLocal'),
    })
  }
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <form onSubmit={submit} className="w-full max-w-3xl overflow-y-auto rounded-xl bg-white shadow-2xl ring-1 ring-black/5 max-h-[90vh]">
        <div className="border-b border-slate-200 px-5 py-3 font-semibold text-slate-800">{initial ? 'Edit Pre-Anesthesia Assessment' : 'Add Pre-Anesthesia Assessment'}</div>
        <div className="grid gap-4 px-5 py-4 text-sm sm:grid-cols-3">
          <div>
            <label className="block text-xs font-medium text-slate-600" htmlFor="when">Date/Time</label>
            <input id="when" name="when" type="datetime-local" defaultValue={defaultDateTime} className="w-full rounded-md border border-slate-300 px-3 py-2" />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-xs font-medium text-slate-600">Doctor Name</label>
            <div className="relative" ref={dropdownRef}>
              <input
                type="text"
                value={selectedDoctor || doctorSearch}
                onChange={(e) => { setDoctorSearch(e.target.value); setShowDoctorDropdown(true); setSelectedDoctor(''); }}
                onFocus={() => setShowDoctorDropdown(true)}
                placeholder="Search doctor..."
                className="w-full rounded-md border border-slate-300 px-3 py-2"
              />
              {showDoctorDropdown && filteredDoctors.length > 0 && (
                <div className="absolute z-10 mt-1 max-h-40 w-full overflow-auto rounded-md border border-slate-300 bg-white shadow-lg">
                  {filteredDoctors.map(d => (
                    <div
                      key={d._id}
                      onClick={() => { setSelectedDoctor(d.name); setDoctorSearch(d.name); setShowDoctorDropdown(false); }}
                      className="cursor-pointer px-3 py-2 hover:bg-slate-100"
                    >
                      {d.name}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="sm:col-span-3 font-semibold text-slate-800">Existing / Present Problem</div>
          {['cvs','renal','respiration','hepatic','diabetic','git','neurology','anesthesiaHistory','eventful'].map(key => (
            <div key={key}>
              <label className="block text-xs font-medium text-slate-600" htmlFor={key}>{key.toUpperCase()}</label>
              <input id={key} name={key} defaultValue={initial?.existingProblems?.[key] || ''} className="w-full rounded-md border border-slate-300 px-3 py-2" />
            </div>
          ))}

          <div className="sm:col-span-3 font-semibold text-slate-800">Physical Examination</div>
          {[
            ['bp','BP'], ['pulse','Pulse'], ['temp','Temp'], ['rr','RR'], ['examCvs','CVS'], ['chest','Chest'], ['teeth','Teeth'],
          ].map(([name,label]) => (
            <div key={name}>
              <label className="block text-xs font-medium text-slate-600" htmlFor={name}>{label}</label>
              <input id={name} name={name} defaultValue={(name === 'examCvs' ? initial?.physicalExam?.cvs : initial?.physicalExam?.[name]) || ''} className="w-full rounded-md border border-slate-300 px-3 py-2" />
            </div>
          ))}
          <div>
            <label className="block text-xs font-medium text-slate-600" htmlFor="mallampatiClass">Mallampati Class</label>
            <select id="mallampatiClass" name="mallampatiClass" defaultValue={initial?.physicalExam?.mallampatiClass || ''} className="w-full rounded-md border border-slate-300 px-3 py-2">
              <option value="">Select...</option>
              <option value="I">Class I</option>
              <option value="II">Class II</option>
              <option value="III">Class III</option>
              <option value="IV">Class IV</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600" htmlFor="asaClass">ASA Class</label>
            <select id="asaClass" name="asaClass" defaultValue={initial?.physicalExam?.asaClass || ''} className="w-full rounded-md border border-slate-300 px-3 py-2">
              <option value="">Select...</option>
              <option value="I">ASA I</option>
              <option value="II">ASA II</option>
              <option value="III">ASA III</option>
              <option value="IV">ASA IV</option>
              <option value="V">ASA V</option>
              <option value="VI">ASA VI</option>
              <option value="E">ASA E</option>
            </select>
          </div>

          <div className="sm:col-span-3 font-semibold text-slate-800">Anesthesia Plan</div>
          {[
            ['planGeneral','General', 'general'], ['planSpinal','Spinal', 'spinal'], ['planLocal','Local', 'local'], ['monitoringCare','Anesthesia Monitoring Care', 'monitoringCare'], ['npo','NPO', 'npo'], ['fluidsBlood','Fluid/ Blood', 'fluidsBlood'], ['preAnesMed','Pre-Anesthesia Medication', 'preAnesthesiaMedication'],
          ].map(([name,label, ikey]) => (
            <div key={String(name)}>
              <label className="block text-xs font-medium text-slate-600" htmlFor={String(name)}>{label}</label>
              <input id={String(name)} name={String(name)} defaultValue={(initial as any)?.plan?.[String(ikey)] || ''} className="w-full rounded-md border border-slate-300 px-3 py-2" />
            </div>
          ))}

          <div className="sm:col-span-3 font-semibold text-slate-800">Checklist</div>
          <div className="flex items-center gap-4 sm:col-span-3">
            <label className="flex items-center gap-2 text-xs text-slate-700"><input type="checkbox" name="chkPatient" defaultChecked={initial?.checklist?.patientIdentified} /> Patient Identified</label>
            <label className="flex items-center gap-2 text-xs text-slate-700"><input type="checkbox" name="chkConsent" defaultChecked={initial?.checklist?.consentRevised} /> Consent & Chart Revised</label>
            <label className="flex items-center gap-2 text-xs text-slate-700"><input type="checkbox" name="chkSite" defaultChecked={initial?.checklist?.siteChecked} /> Site/Procedure Checked</label>
          </div>

          <div className="sm:col-span-3 font-semibold text-slate-800">Pre-Induction Re-evaluation</div>
          {[
            ['orientation','Patient Orientation', 'orientation'], ['preBp','BP', 'bp'], ['prePulse','Pulse', 'pulse'], ['preTemp','Temp', 'temp'], ['preSpo2','SpO2', 'spo2'],
          ].map(([name,label, ikey]) => (
            <div key={String(name)}>
              <label className="block text-xs font-medium text-slate-600" htmlFor={String(name)}>{label}</label>
              <input id={String(name)} name={String(name)} defaultValue={(initial as any)?.preInduction?.[String(ikey)] || ''} className="w-full rounded-md border border-slate-300 px-3 py-2" />
            </div>
          ))}

          <div className="sm:col-span-3 font-semibold text-slate-800">Change in Anesthesia Plan (Yes/No)</div>
          <div>
            <label className="block text-xs font-medium text-slate-600" htmlFor="planChanged">Changed?</label>
            <select id="planChanged" name="planChanged" defaultValue={initial?.planChange?.changed ? 'yes' : 'no'} className="w-full rounded-md border border-slate-300 px-3 py-2">
              <option value="no">No</option>
              <option value="yes">Yes</option>
            </select>
          </div>
          {[
            ['planChangeGeneral','General', 'general'], ['planChangeSpinal','Spinal', 'spinal'], ['planChangeLocal','Local', 'local'],
          ].map(([name,label, ikey]) => (
            <div key={String(name)}>
              <label className="block text-xs font-medium text-slate-600" htmlFor={String(name)}>{label}</label>
              <input id={String(name)} name={String(name)} defaultValue={(initial as any)?.planChange?.[String(ikey)] || ''} className="w-full rounded-md border border-slate-300 px-3 py-2" />
            </div>
          ))}
        </div>
        <div className="flex items-center justify-end gap-2 border-t border-slate-200 px-5 py-3">
          <button type="button" onClick={onClose} className="btn-outline-navy">Cancel</button>
          <button type="submit" className="btn">Save</button>
        </div>
      </form>
    </div>
  )
}
