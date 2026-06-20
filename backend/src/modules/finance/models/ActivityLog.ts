import { Schema, model, models } from 'mongoose'

const ActivityLogSchema = new Schema({
  userId: { type: String, required: true, index: true },
  userName: { type: String },
  portal: { type: String, required: true, index: true },
  action: { type: String, required: true, index: true },
  module: { type: String, index: true },
  entityId: { type: String },
  entityLabel: { type: String },
  amount: { type: Number },
  method: { type: String },
  meta: { type: Schema.Types.Mixed },
}, { timestamps: true })

ActivityLogSchema.index({ userId: 1, createdAt: -1 })
ActivityLogSchema.index({ portal: 1, createdAt: -1 })
ActivityLogSchema.index({ action: 1, createdAt: -1 })
ActivityLogSchema.index({ userId: 1, portal: 1, createdAt: -1 })

export type ActivityLogDoc = {
  _id: string
  userId: string
  userName?: string
  portal: string
  action: string
  module?: string
  entityId?: string
  entityLabel?: string
  amount?: number
  method?: string
  meta?: any
  createdAt: string
  updatedAt: string
}

export const ActivityLog = models.Hospital_Finance_ActivityLog || model('Hospital_Finance_ActivityLog', ActivityLogSchema)
