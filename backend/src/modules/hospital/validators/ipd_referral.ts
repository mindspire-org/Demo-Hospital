import { z } from 'zod'

export const createIpdReferralSchema = z.object({
  patientId: z.string().min(1),
  referralDate: z.string().optional(),
  referralTime: z.string().optional(),
  reasonOfReferral: z.string().optional(),
  provisionalDiagnosis: z.string().optional(),
  vitals: z.object({
    bp: z.string().optional(),
    pulse: z.number().optional(),
    temperature: z.number().optional(),
    rr: z.number().optional(),
  }).optional(),
  referredTo: z.object({
    departmentId: z.string().optional(),
    doctorId: z.string().optional(),
  }).optional(),
  condition: z.object({
    stability: z.enum(['Stable','Unstable']).optional(),
    consciousness: z.enum(['Conscious','Unconscious']).optional(),
  }).optional(),
  remarks: z.string().optional(),
  signStamp: z.string().optional(),
  referredByDoctorId: z.string().optional(),
  prescriptionSnapshot: z.object({
    primaryComplaint: z.string().optional(),
    primaryComplaintHistory: z.string().optional(),
    familyHistory: z.string().optional(),
    allergyHistory: z.string().optional(),
    treatmentHistory: z.string().optional(),
    history: z.string().optional(),
    examFindings: z.string().optional(),
    diagnosis: z.string().optional(),
    advice: z.string().optional(),
    nextFollowUp: z.string().optional(),
    items: z.array(z.object({
      name: z.string().optional(),
      dose: z.string().optional(),
      frequency: z.string().optional(),
      duration: z.string().optional(),
      instruction: z.string().optional(),
      route: z.string().optional(),
      notes: z.string().optional(),
    })).optional(),
    vitals: z.object({
      pulse: z.number().optional(),
      temperatureC: z.number().optional(),
      bloodPressureSys: z.number().optional(),
      bloodPressureDia: z.number().optional(),
      respiratoryRate: z.number().optional(),
      bloodSugar: z.number().optional(),
      weightKg: z.number().optional(),
      heightCm: z.number().optional(),
      spo2: z.number().optional(),
    }).optional(),
    labTests: z.array(z.string()).optional(),
    diagnosticTests: z.array(z.string()).optional(),
  }).optional(),
})

export const updateIpdReferralSchema = z.object({
  referralDate: z.string().optional(),
  referralTime: z.string().optional(),
  reasonOfReferral: z.string().optional(),
  provisionalDiagnosis: z.string().optional(),
  vitals: z.object({
    bp: z.string().optional(),
    pulse: z.number().optional(),
    temperature: z.number().optional(),
    rr: z.number().optional(),
  }).optional(),
  referredTo: z.object({
    departmentId: z.string().optional(),
    doctorId: z.string().optional(),
  }).optional(),
  condition: z.object({
    stability: z.enum(['Stable','Unstable']).optional(),
    consciousness: z.enum(['Conscious','Unconscious']).optional(),
  }).optional(),
  remarks: z.string().optional(),
  signStamp: z.string().optional(),
})

export const updateIpdReferralStatusSchema = z.object({
  action: z.enum(['accept','reject','reopen']),
  note: z.string().optional(),
})

export const admitFromReferralSchema = z.object({
  departmentId: z.string().min(1),
  doctorId: z.string().optional(),
  wardId: z.string().optional(),
  bedId: z.string().optional(),
  deposit: z.number().optional(),
  tokenFee: z.number().optional(),
})
