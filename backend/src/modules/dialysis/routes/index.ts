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

const r = Router()

// User routes
r.post('/users/login', usersCtrl.login)
r.post('/users/logout', usersCtrl.logout)
r.get('/users', usersCtrl.list)
r.post('/users', usersCtrl.create)
r.put('/users/:id', usersCtrl.update)
r.delete('/users/:id', usersCtrl.remove)
r.get('/users/roles', usersCtrl.listRoles)

// Sidebar permission routes
r.get('/sidebar-permissions', sidebarCtrl.getPermissions)
r.post('/sidebar-permissions', sidebarCtrl.createRole)
r.get('/sidebar-permissions/roles', sidebarCtrl.listRoles)
r.delete('/sidebar-permissions/:role', sidebarCtrl.deleteRole)
r.put('/sidebar-permissions/:role', sidebarCtrl.updatePermissions)
r.post('/sidebar-permissions/:role/reset', sidebarCtrl.resetToDefaults)

// Machines
r.get('/machines', machinesCtrl.list)
r.post('/machines', machinesCtrl.create)
r.put('/machines/:id', machinesCtrl.update)
r.delete('/machines/:id', machinesCtrl.remove)

// Shifts
r.get('/shifts', shiftsCtrl.list)
r.post('/shifts', shiftsCtrl.create)
r.put('/shifts/:id', shiftsCtrl.update)
r.delete('/shifts/:id', shiftsCtrl.remove)

// Session Types
r.get('/session-types', sessionTypesCtrl.list)
r.post('/session-types', sessionTypesCtrl.create)
r.put('/session-types/:id', sessionTypesCtrl.update)
r.delete('/session-types/:id', sessionTypesCtrl.remove)

// Dialyzer Types
r.get('/dialyzer-types', dialyzerTypesCtrl.list)
r.post('/dialyzer-types', dialyzerTypesCtrl.create)
r.put('/dialyzer-types/:id', dialyzerTypesCtrl.update)
r.delete('/dialyzer-types/:id', dialyzerTypesCtrl.remove)

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
r.put('/settings', settingsCtrl.update)

// Dashboard
r.get('/dashboard/stats', dashboardCtrl.getStats)

export default r
