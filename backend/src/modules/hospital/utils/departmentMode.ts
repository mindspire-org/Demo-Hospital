// Resolves which specialized clinical module applies to a doctor/department.
//
// Resolution precedence (most explicit wins):
//   doctor.clinicalModule → department.clinicalModule → keyword/fuzzy inference
//   from department name + specialization → 'general'
//
// Mirror of src/utils/doctorDepartment.ts (frontend). Keep the two in sync.

export type DepartmentModuleKey =
  | 'dental' | 'eye' | 'cardiac' | 'breast-onco' | 'omfs' | 'neuro' | 'general'

type ClinicalModuleDef = { key: Exclude<DepartmentModuleKey, 'general'>; label: string; keywords: string[] }

// Order matters: more specific modules before broader ones they overlap with.
export const CLINICAL_MODULES: ClinicalModuleDef[] = [
  { key: 'omfs',        label: 'Oral & Maxillofacial', keywords: ['maxillofacial', 'oral surgery', 'oral and maxillofacial', 'omfs'] },
  { key: 'breast-onco', label: 'Breast Oncology',      keywords: ['breast', 'mammary', 'oncolog', 'oncology', 'cancer', 'tumor', 'tumour'] },
  { key: 'cardiac',     label: 'Cardiac / Cardiology', keywords: ['cardiac', 'cardio', 'cardiology', 'heart', 'cvs'] },
  { key: 'neuro',       label: 'Neurology',            keywords: ['neuro', 'neurology', 'neurological', 'brain', 'stroke'] },
  { key: 'dental',      label: 'Dental',               keywords: ['dental', 'dentist', 'dentistry', 'odonto', 'orthodont'] },
  { key: 'eye',         label: 'Eye / Ophthalmology',  keywords: ['eye', 'ophthal', 'optom', 'optho', 'retina', 'cornea', 'glaucoma'] },
]

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

function matchesKeyword(haystack: string, keyword: string): boolean {
  if (haystack.includes(keyword)) return true
  const kw = keyword.trim()
  if (kw.length < 4 || kw.includes(' ')) return false
  const threshold = Math.max(1, Math.floor(kw.length * 0.25))
  return haystack.split(' ').some(tok => tok.length >= 3 && levenshtein(tok, kw) <= threshold)
}

export function resolveDepartmentModeKey(departmentName?: string | null, specialization?: string | null): DepartmentModuleKey {
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

export type ResolveOptions = { doctorClinicalModule?: string | null; departmentClinicalModule?: string | null }

// Full precedence resolver. Backward-compatible: still returns isDental/isEye.
export function resolveDepartmentMode(
  departmentName?: string | null,
  specialization?: string | null,
  opts: ResolveOptions = {},
): { isDental: boolean; isEye: boolean; departmentModule: DepartmentModuleKey; mode: 'general' | 'dental' | 'eye' } {
  let departmentModule: DepartmentModuleKey
  if (isValidKey(opts.doctorClinicalModule)) departmentModule = opts.doctorClinicalModule
  else if (isValidKey(opts.departmentClinicalModule)) departmentModule = opts.departmentClinicalModule
  else departmentModule = resolveDepartmentModeKey(departmentName, specialization)
  return {
    isDental: departmentModule === 'dental',
    isEye: departmentModule === 'eye',
    departmentModule,
    mode: departmentModule === 'dental' ? 'dental' : departmentModule === 'eye' ? 'eye' : 'general',
  }
}
