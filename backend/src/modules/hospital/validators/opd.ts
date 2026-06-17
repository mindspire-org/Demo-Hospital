import { z } from 'zod'

export const createOPDEncounterSchema = z.object({
  patientId: z.string().min(1),
  departmentId: z.string().min(1),
  doctorId: z.string().optional(),
  visitType: z.enum(['new','followup']).default('new'),
  visitCategory: z.enum(['general','private','subsidized']).optional(),
  corporateId: z.string().optional(),
  paymentRef: z.string().optional(),
})

export const quoteOPDPriceSchema = z.object({
  departmentId: z.string().min(1),
  doctorId: z.string().optional(),
  visitType: z.enum(['new','followup']).default('new'),
  visitCategory: z.enum(['general','private','subsidized']).default('general'),
  corporateId: z.string().optional(),
})
