import { Router } from 'express'
import { auth } from '../../../common/middleware/auth'
import {
  storeDashboard,
  listSuppliers, createSupplier, updateSupplier, deleteSupplier, getSupplier, getSupplierLedger, createSupplierPayment, listSupplierPurchases, recomputeAllSuppliers,
  listInventory, createItem, updateItem, deleteItem,
  listPurchases, createPurchase, getPurchase, updatePurchase, deletePurchase,
  listIssues, createIssue, getIssue,
  getReport,
  listDepartments,
} from '../controllers/store.controller'
import {
  list as listPurchaseDrafts,
  getNextInvoiceNumber,
  listLines as listPurchaseDraftLines,
  create as createPurchaseDraft,
  remove as deletePurchaseDraft,
  getOne as getPurchaseDraft,
  update as updatePurchaseDraft,
  approve as approvePurchaseDraft,
} from '../controllers/store_purchasedraft.controller'
import { storeHeldPurchaseController } from '../controllers/store_heldpurchase.controller'
import * as PurchaseOrders from '../controllers/Store_purchase_orders.controller'

const router = Router()

// All routes require authentication
router.use(auth)

// Dashboard
router.get('/dashboard', storeDashboard)

// Suppliers
router.get('/suppliers', listSuppliers)
router.get('/suppliers/:id', getSupplier)
router.post('/suppliers', createSupplier)
router.put('/suppliers/:id', updateSupplier)
router.delete('/suppliers/:id', deleteSupplier)
router.get('/suppliers/:supplierId/ledger', getSupplierLedger)
router.get('/suppliers/:supplierId/purchases', listSupplierPurchases)
router.post('/suppliers/payments', createSupplierPayment)
// Maintenance: recompute supplier aggregates from purchases/payments
router.post('/suppliers/recompute', recomputeAllSuppliers)

// Inventory
router.get('/inventory', listInventory)
router.post('/inventory', createItem)
router.put('/inventory/:id', updateItem)
router.delete('/inventory/:id', deleteItem)
// Purchases
router.get('/purchases', listPurchases)
router.post('/purchases', createPurchase)
router.get('/purchases/:id', getPurchase)
router.put('/purchases/:id', updatePurchase)
router.delete('/purchases/:id', deletePurchase)

// Issues
router.get('/issues', listIssues)
router.post('/issues', createIssue)
router.get('/issues/:id', getIssue)

// Reports
router.get('/reports/:reportType', getReport)

// Departments (for issue form)
router.get('/departments', listDepartments)

// Purchase Drafts (Pending Review)
router.get('/purchase-drafts', listPurchaseDrafts)
router.get('/purchase-drafts/next-invoice', getNextInvoiceNumber)
router.get('/purchase-drafts/lines', listPurchaseDraftLines)
router.post('/purchase-drafts', createPurchaseDraft)
router.get('/purchase-drafts/:id', getPurchaseDraft)
router.put('/purchase-drafts/:id', updatePurchaseDraft)
router.delete('/purchase-drafts/:id', deletePurchaseDraft)
router.post('/purchase-drafts/:id/approve', approvePurchaseDraft)

// Held Purchases
router.get('/held-purchases', storeHeldPurchaseController.list)
router.post('/held-purchases', storeHeldPurchaseController.create)
router.get('/held-purchases/:id', storeHeldPurchaseController.get)
router.delete('/held-purchases/:id', storeHeldPurchaseController.delete)
router.post('/held-purchases/:id/restore', storeHeldPurchaseController.restore)

// Purchase Orders
router.get('/purchase-orders', PurchaseOrders.list)
router.post('/purchase-orders', PurchaseOrders.create)
router.get('/purchase-orders/:id', PurchaseOrders.getOne)
router.put('/purchase-orders/:id', PurchaseOrders.update)
router.patch('/purchase-orders/:id/status', PurchaseOrders.updateStatus)
router.delete('/purchase-orders/:id', PurchaseOrders.remove)

export default router
