import { NextFunction, Request, Response } from 'express'

/**
 * Restrict route to admin or superadmin only.
 * Must be used AFTER the `auth` middleware so req.user is populated.
 */
export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  const role = String((req as any).user?.role || '').toLowerCase().trim()
  if (role === 'admin' || role === 'superadmin') return next()
  return res.status(403).json({ error: 'Forbidden: admin access required' })
}

/** Alias for backward compatibility */
export const requireHospitalAdmin = requireAdmin

/**
 * Restrict route to specific hospital roles.
 * Must be used AFTER the `auth` middleware so req.user is populated.
 */
export function requireHospitalRoles(...allowedRoles: string[]) {
  const normalized = allowedRoles.map(r => r.toLowerCase().trim())
  return (req: Request, res: Response, next: NextFunction) => {
    const role = String((req as any).user?.role || '').toLowerCase().trim()
    if (normalized.includes(role)) return next()
    return res.status(403).json({ error: 'Forbidden: insufficient privileges' })
  }
}
