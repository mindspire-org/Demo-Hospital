import { Schema, model, models } from 'mongoose'



const ResultRowSchema = new Schema({

  test: { type: String, required: true },

  normal: { type: String },

  unit: { type: String },

  prevValue: { type: String },

  value: { type: String },

  flag: { type: String, enum: ['normal','abnormal','abnormal_low','abnormal_high','critical','critical_low','critical_high'], required: false },

  comment: { type: String },

  // New fields
  kind: { type: String, enum: ['quantitative', 'qualitative'], default: 'quantitative' },
  qualitativeValue: { type: String },
  numericValue: { type: Number },
  reference: { type: String },
  sectionKey: { type: String },
  // For blood-culture sensitivity rows
  drugSensitivities: { type: [new Schema({
    drug: { type: String, required: true },
    result: { type: String, enum: ['Sensitive', 'Resistant', 'Intermediate', ''], default: '' },
  }, { _id: false })], default: [] },

}, { _id: false })

const ResultSectionSchema = new Schema({
  key: { type: String, required: true },
  title: { type: String, required: true },
  order: { type: Number, default: 0 },
  rows: { type: [ResultRowSchema], default: [] },
}, { _id: false })

const RepeatHistorySchema = new Schema({
  at: { type: String, required: true },
  by: { type: String },
  reason: { type: String },
  snapshot: { type: Schema.Types.Mixed }, // full rows snapshot
  consumablesDeducted: { type: Boolean, default: false },
}, { _id: false })



const ResultSchema = new Schema({

  orderId: { type: String, required: true, index: true },

  testId: { type: String, index: true },

  testName: { type: String },

  rows: { type: [ResultRowSchema], default: [] },

  interpretation: { type: String },

  submittedBy: { type: String },

  reportStatus: { type: String, enum: ['pending','approved','rejected'], default: 'pending', index: true },

  approvedAt: { type: Date },

  approvedBy: { type: String },
  
  // Rejection tracking
  rejectedAt: { type: Date },
  rejectedBy: { type: String },
  rejectionReason: { type: String },
  
  // Edit tracking
  editedAt: { type: Date },
  editedBy: { type: String },
  editCount: { type: Number, default: 0 },

  // New fields for redesigned result entry
  template: { type: String, default: 'general' },
  sections: { type: [ResultSectionSchema], default: [] },
  autoInterpretation: { type: String },
  manualInterpretation: { type: String },
  repeatHistory: { type: [RepeatHistorySchema], default: [] },
  validation: {
    totalPercentOk: { type: Boolean, default: true },
    totalPercentGroups: { type: Schema.Types.Mixed, default: {} },
    errors: { type: [String], default: [] },
  },
  hasCritical: { type: Boolean, default: false, index: true },
  // Snapshot of patient + test info (denormalized for fast list views)
  patientSnapshot: { type: Schema.Types.Mixed },
  collectionCenterId: { type: Schema.Types.ObjectId, ref: 'Lab_CollectionCenter', index: true },
  departmentId: { type: String, index: true },
  sampleType: { type: String, enum: ['normal','urgent','stat'], default: 'normal' },
  performedBy: { type: String },
  performedAt: { type: Date },

}, { timestamps: true })



export type LabResultDoc = {

  _id: string

  orderId: string

  testId?: string

  testName?: string

  rows: Array<{
    test: string
    normal?: string
    unit?: string
    prevValue?: string
    value?: string
    flag?: 'normal'|'abnormal'|'critical'
    comment?: string
    kind?: 'quantitative' | 'qualitative'
    qualitativeValue?: string
    numericValue?: number
    reference?: string
    sectionKey?: string
    drugSensitivities?: Array<{ drug: string; result: 'Sensitive' | 'Resistant' | 'Intermediate' | '' }>
  }>

  interpretation?: string

  submittedBy?: string

  reportStatus?: 'pending' | 'approved' | 'rejected'

  approvedAt?: string

  approvedBy?: string
  
  rejectedAt?: string
  rejectedBy?: string
  rejectionReason?: string
  editedAt?: string
  editedBy?: string
  editCount?: number

  template?: string
  sections?: Array<{ key: string; title: string; order?: number; rows: Array<any> }>
  autoInterpretation?: string
  manualInterpretation?: string
  repeatHistory?: Array<{ at: string; by?: string; reason?: string; snapshot?: any; consumablesDeducted?: boolean }>
  validation?: { totalPercentOk: boolean; totalPercentGroups: Record<string, number>; errors: string[] }
  hasCritical?: boolean
  patientSnapshot?: any
  collectionCenterId?: string
  departmentId?: string
  sampleType?: 'normal' | 'urgent' | 'stat'
  performedBy?: string
  performedAt?: string

}



export const LabResult = models.Lab_Result || model('Lab_Result', ResultSchema)

