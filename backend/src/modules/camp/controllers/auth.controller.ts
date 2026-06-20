import { Request, Response } from 'express'
import jwt from 'jsonwebtoken'
import bcrypt from 'bcryptjs'
import { env } from '../../../config/env'
import { CampUser } from '../models/CampUser'
import { CampAuditLog } from '../models/CampAuditLog'

export async function login(req: Request, res: Response) {
  const { username, password } = req.body || {}
  if (!username || !password) return res.status(400).json({ message: 'Username and password required' })
  const user = await CampUser.findOne({ username }).lean() as any
  if (!user || !user.active) {
    try {
      await CampAuditLog.create({
        actor: String(username || ''),
        action: 'auth.login.fail',
        label: 'LOGIN_FAIL',
        method: 'POST',
        path: req.originalUrl,
        at: new Date().toISOString(),
        detail: `Login failed for ${username}`,
      })
    } catch {}
    return res.status(401).json({ message: 'Invalid credentials' })
  }
  const ok = await bcrypt.compare(password, user.passwordHash)
  if (!ok) {
    try {
      await CampAuditLog.create({
        actor: String(username || ''),
        action: 'auth.login.fail',
        label: 'LOGIN_FAIL',
        method: 'POST',
        path: req.originalUrl,
        at: new Date().toISOString(),
        detail: `Login failed for ${username}`,
      })
    } catch {}
    return res.status(401).json({ message: 'Invalid credentials' })
  }
  const token = jwt.sign({ sub: user._id, username: user.username, role: user.role, scope: 'camp' }, env.JWT_SECRET, { expiresIn: '1d' })
  try {
    await CampAuditLog.create({
      actor: user.username,
      action: 'auth.login',
      label: 'LOGIN',
      method: 'POST',
      path: req.originalUrl,
      at: new Date().toISOString(),
      detail: `User ${user.username} logged in`,
    })
  } catch {}
  res.json({ token, user: { id: user._id, username: user.username, role: user.role, fullName: user.fullName } })
}

export async function logout(req: Request, res: Response) {
  try {
    const u = (req as any).user
    await CampAuditLog.create({
      actor: u?.username || '',
      action: 'auth.logout',
      label: 'LOGOUT',
      method: 'POST',
      path: req.originalUrl,
      at: new Date().toISOString(),
      detail: 'User logout',
    })
  } catch {}
  res.json({ success: true })
}

export async function me(req: Request, res: Response) {
  const u = (req as any).user
  if (!u) return res.status(401).json({ message: 'Unauthorized' })
  const user = await CampUser.findById(u.sub || u.id).lean() as any
  if (!user) return res.status(401).json({ message: 'User not found' })
  res.json({ id: user._id, username: user.username, role: user.role, fullName: user.fullName, active: user.active })
}
