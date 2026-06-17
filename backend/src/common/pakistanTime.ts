/**
 * Pakistan Timezone Utilities
 * Pakistan timezone is UTC+5
 * - Pakistan midnight (00:00) = UTC 19:00 (previous day)
 * - Pakistan 23:59:59.999 = UTC 18:59:59.999 (same day)
 */

/**
 * Get current date in Pakistan timezone as YYYY-MM-DD string
 */
export function getPakistanDateString(): string {
  const now = new Date()
  const pakTime = new Date(now.getTime() + (5 * 60 * 60 * 1000))
  return pakTime.toISOString().slice(0, 10)
}

/**
 * Convert Pakistan date string (YYYY-MM-DD) to UTC start of day
 * Returns Date object representing Pakistan midnight in UTC
 */
export function pakistanDateToUtcStart(pakDateStr: string): Date {
  const pakDate = new Date(pakDateStr + 'T00:00:00')
  return new Date(pakDate.getTime() - (5 * 60 * 60 * 1000))
}

/**
 * Convert Pakistan date string (YYYY-MM-DD) to UTC end of day
 * Returns Date object representing Pakistan 23:59:59.999 in UTC
 */
export function pakistanDateToUtcEnd(pakDateStr: string): Date {
  const pakDate = new Date(pakDateStr + 'T23:59:59.999')
  return new Date(pakDate.getTime() - (5 * 60 * 60 * 1000))
}

/**
 * Get current start and end of day in UTC for Pakistan timezone
 */
export function getPakistanDayBounds(): { start: Date; end: Date; dateIso: string } {
  const dateIso = getPakistanDateString()
  return {
    start: pakistanDateToUtcStart(dateIso),
    end: pakistanDateToUtcEnd(dateIso),
    dateIso
  }
}

/**
 * Convert UTC Date to Pakistan date string (YYYY-MM-DD)
 */
export function utcToPakistanDateString(utcDate: Date | string): string {
  const d = typeof utcDate === 'string' ? new Date(utcDate) : utcDate
  const pakTime = new Date(d.getTime() + (5 * 60 * 60 * 1000))
  return pakTime.toISOString().slice(0, 10)
}

// ============================================================
// LOCAL TIME GETTERS (Replace toISOString for Pakistan timezone)
// ============================================================

const PAKISTAN_OFFSET_MS = 5 * 60 * 60 * 1000 // 5 hours in milliseconds

/**
 * Get current date in Pakistan timezone using local getters (NOT toISOString)
 * Returns: "YYYY-MM-DD" - Uses getFullYear(), getMonth(), getDate() on Pakistan-adjusted date
 */
export function getPakistanDateLocal(): string {
  const now = new Date()
  const pakTime = new Date(now.getTime() + PAKISTAN_OFFSET_MS)
  const year = pakTime.getUTCFullYear()
  const month = String(pakTime.getUTCMonth() + 1).padStart(2, '0')
  const day = String(pakTime.getUTCDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

/**
 * Get current datetime in Pakistan timezone using local getters (NOT toISOString)
 * Returns: "YYYY-MM-DD HH:MM:SS" format using local timezone getters
 */
export function getPakistanDateTimeLocal(): string {
  const now = new Date()
  const pakTime = new Date(now.getTime() + PAKISTAN_OFFSET_MS)
  const year = pakTime.getUTCFullYear()
  const month = String(pakTime.getUTCMonth() + 1).padStart(2, '0')
  const day = String(pakTime.getUTCDate()).padStart(2, '0')
  const hours = String(pakTime.getUTCHours()).padStart(2, '0')
  const minutes = String(pakTime.getUTCMinutes()).padStart(2, '0')
  const seconds = String(pakTime.getUTCSeconds()).padStart(2, '0')
  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`
}

/**
 * Format a Date in Pakistan timezone using local getters (replaces toISOString().slice(0, 10))
 * Use this instead of: new Date().toISOString().slice(0, 10)
 * Returns: "YYYY-MM-DD" format
 */
export function formatPakistanDate(d: Date = new Date()): string {
  const pakTime = new Date(d.getTime() + PAKISTAN_OFFSET_MS)
  const year = pakTime.getUTCFullYear()
  const month = String(pakTime.getUTCMonth() + 1).padStart(2, '0')
  const day = String(pakTime.getUTCDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

/**
 * Format a Date as ISO string in Pakistan timezone using local getters
 * Replaces: new Date().toISOString()
 * Returns: "YYYY-MM-DDTHH:MM:SS.mmmZ" format representing Pakistan time
 */
export function formatPakistanISOString(d: Date = new Date()): string {
  const pakTime = new Date(d.getTime() + PAKISTAN_OFFSET_MS)
  const year = pakTime.getUTCFullYear()
  const month = String(pakTime.getUTCMonth() + 1).padStart(2, '0')
  const day = String(pakTime.getUTCDate()).padStart(2, '0')
  const hours = String(pakTime.getUTCHours()).padStart(2, '0')
  const minutes = String(pakTime.getUTCMinutes()).padStart(2, '0')
  const seconds = String(pakTime.getUTCSeconds()).padStart(2, '0')
  const ms = String(pakTime.getUTCMilliseconds()).padStart(3, '0')
  return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}.${ms}Z`
}

/**
 * Get Pakistan time components using local getters
 * Returns an object with year, month, day, hours, minutes, seconds
 */
export function getPakistanTimeComponents(d: Date = new Date()): {
  year: number
  month: number // 0-11
  day: number // 1-31
  hours: number // 0-23
  minutes: number
  seconds: number
  ms: number
} {
  const pakTime = new Date(d.getTime() + PAKISTAN_OFFSET_MS)
  return {
    year: pakTime.getUTCFullYear(),
    month: pakTime.getUTCMonth(),
    day: pakTime.getUTCDate(),
    hours: pakTime.getUTCHours(),
    minutes: pakTime.getUTCMinutes(),
    seconds: pakTime.getUTCSeconds(),
    ms: pakTime.getUTCMilliseconds()
  }
}
