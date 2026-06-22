const { MongoClient } = require('mongodb');

// Common parameter name mappings (jinnah name -> cheema name pattern)
const PARAM_ALIASES = {
  'hb': ['hemoglobin', 'hgb'],
  'tlc': ['total leukocyte', 'total wbc', 'wbc', 'white blood cell'],
  'rbc': ['red blood cell', 'red cell'],
  'platelets': ['platelet count', 'platelet'],
  'hct': ['hematocrit', 'hct'],
  'mcv': ['mean corpuscular volume', 'mcv'],
  'mch': ['mean corpuscular hemoglobin', 'mch'],
  'mchc': ['mean corpuscular hemoglobin concentration', 'mchc'],
  'rdw': ['red cell distribution width', 'rdw'],
  'neutrophils': ['neutrophil', 'neut'],
  'lymphocytes': ['lymphocyte', 'lymph'],
  'monocytes': ['monocyte', 'mono'],
  'eosinophils': ['eosinophil', 'eos'],
  'basophils': ['basophil', 'baso'],
  'esr': ['erythrocyte sedimentation', 'esr'],
  'fbs': ['fasting blood sugar', 'fasting glucose', 'fbs'],
  'rbs': ['random blood sugar', 'random glucose', 'rbs'],
  'ppbs': ['post prandial blood sugar', 'postprandial', 'ppbs'],
  'hba1c': ['glycated hemoglobin', 'hba1c', 'a1c'],
  'bun': ['blood urea nitrogen', 'bun'],
  'creatinine': ['creatinine', 'cr'],
  'urea': ['urea', 'blood urea'],
  'alt': ['alanine transaminase', 'alt', 'sgpt'],
  'ast': ['aspartate transaminase', 'ast', 'sgot'],
  'alp': ['alkaline phosphatase', 'alp'],
  'bilirubin': ['bilirubin', 'bilirubin total'],
  'total protein': ['total protein', 'tp'],
  'albumin': ['albumin', 'alb'],
  'globulin': ['globulin', 'glob'],
  'sodium': ['sodium', 'na'],
  'potassium': ['potassium', 'k'],
  'chloride': ['chloride', 'cl'],
  'calcium': ['calcium', 'ca'],
  'phosphate': ['phosphate', 'phosphorus', 'po4'],
  'tsh': ['thyroid stimulating hormone', 'tsh'],
  't3': ['triiodothyronine', 't3'],
  't4': ['thyroxine', 't4'],
  'ft3': ['free t3', 'ft3'],
  'ft4': ['free t4', 'ft4'],
  'glucose': ['glucose', 'blood sugar'],
  'uric acid': ['uric acid', 'ua'],
  'cholesterol': ['total cholesterol', 'cholesterol'],
  'triglycerides': ['triglyceride', 'tg'],
  'hdl': ['hdl', 'high density lipoprotein'],
  'ldl': ['ldl', 'low density lipoprotein'],
  'vldl': ['vldl', 'very low density lipoprotein'],
  'ph': ['ph'],
  'pco2': ['pco2', 'pco₂'],
  'po2': ['po2', 'po₂'],
  'hco3': ['hco3', 'bicarbonate'],
  'base excess': ['base excess', 'be'],
  'o2 saturation': ['o2 saturation', 'oxygen saturation', 'spo2'],
  'sgpt': ['sgpt', 'alt', 'alanine transaminase'],
  'sgot': ['sgot', 'ast', 'aspartate transaminase'],
  'gamma gt': ['gamma gt', 'ggt', 'gamma glutamyl'],
  'amylase': ['amylase'],
  'lipase': ['lipase'],
  'ldh': ['ldh', 'lactate dehydrogenase'],
  'ck': ['ck', 'creatine kinase', 'cpk'],
  'troponin': ['troponin', 'trop'],
  'ferritin': ['ferritin'],
  'vitamin b12': ['vitamin b12', 'b12', 'cobalamin'],
  'vitamin d': ['vitamin d', '25-oh vitamin d', '25-hydroxyvitamin'],
  'iron': ['iron', 'serum iron'],
  'tibc': ['tibc', 'total iron binding capacity'],
  'uibc': ['uibc', 'unsaturated iron binding capacity'],
  'transferrin': ['transferrin'],
  'magnesium': ['magnesium', 'mg'],
  'lactate': ['lactate', 'lactic acid'],
  'crp': ['crp', 'c-reactive protein'],
  'wbc': ['wbc', 'white blood cell', 'total leukocyte'],
  'pt': ['pt', 'prothrombin time'],
  'inr': ['inr', 'international normalized ratio'],
  'aptt': ['aptt', 'activated partial thromboplastin'],
  'd-dimer': ['d-dimer', 'dimer'],
  'fibrinogen': ['fibrinogen'],
};

