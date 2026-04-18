import { api, withQuery } from '@/api'

export const equipmentSupplierApi = {
  list: (params?: { q?: string; type?: string; status?: string; page?: number; limit?: number }) =>
    api(withQuery('/hospital/equipment/suppliers', params)),
    
  create: (data: any) => 
    api('/hospital/equipment/suppliers', { method: 'POST', body: JSON.stringify(data) }),
    
  update: (id: string, data: any) => 
    api(`/hospital/equipment/suppliers/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    
  getStats: () => 
    api('/hospital/equipment/suppliers/stats'),
    
  getLedger: (id: string) => 
    api(`/hospital/equipment/suppliers/${id}/ledger`),
  getFullLedger: (id: string) => 
    api(`/hospital/equipment/suppliers/${id}/ledger`),
  addPayment: (id: string, data: any) => 
    api(`/hospital/equipment/suppliers/${id}/payments`, { method: 'POST', body: JSON.stringify(data) }),
  deleteSupplier: (id: string) =>
    api(`/hospital/equipment/suppliers/${id}`, { method: 'DELETE' })
}
