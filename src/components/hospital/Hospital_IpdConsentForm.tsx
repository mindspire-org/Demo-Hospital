import React, { useEffect, useState } from 'react'
import { hospitalApi } from '../../utils/api'
import ConfirmDialog from '../ui/ConfirmDialog'
import { printConsentForm } from '../../utils/printConsentForm'

const CONSENT_NOTE_PREFIX = '[CONSENT_FORM]:'

type ConsentRecord = {
  id: string
  recordedAt: string
  patientName: string
  doa?: string
  dod?: string
  regNo?: string
  ref?: string
  mrn: string
  age: string
  gender: string
  address: string
  fatherName: string
  guardianRel: string
  bedLabel: string
  doctorName: string
  panel?: string
  guardianName: string
  relation: string
  cnic: string
  contact: string
  patientOrGuardianName?: string
  patientRelation?: string
  patientTelephone?: string
  patientAddress?: string
  patientCnic?: string
  doctorOnDutyName?: string
  doctorOnDutyDesignation?: string
  doctorOnDutySign?: string
  nurseOnDutyName?: string
  nurseOnDutyDesignation?: string
  staffName: string
  sign: string
  date: string
  time: string
}

const inp = 'w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none transition-shadow focus:border-sky-400 focus:ring-2 focus:ring-sky-100 dark:bg-slate-900 dark:border-slate-700 dark:text-white'
const lbl = 'mb-1.5 block text-xs font-semibold tracking-wide text-slate-500 uppercase dark:text-slate-400'

