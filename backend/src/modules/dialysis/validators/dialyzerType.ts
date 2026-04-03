import { z } from 'zod'

export const dialyzerTypeCreateSchema = z.object({
  name: z.string().min(1),
  active: z.boolean().optional(),
})

export const dialyzerTypeUpdateSchema = z.object({
  name: z.string().optional(),
  active: z.boolean().optional(),
})

export type DialyzerTypeCreate = z.infer<typeof dialyzerTypeCreateSchema>
export type DialyzerTypeUpdate = z.infer<typeof dialyzerTypeUpdateSchema>
