// Oral & Maxillofacial Surgery clinical assessment. Reuses the interactive
// DentalChart and adds maxillofacial-specific examination fields. Controlled
// component — parent owns the value and receives updates via onChange.

import DentalChart, { type DentalChartValue } from './DentalChart'
import { Field, LabeledField, LabeledArea, TextInput } from './departmentFields'

export type OmfsValue = {
  dentalChart?: DentalChartValue
  facialSwelling?: string
  tmj?: string
  mouthOpening?: string
  occlusion?: string
  fractureSites?: string
  softTissue?: string
  surgicalPlan?: string
  diagnosis?: string
  generalNotes?: string
}

export function emptyOmfs(): OmfsValue {
  return { dentalChart: { teeth: [], generalNotes: '' }, facialSwelling: '', tmj: '', mouthOpening: '', occlusion: '', fractureSites: '', softTissue: '', surgicalPlan: '', diagnosis: '', generalNotes: '' }
}

export default function OmfsAssessment({ value, onChange, readOnly = false }: { value: OmfsValue; onChange?: (v: OmfsValue) => void; readOnly?: boolean }) {
  const v = value || {}
  const set = (patch: Partial<OmfsValue>) => onChange?.({ ...v, ...patch })
  return (
    <div className="space-y-5">
      <div>
        <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500">Tooth Chart</div>
        <DentalChart value={v.dentalChart || { teeth: [], generalNotes: '' }} onChange={(dentalChart) => set({ dentalChart })} readOnly={readOnly} />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <LabeledField label="Facial Swelling" value={v.facialSwelling} onChange={(x) => set({ facialSwelling: x })} placeholder="Site / extent" disabled={readOnly} />
        <LabeledField label="TMJ" value={v.tmj} onChange={(x) => set({ tmj: x })} placeholder="Clicking / deviation / pain" disabled={readOnly} />
        <Field label="Mouth Opening" hint="mm (trismus)"><TextInput value={v.mouthOpening} onChange={(x) => set({ mouthOpening: x })} placeholder="e.g. 35" disabled={readOnly} /></Field>
        <LabeledField label="Occlusion" value={v.occlusion} onChange={(x) => set({ occlusion: x })} placeholder="Class / derangement" disabled={readOnly} />
        <LabeledField label="Fracture Sites" value={v.fractureSites} onChange={(x) => set({ fractureSites: x })} placeholder="Mandible / maxilla / zygoma..." disabled={readOnly} />
        <LabeledField label="Soft Tissue" value={v.softTissue} onChange={(x) => set({ softTissue: x })} placeholder="Lacerations / ulcers / lesions" disabled={readOnly} />
      </div>

      <LabeledArea label="Surgical Plan" value={v.surgicalPlan} onChange={(x) => set({ surgicalPlan: x })} placeholder="Procedure, approach, anesthesia, consent..." disabled={readOnly} />
      <LabeledField label="Diagnosis" value={v.diagnosis} onChange={(x) => set({ diagnosis: x })} placeholder="e.g. Impacted 3rd molar, Mandibular fracture, Cyst" disabled={readOnly} />
      <LabeledArea label="General OMFS Notes" value={v.generalNotes} onChange={(x) => set({ generalNotes: x })} placeholder="Advice, follow-up..." disabled={readOnly} />
    </div>
  )
}

export function omfsSections(v: OmfsValue) {
  const sections: any[] = []
  const teeth = v.dentalChart?.teeth || []
  if (teeth.length) {
    sections.push({
      title: 'Dental Chart',
      type: 'table',
      table: {
        headers: ['Tooth', 'Condition', 'Notes'],
        rows: [...teeth].sort((a, b) => Number(a.toothId) - Number(b.toothId)).map((t) => [String(t.toothId), String(t.condition), String(t.notes || '')]),
      },
    })
  }
  const kv: [string, string][] = []
  if (v.facialSwelling) kv.push(['Facial Swelling', v.facialSwelling])
  if (v.tmj) kv.push(['TMJ', v.tmj])
  if (v.mouthOpening) kv.push(['Mouth Opening', `${v.mouthOpening} mm`])
  if (v.occlusion) kv.push(['Occlusion', v.occlusion])
  if (v.fractureSites) kv.push(['Fracture Sites', v.fractureSites])
  if (v.softTissue) kv.push(['Soft Tissue', v.softTissue])
  if (kv.length) sections.push({ title: 'Maxillofacial Examination', type: 'kv', kv })
  if (v.surgicalPlan) sections.push({ title: 'Surgical Plan', type: 'text', text: v.surgicalPlan })
  if (v.diagnosis) sections.push({ title: 'Diagnosis', type: 'text', text: v.diagnosis })
  if (v.dentalChart?.generalNotes) sections.push({ title: 'Dental Notes', type: 'text', text: v.dentalChart.generalNotes })
  if (v.generalNotes) sections.push({ title: 'Notes', type: 'text', text: v.generalNotes })
  return sections
}
