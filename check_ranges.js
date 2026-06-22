const { MongoClient } = require('mongodb');
async function main() {
  const client = await MongoClient.connect('mongodb://127.0.0.1:27017/jinnahmedical');
  const db = client.db('jinnahmedical');
  // Find any test whose parameters have a normal range filled
  const tests = await db.collection('lab_tests').find({
    $or: [
      { 'parameters.normalRangeMale': { $exists: true, $ne: '' } },
      { 'parameters.normalRangeFemale': { $exists: true, $ne: '' } },
      { 'normalRangeMale': { $exists: true, $ne: '' } },
    ]
  }).limit(5).toArray();
  console.log('Tests with normal ranges:', tests.length);
  for (const t of tests) {
    console.log('---', t.name);
    console.log('  top:', { M: t.normalRangeMale, F: t.normalRangeFemale });
    for (const p of (t.parameters || []).slice(0, 3)) {
      console.log('  param', p.name, 'M:', p.normalRangeMale, 'F:', p.normalRangeFemale, 'P:', p.normalRangePediatric);
    }
  }
  // Count total tests vs tests with at least one ranged parameter
  const total = await db.collection('lab_tests').countDocuments({});
  console.log('Total tests:', total);
  await client.close();
}
main().catch(e => { console.error(e); process.exit(1); });
