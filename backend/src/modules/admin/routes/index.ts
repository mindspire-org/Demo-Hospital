import { Router } from 'express'
import { exportAll, purgeAll, restoreAll, listSnapshots, createSnapshot, deleteSnapshot, downloadSnapshot, restoreSnapshot, backupStatus } from '../backup.controller'
import { adminGuard } from '../../../common/middleware/admin_guard'

const r = Router()

r.get('/backup/export', adminGuard, exportAll)
r.post('/backup/restore', adminGuard, restoreAll)
r.post('/backup/purge', adminGuard, purgeAll)
r.get('/backup/status', adminGuard, backupStatus)
r.get('/backup/snapshots', adminGuard, listSnapshots)
r.post('/backup/snapshots', adminGuard, createSnapshot)
r.get('/backup/snapshots/:filename', adminGuard, downloadSnapshot)
r.post('/backup/snapshots/:filename/restore', adminGuard, restoreSnapshot)
r.delete('/backup/snapshots/:filename', adminGuard, deleteSnapshot)

export default r
