import { useState, useEffect } from 'react'
import { X } from 'lucide-react'

type BlankFormData = {
  mrn: string
  patientName: string
  content: string
}

type Props = {
  open: boolean
  onClose: () => void
  onSave: (data: BlankFormData) => void
  initialData?: any
}

export default function Dialysis_BlankFormDialog({ open, onClose, onSave, initialData }: Props) {
  const [formData, setFormData] = useState<BlankFormData>({
    mrn: '',
    patientName: '',
    content: '',
  })

  useEffect(() => {
    if (initialData) {
      setFormData(prev => ({ ...prev, ...initialData }))
    }
  }, [initialData])

  const updateField = (field: keyof BlankFormData, value: string) => {
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
    <div className="fixed inset-0 z-50 flex flex-col bg-white print:static">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-200 bg-white px-6 py-4 print:hidden">
        <h2 className="text-lg font-semibold text-slate-800">Blank Form</h2>
        <div className="flex items-center gap-3">
          <button
            onClick={handlePrint}
            className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            Print
          </button>
          <button
            onClick={handleSave}
            className="rounded-md bg-linear-to-r from-teal-600 to-cyan-600 px-4 py-2 text-sm font-semibold text-white hover:from-teal-700 hover:to-cyan-700"
          >
            Save Form
          </button>
          <button
            onClick={onClose}
            className="rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Form Content - Full Page */}
      <div className="flex-1 overflow-y-auto bg-slate-50 p-8 print:p-4 print:bg-white">
        <div className="mx-auto max-w-[210mm] bg-white p-8 shadow-lg print:shadow-none">
          {/* Hospital Header */}
          <div className="mb-6 flex items-center gap-4 border-b-2 border-slate-800 pb-4">
            <div className="flex h-20 w-20 items-center justify-center rounded-full border-4 border-slate-800">
              <div className="text-center">
                <div className="text-2xl font-bold text-slate-800">JMCC</div>
              </div>
            </div>
            <div className="flex-1 text-center">
              <h2 className="text-xl font-bold text-slate-800">JINNAH MEDICAL & CARDIAC COMPLEX</h2>
              <p className="text-lg font-semibold text-slate-700 underline">G.T ROAD, KHARIAN</p>
              <p className="text-sm text-slate-600 underline">REG # R-68185, TEL # 053-7600111, 0303-5311333</p>
            </div>
          </div>

          {/* Patient Info (Optional) */}
          <div className="mb-6 grid grid-cols-2 gap-4 print:hidden">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">MR# (Optional)</label>
              <input
                type="text"
                value={formData.mrn}
                onChange={(e) => updateField('mrn', e.target.value)}
                className="w-full border border-slate-300 rounded-md px-3 py-2 outline-none focus:border-teal-500"
                placeholder="Enter MR#"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">Patient Name (Optional)</label>
              <input
                type="text"
                value={formData.patientName}
                onChange={(e) => updateField('patientName', e.target.value)}
                className="w-full border border-slate-300 rounded-md px-3 py-2 outline-none focus:border-teal-500"
                placeholder="Enter patient name"
              />
            </div>
          </div>

          {/* Print View - Show patient info if filled */}
          <div className="hidden print:block mb-4">
            {formData.mrn && (
              <div className="mb-2">
                <span className="font-semibold">MR#:</span> {formData.mrn}
              </div>
            )}
            {formData.patientName && (
              <div className="mb-2">
                <span className="font-semibold">Patient Name:</span> {formData.patientName}
              </div>
            )}
          </div>

          {/* Blank Content Area */}
          <div className="min-h-[700px] border border-slate-300 rounded-md p-4 print:border-0">
            <textarea
              value={formData.content}
              onChange={(e) => updateField('content', e.target.value)}
              className="h-full min-h-[680px] w-full resize-none bg-transparent outline-none print:hidden"
              placeholder="Type your notes here..."
            />
            {/* Print View - Content */}
            <div className="hidden print:block whitespace-pre-wrap">
              {formData.content}
            </div>
          </div>
        </div>
      </div>

      {/* Print Styles */}
      <style>{`
        @media print {
          @page {
            size: A4 portrait;
            margin: 10mm;
          }
          
          .print\\:hidden {
            display: none !important;
          }
          
          .print\\:block {
            display: block !important;
          }
          
          .print\\:bg-white {
            background: white !important;
          }
          
          .print\\:shadow-none {
            box-shadow: none !important;
          }
          
          .print\\:border-0 {
            border: 0 !important;
          }
        }
      `}</style>
    </div>
  )
}

