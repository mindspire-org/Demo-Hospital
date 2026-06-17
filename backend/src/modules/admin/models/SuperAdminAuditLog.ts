import { Schema, model, models } from 'mongoose'

const SuperAdminAuditLogSchema = new Schema({
  actor: { type: String, required: true },
  actorType: { type: String, enum: ['db_user', 'master_key'], required: true },
  action: { type: String, required: true },
  target: { type: String },
  before: { type: Schema.Types.Mixed },
  after: { type: Schema.Types.Mixed },
  ip: { type: String },
  userAgent: { type: String },
}, { timestamps: true })

SuperAdminAuditLogSchema.index({ createdAt: -1 })
SuperAdminAuditLogSchema.index({ actor: 1, createdAt: -1 })
SuperAdminAuditLogSchema.index({ action: 1 })

export type SuperAdminAuditLogDoc = {
  _id: string
  actor: string
  actorType: 'db_user' | 'master_key'
  action: string
  target?: string
  before?: any
  after?: any
  ip?: string
  userAgent?: string
  createdAt?: Date
  updatedAt?: Date
}

export const SuperAdminAuditLog = models.SuperAdmin_AuditLog || model('SuperAdmin_AuditLog', SuperAdminAuditLogSchema)
