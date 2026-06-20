import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { hospitalApi } from '../../../utils/api'
import { ArrowLeft, Brain, Calculator, Plus, Activity, Heart, Droplets, User, Edit2, Trash2, History, Wind } from 'lucide-react'

type ScoreType = 'gcs' | 'apache' | 'sofa'

export default function ICU_Scoring() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const [admissions, setAdmissions] = useState<any[]>([])
  const [selectedAdmission, setSelectedAdmission] = useState<any>(null)
  const [scores, setScores] = useState<any[]>([])
  const [activeTab, setActiveTab] = useState<ScoreType>('gcs')
  const [showModal, setShowModal] = useState(false)
  const [editingScore, setEditingScore] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  const admissionId = searchParams.get('admission')

  useEffect(() => {
    loadAdmissions()
  }, [])

  useEffect(() => {
    if (admissionId) {
      const adm = admissions.find(a => a._id === admissionId)
      if (adm) {
        setSelectedAdmission(adm)
        const encId = adm.encounterId?._id || adm.encounterId
        if (encId) loadScores(String(encId))
      }
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

  async function loadScores(encounterId: string) {
    try {
      const res = await hospitalApi.listICUScores(encounterId, { limit: 50 }) as any
      setScores(res?.scores || [])
    } catch {}
  }

  function selectAdmission(adm: any) {
    setSelectedAdmission(adm)
    setSearchParams({ admission: adm._id })
  }

  async function handleDeleteScore(id: string) {
    if (!confirm('Delete this score?')) return
    try {
      await hospitalApi.deleteICUScore(id)
      const encId = selectedAdmission?.encounterId?._id || selectedAdmission?.encounterId
      if (encId) {
        loadScores(String(encId))
      }
    } catch {}
  }

  const patientName = selectedAdmission?.patientId
    ? String(selectedAdmission.patientId.fullName || selectedAdmission.patientId.name || 'Unknown')
    : 'Select Patient'

  const filteredScores = scores.filter(s => s.type === activeTab)

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <button onClick={() => navigate('/hospital/icu')} className="text-slate-600 hover:text-slate-800">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h1 className="text-xl font-semibold text-slate-800">ICU Scoring</h1>
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
                  ? String(adm.patientId.fullName || adm.patientId.name || 'Unknown')
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

        {/* Scoring Panel */}
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
                onClick={() => { setEditingScore(null); setShowModal(true) }}
                className="inline-flex items-center gap-2 rounded-md bg-rose-600 px-3 py-2 text-sm text-white hover:bg-rose-700"
              >
                <Plus className="h-4 w-4" />
                Calculate Score
              </button>
            )}
          </div>

          {/* Tab Navigation */}
          <div className="mb-4 flex gap-2 border-b border-slate-200">
            {[
              { key: 'gcs' as const, label: 'GCS', icon: Brain },
              { key: 'apache' as const, label: 'APACHE II', icon: Activity },
              { key: 'sofa' as const, label: 'SOFA', icon: Heart },
            ].map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                onClick={() => setActiveTab(key)}
                className={`flex items-center gap-2 border-b-2 px-4 py-2 text-sm font-medium transition-colors ${
                  activeTab === key
                    ? 'border-rose-500 text-rose-600'
                    : 'border-transparent text-slate-500 hover:text-slate-700'
                }`}
              >
                <Icon className="h-4 w-4" />
                {label}
              </button>
            ))}
          </div>

          {!selectedAdmission ? (
            <div className="py-12 text-center text-slate-500">
              <Calculator className="mx-auto mb-3 h-10 w-10 text-slate-300" />
              Select a patient to calculate severity scores
            </div>
          ) : filteredScores.length === 0 ? (
            <div className="py-12 text-center text-slate-500">
              <History className="mx-auto mb-3 h-10 w-10 text-slate-300" />
              No {activeTab.toUpperCase()} scores recorded yet
              <p className="mt-2 text-sm">
                Click "Calculate Score" to add a new {activeTab.toUpperCase()} assessment
              </p>
            </div>
          ) : (
            <div className="space-y-3 max-h-96 overflow-auto">
              {filteredScores.map((score) => (
                <ScoreCard key={score._id} score={score} type={activeTab} onEdit={() => { setEditingScore(score); setShowModal(true) }} onDelete={() => handleDeleteScore(score._id)} />
              ))}
            </div>
          )}
        </div>
      </div>

      {showModal && selectedAdmission && (
        <ScoreModal
          encounterId={selectedAdmission.encounterId?._id || selectedAdmission.encounterId}
          type={activeTab}
          existingScore={editingScore}
          onClose={() => setShowModal(false)}
          onSaved={() => {
            setShowModal(false)
            const encId = selectedAdmission.encounterId?._id || selectedAdmission.encounterId
            if (encId) loadScores(String(encId))
          }}
        />
      )}
    </div>
  )
}

