import { z } from 'zod'

export const upsertStaffSchema = z.object({
  name: z.string().min(1),
  role: z.string().min(1),
  phone: z.string().optional(),
  salary: z.number().min(0).optional(),
  shiftId: z.string().optional(),
  joinDate: z.string().optional(),
  address: z.string().optional(),
  active: z.boolean().optional(),
  leaveQuotas: z.object({
    annual: z.number().min(0).default(0),
    casual: z.number().min(0).default(0),
    sick: z.number().min(0).default(0),
  }).optional(),
})
