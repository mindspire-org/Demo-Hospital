import { Router } from 'express'

import * as OPD from '../controllers/opd.controller'
import * as IPD from '../controllers/ipd.controller'
import * as Prescriptions from '../controllers/prescriptions.controller'
import * as PrescriptionTemplates from '../controllers/prescription_templates.controller'
import * as Staff from '../controllers/staff.controller'
import * as Expense from '../controllers/expense.controller'
import * as ExpenseMeta from '../controllers/expenseMeta.controller'
import * as Tokens from '../controllers/tokens.controller'
import * as BedMgmt from '../controllers/bed_mgmt.controller'
import * as Shifts from '../controllers/shifts.controller'
import * as StaffEarnings from '../controllers/staff_earnings.controller'
import * as Attendance from '../controllers/attendance.controller'
import * as Audit from '../controllers/audit.controller'
import * as Settings from '../controllers/settings.controller'
import * as Referrals from '../controllers/referrals.controller'
import * as Patients from '../controllers/patients.controller'
import * as IPDRec from '../controllers/ipd_records.controller'
import * as IPDEMR from '../controllers/ipd_emr.controller'
import * as Notifications from '../controllers/notifications.controller'
import * as Master from '../controllers/master.controller'
import * as Users from '../controllers/users.controller'
import * as IpdReferrals from '../controllers/ipd_referrals.controller'
import * as IpdDocs from '../controllers/ipd_docs.controller'
import * as ErDocs from '../controllers/er_docs.controller'
import * as DocSchedules from '../controllers/doctor_schedule.controller'
import * as Appointments from '../controllers/appointments.controller'
import * as Equipment from '../controllers/equipment.controller'
import equipmentRoutes from './equipment.routes'
import * as SidebarPerms from '../controllers/sidebarPermission.controller'
import * as FBR from '../controllers/fbr.controller'
import * as ER from '../controllers/er.controller'
import * as ERBilling from '../controllers/er_billing.controller'
import * as FinanceCtl from '../../finance/controllers/finance.controller'
import * as ERServices from '../controllers/er_services.controller'
import * as IPDServices from '../controllers/ipd_services.controller'
import * as ERRec from '../controllers/er_records.controller'
import * as ErReferrals from '../controllers/er_referrals.controller'
import * as IpdMedicalRecord from '../controllers/ipd_medical_record.controller'
import * as IpdSysExam from '../controllers/ipd_systemic_exam.controller'
import * as IPDPharmacyIntegration from '../controllers/ipdPharmacyIntegration.controller'
import * as OtPharmacy from '../controllers/otPharmacy.controller'
import * as IndoorOrderQueue from '../../indoorpharmacy/controllers/indoorOrderQueue.controller'

import { auth } from '../../../common/middleware/auth'
import { requireHospitalAdmin } from '../../../common/middleware/hospital_guard'

import * as PharmacyCashCounts from '../../pharmacy/controllers/cash_count.controller'
import * as Reports from '../controllers/reports.controller'

const r = Router()

// Masters
r.get('/departments', Master.listDepartments)
r.post('/departments', auth, requireHospitalAdmin, Master.createDepartment)
r.put('/departments/:id', auth, requireHospitalAdmin, Master.updateDepartment)
r.delete('/departments/:id', auth, requireHospitalAdmin, Master.removeDepartment)

r.get('/doctors', Master.listDoctors)
r.get('/doctors/:id', Master.getDoctorById)
r.post('/doctors', auth, requireHospitalAdmin, Master.createDoctor)
r.put('/doctors/:id', auth, requireHospitalAdmin, Master.updateDoctor)
r.put('/doctors/:id/profile', auth, Master.updateDoctorProfile)
r.delete('/doctors/:id', auth, requireHospitalAdmin, Master.removeDoctor)

// Doctor Schedules
r.get('/doctor-schedules', DocSchedules.list)
r.post('/doctor-schedules/weekly-pattern', DocSchedules.applyWeeklyPattern)
r.put('/doctor-schedules/:id', DocSchedules.update)
r.delete('/doctor-schedules/:id', DocSchedules.remove)

// Appointments (separate from tokens)
r.get('/appointments', Appointments.list)
r.post('/appointments', Appointments.create)
r.put('/appointments/:id', Appointments.update)
r.patch('/appointments/:id/status', Appointments.updateStatus)
r.post('/appointments/:id/convert-to-token', Appointments.convertToToken)
r.delete('/appointments/:id', Appointments.remove)

// OPD
r.post('/opd/encounters', OPD.createEncounter)
r.post('/opd/quote-price', OPD.quotePrice)

// Prescriptions (OPD)
r.post('/opd/prescriptions', Prescriptions.create)
r.get('/opd/prescriptions', Prescriptions.list)
r.get('/opd/prescriptions/:id', Prescriptions.getById)
r.put('/opd/prescriptions/:id', Prescriptions.update)
r.delete('/opd/prescriptions/:id', Prescriptions.remove)
r.get('/opd/prescriptions/encounter/:encounterId', Prescriptions.getByEncounterId)
r.put('/opd/prescriptions/encounter/:encounterId/vitals', Prescriptions.upsertVitals)

// Prescription Templates (per doctor)
r.get('/prescription-templates', PrescriptionTemplates.list)
r.get('/prescription-templates/:id', PrescriptionTemplates.getById)
r.get('/prescription-templates/doctor/:doctorId', PrescriptionTemplates.getByDoctor)
r.post('/prescription-templates', PrescriptionTemplates.create)
r.put('/prescription-templates/:id', PrescriptionTemplates.update)
r.delete('/prescription-templates/:id', PrescriptionTemplates.remove)

// Referrals (OPD)
r.post('/opd/referrals', Referrals.create)
r.get('/opd/referrals', Referrals.list)
r.get('/opd/referrals/:id', Referrals.getById)
r.put('/opd/referrals/:id', Referrals.update)
r.patch('/opd/referrals/:id/status', Referrals.updateStatus)
r.delete('/opd/referrals/:id', Referrals.remove)
r.patch('/opd/referrals/:id/link', Referrals.linkReferral)
r.patch('/opd/referrals/:id/report-status', Referrals.updateReportStatus)

