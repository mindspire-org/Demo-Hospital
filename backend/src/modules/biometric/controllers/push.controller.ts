import { Request, Response } from 'express'
import { z } from 'zod'
import { processBiometricEvent } from '../services/biometric_attendance'
import { BiometricSyncState } from '../models/BiometricSyncState'

const pushEventSchema = z.object({
  deviceId: z.string().min(1),
  enrollId: z.string().min(1),
  timestamp: z.string().min(1),
  raw: z.any().optional(),
})

const pushBatchSchema = z.object({
  events: z.array(pushEventSchema).min(1).max(500),
  bridgeId: z.string().optional(),
})

export async function pushEvents(req: Request, res: Response) {
  const parsed = pushBatchSchema.safeParse(req.body)
  if (!parsed.success) {
    return res.status(400).json({ ok: false, errors: parsed.error.flatten() })
  }

  const { events, bridgeId } = parsed.data
  const results: { enrollId: string; ok: boolean; reason?: string }[] = []
  let maxTs: Date | null = null

  for (const ev of events) {
    // Treat the incoming string as local time. 
    // If it's "2026-05-11T17:37:00", we want exactly those numbers regardless of VPS timezone.
    let ts: Date;
    if (typeof ev.timestamp === 'string' && !ev.timestamp.endsWith('Z')) {
       // Manual parse to avoid JS Date auto-conversion to UTC
       const parts = ev.timestamp.split(/[-T:]/);
       if (parts.length >= 5) {
         ts = new Date(
           Number(parts[0]),
           Number(parts[1]) - 1,
           Number(parts[2]),
           Number(parts[3]),
           Number(parts[4]),
           parts[5] ? Number(parts[5]) : 0
         );
       } else {
         ts = new Date(ev.timestamp);
       }
    } else {
      ts = new Date(ev.timestamp);
    }

    if (Number.isNaN(ts.getTime())) {
      results.push({ enrollId: ev.enrollId, ok: false, reason: 'invalid_timestamp' })
      continue
    }

    const result = await processBiometricEvent({
      deviceId: ev.deviceId,
      enrollId: ev.enrollId,
      timestamp: ts,
      raw: ev.raw,
    })

    if (!maxTs || ts.getTime() > maxTs.getTime()) maxTs = ts

    results.push({
      enrollId: ev.enrollId,
      ok: result.ok,
      reason: result.ok ? undefined : (result as any).reason,
    })
  }

  const deviceId = events[0]?.deviceId || 'LOCAL-FETCH'
  try {
    await BiometricSyncState.findOneAndUpdate(
      { deviceId },
      {
        $set: {
          lastTimestamp: maxTs || undefined,
          lastSuccessAt: new Date(),
          lastError: '',
          ...(bridgeId ? { bridgeId } : {}),
        },
      },
      { upsert: true, new: true },
    )
  } catch {}

  const okCount = results.filter((r) => r.ok).length
  console.log(`[biometric:push] Push received: ${events.length} events, ${okCount} processed OK${bridgeId ? `, bridgeId=${bridgeId}` : ''}`)

  res.json({ ok: true, processed: okCount, total: events.length, results })
}