export default function Hospital_IpdConsentForm({ encounterId }: { encounterId: string }){
  const [encounter, setEncounter] = useState<any | null>(null)
  const [records, setRecords] = useState<ConsentRecord[]>([])
  const [open, setOpen] = useState(false)
  const [editRecord, setEditRecord] = useState<ConsentRecord | null>(null)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)

  useEffect(()=>{ if(encounterId){ void reload() } }, [encounterId])

  const getEncounterSnapshot = async () => {
    try {
      const res = await hospitalApi.getIPDAdmissionById(encounterId) as any
      const enc = res?.encounter || null
      setEncounter(enc)
      return enc
    } catch {
      setEncounter(null)
      return null
    }
  }

  async function reload(){
    try{
      const enc = await getEncounterSnapshot()
      const patient = enc?.patientId || {}
      const doctorName = enc?.doctorId?.name || ''
      const res = await hospitalApi.listIpdNotes(encounterId, { limit: 200, noteType: 'nursing' } as any) as any
      const items = (res.notes || [])
        .filter((n: any) => n.note?.startsWith(CONSENT_NOTE_PREFIX))
        .map((n: any) => {
          try {
            const data = JSON.parse(n.note.substring(CONSENT_NOTE_PREFIX.length))
            return {
              id: String(n._id),
              recordedAt: String(n.createdAt || ''),
              patientName: data.patientName || patient?.fullName || '',
              doa: data.doa || '',
              dod: data.dod || '',
              regNo: data.regNo || '',
              ref: data.ref || '',
              mrn: data.mrn || patient?.mrn || '',
              age: data.age || patient?.age || '',
              gender: data.gender || patient?.gender || '',
              address: data.address || patient?.address || '',
              fatherName: data.fatherName || patient?.fatherName || '',
              guardianRel: data.guardianRel || patient?.guardianRel || '',
              bedLabel: data.bedLabel || enc?.bedLabel || enc?.bedId || '',
              doctorName: data.doctorName || doctorName || '',
              panel: data.panel || '',
              guardianName: data.guardianName || '',
              relation: data.relation || '',
              cnic: data.cnic || '',
              contact: data.contact || '',
              patientOrGuardianName: data.patientOrGuardianName || '',
              patientRelation: data.patientRelation || '',
              patientTelephone: data.patientTelephone || '',
              patientAddress: data.patientAddress || '',
              patientCnic: data.patientCnic || '',
              doctorOnDutyName: data.doctorOnDutyName || '',
              doctorOnDutyDesignation: data.doctorOnDutyDesignation || '',
              doctorOnDutySign: data.doctorOnDutySign || '',
              nurseOnDutyName: data.nurseOnDutyName || '',
              nurseOnDutyDesignation: data.nurseOnDutyDesignation || '',
              staffName: data.staffName || '',
              sign: data.sign || '',
              date: data.date || '',
              time: data.time || '',
            } satisfies ConsentRecord
          } catch {
            return null
          }
        })
        .filter(Boolean) as ConsentRecord[]
      setRecords(items)
    }catch{}
  }

  const buildPayload = (d: Partial<ConsentRecord>) => {
    const enc = encounter
    const patient = enc?.patientId || {}
    return {
      patientName: d.patientName || String(patient?.fullName || ''),
      doa: d.doa || String(enc?.startAt ? new Date(String(enc.startAt)).toLocaleString() : ''),
      dod: d.dod || '',
      bedLabel: d.bedLabel || String(enc?.bedLabel || enc?.bedId || ''),
      regNo: d.regNo || String((enc as any)?.regNo || (enc as any)?.reg || ''),
      mrn: d.mrn || String(patient?.mrn || ''),
      ref: d.ref || String((enc as any)?.ref || ''),
      age: d.age || String(patient?.age || ''),
      gender: d.gender || String(patient?.gender || ''),
      address: d.address || String(patient?.address || ''),
      fatherName: d.fatherName || String(patient?.fatherName || ''),
      guardianRel: d.guardianRel || String(patient?.guardianRel || ''),
      doctorName: d.doctorName || String(enc?.doctorId?.name || ''),
      panel: d.panel || String((enc as any)?.corporateCompanyName || (enc as any)?.panel || ''),
      guardianName: d.guardianName || '',
      relation: d.relation || '',
      cnic: d.cnic || '',
      contact: d.contact || '',
      patientOrGuardianName: d.patientOrGuardianName || d.guardianName || '',
      patientRelation: d.patientRelation || d.relation || d.guardianRel || '',
      patientTelephone: d.patientTelephone || d.contact || '',
      patientAddress: d.patientAddress || d.address || '',
      patientCnic: d.patientCnic || d.cnic || '',
      doctorOnDutyName: d.doctorOnDutyName || d.staffName || '',
      doctorOnDutyDesignation: d.doctorOnDutyDesignation || '',
      doctorOnDutySign: d.doctorOnDutySign || d.sign || '',
      nurseOnDutyName: d.nurseOnDutyName || '',
      nurseOnDutyDesignation: d.nurseOnDutyDesignation || '',
      staffName: d.staffName || '',
      sign: d.sign || '',
      date: d.date || '',
      time: d.time || '',
    }
  }

  const add = async (d: Partial<ConsentRecord>) => {
    try{
      const payload = buildPayload(d)
      await hospitalApi.createIpdNote(encounterId, {
        noteType: 'nursing',
        text: CONSENT_NOTE_PREFIX + JSON.stringify(payload),
      })
      setOpen(false)
      await reload()
    }catch(e: any){ alert(e?.message || 'Failed to add consent form') }
  }

  const update = async (d: Partial<ConsentRecord>) => {
    if (!editRecord) return
    try{
      const payload = buildPayload(d)
      await hospitalApi.updateIpdNote(encounterId, editRecord.id, {
        text: CONSENT_NOTE_PREFIX + JSON.stringify(payload),
      })
      setEditRecord(null)
      await reload()
    }catch(e: any){ alert(e?.message || 'Failed to update consent form') }
  }

  const deleteRecord = async () => {
    if (!confirmDeleteId) return
    try{
      await hospitalApi.deleteIpdNote(encounterId, confirmDeleteId)
      setConfirmDeleteId(null)
      await reload()
    }catch(e: any){ alert(e?.message || 'Failed to delete consent form') }
  }

  const printConsent = (id: string) => {
    const r = records.find(rec => rec.id === id)
    if (!r) return
    void printConsentForm(r)
  }

  const patientDefaults: Record<string, string> = encounter ? {
    patientName: String((encounter as any)?.patientId?.fullName || ''),
    doa: String((encounter as any)?.startAt ? new Date(String((encounter as any).startAt)).toLocaleString() : ''),
    mrn: String((encounter as any)?.patientId?.mrn || ''),
    age: String((encounter as any)?.patientId?.age || ''),
    gender: String((encounter as any)?.patientId?.gender || ''),
    address: String((encounter as any)?.patientId?.address || ''),
    fatherName: String((encounter as any)?.patientId?.fatherName || ''),
    guardianRel: String((encounter as any)?.patientId?.guardianRel || ''),
    bedLabel: String((encounter as any)?.bedLabel || (encounter as any)?.bedId || ''),
    doctorName: String((encounter as any)?.doctorId?.name || ''),
    panel: String((encounter as any)?.corporateCompanyName || (encounter as any)?.panel || ''),
    guardianName: String((encounter as any)?.patientId?.fatherName || (encounter as any)?.patientId?.fullName || ''),
    cnic: String((encounter as any)?.patientId?.cnicNormalized || ''),
    contact: String((encounter as any)?.patientId?.phoneNormalized || ''),
  } : {}

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm" data-encounterid={encounterId}>
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-sky-600 text-[10px] font-bold text-white">C</span>
          <span className="text-base font-bold text-slate-900">رضا مندی فارم / Consent Form</span>
        </div>
        <button onClick={()=>setOpen(true)} className="rounded-lg bg-sky-600 px-3 py-2 text-xs font-bold text-white shadow-sm shadow-sky-200 transition hover:bg-sky-700 active:scale-[0.98]">+ Add Form</button>
      </div>

      {records.length === 0 ? (
        <div className="rounded-lg border border-dashed border-slate-300 p-8 text-center text-sm text-slate-400">No consent forms yet. Click "Add Form" to create one.</div>
      ) : (
        <div className="space-y-4">
          {records.map(r => (
            <div key={r.id} className="rounded-xl border border-slate-200 p-4 transition-shadow hover:shadow-sm">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <span className="rounded-full bg-sky-100 px-2 py-0.5 font-semibold text-sky-700">{r.patientName || '-'}</span>
                  {r.mrn ? <span className="rounded-full bg-slate-100 px-2 py-0.5 text-slate-600">MRN: {r.mrn}</span> : null}
                  {r.bedLabel ? <span className="rounded-full bg-slate-100 px-2 py-0.5 text-slate-600">Bed: {r.bedLabel}</span> : null}
                  {r.doctorName ? <span className="rounded-full bg-slate-100 px-2 py-0.5 text-slate-600">Dr: {r.doctorName}</span> : null}
                </div>
                <div className="flex gap-2">
                  <button type="button" className="rounded-lg border border-slate-200 px-2.5 py-1 text-xs font-semibold text-slate-700 transition hover:bg-slate-50" onClick={() => setEditRecord(r)}>Edit</button>
                  <button type="button" className="rounded-lg border border-rose-200 px-2.5 py-1 text-xs font-semibold text-rose-600 transition hover:bg-rose-50" onClick={() => setConfirmDeleteId(r.id)}>Delete</button>
                  <button type="button" className="rounded-lg bg-sky-600 px-2.5 py-1 text-xs font-bold text-white shadow-sm transition hover:bg-sky-700" onClick={() => printConsent(r.id)}>Print</button>
                </div>
              </div>
              <div>
                <ConsentFormDisplay record={r} />
              </div>
              <div className="mt-2 text-right text-xs text-slate-400">
                Recorded: {new Date(r.recordedAt).toLocaleString()}
              </div>
            </div>
          ))}
        </div>
      )}

      <ConsentDialog
        open={open}
        onClose={()=>setOpen(false)}
        onSave={add}
        defaults={patientDefaults}
      />

      <ConsentDialog
        open={!!editRecord}
        onClose={()=>setEditRecord(null)}
        onSave={update}
        defaults={editRecord || {}}
        title="Edit Consent Form"
      />

      <ConfirmDialog
        open={!!confirmDeleteId}
        title="Delete Consent Form"
        message="Are you sure you want to delete this consent form? This action cannot be undone."
        confirmText="Delete"
        onCancel={()=>setConfirmDeleteId(null)}
        onConfirm={deleteRecord}
      />
    </div>
  )
}

