import { z } from 'zod'

export const labPurchaseOrderCreateSchema = z.object({
  orderDate: z.string(),
  expectedDelivery: z.string().optional(),
  supplierId: z.string().optional(),
  supplierName: z.string().min(1),
  supplierContact: z.string().optional(),
  supplierPhone: z.string().optional(),
  companyName: z.string().optional(),
  deliveryAddress: z.string().optional(),
  items: z.array(z.object({
    itemId: z.string().optional(),
    name: z.string().min(1),
    category: z.string().optional(),
    qty: z.number().min(1),
    unit: z.string().optional(),
  })).min(1),
  notes: z.string().optional(),
  terms: z.string().optional(),
  authorizedBy: z.string().optional(),
})

export const labPurchaseOrderUpdateSchema = labPurchaseOrderCreateSchema.partial()

export const labPurchaseOrderStatusSchema = z.object({
  status: z.enum(['Pending', 'Sent', 'Received', 'Complete', 'Cancelled'])
})

export type LabPurchaseOrderCreate = z.infer<typeof labPurchaseOrderCreateSchema>
export type LabPurchaseOrderUpdate = z.infer<typeof labPurchaseOrderUpdateSchema>
export type LabPurchaseOrderStatusUpdate = z.infer<typeof labPurchaseOrderStatusSchema>