// IPD
r.post('/ipd/admissions', IPD.admit)
r.patch('/ipd/admissions/:id/discharge', IPD.discharge)

// ER discharge (reuse discharge summary creation)
r.patch('/er/encounters/:id/discharge', IPD.discharge)

// Patient transfer between ER and IPD
r.post('/patients/transfer', IPD.transferPatient)

// ER encounters list
r.get('/er/encounters', ER.listER)

// ER encounter by ID with all records
r.get('/er/encounters/:id', ER.getEREncounterById)

r.get('/ipd/admissions', IPD.list)
r.get('/ipd/admissions/:id', IPD.getById)
r.patch('/ipd/admissions/:id/transfer-bed', IPD.transferBed)
r.post('/ipd/admissions/from-token', IPD.admitFromToken)
r.get('/ipd/admissions/:id/billing-summary', IPD.getBillingSummary)

// IPD Referrals
r.post('/ipd/referrals', IpdReferrals.create)
r.get('/ipd/referrals', IpdReferrals.list)
r.get('/ipd/referrals/:id', IpdReferrals.getById)
r.patch('/ipd/referrals/:id', IpdReferrals.update)
r.patch('/ipd/referrals/:id/status', IpdReferrals.updateStatus)
r.post('/ipd/referrals/:id/admit', IpdReferrals.admit)

// ER Referrals
r.post('/er/referrals', ErReferrals.create)
r.get('/er/referrals', ErReferrals.list)
r.get('/er/referrals/:id', ErReferrals.getById)
r.patch('/er/referrals/:id', ErReferrals.update)
r.patch('/er/referrals/:id/status', ErReferrals.updateStatus)
r.post('/er/referrals/:id/start-visit', ErReferrals.startVisit)
r.post('/er/referrals/:id/complete', ErReferrals.completeVisit)

// IPD Records - Vitals
r.post('/ipd/admissions/:encounterId/vitals', IPDRec.createVital)
r.get('/ipd/admissions/:encounterId/vitals', IPDRec.listVitals)
r.put('/ipd/vitals/:id', IPDRec.updateVital)
r.delete('/ipd/vitals/:id', IPDRec.removeVital)

// IPD Records - Notes
r.post('/ipd/admissions/:encounterId/notes', IPDRec.createNote)
r.get('/ipd/admissions/:encounterId/notes', IPDRec.listNotes)
r.put('/ipd/notes/:id', IPDRec.updateNote)
r.delete('/ipd/notes/:id', IPDRec.removeNote)

// IPD Records - Clinical Notes (Unified)
r.post('/ipd/admissions/:encounterId/clinical-notes', IPDRec.createClinicalNote)
r.get('/ipd/admissions/:encounterId/clinical-notes', IPDRec.listClinicalNotes)
r.put('/ipd/clinical-notes/:id', IPDRec.updateClinicalNote)
r.delete('/ipd/clinical-notes/:id', IPDRec.removeClinicalNote)

// IPD Records - Doctor Visits
r.post('/ipd/admissions/:encounterId/doctor-visits', IPDRec.createDoctorVisit)
r.get('/ipd/admissions/:encounterId/doctor-visits', IPDRec.listDoctorVisits)
r.put('/ipd/doctor-visits/:id', IPDRec.updateDoctorVisit)
r.delete('/ipd/doctor-visits/:id', IPDRec.removeDoctorVisit)

// IPD Records - Medication Orders
r.post('/ipd/admissions/:encounterId/med-orders', IPDRec.createMedicationOrder)
r.get('/ipd/admissions/:encounterId/med-orders', IPDRec.listMedicationOrders)
r.put('/ipd/med-orders/:id', IPDRec.updateMedicationOrder)
r.delete('/ipd/med-orders/:id', IPDRec.removeMedicationOrder)
r.post('/ipd/med-orders/:id/execute', auth, IPDRec.executeMedicationOrder)
r.patch('/ipd/med-orders/:id/stop', IPDRec.stopMedicationOrder)

// IPD EMR - Surgery Records
r.post('/ipd/admissions/:encounterId/surgery-records', IPDEMR.createSurgeryRecord)
r.get('/ipd/admissions/:encounterId/surgery-records', IPDEMR.listSurgeryRecords)
r.get('/ipd/surgery-records/:id', IPDEMR.getSurgeryRecord)
r.put('/ipd/surgery-records/:id', IPDEMR.updateSurgeryRecord)
r.delete('/ipd/surgery-records/:id', IPDEMR.removeSurgeryRecord)

// IPD EMR - Anesthesia Pre-Assessment
r.post('/ipd/admissions/:encounterId/anes-pre-assessments', IPDEMR.createAnesPreAssessment)
r.get('/ipd/admissions/:encounterId/anes-pre-assessments', IPDEMR.listAnesPreAssessments)
r.get('/ipd/anes-pre-assessments/:id', IPDEMR.getAnesPreAssessment)
r.put('/ipd/anes-pre-assessments/:id', IPDEMR.updateAnesPreAssessment)
r.delete('/ipd/anes-pre-assessments/:id', IPDEMR.removeAnesPreAssessment)

// IPD EMR - Anesthesia Intra-Op Records
r.post('/ipd/admissions/:encounterId/anesthesia-records', IPDEMR.createAnesthesiaRecord)
r.get('/ipd/admissions/:encounterId/anesthesia-records', IPDEMR.listAnesthesiaRecords)
r.get('/ipd/anesthesia-records/:id', IPDEMR.getAnesthesiaRecord)
r.put('/ipd/anesthesia-records/:id', IPDEMR.updateAnesthesiaRecord)
r.delete('/ipd/anesthesia-records/:id', IPDEMR.removeAnesthesiaRecord)

// IPD EMR - Anesthesia Post-Op
r.post('/ipd/admissions/:encounterId/anes-post-ops', IPDEMR.createAnesPostOp)
r.get('/ipd/admissions/:encounterId/anes-post-ops', IPDEMR.listAnesPostOps)
r.get('/ipd/anes-post-ops/:id', IPDEMR.getAnesPostOp)
r.put('/ipd/anes-post-ops/:id', IPDEMR.updateAnesPostOp)
r.delete('/ipd/anes-post-ops/:id', IPDEMR.removeAnesPostOp)

