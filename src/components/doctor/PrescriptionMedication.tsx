import { forwardRef, useState, useImperativeHandle, useEffect, useCallback, useMemo, useRef } from 'react'
import { pharmacyApi } from '../../utils/api'
import SuggestField from '../SuggestField'
import { getPrescriptionOptions, type PrescriptionLanguage } from '../../utils/prescriptionUrdu'

export interface MedicineRow {
  name: string
  genericName?: string
  company?: string
  qty?: string
  route?: string
  instruction?: string
  notes?: string
  durationText?: string
  freqText?: string
  durationUnit?: 'day(s)' | 'week(s)' | 'month(s)' | 'دن' | 'ہفتہ' | 'مہینہ'
  morning?: string
  noon?: string
  evening?: string
  night?: string
  days?: string
}

// Re-export for convenience
export type { MedicineRow as PrescriptionMedicineRow }

interface PrescriptionMedicationProps {
  initialMedicines?: MedicineRow[]
  onChange?: (medicines: MedicineRow[]) => void
  suggestions?: {
    medName?: string[]
    dose?: string[]
    route?: string[]
    instruction?: string[]
    duration?: string[]
    frequency?: string[]
  }
  language?: PrescriptionLanguage
}

// Get default suggestions based on language
const getDefaultSuggestions = (language: PrescriptionLanguage = 'english') => {
  const options = getPrescriptionOptions(language)
  return {
    doses: options.dose,
    routes: options.route,
    instructions: options.instruction,
    durations: options.duration,
    frequencies: options.frequency
  }
}

