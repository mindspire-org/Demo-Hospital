/**
 * Import lab tests from lab_tests.json into Lab_Test collection.
 * Idempotent — upserts by test name.
 */

import fs from 'fs'
import path from 'path'
import { LabTest } from '../models/Test'
import { findRange, findParamRange } from './normalRanges'

function detectCategory(name: string): string {
  const n = name.toLowerCase()
  if (n.includes('cbc') || n.includes('hb') || n.includes('hemoglobin') || n.includes('esr') || n.includes('hematocrit') || n.includes('platelet') || n.includes('wbc') || n.includes('rbc') || n.includes('pcv') || n.includes('mch') || n.includes('mcv') || n.includes('mchc') || n.includes('rdw') || n.includes('reticulocyte') || n.includes('bleeding') || n.includes('clotting') || n.includes('pt ') || n.includes('aptt') || n.includes('inr') || n.includes('d-dimer') || n.includes('fibrinogen')) return 'Hematology'
  if (n.includes('glucose') || n.includes('sugar') || n.includes('hba1c') || n.includes('a1c') || n.includes('fructosamine')) return 'SpecialChemistry'
  if (n.includes('lipid') || n.includes('cholesterol') || n.includes('triglyceride') || n.includes('hdl') || n.includes('ldl') || n.includes('vldl')) return 'SpecialChemistry'
  if (n.includes('tsh') || n.includes('t3') || n.includes('t4') || n.includes('thyroid') || n.includes('free t') || n.includes('ft3') || n.includes('ft4')) return 'SpecialChemistry'
  if (n.includes('lh') || n.includes('fsh') || n.includes('prolactin') || n.includes('testosterone') || n.includes('estradiol') || n.includes('progesterone') || n.includes('cortisol') || n.includes('acth') || n.includes('hgh') || n.includes('insulin') || n.includes('c-peptide') || n.includes('vitamin d') || n.includes('vit d') || n.includes('b12') || n.includes('folate') || n.includes('ferritin') || n.includes('iron') || n.includes('transferrin') || n.includes('tibc')) return 'Endocrinology'
  if (n.includes('lft') || n.includes('bilirubin') || n.includes('sgpt') || n.includes('sgot') || n.includes('alt') || n.includes('ast') || n.includes('alkaline phosphatase') || n.includes('ggt') || n.includes('albumin') || n.includes('globulin') || n.includes('total protein') || n.includes('ammonia')) return 'Chemistry'
  if (n.includes('rft') || n.includes('urea') || n.includes('creatinine') || n.includes('bun') || n.includes('uric acid') || n.includes('egfr') || n.includes('cystatin')) return 'Chemistry'
  if (n.includes('sodium') || n.includes('potassium') || n.includes('chloride') || n.includes('bicarbonate') || n.includes('co2') || n.includes('calcium') || n.includes('phosphorus') || n.includes('magnesium') || n.includes('zinc') || n.includes('copper') || n.includes('selenium') || n.includes('chromium') || n.includes('lead') || n.includes('mercury') || n.includes('arsenic')) return 'Chemistry'
  if (n.includes('hbsag') || n.includes('anti-hcv') || n.includes('anti hcv') || n.includes('hepatitis') || n.includes('hiv') || n.includes('anti-hiv') || n.includes('vdrl') || n.includes('rpr') || n.includes('tpha') || n.includes('aso') || n.includes('ra factor') || n.includes('rheumatoid') || n.includes('crp') || n.includes('anti-ccp') || n.includes('ana') || n.includes('anti-ds') || n.includes('anca') || n.includes('anti-smooth') || n.includes('anti-mitochondrial') || n.includes('anti-gad') || n.includes('celiac') || n.includes('torch') || n.includes('dengue') || n.includes('malaria') || n.includes('typhidot') || n.includes('wid') || n.includes('brucella') || n.includes('leptospira') || n.includes('tuberculosis') || n.includes('mantoux') || n.includes('tuberculin')) return 'Serology'
  if (n.includes('culture') || n.includes('sensitivity') || n.includes('c/s') || n.includes('blood culture') || n.includes('urine culture') || n.includes('stool culture') || n.includes('sputum culture') || n.includes('throat culture') || n.includes('pus culture') || n.includes('csf culture') || n.includes('afb')) return 'Microbiology'
  if (n.includes('gram stain') || n.includes('zn stain') || n.includes('koh') || n.includes('wet mount') || n.includes('fungal')) return 'Microbiology'
  if (n.includes('pcr') || n.includes('rt-pcr') || n.includes('rna') || n.includes('dna') || n.includes('gene') || n.includes('genotype') || n.includes('molecular') || n.includes('hpylo') || n.includes('hpv') || n.includes('covid') || n.includes('sars') || n.includes('chlamydia') || n.includes('gonorrhea') || n.includes('mycoplasma') || n.includes('ureaplasma')) return 'Molecular'
  if (n.includes('pap') || n.includes('cytology') || n.includes('fnac') || n.includes('fluid cytology') || n.includes('ascitic') || n.includes('pleural') || n.includes('csf cytology')) return 'Cytology'
  if (n.includes('biopsy') || n.includes('histopathology') || n.includes('hpe') || n.includes('tissue')) return 'Histopathology'
  if (n.includes('x-ray') || n.includes('xr') || n.includes('ultrasound') || n.includes('usg') || n.includes('ct ') || n.includes('mri') || n.includes('mammography') || n.includes('dexa') || n.includes('bone density') || n.includes('ecg') || n.includes('echo') || n.includes('eeg') || n.includes('emg') || n.includes('nerve conduction')) return 'Radiology'
  if (n.includes('urine') || n.includes('stool') || n.includes('sputum') || n.includes('semen') || n.includes('csf') || n.includes('ascitic') || n.includes('pleural') || n.includes('synovial') || n.includes('pericardial')) return 'Chemistry'
  if (n.includes('tumor marker') || n.includes('cea') || n.includes('afp') || n.includes('ca ') || n.includes('psa') || n.includes('beta-hcg') || n.includes('thyroglobulin') || n.includes('calcitonin') || n.includes('neuron-specific') || n.includes('nse') || n.includes('progrp') || n.includes('cyfra')) return 'Immunology'
  if (n.includes('electrophoresis') || n.includes('immunoglobulin') || n.includes('igg') || n.includes('igm') || n.includes('iga') || n.includes('ige') || n.includes('complement') || n.includes('haptoglobin') || n.includes('ceruloplasmin')) return 'Immunology'
  if (n.includes('drug') || n.includes('level') || n.includes('phenytoin') || n.includes('carbamazepine') || n.includes('valproic') || n.includes('lithium') || n.includes('digoxin') || n.includes('theophylline') || n.includes('gentamicin') || n.includes('vancomycin') || n.includes('amikacin') || n.includes('tacrolimus') || n.includes('cyclosporine') || n.includes('sirolimus') || n.includes('methotrexate')) return 'SpecialChemistry'
  if (n.includes('g6pd') || n.includes('hemoglobin electrophoresis') || n.includes('hplc') || n.includes('sickle') || n.includes('thalassemia') || n.includes('coombs')) return 'Hematology'
  if (n.includes('amylase') || n.includes('lipase') || n.includes('elastase') || n.includes('fecal fat')) return 'Chemistry'
  if (n.includes('troponin') || n.includes('nt-probnp') || n.includes('bnp') || n.includes('ck-mb') || n.includes('myoglobin') || n.includes('d-dimer') || n.includes('homocysteine') || n.includes('apolipoprotein') || n.includes('lp(a)') || n.includes('lipo')) return 'SpecialChemistry'
  if (n.includes('alpha-fetoprotein') || n.includes('beta-2 microglobulin') || n.includes('chromogranin')) return 'Immunology'
  return 'Other'
}

