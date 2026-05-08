import { Request, Response, NextFunction } from 'express'
import { LabUser } from '../models/User'
import { LabCollectionCenter } from '../models/CollectionCenter'

/**
 * Loads the user's scope (collection center + department) and attaches it to
 * the request as `req.scope`.
 *
 * For main-lab admins (`isMainLab !== false`), no scope filter is applied.
 * For collection-center users, scope expands to:
 *   - their own center
 *   - any centers whose `parentCenterId` is theirs (head-center sees children)
 *   - any centers in their `pairedCenterIds`
 * Sub-centers cannot see their head-center's data (parent is excluded).
 */
export type LabScope = {
  isMainLab: boolean
  centerIds: string[] | null // null = unrestricted (main lab admin)
  departmentId?: string | null
  emergencyDayIds?: string[]
  outsourceLabId?: string | null
}

export async function attachScope(req: Request, _res: Response, next: NextFunction) {
  try {
    const u: any = (req as any).user || {}
    // Try to find the lab user record
    const userId = u._id || u.id || u.sub
    let labUser: any = null
    if (userId) {
      try { labUser = await LabUser.findById(userId).lean() } catch {}
    }
    if (!labUser && u.username) {
      try { labUser = await LabUser.findOne({ username: u.username }).lean() } catch {}
    }

    const isMainLab = labUser ? labUser.isMainLab !== false : true
    const scope: LabScope = {
      isMainLab,
      centerIds: null,
      departmentId: labUser?.assignedDepartmentId || null,
      emergencyDayIds: labUser?.emergencyDayIds || [],
      outsourceLabId: labUser?.outsourceLabId || null,
    }

    if (!isMainLab && labUser?.assignedCenterId) {
      const myId = String(labUser.assignedCenterId)
      // Children whose parentCenterId === me
      const children = await LabCollectionCenter.find({ parentCenterId: labUser.assignedCenterId }).select('_id').lean()
      const me: any = await LabCollectionCenter.findById(labUser.assignedCenterId).select('pairedCenterIds').lean()
      const ids = new Set<string>([myId])
      for (const c of children) ids.add(String(c._id))
      for (const p of (me?.pairedCenterIds || [])) ids.add(String(p))
      scope.centerIds = Array.from(ids)
    }

    ;(req as any).scope = scope
    next()
  } catch (e: any) {
    console.warn('[SCOPE] Failed to attach scope:', e?.message)
    ;(req as any).scope = { isMainLab: true, centerIds: null }
    next()
  }
}

/**
 * Returns a Mongoose `$or`/`$in` filter object that should be merged with any
 * controller's filter to enforce the user's scope. Returns `{}` for unscoped
 * (main-lab) users.
 */
export function scopeFilter(req: Request, fieldName = 'collectionCenterId'): any {
  const scope: LabScope = (req as any).scope || { isMainLab: true, centerIds: null }
  if (scope.isMainLab || !scope.centerIds) return {}
  return { [fieldName]: { $in: scope.centerIds } }
}

/**
 * Department-scope filter for Test Result List. Restricts to the user's
 * assigned department + emergency day(s) when set.
 */
export function departmentFilter(req: Request, fieldName = 'departmentId'): any {
  const scope: LabScope = (req as any).scope || { isMainLab: true, centerIds: null }
  if (scope.isMainLab) return {}
  const f: any = {}
  if (scope.departmentId) f[fieldName] = scope.departmentId
  return f
}
