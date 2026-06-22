import { useState, useEffect } from 'react'
import { X } from 'lucide-react'

type InvestigationData = {
  name: string
  mrn: string
  cbcMonthly: string
  hb: string
  wbc: string
  plt: string
  ironStudy: string
  serumIron: string
  serumFerritin: string
  tibc: string
  ironSaturation: string
  renalFunction: string
  serumUrea: string
  creatinine: string
  uricAcid: string
  liverFunction: string
  alt: string
  alp: string
  serumAlbumin: string
  calciumPhosphate: string
  calcium: string
  phosphate: string
  electrolytes: string
  serumSodium: string
  serumPotassium: string
  serumChloride: string
  serumBicarbonate: string
  fastingIPTH: string
  fastingSerumLipid: string
  hba1c: string
  virology: string
  hbsAg: string
  antiHCV: string
  antiHIV: string
  antiHBsAB: string
  ecg: string
  echocardiography: string
  ultrasound: string
}

type Props = {
  open: boolean
  onClose: () => void
  onSave: (data: InvestigationData) => void
  initialData?: any
}

export default function Dialysis_InvestigationRecordDialog({ open, onClose, onSave, initialData }: Props) {
  const [formData, setFormData] = useState<InvestigationData>({
    name: '',
    mrn: '',
    cbcMonthly: '',
    hb: '',
    wbc: '',
    plt: '',
    ironStudy: '',
    serumIron: '',
    serumFerritin: '',
    tibc: '',
    ironSaturation: '',
    renalFunction: '',
    serumUrea: '',
    creatinine: '',
    uricAcid: '',
    liverFunction: '',
    alt: '',
    alp: '',
    serumAlbumin: '',
    calciumPhosphate: '',
    calcium: '',
    phosphate: '',
    electrolytes: '',
    serumSodium: '',
    serumPotassium: '',
    serumChloride: '',
    serumBicarbonate: '',
    fastingIPTH: '',
    fastingSerumLipid: '',
    hba1c: '',
    virology: '',
    hbsAg: '',
    antiHCV: '',
    antiHIV: '',
    antiHBsAB: '',
    ecg: '',
    echocardiography: '',
    ultrasound: '',
  })

  useEffect(() => {
    if (initialData) {
      setFormData(prev => ({ ...prev, ...initialData }))
    }
  }, [initialData])

  const updateField = (field: keyof InvestigationData, value: string) => {
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
          <h2 className="text-lg font-semibold text-slate-800">Investigation Record for Dialysis Patient</h2>
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
            <h3 className="mt-4 text-lg font-bold text-slate-800">INVESTIGATION RECORD FOR DIALYSIS PATIENT</h3>
          </div>

          {/* Patient Info */}
          <div className="mb-4 grid grid-cols-2 gap-4">
            <div className="border border-slate-800 p-2">
              <label className="text-sm font-bold">Patient Name:</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => updateField('name', e.target.value)}
                className="w-full border-b border-slate-300 bg-transparent px-2 py-1 outline-none print:border-0"
              />
            </div>
            <div className="border border-slate-800 p-2">
              <label className="text-sm font-bold">MR#:</label>
              <input
                type="text"
                value={formData.mrn}
                onChange={(e) => updateField('mrn', e.target.value)}
                className="w-full border-b border-slate-300 bg-transparent px-2 py-1 outline-none print:border-0"
              />
            </div>
          </div>

          {/* Investigation Table */}
          <table className="w-full border-collapse border border-slate-800 text-sm">
            <thead>
              <tr className="bg-slate-800 text-white">
                <th className="border border-slate-800 p-2 text-left" colSpan={2}>INVESTIGATION</th>
              </tr>
            </thead>
            <tbody>
              {/* CBC Monthly */}
              <tr className="bg-slate-800 text-white">
                <td className="border border-slate-800 p-2" colSpan={2}>CBC (Monthly)</td>
              </tr>
              <tr>
                <td className="border border-slate-800 p-2 font-semibold">HB</td>
                <td className="border border-slate-800 p-2">
                  <input type="text" value={formData.hb} onChange={(e) => updateField('hb', e.target.value)} className="w-full bg-transparent outline-none" />
                </td>
              </tr>
              <tr>
                <td className="border border-slate-800 p-2 font-semibold">WBC</td>
                <td className="border border-slate-800 p-2">
                  <input type="text" value={formData.wbc} onChange={(e) => updateField('wbc', e.target.value)} className="w-full bg-transparent outline-none" />
                </td>
              </tr>
              <tr>
                <td className="border border-slate-800 p-2 font-semibold">PLT</td>
                <td className="border border-slate-800 p-2">
                  <input type="text" value={formData.plt} onChange={(e) => updateField('plt', e.target.value)} className="w-full bg-transparent outline-none" />
                </td>
              </tr>

              {/* Iron Study */}
              <tr className="bg-slate-800 text-white">
                <td className="border border-slate-800 p-2" colSpan={2}>Iron Study (Every 6 Months)</td>
              </tr>
              <tr>
                <td className="border border-slate-800 p-2 font-semibold">Serum Iron</td>
                <td className="border border-slate-800 p-2">
                  <input type="text" value={formData.serumIron} onChange={(e) => updateField('serumIron', e.target.value)} className="w-full bg-transparent outline-none" />
                </td>
              </tr>
              <tr>
                <td className="border border-slate-800 p-2 font-semibold">Serum Ferritin</td>
                <td className="border border-slate-800 p-2">
                  <input type="text" value={formData.serumFerritin} onChange={(e) => updateField('serumFerritin', e.target.value)} className="w-full bg-transparent outline-none" />
                </td>
              </tr>
              <tr>
                <td className="border border-slate-800 p-2 font-semibold">TIBC</td>
                <td className="border border-slate-800 p-2">
                  <input type="text" value={formData.tibc} onChange={(e) => updateField('tibc', e.target.value)} className="w-full bg-transparent outline-none" />
                </td>
              </tr>
              <tr>
                <td className="border border-slate-800 p-2 font-semibold">Iron Saturation Tsats</td>
                <td className="border border-slate-800 p-2">
                  <input type="text" value={formData.ironSaturation} onChange={(e) => updateField('ironSaturation', e.target.value)} className="w-full bg-transparent outline-none" />
                </td>
              </tr>

              {/* Renal Function */}
              <tr className="bg-slate-800 text-white">
                <td className="border border-slate-800 p-2" colSpan={2}>Renal Function Test/ RFTs (As & When Required)</td>
              </tr>
              <tr>
                <td className="border border-slate-800 p-2 font-semibold">Serum Urea</td>
                <td className="border border-slate-800 p-2">
                  <input type="text" value={formData.serumUrea} onChange={(e) => updateField('serumUrea', e.target.value)} className="w-full bg-transparent outline-none" />
                </td>
              </tr>
              <tr>
                <td className="border border-slate-800 p-2 font-semibold">Creatinine</td>
                <td className="border border-slate-800 p-2">
                  <input type="text" value={formData.creatinine} onChange={(e) => updateField('creatinine', e.target.value)} className="w-full bg-transparent outline-none" />
                </td>
              </tr>
              <tr>
                <td className="border border-slate-800 p-2 font-semibold">Uric Acid</td>
                <td className="border border-slate-800 p-2">
                  <input type="text" value={formData.uricAcid} onChange={(e) => updateField('uricAcid', e.target.value)} className="w-full bg-transparent outline-none" />
                </td>
              </tr>

              {/* Liver Function */}
              <tr className="bg-slate-800 text-white">
                <td className="border border-slate-800 p-2" colSpan={2}>Liver Function Test/ LFTs (Every 3 Months)</td>
              </tr>
              <tr>
                <td className="border border-slate-800 p-2 font-semibold">ALT</td>
                <td className="border border-slate-800 p-2">
                  <input type="text" value={formData.alt} onChange={(e) => updateField('alt', e.target.value)} className="w-full bg-transparent outline-none" />
                </td>
              </tr>
              <tr>
                <td className="border border-slate-800 p-2 font-semibold">ALP</td>
                <td className="border border-slate-800 p-2">
                  <input type="text" value={formData.alp} onChange={(e) => updateField('alp', e.target.value)} className="w-full bg-transparent outline-none" />
                </td>
              </tr>
              <tr>
                <td className="border border-slate-800 p-2 font-semibold">Serum Albumin</td>
                <td className="border border-slate-800 p-2">
                  <input type="text" value={formData.serumAlbumin} onChange={(e) => updateField('serumAlbumin', e.target.value)} className="w-full bg-transparent outline-none" />
                </td>
              </tr>

              {/* Calcium & Phosphate */}
              <tr className="bg-slate-800 text-white">
                <td className="border border-slate-800 p-2" colSpan={2}>Calcium & Phosphate (Monthly)</td>
              </tr>
              <tr>
                <td className="border border-slate-800 p-2 font-semibold">Calcium</td>
                <td className="border border-slate-800 p-2">
                  <input type="text" value={formData.calcium} onChange={(e) => updateField('calcium', e.target.value)} className="w-full bg-transparent outline-none" />
                </td>
              </tr>
              <tr>
                <td className="border border-slate-800 p-2 font-semibold">Phosphate</td>
                <td className="border border-slate-800 p-2">
                  <input type="text" value={formData.phosphate} onChange={(e) => updateField('phosphate', e.target.value)} className="w-full bg-transparent outline-none" />
                </td>
              </tr>

              {/* Electrolytes */}
              <tr className="bg-slate-800 text-white">
                <td className="border border-slate-800 p-2" colSpan={2}>Electrolytes (As & When Required)</td>
              </tr>
              <tr>
                <td className="border border-slate-800 p-2 font-semibold">Serum Sodium</td>
                <td className="border border-slate-800 p-2">
                  <input type="text" value={formData.serumSodium} onChange={(e) => updateField('serumSodium', e.target.value)} className="w-full bg-transparent outline-none" />
                </td>
              </tr>
              <tr>
                <td className="border border-slate-800 p-2 font-semibold">Serum Potassium</td>
                <td className="border border-slate-800 p-2">
                  <input type="text" value={formData.serumPotassium} onChange={(e) => updateField('serumPotassium', e.target.value)} className="w-full bg-transparent outline-none" />
                </td>
              </tr>
              <tr>
                <td className="border border-slate-800 p-2 font-semibold">Serum Chloride</td>
                <td className="border border-slate-800 p-2">
                  <input type="text" value={formData.serumChloride} onChange={(e) => updateField('serumChloride', e.target.value)} className="w-full bg-transparent outline-none" />
                </td>
              </tr>
              <tr>
                <td className="border border-slate-800 p-2 font-semibold">Serum Bicarbonate</td>
                <td className="border border-slate-800 p-2">
                  <input type="text" value={formData.serumBicarbonate} onChange={(e) => updateField('serumBicarbonate', e.target.value)} className="w-full bg-transparent outline-none" />
                </td>
              </tr>

              {/* Other Tests */}
              <tr className="bg-slate-800 text-white">
                <td className="border border-slate-800 p-2" colSpan={2}>Fasting IPTH (Every 3 to 6 Months)</td>
              </tr>
              <tr>
                <td className="border border-slate-800 p-2" colSpan={2}>
                  <input type="text" value={formData.fastingIPTH} onChange={(e) => updateField('fastingIPTH', e.target.value)} className="w-full bg-transparent outline-none" />
                </td>
              </tr>

              <tr className="bg-slate-800 text-white">
                <td className="border border-slate-800 p-2" colSpan={2}>Fasting Serum Lipid (Annually)</td>
              </tr>
              <tr>
                <td className="border border-slate-800 p-2" colSpan={2}>
                  <input type="text" value={formData.fastingSerumLipid} onChange={(e) => updateField('fastingSerumLipid', e.target.value)} className="w-full bg-transparent outline-none" />
                </td>
              </tr>

              <tr className="bg-slate-800 text-white">
                <td className="border border-slate-800 p-2" colSpan={2}>HBA 1C, BSR (As & When Required)</td>
              </tr>
              <tr>
                <td className="border border-slate-800 p-2" colSpan={2}>
                  <input type="text" value={formData.hba1c} onChange={(e) => updateField('hba1c', e.target.value)} className="w-full bg-transparent outline-none" />
                </td>
              </tr>

              {/* Virology */}
              <tr className="bg-slate-800 text-white">
                <td className="border border-slate-800 p-2" colSpan={2}>Virology (Every 3 Months)</td>
              </tr>
              <tr>
                <td className="border border-slate-800 p-2 font-semibold">HBS AG</td>
                <td className="border border-slate-800 p-2">
                  <input type="text" value={formData.hbsAg} onChange={(e) => updateField('hbsAg', e.target.value)} className="w-full bg-transparent outline-none" />
                </td>
              </tr>
              <tr>
                <td className="border border-slate-800 p-2 font-semibold">Anti HCV</td>
                <td className="border border-slate-800 p-2">
                  <input type="text" value={formData.antiHCV} onChange={(e) => updateField('antiHCV', e.target.value)} className="w-full bg-transparent outline-none" />
                </td>
              </tr>
              <tr>
                <td className="border border-slate-800 p-2 font-semibold">Anti-HIV</td>
                <td className="border border-slate-800 p-2">
                  <input type="text" value={formData.antiHIV} onChange={(e) => updateField('antiHIV', e.target.value)} className="w-full bg-transparent outline-none" />
                </td>
              </tr>
              <tr>
                <td className="border border-slate-800 p-2 font-semibold">Anti HBs AB titer (Annually)</td>
                <td className="border border-slate-800 p-2">
                  <input type="text" value={formData.antiHBsAB} onChange={(e) => updateField('antiHBsAB', e.target.value)} className="w-full bg-transparent outline-none" />
                </td>
              </tr>

              {/* Imaging */}
              <tr className="bg-slate-800 text-white">
                <td className="border border-slate-800 p-2" colSpan={2}>ECG (As & When Required)</td>
              </tr>
              <tr>
                <td className="border border-slate-800 p-2" colSpan={2}>
                  <input type="text" value={formData.ecg} onChange={(e) => updateField('ecg', e.target.value)} className="w-full bg-transparent outline-none" />
                </td>
              </tr>

              <tr className="bg-slate-800 text-white">
                <td className="border border-slate-800 p-2" colSpan={2}>Echocardiography (As & When Required)</td>
              </tr>
              <tr>
                <td className="border border-slate-800 p-2" colSpan={2}>
                  <input type="text" value={formData.echocardiography} onChange={(e) => updateField('echocardiography', e.target.value)} className="w-full bg-transparent outline-none" />
                </td>
              </tr>

              <tr className="bg-slate-800 text-white">
                <td className="border border-slate-800 p-2" colSpan={2}>Ultrasound Scan of Abdomen and Pelvis (As & When Required)</td>
              </tr>
              <tr>
                <td className="border border-slate-800 p-2" colSpan={2}>
                  <input type="text" value={formData.ultrasound} onChange={(e) => updateField('ultrasound', e.target.value)} className="w-full bg-transparent outline-none" />
                </td>
              </tr>
            </tbody>
          </table>

          <div className="mt-4 text-xs text-slate-600">
            <p>U/R Urea Reduction Ratio (URR) = Pre-dialysis urea-post-dialysis Urea / 100% pre-dialysis urea</p>
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
