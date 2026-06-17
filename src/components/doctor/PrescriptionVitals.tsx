import { forwardRef, useImperativeHandle, useMemo, useState } from 'react'
import SuggestField from '../SuggestField'

type DisplayVitals = {
  pulse?: string
  temperature?: string
  bloodPressureSys?: string
  bloodPressureDia?: string
  respiratoryRate?: string
  bloodSugar?: string
  weightKg?: string
  height?: string
  spo2?: string
  ar?: string
  va?: string
  iop?: string
}

type NormalizedVitals = {
  pulse?: number
  temperatureC?: number
  bloodPressureSys?: number
  bloodPressureDia?: number
  respiratoryRate?: number
  bloodSugar?: number
  weightKg?: number
  heightCm?: number
  bmi?: number
  bsa?: number
  spo2?: number
  ar?: string
  va?: string
  iop?: string
}

type VitalSuggestions = {
  pulse?: string[]
  temperature?: string[]
  bloodPressureSys?: string[]
  bloodPressureDia?: string[]
  respiratoryRate?: string[]
  bloodSugar?: string[]
  weightKg?: string[]
  height?: string[]
  spo2?: string[]
  ar?: string[]
  va?: string[]
  iop?: string[]
}

type Props = { initial?: DisplayVitals; suggestions?: VitalSuggestions; onBlurStore?: (field: keyof DisplayVitals, value: string) => void }

