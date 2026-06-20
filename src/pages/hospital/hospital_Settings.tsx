import { useEffect, useState } from 'react'
import { logAudit } from '../../utils/hospital_audit'
import { hospitalApi } from '../../utils/api'

type ManualRxFields = {
  tokenNo: boolean; mrn: boolean; patientName: boolean; fatherName: boolean
  age: boolean; gender: boolean; phone: boolean; address: boolean; cnic: boolean
  tokenType: boolean; dateTime: boolean; doctorName: boolean; qualification: boolean; departmentName: boolean
  showRxSymbol: boolean
}

const DEFAULT_MANUAL_RX_FIELDS: ManualRxFields = {
  tokenNo: true, mrn: true, patientName: true, fatherName: true,
  age: true, gender: true, phone: true, address: true, cnic: true,
  tokenType: true, dateTime: true, doctorName: true, qualification: true, departmentName: true,
  showRxSymbol: true,
}

const MANUAL_RX_FIELD_LABELS: Record<keyof ManualRxFields, string> = {
  tokenNo: 'Token No', mrn: 'MR Number', patientName: 'Patient Name', fatherName: 'Father / Guardian Name',
  age: 'Age', gender: 'Gender', phone: 'Phone', address: 'Address', cnic: 'CNIC',
  tokenType: 'Token Type', dateTime: 'Date & Time', doctorName: 'Doctor Name',
  qualification: 'Qualification', departmentName: 'Department',
  showRxSymbol: 'Rx Symbol',
}

type BillingRule = {
  feeMode?: 'department-only' | 'doctor-only' | 'both' | 'none'
  doctorCommissionPercent?: number
}

type Settings = {
  name: string
  phone: string
  address: string
  email?: string
  website?: string
  logoDataUrl?: string
  slipFooter?: string
  mrnFormat?: string
  manualRxFields?: ManualRxFields
  eyeRxEnabled?: boolean
  timeFormat?: '12h' | '24h'
  icuLabel?: string
  corporateLabel?: string
  departmentBillingRules?: Record<string, BillingRule>
}