const _cfStyles = {
  root: { direction: 'rtl', fontFamily: 'Jameel Noori Nastaleeq, Noto Nastaliq Urdu, serif', color: '#0f172a' } as React.CSSProperties,
  header: { textAlign: 'center', borderBottom: '1px solid #cbd5e1', paddingBottom: '8px' } as React.CSSProperties,
  title: { fontSize: '20px', fontWeight: 'bold', margin: 0 } as React.CSSProperties,
  subtitle: { fontSize: '12px', color: '#475569', marginTop: '4px' } as React.CSSProperties,
  grid2: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px 16px', fontSize: '13px', textAlign: 'right', direction: 'rtl', marginTop: '10px' } as React.CSSProperties,
  grid2full: { display: 'grid', gridTemplateColumns: '1fr', gap: '4px', fontSize: '13px', textAlign: 'right', direction: 'rtl', marginTop: '2px' } as React.CSSProperties,
  bold: { fontWeight: 'bold' } as React.CSSProperties,
  underlined: { borderBottom: '1px solid #94a3b8', padding: '0 4px' } as React.CSSProperties,
  body: { textAlign: 'right', lineHeight: '1.8', color: '#1e293b', fontSize: '13px', marginTop: '12px' } as React.CSSProperties,
  bodyP: { margin: '0 0 8px' } as React.CSSProperties,
  guardianGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px 16px', fontSize: '13px', textAlign: 'right', direction: 'rtl', marginTop: '16px' } as React.CSSProperties,
  sigWrap: { marginTop: '16px', borderTop: '1px solid #cbd5e1', paddingTop: '10px' } as React.CSSProperties,
  sigTable: { width: '100%', fontSize: '13px', borderCollapse: 'collapse', direction: 'rtl' } as React.CSSProperties,
  sigTd: { border: '1px solid #cbd5e1', padding: '6px 8px', verticalAlign: 'top' } as React.CSSProperties,
  sigTdBold: { border: '1px solid #cbd5e1', padding: '6px 8px', verticalAlign: 'top', fontWeight: 'bold' } as React.CSSProperties,
  sigTdBoldW25: { border: '1px solid #cbd5e1', padding: '6px 8px', verticalAlign: 'top', fontWeight: 'bold', width: '25%' } as React.CSSProperties,
  sigTdBoldW64: { border: '1px solid #cbd5e1', padding: '6px 8px', verticalAlign: 'top', fontWeight: 'bold', width: '64px' } as React.CSSProperties,
}

