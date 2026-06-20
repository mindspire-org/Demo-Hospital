import { Schema, model, models } from 'mongoose'

const CampSidebarPermissionSchema = new Schema({
  role: { type: String, required: true, unique: true },
  permissions: [{
    path: { type: String, required: true },
    label: { type: String, required: true },
    visible: { type: Boolean, default: true },
    order: { type: Number, default: 0 },
  }],
  updatedBy: { type: String },
}, { timestamps: true })

export type CampSidebarPermissionDoc = {
  _id: string
  role: string
  permissions: Array<{ path: string; label: string; visible: boolean; order: number }>
  updatedBy?: string
}

export const CampSidebarPermission = models.Camp_SidebarPermission || model('Camp_SidebarPermission', CampSidebarPermissionSchema)
