import { z } from 'zod'

export const createSupplierSchema = z.object({
  name: z.string().min(1),
  company: z.string().optional(),
  contactPerson: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email().optional().or(z.literal('')),
  address: z.string().optional(),
  taxId: z.string().optional(),
  gstNumber: z.string().optional(),
  type: z.enum(['Manufacturer', 'Distributor', 'ServiceProvider', 'AMCProvider']).optional(),
  bankDetails: z.string().optional(),
  paymentTerms: z.string().optional(),
  notes: z.string().optional()
})

export const updateSupplierSchema = createSupplierSchema.partial()

export const listSupplierSchema = z.object({
  q: z.string().optional(),
  type: z.string().optional(),
  status: z.enum(['Active', 'Inactive', 'Blacklisted']).optional(),
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(1000).optional()
})
