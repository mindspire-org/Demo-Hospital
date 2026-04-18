/**
 * Store API Module
 * 
 * Handles Store operations:
 * - Categories, Units, Locations
 * - Items, Lots, Stock, Transactions
 * - Suppliers, Inventory, Purchases, Issues
 * - Reports
 */

import { api, withQuery, baseURL, getToken } from '@/api'

export const storeApi = {
  // -------------------------------------------------------------------------
  // Store Management - Categories, Units, Locations
  // -------------------------------------------------------------------------
  storeListCategories: (params?: { q?: string; active?: boolean; page?: number; limit?: number }) =>
    api(withQuery('/hospital/store/categories', params)),
  storeCreateCategory: (data: { name: string; description?: string; active?: boolean }) =>
    api('/hospital/store/categories', { method: 'POST', body: JSON.stringify(data) }),
  storeUpdateCategory: (id: string, data: any) => api(`/hospital/store/categories/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  storeDeleteCategory: (id: string) => api(`/hospital/store/categories/${id}`, { method: 'DELETE' }),

  storeListUnits: (params?: { q?: string; active?: boolean; page?: number; limit?: number }) =>
    api(withQuery('/hospital/store/units', params)),
  storeCreateUnit: (data: { name: string; abbr?: string; active?: boolean }) =>
    api('/hospital/store/units', { method: 'POST', body: JSON.stringify(data) }),
  storeUpdateUnit: (id: string, data: any) => api(`/hospital/store/units/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  storeDeleteUnit: (id: string) => api(`/hospital/store/units/${id}`, { method: 'DELETE' }),

  storeListLocations: (params?: { q?: string; active?: boolean; page?: number; limit?: number }) =>
    api(withQuery('/hospital/store/locations', params)),
  storeCreateLocation: (data: { name: string; description?: string; active?: boolean }) =>
    api('/hospital/store/locations', { method: 'POST', body: JSON.stringify(data) }),
  storeUpdateLocation: (id: string, data: any) => api(`/hospital/store/locations/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  storeDeleteLocation: (id: string) => api(`/hospital/store/locations/${id}`, { method: 'DELETE' }),

  // -------------------------------------------------------------------------
  // Store Management - Items, Lots, Stock, Transactions
  // -------------------------------------------------------------------------
  storeListItems: (params?: { q?: string; categoryId?: string; active?: boolean; page?: number; limit?: number }) =>
    api(withQuery('/hospital/store/inventory', params)),
  storeCreateItem: (data: any) => api('/hospital/store/inventory', { method: 'POST', body: JSON.stringify(data) }),
  storeUpdateItem: (id: string, data: any) => api(`/hospital/store/inventory/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  storeDeleteItem: (id: string) => api(`/hospital/store/inventory/${id}`, { method: 'DELETE' }),

  storeLots: (params?: { itemId?: string; locationId?: string; expFrom?: string; expTo?: string; page?: number; limit?: number }) =>
    api(withQuery('/hospital/store/lots', params)),
  storeStock: (params?: { locationId?: string; itemId?: string }) =>
    api(withQuery('/hospital/store/stock', params)),

  storeTxns: (params?: { type?: 'RECEIVE' | 'ISSUE' | 'TRANSFER' | 'ADJUSTMENT'; itemId?: string; locationId?: string; from?: string; to?: string; page?: number; limit?: number }) =>
    api(withQuery('/hospital/store/txns', params)),
  storeReceive: (data: any) => api('/hospital/store/receive', { method: 'POST', body: JSON.stringify(data) }),
  storeIssue: (data: any) => api('/hospital/store/issue', { method: 'POST', body: JSON.stringify(data) }),
  storeTransfer: (data: any) => api('/hospital/store/transfer', { method: 'POST', body: JSON.stringify(data) }),
  storeAdjust: (data: any) => api('/hospital/store/adjust', { method: 'POST', body: JSON.stringify(data) }),

  // -------------------------------------------------------------------------
  // Store Reports
  // -------------------------------------------------------------------------
  storeWorth: (params?: { locationId?: string; asOf?: string }) =>
    api(withQuery('/hospital/store/reports/worth', params)),
  storeLowStock: (params?: { q?: string; onlyLow?: boolean }) =>
    api(withQuery('/hospital/store/reports/low-stock', params)),
  storeExpiring: (params: { to: string; from?: string; locationId?: string }) =>
    api(withQuery('/hospital/store/reports/expiring', params)),
  storeLedger: (params?: { itemId?: string; locationId?: string; from?: string; to?: string; page?: number; limit?: number }) =>
    api(withQuery('/hospital/store/reports/ledger', params)),

  // -------------------------------------------------------------------------
  // Store Module - Dashboard & Suppliers
  // -------------------------------------------------------------------------
  storeDashboard: () => api('/hospital/store/dashboard'),

  listStoreSuppliers: (params?: { status?: string; search?: string; page?: number; limit?: number }) =>
    api(withQuery('/hospital/store/suppliers', params)),
  createStoreSupplier: (data: { name: string; company?: string; phone?: string; address?: string; taxId?: string; status?: 'Active' | 'Inactive' }) =>
    api('/hospital/store/suppliers', { method: 'POST', body: JSON.stringify(data) }),
  updateStoreSupplier: (id: string, data: { name?: string; company?: string; phone?: string; address?: string; taxId?: string; status?: 'Active' | 'Inactive' }) =>
    api(`/hospital/store/suppliers/${encodeURIComponent(id)}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteStoreSupplier: (id: string) =>
    api(`/hospital/store/suppliers/${encodeURIComponent(id)}`, { method: 'DELETE' }),
  getStoreSupplier: (id: string) => api(`/hospital/store/suppliers/${encodeURIComponent(id)}`),
  getStoreSupplierLedger: (supplierId: string, params?: { from?: string; to?: string }) =>
    api(withQuery(`/hospital/store/suppliers/${encodeURIComponent(supplierId)}/ledger`, params)),
  listStoreSupplierPurchases: (supplierId: string) =>
    api(`/hospital/store/suppliers/${encodeURIComponent(supplierId)}/purchases`),
  createStoreSupplierPayment: (data: { supplierId: string; amount: number; method: 'cash' | 'bank' | 'cheque'; reference?: string; date?: string; purchaseId?: string }) =>
    api('/hospital/store/suppliers/payments', { method: 'POST', body: JSON.stringify(data) }),
  listAllStoreSuppliers: () => api('/hospital/store/suppliers?limit=1000'),

  // -------------------------------------------------------------------------
  // Store Module - Inventory
  // -------------------------------------------------------------------------
  listStoreInventory: (params?: { category?: string; status?: string; search?: string; page?: number; limit?: number }) =>
    api(withQuery('/hospital/store/inventory', params)),
  createStoreItem: (data: { name: string; category?: string; unit?: string; minStock?: number }) =>
    api('/hospital/store/inventory', { method: 'POST', body: JSON.stringify(data) }),
  updateStoreItem: (id: string, data: { name?: string; category?: string; unit?: string; minStock?: number }) =>
    api(`/hospital/store/inventory/${encodeURIComponent(id)}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteStoreItem: (id: string) =>
    api(`/hospital/store/inventory/${encodeURIComponent(id)}`, { method: 'DELETE' }),
  exportStoreInventoryCsv: async (params?: { category?: string; status?: string; search?: string }) => {
    const url = withQuery('/hospital/store/inventory/export-csv', params)
    const token = getToken('/hospital')
    const res = await fetch(baseURL + url, {
      headers: { 'Authorization': `Bearer ${token}` }
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Export failed' }))
      throw new Error(err.error || 'Export failed')
    }
    const blob = await res.blob()
    const downloadUrl = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = downloadUrl
    a.download = 'store-inventory.csv'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    window.URL.revokeObjectURL(downloadUrl)
    return { ok: true }
  },

  // -------------------------------------------------------------------------
  // Store Module - Purchases
  // -------------------------------------------------------------------------
  listStorePurchases: (params?: { from?: string; to?: string; supplierId?: string; search?: string; status?: string; page?: number; limit?: number }) =>
    api(withQuery('/hospital/store/purchases', params)),
  createStorePurchase: (data: { date: string; invoiceNo: string; supplierId: string; supplierName: string; paymentMode: 'cash' | 'credit' | 'bank'; storeLocation?: string; notes?: string; items: Array<{ itemName: string; category?: string; batchNo?: string; quantity: number; unit: string; purchaseCost: number; mrp?: number; expiry?: string }>; totalAmount: number }) =>
    api('/hospital/store/purchases', { method: 'POST', body: JSON.stringify(data) }),
  getStorePurchase: (id: string) => api(`/hospital/store/purchases/${encodeURIComponent(id)}`),
  deleteStorePurchase: (id: string) => api(`/hospital/store/purchases/${encodeURIComponent(id)}`, { method: 'DELETE' }),

  // -------------------------------------------------------------------------
  // Store Module - Purchase Drafts
  // -------------------------------------------------------------------------
  listStorePurchaseDrafts: (params?: { search?: string; page?: number; limit?: number }) =>
    api(withQuery('/hospital/store/purchase-drafts', params)),
  listStorePurchaseDraftLines: (params?: { search?: string; page?: number; limit?: number }) =>
    api(withQuery('/hospital/store/purchase-drafts/lines', params)),
  getStoreNextInvoiceNumber: () => api('/hospital/store/purchase-drafts/next-invoice'),
  getStorePurchaseDraft: (id: string) => api(`/hospital/store/purchase-drafts/${encodeURIComponent(id)}`),
  createStorePurchaseDraft: (data: any) => api('/hospital/store/purchase-drafts', { method: 'POST', body: JSON.stringify(data) }),
  updateStorePurchaseDraft: (id: string, data: any) => api(`/hospital/store/purchase-drafts/${encodeURIComponent(id)}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteStorePurchaseDraft: (id: string) => api(`/hospital/store/purchase-drafts/${encodeURIComponent(id)}`, { method: 'DELETE' }),
  approveStorePurchaseDraft: (id: string) => api(`/hospital/store/purchase-drafts/${encodeURIComponent(id)}/approve`, { method: 'POST' }),

  // -------------------------------------------------------------------------
  // Store Module - Issues
  // -------------------------------------------------------------------------
  listStoreIssues: (params?: { from?: string; to?: string; departmentId?: string; search?: string; page?: number; limit?: number }) =>
    api(withQuery('/hospital/store/issues', params)),
  createStoreIssue: (data: { date: string; departmentId: string; departmentName: string; issuedTo?: string; notes?: string; items: Array<{ itemId: string; itemName: string; quantity: number; unit: string; costPerUnit: number }>; totalAmount: number }) =>
    api('/hospital/store/issues', { method: 'POST', body: JSON.stringify(data) }),
  getStoreIssue: (id: string) => api(`/hospital/store/issues/${encodeURIComponent(id)}`),
  updateStoreIssue: (id: string, data: { date?: string; departmentId?: string; departmentName?: string; issuedTo?: string; notes?: string; items?: Array<{ itemId: string; itemName: string; quantity: number; unit: string; costPerUnit: number }>; totalAmount?: number }) =>
    api(`/hospital/store/issues/${encodeURIComponent(id)}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteStoreIssue: (id: string) => api(`/hospital/store/issues/${encodeURIComponent(id)}`, { method: 'DELETE' }),

  // -------------------------------------------------------------------------
  // Store Module - Reports & Departments
  // -------------------------------------------------------------------------
  getStoreReport: (reportType: string, params?: { from?: string; to?: string; departmentId?: string; supplierId?: string; page?: number; limit?: number; search?: string }) =>
    api(withQuery(`/hospital/store/reports/${encodeURIComponent(reportType)}`, params)),

  listStoreDepartments: () => api('/hospital/store/departments'),

  // -------------------------------------------------------------------------
  // Store Module - Held Purchases
  // -------------------------------------------------------------------------
  listStoreHeldPurchases: () => api('/hospital/store/held-purchases'),
  createStoreHeldPurchase: (data: { form: any; lines: any[]; totalAmount: number; notes?: string }) =>
    api('/hospital/store/held-purchases', { method: 'POST', body: JSON.stringify(data) }),
  getStoreHeldPurchase: (id: string) => api(`/hospital/store/held-purchases/${encodeURIComponent(id)}`),
  deleteStoreHeldPurchase: (id: string) => api(`/hospital/store/held-purchases/${encodeURIComponent(id)}`, { method: 'DELETE' }),
  restoreStoreHeldPurchase: (id: string) => api(`/hospital/store/held-purchases/${encodeURIComponent(id)}/restore`, { method: 'POST' }),

  // -------------------------------------------------------------------------
  // Store Module - Purchase Orders
  // -------------------------------------------------------------------------
  listStorePurchaseOrders: (params?: { q?: string; page?: number; limit?: number }) =>
    api(withQuery('/hospital/store/purchase-orders', params)),
  getStorePurchaseOrder: (id: string) => api(`/hospital/store/purchase-orders/${id}`),
  createStorePurchaseOrder: (data: any) => api('/hospital/store/purchase-orders', { method: 'POST', body: JSON.stringify(data) }),
  updateStorePurchaseOrder: (id: string, data: any) => api(`/hospital/store/purchase-orders/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  updateStorePurchaseOrderStatus: (id: string, status: string) => api(`/hospital/store/purchase-orders/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) }),
  deleteStorePurchaseOrder: (id: string) => api(`/hospital/store/purchase-orders/${id}`, { method: 'DELETE' }),
}

export default storeApi
