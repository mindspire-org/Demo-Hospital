import { Router } from 'express'
import * as Suppliers from '../controllers/indoorsuppliers.controller'
import * as Customers from '../controllers/indoorcustomers.controller'
import * as Expenses from '../controllers/indoorexpenses.controller'
import * as Settings from '../controllers/indoorsettings.controller'
import * as Shifts from '../controllers/indoorshifts.controller'
import * as Sales from '../controllers/indoordispense.controller'
import * as Purchases from '../controllers/indoorpurchases.controller'
import * as Returns from '../controllers/indoorreturns.controller'
import * as Audit from '../controllers/indooraudit.controller'
import * as Users from '../controllers/indoorusers.controller'
import * as Drafts from '../controllers/indoordrafts.controller'
import * as InventoryItems from '../controllers/indoorinventory_items.controller'
import * as CashMovements from '../controllers/indoorcash_movement.controller'
import * as CashCounts from '../controllers/indoorcash_count.controller'
import * as Notifications from '../controllers/indoornotifications.controller'
import * as SidebarPerms from '../controllers/indoorsidebarPermission.controller'
import * as HoldSales from '../controllers/indoorhold_sales.controller'
import * as Companies from '../controllers/indoorcompanies.controller'
import * as HoldPurchaseInvoices from '../controllers/indoorhold_purchase_invoices.controller'
import { auth } from '../../../common/middleware/auth'
import { requireAdmin } from '../../../common/middleware/hospital_guard'

const r = Router()

// Auth (public)
r.post('/users/login', Users.login)
r.post('/users/logout', Users.logout)

// All routes below require authentication
r.use(auth)

// Suppliers
r.get('/suppliers', Suppliers.list)
r.post('/suppliers', requireAdmin, Suppliers.create)
r.put('/suppliers/:id', requireAdmin, Suppliers.update)
r.delete('/suppliers/:id', requireAdmin, Suppliers.remove)
r.post('/suppliers/:id/payment', Suppliers.recordPayment)
r.get('/suppliers/:id/purchases', Suppliers.purchases)

// Purchase Orders
import * as PurchaseOrders from '../controllers/indoorpurchase_orders.controller'
r.get('/purchase-orders', PurchaseOrders.list)
r.get('/purchase-orders/:id', PurchaseOrders.getOne)
r.post('/purchase-orders', requireAdmin, PurchaseOrders.create)
r.put('/purchase-orders/:id', requireAdmin, PurchaseOrders.update)
r.patch('/purchase-orders/:id/status', requireAdmin, PurchaseOrders.updateStatus)
r.delete('/purchase-orders/:id', requireAdmin, PurchaseOrders.remove)
// Supplier-Companies
r.get('/suppliers/:id/companies', Companies.listForSupplier)
r.post('/suppliers/:id/companies', Companies.assignToSupplier)

// Customers (legacy route)
r.get('/customers', Customers.list)
r.post('/customers', requireAdmin, Customers.create)
r.put('/customers/:id', requireAdmin, Customers.update)
r.delete('/customers/:id', requireAdmin, Customers.remove)

// Patients (alias for Customers - used by frontend)
r.get('/patients', Customers.list)
r.post('/patients', requireAdmin, Customers.create)
r.put('/patients/:id', requireAdmin, Customers.update)
r.delete('/patients/:id', requireAdmin, Customers.remove)

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

// Settings
r.get('/settings', Settings.get)
r.put('/settings', requireAdmin, Settings.update)
 

// Shifts
r.get('/shifts', Shifts.list)
r.post('/shifts', requireAdmin, Shifts.create)
r.put('/shifts/:id', requireAdmin, Shifts.update)
r.delete('/shifts/:id', requireAdmin, Shifts.remove)

// Sales / Dispense (POS) - legacy /sales routes
r.get('/sales', Sales.list)
r.post('/sales', Sales.create)
r.get('/sales/summary', Sales.summary)

// Dispenses (alias for Sales - used by frontend)
r.get('/dispenses', Sales.list)
r.post('/dispenses', Sales.create)
r.get('/dispenses/summary', Sales.summary)

// Hold Sales (server-side held bills) - legacy /hold-sales routes
r.get('/hold-sales', HoldSales.list)
r.get('/hold-sales/:id', HoldSales.getOne)
r.post('/hold-sales', HoldSales.create)
r.delete('/hold-sales/:id', HoldSales.remove)

// Hold Dispenses (alias for Hold Sales - used by frontend)
r.get('/hold-dispenses', HoldSales.list)
r.get('/hold-dispenses/:id', HoldSales.getOne)
r.post('/hold-dispenses', HoldSales.create)
r.delete('/hold-dispenses/:id', HoldSales.remove)

// Hold Purchase Invoices (server-side held purchase invoices)
r.get('/hold-purchase-invoices', HoldPurchaseInvoices.list)
r.get('/hold-purchase-invoices/:id', HoldPurchaseInvoices.getOne)
r.post('/hold-purchase-invoices', HoldPurchaseInvoices.create)
r.delete('/hold-purchase-invoices/:id', HoldPurchaseInvoices.remove)

// Purchases
r.get('/purchases', Purchases.list)
r.post('/purchases', Purchases.create)
r.delete('/purchases/:id', Purchases.remove)
r.get('/purchases/summary', Purchases.summary)

// Companies
r.get('/companies', Companies.list)
r.post('/companies', requireAdmin, Companies.create)
r.put('/companies/:id', requireAdmin, Companies.update)
r.delete('/companies/:id', requireAdmin, Companies.remove)

// Returns (Customer/Supplier)
r.get('/returns', Returns.list)
r.post('/returns', requireAdmin, Returns.create)

// Audit Logs
r.get('/audit-logs', Audit.list)
r.post('/audit-logs', requireAdmin, Audit.create)

// Users (Pharmacy)
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

// Purchase Drafts (Pending Review)
r.get('/purchase-drafts', Drafts.list)
r.get('/purchase-drafts/lines', Drafts.listLines)
r.get('/purchase-drafts/next-invoice-number', Drafts.getNextInvoiceNumber)
r.post('/purchase-drafts', Drafts.create)
r.get('/purchase-drafts/:id', Drafts.getOne)
r.put('/purchase-drafts/:id', Drafts.update)
r.post('/purchase-drafts/:id/approve', Drafts.approve)
r.delete('/purchase-drafts/:id', Drafts.remove)

// Inventory items (aggregated store)
r.get('/inventory', InventoryItems.list)
// Filtered inventory views for tabs (low|out|expiring)
r.get('/inventory/filter', InventoryItems.listFiltered)
r.put('/inventory/:key', InventoryItems.update)
// Inventory summary aggregated from purchases
r.get('/inventory/summary', InventoryItems.summary)
// Delete an inventory item by key
r.delete('/inventory/:key', InventoryItems.remove)

// Medicines (alias for inventory - used by frontend)
r.get('/medicines', InventoryItems.list)

// Prescriptions (linked to hospital EMR) - stub routes for now
r.get('/prescriptions', (req, res) => res.json({ items: [], total: 0 }))
r.get('/prescriptions/:id', (req, res) => res.status(404).json({ error: 'Not found' }))
r.post('/prescriptions/:id/dispense', (req, res) => res.status(501).json({ error: 'Not implemented' }))

// Notifications
r.get('/notifications', Notifications.getNotifications)
r.post('/notifications/generate', Notifications.generateNotifications)
r.post('/notifications/:id/read', Notifications.markNotificationRead)
r.post('/notifications/read-all', Notifications.markAllNotificationsRead)
r.delete('/notifications/:id', Notifications.deleteNotification)

export default r
