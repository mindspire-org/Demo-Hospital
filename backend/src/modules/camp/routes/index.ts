import { Router } from 'express'
import * as Auth from '../controllers/auth.controller'
import * as Camp from '../controllers/camp.controller'
import * as CampPatient from '../controllers/campPatient.controller'
import * as CampSession from '../controllers/campSession.controller'
import * as CampStaff from '../controllers/campStaff.controller'
import * as CampSettings from '../controllers/campSettings.controller'
import * as Users from '../controllers/users.controller'
import * as Audit from '../controllers/audit.controller'
import * as Report from '../controllers/report.controller'
import * as Sidebar from '../controllers/sidebarPermission.controller'
import { auth } from '../../../common/middleware/auth'
import { requireAdmin } from '../../../common/middleware/hospital_guard'

const r = Router()

// Auth (public)
r.post('/login', Auth.login)
r.post('/logout', Auth.logout)
r.get('/me', Auth.me)

// All routes below require authentication
r.use(auth)

// Camps
r.get('/camps', Camp.list)
r.get('/camps/:id', Camp.get)
r.post('/camps', Camp.create)
r.put('/camps/:id', Camp.update)
r.delete('/camps/:id', Camp.remove)
r.get('/camps/:id/stats', Camp.stats)

// Camp Patients
r.get('/patients', CampPatient.list)
r.get('/patients/:id', CampPatient.get)
r.get('/patients/by-token/:campId/:tokenNo', CampPatient.getByToken)
r.post('/patients', CampPatient.create)
r.put('/patients/:id', CampPatient.update)
r.delete('/patients/:id', CampPatient.remove)

// Camp Sessions
r.get('/sessions', CampSession.list)
r.get('/sessions/:id', CampSession.get)
r.post('/sessions', CampSession.create)
r.put('/sessions/:id', CampSession.update)
r.delete('/sessions/:id', CampSession.remove)

// Camp Staff
r.get('/staff', CampStaff.list)
r.get('/staff/:id', CampStaff.get)
r.post('/staff', CampStaff.create)
r.put('/staff/:id', CampStaff.update)
r.delete('/staff/:id', CampStaff.remove)

// Settings
r.get('/settings', CampSettings.get)
r.put('/settings', requireAdmin, CampSettings.update)

// Users
r.get('/users', Users.list)
r.get('/users/:id', Users.get)
r.post('/users', requireAdmin, Users.create)
r.put('/users/:id', requireAdmin, Users.update)
r.delete('/users/:id', requireAdmin, Users.remove)

// Audit Logs
r.get('/audit-logs', Audit.list)
r.post('/audit-logs', requireAdmin, Audit.create)

// Reports
r.get('/reports/dashboard', Report.dashboardStats)
r.get('/reports/camp', Report.campReport)

// Sidebar Roles & Permissions
r.get('/sidebar-roles', Sidebar.listRoles)
r.post('/sidebar-roles', requireAdmin, Sidebar.createRole)
r.delete('/sidebar-roles/:role', requireAdmin, Sidebar.deleteRole)
r.get('/sidebar-permissions', Sidebar.getPermissions)
r.put('/sidebar-permissions/:role', requireAdmin, Sidebar.updatePermissions)
r.post('/sidebar-permissions/:role/reset', requireAdmin, Sidebar.resetToDefaults)

export default r