export default forwardRef(function PrescriptionVitals({ initial, suggestions, onBlurStore }: Props, ref) {
  const str = (x: any) => x != null ? String(x) : ''
  const [v, setV] = useState<DisplayVitals>({
    pulse: str(initial?.pulse),
    temperature: str(initial?.temperature),
    bloodPressureSys: str(initial?.bloodPressureSys),
    bloodPressureDia: str(initial?.bloodPressureDia),
    respiratoryRate: str(initial?.respiratoryRate),
    bloodSugar: str(initial?.bloodSugar),
    weightKg: str(initial?.weightKg),
    height: str(initial?.height),
    spo2: str(initial?.spo2),
    ar: str(initial?.ar),
    va: str(initial?.va),
    iop: str(initial?.iop),
  })
  const [tempUnit, setTempUnit] = useState<'C'|'F'>('C')
  const [heightUnit, setHeightUnit] = useState<'cm'|'ft'>('cm')

  const num = (x?: string) => {
    const n = parseFloat(String(x||'').trim())
    return isFinite(n) ? n : undefined
  }
  const heightCm = useMemo(() => {
    const h = num(v.height)
    if (h == null) return undefined
    return heightUnit === 'cm' ? h : (h * 30.48)
  }, [v.height, heightUnit])
  const temperatureC = useMemo(() => {
    const t = num(v.temperature)
    if (t == null) return undefined
    return tempUnit === 'C' ? t : ((t - 32) * 5/9)
  }, [v.temperature, tempUnit])
  const weightKg = useMemo(() => num(v.weightKg), [v.weightKg])
  const bmi = useMemo(() => {
    if (weightKg == null || heightCm == null || heightCm <= 0) return undefined
    const m = heightCm / 100
    const b = weightKg / (m*m)
    return isFinite(b) ? +b.toFixed(2) : undefined
  }, [weightKg, heightCm])
  const bsa = useMemo(() => {
    if (weightKg == null || heightCm == null || heightCm <= 0) return undefined
    const val = Math.sqrt((weightKg * heightCm) / 3600)
    return isFinite(val) ? +val.toFixed(2) : undefined
  }, [weightKg, heightCm])

  useImperativeHandle(ref, () => ({
    getNormalized(): NormalizedVitals {
      return {
        pulse: num(v.pulse),
        temperatureC,
        bloodPressureSys: num(v.bloodPressureSys),
        bloodPressureDia: num(v.bloodPressureDia),
        respiratoryRate: num(v.respiratoryRate),
        bloodSugar: num(v.bloodSugar),
        weightKg,
        heightCm,
        bmi,
        bsa,
        spo2: num(v.spo2),
        ar: v.ar,
        va: v.va,
        iop: v.iop,
      }
    },
    getDisplay(): DisplayVitals { return v },
    setDisplay(next: DisplayVitals){
      // Ensure all values are strings for SuggestField compatibility
      const str = (x: any) => x != null ? String(x) : ''
      setV({
        pulse: str(next.pulse),
        temperature: str(next.temperature),
        bloodPressureSys: str(next.bloodPressureSys),
        bloodPressureDia: str(next.bloodPressureDia),
        respiratoryRate: str(next.respiratoryRate),
        bloodSugar: str(next.bloodSugar),
        weightKg: str(next.weightKg),
        height: str(next.height),
        spo2: str(next.spo2),
        ar: str(next.ar),
        va: str(next.va),
        iop: str(next.iop),
      })
    },
  }))

  return (
    <div>
      <div className="mb-1 block text-sm font-semibold text-slate-700">Vitals</div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div className="group">
          <label className="mb-1.5 block text-xs font-bold text-slate-500 group-focus-within:text-sky-600 transition-colors">Pulse</label>
          <SuggestField as="input" value={v.pulse||''} onChange={(val)=>setV(x=>({ ...x, pulse: val }))} onBlurValue={(val)=>onBlurStore?.('pulse', val)} placeholder="bpm" suggestions={suggestions?.pulse || []} className="w-full rounded-xl border-slate-200 px-4 py-3 text-sm focus:border-sky-500 focus:ring-4 focus:ring-sky-500/10 transition-all shadow-sm" />
        </div>
        <div className="group">
          <div className="mb-1.5 flex items-center justify-between">
            <label className="block text-xs font-bold text-slate-500 group-focus-within:text-sky-600 transition-colors">Temperature</label>
            <button type="button" className="text-[10px] font-bold uppercase tracking-wider text-sky-600 hover:text-sky-700 bg-sky-50 px-1.5 py-0.5 rounded transition-colors" onClick={()=>setTempUnit(u=>u==='C'?'F':'C')}>{tempUnit==='C'?'°C → °F':'°F → °C'}</button>
          </div>
          <SuggestField as="input" value={v.temperature||''} onChange={(val)=>setV(x=>({ ...x, temperature: val }))} onBlurValue={(val)=>onBlurStore?.('temperature', val)} placeholder={tempUnit==='C'?"e.g. 37":"e.g. 98.6"} suggestions={suggestions?.temperature || []} className="w-full rounded-xl border-slate-200 px-4 py-3 text-sm focus:border-sky-500 focus:ring-4 focus:ring-sky-500/10 transition-all shadow-sm" />
        </div>
        <div className="group">
          <label className="mb-1.5 block text-xs font-bold text-slate-500 group-focus-within:text-sky-600 transition-colors">Systolic BP</label>
          <SuggestField as="input" value={v.bloodPressureSys||''} onChange={(val)=>setV(x=>({ ...x, bloodPressureSys: val }))} onBlurValue={(val)=>onBlurStore?.('bloodPressureSys', val)} placeholder="mmHg" suggestions={suggestions?.bloodPressureSys || []} className="w-full rounded-xl border-slate-200 px-4 py-3 text-sm focus:border-sky-500 focus:ring-4 focus:ring-sky-500/10 transition-all shadow-sm" />
        </div>
        <div className="group">
          <label className="mb-1.5 block text-xs font-bold text-slate-500 group-focus-within:text-sky-600 transition-colors">Diastolic BP</label>
          <SuggestField as="input" value={v.bloodPressureDia||''} onChange={(val)=>setV(x=>({ ...x, bloodPressureDia: val }))} onBlurValue={(val)=>onBlurStore?.('bloodPressureDia', val)} placeholder="mmHg" suggestions={suggestions?.bloodPressureDia || []} className="w-full rounded-xl border-slate-200 px-4 py-3 text-sm focus:border-sky-500 focus:ring-4 focus:ring-sky-500/10 transition-all shadow-sm" />
        </div>
        <div className="group">
          <label className="mb-1.5 block text-xs font-bold text-slate-500 group-focus-within:text-sky-600 transition-colors">Respiratory rate</label>
          <SuggestField as="input" value={v.respiratoryRate||''} onChange={(val)=>setV(x=>({ ...x, respiratoryRate: val }))} onBlurValue={(val)=>onBlurStore?.('respiratoryRate', val)} placeholder="/min" suggestions={suggestions?.respiratoryRate || []} className="w-full rounded-xl border-slate-200 px-4 py-3 text-sm focus:border-sky-500 focus:ring-4 focus:ring-sky-500/10 transition-all shadow-sm" />
        </div>
        <div className="group">
          <label className="mb-1.5 block text-xs font-bold text-slate-500 group-focus-within:text-sky-600 transition-colors">Blood sugar</label>
          <SuggestField as="input" value={v.bloodSugar||''} onChange={(val)=>setV(x=>({ ...x, bloodSugar: val }))} onBlurValue={(val)=>onBlurStore?.('bloodSugar', val)} placeholder="mg/dL" suggestions={suggestions?.bloodSugar || []} className="w-full rounded-xl border-slate-200 px-4 py-3 text-sm focus:border-sky-500 focus:ring-4 focus:ring-sky-500/10 transition-all shadow-sm" />
        </div>
        <div className="group">
          <label className="mb-1.5 block text-xs font-bold text-slate-500 group-focus-within:text-sky-600 transition-colors">Weight (kg)</label>
          <SuggestField as="input" value={v.weightKg||''} onChange={(val)=>setV(x=>({ ...x, weightKg: val }))} onBlurValue={(val)=>onBlurStore?.('weightKg', val)} placeholder="e.g. 70" suggestions={suggestions?.weightKg || []} className="w-full rounded-xl border-slate-200 px-4 py-3 text-sm focus:border-sky-500 focus:ring-4 focus:ring-sky-500/10 transition-all shadow-sm" />
        </div>
        <div className="group">
          <div className="mb-1.5 flex items-center justify-between">
            <label className="block text-xs font-bold text-slate-500 group-focus-within:text-sky-600 transition-colors">Height</label>
            <button type="button" className="text-[10px] font-bold uppercase tracking-wider text-sky-600 hover:text-sky-700 bg-sky-50 px-1.5 py-0.5 rounded transition-colors" onClick={()=>setHeightUnit(u=>u==='cm'?'ft':'cm')}>{heightUnit==='cm'?"Feet ↔ Cm":"Cm ↔ Feet"}</button>
          </div>
          <SuggestField as="input" value={v.height||''} onChange={(val)=>setV(x=>({ ...x, height: val }))} onBlurValue={(val)=>onBlurStore?.('height', val)} placeholder={heightUnit==='cm'?"cm":"feet"} suggestions={suggestions?.height || []} className="w-full rounded-xl border-slate-200 px-4 py-3 text-sm focus:border-sky-500 focus:ring-4 focus:ring-sky-500/10 transition-all shadow-sm" />
        </div>
        <div className="group">
          <label className="mb-1.5 block text-xs font-bold text-slate-500 group-focus-within:text-sky-600 transition-colors">Oxygen Saturation</label>
          <SuggestField as="input" value={v.spo2||''} onChange={(val)=>setV(x=>({ ...x, spo2: val }))} onBlurValue={(val)=>onBlurStore?.('spo2', val)} placeholder="%" suggestions={suggestions?.spo2 || []} className="w-full rounded-xl border-slate-200 px-4 py-3 text-sm focus:border-sky-500 focus:ring-4 focus:ring-sky-500/10 transition-all shadow-sm" />
        </div>
        <div className="group">
          <label className="mb-1.5 block text-xs font-bold text-slate-500 group-focus-within:text-sky-600 transition-colors">AR (Autorefraction)</label>
          <SuggestField as="input" value={v.ar||''} onChange={(val)=>setV(x=>({ ...x, ar: val }))} onBlurValue={(val)=>onBlurStore?.('ar', val)} placeholder="e.g. -1.25 -0.50" suggestions={suggestions?.ar || []} className="w-full rounded-xl border-slate-200 px-4 py-3 text-sm focus:border-sky-500 focus:ring-4 focus:ring-sky-500/10 transition-all shadow-sm" />
        </div>
        <div className="group">
          <label className="mb-1.5 block text-xs font-bold text-slate-500 group-focus-within:text-sky-600 transition-colors">VA (Visual Acuity)</label>
          <SuggestField as="input" value={v.va||''} onChange={(val)=>setV(x=>({ ...x, va: val }))} onBlurValue={(val)=>onBlurStore?.('va', val)} placeholder="e.g. 6/6" suggestions={suggestions?.va || []} className="w-full rounded-xl border-slate-200 px-4 py-3 text-sm focus:border-sky-500 focus:ring-4 focus:ring-sky-500/10 transition-all shadow-sm" />
        </div>
        <div className="group">
          <label className="mb-1.5 block text-xs font-bold text-slate-500 group-focus-within:text-sky-600 transition-colors">IOP (Intraocular Pressure)</label>
          <SuggestField as="input" value={v.iop||''} onChange={(val)=>setV(x=>({ ...x, iop: val }))} onBlurValue={(val)=>onBlurStore?.('iop', val)} placeholder="mmHg" suggestions={suggestions?.iop || []} className="w-full rounded-xl border-slate-200 px-4 py-3 text-sm focus:border-sky-500 focus:ring-4 focus:ring-sky-500/10 transition-all shadow-sm" />
        </div>
        <div>
          <label className="mb-1.5 block text-xs font-bold text-slate-500">BMI</label>
          <input className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold text-slate-600" value={bmi!=null?String(bmi):''} readOnly disabled />
        </div>
        <div>
          <label className="mb-1 block text-xs text-slate-600">BSA</label>
          <input className="w-full rounded-md border border-slate-300 bg-slate-100 px-3 py-2 text-sm" value={bsa!=null?String(bsa):''} readOnly disabled />
        </div>
      </div>
    </div>
  )
})
