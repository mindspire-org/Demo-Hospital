const { MongoClient } = require('mongodb');

async function main() {
  const client = await MongoClient.connect('mongodb://127.0.0.1:27017/');
  const dstDb = client.db('jinnahmedical');

  // List all tests still without ranges
  const noRange = await dstDb.collection('lab_tests').find({
    $and: [
      { 'parameters.normalRangeMale': { $not: { $exists: true, $ne: '' } } },
      { 'parameters.normalRangeFemale': { $not: { $exists: true, $ne: '' } } },
      { normalRangeMale: { $not: { $exists: true, $ne: '' } } },
      { normalRangeFemale: { $not: { $exists: true, $ne: '' } } },
    ]
  }).project({ name: 1, parameters: { $slice: 3 } }).toArray();
  
  console.log(`Tests without ranges: ${noRange.length}`);
  for (const t of noRange) {
    const paramCount = t.parameters ? t.parameters.length : 0;
    const paramNames = (t.parameters || []).map(p => p.name).join(', ');
    console.log(`  - ${t.name} (${paramCount} params: ${paramNames})`);
  }
  
  await client.close();
}

main().catch(e => { console.error(e); process.exit(1); });
