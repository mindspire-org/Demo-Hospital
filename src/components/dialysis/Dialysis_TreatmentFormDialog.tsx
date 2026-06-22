import { useState, useEffect } from 'react'
import { X } from 'lucide-react'

type FormData = {
  name: string
  relation: string
  age: string
  gender: string
  mrn: string
  bloodGroup: string
  hbsAgStatus: string
  antiHcvStatus: string
  hivStatus: string
  cnic: string
  weight: string
  address: string
  dateOfFirstVisit: string
  time: string
  amPm: 'AM' | 'PM'
  diagnosis: string
  comorbidity: string
  consultantSignature: string
}

type Props = {
  open: boolean
  onClose: () => void
  onSave: (data: FormData) => void
  initialData?: any
}

export default function Dialysis_TreatmentFormDialog({ open, onClose, onSave, initialData }: Props) {
  const [formData, setFormData] = useState<FormData>({
    name: '',
    relation: '',
    age: '',
    gender: '',
    mrn: '',
    bloodGroup: '',
    hbsAgStatus: '',
    antiHcvStatus: '',
    hivStatus: '',
    cnic: '',
    weight: '',
    address: '',
    dateOfFirstVisit: '',
    time: '',
    amPm: 'AM',
    diagnosis: '',
    comorbidity: '',
    consultantSignature: '',
  })

  useEffect(() => {
    if (initialData) {
      setFormData(prev => ({ ...prev, ...initialData }))
    }
  }, [initialData])

  const updateField = (field: keyof FormData, value: string) => {
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
      <div className="max-h-[90vh] w-full max-w-5xl overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-2xl print:max-h-none print:overflow-visible print:shadow-none print:rounded-none">
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200 bg-white px-6 py-4 print:hidden">
          <h2 className="text-lg font-semibold text-slate-800">Dialysis Unit File</h2>
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
            <h3 className="mt-4 text-lg font-bold text-slate-800">DIALYSIS UNIT FILE</h3>
          </div>

          {/* Form Fields */}
          <div className="space-y-4">
            {/* Row 1: Name and Relation */}
            <div className="grid grid-cols-2 gap-4">
              <div className="border border-slate-300 p-3">
                <label className="mb-1 block text-sm font-bold text-slate-700">NAME</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => updateField('name', e.target.value)}
                  className="w-full border-b border-slate-300 bg-transparent px-2 py-1 text-slate-800 outline-none focus:border-teal-500 print:border-0"
                />
              </div>
              <div className="border border-slate-300 p-3">
                <label className="mb-1 block text-sm font-bold text-slate-700">S/O,D/O,W/O</label>
                <input
                  type="text"
                  value={formData.relation}
                  onChange={(e) => updateField('relation', e.target.value)}
                  className="w-full border-b border-slate-300 bg-transparent px-2 py-1 text-slate-800 outline-none focus:border-teal-500 print:border-0"
                />
              </div>
            </div>

            {/* Row 2: Age/Gender and MR# */}
            <div className="grid grid-cols-2 gap-4">
              <div className="border border-slate-300 p-3">
                <label className="mb-1 block text-sm font-bold text-slate-700">AGE/GENDER</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Age"
                    value={formData.age}
                    onChange={(e) => updateField('age', e.target.value)}
                    className="w-1/2 border-b border-slate-300 bg-transparent px-2 py-1 text-slate-800 outline-none focus:border-teal-500 print:border-0"
                  />
                  <select
                    value={formData.gender}
                    onChange={(e) => updateField('gender', e.target.value)}
                    className="w-1/2 border-b border-slate-300 bg-transparent px-2 py-1 text-slate-800 outline-none focus:border-teal-500 print:border-0"
                  >
                    <option value="">Select</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                  </select>
                </div>
              </div>
              <div className="border border-slate-300 p-3">
                <label className="mb-1 block text-sm font-bold text-slate-700">MR#</label>
                <input
                  type="text"
                  value={formData.mrn}
                  onChange={(e) => updateField('mrn', e.target.value)}
                  className="w-full border-b border-slate-300 bg-transparent px-2 py-1 text-slate-800 outline-none focus:border-teal-500 print:border-0"
                />
              </div>
            </div>

            {/* Row 3: Blood Group and HbsAg Status */}
            <div className="grid grid-cols-2 gap-4">
              <div className="border border-slate-300 p-3">
                <label className="mb-1 block text-sm font-bold text-slate-700">BLOOD GROUP</label>
                <input
                  type="text"
                  value={formData.bloodGroup}
                  onChange={(e) => updateField('bloodGroup', e.target.value)}
                  className="w-full border-b border-slate-300 bg-transparent px-2 py-1 text-slate-800 outline-none focus:border-teal-500 print:border-0"
                />
              </div>
              <div className="border border-slate-300 p-3">
                <label className="mb-1 block text-sm font-bold text-slate-700">HbsAg STATUS</label>
                <input
                  type="text"
                  value={formData.hbsAgStatus}
                  onChange={(e) => updateField('hbsAgStatus', e.target.value)}
                  className="w-full border-b border-slate-300 bg-transparent px-2 py-1 text-slate-800 outline-none focus:border-teal-500 print:border-0"
                />
              </div>
            </div>

            {/* Row 4: Anti-HCV and HIV Status */}
            <div className="grid grid-cols-2 gap-4">
              <div className="border border-slate-300 p-3">
                <label className="mb-1 block text-sm font-bold text-slate-700">Anti-HCV STATUS</label>
                <input
                  type="text"
                  value={formData.antiHcvStatus}
                  onChange={(e) => updateField('antiHcvStatus', e.target.value)}
                  className="w-full border-b border-slate-300 bg-transparent px-2 py-1 text-slate-800 outline-none focus:border-teal-500 print:border-0"
                />
              </div>
              <div className="border border-slate-300 p-3">
                <label className="mb-1 block text-sm font-bold text-slate-700">HIV STATUS</label>
                <input
                  type="text"
                  value={formData.hivStatus}
                  onChange={(e) => updateField('hivStatus', e.target.value)}
                  className="w-full border-b border-slate-300 bg-transparent px-2 py-1 text-slate-800 outline-none focus:border-teal-500 print:border-0"
                />
              </div>
            </div>

            {/* CNIC */}
            <div className="border border-slate-300 p-3">
              <label className="mb-1 block text-sm font-bold text-slate-700">CNIC</label>
              <input
                type="text"
                value={formData.cnic}
                onChange={(e) => updateField('cnic', e.target.value)}
                placeholder="00000-0000000-0"
                className="w-full border-b border-slate-300 bg-transparent px-2 py-1 text-slate-800 outline-none focus:border-teal-500 print:border-0"
              />
            </div>

            {/* Weight */}
            <div className="border border-slate-300 p-3">
              <label className="mb-1 block text-sm font-bold text-slate-700">Weight Of Patient:</label>
              <input
                type="text"
                value={formData.weight}
                onChange={(e) => updateField('weight', e.target.value)}
                placeholder="kg"
                className="w-full border-b border-slate-300 bg-transparent px-2 py-1 text-slate-800 outline-none focus:border-teal-500 print:border-0"
              />
            </div>

            {/* Address */}
            <div className="border border-slate-300 p-3">
              <label className="mb-1 block text-sm font-bold text-slate-700">ADDRESS</label>
              <textarea
                value={formData.address}
                onChange={(e) => updateField('address', e.target.value)}
                rows={2}
                className="w-full border-b border-slate-300 bg-transparent px-2 py-1 text-slate-800 outline-none focus:border-teal-500 resize-none print:border-0"
              />
            </div>

            {/* Date and Time */}
            <div className="grid grid-cols-2 gap-4">
              <div className="border border-slate-300 p-3">
                <label className="mb-1 block text-sm font-bold text-slate-700">Date Of First Visit</label>
                <input
                  type="date"
                  value={formData.dateOfFirstVisit}
                  onChange={(e) => updateField('dateOfFirstVisit', e.target.value)}
                  className="w-full border-b border-slate-300 bg-transparent px-2 py-1 text-slate-800 outline-none focus:border-teal-500 print:border-0"
                />
              </div>
              <div className="border border-slate-300 p-3">
                <label className="mb-1 block text-sm font-bold text-slate-700">Time: Am/Pm</label>
                <div className="flex gap-2">
                  <input
                    type="time"
                    value={formData.time}
                    onChange={(e) => updateField('time', e.target.value)}
                    className="flex-1 border-b border-slate-300 bg-transparent px-2 py-1 text-slate-800 outline-none focus:border-teal-500 print:border-0"
                  />
                  <select
                    value={formData.amPm}
                    onChange={(e) => updateField('amPm', e.target.value as 'AM' | 'PM')}
                    className="w-20 border-b border-slate-300 bg-transparent px-2 py-1 text-slate-800 outline-none focus:border-teal-500 print:border-0"
                  >
                    <option value="AM">AM</option>
                    <option value="PM">PM</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Diagnosis */}
            <div className="border border-slate-300 p-3">
              <label className="mb-1 block text-sm font-bold text-slate-700">Diagnosis</label>
              <textarea
                value={formData.diagnosis}
                onChange={(e) => updateField('diagnosis', e.target.value)}
                rows={3}
                className="w-full border-b border-slate-300 bg-transparent px-2 py-1 text-slate-800 outline-none focus:border-teal-500 resize-none print:border-0"
              />
            </div>

            {/* Comorbidity */}
            <div className="border border-slate-300 p-3">
              <label className="mb-1 block text-sm font-bold text-slate-700">Comorbidity</label>
              <textarea
                value={formData.comorbidity}
                onChange={(e) => updateField('comorbidity', e.target.value)}
                rows={3}
                className="w-full border-b border-slate-300 bg-transparent px-2 py-1 text-slate-800 outline-none focus:border-teal-500 resize-none print:border-0"
              />
            </div>

            {/* Consultant Signature */}
            <div className="border border-slate-300 p-3">
              <label className="mb-1 block text-sm font-bold text-slate-700">Consultant Name With Signature</label>
              <input
                type="text"
                value={formData.consultantSignature}
                onChange={(e) => updateField('consultantSignature', e.target.value)}
                className="w-full border-b border-slate-300 bg-transparent px-2 py-1 text-slate-800 outline-none focus:border-teal-500 print:border-0"
              />
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
            className="rounded-md bg-linear-to-r from-teal-600 to-cyan-600 px-6 py-2 text-sm font-semibold text-white hover:from-teal-700 hover:to-cyan-700"
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
          
          .print\\:border-0 {
            border: none !important;
          }
          
          .print\\:p-0 {
            padding: 0 !important;
          }
        }
      `}</style>
    </div>
  )
}
