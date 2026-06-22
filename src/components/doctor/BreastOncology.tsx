// Breast oncology clinical assessment for the doctor prescription page. Includes
// an interactive breast-quadrant diagram for lump marking, TNM / BI-RADS staging,
// receptor status and chemotherapy cycle tracking. Controlled component.

import { Field, LabeledField, LabeledArea, TextInput, Select } from './departmentFields'

export type BreastLump = { side: 'right' | 'left'; quadrant: string; size?: string; clock?: string; notes?: string }

export type BreastOncoValue = {
  lumps?: BreastLump[]
  tnmT?: string
  tnmN?: string
  tnmM?: string
  stage?: string
  birads?: string
  er?: string
  pr?: string
  her2?: string
  ki67?: string
  histopathology?: string
  imaging?: string
  chemoRegimen?: string
  chemoCycleCurrent?: string
  chemoCycleTotal?: string
  chemoLastDate?: string
  chemoNextDate?: string
  diagnosis?: string
  generalNotes?: string
}

export function emptyBreastOnco(): BreastOncoValue {
  return { lumps: [], tnmT: '', tnmN: '', tnmM: '', stage: '', birads: '', er: '', pr: '', her2: '', ki67: '', histopathology: '', imaging: '', chemoRegimen: '', chemoCycleCurrent: '', chemoCycleTotal: '', chemoLastDate: '', chemoNextDate: '', diagnosis: '', generalNotes: '' }
}

const QUADRANTS = [
  { id: 'UOQ', label: 'Upper Outer' },
  { id: 'UIQ', label: 'Upper Inner' },
  { id: 'LOQ', label: 'Lower Outer' },
  { id: 'LIQ', label: 'Lower Inner' },
]

// For the right breast the outer quadrants sit on the patient's right (screen
// left); mirrored for the left breast, so the grids read anatomically.
const RIGHT_ORDER = ['UOQ', 'UIQ', 'LOQ', 'LIQ']
const LEFT_ORDER = ['UIQ', 'UOQ', 'LIQ', 'LOQ']

