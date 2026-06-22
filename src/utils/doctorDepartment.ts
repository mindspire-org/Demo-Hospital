// Resolves which specialized clinical module applies to a doctor/department.
//
// Resolution precedence (most explicit wins):
//   doctor.clinicalModule → department.clinicalModule → keyword/fuzzy inference
//   from department name + specialization → 'general'
//
// The CLINICAL_MODULES catalog below is the single source of truth for the
// admin dropdown, name autocomplete, live badge, and the resolver. Keep it in
// sync with backend/src/modules/hospital/utils/departmentMode.ts.

export type DepartmentModuleKey =
  | 'dental' | 'eye' | 'cardiac' | 'breast-onco' | 'omfs' | 'neuro' | 'general'

export type ClinicalModuleDef = {
  key: Exclude<DepartmentModuleKey, 'general'>
  label: string
  canonicalNames: string[]   // suggested canonical department names (autocomplete)
  keywords: string[]         // substring + fuzzy match targets
}

// Order matters for inference: list more specific modules (omfs, breast-onco)
// before broader ones (dental) they could overlap with.
export const CLINICAL_MODULES: ClinicalModuleDef[] = [
  { key: 'omfs',        label: 'Oral & Maxillofacial', canonicalNames: ['Oral & Maxillofacial Surgery'], keywords: ['maxillofacial', 'oral surgery', 'oral and maxillofacial', 'omfs'] },
  { key: 'breast-onco', label: 'Breast Oncology',      canonicalNames: ['Breast Oncology', 'Breast Surgery'], keywords: ['breast', 'mammary', 'oncolog', 'oncology', 'cancer', 'tumor', 'tumour'] },
  { key: 'cardiac',     label: 'Cardiac / Cardiology', canonicalNames: ['Cardiology'], keywords: ['cardiac', 'cardio', 'cardiology', 'heart', 'cvs'] },
  { key: 'neuro',       label: 'Neurology',            canonicalNames: ['Neurology'], keywords: ['neuro', 'neurology', 'neurological', 'brain', 'stroke'] },
  { key: 'dental',      label: 'Dental',               canonicalNames: ['Dentistry'], keywords: ['dental', 'dentist', 'dentistry', 'odonto', 'orthodont'] },
  { key: 'eye',         label: 'Eye / Ophthalmology',  canonicalNames: ['Ophthalmology'], keywords: ['eye', 'ophthal', 'optom', 'optho', 'retina', 'cornea', 'glaucoma'] },
]

// Options for the admin "Specialized module" dropdown (includes the General/none entry).
export const CLINICAL_MODULE_OPTIONS: Array<{ value: string; label: string }> = [
  { value: '', label: 'None (General)' },
  ...CLINICAL_MODULES.map(m => ({ value: m.key, label: m.label })),
]

export const CANONICAL_DEPARTMENT_NAMES = CLINICAL_MODULES.flatMap(m => m.canonicalNames)

function norm(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim()
}

function levenshtein(a: string, b: string): number {
  const m = a.length, n = b.length
  if (!m) return n
  if (!n) return m
  const dp = Array.from({ length: m + 1 }, (_, i) => i)
  for (let j = 1; j <= n; j++) {
    let prev = dp[0]
    dp[0] = j
    for (let i = 1; i <= m; i++) {
      const tmp = dp[i]
      dp[i] = a[i - 1] === b[j - 1] ? prev : 1 + Math.min(prev, dp[i], dp[i - 1])
      prev = tmp
    }
  }
  return dp[m]
}

// Conservative fuzzy match: substring first, then per-token Levenshtein within a
// length-scaled threshold (tolerates typos like "Dentstry" → dental).
function matchesKeyword(haystack: string, keyword: string): boolean {
  if (haystack.includes(keyword)) return true
  const kw = keyword.trim()
  if (kw.length < 4 || kw.includes(' ')) return false // don't fuzzy short/multi-word keywords
  const threshold = Math.max(1, Math.floor(kw.length * 0.25))
  return haystack.split(' ').some(tok => tok.length >= 3 && levenshtein(tok, kw) <= threshold)
}

// Pure inference from free-text name + specialization (substring + fuzzy).
export function resolveDepartmentKey(departmentName?: string | null, specialization?: string | null): DepartmentModuleKey {
  const s = norm(`${departmentName || ''} ${specialization || ''}`)
  if (!s) return 'general'
  for (const mod of CLINICAL_MODULES) {
    if (mod.keywords.some(k => matchesKeyword(s, norm(k)))) return mod.key
  }
  return 'general'
}

function isValidKey(v?: string | null): v is Exclude<DepartmentModuleKey, 'general'> {
  return !!v && CLINICAL_MODULES.some(m => m.key === v)
}

export type PrescriptionDeptMode = 'general' | 'dental' | 'eye'

export type ResolveOptions = {
  doctorClinicalModule?: string | null
  departmentClinicalModule?: string | null
}

// Full precedence resolver used by the prescription page + department queue.
export function resolveDoctorMode(
  departmentName?: string | null,
  specialization?: string | null,
  opts: ResolveOptions = {},
): { isDental: boolean; isEye: boolean; departmentKey: DepartmentModuleKey; mode: PrescriptionDeptMode } {
  let departmentKey: DepartmentModuleKey
  if (isValidKey(opts.doctorClinicalModule)) departmentKey = opts.doctorClinicalModule
  else if (isValidKey(opts.departmentClinicalModule)) departmentKey = opts.departmentClinicalModule
  else departmentKey = resolveDepartmentKey(departmentName, specialization)
  return {
    isDental: departmentKey === 'dental',
    isEye: departmentKey === 'eye',
    departmentKey,
    mode: departmentKey === 'dental' ? 'dental' : departmentKey === 'eye' ? 'eye' : 'general',
  }
}

export function moduleLabel(key?: string | null): string {
  return CLINICAL_MODULES.find(m => m.key === key)?.label || 'General'
}
