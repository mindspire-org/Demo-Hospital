const { MongoClient } = require('mongodb');

// For tests with 0 parameters, set a top-level "Refer to report" or appropriate default
const TEST_DEFAULTS = {
  'liver function test': { male: 'Refer to report', female: 'Refer to report', pediatric: 'Refer to report' },
  'lft': { male: 'Refer to report', female: 'Refer to report', pediatric: 'Refer to report' },
  'renal function test': { male: 'Refer to report', female: 'Refer to report', pediatric: 'Refer to report' },
  'rft': { male: 'Refer to report', female: 'Refer to report', pediatric: 'Refer to report' },
  'kidney function test': { male: 'Refer to report', female: 'Refer to report', pediatric: 'Refer to report' },
  'kft': { male: 'Refer to report', female: 'Refer to report', pediatric: 'Refer to report' },
  'thyroid function test': { male: 'Refer to report', female: 'Refer to report', pediatric: 'Refer to report' },
  'tft': { male: 'Refer to report', female: 'Refer to report', pediatric: 'Refer to report' },
  'thyroid profile': { male: 'Refer to report', female: 'Refer to report', pediatric: 'Refer to report' },
  'arterial blood gas': { male: 'Refer to report', female: 'Refer to report', pediatric: 'Refer to report' },
  'abg': { male: 'Refer to report', female: 'Refer to report', pediatric: 'Refer to report' },
  'abgs': { male: 'Refer to report', female: 'Refer to report', pediatric: 'Refer to report' },
  'venous blood gas': { male: 'Refer to report', female: 'Refer to report', pediatric: 'Refer to report' },
  'vbg': { male: 'Refer to report', female: 'Refer to report', pediatric: 'Refer to report' },
  'blood gas': { male: 'Refer to report', female: 'Refer to report', pediatric: 'Refer to report' },
  'urine': { male: 'Refer to report', female: 'Refer to report', pediatric: 'Refer to report' },
  'urine examination': { male: 'Refer to report', female: 'Refer to report', pediatric: 'Refer to report' },
  'urine routine': { male: 'Refer to report', female: 'Refer to report', pediatric: 'Refer to report' },
  'urine r/e': { male: 'Refer to report', female: 'Refer to report', pediatric: 'Refer to report' },
  'complete urine': { male: 'Refer to report', female: 'Refer to report', pediatric: 'Refer to report' },
  'stool': { male: 'Refer to report', female: 'Refer to report', pediatric: 'Refer to report' },
  'stool routine': { male: 'Refer to report', female: 'Refer to report', pediatric: 'Refer to report' },
  'stool examination': { male: 'Refer to report', female: 'Refer to report', pediatric: 'Refer to report' },
  'blood culture': { male: 'No growth', female: 'No growth', pediatric: 'No growth' },
  'electrolyte': { male: 'Refer to report', female: 'Refer to report', pediatric: 'Refer to report' },
  'electrolytes': { male: 'Refer to report', female: 'Refer to report', pediatric: 'Refer to report' },
  'fasting lipid': { male: 'Refer to report', female: 'Refer to report', pediatric: 'Refer to report' },
  'lipid profile': { male: 'Refer to report', female: 'Refer to report', pediatric: 'Refer to report' },
  'cardiac profile': { male: 'Refer to report', female: 'Refer to report', pediatric: 'Refer to report' },
  'bone profile': { male: 'Refer to report', female: 'Refer to report', pediatric: 'Refer to report' },
  'hepatitis': { male: 'Negative', female: 'Negative', pediatric: 'Negative' },
  'hep b': { male: 'Negative', female: 'Negative', pediatric: 'Negative' },
  'hep c': { male: 'Negative', female: 'Negative', pediatric: 'Negative' },
  'screening': { male: 'Negative', female: 'Negative', pediatric: 'Negative' },
  'h. pylori': { male: 'Negative', female: 'Negative', pediatric: 'Negative' },
  'hpylori': { male: 'Negative', female: 'Negative', pediatric: 'Negative' },
  'platelets': { male: '150-400', female: '150-400', pediatric: '150-450' },
  'growth hormone': { male: 'Refer to report', female: 'Refer to report', pediatric: 'Refer to report' },
  'clearance': { male: 'Refer to report', female: 'Refer to report', pediatric: 'Refer to report' },
  'gfr': { male: '>90', female: '>90', pediatric: '>90' },
  'apo': { male: 'Refer to report', female: 'Refer to report', pediatric: 'Refer to report' },
  'antiphospholipid': { male: 'Negative', female: 'Negative', pediatric: 'Negative' },
  'mmr': { male: 'Refer to report', female: 'Refer to report', pediatric: 'Refer to report' },
  'ihc': { male: 'Refer to report', female: 'Refer to report', pediatric: 'Refer to report' },
  'bsi': { male: 'No growth', female: 'No growth', pediatric: 'No growth' },
  '24-hour urine': { male: 'Refer to report', female: 'Refer to report', pediatric: 'Refer to report' },
  '24 hrs': { male: 'Refer to report', female: 'Refer to report', pediatric: 'Refer to report' },
  'qabf': { male: 'Refer to report', female: 'Refer to report', pediatric: 'Refer to report' },
};

function norm(s) { return String(s || '').trim().toLowerCase().replace(/\s+/g, ' '); }

function findDefault(name) {
  const n = norm(name);
  if (TEST_DEFAULTS[n]) return TEST_DEFAULTS[n];
  const keys = Object.keys(TEST_DEFAULTS).sort((a, b) => b.length - a.length);
  for (const k of keys) {
    if (n.includes(k)) return TEST_DEFAULTS[k];
  }
  return null;
}

async function main() {
  const client = await MongoClient.connect('mongodb://127.0.0.1:27017/');
  const db = client.db('jinnahmedical');
  const allTests = await db.collection('lab_tests').find({}).toArray();
  
  let updated = 0;
  let stillMissing = 0;
  const missing = [];

  for (const test of allTests) {
    const params = test.parameters || [];
    
    // Skip tests with parameters (already handled)
    if (params.length > 0) continue;
    
    // Skip if already has top-level ranges
    if (test.normalRangeMale || test.normalRangeFemale) continue;
    
    const def = findDefault(test.name);
    if (!def) { stillMissing++; if (missing.length < 20) missing.push(test.name); continue; }
    
    const updateFields = {};
    if (def.male) updateFields.normalRangeMale = def.male;
    if (def.female) updateFields.normalRangeFemale = def.female;
    if (def.pediatric) updateFields.normalRangePediatric = def.pediatric;
    
    await db.collection('lab_tests').updateOne({ _id: test._id }, { $set: updateFields });
    updated++;
    if (updated <= 15) console.log(`  Updated: ${test.name}`);
  }

  console.log(`\nUpdated: ${updated}, Still missing: ${stillMissing}`);
  if (missing.length > 0) {
    console.log('Still missing:');
    for (const m of missing) console.log(`  - ${m}`);
  }

  const withRanges = await db.collection('lab_tests').countDocuments({
    $or: [
      { 'parameters.normalRangeMale': { $exists: true, $ne: '' } },
      { 'parameters.normalRangeFemale': { $exists: true, $ne: '' } },
      { normalRangeMale: { $exists: true, $ne: '' } },
      { normalRangeFemale: { $exists: true, $ne: '' } },
    ]
  });
  console.log(`\nFinal: ${withRanges} / ${allTests.length} tests have ranges`);
  await client.close();
}

main().catch(e => { console.error(e); process.exit(1); });
