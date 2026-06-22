import { Router } from 'express'

import * as Drafts from '../controllers/drafts.controller'

import * as Purchases from '../controllers/purchases.controller'

import * as InventoryItems from '../controllers/inventory_items.controller'

import * as Staff from '../controllers/staff.controller'

import * as Shifts from '../controllers/shifts.controller'

import * as Attendance from '../controllers/attendance.controller'

import * as StaffEarnings from '../controllers/staff_earnings.controller'

import * as Expenses from '../controllers/expenses.controller'

import * as Users from '../controllers/users.controller'

import * as Audit from '../controllers/audit.controller'

import * as Settings from '../controllers/settings.controller'

import * as Patients from '../controllers/patients.controller'

import * as Tests from '../controllers/tests.controller'

import * as Orders from '../controllers/orders.controller'

import * as Results from '../controllers/results.controller'

import * as Appointments from '../controllers/appointments.controller'

import * as Suppliers from '../controllers/suppliers.controller'

import * as Returns from '../controllers/returns.controller'

import * as Dashboard from '../controllers/dashboard.controller'

import * as Reports from '../controllers/reports.controller'

import * as BBDonors from '../controllers/bb_donors.controller'

import * as BBReceivers from '../controllers/bb_receivers.controller'

import * as BBInventory from '../controllers/bb_inventory.controller'

import * as CashMovements from '../controllers/cash_movement.controller'

import * as CashCounts from '../controllers/cash_count.controller'

import * as SidebarPerms from '../controllers/sidebarPermission.controller'

import * as IncomeLedger from '../controllers/income_ledger.controller'

import * as PurchaseOrders from '../controllers/purchase_orders.controller'

import * as Tokens from '../controllers/tokens.controller'

import * as CollectionCenters from '../controllers/collection_centers.controller'

import * as Critical from '../controllers/critical.controller'
import * as Packages from '../controllers/packages.controller'
import * as PatientCards from '../controllers/patient_cards.controller'
import * as Outsource from '../controllers/outsource_labs.controller'
import * as CenterRates from '../controllers/center_rate_list.controller'
import * as Notifications from '../controllers/notifications.controller'
import * as WardImports from '../controllers/ward_imports.controller'
import * as Doctors from '../controllers/doctors.controller'

import { auth } from '../../../common/middleware/auth'
import { requireAdmin } from '../../../common/middleware/hospital_guard'
import { attachScope } from '../middleware/scope'



const r = Router()



// Public auth endpoints

r.post('/users/login', Users.login)

r.post('/users/logout', Users.logout)

// Legacy compatibility

r.post('/login', Users.login)

r.post('/logout', Users.logout)

// Admin: idempotent seeders (no auth required — internal ops)
r.post('/seed/test-templates', async (req, res) => {
  try {
    const { seedLabTestTemplates } = await import('../seeds/labTestTemplates')
    const force = (req.body && req.body.force) === true
    const n = await seedLabTestTemplates({ force })
    res.json({ ok: true, seeded: n })
  } catch (e: any) { res.status(500).json({ message: e?.message || 'seed failed' }) }
})
r.post('/seed/critical-parameters', async (_req, res) => {
  try {
    const { seedCriticalParameters } = await import('../seeds/criticalParameters')
    const r2 = await seedCriticalParameters()
    res.json({ ok: true, ...r2 })
  } catch (e: any) { res.status(500).json({ message: e?.message || 'seed failed' }) }
})
r.post('/seed/merge-critical-values', async (_req, res) => {
  try {
    const { LabTest } = await import('../models/Test')
    const { SEED_CRITICAL_PARAMETERS } = await import('../seeds/criticalParameters')
    const critMap = new Map<string, { criticalMin?: number; criticalMax?: number }>()
    for (const c of SEED_CRITICAL_PARAMETERS) {
      const key = c.parameter.toLowerCase().trim()
      if (!critMap.has(key)) critMap.set(key, { criticalMin: c.criticalMin, criticalMax: c.criticalMax })
    }
    const tests = await LabTest.find({ parameters: { $exists: true, $ne: [] } }).lean()
    let patched = 0
    for (const test of tests) {
      let dirty = false
      for (let i = 0; i < (test.parameters?.length || 0); i++) {
        const p = test.parameters[i]
        const key = p.name?.toLowerCase().trim()
        if (!key) continue
        const crit = critMap.get(key)
        if (!crit) continue
        if (p.criticalMin == null && p.criticalMax == null) {
          if (crit.criticalMin != null) test.parameters[i].criticalMin = crit.criticalMin
          if (crit.criticalMax != null) test.parameters[i].criticalMax = crit.criticalMax
          dirty = true
        }
      }
      if (dirty) {
        await LabTest.updateOne({ _id: test._id }, { $set: { parameters: test.parameters } })
        patched++
      }
    }
    res.json({ ok: true, patched, totalTests: tests.length })
  } catch (e: any) { res.status(500).json({ message: e?.message || 'merge failed' }) }
})

