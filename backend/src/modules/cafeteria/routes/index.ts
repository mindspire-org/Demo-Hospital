import { Router } from 'express'
import * as Users from '../controllers/users.controller'
import * as MenuItems from '../controllers/menuItems.controller'
import * as Sales from '../controllers/sales.controller'
import * as Deals from '../controllers/deals.controller'
import * as DailyShift from '../controllers/dailyShift.controller'
import * as Audit from '../controllers/audit.controller'
import * as SidebarPerms from '../controllers/sidebarPermission.controller'
import * as Settings from '../controllers/settings.controller'
import { auth } from '../../../common/middleware/auth'
import { requireAdmin } from '../../../common/middleware/hospital_guard'

const r = Router()

// Auth (public)
r.post('/users/login', Users.login)
r.post('/users/logout', Users.logout)

// All routes below require authentication
r.use(auth)

// Menu Items
r.get('/menu-items', MenuItems.list)
r.post('/menu-items', requireAdmin, MenuItems.create)
r.put('/menu-items/:id', requireAdmin, MenuItems.update)
r.delete('/menu-items/:id', requireAdmin, MenuItems.remove)
r.post('/menu-items/:id/adjust-stock', MenuItems.adjustStock)
r.get('/menu-items/low-stock', MenuItems.lowStock)

// Sales
r.get('/sales', Sales.list)
r.post('/sales', Sales.create)
r.get('/sales/summary', Sales.summary)
r.get('/sales/:id', Sales.getOne)

// Deals
r.get('/deals', Deals.list)
r.post('/deals', requireAdmin, Deals.create)
r.get('/deals/:id', Deals.getOne)
r.put('/deals/:id', requireAdmin, Deals.update)
r.delete('/deals/:id', requireAdmin, Deals.remove)

// Daily Shifts
r.get('/shifts/today', DailyShift.getTodayShift)
r.post('/shifts/open', requireAdmin, DailyShift.openShift)
r.put('/shifts/close', requireAdmin, DailyShift.closeShift)
r.get('/shifts', DailyShift.list)
r.get('/shifts/:id', DailyShift.getOne)

// Audit Logs
r.get('/audit', Audit.list)

// Settings
r.get('/settings', Settings.get)
r.put('/settings', requireAdmin, Settings.update)

// Sidebar Permissions
r.get('/sidebar-permissions', SidebarPerms.list)
r.put('/sidebar-permissions', requireAdmin, SidebarPerms.update)

// Users
r.get('/users', Users.list)
r.post('/users', requireAdmin, Users.create)
r.put('/users/:id', requireAdmin, Users.update)
r.delete('/users/:id', requireAdmin, Users.remove)

export default r
