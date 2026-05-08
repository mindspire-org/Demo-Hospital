import { Schema, model, models } from 'mongoose'

const AuditLogSchema = new Schema({
  actor: { type: String, default: 'system' },
  userId: { type: String, index: true },
  action: { type: String, required: true },
  label: { type: String },
  method: { type: String },
  path: { type: String },
  at: { type: String, required: true }, // ISO datetime
  detail: { type: String },
  // Structured entity tracking
  entity: { type: String, index: true }, // 'token' | 'order' | 'result' | 'test' | 'settings' | 'center' | 'rate_list' | 'package' | 'patient_card' | ...
  entityId: { type: String, index: true },
  before: { type: Schema.Types.Mixed },
  after: { type: Schema.Types.Mixed },
  // Optional scope tagging
  centerId: { type: String, index: true },
  ip: { type: String },
}, { timestamps: true })

export type LabAuditLogDoc = {
  _id: string
  actor: string
  userId?: string
  action: string
  label?: string
  method?: string
  path?: string
  at: string
  detail?: string
  entity?: string
  entityId?: string
  before?: any
  after?: any
  centerId?: string
  ip?: string
}

export const LabAuditLog = models.Lab_AuditLog || model('Lab_AuditLog', AuditLogSchema)