function ScoreCard({ score, type, onEdit, onDelete }: { score: any; type: string; onEdit: () => void; onDelete: () => void }) {
  const getScoreColor = (value: number, max: number) => {
    const pct = value / max
    if (pct <= 0.3) return 'text-green-600 bg-green-50'
    if (pct <= 0.6) return 'text-yellow-600 bg-yellow-50'
    return 'text-red-600 bg-red-50'
  }

  return (
    <div className="rounded-lg border border-slate-200 p-4">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          <div className={`rounded-lg px-4 py-2 text-2xl font-bold ${
            type === 'gcs' ? getScoreColor(score.score, 15) :
            type === 'apache' ? getScoreColor(score.score, 71) :
            getScoreColor(score.score, 24)
          }`}>
            {score.score}
          </div>
          <div>
            <div className="font-medium text-slate-800">
              {type === 'gcs' ? 'Glasgow Coma Scale' :
               type === 'apache' ? 'APACHE II Score' :
               'SOFA Score'}
            </div>
            <div className="text-sm text-slate-500">
              {new Date(score.recordedAt).toLocaleString()}
            </div>
          </div>
        </div>
        <div className="flex gap-1">
          <button onClick={onEdit} className="rounded p-1 text-slate-600 hover:bg-slate-100">
            <Edit2 className="h-4 w-4" />
          </button>
          <button onClick={onDelete} className="rounded p-1 text-red-600 hover:bg-red-50">
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>
      {score.details && (
        <div className="mt-3 grid grid-cols-2 gap-2 text-sm md:grid-cols-4">
          {type === 'gcs' && score.details.eye !== undefined && (
            <div><span className="text-slate-600">Eye:</span> <span className="font-medium">{score.details.eye}</span></div>
          )}
          {type === 'gcs' && score.details.verbal !== undefined && (
            <div><span className="text-slate-600">Verbal:</span> <span className="font-medium">{score.details.verbal}</span></div>
          )}
          {type === 'gcs' && score.details.motor !== undefined && (
            <div><span className="text-slate-600">Motor:</span> <span className="font-medium">{score.details.motor}</span></div>
          )}
          {type === 'apache' && score.details.agePoints !== undefined && (
            <div><span className="text-slate-600">Age:</span> <span className="font-medium">+{score.details.agePoints}</span></div>
          )}
          {type === 'sofa' && score.details.respiratory !== undefined && (
            <div><span className="text-slate-600">Resp:</span> <span className="font-medium">{score.details.respiratory}</span></div>
          )}
          {type === 'sofa' && score.details.coagulation !== undefined && (
            <div><span className="text-slate-600">Coag:</span> <span className="font-medium">{score.details.coagulation}</span></div>
          )}
          {type === 'sofa' && score.details.liver !== undefined && (
            <div><span className="text-slate-600">Liver:</span> <span className="font-medium">{score.details.liver}</span></div>
          )}
          {type === 'sofa' && score.details.cardiovascular !== undefined && (
            <div><span className="text-slate-600">CV:</span> <span className="font-medium">{score.details.cardiovascular}</span></div>
          )}
          {type === 'sofa' && score.details.cns !== undefined && (
            <div><span className="text-slate-600">CNS:</span> <span className="font-medium">{score.details.cns}</span></div>
          )}
          {type === 'sofa' && score.details.renal !== undefined && (
            <div><span className="text-slate-600">Renal:</span> <span className="font-medium">{score.details.renal}</span></div>
          )}
        </div>
      )}
    </div>
  )
}

