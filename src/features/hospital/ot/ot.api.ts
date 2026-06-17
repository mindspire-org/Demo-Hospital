/**
 * OT (Operation Theater) API Module
 * 
 * Handles OT operations:
 * - Rooms, Bookings, Scheduling
 * - Team Assignments, Equipment
 * - Sterilization, Reports
 */

import { api, withQuery } from '../../../api'

export const otApi = {
  // -------------------------------------------------------------------------
  // OT Rooms
  // -------------------------------------------------------------------------
  listOTRooms: (params?: { status?: 'available' | 'occupied' | 'maintenance'; type?: string; q?: string; page?: number; limit?: number }) =>
    api(withQuery('/hospital/ot/rooms', params)),
  createOTRoom: (data: { name: string; type?: string; status?: 'available' | 'occupied' | 'maintenance'; equipment?: string[]; notes?: string }) =>
    api('/hospital/ot/rooms', { method: 'POST', body: JSON.stringify(data) }),
  updateOTRoom: (id: string, data: { name?: string; type?: string; status?: 'available' | 'occupied' | 'maintenance'; equipment?: string[]; notes?: string }) =>
    api(`/hospital/ot/rooms/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteOTRoom: (id: string) =>
    api(`/hospital/ot/rooms/${id}`, { method: 'DELETE' }),

  // -------------------------------------------------------------------------
  // OT Bookings / Surgery Schedule
  // -------------------------------------------------------------------------
  listOTBookings: (params?: { 
    status?: 'scheduled' | 'in-progress' | 'completed' | 'cancelled' | 'postponed';
    roomId?: string;
    surgeonId?: string;
    encounterId?: string;
    patientId?: string;
    from?: string;
    to?: string;
    date?: string;
    priority?: 'routine' | 'urgent' | 'emergency';
    q?: string;
    page?: number;
    limit?: number;
  }) => api(withQuery('/hospital/ot/bookings', params)),
  
  createOTBooking: (data: {
    encounterId?: string;
    procedure: string;
    procedureCode?: string;
    surgeryType?: 'major' | 'minor' | 'emergency';
    roomId?: string;
    surgeonId?: string;
    anesthesiologistId?: string;
    scheduledAt?: string;
    estimatedDuration?: number;
    priority?: 'routine' | 'urgent' | 'emergency';
    status?: 'scheduled' | 'in-progress' | 'completed' | 'cancelled' | 'postponed';
    anesthesiaType?: 'general' | 'spinal' | 'epidural' | 'local' | 'regional' | 'sedation' | 'none';
    notes?: string;
    referredFrom?: 'ipd' | 'er' | 'manual';
    team?: Array<{ staffId: string; role: 'surgeon' | 'assistant-surgeon' | 'anesthesiologist' | 'anesthesia-tech' | 'scrub-nurse' | 'circulating-nurse' | 'ot-technician' }>;
    // Manual patient entry
    patientData?: {
      fullName?: string;
      mrNumber?: string;
      age?: number;
      gender?: 'male' | 'female' | 'other';
      contact?: string;
      allergies?: string;
      comorbidities?: string;
    };
    // Case context
    caseContext?: {
      diagnosis?: string;
      consultingDoctor?: string;
    };
    // Equipment & implants
    equipment?: {
      requiredEquipment?: string;
      implants?: string;
    };
    // Anesthesia details
    anesthesiaDetails?: {
      asaClass?: 'ASA-I' | 'ASA-II' | 'ASA-III' | 'ASA-IV' | 'ASA-V' | 'ASA-VI';
      fastingStatus?: string;
      notes?: string;
    };
    // Pre-operative checklist
    preOpChecklist?: {
      consentSigned?: boolean;
      consentDate?: string;
      labReportsAvailable?: boolean;
      bloodArranged?: boolean;
      bloodUnits?: string;
      imagingAttached?: boolean;
      imagingTypes?: string[];
      surgicalSiteMarked?: boolean;
      preOpAssessmentDone?: boolean;
      npoVerified?: boolean;
    };
    // Post-operative plan
    postOpPlan?: {
      destination?: 'ward' | 'icu' | 'hdu' | 'recovery';
      instructions?: string;
      expectedComplications?: string;
    };
  }) => api('/hospital/ot/bookings', { method: 'POST', body: JSON.stringify(data) }),
  
  updateOTBooking: (id: string, data: {
    procedure?: string;
    procedureCode?: string;
    roomId?: string;
    surgeonId?: string;
    anesthesiologistId?: string;
    scheduledAt?: string;
    estimatedDuration?: number;
    priority?: 'routine' | 'urgent' | 'emergency';
    anesthesiaType?: 'general' | 'spinal' | 'epidural' | 'local' | 'regional' | 'sedation' | 'none';
    status?: 'scheduled' | 'in-progress' | 'completed' | 'cancelled' | 'postponed';
    notes?: string;
    actualStart?: string;
    actualEnd?: string;
    findings?: string;
    complications?: string;
  }) => api(`/hospital/ot/bookings/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  
  deleteOTBooking: (id: string) =>
    api(`/hospital/ot/bookings/${id}`, { method: 'DELETE' }),
  
  getOTBookingById: (id: string) =>
    api(`/hospital/ot/bookings/${id}`),

  // -------------------------------------------------------------------------
  // OT Team Members
  // -------------------------------------------------------------------------
  listOTTeamMembers: (bookingId: string) =>
    api(`/hospital/ot/bookings/${bookingId}/team`),
  
  addOTTeamMember: (bookingId: string, data: { staffId: string; role: 'surgeon' | 'assistant-surgeon' | 'anesthesiologist' | 'anesthesia-tech' | 'scrub-nurse' | 'circulating-nurse' | 'ot-technician' }) =>
    api(`/hospital/ot/bookings/${bookingId}/team`, { method: 'POST', body: JSON.stringify(data) }),
  
  removeOTTeamMember: (bookingId: string, staffId: string) =>
    api(`/hospital/ot/bookings/${bookingId}/team/${staffId}`, { method: 'DELETE' }),

  // -------------------------------------------------------------------------
  // OT Sterilization Logs
  // -------------------------------------------------------------------------
  listOTSterilizations: (params?: { status?: 'pending' | 'in-progress' | 'completed' | 'failed'; from?: string; to?: string; page?: number; limit?: number }) =>
    api(withQuery('/hospital/ot/sterilizations', params)),
  
  createOTSterilization: (data: {
    cycleNumber?: string;
    type?: 'autoclave' | 'eto' | 'plasma' | 'dry-heat';
    startedAt?: string;
    temperature?: number;
    pressure?: number;
    duration?: number;
    items?: string[];
    operatorId?: string;
    notes?: string;
  }) => api('/hospital/ot/sterilizations', { method: 'POST', body: JSON.stringify(data) }),
  
  updateOTSterilization: (id: string, data: {
    cycleNumber?: string;
    type?: 'autoclave' | 'eto' | 'plasma' | 'dry-heat';
    status?: 'pending' | 'in-progress' | 'completed' | 'failed';
    startedAt?: string;
    completedAt?: string;
    temperature?: number;
    pressure?: number;
    duration?: number;
    items?: string[];
    operatorId?: string;
    verifiedBy?: string;
    notes?: string;
  }) => api(`/hospital/ot/sterilizations/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  
  deleteOTSterilization: (id: string) =>
    api(`/hospital/ot/sterilizations/${id}`, { method: 'DELETE' }),

  // -------------------------------------------------------------------------
  // OT Equipment
  // -------------------------------------------------------------------------
  listOTEquipment: (params?: { status?: 'available' | 'in-use' | 'maintenance' | 'retired'; roomId?: string; q?: string; page?: number; limit?: number }) =>
    api(withQuery('/hospital/ot/equipment', params)),
  
  createOTEquipment: (data: {
    name: string;
    code?: string;
    roomId?: string;
    status?: 'available' | 'in-use' | 'maintenance' | 'retired';
    manufacturer?: string;
    model?: string;
    serialNumber?: string;
    purchaseDate?: string;
    warrantyExpiry?: string;
    lastMaintenance?: string;
    nextMaintenance?: string;
    notes?: string;
  }) => api('/hospital/ot/equipment', { method: 'POST', body: JSON.stringify(data) }),
  
  updateOTEquipment: (id: string, data: {
    name?: string;
    code?: string;
    roomId?: string;
    status?: 'available' | 'in-use' | 'maintenance' | 'retired';
    manufacturer?: string;
    model?: string;
    serialNumber?: string;
    purchaseDate?: string;
    warrantyExpiry?: string;
    lastMaintenance?: string;
    nextMaintenance?: string;
    notes?: string;
  }) => api(`/hospital/ot/equipment/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  
  deleteOTEquipment: (id: string) =>
    api(`/hospital/ot/equipment/${id}`, { method: 'DELETE' }),

  // -------------------------------------------------------------------------
  // OT Reports
  // -------------------------------------------------------------------------
  getOTStatistics: (params?: { from?: string; to?: string }) =>
    api(withQuery('/hospital/ot/statistics', params)),
  
  getOTSurgeryReport: (params?: { from?: string; to?: string; surgeonId?: string; status?: string }) =>
    api(withQuery('/hospital/ot/reports/surgeries', params)),

  // -------------------------------------------------------------------------
  // OT Procedures
  // -------------------------------------------------------------------------
  listOTProcedures: (params?: { code?: string; q?: string; page?: number; limit?: number }) =>
    api(withQuery('/hospital/ot/procedures', params)),
  
  getOTProcedureById: (id: string) =>
    api(`/hospital/ot/procedures/${id}`),
  
  createOTProcedure: (data: {
    name: string;
    code?: string;
    description?: string;
    estimatedDuration?: number;
    requiredEquipment?: string[];
    requiredStaff?: Array<{ role: string; count: number }>;
    anesthesiaTypes?: string[];
    specialInstructions?: string;
    price?: number;
  }) => api('/hospital/ot/procedures', { method: 'POST', body: JSON.stringify(data) }),
  
  updateOTProcedure: (id: string, data: {
    name?: string;
    code?: string;
    description?: string;
    estimatedDuration?: number;
    requiredEquipment?: string[];
    requiredStaff?: Array<{ role: string; count: number }>;
    anesthesiaTypes?: string[];
    specialInstructions?: string;
    price?: number;
  }) => api(`/hospital/ot/procedures/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  
  deleteOTProcedure: (id: string) =>
    api(`/hospital/ot/procedures/${id}`, { method: 'DELETE' }),

  // -------------------------------------------------------------------------
  // SSI Tracking (CDC NHSN Surveillance)
  // -------------------------------------------------------------------------
  getOTSSITracking: (params?: { from?: string; to?: string; ssiDetected?: boolean; limit?: number }) =>
    api(withQuery('/hospital/ot/ssi-tracking', params)),
  
  createOTSSITracking: (data: {
    bookingId: string
    encounterId: string
    patientId: string
    procedure: string
    surgeryDate: string
    surgeonId?: string
    asaClass?: string
    woundClass?: string
    ssiDetected: boolean
    ssiDetectedAt?: string
    daysToDetection?: number
    ssiType?: 'superficial-incisional' | 'deep-incisional' | 'organ-space' | 'none'
    criteria?: any
    cultureDone?: boolean
    cultureResults?: string
    treatmentRequired?: boolean
    treatmentDetails?: string
    outcome?: string
    notes?: string
  }) => api('/hospital/ot/ssi-tracking', { method: 'POST', body: JSON.stringify(data) }),
  
  updateOTSSITracking: (id: string, data: any) =>
    api(`/hospital/ot/ssi-tracking/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
}

export default otApi
