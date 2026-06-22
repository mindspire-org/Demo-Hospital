type PrescriptionLanguage = 'english' | 'urdu'

type Props = {
  printId?: string
  doctor: { name?: string; specialization?: string; qualification?: string; departmentName?: string; phone?: string }
  settings: { name: string; address: string; phone: string; logoDataUrl?: string }
  patient: { name?: string; mrn?: string; gender?: string; fatherName?: string; age?: string; phone?: string; address?: string }
  items: Array<{ name: string; frequency?: string; duration?: string; dose?: string; instruction?: string; route?: string; notes?: string }>
  labTests?: string[]
  labNotes?: string
  diagnosticTests?: string[]
  diagnosticNotes?: string
  primaryComplaint?: string
  primaryComplaintHistory?: string
  familyHistory?: string
  treatmentHistory?: string
  allergyHistory?: string
  history?: string
  examFindings?: string
  diagnosis?: string
  advice?: string
  nextFollowUp?: string
  dentalChart?: {
    teeth?: Array<{ toothId: number; condition: string; notes?: string }>
    generalNotes?: string
  }
  eyeExamination?: {
    visualAcuityRight?: string; visualAcuityLeft?: string
    nearVisionRight?: string; nearVisionLeft?: string
    iopRight?: string; iopLeft?: string
    refractionRight?: string; refractionLeft?: string
    slitLamp?: string; fundus?: string; diagnosis?: string
    glassesRight?: { sph?: string; cyl?: string; axis?: string; add?: string }
    glassesLeft?: { sph?: string; cyl?: string; axis?: string; add?: string }
    generalNotes?: string
  }
  departmentTitle?: string
  departmentSections?: Array<
    | { title: string; type: 'kv'; kv: [string, string][] }
    | { title: string; type: 'text'; text: string }
    | { title: string; type: 'table'; table: { headers: string[]; rows: string[][] } }
  >
  createdAt?: string | Date
  language?: PrescriptionLanguage
}

const CONDITION_COLORS: Record<string, string> = {
  'Sound': '#dcfce7', 'Decay': '#fde68a', 'Filling': '#bfdbfe', 'Crown': '#fef08a',
  'Root Canal': '#ddd6fe', 'Extracted': '#fecaca', 'Missing': '#e5e7eb', 'Implant': '#99f6e4',
  'Fracture': '#fdba74', 'Abscess': '#fbcfe8', 'Calculus': '#d6c3a5', 'Mobility': '#c7d2fe', 'Other': '#e2e8f0',
}

