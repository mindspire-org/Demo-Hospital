import { z } from 'zod'

export const sessionTypeCreateSchema = z.object({
  name: z.string().min(1),
  code: z.string().optional(),
  price: z.number().min(0).optional(),
  active: z.boolean().optional(),
})

export const sessionTypeUpdateSchema = z.object({
  name: z.string().optional(),
  code: z.string().optional(),
  price: z.number().min(0).optional(),
  active: z.boolean().optional(),
})

export type SessionTypeCreate = z.infer<typeof sessionTypeCreateSchema>
export type SessionTypeUpdate = z.infer<typeof sessionTypeUpdateSchema>
