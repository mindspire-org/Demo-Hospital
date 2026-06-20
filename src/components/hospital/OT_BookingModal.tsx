import { useEffect, useState, useRef } from 'react'
import { hospitalApi } from '../../utils/api'
import { Activity, Users, Scissors, ClipboardList } from 'lucide-react'

type TeamMember = { staffId: string; role: string; name?: string }
type PatientEntryMode = 'ipd' | 'manual' | 'er'
type SurgeryType = 'major' | 'minor' | 'emergency'
type ASACLass = 'ASA-I' | 'ASA-II' | 'ASA-III' | 'ASA-IV' | 'ASA-V' | 'ASA-VI'
type PostOpDestination = 'ward' | 'icu' | 'hdu' | 'recovery'
type Tab = 'patient' | 'procedure' | 'team' | 'anesthesia' | 'checklist'

const ci = 'mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm'
const L = (t: string) => <label className="block text-sm font-medium text-slate-700">{t}</label>
const roleColors: Record<string, string> = {
  'surgeon': 'bg-blue-100 text-blue-700', 'assistant-surgeon': 'bg-indigo-100 text-indigo-700',
  'anesthesiologist': 'bg-purple-100 text-purple-700', 'anesthesia-tech': 'bg-fuchsia-100 text-fuchsia-700',
  'scrub-nurse': 'bg-emerald-100 text-emerald-700', 'circulating-nurse': 'bg-teal-100 text-teal-700',
  'ot-technician': 'bg-orange-100 text-orange-700',
}
const fmtRole = (r: string) => r.split('-').map(w => w[0].toUpperCase() + w.slice(1)).join(' ')

// PLACEHOLDER_PART2

