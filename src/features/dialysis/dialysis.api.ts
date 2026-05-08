/**
 * Dialysis API Module
 * 
 * Handles dialysis center operations:
 * - Auth, Settings
 * - Machines, Shifts, Session Types, Dialyzer Types
 * - Patients, Dialysis Patients Registry
 * - Tokens, Sessions, Appointments
 * - Dashboard
 */

import { api, withQuery } from '@/api'

export const dialysisApi = {
  // -------------------------------------------------------------------------
  // Auth
  // -------------------------------------------------------------------------
  login: async (username: string, password: string) => {
    const r: any = await api('/dialysis/login', { method: 'POST', body: JSON.stringify({ username, password }) })
    if (r?.token) {
      localStorage.setItem('dialysis.token', r.token)
      localStorage.setItem('dialysis.session', JSON.stringify({ username, role: r.role || 'admin' }))
    }
    return r
  },
  logout: async () => {
    try { localStorage.removeItem('dialysis.token') } catch { }
    try { localStorage.removeItem('dialysis.session') } catch { }
    return api('/dialysis/logout', { method: 'POST' })
  },

  // -------------------------------------------------------------------------
  // Settings
  // -------------------------------------------------------------------------
  getSettings: () => api('/dialysis/settings'),
  updateSettings: (data: any) => api('/dialysis/settings', { method: 'PUT', body: JSON.stringify(data) }),

  // -------------------------------------------------------------------------
  // Machines
  // -------------------------------------------------------------------------
  listMachines: () => api('/dialysis/machines'),
  createMachine: (data: any) => api('/dialysis/machines', { method: 'POST', body: JSON.stringify(data) }),
  updateMachine: (id: string, data: any) => api(`/dialysis/machines/${encodeURIComponent(id)}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteMachine: (id: string) => api(`/dialysis/machines/${encodeURIComponent(id)}`, { method: 'DELETE' }),

  // -------------------------------------------------------------------------
  // Shifts
  // -------------------------------------------------------------------------
  listShifts: () => api('/dialysis/shifts'),
  createShift: (data: any) => api('/dialysis/shifts', { method: 'POST', body: JSON.stringify(data) }),
  updateShift: (id: string, data: any) => api(`/dialysis/shifts/${encodeURIComponent(id)}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteShift: (id: string) => api(`/dialysis/shifts/${encodeURIComponent(id)}`, { method: 'DELETE' }),

  // -------------------------------------------------------------------------
  // Session Types
  // -------------------------------------------------------------------------
  listSessionTypes: () => api('/dialysis/session-types'),
  createSessionType: (data: any) => api('/dialysis/session-types', { method: 'POST', body: JSON.stringify(data) }),
  updateSessionType: (id: string, data: any) => api(`/dialysis/session-types/${encodeURIComponent(id)}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteSessionType: (id: string) => api(`/dialysis/session-types/${encodeURIComponent(id)}`, { method: 'DELETE' }),

  // -------------------------------------------------------------------------
  // Dialyzer Types
  // -------------------------------------------------------------------------
  listDialyzerTypes: () => api('/dialysis/dialyzer-types'),
  createDialyzerType: (data: any) => api('/dialysis/dialyzer-types', { method: 'POST', body: JSON.stringify(data) }),
  updateDialyzerType: (id: string, data: any) => api(`/dialysis/dialyzer-types/${encodeURIComponent(id)}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteDialyzerType: (id: string) => api(`/dialysis/dialyzer-types/${encodeURIComponent(id)}`, { method: 'DELETE' }),

  // -------------------------------------------------------------------------
  // Patients
  // -------------------------------------------------------------------------
  searchPatients: (params?: { phone?: string; name?: string; mrn?: string; limit?: number }) =>
    api(withQuery('/dialysis/patients/search', params)),
  getPatientByMrn: (mrn: string) => api(`/dialysis/patients/by-mrn?mrn=${encodeURIComponent(mrn)}`),
  findOrCreatePatient: (data: { fullName: string; phone?: string; cnic?: string; gender?: string; age?: string; guardianName?: string; guardianRel?: string; address?: string; selectId?: string; forceCreate?: boolean }) =>
    api('/dialysis/patients/find-or-create', { method: 'POST', body: JSON.stringify(data) }),
  updatePatient: (id: string, data: { fullName?: string; fatherName?: string; gender?: string; address?: string; phone?: string; cnic?: string }) =>
    api(`/dialysis/patients/${id}`, { method: 'PUT', body: JSON.stringify(data) }),

  // -------------------------------------------------------------------------
  // Dialysis Patients Registry
  // -------------------------------------------------------------------------
  listDialysisPatients: (params?: { q?: string; mrn?: string; page?: number; limit?: number }) =>
    api(withQuery('/dialysis/dialysis-patients', params)),
  getDialysisPatient: (id: string) => api(`/dialysis/dialysis-patients/${encodeURIComponent(id)}`),
  getDialysisPatientByLabPatient: (labPatientId: string) =>
    api(`/dialysis/dialysis-patients/by-lab-patient?labPatientId=${encodeURIComponent(labPatientId)}`),

  // -------------------------------------------------------------------------
  // Tokens
  // -------------------------------------------------------------------------
  listTokens: (params?: { date?: string; status?: string; patientName?: string; mrn?: string; page?: number; limit?: number }) =>
    api(withQuery('/dialysis/tokens', params)),
  createToken: (data: { patientId?: string; mrn?: string; patientName?: string; phone?: string; age?: string; gender?: string; sessionTypeId?: string; sessionTypeName?: string; shiftId?: string; shiftName?: string; machineId?: string; machineName?: string; dialyzerTypeId?: string; dialyzerTypeName?: string; duration?: number; notes?: string; fee?: number; discount?: number; paidMethod?: string }) =>
    api('/dialysis/tokens', { method: 'POST', body: JSON.stringify(data) }),
  getToken: (id: string) => api(`/dialysis/tokens/${id}`),
  getTokenByTokenNo: (tokenNo: string) => api(`/dialysis/tokens/by-token/${encodeURIComponent(tokenNo)}`),
  updateToken: (id: string, data: { sessionTypeId?: string; sessionTypeName?: string; shiftId?: string; shiftName?: string; machineId?: string; machineName?: string; dialyzerTypeId?: string; dialyzerTypeName?: string; duration?: number; notes?: string; fee?: number; discount?: number; status?: string }) =>
    api(`/dialysis/tokens/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteToken: (id: string) => api(`/dialysis/tokens/${id}`, { method: 'DELETE' }),

  // -------------------------------------------------------------------------
  // Sessions
  // -------------------------------------------------------------------------
  listSessions: (params?: { dialysisPatientId?: string; tokenId?: string; from?: string; to?: string; page?: number; limit?: number }) =>
    api(withQuery('/dialysis/sessions', params)),
  createSession: (data: any) => api('/dialysis/sessions', { method: 'POST', body: JSON.stringify(data) }),
  getSession: (id: string) => api(`/dialysis/sessions/${encodeURIComponent(id)}`),
  updateSession: (id: string, data: any) => api(`/dialysis/sessions/${encodeURIComponent(id)}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteSession: (id: string) => api(`/dialysis/sessions/${encodeURIComponent(id)}`, { method: 'DELETE' }),

  // -------------------------------------------------------------------------
  // Appointments
  // -------------------------------------------------------------------------
  listAppointments: (params?: { date?: string; status?: string; patientName?: string; phone?: string; from?: string; to?: string; page?: number; limit?: number }) =>
    api(withQuery('/dialysis/appointments', params)),
  createAppointment: (data: {
    labPatientId?: string
    mrn?: string
    patientName?: string
    phone?: string
    cnic?: string
    gender?: string
    age?: string
    guardianName?: string
    guardianRel?: string
    address?: string
    appointmentDate: string
    appointmentTime?: string
    sessionTypeId?: string
    sessionTypeName?: string
    shiftId?: string
    shiftName?: string
    machineId?: string
    machineName?: string
    dialyzerTypeId?: string
    dialyzerTypeName?: string
    duration?: number
    notes?: string
  }) => api('/dialysis/appointments', { method: 'POST', body: JSON.stringify(data) }),
  getAppointment: (id: string) => api(`/dialysis/appointments/${encodeURIComponent(id)}`),
  updateAppointment: (id: string, data: any) => api(`/dialysis/appointments/${encodeURIComponent(id)}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteAppointment: (id: string) => api(`/dialysis/appointments/${encodeURIComponent(id)}`, { method: 'DELETE' }),
  convertAppointmentToToken: (id: string, data?: { fee?: number; discount?: number; receivedAmount?: number; paidMethod?: string }) =>
    api(`/dialysis/appointments/${encodeURIComponent(id)}/convert-to-token`, { method: 'POST', body: JSON.stringify(data || {}) }),

  // -------------------------------------------------------------------------
  // Discharge
  // -------------------------------------------------------------------------
  dischargePatient: (dialysisPatientId: string, data?: { dischargeReason?: string; dischargeNotes?: string }) =>
    api(`/dialysis/dialysis-patients/${encodeURIComponent(dialysisPatientId)}/discharge`, { method: 'POST', body: JSON.stringify(data || {}) }),
  reactivatePatient: (dialysisPatientId: string) =>
    api(`/dialysis/dialysis-patients/${encodeURIComponent(dialysisPatientId)}/reactivate`, { method: 'POST' }),
  listDischargedPatients: (params?: { q?: string; page?: number; limit?: number }) =>
    api(withQuery('/dialysis/dialysis-patients/discharged', params)),
  getPatientHistory: (dialysisPatientId: string) =>
    api(`/dialysis/dialysis-patients/${encodeURIComponent(dialysisPatientId)}/history`),

  // -------------------------------------------------------------------------
  // Dashboard
  // -------------------------------------------------------------------------
  getDashboardStats: () => api('/dialysis/dashboard/stats'),
}

export default dialysisApi