// IPD EMR - Consent Forms
r.post('/ipd/admissions/:encounterId/consent-forms', IPDEMR.createConsentForm)
r.get('/ipd/admissions/:encounterId/consent-forms', IPDEMR.listConsentForms)
r.get('/ipd/consent-forms/:id', IPDEMR.getConsentForm)
r.put('/ipd/consent-forms/:id', IPDEMR.updateConsentForm)
r.delete('/ipd/consent-forms/:id', IPDEMR.removeConsentForm)

// IPD EMR - History & Examination
r.post('/ipd/admissions/:encounterId/history-exams', IPDEMR.createHistoryExam)
r.get('/ipd/admissions/:encounterId/history-exams', IPDEMR.listHistoryExams)
r.get('/ipd/history-exams/:id', IPDEMR.getHistoryExam)
r.put('/ipd/history-exams/:id', IPDEMR.updateHistoryExam)
r.delete('/ipd/history-exams/:id', IPDEMR.removeHistoryExam)

// IPD EMR - Blood Transfusion
r.post('/ipd/admissions/:encounterId/blood-transfusions', IPDEMR.createBloodTransfusion)
r.get('/ipd/admissions/:encounterId/blood-transfusions', IPDEMR.listBloodTransfusions)
r.get('/ipd/blood-transfusions/:id', IPDEMR.getBloodTransfusion)
r.put('/ipd/blood-transfusions/:id', IPDEMR.updateBloodTransfusion)
r.delete('/ipd/blood-transfusions/:id', IPDEMR.removeBloodTransfusion)

// IPD EMR - ICU Monitoring
r.post('/ipd/admissions/:encounterId/icu-monitoring', IPDEMR.createIcuMonitoring)
r.get('/ipd/admissions/:encounterId/icu-monitoring', IPDEMR.listIcuMonitoring)
r.get('/ipd/icu-monitoring/:id', IPDEMR.getIcuMonitoring)
r.put('/ipd/icu-monitoring/:id', IPDEMR.updateIcuMonitoring)
r.delete('/ipd/icu-monitoring/:id', IPDEMR.removeIcuMonitoring)

// IPD EMR - Surgical Safety
r.post('/ipd/admissions/:encounterId/surgical-safety', IPDEMR.createSurgicalSafety)
r.get('/ipd/admissions/:encounterId/surgical-safety', IPDEMR.listSurgicalSafety)
r.get('/ipd/surgical-safety/:id', IPDEMR.getSurgicalSafety)
r.put('/ipd/surgical-safety/:id', IPDEMR.updateSurgicalSafety)
r.delete('/ipd/surgical-safety/:id', IPDEMR.removeSurgicalSafety)

// IPD EMR - Fluid Balance
r.post('/ipd/admissions/:encounterId/fluid-balance', IPDEMR.createFluidBalance)
r.get('/ipd/admissions/:encounterId/fluid-balance', IPDEMR.listFluidBalance)
r.get('/ipd/fluid-balance/:id', IPDEMR.getFluidBalance)
r.put('/ipd/fluid-balance/:id', IPDEMR.updateFluidBalance)
r.delete('/ipd/fluid-balance/:id', IPDEMR.removeFluidBalance)

// IPD EMR - Consultations
r.post('/ipd/admissions/:encounterId/consultations', IPDEMR.createConsultation)
r.get('/ipd/admissions/:encounterId/consultations', IPDEMR.listConsultations)
r.get('/ipd/consultations/:id', IPDEMR.getConsultation)
r.put('/ipd/consultations/:id', IPDEMR.updateConsultation)
r.delete('/ipd/consultations/:id', IPDEMR.removeConsultation)

// IPD EMR - Documents
r.post('/ipd/admissions/:encounterId/documents', IPDEMR.createDocument)
r.get('/ipd/admissions/:encounterId/documents', IPDEMR.listDocuments)
r.get('/ipd/documents/:id', IPDEMR.getDocument)
r.put('/ipd/documents/:id', IPDEMR.updateDocument)
r.delete('/ipd/documents/:id', IPDEMR.removeDocument)

// IPD EMR - Clinical Notes (New)
r.post('/ipd/admissions/:encounterId/emr-clinical-notes', IPDEMR.createClinicalNoteNew)
r.get('/ipd/admissions/:encounterId/emr-clinical-notes', IPDEMR.listClinicalNotesNew)
r.get('/ipd/emr-clinical-notes/:id', IPDEMR.getClinicalNote)
r.put('/ipd/emr-clinical-notes/:id', IPDEMR.updateClinicalNoteNew)
r.delete('/ipd/emr-clinical-notes/:id', IPDEMR.removeClinicalNoteNew)

// IPD EMR - Operation Consent (3-in-1: Anesthesia/Operation/Blood)
r.post('/ipd/admissions/:encounterId/operation-consents', IPDEMR.createOperationConsent)
r.get('/ipd/admissions/:encounterId/operation-consents', IPDEMR.listOperationConsents)
r.get('/ipd/operation-consents/:id', IPDEMR.getOperationConsent)
r.put('/ipd/operation-consents/:id', IPDEMR.updateOperationConsent)
r.delete('/ipd/operation-consents/:id', IPDEMR.removeOperationConsent)

// IPD EMR - Infection Control
r.post('/ipd/admissions/:encounterId/infection-controls', IPDEMR.createInfectionControl)
r.get('/ipd/admissions/:encounterId/infection-controls', IPDEMR.listInfectionControls)
r.get('/ipd/infection-controls/:id', IPDEMR.getInfectionControl)
r.put('/ipd/infection-controls/:id', IPDEMR.updateInfectionControl)
r.delete('/ipd/infection-controls/:id', IPDEMR.removeInfectionControl)