r.post('/seed/import-json-tests', async (req, res) => {
  try {
    const { importLabTestsFromJson } = await import('../seeds/importJsonTests')
    const dryRun = (req.body && req.body.dryRun) === true
    const result = await importLabTestsFromJson({ dryRun })
    res.json({ ok: true, ...result })
  } catch (e: any) { res.status(500).json({ message: e?.message || 'import failed' }) }
})

r.post('/seed/normal-ranges', async (_req, res) => {
  try {
    const { seedNormalRanges } = await import('../seeds/normalRanges')
    const result = await seedNormalRanges()
    res.json({ ok: true, ...result })
  } catch (e: any) { res.status(500).json({ message: e?.message || 'normal ranges seed failed' }) }
})

r.post('/seed/admin', async (_req, res) => {
  try {
    const { ensureDefaultPortalLogins } = await import('../../../seeds/default_logins')
    await ensureDefaultPortalLogins()
    res.json({ ok: true, message: 'Default portal logins ensured (admin / 123)' })
  } catch (e: any) { res.status(500).json({ message: e?.message || 'admin seed failed' }) }
})

// Authenticate all routes below (login/logout/seed remain public)
r.use(auth)
r.use(attachScope)



// Purchase Orders

r.get('/purchase-orders', PurchaseOrders.list)

r.get('/purchase-orders/:id', PurchaseOrders.getOne)

r.post('/purchase-orders', PurchaseOrders.create)

r.put('/purchase-orders/:id', PurchaseOrders.update)

r.patch('/purchase-orders/:id/status', PurchaseOrders.updateStatus)

r.delete('/purchase-orders/:id', PurchaseOrders.remove)



// Purchase Drafts (Pending Review)

r.get('/purchase-drafts/next-invoice-number', Drafts.getNextInvoiceNumber)

r.get('/purchase-drafts', Drafts.list)

r.get('/purchase-drafts/:id', Drafts.getOne)

r.post('/purchase-drafts', Drafts.create)

r.put('/purchase-drafts/:id', Drafts.update)

r.post('/purchase-drafts/:id/approve', Drafts.approve)

r.delete('/purchase-drafts/:id', Drafts.remove)



// Held Purchase Invoices

r.get('/hold-purchase-invoices', Drafts.listHeld)

r.get('/hold-purchase-invoices/:id', Drafts.getHeld)

r.post('/hold-purchase-invoices', Drafts.createHeld)

r.delete('/hold-purchase-invoices/:id', Drafts.removeHeld)



// Companies

r.get('/companies', Suppliers.listCompanies)

r.post('/companies', Suppliers.createCompany)

r.put('/companies/:id', Suppliers.updateCompany)

r.delete('/companies/:id', Suppliers.removeCompany)



// Inventory items (aggregated store)

r.get('/inventory', InventoryItems.list)

r.put('/inventory/:key', InventoryItems.update)

r.get('/inventory/summary', InventoryItems.summary)

r.delete('/inventory/:key', InventoryItems.remove)



// Purchases

r.get('/purchases', Purchases.list)

r.post('/purchases', Purchases.create)

r.delete('/purchases/:id', Purchases.remove)

r.get('/purchases/summary', Purchases.summary)



// Suppliers

r.get('/suppliers', Suppliers.list)

r.post('/suppliers', Suppliers.create)

r.put('/suppliers/:id', Suppliers.update)

r.delete('/suppliers/:id', Suppliers.remove)

r.post('/suppliers/:id/companies', Suppliers.assignCompanies)

r.post('/suppliers/:id/payment', Suppliers.recordPayment)

r.get('/suppliers/:id/purchases', Suppliers.purchases)



// Returns (Supplier/Customer)

r.get('/returns', Returns.list)

r.post('/returns', Returns.create)

r.post('/returns/undo', Returns.undo)



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



// Expenses

r.get('/expenses', Expenses.list)
r.post('/expenses', requireAdmin, Expenses.create)
r.delete('/expenses/:id', requireAdmin, Expenses.remove)
r.get('/expenses/summary', Expenses.summary)



// Cash Movements (Pay In/Out)

r.get('/cash-movements', CashMovements.list)
r.post('/cash-movements', requireAdmin, CashMovements.create)
r.delete('/cash-movements/:id', requireAdmin, CashMovements.remove)
r.get('/cash-movements/summary', CashMovements.summary)



