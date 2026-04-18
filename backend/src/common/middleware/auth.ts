import { NextFunction, Request, Response } from 'express'
import jwt from 'jsonwebtoken'
import { env } from '../../config/env'

export function auth(req: Request, res: Response, next: NextFunction) {
  const hdr = req.headers.authorization || ''
  const token = hdr.startsWith('Bearer ') ? hdr.slice(7) : ''
  if (!token) {
    console.log('[AUTH] No token provided for', req.method, req.path)
    return res.status(401).json({ message: 'Unauthorized' })
  }
  try {
    const payload = jwt.verify(token, env.JWT_SECRET) as any
    // Accept any valid JWT - cross-module access allowed
    const norm: any = {
      ...payload,
      id: payload?.id || payload?.sub || payload?._id,
      _id: payload?._id || payload?.sub || payload?.id,
    }
    ;(req as any).user = norm
    console.log('[AUTH] Success for', req.method, req.path, '- user:', norm.username || norm.id, '- scope:', norm.scope || 'none')
    next()
  } catch (err: any) {
    console.log('[AUTH] Invalid token for', req.method, req.path, '- error:', err?.message || 'unknown error')
    return res.status(401).json({ message: 'Invalid token' })
  }
}
