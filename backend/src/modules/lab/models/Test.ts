import { Schema, model, models } from 'mongoose'

const InterpretationRuleSchema = new Schema({
  expression: { type: String, required: true },
  label: { type: String },
  text: { type: String },
}, { _id: false })

const ParameterSchema = new Schema({
  name: { type: String, required: true },
  unit: { type: String },
  normalRangeMale: { type: String },
  normalRangeFemale: { type: String },
  normalRangePediatric: { type: String },
  formula: { type: String },
  dependsOn: { type: [String], default: [] },
  // New fields for redesigned templates
  kind: { type: String, enum: ['quantitative', 'qualitative'], default: 'quantitative' },
  decimals: { type: Number, default: 2 },
  criticalMin: { type: Number },
  criticalMax: { type: Number },
  qualitativeOptions: { type: [String], default: [] },
  interpretationRules: { type: [InterpretationRuleSchema], default: [] },
  contributesToTotalPercent: { type: Boolean, default: false },
  totalPercentGroup: { type: String },
  sectionKey: { type: String },
  isSensitivityRow: { type: Boolean, default: false },
  drugList: { type: [String], default: [] },
  order: { type: Number, default: 0 },
}, { _id: false })

const SectionSchema = new Schema({
  key: { type: String, required: true },
  title: { type: String, required: true },
  order: { type: Number, default: 0 },
}, { _id: false })

const TestSchema = new Schema({
  name: { type: String, required: true },
  isActive: { type: Boolean, default: true, index: true },
  price: { type: Number, default: 0 },
  parameter: { type: String },
  unit: { type: String },
  normalRangeMale: { type: String },
  normalRangeFemale: { type: String },
  normalRangePediatric: { type: String },
  criticalMin: { type: Number },
  criticalMax: { type: Number },
  parameters: { type: [ParameterSchema], default: [] },
  consumables: { type: [new Schema({ item: { type: String, required: true }, qty: { type: Number, required: true } }, { _id: false })], default: [] },

  // New
  category: {
    type: String,
    enum: ['Hematology','Chemistry','SpecialChemistry','Serology','Microbiology','Molecular','Cytology','Histopathology','Radiology','Endocrinology','Immunology','Other'],
    default: 'Other',
    index: true,
  },
  template: {
    type: String,
    enum: ['general','cbc','urine_re','semen','blood_culture','tft','hba1c','qualitative','lft','rft','lipid','custom'],
    default: 'general',
    index: true,
  },
  sections: { type: [SectionSchema], default: [] },
  defaultInterpretation: { type: String },
  defaultSensitivityDrugs: { type: [String], default: [] },
  reportNotes: { type: String },
  hideEmptyRowsInReport: { type: Boolean, default: true },
  turnaroundTime: { type: Number, default: 0 }, // Expected TAT in minutes
}, { timestamps: true })

export type LabTestDoc = {
  _id: string
  name: string
  isActive?: boolean
  price?: number
  parameter?: string
  unit?: string
  normalRangeMale?: string
  normalRangeFemale?: string
  normalRangePediatric?: string
  criticalMin?: number
  criticalMax?: number
  parameters?: Array<{
    name: string
    unit?: string
    normalRangeMale?: string
    normalRangeFemale?: string
    normalRangePediatric?: string
    formula?: string
    dependsOn?: string[]
    kind?: 'quantitative' | 'qualitative'
    decimals?: number
    criticalMin?: number
    criticalMax?: number
    qualitativeOptions?: string[]
    interpretationRules?: Array<{ expression: string; label?: string; text?: string }>
    contributesToTotalPercent?: boolean
    totalPercentGroup?: string
    sectionKey?: string
    isSensitivityRow?: boolean
    drugList?: string[]
    order?: number
  }>
  consumables?: Array<{ item: string; qty: number }>
  category?: string
  template?: 'general'|'cbc'|'urine_re'|'semen'|'blood_culture'|'tft'|'hba1c'|'qualitative'|'lft'|'rft'|'lipid'|'custom'
  sections?: Array<{ key: string; title: string; order?: number }>
  defaultInterpretation?: string
  defaultSensitivityDrugs?: string[]
  reportNotes?: string
  hideEmptyRowsInReport?: boolean
  turnaroundTime?: number // Expected TAT in minutes
}

export const LabTest = models.Lab_Test || model('Lab_Test', TestSchema)
