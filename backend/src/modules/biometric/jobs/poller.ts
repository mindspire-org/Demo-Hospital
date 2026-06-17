/* eslint-disable @typescript-eslint/no-var-requires */
import { BiometricSyncState } from '../models/BiometricSyncState'
import { getBiometricConfig } from '../models/BiometricConfig'
import { processBiometricEvent } from '../services/biometric_attendance'

type ZKAttendanceRow = {
  uid?: any
  userId?: any
  id?: any
  userSN?: any
  userSn?: any
  enrollNumber?: any
  sn?: any
  deviceUserId?: any
  timestamp?: any
  time?: any
  recordTime?: any
  checkTime?: any
}

function normalizeAttendanceRows(result: any): ZKAttendanceRow[] {
  if (!result) return []
  if (Array.isArray(result)) return result as any
  if (Array.isArray(result.data)) return result.data as any
  if (Array.isArray(result.items)) return result.items as any
  if (Array.isArray(result.records)) return result.records as any
  if (Array.isArray(result.attendances)) return result.attendances as any
  if (Array.isArray(result.logs)) return result.logs as any
  return []
}

function asDate(v: any): Date | null {
  if (!v) return null
  if (v instanceof Date) return v
  const d = new Date(v)
  if (Number.isNaN(d.getTime())) return null
  return d
}

function getEnrollId(row: ZKAttendanceRow): string {
  const v = (row as any).deviceUserId ?? (row as any).userId ?? (row as any).uid ?? (row as any).id ?? (row as any).userSN ?? (row as any).userSn ?? (row as any).enrollNumber ?? (row as any).sn
  return String(v ?? '').trim()
}

function getTimestamp(row: ZKAttendanceRow): Date | null {
  return asDate((row as any).timestamp ?? (row as any).time ?? (row as any).recordTime ?? (row as any).checkTime)
}

export function formatZkErr(e: any): string {
  if (!e) return 'error'
  if (typeof e === 'string') return e
  
  // Extract message and command from the parent object if present
  const msg = e.message || ''
  const command = e.command || ''
  
  // Check the nested err object
  const err = e.err
  let errDetail = ''
  if (err) {
    if (typeof err === 'string') {
      errDetail = err
    } else {
      const internalMsg = err.message || ''
      const code = err.code ? `code=${err.code}` : ''
      const syscall = err.syscall ? `syscall=${err.syscall}` : ''
      errDetail = [internalMsg, code, syscall].filter(Boolean).join(' ')
    }
  }
  
  const parts = [
    command && `Command: ${command}`,
    msg && `Message: ${msg}`,
    errDetail && `Error: ${errDetail}`,
    e.ip && `IP: ${e.ip}`
  ].filter(Boolean)
  
  if (parts.length) return parts.join(' | ')
  try { return JSON.stringify(e) } catch { return String(e) }
}

let intervalHandle: any = null
let running = false
let failureCount = 0
let nextRunAt = 0
let lastLoggedErrorKey = ''
let consecutiveFailures = 0
let pollerPaused = false

export function isPollerPaused(){ return pollerPaused }
export function resetPollerState(){ consecutiveFailures = 0; pollerPaused = false; failureCount = 0; nextRunAt = 0 }

export function stopBiometricPoller() {
  if (intervalHandle) {
    clearInterval(intervalHandle)
    intervalHandle = null
  }
  running = false
  console.log('[biometric] poller stopped')
}

