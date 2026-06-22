import { Request, Response } from 'express'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { CafeteriaUser } from '../models/User'
import { AuditLog } from '../models/AuditLog'
import { env } from '../../../config/env'

export async function list(_req: Request, res: Response) {
  const items = await CafeteriaUser.find().sort({ username: 1 }).lean()
  res.json({ items })
}

export async function create(req: Request, res: Response) {
  const { username, password, role } = (req.body || {}) as { username?: string; password?: string; role?: string }
  if (!username || !password) return res.status(400).json({ error: 'Username and password required' })
  const exists = await CafeteriaUser.findOne({ username }).lean()
  if (exists) return res.status(400).json({ error: 'Username already exists' })
  const passwordHash = await bcrypt.hash(password, 10)
  const u = await CafeteriaUser.create({ username, role: role || 'admin', passwordHash })
  try {
    const actor = (req as any).user?.name || (req as any).user?.email || 'system'
    await AuditLog.create({
      actor, action: 'Add User', label: 'ADD_USER', method: 'POST',
      path: req.originalUrl, at: new Date().toISOString(), detail: `${u.username} — ${u.role}`,
    })
  } catch {}
  res.status(201).json(u)
}

export async function update(req: Request, res: Response) {
  const { id } = req.params
  const { username, role, password } = (req.body || {}) as any
  const patch: any = {}
  if (username) patch.username = username
  if (role) patch.role = role
  if (password) patch.passwordHash = await bcrypt.hash(password, 10)
  const u = await CafeteriaUser.findByIdAndUpdate(id, patch, { new: true })
  if (!u) return res.status(404).json({ error: 'User not found' })
  res.json(u)
}

export async function remove(req: Request, res: Response) {
  const { id } = req.params
  await CafeteriaUser.findByIdAndDelete(id)
  res.json({ ok: true })
}

export async function login(req: Request, res: Response) {
  const { username, password } = (req.body || {}) as { username?: string; password?: string }
  const u: any = await CafeteriaUser.findOne({ username }).lean()
  if (!u) return res.status(401).json({ error: 'No account found with this username', code: 'USER_NOT_FOUND' })
  const pass = String(password || '')
  const ok = pass ? await bcrypt.compare(pass, u.passwordHash || '') : false
  if (!ok) return res.status(401).json({ error: 'Incorrect password', code: 'INVALID_PASSWORD' })
  try {
    await AuditLog.create({
      actor: u.username, action: 'Login', label: 'LOGIN', method: 'POST',
      path: req.originalUrl, at: new Date().toISOString(), detail: `User ${u.username} login`,
    })
  } catch {}
  const token = jwt.sign({ sub: String(u._id), username: u.username, role: u.role, scope: 'cafeteria' }, env.JWT_SECRET, { expiresIn: '1d' })
  res.json({ token, user: { id: String(u._id), username: u.username, role: u.role } })
}

export async function logout(req: Request, res: Response) {
  try {
    const actor = (req as any).user?.name || (req as any).user?.email || (req.body?.username) || 'system'
    await AuditLog.create({
      actor, action: 'Logout', label: 'LOGOUT', method: 'POST',
      path: req.originalUrl, at: new Date().toISOString(), detail: 'User logout',
    })
  } catch {}
  res.json({ ok: true })
}
