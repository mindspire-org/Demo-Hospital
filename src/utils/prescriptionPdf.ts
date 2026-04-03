import { previewHospitalRxPdf } from './prescription/templates/hospitalRxPdf'
import { previewSpecialistClinicPdf, type SpecialistClinicPdfData } from './prescription/templates/specialistClinicPrescription'

export type PrescriptionPdfData = {
  doctor?: { name?: string; qualification?: string; departmentName?: string; phone?: string; title?: string; specialization?: string }
  settings?: { name?: string; address?: string; phone?: string; logoDataUrl?: string }
  patient?: { name?: string; mrn?: string; gender?: string; fatherName?: string; age?: string; phone?: string; address?: string; cnic?: string }
  items?: Array<{ name?: string; frequency?: string; duration?: string; dose?: string; instruction?: string; route?: string; qty?: number | string }>
  primaryComplaint?: string
  primaryComplaintHistory?: string
  familyHistory?: string
  allergyHistory?: string
  treatmentHistory?: string
  history?: string
  examFindings?: string
  diagnosis?: string
  advice?: string
  vitals?: {
    pulse?: number
    temperatureC?: number
    temperatureF?: number
    bloodPressureSys?: number
    bloodPressureDia?: number
    respiratoryRate?: number
    bloodSugar?: number
    weightKg?: number
    heightCm?: number
    bmi?: number
    bsa?: number
    spo2?: number
  }
  labTests?: string[]
  labNotes?: string
  diagnosticTests?: string[]
  diagnosticNotes?: string
  createdAt?: string | Date
}

export type PrescriptionPdfTemplate = 'hospital-rx' | 'specialist-clinic'

export const PRESCRIPTION_PDF_TEMPLATES: PrescriptionPdfTemplate[] = ['hospital-rx', 'specialist-clinic']

export function isPrescriptionPdfTemplate(v: any): v is PrescriptionPdfTemplate {
  return PRESCRIPTION_PDF_TEMPLATES.includes(v)
}

export function getSavedPrescriptionPdfTemplate(doctorId?: string | null): PrescriptionPdfTemplate {
  try {
    const k = `doctor.rx.template.${doctorId || 'anon'}`
    const raw = localStorage.getItem(k)
    if (raw === 'hospital-rx') return 'hospital-rx'
    if (raw === 'specialist-clinic') return 'specialist-clinic'
  } catch {}
  return 'hospital-rx'
}

export async function downloadPrescriptionPdf(data: PrescriptionPdfData, fileName: string, template?: PrescriptionPdfTemplate){
  const t = template || 'hospital-rx'
  if (t === 'specialist-clinic') {
    await previewSpecialistClinicPdf(data as SpecialistClinicPdfData)
    return
  }
  const pdf = await previewHospitalRxPdf(data)
  // Rebuild for saving if needed
  // Use the pdf output to save
  try {
    (pdf as any).save(fileName)
  } catch {
    // Fallback: create blob and download
    const blob = (pdf as any).output('blob') as Blob
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = fileName
    a.click()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
  }
}

export async function previewPrescriptionPdf(data: PrescriptionPdfData, template?: PrescriptionPdfTemplate){
  const t = template || 'hospital-rx'
  if (t === 'specialist-clinic') {
    await previewSpecialistClinicPdf(data as SpecialistClinicPdfData)
    return
  }
  await previewHospitalRxPdf(data)
}
