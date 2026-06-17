import { Request, Response } from 'express'
import jwt from 'jsonwebtoken'
import bcrypt from 'bcryptjs'
import crypto from 'crypto'
import { env } from '../../../config/env'
import { SuperAdminUser } from '../models/SuperAdminUser'
import { SystemConfig } from '../models/SystemConfig'
import { ClientProfile } from '../models/ClientProfile'
import { SuperAdminAuditLog } from '../models/SuperAdminAuditLog'
import { loginSchema, setupSchema, createAdminSchema, updateConfigSchema, updateClientSchema } from '../validators/superAdmin'
import { MODULE_REGISTRY, getAllModuleIds, getAllSubModules } from '../../../config/moduleRegistry'

const JWT_EXPIRY = '8h'

function getClientIp(req: Request): string {
  const fwd = req.headers['x-forwarded-for']
  if (typeof fwd === 'string') return fwd.split(',')[0].trim()
  if (Array.isArray(fwd)) return fwd[0]
  return req.socket?.remoteAddress || 'unknown'
}

async function audit(actor: string, actorType: 'db_user' | 'master_key', action: string, req: Request, opts?: { target?: string; before?: any; after?: any }) {
  try {
    await SuperAdminAuditLog.create({
      actor,
      actorType,
      action,
      target: opts?.target,
      before: opts?.before,
      after: opts?.after,
      ip: getClientIp(req),
      userAgent: String(req.headers['user-agent'] || ''),
    })
  } catch (e) {
    console.error('[SuperAdminAudit] Failed to log:', e)
  }
}

function buildDefaultConfig(): any {
  const modules: any = {}
  for (const modId of getAllModuleIds()) {
    const sub: any = {}
    for (const subId of getAllSubModules(modId)) {
      sub[subId] = { enabled: false }
    }
    modules[modId] = { enabled: false, subModules: sub }
  }

  // Default visible portals before super-admin configuration
  modules.hospital = { enabled: true, subModules: {} }
  modules.finance = { enabled: true, subModules: {} }

  // Default visible hospital sub-modules
  const defaultHospitalSubs = ['tokenGen', 'doctor', 'admin']
  for (const subId of getAllSubModules('hospital')) {
    modules.hospital.subModules[subId] = { enabled: defaultHospitalSubs.includes(subId) }
  }

  return {
    _id: 'default',
    modules,
    homeModules: ['hospital', 'finance'],
    version: 1,
  }
}

export async function getOrCreateDefaultConfig(): Promise<any> {
  let doc: any = await SystemConfig.findById('default').lean()
  if (!doc) {
    const def = buildDefaultConfig()
    doc = await SystemConfig.create(def)
  }
  return doc
}

export function stripPublic(config: any): any {
  if (!config) return buildDefaultConfig()
  return {
    modules: config.modules,
    homeModules: config.homeModules || getAllModuleIds(),
    version: config.version || 1,
    updatedAt: config.updatedAt ? new Date(config.updatedAt).toISOString() : new Date().toISOString(),
  }
}

// Hardcoded super admin credentials (fallback when no DB user exists)
const HARDCODED_SUPER_ADMIN = {
  username: 'info@healthspire.org',
  password: 'E@lthsp!re5544@',
  fullName: 'HealthSpire Administrator',
}

// POST /api/admin/super/login
export async function superAdminLogin(req: Request, res: Response) {
  const data = loginSchema.parse(req.body)
  const masterKey = String(req.headers['x-master-key'] || '')

  // Master key login
  if (masterKey && masterKey === (env as any).SUPER_ADMIN_MASTER_KEY) {
    if (data.masterKey && data.masterKey === (env as any).SUPER_ADMIN_MASTER_KEY) {
      const token = jwt.sign({ type: 'master_key', scope: 'super_admin' }, env.JWT_SECRET, { expiresIn: JWT_EXPIRY })
      await audit('master_key', 'master_key', 'login', req)
      return res.json({ token, type: 'master_key' })
    }
  }

  // Validate input
  if (!data.username || !data.password) {
    return res.status(400).json({ error: 'Username and password required' })
  }

  const username = data.username.trim().toLowerCase()

  // Check hardcoded credentials first (fallback option)
  if (username === HARDCODED_SUPER_ADMIN.username.toLowerCase() && data.password === HARDCODED_SUPER_ADMIN.password) {
    // Check if this user already exists in DB - if so, prefer DB version
    const dbUser: any = await SuperAdminUser.findOne({ username }).lean()
    if (!dbUser) {
      // Hardcoded login successful - auto-create DB user for future logins
      const passwordHash = await bcrypt.hash(HARDCODED_SUPER_ADMIN.password, 10)
      const newUser = await SuperAdminUser.create({
        username: HARDCODED_SUPER_ADMIN.username,
        passwordHash,
        fullName: HARDCODED_SUPER_ADMIN.fullName,
        email: HARDCODED_SUPER_ADMIN.username,
        active: true,
      })
      const token = jwt.sign({ sub: String(newUser._id), username: newUser.username, type: 'db_user', scope: 'super_admin' }, env.JWT_SECRET, { expiresIn: JWT_EXPIRY })
      await audit(newUser.username, 'db_user', 'login', req)
      return res.json({ token, type: 'db_user', user: { id: String(newUser._id), username: newUser.username, fullName: newUser.fullName, note: 'Auto-created from hardcoded credentials' } })
    }
  }

  // DB user login (standard flow)
  const u: any = await SuperAdminUser.findOne({ username }).lean()
  if (!u || u.active === false) return res.status(401).json({ error: 'Invalid credentials' })

  const ok = await bcrypt.compare(data.password, u.passwordHash)
  if (!ok) return res.status(401).json({ error: 'Invalid credentials' })

  const token = jwt.sign({ sub: String(u._id), username: u.username, type: 'db_user', scope: 'super_admin' }, env.JWT_SECRET, { expiresIn: JWT_EXPIRY })
  await audit(u.username, 'db_user', 'login', req)
  res.json({ token, type: 'db_user', user: { id: String(u._id), username: u.username, fullName: u.fullName } })
}

