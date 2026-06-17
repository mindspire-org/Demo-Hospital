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

import { api, withQuery } from '../../../api'

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
  admitFromOpdToken: (data: { tokenId: string; bedId?: string; deposit?: number; departmentId?: string; doctorId?: string; markTokenCompleted?: boolean; packageAmount?: number; advancedAmount?: number; bedFeeIncludedInPackage?: boolean }) =>
    api('/hospital/ipd/admissions/from-token', { method: 'POST', body: JSON.stringify(data) }),
  getIPDAdmissionById: (id: string) => api(`/hospital/ipd/admissions/${id}`),
  getIpdBillingSummary: (encounterId: string) => api(`/hospital/ipd/admissions/${encodeURIComponent(encounterId)}/billing-summary`),

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
  getNextDcNo: () => api(`/hospital/ipd/forms/death-certificate/next-dc-no`),
  getNextRdNo: () => api(`/hospital/ipd/forms/received-death/next-rd-no`),
  upsertIpdDeathCertificate: (encounterId: string, data: {
    dateOfDeath?: string; timeOfDeath?: string; causeOfDeath?: string; placeOfDeath?: string; notes?: string; createdBy?: string;
    dcNo?: string; mrNumber?: string; relative?: string; ageSex?: string; address?: string;
    presentingComplaints?: string; diagnosis?: string; primaryCause?: string; secondaryCause?: string;
    receiverName?: string; receiverRelation?: string; receiverIdCard?: string; receiverDate?: string; receiverTime?: string;
    staffName?: string; staffSignDate?: string; staffSignTime?: string; doctorName?: string; doctorSignDate?: string; doctorSignTime?: string;
  }) => api(`/hospital/ipd/admissions/${encodeURIComponent(encounterId)}/death-certificate`, { method: 'PUT', body: JSON.stringify(data) }),
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
    rdNo?: string; srNo?: string; patientCnic?: string; relative?: string; ageSex?: string;
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
  deleteIpdShortStay: (encounterId: string) => api(`/hospital/ipd/admissions/${encodeURIComponent(encounterId)}/short-stay`, { method: 'DELETE' }),
  deleteIpdDischargeSummary: (encounterId: string) => api(`/hospital/ipd/admissions/${encodeURIComponent(encounterId)}/discharge-summary`, { method: 'DELETE' }),

  // -------------------------------------------------------------------------
  // IPD Records: Vitals, Notes, Clinical Notes
  // -------------------------------------------------------------------------
  listIpdVitals: (encounterId: string, params?: { page?: number; limit?: number }) =>
    api(withQuery(`/hospital/ipd/admissions/${encounterId}/vitals`, params)),
  createIpdVital: (encounterId: string, data: { recordedAt?: string; bp?: string; hr?: number; rr?: number; temp?: number; spo2?: number; height?: number; weight?: number; painScale?: number; recordedBy?: string; note?: string; shift?: 'morning' | 'evening' | 'night'; bsr?: number; intakeIV?: string; urine?: string; nurseSign?: string }) =>
    api(`/hospital/ipd/admissions/${encounterId}/vitals`, { method: 'POST', body: JSON.stringify(data) }),
  updateIpdVital: (id: string, data: any) =>
    api(`/hospital/ipd/vitals/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  deleteIpdVital: (id: string) =>
    api(`/hospital/ipd/vitals/${id}`, { method: 'DELETE' }),

  listIpdNotes: (encounterId: string, params?: { page?: number; limit?: number }) =>
    api(withQuery(`/hospital/ipd/admissions/${encounterId}/notes`, params)),
  createIpdNote: (encounterId: string, data: { noteType: 'nursing' | 'progress' | 'discharge'; text: string; attachments?: string[]; createdBy?: string }) =>
    api(`/hospital/ipd/admissions/${encounterId}/notes`, { method: 'POST', body: JSON.stringify(data) }),

  listIpdClinicalNotes: (encounterId: string, params?: { type?: 'preop' | 'operation' | 'postop' | 'consultant' | 'anes-pre' | 'anes-intra' | 'anes-recovery' | 'anes-post-recovery' | 'anes-adverse' | 'consent-form' | 'infection-control' | 'blood-transfusion' | 'operation-consent' | 'history-exam' | 'surgical-signin' | 'surgical-timeout' | 'surgical-signout' | 'cardiovascular-exam' | 'respiratory-exam' | 'cns-exam' | 'cns-exam-b' | 'gastrointestinal-exam' | 'hernia-rectal-exam' | 'urogenital-musculoskeletal-exam' | 'gynecological-obstetric-exam' | 'musculoskeletal-exam' | 'pressure-ulcer-risk' | 'daily-ulcer-assessment' | 'nicu-evaluation' | 'newborn-baby-notes'; page?: number; limit?: number }) =>
    api(withQuery(`/hospital/ipd/admissions/${encounterId}/clinical-notes`, params)),
  createIpdClinicalNote: (encounterId: string, data: { type: 'preop' | 'operation' | 'postop' | 'consultant' | 'anes-pre' | 'anes-intra' | 'anes-recovery' | 'anes-post-recovery' | 'anes-adverse' | 'consent-form' | 'infection-control' | 'blood-transfusion' | 'operation-consent' | 'history-exam' | 'surgical-signin' | 'surgical-timeout' | 'surgical-signout' | 'cardiovascular-exam' | 'respiratory-exam' | 'cns-exam' | 'cns-exam-b' | 'gastrointestinal-exam' | 'hernia-rectal-exam' | 'urogenital-musculoskeletal-exam' | 'gynecological-obstetric-exam' | 'musculoskeletal-exam' | 'pressure-ulcer-risk' | 'daily-ulcer-assessment' | 'nicu-evaluation' | 'newborn-baby-notes'; recordedAt?: string; createdBy?: string; createdByRole?: string; doctorName?: string; sign?: string; data: any }) =>
    api(`/hospital/ipd/admissions/${encounterId}/clinical-notes`, { method: 'POST', body: JSON.stringify(data) }),
  updateIpdClinicalNote: (id: string, data: any) =>
    api(`/hospital/ipd/clinical-notes/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteIpdClinicalNote: (id: string) =>
    api(`/hospital/ipd/clinical-notes/${id}`, { method: 'DELETE' }),

  // -------------------------------------------------------------------------
  // IPD Records: Med Orders, MAR
  // -------------------------------------------------------------------------
  listIpdMedOrders: (encounterId: string, params?: { page?: number; limit?: number }) =>
    api(withQuery(`/hospital/ipd/admissions/${encounterId}/med-orders`, params)),
  createIpdMedOrder: (encounterId: string, data: { drugId?: string; drugName?: string; dose?: string; route?: string; frequency?: string; duration?: string; startAt?: string; endAt?: string; prn?: boolean; status?: 'active' | 'stopped'; prescribedBy?: string; prescribingDoctorId?: string }) =>
    api(`/hospital/ipd/admissions/${encounterId}/med-orders`, { method: 'POST', body: JSON.stringify(data) }),
  deleteIpdMedOrder: (id: string) =>
    api(`/hospital/ipd/med-orders/${id}`, { method: 'DELETE' }),
  executeIpdMedOrder: (id: string, data: { quantity: number; remarks?: string; executedAt?: string }) =>
    api(`/hospital/ipd/med-orders/${id}/execute`, { method: 'POST', body: JSON.stringify(data) }),
  stopIpdMedOrder: (id: string) =>
    api(`/hospital/ipd/med-orders/${id}/stop`, { method: 'PATCH' }),

  listPharmacyOrders: (encounterId: string, params?: { page?: number; limit?: number }) =>
    api(withQuery(`/hospital/ipd/admissions/${encounterId}/pharmacy-orders`, params)),
  createPharmacyOrder: (encounterId: string, data: { doctorId?: string; items: Array<{ name: string; qty: number; dose?: string; notes?: string }> }) =>
    api(`/hospital/ipd/admissions/${encounterId}/pharmacy-orders`, { method: 'POST', body: JSON.stringify(data) }),
  updatePharmacyOrder: (id: string, data: { items?: Array<{ name: string; qty: number; dose?: string; notes?: string }>; status?: string }) =>
    api(`/hospital/ipd/pharmacy-orders/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deletePharmacyOrder: (id: string) =>
    api(`/hospital/ipd/pharmacy-orders/${id}`, { method: 'DELETE' }),

  listIpdMedAdmins: (orderId: string, params?: { page?: number; limit?: number }) =>
    api(withQuery(`/hospital/ipd/med-orders/${orderId}/admins`, params)),
  createIpdMedAdmin: (orderId: string, data: { givenAt?: string; doseGiven?: string; byUser?: string; status?: 'given' | 'missed' | 'held'; remarks?: string }) =>
    api(`/hospital/ipd/med-orders/${orderId}/admins`, { method: 'POST', body: JSON.stringify(data) }),

  // -------------------------------------------------------------------------
  // IPD Records: Lab Links
  // -------------------------------------------------------------------------
  listIpdLabLinks: (encounterId: string, params?: { page?: number; limit?: number }) =>
    api(withQuery(`/hospital/ipd/admissions/${encounterId}/lab-links`, params)),
  createIpdLabLink: (encounterId: string, data: { externalLabOrderId?: string; testIds?: string[]; status?: string; doctorId?: string; referredBy?: string }) =>
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
  createIpdPayment: (encounterId: string, data: { amount: number; method?: string; paymentMode?: string; refNo?: string; receivedBy?: string; receivedAt?: string; notes?: string; allocations?: Array<{ billingItemId: string; amount: number }>; type?: 'payment' | 'refund' | 'adjustment' }) =>
    api(`/hospital/ipd/admissions/${encounterId}/billing/payments`, { method: 'POST', body: JSON.stringify(data) }),
  updateIpdPayment: (id: string, data: { amount?: number; method?: string; refNo?: string; receivedBy?: string; receivedAt?: string; notes?: string }) =>
    api(`/hospital/ipd/billing/payments/${encodeURIComponent(id)}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteIpdPayment: (id: string) =>
    api(`/hospital/ipd/billing/payments/${encodeURIComponent(id)}`, { method: 'DELETE' }),
  ipdBillingSummary: (encounterId: string) =>
    api(`/hospital/ipd/admissions/${encodeURIComponent(encounterId)}/billing/summary`),

  // -------------------------------------------------------------------------
  // IPD EMR: Surgery Records
  // -------------------------------------------------------------------------
  listIpdSurgeryRecords: (encounterId: string, params?: { status?: string; page?: number; limit?: number }) =>
    api(withQuery(`/hospital/ipd/admissions/${encounterId}/surgery-records`, params)),
  createIpdSurgeryRecord: (encounterId: string, data: {
    surgeryType?: string; surgeryDate?: string; surgeryTime?: string; surgeryEndTime?: string;
    diagnosis?: string; procedures?: Array<{ name?: string; code?: string; notes?: string }>;
    surgeonId?: string; surgeonName?: string; assistantSurgeon?: string;
    anesthesiologistId?: string; anesthesiologistName?: string;
    scrubNurse?: string; circulatingNurse?: string;
    otRoomId?: string; otRoomName?: string;
    preOpDiagnosis?: string; preOpNotes?: string; preOpChecklist?: any;
    intraOpFindings?: string; intraOpComplications?: string; bloodLoss?: string;
    specimensSent?: boolean; specimenDetails?: string; implantsUsed?: string[]; drainsPlaced?: string;
    postOpDiagnosis?: string; postOpInstructions?: string; postOpCondition?: string;
    status?: 'scheduled' | 'in-progress' | 'completed' | 'cancelled' | 'postponed' | 'postop';
    cancellationReason?: string; surgeonSign?: string; notes?: string;
  }) => api(`/hospital/ipd/admissions/${encounterId}/surgery-records`, { method: 'POST', body: JSON.stringify(data) }),
  getIpdSurgeryRecord: (id: string) =>
    api(`/hospital/ipd/surgery-records/${id}`),
  updateIpdSurgeryRecord: (id: string, data: any) =>
    api(`/hospital/ipd/surgery-records/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteIpdSurgeryRecord: (id: string) =>
    api(`/hospital/ipd/surgery-records/${id}`, { method: 'DELETE' }),

  // -------------------------------------------------------------------------
  // IPD EMR: Anesthesia Pre-Assessment
  // -------------------------------------------------------------------------
  listIpdAnesPreAssessments: (encounterId: string, params?: { status?: string; page?: number; limit?: number }) =>
    api(withQuery(`/hospital/ipd/admissions/${encounterId}/anes-pre-assessments`, params)),
  createIpdAnesPreAssessment: (encounterId: string, data: {
    surgeryRecordId?: string;
    existingProblems?: { cvs?: string; renal?: string; respiration?: string; hepatic?: string; diabetic?: string; git?: string; neurology?: string; anesthesiaHistory?: string; eventful?: string };
    physicalExam?: { bp?: string; pulse?: string; temp?: string; rr?: string; cvs?: string; chest?: string; teeth?: string; mallampatiScore?: string; asaClass?: string };
    plan?: { general?: string; spinal?: string; local?: string; monitoringCare?: string; npo?: string; fluidsBlood?: string; preAnesthesiaMedication?: string };
    checklist?: { patientIdentified?: boolean; consentRevised?: boolean; siteChecked?: boolean };
    preInduction?: { orientation?: string; bp?: string; pulse?: string; temp?: string; spo2?: string };
    planChange?: { changed?: boolean; general?: string; spinal?: string; local?: string };
    airwayAssessment?: string; allergies?: string[]; relevantHistory?: string;
    fastingStatus?: string; preMedication?: string;
    anesthesiologistId?: string; anesthesiologistName?: string;
    anesthesiologistSign?: string; status?: string;
  }) => api(`/hospital/ipd/admissions/${encounterId}/anes-pre-assessments`, { method: 'POST', body: JSON.stringify(data) }),
  getIpdAnesPreAssessment: (id: string) =>
    api(`/hospital/ipd/anes-pre-assessments/${id}`),
  updateIpdAnesPreAssessment: (id: string, data: any) =>
    api(`/hospital/ipd/anes-pre-assessments/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteIpdAnesPreAssessment: (id: string) =>
    api(`/hospital/ipd/anes-pre-assessments/${id}`, { method: 'DELETE' }),

  // -------------------------------------------------------------------------
  // IPD EMR: Anesthesia Intra-Op Records
  // -------------------------------------------------------------------------
  listIpdAnesthesiaRecords: (encounterId: string, params?: { status?: string; page?: number; limit?: number }) =>
    api(withQuery(`/hospital/ipd/admissions/${encounterId}/anesthesia-records`, params)),
  createIpdAnesthesiaRecord: (encounterId: string, data: {
    surgeryRecordId?: string;
    anesthesiaType?: 'general' | 'regional' | 'local' | 'sedation' | 'combined';
    anesthesiaTechnique?: string; inductionTime?: string;
    inductionAgents?: Array<{ drug?: string; dose?: string; route?: string }>;
    maintenanceAgents?: Array<{ drug?: string; dose?: string; route?: string }>;
    airwayManagement?: { type?: string; size?: string; technique?: string; grade?: string };
    positioning?: string;
    vitalPeriods?: Array<{ time?: string; bp?: string; hr?: number; rr?: string; spo2?: number; etco2?: number; temp?: number; airwayPressure?: number; drugs?: string; urineOutput?: string; bloodLoss?: string; fluidsGiven?: string }>;
    fluidsGiven?: Array<{ type?: string; name?: string; volume?: string }>;
    bloodTransfused?: Array<{ type?: string; units?: number; bloodGroup?: string }>;
    totalBloodLoss?: string; totalUrineOutput?: string;
    status?: 'in-progress' | 'completed';
    anesthesiologistId?: string; anesthesiologistName?: string; anesthesiaAssistant?: string;
  }) => api(`/hospital/ipd/admissions/${encounterId}/anesthesia-records`, { method: 'POST', body: JSON.stringify(data) }),
  getIpdAnesthesiaRecord: (id: string) =>
    api(`/hospital/ipd/anesthesia-records/${id}`),
  updateIpdAnesthesiaRecord: (id: string, data: any) =>
    api(`/hospital/ipd/anesthesia-records/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteIpdAnesthesiaRecord: (id: string) =>
    api(`/hospital/ipd/anesthesia-records/${id}`, { method: 'DELETE' }),

  // -------------------------------------------------------------------------
  // IPD EMR: Anesthesia Post-Op
  // -------------------------------------------------------------------------
  listIpdAnesPostOps: (encounterId: string, params?: { status?: string; page?: number; limit?: number }) =>
    api(withQuery(`/hospital/ipd/admissions/${encounterId}/anes-post-ops`, params)),
  createIpdAnesPostOp: (encounterId: string, data: {
    surgeryRecordId?: string;
    recovery?: { emergenceTime?: string; loc?: string; bp?: string; pulse?: string; rr?: string; spo2?: string; painStimulus?: string; recoveryCondition?: string; extubationTime?: string; extubationType?: string };
    postRecovery?: { shiftTime?: string; bp?: string; pulse?: string; rr?: string; spo2?: string; pain?: string; temp?: string; aldreteScore?: string; vomiting?: string; shivering?: string; siteBleedingHematoma?: string; postOpAnalgesia?: string };
    adverseEvents?: Array<{ when?: string; anyEvent?: boolean; details?: string; phase?: string }>;
    complications?: string[]; complicationDetails?: string;
    anesthesiologistId?: string; anesthesiologistName?: string;
    anesthesiologistSign?: string; status?: string;
  }) => api(`/hospital/ipd/admissions/${encounterId}/anes-post-ops`, { method: 'POST', body: JSON.stringify(data) }),
  getIpdAnesPostOp: (id: string) =>
    api(`/hospital/ipd/anes-post-ops/${id}`),
  updateIpdAnesPostOp: (id: string, data: any) =>
    api(`/hospital/ipd/anes-post-ops/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteIpdAnesPostOp: (id: string) =>
    api(`/hospital/ipd/anes-post-ops/${id}`, { method: 'DELETE' }),

  // -------------------------------------------------------------------------
  // IPD EMR: Consent Forms
  // -------------------------------------------------------------------------
  listIpdConsentForms: (encounterId: string, params?: { formType?: string; status?: string; page?: number; limit?: number }) =>
    api(withQuery(`/hospital/ipd/admissions/${encounterId}/consent-forms`, params)),
  createIpdConsentForm: (encounterId: string, data: {
    formType: 'surgery' | 'anesthesia' | 'blood-transfusion' | 'procedure' | 'discharge-against-advice' | 'informed-consent' | 'hipaa' | 'financial' | 'other';
    formTitle: string; procedureName?: string; procedureDescription?: string;
    risksAndBenefits?: string; alternatives?: string; additionalNotes?: string; customContent?: any;
    witnessName?: string; witnessRelation?: string; witnessContact?: string;
    translatorNeeded?: boolean; translatorName?: string;
    patientSignature?: string; patientSignedAt?: string; patientSignMethod?: 'signature' | 'fingerprint' | 'verbal-consent';
    representativeName?: string; representativeRelation?: string; representativeCnic?: string;
    representativeSignature?: string; representativeSignedAt?: string;
    doctorId?: string; doctorName?: string; doctorSignature?: string; doctorSignedAt?: string;
    witnessSignature?: string; witnessSignedAt?: string;
    status?: 'draft' | 'pending-signatures' | 'signed' | 'witnessed' | 'completed' | 'cancelled';
  }) => api(`/hospital/ipd/admissions/${encounterId}/consent-forms`, { method: 'POST', body: JSON.stringify(data) }),
  getIpdConsentForm: (id: string) =>
    api(`/hospital/ipd/consent-forms/${id}`),
  updateIpdConsentForm: (id: string, data: any) =>
    api(`/hospital/ipd/consent-forms/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteIpdConsentForm: (id: string) =>
    api(`/hospital/ipd/consent-forms/${id}`, { method: 'DELETE' }),

  // -------------------------------------------------------------------------
  // IPD EMR: History & Examination
  // -------------------------------------------------------------------------
  listIpdHistoryExams: (encounterId: string, params?: { examType?: string; page?: number; limit?: number }) =>
    api(withQuery(`/hospital/ipd/admissions/${encounterId}/history-exams`, params)),
  createIpdHistoryExam: (encounterId: string, data: {
    chiefComplaint?: string; historyOfPresentIllness?: string;
    pastMedicalHistory?: string; pastSurgicalHistory?: string;
    familyHistory?: string; socialHistory?: string;
    drugHistory?: Array<{ drugName?: string; dose?: string; frequency?: string; duration?: string }>;
    allergyHistory?: Array<{ allergen?: string; reaction?: string; severity?: 'mild' | 'moderate' | 'severe' }>;
    generalAppearance?: string;
    vitals?: { bp?: string; hr?: number; rr?: number; temp?: number; spo2?: number; weight?: number; height?: number; bmi?: number };
    heent?: string; cardiovascular?: string; respiratory?: string; abdominal?: string;
    musculoskeletal?: string; neurological?: string; dermatological?: string; psychiatric?: string;
    otherSystems?: any;
    provisionalDiagnosis?: string; differentialDiagnosis?: string[]; finalDiagnosis?: string;
    diagnosisCodes?: Array<{ code?: string; description?: string }>;
    investigationPlan?: string; treatmentPlan?: string;
    generalStatus?: string; advisedDiet?: string;
    doctorId?: string; doctorName?: string; departmentId?: string;
    examType?: 'admission' | 'follow-up' | 'pre-op' | 'consultation';
    doctorSignature?: string;
  }) => api(`/hospital/ipd/admissions/${encounterId}/history-exams`, { method: 'POST', body: JSON.stringify(data) }),
  getIpdHistoryExam: (id: string) =>
    api(`/hospital/ipd/history-exams/${id}`),
  updateIpdHistoryExam: (id: string, data: any) =>
    api(`/hospital/ipd/history-exams/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteIpdHistoryExam: (id: string) =>
    api(`/hospital/ipd/history-exams/${id}`, { method: 'DELETE' }),

  // -------------------------------------------------------------------------
  // IPD EMR: Blood Transfusion
  // -------------------------------------------------------------------------
  listIpdBloodTransfusions: (encounterId: string, params?: { status?: string; page?: number; limit?: number }) =>
    api(withQuery(`/hospital/ipd/admissions/${encounterId}/blood-transfusions`, params)),
  createIpdBloodTransfusion: (encounterId: string, data: {
    indication: string; preTransfusionHb?: number;
    issueDateTime?: string;
    screeningResults?: string;
    preTransfusionVitals?: { bp?: string; hr?: string; temp?: string; rr?: string; spo2?: string; chest?: string };
    bloodProduct: {
      type: 'PRBC' | 'FFP' | 'Platelets' | 'Cryoprecipitate' | 'Whole Blood' | 'Packed Cells';
      bloodGroup: string; rhFactor?: 'positive' | 'negative';
      units?: number; volumePerUnit?: string; bagNumber?: string; batchNumber?: string;
      expiryDate?: string; donorId?: string;
      crossMatchResult?: 'compatible' | 'incompatible' | 'pending';
      crossMatchAlbuminPhase?: string;
      crossMatchDoneAt?: string; crossMatchDoneBy?: string;
    };
    transfusionDate: string; startTime?: string; endTime?: string;
    durationMinutes?: number; rate?: string; site?: string; receivedInWard?: string;
    monitoringRecords?: Array<{ time?: string; temp?: string; hr?: string; bp?: string; rr?: string; spo2?: string; notes?: string }>;
    reactionOccurred?: boolean;
    reactionType?: string;
    reactionSeverity?: 'mild' | 'moderate' | 'severe';
    reactionDetails?: string; reactionManagement?: string; reactionTime?: string;
    postTransfusionHb?: number;
    postTransfusionVitals?: { bp?: string; hr?: string; temp?: string; rr?: string; spo2?: string; chest?: string };
    transfusionOutcome?: 'successful' | 'partial' | 'failed' | 'stopped-due-to-reaction';
    consentFormId?: string; consentObtained?: boolean; consentObtainedFrom?: string;
    orderedByDoctorId?: string; orderedByDoctorName?: string;
    administeredBy?: string; verifiedBy?: string;
    cnicNumber?: string; signatureThumb?: string;
    status?: 'ordered' | 'cross-match-pending' | 'ready' | 'in-progress' | 'completed' | 'cancelled';
    notes?: string;
  }) => api(`/hospital/ipd/admissions/${encounterId}/blood-transfusions`, { method: 'POST', body: JSON.stringify(data) }),
  getIpdBloodTransfusion: (id: string) =>
    api(`/hospital/ipd/blood-transfusions/${id}`),
  updateIpdBloodTransfusion: (id: string, data: any) =>
    api(`/hospital/ipd/blood-transfusions/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteIpdBloodTransfusion: (id: string) =>
    api(`/hospital/ipd/blood-transfusions/${id}`, { method: 'DELETE' }),

  // -------------------------------------------------------------------------
  // IPD EMR: ICU Monitoring
  // -------------------------------------------------------------------------
  listIpdIcuMonitoring: (encounterId: string, params?: { shift?: string; page?: number; limit?: number }) =>
    api(withQuery(`/hospital/ipd/admissions/${encounterId}/icu-monitoring`, params)),
  createIpdIcuMonitoring: (encounterId: string, data: {
    icuAdmissionId?: string; recordedAt?: string; shift?: 'morning' | 'evening' | 'night';
    vitals?: {
      bp?: string; map?: number; hr?: number; hrRhythm?: 'regular' | 'irregular' | 'paced';
      rr?: number; temp?: number; tempRoute?: 'oral' | 'axillary' | 'rectal' | 'tympanic';
      spo2?: number; spo2On?: 'room-air' | 'oxygen' | 'ventilator'; etco2?: number;
    };
    neurological?: {
      gcs?: { eye?: number; verbal?: number; motor?: number; total?: number };
      pupils?: { left?: { size?: number; reaction?: string }; right?: { size?: number; reaction?: string } };
      sedationScore?: string; sedationAgent?: string; levelOfConsciousness?: string;
    };
    ventilator?: {
      mode?: string; fio2?: number; tidalVolume?: number; respiratoryRate?: number;
      peep?: number; peakPressure?: number; plateauPressure?: number; compliance?: number;
      minuteVolume?: number; ieRatio?: string; psSupport?: number; sigh?: boolean; alarms?: string[];
    };
    hemodynamic?: {
      cvp?: number; pap?: number; pcwp?: number; co?: number; ci?: number; svr?: number;
      inotropes?: Array<{ drug?: string; dose?: string; route?: string }>;
    };
    renal?: {
      urineOutput?: number; urineColor?: string; urineSpecificGravity?: number;
      dialysisType?: 'hemodialysis' | 'peritoneal' | 'CRRT' | 'none';
      dialysisDuration?: number; fluidRemoved?: number;
    };
    fluidBalance?: {
      intake?: { oral?: number; iv?: number; tpn?: number; blood?: number; medications?: number; total?: number };
      output?: { urine?: number; drain?: number; vomitus?: number; stool?: number; bloodLoss?: number; total?: number };
      netBalance?: number; cumulativeBalance?: number;
    };
    lines?: Array<{ type?: 'CVP' | 'Arterial' | 'PICC' | 'Peripheral IV' | 'Dialysis'; site?: string; insertedAt?: string; daysInSitu?: number; condition?: string }>;
    tubes?: Array<{ type?: 'ETT' | 'Tracheostomy' | 'NGT' | 'Chest Tube' | 'Foley' | 'Drain'; site?: string; size?: string; insertedAt?: string; daysInSitu?: number; condition?: string }>;
    drains?: Array<{ location?: string; type?: string; output?: number; color?: string; notes?: string }>;
    wounds?: Array<{ location?: string; type?: string; size?: string; appearance?: string; dressingType?: string; dressingChanged?: boolean }>;
    nursingCare?: {
      position?: string; repositioningDone?: boolean; mouthCareDone?: boolean;
      eyeCareDone?: boolean; skinCareDone?: boolean; physiotherapyDone?: boolean;
    };
    scores?: { apacheII?: number; sofa?: number; glasgow?: number; nrs?: number };
    recordedBy?: string; verifiedBy?: string; notes?: string;
  }) => api(`/hospital/ipd/admissions/${encounterId}/icu-monitoring`, { method: 'POST', body: JSON.stringify(data) }),
  getIpdIcuMonitoring: (id: string) =>
    api(`/hospital/ipd/icu-monitoring/${id}`),
  updateIpdIcuMonitoring: (id: string, data: any) =>
    api(`/hospital/ipd/icu-monitoring/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteIpdIcuMonitoring: (id: string) =>
    api(`/hospital/ipd/icu-monitoring/${id}`, { method: 'DELETE' }),

  // -------------------------------------------------------------------------
  // IPD EMR: Surgical Safety (WHO Checklist)
  // -------------------------------------------------------------------------
  listIpdSurgicalSafety: (encounterId: string, params?: { status?: string; page?: number; limit?: number }) =>
    api(withQuery(`/hospital/ipd/admissions/${encounterId}/surgical-safety`, params)),
  createIpdSurgicalSafety: (encounterId: string, data: {
    surgeryRecordId?: string;
    signIn?: {
      patientConfirmed?: boolean; siteMarked?: boolean; anesthesiaSafetyCheckCompleted?: boolean;
      pulseOximeterOn?: boolean; knownAllergy?: string; difficultAirwayRisk?: string;
      aspirationRisk?: string; bloodLossRisk?: string; bloodProductsAvailable?: boolean;
      signInCompletedAt?: string; signInCompletedBy?: string;
    };
    timeOut?: {
      teamMembersIntroduced?: boolean; surgeonName?: string; anesthesiologistName?: string; scrubNurseName?: string;
      procedureConfirmed?: boolean; correctSiteConfirmed?: boolean; correctPatientConfirmed?: boolean;
      correctProcedureConfirmed?: boolean; criticalStepsDiscussed?: string;
      criticalEventsSurgeon?: string; criticalEventsAnaesthesia?: string; criticalEventsNursing?: string;
      expectedDuration?: string; anticipatedProblems?: string;
      antibioticGiven?: boolean; antibioticName?: string; antibioticGivenAt?: string;
      dvtProphylaxis?: boolean; dvtProphylaxisType?: string; imagingDisplayed?: string;
      timeOutCompletedAt?: string; timeOutCompletedBy?: string;
    };
    signOut?: {
      procedureNameRecorded?: string; procedureCompleted?: boolean;
      instrumentCountCorrect?: boolean; spongeCountCorrect?: boolean; sharpsCountCorrect?: boolean;
      specimenLabeled?: boolean; specimenDetails?: string;
      equipmentIssues?: string; keyConcernsForRecovery?: string; postOpInstructionsGiven?: boolean;
      signOutCompletedAt?: string; signOutCompletedBy?: string;
    };
    status?: 'pending' | 'sign-in-complete' | 'time-out-complete' | 'completed' | 'aborted';
    completedAt?: string;
    surgeonSignature?: string; anesthesiologistSignature?: string; nurseSignature?: string;
    notes?: string;
  }) => api(`/hospital/ipd/admissions/${encounterId}/surgical-safety`, { method: 'POST', body: JSON.stringify(data) }),
  getIpdSurgicalSafety: (id: string) =>
    api(`/hospital/ipd/surgical-safety/${id}`),
  updateIpdSurgicalSafety: (id: string, data: any) =>
    api(`/hospital/ipd/surgical-safety/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteIpdSurgicalSafety: (id: string) =>
    api(`/hospital/ipd/surgical-safety/${id}`, { method: 'DELETE' }),

  // -------------------------------------------------------------------------
  // IPD EMR: Fluid Balance
  // -------------------------------------------------------------------------
  listIpdFluidBalance: (encounterId: string, params?: { date?: string; shift?: string; page?: number; limit?: number }) =>
    api(withQuery(`/hospital/ipd/admissions/${encounterId}/fluid-balance`, params)),
  createIpdFluidBalance: (encounterId: string, data: {
    date: string; shift?: 'morning' | 'evening' | 'night';
    intake?: {
      oral?: number; ivFluids?: Array<{ name?: string; volume?: number; rate?: string }>; ivTotal?: number;
      tpn?: number; bloodProducts?: Array<{ type?: string; volume?: number }>; bloodTotal?: number;
      medications?: Array<{ name?: string; volume?: number }>; medicationTotal?: number;
      other?: number; otherDescription?: string; total?: number;
    };
    output?: {
      urine?: number; urineColor?: string; urineSpecificGravity?: number;
      vomitus?: number; vomitusDescription?: string;
      stool?: number; stoolDescription?: string;
      drains?: Array<{ location?: string; type?: string; volume?: number }>; drainTotal?: number;
      bloodLoss?: number; bloodLossDescription?: string;
      other?: number; otherDescription?: string; total?: number;
    };
    netBalance?: number; cumulativeBalance?: number;
    recordedBy?: string; recordedAt?: string; verifiedBy?: string; notes?: string;
  }) => api(`/hospital/ipd/admissions/${encounterId}/fluid-balance`, { method: 'POST', body: JSON.stringify(data) }),
  getIpdFluidBalance: (id: string) =>
    api(`/hospital/ipd/fluid-balance/${id}`),
  updateIpdFluidBalance: (id: string, data: any) =>
    api(`/hospital/ipd/fluid-balance/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteIpdFluidBalance: (id: string) =>
    api(`/hospital/ipd/fluid-balance/${id}`, { method: 'DELETE' }),

  // -------------------------------------------------------------------------
  // IPD EMR: Consultations
  // -------------------------------------------------------------------------
  listIpdConsultations: (encounterId: string, params?: { status?: string; consultantSpecialty?: string; page?: number; limit?: number }) =>
    api(withQuery(`/hospital/ipd/admissions/${encounterId}/consultations`, params)),
  createIpdConsultation: (encounterId: string, data: {
    requestedByDoctorId?: string; requestedByDoctorName?: string; requestedByDepartment?: string;
    consultantSpecialty: string; consultantDoctorId?: string; consultantDoctorName?: string;
    reasonForConsult: string; urgency?: 'routine' | 'urgent' | 'STAT';
    clinicalSummary?: string; specificQuestions?: string[];
    consultDate?: string; consultNotes?: string; findings?: string;
    diagnosis?: string; recommendations?: string;
    suggestedInvestigations?: string[];
    suggestedMedications?: Array<{ drug?: string; dose?: string; frequency?: string; duration?: string }>;
    followUpRequired?: boolean; followUpDate?: string; followUpNotes?: string;
    status?: 'pending' | 'accepted' | 'in-progress' | 'completed' | 'cancelled';
    cancelledReason?: string;
    consultantSignature?: string; consultantSignedAt?: string;
    requestingDoctorSignature?: string;
    consultationFee?: number; billingStatus?: 'pending' | 'billed' | 'paid' | 'waived';
    notes?: string;
  }) => api(`/hospital/ipd/admissions/${encounterId}/consultations`, { method: 'POST', body: JSON.stringify(data) }),
  // -------------------------------------------------------------------------
  // IPD EMR: Daily Progress (stored in IpdConsultation with type='daily-progress')
  // -------------------------------------------------------------------------
  listIpdDailyProgress: (encounterId: string, params?: { page?: number; limit?: number }) =>
    api(withQuery(`/hospital/ipd/admissions/${encounterId}/consultations`, { ...params, type: 'daily-progress' })),
  createIpdDailyProgress: (encounterId: string, data: {
    doctorId?: string; doctorName?: string; noteDate?: string;
    subjective?: string; objective?: string; assessment?: string; plan?: string;
    vitals?: { bp?: string; hr?: number; rr?: number; temp?: number; spo2?: number };
    doctorSignature?: string; status?: 'pending' | 'acknowledged' | 'in-progress' | 'completed' | 'cancelled';
  }) => api(`/hospital/ipd/admissions/${encounterId}/consultations`, { method: 'POST', body: JSON.stringify({ ...data, type: 'daily-progress' }) }),
  updateIpdDailyProgress: (id: string, data: any) =>
    api(`/hospital/ipd/consultations/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteIpdDailyProgress: (id: string) =>
    api(`/hospital/ipd/consultations/${id}`, { method: 'DELETE' }),
  getIpdConsultation: (id: string) =>
    api(`/hospital/ipd/consultations/${id}`),
  updateIpdConsultation: (id: string, data: any) =>
    api(`/hospital/ipd/consultations/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteIpdConsultation: (id: string) =>
    api(`/hospital/ipd/consultations/${id}`, { method: 'DELETE' }),

  // -------------------------------------------------------------------------
  // IPD EMR: Doctor Visits
  // -------------------------------------------------------------------------
  listIpdDoctorVisits: (encounterId: string, params?: { category?: string; page?: number; limit?: number }) =>
    api(withQuery(`/hospital/ipd/admissions/${encounterId}/doctor-visits`, params)),
  createIpdDoctorVisit: (encounterId: string, data: { doctorId: string; when: string; category?: string; done?: boolean }) =>
    api(`/hospital/ipd/admissions/${encounterId}/doctor-visits`, { method: 'POST', body: JSON.stringify(data) }),
  updateIpdDoctorVisit: (id: string, data: { doctorId?: string; when?: string; done?: boolean }) =>
    api(`/hospital/ipd/doctor-visits/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  deleteIpdDoctorVisit: (id: string) =>
    api(`/hospital/ipd/doctor-visits/${id}`, { method: 'DELETE' }),

  // -------------------------------------------------------------------------
  // IPD EMR: Documents
  // -------------------------------------------------------------------------
  listIpdDocuments: (encounterId: string, params?: { documentType?: string; category?: string; page?: number; limit?: number }) =>
    api(withQuery(`/hospital/ipd/admissions/${encounterId}/documents`, params)),
  createIpdDocument: (encounterId: string, data: {
    documentType: 'lab-report' | 'xray' | 'ct-scan' | 'mri' | 'ultrasound' | 'ecg' | 'echo' | 'endoscopy' | 'pathology-report' | 'discharge-summary' | 'operation-note' | 'consent-form' | 'referral-letter' | 'insurance-card' | 'id-card' | 'old-records' | 'prescription' | 'other';
    documentName: string; description?: string;
    fileUrl: string; fileName?: string; fileSize?: number; mimeType?: string;
    documentDate?: string; source?: 'uploaded' | 'generated' | 'external' | 'scanned';
    externalFacility?: string;
    category?: 'imaging' | 'lab' | 'insurance' | 'identification' | 'external-records' | 'clinical' | 'administrative';
    tags?: string[];
    isConfidential?: boolean; accessLevel?: 'all' | 'doctors-only' | 'admin-only';
    uploadedBy?: string; uploadedAt?: string;
    version?: number; previousVersionId?: string;
    relatedRecordType?: string; relatedRecordId?: string;
    notes?: string;
  }) => api(`/hospital/ipd/admissions/${encounterId}/documents`, { method: 'POST', body: JSON.stringify(data) }),
  getIpdDocument: (id: string) =>
    api(`/hospital/ipd/documents/${id}`),
  updateIpdDocument: (id: string, data: any) =>
    api(`/hospital/ipd/documents/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteIpdDocument: (id: string) =>
    api(`/hospital/ipd/documents/${id}`, { method: 'DELETE' }),

  // -------------------------------------------------------------------------
  // IPD EMR: Clinical Notes (New dedicated collection)
  // -------------------------------------------------------------------------
  listIpdEmrClinicalNotes: (encounterId: string, params?: { noteType?: string; status?: string; page?: number; limit?: number }) =>
    api(withQuery(`/hospital/ipd/admissions/${encounterId}/emr-clinical-notes`, params)),
  createIpdEmrClinicalNote: (encounterId: string, data: {
    noteType: 'progress-note' | 'nursing-note' | 'procedure-note' | 'transfer-note' | 'admission-note' | 'handover-note' | 'other';
    title?: string; content: string;
    authorId?: string; authorName?: string; authorRole?: 'doctor' | 'nurse' | 'consultant' | 'resident' | 'other';
    noteDate?: string;
    relatedConsultationId?: string;
    signed?: boolean; signedAt?: string; signature?: string;
    status?: 'draft' | 'final' | 'amended';
    amendedFrom?: string; amendmentReason?: string;
  }) => api(`/hospital/ipd/admissions/${encounterId}/emr-clinical-notes`, { method: 'POST', body: JSON.stringify(data) }),
  getIpdEmrClinicalNote: (id: string) =>
    api(`/hospital/ipd/emr-clinical-notes/${id}`),
  updateIpdEmrClinicalNote: (id: string, data: any) =>
    api(`/hospital/ipd/emr-clinical-notes/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteIpdEmrClinicalNote: (id: string) =>
    api(`/hospital/ipd/emr-clinical-notes/${id}`, { method: 'DELETE' }),

  // -------------------------------------------------------------------------
  // IPD EMR: Operation Consent (3-in-1: Anesthesia/Operation/Blood)
  // -------------------------------------------------------------------------
  listIpdOperationConsents: (encounterId: string, params?: { status?: string; page?: number; limit?: number }) =>
    api(withQuery(`/hospital/ipd/admissions/${encounterId}/operation-consents`, params)),
  createIpdOperationConsent: (encounterId: string, data: {
    mrNumber?: string;
    patientName?: string;
    date?: string;
    doctorId?: string;
    doctorName?: string;
    doctorSign?: string;
    anesthesia?: {
      guardianName?: string;
      guardianSign?: string;
      date?: string;
      time?: string;
    };
    operation?: {
      guardianName?: string;
      guardianSign?: string;
      date?: string;
      time?: string;
    };
    bloodTransfusion?: {
      guardianName?: string;
      guardianSign?: string;
      date?: string;
      time?: string;
    };
    status?: 'draft' | 'partial' | 'completed' | 'cancelled';
    recordedBy?: string;
    notes?: string;
  }) => api(`/hospital/ipd/admissions/${encounterId}/operation-consents`, { method: 'POST', body: JSON.stringify(data) }),
  getIpdOperationConsent: (id: string) =>
    api(`/hospital/ipd/operation-consents/${id}`),
  updateIpdOperationConsent: (id: string, data: any) =>
    api(`/hospital/ipd/operation-consents/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteIpdOperationConsent: (id: string) =>
    api(`/hospital/ipd/operation-consents/${id}`, { method: 'DELETE' }),

  // -------------------------------------------------------------------------
  // IPD EMR: Infection Control Checklist
  // -------------------------------------------------------------------------
  listIpdInfectionControls: (encounterId: string, params?: { status?: string; page?: number; limit?: number }) =>
    api(withQuery(`/hospital/ipd/admissions/${encounterId}/infection-controls`, params)),
  createIpdInfectionControl: (encounterId: string, data: {
    rows?: Array<{
      id: number;
      text: string;
      gloves?: boolean;
      mask?: boolean;
      gown?: boolean;
      cap?: boolean;
      isolation?: boolean;
    }>;
    date?: string;
    patientName?: string;
    patientSign?: string;
    headNurseName?: string;
    headNurseSign?: string;
    dutyNurseName?: string;
    dutyNurseSign?: string;
    recordedBy?: string;
    status?: 'draft' | 'completed';
    notes?: string;
  }) => api(`/hospital/ipd/admissions/${encounterId}/infection-controls`, { method: 'POST', body: JSON.stringify(data) }),
  getIpdInfectionControl: (id: string) =>
    api(`/hospital/ipd/infection-controls/${id}`),
  updateIpdInfectionControl: (id: string, data: any) =>
    api(`/hospital/ipd/infection-controls/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteIpdInfectionControl: (id: string) =>
    api(`/hospital/ipd/infection-controls/${id}`, { method: 'DELETE' }),

  // -------------------------------------------------------------------------
  // IPD Systemic Examinations (9 system types, single model)
  // -------------------------------------------------------------------------
  listIpdSystemicExams: (encounterId: string, params?: { systemType?: string; page?: number; limit?: number }) =>
    api(withQuery(`/hospital/ipd/admissions/${encounterId}/systemic-exams`, params)),
  createIpdSystemicExam: (encounterId: string, data: {
    systemType: 'cardiovascular' | 'respiratory' | 'cns' | 'cns-b' | 'gastrointestinal' | 'hernia-rectal' | 'urogenital-musculoskeletal' | 'musculoskeletal' | 'gynecological-obstetric';
    cardiovascular?: any; respiratory?: any; cns?: any; cnsB?: any; gastrointestinal?: any;
    herniaRectal?: any; urogenitalMusculoskeletal?: any; musculoskeletal?: any; gynecologicalObstetric?: any;
    notes?: string; doctorId?: string; doctorName?: string; recordedAt?: string; recordedBy?: string;
    signed?: boolean; signedAt?: string; signature?: string;
  }) => api(`/hospital/ipd/admissions/${encounterId}/systemic-exams`, { method: 'POST', body: JSON.stringify(data) }),
  getIpdSystemicExam: (id: string) =>
    api(`/hospital/ipd/systemic-exams/${id}`),
  updateIpdSystemicExam: (id: string, data: any) =>
    api(`/hospital/ipd/systemic-exams/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteIpdSystemicExam: (id: string) =>
    api(`/hospital/ipd/systemic-exams/${id}`, { method: 'DELETE' }),

  // -------------------------------------------------------------------------
  // IPD Pressure Ulcer Risk (dedicated model)
  // -------------------------------------------------------------------------
  listIpdPressureUlcerRisks: (encounterId: string, params?: { riskLevel?: string; page?: number; limit?: number }) =>
    api(withQuery(`/hospital/ipd/admissions/${encounterId}/pressure-ulcer-risks`, params)),
  createIpdPressureUlcerRisk: (encounterId: string, data: {
    sensoryPerception?: number; moisture?: number; activity?: number; mobility?: number;
    nutrition?: number; frictionShear?: number; notes?: string; others?: string;
    doctorId?: string; doctorName?: string; recordedAt?: string; recordedBy?: string;
    signed?: boolean; signedAt?: string; signature?: string;
  }) => api(`/hospital/ipd/admissions/${encounterId}/pressure-ulcer-risks`, { method: 'POST', body: JSON.stringify(data) }),
  getIpdPressureUlcerRisk: (id: string) =>
    api(`/hospital/ipd/pressure-ulcer-risks/${id}`),
  updateIpdPressureUlcerRisk: (id: string, data: any) =>
    api(`/hospital/ipd/pressure-ulcer-risks/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteIpdPressureUlcerRisk: (id: string) =>
    api(`/hospital/ipd/pressure-ulcer-risks/${id}`, { method: 'DELETE' }),

  // -------------------------------------------------------------------------
  // IPD Daily Ulcer Assessment (dedicated model)
  // -------------------------------------------------------------------------
  listIpdDailyUlcerAssessments: (encounterId: string, params?: { page?: number; limit?: number }) =>
    api(withQuery(`/hospital/ipd/admissions/${encounterId}/daily-ulcer-assessments`, params)),
  createIpdDailyUlcerAssessment: (encounterId: string, data: {
    assessments?: any[]; others?: string;
    doctorId?: string; doctorName?: string; recordedAt?: string; recordedBy?: string;
    signed?: boolean; signedAt?: string; signature?: string;
  }) => api(`/hospital/ipd/admissions/${encounterId}/daily-ulcer-assessments`, { method: 'POST', body: JSON.stringify(data) }),
  getIpdDailyUlcerAssessment: (id: string) =>
    api(`/hospital/ipd/daily-ulcer-assessments/${id}`),
  updateIpdDailyUlcerAssessment: (id: string, data: any) =>
    api(`/hospital/ipd/daily-ulcer-assessments/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteIpdDailyUlcerAssessment: (id: string) =>
    api(`/hospital/ipd/daily-ulcer-assessments/${id}`, { method: 'DELETE' }),

  // -------------------------------------------------------------------------
  // IPD NICU Evaluation (dedicated model)
  // -------------------------------------------------------------------------
  listIpdNicuEvaluations: (encounterId: string, params?: { page?: number; limit?: number }) =>
    api(withQuery(`/hospital/ipd/admissions/${encounterId}/nicu-evaluations`, params)),
  createIpdNicuEvaluation: (encounterId: string, data: {
    gpe?: string; colour?: string; af?: string; afTension?: string; ofc?: string; weight?: string;
    eyes?: string; ear?: string; nose?: string; oralCavity?: string; chestAbdomen?: string;
    cord?: string; genetalia?: string; testies?: string; backSpine?: string; analOpening?: string;
    handFoot?: string; others?: string; vitals?: { hr?: string; rr?: string; spo2?: string };
    neonatalReflexes?: string; sucking?: string; routing?: string; syestemic?: string;
    cvs?: string; cns?: string; resp?: string; git?: string; adv?: string;
    doctorId?: string; doctorName?: string; recordedAt?: string; recordedBy?: string;
    signed?: boolean; signedAt?: string; signature?: string;
  }) => api(`/hospital/ipd/admissions/${encounterId}/nicu-evaluations`, { method: 'POST', body: JSON.stringify(data) }),
  getIpdNicuEvaluation: (id: string) =>
    api(`/hospital/ipd/nicu-evaluations/${id}`),
  updateIpdNicuEvaluation: (id: string, data: any) =>
    api(`/hospital/ipd/nicu-evaluations/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteIpdNicuEvaluation: (id: string) =>
    api(`/hospital/ipd/nicu-evaluations/${id}`, { method: 'DELETE' }),

  // -------------------------------------------------------------------------
  // IPD New Born Baby Notes (dedicated model)
  // -------------------------------------------------------------------------
  listIpdNewBornBabyNotes: (encounterId: string, params?: { page?: number; limit?: number }) =>
    api(withQuery(`/hospital/ipd/admissions/${encounterId}/newborn-baby-notes`, params)),
  createIpdNewBornBabyNotes: (encounterId: string, data: {
    date?: string; time?: string; patientName?: string; patientAge?: string; patientAddress?: string;
    gynaecologist?: string; anaesthetist?: string; otSister?: string; aya?: string;
    diagnosis?: string; operation?: string; anaesthesia?: string; babySex?: string;
    congenitalAbnormality?: string; apgarScore1Min?: string; apgarScore5Min?: string;
    remarks?: string; footPrintNotes?: string;
    doctorId?: string; doctorName?: string; recordedAt?: string; recordedBy?: string;
    signed?: boolean; signedAt?: string; signature?: string;
  }) => api(`/hospital/ipd/admissions/${encounterId}/newborn-baby-notes`, { method: 'POST', body: JSON.stringify(data) }),
  getIpdNewBornBabyNotes: (id: string) =>
    api(`/hospital/ipd/newborn-baby-notes/${id}`),
  updateIpdNewBornBabyNotes: (id: string, data: any) =>
    api(`/hospital/ipd/newborn-baby-notes/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteIpdNewBornBabyNotes: (id: string) =>
    api(`/hospital/ipd/newborn-baby-notes/${id}`, { method: 'DELETE' }),
}

export default ipdApi
