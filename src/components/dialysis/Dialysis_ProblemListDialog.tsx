import { useState, useEffect } from 'react'
import { X } from 'lucide-react'

type ProblemListData = {
  mrn: string
  patientName: string
  ageGender: string
  problems: Array<{
    problem: string
    management: string
    dateTime: string
    stampSignature: string
  }>
}

type Props = {
  open: boolean
  onClose: () => void
  onSave: (data: ProblemListData) => void
  initialData?: any
}

export default function Dialysis_ProblemListDialog({ open, onClose, onSave, initialData }: Props) {
  const [formData, setFormData] = useState<ProblemListData>({
    mrn: '',
    patientName: '',
    ageGender: '',
    problems: Array(5).fill(null).map(() => ({
      problem: '',
      management: '',
      dateTime: '',
      stampSignature: '',
    }))
  })

  useEffect(() => {
    if (initialData) {
      setFormData(prev => ({ ...prev, ...initialData }))
    }
  }, [initialData])

  const updateField = (field: keyof ProblemListData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const updateProblem = (index: number, field: keyof ProblemListData['problems'][0], value: string) => {
    setFormData(prev => ({
      ...prev,
      problems: prev.problems.map((problem, i) =>
        i === index ? { ...problem, [field]: value } : problem
      ),
    }))
  }

  const addProblemRow = () => {
    setFormData(prev => ({
      ...prev,
      problems: [...prev.problems, { problem: '', management: '', dateTime: '', stampSignature: '' }]
    }))
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
          <h2 className="text-lg font-semibold text-slate-800">Problem List of Patient</h2>
          <button
            onClick={onClose}
            className="rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Form Content */}
        <div className="p-6 print:p-4">
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
              <p className="text-sm text-slate-600">REG # R-68185, TEL # 053-7600111, 0303-5311333</p>
            </div>
          </div>

          {/* Unit Header */}
          <div className="mb-4 border border-slate-800">
            <div className="border-b border-slate-800 bg-slate-100 p-3 text-center">
              <h3 className="text-lg font-bold text-slate-800">DIALYSIS UNIT</h3>
            </div>
            
            {/* MRN */}
            <div className="border-b border-slate-800 p-3">
              <span className="font-semibold">MR#</span>
              <input
                type="text"
                value={formData.mrn}
                onChange={(e) => updateField('mrn', e.target.value)}
                className="ml-2 w-full border-b border-slate-300 bg-transparent px-2 outline-none"
              />
            </div>

            {/* Patient Info */}
            <div className="grid grid-cols-2">
              <div className="border-r border-slate-800 p-3">
                <span className="font-semibold">PATIENT NAME</span>
                <input
                  type="text"
                  value={formData.patientName}
                  onChange={(e) => updateField('patientName', e.target.value)}
                  className="ml-2 w-full border-b border-slate-300 bg-transparent px-2 outline-none"
                />
              </div>
              <div className="p-3">
                <span className="font-semibold">AGE/GENDER</span>
                <input
                  type="text"
                  value={formData.ageGender}
                  onChange={(e) => updateField('ageGender', e.target.value)}
                  className="ml-2 w-full border-b border-slate-300 bg-transparent px-2 outline-none"
                />
              </div>
            </div>
          </div>

          {/* Problem List Table */}
          <div className="border border-slate-800">
            <div className="border-b border-slate-800 bg-slate-100 p-3 text-center">
              <h3 className="text-lg font-bold text-slate-800">Problem List of Patient</h3>
            </div>

            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-red-600 text-white">
                  <th className="border border-slate-800 p-3 text-left font-bold">Problems</th>
                  <th className="border border-slate-800 p-3 text-left font-bold">Management</th>
                  <th className="border border-slate-800 p-3 text-left font-bold">Date/Time</th>
                  <th className="border border-slate-800 p-3 text-left font-bold">Stamp & Signature of Doctor</th>
                </tr>
              </thead>
              <tbody>
                {formData.problems.map((problem, idx) => (
                  <tr key={idx} className="h-24">
                    <td className="border border-slate-800 p-2">
                      <textarea
                        value={problem.problem}
                        onChange={(e) => updateProblem(idx, 'problem', e.target.value)}
                        className="h-full w-full resize-none bg-transparent outline-none"
                        rows={3}
                      />
                    </td>
                    <td className="border border-slate-800 p-2">
                      <textarea
                        value={problem.management}
                        onChange={(e) => updateProblem(idx, 'management', e.target.value)}
                        className="h-full w-full resize-none bg-transparent outline-none"
                        rows={3}
                      />
                    </td>
                    <td className="border border-slate-800 p-2">
                      <input
                        type="datetime-local"
                        value={problem.dateTime}
                        onChange={(e) => updateProblem(idx, 'dateTime', e.target.value)}
                        className="w-full bg-transparent text-sm outline-none"
                      />
                    </td>
                    <td className="border border-slate-800 p-2">
                      <textarea
                        value={problem.stampSignature}
                        onChange={(e) => updateProblem(idx, 'stampSignature', e.target.value)}
                        className="h-full w-full resize-none bg-transparent outline-none"
                        rows={3}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Add Row Button */}
            <div className="border-t border-slate-800 p-2 print:hidden">
              <button
                onClick={addProblemRow}
                className="text-sm text-teal-600 hover:text-teal-700 font-semibold"
              >
                + Add More Rows
              </button>
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
            size: A4 portrait;
            margin: 10mm;
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
        }
      `}</style>
    </div>
  )
}
