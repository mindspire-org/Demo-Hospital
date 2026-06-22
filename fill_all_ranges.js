const { MongoClient } = require('mongodb');

// Known reference ranges for common lab tests
// Format: { testNamePattern: { male, female, pediatric, parameters: { paramName: { male, female, pediatric } } } }
const REFERENCE_RANGES = {
  // Single analyte tests (top-level ranges)
  'glucose': { male: '70-100', female: '70-100', pediatric: '60-100' },
  'fasting blood sugar': { male: '70-100', female: '70-100', pediatric: '60-100' },
  'fbs': { male: '70-100', female: '70-100', pediatric: '60-100' },
  'random blood sugar': { male: '<140', female: '<140', pediatric: '<140' },
  'rbs': { male: '<140', female: '<140', pediatric: '<140' },
  'post prandial': { male: '<140', female: '<140', pediatric: '<140' },
  'ppbs': { male: '<140', female: '<140', pediatric: '<140' },
  'hba1c': { male: '4.0-5.6', female: '4.0-5.6', pediatric: '4.0-5.6' },
  'hba1c with eag': { male: '4.0-5.6', female: '4.0-5.6', pediatric: '4.0-5.6' },
  'urea': { male: '7-20', female: '7-20', pediatric: '5-18' },
  'blood urea': { male: '7-20', female: '7-20', pediatric: '5-18' },
  'creatinine': { male: '0.7-1.3', female: '0.6-1.1', pediatric: '0.3-0.7' },
  'uric acid': { male: '3.4-7.0', female: '2.4-6.0', pediatric: '2.0-5.5' },
  'total bilirubin': { male: '0.2-1.2', female: '0.2-1.2', pediatric: '0.2-1.0' },
  'bilirubin total': { male: '0.2-1.2', female: '0.2-1.2', pediatric: '0.2-1.0' },
  'direct bilirubin': { male: '0.0-0.3', female: '0.0-0.3', pediatric: '0.0-0.3' },
  'indirect bilirubin': { male: '0.1-1.0', female: '0.1-1.0', pediatric: '0.1-0.8' },
  'alt': { male: '10-40', female: '7-35', pediatric: '5-30' },
  'sgpt': { male: '10-40', female: '7-35', pediatric: '5-30' },
  'alanine transaminase': { male: '10-40', female: '7-35', pediatric: '5-30' },
  'ast': { male: '10-40', female: '8-35', pediatric: '5-30' },
  'sgot': { male: '10-40', female: '8-35', pediatric: '5-30' },
  'aspartate transaminase': { male: '10-40', female: '8-35', pediatric: '5-30' },
  'alp': { male: '40-129', female: '35-104', pediatric: '50-380' },
  'alkaline phosphatase': { male: '40-129', female: '35-104', pediatric: '50-380' },
  'gamma gt': { male: '8-61', female: '5-36', pediatric: '5-23' },
  'ggt': { male: '8-61', female: '5-36', pediatric: '5-23' },
  'total protein': { male: '6.0-8.3', female: '6.0-8.3', pediatric: '6.0-8.0' },
  'albumin': { male: '3.5-5.5', female: '3.5-5.5', pediatric: '3.5-5.5' },
  'globulin': { male: '2.0-3.5', female: '2.0-3.5', pediatric: '2.0-3.5' },
  'a/g ratio': { male: '1.0-2.0', female: '1.0-2.0', pediatric: '1.0-2.0' },
  'sodium': { male: '135-145', female: '135-145', pediatric: '135-145' },
  'potassium': { male: '3.5-5.1', female: '3.5-5.1', pediatric: '3.5-5.1' },
  'chloride': { male: '98-107', female: '98-107', pediatric: '98-107' },
  'calcium': { male: '8.6-10.3', female: '8.6-10.3', pediatric: '8.8-10.8' },
  'calcium total': { male: '8.6-10.3', female: '8.6-10.3', pediatric: '8.8-10.8' },
  'phosphate': { male: '2.5-4.5', female: '2.5-4.5', pediatric: '4.0-6.5' },
  'phosphorus': { male: '2.5-4.5', female: '2.5-4.5', pediatric: '4.0-6.5' },
  'magnesium': { male: '1.7-2.2', female: '1.7-2.2', pediatric: '1.7-2.2' },
  'iron': { male: '65-176', female: '26-170', pediatric: '50-120' },
  'total iron': { male: '65-176', female: '26-170', pediatric: '50-120' },
  'ferritin': { male: '24-336', female: '11-307', pediatric: '7-140' },
  'tibc': { male: '250-450', female: '250-450', pediatric: '250-450' },
  'transferrin': { male: '200-360', female: '200-360', pediatric: '200-360' },
  'vitamin b12': { male: '200-900', female: '200-900', pediatric: '200-900' },
  'vitamin d': { male: '30-100', female: '30-100', pediatric: '30-100' },
  'folate': { male: '3.1-17.5', female: '3.1-17.5', pediatric: '5.0-21.0' },
  'folic acid': { male: '3.1-17.5', female: '3.1-17.5', pediatric: '5.0-21.0' },
  'tsh': { male: '0.4-4.0', female: '0.4-4.0', pediatric: '0.7-6.0' },
  't3': { male: '0.8-2.0', female: '0.8-2.0', pediatric: '0.8-2.0' },
  't3 total': { male: '0.8-2.0', female: '0.8-2.0', pediatric: '0.8-2.0' },
  't4': { male: '5.1-14.1', female: '5.1-14.1', pediatric: '6.0-16.0' },
  'ft3': { male: '2.3-4.2', female: '2.3-4.2', pediatric: '2.3-4.2' },
  'ft4': { male: '0.8-1.8', female: '0.8-1.8', pediatric: '0.8-1.8' },
  'total cholesterol': { male: '<200', female: '<200', pediatric: '<170' },
  'cholesterol': { male: '<200', female: '<200', pediatric: '<170' },
  'triglycerides': { male: '<150', female: '<150', pediatric: '<100' },
  'hdl': { male: '>40', female: '>50', pediatric: '>40' },
  'ldl': { male: '<100', female: '<100', pediatric: '<110' },
  'vldl': { male: '<30', female: '<30', pediatric: '<30' },
  'hdl/ldl': { male: '<100', female: '<100', pediatric: '<110' },
  'hdl/ldl-cholesterol': { male: '>40', female: '>50', pediatric: '>40' },
  'crp': { male: '<5', female: '<5', pediatric: '<5' },
  'c-reactive protein': { male: '<5', female: '<5', pediatric: '<5' },
  'hs crp': { male: '<3', female: '<3', pediatric: '<3' },
  'high sensitive c-reactive protein': { male: '<3', female: '<3', pediatric: '<3' },
  'ra factor': { male: '<14', female: '<14', pediatric: '<14' },
  'anti-ccp': { male: '<20', female: '<20', pediatric: '<20' },
  'esr': { male: '0-15', female: '0-20', pediatric: '0-10' },
  'troponin': { male: '<0.04', female: '<0.04', pediatric: '<0.04' },
  'trop': { male: '<0.04', female: '<0.04', pediatric: '<0.04' },
  'amylase': { male: '30-110', female: '30-110', pediatric: '30-110' },
  'lipase': { male: '0-60', female: '0-60', pediatric: '0-60' },
  'ldh': { male: '140-280', female: '140-280', pediatric: '180-430' },
  'ck': { male: '30-200', female: '30-170', pediatric: '30-200' },
  'cpk': { male: '30-200', female: '30-170', pediatric: '30-200' },
  'prolactin': { male: '3-15', female: '3-25', pediatric: '3-20' },
  'fsh': { male: '1.4-18.1', female: '4.7-21.5', pediatric: '1.0-10.0' },
  'lh': { male: '1.5-9.3', female: '1.9-12.5', pediatric: '1.0-8.0' },
  'testosterone': { male: '10-35', female: '0.5-2.4', pediatric: '1.0-10.0' },
  'psa': { male: '<4.0', female: 'N/A', pediatric: 'N/A' },
  'psa ratio': { male: '>0.25', female: 'N/A', pediatric: 'N/A' },
  'ca-125': { male: '<35', female: '<35', pediatric: '<35' },
  'd-dimer': { male: '<0.5', female: '<0.5', pediatric: '<0.5' },
  'fdps': { male: '<0.5', female: '<0.5', pediatric: '<0.5' },
  'pt': { male: '11-13.5', female: '11-13.5', pediatric: '11-13.5' },
  'pt with inr': { male: '11-13.5', female: '11-13.5', pediatric: '11-13.5' },
  'inr': { male: '0.8-1.2', female: '0.8-1.2', pediatric: '0.8-1.2' },
  'aptt': { male: '25-35', female: '25-35', pediatric: '25-35' },
  'coagulation profile': { male: '11-13.5', female: '11-13.5', pediatric: '11-13.5' },
  'fibrinogen': { male: '200-400', female: '200-400', pediatric: '200-400' },
  'insulin': { male: '2.6-24.9', female: '2.6-24.9', pediatric: '2.6-24.9' },
  'insulin level': { male: '2.6-24.9', female: '2.6-24.9', pediatric: '2.6-24.9' },
  'c3': { male: '90-180', female: '90-180', pediatric: '90-180' },
  'complement c3': { male: '90-180', female: '90-180', pediatric: '90-180' },
  'c4': { male: '10-40', female: '10-40', pediatric: '10-40' },
  'complement c4': { male: '10-40', female: '10-40', pediatric: '10-40' },
  'coombs test direct': { male: 'Negative', female: 'Negative', pediatric: 'Negative' },
  'coombs test indirect': { male: 'Negative', female: 'Negative', pediatric: 'Negative' },
  'sickling test': { male: 'Negative', female: 'Negative', pediatric: 'Negative' },
  'blood group': { male: 'A, B, AB, or O', female: 'A, B, AB, or O', pediatric: 'A, B, AB, or O' },
  'blood group abo': { male: 'A, B, AB, or O', female: 'A, B, AB, or O', pediatric: 'A, B, AB, or O' },
  'x-match': { male: 'Compatible', female: 'Compatible', pediatric: 'Compatible' },
  'hbsag': { male: 'Negative', female: 'Negative', pediatric: 'Negative' },
  'anti-hcv': { male: 'Negative', female: 'Negative', pediatric: 'Negative' },
  'anti-hiv': { male: 'Negative', female: 'Negative', pediatric: 'Negative' },
  'dengue': { male: 'Negative', female: 'Negative', pediatric: 'Negative' },
  'widal': { male: '<1:80', female: '<1:80', pediatric: '<1:80' },
  'mantoux': { male: '<5mm', female: '<5mm', pediatric: '<5mm' },
  'gene expert': { male: 'Negative', female: 'Negative', pediatric: 'Negative' },
  'malarial parasite': { male: 'Negative', female: 'Negative', pediatric: 'Negative' },
  'osmolality': { male: '275-295', female: '275-295', pediatric: '275-295' },
  
  // Panel tests with parameters
  'liver function test': {
    parameters: {
      'total bilirubin': { male: '0.2-1.2', female: '0.2-1.2', pediatric: '0.2-1.0' },
      'direct bilirubin': { male: '0.0-0.3', female: '0.0-0.3', pediatric: '0.0-0.3' },
      'indirect bilirubin': { male: '0.1-1.0', female: '0.1-1.0', pediatric: '0.1-0.8' },
      'alt': { male: '10-40', female: '7-35', pediatric: '5-30' },
      'sgpt': { male: '10-40', female: '7-35', pediatric: '5-30' },
      'ast': { male: '10-40', female: '8-35', pediatric: '5-30' },
      'sgot': { male: '10-40', female: '8-35', pediatric: '5-30' },
      'alp': { male: '40-129', female: '35-104', pediatric: '50-380' },
      'total protein': { male: '6.0-8.3', female: '6.0-8.3', pediatric: '6.0-8.0' },
      'albumin': { male: '3.5-5.5', female: '3.5-5.5', pediatric: '3.5-5.5' },
      'globulin': { male: '2.0-3.5', female: '2.0-3.5', pediatric: '2.0-3.5' },
      'a/g ratio': { male: '1.0-2.0', female: '1.0-2.0', pediatric: '1.0-2.0' },
      'gamma gt': { male: '8-61', female: '5-36', pediatric: '5-23' },
      'ggt': { male: '8-61', female: '5-36', pediatric: '5-23' },
    }
  },
  'renal function test': {
    parameters: {
      'urea': { male: '7-20', female: '7-20', pediatric: '5-18' },
      'creatinine': { male: '0.7-1.3', female: '0.6-1.1', pediatric: '0.3-0.7' },
      'sodium': { male: '135-145', female: '135-145', pediatric: '135-145' },
      'potassium': { male: '3.5-5.1', female: '3.5-5.1', pediatric: '3.5-5.1' },
      'chloride': { male: '98-107', female: '98-107', pediatric: '98-107' },
      'uric acid': { male: '3.4-7.0', female: '2.4-6.0', pediatric: '2.0-5.5' },
    }
  },
  'thyroid function test': {
    parameters: {
      'tsh': { male: '0.4-4.0', female: '0.4-4.0', pediatric: '0.7-6.0' },
      't3': { male: '0.8-2.0', female: '0.8-2.0', pediatric: '0.8-2.0' },
      't4': { male: '5.1-14.1', female: '5.1-14.1', pediatric: '6.0-16.0' },
      'ft3': { male: '2.3-4.2', female: '2.3-4.2', pediatric: '2.3-4.2' },
      'ft4': { male: '0.8-1.8', female: '0.8-1.8', pediatric: '0.8-1.8' },
    }
  },
  'fasting lipid profile': {
    parameters: {
      'total cholesterol': { male: '<200', female: '<200', pediatric: '<170' },
      'triglycerides': { male: '<150', female: '<150', pediatric: '<100' },
      'hdl': { male: '>40', female: '>50', pediatric: '>40' },
      'ldl': { male: '<100', female: '<100', pediatric: '<110' },
      'vldl': { male: '<30', female: '<30', pediatric: '<30' },
      'cholesterol': { male: '<200', female: '<200', pediatric: '<170' },
    }
  },
  'electrolytes': {
    parameters: {
      'sodium': { male: '135-145', female: '135-145', pediatric: '135-145' },
      'potassium': { male: '3.5-5.1', female: '3.5-5.1', pediatric: '3.5-5.1' },
      'chloride': { male: '98-107', female: '98-107', pediatric: '98-107' },
    }
  },
  'arterial blood gas': {
    parameters: {
      'ph': { male: '7.35-7.45', female: '7.35-7.45', pediatric: '7.35-7.45' },
      'pco2': { male: '35-45', female: '35-45', pediatric: '35-45' },
      'po2': { male: '75-100', female: '75-100', pediatric: '75-100' },
      'hco3': { male: '22-26', female: '22-26', pediatric: '22-26' },
      'base excess': { male: '-2 to +2', female: '-2 to +2', pediatric: '-2 to +2' },
      'o2 saturation': { male: '95-100', female: '95-100', pediatric: '95-100' },
    }
  },
  'venous blood gas': {
    parameters: {
      'ph': { male: '7.31-7.41', female: '7.31-7.41', pediatric: '7.31-7.41' },
      'pco2': { male: '40-50', female: '40-50', pediatric: '40-50' },
      'po2': { male: '30-50', female: '30-50', pediatric: '30-50' },
      'hco3': { male: '22-26', female: '22-26', pediatric: '22-26' },
    }
  },
};

