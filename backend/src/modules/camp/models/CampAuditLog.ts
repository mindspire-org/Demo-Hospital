import { Schema, model, models } from 'mongoose'

const CampAuditLogSchema = new Schema({
  actor: { type: String, default: '' },
  action: { type: String, required: true },
  label: { type: String, default: '' },
  method: { type: String, default: '' },
  path: { type: String, default: '' },
  at: { type: String, default: '' },
  detail: { type: String, default: '' },
}, { timestamps: true })

export type CampAuditLogDoc = {
  _id: string
  actor?: string
  action: string
  label?: string
  method?: string
  path?: string
  at?: string
  detail?: string
}

export const CampAuditLog = models.CampAuditLog || model('CampAuditLog', CampAuditLogSchema)
