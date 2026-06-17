import { Request, Response } from 'express'
import bcrypt from 'bcryptjs'
import { FinanceUser } from '../models/finance_User'

export async function list(_req: Request, res: Response){
  const items = await FinanceUser.find().sort({ username: 1 }).lean()
  res.json({ items })
}

export async function create(req: Request, res: Response){
  const { username, role, password } = req.body
  const exists = await FinanceUser.findOne({ username }).lean()
  if (exists) return res.status(400).json({ error: 'Username already exists' })
  const passwordHash = await bcrypt.hash(password, 10)
  const u = await FinanceUser.create({ username, role, passwordHash })
  res.status(201).json(u)
}

export async function update(req: Request, res: Response){
  const { id } = req.params
  const { username, role, password } = req.body
  const patch: any = {}
  if (username) patch.username = username
  if (role) patch.role = role
  if (password) patch.passwordHash = await bcrypt.hash(password, 10)
  const u = await FinanceUser.findByIdAndUpdate(id, patch, { new: true })
  res.json(u)
}

export async function remove(req: Request, res: Response){
  const { id } = req.params
  await FinanceUser.findByIdAndDelete(id)
  res.json({ ok: true })
}

export async function login(req: Request, res: Response){
  const { username, password } = (req.body || {}) as { username?: string; password?: string }
  const u: any = await FinanceUser.findOne({ username }).lean()
  if (!u) return res.status(401).json({ error: 'Invalid credentials' })
  const pass = String(password || '')
  const ok = pass ? await bcrypt.compare(pass, u.passwordHash || '') : false
  if (!ok) return res.status(401).json({ error: 'Invalid credentials' })
  res.json({ user: { id: String(u._id), username: u.username, role: u.role } })
}

export async function logout(_req: Request, res: Response){
  res.json({ ok: true })
}