// POST /api/admin/super/setup
export async function superAdminSetup(req: Request, res: Response) {
  const data = setupSchema.parse(req.body)
  const masterKey = String(req.headers['x-master-key'] || '')
  if (masterKey !== (env as any).SUPER_ADMIN_MASTER_KEY) {
    return res.status(403).json({ error: 'Invalid master key' })
  }

  const existingAdmin = await SuperAdminUser.findOne().lean()
  if (existingAdmin) {
    return res.status(409).json({ error: 'Setup already completed' })
  }

  const existingConfig = await SystemConfig.findById('default').lean()
  if (existingConfig) {
    return res.status(409).json({ error: 'Setup already completed' })
  }

  const licenseKey = crypto.randomUUID()
  const passwordHash = await bcrypt.hash(data.adminPassword, 10)

  const admin = await SuperAdminUser.create({
    username: data.adminUsername.trim().toLowerCase(),
    passwordHash,
    fullName: data.adminFullName || data.adminUsername,
  })

  const config = buildDefaultConfig()
  await SystemConfig.create(config)

  const client = await ClientProfile.create({
    clientName: data.clientName,
    licenseKey,
    contactPerson: data.contactPerson,
    contactPhone: data.contactPhone,
    contactEmail: data.contactEmail,
    hospitalName: data.hospitalName,
    address: data.address,
    city: data.city,
    country: data.country,
    maxUsers: data.maxUsers,
    modulesAllowed: getAllModuleIds(),
  })

  await audit(data.adminUsername, 'master_key', 'setup', req, { target: 'system', after: { clientId: String(client._id), licenseKey } })

  const token = jwt.sign({ sub: String(admin._id), username: admin.username, type: 'db_user', scope: 'super_admin' }, env.JWT_SECRET, { expiresIn: JWT_EXPIRY })
  res.json({ token, licenseKey, message: 'Setup complete' })
}

// GET /api/admin/super/public-config
export async function getPublicConfig(req: Request, res: Response) {
  const config = await getOrCreateDefaultConfig()
  res.json(stripPublic(config))
}

// GET /api/admin/super/config
export async function getSystemConfig(req: Request, res: Response) {
  const config = await getOrCreateDefaultConfig()
  const client = await ClientProfile.findOne().lean()
  res.json({ config: stripPublic(config), client })
}

// PUT /api/admin/super/config
export async function updateSystemConfig(req: Request, res: Response) {
  const data = updateConfigSchema.parse(req.body)
  const actor = String((req as any).superAdmin?.username || 'unknown')
  const actorType = (req as any).superAdmin?.type === 'master_key' ? 'master_key' : 'db_user'

  const current: any = await SystemConfig.findById('default').lean()
  if (!current) return res.status(404).json({ error: 'Config not found' })

  if (data.version !== current.version) {
    return res.status(409).json({ error: 'Version mismatch. Config was modified by another user. Please refresh and try again.' })
  }

  const patch: any = { version: current.version + 1, updatedAt: new Date(), updatedBy: actor }
  if (data.modules) patch.modules = data.modules
  if (data.homeModules) patch.homeModules = data.homeModules

  const updated = await SystemConfig.findByIdAndUpdate('default', { $set: patch }, { new: true }).lean()

  await audit(actor, actorType, 'update_config', req, { target: 'SystemConfig', before: current, after: updated })

  res.json(stripPublic(updated))
}

// GET /api/admin/super/client
export async function getClientProfile(req: Request, res: Response) {
  const client = await ClientProfile.findOne().lean()
  if (!client) {
    return res.json({
      clientName: '',
      contactPerson: '',
      contactPhone: '',
      contactEmail: '',
      hospitalName: '',
      address: '',
      city: '',
      country: '',
      maxUsers: 0,
      licenseKey: '',
      supportExpiry: '',
      usageLog: [],
    })
  }
  res.json(client)
}

