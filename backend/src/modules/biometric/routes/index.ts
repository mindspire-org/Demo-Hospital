import { Router } from 'express'
import { adminGuard } from '../../../common/middleware/admin_guard'
import { auth } from '../../../common/middleware/auth'
import * as Mappings from '../controllers/mappings.controller'
import * as Events from '../controllers/events.controller'
import * as Sync from '../controllers/sync.controller'
import * as Device from '../controllers/device.controller'
import * as Push from '../controllers/push.controller'
import * as Config from '../controllers/config.controller'

const r = Router()

r.get('/mappings', adminGuard, Mappings.list)
r.post('/mappings', adminGuard, Mappings.upsert)
r.delete('/mappings/:id', adminGuard, Mappings.remove)

r.get('/events', adminGuard, Events.list)
r.get('/events/unknown', adminGuard, Events.listUnknown)

r.post('/sync/once', adminGuard, Sync.syncNow)

r.get('/device/users', adminGuard, Device.listDeviceUsers)

r.post('/push', Push.pushEvents)

// Config (auth + public for local fetcher)
r.get('/config', auth, Config.getConfig)
r.put('/config', auth, Config.updateConfig)
r.get('/config/public', Config.getPublicConfig)

export default r