// IPD Records - Lab Links
r.post('/ipd/admissions/:encounterId/lab-links', IPDRec.createLabLink)
r.get('/ipd/admissions/:encounterId/lab-links', IPDRec.listLabLinks)
r.put('/ipd/lab-links/:id', IPDRec.updateLabLink)
r.delete('/ipd/lab-links/:id', IPDRec.removeLabLink)

// IPD Records - Pharmacy Orders
r.post('/ipd/admissions/:encounterId/pharmacy-orders', IPDRec.createPharmacyOrder)
r.get('/ipd/admissions/:encounterId/pharmacy-orders', IPDRec.listPharmacyOrders)
r.put('/ipd/pharmacy-orders/:id', IPDRec.updatePharmacyOrder)
r.delete('/ipd/pharmacy-orders/:id', IPDRec.removePharmacyOrder)

// IPD Records - Billing Items
r.post('/ipd/admissions/:encounterId/billing/items', IPDRec.createBillingItem)
r.get('/ipd/admissions/:encounterId/billing/items', IPDRec.listBillingItems)
r.put('/ipd/billing/items/:id', IPDRec.updateBillingItem)
r.delete('/ipd/billing/items/:id', IPDRec.removeBillingItem)

// IPD Records - Payments
r.post('/ipd/admissions/:encounterId/billing/payments', auth, IPDRec.createPayment)
r.get('/ipd/admissions/:encounterId/billing/payments', IPDRec.listPayments)
r.put('/ipd/billing/payments/:id', IPDRec.updatePayment)
r.get('/ipd/admissions/:encounterId/billing/summary', IPDRec.getSummary)

// ER Charges
r.get('/er/encounters/:encounterId/charges', ER.listCharges)
r.post('/er/encounters/:encounterId/charges', ER.createCharge)
r.put('/er/charges/:id', ER.updateCharge)
r.delete('/er/charges/:id', ER.removeCharge)

// ER Billing - Charges & Payments
r.get('/er/encounters/:encounterId/billing/charges', ERBilling.listCharges)
r.get('/er/encounters/:encounterId/billing/summary', ERBilling.getSummary)
r.get('/er/encounters/:encounterId/billing/payments', ERBilling.listPayments)
r.post('/er/encounters/:encounterId/billing/payments', auth, ERBilling.createPayment)

// Recent ER Payments (across all encounters)
r.get('/er/billing/recent-payments', ERBilling.listRecentPayments)

// IPD Services Catalog
r.get('/ipd/services', IPDServices.list)
r.post('/ipd/services', IPDServices.create)
r.put('/ipd/services/:id', IPDServices.update)
r.delete('/ipd/services/:id', IPDServices.remove)

r.get('/er/services', ERServices.list)
r.post('/er/services', ERServices.create)
r.put('/er/services/:id', ERServices.update)
r.delete('/er/services/:id', ERServices.remove)

// ER Records - Vitals
r.post('/er/encounters/:encounterId/vitals', ERRec.createVital)
r.get('/er/encounters/:encounterId/vitals', ERRec.listVitals)
r.put('/er/vitals/:id', ERRec.updateVital)
r.delete('/er/vitals/:id', ERRec.removeVital)

// ER Records - Medication Orders
r.post('/er/encounters/:encounterId/med-orders', ERRec.createMedicationOrder)
r.get('/er/encounters/:encounterId/med-orders', ERRec.listMedicationOrders)
r.put('/er/med-orders/:id', ERRec.updateMedicationOrder)
r.delete('/er/med-orders/:id', ERRec.removeMedicationOrder)
r.post('/er/med-orders/:id/execute', auth, ERRec.executeMedicationOrder)
r.patch('/er/med-orders/:id/stop', ERRec.stopMedicationOrder)

// ER Records - Pharmacy Orders
r.post('/er/encounters/:encounterId/pharmacy-orders', ERRec.createPharmacyOrder)
r.get('/er/encounters/:encounterId/pharmacy-orders', ERRec.listPharmacyOrders)
r.put('/er/pharmacy-orders/:id', ERRec.updatePharmacyOrder)
r.delete('/er/pharmacy-orders/:id', ERRec.removePharmacyOrder)

// ER Records - Clinical Notes
r.post('/er/encounters/:encounterId/clinical-notes', ERRec.createClinicalNote)
r.get('/er/encounters/:encounterId/clinical-notes', ERRec.listClinicalNotes)
r.put('/er/clinical-notes/:id', ERRec.updateClinicalNote)
r.delete('/er/clinical-notes/:id', ERRec.removeClinicalNote)

// ER Records - Initial Assessment
r.post('/er/encounters/:encounterId/initial-assessments', ERRec.createInitialAssessment)
r.get('/er/encounters/:encounterId/initial-assessments', ERRec.listInitialAssessments)

// ER Records - Stroke Assessment
r.post('/er/encounters/:encounterId/stroke-assessments', ERRec.createStrokeAssessment)
r.get('/er/encounters/:encounterId/stroke-assessments', ERRec.listStrokeAssessments)
r.put('/er/stroke-assessments/:id', ERRec.updateStrokeAssessment)
r.delete('/er/stroke-assessments/:id', ERRec.removeStrokeAssessment)

// IPD Discharge Documents
r.get('/ipd/admissions/:id/discharge-summary', IpdDocs.getDischargeSummary)
r.put('/ipd/admissions/:id/discharge-summary', IpdDocs.upsertDischargeSummary)
r.get('/ipd/admissions/:id/discharge-summary/print', IpdDocs.printDischargeSummary)
r.post('/ipd/admissions/:id/discharge-summary/print', IpdDocs.printDischargeSummary)
r.get('/ipd/admissions/:id/discharge-summary/print-pdf', IpdDocs.printDischargeSummaryPdf)

// IPD Short Stay
r.get('/ipd/admissions/:id/short-stay', IpdDocs.getShortStay)
r.put('/ipd/admissions/:id/short-stay', IpdDocs.upsertShortStay)

r.get('/ipd/admissions/:id/death-certificate', IpdDocs.getDeathCertificate)
r.put('/ipd/admissions/:id/death-certificate', IpdDocs.upsertDeathCertificate)
r.get('/ipd/forms/death-certificate/next-dc-no', IpdDocs.getNextDcNo)
r.get('/ipd/admissions/:id/death-certificate/print', IpdDocs.printDeathCertificate)

