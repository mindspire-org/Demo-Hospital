import { z } from 'zod'

export const createErReferralSchema = z.object({
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
  priority: z.enum(['Regular','Urgent','Critical']).optional(),
  referredByDoctorId: z.string().optional(),
})

export const updateErReferralSchema = z.object({
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
  priority: z.enum(['Regular','Urgent','Critical']).optional(),
})

export const updateErReferralStatusSchema = z.object({
  action: z.enum(['accept','reject','reopen']),
  note: z.string().optional(),
})

export const startErVisitSchema = z.object({
  departmentId: z.string().min(1),
  doctorId: z.string().optional(),
  bedId: z.string().min(1, 'Bed is mandatory'),
  triage: z.enum(['red', 'yellow', 'green']).optional(),
  arrivalMode: z.enum(['walk-in', 'ambulance', 'referral']).default('referral'),
})
