/**
 * Shared Lab module types used across frontend components.
 * Mirrors backend schema definitions for consistency.
 */

// ── Test catalog ──────────────────────────────────────────────

export type TestTemplateKind =
  | 'general' | 'cbc' | 'urine_re' | 'semen' | 'blood_culture'
  | 'tft' | 'hba1c' | 'qualitative' | 'lft' | 'rft' | 'custom'

export type TestCategory =
  | 'Hematology' | 'Chemistry' | 'SpecialChemistry' | 'Serology'
  | 'Microbiology' | 'Molecular' | 'Cytology' | 'Histopathology'
  | 'Radiology' | 'Other'

export type ParameterKind = 'quantitative' | 'qualitative'

export interface InterpretationRule {
  when: string   // e.g. "value < 5.6", "5.7..6.4", ">= 6.5"
  label: string  // e.g. "Non-diabetic"
  text: string   // e.g. "Glycated hemoglobin is within normal range."
}

export interface TestSection {
  key: string
  title: string
  order: number
}

export interface TestParameter {
  name: string
  unit?: string
  referenceMin?: number
  referenceMax?: number
  kind: ParameterKind
  decimals?: number
  criticalMin?: number
  criticalMax?: number
  sectionKey?: string
  qualitativeOptions?: string[]
  interpretationRules?: InterpretationRule[]
  contributesToTotalPercent?: boolean
  totalPercentGroup?: string
  dependsOn?: string[]
  formula?: string
}

// ── Results ───────────────────────────────────────────────────

export type ApprovalStatus = 'draft' | 'pending' | 'approved' | 'rejected' | 'printed'

export type SampleType = 'normal' | 'urgent' | 'stat'

export type PatientCardKind = 'gynae9m' | 'hep3m' | 'tb2y' | 'mdrtb2y' | 'admitted' | 'general'

export interface ResultRow {
  id: string
  parameter: string
  value: string
  unit?: string
  reference?: string
  flag?: 'normal' | 'low' | 'high' | 'critical' | 'abnormal'
  kind?: ParameterKind
  qualitativeOptions?: string[]
  sectionKey?: string
  isCalculated?: boolean
  criticalMin?: number
  criticalMax?: number
  interpretationRules?: InterpretationRule[]
  decimals?: number
  previousValue?: string
}

export interface ResultSection {
  key: string
  title: string
  rows: ResultRow[]
}

// ── Collection centers ────────────────────────────────────────

export type CollectionCenterRole = 'head' | 'sub' | 'paired' | 'standalone'

// ── Critical values ───────────────────────────────────────────

export interface CriticalValue {
  parameter: string
  criticalMin: number
  criticalMax: number
  unit?: string
}

export type CriticalInfoMode = 'verbal' | 'phone' | 'sms' | 'email'

// ── Notifications ─────────────────────────────────────────────

export type NotificationKind =
  | 'critical' | 'pending_approval' | 'sample_received'
  | 'outsource' | 'whatsapp_failed' | 'general'

export type NotificationScope = 'main' | 'center'

// ── Packages ──────────────────────────────────────────────────

export interface TestPackage {
  id: string
  name: string
  description?: string
  testIds: string[]
  price: number
  discountPct: number
  isActive: boolean
}
