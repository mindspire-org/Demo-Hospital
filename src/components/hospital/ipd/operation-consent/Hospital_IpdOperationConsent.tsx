import { useEffect, useState, useRef } from 'react'
import { ipdApi } from '../../../../features/hospital/ipd'
import { hospitalApi } from '../../../../utils/api'
import { useEncounterDefaults } from '../../../../hooks/useEncounterDefaults'
import ConfirmDialog from '../../../common/ConfirmDialog'
import { useReactToPrint } from 'react-to-print'
import { fmtDate, fmt12 } from '../../../../utils/timeFormat'

type OperationConsentRecord = {
  _id: string
  mrNumber?: string
  patientName?: string
  date?: string
  doctorId?: string
  doctorName?: string
  doctorSign?: string
  anesthesia?: {
    guardianName?: string
    guardianSign?: string
    date?: string
    time?: string
    doctorName?: string
    doctorSign?: string
  }
  operation?: {
    guardianName?: string
    guardianSign?: string
    date?: string
    time?: string
    doctorName?: string
    doctorSign?: string
  }
  bloodTransfusion?: {
    guardianName?: string
    guardianSign?: string
    date?: string
    time?: string
    doctorName?: string
    doctorSign?: string
  }
  status?: 'draft' | 'partial' | 'completed' | 'cancelled'
  recordedBy?: string
  recordedAt?: string
  notes?: string
  createdAt?: string
}

