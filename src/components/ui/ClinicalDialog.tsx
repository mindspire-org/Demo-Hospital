import React, { useRef, useState } from 'react'
import { Calendar, Clock } from 'lucide-react'

export const clinicalInp = 'w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none transition-shadow focus:border-sky-400 focus:ring-2 focus:ring-sky-100'
export const clinicalLbl = 'mb-1.5 block text-xs font-semibold tracking-wide text-slate-500 uppercase'

/**
 * Modern clinical date/time picker with calendar icon, gradient accent bar,
 * and smooth focus transitions. Replaces bare datetime-local / date inputs.
 *
 * Usage:
 *   <ClinicalDatePicker label="Date/Time" value={form.when} onChange={v => setForm({...form, when:v})} />
 *   <ClinicalDatePicker label="Date" type="date" value={form.date} onChange={v => setForm({...form, date:v})} />
 */
export function ClinicalDatePicker({
  label,
  value,
  onChange,
  type = 'datetime-local',
  placeholder,
  className = '',
}: {
  label?: string
  value: string
  onChange: (v: string) => void
  type?: 'datetime-local' | 'date' | 'time'
  placeholder?: string
  className?: string
}) {
  const ref = useRef<HTMLInputElement>(null)
  const [focused, setFocused] = useState(false)

  const Icon = type === 'time' ? Clock : Calendar

  return (
    <div className={className}>
      {label && <label className={clinicalLbl}>{label}</label>}
      <div
        className={`group relative flex items-center rounded-xl border transition-all duration-200 ${
          focused
            ? 'border-sky-400 ring-2 ring-sky-100 shadow-sm shadow-sky-100/50'
            : 'border-slate-200 hover:border-slate-300'
        } bg-white overflow-hidden`}
        onClick={() => ref.current?.showPicker?.()}
      >
        {/* Left icon accent */}
        <div className={`flex h-full items-center justify-center px-3 transition-colors duration-200 ${
          focused ? 'bg-sky-50 text-sky-500' : 'bg-slate-50 text-slate-400 group-hover:bg-slate-100 group-hover:text-slate-500'
        }`}>
          <Icon className="h-4 w-4" />
        </div>

        {/* Accent bar */}
        <div className={`w-0.5 self-stretch transition-colors duration-200 ${focused ? 'bg-sky-400' : 'bg-slate-200'}`} />

        {/* Native input — fully styled to be invisible chrome, we control the shell */}
        <input
          ref={ref}
          type={type}
          value={value}
          placeholder={placeholder}
          onChange={e => onChange(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          className="w-full min-w-0 bg-transparent px-3 py-2.5 text-sm font-medium text-slate-900 outline-none placeholder:text-slate-300 [color-scheme:light] [::-webkit-calendar-picker-indicator]:opacity-0 [::-webkit-calendar-picker-indicator]:absolute [::-webkit-calendar-picker-indicator]:w-full [::-webkit-calendar-picker-indicator]:h-full [::-webkit-calendar-picker-indicator]:cursor-pointer"
        />

        {/* Formatted display hint when empty */}
        {!value && (
          <div className="pointer-events-none absolute left-10 px-3 py-2.5 text-sm text-slate-300">
            {placeholder || (type === 'datetime-local' ? 'Select date & time' : type === 'date' ? 'Select date' : 'Select time')}
          </div>
        )}
      </div>
    </div>
  )
}

export function ClinicalDialogShell({
  open,
  title,
  subtitle,
  icon: Icon,
  onClose,
  onSubmit,
  submitText = 'Save',
  maxWidth = 'max-w-3xl',
  children,
}: {
  open: boolean
  title: string
  subtitle?: string
  icon?: any
  onClose: () => void
  onSubmit: (e: React.FormEvent) => void
  submitText?: string
  maxWidth?: string
  children: React.ReactNode
}) {
  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className={`w-full ${maxWidth} max-h-[90vh] flex flex-col rounded-2xl border border-slate-200 bg-white shadow-xl`}>
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3">
          <div className="flex items-center gap-3">
            {Icon && (
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-900 text-white">
                <Icon className="h-4 w-4" />
              </div>
            )}
            <div>
              <div className="text-sm font-bold text-slate-900">{title}</div>
              {subtitle && <div className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">{subtitle}</div>}
            </div>
          </div>
          <button type="button" onClick={onClose} className="rounded-lg px-2 py-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition text-lg leading-none">&times;</button>
        </div>
        <form onSubmit={onSubmit} className="flex-1 overflow-y-auto p-5">
          {children}
          <div className="mt-4 flex items-center justify-end gap-2">
            <button type="button" onClick={onClose} className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50">Cancel</button>
            <button type="submit" className="rounded-lg bg-slate-900 px-3 py-2 text-xs font-bold text-white hover:bg-slate-800">{submitText}</button>
          </div>
        </form>
      </div>
    </div>
  )
}
