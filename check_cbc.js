const { MongoClient } = require('mongodb');
async function main() {
  const client = await MongoClient.connect('mongodb://127.0.0.1:27017/jinnahmedical');
  const db = client.db('jinnahmedical');
  const test = await db.collection('lab_tests').findOne({ name: /complete blood count/i });
  if (!test) { console.log('No CBC test found'); await client.close(); return; }
  console.log('Test:', test.name);
  console.log('Top-level normal fields:', {
    normalRangeMale: test.normalRangeMale,
    normalRangeFemale: test.normalRangeFemale,
    normalRangePediatric: test.normalRangePediatric,
  });
  console.log('Parameters count:', (test.parameters || []).length);
  for (const p of (test.parameters || []).slice(0, 5)) {
    console.log('  ', JSON.stringify(p));
  }
  await client.close();
}
main().catch(e => { console.error(e); process.exit(1); });