r.get('/ipd/forms/received-death/next-rd-no', IpdDocs.getNextRdNo)
r.get('/ipd/admissions/:id/received-death', IpdDocs.getReceivedDeath)
r.put('/ipd/admissions/:id/received-death', IpdDocs.upsertReceivedDeath)
r.get('/ipd/admissions/:id/received-death/print', IpdDocs.printReceivedDeath)

// IPD Forms: PDF Print
r.get('/ipd/admissions/:id/death-certificate/print-pdf', IpdDocs.printDeathCertificatePdf)
r.get('/ipd/admissions/:id/received-death/print-pdf', IpdDocs.printReceivedDeathPdf)

// IPD Forms: Lists for standalone pages
r.get('/ipd/forms/received-deaths', IpdDocs.listReceivedDeaths)
r.get('/ipd/forms/death-certificates', IpdDocs.listDeathCertificates)
r.get('/ipd/forms/birth-certificates', IpdDocs.listBirthCertificates)
r.get('/ipd/forms/short-stays', IpdDocs.listShortStays)
r.get('/ipd/forms/discharge-summaries', IpdDocs.listDischargeSummaries)

// Birth Certificates Standalone (no encounter)
r.post('/ipd/forms/birth-certificates', IpdDocs.createBirthCertificateStandalone)
r.get('/ipd/forms/birth-certificates/:id', IpdDocs.getBirthCertificateById)
r.put('/ipd/forms/birth-certificates/:id', IpdDocs.updateBirthCertificateStandalone)
r.delete('/ipd/forms/birth-certificates/:id', IpdDocs.deleteBirthCertificateById)
r.get('/ipd/forms/birth-certificates/:id/print', IpdDocs.printBirthCertificateById)
r.get('/ipd/forms/birth-certificates/:id/print-pdf', IpdDocs.printBirthCertificateByIdPdf)

// IPD Forms: Deletes (by encounter)
r.delete('/ipd/admissions/:id/received-death', IpdDocs.deleteReceivedDeath)
r.delete('/ipd/admissions/:id/death-certificate', IpdDocs.deleteDeathCertificate)
r.delete('/ipd/admissions/:id/short-stay', IpdDocs.deleteShortStay)
r.delete('/ipd/admissions/:id/discharge-summary', IpdDocs.deleteDischargeSummary)

// IPD Final Invoice
r.get('/ipd/admissions/:id/final-invoice', IpdDocs.getFinalInvoice)
r.get('/ipd/admissions/:id/final-invoice/print', IpdDocs.printFinalInvoice)

// ER Final Invoice
r.get('/er/encounters/:id/final-invoice', IpdDocs.getFinalInvoice)
r.get('/er/encounters/:id/final-invoice/print', IpdDocs.printFinalInvoice)

// ER Medical Record
r.get('/er/encounters/:id/medical-record/print', ErDocs.printErMedicalRecord)

// IPD Medical Record (Complete)
r.get('/ipd/encounters/:id/medical-record/print', IpdMedicalRecord.printIpdMedicalRecord)

// Tokens (OPD)
r.post('/tokens/opd', auth, Tokens.createOpd)
r.post('/tokens/quote-opd-price', OPD.quotePrice)
r.get('/tokens', Tokens.list)
r.get('/tokens/:id', Tokens.getById)
r.patch('/tokens/:id/status', Tokens.updateStatus)
r.put('/tokens/:id', Tokens.update)
r.delete('/tokens/:id', Tokens.remove)

// FBR
r.get('/fbr/settings', FBR.getSettings)
r.put('/fbr/settings', FBR.upsertSettings)
r.get('/fbr/logs', FBR.listLogs)
r.get('/fbr/summary', FBR.summary)
r.post('/fbr/retry/:id', FBR.retry)

// Staff
r.get('/staff', Staff.list)
r.post('/staff', auth, requireHospitalAdmin, Staff.create)
r.put('/staff/:id', auth, requireHospitalAdmin, Staff.update)
r.delete('/staff/:id', auth, requireHospitalAdmin, Staff.remove)

// Staff Biometric
r.post('/staff/biometric/fetch', auth, requireHospitalAdmin, Staff.fetchBiometricNow)
r.get('/staff/biometric/status', auth, requireHospitalAdmin, Staff.biometricStatus)
r.get('/staff/biometric/device-users', auth, requireHospitalAdmin, Staff.listBiometricDeviceUsers)
r.post('/staff/:id/biometric/connect', auth, requireHospitalAdmin, Staff.connectBiometric)

// Users (Hospital App Users)
r.get('/users', auth, requireHospitalAdmin, Users.list)
r.post('/users', auth, requireHospitalAdmin, Users.create)
r.put('/users/:id', auth, requireHospitalAdmin, Users.update)
r.delete('/users/:id', auth, requireHospitalAdmin, Users.remove)
r.post('/users/login', Users.login)
r.post('/users/logout', Users.logout)

// Sidebar Roles & Permissions (Hospital)
r.get('/sidebar-roles', auth, requireHospitalAdmin, SidebarPerms.listRoles)
r.post('/sidebar-roles', auth, requireHospitalAdmin, SidebarPerms.createRole)
r.delete('/sidebar-roles/:role', auth, requireHospitalAdmin, SidebarPerms.deleteRole)

r.get('/sidebar-permissions', auth, SidebarPerms.getPermissions)
r.put('/sidebar-permissions/:role', auth, requireHospitalAdmin, SidebarPerms.updatePermissions)
r.post('/sidebar-permissions/:role/reset', auth, requireHospitalAdmin, SidebarPerms.resetToDefaults)

// Shifts
r.get('/shifts', Shifts.list)
r.post('/shifts', auth, requireHospitalAdmin, Shifts.create)
r.put('/shifts/:id', auth, requireHospitalAdmin, Shifts.update)
r.delete('/shifts/:id', auth, requireHospitalAdmin, Shifts.remove)

// Attendance
r.get('/attendance', Attendance.list)
r.post('/attendance', auth, requireHospitalAdmin, Attendance.upsert)

