const { MongoClient } = require('mongodb');
async function main() {
  const client = await MongoClient.connect('mongodb://127.0.0.1:27017/');
  const db = client.db('jinnahmedical');
  const r = await db.collection('lab_tests').updateOne(
    { name: /Rh Anti-bodies/i },
    { $set: { normalRangeMale: 'Negative', normalRangeFemale: 'Negative', normalRangePediatric: 'Negative' } }
  );
  console.log('Updated:', r.modifiedCount);
  const total = await db.collection('lab_tests').countDocuments({});
  const withRanges = await db.collection('lab_tests').countDocuments({
    $or: [
      { 'parameters.normalRangeMale': { $exists: true, $ne: '' } },
      { 'parameters.normalRangeFemale': { $exists: true, $ne: '' } },
      { normalRangeMale: { $exists: true, $ne: '' } },
      { normalRangeFemale: { $exists: true, $ne: '' } },
    ]
  });
  console.log(`FINAL: ${withRanges} / ${total} tests have normal ranges`);
  const noRange = await db.collection('lab_tests').find({
    $and: [
      { 'parameters.normalRangeMale': { $not: { $exists: true, $ne: '' } } },
      { 'parameters.normalRangeFemale': { $not: { $exists: true, $ne: '' } } },
      { normalRangeMale: { $not: { $exists: true, $ne: '' } } },
      { normalRangeFemale: { $not: { $exists: true, $ne: '' } } },
    ]
  }).project({ name: 1 }).toArray();
  if (noRange.length === 0) console.log('ALL 802 TESTS HAVE NORMAL RANGES!');
  else for (const t of noRange) console.log('  -', t.name);
  await client.close();
}
main().catch(e => { console.error(e); process.exit(1); });
