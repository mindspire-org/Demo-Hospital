import { useEffect, useState } from 'react'
import { hospitalApi } from '../utils/api'
import { fmtDateTime12 } from '../utils/timeFormat'

export interface EncounterDefaults {
  patientName: string
  mrn: string
  age: string
  gender: string
  address: string
  fatherName: string
  guardianRel: string
  bedLabel: string
  doctorName: string
  doctorId: string
  cnic: string
  contact: string
  panel: string
  doa: string
  encounter: any
}

const EMPTY: EncounterDefaults = {
  patientName: '', mrn: '', age: '', gender: '', address: '',
  fatherName: '', guardianRel: '', bedLabel: '', doctorName: '',
  doctorId: '', cnic: '', contact: '', panel: '', doa: '', encounter: null,
}

/**
 * Fetches the IPD admission once and returns patient/encounter defaults
 * so clinical form dialogs can auto-fill patient info.
 */
export function useEncounterDefaults(encounterId: string) {
  const [defaults, setDefaults] = useState<EncounterDefaults>(EMPTY)

  useEffect(() => {
    if (!encounterId) return
    let cancelled = false
    ;(async () => {
      try {
        const res = await hospitalApi.getIPDAdmissionById(encounterId) as any
        if (cancelled) return
        const enc = res?.encounter || null
        const p = enc?.patientId || {}
        setDefaults({
          patientName: String(p.fullName || p.name || ''),
          mrn: String(p.mrn || p.mrNumber || p.mrNo || p.mr || ''),
          age: String(p.age || ''),
          gender: String(p.gender || ''),
          address: String(p.address || ''),
          fatherName: String(p.fatherName || ''),
          guardianRel: String(p.guardianRel || ''),
          bedLabel: String(enc?.bedFullInfo || enc?.bedLabel || enc?.bedId || ''),
          doctorName: String(enc?.doctorId?.name || ''),
          doctorId: String(enc?.doctorId?._id || enc?.doctorId || ''),
          cnic: String(p.cnicNormalized || ''),
          contact: String(p.phoneNormalized || ''),
          panel: String(enc?.corporateCompanyName || enc?.panel || ''),
          doa: String(enc?.startAt ? fmtDateTime12(enc.startAt) : ''),
          encounter: enc,
        })
      } catch {
        if (!cancelled) setDefaults(EMPTY)
      }
    })()
    return () => { cancelled = true }
  }, [encounterId])

  return defaults
}