export function OTBookingModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [loading, setLoading] = useState(false)
  const [activeTab, setActiveTab] = useState<Tab>('patient')
  const [patients, setPatients] = useState<any[]>([])
  const [doctors, setDoctors] = useState<any[]>([])
  const [rooms, setRooms] = useState<any[]>([])
  const [staff, setStaff] = useState<any[]>([])
  const [equipment, setEquipment] = useState<any[]>([])
  const [procedures, setProcedures] = useState<any[]>([])
  const [patientEntryMode, setPatientEntryMode] = useState<PatientEntryMode>('ipd')
  const [form, setForm] = useState({
    encounterId: '', procedure: '', procedureCode: '', surgeonId: '', anesthesiologistId: '',
    roomId: '', scheduledAt: '', estimatedDuration: 60,
    priority: 'routine' as 'routine' | 'urgent' | 'emergency',
    anesthesiaType: 'general' as string, surgeryType: 'major' as SurgeryType,
    status: 'scheduled' as 'scheduled' | 'in-progress' | 'completed' | 'cancelled' | 'postponed',
    notes: '', referredFrom: 'ipd' as 'ipd' | 'er',
    patientName: '', patientMrNumber: '', patientAge: '',
    patientGender: 'male' as 'male' | 'female' | 'other',
    patientContact: '', patientAllergies: '', patientComorbidities: '',
    diagnosis: '', consultingDoctor: '', requiredEquipment: '', implants: '',
    asaClass: 'ASA-II' as ASACLass, fastingStatus: '', anesthesiaNotes: '',
    checklist: {
      consentSigned: false, consentDate: '', labReportsAvailable: false,
      bloodArranged: false, bloodUnits: '', imagingAttached: false,
      imagingTypes: [] as string[], surgicalSiteMarked: false,
      preOpAssessmentDone: false, npoVerified: false,
    },
    postOpDestination: 'ward' as PostOpDestination, postOpInstructions: '', expectedComplications: '',
    team: [] as TeamMember[],
  })

  useEffect(() => {
    async function loadOptions() {
      try {
        const [a, d, r, s, eq, proc] = await Promise.all([
          hospitalApi.listIPDAdmissions({ status: 'admitted', limit: 100 }) as any,
          hospitalApi.listDoctors({ limit: 100 }) as any,
          hospitalApi.listOTRooms({ status: 'available', limit: 50 }) as any,
          hospitalApi.listStaff() as any,
          hospitalApi.listOTEquipment({ limit: 200 }) as any,
          hospitalApi.listOTProcedures({ limit: 200 }) as any,
        ])
        setPatients(a?.admissions || []); setDoctors(d?.doctors || [])
        setRooms(r?.rooms || []); setStaff(s?.staff || [])
        setEquipment(eq?.equipment || [])
        setProcedures(proc?.procedures || [])
      } catch {}
    }
    loadOptions()
  }, [])

  const addTeamMember = (staffId: string, role: string) => {
    const s = staff.find((x: any) => x._id === staffId)
    if (!s || form.team.some(t => t.staffId === staffId && t.role === role)) return
    setForm(prev => ({ ...prev, team: [...prev.team, { staffId, role, name: s.name || s.fullName }] }))
  }
  const removeTeamMember = (i: number) => setForm(prev => ({ ...prev, team: prev.team.filter((_, j) => j !== i) }))
  const toggleImagingType = (type: string) => setForm(prev => ({
    ...prev, checklist: { ...prev.checklist, imagingTypes: prev.checklist.imagingTypes.includes(type)
      ? prev.checklist.imagingTypes.filter(t => t !== type) : [...prev.checklist.imagingTypes, type] }
  }))

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (patientEntryMode === 'ipd' && !form.encounterId) return alert('Please select a patient from IPD')
    if (patientEntryMode === 'manual' && !form.patientName) return alert('Please enter patient name')
    if (!form.procedure) return alert('Please enter the procedure')
    setLoading(true)
    try {
      const p: any = {
        encounterId: patientEntryMode === 'ipd' ? form.encounterId : undefined,
        procedure: form.procedure, procedureCode: form.procedureCode || undefined,
        surgeonId: form.surgeonId || undefined, anesthesiologistId: form.anesthesiologistId || undefined,
        roomId: form.roomId || undefined, scheduledAt: form.scheduledAt || undefined,
        estimatedDuration: form.estimatedDuration, priority: form.priority,
        anesthesiaType: form.anesthesiaType as any, notes: form.notes || undefined,
        referredFrom: patientEntryMode, surgeryType: form.surgeryType, status: form.status,
        team: form.team.map(t => ({ staffId: t.staffId, role: t.role as any })),
      }
      if (patientEntryMode === 'manual') p.patientData = {
        fullName: form.patientName, mrNumber: form.patientMrNumber,
        age: form.patientAge ? parseInt(form.patientAge) : undefined,
        gender: form.patientGender, contact: form.patientContact,
        allergies: form.patientAllergies, comorbidities: form.patientComorbidities,
      }
      p.caseContext = { diagnosis: form.diagnosis, consultingDoctor: form.consultingDoctor }
      p.equipment = { requiredEquipment: form.requiredEquipment, implants: form.implants }
      p.anesthesiaDetails = { asaClass: form.asaClass, fastingStatus: form.fastingStatus, notes: form.anesthesiaNotes }
      p.preOpChecklist = form.checklist
      p.postOpPlan = { destination: form.postOpDestination, instructions: form.postOpInstructions, expectedComplications: form.expectedComplications }
      await hospitalApi.createOTBooking(p)
      onCreated()
    } catch (e: any) { alert(e?.message || 'Failed to create booking') }
    finally { setLoading(false) }
  }

  // PLACEHOLDER_PART3

  const TabBtn = ({ id, label, icon: I }: { id: Tab; label: string; icon: any }) => (
    <button type="button" onClick={() => setActiveTab(id)}
      className={`flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 transition-colors ${activeTab === id ? 'border-purple-600 text-purple-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>
      <I className="h-4 w-4" />{label}
    </button>
  )

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-4xl max-h-[90vh] rounded-xl bg-white shadow-xl flex flex-col">
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <div><h2 className="text-lg font-semibold text-slate-800">New Surgery Booking</h2><p className="text-sm text-slate-500">Complete EMR surgery scheduling form</p></div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg></button>
        </div>
        <div className="border-b border-slate-200 px-6"><div className="flex gap-1">
          <TabBtn id="patient" label="Patient" icon={Users} /><TabBtn id="procedure" label="Procedure" icon={Scissors} />
          <TabBtn id="team" label="Team" icon={Users} /><TabBtn id="anesthesia" label="Anesthesia" icon={Activity} />
          <TabBtn id="checklist" label="Pre-op Checklist" icon={ClipboardList} />
        </div></div>
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6">

          {/* PATIENT TAB */}
          {activeTab === 'patient' && <div className="space-y-6">
            <div className="rounded-lg border border-slate-200 p-4">
              <label className="block text-sm font-medium text-slate-700 mb-3">Patient Entry Mode</label>
              <div className="flex gap-2">{(['ipd','manual','er'] as const).map(m => (
                <button key={m} type="button" onClick={() => setPatientEntryMode(m)}
                  className={`flex-1 px-4 py-2 text-sm font-medium rounded-md border ${patientEntryMode === m ? 'bg-purple-50 border-purple-300 text-purple-700' : 'border-slate-300 text-slate-700 hover:bg-slate-50'}`}>
                  {m === 'ipd' ? 'Select from IPD' : m === 'manual' ? 'Manual Entry' : 'From ER'}
                </button>))}</div>
            </div>
            {patientEntryMode === 'ipd' && <div>{L('Select IPD Patient *')}<select value={form.encounterId} onChange={e => setForm({...form, encounterId: e.target.value})} className={ci} required>
              <option value="">Select patient</option>
              {patients.map((p: any) => <option key={p._id} value={p._id}>{p.patientId?.fullName} - Bed: {p.bedLabel || p.bedId} ({p.departmentId?.name || 'N/A'})</option>)}
            </select></div>}
            {patientEntryMode === 'manual' && <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>{L('Full Name *')}<input type="text" value={form.patientName} onChange={e => setForm({...form, patientName: e.target.value})} className={ci} required placeholder="Patient full name" /></div>
                <div>{L('MR Number')}<input type="text" value={form.patientMrNumber} onChange={e => setForm({...form, patientMrNumber: e.target.value})} className={ci} placeholder="Medical Record Number" /></div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>{L('Age')}<input type="number" value={form.patientAge} onChange={e => setForm({...form, patientAge: e.target.value})} className={ci} placeholder="Years" /></div>
                <div>{L('Gender')}<select value={form.patientGender} onChange={e => setForm({...form, patientGender: e.target.value as any})} className={ci}>
                  <option value="male">Male</option><option value="female">Female</option><option value="other">Other</option></select></div>
                <div>{L('Contact')}<input type="text" value={form.patientContact} onChange={e => setForm({...form, patientContact: e.target.value})} className={ci} placeholder="Phone number" /></div>
              </div>
              <div>{L('Allergies')}<input type="text" value={form.patientAllergies} onChange={e => setForm({...form, patientAllergies: e.target.value})} className={ci} placeholder="e.g., Penicillin, Latex, Iodine" /></div>
              <div>{L('Comorbidities')}<input type="text" value={form.patientComorbidities} onChange={e => setForm({...form, patientComorbidities: e.target.value})} className={ci} placeholder="e.g., Diabetes, Hypertension" /></div>
            </div>}
            <div className="border-t border-slate-200 pt-4">
              <h3 className="text-sm font-semibold text-slate-800 mb-3">Case Context</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>{L('Pre-op Diagnosis')}<input type="text" value={form.diagnosis} onChange={e => setForm({...form, diagnosis: e.target.value})} className={ci} placeholder="e.g., Acute Appendicitis" /></div>
                <div>{L('Consulting/Referring Doctor')}<select value={form.consultingDoctor} onChange={e => setForm({...form, consultingDoctor: e.target.value})} className={ci}>
                  <option value="">Select doctor</option>{doctors.map((d: any) => <option key={d._id} value={d._id}>{d.name}</option>)}
                </select></div>
              </div>
            </div>
          </div>}

          {/* PROCEDURE TAB */}
          {activeTab === 'procedure' && <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div>
                {L('Procedure Name *')}
                <select
                  value={form.procedure}
                  onChange={e => {
                    const selectedName = e.target.value
                    const selectedProc = procedures.find((p: any) => p.name === selectedName)
                    setForm({
                      ...form,
                      procedure: selectedName,
                      procedureCode: selectedProc?.code || '',
                      estimatedDuration: selectedProc?.estimatedDuration || form.estimatedDuration,
                      requiredEquipment: (selectedProc?.requiredEquipment || []).join(', '),
                      anesthesiaType: selectedProc?.anesthesiaTypes?.[0] || form.anesthesiaType,
                    })
                  }}
                  className={ci}
                  required
                >
                  <option value="">Select Procedure</option>
                  {procedures.map((p: any) => (
                    <option key={p._id} value={p.name}>{p.name} {p.code ? `(${p.code})` : ''}</option>
                  ))}
                </select>
              </div>
              <div>{L('Procedure Code (ICD/CPT)')}<input type="text" value={form.procedureCode} onChange={e => setForm({...form, procedureCode: e.target.value})} className={ci} placeholder="e.g., 44970, K35.8" /></div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div>{L('Surgery Type')}<select value={form.surgeryType} onChange={e => setForm({...form, surgeryType: e.target.value as SurgeryType})} className={ci}>
                <option value="major">Major</option><option value="minor">Minor</option><option value="emergency">Emergency</option></select></div>
              <div>{L('Priority')}<select value={form.priority} onChange={e => setForm({...form, priority: e.target.value as any})} className={ci}>
                <option value="routine">Routine</option><option value="urgent">Urgent</option><option value="emergency">Emergency</option></select></div>
              <div>{L('Status')}<select value={form.status} onChange={e => setForm({...form, status: e.target.value as any})} className={ci}>
                <option value="scheduled">Scheduled</option><option value="in-progress">In Progress</option><option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option><option value="postponed">Postponed</option></select></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>{L('OT Room')}<select value={form.roomId} onChange={e => setForm({...form, roomId: e.target.value})} className={ci}>
                <option value="">Select OT Room</option>{rooms.map((r: any) => <option key={r._id} value={r._id}>{r.name} {r.type ? `(${r.type})` : ''}</option>)}
              </select></div>
              <div>{L('Scheduled Date & Time')}<input type="datetime-local" value={form.scheduledAt} onChange={e => setForm({...form, scheduledAt: e.target.value})} className={ci} /></div>
            </div>
            <div>{L('Estimated Duration (minutes)')}<input type="number" value={form.estimatedDuration} onChange={e => setForm({...form, estimatedDuration: parseInt(e.target.value) || 60})} className={ci} min={15} step={15} /></div>
            <div>
              {L('Required Equipment')}
              <MultiSelectDropdown
                options={equipment.map((eq: any) => ({ value: eq.name || eq.label || '', label: `${eq.name || eq.label || ''}${eq.code ? ` (${eq.code})` : ''}` }))}
                selected={form.requiredEquipment.split(',').map(s => s.trim()).filter(Boolean)}
                onChange={(selected: string[]) => setForm({ ...form, requiredEquipment: selected.join(', ') })}
                placeholder="Select equipment..."
              />
            </div>
            <div>{L('Implants / Consumables')}<textarea value={form.implants} onChange={e => setForm({...form, implants: e.target.value})} className={ci} rows={2} placeholder="e.g., Mesh, Screws, Plates" /></div>
          </div>}

          {/* TEAM TAB */}
          {activeTab === 'team' && <div className="space-y-6">
            <div className="rounded-lg border border-slate-200 p-4">
              <h3 className="text-sm font-semibold text-slate-800 mb-3">Primary Surgeon</h3>
              <select value={form.surgeonId} onChange={e => setForm({...form, surgeonId: e.target.value})} className={ci}>
                <option value="">Select primary surgeon</option>
                {doctors.map((d: any) => <option key={d._id} value={d._id}>{d.name} {d.specialization ? `(${d.specialization})` : ''}</option>)}
              </select>
            </div>
            <div className="rounded-lg border border-slate-200 p-4">
              <h3 className="text-sm font-semibold text-slate-800 mb-3">Anesthesiologist</h3>
              <select value={form.anesthesiologistId} onChange={e => setForm({...form, anesthesiologistId: e.target.value})} className={ci}>
                <option value="">Select anesthesiologist</option>
                {doctors.filter((d: any) => d.specialization?.toLowerCase().includes('anesthesia')).map((d: any) => <option key={d._id} value={d._id}>{d.name}</option>)}
                {doctors.filter((d: any) => !d.specialization?.toLowerCase().includes('anesthesia')).map((d: any) => <option key={d._id} value={d._id}>{d.name} {d.specialization ? `(${d.specialization})` : ''}</option>)}
              </select>
            </div>
            <div className="rounded-lg border border-slate-200 p-4">
              <h3 className="text-sm font-semibold text-slate-800 mb-3">Surgical Team Members</h3>
              <div className="flex gap-2 mb-4">
                <select id="teamStaffSelect" className="flex-1 rounded-md border border-slate-300 px-3 py-2 text-sm">
                  <option value="">Select staff member</option>
                  {staff.map((s: any) => <option key={s._id} value={s._id}>{s.name || s.fullName} {s.role ? `(${s.role})` : ''}</option>)}
                </select>
                <select id="teamRoleSelect" className="w-40 rounded-md border border-slate-300 px-3 py-2 text-sm">
                  <option value="">Role</option>
                  <option value="assistant-surgeon">Assistant Surgeon</option><option value="anesthesia-tech">Anesthesia Tech</option>
                  <option value="scrub-nurse">Scrub Nurse</option><option value="circulating-nurse">Circulating Nurse</option>
                  <option value="ot-technician">OT Technician</option>
                </select>
                <button type="button" onClick={() => {
                  const ss = document.getElementById('teamStaffSelect') as HTMLSelectElement
                  const rs = document.getElementById('teamRoleSelect') as HTMLSelectElement
                  if (ss.value && rs.value) { addTeamMember(ss.value, rs.value); ss.value = ''; rs.value = '' }
                }} className="px-4 py-2 bg-purple-600 text-white text-sm font-medium rounded-md hover:bg-purple-700">Add</button>
              </div>
              <div className="space-y-2">
                {form.team.length === 0 && <p className="text-sm text-slate-500 text-center py-4">No team members added yet</p>}
                {form.team.map((m, i) => <div key={i} className="flex items-center justify-between bg-slate-50 rounded-md px-3 py-2">
                  <div className="flex items-center gap-2">
                    <span className={`text-xs font-medium px-2 py-0.5 rounded ${roleColors[m.role] || 'bg-slate-100 text-slate-700'}`}>{fmtRole(m.role)}</span>
                    <span className="text-sm text-slate-700">{m.name}</span>
                  </div>
                  <button type="button" onClick={() => removeTeamMember(i)} className="text-red-500 hover:text-red-700 text-sm">Remove</button>
                </div>)}
              </div>
            </div>
          </div>}

          {/* ANESTHESIA TAB */}
          {activeTab === 'anesthesia' && <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div>{L('Anesthesia Type')}<select value={form.anesthesiaType} onChange={e => setForm({...form, anesthesiaType: e.target.value})} className={ci}>
                <option value="general">General</option><option value="spinal">Spinal</option><option value="epidural">Epidural</option>
                <option value="local">Local</option><option value="regional">Regional</option><option value="sedation">Sedation</option><option value="none">None</option></select></div>
              <div>{L('ASA Classification')}<select value={form.asaClass} onChange={e => setForm({...form, asaClass: e.target.value as ASACLass})} className={ci}>
                <option value="ASA-I">ASA I - Normal healthy patient</option><option value="ASA-II">ASA II - Mild systemic disease</option>
                <option value="ASA-III">ASA III - Severe systemic disease</option><option value="ASA-IV">ASA IV - Constant threat to life</option>
                <option value="ASA-V">ASA V - Moribund</option><option value="ASA-VI">ASA VI - Brain-dead</option></select></div>
            </div>
            <div>{L('Fasting Status (NPO)')}<input type="text" value={form.fastingStatus} onChange={e => setForm({...form, fastingStatus: e.target.value})} className={ci} placeholder="e.g., NPO since 10:00 PM (8 hours)" /></div>
            <div>{L('Anesthesia Notes / Plan')}<textarea value={form.anesthesiaNotes} onChange={e => setForm({...form, anesthesiaNotes: e.target.value})} className={ci} rows={4} placeholder="Pre-anesthesia assessment, special considerations..." /></div>
          </div>}

          {/* CHECKLIST TAB */}
          {activeTab === 'checklist' && <div className="space-y-6">
            <div className="rounded-lg border border-slate-200 p-4">
              <h3 className="text-sm font-semibold text-slate-800 mb-4">Pre-Operative Checklist</h3>
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <input type="checkbox" id="consentSigned" checked={form.checklist.consentSigned}
                    onChange={e => setForm(prev => ({...prev, checklist: {...prev.checklist, consentSigned: e.target.checked}}))}
                    className="mt-1 h-4 w-4 rounded border-slate-300 text-purple-600" />
                  <div className="flex-1">
                    <label htmlFor="consentSigned" className="block text-sm font-medium text-slate-700">Informed Consent Signed</label>
                    {form.checklist.consentSigned && <input type="date" value={form.checklist.consentDate}
                      onChange={e => setForm(prev => ({...prev, checklist: {...prev.checklist, consentDate: e.target.value}}))}
                      className="mt-2 w-full rounded-md border border-slate-300 px-3 py-1.5 text-sm" />}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <input type="checkbox" id="labReports" checked={form.checklist.labReportsAvailable}
                    onChange={e => setForm(prev => ({...prev, checklist: {...prev.checklist, labReportsAvailable: e.target.checked}}))}
                    className="h-4 w-4 rounded border-slate-300 text-purple-600" />
                  <label htmlFor="labReports" className="text-sm font-medium text-slate-700">Lab Reports Available (CBC, LFT, RFT, Coagulation profile)</label>
                </div>
                <div className="flex items-start gap-3">
                  <input type="checkbox" id="bloodArranged" checked={form.checklist.bloodArranged}
                    onChange={e => setForm(prev => ({...prev, checklist: {...prev.checklist, bloodArranged: e.target.checked}}))}
                    className="mt-1 h-4 w-4 rounded border-slate-300 text-purple-600" />
                  <div className="flex-1">
                    <label htmlFor="bloodArranged" className="block text-sm font-medium text-slate-700">Blood/ Blood Products Arranged</label>
                    {form.checklist.bloodArranged && <input type="text" value={form.checklist.bloodUnits}
                      onChange={e => setForm(prev => ({...prev, checklist: {...prev.checklist, bloodUnits: e.target.value}}))}
                      className="mt-2 w-full rounded-md border border-slate-300 px-3 py-1.5 text-sm" placeholder="e.g., 2 units PRBC, 1 unit FFP" />}
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <input type="checkbox" id="imaging" checked={form.checklist.imagingAttached}
                    onChange={e => setForm(prev => ({...prev, checklist: {...prev.checklist, imagingAttached: e.target.checked}}))}
                    className="mt-1 h-4 w-4 rounded border-slate-300 text-purple-600" />
                  <div className="flex-1">
                    <label htmlFor="imaging" className="block text-sm font-medium text-slate-700">Imaging Available</label>
                    {form.checklist.imagingAttached && <div className="mt-2 flex flex-wrap gap-2">
                      {['X-Ray', 'CT Scan', 'MRI', 'Ultrasound', 'ECG', 'ECHO'].map(type => (
                        <button key={type} type="button" onClick={() => toggleImagingType(type)}
                          className={`px-3 py-1 text-xs rounded-full border ${form.checklist.imagingTypes.includes(type) ? 'bg-purple-100 border-purple-300 text-purple-700' : 'border-slate-300 text-slate-600 hover:bg-slate-50'}`}>
                          {type}
                        </button>))}
                    </div>}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <input type="checkbox" id="siteMarked" checked={form.checklist.surgicalSiteMarked}
                    onChange={e => setForm(prev => ({...prev, checklist: {...prev.checklist, surgicalSiteMarked: e.target.checked}}))}
                    className="h-4 w-4 rounded border-slate-300 text-purple-600" />
                  <label htmlFor="siteMarked" className="text-sm font-medium text-slate-700">Surgical Site Marked (if applicable)</label>
                </div>
                <div className="flex items-center gap-3">
                  <input type="checkbox" id="preOpAssessment" checked={form.checklist.preOpAssessmentDone}
                    onChange={e => setForm(prev => ({...prev, checklist: {...prev.checklist, preOpAssessmentDone: e.target.checked}}))}
                    className="h-4 w-4 rounded border-slate-300 text-purple-600" />
                  <label htmlFor="preOpAssessment" className="text-sm font-medium text-slate-700">Pre-operative Assessment Completed</label>
                </div>
                <div className="flex items-center gap-3">
                  <input type="checkbox" id="npoVerified" checked={form.checklist.npoVerified}
                    onChange={e => setForm(prev => ({...prev, checklist: {...prev.checklist, npoVerified: e.target.checked}}))}
                    className="h-4 w-4 rounded border-slate-300 text-purple-600" />
                  <label htmlFor="npoVerified" className="text-sm font-medium text-slate-700">NPO Status Verified</label>
                </div>
              </div>
            </div>
            <div className="rounded-lg border border-slate-200 p-4">
              <h3 className="text-sm font-semibold text-slate-800 mb-4">Post-Operative Plan</h3>
              <div className="space-y-4">
                <div>{L('Post-op Destination')}
                  <div className="flex gap-2 mt-2">{[
                    { value: 'recovery', label: 'Recovery Room' }, { value: 'ward', label: 'General Ward' },
                    { value: 'hdu', label: 'HDU' }, { value: 'icu', label: 'ICU' },
                  ].map(opt => (
                    <button key={opt.value} type="button" onClick={() => setForm({...form, postOpDestination: opt.value as PostOpDestination})}
                      className={`flex-1 px-3 py-2 text-sm font-medium rounded-md border ${form.postOpDestination === opt.value ? 'bg-purple-50 border-purple-300 text-purple-700' : 'border-slate-300 text-slate-700 hover:bg-slate-50'}`}>
                      {opt.label}
                    </button>))}
                  </div>
                </div>
                <div>{L('Special Instructions')}<textarea value={form.postOpInstructions} onChange={e => setForm({...form, postOpInstructions: e.target.value})} className={ci} rows={2} placeholder="Post-operative care instructions..." /></div>
                <div>{L('Expected Complications / Risks')}<textarea value={form.expectedComplications} onChange={e => setForm({...form, expectedComplications: e.target.value})} className={ci} rows={2} placeholder="e.g., Risk of bleeding, infection..." /></div>
              </div>
            </div>
            <div>{L('Additional Notes')}<textarea value={form.notes} onChange={e => setForm({...form, notes: e.target.value})} className={ci} rows={3} placeholder="Any additional notes or special instructions..." /></div>
          </div>}
        </form>

        {/* Footer */}
        <div className="border-t border-slate-200 px-6 py-4 flex justify-between items-center">
          <div className="text-sm text-slate-500">* Required fields</div>
          <div className="flex gap-3">
            <button type="button" onClick={onClose} className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">Cancel</button>
            <button type="submit" disabled={loading} onClick={handleSubmit}
              className="rounded-md bg-purple-600 px-4 py-2 text-sm font-medium text-white hover:bg-purple-700 disabled:opacity-50">
              {loading ? 'Creating...' : 'Book Surgery'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// Multi-select dropdown component
function MultiSelectDropdown({ options, selected, onChange, placeholder }: {
  options: { value: string; label: string }[]
  selected: string[]
  onChange: (selected: string[]) => void
  placeholder?: string
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const toggle = (value: string) => {
    const updated = selected.includes(value)
      ? selected.filter(v => v !== value)
      : [...selected, value]
    onChange(updated)
  }

  const remove = (value: string) => {
    onChange(selected.filter(v => v !== value))
  }

  const selectedLabels = selected.map(s => options.find(o => o.value === s)?.label || s)

  return (
    <div ref={ref} className="relative">
      {/* Trigger */}
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="mt-1 flex w-full items-center justify-between rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-left hover:border-slate-400 focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
      >
        <span className={selected.length ? 'text-slate-800' : 'text-slate-400'}>
          {selected.length ? `${selected.length} selected` : (placeholder || 'Select...')}
        </span>
        <svg className={`h-4 w-4 text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute z-50 mt-1 max-h-48 w-full overflow-auto rounded-md border border-slate-200 bg-white py-1 shadow-lg">
          {options.length === 0 ? (
            <div className="px-3 py-2 text-xs text-slate-400">No options</div>
          ) : (
            options.map(opt => {
              const isSelected = selected.includes(opt.value)
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => toggle(opt.value)}
                  className={`flex w-full items-center gap-2 px-3 py-2 text-sm hover:bg-slate-50 ${isSelected ? 'bg-purple-50 text-purple-700' : 'text-slate-700'}`}
                >
                  <span className={`flex h-4 w-4 items-center justify-center rounded border ${isSelected ? 'border-purple-500 bg-purple-500' : 'border-slate-300'}`}>
                    {isSelected && <svg className="h-3 w-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}
                  </span>
                  {opt.label}
                </button>
              )
            })
          )}
        </div>
      )}

      {/* Selected chips */}
      {selected.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {selectedLabels.map((label, idx) => (
            <span key={selected[idx]} className="inline-flex items-center gap-1 rounded-full bg-purple-50 px-2.5 py-1 text-xs font-medium text-purple-700 border border-purple-200">
              {label}
              <button type="button" onClick={() => remove(selected[idx])} className="rounded-full p-0.5 hover:bg-purple-100">
                <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  )
}
