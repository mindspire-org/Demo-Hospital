import { LabTestDoc } from '../models/Test'

export type TotalPercentValidation = {
  ok: boolean
  groups: Record<string, number>
  errors: string[]
}

/**
 * Validates that any group of parameters marked `contributesToTotalPercent`
 * with the same `totalPercentGroup` sum to 100 (± tolerance).
 *
 * Implements the CBC-clerical-mistake rule from the plan: if the differential
 * (Neutrophils + Lymphocytes + ...) does not equal 100%, the report cannot
 * be submitted.
 */
export function validateTotalPercent(
  test: Pick<LabTestDoc, 'parameters'> | null | undefined,
  rows: Array<{ test: string; value?: string; numericValue?: number }>,
  tolerance = 0.5,
): TotalPercentValidation {
  const out: TotalPercentValidation = { ok: true, groups: {}, errors: [] }
  if (!test?.parameters || test.parameters.length === 0) return out

  // Build group → sum map
  const groupParams: Record<string, string[]> = {}
  for (const p of test.parameters) {
    if (!p.contributesToTotalPercent) continue
    const grp = p.totalPercentGroup || 'default'
    if (!groupParams[grp]) groupParams[grp] = []
    groupParams[grp].push(p.name)
  }
  if (Object.keys(groupParams).length === 0) return out

  const valueOf = (name: string): number => {
    const r = rows.find(x => String(x.test).toLowerCase() === String(name).toLowerCase())
    if (!r) return 0
    if (typeof r.numericValue === 'number') return r.numericValue
    if (r.value === undefined || r.value === null || r.value === '') return 0
    const n = Number(String(r.value).replace(/[^0-9.\-]/g, ''))
    return Number.isFinite(n) ? n : 0
  }

  for (const [grp, names] of Object.entries(groupParams)) {
    let sum = 0
    let anyEntered = false
    for (const n of names) {
      const v = valueOf(n)
      if (v !== 0) anyEntered = true
      sum += v
    }
    out.groups[grp] = Math.round(sum * 100) / 100
    // Only validate if any value was entered for the group
    if (anyEntered && Math.abs(sum - 100) > tolerance) {
      out.ok = false
      out.errors.push(
        `Differential total for "${grp}" = ${sum.toFixed(2)}% (expected 100% ± ${tolerance}%). ` +
        `Parameters: ${names.join(', ')}.`,
      )
    }
  }

  return out
}
