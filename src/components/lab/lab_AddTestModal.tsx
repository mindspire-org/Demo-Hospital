import { useEffect, useState } from 'react'
import { labApi } from '../../utils/api'

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
}

export default function Lab_AddTestModal({ open, onClose, onSave, initial }: { open: boolean; onClose: () => void; onSave: (values: LabTestFormValues) => void; initial?: Partial<LabTestFormValues> }) {
  const [name, setName] = useState('')
  const [price, setPrice] = useState('0')
  const [parameter, setParameter] = useState('')
  const [unit, setUnit] = useState('')
  const [normalRangeMale, setNormalRangeMale] = useState('')
  const [normalRangeFemale, setNormalRangeFemale] = useState('')
  const [normalRangePediatric, setNormalRangePediatric] = useState('')
  const [criticalMin, setCriticalMin] = useState('')
  const [criticalMax, setCriticalMax] = useState('')
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
  const [turnaroundTime, setTurnaroundTime] = useState('')
  const [activeTab, setActiveTab] = useState<'basic'|'sections'|'parameters'|'interpretation'|'critical'|'drugs'|'tat'>('basic')

  useEffect(() => {
    if (open) {
      setName(initial?.name || '')
      setPrice(initial?.price ?? '0')
      setParameter(initial?.parameter || '')
      setUnit(initial?.unit || '')
      setNormalRangeMale(initial?.normalRangeMale || '')
      setNormalRangeFemale(initial?.normalRangeFemale || '')
      setNormalRangePediatric(initial?.normalRangePediatric || '')
      setCriticalMin(initial?.criticalMin || '')
      setCriticalMax(initial?.criticalMax || '')
      const initParams = (initial?.parameters || []).map(p=> ({ id: crypto.randomUUID(), name: p.name||'', unit: p.unit||'', normalRangeMale: p.normalRangeMale||'', normalRangeFemale: p.normalRangeFemale||'', normalRangePediatric: p.normalRangePediatric||'', formula: p.formula||'', dependencies: p.dependencies||[], kind: p.kind||'quantitative', criticalMin: p.criticalMin||'', criticalMax: p.criticalMax||'', sectionKey: p.sectionKey||'', order: p.order||0, qualitativeOptions: p.qualitativeOptions || [], interpretationRules: p.interpretationRules || [], contributesToTotalPercent: p.contributesToTotalPercent || false, totalPercentGroup: p.totalPercentGroup || '', isSensitivityRow: p.isSensitivityRow || false, drugList: p.drugList || [] }))
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
      setTurnaroundTime(String((initial as any)?.turnaroundTime ?? '') || '')
      ;(async()=>{
        try{
          const res: any = await labApi.listInventory({ page: 1, limit: 200 })
          const names: string[] = (res?.items || []).map((x:any)=> String(x?.name||'')).filter(Boolean)
          setInvOptions(names)
        } catch { setInvOptions([]) }
      })()
    }
  }, [open, initial])

  if (!open) return null

  const save = () => {
    if (!name.trim()) return
    onSave({
      name: name.trim(),
      price: price.trim() || '0',
      parameter: parameter.trim() || undefined,
      unit: unit.trim() || undefined,
      normalRangeMale: normalRangeMale.trim() || undefined,
      normalRangeFemale: normalRangeFemale.trim() || undefined,
      normalRangePediatric: normalRangePediatric.trim() || undefined,
      criticalMin: criticalMin.trim() || undefined,
      criticalMax: criticalMax.trim() || undefined,
      parameters: parameters
        .map(p=> ({ name: (p.name||'').trim(), unit: (p.unit||'').trim() || undefined, normalRangeMale: (p.normalRangeMale||'').trim() || undefined, normalRangeFemale: (p.normalRangeFemale||'').trim() || undefined, normalRangePediatric: (p.normalRangePediatric||'').trim() || undefined, formula: (p.formula||'').trim() || undefined, dependencies: p.dependencies && p.dependencies.length > 0 ? p.dependencies : undefined, kind: p.kind || 'quantitative', criticalMin: (p.criticalMin||'').trim() || undefined, criticalMax: (p.criticalMax||'').trim() || undefined, sectionKey: (p.sectionKey||'').trim() || undefined, order: p.order || 0, qualitativeOptions: p.qualitativeOptions?.length ? p.qualitativeOptions : undefined, interpretationRules: p.interpretationRules?.length ? p.interpretationRules : undefined, contributesToTotalPercent: p.contributesToTotalPercent || undefined, totalPercentGroup: (p.totalPercentGroup||'').trim() || undefined, isSensitivityRow: p.isSensitivityRow || undefined, drugList: p.drugList?.length ? p.drugList : undefined }))
        .filter(p=> !!p.name),
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
      turnaroundTime: turnaroundTime ? Number(turnaroundTime) : undefined,
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
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm text-slate-700">Test Name</label>
            <input value={name} onChange={e=>setName(e.target.value)} className="w-full rounded-md border border-slate-300 px-3 py-2" placeholder="Enter test name" />
          </div>
          <div>
            <label className="mb-1 block text-sm text-slate-700">Price (PKR)</label>
            <input value={price} onChange={e=>setPrice(e.target.value)} className="w-full rounded-md border border-slate-300 px-3 py-2" placeholder="0" />
          </div>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm text-slate-700">Category</label>
            <select value={category} onChange={e=>setCategory(e.target.value)} className="w-full rounded-md border border-slate-300 px-3 py-2">
              <option>Other</option><option>Hematology</option><option>Chemistry</option><option>SpecialChemistry</option><option>Serology</option><option>Microbiology</option><option>Molecular</option><option>Cytology</option><option>Histopathology</option><option>Radiology</option><option>Endocrinology</option><option>Immunology</option>
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm text-slate-700">Template</label>
            <select value={template} onChange={e=>setTemplate(e.target.value)} className="w-full rounded-md border border-slate-300 px-3 py-2">
              <option value="general">General</option><option value="cbc">CBC</option><option value="urine_re">Urine RE</option><option value="semen">Semen</option><option value="blood_culture">Blood Culture</option><option value="tft">TFT</option><option value="hba1c">HbA1c</option><option value="qualitative">Qualitative</option><option value="lft">LFT</option><option value="rft">RFT</option><option value="lipid">Lipid</option><option value="custom">Custom</option>
            </select>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm text-slate-700">Parameter</label>
            <input value={parameter} onChange={e=>setParameter(e.target.value)} className="w-full rounded-md border border-slate-300 px-3 py-2" placeholder="Enter parameter (optional)" />
          </div>
          <div>
            <label className="mb-1 block text-sm text-slate-700">Unit</label>
            <input value={unit} onChange={e=>setUnit(e.target.value)} className="w-full rounded-md border border-slate-300 px-3 py-2" placeholder="Enter unit (optional)" />
          </div>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-3">
          <div>
            <label className="mb-1 block text-sm text-slate-700">Normal Range (Male)</label>
            <input value={normalRangeMale} onChange={e=>setNormalRangeMale(e.target.value)} className="w-full rounded-md border border-slate-300 px-3 py-2" placeholder="e.g., 3.5-5.0" />
          </div>
          <div>
            <label className="mb-1 block text-sm text-slate-700">Normal Range (Female)</label>
            <input value={normalRangeFemale} onChange={e=>setNormalRangeFemale(e.target.value)} className="w-full rounded-md border border-slate-300 px-3 py-2" placeholder="e.g., 3.5-5.0" />
          </div>
          <div>
            <label className="mb-1 block text-sm text-slate-700">Normal Range (Pediatric)</label>
            <input value={normalRangePediatric} onChange={e=>setNormalRangePediatric(e.target.value)} className="w-full rounded-md border border-slate-300 px-3 py-2" placeholder="e.g., 3.5-5.0" />
          </div>
        </div>

        <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm text-slate-700">Critical Min</label>
            <input type="number" step="any" value={criticalMin} onChange={e=>setCriticalMin(e.target.value)} className="w-full rounded-md border border-slate-300 px-3 py-2" placeholder="e.g., 2.5" />
          </div>
          <div>
            <label className="mb-1 block text-sm text-slate-700">Critical Max</label>
            <input type="number" step="any" value={criticalMax} onChange={e=>setCriticalMax(e.target.value)} className="w-full rounded-md border border-slate-300 px-3 py-2" placeholder="e.g., 15" />
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
        <div className="mb-2 flex items-center justify-between">
          <div className="text-base font-semibold text-slate-800">Parameters</div>
          <button type="button" onClick={()=> setParameters(prev => [...prev, { id: crypto.randomUUID(), name: '', unit: '', normalRangeMale: '', normalRangeFemale: '', normalRangePediatric: '', formula: '', dependencies: [], kind: 'quantitative', criticalMin: '', criticalMax: '', sectionKey: '', order: 0, qualitativeOptions: [], interpretationRules: [], contributesToTotalPercent: false, totalPercentGroup: '', isSensitivityRow: false, drugList: [] }])} className="rounded-md border border-slate-300 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50">+ Add Parameter</button>
        </div>
        <div className="space-y-3">
          {parameters.map((p, idx) => (
            <div key={p.id} className="rounded-lg border border-slate-200 p-3">
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm text-slate-700">Parameter</label>
                  <input value={p.name} onChange={e=>setParameters(prev=>prev.map((x,i)=> i===idx? { ...x, name: e.target.value }: x))} className="w-full rounded-md border border-slate-300 px-3 py-2" placeholder="Parameter name" />
                </div>
                <div>
                  <label className="mb-1 block text-sm text-slate-700">Unit</label>
                  <input value={p.unit||''} onChange={e=>setParameters(prev=>prev.map((x,i)=> i===idx? { ...x, unit: e.target.value }: x))} className="w-full rounded-md border border-slate-300 px-3 py-2" placeholder="Unit (optional)" />
                </div>
              </div>
              <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-3">
                <div>
                  <label className="mb-1 block text-sm text-slate-700">Normal Range (Male)</label>
                  <input value={p.normalRangeMale||''} onChange={e=>setParameters(prev=>prev.map((x,i)=> i===idx? { ...x, normalRangeMale: e.target.value }: x))} className="w-full rounded-md border border-slate-300 px-3 py-2" placeholder="e.g., 3.5-5.0" />
                </div>
                <div>
                  <label className="mb-1 block text-sm text-slate-700">Normal Range (Female)</label>
                  <input value={p.normalRangeFemale||''} onChange={e=>setParameters(prev=>prev.map((x,i)=> i===idx? { ...x, normalRangeFemale: e.target.value }: x))} className="w-full rounded-md border border-slate-300 px-3 py-2" placeholder="e.g., 3.5-5.0" />
                </div>
                <div>
                  <label className="mb-1 block text-sm text-slate-700">Normal Range (Pediatric)</label>
                  <input value={p.normalRangePediatric||''} onChange={e=>setParameters(prev=>prev.map((x,i)=> i===idx? { ...x, normalRangePediatric: e.target.value }: x))} className="w-full rounded-md border border-slate-300 px-3 py-2" placeholder="e.g., 3.5-5.0" />
                </div>
              </div>
              <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm text-slate-700">Formula (Calculated)</label>
                  <input value={p.formula||''} onChange={e=>setParameters(prev=>prev.map((x,i)=> i===idx? { ...x, formula: e.target.value }: x))} className="w-full rounded-md border border-slate-300 px-3 py-2 font-mono text-sm" placeholder="e.g., LDL_C = TC - HDL - VLDL" />
                </div>
                <div>
                  <label className="mb-1 block text-sm text-slate-700">Dependencies</label>
                  <input value={(p.dependencies||[]).join(', ')} onChange={e=>setParameters(prev=>prev.map((x,i)=> i===idx? { ...x, dependencies: e.target.value.split(',').map(s=>s.trim()).filter(Boolean) }: x))} className="w-full rounded-md border border-slate-300 px-3 py-2" placeholder="e.g., TC, HDL, VLDL" />
                </div>
              </div>
              <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-4">
                <div>
                  <label className="mb-1 block text-sm text-slate-700">Kind</label>
                  <select value={p.kind||'quantitative'} onChange={e=>setParameters(prev=>prev.map((x,i)=>i===idx?{...x,kind:e.target.value as 'quantitative'|'qualitative'}:x))} className="w-full rounded-md border border-slate-300 px-3 py-2">
                    <option value="quantitative">Quantitative</option>
                    <option value="qualitative">Qualitative</option>
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-sm text-slate-700">Critical Min</label>
                  <input type="number" step="any" value={p.criticalMin||''} onChange={e=>setParameters(prev=>prev.map((x,i)=>i===idx?{...x,criticalMin:e.target.value}:x))} className="w-full rounded-md border border-slate-300 px-3 py-2" placeholder="e.g., 2.5" />
                </div>
                <div>
                  <label className="mb-1 block text-sm text-slate-700">Critical Max</label>
                  <input type="number" step="any" value={p.criticalMax||''} onChange={e=>setParameters(prev=>prev.map((x,i)=>i===idx?{...x,criticalMax:e.target.value}:x))} className="w-full rounded-md border border-slate-300 px-3 py-2" placeholder="e.g., 15" />
                </div>
                <div>
                  <label className="mb-1 block text-sm text-slate-700">Section Key</label>
                  <input value={p.sectionKey||''} onChange={e=>setParameters(prev=>prev.map((x,i)=>i===idx?{...x,sectionKey:e.target.value}:x))} className="w-full rounded-md border border-slate-300 px-3 py-2" placeholder="e.g., diff" />
                </div>
              </div>
              <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-3">
                <div>
                  <label className="mb-1 block text-sm text-slate-700">Qualitative Options</label>
                  <input value={(p.qualitativeOptions||[]).join(', ')} onChange={e=>setParameters(prev=>prev.map((x,i)=>i===idx?{...x,qualitativeOptions:e.target.value.split(',').map(s=>s.trim()).filter(Boolean)}:x))} className="w-full rounded-md border border-slate-300 px-3 py-2" placeholder="Positive, Negative, Reactive" />
                </div>
                <div className="flex items-center gap-2 pt-5">
                  <input type="checkbox" checked={p.contributesToTotalPercent||false} onChange={e=>setParameters(prev=>prev.map((x,i)=>i===idx?{...x,contributesToTotalPercent:e.target.checked}:x))} className="h-4 w-4 rounded border-slate-300" />
                  <label className="text-sm text-slate-700">Contributes to 100%</label>
                </div>
                <div>
                  <label className="mb-1 block text-sm text-slate-700">Total % Group</label>
                  <input value={p.totalPercentGroup||''} onChange={e=>setParameters(prev=>prev.map((x,i)=>i===idx?{...x,totalPercentGroup:e.target.value}:x))} className="w-full rounded-md border border-slate-300 px-3 py-2" placeholder="e.g., differential" />
                </div>
              </div>
              <div className="mt-3 text-right">
                <button type="button" onClick={()=> setParameters(prev => prev.filter((_,i)=> i!==idx))} className="rounded-md border border-slate-300 px-2 py-1 text-xs text-slate-700 hover:bg-slate-50">Remove</button>
              </div>
            </div>
          ))}
          {parameters.length === 0 && (
            <div className="rounded-md border border-dashed border-slate-300 p-3 text-sm text-slate-500">No parameters added. Use "+ Add Parameter" to add multiple fields that will auto-fill in result entry.</div>
          )}
        </div>
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
        <div className="text-sm text-slate-600 mb-3">Set the expected Turn Around Time (TAT) for this test. This will be printed on the token slip and used to flag delayed reports.</div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm text-slate-700">Expected TAT (minutes)</label>
            <input type="number" min="0" step="1" value={turnaroundTime} onChange={e=>setTurnaroundTime(e.target.value)} className="w-full rounded-md border border-slate-300 px-3 py-2" placeholder="e.g., 60 for 1 hour, 1440 for 1 day" />
          </div>
          <div className="flex items-end">
            <div className="text-sm text-slate-500">
              {turnaroundTime ? (() => {
                const mins = Number(turnaroundTime)
                if (mins < 60) return `${mins} min(s)`
                if (mins < 1440) return `${Math.floor(mins/60)}h ${mins%60}m`
                return `${Math.floor(mins/1440)}d ${Math.floor((mins%1440)/60)}h`
              })() : 'No TAT set — report delays will not be flagged'}
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
