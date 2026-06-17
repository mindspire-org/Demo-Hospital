import { BiometricEvent } from '../models/BiometricEvent'
import { BiometricMapping } from '../models/BiometricMapping'
import { HospitalAttendance } from '../../hospital/models/Attendance'
import { HospitalStaff } from '../../hospital/models/Staff'
import { HospitalShift } from '../../hospital/models/Shift'

type RawBiometricPayload = Record<string, unknown>

type MappingDoc = {
  staffId: unknown
}

type StaffDoc = {
  shiftId?: unknown
}

type ShiftDoc = {
  _id: unknown
  start: string
  end: string
}

type AttendanceDoc = {
  _id: unknown
  staffId: string
  date: string
  shiftId?: unknown
  clockIn?: string
  clockOut?: string
}

function dateIsoLocal(d: Date){
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2,'0')
  const day = String(d.getDate()).padStart(2,'0')
  return `${y}-${m}-${day}`
}

function hhmmLocal(d: Date){
  const hh = String(d.getHours()).padStart(2,'0')
  const mm = String(d.getMinutes()).padStart(2,'0')
  return `${hh}:${mm}`
}

function toMinutes(hhmm: string) {
  const [h, m] = hhmm.split(':').map(Number)
  return h * 60 + m
}

export type ProcessBiometricEventInput = {
  deviceId: string
  enrollId: string
  timestamp: Date
  raw?: RawBiometricPayload
}