// Staff Earnings
r.get('/staff-earnings', StaffEarnings.list)
r.post('/staff-earnings', auth, requireHospitalAdmin, StaffEarnings.create)
r.put('/staff-earnings/:id', auth, requireHospitalAdmin, StaffEarnings.update)
r.delete('/staff-earnings/:id', auth, requireHospitalAdmin, StaffEarnings.remove)

// Expenses
r.get('/expenses', Expense.list)
r.post('/expenses', auth, Expense.create)
r.put('/expenses/:id', Expense.update)
r.delete('/expenses/:id', Expense.remove)

// Finance Transactions
r.get('/finance/transactions', FinanceCtl.listAllTransactions)
r.get('/finance/corporate-ar-breakdown', FinanceCtl.getCorporateARBreakdown)
r.get('/finance/cash-bank-accounts', FinanceCtl.listCashBankAccounts)
r.get('/finance/cash-bank-accounts/:id/balance', FinanceCtl.getCashBankAccountBalance)

// Expense Departments & Categories
r.get('/expense-departments', ExpenseMeta.listExpenseDepartments)
r.post('/expense-departments', auth, requireHospitalAdmin, ExpenseMeta.createExpenseDepartment)
r.delete('/expense-departments/:id', auth, requireHospitalAdmin, ExpenseMeta.deleteExpenseDepartment)
r.get('/expense-categories', ExpenseMeta.listExpenseCategories)
r.post('/expense-categories', auth, requireHospitalAdmin, ExpenseMeta.createExpenseCategory)
r.delete('/expense-categories/:id', auth, requireHospitalAdmin, ExpenseMeta.deleteExpenseCategory)

// Audit Logs
r.get('/audit-logs', auth, requireHospitalAdmin, Audit.list)
r.post('/audit-logs', auth, requireHospitalAdmin, Audit.create)

// Reports
r.get('/reports/my-activity', auth, Reports.myActivity)
r.get('/reports/dashboard-stats', auth, Reports.dashboardStats)

// Settings (GET open to any auth user for printing; PUT still admin-only)
r.get('/settings', auth, Settings.get)
r.put('/settings', auth, requireHospitalAdmin, Settings.update)

// Patients (lookup)
r.get('/patients/search', Patients.search)

// Notifications (Doctor portal)
r.get('/notifications', Notifications.list)
r.patch('/notifications/:id', Notifications.update)
r.get('/notifications/stream', Notifications.stream)

// Bed Management
r.get('/floors', BedMgmt.listFloors)
r.post('/floors', BedMgmt.createFloor)
r.put('/floors/:id', BedMgmt.updateFloor)
r.delete('/floors/:id', BedMgmt.removeFloor)

r.get('/rooms', BedMgmt.listRooms)
r.post('/rooms', BedMgmt.createRoom)
r.put('/rooms/:id', BedMgmt.updateRoom)
r.delete('/rooms/:id', BedMgmt.removeRoom)

r.get('/wards', BedMgmt.listWards)
r.post('/wards', BedMgmt.createWard)
r.put('/wards/:id', BedMgmt.updateWard)
r.delete('/wards/:id', BedMgmt.removeWard)

r.get('/beds', BedMgmt.listBeds)
r.post('/beds', BedMgmt.addBeds)
r.put('/beds/:id', BedMgmt.updateBed)
r.delete('/beds/:id', BedMgmt.removeBed)
r.patch('/beds/:id/status', BedMgmt.updateBedStatus)

// Equipment Management
r.use('/equipment', equipmentRoutes)

// Store / Inventory Module
import storeRoutes from './store.routes'
r.use('/store', storeRoutes)

// Ambulance Module
import ambulanceRoutes from './ambulance.routes'
r.use('/ambulance', ambulanceRoutes)

// OT Module
import * as OT from '../controllers/ot.controller'

r.get('/ot/rooms', OT.listRooms)
r.post('/ot/rooms', OT.createRoom)
r.put('/ot/rooms/:id', OT.updateRoom)
r.delete('/ot/rooms/:id', OT.deleteRoom)

r.get('/ot/bookings', OT.listBookings)
r.get('/ot/bookings/:id', OT.getBookingById)
r.post('/ot/bookings', OT.createBooking)
r.put('/ot/bookings/:id', OT.updateBooking)
r.delete('/ot/bookings/:id', OT.deleteBooking)

r.get('/ot/sterilizations', OT.listSterilizations)
r.post('/ot/sterilizations', OT.createSterilization)
r.put('/ot/sterilizations/:id', OT.updateSterilization)
r.delete('/ot/sterilizations/:id', OT.deleteSterilization)

// OT Equipment
r.get('/ot/equipment', OT.listEquipment)
r.post('/ot/equipment', OT.createEquipment)
r.put('/ot/equipment/:id', OT.updateEquipment)
r.delete('/ot/equipment/:id', OT.deleteEquipment)

// OT Procedures
r.get('/ot/procedures', OT.listProcedures)
r.get('/ot/procedures/:id', OT.getProcedureById)
r.post('/ot/procedures', OT.createProcedure)
r.put('/ot/procedures/:id', OT.updateProcedure)
r.delete('/ot/procedures/:id', OT.deleteProcedure)

// OT Team Members
r.get('/ot/bookings/:bookingId/team', OT.listTeamMembers)
r.post('/ot/bookings/:bookingId/team', OT.addTeamMember)
r.delete('/ot/bookings/:bookingId/team/:staffId', OT.removeTeamMember)

// OT Reports
r.get('/ot/statistics', OT.getStatistics)
r.get('/ot/reports/surgeries', OT.getSurgeryReport)

// OT SSI Tracking (CDC NHSN Surveillance)
r.get('/ot/ssi-tracking', OT.listSSITracking)
r.get('/ot/ssi-tracking/:id', OT.getSSITrackingById)
r.post('/ot/ssi-tracking', OT.createSSITracking)
r.put('/ot/ssi-tracking/:id', OT.updateSSITracking)
r.delete('/ot/ssi-tracking/:id', OT.deleteSSITracking)

