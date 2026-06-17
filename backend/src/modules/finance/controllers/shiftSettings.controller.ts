import { Request, Response } from 'express'
import { ShiftSettings } from '../models/ShiftSettings'

export const getShiftSettings = async (req: Request, res: Response) => {
  try {
    let settings = await ShiftSettings.findOne().sort({ updatedAt: -1 })
    if (!settings) {
      // Create default settings
      settings = await ShiftSettings.create({
        mode: 'manual',
        timeSlots: [
          { shiftType: 'morning', shiftName: 'Morning Shift', startTime: '08:00', endTime: '16:00', active: true },
          { shiftType: 'evening', shiftName: 'Evening Shift', startTime: '16:00', endTime: '00:00', active: true },
          { shiftType: 'night', shiftName: 'Night Shift', startTime: '00:00', endTime: '08:00', active: true }
        ],
        allowMultipleShiftsPerDay: true,
        autoCloseReminder: true,
        reminderMinutes: 15,
        gracePeriodMinutes: 30
      })
    }
    res.json({ settings })
  } catch (error: any) {
    res.status(500).json({ error: error.message })
  }
}

export const updateShiftSettings = async (req: Request, res: Response) => {
  try {
    const { mode, timeSlots, allowMultipleShiftsPerDay, autoCloseReminder, reminderMinutes, gracePeriodMinutes } = req.body

    let settings = await ShiftSettings.findOne().sort({ updatedAt: -1 })

    if (!settings) {
      settings = await ShiftSettings.create({
        mode: mode || 'manual',
        timeSlots: timeSlots || [],
        allowMultipleShiftsPerDay: allowMultipleShiftsPerDay !== undefined ? allowMultipleShiftsPerDay : true,
        autoCloseReminder: autoCloseReminder !== undefined ? autoCloseReminder : true,
        reminderMinutes: reminderMinutes || 15,
        gracePeriodMinutes: gracePeriodMinutes || 30
      })
    } else {
      if (mode) settings.mode = mode
      if (timeSlots) settings.timeSlots = timeSlots
      if (allowMultipleShiftsPerDay !== undefined) settings.allowMultipleShiftsPerDay = allowMultipleShiftsPerDay
      if (autoCloseReminder !== undefined) settings.autoCloseReminder = autoCloseReminder
      if (reminderMinutes !== undefined) settings.reminderMinutes = reminderMinutes
      if (gracePeriodMinutes !== undefined) settings.gracePeriodMinutes = gracePeriodMinutes
      await settings.save()
    }

    res.json({ settings })
  } catch (error: any) {
    res.status(500).json({ error: error.message })
  }
}

export const getCurrentShiftTimeSlot = async (req: Request, res: Response) => {
  try {
    const settings = await ShiftSettings.findOne().sort({ updatedAt: -1 })
    if (!settings || settings.mode !== 'auto') {
      return res.json({ currentSlot: null, message: 'Auto mode not enabled' })
    }

    const now = new Date()
    const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
    const currentMinutes = now.getHours() * 60 + now.getMinutes()

    const activeSlot = settings.timeSlots.find(slot => {
      if (!slot.active) return false
      const [startH, startM] = slot.startTime.split(':').map(Number)
      const [endH, endM] = slot.endTime.split(':').map(Number)
      const startMinutes = startH * 60 + startM
      const endMinutes = endH * 60 + endM

      if (startMinutes <= endMinutes) {
        return currentMinutes >= startMinutes && currentMinutes < endMinutes
      } else {
        // Crosses midnight (e.g., 22:00 - 06:00)
        return currentMinutes >= startMinutes || currentMinutes < endMinutes
      }
    })

    res.json({
      currentSlot: activeSlot || null,
      currentTime,
      mode: settings.mode,
      allowMultipleShiftsPerDay: settings.allowMultipleShiftsPerDay
    })
  } catch (error: any) {
    res.status(500).json({ error: error.message })
  }
}
