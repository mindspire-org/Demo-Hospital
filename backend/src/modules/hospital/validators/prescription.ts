import { z } from 'zod'

const itemSchema = z.object({
  name: z.string().min(1),
  dose: z.string().optional(),
  frequency: z.string().optional(),
  duration: z.string().optional(),
  notes: z.string().optional(),
  route: z.string().optional(),
  instruction: z.string().optional(),
})

const manualAttachmentSchema = z.object({
  mimeType: z.string().optional(),
  fileName: z.string().optional(),
  dataUrl: z.string().optional(),
}).partial()

const preAnesthesiaSchema = z.object({
  isApplied: z.boolean().default(false),
  history: z.object({
    cvs: z.string().optional().nullable(),
    respiratory: z.string().optional().nullable(),
    renal: z.string().optional().nullable(),
    hepatic: z.string().optional().nullable(),
    diabetic: z.string().optional().nullable(),
    neurology: z.string().optional().nullable(),
    previousAnesthesia: z.string().optional().nullable(),
    allergies: z.string().optional().nullable(),
  }).partial().optional(),
  examination: z.object({
    mallampatiScore: z.string().optional().nullable(),
    asaClass: z.string().optional().nullable(),
    airway: z.string().optional().nullable(),
    teeth: z.string().optional().nullable(),
    notes: z.string().optional().nullable(),
  }).partial().optional(),
  recommendation: z.string().optional().nullable(),
}).partial().optional()

const dentalChartSchema = z.object({
  teeth: z.array(z.object({
    toothId: z.coerce.number(),
    condition: z.string().optional().nullable(),
    notes: z.string().optional().nullable(),
  })).optional(),
  generalNotes: z.string().optional().nullable(),
}).partial().optional()

const glassesSchema = z.object({
  sph: z.string().optional().nullable(),
  cyl: z.string().optional().nullable(),
  axis: z.string().optional().nullable(),
  add: z.string().optional().nullable(),
}).partial().optional()

const eyeExaminationSchema = z.object({
  visualAcuityRight: z.string().optional().nullable(),
  visualAcuityLeft: z.string().optional().nullable(),
  nearVisionRight: z.string().optional().nullable(),
  nearVisionLeft: z.string().optional().nullable(),
  iopRight: z.string().optional().nullable(),
  iopLeft: z.string().optional().nullable(),
  refractionRight: z.string().optional().nullable(),
  refractionLeft: z.string().optional().nullable(),
  slitLamp: z.string().optional().nullable(),
  fundus: z.string().optional().nullable(),
  diagnosis: z.string().optional().nullable(),
  glassesRight: glassesSchema,
  glassesLeft: glassesSchema,
  generalNotes: z.string().optional().nullable(),
}).partial().optional()

// Generic department-specific clinical payload. The concrete shape of `data`
// is owned by each department module on the frontend; here we accept any object
// and only constrain the discriminator. Per-type validators can be added to
// departmentClinicalValidators below as departments harden.
const departmentClinicalSchema = z.object({
  type: z.string().optional().nullable(),
  data: z.any().optional().nullable(),
}).partial().optional()

const baseSchema = z.object({
  encounterId: z.string().min(1),
  status: z.enum(['draft','final']).optional(),
  prescriptionMode: z.enum(['electronic','manual']).optional(),
  manualAttachment: manualAttachmentSchema.optional(),
  labTests: z.array(z.string().min(1)).optional(),
  labNotes: z.string().optional(),
  diagnosticTests: z.array(z.string().min(1)).optional(),
  diagnosticNotes: z.string().optional(),
  primaryComplaint: z.string().optional(),
  primaryComplaintHistory: z.string().optional(),
  familyHistory: z.string().optional(),
  treatmentHistory: z.string().optional(),
  allergyHistory: z.string().optional(),
  history: z.string().optional(),
  examFindings: z.string().optional(),
  diagnosis: z.string().optional(),
  advice: z.string().optional(),
  nextFollowUp: z.string().optional(),
  vitals: z.object({
    pulse: z.coerce.number().optional(),
    temperatureC: z.coerce.number().optional(),
    bloodPressureSys: z.coerce.number().optional(),
    bloodPressureDia: z.coerce.number().optional(),
    respiratoryRate: z.coerce.number().optional(),
    bloodSugar: z.coerce.number().optional(),
    weightKg: z.coerce.number().optional(),
    heightCm: z.coerce.number().optional(),
    bmi: z.coerce.number().optional(),
    bsa: z.coerce.number().optional(),
    spo2: z.coerce.number().optional(),
    ar: z.string().optional(),
    va: z.string().optional(),
    iop: z.string().optional(),
  }).partial().optional(),
  preAnesthesia: preAnesthesiaSchema,
  dentalChart: dentalChartSchema,
  eyeExamination: eyeExaminationSchema,
  departmentClinical: departmentClinicalSchema,
  createdBy: z.string().optional(),
})

export const createPrescriptionSchema = z.union([
  baseSchema.extend({
    prescriptionMode: z.literal('manual'),
    manualAttachment: manualAttachmentSchema.extend({ dataUrl: z.string().min(10) }),
    items: z.array(itemSchema).optional(),
  }),
  // Electronic: a draft (investigations advised, treatment pending) may have no
  // medicines yet, so items is optional here; the frontend enforces ≥1 for final.
  baseSchema.extend({ prescriptionMode: z.literal('electronic').optional(), items: z.array(itemSchema).optional().default([]) }),
])

export const updatePrescriptionSchema = z.object({
  items: z.array(z.object({
    name: z.string().min(1),
    dose: z.string().optional(),
    frequency: z.string().optional(),
    duration: z.string().optional(),
    notes: z.string().optional(),
    route: z.string().optional(),
    instruction: z.string().optional(),
  })).min(1).optional(),
  status: z.enum(['draft','final']).optional(),
  prescriptionMode: z.enum(['electronic','manual']).optional(),
  manualAttachment: manualAttachmentSchema.optional(),
  labTests: z.array(z.string().min(1)).optional(),
  labNotes: z.string().optional(),
  diagnosticTests: z.array(z.string().min(1)).optional(),
  diagnosticNotes: z.string().optional(),
  primaryComplaint: z.string().optional(),
  primaryComplaintHistory: z.string().optional(),
  familyHistory: z.string().optional(),
  treatmentHistory: z.string().optional(),
  allergyHistory: z.string().optional(),
  history: z.string().optional(),
  examFindings: z.string().optional(),
  diagnosis: z.string().optional(),
  advice: z.string().optional(),
  nextFollowUp: z.string().optional(),
  vitals: z.object({
    pulse: z.coerce.number().optional(),
    temperatureC: z.coerce.number().optional(),
    bloodPressureSys: z.coerce.number().optional(),
    bloodPressureDia: z.coerce.number().optional(),
    respiratoryRate: z.coerce.number().optional(),
    bloodSugar: z.coerce.number().optional(),
    weightKg: z.coerce.number().optional(),
    heightCm: z.coerce.number().optional(),
    bmi: z.coerce.number().optional(),
    bsa: z.coerce.number().optional(),
    spo2: z.coerce.number().optional(),
    ar: z.string().optional(),
    va: z.string().optional(),
    iop: z.string().optional(),
  }).partial().optional(),
  preAnesthesia: preAnesthesiaSchema,
  dentalChart: dentalChartSchema,
  eyeExamination: eyeExaminationSchema,
  departmentClinical: departmentClinicalSchema,
})
