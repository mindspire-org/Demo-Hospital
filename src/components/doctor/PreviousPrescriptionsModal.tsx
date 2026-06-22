import { useState, useEffect } from 'react'
import { hospitalApi, labApi } from '../../utils/api'
import { previewPrescriptionPdf } from '../../utils/prescriptionPdf'
import { previewPreAnesthesiaPdf } from '../../utils/preAnesthesiaPdf'

type Prescription = {
  _id: string
  createdAt: string
  primaryComplaint?: string
  diagnosis?: string
  items?: Array<{ name?: string; medicine?: string; frequency?: string; duration?: string; dose?: string; instruction?: string; route?: string; notes?: string }>
  labTests?: string[]
  diagnosticTests?: string[]
  tokenNo?: string
  createdBy?: string
  source?: string
  preAnesthesia?: {
    isApplied: boolean
    history?: any
    examination?: any
    recommendation?: string
  }
}

type Props = {
  isOpen: boolean
  onClose: () => void
  patientMrn: string
  onSelectPrescription: (prescription: Prescription) => void
  doctor: { name?: string; specialization?: string; qualification?: string; departmentName?: string; phone?: string }
  settings: { name: string; address: string; phone: string; logoDataUrl?: string }
  patient: { name?: string; mrn?: string; gender?: string; fatherName?: string; age?: string; phone?: string; address?: string }
}

