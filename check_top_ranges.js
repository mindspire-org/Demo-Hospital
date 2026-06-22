const { MongoClient } = require('mongodb');
async function main() {
  const client = await MongoClient.connect('mongodb://127.0.0.1:27017/jinnahmedical');
  const db = client.db('jinnahmedical');
  const tests = await db.collection('lab_tests').find({
    $or: [
      { normalRangeMale: { $exists: true, $ne: '', $ne: null } },
      { normalRangeFemale: { $exists: true, $ne: '', $ne: null } },
    ]
  }).limit(10).project({ name: 1, parameter: 1, normalRangeMale: 1, normalRangeFemale: 1, normalRangePediatric: 1 }).toArray();
  console.log('Tests with top-level ranges:', tests.length);
  for (const t of tests) console.log(' ', t.name, '| param:', t.parameter, '| M:', t.normalRangeMale, '| F:', t.normalRangeFemale);
  await client.close();
}
main().catch(e => { console.error(e); process.exit(1); });