export async function processBiometricEvent(input: ProcessBiometricEventInput){
  const ts = input.timestamp
  console.log('[biometric] Processing event:', { deviceId: input.deviceId, enrollId: input.enrollId, ts: ts?.toISOString() })
  
  if (!input.deviceId || !input.enrollId || !(ts instanceof Date) || Number.isNaN(ts.getTime())) {
    console.log('[biometric] Invalid payload:', { deviceId: input.deviceId, enrollId: input.enrollId, ts })
    return { ok: false as const, reason: 'invalid_payload' as const }
  }

  const date = dateIsoLocal(ts)
  const time = hhmmLocal(ts)
  const timeMin = toMinutes(time)
  console.log('[biometric] Parsed date/time:', { date, time, timeMin })

  const mapping = (await BiometricMapping.findOne({ deviceId: input.deviceId, enrollId: input.enrollId, active: true }).lean()) as MappingDoc | null
  if (!mapping) {
    console.log('[biometric] No mapping found for enrollId:', input.enrollId)
    try {
      await BiometricEvent.create({
        deviceId: input.deviceId,
        enrollId: input.enrollId,
        timestamp: ts,
        date,
        time,
        type: 'unknown_enroll',
        raw: input.raw,
      })
    } catch {}
    return { ok: true as const, mapped: false as const }
  }

  const staffId = String(mapping.staffId)
  const staff = (await HospitalStaff.findById(staffId).lean()) as StaffDoc | null
  if (!staff) return { ok: false, reason: 'staff_not_found' }
  
  const staffShiftId = staff?.shiftId ? String(staff.shiftId) : ''

  // Determine event type from machine if available
  let machineType: 'in' | 'out' | null = null
  const raw: RawBiometricPayload = input.raw || {}
  
  // ZK Device states:
  // inOutState: 0=Check-In, 1=Check-Out, 2=Break-Out, 3=Break-In, 4=OT-In, 5=OT-Out
  
  const rawType = raw.inOutState ?? raw.type ?? raw.attType ?? raw.state ?? raw.status
  const t = String(rawType ?? '')
  
  // Many ZK devices use 0/4 for IN and 1/5 for OUT
  if (t === '0' || t === '4' || t.toLowerCase() === 'in') machineType = 'in'
  else if (t === '1' || t === '5' || t.toLowerCase() === 'out') machineType = 'out'

  console.log('[biometric] machineType detected:', { machineType, rawType, inOutState: raw.inOutState, keys: Object.keys(raw) })

  // Shift selection logic:
  // 1. Fetch all available shifts
  // 2. Find the shift that the current scan time falls into
  // 3. This allows staff to work different shifts than their "default" one
  const allShifts = ((await HospitalShift.find().lean()) as unknown as ShiftDoc[])
    .filter(s => typeof s?.start === 'string' && typeof s?.end === 'string')
  let bestShiftId = staffShiftId

  if (allShifts.length > 0) {
    // Find a shift where current time is between start and end (handling overnight)
    const matchingShifts = allShifts.filter(s => {
      const sMin = toMinutes(s.start)
      const eMin = toMinutes(s.end)
      if (sMin < eMin) {
        // Normal shift (e.g. 8am - 4pm)
        // We expand the window a bit to catch early clock-ins or late clock-outs
        return timeMin >= sMin - 120 && timeMin <= eMin + 120
      } else {
        // Overnight shift (e.g. 10pm - 8am)
        return timeMin >= sMin - 120 || timeMin <= eMin + 120
      }
    })

    if (matchingShifts.length > 0) {
      // If multiple matches, pick the one closest to start or end
      matchingShifts.sort((a, b) => {
        const da = Math.min(Math.abs(timeMin - toMinutes(a.start)), Math.abs(timeMin - toMinutes(a.end)))
        const db = Math.min(Math.abs(timeMin - toMinutes(b.start)), Math.abs(timeMin - toMinutes(b.end)))
        return da - db
      })
      bestShiftId = String(matchingShifts[0]._id)
    }
  }

  const selectedShift = allShifts.find(s => String(s._id) === bestShiftId)
  const isOvernight = selectedShift && toMinutes(selectedShift.start) > toMinutes(selectedShift.end)

  // Attendance lookup: handle overnight shifts
  let att: AttendanceDoc | null = null
  let attendanceKey: Record<string, unknown> = { staffId, date, shiftId: bestShiftId }
  
  const yesterday = new Date(ts.getTime() - 24 * 60 * 60 * 1000)
  const yesterdayDate = dateIsoLocal(yesterday)

  // Overnight clock-out detection:
  // If it's early morning and we are clocking out (or unknown), check if there's an open record from yesterday
  if (isOvernight && (machineType === 'out' || !machineType)) {
    const eMin = toMinutes(selectedShift.end)
    
    // If current time is "after midnight" part of the overnight shift
    if (timeMin <= eMin + 120) {
      const prevAtt = (await HospitalAttendance.findOne({ staffId, date: yesterdayDate, shiftId: bestShiftId }).lean()) as AttendanceDoc | null
      if (prevAtt && prevAtt.clockIn && !prevAtt.clockOut) {
        console.log('[biometric] Found open overnight attendance from yesterday:', yesterdayDate)
        att = prevAtt
        attendanceKey = { _id: prevAtt._id }
      }
    }
  }

  if (!att) {
    att = (await HospitalAttendance.findOne({ staffId, date, shiftId: bestShiftId }).lean()) as AttendanceDoc | null
    if (!att && !bestShiftId) {
      // Fallback for no-shift-assigned
      att = (await HospitalAttendance.findOne({ staffId, date }).lean()) as AttendanceDoc | null
      if (att) attendanceKey = { _id: att._id }
    }
  }

  let eventType: 'check_in'|'check_out' = 'check_in'
  const update: Record<string, unknown> = { staffId, date: att?.date || date, status: 'present' }
  if (bestShiftId) update.shiftId = bestShiftId
  
  console.log('[biometric] Determining event type:', { machineType, hasAtt: !!att, hasClockIn: !!att?.clockIn, hasClockOut: !!att?.clockOut })
  
  let ignored = false
  if (machineType === 'in') {
    if (att?.clockIn) {
      console.log('[biometric] Clock-in already exists, ignoring')
      ignored = true
      eventType = 'check_in'
    } else {
      update.clockIn = time
      eventType = 'check_in'
    }
  } else if (machineType === 'out') {
    if (att?.clockOut) {
      console.log('[biometric] Clock-out already exists, ignoring')
      ignored = true
      eventType = 'check_out'
    } else {
      update.clockOut = time
      eventType = 'check_out'
    }
  } else {
    // Fallback logic if machineType is unknown
    if (!att || !att.clockIn) {
      update.clockIn = time
      eventType = 'check_in'
    } else {
      const diffMin = timeMin - toMinutes(att.clockIn)
      if (diffMin < 30 && diffMin >= 0) {
        console.log('[biometric] Duplicate scan (within 30min), ignoring')
        ignored = true
        eventType = 'check_in'
      } else if (att.clockOut) {
        ignored = true
        eventType = 'check_out'
      } else {
        update.clockOut = time
        eventType = 'check_out'
      }
    }
  }

  if (ignored) {
    try {
      await BiometricEvent.create({ deviceId: input.deviceId, enrollId: input.enrollId, staffId, timestamp: ts, date, time, type: 'ignored_duplicate', raw: input.raw })
    } catch {}
    return { ok: true as const, mapped: true as const, ignored: true as const }
  }

  const updateResult = await HospitalAttendance.findOneAndUpdate(attendanceKey, { $set: update }, { new: true, upsert: true })
  console.log('[biometric] Attendance update result:', { success: !!updateResult, _id: updateResult?._id })

  try {
    await BiometricEvent.create({ deviceId: input.deviceId, enrollId: input.enrollId, staffId, timestamp: ts, date, time, type: eventType, raw: input.raw })
  } catch {}

  return { ok: true as const, mapped: true as const, type: eventType }
}