export async function startBiometricPoller(){
  const cfg = await getBiometricConfig()
  if (!cfg.enabled) return
  if (!cfg.ip) {
    console.warn('[biometric] IP is empty; poller not started')
    return
  }
  if (cfg.mode === 'cloud') {
    console.log('[biometric] Mode is cloud; poller not needed (data pushed from local fetcher)')
    return
  }
  
  // Always stop existing poller before starting a new one to avoid multiple intervals
  stopBiometricPoller()

  const tick = async () => {
    if (running) return
    if (pollerPaused) {
      // console.log('[biometric] poller is paused, skipping tick')
      return
    }
    if (Date.now() < nextRunAt) return
    
    // Refresh config inside tick to detect interval changes
    const currentCfg = await getBiometricConfig()
    if (!currentCfg.enabled || currentCfg.mode === 'cloud') {
      stopBiometricPoller()
      return
    }

    running = true
    try {
      await syncOnce()
      failureCount = 0
      consecutiveFailures = 0
      // On success, schedule next run based on configured pollIntervalMs
      const currentCfg = await getBiometricConfig()
      nextRunAt = Date.now() + Math.max(5000, Number(currentCfg.pollIntervalMs || 15000))
      lastLoggedErrorKey = ''
    } catch (e: any) {
      failureCount = Math.min(10, failureCount + 1)
      consecutiveFailures++
      
      // If too many consecutive failures, pause poller temporarily
      if (consecutiveFailures >= 5) {
        pollerPaused = true
        const pauseMs = 60 * 1000 // Pause for 1 minute
        console.error(`[biometric] Too many consecutive failures (${consecutiveFailures}), pausing poller for ${pauseMs/1000}s`)
        setTimeout(() => {
          pollerPaused = false
          consecutiveFailures = 0
          console.log('[biometric] Resuming poller after pause')
        }, pauseMs)
      }
      
      const base = Math.max(5000, Number(currentCfg.pollIntervalMs || 15000))
      const backoff = Math.min(5 * 60_000, base * Math.pow(2, failureCount))
      nextRunAt = Date.now() + backoff

      let msg = ''
      if (e && typeof e === 'object') {
        msg = String((e as any).message || '')
        if (!msg) {
          try { msg = JSON.stringify(e) } catch { msg = String(e) }
        }
      } else {
        msg = String(e || 'error')
      }
      const key = `${msg}@@${failureCount}`
      if (lastLoggedErrorKey !== key) {
        lastLoggedErrorKey = key
        console.error(`[biometric] sync error: ${msg} (retry in ${Math.round(backoff/1000)}s)`)
      }
    } finally {
      running = false
    }
  }

  // Use a short interval to check if it's time to run the next tick.
  // This allows us to respond to config changes (like pollIntervalMs) more quickly
  // without having to wait for the old (potentially long) interval to finish.
  intervalHandle = setInterval(() => {
    tick().catch(() => {})
  }, 1000)

  tick().catch(() => {})
  console.log(`[biometric] poller started (polling every ${cfg.pollIntervalMs}ms)`) 
}

export async function syncOnce(){
  try {
    await _syncOnceInternal()
  } catch (e: any) {
    console.error('[biometric] syncOnce failed:', formatZkErr(e))
    throw e
  }
}

