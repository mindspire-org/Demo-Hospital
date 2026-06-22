const { MongoClient } = require('mongodb');
async function main() {
  const client = await MongoClient.connect('mongodb://127.0.0.1:27017/jinnahmedical');
  const db = client.db('jinnahmedical');
  const cols = await db.listCollections().toArray();
  console.log('Collections:', cols.map(c => c.name).sort());
  // Find any collection with normal-range data
  for (const c of cols) {
    if (!/test|lab/i.test(c.name)) continue;
    const sample = await db.collection(c.name).findOne({
      $or: [
        { normalRangeMale: { $exists: true, $ne: '' } },
        { normalRange: { $exists: true, $ne: '' } },
        { 'parameters.normalRangeMale': { $exists: true, $ne: '' } },
        { 'parameters.normalRange': { $exists: true, $ne: '' } },
      ]
    });
    if (sample) console.log('Found data in', c.name, ':', JSON.stringify(sample).slice(0, 200));
  }
  await client.close();
}
main().catch(e => { console.error(e); process.exit(1); });