// PUT /api/admin/super/client
export async function updateClientProfile(req: Request, res: Response) {
  const data = updateClientSchema.parse(req.body)
  const actor = String((req as any).superAdmin?.username || 'unknown')
  const actorType = (req as any).superAdmin?.type === 'master_key' ? 'master_key' : 'db_user'

  const current: any = await ClientProfile.findOne().lean()
  if (!current) return res.status(404).json({ error: 'Client profile not found' })

  const patch: any = {}
  if (data.clientName !== undefined) patch.clientName = data.clientName
  if (data.contactPerson !== undefined) patch.contactPerson = data.contactPerson
  if (data.contactPhone !== undefined) patch.contactPhone = data.contactPhone
  if (data.contactEmail !== undefined) patch.contactEmail = data.contactEmail || undefined
  if (data.hospitalName !== undefined) patch.hospitalName = data.hospitalName
  if (data.address !== undefined) patch.address = data.address
  if (data.city !== undefined) patch.city = data.city
  if (data.country !== undefined) patch.country = data.country
  if (data.maxUsers !== undefined) patch.maxUsers = data.maxUsers

  const updated = await ClientProfile.findByIdAndUpdate(current._id, { $set: patch }, { new: true }).lean()

  await audit(actor, actorType, 'update_client', req, { target: 'ClientProfile', before: current, after: updated })

  res.json(updated)
}

// GET /api/admin/super/roles/:module
export async function getModuleRoles(req: Request, res: Response) {
  const moduleId = req.params.module
  const modelMap: Record<string, string> = {
    hospital: 'Hospital_User',
    lab: 'Lab_User',
    pharmacy: 'Pharmacy_User',
    indoorPharmacy: 'IndoorPharmacy_User',
    diagnostic: 'Diagnostic_User',
    dialysis: 'Dialysis_User',
    finance: 'Finance_User',
    reception: 'Reception_User',
    aesthetic: 'Aesthetic_User',
  }
  const modelName = modelMap[moduleId]
  if (!modelName) return res.json({ roles: [] })

  try {
    const mongoose = (await import('mongoose')).default
    const Model = mongoose.models[modelName]
    if (!Model) return res.json({ roles: [] })
    const docs = await Model.distinct('role').lean()
    const roles = (docs || []).filter(Boolean).map(String)
    res.json({ roles })
  } catch {
    res.json({ roles: [] })
  }
}

// POST /api/admin/super/admins
export async function createSuperAdmin(req: Request, res: Response) {
  const data = createAdminSchema.parse(req.body)
  const username = data.username.trim().toLowerCase()
  const existing = await SuperAdminUser.findOne({ username }).lean()
  if (existing) return res.status(409).json({ error: 'Username already exists' })

  const passwordHash = await bcrypt.hash(data.password, 10)
  const admin = await SuperAdminUser.create({
    username,
    passwordHash,
    fullName: data.fullName,
    email: data.email,
    phone: data.phone,
  })

  const actor = String((req as any).superAdmin?.username || 'system')
  const actorType = (req as any).superAdmin?.type === 'master_key' ? 'master_key' : 'db_user'
  await audit(actor, actorType, 'create_admin', req, { target: String(admin._id), after: { username } })

  res.json({ id: String(admin._id), username, message: 'Super admin created' })
}

// GET /api/admin/super/admins
export async function listSuperAdmins(req: Request, res: Response) {
  const admins = await SuperAdminUser.find({}, { passwordHash: 0 }).lean()
  res.json(admins)
}

// DELETE /api/admin/super/admins/:id
export async function deleteSuperAdmin(req: Request, res: Response) {
  const id = req.params.id
  const selfId = String((req as any).superAdmin?.sub || '')
  if (id === selfId) return res.status(400).json({ error: 'Cannot delete yourself' })

  const actor = String((req as any).superAdmin?.username || 'unknown')
  const actorType = (req as any).superAdmin?.type === 'master_key' ? 'master_key' : 'db_user'

  const deleted: any = await SuperAdminUser.findByIdAndDelete(id).lean()
  if (!deleted) return res.status(404).json({ error: 'Admin not found' })

  await audit(actor, actorType, 'delete_admin', req, { target: id, before: { username: deleted.username } })
  res.json({ ok: true })
}

// GET /api/admin/super/usage
export async function getUsageStats(req: Request, res: Response) {
  const client: any = await ClientProfile.findOne().lean()
  const config: any = await getOrCreateDefaultConfig()
  const totalAdmins = await SuperAdminUser.countDocuments({ active: true })

  const enabledModules = Object.entries(config?.modules || {})
    .filter(([, v]) => (v as any)?.enabled)
    .map(([k]) => k)

  const enabledSubModules: Record<string, string[]> = {}
  for (const [modId, mod] of Object.entries(config?.modules || {})) {
    const m = mod as any
    if (!m?.enabled || !m?.subModules) continue
    enabledSubModules[modId] = Object.entries(m.subModules)
      .filter(([, s]) => (s as any)?.enabled)
      .map(([k]) => k)
  }

  const logs = (client?.usageLog || []).slice(-500)

  res.json({
    totalAdmins,
    enabledModules,
    enabledSubModules,
    licenseKey: client?.licenseKey,
    supportExpiry: client?.supportExpiry,
    maxUsers: client?.maxUsers || 0,
    usageLog: logs,
  })
}
