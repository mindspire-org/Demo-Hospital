import { useState, useEffect } from 'react'
import { X } from 'lucide-react'

type TreatmentRecordData = {
  name: string
  mrn: string
  patientName: string
  uniqueId: string
  relation: string
  month: string
  year: string
  contact: string
  cnic: string
  gender: string
  // Technical data for 8 dialysis sessions (D1-D8)
  sessions: Array<{
    date: string
    timeStarted: string
    timeCompleted: string
    typeOfDialyzers: string
    noOfUse: string
    bloodFlowRate: string
    dialysateFlowRate: string
    venousPressure: string
    heparinLoadingDose: string
    heparinInfusion: string
    bloodPressurePreHD: string
    bloodPressurePostHD: string
    weightDry: string
    weightPreHD: string
    weightPostHD: string
    idwg: string
    epo: string
    medicationIron: string
    medicationCalcitriol: string
    medicationIVIV: string
    targetUF: string
    dataEntryPerson: string
  }>
}

type Props = {
  open: boolean
  onClose: () => void
  onSave: (data: TreatmentRecordData) => void
  initialData?: any
}

export default function Dialysis_TreatmentRecordDialog({ open, onClose, onSave, initialData }: Props) {
  const [formData, setFormData] = useState<TreatmentRecordData>({
    name: '',
    mrn: '',
    patientName: '',
    uniqueId: '',
    relation: '',
    month: '',
    year: '',
    contact: '',
    cnic: '',
    gender: '',
    sessions: Array(8).fill(null).map(() => ({
      date: '',
      timeStarted: '',
      timeCompleted: '',
      typeOfDialyzers: '',
      noOfUse: '',
      bloodFlowRate: '',
      dialysateFlowRate: '',
      venousPressure: '',
      heparinLoadingDose: '',
      heparinInfusion: '',
      bloodPressurePreHD: '',
      bloodPressurePostHD: '',
      weightDry: '',
      weightPreHD: '',
      weightPostHD: '',
      idwg: '',
      epo: '',
      medicationIron: '',
      medicationCalcitriol: '',
      medicationIVIV: '',
      targetUF: '',
      dataEntryPerson: '',
    }))
  })

  useEffect(() => {
    if (initialData) {
      setFormData(prev => ({ ...prev, ...initialData }))
    }
  }, [initialData])

  const updateField = (field: keyof TreatmentRecordData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const updateSession = (index: number, field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      sessions: prev.sessions.map((session, i) => 
        i === index ? { ...session, [field]: value } : session
      )
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
      <div className="max-h-[90vh] w-full max-w-[95vw] overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-2xl print:max-h-none print:overflow-visible print:shadow-none print:rounded-none">
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200 bg-white px-6 py-4 print:hidden">
          <h2 className="text-lg font-semibold text-slate-800">Dialysis Treatment Record</h2>
          <button
            onClick={onClose}
            className="rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Form Content */}
        <div className="p-6 print:p-0">
          {/* Hospital Header */}
          <div className="mb-4 border-b-2 border-slate-800 pb-4 text-center">
            <h2 className="text-xl font-bold text-slate-800">JINNAH MEDICAL & CARDIAC COMPLEX</h2>
            <p className="text-lg font-semibold text-slate-700">G.T ROAD, KHARIAN</p>
            <p className="text-sm text-slate-600">REG # R- 68185, TEL # 053-7600111, 0303-5311333</p>
          </div>

          {/* Title */}
          <div className="mb-4 border border-slate-800 bg-slate-100 p-2 text-center">
            <h3 className="text-lg font-bold">DIALYSIS TREATMENT RECORD</h3>
          </div>

          {/* Part I - Patient's Personal Record */}
          <div className="mb-4 border border-slate-800">
            <div className="grid grid-cols-3 border-b border-slate-800 bg-slate-800 text-white">
              <div className="border-r border-slate-800 p-2 font-bold">PART-I</div>
              <div className="border-r border-slate-800 p-2 font-bold">PATIENT'S PERSONAL RECORD</div>
              <div className="p-2 font-bold">Unique ID #:</div>
            </div>
            
            <div className="grid grid-cols-2 border-b border-slate-800">
              <div className="border-r border-slate-800 p-2">
                <span className="font-semibold">Patient Name:</span>
                <input type="text" value={formData.patientName} onChange={(e) => updateField('patientName', e.target.value)} className="w-full border-b border-slate-300 bg-transparent px-2 outline-none" />
              </div>
              <div className="p-2">
                <span className="font-semibold">S/O, D/O, W/O:</span>
                <input type="text" value={formData.relation} onChange={(e) => updateField('relation', e.target.value)} className="w-full border-b border-slate-300 bg-transparent px-2 outline-none" />
              </div>
            </div>

            <div className="grid grid-cols-3 border-b border-slate-800">
              <div className="border-r border-slate-800 p-2">
                <span className="font-semibold">MONTH:</span>
                <input type="text" value={formData.month} onChange={(e) => updateField('month', e.target.value)} className="w-full border-b border-slate-300 bg-transparent px-2 outline-none" />
              </div>
              <div className="border-r border-slate-800 p-2">
                <span className="font-semibold">YEAR:</span>
                <input type="text" value={formData.year} onChange={(e) => updateField('year', e.target.value)} className="w-full border-b border-slate-300 bg-transparent px-2 outline-none" />
              </div>
              <div className="p-2">
                <span className="font-semibold">Contact#:</span>
                <input type="text" value={formData.contact} onChange={(e) => updateField('contact', e.target.value)} className="w-full border-b border-slate-300 bg-transparent px-2 outline-none" />
              </div>
            </div>

            <div className="grid grid-cols-2">
              <div className="border-r border-slate-800 p-2">
                <span className="font-semibold">CNIC#:</span>
                <input type="text" value={formData.cnic} onChange={(e) => updateField('cnic', e.target.value)} className="w-full border-b border-slate-300 bg-transparent px-2 outline-none" />
              </div>
              <div className="p-2">
                <span className="font-semibold">Gender (M/F):</span>
                <input type="text" value={formData.gender} onChange={(e) => updateField('gender', e.target.value)} className="w-full border-b border-slate-300 bg-transparent px-2 outline-none" />
              </div>
            </div>
          </div>

          {/* Part II - Technical Data Table */}
          <div className="overflow-x-auto">
            <table className="w-full border-collapse border border-slate-800 text-xs">
              <thead>
                <tr className="bg-slate-800 text-white">
                  <th className="border border-slate-800 p-2" colSpan={2}>PART-II: TECHNICAL DATA</th>
                  {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
                    <th key={i} className="border border-slate-800 p-2">D{i}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {/* Date */}
                <tr>
                  <td className="border border-slate-800 bg-slate-100 p-2 font-semibold" colSpan={2}>Date:</td>
                  {formData.sessions.map((session, i) => (
                    <td key={i} className="border border-slate-800 p-1">
                      <input type="date" value={session.date} onChange={(e) => updateSession(i, 'date', e.target.value)} className="w-full bg-transparent text-xs outline-none" />
                    </td>
                  ))}
                </tr>

                {/* Time Started */}
                <tr>
                  <td className="border border-slate-800 bg-slate-100 p-2 font-semibold" colSpan={2}>Time Started:</td>
                  {formData.sessions.map((session, i) => (
                    <td key={i} className="border border-slate-800 p-1">
                      <input type="time" value={session.timeStarted} onChange={(e) => updateSession(i, 'timeStarted', e.target.value)} className="w-full bg-transparent text-xs outline-none" />
                    </td>
                  ))}
                </tr>

                {/* Time Completed */}
                <tr>
                  <td className="border border-slate-800 bg-slate-100 p-2 font-semibold" colSpan={2}>Time Completed:</td>
                  {formData.sessions.map((session, i) => (
                    <td key={i} className="border border-slate-800 p-1">
                      <input type="time" value={session.timeCompleted} onChange={(e) => updateSession(i, 'timeCompleted', e.target.value)} className="w-full bg-transparent text-xs outline-none" />
                    </td>
                  ))}
                </tr>

                {/* Type of dialyzers */}
                <tr>
                  <td className="border border-slate-800 bg-slate-100 p-2 font-semibold" colSpan={2}>Type of dialyzers</td>
                  {formData.sessions.map((session, i) => (
                    <td key={i} className="border border-slate-800 p-1">
                      <input type="text" value={session.typeOfDialyzers} onChange={(e) => updateSession(i, 'typeOfDialyzers', e.target.value)} className="w-full bg-transparent text-xs outline-none" />
                    </td>
                  ))}
                </tr>

                {/* No of Use */}
                <tr>
                  <td className="border border-slate-800 bg-slate-100 p-2 font-semibold" colSpan={2}>No of Use</td>
                  {formData.sessions.map((session, i) => (
                    <td key={i} className="border border-slate-800 p-1">
                      <input type="text" value={session.noOfUse} onChange={(e) => updateSession(i, 'noOfUse', e.target.value)} className="w-full bg-transparent text-xs outline-none" />
                    </td>
                  ))}
                </tr>

                {/* Blood Flow Rate */}
                <tr>
                  <td className="border border-slate-800 bg-slate-100 p-2 font-semibold" colSpan={2}>Blood Flow Rate</td>
                  {formData.sessions.map((session, i) => (
                    <td key={i} className="border border-slate-800 p-1">
                      <input type="text" value={session.bloodFlowRate} onChange={(e) => updateSession(i, 'bloodFlowRate', e.target.value)} className="w-full bg-transparent text-xs outline-none" />
                    </td>
                  ))}
                </tr>

                {/* Dialysate Flow Rate */}
                <tr>
                  <td className="border border-slate-800 bg-slate-100 p-2 font-semibold" colSpan={2}>Dialysate Flow Rate</td>
                  {formData.sessions.map((session, i) => (
                    <td key={i} className="border border-slate-800 p-1">
                      <input type="text" value={session.dialysateFlowRate} onChange={(e) => updateSession(i, 'dialysateFlowRate', e.target.value)} className="w-full bg-transparent text-xs outline-none" />
                    </td>
                  ))}
                </tr>

                {/* Venous Pressure */}
                <tr>
                  <td className="border border-slate-800 bg-slate-100 p-2 font-semibold" colSpan={2}>Venous Pressure</td>
                  {formData.sessions.map((session, i) => (
                    <td key={i} className="border border-slate-800 p-1">
                      <input type="text" value={session.venousPressure} onChange={(e) => updateSession(i, 'venousPressure', e.target.value)} className="w-full bg-transparent text-xs outline-none" />
                    </td>
                  ))}
                </tr>

                {/* Heparin - Loading Dose */}
                <tr>
                  <td className="border border-slate-800 bg-slate-100 p-2 font-semibold" rowSpan={2}>Heparin</td>
                  <td className="border border-slate-800 bg-slate-50 p-2">Loading Dose</td>
                  {formData.sessions.map((session, i) => (
                    <td key={i} className="border border-slate-800 p-1">
                      <input type="text" value={session.heparinLoadingDose} onChange={(e) => updateSession(i, 'heparinLoadingDose', e.target.value)} className="w-full bg-transparent text-xs outline-none" />
                    </td>
                  ))}
                </tr>

                {/* Heparin - Infusion */}
                <tr>
                  <td className="border border-slate-800 bg-slate-50 p-2">Infusion</td>
                  {formData.sessions.map((session, i) => (
                    <td key={i} className="border border-slate-800 p-1">
                      <input type="text" value={session.heparinInfusion} onChange={(e) => updateSession(i, 'heparinInfusion', e.target.value)} className="w-full bg-transparent text-xs outline-none" />
                    </td>
                  ))}
                </tr>

                {/* Blood Pressure - Pre HD */}
                <tr>
                  <td className="border border-slate-800 bg-slate-100 p-2 font-semibold" rowSpan={2}>Blood Pressure</td>
                  <td className="border border-slate-800 bg-slate-50 p-2">Pre HD</td>
                  {formData.sessions.map((session, i) => (
                    <td key={i} className="border border-slate-800 p-1">
                      <input type="text" value={session.bloodPressurePreHD} onChange={(e) => updateSession(i, 'bloodPressurePreHD', e.target.value)} className="w-full bg-transparent text-xs outline-none" />
                    </td>
                  ))}
                </tr>

                {/* Blood Pressure - Post HD */}
                <tr>
                  <td className="border border-slate-800 bg-slate-50 p-2">Post HD</td>
                  {formData.sessions.map((session, i) => (
                    <td key={i} className="border border-slate-800 p-1">
                      <input type="text" value={session.bloodPressurePostHD} onChange={(e) => updateSession(i, 'bloodPressurePostHD', e.target.value)} className="w-full bg-transparent text-xs outline-none" />
                    </td>
                  ))}
                </tr>

                {/* Weight - Dry */}
                <tr>
                  <td className="border border-slate-800 bg-slate-100 p-2 font-semibold" rowSpan={4}>Weight (kg)</td>
                  <td className="border border-slate-800 bg-slate-50 p-2">Dry</td>
                  {formData.sessions.map((session, i) => (
                    <td key={i} className="border border-slate-800 p-1">
                      <input type="text" value={session.weightDry} onChange={(e) => updateSession(i, 'weightDry', e.target.value)} className="w-full bg-transparent text-xs outline-none" />
                    </td>
                  ))}
                </tr>

                {/* Weight - Pre HD */}
                <tr>
                  <td className="border border-slate-800 bg-slate-50 p-2">Pre HD</td>
                  {formData.sessions.map((session, i) => (
                    <td key={i} className="border border-slate-800 p-1">
                      <input type="text" value={session.weightPreHD} onChange={(e) => updateSession(i, 'weightPreHD', e.target.value)} className="w-full bg-transparent text-xs outline-none" />
                    </td>
                  ))}
                </tr>

                {/* Weight - Post HD */}
                <tr>
                  <td className="border border-slate-800 bg-slate-50 p-2">Post HD</td>
                  {formData.sessions.map((session, i) => (
                    <td key={i} className="border border-slate-800 p-1">
                      <input type="text" value={session.weightPostHD} onChange={(e) => updateSession(i, 'weightPostHD', e.target.value)} className="w-full bg-transparent text-xs outline-none" />
                    </td>
                  ))}
                </tr>

                {/* IDWG */}
                <tr>
                  <td className="border border-slate-800 bg-slate-50 p-2">IDWG *</td>
                  {formData.sessions.map((session, i) => (
                    <td key={i} className="border border-slate-800 p-1">
                      <input type="text" value={session.idwg} onChange={(e) => updateSession(i, 'idwg', e.target.value)} className="w-full bg-transparent text-xs outline-none" />
                    </td>
                  ))}
                </tr>

                {/* EPO */}
                <tr>
                  <td className="border border-slate-800 bg-slate-100 p-2 font-semibold" rowSpan={4}>Medication(s) served</td>
                  <td className="border border-slate-800 bg-slate-50 p-2">EPO**</td>
                  {formData.sessions.map((session, i) => (
                    <td key={i} className="border border-slate-800 p-1">
                      <input type="text" value={session.epo} onChange={(e) => updateSession(i, 'epo', e.target.value)} className="w-full bg-transparent text-xs outline-none" />
                    </td>
                  ))}
                </tr>

                {/* Iron */}
                <tr>
                  <td className="border border-slate-800 bg-slate-50 p-2">Iron</td>
                  {formData.sessions.map((session, i) => (
                    <td key={i} className="border border-slate-800 p-1">
                      <input type="text" value={session.medicationIron} onChange={(e) => updateSession(i, 'medicationIron', e.target.value)} className="w-full bg-transparent text-xs outline-none" />
                    </td>
                  ))}
                </tr>

                {/* Calcitriol */}
                <tr>
                  <td className="border border-slate-800 bg-slate-50 p-2">Calcitriol</td>
                  {formData.sessions.map((session, i) => (
                    <td key={i} className="border border-slate-800 p-1">
                      <input type="text" value={session.medicationCalcitriol} onChange={(e) => updateSession(i, 'medicationCalcitriol', e.target.value)} className="w-full bg-transparent text-xs outline-none" />
                    </td>
                  ))}
                </tr>

                {/* IV/IV */}
                <tr>
                  <td className="border border-slate-800 bg-slate-50 p-2">IV/IV</td>
                  {formData.sessions.map((session, i) => (
                    <td key={i} className="border border-slate-800 p-1">
                      <input type="text" value={session.medicationIVIV} onChange={(e) => updateSession(i, 'medicationIVIV', e.target.value)} className="w-full bg-transparent text-xs outline-none" />
                    </td>
                  ))}
                </tr>

                {/* Target UF */}
                <tr>
                  <td className="border border-slate-800 bg-slate-100 p-2 font-semibold" colSpan={2}>Target UF</td>
                  {formData.sessions.map((session, i) => (
                    <td key={i} className="border border-slate-800 p-1">
                      <input type="text" value={session.targetUF} onChange={(e) => updateSession(i, 'targetUF', e.target.value)} className="w-full bg-transparent text-xs outline-none" />
                    </td>
                  ))}
                </tr>

                {/* Data Entry Person */}
                <tr>
                  <td className="border border-slate-800 bg-slate-100 p-2 font-semibold" colSpan={2}>Name, Designation, sign of person authorized for Data entry</td>
                  {formData.sessions.map((session, i) => (
                    <td key={i} className="border border-slate-800 p-1">
                      <input type="text" value={session.dataEntryPerson} onChange={(e) => updateSession(i, 'dataEntryPerson', e.target.value)} className="w-full bg-transparent text-xs outline-none" />
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>

          {/* Footer Note */}
          <div className="mt-2 text-xs text-slate-600">
            <p>*IDWG: Inter-Dialytic Weight Gain. ** EPO: Erythropoietin. @ D1 to D8 denote dialysis numbers.</p>
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
            size: A4 landscape;
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
          
          .print\\:p-0 {
            padding: 0 !important;
          }
        }
      `}</style>
    </div>
  )
}