export default function PrescriptionPrint({ printId = 'prescription-print', doctor, settings, patient, items, labTests, labNotes, diagnosticTests, diagnosticNotes, primaryComplaint, primaryComplaintHistory, familyHistory, treatmentHistory, allergyHistory, history, examFindings, diagnosis, advice, nextFollowUp, dentalChart, eyeExamination, departmentTitle, departmentSections, createdAt, language = 'english' }: Props){
  const dt = createdAt ? new Date(createdAt) : new Date()
  const isUrdu = language === 'urdu'
  
  // Labels based on language
  const labels = {
    drug: isUrdu ? 'دوا' : 'Drug',
    frequency: isUrdu ? 'فریکوئنسی' : 'Frequency',
    dosage: isUrdu ? 'خوراک' : 'Dosage',
    duration: isUrdu ? 'مدت' : 'Duration',
    instruction: isUrdu ? 'ہدایات' : 'Instruction',
    route: isUrdu ? 'طریقہ' : 'Route',
    prescription: isUrdu ? 'نسخہ' : 'Prescription',
    medication: isUrdu ? 'ادویات' : 'Medication',
    complaint: isUrdu ? 'شکایت' : 'Complaint',
    diagnosis: isUrdu ? 'تشخیص / بیماری' : 'Diagnosis / Disease',
    advice: isUrdu ? 'تجاویز' : 'Advice',
    examination: isUrdu ? 'معائنہ' : 'Examination',
    history: isUrdu ? 'طبی تاریخ' : 'Medical History',
    familyHistory: isUrdu ? 'خاندانی تاریخ' : 'Family History',
    allergyHistory: isUrdu ? 'الرجی کی تاریخ' : 'Allergy History',
    treatmentHistory: isUrdu ? 'علاج کی تاریخ' : 'Treatment History',
    labTests: isUrdu ? 'لیب ٹیسٹ' : 'Lab Tests',
    diagnosticTests: isUrdu ? 'تشخیصی ٹیسٹ' : 'Diagnostic Tests',
    nextFollowUp: isUrdu ? 'اگلی ملاقات' : 'Next Follow Up',
    qualification: isUrdu ? 'قابلیت' : 'Qualification',
    department: isUrdu ? 'شعبہ' : 'Department',
    patient: isUrdu ? 'مریض' : 'Patient',
    date: isUrdu ? 'تاریخ' : 'Date',
  }
  
  // Helper to translate common terms
  const translate = (text: string): string => {
    if (!isUrdu || !text) return text
    const map: Record<string, string> = {
      'oral': 'منہ سے',
      'iv': 'ورید میں',
      'im': 'پٹھوں میں',
      'sc': 'جلد کے نیچے',
      'before meals': 'کھانے سے پہلے',
      'after meals': 'کھانے کے بعد',
      'with meals': 'کھانے کے ساتھ',
      'empty stomach': 'خالی پیٹ',
      'bed time': 'سونے کے وقت',
      'once daily': 'دن میں ایک بار',
      'twice daily': 'دن میں دو بار',
      'thrice daily': 'دن میں تین بار',
      'four times daily': 'دن میں چار بار',
      'morning': 'صبح',
      'night': 'رات',
      'sos': 'ضرورت کے مطابق',
      'stat': 'فوری',
    }
    return map[text.toLowerCase().trim()] || text
  }
  
  const rows = (items||[]).map((m, i) => {
    const parts = String(m.frequency||'').split('/').map(s=>s.trim()).filter(Boolean)
    let en = '-', ur = ''
    const cnt = parts.length
    if (cnt === 1) { en = 'Once a day'; ur = 'دن میں ایک بار' }
    else if (cnt === 2) { en = 'Twice a day'; ur = 'دن میں دو بار' }
    else if (cnt === 3) { en = 'Thrice a day'; ur = 'دن میں تین بار' }
    else if (cnt >= 4) { en = 'Four times a day'; ur = 'دن میں چار بار' }
    else if ((m.frequency||'').trim()) { en = String(m.frequency).trim() }
    
    // Show both English and Urdu for frequency
    const freq = isUrdu && ur ? `${en}\n${ur}` : (isUrdu ? translate(en) : en)
    
    const d = String(m.duration||'').trim()
    const dm = d.match(/\d+/)
    // For Urdu, show duration with Urdu number
    const duration = isUrdu && dm ? `${d}\n${dm[0]} دن` : (d || '-')
    
    const dose = (m as any).dose || (m as any).qty || '-'
    const instruction = translate((m as any).instruction || '-')
    const route = translate((m as any).route || '-')
    
    return { sr: i+1, name: m.name||'-', freq, dose, duration, instruction, route, notes: m.notes || '' }
  })
  return (
    <div id={printId} className="hidden print:block">
      <div className="mx-auto max-w-3xl">
        <div className="mb-1 grid grid-cols-12 items-start gap-4">
          <div className="col-span-5 self-start">
            {doctor?.specialization && (
              <div className="text-xs font-semibold text-slate-700">Consultant {doctor.specialization}</div>
            )}
            <div className="text-lg font-extrabold leading-tight">Dr. {doctor?.name || '-'}</div>
            {doctor?.qualification && (
              <div className="text-xs text-slate-700">Qualification: {doctor.qualification}</div>
            )}
            {doctor?.departmentName && (
              <div className="text-xs text-slate-700">Department: {doctor.departmentName}</div>
            )}
            {doctor?.phone && (
              <div className="text-xs text-slate-600">Phone: {doctor.phone}</div>
            )}
          </div>
          <div className="col-span-2 text-center self-start">
            {settings?.logoDataUrl && <img src={settings.logoDataUrl} alt="logo" className="mx-auto h-14 w-14 object-contain" />}
          </div>
          <div className="col-span-5 text-right self-start">
            <div className="text-xl font-extrabold leading-tight">{settings?.name || ''}</div>
            <div className="text-xs text-slate-600">{settings?.address || ''}</div>
            {settings?.phone && <div className="text-xs text-slate-600">Mobile #: {settings.phone}</div>}
          </div>
        </div>
        <hr className="my-3" />

        <div className="mb-3 grid grid-cols-3 gap-x-1 gap-y-0.5 text-xs leading-tight">
          <div><span className="font-semibold">Patient:</span> {patient?.name || '-'}</div>
          <div><span className="font-semibold">MR:</span> {patient?.mrn || '-'}</div>
          <div className="text-right"><span className="font-semibold">Gender:</span> {patient?.gender || '-'}</div>
          <div><span className="font-semibold">Father Name:</span> {patient?.fatherName || '-'}</div>
          <div className="text-center"><span className="font-semibold">Age:</span> {patient?.age || '-'}</div>
          <div className="text-right"><span className="font-semibold">Phone:</span> {patient?.phone || '-'}</div>
          <div className="col-span-3"><span className="font-semibold">Address:</span> {patient?.address || '-'}</div>
          <div className="col-span-3 text-xs text-slate-600"><span className="font-semibold">Date:</span> {dt.toLocaleDateString()} {dt.toLocaleTimeString()}</div>
        </div>

        <div className="grid grid-cols-12 gap-4">
          <div className="col-span-5 space-y-3">
            <div className="text-sm font-semibold">Prescription</div>
            {primaryComplaint && primaryComplaint.trim() && (
              <div>
                <div className="text-xs font-semibold text-slate-700">Complaint</div>
                <div className="min-h-[40px] whitespace-pre-wrap rounded-md border border-slate-300 p-2 text-sm">{primaryComplaint}</div>
              </div>
            )}
            {(primaryComplaintHistory || treatmentHistory) && (primaryComplaintHistory || treatmentHistory)?.trim() && (
              <div>
                <div className="text-xs font-semibold text-slate-700">Clinical Notes</div>
                <div className="min-h-[40px] whitespace-pre-wrap rounded-md border border-slate-300 p-2 text-sm">{primaryComplaintHistory || treatmentHistory}</div>
              </div>
            )}
            {familyHistory && familyHistory.trim() && (
              <div>
                <div className="text-xs font-semibold text-slate-700">Family History</div>
                <div className="min-h-[56px] whitespace-pre-wrap rounded-md border border-slate-300 p-2 text-sm">{familyHistory}</div>
              </div>
            )}
            {allergyHistory && allergyHistory.trim() && (
              <div>
                <div className="text-xs font-semibold text-slate-700">Allergy History</div>
                <div className="min-h-[56px] whitespace-pre-wrap rounded-md border border-slate-300 p-2 text-sm">{allergyHistory}</div>
              </div>
            )}
            {treatmentHistory && treatmentHistory.trim() && (
              <div>
                <div className="text-xs font-semibold text-slate-700">Treatment History</div>
                <div className="min-h-[56px] whitespace-pre-wrap rounded-md border border-slate-300 p-2 text-sm">{treatmentHistory}</div>
              </div>
            )}
            {history && history.trim() && (
              <div>
                <div className="text-xs font-semibold text-slate-700">Medical History</div>
                <div className="min-h-[56px] whitespace-pre-wrap rounded-md border border-slate-300 p-2 text-sm">{history}</div>
              </div>
            )}
            {examFindings && examFindings.trim() && (
              <div>
                <div className="text-xs font-semibold text-slate-700">Examination</div>
                <div className="min-h-[40px] whitespace-pre-wrap rounded-md border border-slate-300 p-2 text-sm">{examFindings}</div>
              </div>
            )}
            {diagnosis && diagnosis.trim() && (
              <div>
                <div className="text-xs font-semibold text-slate-700">Diagnosis / Disease</div>
                <div className="min-h-[32px] whitespace-pre-wrap rounded-md border border-slate-300 p-2 text-sm">{diagnosis}</div>
              </div>
            )}
            {advice && advice.trim() && (
              <div>
                <div className="text-xs font-semibold text-slate-700">Advice</div>
                <div className="min-h-[32px] whitespace-pre-wrap rounded-md border border-slate-300 p-2 text-sm">{advice}</div>
              </div>
            )}
            {Array.isArray(labTests) && labTests.length > 0 && (
              <div>
                <div className="text-xs font-semibold text-slate-700">Lab Tests</div>
                <div className="min-h-[32px] whitespace-pre-wrap rounded-md border border-slate-300 p-2 text-sm">{labTests.join(', ')}</div>
              </div>
            )}
            {labNotes && labNotes.trim() && (
              <div>
                <div className="text-xs font-semibold text-slate-700">Lab Notes</div>
                <div className="min-h-[32px] whitespace-pre-wrap rounded-md border border-slate-300 p-2 text-sm">{labNotes}</div>
              </div>
            )}
            {Array.isArray(diagnosticTests) && diagnosticTests.length > 0 && (
              <div>
                <div className="text-xs font-semibold text-slate-700">Diagnostic Tests</div>
                <div className="min-h-[32px] whitespace-pre-wrap rounded-md border border-slate-300 p-2 text-sm">{diagnosticTests.join(', ')}</div>
              </div>
            )}
            {diagnosticNotes && diagnosticNotes.trim() && (
              <div>
                <div className="text-xs font-semibold text-slate-700">Diagnostic Notes</div>
                <div className="min-h-[32px] whitespace-pre-wrap rounded-md border border-slate-300 p-2 text-sm">{diagnosticNotes}</div>
              </div>
            )}
            {nextFollowUp && nextFollowUp.trim() && (
              <div>
                <div className="text-xs font-semibold text-slate-700">Next Follow Up</div>
                <div className="min-h-[32px] whitespace-pre-wrap rounded-md border border-slate-300 p-2 text-sm font-bold text-sky-700">{nextFollowUp}</div>
              </div>
            )}
          </div>

          <div className="col-span-7">
            <div className={`mb-2 text-sm font-semibold ${isUrdu ? 'urdu-font' : ''}`}>{labels.medication}</div>
            <table className={`w-full table-fixed border-collapse text-sm ${isUrdu ? 'urdu-font' : ''}`}>
              <thead>
                <tr>
                  <th className="w-10 border border-slate-300 px-2 py-1 text-left">Sr.</th>
                  <th className="border border-slate-300 px-2 py-1 text-left">{labels.drug}</th>
                  <th className="w-28 border border-slate-300 px-2 py-1">{labels.frequency}</th>
                  <th className="w-20 border border-slate-300 px-2 py-1">{labels.dosage}</th>
                  <th className="w-24 border border-slate-300 px-2 py-1">{labels.duration}</th>
                  <th className="w-28 border border-slate-300 px-2 py-1">{labels.instruction}</th>
                  <th className="w-20 border border-slate-300 px-2 py-1">{labels.route}</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr key={i}>
                    <td className="border border-slate-300 px-2 py-1 align-top">{r.sr}</td>
                    <td className="border border-slate-300 px-2 py-1 align-top">
                      <div className="font-medium">{r.name}</div>
                      {r.notes && <div className="text-[10px] text-slate-600 mt-0.5 leading-tight italic">Note: {r.notes}</div>}
                    </td>
                    <td className="border border-slate-300 px-2 py-1 whitespace-pre-line text-center align-top">{r.freq}</td>
                    <td className="border border-slate-300 px-2 py-1 text-center align-top">{r.dose}</td>
                    <td className="border border-slate-300 px-2 py-1 whitespace-pre-line text-center align-top">{r.duration}</td>
                    <td className="border border-slate-300 px-2 py-1 text-center align-top">{r.instruction}</td>
                    <td className="border border-slate-300 px-2 py-1 text-center align-top">{r.route}</td>
                  </tr>
                ))}
                {rows.length === 0 && (
                  <tr><td colSpan={7} className="border border-slate-300 px-2 py-3 text-center text-slate-500">No medicines</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Dental chart summary */}
        {Array.isArray(dentalChart?.teeth) && dentalChart!.teeth!.length > 0 && (
          <div className="mt-4">
            <div className="text-sm font-semibold border-b border-slate-300 pb-1 mb-2">Dental Chart — Tooth Conditions</div>
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr>
                  <th className="w-24 border border-slate-300 px-2 py-1 text-left">Tooth (FDI)</th>
                  <th className="w-40 border border-slate-300 px-2 py-1 text-left">Condition</th>
                  <th className="border border-slate-300 px-2 py-1 text-left">Notes</th>
                </tr>
              </thead>
              <tbody>
                {[...dentalChart!.teeth!].sort((a, b) => Number(a.toothId) - Number(b.toothId)).map((t, i) => (
                  <tr key={i}>
                    <td className="border border-slate-300 px-2 py-1 font-medium">{t.toothId}</td>
                    <td className="border border-slate-300 px-2 py-1">
                      <span className="inline-block h-2.5 w-2.5 rounded-full align-middle mr-1.5" style={{ background: CONDITION_COLORS[t.condition] || '#e2e8f0', border: '1px solid rgba(0,0,0,0.15)' }} />
                      {t.condition}
                    </td>
                    <td className="border border-slate-300 px-2 py-1 text-slate-600">{t.notes || ''}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {dentalChart?.generalNotes && dentalChart.generalNotes.trim() && (
              <div className="mt-2 text-sm"><span className="font-semibold">General Dental Notes: </span>{dentalChart.generalNotes}</div>
            )}
          </div>
        )}

        {/* Eye examination summary */}
        {eyeExamination && (
          (() => {
            const e = eyeExamination
            const gR = e.glassesRight || {}, gL = e.glassesLeft || {}
            const hasGlasses = ['sph','cyl','axis','add'].some(k => (gR as any)[k] || (gL as any)[k])
            const hasExam = e.visualAcuityRight || e.visualAcuityLeft || e.nearVisionRight || e.nearVisionLeft || e.iopRight || e.iopLeft || e.refractionRight || e.refractionLeft || e.slitLamp || e.fundus || e.diagnosis || hasGlasses
            if (!hasExam) return null
            return (
              <div className="mt-4">
                <div className="text-sm font-semibold border-b border-slate-300 pb-1 mb-2">Ophthalmic Examination</div>
                <table className="w-full border-collapse text-sm mb-2">
                  <thead>
                    <tr>
                      <th className="border border-slate-300 px-2 py-1 text-left">Test</th>
                      <th className="border border-slate-300 px-2 py-1">Right (OD)</th>
                      <th className="border border-slate-300 px-2 py-1">Left (OS)</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr><td className="border border-slate-300 px-2 py-1 font-medium">Visual Acuity</td><td className="border border-slate-300 px-2 py-1 text-center">{e.visualAcuityRight || '-'}</td><td className="border border-slate-300 px-2 py-1 text-center">{e.visualAcuityLeft || '-'}</td></tr>
                    <tr><td className="border border-slate-300 px-2 py-1 font-medium">Near Vision</td><td className="border border-slate-300 px-2 py-1 text-center">{e.nearVisionRight || '-'}</td><td className="border border-slate-300 px-2 py-1 text-center">{e.nearVisionLeft || '-'}</td></tr>
                    <tr><td className="border border-slate-300 px-2 py-1 font-medium">IOP (mmHg)</td><td className="border border-slate-300 px-2 py-1 text-center">{e.iopRight || '-'}</td><td className="border border-slate-300 px-2 py-1 text-center">{e.iopLeft || '-'}</td></tr>
                    <tr><td className="border border-slate-300 px-2 py-1 font-medium">Refraction</td><td className="border border-slate-300 px-2 py-1 text-center">{e.refractionRight || '-'}</td><td className="border border-slate-300 px-2 py-1 text-center">{e.refractionLeft || '-'}</td></tr>
                  </tbody>
                </table>
                {e.slitLamp && e.slitLamp.trim() && <div className="text-sm"><span className="font-semibold">Slit Lamp: </span>{e.slitLamp}</div>}
                {e.fundus && e.fundus.trim() && <div className="text-sm"><span className="font-semibold">Fundus: </span>{e.fundus}</div>}
                {e.diagnosis && e.diagnosis.trim() && <div className="text-sm"><span className="font-semibold">Diagnosis: </span>{e.diagnosis}</div>}
                {hasGlasses && (
                  <div className="mt-2">
                    <div className="text-sm font-semibold mb-1">Glasses Prescription</div>
                    <table className="w-full border-collapse text-sm">
                      <thead>
                        <tr>
                          <th className="border border-slate-300 px-2 py-1">Eye</th>
                          <th className="border border-slate-300 px-2 py-1">SPH</th>
                          <th className="border border-slate-300 px-2 py-1">CYL</th>
                          <th className="border border-slate-300 px-2 py-1">AXIS</th>
                          <th className="border border-slate-300 px-2 py-1">ADD</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr><td className="border border-slate-300 px-2 py-1 font-medium">Right (OD)</td><td className="border border-slate-300 px-2 py-1 text-center">{gR.sph || '-'}</td><td className="border border-slate-300 px-2 py-1 text-center">{gR.cyl || '-'}</td><td className="border border-slate-300 px-2 py-1 text-center">{gR.axis || '-'}</td><td className="border border-slate-300 px-2 py-1 text-center">{gR.add || '-'}</td></tr>
                        <tr><td className="border border-slate-300 px-2 py-1 font-medium">Left (OS)</td><td className="border border-slate-300 px-2 py-1 text-center">{gL.sph || '-'}</td><td className="border border-slate-300 px-2 py-1 text-center">{gL.cyl || '-'}</td><td className="border border-slate-300 px-2 py-1 text-center">{gL.axis || '-'}</td><td className="border border-slate-300 px-2 py-1 text-center">{gL.add || '-'}</td></tr>
                      </tbody>
                    </table>
                  </div>
                )}
                {e.generalNotes && e.generalNotes.trim() && <div className="mt-2 text-sm"><span className="font-semibold">Eye Notes: </span>{e.generalNotes}</div>}
              </div>
            )
          })()
        )}

        {/* Generic department clinical sections (cardiac, breast-onco, omfs, neuro) */}
        {Array.isArray(departmentSections) && departmentSections.length > 0 && (
          <div className="mt-4">
            {departmentTitle && <div className="text-sm font-semibold border-b border-slate-300 pb-1 mb-2">{departmentTitle}</div>}
            {departmentSections.map((s, si) => (
              <div key={si} className="mb-3">
                <div className="text-xs font-semibold text-slate-700 mb-1">{s.title}</div>
                {s.type === 'text' && (
                  <div className="whitespace-pre-wrap rounded-md border border-slate-300 p-2 text-sm">{s.text}</div>
                )}
                {s.type === 'kv' && (
                  <table className="w-full border-collapse text-sm">
                    <tbody>
                      {s.kv.map(([k, val], ki) => (
                        <tr key={ki}>
                          <td className="w-44 border border-slate-300 px-2 py-1 font-medium align-top">{k}</td>
                          <td className="border border-slate-300 px-2 py-1 align-top">{val}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
                {s.type === 'table' && (
                  <table className="w-full border-collapse text-sm">
                    <thead>
                      <tr>
                        {s.table.headers.map((h, hi) => (
                          <th key={hi} className="border border-slate-300 px-2 py-1 text-left">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {s.table.rows.map((row, ri) => (
                        <tr key={ri}>
                          {row.map((cell, ci) => (
                            <td key={ci} className="border border-slate-300 px-2 py-1 align-top">{cell}</td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
      <style>{`
        @page { size: A4; margin: 0; }
        @media print {
          * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          html, body { margin: 0 !important; padding: 0 !important; width: 100% !important; }
          header, nav, aside, footer, .no-print, .app-header, .sidebar { display: none !important; }
          #${printId} { display: block !important; position: static !important; width: 100% !important; min-height: 100vh !important; margin: 0 !important; padding: 0 !important; border: 0 !important; border-radius: 0 !important; box-shadow: none !important; background: #ffffff !important; }
        }
        /* Urdu Font Support - Uses Jameel Noori Nastaleeq or common alternatives */
        .urdu-font {
          font-family: 'Jameel Noori Nastaleeq', 'Nafees Nastaleeq', 'Nastaleeq', 'Urdu Typesetting', 'Noto Nastaliq Urdu', 'Alvi Nastaleeq', 'Pakistan Nastaleeq', 'Tallqalam Taj Nasteeq', sans-serif;
          direction: rtl;
          text-align: right;
        }
        .urdu-font td, .urdu-font th {
          direction: rtl;
          text-align: right;
        }
      `}</style>
    </div>
  )
}