// Manager Cash Count

r.get('/cash-counts', CashCounts.list)
r.post('/cash-counts', requireAdmin, CashCounts.create)
r.delete('/cash-counts/:id', requireAdmin, CashCounts.remove)
r.get('/cash-counts/summary', CashCounts.summary)



// Users

r.get('/users', Users.list)
r.post('/users', requireAdmin, Users.create)
r.put('/users/:id', requireAdmin, Users.update)
r.delete('/users/:id', requireAdmin, Users.remove)



// Sidebar Roles & Permissions

r.get('/sidebar-roles', SidebarPerms.listRoles)
r.post('/sidebar-roles', requireAdmin, SidebarPerms.createRole)
r.delete('/sidebar-roles/:role', requireAdmin, SidebarPerms.deleteRole)

r.get('/sidebar-permissions', SidebarPerms.getPermissions)
r.put('/sidebar-permissions/:role', requireAdmin, SidebarPerms.updatePermissions)
r.post('/sidebar-permissions/:role/reset', requireAdmin, SidebarPerms.resetToDefaults)



// Audit Logs

r.get('/audit-logs', Audit.list)
r.post('/audit-logs', requireAdmin, Audit.create)



// Settings

r.get('/settings', Settings.get)
r.put('/settings', requireAdmin, Settings.update)
r.post('/settings/header', requireAdmin, Settings.uploadHeaderFooter)
r.post('/settings/footer', requireAdmin, Settings.uploadHeaderFooter)
r.post('/settings/header/revert', requireAdmin, Settings.revertHeaderFooter)
r.get('/settings/header-history', Settings.listHeaderHistory)



// Patients (MRN find-or-create)

r.get('/patients', Patients.list)

r.post('/patients/find-or-create', Patients.findOrCreate)

r.get('/patients/by-mrn', Patients.getByMrn)

r.get('/patients/search', Patients.search)

r.put('/patients/:id', Patients.update)

r.delete('/patients/:id', Patients.remove)

r.get('/patients/export', Patients.exportCsv)

r.post('/patients/import', Patients.importCsv)



// Tests (Catalog)

r.get('/tests', Tests.list)

r.post('/tests', Tests.create)

r.put('/tests/:id', Tests.update)

r.delete('/tests/:id', Tests.remove)





// Orders (Sample Intake)

r.get('/orders', Orders.list)

r.post('/orders', Orders.create)

r.post('/orders/token/:tokenNo/receive-payment', Orders.receivePayment)

r.put('/orders/:id/track', Orders.updateTrack)

r.delete('/orders/:id', Orders.remove)



// Tokens (Lab Token Tracking)

r.get('/tokens', Tokens.list)

r.get('/tokens/:id', Tokens.get)

r.get('/tokens/:id/timeline', Tokens.getTimeline)

r.post('/tokens', Tokens.create)

r.put('/tokens/:id', Tokens.update)

r.post('/tokens/:id/convert', Tokens.convertToSample)

r.put('/tokens/:id/status', Tokens.updateStatus)
r.put('/tokens/:id/report-printed', Tokens.markReportPrinted)

r.delete('/tokens/:id', Tokens.remove)



// Income Ledger

r.get('/income-ledger', IncomeLedger.list)



// Appointments (Lab)

r.get('/appointments', Appointments.list)

r.post('/appointments', Appointments.create)

r.put('/appointments/:id', Appointments.update)

r.patch('/appointments/:id/status', Appointments.updateStatus)

r.post('/appointments/:id/convert-to-token', Appointments.convertToToken)

r.delete('/appointments/:id', Appointments.remove)



// Results

r.get('/results', Results.list)

r.get('/results/:id', Results.get)

r.post('/results', Results.create)

r.put('/results/:id', Results.update)



// Dashboard

r.get('/dashboard/summary', Dashboard.summary)

// Reports

r.get('/reports/summary', Reports.summary)



// Blood Bank

// Donors

r.get('/bb/donors', BBDonors.list)

r.post('/bb/donors', BBDonors.create)

r.put('/bb/donors/:id', BBDonors.update)

r.delete('/bb/donors/:id', BBDonors.remove)



// Receivers

r.get('/bb/receivers', BBReceivers.list)

r.post('/bb/receivers', BBReceivers.create)

r.put('/bb/receivers/:id', BBReceivers.update)

r.delete('/bb/receivers/:id', BBReceivers.remove)



// Inventory (Blood Bags)

r.get('/bb/inventory', BBInventory.list)

r.post('/bb/inventory', BBInventory.create)

r.put('/bb/inventory/:id', BBInventory.update)