// ICU Module
import * as ICU from '../controllers/icu.controller'
import * as Leave from '../controllers/leave.controller'

r.get('/icu/beds', ICU.listBeds)
r.post('/icu/beds', ICU.createBed)
r.put('/icu/beds/:id', ICU.updateBed)
r.delete('/icu/beds/:id', ICU.deleteBed)

// Leave Management
r.get('/leaves', Leave.listLeaves)
r.post('/leaves', Leave.createLeaveRequest)
r.post('/leaves/:id/approve', Leave.approveLeave)
r.delete('/leaves/:id', Leave.deleteLeave)

r.get('/icu/admissions', ICU.listAdmissions)
r.get('/icu/admissions/:id', ICU.getAdmissionById)
r.post('/icu/admissions', ICU.createAdmission)
r.put('/icu/admissions/:id', ICU.updateAdmission)
r.delete('/icu/admissions/:id', ICU.deleteAdmission)

r.get('/icu/admissions/:encounterId/flowsheet', ICU.listFlowsheet)
r.post('/icu/admissions/:encounterId/flowsheet', ICU.createFlowsheetEntry)
r.put('/icu/flowsheet/:id', ICU.updateFlowsheetEntry)
r.delete('/icu/flowsheet/:id', ICU.deleteFlowsheetEntry)

r.get('/icu/admissions/:encounterId/scores', ICU.listScores)
r.post('/icu/admissions/:encounterId/scores', ICU.createScore)
r.put('/icu/scores/:id', ICU.updateScore)
r.delete('/icu/scores/:id', ICU.deleteScore)

r.get('/icu/statistics', ICU.getStatistics)

// Invoice Module
import * as Invoice from '../controllers/invoice.controller'
import * as DoctorCustomEntries from '../controllers/doctorCustomEntries.controller'

r.post('/invoices/:encounterType/:encounterId', Invoice.save)
r.get('/invoices/:encounterType/:encounterId', Invoice.getByEncounter)
r.get('/invoices', Invoice.list)
r.get('/invoices/id/:id', Invoice.getById)
r.patch('/invoices/:id/printed', Invoice.markPrinted)

// Doctor Custom Entries (for prescription fields)
r.get('/doctor-custom-entries', DoctorCustomEntries.list)
r.get('/doctor-custom-entries/doctor/:doctorId/category/:category', DoctorCustomEntries.getByDoctorAndCategory)
r.post('/doctor-custom-entries', DoctorCustomEntries.create)
r.put('/doctor-custom-entries/:id', DoctorCustomEntries.update)
r.delete('/doctor-custom-entries/:id', DoctorCustomEntries.remove)

// IPD Systemic Examinations (9 system types in one model)
r.post('/ipd/admissions/:encounterId/systemic-exams', IpdSysExam.createSystemicExam)
r.get('/ipd/admissions/:encounterId/systemic-exams', IpdSysExam.listSystemicExams)
r.get('/ipd/systemic-exams/:id', IpdSysExam.getSystemicExam)
r.put('/ipd/systemic-exams/:id', IpdSysExam.updateSystemicExam)
r.delete('/ipd/systemic-exams/:id', IpdSysExam.deleteSystemicExam)

// IPD Pressure Ulcer Risk (dedicated model)
r.post('/ipd/admissions/:encounterId/pressure-ulcer-risks', IpdSysExam.createPressureUlcerRisk)
r.get('/ipd/admissions/:encounterId/pressure-ulcer-risks', IpdSysExam.listPressureUlcerRisks)
r.get('/ipd/pressure-ulcer-risks/:id', IpdSysExam.getPressureUlcerRisk)
r.put('/ipd/pressure-ulcer-risks/:id', IpdSysExam.updatePressureUlcerRisk)
r.delete('/ipd/pressure-ulcer-risks/:id', IpdSysExam.deletePressureUlcerRisk)

// IPD Daily Ulcer Assessment (dedicated model)
r.post('/ipd/admissions/:encounterId/daily-ulcer-assessments', IpdSysExam.createDailyUlcerAssessment)
r.get('/ipd/admissions/:encounterId/daily-ulcer-assessments', IpdSysExam.listDailyUlcerAssessments)
r.get('/ipd/daily-ulcer-assessments/:id', IpdSysExam.getDailyUlcerAssessment)
r.put('/ipd/daily-ulcer-assessments/:id', IpdSysExam.updateDailyUlcerAssessment)
r.delete('/ipd/daily-ulcer-assessments/:id', IpdSysExam.deleteDailyUlcerAssessment)

// IPD NICU Evaluation (dedicated model)
r.post('/ipd/admissions/:encounterId/nicu-evaluations', IpdSysExam.createNicuEvaluation)
r.get('/ipd/admissions/:encounterId/nicu-evaluations', IpdSysExam.listNicuEvaluations)
r.get('/ipd/nicu-evaluations/:id', IpdSysExam.getNicuEvaluation)
r.put('/ipd/nicu-evaluations/:id', IpdSysExam.updateNicuEvaluation)
r.delete('/ipd/nicu-evaluations/:id', IpdSysExam.deleteNicuEvaluation)

// IPD New Born Baby Notes (dedicated model)
r.post('/ipd/admissions/:encounterId/newborn-baby-notes', IpdSysExam.createNewBornBabyNotes)
r.get('/ipd/admissions/:encounterId/newborn-baby-notes', IpdSysExam.listNewBornBabyNotes)
r.get('/ipd/newborn-baby-notes/:id', IpdSysExam.getNewBornBabyNotes)
r.put('/ipd/newborn-baby-notes/:id', IpdSysExam.updateNewBornBabyNotes)
r.delete('/ipd/newborn-baby-notes/:id', IpdSysExam.deleteNewBornBabyNotes)

