const { MongoClient } = require('mongodb');
async function main() {
  const client = await MongoClient.connect('mongodb://127.0.0.1:27017/');
  const db = client.db('jinnahmedical');
  
  // Check the actual document
  const t = await db.collection('lab_tests').findOne({ name: /phospholipid/i });
  console.log('Found:', t?.name, 'M:', t?.normalRangeMale, 'F:', t?.normalRangeFemale);
  
  // Force update
  const r = await db.collection('lab_tests').updateOne(
    { _id: t._id },
    { $set: { normalRangeMale: 'Negative', normalRangeFemale: 'Negative', normalRangePediatric: 'Negative' } }
  );
  console.log('Updated:', r.modifiedCount);
  
  // Also check the rh one
  const t2 = await db.collection('lab_tests').findOne({ name: /rh.*anti/i });
  if (t2) {
    console.log('Rh found:', t2.name, 'M:', t2.normalRangeMale);
    const r2 = await db.collection('lab_tests').updateOne(
      { _id: t2._id },
      { $set: { normalRangeMale: 'Negative', normalRangeFemale: 'Negative', normalRangePediatric: 'Negative' } }
    );
    console.log('Rh updated:', r2.modifiedCount);
  }
  
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
  
  const noRange = await db.collection('lab_tests').find({
    $and: [
      { 'parameters.normalRangeMale': { $not: { $exists: true, $ne: '' } } },
      { 'parameters.normalRangeFemale': { $not: { $exists: true, $ne: '' } } },
      { normalRangeMale: { $not: { $exists: true, $ne: '' } } },
      { normalRangeFemale: { $not: { $exists: true, $ne: '' } } },
    ]
  }).project({ name: 1 }).toArray();
  if (noRange.length > 0) {
    console.log('Still without:');
    for (const t of noRange) console.log(`  - ${t.name}`);
  } else {
    console.log('ALL TESTS HAVE NORMAL RANGES!');
  }
  
  await client.close();
}
main().catch(e => { console.error(e); process.exit(1); });
