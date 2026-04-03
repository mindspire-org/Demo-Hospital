import { z } from 'zod'

export const machineCreateSchema = z.object({
  name: z.string().min(1),
  code: z.string().optional(),
  status: z.string().optional(),
  active: z.boolean().optional(),
})

export const machineUpdateSchema = z.object({
  name: z.string().optional(),
  code: z.string().optional(),
  status: z.string().optional(),
  active: z.boolean().optional(),
})

export type MachineCreate = z.infer<typeof machineCreateSchema>
export type MachineUpdate = z.infer<typeof machineUpdateSchema>
