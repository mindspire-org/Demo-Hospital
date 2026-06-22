// Reusable controlled field primitives shared by the department-specific
// clinical forms (cardiac, breast-onco, omfs, neuro). Defined at module scope so
// inputs keep their identity across renders (no focus loss while typing).

import type { ReactNode } from 'react'

const inputCls =
  'w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-800 outline-none transition-all focus:border-sky-400 focus:bg-white focus:ring-2 focus:ring-sky-400/20 disabled:opacity-60'

export function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <div className="group">
      <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-slate-500">{label}{hint && <span className="ml-1 normal-case text-[10px] font-normal text-slate-400">{hint}</span>}</label>
      {children}
    </div>
  )
}

export function TextInput({ value, onChange, placeholder, disabled }: { value?: string; onChange: (v: string) => void; placeholder?: string; disabled?: boolean }) {
  return <input type="text" disabled={disabled} value={value || ''} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className={inputCls} />
}

export function TextArea({ value, onChange, placeholder, rows = 3, disabled }: { value?: string; onChange: (v: string) => void; placeholder?: string; rows?: number; disabled?: boolean }) {
  return <textarea rows={rows} disabled={disabled} value={value || ''} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className={inputCls} />
}

export function Select({ value, onChange, options, disabled, placeholder }: { value?: string; onChange: (v: string) => void; options: string[]; disabled?: boolean; placeholder?: string }) {
  return (
    <select disabled={disabled} value={value || ''} onChange={(e) => onChange(e.target.value)} className={inputCls}>
      <option value="">{placeholder || '—'}</option>
      {options.map((o) => <option key={o} value={o}>{o}</option>)}
    </select>
  )
}

export function LabeledField({ label, value, onChange, placeholder, hint, disabled }: { label: string; value?: string; onChange: (v: string) => void; placeholder?: string; hint?: string; disabled?: boolean }) {
  return <Field label={label} hint={hint}><TextInput value={value} onChange={onChange} placeholder={placeholder} disabled={disabled} /></Field>
}

export function LabeledArea({ label, value, onChange, placeholder, rows, hint, disabled }: { label: string; value?: string; onChange: (v: string) => void; placeholder?: string; rows?: number; hint?: string; disabled?: boolean }) {
  return <Field label={label} hint={hint}><TextArea value={value} onChange={onChange} placeholder={placeholder} rows={rows} disabled={disabled} /></Field>
}

// Two-column Right/Left pair used heavily in eye/neuro/cardiac forms.
export function RightLeftPair({ label, rightValue, leftValue, onRight, onLeft, placeholder, rightLabel = 'Right', leftLabel = 'Left', disabled }: {
  label: string; rightValue?: string; leftValue?: string; onRight: (v: string) => void; onLeft: (v: string) => void; placeholder?: string; rightLabel?: string; leftLabel?: string; disabled?: boolean
}) {
  return (
    <Field label={label}>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <span className="mb-0.5 block text-[10px] font-medium text-slate-400">{rightLabel}</span>
          <TextInput value={rightValue} onChange={onRight} placeholder={placeholder} disabled={disabled} />
        </div>
        <div>
          <span className="mb-0.5 block text-[10px] font-medium text-slate-400">{leftLabel}</span>
          <TextInput value={leftValue} onChange={onLeft} placeholder={placeholder} disabled={disabled} />
        </div>
      </div>
    </Field>
  )
}

// Toggleable chip multi-select stored as string[].
export function ChipMulti({ label, options, selected, onChange, disabled }: { label: string; options: string[]; selected?: string[]; onChange: (next: string[]) => void; disabled?: boolean }) {
  const set = new Set(selected || [])
  const toggle = (o: string) => {
    if (disabled) return
    const next = new Set(set)
    next.has(o) ? next.delete(o) : next.add(o)
    onChange(Array.from(next))
  }
  return (
    <Field label={label}>
      <div className="flex flex-wrap gap-1.5">
        {options.map((o) => {
          const on = set.has(o)
          return (
            <button key={o} type="button" onClick={() => toggle(o)} className={`rounded-md border px-2.5 py-1 text-[11px] transition ${on ? 'border-slate-900 bg-slate-900 text-white' : 'border-slate-200 bg-white text-slate-600 hover:border-slate-900'}`}>{o}</button>
          )
        })}
      </div>
    </Field>
  )
}
