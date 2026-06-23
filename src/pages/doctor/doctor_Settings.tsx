import { useEffect, useState } from 'react'
import { previewPrescriptionPdf, PRESCRIPTION_PDF_TEMPLATES, TEMPLATE_LABELS, TEMPLATE_DESCRIPTIONS } from '../../utils/prescriptionPdf'
import type { PrescriptionPdfTemplate } from '../../utils/prescriptionPdf'
import { hospitalApi } from '../../utils/api'
import {
  Settings2,
  Image as ImageIcon,
  Layout,
  Type,
  ShieldCheck,
  Eye,
  Save,
  CheckCircle2,
  Languages,
  UserCircle,
} from 'lucide-react'

type HospitalSettings = {
  name: string
  phone: string
  address: string
  logoDataUrl?: string
}

type PrescriptionDesignSettings = {
  showWatermark: boolean
  watermarkText?: string
  watermarkOpacity: number
  showHeader: boolean
  showFooter: boolean
  headerHeight: number
  footerHeight: number
}

export type PrescriptionLanguage = 'english' | 'urdu'

export default function Doctor_Settings() {
  type DoctorSession = { id: string; name?: string; username?: string }
  const [doc, setDoc] = useState<DoctorSession | null>(null)
  const [tpl, setTpl] = useState<PrescriptionPdfTemplate>('hospital-rx')
  const [language, setLanguage] = useState<PrescriptionLanguage>(() => {
    try {
      const saved = localStorage.getItem('doctor.rx.language.default') as PrescriptionLanguage
      if (saved === 'english' || saved === 'urdu') return saved
    } catch {}
    return 'english'
  })
  const [saved, setSaved] = useState(false)
  // Auto-archive window for pending-investigation drafts (0 = keep all)
  const [draftRetentionDays, setDraftRetentionDays] = useState<number>(() => {
    try { const v = Number(localStorage.getItem('doctor.rx.draftRetentionDays')); if (isFinite(v) && v >= 0) return v } catch {}
    return 7
  })
  const [hospitalSettings, setHospitalSettings] = useState<HospitalSettings>({
    name: 'Hospital',
    phone: '',
    address: '',
    logoDataUrl: undefined,
  })
  const [design, setDesign] = useState<PrescriptionDesignSettings>({
    showWatermark: true,
    watermarkText: 'CONFIDENTIAL',
    watermarkOpacity: 0.1,
    showHeader: true,
    showFooter: true,
    headerHeight: 40,
    footerHeight: 25,
  })
  const [doctorProfile, setDoctorProfile] = useState({
    name: '',
    qualification: '',
    specialization: '',
    departmentName: '',
    phone: '',
  })

  useEffect(() => {
    try {
      const raw = localStorage.getItem('doctor.session')
      const sess = raw ? JSON.parse(raw) : null
      setDoc(sess)
      ;(async () => {
        try {
          if (sess?.id) {
            const doctorData: any = await hospitalApi.getDoctor(sess.id)
            const d = doctorData?.doctor || doctorData
            if (d?.prescriptionTemplate) setTpl(d.prescriptionTemplate)
            if (d?.prescriptionLanguage) {
              setLanguage(d.prescriptionLanguage)
            } else {
              // Fallback to localStorage if API doesn't persist language
              try {
                const savedLang = localStorage.getItem('doctor.rx.language.default') as PrescriptionLanguage
                if (savedLang === 'english' || savedLang === 'urdu') setLanguage(savedLang)
              } catch {}
            }
            if (d?.prescriptionDesign) setDesign((prev) => ({ ...prev, ...d.prescriptionDesign }))
            if (d?.prescriptionDesign?.draftRetentionDays != null) setDraftRetentionDays(Number(d.prescriptionDesign.draftRetentionDays))
            // Load doctor profile — merge API data with any locally saved overrides
            const profileFromApi = {
              name: d?.name || sess?.name || '',
              qualification: d?.qualification || '',
              specialization: d?.specialization || '',
              departmentName: '',
              phone: d?.phone || '',
            }
            try {
              const savedRaw = localStorage.getItem(`doctor.details.${sess.id}`)
              if (savedRaw) {
                const saved2 = JSON.parse(savedRaw)
                setDoctorProfile({
                  name: saved2.name || profileFromApi.name,
                  qualification: saved2.qualification || profileFromApi.qualification,
                  specialization: saved2.specialization || profileFromApi.specialization,
                  departmentName: saved2.departmentName || profileFromApi.departmentName,
                  phone: saved2.phone || profileFromApi.phone,
                })
              } else {
                setDoctorProfile(profileFromApi)
              }
            } catch {
              setDoctorProfile(profileFromApi)
            }
          }
        } catch {}
      })()
      ;(async () => {
        try {
          const s = await hospitalApi.getSettings() as any
          if (s) setHospitalSettings({ name: s.name || 'Hospital', phone: s.phone || '', address: s.address || '', logoDataUrl: s.logoDataUrl })
        } catch {}
      })()
    } catch {}
  }, [])

  const save = async () => {
    try {
      if (doc?.id) {
        await hospitalApi.updateDoctorProfile(doc.id, {
          prescriptionTemplate: tpl,
          prescriptionLanguage: language,
          prescriptionDesign: { ...design, draftRetentionDays },
          name: doctorProfile.name || undefined,
          qualification: doctorProfile.qualification || undefined,
          specialization: doctorProfile.specialization || undefined,
          phone: doctorProfile.phone || undefined,
        })
        // Persist profile locally so prescription page picks it up immediately
        localStorage.setItem(`doctor.details.${doc.id}`, JSON.stringify({
          name: doctorProfile.name,
          qualification: doctorProfile.qualification,
          specialization: doctorProfile.specialization,
          departmentName: doctorProfile.departmentName,
          phone: doctorProfile.phone,
        }))
        localStorage.setItem(`doctor.rx.language.${doc.id}`, language)
        localStorage.setItem('doctor.rx.language.default', language)
        localStorage.setItem(`doctor.rx.design.${doc.id}`, JSON.stringify(design))
        localStorage.setItem('doctor.rx.draftRetentionDays', String(draftRetentionDays))
      }
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } catch (err: any) {
      alert(err?.message || 'Failed to save settings')
    }
  }

  const previewSample = async () => {
    await previewPrescriptionPdf({
      doctor: { name: doctorProfile.name || doc?.name || 'Doctor', qualification: doctorProfile.qualification || 'MBBS, FCPS', specialization: doctorProfile.specialization || 'Consultant Physician', departmentName: doctorProfile.departmentName || 'Internal Medicine', phone: doctorProfile.phone || hospitalSettings.phone },
      settings: { name: hospitalSettings.name || 'Hospital', address: hospitalSettings.address || '123 Medical Plaza, City Avenue', phone: hospitalSettings.phone || '0300-0000000', logoDataUrl: hospitalSettings.logoDataUrl || '' },
      patient: { name: 'John Doe', mrn: 'MR0001', gender: 'Male', age: '30', phone: '0300-1234567', address: 'Downtown, City' },
      vitals: { pulse: 76, temperatureC: 36.9, bloodPressureSys: 120, bloodPressureDia: 80, respiratoryRate: 18, spo2: 98 },
      items: [
        { name: 'Tab. Paracetamol 500mg', frequency: 'morning / night', duration: '5 days', dose: '1 tablet', instruction: 'After meals', route: 'Oral' },
        { name: 'Cap. Omeprazole 20mg', frequency: 'once a day', duration: '7 days', dose: '1 capsule', instruction: 'Before breakfast', route: 'Oral' },
      ],
      labTests: ['CBC', 'LFT', 'Serum Creatinine'],
      diagnosticTests: ['Ultrasound Upper Abdomen'],
      advice: 'Ensure plenty of hydration and bed rest for at least 3 days. Return if fever persists beyond 48 hours.',
      createdAt: new Date(),
    }, tpl)
  }

  return (
    <div className="w-full max-w-6xl mx-auto px-4 py-6 animate-in fade-in duration-500">
      {/* ── Page Header ── */}
      <div className="flex flex-wrap items-start justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Prescription Settings</h1>
          <p className="text-slate-500 text-sm mt-1">Configure your digital prescription layout, branding, and printing preferences.</p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          {saved && (
            <div className="flex items-center gap-1.5 text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-full border border-emerald-100 text-sm font-medium animate-in zoom-in">
              <CheckCircle2 className="h-4 w-4" />
              Settings Saved
            </div>
          )}
          <button
            onClick={previewSample}
            className="flex items-center gap-2 px-4 py-2 text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-all font-medium shadow-sm"
          >
            <Eye className="h-4 w-4 text-slate-500" />
            Preview Sample
          </button>
          <button
            onClick={save}
            className="flex items-center gap-2 px-6 py-2 bg-sky-600 text-white rounded-lg hover:bg-sky-700 transition-all font-semibold shadow-md shadow-sky-100"
          >
            <Save className="h-4 w-4" />
            Save Changes
          </button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-12">
        {/* ── Left Column ── */}
        <div className="lg:col-span-4 space-y-6">

          {/* Doctor Profile */}
          <section className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-5 border-b border-slate-100 bg-slate-50/50 flex items-center gap-3">
              <UserCircle className="h-5 w-5 text-sky-600" />
              <h2 className="font-bold text-slate-800">Doctor Profile</h2>
            </div>
            <div className="p-5 space-y-3">
              <p className="text-xs text-slate-500 -mt-1 mb-2">These details appear on every printed prescription.</p>
              {([
                { key: 'name',           label: 'Full Name',        placeholder: 'e.g. Dr. Ahmed Ali' },
                { key: 'qualification',  label: 'Qualifications',   placeholder: 'e.g. MBBS, FCPS (Medicine)' },
                { key: 'specialization', label: 'Specialization',   placeholder: 'e.g. Consultant Physician' },
                { key: 'departmentName', label: 'Department',       placeholder: 'e.g. Internal Medicine' },
                { key: 'phone',          label: 'Contact / PMDC',   placeholder: 'e.g. 0300-0000000' },
              ] as { key: keyof typeof doctorProfile; label: string; placeholder: string }[]).map(({ key, label, placeholder }) => (
                <div key={key}>
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-1 block">{label}</label>
                  <input
                    type="text"
                    value={doctorProfile[key]}
                    onChange={e => setDoctorProfile(p => ({ ...p, [key]: e.target.value }))}
                    placeholder={placeholder}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-sky-500/10 focus:border-sky-500 outline-none transition-all"
                  />
                </div>
              ))}
            </div>
          </section>

          {/* Master Template */}
          <section className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-5 border-b border-slate-100 bg-slate-50/50 flex items-center gap-3">
              <Layout className="h-5 w-5 text-sky-600" />
              <h2 className="font-bold text-slate-800">Master Template</h2>
            </div>
            <div className="p-5">
              <label className="text-sm font-medium text-slate-700 mb-3 block">Choose Your Signature Style</label>
              <div className="grid gap-2">
                {PRESCRIPTION_PDF_TEMPLATES.map((key) => (
                  <button
                    key={key}
                    onClick={() => setTpl(key)}
                    className={`flex items-center justify-between px-4 py-3 rounded-xl border transition-all text-left ${
                      tpl === key
                        ? 'border-sky-500 bg-sky-50 ring-2 ring-sky-500/10'
                        : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex flex-col">
                      <span className={`text-sm font-bold ${tpl === key ? 'text-sky-700' : 'text-slate-700'}`}>{TEMPLATE_LABELS[key]}</span>
                      <span className="text-[10px] text-slate-400 tracking-wide font-medium mt-0.5">{TEMPLATE_DESCRIPTIONS[key]}</span>
                    </div>
                    {tpl === key && <CheckCircle2 className="h-5 w-5 text-sky-600 shrink-0" />}
                  </button>
                ))}
              </div>
            </div>
          </section>

          {/* Prescription Language */}
          <section className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-5 border-b border-slate-100 bg-slate-50/50 flex items-center gap-3">
              <Languages className="h-5 w-5 text-sky-600" />
              <h2 className="font-bold text-slate-800">Prescription Language</h2>
            </div>
            <div className="p-5 space-y-3">
              {(['english', 'urdu'] as PrescriptionLanguage[]).map((lang) => (
                <button
                  key={lang}
                  onClick={() => setLanguage(lang)}
                  className={`flex items-center justify-between w-full px-4 py-3 rounded-xl border transition-all text-left ${
                    language === lang
                      ? 'border-sky-500 bg-sky-50 ring-2 ring-sky-500/10'
                      : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  <div>
                    <div className={`text-sm font-bold ${language === lang ? 'text-sky-700' : 'text-slate-700'}`}>
                      {lang === 'english' ? 'English' : 'Urdu (اردو)'}
                    </div>
                    <div className="text-[10px] text-slate-500 font-medium mt-0.5">
                      {lang === 'urdu' ? 'Jameel Noori Nastaleeq font' : 'Default Latin script'}
                    </div>
                  </div>
                  {language === lang && <CheckCircle2 className="h-5 w-5 text-sky-600 shrink-0" />}
                </button>
              ))}
              {language === 'urdu' && (
                <p className="text-xs text-amber-600 font-medium bg-amber-50 rounded-lg px-3 py-2 border border-amber-100">
                  Ensure Jameel Noori Nastaleeq font is installed on your computer for correct Urdu printing.
                </p>
              )}
            </div>
          </section>

          {/* Pending Investigation Drafts */}
          <section className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-5 border-b border-slate-100 bg-slate-50/50 flex items-center gap-3">
              <Languages className="h-5 w-5 text-amber-600" />
              <h2 className="font-bold text-slate-800">Pending Investigation Drafts</h2>
            </div>
            <div className="p-5 space-y-2">
              <label className="text-sm font-semibold text-slate-700">Auto-archive drafts after</label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min={0}
                  value={draftRetentionDays}
                  onChange={(e) => setDraftRetentionDays(Math.max(0, Number(e.target.value) || 0))}
                  className="w-24 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm focus:border-sky-400 focus:bg-white focus:ring-2 focus:ring-sky-400/20 outline-none"
                />
                <span className="text-sm text-slate-500">days</span>
              </div>
              <p className="text-[11px] text-slate-500">
                Drafts older than this are hidden from the “Pending Investigations” list (still retrievable from Patient History). Set to <b>0</b> to keep all drafts. Use <b>Discard</b> in the list to permanently delete one.
              </p>
            </div>
          </section>

          {/* Security Note */}
          <section className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-amber-50 rounded-lg shrink-0">
                <ShieldCheck className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <h3 className="font-bold text-slate-800 text-sm">Security & Compliance</h3>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                  All templates follow medical record standards including MRN tracking, doctor qualifications, and timestamping.
                </p>
              </div>
            </div>
          </section>
        </div>

        {/* ── Right Column ── */}
        <div className="lg:col-span-8 space-y-6">

          {/* Branding & Watermark */}
          <section className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-5 border-b border-slate-100 bg-slate-50/50 flex items-center gap-3">
              <ImageIcon className="h-5 w-5 text-sky-600" />
              <h2 className="font-bold text-slate-800">Branding & Watermark</h2>
            </div>
            <div className="p-6">
              <div className="grid gap-6 md:grid-cols-2">
                <div className="space-y-5">
                  {/* Toggle */}
                  <div className="flex items-center justify-between">
                    <div>
                      <label className="text-sm font-bold text-slate-700 block">Prescription Watermark</label>
                      <p className="text-xs text-slate-500">Overlay text for security and authenticity.</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input type="checkbox" className="sr-only peer" checked={design.showWatermark} onChange={(e) => setDesign((d) => ({ ...d, showWatermark: e.target.checked }))} />
                      <div className="w-11 h-6 bg-slate-200 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-sky-600"></div>
                    </label>
                  </div>
                  {/* Watermark controls */}
                  <div className={`space-y-4 transition-opacity duration-300 ${design.showWatermark ? 'opacity-100' : 'opacity-40 pointer-events-none'}`}>
                    <div>
                      <label className="text-[11px] font-bold text-slate-500 uppercase mb-1.5 block">Watermark Text</label>
                      <div className="relative">
                        <Type className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <input
                          type="text"
                          value={design.watermarkText}
                          onChange={(e) => setDesign((d) => ({ ...d, watermarkText: e.target.value }))}
                          placeholder="e.g. Bhatti Clinic"
                          className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-sky-500/10 focus:border-sky-500 outline-none transition-all font-medium"
                        />
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between mb-1.5">
                        <label className="text-[11px] font-bold text-slate-500 uppercase block">Opacity Level</label>
                        <span className="text-[11px] font-bold text-sky-600">{Math.round(design.watermarkOpacity * 100)}%</span>
                      </div>
                      <input
                        type="range" min="0.05" max="0.3" step="0.01"
                        value={design.watermarkOpacity}
                        onChange={(e) => setDesign((d) => ({ ...d, watermarkOpacity: parseFloat(e.target.value) }))}
                        className="w-full h-2 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-sky-600"
                      />
                    </div>
                  </div>
                </div>

                {/* Live Visualizer */}
                <div className="bg-slate-50 rounded-2xl p-5 border border-slate-100 flex flex-col items-center justify-center relative overflow-hidden">
                  <div className="w-40 h-52 bg-white rounded-lg border border-slate-200 shadow-xl p-3 flex flex-col gap-2 relative">
                    <div className="h-3 w-3/4 bg-slate-100 rounded"></div>
                    <div className="h-2 w-full bg-slate-50 rounded"></div>
                    <div className="h-2 w-full bg-slate-50 rounded"></div>
                    <div className="mt-auto h-2 w-1/3 bg-slate-100 rounded self-end"></div>
                    {design.showWatermark && (
                      <div
                        className="absolute inset-0 flex items-center justify-center pointer-events-none transition-all duration-300"
                        style={{ opacity: design.watermarkOpacity + 0.1, transform: 'rotate(-45deg)', color: '#000', fontSize: '12px', fontWeight: 'bold', letterSpacing: '1px' }}
                      >
                        {design.watermarkText || 'WATERMARK'}
                      </div>
                    )}
                  </div>
                  <span className="text-[11px] font-bold text-slate-400 mt-4 uppercase tracking-widest">Live Visualizer</span>
                </div>
              </div>
            </div>
          </section>

          {/* Header & Footer Layout */}
          <section className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-5 border-b border-slate-100 bg-slate-50/50 flex items-center gap-3">
              <Settings2 className="h-5 w-5 text-sky-600" />
              <h2 className="font-bold text-slate-800">Header & Footer Layout</h2>
            </div>
            <div className="p-6">
              <div className="grid gap-6 md:grid-cols-2">
                {/* Header */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <label className="text-sm font-bold text-slate-700 block">Print Hospital Header</label>
                      <p className="text-xs text-slate-500">Include hospital name, logo, and address.</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input type="checkbox" className="sr-only peer" checked={design.showHeader} onChange={(e) => setDesign((d) => ({ ...d, showHeader: e.target.checked }))} />
                      <div className="w-11 h-6 bg-slate-200 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-sky-600"></div>
                    </label>
                  </div>
                  <div className={`transition-opacity ${design.showHeader ? 'opacity-100' : 'opacity-40 pointer-events-none'}`}>
                    <div className="flex justify-between items-center">
                      <label className="text-[11px] font-bold text-slate-500 uppercase block">Header Height (mm)</label>
                      <input
                        type="number" value={design.headerHeight}
                        onChange={(e) => setDesign((d) => ({ ...d, headerHeight: parseInt(e.target.value) || 0 }))}
                        className="w-16 px-2 py-1 bg-slate-50 border border-slate-200 rounded-lg text-sm font-bold text-sky-600 outline-none focus:border-sky-400"
                      />
                    </div>
                  </div>
                </div>
                {/* Footer */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <label className="text-sm font-bold text-slate-700 block">Print Custom Footer</label>
                      <p className="text-xs text-slate-500">Include signature area and system disclaimer.</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input type="checkbox" className="sr-only peer" checked={design.showFooter} onChange={(e) => setDesign((d) => ({ ...d, showFooter: e.target.checked }))} />
                      <div className="w-11 h-6 bg-slate-200 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-sky-600"></div>
                    </label>
                  </div>
                  <div className={`transition-opacity ${design.showFooter ? 'opacity-100' : 'opacity-40 pointer-events-none'}`}>
                    <div className="flex justify-between items-center">
                      <label className="text-[11px] font-bold text-slate-500 uppercase block">Footer Height (mm)</label>
                      <input
                        type="number" value={design.footerHeight}
                        onChange={(e) => setDesign((d) => ({ ...d, footerHeight: parseInt(e.target.value) || 0 }))}
                        className="w-16 px-2 py-1 bg-slate-50 border border-slate-200 rounded-lg text-sm font-bold text-sky-600 outline-none focus:border-sky-400"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>

        </div>
      </div>
    </div>
  )
}