function matchParamName(jinnahName, cheemaName) {
  const j = String(jinnahName || '').trim().toLowerCase();
  const c = String(cheemaName || '').trim().toLowerCase();
  if (!j || !c) return false;
  // Exact match
  if (j === c) return true;
  // Check if jinnah name is an abbreviation in cheema name (e.g. "Hb" in "Hemoglobin (Hb)")
  if (c.includes(`(${j})`)) return true;
  if (c.includes(`(${j} `) || c.includes(` ${j})`)) return true;
  // Check alias map
  const aliases = PARAM_ALIASES[j];
  if (aliases) {
    for (const a of aliases) {
      if (c.includes(a)) return true;
    }
  }
  // Check reverse: cheema name alias matches jinnah
  for (const [key, vals] of Object.entries(PARAM_ALIASES)) {
    if (vals.some(v => j.includes(v)) && (c.includes(key) || vals.some(v => c.includes(v)))) {
      return true;
    }
  }
  return false;
}

async function main() {
  const client = await MongoClient.connect('mongodb://127.0.0.1:27017/');
  const srcDb = client.db('cheema_hospital');
  const dstDb = client.db('jinnahmedical');

  const srcTests = await srcDb.collection('lab_tests').find({}).toArray();
  const srcMap = new Map();
  for (const t of srcTests) {
    const key = String(t.name || '').trim().toLowerCase();
    if (key) srcMap.set(key, t);
  }

  const dstTests = await dstDb.collection('lab_tests').find({}).toArray();
  console.log(`Destination tests: ${dstTests.length}`);

  let updated = 0;
  let matched = 0;
  let stillNoRange = 0;

  for (const dst of dstTests) {
    const key = String(dst.name || '').trim().toLowerCase();
    const src = srcMap.get(key);
    if (!src) continue;
    matched++;

    const dstParams = dst.parameters || [];
    const srcParams = src.parameters || [];
    
    if (dstParams.length === 0) {
      // No parameters - try top-level
      const updateFields = {};
      if (!dst.normalRangeMale && src.normalRangeMale) updateFields.normalRangeMale = src.normalRangeMale;
      if (!dst.normalRangeFemale && src.normalRangeFemale) updateFields.normalRangeFemale = src.normalRangeFemale;
      if (!dst.normalRangePediatric && src.normalRangePediatric) updateFields.normalRangePediatric = src.normalRangePediatric;
      if (Object.keys(updateFields).length > 0) {
        await dstDb.collection('lab_tests').updateOne({ _id: dst._id }, { $set: updateFields });
        updated++;
      }
      continue;
    }

    if (srcParams.length === 0) continue;

    let paramChanged = false;
    const newParams = dstParams.map(dp => {
      // Skip if already has ranges
      if (dp.normalRangeMale || dp.normalRangeFemale || dp.normalRangePediatric) return dp;
      
      // Find matching source parameter
      const sp = srcParams.find(s => matchParamName(dp.name, s.name));
      if (!sp) return dp;
      
      const updated = { ...dp };
      if (sp.normalRangeMale) updated.normalRangeMale = sp.normalRangeMale;
      if (sp.normalRangeFemale) updated.normalRangeFemale = sp.normalRangeFemale;
      if (sp.normalRangePediatric) updated.normalRangePediatric = sp.normalRangePediatric;
      paramChanged = true;
      return updated;
    });

    if (paramChanged) {
      await dstDb.collection('lab_tests').updateOne({ _id: dst._id }, { $set: { parameters: newParams } });
      updated++;
    }
  }

  // Report how many still have no ranges
  const withRanges = await dstDb.collection('lab_tests').countDocuments({
    $or: [
      { 'parameters.normalRangeMale': { $exists: true, $ne: '' } },
      { 'parameters.normalRangeFemale': { $exists: true, $ne: '' } },
      { normalRangeMale: { $exists: true, $ne: '' } },
    ]
  });
  const totalTests = await dstDb.collection('lab_tests').countDocuments({});
  
  console.log(`Matched by name: ${matched}, Updated: ${updated}`);
  console.log(`Tests with ranges now: ${withRanges} / ${totalTests}`);
  
  // List some that still have no ranges
  const noRange = await dstDb.collection('lab_tests').find({
    $and: [
      { 'parameters.normalRangeMale': { $not: { $exists: true, $ne: '' } } },
      { normalRangeMale: { $not: { $exists: true, $ne: '' } } },
    ]
  }).limit(20).project({ name: 1 }).toArray();
  console.log('\nTests still without ranges (first 20):');
  for (const t of noRange) console.log('  -', t.name);

  await client.close();
}

main().catch(e => { console.error(e); process.exit(1); });
