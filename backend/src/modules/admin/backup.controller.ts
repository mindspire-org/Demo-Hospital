import { Request, Response } from 'express'

import mongoose, { Types } from 'mongoose'

import { promises as fs } from 'fs'

import path from 'path'

import cron, { ScheduledTask } from 'node-cron'

import { env } from '../../config/env'

// ── Auto-backup cron state ──────────────────────────────────────────
let cronJob: ScheduledTask | null = null
let cronRunning = false
let lastCronBackup: string | null = null

export function startAutoBackupCron(){
  if (cronJob) { cronJob.stop(); cronJob = null }
  const expr = env.BACKUP_CRON || '0 2 * * *'
  if (!cron.validate(expr)) return
  cronJob = cron.schedule(expr, async () => {
    if (cronRunning) return
    cronRunning = true
    try {
      const file = await runBackupToDisk()
      lastCronBackup = new Date().toISOString()
      console.log(`[auto-backup] saved → ${file}`)
    } catch (e) {
      console.error('[auto-backup] failed', e)
    } finally { cronRunning = false }
  })
  cronRunning = false
}



function isPlainObject(v: any){ return Object.prototype.toString.call(v) === '[object Object]' }

const BACKUP_DIR = () => path.resolve(env.BACKUP_DIR || path.join(process.cwd(), 'backups'))



function serializeValue(v: any): any {

  if (v == null) return v

  if (v instanceof Types.ObjectId) return { $oid: v.toString() }

  if (v instanceof Date) return { $date: v.toISOString() }

  if (Array.isArray(v)) return v.map(serializeValue)

  if (isPlainObject(v)) return serializeDoc(v)

  return v

}



function serializeDoc(doc: any){

  const out: any = {}

  for (const k of Object.keys(doc)) out[k] = serializeValue((doc as any)[k])

  return out

}



function deserializeValue(v: any): any {

  if (v == null) return v

  if (isPlainObject(v) && ('$oid' in v) && typeof v.$oid === 'string') return new Types.ObjectId(v.$oid)

  if (isPlainObject(v) && ('$date' in v) && typeof v.$date === 'string') return new Date(v.$date)

  if (Array.isArray(v)) return v.map(deserializeValue)

  if (isPlainObject(v)) return deserializeDoc(v)

  return v

}



function deserializeDoc(doc: any){

  const out: any = {}

  for (const k of Object.keys(doc)) out[k] = deserializeValue((doc as any)[k])

  return out

}



async function listCollectionNames(){

  const cols = await mongoose.connection.db!.listCollections().toArray()

  return cols

    .map(c => c.name)

    .filter(name => !name.startsWith('system.'))

}



export async function exportAll(req: Request, res: Response){

  const dbName = mongoose.connection.db!.databaseName

  const names = await listCollectionNames()

  const collections: Record<string, any[]> = {}

  for (const name of names){

    const docs = await mongoose.connection.db!.collection(name).find({}).toArray()

    collections[name] = docs.map(serializeDoc)

  }

  const payload = {

    _meta: { ts: new Date().toISOString(), db: dbName, app: 'hospital-mis', version: 1 },

    collections,

  }

  const stamp = new Date().toISOString().replace(/[:T]/g,'-').slice(0,19)

  res.setHeader('Content-Type', 'application/json')

  res.setHeader('Content-Disposition', `attachment; filename="backup-${dbName}-${stamp}.json"`)

  res.status(200).send(JSON.stringify(payload))

}



export async function purgeAll(_req: Request, res: Response){

  const ok = String((_req.body as any)?.confirm || '').toUpperCase() === 'PURGE'

  if (!ok) return res.status(400).json({ error: 'Confirmation required. Set body.confirm = "PURGE".' })

  // Delete all collections except user collections
  const names = await listCollectionNames()
  const userCollections = ['hospital_users', 'lab_users', 'aesthetic_users', 'dialysis_users',
    'diagnostic_users', 'finance_users', 'pharmacy_users', 'reception_users']

  for (const name of names){
    if (!userCollections.includes(name.toLowerCase())){
      await mongoose.connection.db!.collection(name).deleteMany({})
    }
  }

  res.json({ ok: true })

}



