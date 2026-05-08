/**
 * Get today's date in local timezone (YYYY-MM-DD format)
 * Use this instead of new Date().toISOString().slice(0, 10) which uses UTC
 */
export function getLocalDate(d: Date = new Date()): string {
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

/**
 * Format a date for display in local timezone
 */
export function formatLocalDate(isoString: string): string {
  if (!isoString) return ''
  const d = new Date(isoString)
  if (isNaN(d.getTime())) return isoString
  return getLocalDate(d)
}

/**
 * Get current time in local timezone (HH:MM format)
 */
export function getLocalTime(d: Date = new Date()): string {
  return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
}

// ============================================================
// PAKISTAN TIMEZONE UTILITIES (PKT, UTC+5)
// ============================================================

const PAKISTAN_OFFSET_HOURS = 5
const PAKISTAN_OFFSET_MS = PAKISTAN_OFFSET_HOURS * 60 * 60 * 1000

/**
 * Get current date in Pakistan timezone (YYYY-MM-DD format)
 * Pakistan Standard Time is UTC+5
 */
export function getPakistanDate(d: Date = new Date()): string {
  const pakTime = new Date(d.getTime() + PAKISTAN_OFFSET_MS)
  const year = pakTime.getUTCFullYear()
  const month = String(pakTime.getUTCMonth() + 1).padStart(2, '0')
  const day = String(pakTime.getUTCDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

/**
 * Get current time in Pakistan timezone (HH:MM:SS format)
 * Pakistan Standard Time is UTC+5
 */
export function getPakistanTime(d: Date = new Date(), showSeconds = false): string {
  const pakTime = new Date(d.getTime() + PAKISTAN_OFFSET_MS)
  const hours = String(pakTime.getUTCHours()).padStart(2, '0')
  const minutes = String(pakTime.getUTCMinutes()).padStart(2, '0')
  const seconds = String(pakTime.getUTCSeconds()).padStart(2, '0')
  return showSeconds ? `${hours}:${minutes}:${seconds}` : `${hours}:${minutes}`
}

/**
 * Get current datetime in Pakistan timezone formatted for display
 * Returns: "YYYY-MM-DD HH:MM:SS PKT"
 */
export function getPakistanDateTimeDisplay(d: Date = new Date()): string {
  return `${getPakistanDate(d)} ${getPakistanTime(d, true)} PKT`
}

/**
 * Format a date in Pakistan timezone using local getters (replaces toISOString)
 * Returns: "YYYY-MM-DDTHH:MM:SS.mmmZ" format but in Pakistan timezone
 * NOTE: This returns a string that looks like ISO but represents Pakistan time
 */
export function formatPakistanDateTime(d: Date = new Date()): string {
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
 * Get Pakistan timezone info for display
 */
export function getPakistanTimezoneInfo(): { name: string; offset: string; utcOffset: number } {
  return {
    name: 'PKT',
    offset: 'UTC+5',
    utcOffset: 5
  }
}
