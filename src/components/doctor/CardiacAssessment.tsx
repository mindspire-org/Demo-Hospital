// Cardiology clinical assessment for the doctor prescription page. Controlled
// component — parent owns the value and receives updates via onChange.

import { Field, LabeledField, LabeledArea, TextInput, Select, ChipMulti } from './departmentFields'

export type CardiacValue = {
  chestPain?: string
  nyhaClass?: string
  ecg?: string
  echoEf?: string
  echoValves?: string
  echoChambers?: string
  echoRwma?: string
  riskFactors?: string[]
  troponin?: string
  bnp?: string
  lipidProfile?: string
  angiography?: string
  diagnosis?: string
  generalNotes?: string
}

export function emptyCardiac(): CardiacValue {
  return { chestPain: '', nyhaClass: '', ecg: '', echoEf: '', echoValves: '', echoChambers: '', echoRwma: '', riskFactors: [], troponin: '', bnp: '', lipidProfile: '', angiography: '', diagnosis: '', generalNotes: '' }
}

const RISK_FACTORS = ['Hypertension', 'Diabetes', 'Smoking', 'Dyslipidemia', 'Family History', 'Obesity', 'Sedentary', 'Prior MI']

export default function CardiacAssessment({ value, onChange, readOnly = false }: { value: CardiacValue; onChange?: (v: CardiacValue) => void; readOnly?: boolean }) {
  const v = value || {}
  const set = (patch: Partial<CardiacValue>) => onChange?.({ ...v, ...patch })
  return (
    <div className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <LabeledField label="Chest Pain" value={v.chestPain} onChange={(x) => set({ chestPain: x })} placeholder="Typical / Atypical / Non-cardiac" disabled={readOnly} />
        <Field label="NYHA Functional Class"><Select value={v.nyhaClass} onChange={(x) => set({ nyhaClass: x })} options={['I', 'II', 'III', 'IV']} disabled={readOnly} placeholder="Select class" /></Field>
        <LabeledField label="Troponin" value={v.troponin} onChange={(x) => set({ troponin: x })} placeholder="e.g. <0.01 ng/mL" disabled={readOnly} />
      </div>

      <LabeledArea label="ECG Interpretation" value={v.ecg} onChange={(x) => set({ ecg: x })} placeholder="Rate, rhythm, axis, ST/T changes, conduction..." disabled={readOnly} />

      <div>
        <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500">Echocardiography</div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Field label="Ejection Fraction" hint="%"><TextInput value={v.echoEf} onChange={(x) => set({ echoEf: x })} placeholder="e.g. 55" disabled={readOnly} /></Field>
          <Field label="Valves"><TextInput value={v.echoValves} onChange={(x) => set({ echoValves: x })} placeholder="MR/AS/..." disabled={readOnly} /></Field>
          <Field label="Chambers"><TextInput value={v.echoChambers} onChange={(x) => set({ echoChambers: x })} placeholder="LVH / dilated..." disabled={readOnly} /></Field>
          <Field label="RWMA"><TextInput value={v.echoRwma} onChange={(x) => set({ echoRwma: x })} placeholder="Regional wall motion" disabled={readOnly} /></Field>
        </div>
      </div>

      <ChipMulti label="Cardiac Risk Factors" options={RISK_FACTORS} selected={v.riskFactors} onChange={(x) => set({ riskFactors: x })} disabled={readOnly} />

      <div className="grid gap-4 sm:grid-cols-2">
        <LabeledField label="BNP / NT-proBNP" value={v.bnp} onChange={(x) => set({ bnp: x })} placeholder="e.g. 120 pg/mL" disabled={readOnly} />
        <LabeledField label="Lipid Profile" value={v.lipidProfile} onChange={(x) => set({ lipidProfile: x })} placeholder="TC / LDL / HDL / TG" disabled={readOnly} />
      </div>

      <LabeledArea label="Angiography / Cath Findings" value={v.angiography} onChange={(x) => set({ angiography: x })} placeholder="Coronary anatomy, lesions, intervention..." disabled={readOnly} />
      <LabeledField label="Diagnosis" value={v.diagnosis} onChange={(x) => set({ diagnosis: x })} placeholder="e.g. IHD, CCF, Arrhythmia, Valvular disease" disabled={readOnly} />
      <LabeledArea label="General Cardiac Notes" value={v.generalNotes} onChange={(x) => set({ generalNotes: x })} placeholder="Plan, advice, follow-up..." disabled={readOnly} />
    </div>
  )
}

// Generic section descriptor for PDF/print rendering.
export function cardiacSections(v: CardiacValue) {
  const kv: [string, string][] = []
  if (v.chestPain) kv.push(['Chest Pain', v.chestPain])
  if (v.nyhaClass) kv.push(['NYHA Class', v.nyhaClass])
  if (v.troponin) kv.push(['Troponin', v.troponin])
  if (v.bnp) kv.push(['BNP', v.bnp])
  if (v.lipidProfile) kv.push(['Lipid Profile', v.lipidProfile])
  const echo: [string, string][] = []
  if (v.echoEf) echo.push(['Ejection Fraction', `${v.echoEf}%`])
  if (v.echoValves) echo.push(['Valves', v.echoValves])
  if (v.echoChambers) echo.push(['Chambers', v.echoChambers])
  if (v.echoRwma) echo.push(['RWMA', v.echoRwma])
  const sections: any[] = []
  if (kv.length) sections.push({ title: 'Cardiac Assessment', type: 'kv', kv })
  if (echo.length) sections.push({ title: 'Echocardiography', type: 'kv', kv: echo })
  if (v.riskFactors?.length) sections.push({ title: 'Risk Factors', type: 'text', text: v.riskFactors.join(', ') })
  if (v.ecg) sections.push({ title: 'ECG', type: 'text', text: v.ecg })
  if (v.angiography) sections.push({ title: 'Angiography', type: 'text', text: v.angiography })
  if (v.diagnosis) sections.push({ title: 'Diagnosis', type: 'text', text: v.diagnosis })
  if (v.generalNotes) sections.push({ title: 'Notes', type: 'text', text: v.generalNotes })
  return sections
}