function detectTemplate(name: string): string {
  const n = name.toLowerCase()
  if (n.includes('cbc') || n.includes('complete blood count')) return 'cbc'
  if (n.includes('urine')) return 'urine_re'
  if (n.includes('semen')) return 'semen'
  if (n.includes('blood culture') || n.includes('c/s')) return 'blood_culture'
  if (n.includes('tft') || n.includes('thyroid function')) return 'tft'
  if (n.includes('hba1c') || n.includes('a1c')) return 'hba1c'
  if (n.includes('lft') || n.includes('liver function')) return 'lft'
  if (n.includes('rft') || n.includes('renal function') || n.includes('kidney function')) return 'rft'
  if (n.includes('lipid')) return 'lipid'
  if (n.includes('hbsag') || n.includes('anti-hcv') || n.includes('hiv') || n.includes('vdrl')) return 'qualitative'
  return 'general'
}

export async function importLabTestsFromJson(opts?: { dryRun?: boolean; jsonPath?: string }) {
  const dryRun = !!opts?.dryRun
  const jsonPath = opts?.jsonPath || path.join(__dirname, '../../../../src/seeds/lab_tests.json')
  const raw = fs.readFileSync(jsonPath, 'utf8')
  const entries: Array<{
    _id?: { $oid?: string }
    Name?: string
    Parameter?: string
    Unit?: string
    Price?: number
    'Created At'?: string
  }> = JSON.parse(raw)

  let created = 0
  let updated = 0
  const skipped: string[] = []

  for (const entry of entries) {
    const name = String(entry.Name || '').trim()
    if (!name) { skipped.push('(empty name)'); continue }

    const parameterName = String(entry.Parameter || '').trim() || name
    const unit = String(entry.Unit || '').trim()
    const price = Number(entry.Price) || 0
    const category = detectCategory(name)
    const template = detectTemplate(name)

    const testRange = findRange(name)
    const paramRange = findParamRange(parameterName, testRange)

    const param: any = {
      name: parameterName,
      unit,
      kind: 'quantitative',
      decimals: 2,
      order: 0,
    }
    if (paramRange) {
      if (paramRange.male) param.normalRangeMale = paramRange.male
      if (paramRange.female) param.normalRangeFemale = paramRange.female
      if (paramRange.pediatric) param.normalRangePediatric = paramRange.pediatric
    }

    const doc: any = {
      name,
      category,
      template,
      price,
      parameter: parameterName,
      unit,
      parameters: [param],
      isActive: true,
    }
    if (testRange && !testRange.parameters) {
      if (testRange.male) doc.normalRangeMale = testRange.male
      if (testRange.female) doc.normalRangeFemale = testRange.female
      if (testRange.pediatric) doc.normalRangePediatric = testRange.pediatric
    }

    if (dryRun) {
      created++
      continue
    }

    const existing = await LabTest.findOne({ name }).lean()
    if (existing) {
      const setFields: any = {
        category: doc.category,
        template: doc.template,
        price: doc.price,
        parameter: doc.parameter,
        unit: doc.unit,
        parameters: doc.parameters,
        isActive: true,
      }
      if (doc.normalRangeMale) setFields.normalRangeMale = doc.normalRangeMale
      if (doc.normalRangeFemale) setFields.normalRangeFemale = doc.normalRangeFemale
      if (doc.normalRangePediatric) setFields.normalRangePediatric = doc.normalRangePediatric
      await LabTest.updateOne({ name }, { $set: setFields })
      updated++
    } else {
      await LabTest.create(doc)
      created++
    }
  }

  return { created, updated, skipped: skipped.length, total: entries.length }
}

// CLI entry point
if (require.main === module) {
  (async () => {
    const { connectDB } = require('../../../config/db')
    await connectDB()
    const res = await importLabTestsFromJson()
    console.log('Import complete:', res)
    process.exit(0)
  })().catch((e: any) => {
    console.error('Import failed:', e)
    process.exit(1)
  })
}
