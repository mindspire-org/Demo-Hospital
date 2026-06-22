import { Schema, model, models } from 'mongoose'

const SidebarItemSchema = new Schema({
  key: { type: String, required: true },
  label: { type: String, required: true },
  visible: { type: Boolean, default: true },
}, { _id: false })

const SidebarPermissionSchema = new Schema({
  role: { type: String, required: true, unique: true },
  items: { type: [SidebarItemSchema], default: [] },
}, { timestamps: true })

export const SidebarPermission = models.Cafeteria_SidebarPermission || model('Cafeteria_SidebarPermission', SidebarPermissionSchema)
