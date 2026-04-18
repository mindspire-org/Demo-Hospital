/**
 * Ambulance API Module
 * 
 * Handles Ambulance operations:
 * - Master (Vehicle Management)
 * - Trips, Fuel, Expenses
 * - Reports
 */

import { api, withQuery } from '@/api'

export const ambulanceApi = {
  // -------------------------------------------------------------------------
  // Ambulance Dashboard
  // -------------------------------------------------------------------------
  ambulanceDashboard: () => api('/hospital/ambulance/dashboard'),

  // -------------------------------------------------------------------------
  // Ambulance Master (Vehicle Management)
  // -------------------------------------------------------------------------
  listAmbulances: (params?: { status?: string; search?: string; page?: number; limit?: number }) =>
    api(withQuery('/hospital/ambulance/master', params)),
  createAmbulance: (data: { vehicleNumber: string; type: 'BLS' | 'ALS' | 'Patient Transport' | 'Neonatal'; driverName: string; driverContact: string; status?: 'Available' | 'On Duty' | 'Maintenance'; notes?: string }) =>
    api('/hospital/ambulance/master', { method: 'POST', body: JSON.stringify(data) }),
  updateAmbulance: (id: string, data: { vehicleNumber?: string; type?: 'BLS' | 'ALS' | 'Patient Transport' | 'Neonatal'; driverName?: string; driverContact?: string; status?: 'Available' | 'On Duty' | 'Maintenance'; notes?: string }) =>
    api(`/hospital/ambulance/master/${encodeURIComponent(id)}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteAmbulance: (id: string) => api(`/hospital/ambulance/master/${encodeURIComponent(id)}`, { method: 'DELETE' }),
  getAmbulance: (id: string) => api(`/hospital/ambulance/master/${encodeURIComponent(id)}`),

  // -------------------------------------------------------------------------
  // Ambulance Trips
  // -------------------------------------------------------------------------
  listAmbulanceTrips: (params?: { ambulanceId?: string; from?: string; to?: string; status?: string; search?: string; page?: number; limit?: number }) =>
    api(withQuery('/hospital/ambulance/trips', params)),
  createAmbulanceTrip: (data: { ambulanceId: string; patientName?: string; patientId?: string; pickupLocation: string; destination: string; purpose: 'Emergency Pickup' | 'Transfer' | 'Discharge' | 'Home Collection' | 'Other'; departureTime: string; odometerStart: number; driverName?: string; notes?: string }) =>
    api('/hospital/ambulance/trips', { method: 'POST', body: JSON.stringify(data) }),
  updateAmbulanceTrip: (id: string, data: { patientName?: string; patientId?: string; pickupLocation?: string; destination?: string; purpose?: 'Emergency Pickup' | 'Transfer' | 'Discharge' | 'Home Collection' | 'Other'; departureTime?: string; odometerStart?: number; returnTime?: string; odometerEnd?: number; distanceTraveled?: number; status?: 'In Progress' | 'Completed' | 'Cancelled'; notes?: string }) =>
    api(`/hospital/ambulance/trips/${encodeURIComponent(id)}`, { method: 'PUT', body: JSON.stringify(data) }),
  completeAmbulanceTrip: (id: string, data: { returnTime: string; odometerEnd: number }) =>
    api(`/hospital/ambulance/trips/${encodeURIComponent(id)}/complete`, { method: 'POST', body: JSON.stringify(data) }),
  getAmbulanceTrip: (id: string) => api(`/hospital/ambulance/trips/${encodeURIComponent(id)}`),
  deleteAmbulanceTrip: (id: string) => api(`/hospital/ambulance/trips/${encodeURIComponent(id)}`, { method: 'DELETE' }),

  // -------------------------------------------------------------------------
  // Ambulance Fuel
  // -------------------------------------------------------------------------
  listAmbulanceFuel: (params?: { ambulanceId?: string; from?: string; to?: string; search?: string; page?: number; limit?: number }) =>
    api(withQuery('/hospital/ambulance/fuel', params)),
  createAmbulanceFuel: (data: { ambulanceId: string; date: string; quantity: number; cost: number; station?: string; odometer: number; receiptNo?: string; notes?: string }) =>
    api('/hospital/ambulance/fuel', { method: 'POST', body: JSON.stringify(data) }),
  updateAmbulanceFuel: (id: string, data: { date?: string; quantity?: number; cost?: number; station?: string; odometer?: number; receiptNo?: string; notes?: string }) =>
    api(`/hospital/ambulance/fuel/${encodeURIComponent(id)}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteAmbulanceFuel: (id: string) => api(`/hospital/ambulance/fuel/${encodeURIComponent(id)}`, { method: 'DELETE' }),

  // -------------------------------------------------------------------------
  // Ambulance Expenses
  // -------------------------------------------------------------------------
  listAmbulanceExpenses: (params?: { ambulanceId?: string; category?: string; from?: string; to?: string; search?: string; page?: number; limit?: number }) =>
    api(withQuery('/hospital/ambulance/expenses', params)),
  createAmbulanceExpense: (data: { ambulanceId: string; category: 'Fuel' | 'Maintenance' | 'Repairs' | 'Driver Allowance' | 'Insurance' | 'Registration' | 'Other'; amount: number; date: string; description?: string; receiptNo?: string }) =>
    api('/hospital/ambulance/expenses', { method: 'POST', body: JSON.stringify(data) }),
  updateAmbulanceExpense: (id: string, data: { category?: 'Fuel' | 'Maintenance' | 'Repairs' | 'Driver Allowance' | 'Insurance' | 'Registration' | 'Other'; amount?: number; date?: string; description?: string; receiptNo?: string }) =>
    api(`/hospital/ambulance/expenses/${encodeURIComponent(id)}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteAmbulanceExpense: (id: string) => api(`/hospital/ambulance/expenses/${encodeURIComponent(id)}`, { method: 'DELETE' }),

  // -------------------------------------------------------------------------
  // Ambulance Reports
  // -------------------------------------------------------------------------
  getAmbulanceReport: (reportType: 'usage' | 'trips' | 'fuel' | 'expenses' | 'cost-per-km' | 'patient-transport', params?: { from?: string; to?: string; ambulanceId?: string; page?: number; limit?: number }) =>
    api(withQuery(`/hospital/ambulance/reports/${encodeURIComponent(reportType)}`, params)),
}

export default ambulanceApi