const PrescriptionMedication = forwardRef(function PrescriptionMedication(
  { initialMedicines = [], onChange, suggestions = {}, language = 'english' }: PrescriptionMedicationProps,
  ref
) {
  const emptyRow = useCallback((): MedicineRow => ({ name: '', durationUnit: language === 'urdu' ? 'دن' : 'day(s)' }), [language])
  
  const [meds, setMeds] = useState<MedicineRow[]>(() => {
    if (initialMedicines.length > 0) return initialMedicines
    return Array(5).fill(null).map(() => emptyRow())
  })
  const [allMedicines, setAllMedicines] = useState<string[]>([])
  const [medicineDetails, setMedicineDetails] = useState<Record<string, { genericName?: string; company?: string }>>({})

  // Get language-based defaults
  const defaultSuggestions = useMemo(() => getDefaultSuggestions(language), [language])
  
  // Merge suggestions with defaults - always include defaults
  const mergedSuggestions = useMemo(() => ({
    medName: allMedicines.length ? allMedicines : (suggestions?.medName || []),
    dose: Array.from(new Set([...defaultSuggestions.doses, ...(suggestions?.dose || [])])),
    route: Array.from(new Set([...defaultSuggestions.routes, ...(suggestions?.route || [])])),
    instruction: Array.from(new Set([...defaultSuggestions.instructions, ...(suggestions?.instruction || [])])),
    duration: Array.from(new Set([...defaultSuggestions.durations, ...(suggestions?.duration || [])])),
    frequency: Array.from(new Set([...defaultSuggestions.frequencies, ...(suggestions?.frequency || [])])),
  }), [allMedicines, suggestions, defaultSuggestions])

  // Load all pharmacy medicines on mount
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const res: any = await pharmacyApi.getAllMedicines()
        if (cancelled) return
        const medicines: any[] = res?.medicines ?? res?.items ?? res ?? []
        const names = medicines.map((m: any) => String(m?.name || m?.genericName || m || '').trim()).filter(Boolean)
        const details: Record<string, { genericName?: string; company?: string }> = {}
        for (const m of medicines) {
          const n = String(m?.name || '').trim()
          if (n) details[n] = { genericName: m?.genericName || undefined, company: m?.company || m?.lastCompany || undefined }
        }
        const parentNames = suggestions?.medName || []
        const merged = Array.from(new Set([...names, ...parentNames])).slice(0, 2000)
        setAllMedicines(merged)
        setMedicineDetails(details)
      } catch {
        if (!cancelled) setAllMedicines(suggestions?.medName || [])
      }
    })()
    return () => { cancelled = true }
  }, [])

  // Expose getData for parent ref usage
  useImperativeHandle(ref, () => ({
    getData: () => meds,
    setData: (data: MedicineRow[]) => setMeds(data.length ? data : [emptyRow()]),
  }))

  const setMed = useCallback((i: number, key: keyof MedicineRow, val: string) => {
    setMeds(prev => {
      const next = [...prev]
      if (key === 'name') {
        const d = medicineDetails[val.trim()]
        next[i] = { ...next[i], name: val, genericName: d?.genericName || next[i].genericName, company: d?.company || next[i].company }
      } else {
        next[i] = { ...next[i], [key]: val }
      }
      return next
    })
  }, [medicineDetails])

  const addAfter = useCallback((i: number) => {
    setMeds(prev => {
      const next = [...prev]
      next.splice(i + 1, 0, emptyRow())
      return next
    })
  }, [])

  const removeAt = useCallback((i: number) => {
    setMeds(prev => {
      if (prev.length <= 1) return prev
      return prev.filter((_, idx) => idx !== i)
    })
  }, [])

  // Notify parent on change - use ref to avoid dependency cycle
  const onChangeRef = useRef(onChange)
  onChangeRef.current = onChange
  useEffect(() => {
    onChangeRef.current?.(meds)
  }, [meds])

  const isUrdu = language === 'urdu'
  const lbl = {
    no:    isUrdu ? '#'          : '#',
    name:  isUrdu ? 'دوا'        : 'Medicine',
    dose:  isUrdu ? 'خوراک'      : 'Dose',
    freq:  isUrdu ? 'تعداد'      : 'Frequency',
    route: isUrdu ? 'طریقہ'      : 'Route',
    dur:   isUrdu ? 'مدت'        : 'Duration',
    instr: isUrdu ? 'ہدایات'     : 'Instructions',
    notes: isUrdu ? 'نوٹس'       : 'Notes',
  }

  const fieldCls = "w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-slate-800 dark:text-slate-100 placeholder:text-slate-400 focus:border-sky-400 focus:ring-2 focus:ring-sky-400/20 outline-none transition-all"

  return (
    <div className="w-full rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm overflow-hidden">

      {/* ── Column Header ── */}
      <div className="hidden sm:flex items-center gap-0 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 px-4 py-2.5 text-[11px] font-semibold uppercase tracking-widest text-slate-400 dark:text-slate-500 select-none">
        <div className="w-7 shrink-0 text-center">{lbl.no}</div>
        <div className="flex-[2.4] px-2">{lbl.name}</div>
        <div className="flex-[1.1] px-2">{lbl.dose}</div>
        <div className="flex-[1.2] px-2">{lbl.freq}</div>
        <div className="flex-[1.1] px-2">{lbl.route}</div>
        <div className="flex-[1.1] px-2">{lbl.dur}</div>
        <div className="flex-[1.4] px-2">{lbl.instr}</div>
        <div className="w-16 shrink-0" />
      </div>

      {/* ── Rows ── */}
      <div className="divide-y divide-slate-100 dark:divide-slate-800/70">
        {meds.map((m, idx) => (
          <div
            key={idx}
            className={`group px-4 py-3 transition-colors ${m.name ? 'hover:bg-sky-50/40 dark:hover:bg-sky-900/10' : 'hover:bg-slate-50/60 dark:hover:bg-slate-800/20'}`}
          >
            {/* Main fields row */}
            <div className="flex items-center gap-0">

              {/* Row number */}
              <div className="w-7 shrink-0 text-center">
                <span className={`inline-flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold ${m.name ? 'bg-sky-100 text-sky-600 dark:bg-sky-900/40 dark:text-sky-400' : 'bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500'}`}>
                  {idx + 1}
                </span>
              </div>

              {/* Medicine name */}
              <div className="flex-[2.4] px-2 min-w-0">
                <SuggestField
                  as="input"
                  value={m.name || ''}
                  onChange={v => setMed(idx, 'name', v)}
                  suggestions={mergedSuggestions.medName}
                  placeholder="Medicine name"
                  className={`${fieldCls} font-medium`}
                  renderSuggestion={(s) => {
                    const d = medicineDetails[s]
                    if (!d?.genericName && !d?.company) return s
                    return (
                      <div>
                        <div className="font-medium">{s}</div>
                        {(d.genericName || d.company) && (
                          <div className="text-[11px] text-slate-500">
                            {d.genericName}{d.genericName && d.company ? ' · ' : ''}{d.company}
                          </div>
                        )}
                      </div>
                    )
                  }}
                />
              </div>

              {/* Dose */}
              <div className="flex-[1.1] px-2 min-w-0">
                <SuggestField
                  as="input"
                  value={m.qty || ''}
                  onChange={v => setMed(idx, 'qty', v)}
                  suggestions={mergedSuggestions.dose}
                  placeholder="e.g. 1 tab"
                  className={fieldCls}
                />
              </div>

              {/* Frequency */}
              <div className="flex-[1.2] px-2 min-w-0">
                <SuggestField
                  as="input"
                  value={m.freqText || ''}
                  onChange={v => setMed(idx, 'freqText', v)}
                  suggestions={mergedSuggestions.frequency}
                  placeholder="e.g. BD"
                  className={fieldCls}
                />
              </div>

              {/* Route */}
              <div className="flex-[1.1] px-2 min-w-0">
                <SuggestField
                  as="input"
                  value={m.route || ''}
                  onChange={v => setMed(idx, 'route', v)}
                  suggestions={mergedSuggestions.route}
                  placeholder="Oral"
                  className={fieldCls}
                />
              </div>

              {/* Duration */}
              <div className="flex-[1.1] px-2 min-w-0">
                <SuggestField
                  as="input"
                  value={m.durationText || ''}
                  onChange={v => setMed(idx, 'durationText', v)}
                  suggestions={mergedSuggestions.duration}
                  placeholder="5 days"
                  className={fieldCls}
                />
              </div>

              {/* Instructions */}
              <div className="flex-[1.4] px-2 min-w-0">
                <SuggestField
                  as="input"
                  value={m.instruction || ''}
                  onChange={v => setMed(idx, 'instruction', v)}
                  suggestions={mergedSuggestions.instruction}
                  placeholder="After meals"
                  className={fieldCls}
                />
              </div>

              {/* Actions */}
              <div className="w-16 shrink-0 flex items-center justify-end gap-1 pl-2">
                <button
                  type="button"
                  onClick={() => addAfter(idx)}
                  title="Add row below"
                  className="h-7 w-7 flex items-center justify-center rounded-md text-sky-500 hover:bg-sky-50 dark:hover:bg-sky-900/30 transition-colors"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
                </button>
                <button
                  type="button"
                  onClick={() => removeAt(idx)}
                  title="Remove row"
                  className="h-7 w-7 flex items-center justify-center rounded-md text-slate-300 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/30 transition-colors"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>
            </div>

            {/* Notes — subtle inline field, only shown/focused if non-empty or on hover */}
            <div className="mt-1.5 flex items-center gap-2 pl-9">
              <input
                type="text"
                value={m.notes || ''}
                onChange={e => setMed(idx, 'notes', e.target.value)}
                placeholder="Additional notes (optional)..."
                className="w-full rounded-md border border-transparent bg-transparent px-2 py-1 text-xs text-slate-500 dark:text-slate-400 placeholder:text-slate-300 dark:placeholder:text-slate-600 focus:border-slate-200 dark:focus:border-slate-700 focus:bg-white dark:focus:bg-slate-800/60 focus:ring-0 outline-none transition-all"
              />
            </div>
          </div>
        ))}
      </div>

      {/* ── Footer ── */}
      <div className="flex items-center justify-between px-5 py-3 border-t border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40">
        <button
          type="button"
          onClick={() => addAfter(meds.length - 1)}
          className="inline-flex items-center gap-2 rounded-lg border border-dashed border-sky-300 dark:border-sky-700 px-4 py-2 text-sm font-medium text-sky-600 dark:text-sky-400 hover:border-sky-400 hover:bg-sky-50 dark:hover:bg-sky-900/20 transition-all active:scale-95"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
          Add Medicine
        </button>
        <span className="text-xs text-slate-400 dark:text-slate-600">{meds.filter(m => m.name).length} / {meds.length} filled</span>
      </div>
    </div>
  )
})

export default PrescriptionMedication
