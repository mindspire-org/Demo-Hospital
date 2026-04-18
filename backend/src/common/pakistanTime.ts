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
