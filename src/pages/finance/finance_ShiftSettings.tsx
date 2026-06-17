import { useState, useEffect } from 'react'
import {
  Settings, Clock, Sunrise, Sunset, Moon, Plus, Trash2,
  Save, ToggleLeft, ToggleRight, RefreshCw
} from 'lucide-react'
import financeApi from '../../features/finance/finance.api'

interface TimeSlot {
  _id?: string
  shiftType: 'morning' | 'evening' | 'night' | 'custom'
  shiftName: string
  startTime: string
  endTime: string
  active: boolean
}

interface ShiftSettingsData {
  mode: 'auto' | 'manual'
  timeSlots: TimeSlot[]
  allowMultipleShiftsPerDay: boolean
  autoCloseReminder: boolean
  reminderMinutes: number
  gracePeriodMinutes: number
}

const DEFAULT_SLOTS: TimeSlot[] = [
  { shiftType: 'morning', shiftName: 'Morning Shift', startTime: '08:00', endTime: '16:00', active: true },
  { shiftType: 'evening', shiftName: 'Evening Shift', startTime: '16:00', endTime: '00:00', active: true },
  { shiftType: 'night', shiftName: 'Night Shift', startTime: '00:00', endTime: '08:00', active: true }
]

const TYPE_ICONS = {
  morning: Sunrise,
  evening: Sunset,
  night: Moon,
  custom: Clock
}

