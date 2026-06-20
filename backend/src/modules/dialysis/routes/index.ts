import { Router } from 'express'
import * as usersCtrl from '../controllers/users.controller'
import * as sidebarCtrl from '../controllers/sidebarPermission.controller'
import * as settingsCtrl from '../controllers/settings.controller'
import * as machinesCtrl from '../controllers/machines.controller'
import * as shiftsCtrl from '../controllers/shifts.controller'
import * as sessionTypesCtrl from '../controllers/sessionTypes.controller'
import * as dialyzerTypesCtrl from '../controllers/dialyzerTypes.controller'
import * as patientsCtrl from '../controllers/patients.controller'
import * as dialysisPatientsCtrl from '../controllers/dialysisPatients.controller'
import * as tokensCtrl from '../controllers/tokens.controller'
import * as sessionsCtrl from '../controllers/sessions.controller'
import * as appointmentsCtrl from '../controllers/appointments.controller'
import * as dashboardCtrl from '../controllers/dashboard.controller'
import { auth } from '../../../common/middleware/auth'
import { requireAdmin } from '../../../common/middleware/hospital_guard'

const r = Router()

// Auth (public)
r.post('/users/login', usersCtrl.login)
r.post('/users/logout', usersCtrl.logout)

// All routes below require authentication
r.use(auth)

// User routes
r.get('/users', usersCtrl.list)
r.post('/users', requireAdmin, usersCtrl.create)
r.put('/users/:id', requireAdmin, usersCtrl.update)
r.delete('/users/:id', requireAdmin, usersCtrl.remove)
r.get('/users/roles', usersCtrl.listRoles)

// Sidebar permission routes
r.get('/sidebar-permissions', sidebarCtrl.getPermissions)
r.post('/sidebar-permissions', requireAdmin, sidebarCtrl.createRole)
r.get('/sidebar-permissions/roles', sidebarCtrl.listRoles)
r.delete('/sidebar-permissions/:role', requireAdmin, sidebarCtrl.deleteRole)
r.put('/sidebar-permissions/:role', requireAdmin, sidebarCtrl.updatePermissions)
r.post('/sidebar-permissions/:role/reset', requireAdmin, sidebarCtrl.resetToDefaults)

// Machines
r.get('/machines', machinesCtrl.list)
r.post('/machines', requireAdmin, machinesCtrl.create)
r.put('/machines/:id', requireAdmin, machinesCtrl.update)
r.delete('/machines/:id', requireAdmin, machinesCtrl.remove)

// Shifts
r.get('/shifts', shiftsCtrl.list)
r.post('/shifts', requireAdmin, shiftsCtrl.create)
r.put('/shifts/:id', requireAdmin, shiftsCtrl.update)
r.delete('/shifts/:id', requireAdmin, shiftsCtrl.remove)

// Session Types
r.get('/session-types', sessionTypesCtrl.list)
r.post('/session-types', requireAdmin, sessionTypesCtrl.create)
r.put('/session-types/:id', requireAdmin, sessionTypesCtrl.update)
r.delete('/session-types/:id', requireAdmin, sessionTypesCtrl.remove)

// Dialyzer Types
r.get('/dialyzer-types', dialyzerTypesCtrl.list)
r.post('/dialyzer-types', requireAdmin, dialyzerTypesCtrl.create)
r.put('/dialyzer-types/:id', requireAdmin, dialyzerTypesCtrl.update)
r.delete('/dialyzer-types/:id', requireAdmin, dialyzerTypesCtrl.remove)

// Patients (from global Lab_Patient collection)
r.get('/patients/search', patientsCtrl.search)
r.get('/patients/by-mrn', patientsCtrl.getByMrn)
r.post('/patients/find-or-create', patientsCtrl.findOrCreate)
r.put('/patients/:id', patientsCtrl.update)

// Dialysis Patients registry
r.get('/dialysis-patients', dialysisPatientsCtrl.list)
r.get('/dialysis-patients/by-lab-patient', dialysisPatientsCtrl.getByLabPatientId)
r.get('/dialysis-patients/:id', dialysisPatientsCtrl.getById)

// Tokens
r.get('/tokens', tokensCtrl.list)
r.post('/tokens', tokensCtrl.create)
r.get('/tokens/:id', tokensCtrl.get)
r.get('/tokens/by-token/:tokenNo', tokensCtrl.getByTokenNo)
r.put('/tokens/:id', tokensCtrl.update)
r.delete('/tokens/:id', tokensCtrl.remove)

// Sessions
r.get('/sessions', sessionsCtrl.list)
r.post('/sessions', sessionsCtrl.create)
r.get('/sessions/:id', sessionsCtrl.get)
r.put('/sessions/:id', sessionsCtrl.update)
r.delete('/sessions/:id', sessionsCtrl.remove)

// Appointments
r.get('/appointments', appointmentsCtrl.list)
r.post('/appointments', appointmentsCtrl.create)
r.get('/appointments/:id', appointmentsCtrl.get)
r.put('/appointments/:id', appointmentsCtrl.update)
r.delete('/appointments/:id', appointmentsCtrl.remove)
r.post('/appointments/:id/convert-to-token', appointmentsCtrl.convertToToken)

// Settings
r.get('/settings', settingsCtrl.get)
r.put('/settings', requireAdmin, settingsCtrl.update)

// Dashboard
r.get('/dashboard/stats', dashboardCtrl.getStats)

export default r
