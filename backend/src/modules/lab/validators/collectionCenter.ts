import { z } from 'zod'

export const collectionCenterCreateSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  code: z.string().min(1, 'Code is required'),
  address: z.string().optional(),
  contactPerson: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().optional(),
  status: z.enum(['Active', 'Inactive']).default('Active'),
  commissionPercent: z.number().min(0).max(100).default(0),
})

export const collectionCenterUpdateSchema = collectionCenterCreateSchema.partial()

export const recordPaymentSchema = z.object({
  date: z.string().min(1, 'Date is required'),
  amount: z.number().min(0.01, 'Amount must be greater than 0'),
  note: z.string().optional(),
})

export type CollectionCenterCreate = z.infer<typeof collectionCenterCreateSchema>
export type CollectionCenterUpdate = z.infer<typeof collectionCenterUpdateSchema>
export type RecordPayment = z.infer<typeof recordPaymentSchema>
