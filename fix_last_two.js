const { MongoClient } = require('mongodb');
async function main() {
  const client = await MongoClient.connect('mongodb://127.0.0.1:27017/');
  const db = client.db('jinnahmedical');
  
  // Fix anti-phospholipid
  let r1 = await db.collection('lab_tests').updateMany(
    { name: /phospholipid/i, normalRangeMale: { $exists: false } },
    { $set: { normalRangeMale: 'Negative', normalRangeFemale: 'Negative', normalRangePediatric: 'Negative' } }
  );
  console.log('Antiphospholipid updated:', r1.modifiedCount);
  
  // Fix rh antibodies
  let r2 = await db.collection('lab_tests').updateMany(
    { name: /rh.*anti/i, normalRangeMale: { $exists: false } },
    { $set: { normalRangeMale: 'Negative', normalRangeFemale: 'Negative', normalRangePediatric: 'Negative' } }
  );
  console.log('Rh antibodies updated:', r2.modifiedCount);
  
  // Final count
  const total = await db.collection('lab_tests').countDocuments({});
  const withRanges = await db.collection('lab_tests').countDocuments({
    $or: [
      { 'parameters.normalRangeMale': { $exists: true, $ne: '' } },
      { 'parameters.normalRangeFemale': { $exists: true, $ne: '' } },
      { normalRangeMale: { $exists: true, $ne: '' } },
      { normalRangeFemale: { $exists: true, $ne: '' } },
    ]
  });
  console.log(`\nFINAL: ${withRanges} / ${total} tests have normal ranges`);
  
  // List any remaining without ranges
  const noRange = await db.collection('lab_tests').find({
    $and: [
      { 'parameters.normalRangeMale': { $not: { $exists: true, $ne: '' } } },
      { 'parameters.normalRangeFemale': { $not: { $exists: true, $ne: '' } } },
      { normalRangeMale: { $not: { $exists: true, $ne: '' } } },
      { normalRangeFemale: { $not: { $exists: true, $ne: '' } } },
    ]
  }).project({ name: 1 }).toArray();
  if (noRange.length > 0) {
    console.log('Still without ranges:');
    for (const t of noRange) console.log(`  - ${t.name}`);
  } else {
    console.log('ALL TESTS HAVE NORMAL RANGES!');
  }
  
  await client.close();
}
main().catch(e => { console.error(e); process.exit(1); });
