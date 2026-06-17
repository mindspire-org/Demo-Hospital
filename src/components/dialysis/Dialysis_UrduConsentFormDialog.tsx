import { useState, useEffect } from 'react'
import { X } from 'lucide-react'

type ConsentData = {
  name: string
  mrn: string
  patientName: string
  doctorName: string
  signature: string
  witnessName: string
  date: string
  patientPhone: string
  relativeSignature: string
  technicianSignature: string
  doctorSignature: string
}

type Props = {
  open: boolean
  onClose: () => void
  onSave: (data: ConsentData) => void
  initialData?: any
}

export default function Dialysis_UrduConsentFormDialog({ open, onClose, onSave, initialData }: Props) {
  const [formData, setFormData] = useState<ConsentData>({
    name: '',
    mrn: '',
    patientName: '',
    doctorName: '',
    signature: '',
    witnessName: '',
    date: '',
    patientPhone: '',
    relativeSignature: '',
    technicianSignature: '',
    doctorSignature: '',
  })

  useEffect(() => {
    if (initialData) {
      setFormData(prev => ({ ...prev, ...initialData }))
    }
  }, [initialData])

  const updateField = (field: keyof ConsentData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const handleSave = () => {
    onSave(formData)
  }

  const handlePrint = () => {
    window.print()
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 print:bg-white print:static print:p-0">
      <div 
        className="max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-2xl print:max-h-none print:overflow-visible print:shadow-none print:rounded-none"
        style={{ fontFamily: "'Al Qalam Taj Nastaleeq', 'Alvi Nastaleeq', 'Jameel Noori Nastaleeq', 'Noto Nastaliq Urdu', serif" }}
      >
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200 bg-white px-6 py-4 print:hidden">
          <h2 className="text-lg font-semibold text-slate-800">رضامندی کا فارم</h2>
          <button
            onClick={onClose}
            className="rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Form Content */}
        <div className="p-8 print:p-0">
          {/* Hospital Header */}
          <div className="mb-6 border-b-2 border-slate-800 pb-4 text-center">
            <div className="mb-2">
              <h2 className="text-xl font-bold text-slate-800">JINNAH MEDICAL & CARDIAC COMPLEX</h2>
              <p className="text-lg font-semibold text-slate-700">G.T ROAD, KHARIAN</p>
              <p className="text-sm text-slate-600">REG # R- 68185, TEL # 053-7600111, 0303-5311333</p>
            </div>
          </div>

          {/* Main Form */}
          <div className="border-2 border-slate-800">
            {/* Title */}
            <div className="border-b-2 border-slate-800 p-4 text-center" dir="rtl">
              <h3 className="text-xl font-bold">ہیموڈائیلسز کے لیے رضامندی</h3>
            </div>

            {/* Patient Name Field */}
            <div className="border-b-2 border-slate-800 p-4" dir="rtl">
              <div className="flex items-center gap-2">
                <span>میں</span>
                <input
                  type="text"
                  value={formData.patientName}
                  onChange={(e) => updateField('patientName', e.target.value)}
                  placeholder="(مریض کا نام)"
                  className="flex-1 border-b-2 border-slate-400 bg-transparent px-2 py-1 text-center outline-none print:border-b"
                />
                <span>یہاں</span>
              </div>
              <div className="mt-2 text-center">
                <span className="font-semibold">ہدایت کے تحت اجازت دیتا ہوں۔</span>
              </div>
            </div>

            {/* Section 1 */}
            <div className="border-b-2 border-slate-800 p-4" dir="rtl">
              <div className="flex items-start gap-2">
                <span className="font-bold">1</span>
                <div className="flex-1 leading-loose">
                  <p>
                    ہیموڈائیلیس کے طریقہ کار کی انجام دہی کے لیے ڈاکٹر
                    <input
                      type="text"
                      value={formData.doctorName}
                      onChange={(e) => updateField('doctorName', e.target.value)}
                      className="mx-2 w-48 border-b-2 border-slate-400 bg-transparent px-2 py-1 text-center outline-none print:border-b"
                    />
                    نے اس سرجیکل اور طبی طریقہ کار کی نوعیت کے بارے میں مکمل طور پر آگاہ کیا ہے (جس میں انٹیگرل آئی سی یو کی عدم دستیابی اور ضرورت پڑنے پر قریبی آئی سی یو میں منتقلی شامل ہے) اور اس سے وابستہ ممکنہ مسائل اور خطرات، جو میری زندگی کو بر قرار رکھنے اور میری حالت کے علاج کے لیے ضروری ہیں، جو کہ گردے فیل ہوتا ہے اور اس کے علاوہ اس عمل پر آنے والے ممکنہ اخراجات سے متعلق۔
                  </p>
                </div>
              </div>
            </div>

            {/* Section 2 */}
            <div className="border-b-2 border-slate-800 p-4" dir="rtl">
              <div className="flex items-start gap-2">
                <span className="font-bold">2</span>
                <p className="flex-1 leading-loose">
                  میں سمجھتا ہوں کہ زیادہ تر طبی علاج کی طرح، علاج کے متبادل طریقے بھی موجود ہیں، لیکن موجودہ حالات میں ہیموڈائیلیس سب سے زیادہ فائدہ مند ہو گا۔ یہ رضامندی با قائدہ اور بار بار ہیموڈائیلیس علاج کے لیے ہے اور میرے معالجین کی جانب سے میرے گردے کا فیل ہونا یا ہیموڈائیلیس کے طریقہ کار کی کسی بھی پیچیدگی کے لیے موزوں اور ضروری سمجھنے والی تمام اضافی خدمات کے لیے ہے۔
                </p>
              </div>
            </div>

            {/* Section 3 */}
            <div className="border-b-2 border-slate-800 p-4" dir="rtl">
              <div className="flex items-start gap-2">
                <span className="font-bold">3</span>
                <p className="flex-1 leading-loose">
                  میں سمجھتا ہوں کہ ہیموڈائیلیس علاج میں لوکل اینستھیزیا کا استعمال، مخصوص میڈل کا ڈالنا، دوائیوں اور ڈرپس کا استعمال شامل ہو سکتا ہے، جس میں خون کے اجزاء شامل ہیں۔ ایسے طریقہ کار کے نتیجے میں پیچیدگیاں شامل ہو سکتی ہیں جیسے خون کا نقصان، انفیکشن، خون یا دوائیوں کا رد عمل، دل کی خرابی اور اچانک موت وغیرہ۔
                </p>
              </div>
            </div>

            {/* Section 4 */}
            <div className="border-b-2 border-slate-800 p-4" dir="rtl">
              <div className="flex items-start gap-2">
                <span className="font-bold">4</span>
                <p className="flex-1 leading-loose">
                  تصدیق کرتا ہوں کہ میں نے تمام متعلقہ معلومات فراہم کی ہیں جو میں قانونی طور پر مریض کے بہترین مفاد میں فراہم کرنے کا پابند ہوں۔
                </p>
              </div>
            </div>

            {/* Section 5 - Doctor Info */}
            <div className="border-b-2 border-slate-800 p-4" dir="rtl">
              <div className="flex items-start gap-2">
                <span className="font-bold">5</span>
                <div className="flex-1">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="font-semibold">میں ڈاکٹر</label>
                      <input
                        type="text"
                        value={formData.doctorName}
                        onChange={(e) => updateField('doctorName', e.target.value)}
                        className="w-full border-b-2 border-slate-400 bg-transparent px-2 py-2 outline-none print:border-b"
                      />
                    </div>
                    <div>
                      <label className="font-semibold">عہدہ</label>
                      <input
                        type="text"
                        value={formData.doctorSignature}
                        onChange={(e) => updateField('doctorSignature', e.target.value)}
                        className="w-full border-b-2 border-slate-400 bg-transparent px-2 py-2 outline-none print:border-b"
                      />
                    </div>
                  </div>
                  <div className="mt-4">
                    <label className="font-semibold">تاریخ اور وقت</label>
                    <input
                      type="text"
                      value={formData.date}
                      onChange={(e) => updateField('date', e.target.value)}
                      className="w-full border-b-2 border-slate-400 bg-transparent px-2 py-2 outline-none print:border-b"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Section 6 - Patient Name */}
            <div className="border-b-2 border-slate-800 p-4" dir="rtl">
              <div className="flex items-center gap-2">
                <span className="font-bold">6.</span>
                <span className="font-semibold">مریض کا نام :</span>
                <input
                  type="text"
                  value={formData.patientName}
                  onChange={(e) => updateField('patientName', e.target.value)}
                  className="flex-1 border-b-2 border-slate-400 bg-transparent px-2 py-2 text-right outline-none print:border-b"
                />
              </div>
            </div>

            {/* Section 7 - Patient Signature */}
            <div className="border-b-2 border-slate-800 p-4" dir="rtl">
              <div className="flex items-center gap-2">
                <span className="font-bold">7.</span>
                <span className="font-semibold">مریض کے دستخط</span>
              </div>
              <div className="mt-2">
                <input
                  type="text"
                  value={formData.signature}
                  onChange={(e) => updateField('signature', e.target.value)}
                  className="w-full border-b-2 border-slate-400 bg-transparent px-2 py-12 text-center outline-none print:border-b"
                />
              </div>
            </div>

            {/* Section 8 - Guardian */}
            <div className="border-b-2 border-slate-800 p-4" dir="rtl">
              <div className="flex items-center gap-2">
                <span className="font-bold">8.</span>
                <span className="font-semibold">یا، والدین / قانونی سرپرست:</span>
              </div>
              <div className="mt-2">
                <input
                  type="text"
                  value={formData.relativeSignature}
                  onChange={(e) => updateField('relativeSignature', e.target.value)}
                  className="w-full border-b-2 border-slate-400 bg-transparent px-2 py-12 text-center outline-none print:border-b"
                />
              </div>
            </div>

            {/* Section 9 - Witness */}
            <div className="p-4" dir="rtl">
              <div className="flex items-center gap-2">
                <span className="font-bold">9.</span>
                <span className="font-semibold">گواہ، نام، دستخط</span>
              </div>
              <div className="mt-2">
                <input
                  type="text"
                  value={formData.witnessName}
                  onChange={(e) => updateField('witnessName', e.target.value)}
                  className="w-full border-b-2 border-slate-400 bg-transparent px-2 py-12 text-center outline-none print:border-b"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="sticky bottom-0 flex justify-end gap-3 border-t border-slate-200 bg-white px-6 py-4 print:hidden">
          <button
            onClick={onClose}
            className="rounded-md border border-slate-300 bg-white px-6 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            بند کریں
          </button>
          <button
            onClick={handlePrint}
            className="rounded-md border border-slate-300 bg-white px-6 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            پرنٹ کریں
          </button>
          <button
            onClick={handleSave}
            className="rounded-md bg-gradient-to-r from-teal-600 to-cyan-600 px-6 py-2 text-sm font-semibold text-white hover:from-teal-700 hover:to-cyan-700"
          >
            محفوظ کریں
          </button>
        </div>
      </div>

      {/* Font and Print Styles */}
      <style>{`
        @font-face {
          font-family: 'Al Qalam Taj Nastaleeq';
          src: url('/fonts/AlQalamTajNastaleeq.ttf') format('truetype'),
               local('Al Qalam Taj Nastaleeq'), 
               local('AlQalamTajNastaleeq');
          font-weight: normal;
          font-style: normal;
        }
        
        @font-face {
          font-family: 'Alvi Nastaleeq';
          src: local('Alvi Nastaleeq'), 
               local('AlviNastaleeqRegular');
          font-weight: normal;
          font-style: normal;
        }
        
        @font-face {
          font-family: 'Jameel Noori Nastaleeq';
          src: local('Jameel Noori Nastaleeq'), 
               local('JameelNooriNastaleeq');
          font-weight: normal;
          font-style: normal;
        }

        @import url('https://fonts.googleapis.com/css2?family=Noto+Nastaliq+Urdu:wght@400;500;600;700&display=swap');

        @media print {
          @page {
            size: A4;
            margin: 15mm;
          }
          
          body * {
            visibility: hidden;
          }
          
          .fixed,
          .fixed * {
            visibility: visible;
          }
          
          .fixed {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            background: white;
          }
          
          .print\\:hidden {
            display: none !important;
          }
          
          .print\\:border-b {
            border-bottom: 2px solid #94a3b8 !important;
          }
          
          .print\\:p-0 {
            padding: 0 !important;
          }
        }
      `}</style>
    </div>
  )
}