async function _syncOnceInternal(){
  const cfg = await getBiometricConfig()
  const ZKLib = require('node-zklib')

  const deviceId = String(cfg.deviceId || 'ZK-01')
  const ip = String(cfg.ip)
  const port = Number(cfg.port || 4370)
  const password = Number(cfg.commPassword || 0)

  const state = await BiometricSyncState.findOne({ deviceId })
    .lean<{ lastTimestamp?: Date | string } | null>()
  let lastTs = state?.lastTimestamp ? new Date(state.lastTimestamp as any) : null
  const now = new Date()
  // If lastTs looks like it's in the future (device time mismatch), ignore it to avoid skipping new scans
  if (lastTs && lastTs.getTime() > now.getTime() + 5 * 60_000) {
    console.warn('[biometric] lastTimestamp is in the future; ignoring stored sync cursor')
    lastTs = null
  }

  const connectAndFetch = async (pwd: number) => {
    let zk: any = null
    let connected = false
    try {
      console.log('[biometric] creating ZKLib instance...')
      const ZKLib = require('node-zklib')
      zk = new ZKLib(ip, port, 10000, 5200, pwd)
      
      console.log('[biometric] creating socket...')
      try {
        await zk.createSocket()
        connected = true
        console.log('[biometric] socket connected successfully')
      } catch (socketErr: any) {
        console.error('[biometric] socket creation failed:', formatZkErr(socketErr))
        throw socketErr
      }
      
      console.log('[biometric] fetching attendances...')
      let rawResult: any
      try {
        rawResult = await zk.getAttendances()
      } catch (attErr: any) {
        console.error('[biometric] getAttendances failed:', formatZkErr(attErr))
        throw attErr
      }
      
      const rows: ZKAttendanceRow[] = normalizeAttendanceRows(rawResult)

      if (!rows.length) {
        console.log('[biometric] no attendance rows returned from device')
      } else {
        const sample = rows[rows.length - 1]
        const sampleEnroll = getEnrollId(sample)
        const sampleTs = getTimestamp(sample)
        const keys = Object.keys(sample as any).slice(0, 12).join(',')
        console.log(`[biometric] downloaded ${rows.length} attendance rows (sample enroll=${sampleEnroll || '?'} ts=${sampleTs ? sampleTs.toISOString() : '?'}, keys=${keys})`)
      }

      const sorted = (Array.isArray(rows) ? rows : []).slice().sort((a, b) => {
        const ta = getTimestamp(a)?.getTime() || 0
        const tb = getTimestamp(b)?.getTime() || 0
        return ta - tb
      })

      let maxTs: Date | null = lastTs

      for (const row of sorted) {
        const enrollId = getEnrollId(row)
        const ts = getTimestamp(row)
        if (!enrollId || !ts) continue
        if (lastTs && ts.getTime() <= lastTs.getTime()) continue

        await processBiometricEvent({ deviceId, enrollId, timestamp: ts, raw: row })

        if (!maxTs || ts.getTime() > maxTs.getTime()) maxTs = ts
      }

      try {
        await BiometricSyncState.findOneAndUpdate(
          { deviceId },
          { $set: { lastTimestamp: maxTs || lastTs || undefined, lastSuccessAt: new Date(), lastError: '' } },
          { upsert: true, new: true }
        )
      } catch {}
    } finally {
      if (zk && connected) {
        console.log('[biometric] disconnecting socket...')
        try {
          await Promise.race([
            zk.disconnect(),
            new Promise((_, reject) => setTimeout(() => reject(new Error('disconnect timeout')), 3000))
          ])
          console.log('[biometric] socket disconnected successfully')
        } catch (discErr: any) {
          console.warn('[biometric] socket disconnect failed/timeout:', formatZkErr(discErr))
        }
      }
      // Add delay to ensure device releases connection slot
      console.log('[biometric] waiting 1s before releasing connection...')
      await new Promise(r => setTimeout(r, 1000))
    }
  }

  try {
    await connectAndFetch(password)
  } catch (e: any) {
    // Common scenario: device COMM KEY not set (0) but env has a non-zero password
    // Retry once with 0 to improve out-of-box connectivity.
    const msg = formatZkErr(e)
    console.log('[biometric] first attempt failed:', msg)
    if (password && password !== 0) {
      try {
        await connectAndFetch(0)
        console.warn(`[biometric] connected after retry with COMM_PASSWORD=0 (configured password failed: ${msg})`)
        return
      } catch (e2: any) {
        const msg2 = formatZkErr(e2)
        console.error('[biometric] retry with password=0 also failed:', msg2)
        await BiometricSyncState.findOneAndUpdate(
          { deviceId },
          { $set: { lastErrorAt: new Date(), lastError: msg2 } },
          { upsert: true }
        )
        throw e2
      }
    }

    await BiometricSyncState.findOneAndUpdate(
      { deviceId },
      { $set: { lastErrorAt: new Date(), lastError: msg } },
      { upsert: true }
    )
    throw e
  }
}
