import { previewHospitalRxPdf } from './prescription/templates/hospitalRxPdf'
import { previewMinimalRxPdf } from './prescription/templates/minimalRx'
import { previewLetterheadRxPdf } from './prescription/templates/letterheadRx'
import { previewNoHeaderRxPdf } from './prescription/templates/noHeaderRx'
import { previewSpecialistClinicPdf, type SpecialistClinicPdfData } from './prescription/templates/specialistClinicPrescription'
import { previewMinimalCleanPdf } from './prescription/templates/minimalClean'
import { previewModernGradientPdf } from './prescription/templates/modernGradient'
import { previewClinicalProfessionalPdf } from './prescription/templates/clinicalProfessional'
import { previewPremiumDarkHeaderPdf } from './prescription/templates/premiumDarkHeader'
import { previewCompactPharmacyPdf } from './prescription/templates/compactPharmacy'
import { previewPediatricFriendlyPdf } from './prescription/templates/pediatricFriendly'
import { previewBilingualRxPdf } from './prescription/templates/bilingualRx'
import { buildPrescriptionOne } from './prescription/templates/templateOne'
import { buildPrescriptionTwo } from './prescription/templates/templateTwo'

export type PrescriptionPdfData = {
  doctor?: { name?: string; qualification?: string; departmentName?: string; phone?: string; title?: string; specialization?: string }
  settings?: { name?: string; address?: string; phone?: string; email?: string; website?: string; logoDataUrl?: string }
  patient?: { name?: string; mrn?: string; gender?: string; fatherName?: string; age?: string; phone?: string; address?: string; cnic?: string }
  items?: Array<{ name?: string; genericName?: string; company?: string; frequency?: string; duration?: string; dose?: string; instruction?: string; route?: string; notes?: string; qty?: number | string }>
  primaryComplaint?: string
  primaryComplaintHistory?: string
  familyHistory?: string
  allergyHistory?: string
  treatmentHistory?: string
  history?: string
  examFindings?: string
  diagnosis?: string
  advice?: string
  nextFollowUp?: string
  tokenNo?: string
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
    ar?: string
    va?: string
    iop?: string
  }
  labTests?: string[]
  labNotes?: string
  diagnosticTests?: string[]
  diagnosticNotes?: string
  createdAt?: string | Date
  language?: 'english' | 'urdu'
}

export type PrescriptionPdfTemplate =
  | 'hospital-rx'
  | 'minimal-rx'
  | 'letterhead-rx'
  | 'no-header-rx'
  | 'specialist-clinic'
  | 'minimal-clean'
  | 'modern-gradient'
  | 'clinical-professional'
  | 'premium-dark-header'
  | 'compact-pharmacy'
  | 'pediatric-friendly'
  | 'template-one'
  | 'template-two'
  | 'bilingual-rx'

export const PRESCRIPTION_PDF_TEMPLATES: PrescriptionPdfTemplate[] = [
  'hospital-rx',
  'minimal-rx',
  'letterhead-rx',
  'no-header-rx',
  'specialist-clinic',
  'minimal-clean',
  'modern-gradient',
  'clinical-professional',
  'premium-dark-header',
  'compact-pharmacy',
  'pediatric-friendly',
  'template-one',
  'template-two',
  'bilingual-rx',
]

export const TEMPLATE_LABELS: Record<PrescriptionPdfTemplate, string> = {
  'hospital-rx':          'Template 1',
  'minimal-rx':           'Template 2',
  'letterhead-rx':        'Template 3',
  'no-header-rx':         'Without Header and Footer',
  'specialist-clinic':    'Template 4',
  'minimal-clean':        'Template 5',
  'modern-gradient':      'Template 6',
  'clinical-professional':'Template 7',
  'premium-dark-header':  'Template 8',
  'compact-pharmacy':     'Template 9',
  'pediatric-friendly':   'Template 10',
  'template-one':         'Template 11',
  'template-two':         'Template 12',
  'bilingual-rx':         'Bilingual Rx',
}

