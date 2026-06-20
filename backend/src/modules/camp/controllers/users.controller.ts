import { Request, Response } from 'express'
import bcrypt from 'bcryptjs'
import { CampUser } from '../models/CampUser'
import { campUserCreateSchema, campUserUpdateSchema } from '../validators'
import { CampAuditLog } from '../models/CampAuditLog'

export async function list(_req: Request, res: Response) {
  const items = await CampUser.find().sort({ username: 1 }).lean()
  res.json({ items })
}

export async function get(req: Request, res: Response) {
  const { id } = req.params
  const item = await CampUser.findById(id).lean()
  if (!item) return res.status(404).json({ message: 'User not found' })
  res.json(item)
}

export async function create(req: Request, res: Response) {
  const parsed = campUserCreateSchema.safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ message: 'Validation failed', issues: parsed.error.issues })
  const data = parsed.data
  const exists = await CampUser.findOne({ username: data.username }).lean()
  if (exists) return res.status(400).json({ message: 'Username already exists' })
  const passwordHash = await bcrypt.hash(data.password, 10)
  const u = await CampUser.create({
    username: data.username,
    fullName: data.fullName || '',
    role: data.role || 'admin',
    passwordHash,
    active: data.active !== false,
  })
  try {
    await CampAuditLog.create({
      actor: data.username,
      action: 'Add User',
      label: 'ADD_USER',
      method: 'POST',
      path: req.originalUrl,
      at: new Date().toISOString(),
      detail: `${u.username} — ${u.role}`,
    })
  } catch {}
  res.status(201).json(u)
}

export async function update(req: Request, res: Response) {
  const { id } = req.params
  const parsed = campUserUpdateSchema.safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ message: 'Validation failed', issues: parsed.error.issues })
  const data = parsed.data
  const patch: any = {}
  if (data.username) patch.username = data.username
  if (data.fullName !== undefined) patch.fullName = data.fullName
  if (data.role) patch.role = data.role
  if (data.active !== undefined) patch.active = data.active
  if (data.password) patch.passwordHash = await bcrypt.hash(data.password, 10)
  const u = await CampUser.findByIdAndUpdate(id, patch, { new: true })
  if (!u) return res.status(404).json({ message: 'User not found' })
  res.json(u)
}

export async function remove(req: Request, res: Response) {
  const { id } = req.params
  await CampUser.findByIdAndDelete(id)
  res.json({ ok: true })
}