export default function PreviousPrescriptionsModal({ isOpen, onClose, patientMrn, onSelectPrescription, doctor, settings, patient }: Props) {
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([])
  const [loading, setLoading] = useState(false)
  const [viewLoading, setViewLoading] = useState(false)

  useEffect(() => {
    if (!isOpen || !patientMrn) {
      setPrescriptions([])
      return
    }

    setLoading(true)
    ;(async () => {
      try {
        const res: any = await hospitalApi.listPrescriptions({ patientMrn, page: 1, limit: 50 })
        setPrescriptions(res?.prescriptions || [])
      } catch {
        setPrescriptions([])
      } finally {
        setLoading(false)
      }
    })()
  }, [isOpen, patientMrn])

  const handlePrescribeSame = (prescription: Prescription) => {
    onSelectPrescription(prescription)
    onClose()
  }

  const handleView = async (prescription: Prescription) => {
    setViewLoading(true)
    try {
      // Fetch prescription, settings, and patient data in parallel
      const [detail, settingsData] = await Promise.all([
        hospitalApi.getPrescription(prescription._id) as any,
        hospitalApi.getSettings() as any,
      ])
      const p = detail?.prescription
      if (!p) return

      // Get patient MRN from encounter
      let patientMrn = p.encounterId?.patientId?.mrn || p.mrNo || patient?.mrn
      let patientData: any = { name: p.encounterId?.patientId?.fullName || patient?.name || '-', mrn: patientMrn || '-' }

      // Fetch complete patient data using MRN
      try {
        if (patientMrn) {
          const resp: any = await labApi.getPatientByMrn(patientMrn)
          const pat = resp?.patient
          if (pat) {
            let ageTxt = ''
            try {
              if (pat.age != null) ageTxt = String(pat.age)
              else if (pat.dob) {
                const dob = new Date(pat.dob)
                if (!isNaN(dob.getTime())) ageTxt = String(Math.max(0, Math.floor((Date.now() - dob.getTime()) / 31557600000)))
              }
            } catch {}
            patientData = {
              name: pat.fullName || patientData.name,
              mrn: pat.mrn || patientData.mrn,
              gender: pat.gender || '-',
              fatherName: pat.fatherName || '-',
              phone: pat.phoneNormalized || pat.phone || '-',
              address: pat.address || '-',
              age: ageTxt,
            }
          }
        }
      } catch {}

      // Enrich doctor info from API
      let doctorData: any = {
        name: p.encounterId?.doctorId?.name || doctor?.name || '-',
        specialization: doctor?.specialization || '',
        qualification: doctor?.qualification || '',
        departmentName: doctor?.departmentName || '',
        phone: doctor?.phone || '',
      }
      try {
        const drList: any = await hospitalApi.listDoctors()
        const doctors: any[] = drList?.doctors || []
        const drId = String(p.encounterId?.doctorId?._id || p.encounterId?.doctorId || '')
        const d = doctors.find(x => String(x._id || x.id) === drId)
        if (d) {
          doctorData = {
            name: d.name || doctorData.name,
            specialization: d.specialization || '',
            qualification: d.qualification || '',
            departmentName: doctorData.departmentName,
            phone: d.phone || '',
          }
          // Try to get department name
          try {
            const depRes: any = await hospitalApi.listDepartments({ limit: 1000 })
            const depArray: any[] = (depRes?.departments || depRes || []) as any[]
            const deptName = d?.primaryDepartmentId ? (depArray.find((z: any) => String(z._id || z.id) === String(d.primaryDepartmentId))?.name || '') : ''
            if (deptName) doctorData.departmentName = deptName
          } catch {}
        }
      } catch {}

      // Build data for print preview
      const printData = {
        doctor: doctorData,
        settings: settingsData || settings,
        patient: patientData,
        items: (p.items || []).map((it: any) => {
          const nt = String(it?.notes || '')
          const mRoute = nt.match(/Route:\s*([^;]+)/i)
          const mInstr = nt.match(/Instruction:\s*([^;]+)/i)
          return {
            name: it.name || '',
            frequency: it.frequency || '',
            duration: it.duration || '',
            dose: it.dose || '',
            route: mRoute?.[1]?.trim() || it.route || '',
            instruction: mInstr?.[1]?.trim() || it.instruction || '',
          }
        }),
        labTests: p.labTests || [],
        labNotes: p.labNotes || '',
        diagnosticTests: p.diagnosticTests || [],
        diagnosticNotes: p.diagnosticNotes || '',
        primaryComplaint: p.primaryComplaint || p.complaints || '',
        primaryComplaintHistory: p.primaryComplaintHistory || '',
        familyHistory: p.familyHistory || '',
        allergyHistory: p.allergyHistory || '',
        treatmentHistory: p.treatmentHistory || '',
        history: p.history || '',
        examFindings: p.examFindings || '',
        diagnosis: p.diagnosis || '',
        advice: p.advice || '',
        tokenNo: p.tokenNo || prescription.tokenNo || '',
        createdAt: p.createdAt || prescription.createdAt,
        vitals: p.vitals,
      }

      await previewPrescriptionPdf(printData, 'hospital-rx')
    } catch (e) {
      console.error('Failed to open print preview:', e)
    } finally {
      setViewLoading(false)
    }
  }

  const handleViewAnesthesia = async (prescription: Prescription) => {
    setViewLoading(true)
    try {
      const [detail, s] = await Promise.all([
        hospitalApi.getPrescription(prescription._id) as any,
        hospitalApi.getSettings() as any,
      ])
      const p = detail?.prescription
      if (!p || !p.preAnesthesia?.isApplied) return

      const settingsNorm = { name: s?.name || 'Hospital', address: s?.address || '', phone: s?.phone || '', logoDataUrl: s?.logoDataUrl || '' }
      
      let patientData: any = { name: p.encounterId?.patientId?.fullName || patient?.name || '-', mrn: p.mrNo || patient?.mrn || '-' }
      try {
        const resp: any = await labApi.getPatientByMrn(patientData.mrn)
        const pat = resp?.patient
        if (pat) {
          let ageTxt = ''
          try {
            if (pat.age != null) ageTxt = String(pat.age)
            else if (pat.dob) { const dob = new Date(pat.dob); if (!isNaN(dob.getTime())) ageTxt = String(Math.max(0, Math.floor((Date.now()-dob.getTime())/31557600000))) }
          } catch {}
          patientData = { name: pat.fullName || patientData.name, mrn: pat.mrn || patientData.mrn, gender: pat.gender || '-', fatherName: pat.fatherName || '-', phone: pat.phoneNormalized || '-', address: pat.address || '-', age: ageTxt }
        }
      } catch {}

      const doctorData = { 
        name: p.encounterId?.doctorId?.name || doctor?.name || '-', 
        qualification: doctor?.qualification || '', 
        departmentName: doctor?.departmentName || '', 
        phone: doctor?.phone || '',
        specialization: doctor?.specialization || ''
      }

      await previewPreAnesthesiaPdf({
        doctor: doctorData,
        settings: settingsNorm,
        patient: patientData,
        preAnesthesia: p.preAnesthesia,
        vitals: p.vitals,
        createdAt: p.createdAt || prescription.createdAt,
      })
    } catch (e) {
      console.error('Failed to open anesthesia print preview:', e)
    } finally {
      setViewLoading(false)
    }
  }

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString)
      return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    } catch {
      return dateString
    }
  }

  if (!isOpen) return null

  return (
    <>
      <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 px-2 sm:px-4">
        <div className="w-full max-w-4xl rounded-xl bg-white shadow-2xl ring-1 ring-black/5">
          <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
            <div className="text-base font-semibold text-slate-900">Previous Prescriptions</div>
            <button onClick={onClose} className="rounded-md border border-slate-300 px-3 py-1 text-sm hover:bg-slate-50">Close</button>
          </div>
          <div className="max-h-[85vh] overflow-y-auto p-4">
            {loading ? (
              <div className="text-center text-slate-500">Loading...</div>
            ) : prescriptions.length === 0 ? (
              <div className="text-center text-slate-500">No previous prescriptions found</div>
            ) : (
              <div className="max-h-[60vh] space-y-4 overflow-y-auto pr-2">
                {prescriptions.map((prescription) => (
                  <div key={prescription._id} className="rounded-lg border border-slate-200 p-4">
                    <div className="mb-2 flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <div className="text-sm font-semibold text-slate-900">
                            {formatDate(prescription.createdAt)}
                          </div>
                          {prescription.source === 'ipd_discharge' && (
                            <span className="rounded-full bg-purple-100 px-2 py-0.5 text-xs font-medium text-purple-700">
                              IPD Discharge
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-slate-500">
                          {prescription.tokenNo ? `${prescription.source === 'ipd_discharge' ? 'Admission' : 'Token'}: ${prescription.tokenNo}` : ''} 
                          {prescription.createdBy ? ` • By: ${prescription.createdBy}` : ''}
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <button
                          onClick={() => handleView(prescription)}
                          disabled={viewLoading}
                          title="Print Prescription"
                          className="flex items-center gap-1.5 rounded-md border border-blue-600 bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700 hover:bg-blue-100 disabled:opacity-50"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>
                          {viewLoading ? 'Loading...' : 'Print Rx'}
                        </button>
                        <button
                          onClick={() => handleViewAnesthesia(prescription)}
                          disabled={viewLoading || !prescription.preAnesthesia?.isApplied}
                          title={!prescription.preAnesthesia?.isApplied ? 'No Preassessment form in this prescription' : 'Print Preassessment Form'}
                          className="flex items-center gap-1.5 rounded-md border border-teal-600 bg-teal-50 px-3 py-1 text-xs font-semibold text-teal-700 hover:bg-teal-100 disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>
                          {viewLoading ? '...' : 'Print Preassessment'}
                        </button>
                        <button
                          onClick={() => handlePrescribeSame(prescription)}
                          className="rounded-md border border-green-600 bg-green-50 px-3 py-1 text-xs font-semibold text-green-700 hover:bg-green-100"
                        >
                          Prescribe Same
                        </button>
                      </div>
                    </div>
                    {prescription.primaryComplaint && (
                      <div className="mb-1 text-sm">
                        <span className="font-semibold text-slate-700">Complaint:</span>{' '}
                        <span className="text-slate-600">{prescription.primaryComplaint}</span>
                      </div>
                    )}
                    {prescription.diagnosis && (
                      <div className="mb-1 text-sm">
                        <span className="font-semibold text-slate-700">Diagnosis:</span>{' '}
                        <span className="text-slate-600">{prescription.diagnosis}</span>
                      </div>
                    )}
                    {prescription.items && prescription.items.length > 0 && (
                      <div className="mt-2 text-sm">
                        <span className="font-semibold text-slate-700">Medicines:</span>
                        <div className="mt-1 space-y-1">
                          {prescription.items.map((item, i) => (
                            <div key={i} className="text-slate-600 flex flex-wrap gap-x-3 text-xs">
                              <span className="font-medium">{i + 1}. {item.name || item.medicine || '-'}</span>
                              {item.dose && <span className="text-slate-500">Dose: {item.dose}</span>}
                              {item.frequency && <span className="text-slate-500">Freq: {item.frequency}</span>}
                              {item.duration && <span className="text-slate-500">Dur: {item.duration}</span>}
                              {item.route && <span className="text-slate-500">Route: {item.route}</span>}
                              {item.instruction && <span className="text-slate-500">Instr: {item.instruction}</span>}
                              {item.notes && <span className="text-slate-500">Notes: {item.notes}</span>}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

    </>
  )
}
