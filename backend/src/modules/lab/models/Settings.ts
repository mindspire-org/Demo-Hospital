import { Schema, model, models } from 'mongoose'

const HeaderHistorySchema = new Schema({
  url: { type: String, required: true },
  uploadedAt: { type: String, required: true },
  uploadedBy: { type: String },
  note: { type: String },
  type: { type: String, enum: ['header', 'footer'], default: 'header' },
}, { _id: true })

const SettingsSchema = new Schema({
  labName: { type: String, default: '' },
  phone: { type: String, default: '' },
  address: { type: String, default: '' },
  email: { type: String, default: '' },
  reportFooter: { type: String, default: '' },
  logoDataUrl: { type: String, default: '' },
  department: { type: String, default: '' },
  reportTemplate: { type: String, default: 'classic' },
  slipTemplate: { type: String, default: 'thermal' },
  consultantName: { type: String, default: '' },
  consultantDegrees: { type: String, default: '' },
  consultantTitle: { type: String, default: '' },
  consultants: {
    type: [{ name: String, degrees: String, title: String }],
    default: [],
    validate: [(arr: any[]) => !arr || arr.length <= 3, 'Maximum 3 consultants allowed'],
  },
  qrUrl: { type: String, default: '' },

  // New: header/footer image management
  headerImageUrl: { type: String, default: '' },
  footerImageUrl: { type: String, default: '' },
  headerHistory: { type: [HeaderHistorySchema], default: [] },

  // Image-2 lab profile
  parentLab: { type: String, default: '' },
  slogan: { type: String, default: '' },
  addressLine1: { type: String, default: '' },
  addressLine2: { type: String, default: '' },
  addressLine3: { type: String, default: '' },
  landlineNumber: { type: String, default: '' },
  mobileNumber: { type: String, default: '' },
  whatsappNumber: { type: String, default: '' },
  website: { type: String, default: '' },
  countryCode: { type: String, default: 'PAK(92)' },
  code: { type: String, default: '' },
  dateFormat: { type: String, default: 'DD/MM/YYYY' },
  currency: { type: String, default: 'Pakistani rupee (Rs.)' },
  labNumberFormat: { type: String, default: '{SERIAL}' },
  restrictEmployeesToChangeCollectionDate: { type: Boolean, default: false },
  paymentReceiveOnTestInstanceLevel: { type: Boolean, default: false },
  validateStock: { type: Boolean, default: false },
  smsActive: { type: Boolean, default: false },
  labHijriDateOffset: { type: Number, default: 0 },

  // Report design settings
  watermark: { type: String, default: '' },           // watermark text (e.g., 'CONFIDENTIAL', lab name)
  watermarkOpacity: { type: Number, default: 0.08 },  // 0-1
  watermarkAngle: { type: Number, default: -45 },      // degrees
  reportFont: { type: String, default: 'poppins' },   // 'poppins'|'helvetica'|'times'|'courier'
  useCustomHeaderFooter: { type: Boolean, default: false }, // if true, use uploaded header/footer images instead of generated

  // ChatGPT prompt template per test template type
  chatgptPrompts: {
    type: Schema.Types.Mixed,
    default: {
      general: 'Please review the following lab result and provide an interpretation.',
      cbc: 'Please interpret this CBC report and highlight any abnormalities.',
      hba1c: 'Please interpret this HbA1c result for diabetes status.',
      tft: 'Please interpret this thyroid function test.',
      urine_re: 'Please interpret this urine routine examination.',
      semen: 'Please interpret this semen analysis report.',
      blood_culture: 'Please interpret this blood culture and sensitivity report.',
    },
  },
}, { timestamps: true })

export type LabSettingsDoc = {
  _id: string
  labName: string
  phone: string
  address: string
  email: string
  reportFooter: string
  logoDataUrl?: string
  department?: string
  reportTemplate?: 'classic'|'tealGradient'|'modern'|'adl'|'skmch'|'receiptStyle'|'clinicalPro'|'minimalist'|'royalBlue'|'letterhead'
  slipTemplate?: 'thermal'|'a4Bill'
  consultantName?: string
  consultantDegrees?: string
  consultantTitle?: string
  consultants?: Array<{ name?: string; degrees?: string; title?: string }>
  qrUrl?: string
  headerImageUrl?: string
  footerImageUrl?: string
  headerHistory?: Array<{ _id: string; url: string; uploadedAt: string; uploadedBy?: string; note?: string; type?: 'header' | 'footer' }>
  parentLab?: string
  slogan?: string
  addressLine1?: string
  addressLine2?: string
  addressLine3?: string
  landlineNumber?: string
  mobileNumber?: string
  whatsappNumber?: string
  website?: string
  countryCode?: string
  code?: string
  dateFormat?: string
  currency?: string
  labNumberFormat?: string
  restrictEmployeesToChangeCollectionDate?: boolean
  paymentReceiveOnTestInstanceLevel?: boolean
  validateStock?: boolean
  smsActive?: boolean
  labHijriDateOffset?: number
  watermark?: string
  watermarkOpacity?: number
  watermarkAngle?: number
  reportFont?: string
  useCustomHeaderFooter?: boolean
  chatgptPrompts?: Record<string, string>
}

export const LabSettings = models.Lab_Settings || model('Lab_Settings', SettingsSchema)
