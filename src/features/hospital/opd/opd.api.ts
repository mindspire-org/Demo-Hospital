/**
 * OPD (Outpatient Department) API Module
 * 
 * Handles OPD operations:
 * - Tokens, Encounters
 * - Appointments
 * - Prescriptions, Prescription Templates
 * - Referrals
 */

import { api, withQuery } from '@/api'

export const opdApi = {
  // -------------------------------------------------------------------------
  // OPD
  // -------------------------------------------------------------------------
  quoteOPDPrice: (params: { departmentId: string; doctorId?: string; visitType?: 'new' | 'followup'; corporateId?: string; visitCategory?: 'general' | 'private' }) =>
    api('/hospital/tokens/quote-opd-price', { method: 'POST', body: JSON.stringify(params) }),
  createOPDEncounter: (data: { patientId: string; departmentId: string; doctorId?: string; visitType: 'new' | 'followup'; paymentRef?: string }) =>
    api('/hospital/opd/encounters', { method: 'POST', body: JSON.stringify(data) }),

  // -------------------------------------------------------------------------
  // Tokens (OPD)
  // -------------------------------------------------------------------------
  createOpdToken: (data: any) => api('/hospital/tokens/opd', { method: 'POST', body: JSON.stringify(data) }),
  getToken: (id: string) => api(`/hospital/tokens/${id}`),
  listTokens: (params?: { date?: string; from?: string; to?: string; status?: 'queued' | 'in-progress' | 'completed' | 'returned' | 'cancelled'; doctorId?: string; departmentId?: string; scheduleId?: string; page?: number; limit?: number }) =>
    api(withQuery('/hospital/tokens', params)),
  updateTokenStatus: (id: string, status: 'queued' | 'in-progress' | 'completed' | 'returned' | 'cancelled') =>
    api(`/hospital/tokens/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) }),
  updateToken: (id: string, data: { discount?: number; doctorId?: string; departmentId?: string; patientId?: string; mrn?: string; patientName?: string; phone?: string; gender?: string; guardianRel?: string; guardianName?: string; cnic?: string; address?: string; age?: string; overrideFee?: number }) =>
    api(`/hospital/tokens/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteToken: (id: string) => api(`/hospital/tokens/${id}`, { method: 'DELETE' }),

  // -------------------------------------------------------------------------
  // Appointments
  // -------------------------------------------------------------------------
  listAppointments: (params?: { date?: string; doctorId?: string; scheduleId?: string; status?: 'booked' | 'confirmed' | 'checked-in' | 'cancelled' | 'no-show'; page?: number; limit?: number }) =>
    api(withQuery('/hospital/appointments', params)),
  createAppointment: (data: { doctorId: string; departmentId?: string; scheduleId: string; apptStart?: string; slotNo?: number; patientId?: string; mrn?: string; patientName?: string; phone?: string; gender?: string; age?: string; notes?: string }) =>
    api('/hospital/appointments', { method: 'POST', body: JSON.stringify(data) }),
  updateAppointment: (id: string, data: { doctorId?: string; scheduleId?: string; apptStart?: string; slotNo?: number; patientName?: string; phone?: string; gender?: string; age?: string; notes?: string }) =>
    api(`/hospital/appointments/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  updateAppointmentStatus: (id: string, status: 'booked' | 'confirmed' | 'checked-in' | 'cancelled' | 'no-show') =>
    api(`/hospital/appointments/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) }),
  deleteAppointment: (id: string) => api(`/hospital/appointments/${id}`, { method: 'DELETE' }),
  convertAppointmentToToken: (id: string) => api(`/hospital/appointments/${id}/convert-to-token`, { method: 'POST' }),

  // -------------------------------------------------------------------------
  // Prescriptions
  // -------------------------------------------------------------------------
  createPrescription: (data: { encounterId: string; prescriptionMode?: 'electronic' | 'manual'; manualAttachment?: { mimeType?: string; fileName?: string; dataUrl?: string; uploadedAt?: string }; items?: Array<{ name: string; dose?: string; frequency?: string; duration?: string; notes?: string }>; labTests?: string[]; labNotes?: string; diagnosticTest?: string[]; diagnosticNotes?: string; primaryComplaint?: string; primaryComplaintHistory?: string; familyHistory?: string; treatmentHistory?: string; allergyHistory?: string; history?: string; examFindings?: string; diagnosis?: string; advice?: string; createdBy?: string; vitals?: { pulse?: number; temperatureC?: number; bloodPressureSys?: number; bloodPressureDia?: number; respiratoryRate?: number; bloodSugar?: number; weightKg?: number; heightCm?: number; bmi?: number; bsa?: number; spo2?: number } }) =>
    api('/hospital/opd/prescriptions', { method: 'POST', body: JSON.stringify(data) }),
  listPrescriptions: (params?: { doctorId?: string; patientMrn?: string; from?: string; to?: string; page?: number; limit?: number }) =>
    api(withQuery('/hospital/opd/prescriptions', params)),
  getPrescription: (id: string) => api(`/hospital/opd/prescriptions/${id}`),
  updatePrescription: (id: string, data: { prescriptionMode?: 'electronic' | 'manual'; manualAttachment?: { mimeType?: string; fileName?: string; dataUrl?: string; uploadedAt?: string }; items?: Array<{ name: string; dose?: string; frequency?: string; duration?: string; notes?: string }>; labTests?: string[]; labNotes?: string; diagnosticTest?: string[]; diagnosticNotes?: string; primaryComplaint?: string; primaryComplaintHistory?: string; familyHistory?: string; treatmentHistory?: string; allergyHistory?: string; history?: string; examFindings?: string; diagnosis?: string; advice?: string; vitals?: { pulse?: number; temperatureC?: number; bloodPressureSys?: number; bloodPressureDia?: number; respiratoryRate?: number; bloodSugar?: number; weightKg?: number; heightCm?: number; bmi?: number; bsa?: number; spo2?: number } }) =>
    api(`/hospital/opd/prescriptions/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deletePrescription: (id: string) => api(`/hospital/opd/prescriptions/${id}`, { method: 'DELETE' }),
  getPrescriptionByEncounterId: (encounterId: string) => api(`/hospital/opd/prescriptions/encounter/${encodeURIComponent(encounterId)}`),
  upsertPrescriptionVitals: (encounterId: string, vitals: { pulse?: number; temperatureC?: number; bloodPressureSys?: number; bloodPressureDia?: number; respiratoryRate?: number; bloodSugar?: number; weightKg?: number; heightCm?: number; bmi?: number; bsa?: number; spo2?: number }) =>
    api(`/hospital/opd/prescriptions/encounter/${encodeURIComponent(encounterId)}/vitals`, { method: 'PUT', body: JSON.stringify({ vitals }) }),

  // -------------------------------------------------------------------------
  // Prescription Templates
  // -------------------------------------------------------------------------
  getPrescriptionTemplatesByDoctor: (doctorId: string) =>
    api(`/hospital/prescription-templates/doctor/${encodeURIComponent(doctorId)}`),
  listPrescriptionTemplates: (params?: { doctorId?: string; search?: string; page?: number; limit?: number }) =>
    api(withQuery('/hospital/prescription-templates', params)),
  getPrescriptionTemplate: (id: string) => api(`/hospital/prescription-templates/${id}`),
  createPrescriptionTemplate: (data: { doctorId?: string; name: string; primaryComplaint?: string; primaryComplaintHistory?: string; familyHistory?: string; treatmentHistory?: string; allergyHistory?: string; history?: string; examFindings?: string; diagnosis?: string; advice?: string; items?: any[]; labTests?: string[]; labNotes?: string; diagnosticTests?: string[]; diagnosticNotes?: string }) =>
    api('/hospital/prescription-templates', { method: 'POST', body: JSON.stringify(data) }),
  updatePrescriptionTemplate: (id: string, data: { name?: string; primaryComplaint?: string; primaryComplaintHistory?: string; familyHistory?: string; treatmentHistory?: string; allergyHistory?: string; history?: string; examFindings?: string; diagnosis?: string; advice?: string; items?: any[]; labTests?: string[]; labNotes?: string; diagnosticTests?: string[]; diagnosticNotes?: string }) =>
    api(`/hospital/prescription-templates/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deletePrescriptionTemplate: (id: string) => api(`/hospital/prescription-templates/${id}`, { method: 'DELETE' }),

  // -------------------------------------------------------------------------
  // OPD Referrals
  // -------------------------------------------------------------------------
  createReferral: (data: { type: 'lab' | 'pharmacy' | 'diagnostic'; encounterId: string; doctorId: string; prescriptionId?: string; tests?: string[]; notes?: string }) =>
    api('/hospital/opd/referrals', { method: 'POST', body: JSON.stringify(data) }),
  listReferrals: (params?: { type?: 'lab' | 'pharmacy' | 'diagnostic'; status?: 'pending' | 'completed' | 'cancelled'; doctorId?: string; from?: string; to?: string; page?: number; limit?: number }) =>
    api(withQuery('/hospital/opd/referrals', params)),
  updateReferralStatus: (id: string, status: 'pending' | 'completed' | 'cancelled') =>
    api(`/hospital/opd/referrals/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) }),
  linkReferral: (id: string, data: { tokenNo?: string; linkedOrderId?: string }) =>
    api(`/hospital/opd/referrals/${id}/link`, { method: 'PATCH', body: JSON.stringify(data) }),
  updateReferralReportStatus: (id: string, reportStatus: 'pending' | 'result_entered' | 'approved' | 'final') =>
    api(`/hospital/opd/referrals/${id}/report-status`, { method: 'PATCH', body: JSON.stringify({ reportStatus }) }),
  deleteReferral: (id: string) => api(`/hospital/opd/referrals/${id}`, { method: 'DELETE' }),
}

export default opdApi