export const TEMPLATE_DESCRIPTIONS: Record<PrescriptionPdfTemplate, string> = {
  'hospital-rx':          'Teal header · clean columns · modern feel',
  'minimal-rx':           'Pure B&W · newspaper typography · no colour',
  'letterhead-rx':        'Cream & navy · formal letterhead · gold accents',
  'no-header-rx':         'No digital header/footer · blank space for pre-printed paper',
  'specialist-clinic':    'Dark sidebar · amber highlights · two-panel',
  'minimal-clean':        'Ultra-clean · open whitespace · simple grid',
  'modern-gradient':      'Gradient header · vibrant accent · airy layout',
  'clinical-professional':'Structured sections · blue tones · detailed grid',
  'premium-dark-header':  'Deep dark header · bold contrast · executive look',
  'compact-pharmacy':     'Compact layout · pharmacy-style · dense info',
  'pediatric-friendly':   'Colourful · child-friendly · large readable type',
  'template-one':         'Custom clinic layout — style A',
  'template-two':         'Custom clinic layout — style B',
  'bilingual-rx':         'English + Urdu side-by-side with auto date ranges',
}

export function isPrescriptionPdfTemplate(v: any): v is PrescriptionPdfTemplate {
  return PRESCRIPTION_PDF_TEMPLATES.includes(v)
}

export function getSavedPrescriptionPdfTemplate(doctorId?: string | null): PrescriptionPdfTemplate {
  try {
    const k = `doctor.rx.template.${doctorId || 'anon'}`
    const raw = localStorage.getItem(k)
    if (isPrescriptionPdfTemplate(raw)) return raw
  } catch {}
  return 'hospital-rx'
}

async function renderTemplate(data: PrescriptionPdfData, template: PrescriptionPdfTemplate) {
  switch (template) {
    case 'minimal-rx':
      await previewMinimalRxPdf(data as any)
      return
    case 'letterhead-rx':
      await previewLetterheadRxPdf(data as any)
      return
    case 'no-header-rx':
      await previewNoHeaderRxPdf(data as any)
      return
    case 'specialist-clinic':
      await previewSpecialistClinicPdf(data as SpecialistClinicPdfData)
      return
    case 'minimal-clean':
      await previewMinimalCleanPdf(data as any)
      return
    case 'modern-gradient':
      await previewModernGradientPdf(data as any)
      return
    case 'clinical-professional':
      await previewClinicalProfessionalPdf(data as any)
      return
    case 'premium-dark-header':
      await previewPremiumDarkHeaderPdf(data as any)
      return
    case 'compact-pharmacy':
      await previewCompactPharmacyPdf(data as any)
      return
    case 'pediatric-friendly':
      await previewPediatricFriendlyPdf(data as any)
      return
    case 'template-one': {
      try {
        const pdf1 = await buildPrescriptionOne(data)
        const blobUrl = pdf1.output('bloburl')
        window.open(blobUrl, '_blank')
      } catch (e: any) {
        console.error('Template 11 failed:', e)
        alert('Failed to generate Template 11 PDF: ' + (e?.message || 'Unknown error'))
      }
      return
    }
    case 'template-two': {
      const pdf2 = await buildPrescriptionTwo(data)
      window.open(pdf2.output('bloburl'), '_blank')
      return
    }
    case 'bilingual-rx':
      await previewBilingualRxPdf(data)
      return
    default:
      await previewHospitalRxPdf(data)
  }
}

export async function downloadPrescriptionPdf(data: PrescriptionPdfData, _fileName: string, template?: PrescriptionPdfTemplate){
  await previewPrescriptionPdf(data, template || 'hospital-rx')
}

export async function previewPrescriptionPdf(data: PrescriptionPdfData, template: PrescriptionPdfTemplate = 'hospital-rx'){
  await renderTemplate(data, template)
}
