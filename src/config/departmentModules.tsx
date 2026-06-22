// Department-module registry. Each entry wires a specialized department to its
// clinical form component, default value, banner styling, super-admin module
// flag, and a generic section descriptor used for PDF + print rendering.
//
// Adding a new department = one entry here + (optionally) a keyword in
// src/utils/doctorDepartment.ts. The prescription page renders the matching
// department tab dynamically from this registry — no page edits required.
//
// Note: dental and eye predate this registry and keep their own dedicated
// handling/PDFs in the prescription page; the registry covers the newer
// departments (cardiac, breast-onco, omfs, neuro).

import type { ComponentType } from 'react'
import type { DepartmentModuleKey } from '../utils/doctorDepartment'
import CardiacAssessment, { emptyCardiac, cardiacSections } from '../components/doctor/CardiacAssessment'
import NeuroAssessment, { emptyNeuro, neuroSections } from '../components/doctor/NeuroAssessment'
import OmfsAssessment, { emptyOmfs, omfsSections } from '../components/doctor/OmfsAssessment'
import BreastOncology, { emptyBreastOnco, breastOncoSections } from '../components/doctor/BreastOncology'

// Generic section descriptor consumed by the department PDF builder and the
// PrescriptionPrint component.
export type RxSection =
  | { title: string; type: 'kv'; kv: [string, string][] }
  | { title: string; type: 'text'; text: string }
  | { title: string; type: 'table'; table: { headers: string[]; rows: string[][] } }

export type DepartmentFormProps = { value: any; onChange?: (v: any) => void; readOnly?: boolean }

export type DepartmentModuleDef = {
  key: DepartmentModuleKey
  tabLabel: string
  bannerTitle: string
  bannerSubtitle: string
  gradient: string            // tailwind gradient classes for the in-page banner
  pdfAccent: [number, number, number]
  pdfDeptLabel: string        // header line on the PDF
  moduleFlag: string          // super-admin sub-module id
  iconPath: string            // single SVG path for the banner icon
  Form: ComponentType<DepartmentFormProps>
  empty: () => any
  sections: (value: any) => RxSection[]
  medRoutes?: string[]
  medInstr?: string[]
}

export const DEPARTMENT_MODULES: Partial<Record<DepartmentModuleKey, DepartmentModuleDef>> = {
  cardiac: {
    key: 'cardiac',
    tabLabel: 'Cardiac Exam',
    bannerTitle: 'Cardiac Department',
    bannerSubtitle: 'ECG · Echo · risk assessment',
    gradient: 'from-rose-500 to-red-500',
    pdfAccent: [220, 38, 38],
    pdfDeptLabel: 'CARDIOLOGY DEPARTMENT',
    moduleFlag: 'cardiacRx',
    iconPath: 'M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z',
    Form: CardiacAssessment,
    empty: emptyCardiac,
    sections: cardiacSections,
    medInstr: ['After meals', 'Before meals', 'At bedtime', 'Monitor BP', 'Monitor pulse'],
  },
  'breast-onco': {
    key: 'breast-onco',
    tabLabel: 'Breast Oncology',
    bannerTitle: 'Breast Oncology Department',
    bannerSubtitle: 'Lump mapping · staging · chemo cycles',
    gradient: 'from-pink-500 to-fuchsia-500',
    pdfAccent: [219, 39, 119],
    pdfDeptLabel: 'BREAST ONCOLOGY DEPARTMENT',
    moduleFlag: 'breastOncoRx',
    iconPath: 'M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z',
    Form: BreastOncology,
    empty: emptyBreastOnco,
    sections: breastOncoSections,
    medRoutes: ['Oral', 'IV', 'IV infusion', 'Subcutaneous'],
    medInstr: ['Pre-medication', 'With antiemetic', 'Monitor CBC', 'Cycle day 1'],
  },
  omfs: {
    key: 'omfs',
    tabLabel: 'OMFS Exam',
    bannerTitle: 'Oral & Maxillofacial Department',
    bannerSubtitle: 'Tooth chart · facial / TMJ / fracture',
    gradient: 'from-amber-500 to-orange-500',
    pdfAccent: [217, 119, 6],
    pdfDeptLabel: 'ORAL & MAXILLOFACIAL DEPARTMENT',
    moduleFlag: 'omfsRx',
    iconPath: 'M12 5.5c-1.5-2-4-2.5-5.5-1.5C4.5 5.5 5 9 6 12c.7 2 1 5 1.5 6.5.4 1.2 1.6 1.2 2-.5.3-1.3.5-3 1.5-3s1.2 1.7 1.5 3c.4 1.7 1.6 1.7 2 .5C16 17 16.3 14 17 12c1-3 1.5-6.5-.5-8-1.5-1-4-.5-4.5 1.5z',
    Form: OmfsAssessment,
    empty: emptyOmfs,
    sections: omfsSections,
    medInstr: ['Apply locally', 'Rinse and spit', 'After brushing', 'Avoid hard food', 'Warm saline rinse'],
  },
  neuro: {
    key: 'neuro',
    tabLabel: 'Neuro Exam',
    bannerTitle: 'Neurology Department',
    bannerSubtitle: 'GCS · cranial nerves · NIHSS · imaging',
    gradient: 'from-violet-500 to-purple-500',
    pdfAccent: [124, 58, 237],
    pdfDeptLabel: 'NEUROLOGY DEPARTMENT',
    moduleFlag: 'neuroRx',
    iconPath: 'M9.5 2A2.5 2.5 0 0 1 12 4.5v15a2.5 2.5 0 0 1-4.96.44 2.5 2.5 0 0 1-2.96-3.08 3 3 0 0 1-.34-5.58 2.5 2.5 0 0 1 1.32-4.24A2.5 2.5 0 0 1 9.5 2zm5 0A2.5 2.5 0 0 0 12 4.5v15a2.5 2.5 0 0 0 4.96.44 2.5 2.5 0 0 0 2.96-3.08 3 3 0 0 0 .34-5.58 2.5 2.5 0 0 0-1.32-4.24A2.5 2.5 0 0 0 14.5 2z',
    Form: NeuroAssessment,
    empty: emptyNeuro,
    sections: neuroSections,
    medInstr: ['At bedtime', 'Titrate dose', 'Do not stop abruptly', 'Monitor levels'],
  },
}

export function getDepartmentModule(key?: string | null): DepartmentModuleDef | null {
  if (!key) return null
  return (DEPARTMENT_MODULES as any)[key] || null
}
