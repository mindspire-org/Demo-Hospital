/**
 * Idempotent seeder for the global critical-parameter list.
 * Used as a fallback when a specific test catalog row doesn't define
 * criticalMin/criticalMax for a parameter.
 *
 * Sources: typical adult critical-value tables (representative).
 */

import { LabCriticalParameter } from '../models/CriticalParameter'

export const SEED_CRITICAL_PARAMETERS: Array<{
  parameter: string
  testName?: string
  criticalMin?: number
  criticalMax?: number
  unit?: string
  enabled: boolean
  notes?: string
}> = [
  // ── Hematology ──────────────────────────────────────────────
  { parameter: 'Hemoglobin (Hb)',              unit: 'g/dL',       criticalMin: 7,     criticalMax: 20,    enabled: true, notes: 'Adult; <7 transfusion threshold' },
  { parameter: 'Hb',                          unit: 'g/dL',       criticalMin: 7,     criticalMax: 20,    enabled: true, notes: 'Alias' },
  { parameter: 'Hematocrit (Hct)',            unit: '%',          criticalMin: 21,    criticalMax: 60,    enabled: true },
  { parameter: 'Red Blood Cell Count (RBC)',   unit: 'million/µL',criticalMin: 2,     criticalMax: 8,     enabled: true },
  { parameter: 'White Blood Cell Count (WBC)', unit: '×10³/µL',  criticalMin: 1,     criticalMax: 30,    enabled: true, notes: 'Leukopenia <1; leukocytosis >30' },
  { parameter: 'WBC',                         unit: '×10³/µL',   criticalMin: 1,     criticalMax: 30,    enabled: true, notes: 'Alias' },
  { parameter: 'TLC',                         unit: '10^9/L',    criticalMin: 1,     criticalMax: 30,    enabled: true, notes: 'Alias' },
  { parameter: 'Platelet Count',              unit: '×10³/µL',   criticalMin: 50,    criticalMax: 1000,  enabled: true, notes: '<50 spontaneous bleed risk' },
  { parameter: 'Platelets',                   unit: '10^9/L',    criticalMin: 50,    criticalMax: 1000,  enabled: true, notes: 'Alias' },
  { parameter: 'Neutrophils (Absolute)',       unit: '×10³/µL',  criticalMin: 0.5,   criticalMax: 20,   enabled: true, notes: '<0.5 severe neutropenia' },
  { parameter: 'Lymphocytes (Absolute)',       unit: '×10³/µL',  criticalMin: 0.5,                      enabled: true },
  { parameter: 'Eosinophils (Absolute)',        unit: '×10³/µL',                       criticalMax: 5,    enabled: true },
  { parameter: 'Reticulocyte Count',           unit: '%',                             criticalMax: 8,    enabled: true },
  { parameter: 'ESR',                         unit: 'mm/hr',                         criticalMax: 100,   enabled: true, notes: 'Non-specific but very elevated' },

  // ── Chemistry – Renal ───────────────────────────────────────
  { parameter: 'Blood Urea',                  unit: 'mg/dL',                         criticalMax: 200,   enabled: true },
  { parameter: 'Urea',                        unit: 'mg/dL',                         criticalMax: 200,   enabled: true, notes: 'Alias' },
  { parameter: 'Blood Urea Nitrogen (BUN)',   unit: 'mg/dL',                         criticalMax: 90,    enabled: true },
  { parameter: 'Serum Creatinine',            unit: 'mg/dL',                         criticalMax: 8,     enabled: true },
  { parameter: 'Creatinine',                 unit: 'mg/dL',                         criticalMax: 8,     enabled: true, notes: 'Alias' },
  { parameter: 'Uric Acid',                  unit: 'mg/dL',                         criticalMax: 12,    enabled: true },
  { parameter: 'eGFR',                       unit: 'mL/min/1.73m²',criticalMin: 15,                      enabled: true, notes: '<15 = stage 5 CKD / dialysis' },

  // ── Chemistry – Electrolytes ─────────────────────────────────
  { parameter: 'Sodium (Na)',                 unit: 'mmol/L',    criticalMin: 120,   criticalMax: 160,   enabled: true, notes: '<120 seizure risk; >160 CNS' },
  { parameter: 'Sodium',                     unit: 'mmol/L',    criticalMin: 120,   criticalMax: 160,   enabled: true, notes: 'Alias' },
  { parameter: 'Potassium (K)',              unit: 'mmol/L',    criticalMin: 2.5,   criticalMax: 6.5,   enabled: true, notes: 'Cardiac arrhythmia risk' },
  { parameter: 'Potassium',                  unit: 'mmol/L',    criticalMin: 2.5,   criticalMax: 6.5,   enabled: true, notes: 'Alias' },
  { parameter: 'Chloride (Cl)',              unit: 'mmol/L',    criticalMin: 80,    criticalMax: 115,   enabled: true },
  { parameter: 'Bicarbonate (HCO3)',         unit: 'mmol/L',    criticalMin: 10,    criticalMax: 40,    enabled: true },
  { parameter: 'Calcium',                    unit: 'mg/dL',     criticalMin: 6.5,   criticalMax: 13,    enabled: true, notes: 'Ionized Ca critical ~3.5-6.2' },
  { parameter: 'Total Calcium',              unit: 'mg/dL',     criticalMin: 6.5,   criticalMax: 13,    enabled: true, notes: 'Alias' },
  { parameter: 'Ionized Calcium',            unit: 'mg/dL',     criticalMin: 3.5,   criticalMax: 6.2,   enabled: true },
  { parameter: 'Magnesium',                  unit: 'mg/dL',     criticalMin: 1,     criticalMax: 5,     enabled: true },
  { parameter: 'Phosphorus',                 unit: 'mg/dL',     criticalMin: 1,     criticalMax: 9,     enabled: true },
  { parameter: 'Inorganic Phosphorus',        unit: 'mg/dL',     criticalMin: 1,     criticalMax: 9,     enabled: true, notes: 'Alias' },

  // ── Chemistry – Hepatic / Liver ─────────────────────────────
  { parameter: 'Total Bilirubin',            unit: 'mg/dL',                         criticalMax: 15,    enabled: true },
  { parameter: 'Direct Bilirubin',           unit: 'mg/dL',                         criticalMax: 10,    enabled: true },
  { parameter: 'Indirect Bilirubin',         unit: 'mg/dL',                         criticalMax: 12,    enabled: true },
  { parameter: 'SGOT (AST)',                 unit: 'U/L',                           criticalMax: 2000,  enabled: true, notes: 'Very high = acute liver injury' },
  { parameter: 'AST',                        unit: 'U/L',                           criticalMax: 2000,  enabled: true, notes: 'Alias' },
  { parameter: 'SGPT (ALT)',                 unit: 'U/L',                           criticalMax: 2000,  enabled: true },
  { parameter: 'ALT',                        unit: 'U/L',                           criticalMax: 2000,  enabled: true, notes: 'Alias' },
  { parameter: 'Alkaline Phosphatase (ALP)', unit: 'U/L',                           criticalMax: 1200,  enabled: true },
  { parameter: 'GGT',                        unit: 'U/L',                           criticalMax: 500,   enabled: true },
  { parameter: 'Total Protein',              unit: 'g/dL',      criticalMin: 4,     criticalMax: 12,    enabled: true },
  { parameter: 'Albumin',                    unit: 'g/dL',      criticalMin: 1.5,                       enabled: true },
  { parameter: 'Globulin',                   unit: 'g/dL',      criticalMin: 1,     criticalMax: 5,     enabled: true },
  { parameter: 'A/G Ratio',                  unit: 'ratio',     criticalMin: 0.5,                       enabled: true },
  { parameter: 'LDH',                        unit: 'U/L',                           criticalMax: 2000,  enabled: true },

  // ── Chemistry – Glucose / Metabolic ─────────────────────────
  { parameter: 'Glucose (Fasting)',           unit: 'mg/dL',     criticalMin: 40,    criticalMax: 500,   enabled: true },
  { parameter: 'Glucose (Random)',            unit: 'mg/dL',     criticalMin: 40,    criticalMax: 500,   enabled: true },
  { parameter: 'Fasting Blood Sugar',         unit: 'mg/dL',     criticalMin: 40,    criticalMax: 500,   enabled: true, notes: 'Alias' },
  { parameter: 'Random Blood Sugar',          unit: 'mg/dL',     criticalMin: 40,    criticalMax: 500,   enabled: true, notes: 'Alias' },
  { parameter: 'HbA1c',                      unit: '%',                             criticalMax: 14,    enabled: true, notes: 'Poor control >10; >14 critical' },
  { parameter: 'Lactate',                    unit: 'mmol/L',                         criticalMax: 5,     enabled: true, notes: '>5 lactic acidosis' },

  // ── Chemistry – Cardiac / Muscle ─────────────────────────────
  { parameter: 'Troponin I',                 unit: 'ng/mL',                         criticalMax: 0.5,   enabled: true, notes: '>0.04 possible MI; >0.5 definite' },
  { parameter: 'Troponin T',                 unit: 'ng/mL',                         criticalMax: 0.1,   enabled: true },
  { parameter: 'CK-MB',                     unit: 'U/L',                           criticalMax: 50,    enabled: true },
  { parameter: 'CPK',                        unit: 'U/L',                           criticalMax: 5000,  enabled: true, notes: 'Rhabdomyolysis risk >5000' },
  { parameter: 'CK',                         unit: 'U/L',                           criticalMax: 5000,  enabled: true, notes: 'Alias' },
  { parameter: 'Myoglobin',                  unit: 'ng/mL',                         criticalMax: 200,   enabled: true },
  { parameter: 'BNP',                        unit: 'pg/mL',                         criticalMax: 900,   enabled: true, notes: '>400 heart failure likely' },
  { parameter: 'NT-proBNP',                  unit: 'pg/mL',                         criticalMax: 1800,  enabled: true },

  // ── Chemistry – Lipids ──────────────────────────────────────
  { parameter: 'Total Cholesterol',          unit: 'mg/dL',                         criticalMax: 400,   enabled: true },
  { parameter: 'Triglycerides',              unit: 'mg/dL',                         criticalMax: 1000,  enabled: true, notes: '>1000 pancreatitis risk' },
  { parameter: 'HDL Cholesterol',           unit: 'mg/dL',     criticalMin: 20,                        enabled: true },
  { parameter: 'LDL Cholesterol',            unit: 'mg/dL',                         criticalMax: 300,   enabled: true },
  { parameter: 'VLDL Cholesterol',           unit: 'mg/dL',                         criticalMax: 100,   enabled: true },

  // ── Coagulation ─────────────────────────────────────────────
  { parameter: 'Prothrombin Time (PT)',       unit: 's',                             criticalMax: 30,    enabled: true },
  { parameter: 'PT',                         unit: 's',                             criticalMax: 30,    enabled: true, notes: 'Alias' },
  { parameter: 'INR',                                           criticalMin: 0,     criticalMax: 5,     enabled: true, notes: '>5 major bleed risk' },
  { parameter: 'APTT',                       unit: 's',                             criticalMax: 100,   enabled: true },
  { parameter: 'aPTT',                       unit: 's',                             criticalMax: 100,   enabled: true, notes: 'Alias' },
  { parameter: 'Fibrinogen',                 unit: 'mg/dL',     criticalMin: 100,                       enabled: true, notes: '<100 DIC risk' },
  { parameter: 'D-Dimer',                    unit: 'µg/mL FEU',                    criticalMax: 5,     enabled: true, notes: '>0.5 VTE possible; >5 massive' },
  { parameter: 'Bleeding Time',              unit: 'min',                           criticalMax: 15,    enabled: true },
  { parameter: 'Clotting Time',              unit: 'min',                           criticalMax: 15,    enabled: true },

  // ── Blood Gas ───────────────────────────────────────────────
  { parameter: 'pH',                                            criticalMin: 7.2,   criticalMax: 7.6,   enabled: true, notes: 'Arterial blood gas' },
  { parameter: 'pCO2',                       unit: 'mmHg',      criticalMin: 20,    criticalMax: 70,    enabled: true },
  { parameter: 'pO2',                        unit: 'mmHg',      criticalMin: 50,                        enabled: true, notes: '<60 hypoxemia; <50 critical' },
  { parameter: 'HCO3',                       unit: 'mmol/L',    criticalMin: 10,    criticalMax: 40,    enabled: true },
  { parameter: 'Base Excess',                unit: 'mmol/L',    criticalMin: -10,   criticalMax: 10,    enabled: true },
  { parameter: 'Oxygen Saturation (SpO2)',   unit: '%',         criticalMin: 85,                        enabled: true, notes: '<85 critical hypoxemia' },

  // ── Endocrinology ───────────────────────────────────────────
  { parameter: 'TSH',                        unit: 'mIU/L',     criticalMin: 0.1,   criticalMax: 60,    enabled: true },
  { parameter: 'Free T4',                    unit: 'ng/dL',     criticalMin: 0.2,   criticalMax: 5,     enabled: true },
  { parameter: 'Free T3',                    unit: 'pg/mL',     criticalMin: 1,     criticalMax: 15,    enabled: true },
  { parameter: 'Total T4',                   unit: 'µg/dL',     criticalMin: 2,     criticalMax: 20,    enabled: true },
  { parameter: 'Total T3',                   unit: 'ng/dL',     criticalMin: 30,    criticalMax: 400,   enabled: true },
  { parameter: 'Cortisol (Morning)',         unit: 'µg/dL',     criticalMin: 3,     criticalMax: 60,    enabled: true, notes: '<3 adrenal insufficiency' },
  { parameter: 'Cortisol',                   unit: 'µg/dL',     criticalMin: 3,     criticalMax: 60,    enabled: true, notes: 'Alias' },
  { parameter: 'ACTH',                       unit: 'pg/mL',     criticalMin: 5,     criticalMax: 200,   enabled: true },
  { parameter: 'Prolactin',                  unit: 'ng/mL',                         criticalMax: 200,   enabled: true },
  { parameter: 'FSH',                        unit: 'mIU/mL',    criticalMin: 0.5,   criticalMax: 150,   enabled: true },
  { parameter: 'LH',                         unit: 'mIU/mL',    criticalMin: 0.5,   criticalMax: 150,   enabled: true },
  { parameter: 'Estradiol (E2)',             unit: 'pg/mL',     criticalMin: 10,    criticalMax: 3000,  enabled: true },
  { parameter: 'Progesterone',               unit: 'ng/mL',     criticalMin: 0.5,                       enabled: true },
  { parameter: 'Testosterone (Total)',       unit: 'ng/dL',     criticalMin: 50,    criticalMax: 1500,  enabled: true },
  { parameter: 'Insulin',                    unit: 'µIU/mL',                        criticalMax: 100,   enabled: true },
  { parameter: 'C-Peptide',                  unit: 'ng/mL',     criticalMin: 0.5,   criticalMax: 10,    enabled: true },
  { parameter: 'Parathyroid Hormone (PTH)',  unit: 'pg/mL',     criticalMin: 5,     criticalMax: 500,   enabled: true },
  { parameter: 'PTH',                        unit: 'pg/mL',     criticalMin: 5,     criticalMax: 500,   enabled: true, notes: 'Alias' },
  { parameter: 'Vitamin D (25-OH)',          unit: 'ng/mL',     criticalMin: 8,                         enabled: true, notes: '<8 severe deficiency' },
  { parameter: 'Vitamin B12',                unit: 'pg/mL',     criticalMin: 150,                       enabled: true, notes: '<150 deficiency' },
  { parameter: 'Folate',                     unit: 'ng/mL',     criticalMin: 2,                         enabled: true },
  { parameter: 'Ferritin',                   unit: 'ng/mL',     criticalMin: 10,    criticalMax: 2000,  enabled: true },
  { parameter: 'Iron',                       unit: 'µg/dL',     criticalMin: 20,    criticalMax: 300,   enabled: true },
  { parameter: 'TIBC',                       unit: 'µg/dL',                         criticalMax: 500,   enabled: true },

  // ── Immunology / Serology ───────────────────────────────────
  { parameter: 'CRP',                        unit: 'mg/L',                           criticalMax: 200,   enabled: true, notes: '>100 severe inflammation' },
  { parameter: 'C-Reactive Protein',         unit: 'mg/L',                           criticalMax: 200,   enabled: true, notes: 'Alias' },
  { parameter: 'ESR',                        unit: 'mm/hr',                          criticalMax: 100,   enabled: true },
  { parameter: 'RA Factor',                  unit: 'IU/mL',                          criticalMax: 100,   enabled: true },
  { parameter: 'Anti-CCP',                   unit: 'U/mL',                           criticalMax: 100,   enabled: true },
  { parameter: 'ANA',                        unit: 'titer',                          criticalMax: 1280,  enabled: true },
  { parameter: 'ASO Titre',                  unit: 'IU/mL',                          criticalMax: 800,   enabled: true },
  { parameter: 'IgG',                        unit: 'mg/dL',     criticalMin: 400,   criticalMax: 3000,  enabled: true },
  { parameter: 'IgA',                        unit: 'mg/dL',     criticalMin: 50,    criticalMax: 500,   enabled: true },
  { parameter: 'IgM',                        unit: 'mg/dL',     criticalMin: 20,    criticalMax: 400,   enabled: true },
  { parameter: 'IgE',                        unit: 'IU/mL',                          criticalMax: 1000,  enabled: true },
  { parameter: 'C3',                         unit: 'mg/dL',     criticalMin: 50,                        enabled: true },
  { parameter: 'C4',                         unit: 'mg/dL',     criticalMin: 10,                        enabled: true },

  // ── Urine / Renal markers ───────────────────────────────────
  { parameter: 'Microalbumin',               unit: 'mg/L',                           criticalMax: 300,   enabled: true },
  { parameter: '24-Hour Protein',            unit: 'mg/24hr',                        criticalMax: 3500,  enabled: true },
  { parameter: 'Creatinine Clearance',       unit: 'mL/min',    criticalMin: 15,                        enabled: true },
  { parameter: 'Urine Protein',              unit: 'mg/dL',                          criticalMax: 300,   enabled: true },

  // ── Special / Miscellaneous ─────────────────────────────────
  { parameter: 'Ammonia',                    unit: 'µg/dL',                          criticalMax: 150,   enabled: true, notes: 'Hepatic encephalopathy' },
  { parameter: 'Amylase',                    unit: 'U/L',                            criticalMax: 1000,  enabled: true, notes: 'Pancreatitis' },
  { parameter: 'Lipase',                     unit: 'U/L',                            criticalMax: 1000,  enabled: true, notes: 'Pancreatitis' },
  { parameter: 'Ceruloplasmin',              unit: 'mg/dL',     criticalMin: 10,                        enabled: true, notes: 'Wilson disease <20' },
  { parameter: 'Alpha-1 Antitrypsin',         unit: 'mg/dL',     criticalMin: 50,                        enabled: true },
  { parameter: 'Protein Electrophoresis M-Spike', unit: 'g/dL',criticalMin: 0,     criticalMax: 5,     enabled: true, notes: 'Monoclonal spike' },
]

export async function seedCriticalParameters() {
  let count = 0
  for (const p of SEED_CRITICAL_PARAMETERS) {
    const existing = await LabCriticalParameter.findOne({ parameter: p.parameter, testName: p.testName || { $exists: false } })
    if (existing) continue
    await LabCriticalParameter.create(p)
    count++
  }
  return { added: count, total: SEED_CRITICAL_PARAMETERS.length }
}
