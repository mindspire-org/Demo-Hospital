import { Printer } from 'lucide-react'
import { useEffect, useState, useRef } from 'react'
import { ipdApi, hospitalApi } from '../../../../utils/api'
import ConfirmDialog from '../../../common/ConfirmDialog'

export default function Hospital_IpdHistoryExamination({ encounterId }: { encounterId: string }){
  const [records, setRecords] = useState<Array<{
    id: string
    recordedAt: string
    date: string
    time: string
    presentingComplaints: string
    medicationHistory: string
    familyHistory: string
    allergies: string
    vitals: { vitalc: string; bp: string; pulse: string; temp: string; rr: string }
    generalPhysicalExamination: string
    provisionalDiagnosis: string
    investigations: string
    finalDiagnosis: string
    treatmentPlan: string
    generalStatus: string
    weight: string
    height: string
    advisedDiet: string
    doctorName: string
  }>>([])
  const [open, setOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingData, setEditingData] = useState<any>(null)
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
  const [deleteId, setDeleteId] = useState<string | null>(null)

  useEffect(()=>{ if(encounterId){ reload() } }, [encounterId])

  async function reload(){
    try{
      const res = await ipdApi.listIpdHistoryExams(encounterId, { limit: 200 }) as any
      const items = (res.historyExams || []).map((n: any) => ({
        id: String(n._id),
        recordedAt: String(n.createdAt || ''),
        date: String(n.createdAt?.slice(0, 10) || ''),
        time: String(n.createdAt?.slice(11, 16) || ''),
        presentingComplaints: n.chiefComplaint || '',
        medicationHistory: (n.drugHistory || []).map((d: any) => `${d.drugName} ${d.dose}`).join(', '),
        familyHistory: n.familyHistory || '',
        allergies: (n.allergyHistory || []).map((a: any) => `${a.allergen} (${a.reaction})`).join(', '),
        vitals: { 
          vitalc: '', 
          bp: n.vitals?.bp || '', 
          pulse: String(n.vitals?.hr || ''), 
          temp: String(n.vitals?.temp || ''), 
          rr: String(n.vitals?.rr || '') 
        },
        generalPhysicalExamination: n.generalAppearance || '',
        provisionalDiagnosis: n.provisionalDiagnosis || '',
        investigations: n.investigationPlan || '',
        finalDiagnosis: n.finalDiagnosis || '',
        treatmentPlan: n.treatmentPlan || '',
        generalStatus: n.generalStatus || '',
        weight: String(n.vitals?.weight || ''),
        height: String(n.vitals?.height || ''),
        advisedDiet: n.advisedDiet || '',
        doctorName: n.doctorName || '',
      }))
      setRecords(items)
    }catch{}
  }

  const add = async (d: any) => {
    try{
      await ipdApi.createIpdHistoryExam(encounterId, {
        chiefComplaint: d.presentingComplaints,
        historyOfPresentIllness: d.presentingComplaints,
        pastMedicalHistory: d.medicationHistory,
        familyHistory: d.familyHistory,
        drugHistory: d.medicationHistory ? [{ drugName: d.medicationHistory, dose: '', frequency: '', duration: '' }] : [],
        allergyHistory: d.allergies ? [{ allergen: d.allergies, reaction: '', severity: 'mild' }] : [],
        generalAppearance: d.generalPhysicalExamination,
        vitals: {
          bp: d.vitals?.bp,
          hr: d.vitals?.pulse ? parseInt(d.vitals.pulse) : undefined,
          temp: d.vitals?.temp ? parseFloat(d.vitals.temp) : undefined,
          rr: d.vitals?.rr ? parseInt(d.vitals.rr) : undefined,
          weight: d.weight ? parseFloat(d.weight) : undefined,
          height: d.height ? parseFloat(d.height) : undefined,
        },
        provisionalDiagnosis: d.provisionalDiagnosis,
        finalDiagnosis: d.finalDiagnosis,
        investigationPlan: d.investigations,
        treatmentPlan: d.treatmentPlan,
        generalStatus: d.generalStatus,
        advisedDiet: d.advisedDiet,
        doctorName: d.doctorName,
        examType: 'admission',
      })
      setOpen(false)
      await reload()
    }catch(e: any){ alert(e?.message || 'Failed to save history form') }
  }

  const update = async (d: any) => {
    if (!editingId) return
    try{
      await ipdApi.updateIpdHistoryExam(editingId, {
        chiefComplaint: d.presentingComplaints,
        historyOfPresentIllness: d.presentingComplaints,
        pastMedicalHistory: d.medicationHistory,
        familyHistory: d.familyHistory,
        drugHistory: d.medicationHistory ? [{ drugName: d.medicationHistory, dose: '', frequency: '', duration: '' }] : [],
        allergyHistory: d.allergies ? [{ allergen: d.allergies, reaction: '', severity: 'mild' }] : [],
        generalAppearance: d.generalPhysicalExamination,
        vitals: {
          bp: d.vitals?.bp,
          hr: d.vitals?.pulse ? parseInt(d.vitals.pulse) : undefined,
          temp: d.vitals?.temp ? parseFloat(d.vitals.temp) : undefined,
          rr: d.vitals?.rr ? parseInt(d.vitals.rr) : undefined,
          weight: d.weight ? parseFloat(d.weight) : undefined,
          height: d.height ? parseFloat(d.height) : undefined,
        },
        provisionalDiagnosis: d.provisionalDiagnosis,
        finalDiagnosis: d.finalDiagnosis,
        investigationPlan: d.investigations,
        treatmentPlan: d.treatmentPlan,
        generalStatus: d.generalStatus,
        advisedDiet: d.advisedDiet,
        doctorName: d.doctorName,
      })
      setEditingId(null); setEditingData(null); await reload()
    }catch(e: any){ alert(e?.message || 'Failed to update history form') }
  }

  const remove = async (id: string) => {
    setDeleteId(id)
    setDeleteConfirmOpen(true)
  }

  const handleDeleteConfirm = async () => {
    if (!deleteId) return
    try { await ipdApi.deleteIpdHistoryExam(deleteId); await reload() } catch (e: any) { alert(e?.message || 'Failed to delete') }
    setDeleteId(null)
  }

  const startEdit = (r: any) => { setEditingId(r.id); setEditingData(r); setOpen(true); }

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4" data-encounterid={encounterId}>
      <div className="mb-4 flex items-center justify-between print:hidden">
        <div className="text-lg font-semibold text-slate-900">History & Examination Form</div>
        <div className="flex items-center gap-2">
          <button type="button" onClick={() => window.print()} className="btn-outline-navy flex items-center gap-2 print:hidden"><Printer className="h-4 w-4"/> Print</button>
          <button onClick={()=>setOpen(true)} className="btn">Add Form</button>
        </div>
      </div>

      {records.length === 0 ? (
        <div className="text-slate-500">No history records yet.</div>
      ) : (
        <div className="space-y-4">
          {records.map(r => (
            <div key={r.id} className="rounded-lg border border-slate-200 p-4">
              <HistoryFormDisplay data={r} />
              <div className="mt-2 flex items-center justify-between text-xs text-slate-500">
                <div>Recorded: {new Date(r.recordedAt).toLocaleString()}</div>
                <div className="flex gap-1 print:hidden">
                  <button onClick={() => startEdit(r)} className="rounded px-2 py-0.5 text-xs text-blue-600 hover:bg-blue-50">Edit</button>
                  <button onClick={() => remove(r.id)} className="rounded px-2 py-0.5 text-xs text-red-600 hover:bg-red-50">Delete</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <HistoryDialog key={editingId || 'add'} open={open} onClose={()=>{ setOpen(false); setEditingId(null); setEditingData(null) }} onSave={editingId ? update : add} initial={editingData} />
      <ConfirmDialog
        open={deleteConfirmOpen}
        title="Delete History & Examination"
        message="Are you sure you want to delete this history and examination record?"
        onConfirm={() => { handleDeleteConfirm(); setDeleteConfirmOpen(false) }}
        onCancel={() => { setDeleteConfirmOpen(false); setDeleteId(null) }}
      />
    </div>
  )
}

function HistoryFormDisplay({ data }: { data: any }) {
  return (
    <div className="space-y-2 text-sm">
      {/* Date & Time */}
      <div className="flex flex-wrap gap-x-6 gap-y-1 pb-2 border-b border-slate-100">
        <span><span className="font-semibold text-slate-700">Date:</span> <span className="text-slate-800">{data.date || '-'}</span></span>
        <span><span className="font-semibold text-slate-700">Time:</span> <span className="text-slate-800">{data.time || '-'}</span></span>
      </div>

      {/* Presenting Complaints */}
      {data.presentingComplaints && (
        <div><span className="font-semibold text-slate-700">Presenting Complaints:</span> <span className="text-slate-800">{data.presentingComplaints}</span></div>
      )}

      {/* Medication History */}
      {data.medicationHistory && (
        <div><span className="font-semibold text-slate-700">Medication History:</span> <span className="text-slate-800">{data.medicationHistory}</span></div>
      )}

      {/* Family History */}
      {data.familyHistory && (
        <div><span className="font-semibold text-slate-700">Family History:</span> <span className="text-slate-800">{data.familyHistory}</span></div>
      )}

      {/* Allergies */}
      {data.allergies && (
        <div><span className="font-semibold text-slate-700">Allergies:</span> <span className="text-slate-800">{data.allergies}</span></div>
      )}

      {/* Vitals */}
      {(data.vitals?.vitalc || data.vitals?.bp || data.vitals?.pulse || data.vitals?.temp || data.vitals?.rr) && (
        <div className="flex flex-wrap gap-x-4 gap-y-1">
          <span className="font-semibold text-slate-700">Vitals:</span>
          {data.vitals?.vitalc && <span><span className="font-medium text-slate-600">Vitalc:</span> <span className="text-slate-800">{data.vitals.vitalc}</span></span>}
          {data.vitals?.bp && <span><span className="font-medium text-slate-600">BP:</span> <span className="text-slate-800">{data.vitals.bp}</span></span>}
          {data.vitals?.pulse && <span><span className="font-medium text-slate-600">Pulse:</span> <span className="text-slate-800">{data.vitals.pulse}</span></span>}
          {data.vitals?.temp && <span><span className="font-medium text-slate-600">Temp:</span> <span className="text-slate-800">{data.vitals.temp}</span></span>}
          {data.vitals?.rr && <span><span className="font-medium text-slate-600">R/R:</span> <span className="text-slate-800">{data.vitals.rr}</span></span>}
        </div>
      )}

      {/* General Physical Examination */}
      {data.generalPhysicalExamination && (
        <div><span className="font-semibold text-slate-700">General Physical Examination:</span> <span className="text-slate-800">{data.generalPhysicalExamination}</span></div>
      )}

      {/* Diagnosis */}
      {(data.provisionalDiagnosis || data.finalDiagnosis) && (
        <div className="flex flex-wrap gap-x-4 gap-y-1">
          {data.provisionalDiagnosis && <span><span className="font-semibold text-slate-700">Provisional Diagnosis:</span> <span className="text-slate-800">{data.provisionalDiagnosis}</span></span>}
          {data.finalDiagnosis && <span><span className="font-semibold text-slate-700">Final Diagnosis:</span> <span className="text-slate-800">{data.finalDiagnosis}</span></span>}
        </div>
      )}

      {/* Investigations */}
      {data.investigations && (
        <div><span className="font-semibold text-slate-700">Investigations:</span> <span className="text-slate-800">{data.investigations}</span></div>
      )}

      {/* Treatment Plan */}
      {data.treatmentPlan && (
        <div><span className="font-semibold text-slate-700">Treatment Plan:</span> <span className="text-slate-800">{data.treatmentPlan}</span></div>
      )}

      {/* General Status, Weight, Height */}
      {(data.generalStatus || data.weight || data.height) && (
        <div className="flex flex-wrap gap-x-4 gap-y-1">
          {data.generalStatus && <span><span className="font-semibold text-slate-700">General Status:</span> <span className="text-slate-800">{data.generalStatus}</span></span>}
          {data.weight && <span><span className="font-semibold text-slate-700">Weight:</span> <span className="text-slate-800">{data.weight}</span></span>}
          {data.height && <span><span className="font-semibold text-slate-700">Height:</span> <span className="text-slate-800">{data.height}</span></span>}
        </div>
      )}

      {/* Advised Diet */}
      {data.advisedDiet && (
        <div><span className="font-semibold text-slate-700">Advised Diet:</span> <span className="text-slate-800">{data.advisedDiet}</span></div>
      )}

      {/* Doctor */}
      {data.doctorName && (
        <div className="pt-2 border-t border-slate-100">
          <span><span className="font-semibold text-slate-700">Doctor Name:</span> <span className="text-slate-800">{data.doctorName}</span></span>
        </div>
      )}
    </div>
  )
}

function HistoryDialog({
  open,
  onClose,
  onSave,
  initial,
}: {
  open: boolean
  onClose: () => void
  onSave: (d: any) => void
  initial?: any
}) {
  const [form, setForm] = useState({
    date: initial?.date || new Date().toISOString().slice(0, 10),
    time: initial?.time || new Date().toTimeString().slice(0, 5),
    presentingComplaints: initial?.presentingComplaints || '',
    medicationHistory: initial?.medicationHistory || '',
    familyHistory: initial?.familyHistory || '',
    allergies: initial?.allergies || '',
    vitals: initial?.vitals || { vitalc: '', bp: '', pulse: '', temp: '', rr: '' },
    generalPhysicalExamination: initial?.generalPhysicalExamination || '',
    provisionalDiagnosis: initial?.provisionalDiagnosis || '',
    investigations: initial?.investigations || '',
    finalDiagnosis: initial?.finalDiagnosis || '',
    treatmentPlan: initial?.treatmentPlan || '',
    generalStatus: initial?.generalStatus || '',
    weight: initial?.weight || '',
    height: initial?.height || '',
    advisedDiet: initial?.advisedDiet || '',
    doctorName: initial?.doctorName || '',
  })
  const [doctors, setDoctors] = useState<Array<{ _id: string; name: string }>>([])
  const [doctorSearch, setDoctorSearch] = useState('')
  const [showDoctorDropdown, setShowDoctorDropdown] = useState(false)
  const [selectedDoctor, setSelectedDoctor] = useState('')
  const dropdownRef = useRef<HTMLDivElement>(null)
  const filteredDoctors = doctors.filter(d => d.name.toLowerCase().includes(doctorSearch.toLowerCase()))

  useEffect(() => {
    if (open) {
      // Reset form to initial or empty state when opening
      setForm({
        date: initial?.date || new Date().toISOString().slice(0, 10),
        time: initial?.time || new Date().toTimeString().slice(0, 5),
        presentingComplaints: initial?.presentingComplaints || '',
        medicationHistory: initial?.medicationHistory || '',
        familyHistory: initial?.familyHistory || '',
        allergies: initial?.allergies || '',
        vitals: initial?.vitals || { vitalc: '', bp: '', pulse: '', temp: '', rr: '' },
        generalPhysicalExamination: initial?.generalPhysicalExamination || '',
        provisionalDiagnosis: initial?.provisionalDiagnosis || '',
        investigations: initial?.investigations || '',
        finalDiagnosis: initial?.finalDiagnosis || '',
        treatmentPlan: initial?.treatmentPlan || '',
        generalStatus: initial?.generalStatus || '',
        weight: initial?.weight || '',
        height: initial?.height || '',
        advisedDiet: initial?.advisedDiet || '',
        doctorName: initial?.doctorName || '',
      })
      setDoctorSearch('')
      setSelectedDoctor('')
      ;(async() => {
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
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDoctorDropdown(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  if (!open) return null

  const updateVitals = (key: string, value: string) => {
    setForm({ ...form, vitals: { ...form.vitals, [key]: value } })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-xl bg-white p-6">
        <h3 className="mb-4 text-lg font-semibold">{initial ? 'Edit History & Examination Form' : 'Add History & Examination Form'}</h3>

        <div className="space-y-4">
          {/* Top Info Row */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Date</label>
              <input
                type="date"
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                value={form.date}
                onChange={(e) => setForm({ ...form, date: e.target.value })}
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Time</label>
              <input
                type="time"
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                value={form.time}
                onChange={(e) => setForm({ ...form, time: e.target.value })}
              />
            </div>
          </div>

          {/* Presenting Complaints */}
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Presenting Complaints</label>
            <textarea
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm min-h-[60px]"
              value={form.presentingComplaints}
              onChange={(e) => setForm({ ...form, presentingComplaints: e.target.value })}
            />
          </div>

          {/* History Section */}
          <div className="border-t border-slate-200 pt-4">
            <h4 className="mb-3 text-sm font-semibold text-slate-700">History</h4>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Medication History</label>
                <textarea
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm min-h-[60px]"
                  value={form.medicationHistory}
                  onChange={(e) => setForm({ ...form, medicationHistory: e.target.value })}
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Family History</label>
                <textarea
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm min-h-[60px]"
                  value={form.familyHistory}
                  onChange={(e) => setForm({ ...form, familyHistory: e.target.value })}
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Allergies</label>
                <textarea
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm min-h-[60px]"
                  value={form.allergies}
                  onChange={(e) => setForm({ ...form, allergies: e.target.value })}
                />
              </div>
            </div>
          </div>

          {/* Vitals Section */}
          <div className="border-t border-slate-200 pt-4">
            <h4 className="mb-3 text-sm font-semibold text-slate-700">Vitals</h4>
            <div className="grid grid-cols-5 gap-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Vitalc</label>
                <input
                  type="text"
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                  value={form.vitals.vitalc}
                  onChange={(e) => updateVitals('vitalc', e.target.value)}
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">BP</label>
                <input
                  type="text"
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                  value={form.vitals.bp}
                  onChange={(e) => updateVitals('bp', e.target.value)}
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Pulse</label>
                <input
                  type="text"
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                  value={form.vitals.pulse}
                  onChange={(e) => updateVitals('pulse', e.target.value)}
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Temp</label>
                <input
                  type="text"
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                  value={form.vitals.temp}
                  onChange={(e) => updateVitals('temp', e.target.value)}
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">R/R</label>
                <input
                  type="text"
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                  value={form.vitals.rr}
                  onChange={(e) => updateVitals('rr', e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* Examination Section */}
          <div className="border-t border-slate-200 pt-4">
            <h4 className="mb-3 text-sm font-semibold text-slate-700">Examination</h4>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">General Physical Examination</label>
              <textarea
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm min-h-[60px]"
                value={form.generalPhysicalExamination}
                onChange={(e) => setForm({ ...form, generalPhysicalExamination: e.target.value })}
              />
            </div>
          </div>

          {/* Diagnosis Section */}
          <div className="border-t border-slate-200 pt-4">
            <h4 className="mb-3 text-sm font-semibold text-slate-700">Diagnosis</h4>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Provisional Diagnosis</label>
                <textarea
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm min-h-[60px]"
                  value={form.provisionalDiagnosis}
                  onChange={(e) => setForm({ ...form, provisionalDiagnosis: e.target.value })}
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Final Diagnosis</label>
                <textarea
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm min-h-[60px]"
                  value={form.finalDiagnosis}
                  onChange={(e) => setForm({ ...form, finalDiagnosis: e.target.value })}
                />
              </div>
            </div>
            <div className="mt-4">
              <label className="mb-1 block text-sm font-medium text-slate-700">Investigations</label>
              <textarea
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm min-h-[60px]"
                value={form.investigations}
                onChange={(e) => setForm({ ...form, investigations: e.target.value })}
              />
            </div>
          </div>

          {/* Treatment Section */}
          <div className="border-t border-slate-200 pt-4">
            <h4 className="mb-3 text-sm font-semibold text-slate-700">Treatment & Status</h4>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Treatment Plan</label>
              <textarea
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm min-h-[60px]"
                value={form.treatmentPlan}
                onChange={(e) => setForm({ ...form, treatmentPlan: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-3 gap-4 mt-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">General Status</label>
                <input
                  type="text"
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                  value={form.generalStatus}
                  onChange={(e) => setForm({ ...form, generalStatus: e.target.value })}
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Weight</label>
                <input
                  type="text"
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                  value={form.weight}
                  onChange={(e) => setForm({ ...form, weight: e.target.value })}
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Height</label>
                <input
                  type="text"
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                  value={form.height}
                  onChange={(e) => setForm({ ...form, height: e.target.value })}
                />
              </div>
            </div>
            <div className="mt-4">
              <label className="mb-1 block text-sm font-medium text-slate-700">Advised Diet</label>
              <textarea
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm min-h-[40px]"
                value={form.advisedDiet}
                onChange={(e) => setForm({ ...form, advisedDiet: e.target.value })}
              />
            </div>
          </div>

          {/* Doctor */}
          <div className="border-t border-slate-200 pt-4">
            <h4 className="mb-3 text-sm font-semibold text-slate-700">Doctor</h4>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Doctor Name</label>
              <div className="relative" ref={dropdownRef}>
                <input
                  type="text"
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                  value={selectedDoctor || doctorSearch}
                  onChange={(e) => { setDoctorSearch(e.target.value); setShowDoctorDropdown(true); setSelectedDoctor(''); }}
                  onFocus={() => setShowDoctorDropdown(true)}
                  placeholder="Search doctor..."
                />
                {showDoctorDropdown && filteredDoctors.length > 0 && (
                  <div className="absolute z-10 mt-1 max-h-40 w-full overflow-auto rounded-md border border-slate-300 bg-white shadow-lg">
                    {filteredDoctors.map(d => (
                      <div
                        key={d._id}
                        onClick={() => { setSelectedDoctor(d.name); setDoctorSearch(d.name); setShowDoctorDropdown(false); setForm({ ...form, doctorName: d.name }); }}
                        className="cursor-pointer px-3 py-2 hover:bg-slate-100"
                      >
                        {d.name}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-2">
          <button onClick={onClose} className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
            Cancel
          </button>
          <button
            onClick={() => onSave({ ...form, doctorName: selectedDoctor })}
            className="rounded-md bg-slate-800 px-4 py-2 text-sm font-medium text-white hover:bg-slate-900"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  )
}
