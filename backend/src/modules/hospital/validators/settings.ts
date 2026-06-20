import { z } from 'zod'



export const settingsUpdateSchema = z.object({

  name: z.string().optional(),

  phone: z.string().optional(),

  address: z.string().optional(),

  email: z.string().optional(),

  website: z.string().optional(),

  logoDataUrl: z.string().optional(),

  code: z.string().optional(),

  slipFooter: z.string().optional(),

  mrnFormat: z.string().optional(),

  manualRxFields: z.record(z.boolean()).optional(),

  eyeRxEnabled: z.boolean().optional(),

  timeFormat: z.enum(['12h', '24h']).optional(),

  departmentBillingRules: z.record(z.object({
    feeMode: z.enum(['department-only', 'doctor-only', 'both', 'none']).optional(),
    doctorCommissionPercent: z.number().min(0).max(100).optional(),
  })).optional(),

})

