import { z } from 'zod'

export const settingsUpdateSchema = z.object({
  centerName: z.string().optional(),
  phone: z.string().optional(),
  address: z.string().optional(),
  email: z.string().optional(),
  logoDataUrl: z.string().optional(),
  reportFooter: z.string().optional(),
  sessionCharge: z.string().optional(),
  currency: z.string().optional(),
  dateFormat: z.string().optional(),
})

export type SettingsUpdate = z.infer<typeof settingsUpdateSchema>
