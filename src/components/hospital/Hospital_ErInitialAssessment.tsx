import React, { useEffect, useState } from 'react'
import { erApi } from '../../features/hospital/er'

interface InitialAssessment {
  id: string
  arrivalTime: string
  assessmentTime: string
  assessedBy: string
  chiefComplaint: string
  historyOfPresentingIllness: string
  pastMedicalHistory: string
  medications: string
  allergies: string
  vitals: {
    bp?: string
    pulse?: number
    temp?: number
    rr?: number
    spo2?: number
    pain?: number
  }
  nurseNotes: string
  createdAt: string
}


export default function Hospital_ErInitialAssessment({ encounterId }: { encounterId: string }) {
  const [assessments, setAssessments] = useState<InitialAssessment[]>([])
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (encounterId) {
      loadAssessments()
    }
  }, [encounterId])

  async function loadAssessments() {
    setLoading(true)
    try {
      const res = await erApi.listErInitialAssessments(encounterId, { limit: 50 }) as any
      const items = (res.assessments || []).map((a: any) => ({
        id: String(a._id || a.id),
        arrivalTime: a.arrivalTime || a.createdAt,
        assessmentTime: a.assessmentTime || a.createdAt,
        assessedBy: a.assessedBy || '',
        chiefComplaint: a.chiefComplaint || '',
        historyOfPresentingIllness: a.historyOfPresentingIllness || '',
        pastMedicalHistory: a.pastMedicalHistory || '',
        medications: a.medications || '',
        allergies: a.allergies || '',
        vitals: a.vitals || {},
        
        nurseNotes: a.nurseNotes || '',
        createdAt: a.createdAt,
      }))
      setAssessments(items)
    } catch {
      setAssessments([])
    } finally {
      setLoading(false)
    }
  }

  async function save(data: Partial<InitialAssessment>) {
    try {
      await erApi.createErInitialAssessment(encounterId, {
        arrivalTime: data.arrivalTime,
        assessmentTime: data.assessmentTime,
        assessedBy: data.assessedBy,
        chiefComplaint: data.chiefComplaint,
        historyOfPresentingIllness: data.historyOfPresentingIllness,
        pastMedicalHistory: data.pastMedicalHistory,
        medications: data.medications,
        allergies: data.allergies,
        vitals: data.vitals,
        nurseNotes: data.nurseNotes,
      })
      setOpen(false)
      await loadAssessments()
    } catch (e: any) {
      alert(e?.message || 'Failed to save initial assessment')
    }
  }

  const formatDateTime = (s: string) => {
    if (!s) return '-'
    const d = new Date(s)
    return d.toLocaleString()
  }

  
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="mb-2 flex items-center justify-between">
        <div className="text-lg font-semibold text-slate-900">Initial Assessment</div>
        <button onClick={() => setOpen(true)} className="btn">Add Initial Assessment</button>
      </div>

      {loading ? (
        <div className="text-slate-500">Loading...</div>
      ) : assessments.length === 0 ? (
        <div className="text-slate-500">No initial assessment recorded yet.</div>
      ) : (
        <div className="space-y-4">
          {assessments.map((a) => (
            <div key={a.id} className="rounded-lg border border-slate-200 p-4">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-semibold text-slate-800">
                    Staff: {a.assessedBy || '-'}
                  </span>
                  
                </div>
                <div className="text-xs text-slate-500">
                  {formatDateTime(a.createdAt)}
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <div className="mb-2">
                    <span className="text-xs font-medium text-slate-500">Arrival Time:</span>
                    <div className="text-sm text-slate-800">{formatDateTime(a.arrivalTime)}</div>
                  </div>
                  <div className="mb-2">
                    <span className="text-xs font-medium text-slate-500">Assessment Time:</span>
                    <div className="text-sm text-slate-800">{formatDateTime(a.assessmentTime)}</div>
                  </div>
                  <div className="mb-2">
                    <span className="text-xs font-medium text-slate-500">Chief Complaint:</span>
                    <div className="text-sm text-slate-800">{a.chiefComplaint || '-'}</div>
                  </div>
                  <div className="mb-2">
                    <span className="text-xs font-medium text-slate-500">History:</span>
                    <div className="text-sm text-slate-800">{a.historyOfPresentingIllness || '-'}</div>
                  </div>
                </div>

                <div>
                  <div className="mb-2">
                    <span className="text-xs font-medium text-slate-500">Past Medical History:</span>
                    <div className="text-sm text-slate-800">{a.pastMedicalHistory || '-'}</div>
                  </div>
                  <div className="mb-2">
                    <span className="text-xs font-medium text-slate-500">Current Medications:</span>
                    <div className="text-sm text-slate-800">{a.medications || '-'}</div>
                  </div>
                  <div className="mb-2">
                    <span className="text-xs font-medium text-slate-500">Allergies:</span>
                    <div className="text-sm text-slate-800">{a.allergies || '-'}</div>
                  </div>
                </div>
              </div>

              {a.vitals && (
                <div className="mt-3 rounded-md bg-slate-50 p-3">
                  <div className="mb-1 text-xs font-medium text-slate-500">Vitals at Assessment:</div>
                  <div className="flex flex-wrap gap-3 text-sm">
                    {a.vitals.bp && <span>B.P: {a.vitals.bp}</span>}
                    {a.vitals.pulse && <span>Pulse: {a.vitals.pulse}</span>}
                    {a.vitals.temp && <span>Temp: {a.vitals.temp}°F</span>}
                    {a.vitals.rr && <span>RR: {a.vitals.rr}</span>}
                    {a.vitals.spo2 && <span>SpO2: {a.vitals.spo2}%</span>}
                    {a.vitals.pain !== undefined && <span>Pain: {a.vitals.pain}/10</span>}
                  </div>
                </div>
              )}

              {a.nurseNotes && (
                <div className="mt-3">
                  <span className="text-xs font-medium text-slate-500">Nurse Notes:</span>
                  <div className="whitespace-pre-wrap text-sm text-slate-800">{a.nurseNotes}</div>
                </div>
              )}

            </div>
          ))}
        </div>
      )}

      <AssessmentDialog open={open} onClose={() => setOpen(false)} onSave={save} />
    </div>
  )
}

