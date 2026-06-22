/**
 * Seed normal reference ranges for all lab tests.
 * Idempotent — only fills in missing normalRangeMale/Female/Pediatric fields.
 * Run via: POST /lab/seed/normal-ranges
 */

import { LabTest } from '../models/Test'

const REFERENCE_RANGES: Record<string, { male?: string; female?: string; pediatric?: string; parameters?: Record<string, { male?: string; female?: string; pediatric?: string }> }> = {
  'glucose': { male: '70-100', female: '70-100', pediatric: '60-100' },
  'fasting blood sugar': { male: '70-100', female: '70-100', pediatric: '60-100' },
  'fbs': { male: '70-100', female: '70-100', pediatric: '60-100' },
  'random blood sugar': { male: '<140', female: '<140', pediatric: '<140' },
  'rbs': { male: '<140', female: '<140', pediatric: '<140' },
  'post prandial': { male: '<140', female: '<140', pediatric: '<140' },
  'ppbs': { male: '<140', female: '<140', pediatric: '<140' },
  'hba1c': { male: '4.0-5.6', female: '4.0-5.6', pediatric: '4.0-5.6' },
  'urea': { male: '7-20', female: '7-20', pediatric: '5-18' },
  'blood urea': { male: '7-20', female: '7-20', pediatric: '5-18' },
  'creatinine': { male: '0.7-1.3', female: '0.6-1.1', pediatric: '0.3-0.7' },
  'uric acid': { male: '3.4-7.0', female: '2.4-6.0', pediatric: '2.0-5.5' },
  'bilirubin': { male: '0.2-1.2', female: '0.2-1.2', pediatric: '0.2-1.0' },
  'total bilirubin': { male: '0.2-1.2', female: '0.2-1.2', pediatric: '0.2-1.0' },
  'direct bilirubin': { male: '0.0-0.3', female: '0.0-0.3', pediatric: '0.0-0.3' },
  'alt': { male: '10-40', female: '7-35', pediatric: '5-30' },
  'sgpt': { male: '10-40', female: '7-35', pediatric: '5-30' },
  'ast': { male: '10-40', female: '8-35', pediatric: '5-30' },
  'sgot': { male: '10-40', female: '8-35', pediatric: '5-30' },
  'alp': { male: '40-129', female: '35-104', pediatric: '50-380' },
  'alkaline phosphatase': { male: '40-129', female: '35-104', pediatric: '50-380' },
  'gamma gt': { male: '8-61', female: '5-36', pediatric: '5-23' },
  'ggt': { male: '8-61', female: '5-36', pediatric: '5-23' },
  'total protein': { male: '6.0-8.3', female: '6.0-8.3', pediatric: '6.0-8.0' },
  'albumin': { male: '3.5-5.5', female: '3.5-5.5', pediatric: '3.5-5.5' },
  'globulin': { male: '2.0-3.5', female: '2.0-3.5', pediatric: '2.0-3.5' },
  'sodium': { male: '135-145', female: '135-145', pediatric: '135-145' },
  'potassium': { male: '3.5-5.1', female: '3.5-5.1', pediatric: '3.5-5.1' },
  'chloride': { male: '98-107', female: '98-107', pediatric: '98-107' },
  'calcium': { male: '8.6-10.3', female: '8.6-10.3', pediatric: '8.8-10.8' },
  'phosphate': { male: '2.5-4.5', female: '2.5-4.5', pediatric: '4.0-6.5' },
  'magnesium': { male: '1.7-2.2', female: '1.7-2.2', pediatric: '1.7-2.2' },
  'iron': { male: '65-176', female: '26-170', pediatric: '50-120' },
  'ferritin': { male: '24-336', female: '11-307', pediatric: '7-140' },
  'tibc': { male: '250-450', female: '250-450', pediatric: '250-450' },
  'vitamin b12': { male: '200-900', female: '200-900', pediatric: '200-900' },
  'vitamin d': { male: '30-100', female: '30-100', pediatric: '30-100' },
  'folate': { male: '3.1-17.5', female: '3.1-17.5', pediatric: '5.0-21.0' },
  'tsh': { male: '0.4-4.0', female: '0.4-4.0', pediatric: '0.7-6.0' },
  't3': { male: '0.8-2.0', female: '0.8-2.0', pediatric: '0.8-2.0' },
  't4': { male: '5.1-14.1', female: '5.1-14.1', pediatric: '6.0-16.0' },
  'ft3': { male: '2.3-4.2', female: '2.3-4.2', pediatric: '2.3-4.2' },
  'ft4': { male: '0.8-1.8', female: '0.8-1.8', pediatric: '0.8-1.8' },
  'cholesterol': { male: '<200', female: '<200', pediatric: '<170' },
  'total cholesterol': { male: '<200', female: '<200', pediatric: '<170' },
  'triglycerides': { male: '<150', female: '<150', pediatric: '<100' },
  'hdl': { male: '>40', female: '>50', pediatric: '>40' },
  'ldl': { male: '<100', female: '<100', pediatric: '<110' },
  'vldl': { male: '<30', female: '<30', pediatric: '<30' },
  'crp': { male: '<5', female: '<5', pediatric: '<5' },
  'esr': { male: '0-15', female: '0-20', pediatric: '0-10' },
  'troponin': { male: '<0.04', female: '<0.04', pediatric: '<0.04' },
  'amylase': { male: '30-110', female: '30-110', pediatric: '30-110' },
  'lipase': { male: '0-60', female: '0-60', pediatric: '0-60' },
  'ldh': { male: '140-280', female: '140-280', pediatric: '180-430' },
  'ck': { male: '30-200', female: '30-170', pediatric: '30-200' },
  'prolactin': { male: '3-15', female: '3-25', pediatric: '3-20' },
  'fsh': { male: '1.4-18.1', female: '4.7-21.5', pediatric: '1.0-10.0' },
  'lh': { male: '1.5-9.3', female: '1.9-12.5', pediatric: '1.0-8.0' },
  'testosterone': { male: '10-35', female: '0.5-2.4', pediatric: '1.0-10.0' },
  'psa': { male: '<4.0', female: 'N/A', pediatric: 'N/A' },
  'ca-125': { male: '<35', female: '<35', pediatric: '<35' },
  'd-dimer': { male: '<0.5', female: '<0.5', pediatric: '<0.5' },
  'pt': { male: '11-13.5', female: '11-13.5', pediatric: '11-13.5' },
  'inr': { male: '0.8-1.2', female: '0.8-1.2', pediatric: '0.8-1.2' },
  'aptt': { male: '25-35', female: '25-35', pediatric: '25-35' },
  'insulin': { male: '2.6-24.9', female: '2.6-24.9', pediatric: '2.6-24.9' },
  'c3': { male: '90-180', female: '90-180', pediatric: '90-180' },
  'c4': { male: '10-40', female: '10-40', pediatric: '10-40' },
  'coombs': { male: 'Negative', female: 'Negative', pediatric: 'Negative' },
  'sickling': { male: 'Negative', female: 'Negative', pediatric: 'Negative' },
  'blood group': { male: 'A, B, AB, or O', female: 'A, B, AB, or O', pediatric: 'A, B, AB, or O' },
  'hbsag': { male: 'Negative', female: 'Negative', pediatric: 'Negative' },
  'anti-hcv': { male: 'Negative', female: 'Negative', pediatric: 'Negative' },
  'anti-hiv': { male: 'Negative', female: 'Negative', pediatric: 'Negative' },
  'hiv': { male: 'Negative', female: 'Negative', pediatric: 'Negative' },
  'dengue': { male: 'Negative', female: 'Negative', pediatric: 'Negative' },
  'widal': { male: '<1:80', female: '<1:80', pediatric: '<1:80' },
  'malaria': { male: 'Negative', female: 'Negative', pediatric: 'Negative' },
  'culture': { male: 'No growth', female: 'No growth', pediatric: 'No growth' },
  'pcr': { male: 'Not Detected', female: 'Not Detected', pediatric: 'Not Detected' },
  'elisa': { male: 'Negative', female: 'Negative', pediatric: 'Negative' },
  'hepatitis': { male: 'Negative', female: 'Negative', pediatric: 'Negative' },
  'ana': { male: 'Negative', female: 'Negative', pediatric: 'Negative' },
  'ra factor': { male: '<14', female: '<14', pediatric: '<14' },
  'anti-ccp': { male: '<20', female: '<20', pediatric: '<20' },
  'csf': { male: 'Normal', female: 'Normal', pediatric: 'Normal' },
  'fluid': { male: 'Normal', female: 'Normal', pediatric: 'Normal' },
  'liver function': { male: 'Refer to report', female: 'Refer to report', pediatric: 'Refer to report' },
  'renal function': { male: 'Refer to report', female: 'Refer to report', pediatric: 'Refer to report' },
  'bone': { male: 'Refer to report', female: 'Refer to report', pediatric: 'Refer to report' },
  'profile': { male: 'Refer to report', female: 'Refer to report', pediatric: 'Refer to report' },
  'stimulation test': { male: 'Refer to report', female: 'Refer to report', pediatric: 'Refer to report' },
  'flow cytometry': { male: 'Refer to report', female: 'Refer to report', pediatric: 'Refer to report' },
  'electrophoresis': { male: 'Refer to report', female: 'Refer to report', pediatric: 'Refer to report' },
  'biopsy': { male: 'Refer to report', female: 'Refer to report', pediatric: 'Refer to report' },
  'smear': { male: 'Normocytic, Normochromic', female: 'Normocytic, Normochromic', pediatric: 'Normocytic, Normochromic' },
  'thalassemia': { male: 'Negative', female: 'Negative', pediatric: 'Negative' },
  'screening': { male: 'Negative', female: 'Negative', pediatric: 'Negative' },
  'swab': { male: 'No growth', female: 'No growth', pediatric: 'No growth' },
  'sputum': { male: 'No growth', female: 'No growth', pediatric: 'No growth' },
  'marker': { male: 'Refer to report', female: 'Refer to report', pediatric: 'Refer to report' },
  'fertility': { male: 'Refer to report', female: 'Refer to report', pediatric: 'Refer to report' },
  'osmolality': { male: '275-295', female: '275-295', pediatric: '275-295' },

  // Panel test parameters
  'cbc': { parameters: {
    'hb': { male: '13.5-17.5', female: '12.0-15.5', pediatric: '11.0-16.0' },
    'hemoglobin': { male: '13.5-17.5', female: '12.0-15.5', pediatric: '11.0-16.0' },
    'tlc': { male: '4.5-11.0', female: '4.5-11.0', pediatric: '5.0-15.0' },
    'wbc': { male: '4.5-11.0', female: '4.5-11.0', pediatric: '5.0-15.0' },
    'rbc': { male: '4.7-6.1', female: '4.2-5.4', pediatric: '3.5-5.5' },
    'platelets': { male: '150-400', female: '150-400', pediatric: '150-450' },
    'hct': { male: '38.8-50.0', female: '34.9-44.5', pediatric: '35-45' },
    'hematocrit': { male: '38.8-50.0', female: '34.9-44.5', pediatric: '35-45' },
    'mcv': { male: '80-100', female: '80-100', pediatric: '70-86' },
    'mch': { male: '27-33', female: '27-33', pediatric: '25-32' },
    'mchc': { male: '32-36', female: '32-36', pediatric: '30-36' },
    'neutrophils': { male: '40-75', female: '40-75', pediatric: '30-60' },
    'lymphocytes': { male: '20-45', female: '20-45', pediatric: '30-60' },
    'monocytes': { male: '2-10', female: '2-10', pediatric: '2-10' },
    'eosinophils': { male: '1-6', female: '1-6', pediatric: '1-6' },
    'basophils': { male: '0-1', female: '0-1', pediatric: '0-1' },
  }},
  'lft': { parameters: {
    'total bilirubin': { male: '0.2-1.2', female: '0.2-1.2', pediatric: '0.2-1.0' },
    'direct bilirubin': { male: '0.0-0.3', female: '0.0-0.3', pediatric: '0.0-0.3' },
    'alt': { male: '10-40', female: '7-35', pediatric: '5-30' },
    'sgpt': { male: '10-40', female: '7-35', pediatric: '5-30' },
    'ast': { male: '10-40', female: '8-35', pediatric: '5-30' },
    'sgot': { male: '10-40', female: '8-35', pediatric: '5-30' },
    'alkaline phosphatase': { male: '40-129', female: '35-104', pediatric: '50-380' },
    'alp': { male: '40-129', female: '35-104', pediatric: '50-380' },
    'total protein': { male: '6.0-8.3', female: '6.0-8.3', pediatric: '6.0-8.0' },
    'albumin': { male: '3.5-5.5', female: '3.5-5.5', pediatric: '3.5-5.5' },
    'globulin': { male: '2.0-3.5', female: '2.0-3.5', pediatric: '2.0-3.5' },
    'gamma gt': { male: '8-61', female: '5-36', pediatric: '5-23' },
  }},
  'rft': { parameters: {
    'urea': { male: '7-20', female: '7-20', pediatric: '5-18' },
    'creatinine': { male: '0.7-1.3', female: '0.6-1.1', pediatric: '0.3-0.7' },
    'sodium': { male: '135-145', female: '135-145', pediatric: '135-145' },
    'potassium': { male: '3.5-5.1', female: '3.5-5.1', pediatric: '3.5-5.1' },
    'chloride': { male: '98-107', female: '98-107', pediatric: '98-107' },
    'uric acid': { male: '3.4-7.0', female: '2.4-6.0', pediatric: '2.0-5.5' },
  }},
  'tft': { parameters: {
    'tsh': { male: '0.4-4.0', female: '0.4-4.0', pediatric: '0.7-6.0' },
    't3': { male: '0.8-2.0', female: '0.8-2.0', pediatric: '0.8-2.0' },
    't4': { male: '5.1-14.1', female: '5.1-14.1', pediatric: '6.0-16.0' },
    'ft3': { male: '2.3-4.2', female: '2.3-4.2', pediatric: '2.3-4.2' },
    'ft4': { male: '0.8-1.8', female: '0.8-1.8', pediatric: '0.8-1.8' },
  }},
  'thyroid': { male: 'Refer to report', female: 'Refer to report', pediatric: 'Refer to report', parameters: {
    'tsh': { male: '0.4-4.0', female: '0.4-4.0', pediatric: '0.7-6.0' },
    't3': { male: '0.8-2.0', female: '0.8-2.0', pediatric: '0.8-2.0' },
    't4': { male: '5.1-14.1', female: '5.1-14.1', pediatric: '6.0-16.0' },
    'ft3': { male: '2.3-4.2', female: '2.3-4.2', pediatric: '2.3-4.2' },
    'ft4': { male: '0.8-1.8', female: '0.8-1.8', pediatric: '0.8-1.8' },
  }},
  'lipid': { male: 'Refer to report', female: 'Refer to report', pediatric: 'Refer to report', parameters: {
    'total cholesterol': { male: '<200', female: '<200', pediatric: '<170' },
    'cholesterol': { male: '<200', female: '<200', pediatric: '<170' },
    'triglycerides': { male: '<150', female: '<150', pediatric: '<100' },
    'hdl': { male: '>40', female: '>50', pediatric: '>40' },
    'ldl': { male: '<100', female: '<100', pediatric: '<110' },
    'vldl': { male: '<30', female: '<30', pediatric: '<30' },
  }},
  'electrolyte': { male: 'Refer to report', female: 'Refer to report', pediatric: 'Refer to report', parameters: {
    'sodium': { male: '135-145', female: '135-145', pediatric: '135-145' },
    'potassium': { male: '3.5-5.1', female: '3.5-5.1', pediatric: '3.5-5.1' },
    'chloride': { male: '98-107', female: '98-107', pediatric: '98-107' },
  }},
  'abg': { parameters: {
    'ph': { male: '7.35-7.45', female: '7.35-7.45', pediatric: '7.35-7.45' },
    'pco2': { male: '35-45', female: '35-45', pediatric: '35-45' },
    'po2': { male: '75-100', female: '75-100', pediatric: '75-100' },
    'hco3': { male: '22-26', female: '22-26', pediatric: '22-26' },
    'base excess': { male: '-2 to +2', female: '-2 to +2', pediatric: '-2 to +2' },
    'o2 saturation': { male: '95-100', female: '95-100', pediatric: '95-100' },
  }},
  'blood gas': { male: 'Refer to report', female: 'Refer to report', pediatric: 'Refer to report', parameters: {
    'ph': { male: '7.35-7.45', female: '7.35-7.45', pediatric: '7.35-7.45' },
    'pco2': { male: '35-45', female: '35-45', pediatric: '35-45' },
    'po2': { male: '75-100', female: '75-100', pediatric: '75-100' },
    'hco3': { male: '22-26', female: '22-26', pediatric: '22-26' },
    'base excess': { male: '-2 to +2', female: '-2 to +2', pediatric: '-2 to +2' },
    'o2 saturation': { male: '95-100', female: '95-100', pediatric: '95-100' },
  }},
  'vbg': { parameters: {
    'ph': { male: '7.31-7.41', female: '7.31-7.41', pediatric: '7.31-7.41' },
    'pco2': { male: '40-50', female: '40-50', pediatric: '40-50' },
    'po2': { male: '30-50', female: '30-50', pediatric: '30-50' },
    'hco3': { male: '22-26', female: '22-26', pediatric: '22-26' },
  }},
  'cardiac': { male: 'Refer to report', female: 'Refer to report', pediatric: 'Refer to report', parameters: {
    'troponin': { male: '<0.04', female: '<0.04', pediatric: '<0.04' },
    'ck': { male: '30-200', female: '30-170', pediatric: '30-200' },
    'ck-mb': { male: '0-25', female: '0-25', pediatric: '0-25' },
    'ldh': { male: '140-280', female: '140-280', pediatric: '180-430' },
  }},
  'urine': { male: 'Refer to report', female: 'Refer to report', pediatric: 'Refer to report', parameters: {
    'colour': { male: 'Pale yellow', female: 'Pale yellow', pediatric: 'Pale yellow' },
    'color': { male: 'Pale yellow', female: 'Pale yellow', pediatric: 'Pale yellow' },
    'appearance': { male: 'Clear', female: 'Clear', pediatric: 'Clear' },
    'sp. gravity': { male: '1.005-1.030', female: '1.005-1.030', pediatric: '1.005-1.030' },
    'specific gravity': { male: '1.005-1.030', female: '1.005-1.030', pediatric: '1.005-1.030' },
    'ph': { male: '5.0-8.0', female: '5.0-8.0', pediatric: '5.0-8.0' },
    'sugar': { male: 'Negative', female: 'Negative', pediatric: 'Negative' },
    'protein': { male: 'Negative', female: 'Negative', pediatric: 'Negative' },
    'ketones': { male: 'Negative', female: 'Negative', pediatric: 'Negative' },
    'blood': { male: 'Negative', female: 'Negative', pediatric: 'Negative' },
    'bilirubin': { male: 'Negative', female: 'Negative', pediatric: 'Negative' },
    'nitrite': { male: 'Negative', female: 'Negative', pediatric: 'Negative' },
    'pus cells': { male: '0-2/HPF', female: '0-2/HPF', pediatric: '0-2/HPF' },
    'rbc': { male: '0-2/HPF', female: '0-2/HPF', pediatric: '0-2/HPF' },
  }},
  'stool': { male: 'Normal', female: 'Normal', pediatric: 'Normal', parameters: {
    'colour': { male: 'Brown', female: 'Brown', pediatric: 'Brown' },
    'color': { male: 'Brown', female: 'Brown', pediatric: 'Brown' },
    'consistency': { male: 'Formed', female: 'Formed', pediatric: 'Formed' },
    'blood': { male: 'Negative', female: 'Negative', pediatric: 'Negative' },
    'mucus': { male: 'Negative', female: 'Negative', pediatric: 'Negative' },
    'pus cells': { male: '0-2/HPF', female: '0-2/HPF', pediatric: '0-2/HPF' },
    'rbc': { male: 'Nil', female: 'Nil', pediatric: 'Nil' },
    'ova': { male: 'Nil', female: 'Nil', pediatric: 'Nil' },
  }},
  'blood culture': { parameters: {
    'organism isolated': { male: 'No growth', female: 'No growth', pediatric: 'No growth' },
    'colony count': { male: 'No growth', female: 'No growth', pediatric: 'No growth' },
  }},
}