function ConsentFormDisplay({ record }: { record: ConsentRecord }) {
  const r = record
  const s = _cfStyles

  return (
    <div style={s.root}>
      {/* Header */}
      <div style={s.header}>
        <h2 style={s.title}>رضا مندی فارم</h2>
        <p style={s.subtitle}>طبی ادارے کا نام اور پتہ: چیمہ ہارٹ کمپلیکس</p>
      </div>

      {/* Patient Info Grid */}
      <div style={s.grid2}>
        <div><span style={s.bold}>نام مریض: </span><span style={s.underlined}>{r.patientName || '_________________'}</span></div>
        <div><span style={s.bold}>MRN: </span><span style={s.underlined}>{r.mrn || '_________________'}</span></div>
        <div><span style={s.bold}>عمر: </span><span style={s.underlined}>{r.age || '_________________'}</span></div>
        <div><span style={s.bold}>جنس: </span><span style={s.underlined}>{r.gender || '_________________'}</span></div>
        <div><span style={s.bold}>والد کا نام: </span><span style={s.underlined}>{r.fatherName || '_________________'}</span></div>
        <div><span style={s.bold}>تعلق: </span><span style={s.underlined}>{r.guardianRel || r.relation || '_________________'}</span></div>
        <div><span style={s.bold}>بستر نمبر: </span><span style={s.underlined}>{r.bedLabel || '_________________'}</span></div>
        <div><span style={s.bold}>ڈاکٹر: </span><span style={s.underlined}>{r.doctorName || '_________________'}</span></div>
      </div>
      <div style={s.grid2full}>
        <div><span style={s.bold}>پتہ: </span><span style={s.underlined}>{r.address || '_________________'}</span></div>
      </div>

      {/* Urdu Content */}
      <div style={s.body}>
        <p style={s.bodyP}>میں علاج کی خاطر سے ہسپتال میں داخل ہوں۔ اس سلسلے میں مریض کے تشخیص کے لیے ہر ممکنہ علاج اور طریقہ علاج کی اجازت دے رہا ہوں اور یہ کہ اس دوران کسی قسم کی پیدا ہونے والی پیچیدگی، ناگہانی موت وغیرہ کا ذمہ دار ہسپتال نہیں ہوگا۔</p>
        <p style={s.bodyP}>مجھے علاج کے سلسلے میں تفصیلات کے بارے میں بتا دیا گیا ہے اور یہ بتایا گیا ہے کہ علاج کے دوران کوئی ناگہانی تو واقعات میں بھی تبدیلی ہو سکتی ہے۔</p>
        <p style={s.bodyP}>ہسپتال کا عملہ مریض ہر مریض کے علاج کا ذمہ دار ہے اور صرف اس وجہ سے میرے کوئی جسمانی چیز میں ہسپتال کا عملہ اور ہسپتال ذمہ دار نہیں ہے۔</p>
        <p style={s.bodyP}>میں ہسپتال کے قوانین کی پابندی کرں گا اور عملے کے ساتھ تعاون کرں گا اور ہسپتال میں قیام کے دوران مندرجہ ذیل قواعد و ضوابط کا پابند رہوں گا۔</p>
        <p style={s.bodyP}>میں یقینی اشیاء، خصوصاً جہیز یا مہنگی چیزیں حفاظت خود کروں گا اور ہسپتال افراد سے بے جگہ رہوں گا۔</p>
        <p style={s.bodyP}>میں یہ بھی کہتا ہوں کہ میں نے ہسپتال کے اندر کسی قسم کے دھوکہ، دہشت گردی یا اسلحہ وغیرہ لے کر آؤں گا نہیں۔</p>
        <p style={s.bodyP}>نیز یہ کہ کوئی غیر قانونی کام نہیں کرنا ہے۔</p>
      </div>

      {/* Guardian Details */}
      <div style={s.guardianGrid}>
        <div><span style={s.bold}>نام مریض/سرپرست: </span><span style={s.underlined}>{r.guardianName || '_________________'}</span></div>
        <div><span style={s.bold}>تعلق: </span><span style={s.underlined}>{r.relation || r.guardianRel || '_________________'}</span></div>
        <div><span style={s.bold}>شناختی کارڈ نمبر: </span><span style={s.underlined}>{r.cnic || '_________________'}</span></div>
        <div><span style={s.bold}>فون نمبر: </span><span style={s.underlined}>{r.contact || '_________________'}</span></div>
      </div>

      {/* Signature Section */}
      <div style={s.sigWrap}>
        <table style={s.sigTable}>
          <tbody>
            <tr>
              <td style={s.sigTdBoldW25}>نام امراضی استری/ڈاکٹر:</td>
              <td style={s.sigTd}>{r.staffName || ''}</td>
              <td style={s.sigTdBoldW64}>دستخط:</td>
              <td style={s.sigTd}>{r.sign || ''}</td>
            </tr>
            <tr>
              <td style={s.sigTdBold}>تاریخ:</td>
              <td style={s.sigTd}>{r.date || ''}</td>
              <td style={s.sigTdBold}>وقت:</td>
              <td style={s.sigTd}>{r.time || ''}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  )
}