export default function BreastOncology({ value, onChange, readOnly = false }: { value: BreastOncoValue; onChange?: (v: BreastOncoValue) => void; readOnly?: boolean }) {
  const v = value || {}
  const lumps = v.lumps || []
  const set = (patch: Partial<BreastOncoValue>) => onChange?.({ ...v, ...patch })
  const setLumps = (next: BreastLump[]) => set({ lumps: next })

  const countAt = (side: 'right' | 'left', quadrant: string) => lumps.filter(l => l.side === side && l.quadrant === quadrant).length
  const addLump = (side: 'right' | 'left', quadrant: string) => { if (!readOnly) setLumps([...lumps, { side, quadrant, size: '', clock: '', notes: '' }]) }
  const updateLump = (idx: number, patch: Partial<BreastLump>) => setLumps(lumps.map((l, i) => (i === idx ? { ...l, ...patch } : l)))
  const removeLump = (idx: number) => setLumps(lumps.filter((_, i) => i !== idx))

  const Breast = ({ side, order }: { side: 'right' | 'left'; order: string[] }) => (
    <div className="flex flex-col items-center">
      <div className="mb-1.5 text-[11px] font-semibold text-slate-500">{side === 'right' ? 'Right Breast' : 'Left Breast'}</div>
      <div className="relative grid h-32 w-32 grid-cols-2 grid-rows-2 overflow-hidden rounded-full border-2 border-slate-300 bg-rose-50/40">
        {order.map((q) => {
          const n = countAt(side, q)
          return (
            <button
              key={q}
              type="button"
              disabled={readOnly}
              onClick={() => addLump(side, q)}
              title={`${QUADRANTS.find(x => x.id === q)?.label} — click to mark a lump`}
              className={`flex items-center justify-center border border-rose-200/70 text-[10px] font-semibold transition ${n ? 'bg-rose-400 text-white' : 'text-rose-400/70 hover:bg-rose-100'}`}
            >
              {q}{n > 0 ? ` (${n})` : ''}
            </button>
          )
        })}
        <span className="pointer-events-none absolute left-1/2 top-1/2 h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-rose-300" />
      </div>
    </div>
  )

  return (
    <div className="space-y-5">
      <div>
        <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500">Lump Location — click a quadrant to mark</div>
        <div className="flex items-start justify-center gap-8 rounded-xl border border-slate-200 bg-white p-4">
          <Breast side="right" order={RIGHT_ORDER} />
          <Breast side="left" order={LEFT_ORDER} />
        </div>
      </div>

      {lumps.length > 0 && (
        <div className="space-y-2">
          <div className="text-xs font-semibold uppercase tracking-wider text-slate-500">Marked Lumps</div>
          {lumps.map((l, i) => (
            <div key={i} className="flex flex-wrap items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 p-2">
              <span className="rounded-md bg-rose-100 px-2 py-1 text-[11px] font-semibold text-rose-700">{l.side === 'right' ? 'R' : 'L'} · {l.quadrant}</span>
              <input type="text" disabled={readOnly} value={l.size || ''} onChange={(e) => updateLump(i, { size: e.target.value })} placeholder="Size (cm)" className="w-24 rounded-md border border-slate-200 bg-white px-2 py-1 text-xs outline-none focus:border-sky-400" />
              <input type="text" disabled={readOnly} value={l.clock || ''} onChange={(e) => updateLump(i, { clock: e.target.value })} placeholder="Clock (e.g. 2 o'clock)" className="w-32 rounded-md border border-slate-200 bg-white px-2 py-1 text-xs outline-none focus:border-sky-400" />
              <input type="text" disabled={readOnly} value={l.notes || ''} onChange={(e) => updateLump(i, { notes: e.target.value })} placeholder="Notes (mobility, consistency...)" className="min-w-[10rem] flex-1 rounded-md border border-slate-200 bg-white px-2 py-1 text-xs outline-none focus:border-sky-400" />
              {!readOnly && <button type="button" onClick={() => removeLump(i)} className="rounded-md px-2 py-1 text-xs text-rose-500 hover:bg-rose-50">Remove</button>}
            </div>
          ))}
        </div>
      )}

      <div>
        <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500">Staging</div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
          <Field label="T"><TextInput value={v.tnmT} onChange={(x) => set({ tnmT: x })} placeholder="T1-4" disabled={readOnly} /></Field>
          <Field label="N"><TextInput value={v.tnmN} onChange={(x) => set({ tnmN: x })} placeholder="N0-3" disabled={readOnly} /></Field>
          <Field label="M"><TextInput value={v.tnmM} onChange={(x) => set({ tnmM: x })} placeholder="M0-1" disabled={readOnly} /></Field>
          <Field label="Stage"><Select value={v.stage} onChange={(x) => set({ stage: x })} options={['0', 'I', 'IIA', 'IIB', 'IIIA', 'IIIB', 'IIIC', 'IV']} disabled={readOnly} /></Field>
          <Field label="BI-RADS"><Select value={v.birads} onChange={(x) => set({ birads: x })} options={['0', '1', '2', '3', '4', '5', '6']} disabled={readOnly} /></Field>
        </div>
      </div>

      <div>
        <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500">Receptor Status</div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Field label="ER"><TextInput value={v.er} onChange={(x) => set({ er: x })} placeholder="+ / − / %" disabled={readOnly} /></Field>
          <Field label="PR"><TextInput value={v.pr} onChange={(x) => set({ pr: x })} placeholder="+ / − / %" disabled={readOnly} /></Field>
          <Field label="HER2"><TextInput value={v.her2} onChange={(x) => set({ her2: x })} placeholder="0 / 1+ / 2+ / 3+" disabled={readOnly} /></Field>
          <Field label="Ki-67"><TextInput value={v.ki67} onChange={(x) => set({ ki67: x })} placeholder="%" disabled={readOnly} /></Field>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <LabeledArea label="Histopathology" value={v.histopathology} onChange={(x) => set({ histopathology: x })} placeholder="Type, grade, margins, LVI..." rows={2} disabled={readOnly} />
        <LabeledArea label="Imaging (Mammogram / USG)" value={v.imaging} onChange={(x) => set({ imaging: x })} placeholder="Findings..." rows={2} disabled={readOnly} />
      </div>

      <div>
        <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500">Chemotherapy</div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <Field label="Regimen"><TextInput value={v.chemoRegimen} onChange={(x) => set({ chemoRegimen: x })} placeholder="e.g. AC-T" disabled={readOnly} /></Field>
          <Field label="Cycle" hint="current"><TextInput value={v.chemoCycleCurrent} onChange={(x) => set({ chemoCycleCurrent: x })} placeholder="e.g. 2" disabled={readOnly} /></Field>
          <Field label="Of total"><TextInput value={v.chemoCycleTotal} onChange={(x) => set({ chemoCycleTotal: x })} placeholder="e.g. 6" disabled={readOnly} /></Field>
          <Field label="Last Cycle"><input type="date" disabled={readOnly} value={v.chemoLastDate || ''} onChange={(e) => set({ chemoLastDate: e.target.value })} className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-sky-400 focus:bg-white" /></Field>
          <Field label="Next Cycle"><input type="date" disabled={readOnly} value={v.chemoNextDate || ''} onChange={(e) => set({ chemoNextDate: e.target.value })} className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-sky-400 focus:bg-white" /></Field>
        </div>
      </div>

      <LabeledField label="Diagnosis" value={v.diagnosis} onChange={(x) => set({ diagnosis: x })} placeholder="e.g. Invasive ductal carcinoma, left breast" disabled={readOnly} />
      <LabeledArea label="General Notes" value={v.generalNotes} onChange={(x) => set({ generalNotes: x })} placeholder="Plan, MDT decision, advice, follow-up..." disabled={readOnly} />
    </div>
  )
}

