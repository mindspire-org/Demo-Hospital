import { z } from 'zod'

const interpretationRuleSchema = z.object({
  expression: z.string().min(1),
  label: z.string().optional(),
  text: z.string().optional(),
})

export const testParameterExtraSchema = z.object({
  name: z.string().min(1),
  unit: z.string().optional(),
  normalRangeMale: z.string().optional(),
  normalRangeFemale: z.string().optional(),
  normalRangePediatric: z.string().optional(),
  formula: z.string().optional(),
  dependsOn: z.array(z.string()).optional().default([]),
  kind: z.enum(['quantitative', 'qualitative']).optional(),
  decimals: z.coerce.number().int().min(0).max(6).optional(),
  criticalMin: z.coerce.number().optional(),
  criticalMax: z.coerce.number().optional(),
  qualitativeOptions: z.array(z.string()).optional().default([]),
  interpretationRules: z.array(interpretationRuleSchema).optional().default([]),
  contributesToTotalPercent: z.boolean().optional(),
  totalPercentGroup: z.string().optional(),
  sectionKey: z.string().optional(),
  isSensitivityRow: z.boolean().optional(),
  drugList: z.array(z.string()).optional().default([]),
  order: z.coerce.number().int().optional(),
})

export const testSectionSchema = z.object({
  key: z.string().min(1),
  title: z.string().min(1),
  order: z.coerce.number().int().optional(),
})

export const testCreateSchemaV2 = z.object({
  name: z.string().min(1),
  isActive: z.boolean().optional(),
  price: z.coerce.number().nonnegative().optional().default(0),
  parameter: z.string().optional(),
  unit: z.string().optional(),
  normalRangeMale: z.string().optional(),
  normalRangeFemale: z.string().optional(),
  normalRangePediatric: z.string().optional(),
  parameters: z.array(testParameterExtraSchema).optional().default([]),
  consumables: z.array(z.object({ item: z.string().min(1), qty: z.coerce.number().int().positive() })).optional().default([]),
  category: z.string().optional(),
  template: z.enum(['general','cbc','urine_re','semen','blood_culture','tft','hba1c','qualitative','lft','rft','lipid','custom']).optional(),
  sections: z.array(testSectionSchema).optional().default([]),
  defaultInterpretation: z.string().optional(),
  defaultSensitivityDrugs: z.array(z.string()).optional().default([]),
  reportNotes: z.string().optional(),
  hideEmptyRowsInReport: z.boolean().optional(),
  turnaroundTime: z.coerce.number().nonnegative().optional(),
})

export const testUpdateSchemaV2 = testCreateSchemaV2.partial()
