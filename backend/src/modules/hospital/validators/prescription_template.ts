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

export const createPrescriptionTemplateSchema = z.object({
  doctorId: z.string().min(1),
  name: z.string().min(1),
  items: z.array(itemSchema).optional(),
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
})

export const updatePrescriptionTemplateSchema = z.object({
  name: z.string().min(1).optional(),
  items: z.array(itemSchema).optional(),
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
})
