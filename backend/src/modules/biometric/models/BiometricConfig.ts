import { Schema, model, models } from 'mongoose'

const BiometricConfigSchema = new Schema({
  _id: { type: String, default: 'default' },
  enabled: { type: Boolean, default: false },
  ip: { type: String, default: '' },
  port: { type: Number, default: 4370 },
  commPassword: { type: Number, default: 0 },
  deviceId: { type: String, default: 'ZK-01' },
  pollIntervalMs: { type: Number, default: 15000 },
  duplicateWindowSec: { type: Number, default: 0 },
  cloudApiUrl: { type: String, default: 'https://sialkotmedical.healthspire.org/api' },
  mode: { type: String, enum: ['direct', 'cloud'], default: 'direct' },
}, { timestamps: true })

export type BiometricConfigDoc = {
  _id: string
  enabled: boolean
  ip: string
  port: number
  commPassword: number
  deviceId: string
  pollIntervalMs: number
  duplicateWindowSec: number
  cloudApiUrl: string
  mode: 'direct' | 'cloud'
}

export const BiometricConfig = models.Biometric_Config || model('Biometric_Config', BiometricConfigSchema)

/** Get config from DB, falling back to env defaults */
export async function getBiometricConfig(): Promise<BiometricConfigDoc> {
  const doc = await BiometricConfig.findById('default').lean<BiometricConfigDoc | null>()
  if (doc) return doc
  // First time: return defaults (will be created when user saves from UI)
  return {
    _id: 'default',
    enabled: false,
    ip: '',
    port: 4370,
    commPassword: 0,
    deviceId: 'ZK-01',
    pollIntervalMs: 15000,
    duplicateWindowSec: 0,
    cloudApiUrl: 'https://sialkotmedical.healthspire.org/api',
    mode: 'direct',
  }
}