export async function restoreAll(req: Request, res: Response){

  const body = (req.body || {}) as any

  const collections: Record<string, any[]> = body.collections || {}

  if (!collections || typeof collections !== 'object'){

    return res.status(400).json({ error: 'Invalid backup format' })

  }

  const ok = String((req.body as any)?.confirm || '').toUpperCase() === 'RESTORE'

  if (!ok) return res.status(400).json({ error: 'Confirmation required. Set body.confirm = "RESTORE".' })

  // Drop the database first

  await mongoose.connection.db!.dropDatabase()

  // Insert each collection

  for (const name of Object.keys(collections)){

    const arr = Array.isArray(collections[name]) ? collections[name] : []

    if (!arr.length) continue

    const docs = arr.map(deserializeDoc)

    await mongoose.connection.db!.collection(name).insertMany(docs, { ordered: false })

  }

  res.json({ ok: true })

}



export async function runBackupToDisk(){

  const dbName = mongoose.connection.db!.databaseName

  const names = await listCollectionNames()

  const collections: Record<string, any[]> = {}

  for (const name of names){

    const docs = await mongoose.connection.db!.collection(name).find({}).toArray()

    collections[name] = docs.map(serializeDoc)

  }

  const payload = { _meta: { ts: new Date().toISOString(), db: dbName, app: 'hospital-mis', version: 1 }, collections }

  const outDir = BACKUP_DIR()

  await fs.mkdir(outDir, { recursive: true })

  const stamp = new Date().toISOString().replace(/[:T]/g,'-').slice(0,19)

  const file = path.join(outDir, `backup-${dbName}-${stamp}.json`)

  await fs.writeFile(file, JSON.stringify(payload))

  await applyRetention(outDir)

  return file

}



async function applyRetention(dir: string){

  const max = Math.max(1, Number(env.BACKUP_RETENTION_COUNT || 30))

  const items = (await fs.readdir(dir)).filter(f => f.startsWith('backup-') && f.endsWith('.json'))

  const withStat = await Promise.all(items.map(async f => ({ f, stat: await fs.stat(path.join(dir, f)) })))

  withStat.sort((a,b)=> b.stat.mtimeMs - a.stat.mtimeMs)

  const toDelete = withStat.slice(max)

  for (const d of toDelete){ try { await fs.unlink(path.join(dir, d.f)) } catch {} }

}

// ── Snapshot endpoints ──────────────────────────────────────────────

export async function listSnapshots(_req: Request, res: Response){
  try {
    const outDir = BACKUP_DIR()
    await fs.mkdir(outDir, { recursive: true })
    const items = (await fs.readdir(outDir)).filter(f => f.startsWith('backup-') && f.endsWith('.json'))
    const withStat = await Promise.all(items.map(async f => {
      const stat = await fs.stat(path.join(outDir, f))
      return { filename: f, size: stat.size, modified: stat.mtime.toISOString() }
    }))
    withStat.sort((a,b) => new Date(b.modified).getTime() - new Date(a.modified).getTime())
    res.json({ snapshots: withStat })
  } catch (e: any) {
    res.status(500).json({ error: e?.message || 'Failed to list snapshots' })
  }
}

export async function createSnapshot(_req: Request, res: Response){
  try {
    const file = await runBackupToDisk()
    const stat = await fs.stat(file)
    res.json({ ok: true, filename: path.basename(file), size: stat.size, modified: stat.mtime.toISOString() })
  } catch (e: any) {
    res.status(500).json({ error: e?.message || 'Snapshot failed' })
  }
}

