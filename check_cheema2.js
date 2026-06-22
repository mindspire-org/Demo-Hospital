const { MongoClient } = require('mongodb');
async function main() {
  const client = await MongoClient.connect('mongodb://127.0.0.1:27017/');
  const srcDb = client.db('cheema_hospital');
  // Find CBC by partial name
  const tests = await srcDb.collection('lab_tests').find({ name: /blood|cbc/i }).toArray();
  console.log('Tests matching blood/cbc:', tests.length);
  for (const t of tests) {
    console.log('---', t.name);
    console.log('  top M:', t.normalRangeMale, 'F:', t.normalRangeFemale);
    for (const p of (t.parameters || []).slice(0, 5)) {
      console.log('  param', p.name, 'M:', p.normalRangeMale || 'EMPTY', 'F:', p.normalRangeFemale || 'EMPTY');
    }
  }
  
  // Also check a few tests that DO have ranges to see their structure
  const withRanges = await srcDb.collection('lab_tests').find({
    'parameters.normalRangeMale': { $exists: true, $ne: '' }
  }).limit(3).toArray();
  console.log('\n--- Sample tests with ranges ---');
  for (const t of withRanges) {
    console.log('Test:', t.name);
    for (const p of (t.parameters || []).slice(0, 3)) {
      console.log('  ', p.name, '| M:', p.normalRangeMale, '| F:', p.normalRangeFemale);
    }
  }
  await client.close();
}
main().catch(e => { console.error(e); process.exit(1); });