export function breastOncoSections(v: BreastOncoValue) {
  const sections: any[] = []
  const lumps = v.lumps || []
  if (lumps.length) {
    sections.push({
      title: 'Lump Findings',
      type: 'table',
      table: {
        headers: ['Side', 'Quadrant', 'Size', 'Clock', 'Notes'],
        rows: lumps.map((l) => [l.side === 'right' ? 'Right' : 'Left', l.quadrant, l.size || '', l.clock || '', l.notes || '']),
      },
    })
  }
  const kv: [string, string][] = []
  const tnm = [v.tnmT, v.tnmN, v.tnmM].some(Boolean) ? `${v.tnmT || ''}${v.tnmN || ''}${v.tnmM || ''}` : ''
  if (tnm) kv.push(['TNM', tnm])
  if (v.stage) kv.push(['Stage', v.stage])
  if (v.birads) kv.push(['BI-RADS', v.birads])
  const receptors = [v.er && `ER ${v.er}`, v.pr && `PR ${v.pr}`, v.her2 && `HER2 ${v.her2}`, v.ki67 && `Ki-67 ${v.ki67}`].filter(Boolean).join(', ')
  if (receptors) kv.push(['Receptors', receptors])
  const chemo = v.chemoRegimen || v.chemoCycleCurrent
    ? `${v.chemoRegimen || ''}${v.chemoCycleCurrent ? ` · cycle ${v.chemoCycleCurrent}${v.chemoCycleTotal ? `/${v.chemoCycleTotal}` : ''}` : ''}${v.chemoNextDate ? ` · next ${v.chemoNextDate}` : ''}` : ''
  if (chemo) kv.push(['Chemotherapy', chemo])
  if (kv.length) sections.push({ title: 'Staging & Treatment', type: 'kv', kv })
  if (v.histopathology) sections.push({ title: 'Histopathology', type: 'text', text: v.histopathology })
  if (v.imaging) sections.push({ title: 'Imaging', type: 'text', text: v.imaging })
  if (v.diagnosis) sections.push({ title: 'Diagnosis', type: 'text', text: v.diagnosis })
  if (v.generalNotes) sections.push({ title: 'Notes', type: 'text', text: v.generalNotes })
  return sections
}
