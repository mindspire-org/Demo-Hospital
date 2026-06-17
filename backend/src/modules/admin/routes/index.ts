import { Router } from 'express'
import { exportAll, purgeAll, restoreAll } from '../backup.controller'
import { adminGuard } from '../../../common/middleware/admin_guard'
import superAdminRouter from './superAdmin.routes'

const r = Router()

r.get('/backup/export', adminGuard, exportAll)
r.post('/backup/restore', adminGuard, restoreAll)
r.post('/backup/purge', adminGuard, purgeAll)

r.use('/super', superAdminRouter)

export default r
