import { useEffect, useState } from 'react'
import { previewPrescriptionPdf, PRESCRIPTION_PDF_TEMPLATES, TEMPLATE_LABELS } from '../../utils/prescriptionPdf'
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
  CheckCircle2
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
  customHeaderHtml?: string
  customFooterHtml?: string
}

export default function Doctor_Settings() {
  type DoctorSession = { id: string; name?: string; username?: string }
  const [doc, setDoc] = useState<DoctorSession | null>(null)
  const [tpl, setTpl] = useState<PrescriptionPdfTemplate>('hospital-rx')
  const [saved, setSaved] = useState(false)
  const [hospitalSettings, setHospitalSettings] = useState<HospitalSettings>({
    name: 'Hospital',
    phone: '',
    address: '',
    logoDataUrl: undefined
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

  useEffect(() => {
    try {
      const raw = localStorage.getItem('doctor.session')
      const sess = raw ? JSON.parse(raw) : null
      setDoc(sess)

      // Load template and design from database/localstorage
      ;(async () => {
        try {
          if (sess?.id) {
            const doctorData: any = await hospitalApi.getDoctor(sess.id)
            if (doctorData?.doctor?.prescriptionTemplate) {
              setTpl(doctorData.doctor.prescriptionTemplate)
            }
            // Load design settings if stored in doctor profile
            if (doctorData?.doctor?.prescriptionDesign) {
              setDesign(prev => ({ ...prev, ...doctorData.doctor.prescriptionDesign }))
            }
          }
        } catch { }
      })()

      // Load hospital settings
      ;(async () => {
        try {
          const s = await hospitalApi.getSettings() as any
          if (s) {
            setHospitalSettings({
              name: s.name || 'Hospital',
              phone: s.phone || '',
              address: s.address || '',
              logoDataUrl: s.logoDataUrl
            })
          }
        } catch { }
      })()
    } catch { }
  }, [])

  const save = async () => {
    try {
      if (doc?.id) {
        await hospitalApi.updateDoctor(doc.id, { 
          prescriptionTemplate: tpl,
          // prescriptionDesign: design // Backend field would need to exist
        })
        // Temporary local storage save for design settings
        localStorage.setItem(`doctor.rx.design.${doc.id}`, JSON.stringify(design))
      }
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } catch { }
  }

  const previewSample = async () => {
    await previewPrescriptionPdf({
      doctor: {
        name: doc?.name || 'Doctor',
        qualification: 'MBBS, FCPS',
        specialization: 'Consultant Physician',
        departmentName: 'Internal Medicine',
        phone: hospitalSettings.phone
      },
      settings: {
        name: hospitalSettings.name || 'Hospital',
        address: hospitalSettings.address || '123 Medical Plaza, City Avenue',
        phone: hospitalSettings.phone || '0300-0000000',
        logoDataUrl: hospitalSettings.logoDataUrl || ''
      },
      patient: { 
        name: 'John Doe', 
        mrn: 'MR0001', 
        gender: 'Male', 
        age: '30', 
        phone: '0300-1234567', 
        address: 'Downtown, City' 
      },
      vitals: { 
        pulse: 76, 
        temperatureC: 36.9, 
        bloodPressureSys: 120, 
        bloodPressureDia: 80, 
        respiratoryRate: 18, 
        spo2: 98 
      },
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
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Prescription Settings</h1>
          <p className="text-slate-500 text-sm mt-1">Configure your digital prescription layout, branding, and printing preferences.</p>
        </div>
        <div className="flex items-center gap-3">
          {saved && (
            <div className="flex items-center gap-1.5 text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-full border border-emerald-100 text-sm font-medium animate-in zoom-in">
              <CheckCircle2 className="h-4 w-4" />
              <span>Settings Saved</span>
            </div>
          )}
          <button 
            onClick={previewSample}
            className="flex items-center gap-2 px-4 py-2 text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-all font-medium shadow-sm"
          >
            <Eye className="h-4 w-4 text-slate-500" />
            <span>Preview Sample</span>
          </button>
          <button 
            onClick={save}
            className="flex items-center gap-2 px-6 py-2 bg-sky-600 text-white rounded-lg hover:bg-sky-700 transition-all font-semibold shadow-md shadow-sky-100"
          >
            <Save className="h-4 w-4" />
            <span>Save Changes</span>
          </button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-12">
        {/* Left Column: Template Selection */}
        <div className="lg:col-span-4 space-y-6">
          <section className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-5 border-b border-slate-100 bg-slate-50/50 flex items-center gap-3">
              <Layout className="h-5 w-5 text-sky-600" />
              <h2 className="font-bold text-slate-800">Master Template</h2>
            </div>
            <div className="p-5">
              <label className="text-sm font-medium text-slate-700 mb-2 block">Choose Your Signature Style</label>
              <div className="grid gap-2">
                {PRESCRIPTION_PDF_TEMPLATES.map(key => (
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
                      <span className={`text-sm font-bold ${tpl === key ? 'text-sky-700' : 'text-slate-700'}`}>
                        {TEMPLATE_LABELS[key]}
                      </span>
                      <span className="text-[10px] text-slate-500 uppercase tracking-wider font-medium">Professional Print</span>
                    </div>
                    {tpl === key && <CheckCircle2 className="h-5 w-5 text-sky-600" />}
                  </button>
                ))}
              </div>
            </div>
          </section>

          <section className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-amber-50 rounded-lg">
                <ShieldCheck className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <h3 className="font-bold text-slate-800 text-sm">Security & Compliance</h3>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                  All templates are designed to follow medical record standards including MRN tracking, doctor qualifications, and timestamping.
                </p>
              </div>
            </div>
          </section>
        </div>

        {/* Right Column: Watermark, Header & Footer */}
        <div className="lg:col-span-8 space-y-6">
          {/* Branding & Watermark */}
          <section className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-5 border-b border-slate-100 bg-slate-50/50 flex items-center gap-3">
              <ImageIcon className="h-5 w-5 text-sky-600" />
              <h2 className="font-bold text-slate-800">Branding & Watermark</h2>
            </div>
            <div className="p-6">
              <div className="grid gap-6 md:grid-cols-2">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <label className="text-sm font-bold text-slate-700 block">Prescription Watermark</label>
                      <p className="text-xs text-slate-500">Overlay text for security and authenticity.</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input 
                        type="checkbox" 
                        className="sr-only peer"
                        checked={design.showWatermark}
                        onChange={e => setDesign(d => ({ ...d, showWatermark: e.target.checked }))}
                      />
                      <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-sky-600"></div>
                    </label>
                  </div>

                  <div className={`space-y-4 transition-opacity duration-300 ${design.showWatermark ? 'opacity-100' : 'opacity-40 pointer-events-none'}`}>
                    <div>
                      <label className="text-[11px] font-bold text-slate-500 uppercase mb-1 block">Watermark Text</label>
                      <div className="relative">
                        <Type className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <input 
                          type="text" 
                          value={design.watermarkText}
                          onChange={e => setDesign(d => ({ ...d, watermarkText: e.target.value }))}
                          placeholder="e.g. Bhatti Clinic"
                          className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-sky-500/10 focus:border-sky-500 outline-none transition-all font-medium"
                        />
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between mb-1">
                        <label className="text-[11px] font-bold text-slate-500 uppercase block">Opacity Level</label>
                        <span className="text-[11px] font-bold text-sky-600">{Math.round(design.watermarkOpacity * 100)}%</span>
                      </div>
                      <input 
                        type="range" 
                        min="0.05" 
                        max="0.3" 
                        step="0.01"
                        value={design.watermarkOpacity}
                        onChange={e => setDesign(d => ({ ...d, watermarkOpacity: parseFloat(e.target.value) }))}
                        className="w-full h-2 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-sky-600"
                      />
                    </div>
                  </div>
                </div>

                <div className="bg-slate-50 rounded-2xl p-5 border border-slate-100 flex flex-col items-center justify-center relative overflow-hidden group">
                  {/* Real-time Preview Mockup */}
                  <div className="w-40 h-52 bg-white rounded-lg border border-slate-200 shadow-xl p-3 flex flex-col gap-2 relative">
                    <div className="h-3 w-3/4 bg-slate-100 rounded"></div>
                    <div className="h-2 w-full bg-slate-50 rounded"></div>
                    <div className="h-2 w-full bg-slate-50 rounded"></div>
                    <div className="mt-auto h-2 w-1/3 bg-slate-100 rounded self-end"></div>
                    
                    {design.showWatermark && (
                      <div 
                        className="absolute inset-0 flex items-center justify-center pointer-events-none transition-all duration-300"
                        style={{ 
                          opacity: design.watermarkOpacity + 0.1, 
                          transform: 'rotate(-45deg)',
                          color: '#000',
                          fontSize: '12px',
                          fontWeight: 'bold',
                          letterSpacing: '1px'
                        }}
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

          {/* Header & Footer Configuration */}
          <section className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-5 border-b border-slate-100 bg-slate-50/50 flex items-center gap-3">
              <Settings2 className="h-5 w-5 text-sky-600" />
              <h2 className="font-bold text-slate-800">Header & Footer Layout</h2>
            </div>
            <div className="p-6 space-y-8">
              {/* Header Group */}
              <div className="grid gap-6 md:grid-cols-2">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <label className="text-sm font-bold text-slate-700 block">Print Hospital Header</label>
                      <p className="text-xs text-slate-500">Include hospital name, logo, and address.</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input 
                        type="checkbox" 
                        className="sr-only peer"
                        checked={design.showHeader}
                        onChange={e => setDesign(d => ({ ...d, showHeader: e.target.checked }))}
                      />
                      <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-sky-600"></div>
                    </label>
                  </div>
                  
                  <div className={`space-y-3 transition-opacity ${design.showHeader ? 'opacity-100' : 'opacity-40 pointer-events-none'}`}>
                    <div className="flex justify-between items-center">
                      <label className="text-[11px] font-bold text-slate-500 uppercase block">Header Height (mm)</label>
                      <input 
                        type="number" 
                        value={design.headerHeight}
                        onChange={e => setDesign(d => ({ ...d, headerHeight: parseInt(e.target.value) || 0 }))}
                        className="w-16 px-2 py-1 bg-slate-50 border border-slate-200 rounded-lg text-sm font-bold text-sky-600 outline-none"
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <label className="text-sm font-bold text-slate-700 block">Print Custom Footer</label>
                      <p className="text-xs text-slate-500">Include signature area and system disclaimer.</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input 
                        type="checkbox" 
                        className="sr-only peer"
                        checked={design.showFooter}
                        onChange={e => setDesign(d => ({ ...d, showFooter: e.target.checked }))}
                      />
                      <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-sky-600"></div>
                    </label>
                  </div>

                  <div className={`space-y-3 transition-opacity ${design.showFooter ? 'opacity-100' : 'opacity-40 pointer-events-none'}`}>
                    <div className="flex justify-between items-center">
                      <label className="text-[11px] font-bold text-slate-500 uppercase block">Footer Height (mm)</label>
                      <input 
                        type="number" 
                        value={design.footerHeight}
                        onChange={e => setDesign(d => ({ ...d, footerHeight: parseInt(e.target.value) || 0 }))}
                        className="w-16 px-2 py-1 bg-slate-50 border border-slate-200 rounded-lg text-sm font-bold text-sky-600 outline-none"
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
