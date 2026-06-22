/**
 * Idempotent seeder for canonical test templates.
 *
 * Run via:
 *   import { seedLabTestTemplates } from './modules/lab/seeds/labTestTemplates'
 *   seedLabTestTemplates()
 *
 * Each template is upserted by `name`. Existing user-edited fields (price etc.)
 * are preserved; only template + parameters + sections + interpretationRules
 * are replaced.
 */

import { LabTest } from '../models/Test'

type ParamSeed = {
  name: string
  unit?: string
  normalRange?: string
  normalRangeMale?: string
  normalRangeFemale?: string
  normalRangePediatric?: string
  decimals?: number
  kind?: 'quantitative' | 'qualitative'
  qualitativeOptions?: string[]
  criticalMin?: number
  criticalMax?: number
  contributesToTotalPercent?: boolean
  totalPercentGroup?: string
  sectionKey?: string
  formula?: string
  dependsOn?: string[]
}

type TemplateSeed = {
  name: string
  category: string
  template: string
  price?: number
  sections?: Array<{ key: string; title: string; order: number }>
  parameters: ParamSeed[]
  interpretationRules?: Array<{ when: string; label: string; text: string }>
  defaultInterpretation?: string
  qualitativeOptions?: string[]
}

export const SEED_TEMPLATES: TemplateSeed[] = [
  // CBC with 100% differential rule
  {
    name: 'CBC',
    category: 'Hematology',
    template: 'cbc',
    price: 800,
    sections: [
      { key: 'main', title: 'Complete Blood Count', order: 1 },
      { key: 'diff', title: 'Differential Count', order: 2 },
    ],
    parameters: [
      { name: 'Hb', unit: 'g/dL', normalRangeMale: '13.5-17.5', normalRangeFemale: '12.0-15.5', normalRangePediatric: '11.0-16.0', decimals: 1, sectionKey: 'main', criticalMin: 7, criticalMax: 20 },
      { name: 'TLC', unit: '10^9/L', normalRangeMale: '4.5-11.0', normalRangeFemale: '4.5-11.0', normalRangePediatric: '5.0-15.0', decimals: 1, sectionKey: 'main', criticalMin: 1, criticalMax: 30 },
      { name: 'RBC', unit: '10^12/L', normalRangeMale: '4.7-6.1', normalRangeFemale: '4.2-5.4', normalRangePediatric: '3.5-5.5', decimals: 2, sectionKey: 'main' },
      { name: 'Platelets', unit: '10^9/L', normalRangeMale: '150-400', normalRangeFemale: '150-400', normalRangePediatric: '150-450', decimals: 0, sectionKey: 'main', criticalMin: 50, criticalMax: 1000 },
      { name: 'Hct', unit: '%', normalRangeMale: '38.8-50.0', normalRangeFemale: '34.9-44.5', normalRangePediatric: '35-45', decimals: 1, sectionKey: 'main' },
      { name: 'MCV', unit: 'fL', normalRangeMale: '80-100', normalRangeFemale: '80-100', normalRangePediatric: '70-86', decimals: 1, sectionKey: 'main' },
      { name: 'MCH', unit: 'pg', normalRangeMale: '27-33', normalRangeFemale: '27-33', normalRangePediatric: '25-32', decimals: 1, sectionKey: 'main' },
      { name: 'MCHC', unit: 'g/dL', normalRangeMale: '32-36', normalRangeFemale: '32-36', normalRangePediatric: '30-36', decimals: 1, sectionKey: 'main' },
      { name: 'Neutrophils', unit: '%', normalRangeMale: '40-75', normalRangeFemale: '40-75', normalRangePediatric: '30-60', decimals: 0, sectionKey: 'diff', contributesToTotalPercent: true, totalPercentGroup: 'cbc-diff' },
      { name: 'Lymphocytes', unit: '%', normalRangeMale: '20-45', normalRangeFemale: '20-45', normalRangePediatric: '30-60', decimals: 0, sectionKey: 'diff', contributesToTotalPercent: true, totalPercentGroup: 'cbc-diff' },
      { name: 'Monocytes',   unit: '%', normalRangeMale: '2-10',  normalRangeFemale: '2-10',  normalRangePediatric: '2-10',  decimals: 0, sectionKey: 'diff', contributesToTotalPercent: true, totalPercentGroup: 'cbc-diff' },
      { name: 'Eosinophils', unit: '%', normalRangeMale: '1-6',   normalRangeFemale: '1-6',   normalRangePediatric: '1-6',   decimals: 0, sectionKey: 'diff', contributesToTotalPercent: true, totalPercentGroup: 'cbc-diff' },
      { name: 'Basophils',   unit: '%', normalRangeMale: '0-1',   normalRangeFemale: '0-1',   normalRangePediatric: '0-1',   decimals: 0, sectionKey: 'diff', contributesToTotalPercent: true, totalPercentGroup: 'cbc-diff' },
    ],
  },

  // HbA1c with auto-interpretation
  {
    name: 'HbA1c',
    category: 'SpecialChemistry',
    template: 'hba1c',
    price: 1200,
    parameters: [
      { name: 'HbA1c', unit: '%', normalRangeMale: '4.0-5.6', normalRangeFemale: '4.0-5.6', normalRangePediatric: '4.0-5.6', decimals: 1, criticalMin: 0, criticalMax: 15 },
    ],
    interpretationRules: [
      { when: 'value <= 5.6', label: 'Non-diabetic', text: 'HbA1c is in the non-diabetic range.' },
      { when: '5.7 <= value <= 6.4', label: 'Pre-diabetic', text: 'HbA1c is in the pre-diabetic range. Lifestyle modification recommended.' },
      { when: 'value >= 6.5', label: 'Diabetic', text: 'HbA1c is consistent with diabetes mellitus.' },
      { when: 'value > 8', label: 'Poor glycaemic control', text: 'HbA1c indicates poor glycaemic control. Treatment review recommended.' },
    ],
  },

  // TFT
  {
    name: 'TFT',
    category: 'SpecialChemistry',
    template: 'tft',
    price: 2500,
    parameters: [
      { name: 'TSH', unit: 'µIU/mL', normalRangeMale: '0.4-4.0', normalRangeFemale: '0.4-4.0', normalRangePediatric: '0.7-6.0', decimals: 2 },
      { name: 'T3',  unit: 'ng/mL',  normalRangeMale: '0.8-2.0', normalRangeFemale: '0.8-2.0', normalRangePediatric: '0.8-2.0', decimals: 2 },
      { name: 'T4',  unit: 'µg/dL',  normalRangeMale: '5.1-14.1', normalRangeFemale: '5.1-14.1', normalRangePediatric: '6.0-16.0', decimals: 1 },
    ],
  },

  // Urine RE — 3 sections
  {
    name: 'Urine R/E',
    category: 'Chemistry',
    template: 'urine_re',
    price: 400,
    sections: [
      { key: 'physical', title: 'Physical Examination', order: 1 },
      { key: 'chemical', title: 'Chemical Examination', order: 2 },
      { key: 'microscopic', title: 'Microscopic Examination', order: 3 },
    ],
    parameters: [
      { name: 'Colour', sectionKey: 'physical', kind: 'qualitative', qualitativeOptions: ['Pale Yellow', 'Yellow', 'Dark Yellow', 'Red', 'Brown'] },
      { name: 'Appearance', sectionKey: 'physical', kind: 'qualitative', qualitativeOptions: ['Clear', 'Slightly Turbid', 'Turbid'] },
      { name: 'Sp. Gravity', sectionKey: 'physical', normalRangeMale: '1.005-1.030', normalRangeFemale: '1.005-1.030', normalRangePediatric: '1.005-1.030', decimals: 3 },
      { name: 'pH', sectionKey: 'physical', normalRangeMale: '5.0-8.0', normalRangeFemale: '5.0-8.0', normalRangePediatric: '5.0-8.0', decimals: 1 },
      { name: 'Sugar', sectionKey: 'chemical', kind: 'qualitative', qualitativeOptions: ['Negative', 'Trace', '+', '++', '+++', '++++'] },
      { name: 'Protein', sectionKey: 'chemical', kind: 'qualitative', qualitativeOptions: ['Negative', 'Trace', '+', '++', '+++', '++++'] },
      { name: 'Ketones', sectionKey: 'chemical', kind: 'qualitative', qualitativeOptions: ['Negative', 'Trace', '+', '++'] },
      { name: 'Bilirubin', sectionKey: 'chemical', kind: 'qualitative', qualitativeOptions: ['Negative', '+', '++'] },
      { name: 'Urobilinogen', sectionKey: 'chemical', kind: 'qualitative', qualitativeOptions: ['Normal', '+', '++'] },
      { name: 'Nitrite', sectionKey: 'chemical', kind: 'qualitative', qualitativeOptions: ['Negative', 'Positive'] },
      { name: 'Pus Cells (HPF)', sectionKey: 'microscopic', normalRangeMale: '0-5', normalRangeFemale: '0-5', normalRangePediatric: '0-5' },
      { name: 'RBC (HPF)', sectionKey: 'microscopic', normalRangeMale: '0-2', normalRangeFemale: '0-2', normalRangePediatric: '0-2' },
      { name: 'Epithelial Cells', sectionKey: 'microscopic', kind: 'qualitative', qualitativeOptions: ['Few', 'Moderate', 'Plenty'] },
      { name: 'Casts', sectionKey: 'microscopic', kind: 'qualitative', qualitativeOptions: ['None', 'Hyaline', 'Granular', 'Cellular'] },
      { name: 'Crystals', sectionKey: 'microscopic', kind: 'qualitative', qualitativeOptions: ['None', 'Calcium Oxalate', 'Uric Acid', 'Triple Phosphate'] },
      { name: 'Bacteria', sectionKey: 'microscopic', kind: 'qualitative', qualitativeOptions: ['None', 'Few', 'Moderate', 'Plenty'] },
    ],
  },

  // Qualitative serology
  { name: 'Anti-HCV', category: 'Serology', template: 'qualitative', price: 700, parameters: [{ name: 'Anti-HCV', kind: 'qualitative', normalRangeMale: 'Non-Reactive', normalRangeFemale: 'Non-Reactive', normalRangePediatric: 'Non-Reactive', qualitativeOptions: ['Non-Reactive', 'Reactive'] }] },
  { name: 'HBsAg',    category: 'Serology', template: 'qualitative', price: 600, parameters: [{ name: 'HBsAg',    kind: 'qualitative', normalRangeMale: 'Non-Reactive', normalRangeFemale: 'Non-Reactive', normalRangePediatric: 'Non-Reactive', qualitativeOptions: ['Non-Reactive', 'Reactive'] }] },

  // Lipid (formula-driven LDL)
  {
    name: 'Lipid Profile',
    category: 'Chemistry',
    template: 'general',
    price: 1500,
    parameters: [
      { name: 'Total Cholesterol', unit: 'mg/dL', normalRangeMale: '<200', normalRangeFemale: '<200', normalRangePediatric: '<170', decimals: 0 },
      { name: 'Triglycerides',     unit: 'mg/dL', normalRangeMale: '<150', normalRangeFemale: '<150', normalRangePediatric: '<100', decimals: 0 },
      { name: 'HDL',               unit: 'mg/dL', normalRangeMale: '>40',  normalRangeFemale: '>50',  normalRangePediatric: '>40',  decimals: 0 },
      { name: 'LDL',               unit: 'mg/dL', normalRangeMale: '<100', normalRangeFemale: '<100', normalRangePediatric: '<110', decimals: 0, formula: '{Total Cholesterol} - {HDL} - ({Triglycerides} / 5)', dependsOn: ['Total Cholesterol', 'HDL', 'Triglycerides'] },
    ],
  },

  // LFT
  {
    name: 'LFT',
    category: 'Chemistry',
    template: 'general',
    price: 1300,
    parameters: [
      { name: 'Total Bilirubin', unit: 'mg/dL', normalRangeMale: '0.2-1.2', normalRangeFemale: '0.2-1.2', normalRangePediatric: '0.2-1.0', decimals: 2 },
      { name: 'Direct Bilirubin', unit: 'mg/dL', normalRangeMale: '0.0-0.3', normalRangeFemale: '0.0-0.3', normalRangePediatric: '0.0-0.3', decimals: 2 },
      { name: 'ALT (SGPT)', unit: 'U/L', normalRangeMale: '10-40', normalRangeFemale: '7-35', normalRangePediatric: '5-30', decimals: 0 },
      { name: 'AST (SGOT)', unit: 'U/L', normalRangeMale: '10-40', normalRangeFemale: '8-35', normalRangePediatric: '5-30', decimals: 0 },
      { name: 'Alkaline Phosphatase', unit: 'U/L', normalRangeMale: '40-129', normalRangeFemale: '35-104', normalRangePediatric: '50-380', decimals: 0 },
      { name: 'Total Protein', unit: 'g/dL', normalRangeMale: '6.0-8.3', normalRangeFemale: '6.0-8.3', normalRangePediatric: '6.0-8.0', decimals: 1 },
      { name: 'Albumin', unit: 'g/dL', normalRangeMale: '3.5-5.5', normalRangeFemale: '3.5-5.5', normalRangePediatric: '3.5-5.5', decimals: 1 },
    ],
  },

  // RFT
  {
    name: 'RFT',
    category: 'Chemistry',
    template: 'general',
    price: 1100,
    parameters: [
      { name: 'Urea', unit: 'mg/dL', normalRangeMale: '7-20', normalRangeFemale: '7-20', normalRangePediatric: '5-18', decimals: 0, criticalMax: 200 },
      { name: 'Creatinine', unit: 'mg/dL', normalRangeMale: '0.7-1.3', normalRangeFemale: '0.6-1.1', normalRangePediatric: '0.3-0.7', decimals: 2, criticalMax: 8 },
      { name: 'Sodium', unit: 'mmol/L', normalRangeMale: '135-145', normalRangeFemale: '135-145', normalRangePediatric: '135-145', decimals: 0, criticalMin: 120, criticalMax: 160 },
      { name: 'Potassium', unit: 'mmol/L', normalRangeMale: '3.5-5.1', normalRangeFemale: '3.5-5.1', normalRangePediatric: '3.5-5.1', decimals: 2, criticalMin: 2.5, criticalMax: 6.5 },
      { name: 'Chloride', unit: 'mmol/L', normalRangeMale: '98-107', normalRangeFemale: '98-107', normalRangePediatric: '98-107', decimals: 0 },
    ],
  },

  // Semen
  {
    name: 'Semen Analysis',
    category: 'Chemistry',
    template: 'semen',
    price: 1000,
    sections: [
      { key: 'physical', title: 'Physical', order: 1 },
      { key: 'microscopic', title: 'Microscopic', order: 2 },
      { key: 'comments', title: 'Comments', order: 3 },
    ],
    parameters: [
      { name: 'Volume', unit: 'mL', normalRangeMale: '>1.5', normalRangeFemale: 'N/A', normalRangePediatric: 'N/A', decimals: 1, sectionKey: 'physical' },
      { name: 'Colour', sectionKey: 'physical', kind: 'qualitative', qualitativeOptions: ['Greyish-white', 'Yellow', 'Brown'] },
      { name: 'Liquefaction time', unit: 'min', normalRangeMale: '<60', normalRangeFemale: 'N/A', normalRangePediatric: 'N/A', decimals: 0, sectionKey: 'physical' },
      { name: 'Viscosity', sectionKey: 'physical', kind: 'qualitative', qualitativeOptions: ['Normal', 'Increased'] },
      { name: 'pH', normalRangeMale: '7.2-8.0', normalRangeFemale: 'N/A', normalRangePediatric: 'N/A', decimals: 1, sectionKey: 'physical' },
      { name: 'Sperm count', unit: 'million/mL', normalRangeMale: '>=15', normalRangeFemale: 'N/A', normalRangePediatric: 'N/A', decimals: 0, sectionKey: 'microscopic' },
      { name: 'Motility (active)', unit: '%', normalRangeMale: '>32', normalRangeFemale: 'N/A', normalRangePediatric: 'N/A', decimals: 0, sectionKey: 'microscopic' },
      { name: 'Morphology (normal forms)', unit: '%', normalRangeMale: '>4', normalRangeFemale: 'N/A', normalRangePediatric: 'N/A', decimals: 0, sectionKey: 'microscopic' },
      { name: 'Pus cells', unit: '/HPF', normalRangeMale: '<5', normalRangeFemale: 'N/A', normalRangePediatric: 'N/A', decimals: 0, sectionKey: 'microscopic' },
      { name: 'RBCs', unit: '/HPF', normalRangeMale: 'Nil', normalRangeFemale: 'N/A', normalRangePediatric: 'N/A', sectionKey: 'microscopic' },
      { name: 'Agglutination', sectionKey: 'microscopic', kind: 'qualitative', qualitativeOptions: ['Absent', 'Present'] },
    ],
  },

  // Blood culture
  {
    name: 'Blood Culture & Sensitivity',
    category: 'Microbiology',
    template: 'blood_culture',
    price: 2200,
    sections: [
      { key: 'culture', title: 'Culture', order: 1 },
      { key: 'sensitivity', title: 'Sensitivity', order: 2 },
    ],
    parameters: [
      { name: 'Organism Isolated', sectionKey: 'culture', kind: 'qualitative', qualitativeOptions: ['No growth after 5 days', 'Staphylococcus aureus', 'E. coli', 'Klebsiella', 'Pseudomonas', 'Salmonella typhi', 'Other'] },
      { name: 'Colony Count', sectionKey: 'culture' },
    ],
  },
]

export async function seedLabTestTemplates(opts?: { force?: boolean }) {
  const force = !!opts?.force
  for (const t of SEED_TEMPLATES) {
    const existing: any = await LabTest.findOne({ name: t.name })
    if (existing && !force) {
      // Update only template/sections/parameters/rules; keep price.
      existing.category = t.category
      existing.template = t.template
      existing.sections = t.sections || []
      existing.parameters = t.parameters
      existing.interpretationRules = t.interpretationRules || []
      existing.defaultInterpretation = t.defaultInterpretation || ''
      if (!existing.price && t.price) existing.price = t.price
      await existing.save()
    } else {
      await LabTest.create({
        name: t.name,
        category: t.category,
        template: t.template,
        price: t.price || 0,
        sections: t.sections || [],
        parameters: t.parameters,
        interpretationRules: t.interpretationRules || [],
        defaultInterpretation: t.defaultInterpretation || '',
      })
    }
  }
  return SEED_TEMPLATES.length
}
