import { z } from 'zod'

export const loginSchema = z.object({
  username: z.string().optional(),
  password: z.string().optional(),
  masterKey: z.string().optional(),
})

export const setupSchema = z.object({
  masterKey: z.string().min(1),
  clientName: z.string().min(1),
  contactPerson: z.string().min(1),
  contactPhone: z.string().min(1),
  contactEmail: z.string().email().optional(),
  hospitalName: z.string().min(1),
  address: z.string().optional(),
  city: z.string().optional(),
  country: z.string().optional(),
  maxUsers: z.number().int().min(0).default(0),
  adminUsername: z.string().min(3),
  adminPassword: z.string().min(6),
  adminFullName: z.string().optional(),
})

export const createAdminSchema = z.object({
  username: z.string().min(3),
  password: z.string().min(6),
  fullName: z.string().optional(),
  email: z.string().email().optional(),
  phone: z.string().optional(),
})

export const updateConfigSchema = z.object({
  modules: z.record(z.object({
    enabled: z.boolean(),
    subModules: z.record(z.object({
      enabled: z.boolean(),
    })).optional(),
  })).optional(),
  homeModules: z.array(z.string()).optional(),
  version: z.number().int().min(1),
})

export const updateClientSchema = z.object({
  clientName: z.string().min(1).optional(),
  contactPerson: z.string().optional(),
  contactPhone: z.string().optional(),
  contactEmail: z.string().email().optional().or(z.literal('')),
  hospitalName: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  country: z.string().optional(),
  maxUsers: z.number().int().min(0).optional(),
})

export const auditLogQuerySchema = z.object({
  action: z.string().optional(),
  actor: z.string().optional(),
  from: z.string().optional(),
  to: z.string().optional(),
  limit: z.string().transform(Number).optional(),
  page: z.string().transform(Number).optional(),
})
