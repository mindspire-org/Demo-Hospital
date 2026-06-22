const { MongoClient } = require('mongodb');
async function main() {
  const client = await MongoClient.connect('mongodb://127.0.0.1:27017/');
  const db = client.db('jinnahmedical');
  const noRange = await db.collection('lab_tests').find({
    $and: [
      { 'parameters.normalRangeMale': { $not: { $exists: true, $ne: '' } } },
      { 'parameters.normalRangeFemale': { $not: { $exists: true, $ne: '' } } },
      { normalRangeMale: { $not: { $exists: true, $ne: '' } } },
      { normalRangeFemale: { $not: { $exists: true, $ne: '' } } },
    ]
  }).project({ name: 1, parameters: { $slice: 5 } }).toArray();
  console.log(`Still without ranges: ${noRange.length}`);
  for (const t of noRange) {
    const pc = t.parameters ? t.parameters.length : 0;
    const pn = (t.parameters || []).map(p => p.name).join(', ');
    console.log(`  ${t.name} [${pc}p: ${pn}]`);
  }
  await client.close();
}
main().catch(e => { console.error(e); process.exit(1); });
