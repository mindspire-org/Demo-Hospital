import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { hospitalApi } from '../../../utils/api'
import { ArrowLeft, Wind, Plus, Edit2, Trash2, Clock, Activity, Settings, User, AlertCircle } from 'lucide-react'

const VENTILATOR_MODES = [
  { value: 'cmv', label: 'CMV (Controlled)' },
  { value: 'ac', label: 'A/C (Assist Control)' },
  { value: 'simv', label: 'SIMV' },
  { value: 'psv', label: 'PSV (Pressure Support)' },
  { value: 'cpap', label: 'CPAP' },
  { value: 'bipap', label: 'BiPAP' },
  { value: 'prvc', label: 'PRVC' },
  { value: 'vcv', label: 'VCV' },
  { value: 'pcv', label: 'PCV' },
]

export default function ICU_Ventilator() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const [admissions, setAdmissions] = useState<any[]>([])
  const [selectedAdmission, setSelectedAdmission] = useState<any>(null)
  const [settings, setSettings] = useState<any[]>([])
  const [showModal, setShowModal] = useState(false)
  const [editingSetting, setEditingSetting] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  const admissionId = searchParams.get('admission')

  useEffect(() => {
    loadAdmissions()
  }, [])

  useEffect(() => {
    if (admissionId) {
      const adm = admissions.find(a => a._id === admissionId)
      if (adm) setSelectedAdmission(adm)
      loadSettings(admissionId)
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

  async function loadSettings(encounterId: string) {
    try {
      const res = await hospitalApi.listICUFlowsheet(encounterId, { limit: 50 }) as any
      const entries = res?.entries || []
      const ventSettings = entries.filter((e: any) => e.ventilator && (e.ventilator.mode || e.ventilator.fio2 || e.ventilator.peep))
      setSettings(ventSettings)
    } catch {}
  }

  function selectAdmission(adm: any) {
    setSelectedAdmission(adm)
    setSearchParams({ admission: adm._id })
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this ventilator setting?')) return
    try {
      await hospitalApi.deleteICUFlowsheetEntry(id)
      if (selectedAdmission?.encounterId?._id) {
        loadSettings(selectedAdmission.encounterId._id)
      }
    } catch {}
  }

  const patientName = selectedAdmission?.patientId
    ? `${selectedAdmission.patientId.firstName || ''} ${selectedAdmission.patientId.lastName || ''}`.trim() || 'Unknown'
    : 'Select Patient'

  const currentSetting = settings[0] || null

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <button onClick={() => navigate('/hospital/icu')} className="text-slate-600 hover:text-slate-800">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h1 className="text-xl font-semibold text-slate-800">Ventilator Management</h1>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-4">
        {/* Patient List */}
        <div className="rounded-xl border border-slate-200 bg-white p-4 lg:col-span-1">
          <h3 className="mb-3 flex items-center gap-2 font-medium text-slate-700">
            <Wind className="h-4 w-4 text-blue-500" />
            Ventilated Patients ({admissions.length})
          </h3>
          {loading ? (
            <div className="py-4 text-center text-sm text-slate-500">Loading...</div>
          ) : admissions.length === 0 ? (
            <div className="py-4 text-center text-sm text-slate-500">
              <AlertCircle className="mx-auto mb-2 h-6 w-6 text-slate-300" />
              No patients on ventilator
            </div>
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
                      isSelected ? 'border-blue-500 bg-blue-50' : 'border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <div className="font-medium text-slate-800 flex items-center gap-2">
                      <User className="h-4 w-4" />
                      {name}
                    </div>
                    <div className="mt-1 text-xs text-slate-500">
                      Bed: {adm.bedId?.name || 'Unassigned'}
                    </div>
                  </button>
                )
              })}
            </div>
          )}
        </div>

        {/* Ventilator Panel */}
        <div className="lg:col-span-3 space-y-4">
          {/* Current Settings Card */}
          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-blue-100 p-2">
                  <Wind className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <h3 className="font-medium text-slate-800">{patientName}</h3>
                  {selectedAdmission && (
                    <p className="text-sm text-slate-500">
                      Bed: {selectedAdmission.bedId?.name || 'Unassigned'}
                    </p>
                  )}
                </div>
              </div>
              {selectedAdmission && (
                <button
                  onClick={() => { setEditingSetting(null); setShowModal(true) }}
                  className="inline-flex items-center gap-2 rounded-md bg-blue-600 px-3 py-2 text-sm text-white hover:bg-blue-700"
                >
                  <Plus className="h-4 w-4" />
                  New Settings
                </button>
              )}
            </div>

            {!selectedAdmission ? (
              <div className="py-8 text-center text-slate-500">
                <Settings className="mx-auto mb-3 h-10 w-10 text-slate-300" />
                Select a patient to view/configure ventilator settings
              </div>
            ) : currentSetting ? (
              <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                <ParamCard label="Mode" value={currentSetting.ventilator?.mode?.toUpperCase() || '-'} color="blue" />
                <ParamCard label="FiO2" value={`${currentSetting.ventilator?.fio2 || 0}%`} color="orange" />
                <ParamCard label="PEEP" value={`${currentSetting.ventilator?.peep || 0} cmH2O`} color="green" />
                <ParamCard label="Rate" value={`${currentSetting.ventilator?.rate || 0} /min`} color="purple" />
                {currentSetting.ventilator?.tidalVolume && (
                  <ParamCard label="Tidal Vol" value={`${currentSetting.ventilator.tidalVolume} mL`} color="slate" />
                )}
                {currentSetting.ventilator?.pressureSupport && (
                  <ParamCard label="PS" value={`${currentSetting.ventilator.pressureSupport} cmH2O`} color="slate" />
                )}
                {currentSetting.ventilator?.pip && (
                  <ParamCard label="PIP" value={`${currentSetting.ventilator.pip} cmH2O`} color="slate" />
                )}
                {currentSetting.ventilator?.plateauPressure && (
                  <ParamCard label="Pplat" value={`${currentSetting.ventilator.plateauPressure} cmH2O`} color="slate" />
                )}
              </div>
            ) : (
              <div className="py-6 text-center text-slate-500">
                <Activity className="mx-auto mb-3 h-10 w-10 text-slate-300" />
                No ventilator settings recorded
                <p className="mt-2 text-sm">Click "New Settings" to configure ventilator</p>
              </div>
            )}
          </div>

          {/* Settings History */}
          {selectedAdmission && settings.length > 0 && (
            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <h4 className="mb-3 flex items-center gap-2 font-medium text-slate-700">
                <Clock className="h-4 w-4" />
                Settings History
              </h4>
              <div className="space-y-2 max-h-64 overflow-auto">
                {settings.map((setting) => (
                  <div key={setting._id} className="flex items-center justify-between rounded-lg border border-slate-100 p-3 hover:bg-slate-50">
                    <div className="grid grid-cols-5 gap-4 text-sm">
                      <div>
                        <span className="text-xs text-slate-500">Mode</span>
                        <div className="font-medium">{setting.ventilator?.mode?.toUpperCase() || '-'}</div>
                      </div>
                      <div>
                        <span className="text-xs text-slate-500">FiO2</span>
                        <div className="font-medium">{setting.ventilator?.fio2 || 0}%</div>
                      </div>
                      <div>
                        <span className="text-xs text-slate-500">PEEP</span>
                        <div className="font-medium">{setting.ventilator?.peep || 0}</div>
                      </div>
                      <div>
                        <span className="text-xs text-slate-500">Rate</span>
                        <div className="font-medium">{setting.ventilator?.rate || 0}</div>
                      </div>
                      <div>
                        <span className="text-xs text-slate-500">Time</span>
                        <div className="font-medium">{new Date(setting.recordedAt).toLocaleString()}</div>
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <button onClick={() => { setEditingSetting(setting); setShowModal(true) }} className="rounded p-1 text-slate-600 hover:bg-slate-100">
                        <Edit2 className="h-4 w-4" />
                      </button>
                      <button onClick={() => handleDelete(setting._id)} className="rounded p-1 text-red-600 hover:bg-red-50">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {showModal && selectedAdmission && (
        <VentilatorModal
          encounterId={selectedAdmission.encounterId?._id || selectedAdmission.encounterId}
          existingSetting={editingSetting}
          onClose={() => setShowModal(false)}
          onSaved={() => {
            setShowModal(false)
            loadSettings(selectedAdmission.encounterId?._id || selectedAdmission.encounterId)
          }}
        />
      )}
    </div>
  )
}

function ParamCard({ label, value, color }: { label: string; value: string; color: string }) {
  const colorMap: Record<string, string> = {
    blue: 'bg-blue-50 border-blue-200',
    orange: 'bg-orange-50 border-orange-200',
    green: 'bg-green-50 border-green-200',
    purple: 'bg-purple-50 border-purple-200',
    slate: 'bg-slate-50 border-slate-200',
  }
  const textMap: Record<string, string> = {
    blue: 'text-blue-700',
    orange: 'text-orange-700',
    green: 'text-green-700',
    purple: 'text-purple-700',
    slate: 'text-slate-700',
  }
  return (
    <div className={`rounded-lg border p-3 ${colorMap[color]}`}>
      <div className={`text-xs ${textMap[color]}`}>{label}</div>
      <div className={`text-lg font-bold ${textMap[color]}`}>{value}</div>
    </div>
  )
}

function VentilatorModal({ encounterId, existingSetting, onClose, onSaved }: { encounterId: string; existingSetting?: any; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState(() => {
    if (existingSetting?.ventilator) return existingSetting.ventilator
    return {
      mode: 'ac',
      fio2: 40,
      peep: 5,
      rate: 12,
      tidalVolume: 500,
      pressureSupport: 10,
      flowRate: 60,
      ieRatio: '1:2',
      pip: 20,
      plateauPressure: 18,
      minuteVolume: 6,
      notes: '',
    }
  })
  const [saving, setSaving] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    try {
      const data = {
        recordedAt: existingSetting?.recordedAt || new Date().toISOString(),
        ventilator: form,
        recordedBy: '',
      }
      if (existingSetting) {
        await hospitalApi.updateICUFlowsheetEntry(existingSetting._id, data)
      } else {
        await hospitalApi.createICUFlowsheetEntry(encounterId, data)
      }
      onSaved()
    } catch {}
    setSaving(false)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-3xl max-h-[90vh] overflow-auto rounded-xl bg-white p-6 shadow-xl">
        <div className="mb-4 flex items-center gap-3">
          <div className="rounded-lg bg-blue-100 p-2">
            <Wind className="h-5 w-5 text-blue-600" />
          </div>
          <h2 className="text-lg font-semibold">
            {existingSetting ? 'Edit' : 'New'} Ventilator Settings
          </h2>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
            <div>
              <label className="block text-sm font-medium text-slate-700">Mode</label>
              <select
                value={form.mode}
                onChange={(e) => setForm({ ...form, mode: e.target.value })}
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              >
                {VENTILATOR_MODES.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700">FiO2 (%)</label>
              <input
                type="number" min="21" max="100"
                value={form.fio2}
                onChange={(e) => setForm({ ...form, fio2: Number(e.target.value) })}
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700">PEEP (cmH2O)</label>
              <input
                type="number" min="0" max="25"
                value={form.peep}
                onChange={(e) => setForm({ ...form, peep: Number(e.target.value) })}
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700">Rate (/min)</label>
              <input
                type="number" min="4" max="40"
                value={form.rate}
                onChange={(e) => setForm({ ...form, rate: Number(e.target.value) })}
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700">Tidal Volume (mL)</label>
              <input
                type="number" min="200" max="1000"
                value={form.tidalVolume}
                onChange={(e) => setForm({ ...form, tidalVolume: Number(e.target.value) })}
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700">Pressure Support (cmH2O)</label>
              <input
                type="number" min="0" max="30"
                value={form.pressureSupport}
                onChange={(e) => setForm({ ...form, pressureSupport: Number(e.target.value) })}
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700">Flow Rate (L/min)</label>
              <input
                type="number" min="20" max="100"
                value={form.flowRate}
                onChange={(e) => setForm({ ...form, flowRate: Number(e.target.value) })}
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700">I:E Ratio</label>
              <select
                value={form.ieRatio}
                onChange={(e) => setForm({ ...form, ieRatio: e.target.value })}
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              >
                <option value="1:1">1:1</option>
                <option value="1:1.5">1:1.5</option>
                <option value="1:2">1:2</option>
                <option value="1:2.5">1:2.5</option>
                <option value="1:3">1:3</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700">PIP (cmH2O)</label>
              <input
                type="number" min="10" max="60"
                value={form.pip}
                onChange={(e) => setForm({ ...form, pip: Number(e.target.value) })}
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700">Plateau Pressure</label>
              <input
                type="number" min="5" max="50"
                value={form.plateauPressure}
                onChange={(e) => setForm({ ...form, plateauPressure: Number(e.target.value) })}
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700">Minute Volume (L/min)</label>
              <input
                type="number" step="0.1" min="2" max="30"
                value={form.minuteVolume}
                onChange={(e) => setForm({ ...form, minuteVolume: Number(e.target.value) })}
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700">Notes</label>
            <textarea
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              rows={2}
            />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="rounded-md border border-slate-300 px-4 py-2 text-sm">
              Cancel
            </button>
            <button type="submit" disabled={saving} className="rounded-md bg-blue-600 px-4 py-2 text-sm text-white">
              {saving ? 'Saving...' : existingSetting ? 'Update' : 'Save Settings'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
