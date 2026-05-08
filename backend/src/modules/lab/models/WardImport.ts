import { Schema, model, models } from 'mongoose'

const WardImportRowSchema = new Schema({
  rowIndex: { type: Number },
  raw: { type: Schema.Types.Mixed },
  patientId: { type: String },
  tokenId: { type: String },
  status: { type: String, enum: ['pending', 'imported', 'skipped', 'error'], default: 'pending' },
  error: { type: String },
}, { _id: false })

const WardImportSchema = new Schema({
  fileName: { type: String, required: true },
  fileType: { type: String, enum: ['json', 'xlsx', 'csv'], required: true },
  wardId: { type: String, index: true },
  departmentId: { type: String, index: true },
  emergencyDayId: { type: String, index: true },
  uploadedBy: { type: String },
  uploadedAt: { type: String, required: true },
  totalRows: { type: Number, default: 0 },
  importedRows: { type: Number, default: 0 },
  skippedRows: { type: Number, default: 0 },
  errorRows: { type: Number, default: 0 },
  status: { type: String, enum: ['pending_review', 'committed', 'cancelled'], default: 'pending_review', index: true },
  rows: { type: [WardImportRowSchema], default: [] },
  notes: { type: String },
}, { timestamps: true })

export type LabWardImportDoc = {
  _id: string
  fileName: string
  fileType: 'json' | 'xlsx' | 'csv'
  wardId?: string
  departmentId?: string
  emergencyDayId?: string
  uploadedBy?: string
  uploadedAt: string
  totalRows: number
  importedRows: number
  skippedRows: number
  errorRows: number
  status: 'pending_review' | 'committed' | 'cancelled'
  rows: Array<{ rowIndex: number; raw: any; patientId?: string; tokenId?: string; status: string; error?: string }>
  notes?: string
}

export const LabWardImport = models.Lab_WardImport || model('Lab_WardImport', WardImportSchema)
