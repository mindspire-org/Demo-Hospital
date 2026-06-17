import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { hospitalApi } from '../../../utils/api'
import { ArrowLeft, Activity, Plus, Edit2, Trash2, Wind, Heart, Thermometer, Droplets, User, ClipboardList } from 'lucide-react'

export default function ICU_Monitoring() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const [admissions, setAdmissions] = useState<any[]>([])
  const [selectedAdmission, setSelectedAdmission] = useState<any>(null)
  const [flowsheet, setFlowsheet] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingEntry, setEditingEntry] = useState<any>(null)

  const admissionId = searchParams.get('admission')

  useEffect(() => {
    loadAdmissions()
  }, [])

  useEffect(() => {
    if (admissionId) {
      const adm = admissions.find(a => a._id === admissionId)
      if (adm) setSelectedAdmission(adm)
      loadFlowsheet(admissionId)
    }
  }, [admissionId, admissions])

  async function loadAdmissions() {
    setLoading(true)
    try {
      const res = await hospitalApi.listICUAdmissions({ status: 'active', limit: 100 }) as any
      const list = res?.admissions || []
      setAdmissions(list)
      if (admissionId && list.length > 0) {
        const adm = list.find((a: any) => a._id === admissionId)
        if (adm) setSelectedAdmission(adm)
      }
    } catch {}
    setLoading(false)
  }

  async function loadFlowsheet(encounterId: string) {
    try {
      const res = await hospitalApi.listICUFlowsheet(encounterId, { limit: 50 }) as any
      setFlowsheet(res?.flowsheet || [])
    } catch {}
  }

  function selectAdmission(adm: any) {
    setSelectedAdmission(adm)
    setSearchParams({ admission: adm._id })
  }

  async function handleDeleteEntry(id: string) {
    if (!confirm('Delete this flowsheet entry?')) return
    try {
      await hospitalApi.deleteICUFlowsheetEntry(id)
      if (selectedAdmission?.encounterId?._id) {
        loadFlowsheet(selectedAdmission.encounterId._id)
      }
    } catch {}
  }

  const patientName = selectedAdmission?.patientId
    ? `${selectedAdmission.patientId.firstName || ''} ${selectedAdmission.patientId.lastName || ''}`.trim() || 'Unknown'
    : 'Select Patient'

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <button onClick={() => navigate('/hospital/icu')} className="text-slate-600 hover:text-slate-800">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h1 className="text-xl font-semibold text-slate-800">ICU Monitoring</h1>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-4">
        {/* Patient List */}
        <div className="rounded-xl border border-slate-200 bg-white p-4 lg:col-span-1">
          <h3 className="mb-3 flex items-center gap-2 font-medium text-slate-700">
            <User className="h-4 w-4" />
            Active Patients ({admissions.length})
          </h3>
          {loading ? (
            <div className="py-4 text-center text-sm text-slate-500">Loading...</div>
          ) : admissions.length === 0 ? (
            <div className="py-4 text-center text-sm text-slate-500">No active ICU patients</div>
          ) : (
            <div className="space-y-2 max-h-96 overflow-auto">
              {admissions.map((adm) => {
                const name = adm.patientId
                  ? `${adm.patientId.firstName || ''} ${adm.patientId.lastName || ''}`.trim() || 'Unknown'
                  : 'Unknown'
                const isSelected = selectedAdmission?._id === adm._id
                return (
                  <button
                    key={adm._id}
                    onClick={() => selectAdmission(adm)}
                    className={`w-full rounded-lg border p-3 text-left transition-colors ${
                      isSelected ? 'border-rose-500 bg-rose-50' : 'border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <div className="font-medium text-slate-800">{name}</div>
                    <div className="mt-1 flex items-center gap-2 text-xs text-slate-500">
                      <span className={`rounded px-1.5 py-0.5 ${
                        adm.severity === 'critical' ? 'bg-red-100 text-red-700' :
                        adm.severity === 'severe' ? 'bg-orange-100 text-orange-700' :
                        adm.severity === 'moderate' ? 'bg-yellow-100 text-yellow-700' :
                        'bg-green-100 text-green-700'
                      }`}>{adm.severity}</span>
                      {adm.ventilatorRequired && <Wind className="h-3 w-3 text-blue-500" />}
                    </div>
                  </button>
                )
              })}
            </div>
          )}
        </div>

        {/* Flowsheet */}
        <div className="rounded-xl border border-slate-200 bg-white p-4 lg:col-span-3">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h3 className="font-medium text-slate-800">{patientName}</h3>
              {selectedAdmission && (
                <p className="text-sm text-slate-500">
                  Bed: {selectedAdmission.bedId?.name || 'Unassigned'} • Severity: {selectedAdmission.severity}
                </p>
              )}
            </div>
            {selectedAdmission && (
              <button
                onClick={() => { setEditingEntry(null); setShowModal(true) }}
                className="inline-flex items-center gap-2 rounded-md bg-rose-600 px-3 py-2 text-sm text-white hover:bg-rose-700"
              >
                <Plus className="h-4 w-4" />
                Add Entry
              </button>
            )}
          </div>

          {!selectedAdmission ? (
            <div className="py-12 text-center text-slate-500">
              <Activity className="mx-auto mb-3 h-10 w-10 text-slate-300" />
              Select a patient from the list to view their flowsheet
            </div>
          ) : flowsheet.length === 0 ? (
            <div className="py-12 text-center text-slate-500">
              <ClipboardList className="mx-auto mb-3 h-10 w-10 text-slate-300" />
              No flowsheet entries recorded yet
            </div>
          ) : (
            <div className="space-y-3 max-h-96 overflow-auto">
              {flowsheet.map((entry) => (
                <div key={entry._id} className="rounded-lg border border-slate-200 p-3">
                  <div className="flex items-start justify-between">
                    <div className="text-sm text-slate-500">
                      {new Date(entry.recordedAt).toLocaleString()} • {entry.shift} shift
                    </div>
                    <div className="flex gap-1">
                      <button
                        onClick={() => { setEditingEntry(entry); setShowModal(true) }}
                        className="rounded p-1 text-slate-600 hover:bg-slate-100"
                      >
                        <Edit2 className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteEntry(entry._id)}
                        className="rounded p-1 text-red-600 hover:bg-red-50"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                  <div className="mt-2 grid grid-cols-2 gap-2 text-sm md:grid-cols-4">
                    {entry.bp?.systolic && (
                      <div className="flex items-center gap-1.5">
                        <Heart className="h-3.5 w-3.5 text-rose-500" />
                        <span className="text-slate-600">BP:</span>
                        <span className="font-medium">{entry.bp.systolic}/{entry.bp.diastolic}</span>
                      </div>
                    )}
                    {entry.hr && (
                      <div className="flex items-center gap-1.5">
                        <Activity className="h-3.5 w-3.5 text-rose-500" />
                        <span className="text-slate-600">HR:</span>
                        <span className="font-medium">{entry.hr}</span>
                      </div>
                    )}
                    {entry.rr && (
                      <div>
                        <span className="text-slate-600">RR:</span>
                        <span className="font-medium">{entry.rr}</span>
                      </div>
                    )}
                    {entry.temp && (
                      <div className="flex items-center gap-1.5">
                        <Thermometer className="h-3.5 w-3.5 text-orange-500" />
                        <span className="text-slate-600">Temp:</span>
                        <span className="font-medium">{entry.temp}°C</span>
                      </div>
                    )}
                    {entry.spo2 && (
                      <div>
                        <span className="text-slate-600">SpO2:</span>
                        <span className="font-medium text-blue-600">{entry.spo2}%</span>
                      </div>
                    )}
                    {entry.gcs?.total && (
                      <div>
                        <span className="text-slate-600">GCS:</span>
                        <span className="font-medium">{entry.gcs.total} (E{entry.gcs.eye}V{entry.gcs.verbal}M{entry.gcs.motor})</span>
                      </div>
                    )}
                    {entry.painScore !== undefined && (
                      <div>
                        <span className="text-slate-600">Pain:</span>
                        <span className="font-medium">{entry.painScore}/10</span>
                      </div>
                    )}
                    {entry.ventilator?.mode && (
                      <div className="flex items-center gap-1.5">
                        <Wind className="h-3.5 w-3.5 text-blue-500" />
                        <span className="text-slate-600">Vent:</span>
                        <span className="font-medium">{entry.ventilator.mode} FiO2 {entry.ventilator.fio2}%</span>
                      </div>
                    )}
                    {entry.intake?.total !== undefined && (
                      <div className="flex items-center gap-1.5">
                        <Droplets className="h-3.5 w-3.5 text-blue-500" />
                        <span className="text-slate-600">I/O:</span>
                        <span className="font-medium">{entry.intake.total}ml / {entry.output?.total || 0}ml</span>
                      </div>
                    )}
                  </div>
                  {entry.notes && (
                    <p className="mt-2 text-sm text-slate-600">{entry.notes}</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {showModal && selectedAdmission && (
        <EntryModal
          encounterId={selectedAdmission.encounterId?._id || selectedAdmission.encounterId}
          entry={editingEntry}
          onClose={() => setShowModal(false)}
          onSaved={() => {
            setShowModal(false)
            loadFlowsheet(selectedAdmission.encounterId?._id || selectedAdmission.encounterId)
          }}
        />
      )}
    </div>
  )
}

function EntryModal({ encounterId, entry, onClose, onSaved }: { encounterId: string; entry?: any; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState({
    recordedAt: entry?.recordedAt ? new Date(entry.recordedAt).toISOString().slice(0, 16) : new Date().toISOString().slice(0, 16),
    bpSystolic: entry?.bp?.systolic || '',
    bpDiastolic: entry?.bp?.diastolic || '',
    hr: entry?.hr || '',
    rr: entry?.rr || '',
    temp: entry?.temp || '',
    spo2: entry?.spo2 || '',
    gcsEye: entry?.gcs?.eye || 4,
    gcsVerbal: entry?.gcs?.verbal || 5,
    gcsMotor: entry?.gcs?.motor || 6,
    painScore: entry?.painScore || '',
    sedationScore: entry?.sedationScore || '',
    intakeOral: entry?.intake?.oral || '',
    intakeIv: entry?.intake?.iv || '',
    outputUrine: entry?.output?.urine || '',
    outputDrain: entry?.output?.drain || '',
    ventilatorMode: entry?.ventilator?.mode || '',
    ventilatorFio2: entry?.ventilator?.fio2 || '',
    ventilatorPeep: entry?.ventilator?.peep || '',
    ventilatorRate: entry?.ventilator?.rate || '',
    cvp: entry?.cvp || '',
    notes: entry?.notes || '',
    shift: entry?.shift || getCurrentShift(),
  })
  const [saving, setSaving] = useState(false)

  function getCurrentShift(): 'morning' | 'evening' | 'night' {
    const hour = new Date().getHours()
    if (hour >= 6 && hour < 14) return 'morning'
    if (hour >= 14 && hour < 22) return 'evening'
    return 'night'
  }

  function calculateGCS(): number {
    return Number(form.gcsEye) + Number(form.gcsVerbal) + Number(form.gcsMotor)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    try {
      const data = {
        recordedAt: form.recordedAt,
        bp: { systolic: Number(form.bpSystolic) || undefined, diastolic: Number(form.bpDiastolic) || undefined },
        hr: Number(form.hr) || undefined,
        rr: Number(form.rr) || undefined,
        temp: Number(form.temp) || undefined,
        spo2: Number(form.spo2) || undefined,
        gcs: { eye: Number(form.gcsEye), verbal: Number(form.gcsVerbal), motor: Number(form.gcsMotor), total: calculateGCS() },
        painScore: Number(form.painScore) || undefined,
        sedationScore: Number(form.sedationScore) || undefined,
        intake: { oral: Number(form.intakeOral) || 0, iv: Number(form.intakeIv) || 0, ng: 0, total: (Number(form.intakeOral) || 0) + (Number(form.intakeIv) || 0) },
        output: { urine: Number(form.outputUrine) || 0, drain: Number(form.outputDrain) || 0, emesis: 0, total: (Number(form.outputUrine) || 0) + (Number(form.outputDrain) || 0) },
        ventilator: form.ventilatorMode ? {
          mode: form.ventilatorMode,
          fio2: Number(form.ventilatorFio2) || undefined,
          peep: Number(form.ventilatorPeep) || undefined,
          rate: Number(form.ventilatorRate) || undefined,
        } : undefined,
        cvp: Number(form.cvp) || undefined,
        notes: form.notes,
        shift: form.shift,
      }
      if (entry) {
        await hospitalApi.updateICUFlowsheetEntry(entry._id, data)
      } else {
        await hospitalApi.createICUFlowsheetEntry(encounterId, data)
      }
      onSaved()
    } catch {}
    setSaving(false)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-2xl max-h-[90vh] overflow-auto rounded-xl bg-white p-6 shadow-xl">
        <h2 className="text-lg font-semibold">{entry ? 'Edit' : 'Add'} Flowsheet Entry</h2>
        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700">Date & Time *</label>
              <input
                type="datetime-local"
                value={form.recordedAt}
                onChange={(e) => setForm({ ...form, recordedAt: e.target.value })}
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700">Shift</label>
              <select
                value={form.shift}
                onChange={(e) => setForm({ ...form, shift: e.target.value })}
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              >
                <option value="morning">Morning (6am-2pm)</option>
                <option value="evening">Evening (2pm-10pm)</option>
                <option value="night">Night (10pm-6am)</option>
              </select>
            </div>
          </div>

          <div className="rounded-lg border border-slate-200 p-3">
            <h4 className="mb-2 text-sm font-medium text-slate-700">Vital Signs</h4>
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              <div>
                <label className="block text-xs text-slate-600">BP Systolic</label>
                <input
                  type="number"
                  value={form.bpSystolic}
                  onChange={(e) => setForm({ ...form, bpSystolic: e.target.value })}
                  className="mt-1 w-full rounded-md border border-slate-300 px-2 py-1 text-sm"
                  placeholder="mmHg"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-600">BP Diastolic</label>
                <input
                  type="number"
                  value={form.bpDiastolic}
                  onChange={(e) => setForm({ ...form, bpDiastolic: e.target.value })}
                  className="mt-1 w-full rounded-md border border-slate-300 px-2 py-1 text-sm"
                  placeholder="mmHg"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-600">Heart Rate</label>
                <input
                  type="number"
                  value={form.hr}
                  onChange={(e) => setForm({ ...form, hr: e.target.value })}
                  className="mt-1 w-full rounded-md border border-slate-300 px-2 py-1 text-sm"
                  placeholder="bpm"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-600">Respiratory Rate</label>
                <input
                  type="number"
                  value={form.rr}
                  onChange={(e) => setForm({ ...form, rr: e.target.value })}
                  className="mt-1 w-full rounded-md border border-slate-300 px-2 py-1 text-sm"
                  placeholder="/min"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-600">Temperature</label>
                <input
                  type="number"
                  step="0.1"
                  value={form.temp}
                  onChange={(e) => setForm({ ...form, temp: e.target.value })}
                  className="mt-1 w-full rounded-md border border-slate-300 px-2 py-1 text-sm"
                  placeholder="°C"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-600">SpO2</label>
                <input
                  type="number"
                  value={form.spo2}
                  onChange={(e) => setForm({ ...form, spo2: e.target.value })}
                  className="mt-1 w-full rounded-md border border-slate-300 px-2 py-1 text-sm"
                  placeholder="%"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-600">CVP</label>
                <input
                  type="number"
                  value={form.cvp}
                  onChange={(e) => setForm({ ...form, cvp: e.target.value })}
                  className="mt-1 w-full rounded-md border border-slate-300 px-2 py-1 text-sm"
                  placeholder="cmH2O"
                />
              </div>
            </div>
          </div>

          <div className="rounded-lg border border-slate-200 p-3">
            <h4 className="mb-2 text-sm font-medium text-slate-700">Glasgow Coma Scale (Total: {calculateGCS()})</h4>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-xs text-slate-600">Eye Opening (E)</label>
                <select
                  value={form.gcsEye}
                  onChange={(e) => setForm({ ...form, gcsEye: Number(e.target.value) })}
                  className="mt-1 w-full rounded-md border border-slate-300 px-2 py-1 text-sm"
                >
                  <option value={4}>4 - Spontaneous</option>
                  <option value={3}>3 - To Speech</option>
                  <option value={2}>2 - To Pain</option>
                  <option value={1}>1 - None</option>
                </select>
              </div>
              <div>
                <label className="block text-xs text-slate-600">Verbal Response (V)</label>
                <select
                  value={form.gcsVerbal}
                  onChange={(e) => setForm({ ...form, gcsVerbal: Number(e.target.value) })}
                  className="mt-1 w-full rounded-md border border-slate-300 px-2 py-1 text-sm"
                >
                  <option value={5}>5 - Oriented</option>
                  <option value={4}>4 - Confused</option>
                  <option value={3}>3 - Inappropriate</option>
                  <option value={2}>2 - Sounds</option>
                  <option value={1}>1 - None</option>
                </select>
              </div>
              <div>
                <label className="block text-xs text-slate-600">Motor Response (M)</label>
                <select
                  value={form.gcsMotor}
                  onChange={(e) => setForm({ ...form, gcsMotor: Number(e.target.value) })}
                  className="mt-1 w-full rounded-md border border-slate-300 px-2 py-1 text-sm"
                >
                  <option value={6}>6 - Obeys Commands</option>
                  <option value={5}>5 - Localizes Pain</option>
                  <option value={4}>4 - Withdraws</option>
                  <option value={3}>3 - Flexion</option>
                  <option value={2}>2 - Extension</option>
                  <option value={1}>1 - None</option>
                </select>
              </div>
            </div>
          </div>

          <div className="rounded-lg border border-slate-200 p-3">
            <h4 className="mb-2 text-sm font-medium text-slate-700">Pain & Sedation</h4>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-slate-600">Pain Score (0-10)</label>
                <input
                  type="number"
                  min="0"
                  max="10"
                  value={form.painScore}
                  onChange={(e) => setForm({ ...form, painScore: e.target.value })}
                  className="mt-1 w-full rounded-md border border-slate-300 px-2 py-1 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-600">Sedation Score</label>
                <input
                  type="number"
                  value={form.sedationScore}
                  onChange={(e) => setForm({ ...form, sedationScore: e.target.value })}
                  className="mt-1 w-full rounded-md border border-slate-300 px-2 py-1 text-sm"
                  placeholder="RASS"
                />
              </div>
            </div>
          </div>

          <div className="rounded-lg border border-slate-200 p-3">
            <h4 className="mb-2 text-sm font-medium text-slate-700">Intake (ml)</h4>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-slate-600">Oral</label>
                <input
                  type="number"
                  value={form.intakeOral}
                  onChange={(e) => setForm({ ...form, intakeOral: e.target.value })}
                  className="mt-1 w-full rounded-md border border-slate-300 px-2 py-1 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-600">IV</label>
                <input
                  type="number"
                  value={form.intakeIv}
                  onChange={(e) => setForm({ ...form, intakeIv: e.target.value })}
                  className="mt-1 w-full rounded-md border border-slate-300 px-2 py-1 text-sm"
                />
              </div>
            </div>
          </div>

          <div className="rounded-lg border border-slate-200 p-3">
            <h4 className="mb-2 text-sm font-medium text-slate-700">Output (ml)</h4>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-slate-600">Urine</label>
                <input
                  type="number"
                  value={form.outputUrine}
                  onChange={(e) => setForm({ ...form, outputUrine: e.target.value })}
                  className="mt-1 w-full rounded-md border border-slate-300 px-2 py-1 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-600">Drain</label>
                <input
                  type="number"
                  value={form.outputDrain}
                  onChange={(e) => setForm({ ...form, outputDrain: e.target.value })}
                  className="mt-1 w-full rounded-md border border-slate-300 px-2 py-1 text-sm"
                />
              </div>
            </div>
          </div>

          <div className="rounded-lg border border-slate-200 p-3">
            <h4 className="mb-2 text-sm font-medium text-slate-700">Ventilator Settings</h4>
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              <div>
                <label className="block text-xs text-slate-600">Mode</label>
                <select
                  value={form.ventilatorMode}
                  onChange={(e) => setForm({ ...form, ventilatorMode: e.target.value })}
                  className="mt-1 w-full rounded-md border border-slate-300 px-2 py-1 text-sm"
                >
                  <option value="">None</option>
                  <option value="cmv">CMV</option>
                  <option value="ac">AC</option>
                  <option value="simv">SIMV</option>
                  <option value="psv">PSV</option>
                  <option value="cpap">CPAP</option>
                  <option value="bipap">BiPAP</option>
                </select>
              </div>
              <div>
                <label className="block text-xs text-slate-600">FiO2 (%)</label>
                <input
                  type="number"
                  min="21"
                  max="100"
                  value={form.ventilatorFio2}
                  onChange={(e) => setForm({ ...form, ventilatorFio2: e.target.value })}
                  className="mt-1 w-full rounded-md border border-slate-300 px-2 py-1 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-600">PEEP</label>
                <input
                  type="number"
                  value={form.ventilatorPeep}
                  onChange={(e) => setForm({ ...form, ventilatorPeep: e.target.value })}
                  className="mt-1 w-full rounded-md border border-slate-300 px-2 py-1 text-sm"
                  placeholder="cmH2O"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-600">Rate</label>
                <input
                  type="number"
                  value={form.ventilatorRate}
                  onChange={(e) => setForm({ ...form, ventilatorRate: e.target.value })}
                  className="mt-1 w-full rounded-md border border-slate-300 px-2 py-1 text-sm"
                  placeholder="/min"
                />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700">Notes</label>
            <textarea
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              rows={2}
              placeholder="Clinical observations, events, interventions..."
            />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="rounded-md border border-slate-300 px-4 py-2 text-sm">
              Cancel
            </button>
            <button type="submit" disabled={saving} className="rounded-md bg-rose-600 px-4 py-2 text-sm text-white">
              {saving ? 'Saving...' : entry ? 'Update' : 'Save'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
