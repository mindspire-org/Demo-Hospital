/**
 * Format a lab number using a template string.
 * Tokens:
 *   {YYYY}      → full year (e.g. 2026)
 *   {YY}        → 2-digit year (e.g. 26)
 *   {MM}        → 2-digit month (e.g. 06)
 *   {DD}        → 2-digit day (e.g. 10)
 *   {SERIAL}    → raw number
 *   {SERIAL2}   → 2-digit zero-padded
 *   {SERIAL3}   → 3-digit zero-padded
 *   {SERIAL4}   → 4-digit zero-padded
 *   {SERIAL6}   → 6-digit zero-padded
 */
export function formatLabNumber(num: number, fmt?: string, date?: Date): string {
  const template = (fmt || '{SERIAL}').trim()
  if (!template) return String(num)

  const d = date || new Date()
  const YYYY = String(d.getFullYear())
  const YY = YYYY.slice(-2)
  const MM = String(d.getMonth() + 1).padStart(2, '0')
  const DD = String(d.getDate()).padStart(2, '0')
  const pad = (n: number, w: number) => String(n).padStart(w, '0')

  let result = template
  result = result.replace(/\{YYYY\}/gi, YYYY)
  result = result.replace(/\{YY\}/g, YY)
  result = result.replace(/\{MM\}/gi, MM)
  result = result.replace(/\{DD\}/gi, DD)
  result = result.replace(/\{SERIAL6\}/gi, pad(num, 6))
  result = result.replace(/\{SERIAL4\}/gi, pad(num, 4))
  result = result.replace(/\{SERIAL3\}/gi, pad(num, 3))
  result = result.replace(/\{SERIAL2\}/gi, pad(num, 2))
  result = result.replace(/\{SERIAL\}/gi, String(num))
  return result
}