export default function Hospital_Settings() {
  const [settings, setSettings] = useState<Settings>({
    name: 'Mindspire Hospital Management System',
    phone: '+92-320-4090604',
    address: 'Hospital Address, City, Country',
    email: '',
    website: '',
    logoDataUrl: undefined,
    slipFooter: 'Powered by Hospital MIS',
    mrnFormat: '',
    manualRxFields: { ...DEFAULT_MANUAL_RX_FIELDS },
    eyeRxEnabled: true,
    timeFormat: '12h',
    icuLabel: 'ICU',
    corporateLabel: 'Corporate',
    departmentBillingRules: {},
  })
  const [departments, setDepartments] = useState<Array<{ id: string; name: string }>>([])
  const [savedBanner, setSavedBanner] = useState<string>('')

  useEffect(() => {
    let cancelled = false
    async function load(){
      try {
        const raw = await hospitalApi.getSettings() as any
        if (!cancelled && raw) {
          const s: any = raw?.settings || raw
          const apiEyeRx = s?.eyeRxEnabled
          const apiManualRx = s?.manualRxFields
          // Load custom labels from localStorage
          let icuLabel = 'ICU'
          let corporateLabel = 'Corporate'
          let timeFormat: '12h' | '24h' = '12h'
          try {
            icuLabel = localStorage.getItem('hospital.icuLabel') || icuLabel
            corporateLabel = localStorage.getItem('hospital.corporateLabel') || corporateLabel
            timeFormat = (s?.timeFormat || localStorage.getItem('hospital.timeFormat') || '12h') as '12h' | '24h'
          } catch {}
          setSettings(prev => ({
            ...prev,
            ...s,
            manualRxFields: apiManualRx
              ? { ...DEFAULT_MANUAL_RX_FIELDS, ...apiManualRx }
              : (prev.manualRxFields || { ...DEFAULT_MANUAL_RX_FIELDS }),
            eyeRxEnabled: (apiEyeRx === false || apiEyeRx === true)
              ? apiEyeRx !== false
              : true,
            timeFormat,
            icuLabel,
            corporateLabel,
            departmentBillingRules: s?.departmentBillingRules || prev.departmentBillingRules || {},
          }))
        }
      } catch {}
    }
    load()
    return () => { cancelled = true }
  }, [])

  // Load departments for billing rules
  useEffect(() => {
    let cancelled = false
    async function loadDeps() {
      try {
        const dRes = await hospitalApi.listDepartments({ limit: 1000 }) as any
        const deps = (dRes.departments || dRes || []).map((d: any) => ({ id: String(d._id || d.id), name: d.name }))
        if (!cancelled) setDepartments(deps)
      } catch {}
    }
    loadDeps()
    return () => { cancelled = true }
  }, [])

  const update = (k: keyof Settings, v: string) => setSettings(s => ({ ...s, [k]: v }))

  const updateBillingRule = (depId: string, patch: Partial<BillingRule>) => {
    setSettings(s => {
      const rules = { ...(s.departmentBillingRules || {}) }
      rules[depId] = { ...(rules[depId] || {}), ...patch }
      return { ...s, departmentBillingRules: rules }
    })
  }

  const removeBillingRule = (depId: string) => {
    setSettings(s => {
      const rules = { ...(s.departmentBillingRules || {}) }
      delete rules[depId]
      return { ...s, departmentBillingRules: rules }
    })
  }

  const toggleRxField = (k: keyof ManualRxFields) =>
    setSettings(s => ({
      ...s,
      manualRxFields: {
        ...DEFAULT_MANUAL_RX_FIELDS,
        ...(s.manualRxFields || {}),
        [k]: !(s.manualRxFields?.[k] ?? DEFAULT_MANUAL_RX_FIELDS[k]),
      },
    }))

  const onUploadLogo = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => setSettings(s => ({ ...s, logoDataUrl: String(reader.result || '') }))
    reader.readAsDataURL(file)
  }

  const onRemoveLogo = () => setSettings(s => ({ ...s, logoDataUrl: '' }))

  const onSave = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      // Remove frontend-only fields before sending to backend
      const { icuLabel, corporateLabel, ...apiPayload } = settings
      await hospitalApi.updateSettings(apiPayload)
      // Persist custom labels and time format to localStorage so the app picks them up instantly
      try {
        if (settings.icuLabel) localStorage.setItem('hospital.icuLabel', settings.icuLabel)
        if (settings.corporateLabel) localStorage.setItem('hospital.corporateLabel', settings.corporateLabel)
        if (settings.timeFormat) localStorage.setItem('hospital.timeFormat', settings.timeFormat)
        window.dispatchEvent(new Event('hospital:labels:updated'))
      } catch {}
      setSavedBanner('Settings saved successfully')
      logAudit('user_edit', 'hospital settings saved')
      setTimeout(() => setSavedBanner(''), 2000)
    } catch (err: any) {
      setSavedBanner(err?.message || 'Failed to save')
      setTimeout(() => setSavedBanner(''), 2500)
    }
  }

  const mrnPreview = (() => {
    const fmt = String(settings.mrnFormat || '').trim()
    const now = new Date()
    const YYYY = String(now.getFullYear())
    const YY = YYYY.slice(-2)
    const MM = String(now.getMonth() + 1).padStart(2, '0')
    const DD = String(now.getDate()).padStart(2, '0')
    const pad = (n: number, w: number) => String(n).padStart(w, '0')
    const seq = 12345
    if (!fmt) return `MR-${seq}`
    let s = fmt
    s = s.replace(/\{HOSP\}/gi, '')
    s = s.replace(/\{YEAR\}|\{YYYY\}/gi, YYYY)
    s = s.replace(/\{YY\}/g, YY)
    s = s.replace(/\{MONTH\}|\{MM\}/gi, MM)
    s = s.replace(/\{DD\}/g, DD)
    s = s.replace(/\{SERIAL6\}/gi, pad(seq, 6))
    s = s.replace(/\{SERIAL4\}/gi, pad(seq, 4))
    s = s.replace(/\{SERIAL3\}/gi, pad(seq, 3))
    s = s.replace(/\{SERIAL2\}/gi, pad(seq, 2))
    s = s.replace(/\{SERIAL\}/gi, String(seq))
    return s
  })()

  return (
    <div>
      <div className="rounded-2xl bg-linear-to-r from-violet-500 via-pink-500 to-cyan-500 p-6 text-white shadow">
        <h2 className="text-2xl font-bold">Hospital Settings</h2>
        <p className="opacity-90">Manage hospital information, security, and data.</p>
      </div>

      <form onSubmit={onSave} className="mt-6 space-y-4">
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 px-4 py-3">
            <div className="flex items-center gap-2 text-lg font-semibold text-slate-800">
              <span>Hospital Information</span>
            </div>
          </div>

          <div className="grid gap-4 p-4 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Hospital Name</label>
              <input value={settings.name} onChange={e=>update('name', e.target.value)} className="w-full rounded-md border border-slate-300 px-3 py-2 outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-200" />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Hospital Phone</label>
              <input value={settings.phone} onChange={e=>update('phone', e.target.value)} className="w-full rounded-md border border-slate-300 px-3 py-2 outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-200" />
            </div>
            <div className="md:col-span-2">
              <label className="mb-1 block text-sm font-medium text-slate-700">Hospital Address</label>
              <input value={settings.address} onChange={e=>update('address', e.target.value)} className="w-full rounded-md border border-slate-300 px-3 py-2 outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-200" />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Email</label>
              <input value={settings.email || ''} onChange={e=>update('email', e.target.value)} placeholder="info@hospital.com" className="w-full rounded-md border border-slate-300 px-3 py-2 outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-200" />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Website</label>
              <input value={settings.website || ''} onChange={e=>update('website', e.target.value)} placeholder="www.hospital.com" className="w-full rounded-md border border-slate-300 px-3 py-2 outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-200" />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">ICU / HDU Label</label>
              <input value={settings.icuLabel || 'ICU'} onChange={e=>update('icuLabel', e.target.value)} placeholder="e.g., ICU or HDU" className="w-full rounded-md border border-slate-300 px-3 py-2 outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-200" />
              <p className="mt-1 text-xs text-slate-500">Rename the ICU module label across the system (e.g., HDU, CCU, MICU).</p>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Corporate Label</label>
              <input value={settings.corporateLabel || 'Corporate'} onChange={e=>update('corporateLabel', e.target.value)} placeholder="e.g., Corporate, Zakat & Donations" className="w-full rounded-md border border-slate-300 px-3 py-2 outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-200" />
              <p className="mt-1 text-xs text-slate-500">Rename the Corporate module label across the system (e.g., Zakat & Donations, Corporate & Insurance).</p>
            </div>

            <div className="md:col-span-2">
              <label className="mb-1 block text-sm font-medium text-slate-700">Token Slip Footer</label>
              <input value={settings.slipFooter || ''} onChange={e=>update('slipFooter', e.target.value)} placeholder="e.g., Powered by Hospital MIS" className="w-full rounded-md border border-slate-300 px-3 py-2 outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-200" />
              <p className="mt-1 text-xs text-slate-500">Shown at the bottom of printed token slips.</p>
            </div>

            <div className="md:col-span-2">
              <label className="mb-1 block text-sm font-medium text-slate-700">MR Number Format</label>
              <input
                value={settings.mrnFormat || ''}
                onChange={e=>update('mrnFormat', e.target.value)}
                placeholder="e.g., {HOSP}-{YYYY}{MM}-{SERIAL6}"
                className="w-full rounded-md border border-slate-300 px-3 py-2 outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-200"
              />
              <div className="mt-1 text-xs text-slate-500">
                Tokens: {`{YYYY}`}/{`{YY}`}, {`{MM}`}/{`{DD}`}, {`{SERIAL}`}, {`{SERIAL2}`}/{`{SERIAL3}`}/{`{SERIAL4}`}/{`{SERIAL6}`}.
                Counter keeps growing automatically.
              </div>
              <div className="mt-1 text-xs text-slate-600">Preview: <span className="font-mono">{mrnPreview}</span></div>
            </div>

            <div className="md:col-span-2">
              <label className="mb-1 block text-sm font-medium text-slate-700">Hospital Logo</label>
              <div className="flex items-center gap-3">
                <label className="inline-flex cursor-pointer items-center rounded-md bg-violet-600 px-3 py-2 text-sm font-medium text-white hover:bg-violet-700">
                  <input type="file" accept="image/*" onChange={onUploadLogo} className="hidden" />
                  Upload Logo
                </label>
                {settings.logoDataUrl && (
                  <>
                    <img src={settings.logoDataUrl} alt="Logo" className="h-10 w-10 rounded-full border border-slate-200 object-cover" />
                    <button type="button" onClick={onRemoveLogo} className="rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50">Remove</button>
                  </>
                )}
              </div>
            </div>

            <div className="md:col-span-2">
              <label className="mb-1 block text-sm font-medium text-slate-700">Time Format</label>
              <div className="flex flex-wrap items-center gap-3">
                <select
                  value={settings.timeFormat || '12h'}
                  onChange={e => setSettings(s => ({ ...s, timeFormat: e.target.value as '12h' | '24h' }))}
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-200 md:w-48"
                >
                  <option value="12h">12-Hour (03:45 PM)</option>
                  <option value="24h">24-Hour (15:45)</option>
                </select>
                <span className="text-sm text-slate-500">
                  Preview: <span className="font-mono font-medium text-slate-700">{
                    settings.timeFormat === '24h'
                      ? new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false })
                      : new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })
                  }</span>
                </span>
              </div>
              <p className="mt-1 text-xs text-slate-500">Applies to all timestamps across the application (patient profiles, tokens, reports, billing).</p>
            </div>

          </div>

          <div className="border-t border-slate-200 px-4 py-3">
            <button type="submit" className="rounded-md bg-sky-600 px-4 py-2 text-sm font-medium text-white hover:bg-sky-700">Save Information</button>
            {savedBanner && <span className="ml-3 text-sm text-emerald-600">{savedBanner}</span>}
          </div>
        </div>

        {/* ── Manual Prescription Layout ─────────────────────────────── */}
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 px-4 py-3">
            <div className="flex items-center gap-2 text-lg font-semibold text-slate-800">
              <span>Manual Prescription Layout</span>
            </div>
            <p className="mt-0.5 text-xs text-slate-500">Choose which fields print on the Hospital Rx and whether the Eye Rx button appears on the token slip.</p>
          </div>

          <div className="p-4 space-y-5">

            {/* Eye Rx toggle */}
            <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
              <div>
                <p className="text-sm font-semibold text-slate-800">Eye Prescription Button</p>
                <p className="text-xs text-slate-500">Show "Print Eye Rx" button on the token slip modal</p>
              </div>
              <button
                type="button"
                onClick={() => setSettings(s => ({ ...s, eyeRxEnabled: !(s.eyeRxEnabled ?? true) }))}
                className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors ${
                  (settings.eyeRxEnabled ?? true) ? 'bg-sky-500' : 'bg-slate-300'
                }`}
              >
                <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                  (settings.eyeRxEnabled ?? true) ? 'translate-x-6' : 'translate-x-1'
                }`} />
              </button>
            </div>

            {/* Field checkboxes */}
            <div>
              <p className="mb-2 text-sm font-medium text-slate-700">Fields to include on printed Rx</p>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {(Object.keys(DEFAULT_MANUAL_RX_FIELDS) as (keyof ManualRxFields)[]).map(k => {
                  const checked = settings.manualRxFields?.[k] ?? DEFAULT_MANUAL_RX_FIELDS[k]
                  return (
                    <label
                      key={k}
                      className={`flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 transition-colors select-none ${
                        checked ? 'border-sky-300 bg-sky-50' : 'border-slate-200 bg-white hover:bg-slate-50'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleRxField(k)}
                        className="h-4 w-4 accent-sky-600"
                      />
                      <span className={`text-sm ${checked ? 'font-medium text-sky-800' : 'text-slate-600'}`}>
                        {MANUAL_RX_FIELD_LABELS[k]}
                      </span>
                    </label>
                  )
                })}
              </div>
            </div>
          </div>

          <div className="border-t border-slate-200 px-4 py-3">
            <button type="submit" className="rounded-md bg-sky-600 px-4 py-2 text-sm font-medium text-white hover:bg-sky-700">Save Settings</button>
            {savedBanner && <span className="ml-3 text-sm text-emerald-600">{savedBanner}</span>}
          </div>
        </div>

        {/* ── Department Billing Rules ─────────────────────────────── */}
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 px-4 py-3">
            <div className="flex items-center gap-2 text-lg font-semibold text-slate-800">
              <span>Department Billing Rules</span>
            </div>
            <p className="mt-0.5 text-xs text-slate-500">Configure how consultation fees are calculated per department and set doctor commission.</p>
          </div>

          <div className="p-4 space-y-4">
            {departments.length === 0 && (
              <p className="text-sm text-slate-500">Loading departments...</p>
            )}
            {departments.map(dep => {
              const rule = settings.departmentBillingRules?.[dep.id]
              const hasRule = !!rule
              return (
                <div key={dep.id} className={`rounded-lg border p-3 transition-colors ${hasRule ? 'border-sky-300 bg-sky-50' : 'border-slate-200 bg-white'}`}>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-slate-800">{dep.name}</span>
                    {!hasRule ? (
                      <button
                        type="button"
                        onClick={() => updateBillingRule(dep.id, { feeMode: 'both', doctorCommissionPercent: 0 })}
                        className="rounded-md bg-sky-600 px-2 py-1 text-xs font-medium text-white hover:bg-sky-700"
                      >
                        Add Rule
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => removeBillingRule(dep.id)}
                        className="rounded-md border border-slate-300 px-2 py-1 text-xs text-slate-700 hover:bg-slate-50"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                  {hasRule && (
                    <div className="mt-3 grid gap-3 md:grid-cols-2">
                      <div>
                        <label className="mb-1 block text-xs font-medium text-slate-600">Fee Mode</label>
                        <select
                          value={rule.feeMode || 'both'}
                          onChange={e => updateBillingRule(dep.id, { feeMode: e.target.value as BillingRule['feeMode'] })}
                          className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-200"
                        >
                          <option value="both">Both (Department + Doctor)</option>
                          <option value="department-only">Department Fee Only</option>
                          <option value="doctor-only">Doctor Fee Only</option>
                          <option value="none">No Fee</option>
                        </select>
                        <p className="mt-1 text-[10px] text-slate-500">
                          {rule.feeMode === 'department-only' && 'Only department base fee will be charged.'}
                          {rule.feeMode === 'doctor-only' && 'Only doctor fee will be charged.'}
                          {rule.feeMode === 'both' && 'Department fee + doctor fee will be combined.'}
                          {rule.feeMode === 'none' && 'No consultation fee will be charged.'}
                        </p>
                      </div>
                      <div>
                        <label className="mb-1 block text-xs font-medium text-slate-600">Doctor Commission (%)</label>
                        <input
                          type="number"
                          min={0}
                          max={100}
                          value={rule.doctorCommissionPercent ?? 0}
                          onChange={e => updateBillingRule(dep.id, { doctorCommissionPercent: Math.min(100, Math.max(0, Number(e.target.value) || 0)) })}
                          className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-200"
                        />
                        <p className="mt-1 text-[10px] text-slate-500">Percentage of fee that goes to the doctor.</p>
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          <div className="border-t border-slate-200 px-4 py-3">
            <button type="submit" className="rounded-md bg-sky-600 px-4 py-2 text-sm font-medium text-white hover:bg-sky-700">Save Settings</button>
            {savedBanner && <span className="ml-3 text-sm text-emerald-600">{savedBanner}</span>}
          </div>
        </div>
      </form>
    </div>
  )
}
