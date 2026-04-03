import { z } from 'zod'

export const shiftCreateSchema = z.object({
  name: z.string().min(1),
  start: z.string().optional(),
  end: z.string().optional(),
  active: z.boolean().optional(),
})

export const shiftUpdateSchema = z.object({
  name: z.string().optional(),
  start: z.string().optional(),
  end: z.string().optional(),
  active: z.boolean().optional(),
})

export type ShiftCreate = z.infer<typeof shiftCreateSchema>
export type ShiftUpdate = z.infer<typeof shiftUpdateSchema>
