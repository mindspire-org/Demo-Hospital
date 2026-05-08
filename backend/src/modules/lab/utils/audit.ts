import { Request } from 'express'
import { LabAuditLog } from '../models/AuditLog'

export function actorOf(req: Request): { actor: string; userId?: string } {
  const u: any = (req as any).user || {}
  return {
    actor: u.username || u.name || u.email || 'system',
    userId: u.id || u._id || u.sub,
  }
}

export async function logAudit(
  req: Request,
  args: {
    action: string
    entity?: string
    entityId?: string
    label?: string
    detail?: string
    before?: any
    after?: any
    centerId?: string
  },
) {
  try {
    const { actor, userId } = actorOf(req)
    await LabAuditLog.create({
      actor,
      userId,
      action: args.action,
      label: args.label,
      detail: args.detail,
      method: req.method,
      path: req.path,
      at: new Date().toISOString(),
      entity: args.entity,
      entityId: args.entityId,
      before: args.before,
      after: args.after,
      centerId: args.centerId,
      ip: (req.headers['x-forwarded-for'] as string) || (req as any).ip,
    })
  } catch (e) {
    // Swallow audit errors so they don't break the request
    console.warn('[AUDIT] Failed to log:', e)
  }
}