function ConsentDialog({
  open,
  onClose,
  onSave,
  defaults,
  title = 'Add Consent Form',
}: {
  open: boolean
  onClose: () => void
  onSave: (d: any) => void
  defaults?: Record<string, string>
  title?: string
}) {
  const mkForm = () => ({
    patientName: String(defaults?.patientName || ''),
    mrn: String(defaults?.mrn || ''),
    age: String(defaults?.age || ''),
    gender: String(defaults?.gender || ''),
    address: String(defaults?.address || ''),
    fatherName: String(defaults?.fatherName || ''),
    guardianRel: String(defaults?.guardianRel || ''),
    bedLabel: String(defaults?.bedLabel || ''),
    doctorName: String(defaults?.doctorName || ''),
    guardianName: String(defaults?.guardianName || ''),
    relation: String(defaults?.relation || ''),
    cnic: String(defaults?.cnic || ''),
    contact: String(defaults?.contact || ''),
    staffName: String(defaults?.staffName || ''),
    sign: String(defaults?.sign || ''),
    date: String(defaults?.date || new Date().toISOString().slice(0, 10)),
    time: String(defaults?.time || new Date().toTimeString().slice(0, 5)),
  })

  const [form, setForm] = useState(mkForm)
  const [preview, setPreview] = useState(false)

  useEffect(() => {
    if (open) { setForm(mkForm()); setPreview(false) }
  }, [open])

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }))

  const previewRecord: ConsentRecord = { id: '__preview__', recordedAt: new Date().toISOString(), ...form }

  const printPreview = () => {
    void printConsentForm(previewRecord)
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-base font-bold text-slate-900">{title}</h3>
          <button type="button" onClick={()=>setPreview(p=>!p)} className={`rounded-lg px-3 py-1.5 text-xs font-bold transition ${preview ? 'bg-sky-600 text-white' : 'border border-slate-200 text-slate-700 hover:bg-slate-50'}`}>
            {preview ? 'Edit' : 'Preview'}
          </button>
        </div>

        {preview ? (
          <div>
            <ConsentFormDisplay record={previewRecord} />
          </div>
        ) : (
          <>
            {/* Patient Information Section */}
            <div className="mb-5">
              <div className="mb-2 flex items-center gap-2 text-xs font-bold tracking-wide text-sky-600 uppercase">
                <span className="flex h-5 w-5 items-center justify-center rounded bg-sky-600 text-[9px] text-white">1</span>
                Patient Information
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className={lbl}>Patient Name</label><input className={inp} value={form.patientName} onChange={e=>set('patientName',e.target.value)} /></div>
                <div><label className={lbl}>MRN</label><input className={inp} value={form.mrn} onChange={e=>set('mrn',e.target.value)} /></div>
                <div><label className={lbl}>Age</label><input className={inp} value={form.age} onChange={e=>set('age',e.target.value)} /></div>
                <div><label className={lbl}>Gender</label>
                  <select className={inp} value={form.gender} onChange={e=>set('gender',e.target.value)}>
                    <option value="">Select</option>
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div><label className={lbl}>Father Name</label><input className={inp} value={form.fatherName} onChange={e=>set('fatherName',e.target.value)} /></div>
                <div><label className={lbl}>Guardian Relation</label><input className={inp} value={form.guardianRel} onChange={e=>set('guardianRel',e.target.value)} /></div>
                <div><label className={lbl}>Bed</label><input className={inp} value={form.bedLabel} onChange={e=>set('bedLabel',e.target.value)} /></div>
                <div><label className={lbl}>Doctor</label><input className={inp} value={form.doctorName} onChange={e=>set('doctorName',e.target.value)} /></div>
                <div className="col-span-2"><label className={lbl}>Address</label><input className={inp} value={form.address} onChange={e=>set('address',e.target.value)} /></div>
              </div>
            </div>

            {/* Guardian / Consent Section */}
            <div className="mb-5">
              <div className="mb-2 flex items-center gap-2 text-xs font-bold tracking-wide text-sky-600 uppercase">
                <span className="flex h-5 w-5 items-center justify-center rounded bg-sky-600 text-[9px] text-white">2</span>
                Guardian / Consent Details
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className={lbl}>Guardian Name</label><input className={inp} value={form.guardianName} onChange={e=>set('guardianName',e.target.value)} placeholder="نام مریض/سرپرست" /></div>
                <div><label className={lbl}>Relation</label><input className={inp} value={form.relation} onChange={e=>set('relation',e.target.value)} placeholder="تعلق" /></div>
                <div><label className={lbl}>CNIC</label><input className={inp} value={form.cnic} onChange={e=>set('cnic',e.target.value)} placeholder="شناختی کارڈ نمبر" /></div>
                <div><label className={lbl}>Contact</label><input className={inp} value={form.contact} onChange={e=>set('contact',e.target.value)} placeholder="فون نمبر" /></div>
              </div>
            </div>

            {/* Staff Signature Section */}
            <div className="mb-5">
              <div className="mb-2 flex items-center gap-2 text-xs font-bold tracking-wide text-sky-600 uppercase">
                <span className="flex h-5 w-5 items-center justify-center rounded bg-sky-600 text-[9px] text-white">3</span>
                Staff Signature
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className={lbl}>Staff Name</label><input className={inp} value={form.staffName} onChange={e=>set('staffName',e.target.value)} /></div>
                <div><label className={lbl}>Sign</label><input className={inp} value={form.sign} onChange={e=>set('sign',e.target.value)} placeholder="دستخط" /></div>
                <div><label className={lbl}>Date</label><input type="date" className={inp} value={form.date} onChange={e=>set('date',e.target.value)} /></div>
                <div><label className={lbl}>Time</label><input type="time" className={inp} value={form.time} onChange={e=>set('time',e.target.value)} /></div>
              </div>
            </div>
          </>
        )}

        <div className="flex justify-end gap-2 border-t border-slate-200 pt-4">
          <button onClick={onClose} className="rounded-lg border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50">Cancel</button>
          {preview && <button type="button" onClick={printPreview} className="rounded-lg border border-sky-200 bg-sky-50 px-4 py-2 text-xs font-bold text-sky-700 transition hover:bg-sky-100">Print</button>}
          <button onClick={() => onSave(form)} className="rounded-lg bg-sky-600 px-4 py-2 text-xs font-bold text-white shadow-sm transition hover:bg-sky-700 active:scale-[0.98]">Save</button>
        </div>
      </div>
    </div>
  )
}
