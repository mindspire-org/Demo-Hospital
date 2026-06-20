import { Router } from 'express'
import * as Tests from '../controllers/tests.controller'
import * as Settings from '../controllers/settings.controller'
import * as Orders from '../controllers/orders.controller'
import * as Results from '../controllers/results.controller'
import * as Users from '../controllers/users.controller'
import * as Audit from '../controllers/audit.controller'
import * as Auth from '../controllers/auth.controller'
import * as Sidebar from '../controllers/sidebarPermission.controller'
import * as IncomeLedger from '../controllers/income_ledger.controller'
import * as Tokens from '../controllers/tokens.controller'
import { auth } from '../../../common/middleware/auth'
import { requireAdmin } from '../../../common/middleware/hospital_guard'

const r = Router()

// Auth (public)
r.post('/login', Auth.login)
r.post('/logout', Auth.logout)

// All routes below require authentication
r.use(auth)

// Tests (Catalog for Diagnostics)
r.get('/tests', Tests.list)
r.post('/tests', requireAdmin, Tests.create)
r.put('/tests/:id', requireAdmin, Tests.update)
r.delete('/tests/:id', requireAdmin, Tests.remove)

// Settings
r.get('/settings', Settings.get)
r.put('/settings', requireAdmin, Settings.update)

// Orders (Sample Intake for Diagnostics)
r.get('/orders', Orders.list)
r.get('/orders/:id', Orders.get)
r.post('/orders', Orders.create)
r.put('/orders/:id', Orders.update)
r.put('/orders/:id/track', Orders.updateTrack)
r.put('/orders/:id/items/:testId/track', Orders.updateItemTrack)
r.delete('/orders/:id/items/:testId', Orders.removeItem)
r.delete('/orders/:id', Orders.remove)
r.post('/orders/:tokenNo/receive-payment', Orders.receivePayment)
r.post('/orders/:id/return', Orders.returnOrder)
r.post('/orders/:id/undo-return', Orders.undoReturn)

// Tokens
r.get('/tokens', Tokens.list)
r.post('/tokens', Tokens.create)
r.post('/tokens/:id/convert', Tokens.convertToSample)
r.put('/tokens/:id/status', Tokens.updateStatus)
r.put('/tokens/:id', Tokens.update)
r.delete('/tokens/:id', Tokens.remove)

// Income Ledger
r.get('/income-ledger', IncomeLedger.listIncomeLedger)
r.get('/income-ledger/summary', IncomeLedger.getIncomeSummary)

// Results
r.get('/results', Results.list)
r.post('/results', Results.create)
r.get('/results/:id', Results.get)
r.put('/results/:id', Results.update)
r.delete('/results/:id', Results.remove)

// Audit Logs
r.get('/audit-logs', Audit.list)
r.post('/audit-logs', requireAdmin, Audit.create)

// Users
r.get('/users', Users.list)
r.post('/users', requireAdmin, Users.create)
r.put('/users/:id', requireAdmin, Users.update)
r.delete('/users/:id', requireAdmin, Users.remove)

// Sidebar Roles & Permissions
r.get('/sidebar-roles', Sidebar.listRoles)
r.post('/sidebar-roles', requireAdmin, Sidebar.createRole)
r.delete('/sidebar-roles/:role', requireAdmin, Sidebar.deleteRole)
r.get('/sidebar-permissions', Sidebar.getPermissions)
r.put('/sidebar-permissions/:role', requireAdmin, Sidebar.updatePermissions)
r.post('/sidebar-permissions/:role/reset', requireAdmin, Sidebar.resetToDefaults)

export default r
