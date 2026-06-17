import { NextFunction, Request, Response } from 'express'
import jwt from 'jsonwebtoken'
import { env } from '../../config/env'

export function superAdminGuard(req: Request, res: Response, next: NextFunction) {
  const auth = String(req.headers['authorization'] || '')
  const bearer = auth.startsWith('Bearer ') ? auth.slice(7) : ''

  if (bearer) {
    try {
      const payload: any = jwt.verify(bearer, env.JWT_SECRET)
      if (payload?.scope === 'super_admin') {
        ;(req as any).superAdmin = payload
        return next()
      }
    } catch (err: any) {
      if (err.name === 'TokenExpiredError') {
        return res.status(401).json({ error: 'Token expired' })
      }
    }
  }

  return res.status(403).json({ error: 'Forbidden: super admin access required' })
}

export function superAdminGuardOrMasterKey(req: Request, res: Response, next: NextFunction) {
  const masterKey = String(req.headers['x-master-key'] || '')
  if (masterKey && masterKey === (env as any).SUPER_ADMIN_MASTER_KEY) {
    ;(req as any).superAdmin = { type: 'master_key', scope: 'super_admin' }
    return next()
  }
  return superAdminGuard(req, res, next)
}
