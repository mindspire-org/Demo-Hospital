import { useState } from 'react'

type Props = {
  open: boolean
  onClose: () => void
  patientName?: string
  patientMRN?: string
}

export default function Dialysis_UrduConsentForm({ open, onClose, patientName, patientMRN }: Props) {
  const [isPrinting, setIsPrinting] = useState(false)
  const [formData, setFormData] = useState({
    dateTime: '',
    patientName: patientName || '',
    doctorName: '',
    signature: '',
    name: '',
    dateTime2: '',
    patientPhone: '',
    relativeSignature: '',
    technicianSignature: '',
    doctorSignature: ''
  })

  if (!open) return null

  const handlePrint = () => {
    setIsPrinting(true)
    setTimeout(() => {
      window.print()
      setIsPrinting(false)
    }, 100)
  }

  const updateField = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 print:bg-white print:static print:p-0">
      <div 
        id="dialysis-consent-form" 
        className="max-h-[90vh] w-full max-w-[210mm] overflow-y-auto rounded-lg bg-white p-6 shadow-2xl print:max-h-none print:overflow-visible print:shadow-none print:rounded-none print:p-0"
        style={{ fontFamily: "'Al Qalam Taj Nastaleeq', 'Jameel Noori Nastaleeq', 'Noto Nastaliq Urdu', serif" }}
      >
        {/* Header with Logo */}
        <div className="mb-4 flex items-start gap-4">
          <div className="h-20 w-20 flex-shrink-0">
            <svg viewBox="0 0 100 100" className="h-full w-full">
              <circle cx="50" cy="50" r="45" fill="none" stroke="#1e40af" strokeWidth="2"/>
              <path d="M50 15 L50 85 M35 35 L50 20 L65 35" fill="none" stroke="#1e40af" strokeWidth="2"/>
              <circle cx="50" cy="55" r="12" fill="none" stroke="#dc2626" strokeWidth="2"/>
              <path d="M35 70 Q50 85 65 70" fill="none" stroke="#1e40af" strokeWidth="2"/>
              <text x="50" y="95" textAnchor="middle" fontSize="8" fill="#1e40af">JMCC</text>
            </svg>
          </div>
          <div className="flex-1 text-center">
            <h1 className="text-xl font-bold text-slate-900">JINNAH MEDICAL & CARDIAC COMPLEX</h1>
            <p className="text-base text-slate-700">G.T ROAD, KHARIAN</p>
            <p className="text-xs text-slate-600">REG # R- 68185, TEL # 053-7600111, 0303-5311333</p>
          </div>
        </div>

        <hr className="border-t border-slate-800 mb-4" />

        {/* Date and Time Field */}
        <div className="mb-4 flex items-center justify-end gap-2" dir="rtl">
          <span className="text-sm">:تاریخ اور وقت</span>
          <input
            type="text"
            value={formData.dateTime}
            onChange={(e) => updateField('dateTime', e.target.value)}
            className="w-48 border-b border-slate-400 px-2 py-1 text-right print:border-b"
          />
        </div>

        {/* Title */}
        <div className="border border-slate-800 p-2 mb-4 text-center" dir="rtl">
          <h2 className="text-lg font-bold">ہیمو ڈائیلسز کے لیے رضامندی</h2>
        </div>

        {/* Section 1 */}
        <div className="border border-slate-800 mb-3" dir="rtl">
          <div className="p-3 text-right leading-relaxed text-sm">
            <div className="flex items-start gap-1">
              <span className="font-bold">1.</span>
              <div className="flex-1">
                <span>میں یہاں </span>
                <input
                  type="text"
                  value={formData.patientName}
                  onChange={(e) => updateField('patientName', e.target.value)}
                  className="w-48 border-b border-slate-400 px-1 text-right print:border-b"
                  placeholder="(مریض کا نام)"
                />
                <span> ہیموڈائلیس کے طریقہ کار کی انجام دہی کے لیے ڈاکٹر</span>
              </div>
            </div>
            <div className="mt-2 flex items-center gap-1">
              <input
                type="text"
                value={formData.doctorName}
                onChange={(e) => updateField('doctorName', e.target.value)}
                className="w-48 border-b border-slate-400 px-1 text-right print:border-b"
              />
              <span> نے اس سرجیکل اور طبی طریقہ کار کی نوعیت کے بارے میں مکمل طور پر آگاہ کیا ہے (جس میں انٹیگریل آئی سی یو کی عدم دستیابی اور ضرورت پڑنے پر قریبی آئی سی یو میں منتقلی شامل ہے) اور اس سے وابستہ ممکنہ مسائل اور خطرات، جو میری زندگی کو برقرار رکھنے اور میری حالت کے علاج کے لیے ضروری ہیں، جو کہ گردے فیل ہوتا ہے اور اس کے علاوہ اس عمل پر آنے والے ممکنہ اخراجات سے متعلق۔</span>
            </div>
          </div>
        </div>

        {/* Section 2 */}
        <div className="border border-slate-800 mb-3" dir="rtl">
          <div className="p-3 text-right leading-relaxed text-sm">
            <div className="flex items-start gap-1">
              <span className="font-bold">2.</span>
              <div className="flex-1">
                میں سمجھتا ہوں کہ زیادہ تر طبی علاج کی طرح، علاج کے متبادل طریقے بھی موجود ہیں، لیکن موجودہ حالات میں ہیموڈائلیس سب سے زیادہ فائدہ مند ہو گا۔ یہ رضامندی با قائدہ اور بار بار ہیموڈائلیس علاج کے لیے ہے اور میرے معالجین کی جانب سے میرے گردے کا فیل ہونا یا ہیموڈائلیس کے طریقہ کار کی کسی بھی پیچیدگی کے لیے موزوں اور ضروری سمجھنے والی تمام اضافی خدمات کے لیے ہے۔
              </div>
            </div>
          </div>
        </div>

        {/* Section 3 */}
        <div className="border border-slate-800 mb-3" dir="rtl">
          <div className="p-3 text-right leading-relaxed text-sm">
            <div className="flex items-start gap-1">
              <span className="font-bold">3.</span>
              <div className="flex-1">
                میں سمجھتا ہوں کہ ہیموڈائلیس علاج میں لوکل اینستھیزیا کا استعمال، مخصوص میڈل کا ڈالنا، دوائیوں اور ڈر چپس کا استعمال شامل ہو سکتا ہے، جس میں خون کے اجزاء شامل ہو سکتے ہیں، جیسے خون کا نقصان، انفیکشن، خون یا دوائیوں کا رد عمل، دل کی خرابی اور اچانک موت وغیرہ۔
              </div>
            </div>
          </div>
        </div>

        {/* Section 4 */}
        <div className="border border-slate-800 mb-3" dir="rtl">
          <div className="p-3 text-right leading-relaxed text-sm">
            <div className="flex items-start gap-1">
              <span className="font-bold">4.</span>
              <div className="flex-1">
                میں ڈاکٹر
                <input
                  type="text"
                  value={formData.doctorName}
                  onChange={(e) => updateField('doctorName', e.target.value)}
                  className="w-32 border-b border-slate-400 px-1 text-right print:border-b mx-1"
                />
                کو اجازت دیتا ہوں کہ میرے لیے ضروری اور موزوں سمجھنے والے طریقہ کار کے مطابق مجھے ہیموڈائلیس فراہم کریں۔
              </div>
            </div>
          </div>
        </div>

        {/* Section 5 */}
        <div className="border border-slate-800 mb-3" dir="rtl">
          <div className="p-3 text-right leading-relaxed text-sm">
            <div className="flex items-start gap-1">
              <span className="font-bold">5.</span>
              <div className="flex-1">
                <span>میں ڈاکٹر</span>
                <input
                  type="text"
                  value={formData.doctorName}
                  onChange={(e) => updateField('doctorName', e.target.value)}
                  className="w-32 border-b border-slate-400 px-1 text-right print:border-b mx-1"
                />
                <span>تصدیق کرتا ہوں کہ میں نے تمام متعلقہ معلومات فراہم کی ہیں جو میں قانونی طور پر مریض کے بہترین مفاد میں فراہم کرنے کا پابند ہوں۔</span>
              </div>
            </div>
          </div>
        </div>

        {/* Signature Row */}
        <div className="border border-slate-800 mb-3" dir="rtl">
          <div className="p-3">
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center">
                <input
                  type="text"
                  value={formData.signature}
                  onChange={(e) => updateField('signature', e.target.value)}
                  className="w-full border-b border-slate-400 py-2 text-center print:border-b"
                />
                <p className="text-sm font-bold mt-1">دستخط</p>
              </div>
              <div className="text-center">
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => updateField('name', e.target.value)}
                  className="w-full border-b border-slate-400 py-2 text-center print:border-b"
                />
                <p className="text-sm font-bold mt-1">عہدہ</p>
              </div>
              <div className="text-center">
                <input
                  type="text"
                  value={formData.dateTime2}
                  onChange={(e) => updateField('dateTime2', e.target.value)}
                  className="w-full border-b border-slate-400 py-2 text-center print:border-b"
                />
                <p className="text-sm font-bold mt-1">تاریخ اور وقت</p>
              </div>
            </div>
          </div>
        </div>

        {/* Section 6 */}
        <div className="border border-slate-800 mb-3" dir="rtl">
          <div className="p-3 text-right">
            <div className="flex items-start gap-1">
              <span className="font-bold">6.</span>
              <span className="font-bold">مریض کا نام:</span>
            </div>
            <input
              type="text"
              value={formData.patientPhone}
              onChange={(e) => updateField('patientPhone', e.target.value)}
              className="w-full border-b border-slate-400 py-2 text-right print:border-b mt-1"
            />
          </div>
        </div>

        {/* Section 7 */}
        <div className="border border-slate-800 mb-3" dir="rtl">
          <div className="p-3 text-right">
            <div className="flex items-start gap-1">
              <span className="font-bold">7.</span>
              <span className="font-bold">مریض کے رشتہ دار:</span>
            </div>
            <input
              type="text"
              value={formData.relativeSignature}
              onChange={(e) => updateField('relativeSignature', e.target.value)}
              className="w-full border-b border-slate-400 py-2 text-right print:border-b mt-1"
            />
          </div>
        </div>

        {/* Section 8 */}
        <div className="border border-slate-800 mb-3" dir="rtl">
          <div className="p-3 text-right">
            <div className="flex items-start gap-1">
              <span className="font-bold">8.</span>
              <span className="font-bold">بابا/والدین / قانونی سرپرست:</span>
            </div>
            <input
              type="text"
              value={formData.technicianSignature}
              onChange={(e) => updateField('technicianSignature', e.target.value)}
              className="w-full border-b border-slate-400 py-2 text-right print:border-b mt-1"
            />
          </div>
        </div>

        {/* Section 9 */}
        <div className="border border-slate-800 mb-4" dir="rtl">
          <div className="p-3 text-right">
            <div className="flex items-start gap-1">
              <span className="font-bold">9.</span>
              <span className="font-bold">گواہ/نیم وار دستخط:</span>
            </div>
            <input
              type="text"
              value={formData.doctorSignature}
              onChange={(e) => updateField('doctorSignature', e.target.value)}
              className="w-full border-b border-slate-400 py-2 text-right print:border-b mt-1"
            />
          </div>
        </div>

        {/* Action Buttons */}
        <div className="mt-4 flex justify-center gap-3 print:hidden">
          <button
            onClick={handlePrint}
            disabled={isPrinting}
            className="rounded-md bg-teal-600 px-6 py-2 text-sm font-semibold text-white hover:bg-teal-700 disabled:opacity-50"
          >
            {isPrinting ? 'پرنٹ ہو رہا ہے...' : 'پرنٹ کریں'}
          </button>
          <button
            onClick={onClose}
            className="rounded-md border border-slate-300 bg-white px-6 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            بند کریں
          </button>
        </div>

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

        #dialysis-consent-form {
          line-height: 1.8;
        }

        #dialysis-consent-form input {
          font-family: 'Al Qalam Taj Nastaleeq', 'Jameel Noori Nastaleeq', 'Noto Nastaliq Urdu', serif;
          outline: none;
          background: transparent;
        }

        #dialysis-consent-form input:focus {
          background-color: #f8fafc;
        }

        @media print {
          @page {
            size: A4;
            margin: 10mm;
          }
          
          body * {
            visibility: hidden;
          }
          
          #dialysis-consent-form,
          #dialysis-consent-form * {
            visibility: visible;
          }
          
          #dialysis-consent-form {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            padding: 0;
            margin: 0;
            max-width: none;
            max-height: none;
          }
          
          #dialysis-consent-form input {
            border: none !important;
            background: transparent !important;
            border-bottom: 1px solid #94a3b8 !important;
          }
          
          .print\\:hidden {
            display: none !important;
          }
          
          .print\\:border-b {
            border-bottom: 1px solid #94a3b8 !important;
          }
        }
      `}</style>
      </div>
    </div>
  )
}