function AssessmentDialog({
  open,
  onClose,
  onSave,
}: {
  open: boolean
  onClose: () => void
  onSave: (data: Partial<InitialAssessment>) => void
}) {
  if (!open) return null

  const now = new Date()
  const defaultDateTime = now.toISOString().slice(0, 16)
  
  const submit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)

    const vitals = {
      bp: String(fd.get('bp') || ''),
      pulse: fd.get('pulse') ? parseInt(String(fd.get('pulse'))) : undefined,
      temp: fd.get('temp') ? parseFloat(String(fd.get('temp'))) : undefined,
      rr: fd.get('rr') ? parseInt(String(fd.get('rr'))) : undefined,
      spo2: fd.get('spo2') ? parseInt(String(fd.get('spo2'))) : undefined,
      pain: fd.get('pain') ? parseInt(String(fd.get('pain'))) : undefined,
    }

    onSave({
      arrivalTime: String(fd.get('arrivalTime') || ''),
      assessmentTime: String(fd.get('assessmentTime') || ''),
      assessedBy: String(fd.get('assessedBy') || ''),
      chiefComplaint: String(fd.get('chiefComplaint') || ''),
      historyOfPresentingIllness: String(fd.get('historyOfPresentingIllness') || ''),
      pastMedicalHistory: String(fd.get('pastMedicalHistory') || ''),
      medications: String(fd.get('medications') || ''),
      allergies: String(fd.get('allergies') || ''),
      vitals: vitals as any,
      nurseNotes: String(fd.get('nurseNotes') || ''),
    })
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <form
        onSubmit={submit}
        className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-xl bg-white shadow-2xl ring-1 ring-black/5"
      >
        <div className="sticky top-0 z-10 border-b border-slate-200 bg-white px-5 py-3 font-semibold text-slate-800">
          Initial Assessment - ER Patient
        </div>

        <div className="space-y-4 px-5 py-4 text-sm">
          {/* Staff and Timing */}
          <div className="grid gap-3 md:grid-cols-3">
            <div>
              <label className="block text-xs font-medium text-slate-600">Arrival Time</label>
              <input
                name="arrivalTime"
                type="datetime-local"
                defaultValue={defaultDateTime}
                required
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600">Assessment Time</label>
              <input
                name="assessmentTime"
                type="datetime-local"
                defaultValue={defaultDateTime}
                required
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600">Assessed By (Staff Name)</label>
              <input
                name="assessedBy"
                placeholder="Enter staff name"
                required
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2"
              />
            </div>
          </div>

          {/* Chief Complaint */}
          <div>
            <label className="block text-xs font-medium text-slate-600">Chief Complaint</label>
            <input
              name="chiefComplaint"
              placeholder="Patient's main complaint"
              required
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2"
            />
          </div>

          {/* History */}
          <div>
            <label className="block text-xs font-medium text-slate-600">History of Presenting Illness</label>
            <textarea
              name="historyOfPresentingIllness"
              rows={3}
              placeholder="Details about the current illness/injury"
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2"
            />
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <div>
              <label className="block text-xs font-medium text-slate-600">Past Medical History</label>
              <textarea
                name="pastMedicalHistory"
                rows={2}
                placeholder="Any known medical conditions"
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600">Current Medications</label>
              <textarea
                name="medications"
                rows={2}
                placeholder="List current medications if any"
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-600">Allergies</label>
            <input
              name="allergies"
              placeholder="Known allergies (or 'None known')"
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2"
            />
          </div>

          {/* Vitals */}
          <div className="rounded-md bg-slate-50 p-3">
            <div className="mb-2 text-xs font-medium text-slate-600">Initial Vitals</div>
            <div className="grid gap-3 sm:grid-cols-3 md:grid-cols-6">
              <div>
                <label className="block text-xs text-slate-500">B.P.</label>
                <input
                  name="bp"
                  placeholder="120/80"
                  className="w-full rounded-md border border-slate-300 px-2 py-1 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-500">Pulse</label>
                <input
                  name="pulse"
                  type="number"
                  placeholder="72"
                  className="w-full rounded-md border border-slate-300 px-2 py-1 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-500">Temp (°F)</label>
                <input
                  name="temp"
                  type="number"
                  step="0.1"
                  placeholder="98.6"
                  className="w-full rounded-md border border-slate-300 px-2 py-1 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-500">RR</label>
                <input
                  name="rr"
                  type="number"
                  placeholder="16"
                  className="w-full rounded-md border border-slate-300 px-2 py-1 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-500">SpO2 (%)</label>
                <input
                  name="spo2"
                  type="number"
                  placeholder="98"
                  className="w-full rounded-md border border-slate-300 px-2 py-1 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-500">Pain (0-10)</label>
                <input
                  name="pain"
                  type="number"
                  min="0"
                  max="10"
                  placeholder="0"
                  className="w-full rounded-md border border-slate-300 px-2 py-1 text-sm"
                />
              </div>
            </div>
          </div>

          {/* Nurse Notes */}
          <div>
            <label className="block text-xs font-medium text-slate-600">Nurse/Staff Notes</label>
            <textarea
              name="nurseNotes"
              rows={3}
              placeholder="Initial observations and notes by attending staff"
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2"
            />
          </div>

        </div>

        <div className="sticky bottom-0 z-10 flex items-center justify-end gap-2 border-t border-slate-200 bg-white px-5 py-3">
          <button type="button" onClick={onClose} className="btn-outline-navy">
            Cancel
          </button>
          <button type="submit" className="btn">
            Save Initial Assessment
          </button>
        </div>
      </form>
    </div>
  )
}