function ScoreModal({ encounterId, type, existingScore, onClose, onSaved }: { encounterId: string; type: ScoreType; existingScore?: any; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState(() => {
    if (existingScore) return existingScore.details || {}
    if (type === 'gcs') return { eye: 4, verbal: 5, motor: 6 }
    if (type === 'apache') return {
      temp: 37, map: 70, hr: 80, rr: 16, oxygenation: 200, ph: 7.4,
      sodium: 140, potassium: 4, creatinine: 1, hematocrit: 45, wbc: 10,
      gcs: 15, age: 40, chronicHealth: 0
    }
    return {
      respiratory: 0, coagulation: 0, liver: 0, cardiovascular: 0, cns: 0, renal: 0
    }
  })
  const [calculatedScore, setCalculatedScore] = useState(existingScore?.score || 0)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    calculateScore()
  }, [form, type])

  function calculateScore() {
    if (type === 'gcs') {
      setCalculatedScore((form.eye || 0) + (form.verbal || 0) + (form.motor || 0))
    } else if (type === 'apache') {
      let score = 0
      // Temperature (C)
      if (form.temp >= 41) score += 4
      else if (form.temp >= 39) score += 3
      else if (form.temp >= 38.5) score += 2
      else if (form.temp >= 36) score += 1
      else if (form.temp >= 34) score += 1
      else if (form.temp >= 32) score += 2
      else if (form.temp >= 30) score += 3
      else score += 4
      // Mean arterial pressure
      if (form.map >= 160) score += 4
      else if (form.map >= 130) score += 3
      else if (form.map >= 110) score += 2
      else if (form.map >= 70) score += 0
      else if (form.map >= 50) score += 2
      else score += 4
      // Heart rate
      if (form.hr >= 180) score += 4
      else if (form.hr >= 140) score += 3
      else if (form.hr >= 110) score += 2
      else if (form.hr >= 70) score += 0
      else if (form.hr >= 55) score += 2
      else score += 4
      // Respiratory rate
      if (form.rr >= 50) score += 4
      else if (form.rr >= 35) score += 3
      else if (form.rr >= 25) score += 2
      else if (form.rr >= 12) score += 0
      else if (form.rr >= 10) score += 1
      else score += 4
      // GCS (inverted)
      score += (15 - (form.gcs || 15))
      // Age
      if (form.age >= 75) score += 6
      else if (form.age >= 65) score += 5
      else if (form.age >= 55) score += 3
      else if (form.age >= 45) score += 2
      // Chronic health
      score += (form.chronicHealth || 0)
      setCalculatedScore(score)
    } else if (type === 'sofa') {
      setCalculatedScore(
        (form.respiratory || 0) +
        (form.coagulation || 0) +
        (form.liver || 0) +
        (form.cardiovascular || 0) +
        (form.cns || 0) +
        (form.renal || 0)
      )
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    try {
      const data = {
        type,
        score: calculatedScore,
        details: form,
        recordedAt: existingScore?.recordedAt || new Date().toISOString(),
      }
      if (existingScore) {
        await hospitalApi.updateICUScore(existingScore._id, data)
      } else {
        await hospitalApi.createICUScore(encounterId, data)
      }
      onSaved()
    } catch {}
    setSaving(false)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-2xl max-h-[90vh] overflow-auto rounded-xl bg-white p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">
            {existingScore ? 'Edit' : 'Calculate'} {type === 'gcs' ? 'GCS' : type === 'apache' ? 'APACHE II' : 'SOFA'}
          </h2>
          <div className="rounded-lg bg-slate-100 px-4 py-2">
            <span className="text-sm text-slate-600">Total Score: </span>
            <span className="text-xl font-bold text-rose-600">{calculatedScore}</span>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {type === 'gcs' && (
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700">Eye Opening</label>
                <select
                  value={form.eye}
                  onChange={(e) => setForm({ ...form, eye: Number(e.target.value) })}
                  className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                >
                  <option value={4}>4 - Spontaneous</option>
                  <option value={3}>3 - To Speech</option>
                  <option value={2}>2 - To Pain</option>
                  <option value={1}>1 - None</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700">Verbal Response</label>
                <select
                  value={form.verbal}
                  onChange={(e) => setForm({ ...form, verbal: Number(e.target.value) })}
                  className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                >
                  <option value={5}>5 - Oriented</option>
                  <option value={4}>4 - Confused</option>
                  <option value={3}>3 - Inappropriate</option>
                  <option value={2}>2 - Sounds</option>
                  <option value={1}>1 - None</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700">Motor Response</label>
                <select
                  value={form.motor}
                  onChange={(e) => setForm({ ...form, motor: Number(e.target.value) })}
                  className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
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
          )}

          {type === 'apache' && (
            <div className="space-y-4">
              <div className="rounded-lg border border-slate-200 p-3">
                <h4 className="mb-2 text-sm font-medium text-slate-700">Physiologic Variables</h4>
                <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
                  <div>
                    <label className="block text-xs text-slate-600">Temperature (C)</label>
                    <input type="number" step="0.1" value={form.temp} onChange={(e) => setForm({ ...form, temp: Number(e.target.value) })} className="mt-1 w-full rounded-md border border-slate-300 px-2 py-1 text-sm" />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-600">Mean BP (mmHg)</label>
                    <input type="number" value={form.map} onChange={(e) => setForm({ ...form, map: Number(e.target.value) })} className="mt-1 w-full rounded-md border border-slate-300 px-2 py-1 text-sm" />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-600">Heart Rate</label>
                    <input type="number" value={form.hr} onChange={(e) => setForm({ ...form, hr: Number(e.target.value) })} className="mt-1 w-full rounded-md border border-slate-300 px-2 py-1 text-sm" />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-600">Respiratory Rate</label>
                    <input type="number" value={form.rr} onChange={(e) => setForm({ ...form, rr: Number(e.target.value) })} className="mt-1 w-full rounded-md border border-slate-300 px-2 py-1 text-sm" />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-600">PaO2/FiO2</label>
                    <input type="number" value={form.oxygenation} onChange={(e) => setForm({ ...form, oxygenation: Number(e.target.value) })} className="mt-1 w-full rounded-md border border-slate-300 px-2 py-1 text-sm" />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-600">pH</label>
                    <input type="number" step="0.01" value={form.ph} onChange={(e) => setForm({ ...form, ph: Number(e.target.value) })} className="mt-1 w-full rounded-md border border-slate-300 px-2 py-1 text-sm" />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-600">Sodium (mEq/L)</label>
                    <input type="number" value={form.sodium} onChange={(e) => setForm({ ...form, sodium: Number(e.target.value) })} className="mt-1 w-full rounded-md border border-slate-300 px-2 py-1 text-sm" />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-600">Potassium (mEq/L)</label>
                    <input type="number" step="0.1" value={form.potassium} onChange={(e) => setForm({ ...form, potassium: Number(e.target.value) })} className="mt-1 w-full rounded-md border border-slate-300 px-2 py-1 text-sm" />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-600">Creatinine (mg/dL)</label>
                    <input type="number" step="0.1" value={form.creatinine} onChange={(e) => setForm({ ...form, creatinine: Number(e.target.value) })} className="mt-1 w-full rounded-md border border-slate-300 px-2 py-1 text-sm" />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-600">Hematocrit (%)</label>
                    <input type="number" value={form.hematocrit} onChange={(e) => setForm({ ...form, hematocrit: Number(e.target.value) })} className="mt-1 w-full rounded-md border border-slate-300 px-2 py-1 text-sm" />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-600">WBC (x1000/uL)</label>
                    <input type="number" step="0.1" value={form.wbc} onChange={(e) => setForm({ ...form, wbc: Number(e.target.value) })} className="mt-1 w-full rounded-md border border-slate-300 px-2 py-1 text-sm" />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-600">GCS Total</label>
                    <input type="number" min="3" max="15" value={form.gcs} onChange={(e) => setForm({ ...form, gcs: Number(e.target.value) })} className="mt-1 w-full rounded-md border border-slate-300 px-2 py-1 text-sm" />
                  </div>
                </div>
              </div>
              <div className="rounded-lg border border-slate-200 p-3">
                <h4 className="mb-2 text-sm font-medium text-slate-700">Age & Chronic Health</h4>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-slate-600">Age (years)</label>
                    <input type="number" value={form.age} onChange={(e) => setForm({ ...form, age: Number(e.target.value) })} className="mt-1 w-full rounded-md border border-slate-300 px-2 py-1 text-sm" />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-600">Chronic Health Points</label>
                    <select value={form.chronicHealth} onChange={(e) => setForm({ ...form, chronicHealth: Number(e.target.value) })} className="mt-1 w-full rounded-md border border-slate-300 px-2 py-1 text-sm">
                      <option value={0}>None (0 pts)</option>
                      <option value={2}>Non-op (2 pts)</option>
                      <option value={5}>Emergency (5 pts)</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>
          )}

          {type === 'sofa' && (
            <div className="space-y-4">
              <div className="rounded-lg border border-slate-200 p-3">
                <h4 className="mb-2 text-sm font-medium text-slate-700">Organ System Scores (0-4 each)</h4>
                <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
                  {[
                    { key: 'respiratory', label: 'Respiratory', icon: Droplets },
                    { key: 'coagulation', label: 'Coagulation', icon: Droplets },
                    { key: 'liver', label: 'Liver', icon: Activity },
                    { key: 'cardiovascular', label: 'Cardiovascular', icon: Heart },
                    { key: 'cns', label: 'CNS (GCS)', icon: Brain },
                    { key: 'renal', label: 'Renal', icon: Droplets },
                  ].map(({ key, label, icon: Icon }) => (
                    <div key={key}>
                      <label className="flex items-center gap-1.5 text-xs text-slate-600">
                        <Icon className="h-3.5 w-3.5" />
                        {label}
                      </label>
                      <select
                        value={form[key] || 0}
                        onChange={(e) => setForm({ ...form, [key]: Number(e.target.value) })}
                        className="mt-1 w-full rounded-md border border-slate-300 px-2 py-1 text-sm"
                      >
                        <option value={0}>0 - Normal</option>
                        <option value={1}>1</option>
                        <option value={2}>2</option>
                        <option value={3}>3</option>
                        <option value={4}>4 - Severe</option>
                      </select>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="rounded-md border border-slate-300 px-4 py-2 text-sm">
              Cancel
            </button>
            <button type="submit" disabled={saving} className="rounded-md bg-rose-600 px-4 py-2 text-sm text-white">
              {saving ? 'Saving...' : existingScore ? 'Update' : 'Save Score'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
