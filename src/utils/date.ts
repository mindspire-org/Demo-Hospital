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
