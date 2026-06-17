import { useEffect, useState, useRef } from 'react'
import { ipdApi, hospitalApi } from '../../../../utils/api'
import ConfirmDialog from '../../../common/ConfirmDialog'
import { useReactToPrint } from 'react-to-print'

export default function Hospital_IpdConsentForm({ encounterId }: { encounterId: string }){
  const [records, setRecords] = useState<Array<{
    id: string
    recordedAt: string
    guardianName: string
    relation: string
    cnic: string
    contact: string
    staffName: string
    sign: string
    date: string
    time: string
  }>>([])
  const [open, setOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingData, setEditingData] = useState<any>(null)
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [hospitalSettings, setHospitalSettings] = useState<any>(null)
  const printRef = useRef<HTMLDivElement>(null)
  const [printData, setPrintData] = useState<any>(null)

  const handlePrint = useReactToPrint({
    contentRef: printRef,
    print: async (target: HTMLIFrameElement) => {
      const html = target.contentDocument?.documentElement.outerHTML
      if (html && (window as any).electronAPI?.printPreviewHtml) {
        await (window as any).electronAPI.printPreviewHtml(html)
      } else {
        target.contentWindow?.print()
      }
    }
  })

  useEffect(() => {
    hospitalApi.getSettings().then(setHospitalSettings).catch(() => {})
  }, [])

  useEffect(()=>{ if(encounterId){ reload() } }, [encounterId])

  async function reload(){
    try{
      const res = await ipdApi.listIpdConsentForms(encounterId, { formType: 'informed-consent', limit: 200 }) as any
      const items = (res.consentForms || []).map((n: any) => ({
        id: String(n._id),
        recordedAt: String(n.createdAt || ''),
        guardianName: n.representativeName || '',
        relation: n.representativeRelation || '',
        cnic: n.representativeCnic || '',
        contact: n.witnessContact || '',
        staffName: n.doctorName || '',
        sign: n.doctorSignature || '',
        date: n.doctorSignedAt?.slice(0, 10) || '',
        time: n.doctorSignedAt?.slice(11, 16) || '',
      }))
      setRecords(items)
    }catch{}
  }

  const add = async (d: {
    guardianName?: string
    patientName?: string
    relation?: string
    cnic?: string
    contact?: string
    staffName?: string
    sign?: string
    date?: string
    time?: string
  }) => {
    try{
      const dateTime = `${d.date || new Date().toISOString().slice(0, 10)}T${d.time || new Date().toTimeString().slice(0, 5)}:00`
      await ipdApi.createIpdConsentForm(encounterId, {
        formType: 'informed-consent',
        formTitle: 'رضا مندی فارم / Consent Form',
        representativeName: d.guardianName,
        representativeRelation: d.relation,
        representativeCnic: d.cnic,
        witnessContact: d.contact,
        doctorName: d.staffName,
        doctorSignature: d.sign,
        doctorSignedAt: dateTime,
        status: 'completed',
      })
      setOpen(false)
      await reload()
    }catch(e: any){ alert(e?.message || 'Failed to add consent form') }
  }

  const update = async (d: any) => {
    if (!editingId) return
    try{
      const dateTime = `${d.date || new Date().toISOString().slice(0, 10)}T${d.time || new Date().toTimeString().slice(0, 5)}:00`
      await ipdApi.updateIpdConsentForm(editingId, {
        representativeName: d.guardianName,
        representativeRelation: d.relation,
        representativeCnic: d.cnic,
        witnessContact: d.contact,
        doctorName: d.staffName,
        doctorSignature: d.sign,
        doctorSignedAt: dateTime,
      })
      setEditingId(null); setEditingData(null); await reload()
    }catch(e: any){ alert(e?.message || 'Failed to update consent form') }
  }

  const remove = async (id: string) => {
    setDeleteId(id)
    setDeleteConfirmOpen(true)
  }

  const handleDeleteConfirm = async () => {
    if (!deleteId) return
    try { await ipdApi.deleteIpdConsentForm(deleteId); await reload() } catch (e: any) { alert(e?.message || 'Failed to delete') }
    setDeleteId(null)
  }

  const startEdit = (r: any) => { setEditingId(r.id); setEditingData(r); setOpen(true); }

  const triggerPrint = (r: any) => {
    setPrintData(r)
    setTimeout(() => {
      handlePrint()
    }, 100)
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4" data-encounterid={encounterId}>
      <div className="mb-4 flex items-center justify-between print:hidden">
        <div className="text-lg font-semibold text-slate-900">رضا مندی فارم / Consent Form</div>
        <button onClick={()=>setOpen(true)} className="btn">Add Form</button>
      </div>

      {records.length === 0 ? (
        <div className="text-slate-500">No consent forms yet.</div>
      ) : (
        <div className="space-y-4">
          {records.map(r => (
            <div key={r.id} className="rounded-lg border border-slate-200 p-4">
              <ConsentFormDisplay
                guardianName={r.guardianName}
                relation={r.relation}
                cnic={r.cnic}
                contact={r.contact}
                staffName={r.staffName}
                sign={r.sign}
                date={r.date}
                time={r.time}
                settings={hospitalSettings}
              />
              <div className="mt-2 flex items-center justify-between text-xs text-slate-500">
                <div>Recorded: {new Date(r.recordedAt).toLocaleString()}</div>
                <div className="flex gap-1 print:hidden">
                  <button onClick={() => triggerPrint(r)} className="rounded px-2 py-0.5 text-xs text-emerald-600 hover:bg-emerald-50">Print</button>
                  <button onClick={() => startEdit(r)} className="rounded px-2 py-0.5 text-xs text-blue-600 hover:bg-blue-50">Edit</button>
                  <button onClick={() => remove(r.id)} className="rounded px-2 py-0.5 text-xs text-red-600 hover:bg-red-50">Delete</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Hidden print container */}
      <div style={{ display: 'none' }}>
        <div ref={printRef} className="p-8">
          {printData && (
            <ConsentFormDisplay
              guardianName={printData.guardianName}
              relation={printData.relation}
              cnic={printData.cnic}
              contact={printData.contact}
              staffName={printData.staffName}
              sign={printData.sign}
              date={printData.date}
              time={printData.time}
              settings={hospitalSettings}
            />
          )}
        </div>
      </div>

      <ConsentDialog key={editingId || 'add'} open={open} onClose={()=>{ setOpen(false); setEditingId(null); setEditingData(null) }} onSave={editingId ? update : add} initial={editingData} />
      <ConfirmDialog
        open={deleteConfirmOpen}
        title="Delete Consent Form"
        message="Are you sure you want to delete this consent form?"
        onConfirm={() => { handleDeleteConfirm(); setDeleteConfirmOpen(false) }}
        onCancel={() => { setDeleteConfirmOpen(false); setDeleteId(null) }}
      />
    </div>
  )
}

function ConsentFormDisplay({
  guardianName,
  relation,
  cnic,
  contact,
  staffName,
  sign,
  date,
  time,
  settings,
}: {
  guardianName: string
  relation: string
  cnic: string
  contact: string
  staffName: string
  sign: string
  date: string
  time: string
  settings?: any
}) {
  return (
    <div className="space-y-4" style={{ direction: 'rtl', fontFamily: 'Jameel Noori Nastaleeq, Noto Nastaliq Urdu, serif' }}>
      {/* Header */}
      <div className="text-center border-b border-slate-300 pb-4 flex flex-col items-center">
        {settings?.logoUrl && <img src={settings.logoUrl} alt="Logo" className="h-16 w-auto mb-2 object-contain" />}
        <h2 className="text-xl font-bold text-slate-900">{settings?.name || ''}</h2>
        <div className="text-sm text-slate-600 mt-1 flex gap-2 justify-center flex-wrap">
          {settings?.address && <span>{settings.address}</span>}
          {settings?.phone && <span className="pr-2 border-r border-slate-300">فون: {settings.phone}</span>}
          {settings?.email && <span className="pr-2 border-r border-slate-300">{settings.email}</span>}
        </div>
        <h3 className="text-lg font-bold text-slate-900 mt-4 border-t border-slate-200 pt-2 inline-block px-12">رضا مندی فارم</h3>
      </div>

      {/* Urdu Content */}
      <div className="text-right leading-relaxed text-slate-800 space-y-3 text-sm">
        <p>
          میں علاج کی خاطر سے ہسپتال میں داخل ہوں۔ اس سلسلے میں مریض کے تشخیص کے لیے ہر ممکنہ علاج اور طریقہ علاج کی اجازت دے رہا ہوں اور یہ کہ اس دوران کسی قسم کی پیدا ہونے والی پیچیدگی، ناگہانی موت وغیرہ کا ذمہ دار ہسپتال نہیں ہوگا۔
        </p>

        <p>
          مجھے علاج کے سلسلے میں تفصیلات کے بارے میں بتا دیا گیا ہے اور یہ بتایا گیا ہے کہ علاج کے دوران کوئی ناگہانی تو واقعات میں بھی تبدیلی ہو سکتی ہے۔
        </p>

        <p>
          ہسپتال کا عملہ مریض ہر مریض کے علاج کا ذمہ دار ہے اور صرف اس وجہ سے میرے کوئی جسمانی چیز میں ہسپتال کا عملہ اور ہسپتال ذمہ دار نہیں ہے۔
        </p>

        <p>
          میں ہسپتال کے قوانین کی پابندی کرں گا اور عملے کے ساتھ تعاون کرں گا اور ہسپتال میں قیام کے دوران مندرجہ ذیل قواعد و ضوابط کا پابند رہوں گا۔
        </p>

        <p>
          میں یقینی اشیاء، خصوصاً جہیز یا مہنگی چیزیں حفاظت خود کروں گا اور ہسپتال افراد سے بے جگہ رہوں گا۔
        </p>

        <div className="mt-4 space-y-1">
          <p>میں یہ بھی کہتا ہوں کہ میں نے ہسپتال کے اندر کسی قسم کے دھوکہ، دہشت گردی یا اسلحہ وغیرہ لے کر آؤں گا نہیں۔</p>
          <p>نیز یہ کہ کوئی غیر قانونی کام نہیں کرنا ہے۔</p>
        </div>
      </div>

      {/* Patient/Guardian Details */}
      <div className="grid grid-cols-2 gap-4 mt-6 text-right text-sm" style={{ direction: 'rtl' }}>
        <div>
          <span className="font-semibold">نام مریض/سرپرست: </span>
          <span className="border-b border-slate-400 px-2">{guardianName || '_________________'}</span>
        </div>
        <div>
          <span className="font-semibold">تعلق: </span>
          <span className="border-b border-slate-400 px-2">{relation || '_________________'}</span>
        </div>
        <div>
          <span className="font-semibold">شناختی کارڈ نمبر: </span>
          <span className="border-b border-slate-400 px-2">{cnic || '_________________'}</span>
        </div>
        <div>
          <span className="font-semibold">فون نمبر: </span>
          <span className="border-b border-slate-400 px-2">{contact || '_________________'}</span>
        </div>
      </div>

      {/* Signature Section */}
      <div className="mt-6 border-t border-slate-300 pt-4">
        <table className="w-full text-sm" style={{ direction: 'rtl' }}>
          <tbody>
            <tr className="border border-slate-300">
              <td className="p-2 border-l border-slate-300 font-semibold w-1/4">نام امراضی استری/ڈاکٹر:</td>
              <td className="p-2 border-l border-slate-300">{staffName || ''}</td>
              <td className="p-2 border-l border-slate-300 font-semibold w-16">دستخط:</td>
              <td className="p-2">{sign || ''}</td>
            </tr>
            <tr className="border border-slate-300 border-t-0">
              <td className="p-2 border-l border-slate-300 font-semibold">تاریخ:</td>
              <td className="p-2 border-l border-slate-300">{date || ''}</td>
              <td className="p-2 border-l border-slate-300 font-semibold">Time:</td>
              <td className="p-2">{time || ''}</td>
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
  initial,
}: {
  open: boolean
  onClose: () => void
  onSave: (d: any) => void
  initial?: any
}) {
  const [form, setForm] = useState({
    guardianName: initial?.guardianName || '',
    patientName: '',
    relation: initial?.relation || '',
    cnic: initial?.cnic || '',
    contact: initial?.contact || '',
    staffName: initial?.staffName || '',
    sign: initial?.sign || '',
    date: initial?.date || new Date().toISOString().slice(0, 10),
    time: initial?.time || new Date().toTimeString().slice(0, 5),
  })

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-xl bg-white p-6">
        <h3 className="mb-4 text-lg font-semibold">{initial ? 'Edit Consent Form' : 'Add Consent Form'}</h3>

        {/* Urdu Consent Text Display */}
        <div className="mb-6 rounded-lg border border-slate-200 bg-slate-50 p-4 max-h-48 overflow-y-auto" style={{ direction: 'rtl', fontFamily: 'Jameel Noori Nastaleeq, Noto Nastaliq Urdu, serif' }}>
          <div className="text-right text-sm text-slate-800 space-y-2 leading-relaxed">
            <p className="font-semibold text-center mb-3">رضا مندی فارم</p>
            <p>
              میں علاج کی خاطر سے ہسپتال میں داخل ہوں۔ اس سلسلے میں مریض کے تشخیص کے لیے ہر ممکنہ علاج اور طریقہ علاج کی اجازت دے رہا ہوں اور یہ کہ اس دوران کسی قسم کی پیدا ہونے والی پیچیدگی، ناگہانی موت وغیرہ کا ذمہ دار ہسپتال نہیں ہوگا۔
            </p>
            <p>
              مجھے علاج کے سلسلے میں تفصیلات کے بارے میں بتا دیا گیا ہے اور یہ بتایا گیا ہے کہ علاج کے دوران کوئی ناگہانی تو واقعات میں بھی تبدیلی ہو سکتی ہے۔
            </p>
            <p>
              ہسپتال کا عملہ مریض ہر مریض کے علاج کا ذمہ دار ہے اور صرف اس وجہ سے میرے کوئی جسمانی چیز میں ہسپتال کا عملہ اور ہسپتال ذمہ دار نہیں ہے۔
            </p>
            <p>
              میں ہسپتال کے قوانین کی پابندی کرں گا اور عملے کے ساتھ تعاون کرں گا اور ہسپتال میں قیام کے دوران مندرجہ ذیل قواعد و ضوابط کا پابند رہوں گا۔
            </p>
            <p>
              میں یقینی اشیاء، خصوصاً جہیز یا مہنگی چیزیں حفاظت خود کروں گا اور ہسپتال افراد سے بے جگہ رہوں گا۔
            </p>
            <p>میں یہ بھی کہتا ہوں کہ میں نے ہسپتال کے اندر کسی قسم کے دھوکہ، دہشت گردی یا اسلحہ وغیرہ لے کر آؤں گا نہیں۔</p>
            <p>نیز یہ کہ کوئی غیر قانونی کام نہیں کرنا ہے۔</p>
          </div>
        </div>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Guardian/Patient Name</label>
              <input
                type="text"
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                value={form.guardianName}
                onChange={(e) => setForm({ ...form, guardianName: e.target.value })}
                placeholder="نام مریض/سرپرست"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Relation</label>
              <input
                type="text"
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                value={form.relation}
                onChange={(e) => setForm({ ...form, relation: e.target.value })}
                placeholder="تعلق"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">CNIC Number</label>
              <input
                type="text"
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                value={form.cnic}
                onChange={(e) => setForm({ ...form, cnic: e.target.value })}
                placeholder="شناختی کارڈ نمبر"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Contact Number</label>
              <input
                type="text"
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                value={form.contact}
                onChange={(e) => setForm({ ...form, contact: e.target.value })}
                placeholder="فون نمبر"
              />
            </div>
          </div>

          <div className="border-t border-slate-200 pt-4">
            <h4 className="mb-3 text-sm font-semibold text-slate-700">Staff Signature</h4>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Staff Name</label>
                <input
                  type="text"
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                  value={form.staffName}
                  onChange={(e) => setForm({ ...form, staffName: e.target.value })}
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Sign</label>
                <input
                  type="text"
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                  value={form.sign}
                  onChange={(e) => setForm({ ...form, sign: e.target.value })}
                  placeholder="دستخط"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Date</label>
              <input
                type="date"
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                value={form.date}
                onChange={(e) => setForm({ ...form, date: e.target.value })}
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Time</label>
              <input
                type="time"
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                value={form.time}
                onChange={(e) => setForm({ ...form, time: e.target.value })}
              />
            </div>
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-2">
          <button onClick={onClose} className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
            Cancel
          </button>
          <button
            onClick={() => onSave(form)}
            className="rounded-md bg-slate-800 px-4 py-2 text-sm font-medium text-white hover:bg-slate-900"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  )
}
