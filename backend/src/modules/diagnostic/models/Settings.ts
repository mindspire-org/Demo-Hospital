import { Schema, model, models } from 'mongoose'

const SettingsSchema = new Schema({
  diagnosticName: { type: String, default: '' },
  phone: { type: String, default: '' },
  address: { type: String, default: '' },
  email: { type: String, default: '' },
  reportFooter: { type: String, default: '' },
  logoDataUrl: { type: String, default: '' },
  department: { type: String, default: '' },
  consultantName: { type: String, default: '' },
  consultantDegrees: { type: String, default: '' },
  consultantTitle: { type: String, default: '' },
  consultants: {
    type: [{ name: String, degrees: String, title: String }],
    default: [],
    validate: [(arr: any[]) => !arr || arr.length <= 3, 'Maximum 3 consultants allowed'],
  },
  templateMappings: {
    type: [{ testId: String, testName: String, templateKey: String }],
    default: [],
  },
  reportSections: {
    type: {
      clinicalInformation: { type: Boolean, default: false },
      comparison: { type: Boolean, default: false },
      technique: { type: Boolean, default: false },
      findings: { type: Boolean, default: true },
      impression: { type: Boolean, default: false },
      images: { type: Boolean, default: false },
    },
    default: () => ({ findings: true }),
  },
}, { timestamps: true })

export type DiagnosticSettingsDoc = {
  _id: string
  diagnosticName: string
  phone: string
  address: string
  email: string
  reportFooter: string
  logoDataUrl?: string
  department?: string
  consultantName?: string
  consultantDegrees?: string
  consultantTitle?: string
  consultants?: Array<{ name?: string; degrees?: string; title?: string }>
  templateMappings?: Array<{ testId: string; testName?: string; templateKey: string }>
  reportSections?: { clinicalInformation?: boolean; comparison?: boolean; technique?: boolean; findings?: boolean; impression?: boolean; images?: boolean }
}

export const DiagnosticSettings = models.Diagnostic_Settings || model('Diagnostic_Settings', SettingsSchema)
