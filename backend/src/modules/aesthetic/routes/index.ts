import { Router } from 'express'
import * as Suppliers from '../controllers/suppliers.controller'
import * as Expenses from '../controllers/expenses.controller'
import * as Settings from '../controllers/settings.controller'
import * as Purchases from '../controllers/purchases.controller'
import * as Returns from '../controllers/returns.controller'
import * as Audit from '../controllers/audit.controller'
import * as Users from '../controllers/users.controller'
import * as Drafts from '../controllers/drafts.controller'
import * as InventoryItems from '../controllers/inventory_items.controller'
import * as Notifications from '../controllers/notifications.controller'
import * as Sales from '../controllers/sales.controller'
import * as Auth from '../controllers/auth.controller'
import * as ConsentTemplates from '../controllers/consent_templates.controller'
import * as Consents from '../controllers/consents.controller'
import * as ProcedureCatalog from '../controllers/procedure_catalog.controller'
import * as ProcedureSessions from '../controllers/procedure_sessions.controller'
import * as Tokens from '../controllers/tokens.controller'
import * as Finance from '../controllers/finance.controller'
import * as Doctors from '../controllers/doctors.controller'
import * as DocSchedules from '../controllers/doctor_schedule.controller'
import * as Appointments from '../controllers/appointments.controller'
import * as Staff from '../controllers/staff.controller'
import * as Shifts from '../controllers/shifts.controller'
import * as Attendance from '../controllers/attendance.controller'
import * as StaffEarnings from '../controllers/staff_earnings.controller'
import * as SidebarPerms from '../controllers/sidebarPermission.controller'
import { auth } from '../../../common/middleware/auth'
import { requireAdmin } from '../../../common/middleware/hospital_guard'

const r = Router()

// Auth (public)
r.post('/login', Auth.login)
r.post('/logout', Auth.logout)

// All routes below require authentication
r.use(auth)

// Suppliers
r.get('/suppliers', Suppliers.list)
r.post('/suppliers', requireAdmin, Suppliers.create)
r.put('/suppliers/:id', requireAdmin, Suppliers.update)
r.delete('/suppliers/:id', requireAdmin, Suppliers.remove)
r.post('/suppliers/:id/payment', Suppliers.recordPayment)
r.get('/suppliers/:id/purchases', Suppliers.purchases)

// Expenses
r.get('/expenses', Expenses.list)
r.post('/expenses', requireAdmin, Expenses.create)
r.delete('/expenses/:id', requireAdmin, Expenses.remove)
r.get('/expenses/summary', Expenses.summary)

// Settings
r.get('/settings', Settings.get)
r.put('/settings', requireAdmin, Settings.update)

// Purchases
r.get('/purchases', Purchases.list)
r.post('/purchases', requireAdmin, Purchases.create)
r.delete('/purchases/:id', requireAdmin, Purchases.remove)
r.get('/purchases/summary', Purchases.summary)

// Returns (Supplier-only effectively)
r.get('/returns', Returns.list)
r.post('/returns', requireAdmin, Returns.create)

// Audit Logs
r.get('/audit-logs', Audit.list)
r.post('/audit-logs', requireAdmin, Audit.create)

// Consent Templates
r.get('/consent-templates', ConsentTemplates.list)
r.post('/consent-templates', requireAdmin, ConsentTemplates.create)
r.put('/consent-templates/:id', requireAdmin, ConsentTemplates.update)
r.delete('/consent-templates/:id', requireAdmin, ConsentTemplates.remove)

// Consents (records)
r.get('/consents', Consents.list)
r.post('/consents', Consents.create)

// Procedure Catalog
r.get('/procedure-catalog', ProcedureCatalog.list)
r.post('/procedure-catalog', requireAdmin, ProcedureCatalog.create)
r.put('/procedure-catalog/:id', requireAdmin, ProcedureCatalog.update)
r.delete('/procedure-catalog/:id', requireAdmin, ProcedureCatalog.remove)

// Procedure Sessions
r.get('/procedure-sessions', ProcedureSessions.list)
r.post('/procedure-sessions', ProcedureSessions.create)
r.put('/procedure-sessions/:id', ProcedureSessions.update)
r.delete('/procedure-sessions/:id', ProcedureSessions.remove)
r.post('/procedure-sessions/:id/payments', ProcedureSessions.addPayment)
r.get('/procedure-sessions/:id/payments', ProcedureSessions.getPayments)
r.put('/procedure-sessions/:id/next-visit', ProcedureSessions.setNextVisit)
r.post('/procedure-sessions/complete-procedure', ProcedureSessions.completeProcedure)

