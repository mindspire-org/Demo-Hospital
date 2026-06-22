import { useEffect, useState } from 'react'
import { labApi } from '../../utils/api'
import { api } from '../../api'

type HeaderHistoryEntry = { url: string; uploadedAt: string; uploadedBy?: string; note?: string }

export default function Lab_Settings() {
  const [activeTab, setActiveTab] = useState<'lab' | 'system' | 'reportDesign' | 'headerFooter' | 'seeds' | 'doctorReferral'>('lab')
  const [labName, setLabName] = useState('')
  const [parentLab, setParentLab] = useState('')
  const [slogan, setSlogan] = useState('')
  const [code, setCode] = useState('')
  const [phone, setPhone] = useState('')
  const [landlineNumber, setLandlineNumber] = useState('')
  const [mobileNumber, setMobileNumber] = useState('')
  const [whatsappNumber, setWhatsappNumber] = useState('')
  const [addressLine1, setAddressLine1] = useState('')
  const [addressLine2, setAddressLine2] = useState('')
  const [addressLine3, setAddressLine3] = useState('')
  const [email, setEmail] = useState('')
  const [website, setWebsite] = useState('')
  const [reportFooter, setReportFooter] = useState('')
  const [logoDataUrl, setLogoDataUrl] = useState<string | null>(null)
  const [department, setDepartment] = useState('')
  const [reportTemplate, setReportTemplate] = useState<'classic'|'tealGradient'|'modern'|'adl'|'skmch'|'receiptStyle'|'clinicalPro'|'minimalist'|'royalBlue'|'letterhead'>('classic')
  const [slipTemplate, setSlipTemplate] = useState<'thermal'|'a4Bill'>('thermal')
  const [labNumberFormat, setLabNumberFormat] = useState('{SERIAL}')
  const [consultantName, setConsultantName] = useState('')
  const [consultantDegrees, setConsultantDegrees] = useState('')
  const [consultantTitle, setConsultantTitle] = useState('')
  const [consultants, setConsultants] = useState<Array<{ name?: string; degrees?: string; title?: string }>>([])
  const [qrUrl, setQrUrl] = useState('')
  const [restrictCollectionDate, setRestrictCollectionDate] = useState(false)
  const [paymentOnInstance, setPaymentOnInstance] = useState(false)
  const [validateStock, setValidateStock] = useState(false)
  const [smsActive, setSmsActive] = useState(false)
  const [hijriOffset, setHijriOffset] = useState(0)
  const [saving, setSaving] = useState(false)
  const [notice, setNotice] = useState('')
  const [headerImageUrl, setHeaderImageUrl] = useState('')
  const [footerImageUrl, setFooterImageUrl] = useState('')
  const [headerHistory, setHeaderHistory] = useState<HeaderHistoryEntry[]>([])
  const [uploadingHeader, setUploadingHeader] = useState(false)
  const [uploadingFooter, setUploadingFooter] = useState(false)
  const [watermark, setWatermark] = useState('')
  const [watermarkOpacity, setWatermarkOpacity] = useState(0.08)
  const [watermarkAngle, setWatermarkAngle] = useState(-45)
  const [reportFont, setReportFont] = useState<'poppins'|'helvetica'|'times'|'courier'>('poppins')
  const [useCustomHeaderFooter, setUseCustomHeaderFooter] = useState(false)
  const [mergeReportsByPatient, setMergeReportsByPatient] = useState(false)
  const [seedBusy, setSeedBusy] = useState(false)
  const [seedResult, setSeedResult] = useState('')
  const [seedAllStep, setSeedAllStep] = useState<0 | 1 | 2>(0)
  const [seedAllPassword, setSeedAllPassword] = useState('')
  const [seedAllBusy, setSeedAllBusy] = useState(false)
  const [seedAllError, setSeedAllError] = useState('')
  const [doctorReferralEnabled, setDoctorReferralEnabled] = useState(false)
  const [doctorReferralPercentage, setDoctorReferralPercentage] = useState(0)

  useEffect(()=>{
    let mounted = true
    ;(async()=>{
      try {
        const s = await labApi.getSettings()
        if (!mounted) return
        setLabName(s.labName || '')
        setParentLab(s.parentLab || '')
        setSlogan(s.slogan || '')
        setCode(s.code || '')
        setPhone(s.phone || '')
        setLandlineNumber(s.landlineNumber || '')
        setMobileNumber(s.mobileNumber || '')
        setWhatsappNumber(s.whatsappNumber || '')
        setAddressLine1(s.addressLine1 || s.address || '')
        setAddressLine2(s.addressLine2 || '')
        setAddressLine3(s.addressLine3 || '')
        setEmail(s.email || '')
        setWebsite(s.website || '')
        setReportFooter(s.reportFooter || '')
        setLogoDataUrl(s.logoDataUrl || null)
        setDepartment(s.department || '')
        const validTemplates = ['classic','tealGradient','modern','adl','skmch','receiptStyle','clinicalPro','minimalist','royalBlue','letterhead']
        setReportTemplate(validTemplates.includes(s.reportTemplate) ? s.reportTemplate : 'classic')
        setSlipTemplate((s.slipTemplate === 'a4Bill' ? 'a4Bill' : 'thermal'))
        setLabNumberFormat(s.labNumberFormat || '{SERIAL}')
        setConsultantName(s.consultantName || '')
        setConsultantDegrees(s.consultantDegrees || '')
        setConsultantTitle(s.consultantTitle || '')
        setConsultants(Array.isArray(s.consultants) ? s.consultants : [])
        setQrUrl(s.qrUrl || '')
        setRestrictCollectionDate(!!s.restrictEmployeesToChangeCollectionDate)
        setPaymentOnInstance(!!s.paymentReceiveOnTestInstanceLevel)
        setValidateStock(!!s.validateStock)
        setSmsActive(!!s.smsActive)
        setHijriOffset(s.labHijriDateOffset || 0)
        setDoctorReferralEnabled(!!s.doctorReferralEnabled)
        setDoctorReferralPercentage(s.doctorReferralPercentage || 0)
        setHeaderImageUrl(s.headerImageUrl || '')
        setFooterImageUrl(s.footerImageUrl || '')
        setHeaderHistory(Array.isArray(s.headerHistory) ? s.headerHistory : [])
        setWatermark(s.watermark || '')
        setWatermarkOpacity(s.watermarkOpacity ?? 0.08)
        setWatermarkAngle(s.watermarkAngle ?? -45)
        setReportFont(s.reportFont || 'poppins')
        setUseCustomHeaderFooter(!!s.useCustomHeaderFooter)
        setMergeReportsByPatient(!!s.mergeReportsByPatient)
        setDateFormat(s.dateFormat || 'DD/MM/YYYY')
        setCurrency(s.currency || 'PKR')
      } catch (e) { /* ignore */ }
    })()
    return ()=>{ mounted = false }
  }, [])

  // System Settings form state (loaded from API, not localStorage)
  const [dateFormat, setDateFormat] = useState<string>('DD/MM/YYYY')
  const [currency, setCurrency] = useState<string>('PKR')

  const saveLab = async () => {
    setSaving(true)
    try {
      await labApi.updateSettings({
        labName,
        parentLab,
        slogan,
        code,
        phone,
        landlineNumber,
        mobileNumber,
        whatsappNumber,
        addressLine1,
        addressLine2,
        addressLine3,
        email,
        website,
        reportFooter,
        logoDataUrl: logoDataUrl || undefined,
        department,
        reportTemplate,
        slipTemplate,
        labNumberFormat,
        consultantName,
        consultantDegrees,
        consultantTitle,
        consultants: consultants?.map(c=>({
          name: (c.name||'').trim() || undefined,
          degrees: (c.degrees||'').trim() || undefined,
          title: (c.title||'').trim() || undefined,
        })).filter(c => c.name || c.degrees || c.title),
        qrUrl,
        restrictEmployeesToChangeCollectionDate: restrictCollectionDate,
        paymentReceiveOnTestInstanceLevel: paymentOnInstance,
        validateStock,
        smsActive,
        labHijriDateOffset: hijriOffset,
        doctorReferralEnabled,
        doctorReferralPercentage,
        watermark,
        watermarkOpacity,
        watermarkAngle,
        reportFont,
        useCustomHeaderFooter,
        mergeReportsByPatient,
        dateFormat,
        currency,
      })
      setNotice('Lab settings saved')
      try { setTimeout(()=> setNotice(''), 2500) } catch {}
    } catch (e) { console.error(e) }
    finally { setSaving(false) }
  }

  const saveSystem = () => {
    // System settings (dateFormat, currency) are now saved via saveLab to MongoDB
    saveLab()
  }

  function fileToBase64(file: File): Promise<string> {
    return new Promise((res, rej) => {
      const r = new FileReader()
      r.onload = () => res(String(r.result || ''))
      r.onerror = rej
      r.readAsDataURL(file)
    })
  }

  async function uploadHeader(file: File) {
    setUploadingHeader(true)
    try {
      const base64 = await fileToBase64(file)
      const r: any = await api('/lab/settings/header', { method: 'POST', body: JSON.stringify({ base64, type: 'header', note: `Upload ${file.name}` }) })
      setHeaderImageUrl(r.headerImageUrl || '')
      if (r.headerHistory) setHeaderHistory(r.headerHistory)
      setNotice('Header uploaded'); setTimeout(() => setNotice(''), 2500)
    } catch (e: any) { setNotice(e?.message || 'Upload failed') }
    finally { setUploadingHeader(false) }
  }

  async function uploadFooter(file: File) {
    setUploadingFooter(true)
    try {
      const base64 = await fileToBase64(file)
      const r: any = await api('/lab/settings/footer', { method: 'POST', body: JSON.stringify({ base64, type: 'footer', note: `Upload ${file.name}` }) })
      setFooterImageUrl(r.footerImageUrl || '')
      setNotice('Footer uploaded'); setTimeout(() => setNotice(''), 2500)
    } catch (e: any) { setNotice(e?.message || 'Upload failed') }
    finally { setUploadingFooter(false) }
  }

  async function revertHeader(url: string) {
    try {
      const r: any = await api('/lab/settings/header/revert', { method: 'POST', body: JSON.stringify({ url }) })
      setHeaderImageUrl(r.headerImageUrl || url)
      if (r.headerHistory) setHeaderHistory(r.headerHistory)
      setNotice('Header reverted'); setTimeout(() => setNotice(''), 2500)
    } catch (e: any) { setNotice(e?.message || 'Revert failed') }
  }

  async function runSeed(endpoint: string, label: string) {
    setSeedBusy(true); setSeedResult('')
    try {
      const r: any = await api(`/lab/seed/${endpoint}`, { method: 'POST', body: JSON.stringify({}) })
      setSeedResult(`${label}: ${r.ok ? 'OK' : 'Failed'} — ${JSON.stringify(r)}`)
    } catch (e: any) { setSeedResult(`${label} failed: ${e?.message || e}`) }
    finally { setSeedBusy(false) }
  }

  async function seedAllTests() {
    setSeedAllBusy(true); setSeedAllError(''); setSeedResult('')
    try {
      const results: string[] = []
      try {
        const r1: any = await api('/lab/seed/import-json-tests', { method: 'POST', body: JSON.stringify({}) })
        results.push(`Import JSON Tests: ${r1.ok ? 'OK' : 'Failed'} (${r1.created ?? '?'} created, ${r1.updated ?? '?'} updated)`)
      } catch (e1: any) { results.push(`Import JSON Tests: Failed — ${e1?.message || e1}`) }
      try {
        const r2: any = await api('/lab/seed/test-templates', { method: 'POST', body: JSON.stringify({}) })
        results.push(`Test Templates: ${r2.ok ? 'OK' : 'Failed'} (${r2.seeded ?? '?'})`)
      } catch (e2: any) { results.push(`Test Templates: Failed — ${e2?.message || e2}`) }
      try {
        const r3: any = await api('/lab/seed/critical-parameters', { method: 'POST', body: JSON.stringify({}) })
        results.push(`Critical Parameters: ${r3.ok ? 'OK' : 'Failed'}`)
      } catch (e3: any) { results.push(`Critical Parameters: Failed — ${e3?.message || e3}`) }
      try {
        const r4: any = await api('/lab/seed/merge-critical-values', { method: 'POST', body: JSON.stringify({}) })
        results.push(`Merge Critical Values: ${r4.ok ? 'OK' : 'Failed'}`)
      } catch (e4: any) { results.push(`Merge Critical Values: Failed — ${e4?.message || e4}`) }
      try {
        const r5: any = await api('/lab/seed/normal-ranges', { method: 'POST', body: JSON.stringify({}) })
        results.push(`Normal Ranges: ${r5.ok ? 'OK' : 'Failed'} (${r5.updated ?? '?'} updated, ${r5.skipped ?? '?'} skipped)`)
      } catch (e5: any) { results.push(`Normal Ranges: Failed — ${e5?.message || e5}`) }
      setSeedResult(`All Seeds Complete:\n${results.join('\n')}`)
      setSeedAllStep(0)
    } catch (e: any) { setSeedAllError(`Seed all failed: ${e?.message || e}`) }
    finally { setSeedAllBusy(false) }
  }

  async function verifyPasswordAndSeed() {
    const username = (() => {
      try {
        const s = localStorage.getItem('lab.session')
        if (s) return JSON.parse(s).username
      } catch {}
      return ''
    })()
    if (!username || !seedAllPassword) {
      setSeedAllError('Username or password missing')
      return
    }
    setSeedAllBusy(true); setSeedAllError('')
    try {
      await labApi.loginUser(username, seedAllPassword)
      setSeedAllPassword('')
      await seedAllTests()
    } catch (e: any) {
      setSeedAllError('Password verification failed. Please check your credentials.')
    } finally { setSeedAllBusy(false) }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-slate-800">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5"><path d="M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z"/><path fillRule="evenodd" d="M8.841 2.718a2.25 2.25 0 0 1 2.318-.495 2.25 2.25 0 0 0 2.682 1.212 2.25 2.25 0 0 1 2.941 1.424 2.25 2.25 0 0 0 1.765 1.765 2.25 2.25 0 0 1 1.424 2.941 2.25 2.25 0 0 0 1.212 2.682 2.25 2.25 0 0 1-.495 2.318 2.25 2.25 0 0 0-1.212 2.682 2.25 2.25 0 0 1-1.424 2.941 2.25 2.25 0 0 0-1.765 1.765 2.25 2.25 0 0 1-2.941 1.424 2.25 2.25 0 0 0-2.682 1.212 2.25 2.25 0 0 1-2.318-.495 2.25 2.25 0 0 0-3.294 0 2.25 2.25 0 0 1-2.318.495 2.25 2.25 0 0 0-1.212-2.682 2.25 2.25 0 0 1-1.424-2.941 2.25 2.25 0 0 0-1.212-2.682 2.25 2.25 0 0 1 .495-2.318 2.25 2.25 0 0 0 1.212-2.682 2.25 2.25 0 0 1 1.424-2.941 2.25 2.25 0  0 0 1.765-1.765 2.25 2.25 0 0 1 2.941-1.424 2.25 2.25 0 0 0 2.682-1.212 2.25 2.25 0  0 1 2.318.495 2.25 2.25 0 0 0 3.294 0Z" clipRule="evenodd"/></svg>
        <h2 className="text-xl font-bold">Settings</h2>
      </div>
      {notice && (
        <div className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">{notice}</div>
      )}

      <div className="flex items-center gap-2 flex-wrap">
        {(['lab','system','headerFooter','doctorReferral','seeds'] as const).map(t=>(
          <button key={t} onClick={()=>setActiveTab(t)} className={`rounded-md border px-3 py-1.5 text-sm ${activeTab===t?'border-slate-300 bg-white text-slate-900':'border-transparent bg-slate-100 text-slate-700 hover:bg-slate-200'}`}>{t==='lab'?'Lab Profile':t==='system'?'System':t==='headerFooter'?'Header / Footer':t==='doctorReferral'?'Doctor Referral':'Data Seeds'}</button>
        ))}
      </div>

      {activeTab === 'lab' && (
        <div className="rounded-xl border border-slate-200 bg-white">
          <div className="border-b border-slate-200 px-4 py-3 font-medium text-slate-800">Lab Settings</div>
          <div className="space-y-4 p-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm text-slate-700">Lab Name</label>
                <input value={labName} onChange={e=>setLabName(e.target.value)} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="mb-1 block text-sm text-slate-700">Parent Lab / Branch</label>
                <input value={parentLab} onChange={e=>setParentLab(e.target.value)} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" placeholder="Main branch name" />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <div>
                <label className="mb-1 block text-sm text-slate-700">Slogan / Tagline</label>
                <input value={slogan} onChange={e=>setSlogan(e.target.value)} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="mb-1 block text-sm text-slate-700">Lab Code</label>
                <input value={code} onChange={e=>setCode(e.target.value)} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="mb-1 block text-sm text-slate-700">Department</label>
                <input value={department} onChange={e=>setDepartment(e.target.value)} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" placeholder="Department of Pathology" />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm text-slate-700">Phone</label>
                <input value={phone} onChange={e=>setPhone(e.target.value)} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" placeholder="+92-21-1234567" />
              </div>
              <div>
                <label className="mb-1 block text-sm text-slate-700">Landline</label>
                <input value={landlineNumber} onChange={e=>setLandlineNumber(e.target.value)} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm text-slate-700">Mobile</label>
                <input value={mobileNumber} onChange={e=>setMobileNumber(e.target.value)} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="mb-1 block text-sm text-slate-700">WhatsApp</label>
                <input value={whatsappNumber} onChange={e=>setWhatsappNumber(e.target.value)} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" />
              </div>
            </div>

            <div>
              <label className="mb-1 block text-sm text-slate-700">Address Line 1</label>
              <input value={addressLine1} onChange={e=>setAddressLine1(e.target.value)} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" />
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm text-slate-700">Address Line 2</label>
                <input value={addressLine2} onChange={e=>setAddressLine2(e.target.value)} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="mb-1 block text-sm text-slate-700">Address Line 3</label>
                <input value={addressLine3} onChange={e=>setAddressLine3(e.target.value)} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm text-slate-700">Email</label>
                <input type="email" value={email} onChange={e=>setEmail(e.target.value)} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="mb-1 block text-sm text-slate-700">Website</label>
                <input value={website} onChange={e=>setWebsite(e.target.value)} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" placeholder="https://..." />
              </div>
            </div>

            <div>
              <label className="mb-1 block text-sm text-slate-700">Report Template</label>
              <select value={reportTemplate} onChange={e=> setReportTemplate(e.target.value as any)} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm">
                <option value="classic">Classic</option>
                <option value="tealGradient">Teal Gradient</option>
                <option value="modern">Modern (International)</option>
                <option value="adl">ADL</option>
                <option value="skmch">SKMCH</option>
                <option value="receiptStyle">Receipt Style</option>
                <option value="clinicalPro">Clinical Pro</option>
                <option value="minimalist">Minimalist</option>
                <option value="royalBlue">Royal Blue</option>
                <option value="letterhead">Letterhead (No Header/Footer — for pre-printed paper)</option>
              </select>
            </div>

            <div>
              <label className="mb-1 block text-sm text-slate-700">Slip Template</label>
              <select value={slipTemplate} onChange={e=> setSlipTemplate((e.target.value as 'thermal'|'a4Bill') || 'thermal')} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm">
                <option value="thermal">Thermal (58mm)</option>
                <option value="a4Bill">A4 Bill</option>
              </select>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm text-slate-700">Lab Number Format</label>
                <input value={labNumberFormat} onChange={e=>setLabNumberFormat(e.target.value)} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" placeholder="e.g. LAB-{YYYY}-{SERIAL4}" />
                <p className="mt-1 text-xs text-slate-500">Preview: {(() => {
                  const d = new Date(); const YYYY = String(d.getFullYear()); const YY = YYYY.slice(-2); const MM = String(d.getMonth()+1).padStart(2,'0'); const DD = String(d.getDate()).padStart(2,'0'); const n = 123; const pad = (n: number, w: number) => String(n).padStart(w,'0');
                  return (labNumberFormat || '{SERIAL}').replace(/\{YYYY\}/gi, YYYY).replace(/\{YY\}/g, YY).replace(/\{MM\}/gi, MM).replace(/\{DD\}/gi, DD).replace(/\{SERIAL6\}/gi, pad(n,6)).replace(/\{SERIAL4\}/gi, pad(n,4)).replace(/\{SERIAL3\}/gi, pad(n,3)).replace(/\{SERIAL2\}/gi, pad(n,2)).replace(/\{SERIAL\}/gi, String(n));
                })()}</p>
                <p className="text-[11px] text-slate-400">Tokens: {'{YYYY} {YY} {MM} {DD} {SERIAL} {SERIAL2} {SERIAL3} {SERIAL4} {SERIAL6}'}</p>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <div>
                <label className="mb-1 block text-sm text-slate-700">Consultant/Pathologist Name</label>
                <input value={consultantName} onChange={e=>setConsultantName(e.target.value)} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="mb-1 block text-sm text-slate-700">Degrees</label>
                <input value={consultantDegrees} onChange={e=>setConsultantDegrees(e.target.value)} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" placeholder="e.g., M.B.B.S, M.Phil (Microbiology)" />
              </div>
              <div>
                <label className="mb-1 block text-sm text-slate-700">Title</label>
                <input value={consultantTitle} onChange={e=>setConsultantTitle(e.target.value)} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" placeholder="Consultant Pathologist" />
              </div>
            </div>

            <div className="mt-2 rounded-lg border border-slate-200 p-3">
              <div className="mb-2 flex items-center justify-between">
                <div className="text-sm font-medium text-slate-800">Additional Consultants ({consultants.length})</div>
                <button type="button" onClick={()=>setConsultants(prev=>[...(prev||[]), { name: '', degrees: '', title: '' }])} className="inline-flex items-center gap-1 rounded-md bg-violet-600 px-2.5 py-1 text-xs font-medium text-white hover:bg-violet-700">
                  <span className="text-sm leading-none">+</span> Add Consultant
                </button>
              </div>
              {(consultants||[]).map((c, i)=>(
                <div key={i} className="mb-3 grid gap-3 md:grid-cols-4 items-end">
                  <div>
                    <label className="mb-1 block text-xs text-slate-600">Name</label>
                    <input value={c.name || ''} onChange={e=>setConsultants(prev=>{ const arr=[...(prev||[])]; arr[i] = { ...(arr[i]||{}), name: e.target.value }; return arr })} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs text-slate-600">Degrees</label>
                    <input value={c.degrees || ''} onChange={e=>setConsultants(prev=>{ const arr=[...(prev||[])]; arr[i] = { ...(arr[i]||{}), degrees: e.target.value }; return arr })} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" placeholder="e.g., M.B.B.S, FCPS" />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs text-slate-600">Title</label>
                    <input value={c.title || ''} onChange={e=>setConsultants(prev=>{ const arr=[...(prev||[])]; arr[i] = { ...(arr[i]||{}), title: e.target.value }; return arr })} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" placeholder="Consultant Pathologist" />
                  </div>
                  <button type="button" onClick={()=>setConsultants(prev=>prev.filter((_,idx)=>idx!==i))} className="rounded-md border border-rose-300 px-2 py-2 text-xs text-rose-600 hover:bg-rose-50">Remove</button>
                </div>
              ))}
              {(consultants||[]).length === 0 && (
                <div className="text-xs text-slate-500">No additional consultants. Click "+ Add Consultant" to add.</div>
              )}
            </div>

            <div>
              <label className="mb-1 block text-sm text-slate-700">Report Footer</label>
              <textarea value={reportFooter} onChange={e=>setReportFooter(e.target.value)} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" rows={3} />
            </div>

            <div>
              <label className="mb-1 block text-sm text-slate-700">Lab Logo</label>
              <input
                type="file"
                accept="image/*"
                onChange={e=>{
                  const file = e.target.files?.[0]
                  if (!file) { setLogoDataUrl(null); return }
                  const reader = new FileReader()
                  reader.onload = () => setLogoDataUrl(String(reader.result || ''))
                  reader.readAsDataURL(file)
                }}
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm file:mr-3 file:rounded file:border-0 file:bg-slate-100 file:px-3 file:py-1.5 file:text-sm file:text-slate-700"
              />
              {logoDataUrl && (
                <div className="mt-2 flex items-center gap-2 text-xs text-slate-600">
                  <img src={logoDataUrl} alt="Logo preview" className="h-10 w-10 rounded border" />
                  <span>Preview</span>
                </div>
              )}
            </div>

            <div>
              <label className="mb-1 block text-sm text-slate-700">QR Code URL (Report Link)</label>
              <input value={qrUrl} onChange={e=>setQrUrl(e.target.value)} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" placeholder="https://yourwebsite.com/report/{{tokenNo}}" />
              <p className="mt-1 text-[11px] text-slate-500">Use {"{{tokenNo}}"} as a placeholder for the actual lab number.</p>
            </div>

            <div className="rounded-lg border border-slate-200 p-3">
              <div className="mb-2 text-sm font-medium text-slate-800">Behaviour Toggles</div>
              <div className="grid gap-3 md:grid-cols-2">
                <label className="flex items-center gap-2 text-sm text-slate-700">
                  <input type="checkbox" checked={restrictCollectionDate} onChange={e=>setRestrictCollectionDate(e.target.checked)} className="rounded border-slate-300" />
                  Restrict employees from changing collection date
                </label>
                <label className="flex items-center gap-2 text-sm text-slate-700">
                  <input type="checkbox" checked={paymentOnInstance} onChange={e=>setPaymentOnInstance(e.target.checked)} className="rounded border-slate-300" />
                  Payment receive on test-instance level
                </label>
                <label className="flex items-center gap-2 text-sm text-slate-700">
                  <input type="checkbox" checked={validateStock} onChange={e=>setValidateStock(e.target.checked)} className="rounded border-slate-300" />
                  Validate stock before dispensing
                </label>
                <label className="flex items-center gap-2 text-sm text-slate-700">
                  <input type="checkbox" checked={smsActive} onChange={e=>setSmsActive(e.target.checked)} className="rounded border-slate-300" />
                  SMS notifications active
                </label>
              </div>
              <div className="mt-3">
                <label className="mb-1 block text-sm text-slate-700">Hijri Date Offset (days)</label>
                <input type="number" value={hijriOffset} onChange={e=>setHijriOffset(Number(e.target.value)||0)} className="w-32 rounded-md border border-slate-300 px-3 py-2 text-sm" />
              </div>
            </div>

            <div className="flex items-center justify-end">
              <button onClick={saveLab} disabled={saving} className="btn disabled:opacity-50">{saving? 'Saving...' : 'Save Settings'}</button>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'system' && (
        <div className="rounded-xl border border-slate-200 bg-white">
          <div className="border-b border-slate-200 px-4 py-3 font-medium text-slate-800">System Settings</div>
          <div className="space-y-4 p-4">
            <div className="grid gap-4 md:grid-cols-3">
              <div>
                <label className="mb-1 block text-sm text-slate-700">Currency</label>
                <input value={currency} onChange={e=>setCurrency(e.target.value)} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="mb-1 block text-sm text-slate-700">Date Format</label>
                <select value={dateFormat} onChange={e=>setDateFormat(e.target.value)} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm">
                  <option>DD/MM/YYYY</option>
                  <option>MM/DD/YYYY</option>
                  <option>YYYY-MM-DD</option>
                </select>
              </div>
            </div>

            <div className="flex items-center justify-end">
              <button onClick={saveSystem} className="btn">Save Settings</button>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'headerFooter' && (
        <div className="space-y-4">
          <div className="rounded-xl border border-slate-200 bg-white">
            <div className="border-b border-slate-200 px-4 py-3 font-medium text-slate-800">Custom Header / Footer</div>
            <div className="space-y-3 p-4">
              <label className="flex items-center gap-2 text-sm text-slate-700">
                <input type="checkbox" checked={useCustomHeaderFooter} onChange={e=>setUseCustomHeaderFooter(e.target.checked)} className="h-4 w-4 rounded border-slate-300 text-blue-600" />
                <span>Use uploaded images instead of generated header/footer on reports</span>
              </label>
              <p className="text-xs text-slate-500">When enabled, uploaded header/footer images will replace the template-generated header and footer on printed reports.</p>
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white">
            <div className="border-b border-slate-200 px-4 py-3 font-medium text-slate-800">Report Header Image</div>
            <div className="space-y-3 p-4">
              <input type="file" accept="image/*" disabled={uploadingHeader} onChange={e=>{ const f=e.target.files?.[0]; if(f) uploadHeader(f) }} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm file:mr-3 file:rounded file:border-0 file:bg-slate-100 file:px-3 file:py-1.5 file:text-sm file:text-slate-700" />
              {uploadingHeader && <p className="text-xs text-slate-500">Uploading…</p>}
              {headerImageUrl && <img src={headerImageUrl} alt="Current header" className="h-20 rounded border object-contain" />}
              {headerHistory.length > 0 && (
                <div className="mt-2">
                  <div className="mb-1 text-xs font-medium text-slate-600">History (click to revert)</div>
                  <div className="flex flex-wrap gap-2">
                    {headerHistory.map((h,i)=>(
                      <button key={i} onClick={()=>revertHeader(h.url)} className="group flex flex-col items-center rounded border border-slate-200 p-1 hover:border-blue-400" title={h.note || h.uploadedAt}>
                        <img src={h.url} alt="" className="h-10 rounded object-contain" />
                        <span className="text-[10px] text-slate-500 group-hover:text-blue-600">{new Date(h.uploadedAt).toLocaleDateString()}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white">
            <div className="border-b border-slate-200 px-4 py-3 font-medium text-slate-800">Report Footer Image</div>
            <div className="space-y-3 p-4">
              <input type="file" accept="image/*" disabled={uploadingFooter} onChange={e=>{ const f=e.target.files?.[0]; if(f) uploadFooter(f) }} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm file:mr-3 file:rounded file:border-0 file:bg-slate-100 file:px-3 file:py-1.5 file:text-sm file:text-slate-700" />
              {uploadingFooter && <p className="text-xs text-slate-500">Uploading…</p>}
              {footerImageUrl && <img src={footerImageUrl} alt="Current footer" className="h-20 rounded border object-contain" />}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'seeds' && (
        <div className="rounded-xl border border-slate-200 bg-white">
          <div className="border-b border-slate-200 px-4 py-3 font-medium text-slate-800">Data Seeds</div>
          <div className="space-y-3 p-4">
            <p className="text-sm text-slate-600">Populate canonical reference data. These endpoints are idempotent — running them again will upsert without creating duplicates.</p>
            <div className="flex flex-wrap gap-3">
              <button onClick={()=>runSeed('test-templates','Test Templates')} disabled={seedBusy} className="btn disabled:opacity-50">Seed Test Templates</button>
              <button onClick={()=>runSeed('critical-parameters','Critical Parameters')} disabled={seedBusy} className="btn disabled:opacity-50">Seed Critical Parameters</button>
              <button onClick={()=>runSeed('import-json-tests','Import JSON Tests (692 tests)')} disabled={seedBusy} className="btn disabled:opacity-50">Import JSON Tests</button>
              <button onClick={()=>runSeed('normal-ranges','Normal Ranges (all tests)')} disabled={seedBusy} className="inline-flex items-center gap-1.5 rounded-lg border border-violet-300 bg-violet-50 px-4 py-2 text-sm font-semibold text-violet-700 hover:bg-violet-100 disabled:opacity-50">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4"><path d="M3 3v18h18"/><path d="M7 12l4-4 4 4 5-5"/></svg>
                Seed Normal Ranges
              </button>
              <button onClick={()=>runSeed('admin','Lab Admin (admin / 123)')} disabled={seedBusy} className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-300 bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-700 hover:bg-emerald-100 disabled:opacity-50">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="8.5" cy="7" r="4"/><line x1="20" y1="8" x2="20" y2="14"/><line x1="23" y1="11" x2="17" y2="11"/></svg>
                Seed Admin
              </button>
              <button
                onClick={() => { setSeedAllStep(1); setSeedAllError(''); setSeedAllPassword('') }}
                disabled={seedBusy || seedAllBusy}
                className="inline-flex items-center gap-1.5 rounded-lg border border-amber-300 bg-amber-50 px-4 py-2 text-sm font-semibold text-amber-700 hover:bg-amber-100 disabled:opacity-50"
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4"><path d="M12 2v4"/><path d="M12 18v4"/><path d="M4.93 4.93l2.83 2.83"/><path d="M16.24 16.24l2.83 2.83"/><path d="M2 12h4"/><path d="M18 12h4"/><path d="M4.93 19.07l2.83-2.83"/><path d="M16.24 7.76l2.83-2.83"/></svg>
                Seed All Tests
              </button>
            </div>
            {seedResult && <pre className="whitespace-pre-wrap rounded bg-slate-50 p-3 text-xs text-slate-700">{seedResult}</pre>}
          </div>
        </div>
      )}

      {/* Step 1: Initial Warning Modal */}
      {seedAllStep === 1 && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 px-2 sm:px-4">
          <div className="w-full max-w-md rounded-xl bg-white shadow-2xl ring-1 ring-black/5">
            <div className="border-b border-slate-200 px-4 py-3">
              <div className="text-base font-semibold text-amber-700 flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5"><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
                Warning: Destructive Operation
              </div>
            </div>
            <div className="p-4 space-y-3">
              <p className="text-sm text-slate-700">
                This action will seed <strong>all test templates</strong>, <strong>normal ranges</strong>, <strong>critical parameters</strong>, and <strong>merge critical values</strong> into existing tests.
              </p>
              <p className="text-sm text-slate-700">
                This is a comprehensive operation that may overwrite existing test data. It requires admin password verification.
              </p>
              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  onClick={() => setSeedAllStep(0)}
                  className="rounded-md border border-slate-300 px-4 py-2 text-sm hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  onClick={() => setSeedAllStep(2)}
                  className="rounded-md bg-amber-600 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-700"
                >
                  Continue to Verification
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Step 2: Password Verification Modal */}
      {seedAllStep === 2 && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 px-2 sm:px-4">
          <div className="w-full max-w-md rounded-xl bg-white shadow-2xl ring-1 ring-black/5">
            <div className="border-b border-slate-200 px-4 py-3">
              <div className="text-base font-semibold text-slate-900 flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                Admin Verification Required
              </div>
            </div>
            <div className="p-4 space-y-3">
              <p className="text-sm text-slate-600">
                Please re-enter your password to verify authorization before seeding all test data.
              </p>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Password</label>
                <input
                  type="password"
                  value={seedAllPassword}
                  onChange={(e) => { setSeedAllPassword(e.target.value); setSeedAllError('') }}
                  onKeyDown={(e) => { if (e.key === 'Enter') verifyPasswordAndSeed() }}
                  placeholder="Enter your password"
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 outline-none"
                  autoFocus
                />
              </div>
              {seedAllError && (
                <div className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{seedAllError}</div>
              )}
              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  onClick={() => { setSeedAllStep(0); setSeedAllError(''); setSeedAllPassword('') }}
                  className="rounded-md border border-slate-300 px-4 py-2 text-sm hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  onClick={verifyPasswordAndSeed}
                  disabled={seedAllBusy || !seedAllPassword}
                  className="rounded-md bg-amber-600 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-700 disabled:opacity-50"
                >
                  {seedAllBusy ? 'Verifying...' : 'Verify & Seed All'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'doctorReferral' && (
        <div className="rounded-xl border border-slate-200 bg-white">
          <div className="border-b border-slate-200 px-4 py-3 font-medium text-slate-800">Doctor Referral Settings</div>
          <div className="space-y-4 p-4">
            <div className="flex items-center gap-3">
              <input
                id="doctorReferralEnabled"
                type="checkbox"
                checked={doctorReferralEnabled}
                onChange={(e) => setDoctorReferralEnabled(e.target.checked)}
                className="h-4 w-4 rounded border-slate-300 text-violet-600 focus:ring-violet-500"
              />
              <label htmlFor="doctorReferralEnabled" className="text-sm font-medium text-slate-700">
                Enable Doctor Referral Tracking
              </label>
            </div>
            {doctorReferralEnabled && (
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm text-slate-700">Default Referral Percentage (%)</label>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={doctorReferralPercentage}
                    onChange={(e) => setDoctorReferralPercentage(Number(e.target.value))}
                    className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                  />
                  <p className="mt-1 text-xs text-slate-500">Default commission percentage for referring doctors.</p>
                </div>
              </div>
            )}
            <div className="flex items-center gap-2 pt-2">
              <button
                onClick={saveLab}
                disabled={saving}
                className="rounded-md bg-violet-600 px-4 py-2 text-sm font-semibold text-white hover:bg-violet-700 disabled:opacity-50"
              >
                {saving ? 'Saving...' : 'Save Settings'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