r.delete('/bb/inventory/:id', BBInventory.remove)

r.get('/bb/inventory/summary', BBInventory.summary)



// Collection Centers

r.get('/collection-centers', CollectionCenters.list)

r.get('/collection-centers/active', CollectionCenters.listAllActive)

r.post('/collection-centers', CollectionCenters.create)

r.put('/collection-centers/:id', CollectionCenters.update)

r.delete('/collection-centers/:id', CollectionCenters.remove)

r.get('/collection-centers/:id/tokens', CollectionCenters.getTokens)

r.get('/collection-centers/:id/revenue', CollectionCenters.getRevenue)

r.get('/collection-centers/revenue/summary', CollectionCenters.getRevenueSummaryAll)

r.post('/collection-centers/:id/record-payment', CollectionCenters.recordPayment)

r.get('/collection-centers/:id/payment-history', CollectionCenters.getPaymentHistory)



// === Extended endpoints (mega upgrade) ===

// Settings: header/footer + history
r.post('/settings/header', Settings.uploadHeaderFooter)
r.get('/settings/header/history', Settings.listHeaderHistory)
r.post('/settings/header/revert/:historyId', Settings.revertHeaderFooter)

// Sample receive (image 9 — two-box icon)
r.post('/tokens/:id/receive-sample', Tokens.markSampleReceived)

// Results: extended endpoints
r.get('/results/history/list', Results.history)
r.post('/results/:id/repeat', Results.repeatSample)
r.get('/results/instances/list', Results.listInstances)

// Critical events + parameters
r.get('/critical-events', Critical.listEvents)
r.get('/critical-events/:id', Critical.getEvent)
r.post('/critical-events', Critical.createEvent)
r.post('/critical-events/:id/resolve', Critical.resolveEvent)
r.get('/critical-parameters', Critical.listParameters)
r.post('/critical-parameters', Critical.createParameter)
r.put('/critical-parameters/:id', Critical.updateParameter)
r.delete('/critical-parameters/:id', Critical.deleteParameter)

// Test Packages
r.get('/test-packages', Packages.list)
r.get('/test-packages/:id', Packages.get)
r.post('/test-packages', Packages.create)
r.put('/test-packages/:id', Packages.update)
r.delete('/test-packages/:id', Packages.remove)

// Patient Cards
r.get('/patient-cards', PatientCards.list)
r.get('/patient-cards/:id', PatientCards.get)
r.post('/patient-cards', PatientCards.create)
r.post('/patient-cards/:id/printed', PatientCards.markPrinted)
r.delete('/patient-cards/:id', PatientCards.remove)

// Outsource labs + rate list + dispatch
r.get('/outsource-labs', Outsource.list)
r.post('/outsource-labs', Outsource.create)
r.put('/outsource-labs/:id', Outsource.update)
r.delete('/outsource-labs/:id', Outsource.remove)
r.get('/outsource-rates', Outsource.listRates)
r.post('/outsource-rates', Outsource.upsertRate)
r.post('/outsource-rates/bulk', Outsource.bulkSaveRates)
r.post('/outsource-rates/copy/:fromId', Outsource.copyRateList)
r.get('/outsource-dispatches', Outsource.listDispatches)
r.post('/outsource-dispatches', Outsource.createDispatch)
r.put('/outsource-dispatches/:id', Outsource.updateDispatch)

// Collection-center rate list + copy
r.get('/center-rates', CenterRates.list)
r.post('/center-rates', CenterRates.upsert)
r.post('/center-rates/bulk', CenterRates.bulkSave)
r.post('/center-rates/copy/:fromId', CenterRates.copyRateList)
r.delete('/center-rates/:id', CenterRates.remove)

// Notifications (scope-aware)
r.get('/notifications', Notifications.list)
r.post('/notifications', Notifications.create)
r.post('/notifications/:id/read', Notifications.markRead)
r.post('/notifications/read-all', Notifications.markAllRead)

// Ward imports (offline)
r.get('/ward-imports', WardImports.list)
r.get('/ward-imports/:id', WardImports.get)
r.post('/ward-imports/upload', WardImports.upload)
r.post('/ward-imports/:id/commit', WardImports.commit)
r.post('/ward-imports/:id/cancel', WardImports.cancel)

// Doctors (Referral)
r.get('/doctors', Doctors.list)
r.get('/doctors/:id', Doctors.get)
r.post('/doctors', Doctors.create)
r.put('/doctors/:id', Doctors.update)
r.delete('/doctors/:id', Doctors.remove)
r.get('/doctors/stats/summary', Doctors.stats)
r.get('/doctors/:id/detail-stats', Doctors.detailStats)



export default r

