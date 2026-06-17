import { Schema, model, models } from 'mongoose'

const SubModuleSchema = new Schema({
  enabled: { type: Boolean, default: true },
}, { _id: false })

const ModuleSchema = new Schema({
  enabled: { type: Boolean, default: true },
  subModules: { type: Map, of: SubModuleSchema, default: {} },
}, { _id: false })

const SystemConfigSchema = new Schema({
  _id: { type: String, default: 'default' },
  modules: { type: Map, of: ModuleSchema, default: {} },
  homeModules: { type: [String], default: [] },
  version: { type: Number, default: 1 },
  updatedAt: { type: Date },
  updatedBy: { type: String },
}, { timestamps: true, _id: false })

export type SubModuleDoc = {
  enabled: boolean
}

export type ModuleConfigDoc = {
  enabled: boolean
  subModules: Record<string, SubModuleDoc>
}

export type SystemConfigDoc = {
  _id: string
  modules: Record<string, ModuleConfigDoc>
  homeModules: string[]
  version: number
  updatedAt?: Date
  updatedBy?: string
  createdAt?: Date
}

export const SystemConfig = models.System_Config || model('System_Config', SystemConfigSchema)