export async function deleteSnapshot(req: Request, res: Response){
  try {
    const filename = String(req.params.filename || '').replace(/\.\./g, '').replace(/[/\\]/g, '')
    if (!filename.startsWith('backup-') || !filename.endsWith('.json')) {
      return res.status(400).json({ error: 'Invalid snapshot filename' })
    }
    const outDir = BACKUP_DIR()
    const filePath = path.join(outDir, filename)
    await fs.unlink(filePath)
    res.json({ ok: true })
  } catch (e: any) {
    res.status(500).json({ error: e?.message || 'Delete failed' })
  }
}

export async function downloadSnapshot(req: Request, res: Response){
  try {
    const filename = String(req.params.filename || '').replace(/\.\./g, '').replace(/[/\\]/g, '')
    if (!filename.startsWith('backup-') || !filename.endsWith('.json')) {
      return res.status(400).json({ error: 'Invalid snapshot filename' })
    }
    const outDir = BACKUP_DIR()
    const filePath = path.join(outDir, filename)
    const stat = await fs.stat(filePath).catch(() => null)
    if (!stat) return res.status(404).json({ error: 'Snapshot not found' })
    res.setHeader('Content-Type', 'application/json')
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`)
    const content = await fs.readFile(filePath)
    res.status(200).send(content)
  } catch (e: any) {
    res.status(500).json({ error: e?.message || 'Download failed' })
  }
}

export async function restoreSnapshot(req: Request, res: Response){
  try {
    const filename = String(req.params.filename || '').replace(/\.\./g, '').replace(/[/\\]/g, '')
    if (!filename.startsWith('backup-') || !filename.endsWith('.json')) {
      return res.status(400).json({ error: 'Invalid snapshot filename' })
    }
    const ok = String((req.body as any)?.confirm || '').toUpperCase() === 'RESTORE'
    if (!ok) return res.status(400).json({ error: 'Confirmation required. Set body.confirm = "RESTORE".' })
    const outDir = BACKUP_DIR()
    const filePath = path.join(outDir, filename)
    const raw = await fs.readFile(filePath, 'utf-8')
    const data = JSON.parse(raw)
    const collections: Record<string, any[]> = data.collections || {}
    if (!collections || typeof collections !== 'object') {
      return res.status(400).json({ error: 'Invalid backup format' })
    }
    await mongoose.connection.db!.dropDatabase()
    for (const name of Object.keys(collections)){
      const arr = Array.isArray(collections[name]) ? collections[name] : []
      if (!arr.length) continue
      const docs = arr.map(deserializeDoc)
      await mongoose.connection.db!.collection(name).insertMany(docs, { ordered: false })
    }
    res.json({ ok: true })
  } catch (e: any) {
    res.status(500).json({ error: e?.message || 'Restore failed' })
  }
}

export async function backupStatus(_req: Request, res: Response){
  try {
    const outDir = BACKUP_DIR()
    await fs.mkdir(outDir, { recursive: true })
    const items = (await fs.readdir(outDir)).filter(f => f.startsWith('backup-') && f.endsWith('.json'))
    let totalSize = 0
    for (const f of items) {
      try { const s = await fs.stat(path.join(outDir, f)); totalSize += s.size } catch {}
    }
    const names = await listCollectionNames()
    let totalDocs = 0
    const collectionStats: { name: string; count: number }[] = []
    for (const name of names) {
      const count = await mongoose.connection.db!.collection(name).countDocuments()
      totalDocs += count
      collectionStats.push({ name, count })
    }
    res.json({
      autoBackup: {
        enabled: !!cronJob,
        cronExpression: env.BACKUP_CRON || '0 2 * * *',
        lastRun: lastCronBackup,
        running: cronRunning,
        retentionCount: env.BACKUP_RETENTION_COUNT || 30,
        backupDir: BACKUP_DIR(),
      },
      snapshotCount: items.length,
      totalSizeBytes: totalSize,
      dbStats: {
        name: mongoose.connection.db!.databaseName,
        collections: names.length,
        totalDocs,
        collectionStats,
      },
    })
  } catch (e: any) {
    res.status(500).json({ error: e?.message || 'Status failed' })
  }
}

