/**
 * ICU (Intensive Care Unit) API Module
 * 
 * Handles ICU operations:
 * - Beds, Admissions, Transfers
 * - Monitoring, Scores (GCS, APACHE, SOFA)
 * - Ventilators, Reports
 */

import { api, withQuery } from '../../../api'

export const icuApi = {
  // -------------------------------------------------------------------------
  // ICU Beds
  // -------------------------------------------------------------------------
  listICUBeds: (params?: { status?: 'available' | 'occupied' | 'maintenance'; ventilatorAvailable?: boolean; q?: string; page?: number; limit?: number }) =>
    api(withQuery('/hospital/icu/beds', params)),
  
  createICUBed: (data: { name: string; type?: 'general' | 'surgical' | 'cardiac' | 'neonatal' | 'pediatric'; status?: 'available' | 'occupied' | 'maintenance'; ventilatorAvailable?: boolean; equipment?: string[]; notes?: string }) =>
    api('/hospital/icu/beds', { method: 'POST', body: JSON.stringify(data) }),
  
  updateICUBed: (id: string, data: { name?: string; type?: 'general' | 'surgical' | 'cardiac' | 'neonatal' | 'pediatric'; status?: 'available' | 'occupied' | 'maintenance'; ventilatorAvailable?: boolean; equipment?: string[]; notes?: string }) =>
    api(`/hospital/icu/beds/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  
  deleteICUBed: (id: string) =>
    api(`/hospital/icu/beds/${id}`, { method: 'DELETE' }),

  // -------------------------------------------------------------------------
  // ICU Admissions
  // -------------------------------------------------------------------------
  listICUAdmissions: (params?: {
    status?: 'active' | 'transferred' | 'discharged' | 'deceased';
    bedId?: string;
    encounterId?: string;
    patientId?: string;
    from?: string;
    to?: string;
    severity?: 'mild' | 'moderate' | 'severe' | 'critical';
    q?: string;
    page?: number;
    limit?: number;
  }) => api(withQuery('/hospital/icu/admissions', params)),
  
  createICUAdmission: (data: {
    encounterId: string;
    bedId?: string;
    admittedAt?: string;
    reason: string;
    severity?: 'mild' | 'moderate' | 'severe' | 'critical';
    ventilatorRequired?: boolean;
    referredFrom?: 'ipd' | 'er' | 'ot';
    attendingDoctorId?: string;
    primaryDiagnosis?: string;
    notes?: string;
  }) => api('/hospital/icu/admissions', { method: 'POST', body: JSON.stringify(data) }),
  
  updateICUAdmission: (id: string, data: {
    bedId?: string;
    status?: 'active' | 'transferred' | 'discharged' | 'deceased';
    severity?: 'mild' | 'moderate' | 'severe' | 'critical';
    ventilatorRequired?: boolean;
    attendingDoctorId?: string;
    primaryDiagnosis?: string;
    notes?: string;
    dischargedAt?: string;
    dischargeDestination?: 'ward' | 'home' | 'other-hospital' | 'deceased';
    dischargeSummary?: string;
  }) => api(`/hospital/icu/admissions/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  
  deleteICUAdmission: (id: string) =>
    api(`/hospital/icu/admissions/${id}`, { method: 'DELETE' }),
  
  getICUAdmissionById: (id: string) =>
    api(`/hospital/icu/admissions/${id}`),

  // -------------------------------------------------------------------------
  // ICU Monitoring (Flowsheet) - Linked to Encounter
  // -------------------------------------------------------------------------
  listICUFlowsheet: (encounterId: string, params?: { from?: string; to?: string; page?: number; limit?: number }) =>
    api(withQuery(`/hospital/icu/admissions/${encounterId}/flowsheet`, params)),

  createICUFlowsheetEntry: (encounterId: string, data: {
    recordedAt?: string;
    bp?: { systolic?: number; diastolic?: number };
    hr?: number;
    rr?: number;
    temp?: number;
    spo2?: number;
    gcs?: { eye?: number; verbal?: number; motor?: number; total?: number };
    pupils?: { left?: string; right?: string };
    painScore?: number;
    sedationScore?: number;
    intake?: { oral?: number; iv?: number; ng?: number; total?: number };
    output?: { urine?: number; drain?: number; emesis?: number; total?: number };
    cvp?: number;
    artLine?: number;
    ventilator?: { mode?: string; fio2?: number; peep?: number; tidalVolume?: number; rate?: number };
    notes?: string;
    recordedBy?: string;
    shift?: 'morning' | 'evening' | 'night';
  }) => api(`/hospital/icu/admissions/${encounterId}/flowsheet`, { method: 'POST', body: JSON.stringify(data) }),
  
  updateICUFlowsheetEntry: (id: string, data: any) =>
    api(`/hospital/icu/flowsheet/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  
  deleteICUFlowsheetEntry: (id: string) =>
    api(`/hospital/icu/flowsheet/${id}`, { method: 'DELETE' }),

  // -------------------------------------------------------------------------
  // ICU Scores (GCS, APACHE II, SOFA) - Linked to Encounter
  // -------------------------------------------------------------------------
  listICUScores: (encounterId: string, params?: { type?: 'gcs' | 'apache' | 'sofa'; from?: string; to?: string; page?: number; limit?: number }) =>
    api(withQuery(`/hospital/icu/admissions/${encounterId}/scores`, params)),

  createICUScore: (encounterId: string, data: {
    type: 'gcs' | 'apache' | 'sofa';
    recordedAt?: string;
    score: number;
    details?: any;
    calculatedBy?: string;
    notes?: string;
  }) => api(`/hospital/icu/admissions/${encounterId}/scores`, { method: 'POST', body: JSON.stringify(data) }),
  
  updateICUScore: (id: string, data: any) =>
    api(`/hospital/icu/scores/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  
  deleteICUScore: (id: string) =>
    api(`/hospital/icu/scores/${id}`, { method: 'DELETE' }),

  // -------------------------------------------------------------------------
  // ICU Ventilator Settings - Linked to Encounter (stored in flowsheet)
  // -------------------------------------------------------------------------
  listICUVentilatorSettings: (encounterId: string, params?: { page?: number; limit?: number }) =>
    api(withQuery(`/hospital/icu/admissions/${encounterId}/flowsheet`, params)),

  createICUVentilatorSetting: (encounterId: string, data: {
    recordedAt?: string;
    mode?: 'cmv' | 'ac' | 'simv' | 'psv' | 'cpap' | 'bipap' | 'prvc' | 'vcv' | 'pcv';
    fio2?: number;
    peep?: number;
    tidalVolume?: number;
    rate?: number;
    pressureSupport?: number;
    flowRate?: number;
    ieRatio?: string;
    pip?: number;
    plateauPressure?: number;
    minuteVolume?: number;
    notes?: string;
    setBy?: string;
  }) => api(`/hospital/icu/admissions/${encounterId}/flowsheet`, { method: 'POST', body: JSON.stringify(data) }),
  
  updateICUVentilatorSetting: (id: string, data: any) =>
    api(`/hospital/icu/ventilator/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  
  deleteICUVentilatorSetting: (id: string) =>
    api(`/hospital/icu/ventilator/${id}`, { method: 'DELETE' }),

  // -------------------------------------------------------------------------
  // ICU Reports (admission/mortality reports use statistics endpoint with filters)
  // -------------------------------------------------------------------------
  getICUStatistics: (params?: { from?: string; to?: string }) =>
    api(withQuery('/hospital/icu/statistics', params)),

  getICUAdmissionReport: (params?: { from?: string; to?: string; severity?: string }) =>
    api(withQuery('/hospital/icu/statistics', params)),

  getICUMortalityReport: (params?: { from?: string; to?: string }) =>
    api(withQuery('/hospital/icu/statistics', params)),
}

export default icuApi
