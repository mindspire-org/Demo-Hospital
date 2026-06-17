import { useEffect, useState } from 'react'
import { ipdApi } from '../../features/hospital/ipd'
import { Plus, Activity } from 'lucide-react'

type FlowsheetEntry = {
  _id: string
  recordedAt: string
  bp?: { systolic?: number; diastolic?: number }
  hr?: number
  rr?: number
  temp?: number
  spo2?: number
  gcs?: { eye?: number; verbal?: number; motor?: number; total?: number }
  painScore?: number
  intake?: { oral?: number; iv?: number; ng?: number; total?: number }
  output?: { urine?: number; drain?: number; emesis?: number; total?: number }
  ventilator?: { mode?: string; fio2?: number; peep?: number; tidalVolume?: number; rate?: number }
  notes?: string
  recordedBy?: string
  shift?: string
}

type ScoreEntry = {
  _id: string
  type: 'gcs' | 'apache' | 'sofa'
  recordedAt: string
  score: number
  details?: any
  calculatedBy?: string
}

export default function Hospital_IpdICUMonitoring({ encounterId }: { encounterId: string }) {
  const [loading, setLoading] = useState(true)
  const [flowsheet, setFlowsheet] = useState<FlowsheetEntry[]>([])
  const [scores, setScores] = useState<ScoreEntry[]>([])
  const [showModal, setShowModal] = useState(false)

  useEffect(() => { load() }, [encounterId])

  async function load() {
    setLoading(true)
    try {
      const [flowsheetRes, scoresRes] = await Promise.all([
        ipdApi.listIpdIcuMonitoring(encounterId, { limit: 50 }) as any,
        ipdApi.listIpdIcuMonitoring(encounterId, { limit: 50 }) as any,
      ])
      const icuRecords = flowsheetRes?.icuMonitoringRecords || []
      setFlowsheet(icuRecords.map((r: any) => {
        // Parse BP from string format "120/80" if stored as string
        let bpSystolic, bpDiastolic
        if (r.vitals?.bp) {
          if (typeof r.vitals.bp === 'string') {
            const [sys, dia] = r.vitals.bp.split('/').map(Number)
            bpSystolic = sys
            bpDiastolic = dia
          } else if (typeof r.vitals.bp === 'object') {
            bpSystolic = r.vitals.bp.systolic
            bpDiastolic = r.vitals.bp.diastolic
          }
        }
        
        return {
          _id: String(r._id),
          recordedAt: r.recordedAt || r.createdAt,
          bp: bpSystolic && bpDiastolic ? { systolic: bpSystolic, diastolic: bpDiastolic } : undefined,
          hr: r.vitals?.hr,
          rr: r.vitals?.rr,
          temp: r.vitals?.temp,
          spo2: r.vitals?.spo2,
          gcs: r.neurological?.gcs ? {
            eye: r.neurological.gcs.eye,
            verbal: r.neurological.gcs.verbal,
            motor: r.neurological.gcs.motor,
            total: r.neurological.gcs.total
          } : undefined,
          painScore: r.scores?.nrs,
          apacheScore: r.scores?.apacheII,
          sofaScore: r.scores?.sofa,
          lines: r.lines,
          tubes: r.tubes,
          drains: r.drains,
          wounds: r.wounds,
          intake: r.fluidBalance?.intake ? { total: r.fluidBalance.intake.total } : undefined,
          output: r.fluidBalance?.output ? { total: r.fluidBalance.output.total } : undefined,
          ventilator: r.ventilator?.mode ? {
            mode: r.ventilator.mode,
            fio2: r.ventilator.fio2,
            peep: r.ventilator.peep,
            tidalVolume: r.ventilator.tidalVolume,
            rate: r.ventilator.respiratoryRate,
          } : undefined,
          notes: r.notes,
          recordedBy: r.recordedBy,
          shift: r.shift,
        }
      }))
      setScores(scoresRes?.scores || [])
    } catch {}
    setLoading(false)
  }

  const formatTime = (s: string) => {
    const d = new Date(s)
    return d.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true })
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Activity className="h-5 w-5 text-rose-600" />
          <span className="font-semibold text-slate-700">ICU Monitoring</span>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="inline-flex items-center gap-1 rounded-md bg-rose-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-rose-700"
        >
          <Plus className="h-4 w-4" />
          Add Entry
        </button>
      </div>

      {loading ? (
        <div className="py-8 text-center text-slate-500">Loading...</div>
      ) : (
        <div className="space-y-3">
          {[...flowsheet, ...scores.map(s => ({ ...s, isScore: true }))]
            .sort((a: any, b: any) => new Date(b.recordedAt).getTime() - new Date(a.recordedAt).getTime())
            .map((entry: any) => (
            <div key={entry._id} className="rounded-lg border border-slate-200 bg-white p-5">
              {/* Time Header */}
              <div className="mb-4 pb-3 border-b border-slate-100">
                <span className="font-bold text-base text-slate-800">{formatTime(entry.recordedAt)}</span>
                {entry.recordedBy && <span className="ml-2 text-sm text-slate-400">by {entry.recordedBy}</span>}
              </div>

              {/* Vital Signs */}
              {(entry.bp || entry.hr || entry.rr || entry.temp || entry.spo2) && (
                <div className="mb-4">
                  <h4 className="text-sm font-bold text-slate-700 uppercase mb-2">Vital Signs</h4>
                  <div className="flex flex-wrap gap-x-6 gap-y-2 text-base">
                    {entry.bp && <span><span className="font-bold text-slate-600">BP:</span> <span className="text-slate-800">{entry.bp.systolic}/{entry.bp.diastolic}</span></span>}
                    {entry.hr && <span><span className="font-bold text-slate-600">HR:</span> <span className="text-slate-800">{entry.hr}</span></span>}
                    {entry.rr && <span><span className="font-bold text-slate-600">RR:</span> <span className="text-slate-800">{entry.rr}</span></span>}
                    {entry.temp && <span><span className="font-bold text-slate-600">Temp:</span> <span className="text-slate-800">{entry.temp}°C</span></span>}
                    {entry.spo2 && <span><span className="font-bold text-slate-600">SpO2:</span> <span className="text-slate-800">{entry.spo2}%</span></span>}
                  </div>
                </div>
              )}

              {/* GCS */}
              {entry.gcs?.total && (
                <div className="mb-4">
                  <h4 className="text-sm font-bold text-slate-700 uppercase mb-2">Glasgow Coma Scale</h4>
                  <div className="text-base">
                    <span className="text-slate-800">{entry.gcs.total}</span>
                    <span className="text-slate-500 ml-2">(E{entry.gcs.eye}V{entry.gcs.verbal}M{entry.gcs.motor})</span>
                  </div>
                </div>
              )}

              {/* Clinical Scores */}
              {(entry.apacheScore || entry.sofaScore || entry.painScore !== undefined) && (
                <div className="mb-4">
                  <h4 className="text-sm font-bold text-slate-700 uppercase mb-2">Clinical Scores</h4>
                  <div className="flex flex-wrap gap-x-6 gap-y-2 text-base">
                    {entry.apacheScore && <span><span className="font-bold text-slate-600">APACHE II:</span> <span className="text-slate-800">{entry.apacheScore}</span></span>}
                    {entry.sofaScore && <span><span className="font-bold text-slate-600">SOFA:</span> <span className="text-slate-800">{entry.sofaScore}</span></span>}
                    {entry.painScore !== undefined && <span><span className="font-bold text-slate-600">Pain:</span> <span className="text-slate-800">{entry.painScore}</span></span>}
                  </div>
                </div>
              )}

              {/* Intake/Output */}
              {(entry.intake?.total || entry.output?.total) && (
                <div className="mb-4">
                  <h4 className="text-sm font-bold text-slate-700 uppercase mb-2">Intake / Output</h4>
                  <div className="flex flex-wrap gap-x-6 gap-y-2 text-base">
                    {entry.intake?.total !== undefined && <span><span className="font-bold text-slate-600">Intake:</span> <span className="text-slate-800">{entry.intake.total}ml</span></span>}
                    {entry.output?.total !== undefined && <span><span className="font-bold text-slate-600">Output:</span> <span className="text-slate-800">{entry.output.total}ml</span></span>}
                  </div>
                </div>
              )}

              {/* Ventilator */}
              {entry.ventilator?.mode && (
                <div className="mb-4">
                  <h4 className="text-sm font-bold text-slate-700 uppercase mb-2">Ventilator Settings</h4>
                  <div className="flex flex-wrap gap-x-6 gap-y-2 text-base">
                    <span><span className="font-bold text-slate-600">Mode:</span> <span className="text-slate-800">{entry.ventilator.mode.toUpperCase()}</span></span>
                    {entry.ventilator.fio2 && <span><span className="font-bold text-slate-600">FiO2:</span> <span className="text-slate-800">{entry.ventilator.fio2}%</span></span>}
                    {entry.ventilator.peep && <span><span className="font-bold text-slate-600">PEEP:</span> <span className="text-slate-800">{entry.ventilator.peep}</span></span>}
                    {entry.ventilator.tidalVolume && <span><span className="font-bold text-slate-600">Vt:</span> <span className="text-slate-800">{entry.ventilator.tidalVolume}ml</span></span>}
                    {entry.ventilator.rate && <span><span className="font-bold text-slate-600">Rate:</span> <span className="text-slate-800">{entry.ventilator.rate}</span></span>}
                  </div>
                </div>
              )}

              {/* Lines */}
              {entry.lines && entry.lines.length > 0 && (
                <div className="mb-4">
                  <h4 className="text-sm font-bold text-slate-700 uppercase mb-2">Lines ({entry.lines.length})</h4>
                  <div className="text-base space-y-1">
                    {entry.lines.map((line: any, i: number) => (
                      <div key={i} className="flex gap-2 text-slate-800">
                        <span>{line.type}</span>
                        {line.site && <span className="text-slate-500">| {line.site}</span>}
                        {line.condition && <span className="text-slate-500">| {line.condition}</span>}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Tubes */}
              {entry.tubes && entry.tubes.length > 0 && (
                <div className="mb-4">
                  <h4 className="text-sm font-bold text-slate-700 uppercase mb-2">Tubes ({entry.tubes.length})</h4>
                  <div className="text-base space-y-1">
                    {entry.tubes.map((tube: any, i: number) => (
                      <div key={i} className="flex gap-2 text-slate-800">
                        <span>{tube.type}</span>
                        {tube.site && <span className="text-slate-500">| {tube.site}</span>}
                        {tube.size && <span className="text-slate-500">| {tube.size}</span>}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Drains */}
              {entry.drains && entry.drains.length > 0 && (
                <div className="mb-4">
                  <h4 className="text-sm font-bold text-slate-700 uppercase mb-2">Drains ({entry.drains.length})</h4>
                  <div className="text-base space-y-1">
                    {entry.drains.map((drain: any, i: number) => (
                      <div key={i} className="flex gap-2 text-slate-800">
                        <span>{drain.location || drain.type}</span>
                        {drain.output !== undefined && <span className="text-slate-500">| {drain.output}ml</span>}
                        {drain.color && <span className="text-slate-500">| {drain.color}</span>}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Wounds */}
              {entry.wounds && entry.wounds.length > 0 && (
                <div className="mb-4">
                  <h4 className="text-sm font-bold text-slate-700 uppercase mb-2">Wounds ({entry.wounds.length})</h4>
                  <div className="text-base space-y-1">
                    {entry.wounds.map((wound: any, i: number) => (
                      <div key={i} className="flex gap-2 text-slate-800">
                        <span>{wound.location}</span>
                        {wound.type && <span className="text-slate-500">| {wound.type}</span>}
                        {wound.appearance && <span className="text-slate-500">| {wound.appearance}</span>}
                        {wound.dressingChanged && <span className="text-rose-600 text-sm font-medium">(Dressing changed)</span>}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Notes */}
              {entry.notes && (
                <div className="pt-3 border-t border-slate-100">
                  <h4 className="text-sm font-bold text-slate-700 uppercase mb-2">Notes</h4>
                  <p className="text-base text-slate-800">{entry.notes}</p>
                </div>
              )}
            </div>
          ))}
          {flowsheet.length === 0 && scores.length === 0 && (
            <div className="py-8 text-center text-slate-500 rounded-lg border border-slate-200">
              No ICU monitoring entries yet. Click "Add Entry" to record data.
            </div>
          )}
        </div>
      )}

      {/* Entry Modal */}
      {showModal && (
        <EntryModal
          encounterId={encounterId}
          onClose={() => setShowModal(false)}
          onSaved={() => { setShowModal(false); load() }}
        />
      )}
    </div>
  )
}

function EntryModal({ encounterId, onClose, onSaved }: { encounterId: string; onClose: () => void; onSaved: () => void }) {
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    bpSystolic: '',
    bpDiastolic: '',
    hr: '',
    rr: '',
    temp: '',
    spo2: '',
    gcsEye: '',
    gcsVerbal: '',
    gcsMotor: '',
    painScore: '',
    intakeOral: '',
    intakeIV: '',
    intakeNG: '',
    outputUrine: '',
    outputDrain: '',
    outputEmesis: '',
    ventMode: '',
    ventFio2: '',
    ventPeep: '',
    ventTidalVolume: '',
    ventRate: '',
    apacheScore: '',
    sofaScore: '',
    notes: '',
  })
  const [lines, setLines] = useState<Array<{type: string; site: string; insertedAt: string; daysInSitu: string; condition: string}>>([])
  const [tubes, setTubes] = useState<Array<{type: string; site: string; size: string; insertedAt: string; daysInSitu: string; condition: string}>>([])
  const [drains, setDrains] = useState<Array<{location: string; type: string; output: string; color: string; notes: string}>>([])
  const [wounds, setWounds] = useState<Array<{location: string; type: string; size: string; appearance: string; dressingType: string; dressingChanged: boolean}>>([])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    try {
      const gcsTotal = (parseInt(form.gcsEye) || 0) + (parseInt(form.gcsVerbal) || 0) + (parseInt(form.gcsMotor) || 0)
      const intakeTotal = (parseInt(form.intakeOral) || 0) + (parseInt(form.intakeIV) || 0) + (parseInt(form.intakeNG) || 0)
      const outputTotal = (parseInt(form.outputUrine) || 0) + (parseInt(form.outputDrain) || 0) + (parseInt(form.outputEmesis) || 0)

      await ipdApi.createIpdIcuMonitoring(encounterId, {
        recordedAt: new Date().toISOString(),
        vitals: { 
          bp: form.bpSystolic && form.bpDiastolic ? `${form.bpSystolic}/${form.bpDiastolic}` : undefined,
          hr: form.hr ? parseInt(form.hr) : undefined,
          rr: form.rr ? parseInt(form.rr) : undefined,
          temp: form.temp ? parseFloat(form.temp) : undefined,
          spo2: form.spo2 ? parseInt(form.spo2) : undefined,
        },
        neurological: {
          gcs: { eye: form.gcsEye ? parseInt(form.gcsEye) : undefined, verbal: form.gcsVerbal ? parseInt(form.gcsVerbal) : undefined, motor: form.gcsMotor ? parseInt(form.gcsMotor) : undefined, total: gcsTotal || undefined },
        },
        scores: {
          ...(form.painScore ? { nrs: parseInt(form.painScore) } : {}),
          ...(form.apacheScore ? { apacheII: parseInt(form.apacheScore) } : {}),
          ...(form.sofaScore ? { sofa: parseInt(form.sofaScore) } : {}),
        },
        fluidBalance: {
          intake: { total: intakeTotal || undefined },
          output: { total: outputTotal || undefined },
        },
        ventilator: form.ventMode ? {
          mode: form.ventMode as any,
          fio2: form.ventFio2 ? parseInt(form.ventFio2) : undefined,
          peep: form.ventPeep ? parseInt(form.ventPeep) : undefined,
          tidalVolume: form.ventTidalVolume ? parseInt(form.ventTidalVolume) : undefined,
          respiratoryRate: form.ventRate ? parseInt(form.ventRate) : undefined,
        } : undefined,
        lines: lines.length > 0 ? lines.map(l => ({
          type: l.type as any,
          site: l.site || undefined,
          insertedAt: l.insertedAt || undefined,
          daysInSitu: l.daysInSitu ? parseInt(l.daysInSitu) : undefined,
          condition: l.condition || undefined,
        })) : undefined,
        tubes: tubes.length > 0 ? tubes.map(t => ({
          type: t.type as any,
          site: t.site || undefined,
          size: t.size || undefined,
          insertedAt: t.insertedAt || undefined,
          daysInSitu: t.daysInSitu ? parseInt(t.daysInSitu) : undefined,
          condition: t.condition || undefined,
        })) : undefined,
        drains: drains.length > 0 ? drains.map(d => ({
          location: d.location || undefined,
          type: d.type || undefined,
          output: d.output ? parseInt(d.output) : undefined,
          color: d.color || undefined,
          notes: d.notes || undefined,
        })) : undefined,
        wounds: wounds.length > 0 ? wounds.map(w => ({
          location: w.location || undefined,
          type: w.type || undefined,
          size: w.size || undefined,
          appearance: w.appearance || undefined,
          dressingType: w.dressingType || undefined,
          dressingChanged: w.dressingChanged || undefined,
        })) : undefined,
        notes: form.notes || undefined,
      })
      onSaved()
    } catch (e: any) {
      alert(e?.message || 'Failed to save')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 overflow-y-auto">
      <div className="w-full max-w-2xl rounded-xl bg-white p-6 shadow-xl my-8">
        <h2 className="text-lg font-semibold text-slate-800">ICU Flowsheet Entry</h2>
        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          {/* Vitals */}
          <div className="rounded-lg border border-slate-200 p-3">
            <h3 className="text-sm font-medium text-slate-700 mb-2">Vital Signs</h3>
            <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
              <div>
                <label className="block text-xs text-slate-500">BP Sys</label>
                <input type="number" value={form.bpSystolic} onChange={(e) => setForm({ ...form, bpSystolic: e.target.value })} className="mt-1 w-full rounded border border-slate-300 px-2 py-1 text-sm" placeholder="120" />
              </div>
              <div>
                <label className="block text-xs text-slate-500">BP Dia</label>
                <input type="number" value={form.bpDiastolic} onChange={(e) => setForm({ ...form, bpDiastolic: e.target.value })} className="mt-1 w-full rounded border border-slate-300 px-2 py-1 text-sm" placeholder="80" />
              </div>
              <div>
                <label className="block text-xs text-slate-500">HR</label>
                <input type="number" value={form.hr} onChange={(e) => setForm({ ...form, hr: e.target.value })} className="mt-1 w-full rounded border border-slate-300 px-2 py-1 text-sm" placeholder="72" />
              </div>
              <div>
                <label className="block text-xs text-slate-500">RR</label>
                <input type="number" value={form.rr} onChange={(e) => setForm({ ...form, rr: e.target.value })} className="mt-1 w-full rounded border border-slate-300 px-2 py-1 text-sm" placeholder="16" />
              </div>
              <div>
                <label className="block text-xs text-slate-500">Temp (°C)</label>
                <input type="number" step="0.1" value={form.temp} onChange={(e) => setForm({ ...form, temp: e.target.value })} className="mt-1 w-full rounded border border-slate-300 px-2 py-1 text-sm" placeholder="37.0" />
              </div>
              <div>
                <label className="block text-xs text-slate-500">SpO2 (%)</label>
                <input type="number" value={form.spo2} onChange={(e) => setForm({ ...form, spo2: e.target.value })} className="mt-1 w-full rounded border border-slate-300 px-2 py-1 text-sm" placeholder="98" />
              </div>
            </div>
          </div>

          {/* GCS */}
          <div className="rounded-lg border border-slate-200 p-3">
            <h3 className="text-sm font-medium text-slate-700 mb-2">Glasgow Coma Scale</h3>
            <div className="grid grid-cols-4 gap-3">
              <div>
                <label className="block text-xs text-slate-500">Eye (1-4)</label>
                <select value={form.gcsEye} onChange={(e) => setForm({ ...form, gcsEye: e.target.value })} className="mt-1 w-full rounded border border-slate-300 px-2 py-1 text-sm">
                  <option value="">-</option>
                  {[4,3,2,1].map(v => <option key={v} value={v}>{v}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs text-slate-500">Verbal (1-5)</label>
                <select value={form.gcsVerbal} onChange={(e) => setForm({ ...form, gcsVerbal: e.target.value })} className="mt-1 w-full rounded border border-slate-300 px-2 py-1 text-sm">
                  <option value="">-</option>
                  {[5,4,3,2,1].map(v => <option key={v} value={v}>{v}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs text-slate-500">Motor (1-6)</label>
                <select value={form.gcsMotor} onChange={(e) => setForm({ ...form, gcsMotor: e.target.value })} className="mt-1 w-full rounded border border-slate-300 px-2 py-1 text-sm">
                  <option value="">-</option>
                  {[6,5,4,3,2,1].map(v => <option key={v} value={v}>{v}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs text-slate-500">Total</label>
                <div className="mt-1 rounded border border-slate-200 bg-slate-50 px-2 py-1 text-sm font-medium">
                  {(parseInt(form.gcsEye) || 0) + (parseInt(form.gcsVerbal) || 0) + (parseInt(form.gcsMotor) || 0) || '-'}
                </div>
              </div>
            </div>
          </div>

          {/* Clinical Scores */}
          <div className="rounded-lg border border-slate-200 p-3">
            <h3 className="text-sm font-medium text-slate-700 mb-2">Clinical Scores (Optional)</h3>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-slate-500">APACHE II Score</label>
                <input type="number" value={form.apacheScore} onChange={(e) => setForm({ ...form, apacheScore: e.target.value })} className="mt-1 w-full rounded border border-slate-300 px-2 py-1 text-sm" placeholder="0-71" />
              </div>
              <div>
                <label className="block text-xs text-slate-500">SOFA Score</label>
                <input type="number" value={form.sofaScore} onChange={(e) => setForm({ ...form, sofaScore: e.target.value })} className="mt-1 w-full rounded border border-slate-300 px-2 py-1 text-sm" placeholder="0-24" />
              </div>
            </div>
          </div>

          {/* Intake/Output */}
          <div className="rounded-lg border border-slate-200 p-3">
            <h3 className="text-sm font-medium text-slate-700 mb-2">Intake / Output (ml)</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-slate-500 mb-1">Intake</label>
                <div className="grid grid-cols-3 gap-2">
                  <input type="number" value={form.intakeOral} onChange={(e) => setForm({ ...form, intakeOral: e.target.value })} className="rounded border border-slate-300 px-2 py-1 text-sm" placeholder="Oral" />
                  <input type="number" value={form.intakeIV} onChange={(e) => setForm({ ...form, intakeIV: e.target.value })} className="rounded border border-slate-300 px-2 py-1 text-sm" placeholder="IV" />
                  <input type="number" value={form.intakeNG} onChange={(e) => setForm({ ...form, intakeNG: e.target.value })} className="rounded border border-slate-300 px-2 py-1 text-sm" placeholder="NG" />
                </div>
              </div>
              <div>
                <label className="block text-xs text-slate-500 mb-1">Output</label>
                <div className="grid grid-cols-3 gap-2">
                  <input type="number" value={form.outputUrine} onChange={(e) => setForm({ ...form, outputUrine: e.target.value })} className="rounded border border-slate-300 px-2 py-1 text-sm" placeholder="Urine" />
                  <input type="number" value={form.outputDrain} onChange={(e) => setForm({ ...form, outputDrain: e.target.value })} className="rounded border border-slate-300 px-2 py-1 text-sm" placeholder="Drain" />
                  <input type="number" value={form.outputEmesis} onChange={(e) => setForm({ ...form, outputEmesis: e.target.value })} className="rounded border border-slate-300 px-2 py-1 text-sm" placeholder="Emesis" />
                </div>
              </div>
            </div>
          </div>

          {/* Ventilator */}
          <div className="rounded-lg border border-slate-200 p-3">
            <h3 className="text-sm font-medium text-slate-700 mb-2">Ventilator Settings (Optional)</h3>
            <div className="grid grid-cols-5 gap-3">
              <div>
                <label className="block text-xs text-slate-500">Mode</label>
                <select value={form.ventMode} onChange={(e) => setForm({ ...form, ventMode: e.target.value })} className="mt-1 w-full rounded border border-slate-300 px-2 py-1 text-sm">
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
                <label className="block text-xs text-slate-500">FiO2 (%)</label>
                <input type="number" value={form.ventFio2} onChange={(e) => setForm({ ...form, ventFio2: e.target.value })} className="mt-1 w-full rounded border border-slate-300 px-2 py-1 text-sm" placeholder="40" />
              </div>
              <div>
                <label className="block text-xs text-slate-500">PEEP</label>
                <input type="number" value={form.ventPeep} onChange={(e) => setForm({ ...form, ventPeep: e.target.value })} className="mt-1 w-full rounded border border-slate-300 px-2 py-1 text-sm" placeholder="5" />
              </div>
              <div>
                <label className="block text-xs text-slate-500">Vt (ml)</label>
                <input type="number" value={form.ventTidalVolume} onChange={(e) => setForm({ ...form, ventTidalVolume: e.target.value })} className="mt-1 w-full rounded border border-slate-300 px-2 py-1 text-sm" placeholder="500" />
              </div>
              <div>
                <label className="block text-xs text-slate-500">Rate</label>
                <input type="number" value={form.ventRate} onChange={(e) => setForm({ ...form, ventRate: e.target.value })} className="mt-1 w-full rounded border border-slate-300 px-2 py-1 text-sm" placeholder="12" />
              </div>
            </div>
          </div>

          {/* Lines */}
          <div className="rounded-lg border border-slate-200 p-3">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-slate-700">Lines</h3>
              <button type="button" onClick={() => setLines([...lines, { type: '', site: '', insertedAt: '', daysInSitu: '', condition: '' }])} className="text-xs text-rose-600 hover:text-rose-700">+ Add Line</button>
            </div>
            {lines.length === 0 ? (
              <p className="text-xs text-slate-400">No lines recorded</p>
            ) : (
              <div className="space-y-2">
                {lines.map((line, idx) => (
                  <div key={idx} className="grid grid-cols-6 gap-2 items-center">
                    <select value={line.type} onChange={(e) => { const u = [...lines]; u[idx].type = e.target.value; setLines(u); }} className="rounded border border-slate-300 px-2 py-1 text-xs">
                      <option value="">Type</option>
                      <option value="CVP">CVP</option>
                      <option value="Arterial">Arterial</option>
                      <option value="PICC">PICC</option>
                      <option value="Peripheral IV">Peripheral IV</option>
                      <option value="Dialysis">Dialysis</option>
                    </select>
                    <input type="text" value={line.site} onChange={(e) => { const u = [...lines]; u[idx].site = e.target.value; setLines(u); }} className="rounded border border-slate-300 px-2 py-1 text-xs" placeholder="Site" />
                    <input type="date" value={line.insertedAt} onChange={(e) => { const u = [...lines]; u[idx].insertedAt = e.target.value; setLines(u); }} className="rounded border border-slate-300 px-2 py-1 text-xs" />
                    <input type="number" value={line.daysInSitu} onChange={(e) => { const u = [...lines]; u[idx].daysInSitu = e.target.value; setLines(u); }} className="rounded border border-slate-300 px-2 py-1 text-xs" placeholder="Days" />
                    <input type="text" value={line.condition} onChange={(e) => { const u = [...lines]; u[idx].condition = e.target.value; setLines(u); }} className="rounded border border-slate-300 px-2 py-1 text-xs" placeholder="Condition" />
                    <button type="button" onClick={() => setLines(lines.filter((_, i) => i !== idx))} className="text-red-500 text-xs hover:text-red-700">Remove</button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Tubes */}
          <div className="rounded-lg border border-slate-200 p-3">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-slate-700">Tubes</h3>
              <button type="button" onClick={() => setTubes([...tubes, { type: '', site: '', size: '', insertedAt: '', daysInSitu: '', condition: '' }])} className="text-xs text-rose-600 hover:text-rose-700">+ Add Tube</button>
            </div>
            {tubes.length === 0 ? (
              <p className="text-xs text-slate-400">No tubes recorded</p>
            ) : (
              <div className="space-y-2">
                {tubes.map((tube, idx) => (
                  <div key={idx} className="grid grid-cols-6 gap-2 items-center">
                    <select value={tube.type} onChange={(e) => { const u = [...tubes]; u[idx].type = e.target.value; setTubes(u); }} className="rounded border border-slate-300 px-2 py-1 text-xs">
                      <option value="">Type</option>
                      <option value="ETT">ETT</option>
                      <option value="Tracheostomy">Tracheostomy</option>
                      <option value="NGT">NGT</option>
                      <option value="Chest Tube">Chest Tube</option>
                      <option value="Foley">Foley</option>
                      <option value="Drain">Drain</option>
                    </select>
                    <input type="text" value={tube.site} onChange={(e) => { const u = [...tubes]; u[idx].site = e.target.value; setTubes(u); }} className="rounded border border-slate-300 px-2 py-1 text-xs" placeholder="Site" />
                    <input type="text" value={tube.size} onChange={(e) => { const u = [...tubes]; u[idx].size = e.target.value; setTubes(u); }} className="rounded border border-slate-300 px-2 py-1 text-xs" placeholder="Size" />
                    <input type="date" value={tube.insertedAt} onChange={(e) => { const u = [...tubes]; u[idx].insertedAt = e.target.value; setTubes(u); }} className="rounded border border-slate-300 px-2 py-1 text-xs" />
                    <input type="number" value={tube.daysInSitu} onChange={(e) => { const u = [...tubes]; u[idx].daysInSitu = e.target.value; setTubes(u); }} className="rounded border border-slate-300 px-2 py-1 text-xs" placeholder="Days" />
                    <button type="button" onClick={() => setTubes(tubes.filter((_, i) => i !== idx))} className="text-red-500 text-xs hover:text-red-700">Remove</button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Drains */}
          <div className="rounded-lg border border-slate-200 p-3">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-slate-700">Drains</h3>
              <button type="button" onClick={() => setDrains([...drains, { location: '', type: '', output: '', color: '', notes: '' }])} className="text-xs text-rose-600 hover:text-rose-700">+ Add Drain</button>
            </div>
            {drains.length === 0 ? (
              <p className="text-xs text-slate-400">No drains recorded</p>
            ) : (
              <div className="space-y-2">
                {drains.map((drain, idx) => (
                  <div key={idx} className="grid grid-cols-5 gap-2 items-center">
                    <input type="text" value={drain.location} onChange={(e) => { const u = [...drains]; u[idx].location = e.target.value; setDrains(u); }} className="rounded border border-slate-300 px-2 py-1 text-xs" placeholder="Location" />
                    <input type="text" value={drain.type} onChange={(e) => { const u = [...drains]; u[idx].type = e.target.value; setDrains(u); }} className="rounded border border-slate-300 px-2 py-1 text-xs" placeholder="Type" />
                    <input type="number" value={drain.output} onChange={(e) => { const u = [...drains]; u[idx].output = e.target.value; setDrains(u); }} className="rounded border border-slate-300 px-2 py-1 text-xs" placeholder="Output (ml)" />
                    <input type="text" value={drain.color} onChange={(e) => { const u = [...drains]; u[idx].color = e.target.value; setDrains(u); }} className="rounded border border-slate-300 px-2 py-1 text-xs" placeholder="Color" />
                    <button type="button" onClick={() => setDrains(drains.filter((_, i) => i !== idx))} className="text-red-500 text-xs hover:text-red-700">Remove</button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Wounds */}
          <div className="rounded-lg border border-slate-200 p-3">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-slate-700">Wounds</h3>
              <button type="button" onClick={() => setWounds([...wounds, { location: '', type: '', size: '', appearance: '', dressingType: '', dressingChanged: false }])} className="text-xs text-rose-600 hover:text-rose-700">+ Add Wound</button>
            </div>
            {wounds.length === 0 ? (
              <p className="text-xs text-slate-400">No wounds recorded</p>
            ) : (
              <div className="space-y-2">
                {wounds.map((wound, idx) => (
                  <div key={idx} className="grid grid-cols-6 gap-2 items-center">
                    <input type="text" value={wound.location} onChange={(e) => { const u = [...wounds]; u[idx].location = e.target.value; setWounds(u); }} className="rounded border border-slate-300 px-2 py-1 text-xs" placeholder="Location" />
                    <input type="text" value={wound.type} onChange={(e) => { const u = [...wounds]; u[idx].type = e.target.value; setWounds(u); }} className="rounded border border-slate-300 px-2 py-1 text-xs" placeholder="Type" />
                    <input type="text" value={wound.size} onChange={(e) => { const u = [...wounds]; u[idx].size = e.target.value; setWounds(u); }} className="rounded border border-slate-300 px-2 py-1 text-xs" placeholder="Size" />
                    <input type="text" value={wound.appearance} onChange={(e) => { const u = [...wounds]; u[idx].appearance = e.target.value; setWounds(u); }} className="rounded border border-slate-300 px-2 py-1 text-xs" placeholder="Appearance" />
                    <label className="flex items-center gap-1 text-xs">
                      <input type="checkbox" checked={wound.dressingChanged} onChange={(e) => { const u = [...wounds]; u[idx].dressingChanged = e.target.checked; setWounds(u); }} className="rounded" />
                      Dressing changed
                    </label>
                    <button type="button" onClick={() => setWounds(wounds.filter((_, i) => i !== idx))} className="text-red-500 text-xs hover:text-red-700">Remove</button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-slate-700">Notes</label>
            <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm" rows={2} />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">Cancel</button>
            <button type="submit" disabled={loading} className="rounded-md bg-rose-600 px-4 py-2 text-sm font-medium text-white hover:bg-rose-700 disabled:opacity-50">
              {loading ? 'Saving...' : 'Save Entry'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
