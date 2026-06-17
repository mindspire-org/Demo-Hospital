import { useState, useEffect } from 'react'
import { X } from 'lucide-react'

type PrescriptionData = {
  name: string
  mrn: string
  frequency: string
  runDuration: string
  dialysisMachine: string
  dialyzer: string
  bloodFlowRate: string
  dialysateFlowRate: string
  dialysateTemp: string
  dialysateK: string
  dialysateCalcium: string
  dialysateSodium: string
  dialysateBicarbonate: string
  targetWeight: string
  ufGoal: string
  anticoagulation: string
  doctorSignature: string
}

type Props = {
  open: boolean
  onClose: () => void
  onSave: (data: PrescriptionData) => void
  initialData?: any
}

export default function Dialysis_HemodialysisPrescriptionDialog({ open, onClose, onSave, initialData }: Props) {
  const [formData, setFormData] = useState<PrescriptionData>({
    name: '',
    mrn: '',
    frequency: '',
    runDuration: '',
    dialysisMachine: '',
    dialyzer: '',
    bloodFlowRate: '',
    dialysateFlowRate: '',
    dialysateTemp: '',
    dialysateK: '',
    dialysateCalcium: '',
    dialysateSodium: '',
    dialysateBicarbonate: '',
    targetWeight: '',
    ufGoal: '',
    anticoagulation: '',
    doctorSignature: '',
  })

  useEffect(() => {
    if (initialData) {
      setFormData(prev => ({ ...prev, ...initialData }))
    }
  }, [initialData])

  const updateField = (field: keyof PrescriptionData, value: string) => {
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
      <div className="max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-2xl print:max-h-none print:overflow-visible print:shadow-none print:rounded-none">
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200 bg-white px-6 py-4 print:hidden">
          <h2 className="text-lg font-semibold text-slate-800">Hemodialysis Prescription</h2>
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

          {/* Patient Info */}
          <div className="mb-6 grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-bold">Patient Name:</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => updateField('name', e.target.value)}
                className="w-full border-b-2 border-slate-300 bg-transparent px-2 py-1 outline-none print:border-b"
              />
            </div>
            <div>
              <label className="text-sm font-bold">MR#:</label>
              <input
                type="text"
                value={formData.mrn}
                onChange={(e) => updateField('mrn', e.target.value)}
                className="w-full border-b-2 border-slate-300 bg-transparent px-2 py-1 outline-none print:border-b"
              />
            </div>
          </div>

          {/* Title */}
          <h3 className="mb-6 text-xl font-bold text-slate-800 underline">Hemodialysis prescription</h3>

          {/* Form Fields */}
          <div className="space-y-4">
            <div>
              <label className="text-base font-bold text-slate-800">Frequency: 3 times weekly/ 2 times weekly</label>
              <input
                type="text"
                value={formData.frequency}
                onChange={(e) => updateField('frequency', e.target.value)}
                placeholder="e.g., 3 times weekly"
                className="w-full border-b-2 border-slate-300 bg-transparent px-2 py-2 outline-none print:border-b"
              />
            </div>

            <div>
              <label className="text-base font-bold text-slate-800">Run duration (hours): 4/ 3.5/3/2.5</label>
              <input
                type="text"
                value={formData.runDuration}
                onChange={(e) => updateField('runDuration', e.target.value)}
                placeholder="e.g., 4 hours"
                className="w-full border-b-2 border-slate-300 bg-transparent px-2 py-2 outline-none print:border-b"
              />
            </div>

            <div>
              <label className="text-base font-bold text-slate-800">Dialysis machine: Fresenius 4008S</label>
              <input
                type="text"
                value={formData.dialysisMachine}
                onChange={(e) => updateField('dialysisMachine', e.target.value)}
                placeholder="e.g., Fresenius 4008S"
                className="w-full border-b-2 border-slate-300 bg-transparent px-2 py-2 outline-none print:border-b"
              />
            </div>

            <div>
              <label className="text-base font-bold text-slate-800">Dialyzer: 180/200</label>
              <input
                type="text"
                value={formData.dialyzer}
                onChange={(e) => updateField('dialyzer', e.target.value)}
                placeholder="e.g., 180"
                className="w-full border-b-2 border-slate-300 bg-transparent px-2 py-2 outline-none print:border-b"
              />
            </div>

            <div>
              <label className="text-base font-bold text-slate-800">Blood Flow Rate (ml/min): 200/250/300/400</label>
              <input
                type="text"
                value={formData.bloodFlowRate}
                onChange={(e) => updateField('bloodFlowRate', e.target.value)}
                placeholder="e.g., 300"
                className="w-full border-b-2 border-slate-300 bg-transparent px-2 py-2 outline-none print:border-b"
              />
            </div>

            <div>
              <label className="text-base font-bold text-slate-800">Dialysate Flow Rate (ml/min): 400/500/800</label>
              <input
                type="text"
                value={formData.dialysateFlowRate}
                onChange={(e) => updateField('dialysateFlowRate', e.target.value)}
                placeholder="e.g., 500"
                className="w-full border-b-2 border-slate-300 bg-transparent px-2 py-2 outline-none print:border-b"
              />
            </div>

            <div>
              <label className="text-base font-bold text-slate-800">Dialysate Temp (Celsius): 35/36/37</label>
              <input
                type="text"
                value={formData.dialysateTemp}
                onChange={(e) => updateField('dialysateTemp', e.target.value)}
                placeholder="e.g., 36"
                className="w-full border-b-2 border-slate-300 bg-transparent px-2 py-2 outline-none print:border-b"
              />
            </div>

            <div>
              <label className="text-base font-bold text-slate-800">Dialysate K: 2.0 mmol</label>
              <input
                type="text"
                value={formData.dialysateK}
                onChange={(e) => updateField('dialysateK', e.target.value)}
                placeholder="e.g., 2.0 mmol"
                className="w-full border-b-2 border-slate-300 bg-transparent px-2 py-2 outline-none print:border-b"
              />
            </div>

            <div>
              <label className="text-base font-bold text-slate-800">Dialysate Calcium: 1.25 mmol</label>
              <input
                type="text"
                value={formData.dialysateCalcium}
                onChange={(e) => updateField('dialysateCalcium', e.target.value)}
                placeholder="e.g., 1.25 mmol"
                className="w-full border-b-2 border-slate-300 bg-transparent px-2 py-2 outline-none print:border-b"
              />
            </div>

            <div>
              <label className="text-base font-bold text-slate-800">Dialysate Sodium: 130/135/138/140</label>
              <input
                type="text"
                value={formData.dialysateSodium}
                onChange={(e) => updateField('dialysateSodium', e.target.value)}
                placeholder="e.g., 138"
                className="w-full border-b-2 border-slate-300 bg-transparent px-2 py-2 outline-none print:border-b"
              />
            </div>

            <div>
              <label className="text-base font-bold text-slate-800">Dialysate Bicarbonate: 4/6/8</label>
              <input
                type="text"
                value={formData.dialysateBicarbonate}
                onChange={(e) => updateField('dialysateBicarbonate', e.target.value)}
                placeholder="e.g., 6"
                className="w-full border-b-2 border-slate-300 bg-transparent px-2 py-2 outline-none print:border-b"
              />
            </div>

            <div>
              <label className="text-base font-bold text-slate-800">Target Weight (kg):</label>
              <input
                type="text"
                value={formData.targetWeight}
                onChange={(e) => updateField('targetWeight', e.target.value)}
                placeholder="e.g., 65 kg"
                className="w-full border-b-2 border-slate-300 bg-transparent px-2 py-2 outline-none print:border-b"
              />
            </div>

            <div>
              <label className="text-base font-bold text-slate-800">UF goal (max 13ml/kg/hr):</label>
              <input
                type="text"
                value={formData.ufGoal}
                onChange={(e) => updateField('ufGoal', e.target.value)}
                placeholder="e.g., 2.5 L"
                className="w-full border-b-2 border-slate-300 bg-transparent px-2 py-2 outline-none print:border-b"
              />
            </div>

            <div>
              <label className="text-base font-bold text-slate-800">Anticoagulation (Heparin):</label>
              <input
                type="text"
                value={formData.anticoagulation}
                onChange={(e) => updateField('anticoagulation', e.target.value)}
                placeholder="e.g., 5000 units"
                className="w-full border-b-2 border-slate-300 bg-transparent px-2 py-2 outline-none print:border-b"
              />
            </div>
          </div>

          {/* Doctor Signature */}
          <div className="mt-12 flex justify-end">
            <div className="w-64">
              <div className="mb-2 text-right text-base font-bold text-slate-800">Doctor's Stamp and Signature</div>
              <div className="border-t-2 border-slate-800 pt-2">
                <input
                  type="text"
                  value={formData.doctorSignature}
                  onChange={(e) => updateField('doctorSignature', e.target.value)}
                  placeholder="Doctor's name"
                  className="w-full bg-transparent text-center outline-none"
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
            Cancel
          </button>
          <button
            onClick={handlePrint}
            className="rounded-md border border-slate-300 bg-white px-6 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            Print
          </button>
          <button
            onClick={handleSave}
            className="rounded-md bg-gradient-to-r from-teal-600 to-cyan-600 px-6 py-2 text-sm font-semibold text-white hover:from-teal-700 hover:to-cyan-700"
          >
            Save Form
          </button>
        </div>
      </div>

      {/* Print Styles */}
      <style>{`
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
            border-bottom: 1px solid #000 !important;
          }
          
          .print\\:p-0 {
            padding: 0 !important;
          }
        }
      `}</style>
    </div>
  )
}