function norm(s: string): string {
  return String(s || '').trim().toLowerCase().replace(/\s+/g, ' ')
}

export function findRange(name: string) {
  const n = norm(name)
  if (REFERENCE_RANGES[n]) return REFERENCE_RANGES[n]
  const keys = Object.keys(REFERENCE_RANGES).sort((a, b) => b.length - a.length)
  for (const k of keys) {
    if (n.includes(k)) return REFERENCE_RANGES[k]
  }
  return null
}

export function findParamRange(paramName: string, testRange: any) {
  if (!testRange) return null
  const n = norm(paramName)
  if (testRange.parameters) {
    if (testRange.parameters[n]) return testRange.parameters[n]
    const keys = Object.keys(testRange.parameters).sort((a, b) => b.length - a.length)
    for (const k of keys) {
      if (n.includes(k) || k.includes(n)) return testRange.parameters[k]
    }
  }
  const top = findRange(paramName)
  if (top && !top.parameters) return top
  return null
}

export async function seedNormalRanges() {
  const allTests = await LabTest.find({}).lean()
  let updated = 0
  let skipped = 0

  for (const test of allTests) {
    const testRange = findRange(test.name)
    const params = test.parameters || []
    let needsUpdate = false
    const updateFields: any = {}

    // No parameters - set top-level ranges
    if (params.length === 0 && testRange && !testRange.parameters) {
      if (!test.normalRangeMale && testRange.male) { updateFields.normalRangeMale = testRange.male; needsUpdate = true }
      if (!test.normalRangeFemale && testRange.female) { updateFields.normalRangeFemale = testRange.female; needsUpdate = true }
      if (!test.normalRangePediatric && testRange.pediatric) { updateFields.normalRangePediatric = testRange.pediatric; needsUpdate = true }
    }

    // Has parameters - fill per param
    if (params.length > 0) {
      let changed = false
      const newParams = params.map((p: any) => {
        if (p.normalRangeMale || p.normalRangeFemale || p.normalRangePediatric) return p
        const pr = findParamRange(p.name, testRange)
        if (!pr) return p
        const u: any = { ...p }
        if (pr.male) u.normalRangeMale = pr.male
        if (pr.female) u.normalRangeFemale = pr.female
        if (pr.pediatric) u.normalRangePediatric = pr.pediatric
        changed = true
        return u
      })
      if (changed) { updateFields.parameters = newParams; needsUpdate = true }
    }

    if (needsUpdate) {
      await LabTest.updateOne({ _id: test._id }, { $set: updateFields })
      updated++
    } else {
      skipped++
    }
  }

  return { updated, skipped, total: allTests.length }
}
