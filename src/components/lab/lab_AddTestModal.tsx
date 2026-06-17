import { useEffect, useState } from 'react'
import { labApi } from '../../utils/api'
import { Plus, GripVertical, Trash2 } from 'lucide-react'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { restrictToVerticalAxis } from '@dnd-kit/modifiers'

// --- Sortable Item Component ---
function SortableParameterItem({ 
  p, 
  idx, 
  onUpdate, 
  onRemove, 
  onAddBelow,
  sections,
}: { 
  p: any, 
  idx: number, 
  onUpdate: (idx: number, patch: any) => void, 
  onRemove: (idx: number) => void,
  onAddBelow: (idx: number) => void,
  sections: Array<{ id: string; key: string; title: string; order: string }>,
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id: p.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : undefined,
    opacity: isDragging ? 0.5 : 1,
  }

  return (
    <div ref={setNodeRef} style={style} className="group relative rounded-lg border border-slate-200 bg-white p-3 shadow-sm hover:border-violet-300 transition-colors">
      <div className="flex items-start gap-2">
        {/* Drag Handle */}
        <div 
          {...attributes} 
          {...listeners} 
          className="mt-2 cursor-grab active:cursor-grabbing p-1 text-slate-400 hover:text-slate-600 rounded hover:bg-slate-100"
        >
          <GripVertical className="size-4" />
        </div>

        <div className="flex-1 space-y-3">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            <div>
              <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-slate-400">Parameter Name</label>
              <input value={p.name} onChange={e => onUpdate(idx, { name: e.target.value })} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:ring-2 focus:ring-violet-200 outline-none" placeholder="Parameter name" />
            </div>
            <div>
              <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-slate-400">Unit</label>
              <input value={p.unit || ''} onChange={e => onUpdate(idx, { unit: e.target.value })} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:ring-2 focus:ring-violet-200 outline-none" placeholder="Unit (optional)" />
            </div>
            <div>
              <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-slate-400">Section</label>
              <select value={p.sectionKey || ''} onChange={e => onUpdate(idx, { sectionKey: e.target.value })} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:ring-2 focus:ring-violet-200 outline-none bg-white">
                <option value="">No Section</option>
                {sections.map(s => (
                  <option key={s.id || s.key} value={s.key}>{s.title} ({s.key})</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            <div>
              <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-slate-400">Range (M)</label>
              <input value={p.normalRangeMale || ''} onChange={e => onUpdate(idx, { normalRangeMale: e.target.value })} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:ring-2 focus:ring-violet-200 outline-none" placeholder="Normal Male" />
            </div>
            <div>
              <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-slate-400">Range (F)</label>
              <input value={p.normalRangeFemale || ''} onChange={e => onUpdate(idx, { normalRangeFemale: e.target.value })} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:ring-2 focus:ring-violet-200 outline-none" placeholder="Normal Female" />
            </div>
            <div>
              <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-slate-400">Range (P)</label>
              <input value={p.normalRangePediatric || ''} onChange={e => onUpdate(idx, { normalRangePediatric: e.target.value })} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:ring-2 focus:ring-violet-200 outline-none" placeholder="Normal Ped" />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            <div>
              <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-slate-400">Formula</label>
              <input value={p.formula || ''} onChange={e => onUpdate(idx, { formula: e.target.value })} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm font-mono focus:ring-2 focus:ring-violet-200 outline-none" placeholder="e.g. TC - HDL" />
            </div>
            <div>
              <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-slate-400">Crit Min</label>
              <input type="number" step="any" value={p.criticalMin || ''} onChange={e => onUpdate(idx, { criticalMin: e.target.value })} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:ring-2 focus:ring-violet-200 outline-none" placeholder="Min" />
            </div>
            <div>
              <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-slate-400">Crit Max</label>
              <input type="number" step="any" value={p.criticalMax || ''} onChange={e => onUpdate(idx, { criticalMax: e.target.value })} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:ring-2 focus:ring-violet-200 outline-none" placeholder="Max" />
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-1 ml-2">
          <button type="button" onClick={() => onAddBelow(idx)} className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors" title="Add parameter below">
            <Plus className="size-4" />
          </button>
          <button type="button" onClick={() => onRemove(idx)} className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-lg transition-colors" title="Remove parameter">
            <Trash2 className="size-4" />
          </button>
        </div>
      </div>
    </div>
  )
}

export type LabTestFormValues = {
  name: string
  price: string
  parameter?: string
  unit?: string
  normalRangeMale?: string
  normalRangeFemale?: string
  normalRangePediatric?: string
  criticalMin?: string
  criticalMax?: string
  parameters?: Array<{ name: string; unit?: string; normalRangeMale?: string; normalRangeFemale?: string; normalRangePediatric?: string; formula?: string; dependencies?: string[]; kind?: 'quantitative'|'qualitative'; criticalMin?: string; criticalMax?: string; sectionKey?: string; order?: number; qualitativeOptions?: string[]; interpretationRules?: Array<{ expression: string; label: string; text: string }>; contributesToTotalPercent?: boolean; totalPercentGroup?: string; isSensitivityRow?: boolean; drugList?: string[] }>
  consumables?: Array<{ item: string; qty: number }>
  category?: string
  template?: string
  sections?: Array<{ key: string; title: string; order?: number }>
  defaultInterpretation?: string
  defaultSensitivityDrugs?: string[]
  reportNotes?: string
  hideEmptyRowsInReport?: boolean
  turnaroundTime?: number
  turnaroundTimeNormal?: number
  turnaroundTimeUrgent?: number
  turnaroundTimeStat?: number
  cutOffTime?: string
  cutOffDays?: string[]
  cutOffHoliday?: boolean
}

export default function Lab_AddTestModal({ open, onClose, onSave, initial }: { open: boolean; onClose: () => void; onSave: (values: LabTestFormValues) => void; initial?: Partial<LabTestFormValues> }) {
  const [name, setName] = useState('')
  const [price, setPrice] = useState('0')
  const [parameters, setParameters] = useState<Array<{ id: string; name: string; unit?: string; normalRangeMale?: string; normalRangeFemale?: string; normalRangePediatric?: string; formula?: string; dependencies?: string[]; kind?: 'quantitative'|'qualitative'; criticalMin?: string; criticalMax?: string; sectionKey?: string; order?: number; qualitativeOptions?: string[]; interpretationRules?: Array<{ expression: string; label: string; text: string }>; contributesToTotalPercent?: boolean; totalPercentGroup?: string; isSensitivityRow?: boolean; drugList?: string[] }>>([])
  const [consumables, setConsumables] = useState<Array<{ id: string; item: string; qty: string }>>([])
  const [category, setCategory] = useState('Other')
  const [template, setTemplate] = useState('general')
  const [sections, setSections] = useState<Array<{ id: string; key: string; title: string; order: string }>>([])
  const [invOptions, setInvOptions] = useState<string[]>([])
  const [defaultInterpretation, setDefaultInterpretation] = useState('')
  const [defaultSensitivityDrugs, setDefaultSensitivityDrugs] = useState('')
  const [reportNotes, setReportNotes] = useState('')
  const [hideEmptyRows, setHideEmptyRows] = useState(true)
  
  // Priority-based TAT states
  const [turnaroundTimeNormal, setTurnaroundTimeNormal] = useState('')
  const [turnaroundTimeUrgent, setTurnaroundTimeUrgent] = useState('')
  const [turnaroundTimeStat, setTurnaroundTimeStat] = useState('')
  
  // Cut-off time states
  const [cutOffTime, setCutOffTime] = useState('') // Format: "HH:MM" (24-hour)
  const [cutOffDays, setCutOffDays] = useState<string[]>(['Mon', 'Tue', 'Wed', 'Thu', 'Fri']) // Default weekdays
  const [cutOffHoliday, setCutOffHoliday] = useState(false) // Process on holidays?
  
  const [activeTab, setActiveTab] = useState<'basic'|'sections'|'parameters'|'interpretation'|'critical'|'drugs'|'tat'>('basic')

  useEffect(() => {
    if (open) {
      setName(initial?.name || '')
      setPrice(initial?.price ?? '0')
      
      let initParams = (initial?.parameters || [])
        .slice()
        .sort((a, b) => (a.order || 0) - (b.order || 0))
        .map(p=> ({ id: crypto.randomUUID(), name: p.name||'', unit: p.unit||'', normalRangeMale: p.normalRangeMale||'', normalRangeFemale: p.normalRangeFemale||'', normalRangePediatric: p.normalRangePediatric||'', formula: p.formula||'', dependencies: p.dependencies||[], kind: p.kind||'quantitative', criticalMin: p.criticalMin||'', criticalMax: p.criticalMax||'', sectionKey: p.sectionKey||'', order: p.order||0, qualitativeOptions: p.qualitativeOptions || [], interpretationRules: p.interpretationRules || [], contributesToTotalPercent: p.contributesToTotalPercent || false, totalPercentGroup: p.totalPercentGroup || '', isSensitivityRow: p.isSensitivityRow || false, drugList: p.drugList || [] }))
      
      if (initParams.length === 0 && initial?.parameter) {
        initParams = [{
          id: crypto.randomUUID(),
          name: initial.parameter,
          unit: initial.unit || '',
          normalRangeMale: initial.normalRangeMale || '',
          normalRangeFemale: initial.normalRangeFemale || '',
          normalRangePediatric: initial.normalRangePediatric || '',
          formula: '',
          dependencies: [],
          kind: 'quantitative',
          criticalMin: initial.criticalMin || '',
          criticalMax: initial.criticalMax || '',
          sectionKey: '',
          order: 0,
          qualitativeOptions: [],
          interpretationRules: [],
          contributesToTotalPercent: false,
          totalPercentGroup: '',
          isSensitivityRow: false,
          drugList: []
        }]
      }
      setParameters(initParams)
      
      const initCons = (initial?.consumables || []).map(c=> ({ id: crypto.randomUUID(), item: String(c.item||''), qty: String(c.qty||'') }))
      setConsumables(initCons)
      setCategory(initial?.category || 'Other')
      setTemplate(initial?.template || 'general')
      setSections((initial?.sections || []).map(s => ({ id: crypto.randomUUID(), key: s.key||'', title: s.title||'', order: String(s.order||0) })))
      setDefaultInterpretation((initial as any)?.defaultInterpretation || '')
      setDefaultSensitivityDrugs(((initial as any)?.defaultSensitivityDrugs || []).join(', '))
      setReportNotes((initial as any)?.reportNotes || '')
      setHideEmptyRows((initial as any)?.hideEmptyRowsInReport !== false)
      
      // Load priority-based TAT
      setTurnaroundTimeNormal(String((initial as any)?.turnaroundTimeNormal ?? (initial as any)?.turnaroundTime ?? '') || '')
      setTurnaroundTimeUrgent(String((initial as any)?.turnaroundTimeUrgent ?? '') || '')
      setTurnaroundTimeStat(String((initial as any)?.turnaroundTimeStat ?? '') || '')
      
      // Load cut-off times
      setCutOffTime((initial as any)?.cutOffTime || '')
      setCutOffDays((initial as any)?.cutOffDays || ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'])
      setCutOffHoliday((initial as any)?.cutOffHoliday || false)
      ;(async()=>{
        try{
          const res: any = await labApi.listInventory({ page: 1, limit: 200 })
          const names: string[] = (res?.items || []).map((x:any)=> String(x?.name||'')).filter(Boolean)
          setInvOptions(names)
        } catch { setInvOptions([]) }
      })()
    }
  }, [open, initial])

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (over && active.id !== over.id) {
      setParameters((items) => {
        const oldIndex = items.findIndex((i) => i.id === active.id)
        const newIndex = items.findIndex((i) => i.id === over.id)
        return arrayMove(items, oldIndex, newIndex)
      })
    }
  }

  const addParameterBelow = (idx: number) => {
    setParameters(prev => {
      const newList = [...prev]
      newList.splice(idx + 1, 0, { id: crypto.randomUUID(), name: '', unit: '', normalRangeMale: '', normalRangeFemale: '', normalRangePediatric: '', formula: '', dependencies: [], kind: 'quantitative', criticalMin: '', criticalMax: '', sectionKey: '', order: 0, qualitativeOptions: [], interpretationRules: [], contributesToTotalPercent: false, totalPercentGroup: '', isSensitivityRow: false, drugList: [] })
      return newList
    })
  }

  // Auto-populate default parameters with formulas based on template selection
  const applyTemplateDefaults = (templateName: string) => {
    const createParam = (name: string, unit: string, normalM: string, normalF: string, formula?: string, deps?: string[], order?: number) => ({
      id: crypto.randomUUID(),
      name,
      unit,
      normalRangeMale: normalM,
      normalRangeFemale: normalF,
      normalRangePediatric: '',
      formula: formula || '',
      dependencies: deps || [],
      kind: 'quantitative' as const,
      criticalMin: '',
      criticalMax: '',
      sectionKey: '',
      order: order || 0,
      qualitativeOptions: [],
      interpretationRules: [],
      contributesToTotalPercent: false,
      totalPercentGroup: '',
      isSensitivityRow: false,
      drugList: []
    })

    switch (templateName) {
      case 'lft':
        setParameters([
          createParam('Total Bilirubin', 'mg/dL', '0.2-1.2', '0.2-1.2', '', [], 0),
          createParam('Direct Bilirubin', 'mg/dL', '0.0-0.3', '0.0-0.3', '', [], 1),
          createParam('Indirect Bilirubin', 'mg/dL', '0.1-0.9', '0.1-0.9', 'Total_Bilirubin - Direct_Bilirubin', ['Total Bilirubin', 'Direct Bilirubin'], 2),
          createParam('SGOT (AST)', 'U/L', '0-40', '0-40', '', [], 3),
          createParam('SGPT (ALT)', 'U/L', '0-40', '0-40', '', [], 4),
          createParam('Alkaline Phosphatase', 'U/L', '44-147', '44-147', '', [], 5),
          createParam('Total Protein', 'g/dL', '6.0-8.3', '6.0-8.3', '', [], 6),
          createParam('Albumin', 'g/dL', '3.5-5.0', '3.5-5.0', '', [], 7),
          createParam('Globulin', 'g/dL', '2.0-3.5', '2.0-3.5', 'Total_Protein - Albumin', ['Total Protein', 'Albumin'], 8),
          createParam('A/G Ratio', '', '1.0-2.0', '1.0-2.0', 'Albumin / Globulin', ['Albumin', 'Globulin'], 9),
        ])
        break
      case 'lipid':
        setParameters([
          createParam('Total Cholesterol', 'mg/dL', '<200', '<200', '', [], 0),
          createParam('Triglycerides', 'mg/dL', '<150', '<150', '', [], 1),
          createParam('HDL Cholesterol', 'mg/dL', '>40', '>50', '', [], 2),
          createParam('VLDL Cholesterol', 'mg/dL', '<30', '<30', 'Triglycerides / 5', ['Triglycerides'], 3),
          createParam('LDL Cholesterol', 'mg/dL', '<100', '<100', 'Total_Cholesterol - HDL_Cholesterol - VLDL_Cholesterol', ['Total Cholesterol', 'HDL Cholesterol', 'VLDL Cholesterol'], 4),
          createParam('Non-HDL Cholesterol', 'mg/dL', '<130', '<130', 'Total_Cholesterol - HDL_Cholesterol', ['Total Cholesterol', 'HDL Cholesterol'], 5),
          createParam('Total Lipid', 'mg/dL', '400-600', '400-600', 'Total_Cholesterol + HDL_Cholesterol + VLDL_Cholesterol + LDL_Cholesterol + 200', ['Total Cholesterol', 'HDL Cholesterol', 'VLDL Cholesterol', 'LDL Cholesterol'], 6),
          createParam('Chol/HDL Ratio', '', '<3.5', '<3.5', 'Total_Cholesterol / HDL_Cholesterol', ['Total Cholesterol', 'HDL Cholesterol'], 7),
        ])
        break
      case 'rft':
        setParameters([
          createParam('Blood Urea', 'mg/dL', '15-40', '15-40', '', [], 0),
          createParam('BUN', 'mg/dL', '7-20', '7-20', 'Blood_Urea / 2.14', ['Blood Urea'], 1),
          createParam('Serum Creatinine', 'mg/dL', '0.7-1.3', '0.6-1.1', '', [], 2),
          createParam('BUN/Creatinine Ratio', '', '10-20', '10-20', 'BUN / Serum_Creatinine', ['BUN', 'Serum Creatinine'], 3),
          createParam('Uric Acid', 'mg/dL', '3.5-7.2', '2.6-6.0', '', [], 4),
          createParam('Sodium', 'mEq/L', '135-145', '135-145', '', [], 5),
          createParam('Potassium', 'mEq/L', '3.5-5.0', '3.5-5.0', '', [], 6),
          createParam('Chloride', 'mEq/L', '98-106', '98-106', '', [], 7),
          createParam('Calcium', 'mg/dL', '8.5-10.5', '8.5-10.5', '', [], 8),
          createParam('Phosphorus', 'mg/dL', '2.5-4.5', '2.5-4.5', '', [], 9),
          createParam('Albumin', 'g/dL', '3.5-5.0', '3.5-5.0', '', [], 10),
          createParam('Corrected Calcium', 'mg/dL', '8.5-10.5', '8.5-10.5', 'Calcium + 0.8 * (4 - Albumin)', ['Calcium', 'Albumin'], 11),
          createParam('Anion Gap', 'mEq/L', '8-16', '8-16', '(Sodium + Potassium) - (Chloride + Bicarbonate)', ['Sodium', 'Potassium', 'Chloride', 'Bicarbonate'], 12),
          createParam('Osmolality', 'mOsm/kg', '275-295', '275-295', '2 * Sodium + Glucose / 18 + BUN / 2.8', ['Sodium', 'Glucose', 'BUN'], 13),
          createParam('eGFR', 'mL/min/1.73m²', '>90', '>90', '', [], 14),
        ])
        break
      case 'pt_inr':
        setParameters([
          createParam('Prothrombin Time (PT)', 'sec', '11-14', '11-14', '', [], 0),
          createParam('Control PT', 'sec', '11-14', '11-14', '', [], 1),
          createParam('INR', '', '0.8-1.2', '0.8-1.2', 'Prothrombin_Time / Control_PT', ['Prothrombin Time (PT)', 'Control PT'], 2),
          createParam('ISI', '', '0.9-1.3', '0.9-1.3', '', [], 3),
        ])
        break
      case 'pcr': {
        const createQual = (name: string, opts: string[], order: number) => ({
          id: crypto.randomUUID(),
          name,
          unit: '',
          normalRangeMale: 'Negative',
          normalRangeFemale: 'Negative',
          normalRangePediatric: '',
          formula: '',
          dependencies: [] as string[],
          kind: 'qualitative' as const,
          criticalMin: '',
          criticalMax: '',
          sectionKey: '',
          order,
          qualitativeOptions: opts,
          interpretationRules: [],
          contributesToTotalPercent: false,
          totalPercentGroup: '',
          isSensitivityRow: false,
          drugList: [] as string[],
        })
        setParameters([
          createQual('Target Pathogen', ['SARS-CoV-2', 'Influenza A', 'Influenza B', 'TB (MTB)', 'Other'], 0),
          createQual('Result', ['Positive', 'Negative', 'Invalid', 'Inconclusive'], 1),
          createParam('Ct Value (Target)', '', '', '', '', [], 2),
          createParam('Ct Value (Internal Control)', '', '', '', '', [], 3),
          createQual('Specimen Type', ['Nasopharyngeal Swab', 'Oropharyngeal Swab', 'Sputum', 'BAL', 'Other'], 4),
          createParam('Comments', '', '', '', '', [], 5),
        ])
        setSections([
          { id: crypto.randomUUID(), key: 'pcr_result', title: 'PCR Result', order: '0' },
          { id: crypto.randomUUID(), key: 'pcr_details', title: 'Technical Details', order: '1' },
        ])
        break
      }
      case 'culture': {
        const createQual2 = (name: string, opts: string[], sk: string, order: number) => ({
          id: crypto.randomUUID(),
          name,
          unit: '',
          normalRangeMale: '',
          normalRangeFemale: '',
          normalRangePediatric: '',
          formula: '',
          dependencies: [] as string[],
          kind: 'qualitative' as const,
          criticalMin: '',
          criticalMax: '',
          sectionKey: sk,
          order,
          qualitativeOptions: opts,
          interpretationRules: [],
          contributesToTotalPercent: false,
          totalPercentGroup: '',
          isSensitivityRow: false,
          drugList: [] as string[],
        })
        setParameters([
          createQual2('Specimen Type', ['Blood', 'Urine', 'Sputum', 'Pus/Wound', 'CSF', 'Stool', 'Other'], 'culture_header', 0),
          createQual2('Gram Stain', ['Gram Positive Cocci', 'Gram Negative Bacilli', 'Gram Positive Bacilli', 'Gram Negative Cocci', 'No Organisms Seen'], 'culture_header', 1),
          createQual2('Culture Result', ['No Growth', 'Growth After 48hrs', 'Growth After 72hrs', 'Contaminated'], 'culture_result', 2),
          createQual2('Organism Identified', ['No Growth', 'E. coli', 'Klebsiella', 'Staph aureus', 'Pseudomonas', 'Streptococcus', 'Enterococcus', 'Other'], 'culture_result', 3),
          createParam('Colony Count (CFU/mL)', 'CFU/mL', '', '', '', [], 4),
          { ...createParam('Ampicillin', '', 'S/I/R', 'S/I/R', '', [], 5), sectionKey: 'sensitivity', kind: 'qualitative' as const, qualitativeOptions: ['Sensitive (S)', 'Intermediate (I)', 'Resistant (R)', 'Not Tested'], isSensitivityRow: true, drugList: [] as string[] },
          { ...createParam('Amikacin', '', 'S/I/R', 'S/I/R', '', [], 6), sectionKey: 'sensitivity', kind: 'qualitative' as const, qualitativeOptions: ['Sensitive (S)', 'Intermediate (I)', 'Resistant (R)', 'Not Tested'], isSensitivityRow: true, drugList: [] as string[] },
          { ...createParam('Ciprofloxacin', '', 'S/I/R', 'S/I/R', '', [], 7), sectionKey: 'sensitivity', kind: 'qualitative' as const, qualitativeOptions: ['Sensitive (S)', 'Intermediate (I)', 'Resistant (R)', 'Not Tested'], isSensitivityRow: true, drugList: [] as string[] },
          { ...createParam('Ceftriaxone', '', 'S/I/R', 'S/I/R', '', [], 8), sectionKey: 'sensitivity', kind: 'qualitative' as const, qualitativeOptions: ['Sensitive (S)', 'Intermediate (I)', 'Resistant (R)', 'Not Tested'], isSensitivityRow: true, drugList: [] as string[] },
          { ...createParam('Meropenem', '', 'S/I/R', 'S/I/R', '', [], 9), sectionKey: 'sensitivity', kind: 'qualitative' as const, qualitativeOptions: ['Sensitive (S)', 'Intermediate (I)', 'Resistant (R)', 'Not Tested'], isSensitivityRow: true, drugList: [] as string[] },
          { ...createParam('Clindamycin', '', 'S/I/R', 'S/I/R', '', [], 10), sectionKey: 'sensitivity', kind: 'qualitative' as const, qualitativeOptions: ['Sensitive (S)', 'Intermediate (I)', 'Resistant (R)', 'Not Tested'], isSensitivityRow: true, drugList: [] as string[] },
        ])
        setSections([
          { id: crypto.randomUUID(), key: 'culture_header', title: 'Specimen & Gram Stain', order: '0' },
          { id: crypto.randomUUID(), key: 'culture_result', title: 'Culture Result', order: '1' },
          { id: crypto.randomUUID(), key: 'sensitivity', title: 'Antibiotic Sensitivity', order: '2' },
        ])
        break
      }
      case 'fnac': {
        const createQual3 = (name: string, opts: string[], order: number) => ({
          id: crypto.randomUUID(),
          name,
          unit: '',
          normalRangeMale: '',
          normalRangeFemale: '',
          normalRangePediatric: '',
          formula: '',
          dependencies: [] as string[],
          kind: 'qualitative' as const,
          criticalMin: '',
          criticalMax: '',
          sectionKey: '',
          order,
          qualitativeOptions: opts,
          interpretationRules: [],
          contributesToTotalPercent: false,
          totalPercentGroup: '',
          isSensitivityRow: false,
          drugList: [] as string[],
        })
        setParameters([
          createParam('Site / Location', '', '', '', '', [], 0),
          createQual3('Technique', ['USG-guided', 'CT-guided', 'Palpation-guided', 'Stereotactic'], 1),
          createQual3('Adequacy', ['Adequate', 'Inadequate', 'Unsatisfactory'], 2),
          createQual3('Cellularity', ['Hypercellular', 'Moderately Cellular', 'Hypocellular', 'Acellular'], 3),
          createQual3('Diagnostic Category', ['Benign', 'Atypical / Indeterminate', 'Suspicious for Malignancy', 'Malignant', 'Unsatisfactory'], 4),
          createParam('Microscopic Description', '', '', '', '', [], 5),
          createParam('Impression / Diagnosis', '', '', '', '', [], 6),
          createParam('Recommendation', '', '', '', '', [], 7),
        ])
        setSections([])
        break
      }
      default:
        // For other templates, don't auto-populate
        break
    }
  }

  if (!open) return null

  const save = () => {
    if (!name.trim()) return
    
    const cleanParams = parameters
      .map((p, idx) => ({
        name: (p.name||'').trim(),
        unit: (p.unit||'').trim() || undefined,
        normalRangeMale: (p.normalRangeMale||'').trim() || undefined,
        normalRangeFemale: (p.normalRangeFemale||'').trim() || undefined,
        normalRangePediatric: (p.normalRangePediatric||'').trim() || undefined,
        formula: (p.formula||'').trim() || undefined,
        dependencies: p.dependencies && p.dependencies.length > 0 ? p.dependencies : undefined,
        kind: p.kind || 'quantitative',
        criticalMin: (p.criticalMin||'').trim() || undefined,
        criticalMax: (p.criticalMax||'').trim() || undefined,
        sectionKey: (p.sectionKey||'').trim() || undefined,
        order: idx, // Map array index to order
        qualitativeOptions: p.qualitativeOptions?.length ? p.qualitativeOptions : undefined,
        interpretationRules: p.interpretationRules?.length ? p.interpretationRules : undefined,
        contributesToTotalPercent: p.contributesToTotalPercent || undefined,
        totalPercentGroup: (p.totalPercentGroup||'').trim() || undefined,
        isSensitivityRow: p.isSensitivityRow || undefined,
        drugList: p.drugList?.length ? p.drugList : undefined
      }))
      .filter(p=> !!p.name)

    const firstParam = cleanParams.length === 1 ? cleanParams[0] : null

    onSave({
      name: name.trim(),
      price: price.trim() || '0',
      parameter: firstParam ? firstParam.name : undefined,
      unit: firstParam ? firstParam.unit : undefined,
      normalRangeMale: firstParam ? firstParam.normalRangeMale : undefined,
      normalRangeFemale: firstParam ? firstParam.normalRangeFemale : undefined,
      normalRangePediatric: firstParam ? firstParam.normalRangePediatric : undefined,
      criticalMin: firstParam ? firstParam.criticalMin : undefined,
      criticalMax: firstParam ? firstParam.criticalMax : undefined,
      parameters: cleanParams,
      consumables: consumables
        .map(c=> ({ item: (c.item||'').trim().toLowerCase(), qty: parseInt(String(c.qty||'0'),10) || 0 }))
        .filter(c=> !!c.item && c.qty>0),
      category: category || undefined,
      template: template && template !== 'general' ? template : undefined,
      sections: sections.filter(s => s.key.trim() && s.title.trim()).map(s => ({ key: s.key.trim(), title: s.title.trim(), order: Number(s.order) || 0 })),
      defaultInterpretation: defaultInterpretation.trim() || undefined,
      defaultSensitivityDrugs: defaultSensitivityDrugs.trim() ? defaultSensitivityDrugs.split(',').map(s=>s.trim()).filter(Boolean) : undefined,
      reportNotes: reportNotes.trim() || undefined,
      hideEmptyRowsInReport: hideEmptyRows,
      
      // Priority-based TAT
      turnaroundTimeNormal: turnaroundTimeNormal ? Number(turnaroundTimeNormal) : undefined,
      turnaroundTimeUrgent: turnaroundTimeUrgent ? Number(turnaroundTimeUrgent) : undefined,
      turnaroundTimeStat: turnaroundTimeStat ? Number(turnaroundTimeStat) : undefined,
      
      // Cut-off times
      cutOffTime: cutOffTime || undefined,
      cutOffDays: cutOffDays.length > 0 ? cutOffDays : undefined,
      cutOffHoliday: cutOffHoliday,
    })
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/30 p-4">
      <div className="mt-8 w-full max-w-5xl rounded-xl border border-slate-200 bg-white p-5 shadow-lg max-h-[85vh] overflow-y-auto">
        <div className="mb-4 flex items-center justify-between">
          <div className="text-lg font-semibold text-slate-800">{initial ? 'Edit Test' : 'Add New Test'}</div>
          <button onClick={onClose} className="text-slate-500">✖</button>
        </div>

        {/* Tab Bar */}
        <div className="mb-4 flex flex-wrap gap-1 border-b border-slate-200 pb-1">
          {(['basic','sections','parameters','interpretation','critical','drugs','tat'] as const).map(tab => (
            <button key={tab} type="button" onClick={() => setActiveTab(tab)} className={`rounded-t-md px-3 py-1.5 text-xs font-semibold ${activeTab===tab?'bg-slate-100 text-slate-900 border border-slate-200 border-b-white -mb-px':'text-slate-500 hover:text-slate-700'}`}>{tab === 'basic' ? 'Basic' : tab === 'sections' ? 'Sections' : tab === 'parameters' ? 'Parameters' : tab === 'interpretation' ? 'Interpretation' : tab === 'critical' ? 'Critical Values' : tab === 'drugs' ? 'Drug Sensitivity' : 'Turn Around Time'}</button>
          ))}
        </div>

        {/* ── Basic Tab ── */}
        {activeTab === 'basic' && (<>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div>
            <label className="mb-1 block text-sm text-slate-700">Test Name</label>
            <input value={name} onChange={e=>setName(e.target.value)} className="w-full rounded-md border border-slate-300 px-3 py-2" placeholder="Enter test name" />
          </div>
          <div>
            <label className="mb-1 block text-sm text-slate-700">Price (PKR)</label>
            <input value={price} onChange={e=>setPrice(e.target.value)} className="w-full rounded-md border border-slate-300 px-3 py-2" placeholder="0" />
          </div>
          <div>
            <label className="mb-1 block text-sm text-slate-700">Category</label>
            <select value={category} onChange={e=>setCategory(e.target.value)} className="w-full rounded-md border border-slate-300 px-3 py-2">
              <option>Other</option><option>Hematology</option><option>Chemistry</option><option>SpecialChemistry</option><option>Serology</option><option>Microbiology</option><option>Molecular</option><option>Cytology</option><option>Histopathology</option><option>Radiology</option><option>Endocrinology</option><option>Immunology</option>
            </select>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-3">
          <div>
            <label className="mb-1 block text-sm text-slate-700">Template</label>
            <select value={template} onChange={e=>setTemplate(e.target.value)} className="w-full rounded-md border border-slate-300 px-3 py-2">
              <option value="general">General</option><option value="cbc">CBC</option><option value="urine_re">Urine RE</option><option value="semen">Semen</option><option value="blood_culture">Blood Culture</option><option value="tft">TFT</option><option value="hba1c">HbA1c</option><option value="qualitative">Qualitative</option><option value="lft">LFT</option><option value="rft">RFT</option><option value="lipid">Lipid</option><option value="pt_inr">PT/INR</option><option value="pcr">PCR</option><option value="culture">Culture &amp; Sensitivity</option><option value="fnac">FNAC</option><option value="custom">Custom</option>
            </select>
          </div>
          <div className="flex items-end pb-3">
            {(template === 'lft' || template === 'lipid' || template === 'rft' || template === 'pt_inr' || template === 'pcr' || template === 'culture' || template === 'fnac') && (
              <button
                type="button"
                onClick={() => applyTemplateDefaults(template)}
                className="rounded-md border border-violet-300 bg-violet-50 px-3 py-1.5 text-sm font-semibold text-violet-700 hover:bg-violet-100 transition-colors"
                title="Auto-populate parameters with formulas for this template"
              >
                Apply {template.toUpperCase()} Defaults
              </button>
            )}
          </div>
          <div className="flex items-end pb-3">
            <div className="flex items-center gap-2">
              <input type="checkbox" id="hideEmpty" checked={hideEmptyRows} onChange={e=>setHideEmptyRows(e.target.checked)} className="h-4 w-4 rounded border-slate-300" />
              <label htmlFor="hideEmpty" className="text-sm text-slate-700">Hide empty rows in report</label>
            </div>
          </div>
        </div>

        <div className="mt-4">
          <label className="mb-1 block text-sm text-slate-700">Default Interpretation</label>
          <textarea value={defaultInterpretation} onChange={e=>setDefaultInterpretation(e.target.value)} className="w-full rounded-md border border-slate-300 px-3 py-2" rows={2} placeholder="Auto-interpretation text for this test" />
        </div>
        <div className="mt-4">
          <label className="mb-1 block text-sm text-slate-700">Report Notes</label>
          <textarea value={reportNotes} onChange={e=>setReportNotes(e.target.value)} className="w-full rounded-md border border-slate-300 px-3 py-2" rows={2} placeholder="Notes printed at bottom of report" />
        </div>
        <div className="mt-4 flex items-center gap-2">
          <input type="checkbox" id="hideEmpty" checked={hideEmptyRows} onChange={e=>setHideEmptyRows(e.target.checked)} className="h-4 w-4 rounded border-slate-300" />
          <label htmlFor="hideEmpty" className="text-sm text-slate-700">Hide empty rows in report</label>
        </div>

        <div className="mt-6">
          <div className="mb-2 flex items-center justify-between">
            <div className="text-sm font-semibold text-slate-800">Consumables (Inventory Items)</div>
            <button type="button" onClick={()=> setConsumables(prev => [...prev, { id: crypto.randomUUID(), item: '', qty: '1' }])} className="rounded-md border border-slate-300 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50">+ Add Consumable</button>
          </div>
          <div className="space-y-3">
            {consumables.map((c, idx) => (
              <div key={c.id} className="rounded-lg border border-slate-200 p-3">
                <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                  <div className="md:col-span-2">
                    <label className="mb-1 block text-sm text-slate-700">Item</label>
                    <input list="lab-inv-items" value={c.item} onChange={e=> setConsumables(prev=> prev.map((x,i)=> i===idx? { ...x, item: e.target.value }: x))} className="w-full rounded-md border border-slate-300 px-3 py-2" placeholder="Enter inventory item name" />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm text-slate-700">Qty</label>
                    <input type="number" min={1} value={c.qty} onChange={e=> setConsumables(prev=> prev.map((x,i)=> i===idx? { ...x, qty: e.target.value }: x))} className="w-full rounded-md border border-slate-300 px-3 py-2" placeholder="1" />
                  </div>
                </div>
                <div className="mt-3 text-right">
                  <button type="button" onClick={()=> setConsumables(prev => prev.filter((_,i)=> i!==idx))} className="rounded-md border border-slate-300 px-2 py-1 text-xs text-slate-700 hover:bg-slate-50">Remove</button>
                </div>
              </div>
            ))}
            {consumables.length === 0 && (
              <div className="rounded-md border border-dashed border-slate-300 p-3 text-sm text-slate-500">No consumables added. Use "+ Add Consumable" to link inventory items that will auto-deduct when this test is performed.</div>
            )}
            <datalist id="lab-inv-items">
              {invOptions.map(n=> <option key={n} value={n} />)}
            </datalist>
          </div>
        </div>
        </>)}

        {/* ── Sections Tab ── */}
        {activeTab === 'sections' && (<>
        <div className="mb-2 flex items-center justify-between">
          <div className="text-sm font-semibold text-slate-800">Sections</div>
          <button type="button" onClick={()=> setSections(prev => [...prev, { id: crypto.randomUUID(), key: '', title: '', order: '0' }])} className="rounded-md border border-slate-300 px-2 py-1 text-xs text-slate-700 hover:bg-slate-50">+ Section</button>
        </div>
        {sections.length > 0 && (
          <div className="space-y-2">
            {sections.map((s, idx) => (
              <div key={s.id} className="grid grid-cols-3 gap-2">
                <input value={s.key} onChange={e=>setSections(prev=>prev.map((x,i)=>i===idx?{...x,key:e.target.value}:x))} className="rounded-md border border-slate-300 px-2 py-1 text-sm" placeholder="Key (e.g., diff)" />
                <input value={s.title} onChange={e=>setSections(prev=>prev.map((x,i)=>i===idx?{...x,title:e.target.value}:x))} className="rounded-md border border-slate-300 px-2 py-1 text-sm" placeholder="Title (e.g., Differential)" />
                <div className="flex gap-1">
                  <input type="number" value={s.order} onChange={e=>setSections(prev=>prev.map((x,i)=>i===idx?{...x,order:e.target.value}:x))} className="w-16 rounded-md border border-slate-300 px-2 py-1 text-sm" placeholder="0" />
                  <button type="button" onClick={()=>setSections(prev=>prev.filter((_,i)=>i!==idx))} className="text-xs text-rose-600 hover:text-rose-800">✕</button>
                </div>
              </div>
            ))}
          </div>
        )}
        {sections.length === 0 && (
          <div className="rounded-md border border-dashed border-slate-300 p-3 text-sm text-slate-500">No sections defined. Add sections to group parameters (e.g., Physical/Chemical/Microscopic for Urine RE).</div>
        )}
        </>)}

        {/* ── Parameters Tab ── */}
        {activeTab === 'parameters' && (<>
        <div className="mb-4 flex items-center justify-between">
          <div>
            <div className="text-base font-semibold text-slate-800">Test Parameters</div>
            <div className="text-xs text-slate-500">Drag items to reorder. Add new parameters anywhere in the list.</div>
          </div>
          <button type="button" onClick={()=> setParameters(prev => [...prev, { id: crypto.randomUUID(), name: '', unit: '', normalRangeMale: '', normalRangeFemale: '', normalRangePediatric: '', formula: '', dependencies: [], kind: 'quantitative', criticalMin: '', criticalMax: '', sectionKey: '', order: 0, qualitativeOptions: [], interpretationRules: [], contributesToTotalPercent: false, totalPercentGroup: '', isSensitivityRow: false, drugList: [] }])} className="inline-flex items-center gap-2 rounded-xl bg-violet-600 px-4 py-2 text-sm font-bold text-white hover:bg-violet-700 shadow-lg shadow-violet-200 transition-all active:scale-95">
            <Plus className="size-4" /> Add Parameter
          </button>
        </div>

        <DndContext 
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
          modifiers={[restrictToVerticalAxis]}
        >
          <SortableContext 
            items={parameters.map(p => p.id)}
            strategy={verticalListSortingStrategy}
          >
            <div className="space-y-3">
              {parameters.map((p, idx) => (
                <SortableParameterItem 
                  key={p.id} 
                  p={p} 
                  idx={idx} 
                  onUpdate={(i, patch) => setParameters(prev => prev.map((x, j) => j === i ? { ...x, ...patch } : x))}
                  onRemove={i => setParameters(prev => prev.filter((_, j) => j !== i))}
                  onAddBelow={addParameterBelow}
                  sections={sections}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>

        {parameters.length === 0 && (
          <div className="rounded-2xl border-2 border-dashed border-slate-200 p-12 text-center">
            <div className="mx-auto mb-4 flex size-12 items-center justify-center rounded-full bg-slate-50 text-slate-400">
              <Plus className="size-6" />
            </div>
            <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">No parameters added yet</p>
            <button type="button" onClick={() => setParameters([{ id: crypto.randomUUID(), name: '', unit: '', normalRangeMale: '', normalRangeFemale: '', normalRangePediatric: '', formula: '', dependencies: [], kind: 'quantitative', criticalMin: '', criticalMax: '', sectionKey: '', order: 0, qualitativeOptions: [], interpretationRules: [], contributesToTotalPercent: false, totalPercentGroup: '', isSensitivityRow: false, drugList: [] }])} className="mt-4 text-xs font-black text-violet-600 hover:text-violet-700 uppercase tracking-widest">Create First Parameter</button>
          </div>
        )}
        </>)}


        {/* ── Interpretation Tab ── */}
        {activeTab === 'interpretation' && (<>
        <div className="text-sm text-slate-600 mb-3">Define interpretation rules per parameter. Expressions use <code className="bg-slate-100 px-1 rounded">value</code> as the variable (e.g., <code className="bg-slate-100 px-1 rounded">value &lt; 5.6</code>, <code className="bg-slate-100 px-1 rounded">5.7..6.4</code>, <code className="bg-slate-100 px-1 rounded">&gt;= 6.5</code>).</div>
        {parameters.filter(p=>p.name.trim()).map((p) => {
          const realIdx = parameters.indexOf(p)
          return (
          <div key={p.id} className="mb-4 rounded-lg border border-slate-200 p-3">
            <div className="font-semibold text-sm text-slate-800 mb-2">{p.name}</div>
            {(p.interpretationRules||[]).map((rule, ri) => (
              <div key={ri} className="grid grid-cols-3 gap-2 mb-2">
                <input value={rule.expression} onChange={e=>setParameters(prev=>prev.map((x,i)=>i===realIdx?{...x,interpretationRules:(x.interpretationRules||[]).map((r,j)=>j===ri?{...r,expression:e.target.value}:r)}:x))} className="rounded-md border border-slate-300 px-2 py-1 text-sm font-mono" placeholder="value < 5.6" />
                <input value={rule.label} onChange={e=>setParameters(prev=>prev.map((x,i)=>i===realIdx?{...x,interpretationRules:(x.interpretationRules||[]).map((r,j)=>j===ri?{...r,label:e.target.value}:r)}:x))} className="rounded-md border border-slate-300 px-2 py-1 text-sm" placeholder="Label (e.g., Normal)" />
                <div className="flex gap-1">
                  <input value={rule.text} onChange={e=>setParameters(prev=>prev.map((x,i)=>i===realIdx?{...x,interpretationRules:(x.interpretationRules||[]).map((r,j)=>j===ri?{...r,text:e.target.value}:r)}:x))} className="w-full rounded-md border border-slate-300 px-2 py-1 text-sm" placeholder="Interpretation text" />
                  <button type="button" onClick={()=>setParameters(prev=>prev.map((x,i)=>i===realIdx?{...x,interpretationRules:(x.interpretationRules||[]).filter((_,j)=>j!==ri)}:x))} className="text-xs text-rose-600">✕</button>
                </div>
              </div>
            ))}
            <button type="button" onClick={()=>setParameters(prev=>prev.map((x,i)=>i===realIdx?{...x,interpretationRules:[...(x.interpretationRules||[]),{expression:'',label:'',text:''}]}:x))} className="text-xs text-violet-700 hover:underline">+ Add Rule</button>
          </div>
        )})}
        {parameters.filter(p=>p.name.trim()).length === 0 && (
          <div className="text-sm text-slate-500">Add parameters first in the Parameters tab.</div>
        )}
        </>)}

        {/* ── Critical Values Tab ── */}
        {activeTab === 'critical' && (<>
        <div className="text-sm text-slate-600 mb-3">Set critical min/max thresholds per parameter. Values outside these ranges trigger critical alerts in result entry.</div>
        {parameters.filter(p=>p.name.trim() && p.kind === 'quantitative').map((p) => {
          const realIdx = parameters.indexOf(p)
          return (
          <div key={p.id} className="mb-3 grid grid-cols-3 gap-3 items-center">
            <div className="text-sm font-medium text-slate-800">{p.name}</div>
            <div>
              <label className="text-xs text-slate-500">Critical Min</label>
              <input type="number" step="any" value={p.criticalMin||''} onChange={e=>setParameters(prev=>prev.map((x,i)=>i===realIdx?{...x,criticalMin:e.target.value}:x))} className="w-full rounded-md border border-slate-300 px-2 py-1 text-sm" placeholder="—" />
            </div>
            <div>
              <label className="text-xs text-slate-500">Critical Max</label>
              <input type="number" step="any" value={p.criticalMax||''} onChange={e=>setParameters(prev=>prev.map((x,i)=>i===realIdx?{...x,criticalMax:e.target.value}:x))} className="w-full rounded-md border border-slate-300 px-2 py-1 text-sm" placeholder="—" />
            </div>
          </div>
        )})}
        {parameters.filter(p=>p.name.trim() && p.kind === 'quantitative').length === 0 && (
          <div className="text-sm text-slate-500">No quantitative parameters defined. Add parameters in the Parameters tab first.</div>
        )}
        </>)}

        {/* ── Drug Sensitivity Tab ── */}
        {activeTab === 'drugs' && (<>
        <div className="text-sm text-slate-600 mb-3">For Blood Culture tests: define sensitivity drugs and mark parameters as sensitivity rows.</div>
        <div className="mb-4">
          <label className="mb-1 block text-sm font-medium text-slate-700">Default Sensitivity Drugs (comma-separated)</label>
          <input value={defaultSensitivityDrugs} onChange={e=>setDefaultSensitivityDrugs(e.target.value)} className="w-full rounded-md border border-slate-300 px-3 py-2" placeholder="Ampicillin, Amikacin, Ciprofloxacin, ..." />
        </div>
        {parameters.filter(p=>p.name.trim()).map((p) => {
          const realIdx = parameters.indexOf(p)
          return (
          <div key={p.id} className="mb-3 rounded-lg border border-slate-200 p-3">
            <div className="flex items-center gap-3">
              <input type="checkbox" checked={p.isSensitivityRow||false} onChange={e=>setParameters(prev=>prev.map((x,i)=>i===realIdx?{...x,isSensitivityRow:e.target.checked}:x))} className="h-4 w-4 rounded border-slate-300" />
              <span className="text-sm font-medium text-slate-800">{p.name}</span>
            </div>
            {p.isSensitivityRow && (
              <div className="mt-2">
                <label className="text-xs text-slate-500">Drug list (comma-separated, overrides default)</label>
                <input value={(p.drugList||[]).join(', ')} onChange={e=>setParameters(prev=>prev.map((x,i)=>i===realIdx?{...x,drugList:e.target.value.split(',').map(s=>s.trim()).filter(Boolean)}:x))} className="w-full rounded-md border border-slate-300 px-2 py-1 text-sm" placeholder="Leave empty to use default drugs" />
              </div>
            )}
          </div>
        )})}
        {parameters.filter(p=>p.name.trim()).length === 0 && (
          <div className="text-sm text-slate-500">Add parameters first in the Parameters tab.</div>
        )}
        </>)}

        {/* ── TAT Tab ── */}
        {activeTab === 'tat' && (<>
        <div className="space-y-6">
          {/* Priority-based TAT Section */}
          <div>
            <div className="text-sm font-semibold text-slate-800 mb-3">Priority-Based Turn Around Time (TAT)</div>
            <div className="text-xs text-slate-500 mb-4">Set expected TAT for different sample priorities. Used to flag delayed reports.</div>
            
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              {/* Normal TAT */}
              <div className="rounded-lg border border-slate-200 p-4 bg-slate-50/50">
                <div className="flex items-center gap-2 mb-2">
                  <span className="w-3 h-3 rounded-full bg-blue-500"></span>
                  <label className="text-sm font-medium text-slate-700">Normal Priority</label>
                </div>
                <input 
                  type="number" 
                  min="0" 
                  step="1" 
                  value={turnaroundTimeNormal} 
                  onChange={e=>setTurnaroundTimeNormal(e.target.value)} 
                  className="w-full rounded-md border border-slate-300 px-3 py-2 mb-2" 
                  placeholder="Minutes (e.g., 240)" 
                />
                <div className="text-xs text-slate-500">
                  {turnaroundTimeNormal ? (() => {
                    const mins = Number(turnaroundTimeNormal)
                    if (mins < 60) return `${mins} min`
                    if (mins < 1440) return `${Math.floor(mins/60)}h ${mins%60}m`
                    return `${Math.floor(mins/1440)}d ${Math.floor((mins%1440)/60)}h`
                  })() : 'Not set'}
                </div>
              </div>
              
              {/* Urgent TAT */}
              <div className="rounded-lg border border-amber-200 p-4 bg-amber-50/50">
                <div className="flex items-center gap-2 mb-2">
                  <span className="w-3 h-3 rounded-full bg-amber-500"></span>
                  <label className="text-sm font-medium text-slate-700">Urgent Priority</label>
                </div>
                <input 
                  type="number" 
                  min="0" 
                  step="1" 
                  value={turnaroundTimeUrgent} 
                  onChange={e=>setTurnaroundTimeUrgent(e.target.value)} 
                  className="w-full rounded-md border border-slate-300 px-3 py-2 mb-2" 
                  placeholder="Minutes (e.g., 120)" 
                />
                <div className="text-xs text-slate-500">
                  {turnaroundTimeUrgent ? (() => {
                    const mins = Number(turnaroundTimeUrgent)
                    if (mins < 60) return `${mins} min`
                    if (mins < 1440) return `${Math.floor(mins/60)}h ${mins%60}m`
                    return `${Math.floor(mins/1440)}d ${Math.floor((mins%1440)/60)}h`
                  })() : 'Not set'}
                </div>
              </div>
              
              {/* STAT TAT */}
              <div className="rounded-lg border border-rose-200 p-4 bg-rose-50/50">
                <div className="flex items-center gap-2 mb-2">
                  <span className="w-3 h-3 rounded-full bg-rose-500"></span>
                  <label className="text-sm font-medium text-slate-700">STAT (Emergency)</label>
                </div>
                <input 
                  type="number" 
                  min="0" 
                  step="1" 
                  value={turnaroundTimeStat} 
                  onChange={e=>setTurnaroundTimeStat(e.target.value)} 
                  className="w-full rounded-md border border-slate-300 px-3 py-2 mb-2" 
                  placeholder="Minutes (e.g., 60)" 
                />
                <div className="text-xs text-slate-500">
                  {turnaroundTimeStat ? (() => {
                    const mins = Number(turnaroundTimeStat)
                    if (mins < 60) return `${mins} min`
                    if (mins < 1440) return `${Math.floor(mins/60)}h ${mins%60}m`
                    return `${Math.floor(mins/1440)}d ${Math.floor((mins%1440)/60)}h`
                  })() : 'Not set'}
                </div>
              </div>
            </div>
          </div>
          
          {/* Cut-off Time Section */}
          <div className="border-t border-slate-200 pt-6">
            <div className="text-sm font-semibold text-slate-800 mb-3">Sample Cut-off Time</div>
            <div className="text-xs text-slate-500 mb-4">Samples received after cut-off will be processed next business day.</div>
            
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm text-slate-700">Daily Cut-off Time</label>
                <input 
                  type="time" 
                  value={cutOffTime} 
                  onChange={e=>setCutOffTime(e.target.value)} 
                  className="w-full rounded-md border border-slate-300 px-3 py-2" 
                />
                <div className="text-xs text-slate-500 mt-1">
                  {cutOffTime ? `Samples must be received by ${cutOffTime}` : 'No cut-off time set'}
                </div>
              </div>
              
              <div>
                <label className="mb-1 block text-sm text-slate-700">Processing Days</label>
                <div className="flex flex-wrap gap-2 mt-2">
                  {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => (
                    <label key={day} className="flex items-center gap-1 text-sm">
                      <input 
                        type="checkbox" 
                        checked={cutOffDays.includes(day)}
                        onChange={e => {
                          if (e.target.checked) {
                            setCutOffDays([...cutOffDays, day])
                          } else {
                            setCutOffDays(cutOffDays.filter(d => d !== day))
                          }
                        }}
                        className="rounded border-slate-300"
                      />
                      <span className={cutOffDays.includes(day) ? 'text-slate-900' : 'text-slate-400'}>{day}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
            
            <div className="mt-4 flex items-center gap-2">
              <input 
                type="checkbox" 
                id="cutOffHoliday"
                checked={cutOffHoliday}
                onChange={e=>setCutOffHoliday(e.target.checked)}
                className="h-4 w-4 rounded border-slate-300"
              />
              <label htmlFor="cutOffHoliday" className="text-sm text-slate-700">
                Process samples on holidays (override cut-off)
              </label>
            </div>
          </div>
        </div>
        </>)}

        <div className="mt-6 flex justify-end gap-2">
          <button onClick={onClose} className="rounded-md border border-slate-300 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50">Cancel</button>
          <button onClick={save} className="rounded-md bg-violet-700 px-3 py-1.5 text-sm font-medium text-white hover:bg-violet-800">{initial ? 'Save Changes' : 'Add Test'}</button>
        </div>
      </div>
    </div>
  )
}
