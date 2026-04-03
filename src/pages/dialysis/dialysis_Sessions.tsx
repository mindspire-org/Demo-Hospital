import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { dialysisApi } from '../../utils/api'
import { printDialysisSessionReport } from '../../utils/printDialysisSessionReport'

type SessionRow = any

type PatientInfo = {
  _id: string
  dialysisPatientId: string
  mrn?: string
  labPatient?: any
}

function toTimeValue(v?: string) {
  const s = String(v || '').trim()
  if (!s) return ''
  const m24 = s.match(/^(\d{1,2}):(\d{2})(?::\d{2})?$/)
  if (m24) {
    const hh = Math.min(23, Math.max(0, Number(m24[1] || 0)))
    const mm = Math.min(59, Math.max(0, Number(m24[2] || 0)))
    return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`
  }
  const m12 = s.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i)
  if (m12) {
    let hh = Math.min(12, Math.max(1, Number(m12[1] || 0)))
    const mm = Math.min(59, Math.max(0, Number(m12[2] || 0)))
    const ap = String(m12[3] || '').toUpperCase()
    if (ap === 'PM' && hh !== 12) hh += 12
    if (ap === 'AM' && hh === 12) hh = 0
    return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`
  }
  return ''
}

export default function Dialysis_Sessions() {
  const [searchParams] = useSearchParams()
  const dialysisPatientId = String(searchParams.get('dialysisPatientId') || '')

  const [patient, setPatient] = useState<PatientInfo | null>(null)
  const [sessions, setSessions] = useState<SessionRow[]>([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)

   const [center, setCenter] = useState<any>(null)

  const [editing, setEditing] = useState<SessionRow | null>(null)

  async function load() {
    if (!dialysisPatientId) return
    setLoading(true)
    try {
      const [pRes, sRes, cRes]: any = await Promise.all([
        dialysisApi.getDialysisPatient(dialysisPatientId),
        dialysisApi.listSessions({ dialysisPatientId, limit: 200 }),
        dialysisApi.getSettings(),
      ])
      setPatient(pRes?.patient ? ({
        _id: String(pRes.patient._id),
        dialysisPatientId: pRes.patient.dialysisPatientId,
        mrn: pRes.patient.mrn,
        labPatient: pRes.patient.labPatient,
      }) : null)
      setSessions((sRes?.items || []).map((x: any) => ({ ...x, _id: String(x._id) })))
      setCenter(cRes || null)
    } catch {
      setPatient(null)
      setSessions([])
      setCenter(null)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dialysisPatientId])

  const title = useMemo(() => {
    const lp: any = patient?.labPatient || {}
    if (!patient) return 'Dialysis Sessions'
    return `Dialysis Sessions — ${lp.fullName || ''}`.trim()
  }, [patient])

  async function saveEdit() {
    if (!editing?._id) return
    setSaving(true)
    try {
      await dialysisApi.updateSession(String(editing._id), editing)
      setEditing(null)
      await load()
    } catch {
      // ignore
    } finally {
      setSaving(false)
    }
  }

  if (!dialysisPatientId) {
    return (
      <div className="min-h-[70dvh] rounded-xl bg-gradient-to-br from-teal-500/20 via-cyan-300/20 to-emerald-300/20 p-6">
        <div className="w-full rounded-xl bg-white p-6 shadow-lg">
          <h2 className="text-xl font-bold text-slate-800">Dialysis Sessions</h2>
          <div className="mt-2 text-sm text-slate-600">Open a patient from the Dialysis Patients page.</div>
        </div>
      </div>
    )
  }

  const lp: any = patient?.labPatient || {}

  return (
    <div className="min-h-[70dvh] rounded-xl bg-gradient-to-br from-teal-500/20 via-cyan-300/20 to-emerald-300/20 p-6">
      <div className="w-full rounded-xl bg-white p-6 shadow-lg">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-bold text-slate-800">{title}</h2>
            <div className="text-sm text-slate-500">Patient summary + session technical data</div>
          </div>
          <button
            onClick={load}
            disabled={loading}
            className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
            type="button"
          >
            {loading ? 'Loading…' : 'Refresh'}
          </button>
        </div>

        <div className="mt-6 rounded-xl border border-slate-200 p-5">
          <h3 className="mb-3 text-sm font-semibold text-slate-800">Dialysis Center Information</h3>
          <div className="grid gap-3 sm:grid-cols-2">
            <Info label="Center Name" value={center?.centerName || center?.dialysisCenterName || center?.name || '-'} />
            <Info label="Phone" value={center?.phone || '-'} />
            <Info label="Email" value={center?.email || '-'} />
            <Info label="Address" value={center?.address || '-'} />
          </div>
        </div>

        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          <div className="rounded-xl border border-slate-200 p-5">
            <h3 className="mb-3 text-sm font-semibold text-slate-800">Patient Information</h3>
            <div className="grid gap-3 sm:grid-cols-2">
              <Info label="Dialysis Unique ID" value={patient?.dialysisPatientId || '-'} />
              <Info label="MRN" value={patient?.mrn || lp.mrn || '-'} />
              <Info label="Patient Name" value={lp.fullName || '-'} />
              <Info label="S/O, D/O, W/O" value={lp.fatherName || '-'} />
              <Info label="Contact" value={lp.phoneNormalized || lp.phone || '-'} />
              <Info label="CNIC" value={lp.cnicNormalized || lp.cnic || '-'} />
              <Info label="Gender" value={lp.gender || '-'} />
              <Info label="Age" value={lp.age || '-'} />
              <Info label="Address" value={lp.address || '-'} />
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 p-5">
            <h3 className="mb-3 text-sm font-semibold text-slate-800">Part 2 — Technical Data (Select a session to edit)</h3>
            {!editing ? (
              <div className="text-sm text-slate-600">Select a row below to enter technical data.</div>
            ) : (
              <div className="space-y-4">
                <div className="grid gap-3 sm:grid-cols-2">
                  <Field label="Date" value={editing.dateIso || ''} onChange={v => setEditing((s: any) => ({ ...(s || {}), dateIso: v }))} type="date" />
                  <div className="grid grid-cols-2 gap-3">
                    <Field label="Time Started" value={toTimeValue(editing.timeStarted)} onChange={v => setEditing((s: any) => ({ ...(s || {}), timeStarted: v }))} type="time" />
                    <Field label="Time Completed" value={toTimeValue(editing.timeCompleted)} onChange={v => setEditing((s: any) => ({ ...(s || {}), timeCompleted: v }))} type="time" />
                  </div>

                  <Field label="Type of dialyzers" value={editing.dialyzerTypeName || ''} onChange={v => setEditing((s: any) => ({ ...(s || {}), dialyzerTypeName: v }))} />
                  <Field label="No of Use" value={String(editing.noOfUse ?? '')} onChange={v => setEditing((s: any) => ({ ...(s || {}), noOfUse: v }))} />

                  <Field label="Blood Flow Rate" value={String(editing.bloodFlowRate ?? '')} onChange={v => setEditing((s: any) => ({ ...(s || {}), bloodFlowRate: v }))} />
                  <Field label="Dialysate Flow Rate" value={String(editing.dialysateFlowRate ?? '')} onChange={v => setEditing((s: any) => ({ ...(s || {}), dialysateFlowRate: v }))} />
                  <Field label="Venous Pressure" value={String(editing.venousPressure ?? '')} onChange={v => setEditing((s: any) => ({ ...(s || {}), venousPressure: v }))} />

                  <Field label="Heparin Loading Dose" value={String(editing.heparinLoadingDose ?? '')} onChange={v => setEditing((s: any) => ({ ...(s || {}), heparinLoadingDose: v }))} />
                  <Field label="Heparin Infusion" value={String(editing.heparinInfusion ?? '')} onChange={v => setEditing((s: any) => ({ ...(s || {}), heparinInfusion: v }))} />

                  <Field label="BP Pre HD (Sys/Dia)" value={`${editing.bpPreSys ?? ''}/${editing.bpPreDia ?? ''}`.replace(/^\/$/, '')} onChange={v => {
                    const [a, b] = String(v || '').split('/')
                    setEditing((s: any) => ({ ...(s || {}), bpPreSys: a, bpPreDia: b }))
                  }} />
                  <Field label="BP Intra (Sys/Dia)" value={`${editing.bpIntraSys ?? ''}/${editing.bpIntraDia ?? ''}`.replace(/^\/$/, '')} onChange={v => {
                    const [a, b] = String(v || '').split('/')
                    setEditing((s: any) => ({ ...(s || {}), bpIntraSys: a, bpIntraDia: b }))
                  }} />
                  <Field label="BP Post HD (Sys/Dia)" value={`${editing.bpPostSys ?? ''}/${editing.bpPostDia ?? ''}`.replace(/^\/$/, '')} onChange={v => {
                    const [a, b] = String(v || '').split('/')
                    setEditing((s: any) => ({ ...(s || {}), bpPostSys: a, bpPostDia: b }))
                  }} />

                  <Field label="Weight Dry" value={String(editing.weightDry ?? '')} onChange={v => setEditing((s: any) => ({ ...(s || {}), weightDry: v }))} />
                  <Field label="Weight Pre HD" value={String(editing.weightPre ?? '')} onChange={v => setEditing((s: any) => ({ ...(s || {}), weightPre: v }))} />
                  <Field label="Weight Post HD" value={String(editing.weightPost ?? '')} onChange={v => setEditing((s: any) => ({ ...(s || {}), weightPost: v }))} />
                  <Field label="IDWG" value={String(editing.idwg ?? '')} onChange={v => setEditing((s: any) => ({ ...(s || {}), idwg: v }))} />

                  <Field label="Medication — EPO" value={String(editing.medEpo ?? '')} onChange={v => setEditing((s: any) => ({ ...(s || {}), medEpo: v }))} />
                  <Field label="Medication — Iron" value={String(editing.medIron ?? '')} onChange={v => setEditing((s: any) => ({ ...(s || {}), medIron: v }))} />
                  <Field label="Medication — Calcltriol" value={String(editing.medCalctriol ?? '')} onChange={v => setEditing((s: any) => ({ ...(s || {}), medCalctriol: v }))} />
                  <Field label="Kt/V or URR" value={String(editing.medKtVOrUrr ?? '')} onChange={v => setEditing((s: any) => ({ ...(s || {}), medKtVOrUrr: v }))} />

                  <Field label="Target UF" value={String(editing.targetUF ?? '')} onChange={v => setEditing((s: any) => ({ ...(s || {}), targetUF: v }))} />

                  <Field label="Data entry name" value={String(editing.dataEntryName ?? '')} onChange={v => setEditing((s: any) => ({ ...(s || {}), dataEntryName: v }))} />
                  <Field label="Designation" value={String(editing.dataEntryDesignation ?? '')} onChange={v => setEditing((s: any) => ({ ...(s || {}), dataEntryDesignation: v }))} />

                  <Field label="Any problem of patient" value={String(editing.patientProblem ?? '')} onChange={v => setEditing((s: any) => ({ ...(s || {}), patientProblem: v }))} />

                  <Field label="Nephrologist/SMO" value={String(editing.nephrologistName ?? '')} onChange={v => setEditing((s: any) => ({ ...(s || {}), nephrologistName: v }))} />
                  <Field label="Nephrologist Time" value={String(editing.nephrologistTime ?? '')} onChange={v => setEditing((s: any) => ({ ...(s || {}), nephrologistTime: v }))} />
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={saveEdit}
                    disabled={saving}
                    className="rounded-md bg-teal-600 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-700 disabled:opacity-50"
                    type="button"
                  >
                    {saving ? 'Saving…' : 'Save'}
                  </button>
                  <button
                    onClick={() => setEditing(null)}
                    disabled={saving}
                    className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                    type="button"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="mt-6 overflow-hidden rounded-xl border border-slate-200">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-gradient-to-r from-teal-500 to-cyan-500 text-white">
              <tr className="text-left">
                <th className="px-3 py-3 font-semibold">Date</th>
                <th className="px-3 py-3 font-semibold">Token #</th>
                <th className="px-3 py-3 font-semibold">Start</th>
                <th className="px-3 py-3 font-semibold">End</th>
                <th className="px-3 py-3 font-semibold">Dialyzer</th>
                <th className="px-3 py-3 font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 bg-white text-slate-700">
              {loading ? (
                <tr><td className="px-4 py-8 text-center text-slate-500" colSpan={6}>Loading...</td></tr>
              ) : sessions.length === 0 ? (
                <tr><td className="px-4 py-8 text-center text-slate-500" colSpan={6}>No sessions yet</td></tr>
              ) : (
                sessions.map(s => (
                  <tr key={String(s._id)} className={editing?._id === s._id ? 'bg-teal-50' : 'hover:bg-slate-50'}>
                    <td className="px-3 py-2.5">{s.dateIso || '-'}</td>
                    <td className="px-3 py-2.5 font-semibold text-teal-700">{s.tokenNo || '-'}</td>
                    <td className="px-3 py-2.5">{s.timeStarted || '-'}</td>
                    <td className="px-3 py-2.5">{s.timeCompleted || '-'}</td>
                    <td className="px-3 py-2.5">{s.dialyzerTypeName || '-'}</td>
                    <td className="px-3 py-2.5">
                      <div className="flex flex-wrap gap-2">
                        <button
                          onClick={() => setEditing({ ...s })}
                          className="rounded-md bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-200"
                          type="button"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => printDialysisSessionReport({
                            center: center || undefined,
                            patient: {
                              dialysisPatientId: patient?.dialysisPatientId,
                              mrn: patient?.mrn || lp.mrn,
                              fullName: lp.fullName,
                              fatherName: lp.fatherName,
                              phone: lp.phoneNormalized || lp.phone,
                              cnic: lp.cnicNormalized || lp.cnic,
                              gender: lp.gender,
                              age: lp.age,
                              address: lp.address,
                            },
                            session: s,
                          })}
                          className="rounded-md bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-700"
                          type="button"
                        >
                          Print
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

function Info({ label, value }: { label: string; value: any }) {
  return (
    <div>
      <div className="text-xs font-medium text-slate-600">{label}</div>
      <div className="mt-0.5 text-sm font-semibold text-slate-800">{String(value ?? '') || '—'}</div>
    </div>
  )
}

function Field({ label, value, onChange, type }: { label: string; value: string; onChange: (v: string) => void; type?: string }) {
  return (
    <div className="space-y-1">
      <div className="text-xs font-medium text-slate-600">{label}</div>
      <input
        type={type || 'text'}
        value={value}
        onChange={e => onChange(e.target.value)}
        className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
      />
    </div>
  )
}
