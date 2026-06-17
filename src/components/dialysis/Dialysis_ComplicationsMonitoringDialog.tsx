import { useState, useEffect } from 'react'
import { X } from 'lucide-react'

type ComplicationsData = {
  patientName: string
  ageGender: string
  mrn: string
  // Section 1: Intra-dialytic Complications (8 symptoms x 8 days)
  intraDialytic: Array<{
    symptom: string
    observationRecord: string
    observations: string[]
  }>
  // Section 2: Vascular Access Complications (8 items x 8 days)
  vascularAccess: Array<{
    item: string
    observationRecord: string
    observations: string[]
  }>
  // Section 3: Catheters (4 items x 8 days)
  catheters: Array<{
    item: string
    observationRecord: string
    observations: string[]
  }>
}

type Props = {
  open: boolean
  onClose: () => void
  onSave: (data: ComplicationsData) => void
  initialData?: any
}

export default function Dialysis_ComplicationsMonitoringDialog({ open, onClose, onSave, initialData }: Props) {
  const [formData, setFormData] = useState<ComplicationsData>({
    patientName: '',
    ageGender: '',
    mrn: '',
    intraDialytic: [
      { symptom: '1. First Use Syndrome including chest pain, anxiety, shortness of breath, and back pain.', observationRecord: '', observations: Array(8).fill('') },
      { symptom: '2. Nausea, vomiting, and headache', observationRecord: '', observations: Array(8).fill('') },
      { symptom: '3. Hypotension or hypertension', observationRecord: '', observations: Array(8).fill('') },
      { symptom: '4. Pyrogenic reaction: chills, rigors, fever during dialysis', observationRecord: '', observations: Array(8).fill('') },
      { symptom: '5. Hemolysis', observationRecord: '', observations: Array(8).fill('') },
      { symptom: '6. Acute blood loss', observationRecord: '', observations: Array(8).fill('') },
      { symptom: '7. Air embolism', observationRecord: '', observations: Array(8).fill('') },
      { symptom: '8. Altered mental status', observationRecord: '', observations: Array(8).fill('') },
    ],
    vascularAccess: [
      { item: '1. Blood flow.', observationRecord: '', observations: Array(8).fill('') },
      { item: '2. Venous Pressure.', observationRecord: '', observations: Array(8).fill('') },
      { item: '3. Thrombosis.', observationRecord: '', observations: Array(8).fill('') },
      { item: '4. Mechanical failure.', observationRecord: '', observations: Array(8).fill('') },
      { item: '5. Infection.', observationRecord: '', observations: Array(8).fill('') },
      { item: '6. Skin erosion.', observationRecord: '', observations: Array(8).fill('') },
      { item: '7. Aneurysm or pseudo aneurysm.', observationRecord: '', observations: Array(8).fill('') },
      { item: '8. Arterial insufficiency or steal syndrome.', observationRecord: '', observations: Array(8).fill('') },
    ],
    catheters: [
      { item: '1. Exit site inspection.', observationRecord: '', observations: Array(8).fill('') },
      { item: '2. Signs of catheter thrombosis.', observationRecord: '', observations: Array(8).fill('') },
      { item: '3. Symptoms & signs of catheter related.', observationRecord: '', observations: Array(8).fill('') },
      { item: '4. Blood stream infection.', observationRecord: '', observations: Array(8).fill('') },
    ],
  })

  useEffect(() => {
    if (initialData) {
      setFormData(prev => ({ ...prev, ...initialData }))
    }
  }, [initialData])

  const updateField = (field: keyof ComplicationsData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const updateIntraDialytic = (index: number, dayIndex: number, value: string) => {
    setFormData(prev => ({
      ...prev,
      intraDialytic: prev.intraDialytic.map((item, i) =>
        i === index
          ? { ...item, observations: item.observations.map((obs, j) => (j === dayIndex ? value : obs)) }
          : item
      ),
    }))
  }

  const updateIntraDialyticObservation = (index: number, value: string) => {
    setFormData(prev => ({
      ...prev,
      intraDialytic: prev.intraDialytic.map((item, i) =>
        i === index ? { ...item, observationRecord: value } : item
      ),
    }))
  }

  const updateVascularAccess = (index: number, dayIndex: number, value: string) => {
    setFormData(prev => ({
      ...prev,
      vascularAccess: prev.vascularAccess.map((item, i) =>
        i === index
          ? { ...item, observations: item.observations.map((obs, j) => (j === dayIndex ? value : obs)) }
          : item
      ),
    }))
  }

  const updateVascularAccessObservation = (index: number, value: string) => {
    setFormData(prev => ({
      ...prev,
      vascularAccess: prev.vascularAccess.map((item, i) =>
        i === index ? { ...item, observationRecord: value } : item
      ),
    }))
  }

  const updateCatheters = (index: number, dayIndex: number, value: string) => {
    setFormData(prev => ({
      ...prev,
      catheters: prev.catheters.map((item, i) =>
        i === index
          ? { ...item, observations: item.observations.map((obs, j) => (j === dayIndex ? value : obs)) }
          : item
      ),
    }))
  }

  const updateCathetersObservation = (index: number, value: string) => {
    setFormData(prev => ({
      ...prev,
      catheters: prev.catheters.map((item, i) =>
        i === index ? { ...item, observationRecord: value } : item
      ),
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
          <h2 className="text-lg font-semibold text-slate-800">Complications Monitoring Form</h2>
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
          <div className="mb-4 flex items-center gap-4 border-b-2 border-slate-800 pb-4">
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

          {/* Patient Info */}
          <div className="mb-4 grid grid-cols-3 border border-slate-800">
            <div className="border-r border-slate-800 p-2">
              <span className="font-semibold">PATIENT NAME</span>
              <input
                type="text"
                value={formData.patientName}
                onChange={(e) => updateField('patientName', e.target.value)}
                className="w-full border-b border-slate-300 bg-transparent px-2 outline-none"
              />
            </div>
            <div className="border-r border-slate-800 p-2">
              <span className="font-semibold">AGE/GENDER</span>
              <input
                type="text"
                value={formData.ageGender}
                onChange={(e) => updateField('ageGender', e.target.value)}
                className="w-full border-b border-slate-300 bg-transparent px-2 outline-none"
              />
            </div>
            <div className="p-2">
              <span className="font-semibold">MRN</span>
              <input
                type="text"
                value={formData.mrn}
                onChange={(e) => updateField('mrn', e.target.value)}
                className="w-full border-b border-slate-300 bg-transparent px-2 outline-none"
              />
            </div>
          </div>

          {/* Section 1: Intra-dialytic Complications */}
          <div className="mb-4 border border-slate-800">
            <div className="border-b border-slate-800 bg-slate-800 p-2 text-center font-bold text-white">
              1) Monitoring of intra-dialytic Complications
            </div>
            
            <table className="w-full border-collapse text-xs">
              <thead>
                <tr>
                  <th className="border border-slate-800 bg-slate-100 p-2 text-left font-semibold">
                    Symptoms and Signs for Monitoring<br />during dialysis Observation/Record
                  </th>
                  <th className="border border-slate-800 bg-slate-100 p-2 font-semibold">Observation/ Record</th>
                  <th className="border border-slate-800 bg-slate-100 p-2 font-semibold" colSpan={8}>DAYS</th>
                </tr>
                <tr>
                  <th className="border border-slate-800 bg-slate-100 p-2"></th>
                  <th className="border border-slate-800 bg-slate-100 p-2"></th>
                  {[1, 2, 3, 4, 5, 6, 7, 8].map(d => (
                    <th key={d} className="border border-slate-800 bg-slate-100 p-2 font-semibold">D{d}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {formData.intraDialytic.map((item, idx) => (
                  <tr key={idx}>
                    <td className="border border-slate-800 p-2 text-left">{item.symptom}</td>
                    <td className="border border-slate-800 p-1">
                      <input
                        type="text"
                        value={item.observationRecord}
                        onChange={(e) => updateIntraDialyticObservation(idx, e.target.value)}
                        className="w-full bg-transparent text-center text-xs outline-none"
                      />
                    </td>
                    {item.observations.map((obs, dayIdx) => (
                      <td key={dayIdx} className="border border-slate-800 p-1">
                        <input
                          type="text"
                          value={obs}
                          onChange={(e) => updateIntraDialytic(idx, dayIdx, e.target.value)}
                          className="w-full bg-transparent text-center text-xs outline-none"
                        />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Section 2: Vascular Access Complications */}
          <div className="mb-4 border border-slate-800">
            <div className="border-b border-slate-800 bg-slate-800 p-2 text-center font-bold text-white">
              2) Vascular Access Complication Monitoring
            </div>
            
            <table className="w-full border-collapse text-xs">
              <thead>
                <tr>
                  <th className="border border-slate-800 bg-slate-100 p-2 text-left font-semibold">Native Fistula/Graft</th>
                  <th className="border border-slate-800 bg-slate-100 p-2 font-semibold">Observation/ Record</th>
                  {[1, 2, 3, 4, 5, 6, 7, 8].map(d => (
                    <th key={d} className="border border-slate-800 bg-slate-100 p-2 font-semibold">D{d}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {formData.vascularAccess.map((item, idx) => (
                  <tr key={idx}>
                    <td className="border border-slate-800 p-2 text-left">{item.item}</td>
                    <td className="border border-slate-800 p-1">
                      <input
                        type="text"
                        value={item.observationRecord}
                        onChange={(e) => updateVascularAccessObservation(idx, e.target.value)}
                        className="w-full bg-transparent text-center text-xs outline-none"
                      />
                    </td>
                    {item.observations.map((obs, dayIdx) => (
                      <td key={dayIdx} className="border border-slate-800 p-1">
                        <input
                          type="text"
                          value={obs}
                          onChange={(e) => updateVascularAccess(idx, dayIdx, e.target.value)}
                          className="w-full bg-transparent text-center text-xs outline-none"
                        />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Section 3: Catheters */}
          <div className="border border-slate-800">
            <div className="border-b border-slate-800 bg-slate-800 p-2 text-center font-bold text-white">
              3) Catheters
            </div>
            
            <table className="w-full border-collapse text-xs">
              <tbody>
                {formData.catheters.map((item, idx) => (
                  <tr key={idx}>
                    <td className="border border-slate-800 p-2 text-left w-64">{item.item}</td>
                    <td className="border border-slate-800 p-1 w-32">
                      <input
                        type="text"
                        value={item.observationRecord}
                        onChange={(e) => updateCathetersObservation(idx, e.target.value)}
                        className="w-full bg-transparent text-center text-xs outline-none"
                      />
                    </td>
                    {item.observations.map((obs, dayIdx) => (
                      <td key={dayIdx} className="border border-slate-800 p-1">
                        <input
                          type="text"
                          value={obs}
                          onChange={(e) => updateCatheters(idx, dayIdx, e.target.value)}
                          className="w-full bg-transparent text-center text-xs outline-none"
                        />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
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
