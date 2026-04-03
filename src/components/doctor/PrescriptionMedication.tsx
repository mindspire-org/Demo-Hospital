import { forwardRef, useState, useImperativeHandle, useEffect, useCallback, useMemo, useRef } from 'react'
import { pharmacyApi } from '../../utils/api'

export interface MedicineRow {
  name: string
  qty?: string
  route?: string
  instruction?: string
  durationText?: string
  freqText?: string
  durationUnit?: 'day(s)' | 'week(s)' | 'month(s)'
  morning?: string
  noon?: string
  evening?: string
  night?: string
  days?: string
}

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
}

// Default suggestions for medication fields
const DEFAULT_DOSES = ['1 mg', '2 mg', '5 mg', '10 mg', '20 mg', '25 mg', '50 mg', '100 mg', '200 mg', '250 mg', '500 mg', '1 g', '1 ml', '2 ml', '5 ml', '10 ml', '1 tsp', '1 tbsp', '1 drop', '2 drops', '1 puff', '1 tablet', '2 tablets', '1 capsule', '1 sachet']
const DEFAULT_ROUTES = ['Oral', 'IV', 'IM', 'SC', 'Topical', 'Sublingual', 'Rectal', 'Vaginal', 'Inhalation', 'Nasal', 'Ocular', 'Ear drops', 'Local application']
const DEFAULT_INSTRUCTIONS = ['Before meals', 'After meals', 'With meals', 'Empty stomach', 'Bed time', 'Morning', 'Night', 'Once daily', 'Twice daily', 'Thrice daily', 'Four times daily', 'Every 4 hours', 'Every 6 hours', 'Every 8 hours', 'Every 12 hours', 'SOS', 'PRN', 'Stat', 'As directed']
const DEFAULT_DURATIONS = ['1 day', '2 days', '3 days', '5 days', '7 days', '10 days', '14 days', '1 week', '2 weeks', '3 weeks', '4 weeks', '1 month', '2 months', '3 months', '6 months']
const DEFAULT_FREQUENCIES = ['Once daily (OD)', 'Twice daily (BD)', 'Thrice daily (TID)', 'Four times daily (QID)', 'Every morning', 'Every night', 'Every 4 hours', 'Every 6 hours', 'Every 8 hours', 'Every 12 hours', 'SOS', 'Stat', 'Alternate days', 'Weekly', 'Monthly']

// SelectInput component with working dropdown
interface SelectInputProps {
  value: string
  onChange: (val: string) => void
  options: string[]
  placeholder?: string
  className?: string
}

