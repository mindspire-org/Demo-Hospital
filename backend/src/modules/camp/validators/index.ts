import { z } from 'zod'

export const campCreateSchema = z.object({
  name: z.string().min(1),
  location: z.string().min(1),
  address: z.string().optional(),
  startDate: z.string().or(z.date()),
  endDate: z.string().or(z.date()),
  status: z.enum(['planned', 'active', 'completed', 'cancelled']).optional(),
  organizer: z.string().optional(),
  contactPhone: z.string().optional(),
  description: z.string().optional(),
  notes: z.string().optional(),
  lat: z.number().optional(),
  lng: z.number().optional(),
  expectedPatients: z.number().optional(),
})

export const campUpdateSchema = z.object({
  name: z.string().optional(),
  location: z.string().optional(),
  address: z.string().optional(),
  startDate: z.string().or(z.date()).optional(),
  endDate: z.string().or(z.date()).optional(),
  status: z.enum(['planned', 'active', 'completed', 'cancelled']).optional(),
  organizer: z.string().optional(),
  contactPhone: z.string().optional(),
  description: z.string().optional(),
  notes: z.string().optional(),
  lat: z.number().optional(),
  lng: z.number().optional(),
  expectedPatients: z.number().optional(),
})

export const campPatientCreateSchema = z.object({
  campId: z.string().min(1),
  tokenNo: z.string().min(1),
  fullName: z.string().min(1),
  age: z.string().optional(),
  gender: z.enum(['Male', 'Female', 'Other', '']).optional(),
  phone: z.string().optional(),
  address: z.string().optional(),
  mrn: z.string().optional(),
  vitals: z.record(z.string()).optional(),
  chiefComplaint: z.string().optional(),
  history: z.string().optional(),
  examination: z.string().optional(),
  diagnosis: z.string().optional(),
  prescription: z.string().optional(),
  referredBy: z.string().optional(),
  consultedBy: z.string().optional(),
})

export const campPatientUpdateSchema = z.object({
  fullName: z.string().optional(),
  age: z.string().optional(),
  gender: z.enum(['Male', 'Female', 'Other', '']).optional(),
  phone: z.string().optional(),
  address: z.string().optional(),
  mrn: z.string().optional(),
  vitals: z.record(z.string()).optional(),
  chiefComplaint: z.string().optional(),
  history: z.string().optional(),
  examination: z.string().optional(),
  diagnosis: z.string().optional(),
  prescription: z.string().optional(),
  labOrders: z.array(z.object({ testName: z.string().optional(), status: z.string().optional(), result: z.string().optional(), labOrderId: z.string().optional() })).optional(),
  diagnosticOrders: z.array(z.object({ testName: z.string().optional(), status: z.string().optional(), result: z.string().optional(), diagnosticOrderId: z.string().optional() })).optional(),
  medicinesDispensed: z.array(z.object({ name: z.string().optional(), qty: z.string().optional(), dosage: z.string().optional(), timing: z.string().optional(), days: z.string().optional() })).optional(),
  referredToHospital: z.boolean().optional(),
  hospitalPatientId: z.string().optional(),
  referredBy: z.string().optional(),
  consultedBy: z.string().optional(),
  consultationDate: z.string().or(z.date()).optional(),
})

export const campSessionCreateSchema = z.object({
  campId: z.string().min(1),
  date: z.string().or(z.date()),
  doctorsAssigned: z.number().optional(),
  nursesAssigned: z.number().optional(),
  pharmacistsAssigned: z.number().optional(),
  labTechsAssigned: z.number().optional(),
  notes: z.string().optional(),
})

export const campSessionUpdateSchema = z.object({
  doctorsAssigned: z.number().optional(),
  nursesAssigned: z.number().optional(),
  pharmacistsAssigned: z.number().optional(),
  labTechsAssigned: z.number().optional(),
  patientsRegistered: z.number().optional(),
  patientsConsulted: z.number().optional(),
  prescriptionsIssued: z.number().optional(),
  labOrdersSent: z.number().optional(),
  diagnosticOrdersSent: z.number().optional(),
  medicinesDispensed: z.number().optional(),
  notes: z.string().optional(),
})

export const campStaffCreateSchema = z.object({
  campId: z.string().min(1),
  userId: z.string().min(1),
  role: z.enum(['doctor', 'nurse', 'pharmacist', 'lab-tech', 'coordinator']),
  fullName: z.string().min(1),
  phone: z.string().optional(),
  email: z.string().optional(),
  startDate: z.string().or(z.date()),
  endDate: z.string().or(z.date()),
  shift: z.string().optional(),
  notes: z.string().optional(),
})

export const campStaffUpdateSchema = z.object({
  role: z.enum(['doctor', 'nurse', 'pharmacist', 'lab-tech', 'coordinator']).optional(),
  fullName: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().optional(),
  startDate: z.string().or(z.date()).optional(),
  endDate: z.string().or(z.date()).optional(),
  shift: z.string().optional(),
  notes: z.string().optional(),
  active: z.boolean().optional(),
})

export const campSettingsUpdateSchema = z.object({
  campName: z.string().optional(),
  phone: z.string().optional(),
  address: z.string().optional(),
  email: z.string().optional(),
  reportFooter: z.string().optional(),
  logoDataUrl: z.string().optional(),
  defaultTokenPrefix: z.string().optional(),
})

export const campUserCreateSchema = z.object({
  username: z.string().min(1),
  fullName: z.string().optional(),
  role: z.string().optional(),
  password: z.string().min(1),
  active: z.boolean().optional(),
})

export const campUserUpdateSchema = z.object({
  username: z.string().optional(),
  fullName: z.string().optional(),
  role: z.string().optional(),
  password: z.string().optional(),
  active: z.boolean().optional(),
})
