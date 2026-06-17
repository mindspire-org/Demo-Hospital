import { Schema, model } from 'mongoose'

export interface ShiftTimeSlot {
  shiftType: 'morning' | 'evening' | 'night' | 'custom'
  shiftName: string
  startTime: string // HH:mm format
  endTime: string   // HH:mm format
  active: boolean
}

export interface ShiftSettingsDoc {
  _id: string
  mode: 'auto' | 'manual'
  timeSlots: ShiftTimeSlot[]
  allowMultipleShiftsPerDay: boolean
  autoCloseReminder: boolean // remind before auto close
  reminderMinutes: number   // minutes before auto close
  gracePeriodMinutes: number // grace period for late close
  createdAt: Date
  updatedAt: Date
}

const ShiftTimeSlotSchema = new Schema<ShiftTimeSlot>({
  shiftType: { type: String, enum: ['morning', 'evening', 'night', 'custom'], required: true },
  shiftName: { type: String, required: true },
  startTime: { type: String, required: true, match: /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/ },
  endTime: { type: String, required: true, match: /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/ },
  active: { type: Boolean, default: true }
}, { _id: false })

const ShiftSettingsSchema = new Schema<ShiftSettingsDoc>({
  mode: { type: String, enum: ['auto', 'manual'], default: 'manual' },
  timeSlots: [ShiftTimeSlotSchema],
  allowMultipleShiftsPerDay: { type: Boolean, default: true },
  autoCloseReminder: { type: Boolean, default: true },
  reminderMinutes: { type: Number, default: 15 },
  gracePeriodMinutes: { type: Number, default: 30 }
}, {
  timestamps: true,
  collection: 'finance_shift_settings'
})

export const ShiftSettings = model<ShiftSettingsDoc>('ShiftSettings', ShiftSettingsSchema)
export default ShiftSettings
