import { useState } from 'react'

type Props = {
  open: boolean
  onClose: () => void
  patientName?: string
  patientMRN?: string
}

export default function Dialysis_ConsentForm({ open, onClose, patientName, patientMRN }: Props) {
  const [isPrinting, setIsPrinting] = useState(false)
  const [formData, setFormData] = useState({
    patientName: patientName || '',
    ageSex: '',
    idNumber: patientMRN || '',
    mobile: '',
    doctorName: '',
    signThumb: '',
    date: '',
    nameRelation: '',
    cnic: '',
    technicianSign: ''
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
        style={{ fontFamily: "'Times New Roman', serif" }}
      >
        {/* Header */}
        <div className="mb-6 text-center">
          <div className="mb-2 flex justify-center">
            <svg viewBox="0 0 120 40" className="h-12 w-auto">
              <path d="M60 5 L65 15 L75 15 L67 22 L70 32 L60 25 L50 32 L53 22 L45 15 L55 15 Z" fill="none" stroke="#1e40af" strokeWidth="1"/>
            </svg>
          </div>
          <h1 className="text-xl font-bold text-slate-900">JINNAH MEDICAL & CARDIAC COMPLEX</h1>
          <p className="text-sm text-slate-700">Main GT. Road Kharian</p>
        </div>

        {/* Title */}
        <div className="mb-6 text-center">
          <h2 className="text-lg font-bold text-slate-900">Consent Form For Dialysis</h2>
        </div>

        {/* Patient Info */}
        <div className="mb-6 space-y-3">
          <div className="flex items-center gap-2">
            <span className="text-sm whitespace-nowrap">Patient's Name:</span>
            <input
              type="text"
              value={formData.patientName}
              onChange={(e) => updateField('patientName', e.target.value)}
              className="flex-1 border-b border-slate-400 px-2 py-1 text-sm print:border-b"
            />
            <span className="text-sm whitespace-nowrap ml-4">Age/Sex:</span>
            <input
              type="text"
              value={formData.ageSex}
              onChange={(e) => updateField('ageSex', e.target.value)}
              className="w-32 border-b border-slate-400 px-2 py-1 text-sm print:border-b"
            />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm whitespace-nowrap">ID Number:</span>
            <input
              type="text"
              value={formData.idNumber}
              onChange={(e) => updateField('idNumber', e.target.value)}
              className="flex-1 border-b border-slate-400 px-2 py-1 text-sm print:border-b"
            />
            <span className="text-sm whitespace-nowrap ml-4">Mob:</span>
            <input
              type="text"
              value={formData.mobile}
              onChange={(e) => updateField('mobile', e.target.value)}
              className="w-48 border-b border-slate-400 px-2 py-1 text-sm print:border-b"
            />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm whitespace-nowrap">Doctor Name:</span>
            <input
              type="text"
              value={formData.doctorName}
              onChange={(e) => updateField('doctorName', e.target.value)}
              className="flex-1 border-b border-slate-400 px-2 py-1 text-sm print:border-b"
            />
          </div>
        </div>

        {/* Urdu Consent Text */}
        <div className="mb-6 border border-slate-800 p-4" dir="rtl">
          <p className="text-right leading-loose text-base" style={{ fontFamily: "'Al Qalam Taj Nastaleeq', 'Jameel Noori Nastaleeq', serif" }}>
            میں ہمارے مریض
            <input
              type="text"
              value={formData.patientName}
              onChange={(e) => updateField('patientName', e.target.value)}
              className="w-40 border-b border-slate-400 px-1 mx-1 text-right print:border-b inline-block"
            />
            کی سنجیدہ حالت اور ڈائیلسز کی اہمیت کے بارے میں بتا دیا گیا ہے۔ ڈائیلسز کے عمل اور اس کے دوران ہونے والی پیچیدگیوں کے بارے میں بھی آگاہ کر دیا گیا ہے اس عمل کے دوران ہونے والے کسی بھی قسم کے نقصان کا ذمہ دار ہسپتال یا اس کا عملہ نہیں ہو گا اور نہ ہی ہم کسی قسم کی قانونی کارروائی کرنے کے مجاز ہوں گے ہم اپنے مریض کے ڈائیلسز کی اجازت دیتے ہیں۔
          </p>
        </div>

        {/* Signature Section */}
        <div className="mb-6 grid grid-cols-2 gap-6">
          <div className="flex items-center gap-2">
            <span className="text-sm whitespace-nowrap">Sign/Thumb:</span>
            <input
              type="text"
              value={formData.signThumb}
              onChange={(e) => updateField('signThumb', e.target.value)}
              className="flex-1 border-b border-slate-400 px-2 py-1 text-sm print:border-b"
            />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm whitespace-nowrap">Date:</span>
            <input
              type="text"
              value={formData.date}
              onChange={(e) => updateField('date', e.target.value)}
              className="flex-1 border-b border-slate-400 px-2 py-1 text-sm print:border-b"
            />
          </div>
        </div>

        <div className="mb-6 grid grid-cols-2 gap-6">
          <div className="flex items-center gap-2">
            <span className="text-sm whitespace-nowrap">Name & Relation:</span>
            <input
              type="text"
              value={formData.nameRelation}
              onChange={(e) => updateField('nameRelation', e.target.value)}
              className="flex-1 border-b border-slate-400 px-2 py-1 text-sm print:border-b"
            />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm whitespace-nowrap">CNIC:</span>
            <input
              type="text"
              value={formData.cnic}
              onChange={(e) => updateField('cnic', e.target.value)}
              className="flex-1 border-b border-slate-400 px-2 py-1 text-sm print:border-b"
            />
          </div>
        </div>

        <div className="mb-6 flex items-center gap-2">
          <span className="text-sm whitespace-nowrap">Technician Sign:</span>
          <input
            type="text"
            value={formData.technicianSign}
            onChange={(e) => updateField('technicianSign', e.target.value)}
            className="flex-1 border-b border-slate-400 px-2 py-1 text-sm print:border-b"
          />
        </div>

        {/* Action Buttons */}
        <div className="mt-6 flex justify-center gap-3 print:hidden">
          <button
            onClick={handlePrint}
            disabled={isPrinting}
            className="rounded-md bg-teal-600 px-6 py-2 text-sm font-semibold text-white hover:bg-teal-700 disabled:opacity-50"
          >
            {isPrinting ? 'Printing...' : 'Print'}
          </button>
          <button
            onClick={onClose}
            className="rounded-md border border-slate-300 bg-white px-6 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            Close
          </button>
        </div>
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
          font-family: 'Jameel Noori Nastaleeq';
          src: local('Jameel Noori Nastaleeq'), 
               local('JameelNooriNastaleeq');
          font-weight: normal;
          font-style: normal;
        }

        #dialysis-consent-form {
          line-height: 1.6;
        }

        #dialysis-consent-form input {
          outline: none;
          background: transparent;
        }

        #dialysis-consent-form input:focus {
          background-color: #f8fafc;
        }

        @media print {
          @page {
            size: A4;
            margin: 15mm;
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
  )
}