export default function Finance_ShiftSettings() {
  const [settings, setSettings] = useState<ShiftSettingsData>({
    mode: 'manual',
    timeSlots: [...DEFAULT_SLOTS],
    allowMultipleShiftsPerDay: true,
    autoCloseReminder: true,
    reminderMinutes: 15,
    gracePeriodMinutes: 30
  })
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [message, setMessage] = useState('')

  useEffect(() => {
    loadSettings()
  }, [])

  const loadSettings = async () => {
    try {
      setIsLoading(true)
      const result = await financeApi.getShiftSettings()
      if (result.settings) {
        setSettings({
          mode: result.settings.mode || 'manual',
          timeSlots: result.settings.timeSlots?.length
            ? result.settings.timeSlots
            : [...DEFAULT_SLOTS],
          allowMultipleShiftsPerDay: result.settings.allowMultipleShiftsPerDay ?? true,
          autoCloseReminder: result.settings.autoCloseReminder ?? true,
          reminderMinutes: result.settings.reminderMinutes || 15,
          gracePeriodMinutes: result.settings.gracePeriodMinutes || 30
        })
      }
    } catch (error) {
      console.error('Failed to load settings:', error)
      alert('Failed to load shift settings')
    } finally {
      setIsLoading(false)
    }
  }

  const handleSave = async () => {
    setIsSaving(true)
    setMessage('')
    try {
      await financeApi.updateShiftSettings(settings)
      setMessage('Settings saved successfully!')
      setTimeout(() => setMessage(''), 3000)
    } catch (error: any) {
      alert(error?.message || 'Failed to save settings')
    } finally {
      setIsSaving(false)
    }
  }

  const updateSlot = (index: number, updates: Partial<TimeSlot>) => {
    setSettings(s => ({
      ...s,
      timeSlots: s.timeSlots.map((slot, i) => i === index ? { ...slot, ...updates } : slot)
    }))
  }

  const addSlot = () => {
    setSettings(s => ({
      ...s,
      timeSlots: [...s.timeSlots, {
        shiftType: 'custom',
        shiftName: 'Custom Shift',
        startTime: '09:00',
        endTime: '17:00',
        active: true
      }]
    }))
  }

  const removeSlot = (index: number) => {
    setSettings(s => ({
      ...s,
      timeSlots: s.timeSlots.filter((_, i) => i !== index)
    }))
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="h-8 w-8 text-slate-300 animate-spin" />
      </div>
    )
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Settings className="h-6 w-6 text-violet-500" />
            Shift Settings
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Configure shift mode, timings, and behavior
          </p>
        </div>
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="flex items-center gap-2 rounded-lg bg-linear-to-r from-violet-500 to-purple-600 px-4 py-2 font-medium text-white shadow-lg transition hover:from-violet-600 hover:to-purple-700 disabled:opacity-50"
        >
          {isSaving ? (
            <RefreshCw className="h-4 w-4 animate-spin" />
          ) : (
            <Save className="h-4 w-4" />
          )}
          {isSaving ? 'Saving...' : 'Save Settings'}
        </button>
      </div>

      {message && (
        <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-700 text-sm">
          {message}
        </div>
      )}

      <div className="space-y-6">
        {/* Mode Selection */}
        <div className="bg-white rounded-xl border border-slate-200/60 shadow-sm p-6">
          <h3 className="text-lg font-semibold text-slate-900 mb-4">Shift Mode</h3>
          <div className="flex gap-4">
            <button
              onClick={() => setSettings(s => ({ ...s, mode: 'manual' }))}
              className={`flex-1 p-4 rounded-lg border-2 transition-all ${
                settings.mode === 'manual'
                  ? 'border-violet-500 bg-violet-50'
                  : 'border-slate-200 hover:border-slate-300'
              }`}
            >
              <div className="flex items-center gap-3">
                {settings.mode === 'manual' ? (
                  <ToggleRight className="h-6 w-6 text-violet-500" />
                ) : (
                  <ToggleLeft className="h-6 w-6 text-slate-400" />
                )}
                <div className="text-left">
                  <p className="font-semibold text-slate-900">Manual Mode</p>
                  <p className="text-sm text-slate-500">Staff open and close shifts manually</p>
                </div>
              </div>
            </button>
            <button
              onClick={() => setSettings(s => ({ ...s, mode: 'auto' }))}
              className={`flex-1 p-4 rounded-lg border-2 transition-all ${
                settings.mode === 'auto'
                  ? 'border-violet-500 bg-violet-50'
                  : 'border-slate-200 hover:border-slate-300'
              }`}
            >
              <div className="flex items-center gap-3">
                {settings.mode === 'auto' ? (
                  <ToggleRight className="h-6 w-6 text-violet-500" />
                ) : (
                  <ToggleLeft className="h-6 w-6 text-slate-400" />
                )}
                <div className="text-left">
                  <p className="font-semibold text-slate-900">Auto Mode</p>
                  <p className="text-sm text-slate-500">Shifts open/close automatically based on timings</p>
                </div>
              </div>
            </button>
          </div>
        </div>

        {/* Shift Time Slots */}
        {settings.mode === 'auto' && (
          <div className="bg-white rounded-xl border border-slate-200/60 shadow-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-slate-900">Shift Timings</h3>
              <button
                onClick={addSlot}
                className="flex items-center gap-2 rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
              >
                <Plus className="h-4 w-4" />
                Add Shift
              </button>
            </div>

            <div className="space-y-3">
              {settings.timeSlots.map((slot, index) => {
                const Icon = TYPE_ICONS[slot.shiftType] || Clock
                return (
                  <div
                    key={index}
                    className={`flex items-center gap-4 p-4 rounded-lg border transition-all ${
                      slot.active ? 'bg-slate-50 border-slate-200' : 'bg-slate-50/50 border-slate-100 opacity-60'
                    }`}
                  >
                    <Icon className={`h-5 w-5 ${slot.active ? 'text-amber-500' : 'text-slate-300'}`} />

                    <div className="flex-1 grid grid-cols-1 md:grid-cols-4 gap-3">
                      <div>
                        <label className="block text-xs text-slate-500 mb-1">Shift Name</label>
                        <input
                          type="text"
                          value={slot.shiftName}
                          onChange={(e) => updateSlot(index, { shiftName: e.target.value })}
                          className="w-full rounded-lg border border-slate-300 px-3 py-1.5 text-sm focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-500/20"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-slate-500 mb-1">Type</label>
                        <select
                          value={slot.shiftType}
                          onChange={(e) => updateSlot(index, { shiftType: e.target.value as any })}
                          className="w-full rounded-lg border border-slate-300 px-3 py-1.5 text-sm focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-500/20"
                        >
                          <option value="morning">Morning</option>
                          <option value="evening">Evening</option>
                          <option value="night">Night</option>
                          <option value="custom">Custom</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs text-slate-500 mb-1">Start Time</label>
                        <input
                          type="time"
                          value={slot.startTime}
                          onChange={(e) => updateSlot(index, { startTime: e.target.value })}
                          className="w-full rounded-lg border border-slate-300 px-3 py-1.5 text-sm focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-500/20"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-slate-500 mb-1">End Time</label>
                        <input
                          type="time"
                          value={slot.endTime}
                          onChange={(e) => updateSlot(index, { endTime: e.target.value })}
                          className="w-full rounded-lg border border-slate-300 px-3 py-1.5 text-sm focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-500/20"
                        />
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={slot.active}
                          onChange={(e) => updateSlot(index, { active: e.target.checked })}
                          className="rounded border-slate-300 text-violet-500 focus:ring-violet-500"
                        />
                        <span className="text-sm text-slate-600">Active</span>
                      </label>
                      {settings.timeSlots.length > 1 && (
                        <button
                          onClick={() => removeSlot(index)}
                          className="ml-2 p-1.5 rounded-lg text-rose-400 hover:bg-rose-50 hover:text-rose-600 transition"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Additional Settings */}
        <div className="bg-white rounded-xl border border-slate-200/60 shadow-sm p-6">
          <h3 className="text-lg font-semibold text-slate-900 mb-4">Additional Settings</h3>
          <div className="space-y-4">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={settings.allowMultipleShiftsPerDay}
                onChange={(e) => setSettings(s => ({ ...s, allowMultipleShiftsPerDay: e.target.checked }))}
                className="rounded border-slate-300 text-violet-500 focus:ring-violet-500 h-4 w-4"
              />
              <div>
                <p className="font-medium text-slate-900">Allow Multiple Shifts Per Day</p>
                <p className="text-sm text-slate-500">Staff can open new shifts even if previous ones are still open</p>
              </div>
            </label>

            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={settings.autoCloseReminder}
                onChange={(e) => setSettings(s => ({ ...s, autoCloseReminder: e.target.checked }))}
                className="rounded border-slate-300 text-violet-500 focus:ring-violet-500 h-4 w-4"
              />
              <div>
                <p className="font-medium text-slate-900">Auto Close Reminder</p>
                <p className="text-sm text-slate-500">Show reminder before shift auto-closes</p>
              </div>
            </label>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Reminder Minutes
                </label>
                <input
                  type="number"
                  value={settings.reminderMinutes}
                  onChange={(e) => setSettings(s => ({ ...s, reminderMinutes: Number(e.target.value) }))}
                  min={1}
                  max={60}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-500/20"
                />
                <p className="text-xs text-slate-500 mt-1">Minutes before auto-close to show reminder</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Grace Period Minutes
                </label>
                <input
                  type="number"
                  value={settings.gracePeriodMinutes}
                  onChange={(e) => setSettings(s => ({ ...s, gracePeriodMinutes: Number(e.target.value) }))}
                  min={0}
                  max={120}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-500/20"
                />
                <p className="text-xs text-slate-500 mt-1">Extra time allowed after shift end before auto-close</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
