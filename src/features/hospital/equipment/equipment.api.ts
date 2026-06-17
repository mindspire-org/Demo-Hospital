/**
 * Equipment API Module
 * 
 * Handles Equipment Management operations:
 * - Equipment CRUD
 * - PPM (Planned Preventive Maintenance)
 * - Calibrations
 * - Breakdowns
 * - Condemnations
 * - KPIs
 */

import { api, withQuery } from '../../../api'
import { equipmentSupplierApi } from './api/equipmentSupplier.api'

export const equipmentApi = {
  ...equipmentSupplierApi,
  // -------------------------------------------------------------------------
  // Equipment
  // -------------------------------------------------------------------------
  listEquipment: (params?: { q?: string; category?: string; status?: 'Working' | 'UnderMaintenance' | 'NotWorking' | 'Condemned' | 'Spare'; departmentId?: string; from?: string; to?: string; page?: number; limit?: number }) =>
    api(withQuery('/hospital/equipment', params)),
  createEquipment: (data: any) => api('/hospital/equipment', { method: 'POST', body: JSON.stringify(data) }),
  updateEquipment: (id: string, data: any) => api(`/hospital/equipment/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteEquipment: (id: string) => api(`/hospital/equipment/${id}`, { method: 'DELETE' }),

  listDepartments: (params?: { limit?: number }) => api(withQuery('/hospital/departments', params)),

  // -------------------------------------------------------------------------
  // Equipment Maintenance (Unified: PPM, Calib, Repair)
  // -------------------------------------------------------------------------
  listMaintenance: (params?: { equipmentId?: string; type?: string; page?: number; limit?: number }) =>
    api(withQuery('/hospital/equipment/maintenance', params)),
    
  createMaintenance: (data: any) => 
    api('/hospital/equipment/maintenance', { method: 'POST', body: JSON.stringify(data) }),

  // -------------------------------------------------------------------------
  // Legacy Aliases (pointing to new endpoints for compatibility)
  // -------------------------------------------------------------------------
  listEquipmentPPM: (params: any) => equipmentApi.listMaintenance({ ...params, type: 'PPM' }),
  createEquipmentPPM: (data: any) => equipmentApi.createMaintenance({ ...data, type: 'PPM' }),
  listEquipmentCalibrations: (params: any) => equipmentApi.listMaintenance({ ...params, type: 'Calibration' }),
  createEquipmentCalibration: (data: any) => equipmentApi.createMaintenance({ ...data, type: 'Calibration' }),

  // -------------------------------------------------------------------------
  // Equipment Due Lists
  // -------------------------------------------------------------------------
  listEquipmentDuePPM: (params?: { from?: string; to?: string }) =>
    api(withQuery('/hospital/equipment/due/ppm', params)),
  listEquipmentDueCalibration: (params?: { from?: string; to?: string }) =>
    api(withQuery('/hospital/equipment/due/calibration', params)),

  // -------------------------------------------------------------------------
  // Equipment Breakdowns
  // -------------------------------------------------------------------------
  listEquipmentBreakdowns: (params?: { equipmentId?: string; status?: 'Open' | 'Closed'; from?: string; to?: string; page?: number; limit?: number }) =>
    api(withQuery('/hospital/equipment/breakdowns', params)),
  createEquipmentBreakdown: (data: { equipmentId: string; reportedAt: string; restoredAt?: string; description?: string; rootCause?: string; correctiveAction?: string; vendorId?: string; severity?: 'low' | 'medium' | 'high'; status?: 'Open' | 'Closed'; cost?: number }) =>
    api('/hospital/equipment/breakdowns', { method: 'POST', body: JSON.stringify(data) }),
  updateEquipmentBreakdown: (id: string, data: Partial<{ reportedAt: string; restoredAt?: string; description?: string; rootCause?: string; correctiveAction?: string; vendorId?: string; severity?: 'low' | 'medium' | 'high'; status?: 'Open' | 'Closed'; cost?: number }>) =>
    api(`/hospital/equipment/breakdowns/${encodeURIComponent(id)}`, { method: 'PUT', body: JSON.stringify(data) }),

  // -------------------------------------------------------------------------
  // Equipment Condemnations
  // -------------------------------------------------------------------------
  listEquipmentCondemnations: (params?: { equipmentId?: string; status?: 'Proposed' | 'Approved' | 'Disposed'; from?: string; to?: string; page?: number; limit?: number }) =>
    api(withQuery('/hospital/equipment/condemnations', params)),
  createEquipmentCondemnation: (data: { equipmentId: string; proposedAt?: string; reason?: string; approvedBy?: string; approvedAt?: string; status?: 'Proposed' | 'Approved' | 'Disposed'; disposalMethod?: string; disposalDate?: string; notes?: string }) =>
    api('/hospital/equipment/condemnations', { method: 'POST', body: JSON.stringify(data) }),
  updateEquipmentCondemnation: (id: string, data: Partial<{ proposedAt?: string; reason?: string; approvedBy?: string; approvedAt?: string; status?: 'Proposed' | 'Approved' | 'Disposed'; disposalMethod?: string; disposalDate?: string; notes?: string }>) =>
    api(`/hospital/equipment/condemnations/${encodeURIComponent(id)}`, { method: 'PUT', body: JSON.stringify(data) }),

  // -------------------------------------------------------------------------
  // Equipment KPIs
  // -------------------------------------------------------------------------
  equipmentKpis: (params?: { from?: string; to?: string }) =>
    api(withQuery('/hospital/equipment/kpis', params)),

  // -------------------------------------------------------------------------
  // Equipment Purchases
  // -------------------------------------------------------------------------
  listPurchases: (params?: { equipmentId?: string; supplierId?: string; page?: number; limit?: number }) =>
    api(withQuery('/hospital/equipment/purchases', params)),
}

export default equipmentApi
