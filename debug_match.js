const { MongoClient } = require('mongodb');
async function main() {
  const client = await MongoClient.connect('mongodb://127.0.0.1:27017/');
  const db = client.db('jinnahmedical');
  
  // Check specific tests that should have matched
  const names = ['Liver Function Test (LFT)', 'Renal Function Test (RFT)', 'Thyroid Function Test (TFT)', 'Arterial Blood Gas (ABG)', 'Venous Blood Gas (VBG)', 'Urine Routine Examination', 'Complete Urine Examination', 'Blood Culture'];
  for (const name of names) {
    const t = await db.collection('lab_tests').findOne({ name });
    if (!t) { console.log(`NOT FOUND: ${name}`); continue; }
    const params = t.parameters || [];
    console.log(`\n${t.name} [${params.length} params]`);
    console.log('  top M:', t.normalRangeMale, 'F:', t.normalRangeFemale);
    for (const p of params.slice(0, 5)) {
      console.log(`  param: "${p.name}" M:${p.normalRangeMale || 'EMPTY'} F:${p.normalRangeFemale || 'EMPTY'}`);
    }
  }
  await client.close();
}
main().catch(e => { console.error(e); process.exit(1); });
