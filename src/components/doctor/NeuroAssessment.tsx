// Neurology clinical assessment for the doctor prescription page. Controlled
// component — parent owns the value and receives updates via onChange.

import { Field, LabeledField, LabeledArea, Select } from './departmentFields'

export type NeuroValue = {
  gcsEye?: string
  gcsVerbal?: string
  gcsMotor?: string
  cranialNerves?: string
  powerRUL?: string
  powerLUL?: string
  powerRLL?: string
  powerLLL?: string
  sensory?: string
  reflexes?: string
  gait?: string
  coordination?: string
  nihss?: string
  mmse?: string
  seizure?: string
  imaging?: string
  diagnosis?: string
  generalNotes?: string
}

export function emptyNeuro(): NeuroValue {
  return { gcsEye: '', gcsVerbal: '', gcsMotor: '', cranialNerves: '', powerRUL: '', powerLUL: '', powerRLL: '', powerLLL: '', sensory: '', reflexes: '', gait: '', coordination: '', nihss: '', mmse: '', seizure: '', imaging: '', diagnosis: '', generalNotes: '' }
}

const POWER = ['0', '1', '2', '3', '4', '5']

function gcsTotal(v: NeuroValue): string {
  const e = Number(v.gcsEye), vb = Number(v.gcsVerbal), m = Number(v.gcsMotor)
  if (!e || !vb || !m) return ''
  return String(e + vb + m)
}

export default function NeuroAssessment({ value, onChange, readOnly = false }: { value: NeuroValue; onChange?: (v: NeuroValue) => void; readOnly?: boolean }) {
  const v = value || {}
  const set = (patch: Partial<NeuroValue>) => onChange?.({ ...v, ...patch })
  const total = gcsTotal(v)
  return (
    <div className="space-y-5">
      <div>
        <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500">Glasgow Coma Scale {total && <span className="ml-2 rounded-full bg-indigo-100 px-2 py-0.5 text-[11px] font-bold text-indigo-700">GCS {total}/15</span>}</div>
        <div className="grid grid-cols-3 gap-3">
          <Field label="Eye (E)"><Select value={v.gcsEye} onChange={(x) => set({ gcsEye: x })} options={['1', '2', '3', '4']} disabled={readOnly} /></Field>
          <Field label="Verbal (V)"><Select value={v.gcsVerbal} onChange={(x) => set({ gcsVerbal: x })} options={['1', '2', '3', '4', '5']} disabled={readOnly} /></Field>
          <Field label="Motor (M)"><Select value={v.gcsMotor} onChange={(x) => set({ gcsMotor: x })} options={['1', '2', '3', '4', '5', '6']} disabled={readOnly} /></Field>
        </div>
      </div>

      <LabeledArea label="Cranial Nerves (I–XII)" value={v.cranialNerves} onChange={(x) => set({ cranialNerves: x })} placeholder="Findings / deficits..." rows={2} disabled={readOnly} />

      <div>
        <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500">Motor Power (0–5)</div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Field label="Right Upper"><Select value={v.powerRUL} onChange={(x) => set({ powerRUL: x })} options={POWER} disabled={readOnly} /></Field>
          <Field label="Left Upper"><Select value={v.powerLUL} onChange={(x) => set({ powerLUL: x })} options={POWER} disabled={readOnly} /></Field>
          <Field label="Right Lower"><Select value={v.powerRLL} onChange={(x) => set({ powerRLL: x })} options={POWER} disabled={readOnly} /></Field>
          <Field label="Left Lower"><Select value={v.powerLLL} onChange={(x) => set({ powerLLL: x })} options={POWER} disabled={readOnly} /></Field>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <LabeledField label="Sensory" value={v.sensory} onChange={(x) => set({ sensory: x })} placeholder="Intact / level / deficit" disabled={readOnly} />
        <LabeledField label="Reflexes" value={v.reflexes} onChange={(x) => set({ reflexes: x })} placeholder="DTRs, plantars" disabled={readOnly} />
        <LabeledField label="Gait" value={v.gait} onChange={(x) => set({ gait: x })} placeholder="Normal / ataxic / hemiplegic" disabled={readOnly} />
        <LabeledField label="Coordination" value={v.coordination} onChange={(x) => set({ coordination: x })} placeholder="Finger-nose, heel-shin" disabled={readOnly} />
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <LabeledField label="NIHSS" hint="stroke" value={v.nihss} onChange={(x) => set({ nihss: x })} placeholder="Score / notes" disabled={readOnly} />
        <LabeledField label="MMSE" hint="/30" value={v.mmse} onChange={(x) => set({ mmse: x })} placeholder="e.g. 28/30" disabled={readOnly} />
        <LabeledField label="Seizure" value={v.seizure} onChange={(x) => set({ seizure: x })} placeholder="Type / frequency / semiology" disabled={readOnly} />
      </div>

      <LabeledArea label="Imaging (MRI / CT)" value={v.imaging} onChange={(x) => set({ imaging: x })} placeholder="Findings..." rows={2} disabled={readOnly} />
      <LabeledField label="Diagnosis" value={v.diagnosis} onChange={(x) => set({ diagnosis: x })} placeholder="e.g. Ischemic stroke, Epilepsy, Migraine, Parkinson's" disabled={readOnly} />
      <LabeledArea label="General Neurology Notes" value={v.generalNotes} onChange={(x) => set({ generalNotes: x })} placeholder="Plan, advice, follow-up..." disabled={readOnly} />
    </div>
  )
}

export function neuroSections(v: NeuroValue) {
  const sections: any[] = []
  const kv: [string, string][] = []
  const total = gcsTotal(v)
  if (total) kv.push(['GCS', `${total}/15 (E${v.gcsEye} V${v.gcsVerbal} M${v.gcsMotor})`])
  if (v.nihss) kv.push(['NIHSS', v.nihss])
  if (v.mmse) kv.push(['MMSE', v.mmse])
  const power = [v.powerRUL, v.powerLUL, v.powerRLL, v.powerLLL].some(Boolean)
    ? `RUL ${v.powerRUL || '-'} / LUL ${v.powerLUL || '-'} / RLL ${v.powerRLL || '-'} / LLL ${v.powerLLL || '-'}` : ''
  if (power) kv.push(['Motor Power', power])
  if (v.sensory) kv.push(['Sensory', v.sensory])
  if (v.reflexes) kv.push(['Reflexes', v.reflexes])
  if (v.gait) kv.push(['Gait', v.gait])
  if (v.coordination) kv.push(['Coordination', v.coordination])
  if (kv.length) sections.push({ title: 'Neurological Examination', type: 'kv', kv })
  if (v.cranialNerves) sections.push({ title: 'Cranial Nerves', type: 'text', text: v.cranialNerves })
  if (v.seizure) sections.push({ title: 'Seizure', type: 'text', text: v.seizure })
  if (v.imaging) sections.push({ title: 'Imaging (MRI/CT)', type: 'text', text: v.imaging })
  if (v.diagnosis) sections.push({ title: 'Diagnosis', type: 'text', text: v.diagnosis })
  if (v.generalNotes) sections.push({ title: 'Notes', type: 'text', text: v.generalNotes })
  return sections
}