const SelectInput = ({ value, onChange, options, placeholder, className }: SelectInputProps) => {
  const [open, setOpen] = useState(false)
  const [inputValue, setInputValue] = useState(value || '')
  const containerRef = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    setInputValue(value || '')
  }, [value])

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    if (open) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [open])

  const filteredOptions = useMemo(() => {
    const q = inputValue.toLowerCase()
    if (!q) return options
    return options.filter(o => o.toLowerCase().includes(q))
  }, [inputValue, options])

  const selectOption = (opt: string) => {
    onChange(opt)
    setInputValue(opt)
    setOpen(false)
  }

  const toggleOpen = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setOpen(!open)
  }

  return (
    <div ref={containerRef} className="relative">
      <input
        type="text"
        value={inputValue}
        onChange={e => { setInputValue(e.target.value); onChange(e.target.value) }}
        onFocus={() => setOpen(true)}
        placeholder={placeholder}
        className={`${className} pr-8`}
      />
      <button
        ref={buttonRef}
        type="button"
        onMouseDown={toggleOpen}
        className="absolute right-1 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 focus:outline-none"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
        </svg>
      </button>
      {open && (
        <ul className="absolute z-[100] mt-1 max-h-48 w-full overflow-auto rounded-md border border-slate-200 bg-white py-1 text-sm shadow-lg">
          {filteredOptions.length === 0 ? (
            <li className="px-3 py-2 text-slate-400 italic">No matches</li>
          ) : (
            filteredOptions.map((opt, i) => (
              <li
                key={i}
                onMouseDown={(e) => { e.preventDefault(); selectOption(opt); }}
                className="cursor-pointer px-3 py-1.5 text-slate-700 hover:bg-slate-100"
              >
                {opt}
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  )
}

const PrescriptionMedication = forwardRef(function PrescriptionMedication(
  { initialMedicines = [], onChange, suggestions = {} }: PrescriptionMedicationProps,
  ref
) {
  const [meds, setMeds] = useState<MedicineRow[]>(initialMedicines.length ? initialMedicines : [emptyRow()])
  const [allMedicines, setAllMedicines] = useState<string[]>([])

  // Merge suggestions with defaults - always include defaults
  const mergedSuggestions = useMemo(() => ({
    medName: allMedicines.length ? allMedicines : (suggestions?.medName || []),
    dose: Array.from(new Set([...DEFAULT_DOSES, ...(suggestions?.dose || [])])),
    route: Array.from(new Set([...DEFAULT_ROUTES, ...(suggestions?.route || [])])),
    instruction: Array.from(new Set([...DEFAULT_INSTRUCTIONS, ...(suggestions?.instruction || [])])),
    duration: Array.from(new Set([...DEFAULT_DURATIONS, ...(suggestions?.duration || [])])),
    frequency: Array.from(new Set([...DEFAULT_FREQUENCIES, ...(suggestions?.frequency || [])])),
  }), [allMedicines, suggestions])

  // Load all pharmacy medicines on mount
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const res: any = await pharmacyApi.getAllMedicines()
        if (cancelled) return
        const items: any[] = res?.items ?? res ?? []
        const names = items.map((m: any) => String(m?.name || m?.genericName || m || '').trim()).filter(Boolean)
        const parentNames = suggestions?.medName || []
        const merged = Array.from(new Set([...names, ...parentNames])).slice(0, 2000)
        setAllMedicines(merged)
      } catch {
        if (!cancelled) setAllMedicines(suggestions?.medName || [])
      }
    })()
    return () => { cancelled = true }
  }, [])

  function emptyRow(): MedicineRow {
    return { name: '', durationUnit: 'day(s)' }
  }

  // Expose getData for parent ref usage
  useImperativeHandle(ref, () => ({
    getData: () => meds,
    setData: (data: MedicineRow[]) => setMeds(data.length ? data : [emptyRow()]),
  }))

  const setMed = useCallback((i: number, key: keyof MedicineRow, val: string) => {
    setMeds(prev => {
      const next = [...prev]
      next[i] = { ...next[i], [key]: val }
      return next
    })
  }, [])

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

  return (
    <div className="border border-slate-200">
      <div className="hidden sm:grid grid-cols-12 gap-2 border-b border-slate-200 bg-slate-50 px-3 py-2 text-xs font-medium text-slate-600">
        <div className="col-span-3">Name</div>
        <div className="col-span-2">Duration</div>
        <div className="col-span-2">Dosage</div>
        <div className="col-span-2">Route</div>
        <div className="col-span-2">Frequency</div>
        <div className="col-span-1">Instruction</div>
      </div>
      <div className="divide-y divide-slate-200">
        {meds.map((m, idx) => (
          <div key={idx} className="px-3 py-2">
            <div className="grid grid-cols-12 items-start gap-2">
              {/* Medicine Name */}
              <div className="col-span-12 sm:col-span-3">
                <SelectInput
                  value={m.name || ''}
                  onChange={v => setMed(idx, 'name', v)}
                  options={mergedSuggestions.medName}
                  placeholder="Medicine name"
                  className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm"
                />
              </div>
              {/* Duration */}
              <div className="col-span-6 sm:col-span-2">
                <SelectInput
                  value={m.durationText || ''}
                  onChange={v => setMed(idx, 'durationText', v)}
                  options={mergedSuggestions.duration}
                  placeholder="Duration"
                  className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm"
                />
              </div>
              {/* Dosage */}
              <div className="col-span-6 sm:col-span-2">
                <SelectInput
                  value={m.qty || ''}
                  onChange={v => setMed(idx, 'qty', v)}
                  options={mergedSuggestions.dose}
                  placeholder="Dosage"
                  className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm"
                />
              </div>
              {/* Route */}
              <div className="col-span-6 sm:col-span-2">
                <SelectInput
                  value={m.route || ''}
                  onChange={v => setMed(idx, 'route', v)}
                  options={mergedSuggestions.route}
                  placeholder="Route"
                  className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm"
                />
              </div>
              {/* Frequency */}
              <div className="col-span-6 sm:col-span-2">
                <SelectInput
                  value={m.freqText || ''}
                  onChange={v => setMed(idx, 'freqText', v)}
                  options={mergedSuggestions.frequency}
                  placeholder="Frequency"
                  className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm"
                />
              </div>
              {/* Instruction */}
              <div className="col-span-10 sm:col-span-1">
                <SelectInput
                  value={m.instruction || ''}
                  onChange={v => setMed(idx, 'instruction', v)}
                  options={mergedSuggestions.instruction}
                  placeholder="Instruction"
                  className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm"
                />
              </div>
            </div>
            <div className="mt-2 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => removeAt(idx)}
                className="rounded-md bg-rose-600 px-2 py-1 text-xs font-medium text-white hover:bg-rose-700"
                title="Remove"
              >
                🗑️ Remove
              </button>
              <button
                type="button"
                onClick={() => addAfter(idx)}
                className="rounded-md bg-sky-600 px-2 py-1 text-xs font-medium text-white hover:bg-sky-700"
              >
                + Drug
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
})

export default PrescriptionMedication