export default function Hospital_IpdOperationConsent({ encounterId }: { encounterId: string }){
  const [records, setRecords] = useState<OperationConsentRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingData, setEditingData] = useState<OperationConsentRecord | null>(null)
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [hospitalSettings, setHospitalSettings] = useState<any>(null)
  
  const encounterDefaults = useEncounterDefaults(encounterId)

  const printRef = useRef<HTMLDivElement>(null)
  const [printData, setPrintData] = useState<OperationConsentRecord | null>(null)

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
    setLoading(true)
    try{
      const res = await ipdApi.listIpdOperationConsents(encounterId, { limit: 200 }) as any
      setRecords(res?.operationConsents || [])
    }catch{}
    setLoading(false)
  }

  const add = async (d: any) => {
    try{
      await ipdApi.createIpdOperationConsent(encounterId, {
        mrNumber: d.mrNumber,
        patientName: d.patientName,
        date: d.date,
        doctorName: d.doctorName,
        doctorSign: d.sign,
        anesthesia: {
          guardianName: d.anesthesiaGuardian,
          guardianSign: d.anesthesiaSign,
          date: d.anesthesiaDate,
          time: d.anesthesiaTime,
          doctorName: d.anesthesiaDoctorName,
          doctorSign: d.anesthesiaDoctorSign,
        } as any,
        operation: {
          guardianName: d.operationGuardian,
          guardianSign: d.operationSign,
          date: d.operationDate,
          time: d.operationTime,
          doctorName: d.operationDoctorName,
          doctorSign: d.operationDoctorSign,
        } as any,
        bloodTransfusion: {
          guardianName: d.bloodGuardian,
          guardianSign: d.bloodSign,
          date: d.bloodDate,
          time: d.bloodTime,
          doctorName: d.bloodDoctorName,
          doctorSign: d.bloodDoctorSign,
        } as any,
        status: 'completed',
        recordedBy: d.doctorName,
      })
      setOpen(false)
      await reload()
    }catch(e: any){ alert(e?.message || 'Failed to save consent form') }
  }

  const update = async (d: any) => {
    if (!editingId) return
    try{
      await ipdApi.updateIpdOperationConsent(editingId, {
        mrNumber: d.mrNumber,
        patientName: d.patientName,
        date: d.date,
        doctorName: d.doctorName,
        doctorSign: d.sign,
        anesthesia: {
          guardianName: d.anesthesiaGuardian,
          guardianSign: d.anesthesiaSign,
          date: d.anesthesiaDate,
          time: d.anesthesiaTime,
          doctorName: d.anesthesiaDoctorName,
          doctorSign: d.anesthesiaDoctorSign,
        } as any,
        operation: {
          guardianName: d.operationGuardian,
          guardianSign: d.operationSign,
          date: d.operationDate,
          time: d.operationTime,
          doctorName: d.operationDoctorName,
          doctorSign: d.operationDoctorSign,
        } as any,
        bloodTransfusion: {
          guardianName: d.bloodGuardian,
          guardianSign: d.bloodSign,
          date: d.bloodDate,
          time: d.bloodTime,
          doctorName: d.bloodDoctorName,
          doctorSign: d.bloodDoctorSign,
        } as any,
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
    try { await ipdApi.deleteIpdOperationConsent(deleteId); await reload() } catch (e: any) { alert(e?.message || 'Failed to delete') }
    setDeleteId(null)
  }

  const startEdit = (r: any) => { setEditingId(r._id); setEditingData(r); setOpen(true); }

  const triggerPrint = (r: OperationConsentRecord) => {
    setPrintData(r)
    setTimeout(() => {
      handlePrint()
    }, 100)
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4" data-encounterid={encounterId}>
      <div className="mb-4 flex items-center justify-between print:hidden">
        <div className="text-lg font-semibold text-slate-900">Consent Forms (Anesthesia/Operation/Blood)</div>
        <button onClick={()=>setOpen(true)} className="btn">Add Form</button>
      </div>

      {loading ? (
        <div className="text-slate-500">Loading...</div>
      ) : records.length === 0 ? (
        <div className="text-slate-500">No consent records yet.</div>
      ) : (
        <div className="space-y-6">
          {records.map(r => (
            <div key={r._id} className="rounded-lg border border-slate-200 p-4">
              <OperationConsentDisplay data={r} settings={hospitalSettings} defaults={encounterDefaults} />
              <div className="mt-2 flex items-center justify-between text-xs text-slate-500">
                <div>Recorded: {r.createdAt ? new Date(r.createdAt).toLocaleString() : '-'}</div>
                <div className="flex gap-1 print:hidden">
                  <button onClick={() => triggerPrint(r)} className="rounded px-2 py-0.5 text-xs text-emerald-600 hover:bg-emerald-50">Print</button>
                  <button onClick={() => startEdit(r)} className="rounded px-2 py-0.5 text-xs text-blue-600 hover:bg-blue-50">Edit</button>
                  <button onClick={() => remove(r._id)} className="rounded px-2 py-0.5 text-xs text-red-600 hover:bg-red-50">Delete</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Hidden print container */}
      <div style={{ display: 'none' }}>
        <div ref={printRef} className="p-8">
          {printData && <OperationConsentDisplay data={printData} settings={hospitalSettings} defaults={encounterDefaults} printMode />}
        </div>
      </div>

      <OperationConsentDialog 
        key={editingId || 'add'} 
        open={open} 
        onClose={()=>{ setOpen(false); setEditingId(null); setEditingData(null) }} 
        onSave={editingId ? update : add} 
        initial={editingData} 
        defaults={encounterDefaults}
      />
      <ConfirmDialog
        open={deleteConfirmOpen}
        title="Delete Operation Consent"
        message="Are you sure you want to delete this operation consent?"
        onConfirm={() => { handleDeleteConfirm(); setDeleteConfirmOpen(false) }}
        onCancel={() => { setDeleteConfirmOpen(false); setDeleteId(null) }}
      />
    </div>
  )
}

function HeaderAndPatientInfo({ settings, defaults, data }: { settings: any; defaults: any; data: OperationConsentRecord }) {
  return (
    <>
      <div className="text-center border-b border-slate-300 pb-3">
        <h2 className="text-xl font-bold text-slate-900">{settings?.name || 'Surgicare Hospital & Maternity Center Karor Lal Eason'}</h2>
        {settings?.address && <p className="text-xs text-slate-600">{settings.address}</p>}
        {settings?.phone && <p className="text-xs text-slate-600">Phone: {settings.phone}</p>}
      </div>

      <div className="grid grid-cols-3 gap-x-6 gap-y-3 text-sm py-4">
        <div className="flex gap-2">
          <span className="font-semibold whitespace-nowrap">MR Number:</span>
          <span className="border-b border-slate-400 flex-1">{data.mrNumber || defaults?.mrn || ''}</span>
        </div>
        <div className="flex gap-2">
          <span className="font-semibold whitespace-nowrap">Patient Name:</span>
          <span className="border-b border-slate-400 flex-1">{data.patientName || defaults?.patientName || ''}</span>
        </div>
        <div className="flex gap-2">
          <span className="font-semibold whitespace-nowrap">Father/Guardian:</span>
          <span className="border-b border-slate-400 flex-1">{defaults?.fatherName || ''}</span>
        </div>
        <div className="flex gap-2">
          <span className="font-semibold whitespace-nowrap">Phone:</span>
          <span className="border-b border-slate-400 flex-1">{defaults?.contact || ''}</span>
        </div>
        <div className="flex gap-2">
          <span className="font-semibold whitespace-nowrap">Gender:</span>
          <span className="border-b border-slate-400 flex-1">{defaults?.gender || ''}</span>
        </div>
        <div className="flex gap-2">
          <span className="font-semibold whitespace-nowrap">Admission No:</span>
          <span className="border-b border-slate-400 flex-1">{defaults?.encounter?.admissionNo || ''}</span>
        </div>
        <div className="flex gap-2">
          <span className="font-semibold whitespace-nowrap">Bed Info:</span>
          <span className="border-b border-slate-400 flex-1">{defaults?.bedLabel || ''}</span>
        </div>
        <div className="flex gap-2">
          <span className="font-semibold whitespace-nowrap">Admit Date/Time:</span>
          <span className="border-b border-slate-400 flex-1">{defaults?.doa || ''}</span>
        </div>
        <div className="flex gap-2">
          <span className="font-semibold whitespace-nowrap">Form Date:</span>
          <span className="border-b border-slate-400 flex-1">{fmtDate(data.date) || ''}</span>
        </div>
      </div>
    </>
  )
}

function OperationConsentDisplay({ data, settings, defaults, printMode }: { data: OperationConsentRecord; settings?: any; defaults?: any; printMode?: boolean }) {
  const AnesthesiaForm = () => (
    <div className="border border-slate-300 rounded-lg p-4" style={{ direction: 'rtl', fontFamily: 'Jameel Noori Nastaleeq, Noto Nastaliq Urdu, serif' }}>
      <h3 className="text-center font-bold text-lg mb-4 border-b pb-2">اجازت نامہ برائے بیہوشی</h3>
      <div className="text-right space-y-2 text-sm leading-relaxed">
        <p>میں اس بات کی اجازت دیتا ہوں کہ میرے مریض کا آپریشن کیا جائے۔ بے ہوشی کا عمل کیا جائے اور ضرورت پڑنے پر انجیکشن اور دوائیاں دی جائیں۔</p>
        <p>آپریشن کے دوران کسی قسم کی ناخوشگوار صورتحال پیش آ سکتی ہے جو مریض کے لیے خطرناک ثابت ہو سکتی ہے ہسپتال اس صورتحال کے لیے ذمہ دار نہیں ہوگا۔</p>
        <p>میں یہ اعلان کرتا ہوں کہ میں نے بے ہوشی کے طریقہ کار کے بارے میں ڈاکٹر سے تمام ضروری معلومات حاصل کر لی ہیں۔</p>
      </div>
      <div className="mt-4 grid grid-cols-4 gap-4 text-sm pt-4 border-t border-slate-300">
        <div className="flex gap-2">
          <span className="font-semibold whitespace-nowrap">والد/بستی/سرپرست:</span>
          <span className="border-b border-slate-400 flex-1">{data.anesthesia?.guardianName || ''}</span>
        </div>
        <div className="flex gap-2">
          <span className="font-semibold">دستخط:</span>
          <span className="border-b border-slate-400 flex-1">{data.anesthesia?.guardianSign || ''}</span>
        </div>
        <div className="flex gap-2">
          <span className="font-semibold">Date:</span>
          <span className="border-b border-slate-400 flex-1">{fmtDate(data.anesthesia?.date) || ''}</span>
        </div>
        <div className="flex gap-2">
          <span className="font-semibold">Time:</span>
          <span className="border-b border-slate-400 flex-1">{fmt12(data.anesthesia?.time || '')}</span>
        </div>
      </div>
      <div className="mt-2 grid grid-cols-3 gap-4 text-sm">
        <div className="flex gap-2">
          <span className="font-semibold whitespace-nowrap">Doctor Name:</span>
          <span className="border-b border-slate-400 flex-1">{data.anesthesia?.doctorName || data.doctorName || ''}</span>
        </div>
        <div className="flex gap-2">
          <span className="font-semibold">Sign:</span>
          <span className="border-b border-slate-400 flex-1">{data.anesthesia?.doctorSign || data.doctorSign || ''}</span>
        </div>
        <div className="flex gap-2">
          <span className="font-semibold">Date:</span>
          <span className="border-b border-slate-400 flex-1">{fmtDate(data.anesthesia?.date || data.date) || ''}</span>
        </div>
      </div>
    </div>
  )

  const OperationForm = () => (
    <div className="border border-slate-300 rounded-lg p-4" style={{ direction: 'rtl', fontFamily: 'Jameel Noori Nastaleeq, Noto Nastaliq Urdu, serif' }}>
      <h3 className="text-center font-bold text-lg mb-4 border-b pb-2">اجازت نامہ برائے آپریشن</h3>
      <div className="text-right space-y-2 text-sm leading-relaxed">
        <p>میں اس بات کی اجازت دیتا ہوں کہ میرے مریض کا آپریشن کیا جائے۔</p>
        <p>آپریشن کے دوران کسی قسم کی ناخوشگوار صورتحال پیش آسکتی ہے جیسے خون کا اخراج، علاج کی ناکامی، آلہ (Ventilator) کی ضرورت اور ایسی دیگر پیچیدگیاں جو مریض کے لیے خطرناک ثابت ہو سکتی ہیں۔</p>
        <p>میں یہ اعلان کرتا ہوں کہ ڈاکٹر نے تمام معلومات سے آگاہ کر دیا ہے۔</p>
      </div>
      <div className="mt-4 grid grid-cols-4 gap-4 text-sm pt-4 border-t border-slate-300">
        <div className="flex gap-2">
          <span className="font-semibold whitespace-nowrap">والد/بستی/سرپرست:</span>
          <span className="border-b border-slate-400 flex-1">{data.operation?.guardianName || ''}</span>
        </div>
        <div className="flex gap-2">
          <span className="font-semibold">دستخط:</span>
          <span className="border-b border-slate-400 flex-1">{data.operation?.guardianSign || ''}</span>
        </div>
        <div className="flex gap-2">
          <span className="font-semibold">Date:</span>
          <span className="border-b border-slate-400 flex-1">{fmtDate(data.operation?.date) || ''}</span>
        </div>
        <div className="flex gap-2">
          <span className="font-semibold">Time:</span>
          <span className="border-b border-slate-400 flex-1">{fmt12(data.operation?.time || '')}</span>
        </div>
      </div>
      <div className="mt-2 grid grid-cols-3 gap-4 text-sm">
        <div className="flex gap-2">
          <span className="font-semibold whitespace-nowrap">Doctor Name:</span>
          <span className="border-b border-slate-400 flex-1">{data.operation?.doctorName || data.doctorName || ''}</span>
        </div>
        <div className="flex gap-2">
          <span className="font-semibold">Sign:</span>
          <span className="border-b border-slate-400 flex-1">{data.operation?.doctorSign || data.doctorSign || ''}</span>
        </div>
        <div className="flex gap-2">
          <span className="font-semibold">Date:</span>
          <span className="border-b border-slate-400 flex-1">{fmtDate(data.operation?.date || data.date) || ''}</span>
        </div>
      </div>
    </div>
  )

  const BloodForm = () => (
    <div className="border border-slate-300 rounded-lg p-4" style={{ direction: 'rtl', fontFamily: 'Jameel Noori Nastaleeq, Noto Nastaliq Urdu, serif' }}>
      <h3 className="text-center font-bold text-lg mb-4 border-b pb-2">اجازت نامہ برائے انتقال خون/مزید</h3>
      <div className="text-right space-y-2 text-sm leading-relaxed">
        <p>میں اس بات کی اجازت دیتا ہوں کہ میرے مریض کو علاج کے دوران خون یا خون کے کسی جزو کی ضرورت پیش آئے تو منتقل کیا جائے۔</p>
        <p>میں نے طبی عملے کو آگاہ کر دیا ہے کہ میرے مریض کو کسی قسم کی الرجی یا خون کے اجزاء سے کوئی رد عمل نہیں ہے۔</p>
        <p>میں یہ اعلان کرتا ہوں کہ اس دوران پیش آنے والی کسی بھی پیچیدگی کے لیے ہسپتال/ڈاکٹر ذمہ دار نہیں ہوں گے۔</p>
        <p>کیے جانے والے علاج کے لیے ہم نے ہسپتال کے عملے سے رضا مندی ظاہر کی ہے اور رضا مندی ہم پر لاگو ہوگی۔</p>
      </div>
      <div className="mt-4 grid grid-cols-4 gap-4 text-sm pt-4 border-t border-slate-300">
        <div className="flex gap-2">
          <span className="font-semibold whitespace-nowrap">والد/بستی/سرپرست:</span>
          <span className="border-b border-slate-400 flex-1">{data.bloodTransfusion?.guardianName || ''}</span>
        </div>
        <div className="flex gap-2">
          <span className="font-semibold">دستخط:</span>
          <span className="border-b border-slate-400 flex-1">{data.bloodTransfusion?.guardianSign || ''}</span>
        </div>
        <div className="flex gap-2">
          <span className="font-semibold">Date:</span>
          <span className="border-b border-slate-400 flex-1">{fmtDate(data.bloodTransfusion?.date) || ''}</span>
        </div>
        <div className="flex gap-2">
          <span className="font-semibold">Time:</span>
          <span className="border-b border-slate-400 flex-1">{fmt12(data.bloodTransfusion?.time || '')}</span>
        </div>
      </div>
      <div className="mt-2 grid grid-cols-3 gap-4 text-sm">
        <div className="flex gap-2">
          <span className="font-semibold whitespace-nowrap">Doctor Name:</span>
          <span className="border-b border-slate-400 flex-1">{data.bloodTransfusion?.doctorName || data.doctorName || ''}</span>
        </div>
        <div className="flex gap-2">
          <span className="font-semibold">Sign:</span>
          <span className="border-b border-slate-400 flex-1">{data.bloodTransfusion?.doctorSign || data.doctorSign || ''}</span>
        </div>
        <div className="flex gap-2">
          <span className="font-semibold">Date:</span>
          <span className="border-b border-slate-400 flex-1">{fmtDate(data.bloodTransfusion?.date || data.date) || ''}</span>
        </div>
      </div>
    </div>
  )

  if (printMode) {
    return (
      <div className="space-y-0">
        <div style={{ pageBreakAfter: 'always' }} className="pb-8">
          <HeaderAndPatientInfo settings={settings} defaults={defaults} data={data} />
          <AnesthesiaForm />
        </div>
        <div style={{ pageBreakAfter: 'always' }} className="pb-8">
          <HeaderAndPatientInfo settings={settings} defaults={defaults} data={data} />
          <OperationForm />
        </div>
        <div>
          <HeaderAndPatientInfo settings={settings} defaults={defaults} data={data} />
          <BloodForm />
          {/* Final Doctor Signature */}
          <div className="grid grid-cols-3 gap-4 text-sm pt-8">
            <div className="flex gap-2">
              <span className="font-semibold whitespace-nowrap">Doctor Name:</span>
              <span className="border-b border-slate-400 flex-1">{data.doctorName || ''}</span>
            </div>
            <div className="flex gap-2">
              <span className="font-semibold">Signature:</span>
              <span className="border-b border-slate-400 flex-1">{data.doctorSign || ''}</span>
            </div>
            <div className="flex gap-2">
              <span className="font-semibold">Date:</span>
              <span className="border-b border-slate-400 flex-1">{fmtDate(data.date) || ''}</span>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <HeaderAndPatientInfo settings={settings} defaults={defaults} data={data} />
      <AnesthesiaForm />
      <OperationForm />
      <BloodForm />

      {/* Final Doctor Signature (Screen only) */}
      <div className="grid grid-cols-3 gap-4 text-sm pt-4 border-t border-slate-300">
        <div className="flex gap-2">
          <span className="font-semibold whitespace-nowrap">Doctor Name:</span>
          <span className="border-b border-slate-400 flex-1">{data.doctorName || ''}</span>
        </div>
        <div className="flex gap-2">
          <span className="font-semibold">Signature:</span>
          <span className="border-b border-slate-400 flex-1">{data.doctorSign || ''}</span>
        </div>
        <div className="flex gap-2">
          <span className="font-semibold">Date:</span>
          <span className="border-b border-slate-400 flex-1">{fmtDate(data.date) || ''}</span>
        </div>
      </div>
    </div>
  )
}

function OperationConsentDialog({
  open,
  onClose,
  onSave,
  initial,
  defaults,
}: {
  open: boolean
  onClose: () => void
  onSave: (d: any) => void
  initial?: OperationConsentRecord | null
  defaults?: any
}) {
  const [form, setForm] = useState({
    mrNumber: initial?.mrNumber || defaults?.mrn || '',
    patientName: initial?.patientName || defaults?.patientName || '',
    date: initial?.date || new Date().toISOString().slice(0, 10),
    doctorName: initial?.doctorName || defaults?.doctorName || '',
    sign: initial?.doctorSign || '',
    anesthesiaGuardian: initial?.anesthesia?.guardianName || defaults?.fatherName || '',
    anesthesiaSign: initial?.anesthesia?.guardianSign || '',
    anesthesiaDate: initial?.anesthesia?.date || new Date().toISOString().slice(0, 10),
    anesthesiaTime: initial?.anesthesia?.time || new Date().toTimeString().slice(0, 5),
    anesthesiaDoctorName: initial?.anesthesia?.doctorName || defaults?.doctorName || '',
    anesthesiaDoctorSign: initial?.anesthesia?.doctorSign || '',
    operationGuardian: initial?.operation?.guardianName || defaults?.fatherName || '',
    operationSign: initial?.operation?.guardianSign || '',
    operationDate: initial?.operation?.date || new Date().toISOString().slice(0, 10),
    operationTime: initial?.operation?.time || new Date().toTimeString().slice(0, 5),
    operationDoctorName: initial?.operation?.doctorName || defaults?.doctorName || '',
    operationDoctorSign: initial?.operation?.doctorSign || '',
    bloodGuardian: initial?.bloodTransfusion?.guardianName || defaults?.fatherName || '',
    bloodSign: initial?.bloodTransfusion?.guardianSign || '',
    bloodDate: initial?.bloodTransfusion?.date || new Date().toISOString().slice(0, 10),
    bloodTime: initial?.bloodTransfusion?.time || new Date().toTimeString().slice(0, 5),
    bloodDoctorName: initial?.bloodTransfusion?.doctorName || defaults?.doctorName || '',
    bloodDoctorSign: initial?.bloodTransfusion?.doctorSign || '',
  })

  useEffect(() => {
    if (open && !initial) {
      setForm(prev => ({
        ...prev,
        mrNumber: defaults?.mrn || '',
        patientName: defaults?.patientName || '',
        doctorName: defaults?.doctorName || '',
        anesthesiaGuardian: defaults?.fatherName || '',
        operationGuardian: defaults?.fatherName || '',
        bloodGuardian: defaults?.fatherName || '',
      }))
    }
  }, [open, initial, defaults])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-xl bg-white p-6">
        <h3 className="mb-4 text-lg font-semibold">{initial ? 'Edit Operation Consent Forms' : 'Add Operation Consent Forms'}</h3>

        <div className="space-y-6">
          {/* Top Info */}
          <div className="border-b border-slate-200 pb-4">
            <h4 className="mb-3 text-sm font-semibold text-slate-700">Patient Information</h4>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">MR Number</label>
                <input
                  type="text"
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm bg-slate-50"
                  value={form.mrNumber}
                  readOnly
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Patient Name</label>
                <input
                  type="text"
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm bg-slate-50"
                  value={form.patientName}
                  readOnly
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Father/Guardian</label>
                <input
                  type="text"
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm bg-slate-50"
                  value={defaults?.fatherName || ''}
                  readOnly
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Phone</label>
                <input
                  type="text"
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm bg-slate-50"
                  value={defaults?.contact || ''}
                  readOnly
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Gender</label>
                <input
                  type="text"
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm bg-slate-50"
                  value={defaults?.gender || ''}
                  readOnly
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Admission No</label>
                <input
                  type="text"
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm bg-slate-50"
                  value={defaults?.encounter?.admissionNo || ''}
                  readOnly
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Bed Number</label>
                <input
                  type="text"
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm bg-slate-50"
                  value={defaults?.bedLabel || ''}
                  readOnly
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Admit Date/Time</label>
                <input
                  type="text"
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm bg-slate-50"
                  value={defaults?.doa || ''}
                  readOnly
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Form Date</label>
                <input
                  type="date"
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                  value={form.date}
                  onChange={(e) => setForm({ ...form, date: e.target.value })}
                />
              </div>
            </div>
          </div>

          {/* Anesthesia Consent Section */}
          <div className="border border-slate-200 rounded-lg p-4 bg-slate-50">
            <h4 className="mb-3 text-sm font-semibold text-slate-700">1. Anesthesia Consent (اجازت نامہ برائے بیہوشی)</h4>
            {/* Urdu Text Display */}
            <div className="mb-3 rounded border border-slate-200 bg-white p-3 text-right text-xs text-slate-700 leading-relaxed" style={{ direction: 'rtl', fontFamily: 'Jameel Noori Nastaleeq, Noto Nastaliq Urdu, serif' }}>
              <p>میں اس بات کی اجازت دیتا ہوں کہ میرے مریض کا آپریشن کیا جائے۔ بے ہوشی کا عمل کیا جائے اور ضرورت پڑنے پر انجیکشن اور دوائیاں دی جائیں۔</p>
              <p className="mt-1">آپریشن کے دوران کسی قسم کی ناخوشگوار صورتحال پیش آ سکتی ہے جو مریض کے لیے خطرناک ثابت ہو سکتی ہے ہسپتال اس صورتحال کے لیے ذمہ دار نہیں ہوگا۔</p>
              <p className="mt-1">میں یہ اعلان کرتا ہوں کہ میں نے بے ہوشی کے طریقہ کار کے بارے میں ڈاکٹر سے تمام ضروری معلومات حاصل کر لی ہیں۔</p>
            </div>
            {/* Guardian/Signature Row */}
            <div className="mb-3 grid grid-cols-4 gap-3 border-t border-slate-200 pt-3">
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-700">Guardian (والد/بستی/سرپرست)</label>
                <input
                  type="text"
                  className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-xs"
                  value={form.anesthesiaGuardian}
                  onChange={(e) => setForm({ ...form, anesthesiaGuardian: e.target.value })}
                  placeholder="نام"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-700">Sign (دستخط)</label>
                <input
                  type="text"
                  className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-xs"
                  value={form.anesthesiaSign}
                  onChange={(e) => setForm({ ...form, anesthesiaSign: e.target.value })}
                  placeholder="دستخط"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-700">Date</label>
                <input
                  type="date"
                  className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-xs"
                  value={form.anesthesiaDate}
                  onChange={(e) => setForm({ ...form, anesthesiaDate: e.target.value })}
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-700">Time</label>
                <input
                  type="time"
                  className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-xs"
                  value={form.anesthesiaTime}
                  onChange={(e) => setForm({ ...form, anesthesiaTime: e.target.value })}
                />
              </div>
            </div>
            {/* Doctor Row */}
            <div className="grid grid-cols-3 gap-3 border-t border-slate-200 pt-3">
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-700">Doctor Name</label>
                <input
                  type="text"
                  className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-xs"
                  value={form.anesthesiaDoctorName}
                  onChange={(e) => setForm({ ...form, anesthesiaDoctorName: e.target.value })}
                  placeholder="Anesthesiologist / Doctor"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-700">Doctor Sign</label>
                <input
                  type="text"
                  className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-xs"
                  value={form.anesthesiaDoctorSign}
                  onChange={(e) => setForm({ ...form, anesthesiaDoctorSign: e.target.value })}
                  placeholder="Sign"
                />
              </div>
            </div>
          </div>

          {/* Operation Consent Section */}
          <div className="border border-slate-200 rounded-lg p-4 bg-slate-50">
            <h4 className="mb-3 text-sm font-semibold text-slate-700">2. Operation Consent (اجازت نامہ برائے آپریشن)</h4>
            {/* Urdu Text Display */}
            <div className="mb-3 rounded border border-slate-200 bg-white p-3 text-right text-xs text-slate-700 leading-relaxed" style={{ direction: 'rtl', fontFamily: 'Jameel Noori Nastaleeq, Noto Nastaliq Urdu, serif' }}>
              <p>میں اس بات کی اجازت دیتا ہوں کہ میرے مریض کا آپریشن کیا جائے۔</p>
              <p className="mt-1">آپریشن کے دوران کسی قسم کی ناخوشگوار صورتحال پیش آسکتی ہے جیسے خون کا اخراج، علاج کی ناکامی، آلہ (Ventilator) کی ضرورت اور ایسی دیگر پیچیدگیاں جو مریض کے لیے خطرناک ثابت ہو سکتی ہیں۔</p>
              <p className="mt-1">میں یہ اعلان کرتا ہوں کہ ڈاکٹر نے تمام معلومات سے آگاہ کر دیا ہے۔</p>
            </div>
            {/* Guardian/Signature Row */}
            <div className="mb-3 grid grid-cols-4 gap-3 border-t border-slate-200 pt-3">
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-700">Guardian (والد/بستی/سرپرست)</label>
                <input
                  type="text"
                  className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-xs"
                  value={form.operationGuardian}
                  onChange={(e) => setForm({ ...form, operationGuardian: e.target.value })}
                  placeholder="نام"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-700">Sign (دستخط)</label>
                <input
                  type="text"
                  className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-xs"
                  value={form.operationSign}
                  onChange={(e) => setForm({ ...form, operationSign: e.target.value })}
                  placeholder="دستخط"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-700">Date</label>
                <input
                  type="date"
                  className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-xs"
                  value={form.operationDate}
                  onChange={(e) => setForm({ ...form, operationDate: e.target.value })}
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-700">Time</label>
                <input
                  type="time"
                  className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-xs"
                  value={form.operationTime}
                  onChange={(e) => setForm({ ...form, operationTime: e.target.value })}
                />
              </div>
            </div>
            {/* Doctor Row */}
            <div className="grid grid-cols-3 gap-3 border-t border-slate-200 pt-3">
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-700">Doctor Name</label>
                <input
                  type="text"
                  className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-xs"
                  value={form.operationDoctorName}
                  onChange={(e) => setForm({ ...form, operationDoctorName: e.target.value })}
                  placeholder="Surgeon / Doctor"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-700">Doctor Sign</label>
                <input
                  type="text"
                  className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-xs"
                  value={form.operationDoctorSign}
                  onChange={(e) => setForm({ ...form, operationDoctorSign: e.target.value })}
                  placeholder="Sign"
                />
              </div>
            </div>
          </div>

          {/* Blood Transfusion Consent Section */}
          <div className="border border-slate-200 rounded-lg p-4 bg-slate-50">
            <h4 className="mb-3 text-sm font-semibold text-slate-700">3. Blood Transfusion Consent (اجازت نامہ برائے انتقال خون)</h4>
            {/* Urdu Text Display */}
            <div className="mb-3 rounded border border-slate-200 bg-white p-3 text-right text-xs text-slate-700 leading-relaxed" style={{ direction: 'rtl', fontFamily: 'Jameel Noori Nastaleeq, Noto Nastaliq Urdu, serif' }}>
              <p>میں اس بات کی اجازت دیتا ہوں کہ میرے مریض کو علاج کے دوران خون یا خون کے کسی جزو کی ضرورت پیش آئے تو منتقل کیا جائے۔</p>
              <p className="mt-1">میں نے طبی عملے کو آگاہ کر دیا ہے کہ میرے مریض کو کسی قسم کی الرجی یا خون کے اجزاء سے کوئی رد عمل نہیں ہے۔</p>
              <p className="mt-1">میں یہ اعلان کرتا ہوں کہ اس دوران پیش آنے والی کسی بھی پیچیدگی کے لیے ہسپتال/ڈاکٹر ذمہ دار نہیں ہوں گے۔</p>
              <p className="mt-1">کیے جانے والے علاج کے لیے ہم نے ہسپتال کے عملے سے رضا مندی ظاہر کی ہے اور رضا مندی ہم پر لاگو ہوگی۔</p>
            </div>
            {/* Guardian/Signature Row */}
            <div className="mb-3 grid grid-cols-4 gap-3 border-t border-slate-200 pt-3">
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-700">Guardian (والد/بستی/سرپرست)</label>
                <input
                  type="text"
                  className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-xs"
                  value={form.bloodGuardian}
                  onChange={(e) => setForm({ ...form, bloodGuardian: e.target.value })}
                  placeholder="نام"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-700">Sign (دستخط)</label>
                <input
                  type="text"
                  className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-xs"
                  value={form.bloodSign}
                  onChange={(e) => setForm({ ...form, bloodSign: e.target.value })}
                  placeholder="دستخط"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-700">Date</label>
                <input
                  type="date"
                  className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-xs"
                  value={form.bloodDate}
                  onChange={(e) => setForm({ ...form, bloodDate: e.target.value })}
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-700">Time</label>
                <input
                  type="time"
                  className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-xs"
                  value={form.bloodTime}
                  onChange={(e) => setForm({ ...form, bloodTime: e.target.value })}
                />
              </div>
            </div>
            {/* Doctor Row */}
            <div className="grid grid-cols-3 gap-3 border-t border-slate-200 pt-3">
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-700">Doctor Name</label>
                <input
                  type="text"
                  className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-xs"
                  value={form.bloodDoctorName}
                  onChange={(e) => setForm({ ...form, bloodDoctorName: e.target.value })}
                  placeholder="Doctor"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-700">Doctor Sign</label>
                <input
                  type="text"
                  className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-xs"
                  value={form.bloodDoctorSign}
                  onChange={(e) => setForm({ ...form, bloodDoctorSign: e.target.value })}
                  placeholder="Sign"
                />
              </div>
            </div>
          </div>

          {/* Doctor Signature */}
          <div className="border-t border-slate-200 pt-4">
            <h4 className="mb-3 text-sm font-semibold text-slate-700">Doctor</h4>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Doctor Name</label>
                <input
                  type="text"
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                  value={form.doctorName}
                  onChange={(e) => setForm({ ...form, doctorName: e.target.value })}
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Signature</label>
                <input
                  type="text"
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                  value={form.sign}
                  onChange={(e) => setForm({ ...form, sign: e.target.value })}
                />
              </div>
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
