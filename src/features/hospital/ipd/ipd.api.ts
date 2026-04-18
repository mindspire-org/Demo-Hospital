/**
 * IPD (Inpatient Department) API Module
 * 
 * Handles IPD operations:
 * - Admissions, Discharge
 * - Vitals, Notes, Clinical Notes
 * - Doctor Visits, Med Orders, MAR
 * - Lab Links, Billing, Payments
 * - Referrals, Discharge Documents
 */

import { api, withQuery } from '@/api'

export const ipdApi = {
  // -------------------------------------------------------------------------
  // IPD Admissions
  // -------------------------------------------------------------------------
  admitIPD: (data: { patientId: string; departmentId: string; doctorId?: string; wardId?: string; bedId?: string; deposit?: number }) =>
    api('/hospital/ipd/admissions', { method: 'POST', body: JSON.stringify(data) }),
  dischargeIPD: (id: string, data?: { dischargeSummary?: string; endAt?: string }) =>
    api(`/hospital/ipd/admissions/${id}/discharge`, { method: 'PATCH', body: JSON.stringify(data || {}) }),
  listIPDAdmissions: (params?: { status?: 'admitted' | 'discharged'; doctorId?: string; departmentId?: string; patientId?: string; from?: string; to?: string; q?: string; page?: number; limit?: number }) =>
    api(withQuery('/hospital/ipd/admissions', params)),
  transferIPDBed: (id: string, data: { newBedId: string }) =>
    api(`/hospital/ipd/admissions/${id}/transfer-bed`, { method: 'PATCH', body: JSON.stringify(data) }),
  admitFromOpdToken: (data: { tokenId: string; bedId?: string; deposit?: number; departmentId?: string; doctorId?: string; markTokenCompleted?: boolean }) =>
    api('/hospital/ipd/admissions/from-token', { method: 'POST', body: JSON.stringify(data) }),
  getIPDAdmissionById: (id: string) => api(`/hospital/ipd/admissions/${id}`),

  // -------------------------------------------------------------------------
  // IPD Services Catalog
  // -------------------------------------------------------------------------
  listIpdServices: (params?: { q?: string; category?: string; active?: boolean; page?: number; limit?: number }) =>
    api(withQuery('/hospital/ipd/services', params)),
  createIpdService: (data: { name: string; category?: string; price?: number; active?: boolean }) =>
    api('/hospital/ipd/services', { method: 'POST', body: JSON.stringify(data) }),
  updateIpdService: (id: string, data: { name?: string; category?: string; price?: number; active?: boolean }) =>
    api(`/hospital/ipd/services/${encodeURIComponent(id)}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteIpdService: (id: string) => api(`/hospital/ipd/services/${encodeURIComponent(id)}`, { method: 'DELETE' }),

  // -------------------------------------------------------------------------
  // IPD Referrals
  // -------------------------------------------------------------------------
  listIpdReferrals: (params?: { status?: 'New' | 'Accepted' | 'Rejected' | 'Admitted'; q?: string; from?: string; to?: string; departmentId?: string; doctorId?: string; referredByDoctorId?: string; page?: number; limit?: number }) =>
    api(withQuery('/hospital/ipd/referrals', params)),
  createIpdReferral: (data: { patientId: string; referralDate?: string; referralTime?: string; reasonOfReferral?: string; provisionalDiagnosis?: string; vitals?: { bp?: string; pulse?: number; temperature?: number; rr?: number }; referredTo?: { departmentId?: string; doctorId?: string }; condition?: { stability?: 'Stable' | 'Unstable'; consciousness?: 'Conscious' | 'Unconscious' }; remarks?: string; signStamp?: string }) =>
    api('/hospital/ipd/referrals', { method: 'POST', body: JSON.stringify(data) }),
  getIpdReferralById: (id: string) => api(`/hospital/ipd/referrals/${id}`),
  updateIpdReferral: (id: string, data: any) => api(`/hospital/ipd/referrals/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  updateIpdReferralStatus: (id: string, action: 'accept' | 'reject' | 'reopen', note?: string) =>
    api(`/hospital/ipd/referrals/${id}/status`, { method: 'PATCH', body: JSON.stringify({ action, note }) }),
  admitFromReferral: (id: string, data: { departmentId: string; doctorId?: string; wardId?: string; bedId?: string; deposit?: number; tokenFee?: number }) =>
    api(`/hospital/ipd/referrals/${id}/admit`, { method: 'POST', body: JSON.stringify(data) }),

  // -------------------------------------------------------------------------
  // IPD Discharge Documents
  // -------------------------------------------------------------------------
  getIpdDischargeSummary: (encounterId: string) =>
    api(`/hospital/ipd/admissions/${encodeURIComponent(encounterId)}/discharge-summary`),
  upsertIpdDischargeSummary: (encounterId: string, data: { diagnosis?: string; courseInHospital?: string; procedures?: string[]; conditionAtDischarge?: string; medications?: string[]; advice?: string; followUpDate?: string; notes?: string; createdBy?: string }) =>
    api(`/hospital/ipd/admissions/${encodeURIComponent(encounterId)}/discharge-summary`, { method: 'PUT', body: JSON.stringify(data) }),
  getIpdDeathCertificate: (encounterId: string) =>
    api(`/hospital/ipd/admissions/${encodeURIComponent(encounterId)}/death-certificate`),
  upsertIpdDeathCertificate: (encounterId: string, data: {
    dateOfDeath?: string; timeOfDeath?: string; causeOfDeath?: string; placeOfDeath?: string; notes?: string; createdBy?: string;
    dcNo?: string; mrNumber?: string; relative?: string; ageSex?: string; address?: string;
    presentingComplaints?: string; diagnosis?: string; primaryCause?: string; secondaryCause?: string;
    receiverName?: string; receiverRelation?: string; receiverIdCard?: string; receiverDate?: string; receiverTime?: string;
    staffName?: string; staffSignDate?: string; staffSignTime?: string; doctorName?: string; doctorSignDate?: string; doctorSignTime?: string;
  }) => api(`/hospital/ipd/admissions/${encodeURIComponent(encounterId)}/death-certificate`, { method: 'PUT', body: JSON.stringify(data) }),
  getIpdBirthCertificate: (encounterId: string) =>
    api(`/hospital/ipd/admissions/${encodeURIComponent(encounterId)}/birth-certificate`),
  upsertIpdBirthCertificate: (encounterId: string, data: any) =>
    api(`/hospital/ipd/admissions/${encodeURIComponent(encounterId)}/birth-certificate`, { method: 'PUT', body: JSON.stringify(data) }),
  createBirthCertificate: (data: any) =>
    api(`/hospital/ipd/forms/birth-certificates`, { method: 'POST', body: JSON.stringify(data) }),
  getBirthCertificateById: (id: string) =>
    api(`/hospital/ipd/forms/birth-certificates/${encodeURIComponent(id)}`),
  updateBirthCertificateById: (id: string, data: any) =>
    api(`/hospital/ipd/forms/birth-certificates/${encodeURIComponent(id)}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteBirthCertificateById: (id: string) =>
    api(`/hospital/ipd/forms/birth-certificates/${encodeURIComponent(id)}`, { method: 'DELETE' }),
  getIpdReceivedDeath: (encounterId: string) =>
    api(`/hospital/ipd/admissions/${encodeURIComponent(encounterId)}/received-death`),
  upsertIpdReceivedDeath: (encounterId: string, data: {
    srNo?: string; patientCnic?: string; relative?: string; ageSex?: string;
    emergencyReportedDate?: string; emergencyReportedTime?: string;
    receiving?: { pulse?: string; bloodPressure?: string; respiratoryRate?: string; pupils?: string; cornealReflex?: string; ecg?: string };
    diagnosis?: string; attendantName?: string; attendantRelative?: string; attendantRelation?: string; attendantAddress?: string; attendantCnic?: string;
    deathDeclaredBy?: string; chargeNurseName?: string; doctorName?: string; createdBy?: string;
  }) => api(`/hospital/ipd/admissions/${encodeURIComponent(encounterId)}/received-death`, { method: 'PUT', body: JSON.stringify(data) }),
  getIpdShortStay: (encounterId: string) =>
    api(`/hospital/ipd/admissions/${encodeURIComponent(encounterId)}/short-stay`),
  upsertIpdShortStay: (encounterId: string, data: { admittedAt?: string; dischargedAt?: string; data?: any; notes?: string; createdBy?: string }) =>
    api(`/hospital/ipd/admissions/${encodeURIComponent(encounterId)}/short-stay`, { method: 'PUT', body: JSON.stringify(data) }),
  getIpdFinalInvoice: (encounterId: string) =>
    api(`/hospital/ipd/admissions/${encodeURIComponent(encounterId)}/final-invoice`),

  // -------------------------------------------------------------------------
  // IPD Forms Lists
  // -------------------------------------------------------------------------
  listIpdReceivedDeaths: (params?: { q?: string; from?: string; to?: string; page?: number; limit?: number; encounterType?: string }) =>
    api(withQuery('/hospital/ipd/forms/received-deaths', params)),
  listIpdDeathCertificates: (params?: { q?: string; from?: string; to?: string; page?: number; limit?: number; encounterType?: string }) =>
    api(withQuery('/hospital/ipd/forms/death-certificates', params)),
  listIpdBirthCertificates: (params?: { q?: string; from?: string; to?: string; page?: number; limit?: number }) =>
    api(withQuery('/hospital/ipd/forms/birth-certificates', params)),
  listIpdShortStays: (params?: { q?: string; from?: string; to?: string; page?: number; limit?: number; encounterType?: string }) =>
    api(withQuery('/hospital/ipd/forms/short-stays', params)),
  listIpdDischargeSummaries: (params?: { q?: string; from?: string; to?: string; page?: number; limit?: number; encounterType?: string }) =>
    api(withQuery('/hospital/ipd/forms/discharge-summaries', params)),

  // -------------------------------------------------------------------------
  // IPD Forms Deletes
  // -------------------------------------------------------------------------
  deleteIpdReceivedDeath: (encounterId: string) => api(`/hospital/ipd/admissions/${encodeURIComponent(encounterId)}/received-death`, { method: 'DELETE' }),
  deleteIpdDeathCertificate: (encounterId: string) => api(`/hospital/ipd/admissions/${encodeURIComponent(encounterId)}/death-certificate`, { method: 'DELETE' }),
  deleteIpdBirthCertificate: (encounterId: string) => api(`/hospital/ipd/admissions/${encodeURIComponent(encounterId)}/birth-certificate`, { method: 'DELETE' }),
  deleteIpdShortStay: (encounterId: string) => api(`/hospital/ipd/admissions/${encodeURIComponent(encounterId)}/short-stay`, { method: 'DELETE' }),
  deleteIpdDischargeSummary: (encounterId: string) => api(`/hospital/ipd/admissions/${encodeURIComponent(encounterId)}/discharge-summary`, { method: 'DELETE' }),

  // -------------------------------------------------------------------------
  // IPD Records: Vitals, Notes, Clinical Notes
  // -------------------------------------------------------------------------
  listIpdVitals: (encounterId: string, params?: { page?: number; limit?: number }) =>
    api(withQuery(`/hospital/ipd/admissions/${encounterId}/vitals`, params)),
  createIpdVital: (encounterId: string, data: { recordedAt?: string; bp?: string; hr?: number; rr?: number; temp?: number; spo2?: number; height?: number; weight?: number; painScale?: number; recordedBy?: string; note?: string; shift?: 'morning' | 'evening' | 'night'; bsr?: number; intakeIV?: string; urine?: string; nurseSign?: string }) =>
    api(`/hospital/ipd/admissions/${encounterId}/vitals`, { method: 'POST', body: JSON.stringify(data) }),

  listIpdNotes: (encounterId: string, params?: { page?: number; limit?: number }) =>
    api(withQuery(`/hospital/ipd/admissions/${encounterId}/notes`, params)),
  createIpdNote: (encounterId: string, data: { noteType: 'nursing' | 'progress' | 'discharge'; text: string; attachments?: string[]; createdBy?: string }) =>
    api(`/hospital/ipd/admissions/${encounterId}/notes`, { method: 'POST', body: JSON.stringify(data) }),

  listIpdClinicalNotes: (encounterId: string, params?: { type?: 'preop' | 'operation' | 'postop' | 'consultant' | 'anes-pre' | 'anes-intra' | 'anes-recovery' | 'anes-post-recovery' | 'anes-adverse' | 'consent-form' | 'infection-control' | 'blood-transfusion' | 'operation-consent' | 'history-exam' | 'surgical-signin' | 'surgical-timeout' | 'surgical-signout'; page?: number; limit?: number }) =>
    api(withQuery(`/hospital/ipd/admissions/${encounterId}/clinical-notes`, params)),
  createIpdClinicalNote: (encounterId: string, data: { type: 'preop' | 'operation' | 'postop' | 'consultant' | 'anes-pre' | 'anes-intra' | 'anes-recovery' | 'anes-post-recovery' | 'anes-adverse' | 'consent-form' | 'infection-control' | 'blood-transfusion' | 'operation-consent' | 'history-exam' | 'surgical-signin' | 'surgical-timeout' | 'surgical-signout'; recordedAt?: string; createdBy?: string; createdByRole?: string; doctorName?: string; sign?: string; data: any }) =>
    api(`/hospital/ipd/admissions/${encounterId}/clinical-notes`, { method: 'POST', body: JSON.stringify(data) }),
  updateIpdClinicalNote: (id: string, data: any) =>
    api(`/hospital/ipd/clinical-notes/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteIpdClinicalNote: (id: string) =>
    api(`/hospital/ipd/clinical-notes/${id}`, { method: 'DELETE' }),

  // -------------------------------------------------------------------------
  // IPD Records: Doctor Visits
  // -------------------------------------------------------------------------
  listIpdDoctorVisits: (encounterId: string, params?: { page?: number; limit?: number; category?: 'visit' | 'progress' }) =>
    api(withQuery(`/hospital/ipd/admissions/${encounterId}/doctor-visits`, params)),
  createIpdDoctorVisit: (encounterId: string, data: { doctorId?: string; when?: string; category?: 'visit' | 'progress'; subjective?: string; objective?: string; assessment?: string; plan?: string; diagnosisCodes?: string[]; nextReviewAt?: string }) =>
    api(`/hospital/ipd/admissions/${encounterId}/doctor-visits`, { method: 'POST', body: JSON.stringify(data) }),
  updateIpdDoctorVisit: (id: string, data: { doctorId?: string; when?: string; category?: 'visit' | 'progress'; subjective?: string; objective?: string; assessment?: string; plan?: string; diagnosisCodes?: string[]; nextReviewAt?: string; done?: boolean }) =>
    api(`/hospital/ipd/doctor-visits/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteIpdDoctorVisit: (id: string) =>
    api(`/hospital/ipd/doctor-visits/${id}`, { method: 'DELETE' }),

  // -------------------------------------------------------------------------
  // IPD Records: Med Orders, MAR
  // -------------------------------------------------------------------------
  listIpdMedOrders: (encounterId: string, params?: { page?: number; limit?: number }) =>
    api(withQuery(`/hospital/ipd/admissions/${encounterId}/med-orders`, params)),
  createIpdMedOrder: (encounterId: string, data: { drugId?: string; drugName?: string; dose?: string; route?: string; frequency?: string; duration?: string; startAt?: string; endAt?: string; prn?: boolean; status?: 'active' | 'stopped'; prescribedBy?: string }) =>
    api(`/hospital/ipd/admissions/${encounterId}/med-orders`, { method: 'POST', body: JSON.stringify(data) }),

  listIpdMedAdmins: (orderId: string, params?: { page?: number; limit?: number }) =>
    api(withQuery(`/hospital/ipd/med-orders/${orderId}/admins`, params)),
  createIpdMedAdmin: (orderId: string, data: { givenAt?: string; doseGiven?: string; byUser?: string; status?: 'given' | 'missed' | 'held'; remarks?: string }) =>
    api(`/hospital/ipd/med-orders/${orderId}/admins`, { method: 'POST', body: JSON.stringify(data) }),

  // -------------------------------------------------------------------------
  // IPD Records: Lab Links
  // -------------------------------------------------------------------------
  listIpdLabLinks: (encounterId: string, params?: { page?: number; limit?: number }) =>
    api(withQuery(`/hospital/ipd/admissions/${encounterId}/lab-links`, params)),
  createIpdLabLink: (encounterId: string, data: { externalLabOrderId?: string; testIds?: string[]; status?: string }) =>
    api(`/hospital/ipd/admissions/${encounterId}/lab-links`, { method: 'POST', body: JSON.stringify(data) }),
  updateIpdLabLink: (id: string, data: { externalLabOrderId?: string; testIds?: string[]; status?: string }) =>
    api(`/hospital/ipd/lab-links/${encodeURIComponent(id)}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteIpdLabLink: (id: string) =>
    api(`/hospital/ipd/lab-links/${encodeURIComponent(id)}`, { method: 'DELETE' }),

  // -------------------------------------------------------------------------
  // IPD Records: Billing Item & Payments
  // -------------------------------------------------------------------------
  listIpdBillingItems: (encounterId: string, params?: { page?: number; limit?: number }) =>
    api(withQuery(`/hospital/ipd/admissions/${encounterId}/billing/items`, params)),
  createIpdBillingItem: (encounterId: string, data: { type: 'bed' | 'procedure' | 'medication' | 'service'; description: string; qty?: number; unitPrice?: number; amount?: number; date?: string; refId?: string; billedBy?: string }) =>
    api(`/hospital/ipd/admissions/${encounterId}/billing/items`, { method: 'POST', body: JSON.stringify(data) }),
  updateIpdBillingItem: (id: string, data: { type?: 'bed' | 'procedure' | 'medication' | 'service'; description?: string; qty?: number; unitPrice?: number; amount?: number; date?: string; refId?: string; billedBy?: string }) =>
    api(`/hospital/ipd/billing/items/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteIpdBillingItem: (id: string) =>
    api(`/hospital/ipd/billing/items/${id}`, { method: 'DELETE' }),

  listIpdPayments: (encounterId: string, params?: { page?: number; limit?: number }) =>
    api(withQuery(`/hospital/ipd/admissions/${encounterId}/billing/payments`, params)),
  createIpdPayment: (encounterId: string, data: { amount: number; method?: string; refNo?: string; receivedBy?: string; receivedAt?: string; notes?: string; allocations?: Array<{ billingItemId: string; amount: number }>; type?: 'payment' | 'refund' | 'adjustment' }) =>
    api(`/hospital/ipd/admissions/${encounterId}/billing/payments`, { method: 'POST', body: JSON.stringify(data) }),
  updateIpdPayment: (id: string, data: { amount?: number; method?: string; refNo?: string; receivedBy?: string; receivedAt?: string; notes?: string }) =>
    api(`/hospital/ipd/billing/payments/${encodeURIComponent(id)}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteIpdPayment: (id: string) =>
    api(`/hospital/ipd/billing/payments/${encodeURIComponent(id)}`, { method: 'DELETE' }),
}

export default ipdApi