// ── Indoor Pharmacy Integration ──
// IPD / ER Pharmacy Integration (dispense + auto-billing)
r.post('/pharmacy/integration/dispense', IPDPharmacyIntegration.dispenseAndAddToBill)
r.get('/pharmacy/integration/charges/:encounterId', IPDPharmacyIntegration.getPharmacyChargesByEncounter)
r.post('/pharmacy/integration/void-charge', IPDPharmacyIntegration.voidPharmacyCharge)
r.post('/pharmacy/integration/return', IPDPharmacyIntegration.processMedicationReturn)
r.get('/pharmacy/integration/admin-log/:encounterId', IPDPharmacyIntegration.getMedicationAdministrationLog)
r.post('/pharmacy/integration/admin-log/:dispenseId', IPDPharmacyIntegration.logMedicationAdministration)

// OT Pharmacy Requests
r.post('/ot-pharmacy/requests', OtPharmacy.requestOTMedications)
r.get('/ot-pharmacy/requests', OtPharmacy.getOTPharmacyRequests)
r.get('/ot-pharmacy/requests/schedule/:scheduleId', OtPharmacy.getOTPharmacyRequests)
r.patch('/ot-pharmacy/requests/:id/approve', OtPharmacy.approveOTRequest)
r.patch('/ot-pharmacy/requests/:id/dispense', OtPharmacy.dispenseToOT)
r.patch('/ot-pharmacy/requests/:id/consume', OtPharmacy.consumeOTMedication)
r.patch('/ot-pharmacy/requests/:id/return', OtPharmacy.returnOTMedications)

// Indoor Order Queue
r.get('/indoor-pharmacy/orders', IndoorOrderQueue.getPendingOrders)
r.get('/indoor-pharmacy/orders/encounter/:encounterId', IndoorOrderQueue.getOrdersByEncounter)
r.get('/indoor-pharmacy/orders/ward/:wardId', IndoorOrderQueue.getOrdersByWard)
r.get('/indoor-pharmacy/orders/bed/:bedNumber', IndoorOrderQueue.getOrdersByBed)
r.post('/indoor-pharmacy/orders', IndoorOrderQueue.createOrderFromEPrescription)
r.patch('/indoor-pharmacy/orders/:id/status', IndoorOrderQueue.updateOrderStatus)
r.patch('/indoor-pharmacy/orders/:id/assign', IndoorOrderQueue.assignOrderToPharmacist)
r.patch('/indoor-pharmacy/orders/:id/deliver', IndoorOrderQueue.markOrderDelivered)
r.get('/indoor-pharmacy/queue-stats', IndoorOrderQueue.getQueueStats)

// Nurse Portal
import * as Nurse from '../controllers/nurse.controller'
import * as NurseTask from '../controllers/nurseTask.controller'
import * as NurseShift from '../controllers/nurseShift.controller'
import * as NursePerformance from '../controllers/nursePerformance.controller'

// Nurse Profile Management (Admin only for create/update/delete)
r.post('/nurses', auth, Nurse.createProfile)
r.get('/nurses', auth, Nurse.listProfiles)
r.get('/nurses/:id', auth, Nurse.getProfile)
r.get('/nurses/user/:userId', auth, Nurse.getProfileByUserId)
r.put('/nurses/:id', auth, Nurse.updateProfile)
r.delete('/nurses/:id', auth, Nurse.deleteProfile)
r.get('/nurses/available/list', auth, Nurse.getAvailableNurses)
r.get('/nurses/by-ward/:ward', auth, Nurse.getNursesByWard)

// Nurse Dashboard
r.get('/nurse/dashboard', auth, Nurse.getDashboardStats)
r.get('/nurse-admin/dashboard', auth, Nurse.getNurseAdminDashboard)

// Nurse Tasks
r.post('/nurse-tasks', auth, NurseTask.createTask)
r.post('/nurse-tasks/bulk', auth, NurseTask.bulkCreateTasks)
r.get('/nurse-tasks', auth, NurseTask.listTasks)
r.get('/nurse-tasks/pending', auth, NurseTask.getPendingTasks)
r.get('/nurse-tasks/overdue', auth, NurseTask.getOverdueTasks)
r.get('/nurse-tasks/:id', auth, NurseTask.getTask)
r.get('/nurse-tasks/task-id/:taskId', auth, NurseTask.getTaskByTaskId)
r.get('/nurse-tasks/patient/:patientId', auth, NurseTask.getPatientTasks)
r.put('/nurse-tasks/:id/accept', auth, NurseTask.acceptTask)
r.put('/nurse-tasks/:id/start', auth, NurseTask.startTask)
r.put('/nurse-tasks/:id/complete', auth, NurseTask.completeTask)
r.put('/nurse-tasks/:id/cancel', auth, NurseTask.cancelTask)
r.put('/nurse-tasks/:id/reassign', auth, NurseTask.reassignTask)

// Nurse Shifts
r.post('/nurse-shifts', auth, NurseShift.createShift)
r.get('/nurse-shifts', auth, NurseShift.listShifts)
r.get('/nurse-shifts/:id', auth, NurseShift.getShift)
r.put('/nurse-shifts/:id', auth, NurseShift.updateShift)
r.delete('/nurse-shifts/:id', auth, NurseShift.deleteShift)
r.put('/nurse-shifts/:id/checkin', auth, NurseShift.checkIn)
r.put('/nurse-shifts/:id/checkout', auth, NurseShift.checkOut)
r.put('/nurse-shifts/:id/handover-give', auth, NurseShift.giveHandover)
r.put('/nurse-shifts/:id/handover-receive', auth, NurseShift.receiveHandover)
r.get('/nurse-shifts/current/my', auth, NurseShift.getCurrentShift)
r.get('/nurse-shifts/my/list', auth, NurseShift.getMyShifts)
r.get('/nurse-shifts/ward/schedule', auth, NurseShift.getWardSchedule)

// Nurse Performance
r.post('/nurse-performance/calculate', auth, NursePerformance.calculatePerformance)
r.get('/nurse-performance/:nurseId', auth, NursePerformance.getPerformance)
r.get('/nurse-performance/my/performance', auth, NursePerformance.getMyPerformance)
r.put('/nurse-performance/:id/supervisor-rating', auth, NursePerformance.updateSupervisorRating)
r.get('/nurse-performance/leaderboard/list', auth, NursePerformance.getLeaderboard)
r.get('/nurse-performance/department/summary', auth, NursePerformance.getDepartmentSummary)

export default r
