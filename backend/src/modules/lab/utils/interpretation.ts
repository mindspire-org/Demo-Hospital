/**
 * Interpretation rule evaluator.
 *
 * Supported expression formats (all whitespace-trimmed, case-insensitive):
 *   <  N        e.g. "< 5.7"
 *   <= N        e.g. "<=5.7"
 *   >  N        e.g. "> 8"
 *   >= N        e.g. ">=6.5"
 *   =  N        e.g. "= 5"
 *   !=  N
 *   N..M        e.g. "5.7..6.4"   (inclusive range)
 *   N-M         e.g. "5.7-6.4"     (inclusive range; same as ..)
 *   value < N   (token "value" optional)
 *
 * Returns true when the numeric value satisfies the expression.
 */
export function evalRule(expression: string, value: number): boolean {
  if (!expression || !Number.isFinite(value)) return false
  const expr = String(expression).trim().toLowerCase().replace(/^value\s*/, '')

  // Range "a..b" or "a-b" (b > a)
  const range = expr.match(/^(-?\d+(?:\.\d+)?)\s*(?:\.\.|-)\s*(-?\d+(?:\.\d+)?)$/)
  if (range) {
    const a = parseFloat(range[1])
    const b = parseFloat(range[2])
    const lo = Math.min(a, b)
    const hi = Math.max(a, b)
    return value >= lo && value <= hi
  }

  const cmp = expr.match(/^(>=|<=|>|<|==|=|!=)\s*(-?\d+(?:\.\d+)?)$/)
  if (cmp) {
    const op = cmp[1]
    const n = parseFloat(cmp[2])
    switch (op) {
      case '>=': return value >= n
      case '<=': return value <= n
      case '>': return value > n
      case '<': return value < n
      case '==':
      case '=': return value === n
      case '!=': return value !== n
    }
  }

  return false
}

export type InterpretationRule = { expression: string; label?: string; text?: string }

/**
 * Returns the first matching rule for the given numeric value.
 */
export function pickInterpretation(rules: InterpretationRule[] | undefined, value: number): InterpretationRule | null {
  if (!rules || rules.length === 0) return null
  for (const r of rules) {
    if (evalRule(r.expression, value)) return r
  }
  return null
}

/**
 * Helper to coerce a string value (from form input) into a number.
 */
export function toNumber(v: any): number | null {
  if (v === null || v === undefined || v === '') return null
  const n = Number(String(v).replace(/[^0-9.\-]/g, ''))
  return Number.isFinite(n) ? n : null
}

/**
 * Decide flag (normal/abnormal/critical) given numeric value, normal range
 * string ("a-b"), and optional critical thresholds.
 */
export function computeFlag(opts: {
  value: number | null
  normalRange?: string | null
  criticalMin?: number | null
  criticalMax?: number | null
}): 'normal' | 'abnormal' | 'critical' | undefined {
  const { value, normalRange, criticalMin, criticalMax } = opts
  if (value === null) return undefined

  if (criticalMin != null && Number.isFinite(criticalMin) && value <= criticalMin) return 'critical'
  if (criticalMax != null && Number.isFinite(criticalMax) && value >= criticalMax) return 'critical'

  if (normalRange) {
    const m = String(normalRange).match(/(-?\d+(?:\.\d+)?)\s*[-\u2013]\s*(-?\d+(?:\.\d+)?)/)
    if (m) {
      const lo = parseFloat(m[1])
      const hi = parseFloat(m[2])
      if (value >= lo && value <= hi) return 'normal'
      return 'abnormal'
    }
    // formats like "<5", ">10"
    const lt = String(normalRange).match(/^\s*<\s*(-?\d+(?:\.\d+)?)\s*$/)
    if (lt) return value < parseFloat(lt[1]) ? 'normal' : 'abnormal'
    const gt = String(normalRange).match(/^\s*>\s*(-?\d+(?:\.\d+)?)\s*$/)
    if (gt) return value > parseFloat(gt[1]) ? 'normal' : 'abnormal'
  }

  return undefined
}
