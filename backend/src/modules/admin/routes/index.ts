import { Router, Request, Response } from 'express'
import { exportAll, purgeAll, restoreAll, dbStats, listAutoBackups } from '../backup.controller'
import { adminGuard } from '../../../common/middleware/admin_guard'
import { superAdminGuard } from '../../../common/middleware/superAdmin_guard'
import superAdminRouter from './superAdmin.routes'

const r = Router()

// Server-side session auth: check current admin session (no localStorage)
r.get('/me', (req: Request, res: Response) => {
  const s = (req as any).session
  if (s?.adminUser) {
    return res.json({ authenticated: true, user: s.adminUser })
  }
  return res.status(401).json({ authenticated: false })
})

r.post('/logout', (req: Request, res: Response) => {
  ;(req as any).session?.destroy?.(() => {})
  res.clearCookie('hims.sid')
  return res.json({ ok: true })
})

r.get('/backup/stats', adminGuard, dbStats)
r.get('/backup/auto-list', adminGuard, listAutoBackups)
r.get('/backup/export', adminGuard, exportAll)
r.post('/backup/restore', adminGuard, restoreAll)
r.post('/backup/purge', adminGuard, purgeAll)

r.use('/super', superAdminRouter)

export default r