// Tokens (OPD tokens for Aesthetic)
r.get('/tokens', Tokens.list)
r.get('/tokens/next-number', Tokens.nextNumber)
r.post('/tokens', Tokens.create)
r.put('/tokens/:id', Tokens.update)
r.put('/tokens/:id/status', Tokens.updateStatus)
r.delete('/tokens/:id', Tokens.remove)

// Finance - Doctor earnings & payouts
r.post('/finance/manual-doctor-earning', Finance.postManualDoctorEarning)
r.post('/finance/doctor-payout', Finance.postDoctorPayout)
r.get('/finance/doctor/:id/balance', Finance.getDoctorBalance)
r.get('/finance/doctor/:id/payouts', Finance.listDoctorPayouts)
r.get('/finance/payouts', Finance.listRecentPayouts)
r.get('/finance/payables-summary', Finance.payablesSummary)
r.get('/finance/earnings', Finance.listDoctorEarnings)
r.post('/finance/journal/:id/reverse', Finance.reverseJournal)

// Staff
r.get('/staff', Staff.list)
r.post('/staff', requireAdmin, Staff.create)
r.put('/staff/:id', requireAdmin, Staff.update)
r.delete('/staff/:id', requireAdmin, Staff.remove)

// Shifts
r.get('/shifts', Shifts.list)
r.post('/shifts', requireAdmin, Shifts.create)
r.put('/shifts/:id', requireAdmin, Shifts.update)
r.delete('/shifts/:id', requireAdmin, Shifts.remove)

// Attendance
r.get('/attendance', Attendance.list)
r.post('/attendance', requireAdmin, Attendance.upsert)

// Staff Earnings
r.get('/staff-earnings', StaffEarnings.list)
r.post('/staff-earnings', requireAdmin, StaffEarnings.create)
r.put('/staff-earnings/:id', requireAdmin, StaffEarnings.update)
r.delete('/staff-earnings/:id', requireAdmin, StaffEarnings.remove)

// Doctors (Aesthetic)
r.get('/doctors', Doctors.list)
r.post('/doctors', requireAdmin, Doctors.create)
r.put('/doctors/:id', requireAdmin, Doctors.update)
r.delete('/doctors/:id', requireAdmin, Doctors.remove)

// Doctor Schedules (Aesthetic)
r.get('/doctor-schedules', DocSchedules.list)
r.post('/doctor-schedules/weekly-pattern', DocSchedules.applyWeeklyPattern)
r.post('/doctor-schedules', DocSchedules.create)
r.put('/doctor-schedules/:id', DocSchedules.update)
r.delete('/doctor-schedules/:id', DocSchedules.remove)

// Appointments (Aesthetic)
r.get('/appointments', Appointments.list)
r.post('/appointments', Appointments.create)
r.put('/appointments/:id', Appointments.update)
r.patch('/appointments/:id/status', Appointments.updateStatus)
r.post('/appointments/:id/convert-to-token', Appointments.convertToToken)
r.delete('/appointments/:id', Appointments.remove)

// Users
r.get('/users', Users.list)
r.post('/users', requireAdmin, Users.create)
r.put('/users/:id', requireAdmin, Users.update)
r.delete('/users/:id', requireAdmin, Users.remove)

// Sidebar Roles & Permissions (Aesthetic)
r.get('/sidebar-roles', SidebarPerms.listRoles)
r.post('/sidebar-roles', requireAdmin, SidebarPerms.createRole)
r.delete('/sidebar-roles/:role', requireAdmin, SidebarPerms.deleteRole)

r.get('/sidebar-permissions', SidebarPerms.getPermissions)
r.put('/sidebar-permissions/:role', requireAdmin, SidebarPerms.updatePermissions)
r.post('/sidebar-permissions/:role/reset', requireAdmin, SidebarPerms.resetToDefaults)

// Purchase Drafts
r.get('/purchase-drafts', Drafts.list)
r.post('/purchase-drafts', Drafts.create)
r.post('/purchase-drafts/:id/approve', Drafts.approve)
r.delete('/purchase-drafts/:id', Drafts.remove)

// Inventory items
r.get('/inventory', InventoryItems.list)
r.get('/inventory/summary', InventoryItems.summary)
r.delete('/inventory/:key', requireAdmin, InventoryItems.remove)
r.put('/inventory/:key', requireAdmin, InventoryItems.update)

// Notifications
r.get('/notifications', Notifications.getNotifications)
r.post('/notifications/generate', Notifications.generateNotifications)
r.post('/notifications/:id/read', Notifications.markNotificationRead)
r.post('/notifications/read-all', Notifications.markAllNotificationsRead)
r.delete('/notifications/:id', Notifications.deleteNotification)

// Sales placeholders (Aesthetic does not have POS yet)
r.get('/sales', Sales.list)
r.get('/sales/summary', Sales.summary)

export default r
