import { Schema, model, models } from 'mongoose'

const AuditLogSchema = new Schema({
  actor: { type: String },
  action: { type: String },
  label: { type: String },
  method: { type: String },
  path: { type: String },
  at: { type: String },
  detail: { type: String },
}, { timestamps: true })

export const AuditLog = models.Cafeteria_AuditLog || model('Cafeteria_AuditLog', AuditLogSchema)
