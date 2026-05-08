import { Schema, model, models } from 'mongoose'

const NotificationSchema = new Schema({
  scope: { type: String, enum: ['main', 'center', 'user'], default: 'main', index: true },
  centerId: { type: Schema.Types.ObjectId, ref: 'Lab_CollectionCenter', index: true },
  userId: { type: String, index: true },
  kind: {
    type: String,
    enum: [
      'critical',
      'pending_approval',
      'sample_received',
      'outsource',
      'whatsapp_failed',
      'general',
      'result_approved',
      'result_rejected',
      'repeat_sample',
    ],
    default: 'general',
    index: true,
  },
  title: { type: String, required: true },
  body: { type: String },
  link: { type: String },
  read: { type: Boolean, default: false, index: true },
  readBy: { type: [String], default: [] },
  meta: { type: Schema.Types.Mixed },
}, { timestamps: true })

NotificationSchema.index({ scope: 1, read: 1, createdAt: -1 })

export type LabNotificationDoc = {
  _id: string
  scope: 'main' | 'center' | 'user'
  centerId?: string
  userId?: string
  kind: string
  title: string
  body?: string
  link?: string
  read: boolean
  readBy: string[]
  meta?: any
  createdAt?: string
}

export const LabNotification = models.Lab_Notification || model('Lab_Notification', NotificationSchema)
