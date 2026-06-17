import { Request, Response } from 'express'
import { BiometricConfig, getBiometricConfig } from '../models/BiometricConfig'
import { adminGuard } from '../../../common/middleware/admin_guard'
import { startBiometricPoller } from '../jobs/poller'

export async function getConfig(_req: Request, res: Response) {
  const config = await getBiometricConfig()
  res.json(config)
}

export async function updateConfig(req: Request, res: Response) {
  const body = req.body

  const update: any = {}
  if (typeof body.enabled === 'boolean') update.enabled = body.enabled
  if (typeof body.ip === 'string') update.ip = body.ip
  if (typeof body.port === 'number') update.port = body.port
  if (typeof body.commPassword === 'number') update.commPassword = body.commPassword
  if (typeof body.deviceId === 'string') update.deviceId = body.deviceId
  if (typeof body.pollIntervalMs === 'number') update.pollIntervalMs = body.pollIntervalMs
  if (typeof body.duplicateWindowSec === 'number') update.duplicateWindowSec = body.duplicateWindowSec
  if (typeof body.cloudApiUrl === 'string') update.cloudApiUrl = body.cloudApiUrl
  if (body.mode === 'direct' || body.mode === 'cloud') update.mode = body.mode

  const doc = await BiometricConfig.findByIdAndUpdate(
    'default',
    { $set: update },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  ).lean()

  console.log(`[biometric:config] Updated:`, update)
  
  // Restart poller with new config
  try {
    await startBiometricPoller()
  } catch (err) {
    console.error('[biometric] Failed to restart poller after config update:', err)
  }

  res.json(doc)
}

/** Public endpoint (no auth) for local fetcher to pull config */
export async function getPublicConfig(_req: Request, res: Response) {
  const config = await getBiometricConfig()
  res.json({
    enabled: config.enabled,
    ip: config.ip,
    port: config.port,
    commPassword: config.commPassword,
    deviceId: config.deviceId,
    pollIntervalMs: config.pollIntervalMs,
    duplicateWindowSec: config.duplicateWindowSec,
    cloudApiUrl: config.cloudApiUrl,
    mode: config.mode,
  })
}