function normalizeName(s) {
  return String(s || '').trim().toLowerCase().replace(/\s+/g, ' ');
}

function findRangeForTest(name) {
  const n = normalizeName(name);
  // Exact match
  if (REFERENCE_RANGES[n]) return REFERENCE_RANGES[n];
  // Partial match
  for (const [key, val] of Object.entries(REFERENCE_RANGES)) {
    if (n.includes(key) || key.includes(n)) return val;
  }
  return null;
}

function findRangeForParam(paramName, testRanges) {
  if (!testRanges || !testRanges.parameters) return null;
  const n = normalizeName(paramName);
  // Exact match
  if (testRanges.parameters[n]) return testRanges.parameters[n];
  // Partial match
  for (const [key, val] of Object.entries(testRanges.parameters)) {
    if (n.includes(key) || key.includes(n)) return val;
  }
  // Also check top-level reference ranges
  const top = findRangeForTest(paramName);
  if (top && !top.parameters) return top;
  return null;
}

async function main() {
  const client = await MongoClient.connect('mongodb://127.0.0.1:27017/');
  const db = client.db('jinnahmedical');

  const allTests = await db.collection('lab_tests').find({}).toArray();
  console.log(`Total tests: ${allTests.length}`);

  let updated = 0;
  let stillMissing = 0;

  for (const test of allTests) {
    const testName = normalizeName(test.name);
    const testRanges = findRangeForTest(test.name);
    const params = test.parameters || [];
    
    let needsUpdate = false;
    const updateFields = {};

    // If test has no parameters, set top-level ranges
    if (params.length === 0 && testRanges && !testRanges.parameters) {
      if (!test.normalRangeMale && testRanges.male) {
        updateFields.normalRangeMale = testRanges.male;
        needsUpdate = true;
      }
      if (!test.normalRangeFemale && testRanges.female) {
        updateFields.normalRangeFemale = testRanges.female;
        needsUpdate = true;
      }
      if (!test.normalRangePediatric && testRanges.pediatric) {
        updateFields.normalRangePediatric = testRanges.pediatric;
        needsUpdate = true;
      }
    }

    // If test has parameters, fill in missing ranges per parameter
    if (params.length > 0) {
      let paramChanged = false;
      const newParams = params.map(p => {
        if (p.normalRangeMale || p.normalRangeFemale || p.normalRangePediatric) return p;
        
        const paramRange = findRangeForParam(p.name, testRanges);
        if (!paramRange) return p;
        
        const updated = { ...p };
        if (paramRange.male) updated.normalRangeMale = paramRange.male;
        if (paramRange.female) updated.normalRangeFemale = paramRange.female;
        if (paramRange.pediatric) updated.normalRangePediatric = paramRange.pediatric;
        paramChanged = true;
        return updated;
      });

      if (paramChanged) {
        updateFields.parameters = newParams;
        needsUpdate = true;
      }
    }

    if (needsUpdate) {
      await db.collection('lab_tests').updateOne({ _id: test._id }, { $set: updateFields });
      updated++;
      if (updated <= 15) console.log(`  Updated: ${test.name}`);
    } else {
      // Check if still missing
      const hasRanges = params.length > 0
        ? params.some(p => p.normalRangeMale || p.normalRangeFemale)
        : (test.normalRangeMale || test.normalRangeFemale);
      if (!hasRanges) stillMissing++;
    }
  }

  console.log(`\nUpdated: ${updated}, Still missing ranges: ${stillMissing}`);
  
  // Final count
  const withRanges = await db.collection('lab_tests').countDocuments({
    $or: [
      { 'parameters.normalRangeMale': { $exists: true, $ne: '' } },
      { 'parameters.normalRangeFemale': { $exists: true, $ne: '' } },
      { normalRangeMale: { $exists: true, $ne: '' } },
      { normalRangeFemale: { $exists: true, $ne: '' } },
    ]
  });
  console.log(`Tests with ranges now: ${withRanges} / ${allTests.length}`);
  
  await client.close();
}

main().catch(e => { console.error(e); process.exit(1); });
