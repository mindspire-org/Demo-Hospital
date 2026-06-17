/**
 * Pharmacy API Module
 * 
 * Handles pharmacy operations:
 * - Settings, Suppliers, Companies, Customers
 * - Expenses, Cash Movements, Cash Counts
 * - Medicines, Inventory
 * - Shifts, Staff, Attendance, Earnings
 * - Sales / POS, Hold Sales
 * - Purchases, Purchase Orders, Purchase Drafts
 * - Returns
 * - Notifications, Users, Audit Logs
 * - Sidebar Roles & Permissions
 */

import { api, cachedApi, withQuery } from '../../api'
import type { CachedApiOptions } from '../../api'

export const pharmacyApi = {
  // -------------------------------------------------------------------------
  // Settings
  // -------------------------------------------------------------------------
  getSettings: () => api('/pharmacy/settings'),
  updateSettings: (data: any) => api('/pharmacy/settings', { method: 'PUT', body: JSON.stringify(data) }),

  // -------------------------------------------------------------------------
  // Suppliers
  // -------------------------------------------------------------------------
  listSuppliers: (params?: string | { q?: string; page?: number; limit?: number }) => {
    if (typeof params === 'string') {
      return api(`/pharmacy/suppliers?q=${encodeURIComponent(params)}`)
    }
    return api(withQuery('/pharmacy/suppliers', params))
  },
  listAllSuppliers: (q?: string) => api(withQuery('/pharmacy/suppliers', { q, limit: 500 })),
  createSupplier: (data: any) => api('/pharmacy/suppliers', { method: 'POST', body: JSON.stringify(data) }),
  updateSupplier: (id: string, data: any) => api(`/pharmacy/suppliers/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteSupplier: (id: string) => api(`/pharmacy/suppliers/${id}`, { method: 'DELETE' }),
  recordSupplierPayment: (id: string, data: { amount: number; purchaseId?: string; method?: string; note?: string; date?: string }) =>
    api(`/pharmacy/suppliers/${id}/payment`, { method: 'POST', body: JSON.stringify(data) }),
  listSupplierPurchases: (id: string) => api(`/pharmacy/suppliers/${id}/purchases`),

  // -------------------------------------------------------------------------
  // Companies
  // -------------------------------------------------------------------------
  listCompanies: (params?: { q?: string; distributorId?: string; page?: number; limit?: number }) =>
    api(withQuery('/pharmacy/companies', params)),
  listAllCompanies: (params?: { q?: string; distributorId?: string }) =>
    api(withQuery('/pharmacy/companies', { ...params, limit: 500 })),
  createCompany: (data: { name: string; distributorId?: string; distributorName?: string; status?: 'Active' | 'Inactive' }) =>
    api('/pharmacy/companies', { method: 'POST', body: JSON.stringify(data) }),
  updateCompany: (id: string, data: Partial<{ name: string; distributorId?: string; distributorName?: string; status?: 'Active' | 'Inactive' }>) =>
    api(`/pharmacy/companies/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteCompany: (id: string) => api(`/pharmacy/companies/${id}`, { method: 'DELETE' }),
  listSupplierCompanies: (supplierId: string) => api(`/pharmacy/suppliers/${supplierId}/companies`),
  assignSupplierCompanies: (supplierId: string, data: { companyIds?: string[]; unassignIds?: string[] }) =>
    api(`/pharmacy/suppliers/${supplierId}/companies`, { method: 'POST', body: JSON.stringify(data) }),

  // -------------------------------------------------------------------------
  // Customers
  // -------------------------------------------------------------------------
  listCustomers: (params?: { q?: string; page?: number; limit?: number }) =>
    api(withQuery('/pharmacy/customers', params)),
  createCustomer: (data: any) => api('/pharmacy/customers', { method: 'POST', body: JSON.stringify(data) }),
  updateCustomer: (id: string, data: any) => api(`/pharmacy/customers/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteCustomer: (id: string) => api(`/pharmacy/customers/${id}`, { method: 'DELETE' }),

  // -------------------------------------------------------------------------
  // Expenses
  // -------------------------------------------------------------------------
  listExpenses: (params?: { from?: string; to?: string; minAmount?: number; search?: string; type?: string; user?: string; page?: number; limit?: number }) =>
    api(withQuery('/pharmacy/expenses', params)),
  createExpense: (data: any) => api('/pharmacy/expenses', { method: 'POST', body: JSON.stringify(data) }),
  deleteExpense: (id: string) => api(`/pharmacy/expenses/${id}`, { method: 'DELETE' }),
  expensesSummary: (params?: { from?: string; to?: string }) =>
    api(withQuery('/pharmacy/expenses/summary', params)),

  // -------------------------------------------------------------------------
  // Cash Movements (Pay In/Out)
  // -------------------------------------------------------------------------
  listCashMovements: (params?: { from?: string; to?: string; type?: 'IN' | 'OUT'; search?: string; page?: number; limit?: number }) =>
    api(withQuery('/pharmacy/cash-movements', params)),
  createCashMovement: (data: { date: string; type: 'IN' | 'OUT'; category?: string; amount: number; receiver?: string; handoverBy?: string; note?: string }) =>
    api('/pharmacy/cash-movements', { method: 'POST', body: JSON.stringify(data) }),
  deleteCashMovement: (id: string) => api(`/pharmacy/cash-movements/${id}`, { method: 'DELETE' }),
  cashMovementSummary: (params?: { from?: string; to?: string }) =>
    api(withQuery('/pharmacy/cash-movements/summary', params)),

  // -------------------------------------------------------------------------
  // Manager Cash Count
  // -------------------------------------------------------------------------
  listCashCounts: (params?: { from?: string; to?: string; search?: string; page?: number; limit?: number }) =>
    api(withQuery('/pharmacy/cash-counts', params)),
  createCashCount: (data: { date: string; amount: number; receiver?: string; handoverBy?: string; note?: string }) =>
    api('/pharmacy/cash-counts', { method: 'POST', body: JSON.stringify(data) }),
  deleteCashCount: (id: string) => api(`/pharmacy/cash-counts/${id}`, { method: 'DELETE' }),
  cashCountSummary: (params?: { from?: string; to?: string; search?: string }) =>
    api(withQuery('/pharmacy/cash-counts/summary', params)),

  // -------------------------------------------------------------------------
  // Medicines
  // -------------------------------------------------------------------------
  searchMedicines: async (q?: string, limit?: number) => {
    const res: any = await api(withQuery('/pharmacy/inventory', { search: q, limit: limit || 20 }))
    const items: any[] = res?.items ?? res ?? []
    return { suggestions: items.map((it: any) => ({ id: String(it._id || it.key || it.name || ''), name: String(it.name || '') })) }
  },
  getAllMedicines: async () => {
    const { fetchMedicinesFromExcel } = await import('../../utils/medicineExcel')
    const excelItems = await fetchMedicinesFromExcel()
    if (excelItems.length > 0) {
      return { medicines: excelItems.map((it: any) => ({ id: String(it.name || ''), name: String(it.name || ''), genericName: String(it.genericName || ''), company: String(it.company || '') })) }
    }
    const res: any = await api(withQuery('/pharmacy/inventory', { limit: 2000 }))
    const items: any[] = res?.items ?? res ?? []
    return { medicines: items.map((it: any) => ({ id: String(it._id || it.key || it.name || ''), name: String(it.name || ''), genericName: String(it.genericName || it.lastGenericName || ''), company: String(it.lastCompany || '') })) }
  },
  createMedicine: (data: any) => api('/pharmacy/medicines', { method: 'POST', body: JSON.stringify(data) }),

  // -------------------------------------------------------------------------
  // Shifts
  // -------------------------------------------------------------------------
  listShifts: () => api('/pharmacy/shifts'),
  createShift: (data: any) => api('/pharmacy/shifts', { method: 'POST', body: JSON.stringify(data) }),
  updateShift: (id: string, data: any) => api(`/pharmacy/shifts/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteShift: (id: string) => api(`/pharmacy/shifts/${id}`, { method: 'DELETE' }),

  // -------------------------------------------------------------------------
  // Staff
  // -------------------------------------------------------------------------
  listStaff: (params?: { q?: string; shiftId?: string; page?: number; limit?: number } | string) => {
    if (typeof params === 'string') {
      return api(`/pharmacy/staff?q=${encodeURIComponent(params)}`)
    }
    return api(withQuery('/pharmacy/staff', params))
  },
  createStaff: (data: any) => api('/pharmacy/staff', { method: 'POST', body: JSON.stringify(data) }),
  updateStaff: (id: string, data: any) => api(`/pharmacy/staff/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteStaff: (id: string) => api(`/pharmacy/staff/${id}`, { method: 'DELETE' }),

  // -------------------------------------------------------------------------
  // Attendance
  // -------------------------------------------------------------------------
  listAttendance: (params?: { date?: string; shiftId?: string; staffId?: string; from?: string; to?: string; page?: number; limit?: number }) =>
    api(withQuery('/pharmacy/attendance', params)),
  upsertAttendance: (data: any) => api('/pharmacy/attendance', { method: 'POST', body: JSON.stringify(data) }),

  // -------------------------------------------------------------------------
  // Staff Earnings
  // -------------------------------------------------------------------------
  listStaffEarnings: (params?: { staffId?: string; from?: string; to?: string; page?: number; limit?: number }) =>
    api(withQuery('/pharmacy/staff-earnings', params)),
  createStaffEarning: (data: { staffId: string; date: string; category: 'Bonus' | 'Award' | 'LumpSum' | 'RevenueShare'; amount?: number; rate?: number; base?: number; notes?: string }) =>
    api('/pharmacy/staff-earnings', { method: 'POST', body: JSON.stringify(data) }),
  updateStaffEarning: (id: string, data: Partial<{ staffId: string; date: string; category: 'Bonus' | 'Award' | 'LumpSum' | 'RevenueShare'; amount?: number; rate?: number; base?: number; notes?: string }>) =>
    api(`/pharmacy/staff-earnings/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteStaffEarning: (id: string) => api(`/pharmacy/staff-earnings/${id}`, { method: 'DELETE' }),

  // -------------------------------------------------------------------------
  // Sales / POS
  // -------------------------------------------------------------------------
  listSales: (params?: { bill?: string; customer?: string; customerId?: string; phone?: string; payment?: 'Any' | 'Cash' | 'Card' | 'Credit'; medicine?: string; user?: string; from?: string; to?: string; page?: number; limit?: number }) =>
    api(withQuery('/pharmacy/sales', params)),
  createSale: (data: any) => api('/pharmacy/sales', { method: 'POST', body: JSON.stringify(data) }),
  salesSummary: (params?: { payment?: 'Any' | 'Cash' | 'Card' | 'Credit'; from?: string; to?: string }) =>
    api(withQuery('/pharmacy/sales/summary', params)),

  // -------------------------------------------------------------------------
  // Hold Sales
  // -------------------------------------------------------------------------
  listHoldSales: () => api('/pharmacy/hold-sales'),
  getHoldSale: (id: string) => api(`/pharmacy/hold-sales/${encodeURIComponent(id)}`),
  createHoldSale: (data: { billDiscountPct?: number; lines: Array<{ medicineId: string; name: string; unitPrice: number; qty: number; discountRs?: number }> }) =>
    api('/pharmacy/hold-sales', { method: 'POST', body: JSON.stringify(data) }),
  deleteHoldSale: (id: string) => api(`/pharmacy/hold-sales/${encodeURIComponent(id)}`, { method: 'DELETE' }),

  // -------------------------------------------------------------------------
  // Hold Purchase Invoices
  // -------------------------------------------------------------------------
  listHoldPurchaseInvoices: () => api('/pharmacy/hold-purchase-invoices'),
  getHoldPurchaseInvoice: (id: string) => api(`/pharmacy/hold-purchase-invoices/${encodeURIComponent(id)}`),
  createHoldPurchaseInvoice: (data: any) => api('/pharmacy/hold-purchase-invoices', { method: 'POST', body: JSON.stringify(data) }),
  deleteHoldPurchaseInvoice: (id: string) => api(`/pharmacy/hold-purchase-invoices/${encodeURIComponent(id)}`, { method: 'DELETE' }),

  // -------------------------------------------------------------------------
  // Purchase Orders
  // -------------------------------------------------------------------------
  listPurchaseOrders: (params?: { q?: string; page?: number; limit?: number }) =>
    api(withQuery('/pharmacy/purchase-orders', params)),
  getPurchaseOrder: (id: string) => api(`/pharmacy/purchase-orders/${id}`),
  createPurchaseOrder: (data: any) => api('/pharmacy/purchase-orders', { method: 'POST', body: JSON.stringify(data) }),
  updatePurchaseOrder: (id: string, data: any) => api(`/pharmacy/purchase-orders/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  updatePurchaseOrderStatus: (id: string, status: string) =>
    api(`/pharmacy/purchase-orders/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) }),
  deletePurchaseOrder: (id: string) => api(`/pharmacy/purchase-orders/${id}`, { method: 'DELETE' }),

  // -------------------------------------------------------------------------
  // Purchases
  // -------------------------------------------------------------------------
  listPurchases: (params?: { from?: string; to?: string; search?: string; page?: number; limit?: number }) =>
    api(withQuery('/pharmacy/purchases', params)),
  createPurchase: (data: any) => api('/pharmacy/purchases', { method: 'POST', body: JSON.stringify(data) }),
  deletePurchase: (id: string) => api(`/pharmacy/purchases/${id}`, { method: 'DELETE' }),
  purchasesSummary: (params?: { from?: string; to?: string }) =>
    api(withQuery('/pharmacy/purchases/summary', params)),

  // -------------------------------------------------------------------------
  // Returns
  // -------------------------------------------------------------------------
  listReturns: (params?: { type?: 'Customer' | 'Supplier'; from?: string; to?: string; search?: string; phone?: string; party?: string; reference?: string; page?: number; limit?: number }) =>
    api(withQuery('/pharmacy/returns', params)),
  createReturn: (data: any) => api('/pharmacy/returns', { method: 'POST', body: JSON.stringify(data) }),

  // -------------------------------------------------------------------------
  // Inventory
  // -------------------------------------------------------------------------
  listInventory: (params?: { search?: string; page?: number; limit?: number }) =>
    api(withQuery('/pharmacy/inventory', params)),
  listInventoryFiltered: (params: { status: 'low' | 'out' | 'expiring' | 'dead'; search?: string; page?: number; limit?: number }) =>
    api(withQuery('/pharmacy/inventory/filter', params)),
  inventorySummary: (params?: { search?: string; limit?: number }) =>
    api(withQuery('/pharmacy/inventory/summary', params)),
  deleteInventoryItem: (key: string) => api(withQuery('/pharmacy/inventory/item', { key }), { method: 'DELETE' }),
  updateInventoryItem: (key: string, data: any) => api(withQuery('/pharmacy/inventory/item', { key }), { method: 'PUT', body: JSON.stringify(data) }),
  manualReceipt: (data: any) => api('/pharmacy/inventory/manual-receipt', { method: 'POST', body: JSON.stringify(data) }),
  adjustInventory: (data: any) => api('/pharmacy/inventory/adjust', { method: 'POST', body: JSON.stringify(data) }),

  // Cached inventory methods
  listInventoryCached: (params?: { search?: string; page?: number; limit?: number }, opts?: CachedApiOptions) =>
    cachedApi(withQuery('/pharmacy/inventory', params), undefined, opts),
  listInventoryFilteredCached: (params: { status: 'low' | 'out' | 'expiring' | 'dead'; search?: string; page?: number; limit?: number }, opts?: CachedApiOptions) =>
    cachedApi(withQuery('/pharmacy/inventory/filter', params), undefined, opts),
  inventorySummaryCached: (params?: { search?: string; limit?: number }, opts?: CachedApiOptions) =>
    cachedApi(withQuery('/pharmacy/inventory/summary', params), undefined, opts),
  purchasesSummaryCached: (params?: { from?: string; to?: string }, opts?: CachedApiOptions) =>
    cachedApi(withQuery('/pharmacy/purchases/summary', params), undefined, opts),
  salesSummaryCached: (params?: { payment?: 'Any' | 'Cash' | 'Card' | 'Credit'; from?: string; to?: string }, opts?: CachedApiOptions) =>
    cachedApi(withQuery('/pharmacy/sales/summary', params), undefined, opts),
  listSalesCached: (params?: { bill?: string; customer?: string; customerId?: string; phone?: string; payment?: 'Any' | 'Cash' | 'Card' | 'Credit'; medicine?: string; from?: string; to?: string; page?: number; limit?: number }, opts?: CachedApiOptions) =>
    cachedApi(withQuery('/pharmacy/sales', params), undefined, opts),

  // -------------------------------------------------------------------------
  // Purchase Drafts
  // -------------------------------------------------------------------------
  listPurchaseDrafts: (params?: { from?: string; to?: string; search?: string; limit?: number }) =>
    api(withQuery('/pharmacy/purchase-drafts', params)),
  listPurchaseDraftLines: (params?: { from?: string; to?: string; search?: string; page?: number; limit?: number }) =>
    api(withQuery('/pharmacy/purchase-drafts/lines', params)),
  getNextPurchaseInvoiceNumber: () => api('/pharmacy/purchase-drafts/next-invoice-number'),
  createPurchaseDraft: (data: any) => api('/pharmacy/purchase-drafts', { method: 'POST', body: JSON.stringify(data) }),
  getPurchaseDraft: (id: string) => api(`/pharmacy/purchase-drafts/${id}`),
  updatePurchaseDraft: (id: string, data: any) => api(`/pharmacy/purchase-drafts/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  approvePurchaseDraft: (id: string) => api(`/pharmacy/purchase-drafts/${id}/approve`, { method: 'POST' }),
  deletePurchaseDraft: (id: string) => api(`/pharmacy/purchase-drafts/${id}`, { method: 'DELETE' }),

  // -------------------------------------------------------------------------
  // Notifications
  // -------------------------------------------------------------------------
  getNotifications: (params?: { page?: number; limit?: number; severity?: 'info' | 'warning' | 'critical' | 'success'; read?: boolean }) =>
    api(withQuery('/pharmacy/notifications', params)),
  markNotificationRead: (id: string) => api(`/pharmacy/notifications/${id}/read`, { method: 'POST' }),
  markAllNotificationsRead: () => api('/pharmacy/notifications/read-all', { method: 'POST' }),
  deleteNotification: (id: string) => api(`/pharmacy/notifications/${id}`, { method: 'DELETE' }),
  generateNotifications: () => api('/pharmacy/notifications/generate', { method: 'POST' }),

  // -------------------------------------------------------------------------
  // Users
  // -------------------------------------------------------------------------
  listUsers: () => api('/pharmacy/users'),
  createUser: (data: any) => api('/pharmacy/users', { method: 'POST', body: JSON.stringify(data) }),
  updateUser: (id: string, data: any) => api(`/pharmacy/users/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteUser: (id: string) => api(`/pharmacy/users/${id}`, { method: 'DELETE' }),
  loginUser: (username: string, password: string) => api('/pharmacy/users/login', { method: 'POST', body: JSON.stringify({ username, password }) }),
  logoutUser: (username?: string) => api('/pharmacy/users/logout', { method: 'POST', body: JSON.stringify({ username }) }),

  // -------------------------------------------------------------------------
  // Sidebar Roles & Permissions
  // -------------------------------------------------------------------------
  listSidebarRoles: () => api('/pharmacy/sidebar-roles'),
  createSidebarRole: (role: string, permissions?: Array<{ path: string; label: string; visible?: boolean; order?: number }>) =>
    api('/pharmacy/sidebar-roles', { method: 'POST', body: JSON.stringify({ role, permissions }) }),
  deleteSidebarRole: (role: string) => api(`/pharmacy/sidebar-roles/${encodeURIComponent(role)}`, { method: 'DELETE' }),
  listSidebarPermissions: (role?: string) =>
    role ? api(`/pharmacy/sidebar-permissions?role=${encodeURIComponent(role)}`) : api('/pharmacy/sidebar-permissions'),
  updateSidebarPermissions: (role: string, data: { permissions: Array<{ path: string; label: string; visible: boolean; order: number }> }) =>
    api(`/pharmacy/sidebar-permissions/${encodeURIComponent(role)}`, { method: 'PUT', body: JSON.stringify(data) }),
  resetSidebarPermissions: (role: string) =>
    api(`/pharmacy/sidebar-permissions/${encodeURIComponent(role)}/reset`, { method: 'POST' }),

  // -------------------------------------------------------------------------
  // Audit Logs
  // -------------------------------------------------------------------------
  listAuditLogs: (params?: { search?: string; action?: string; from?: string; to?: string; page?: number; limit?: number }) =>
    api(withQuery('/pharmacy/audit-logs', params)),
  createAuditLog: (data: any) => api('/pharmacy/audit-logs', { method: 'POST', body: JSON.stringify(data) }),
}

export default pharmacyApi
