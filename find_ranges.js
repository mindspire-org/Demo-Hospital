const { MongoClient } = require('mongodb');
async function main() {
  const client = await MongoClient.connect('mongodb://127.0.0.1:27017/');
  const admin = client.db().admin();
  const dbs = await admin.listDatabases();
  for (const dbInfo of dbs.databases) {
    const dbName = dbInfo.name;
    if (!/jinnah|hospital|lab|test/i.test(dbName)) continue;
    const db = client.db(dbName);
    const cols = await db.listCollections({ name: /lab_test|test/i }).toArray();
    for (const c of cols) {
      const count = await db.collection(c.name).countDocuments({});
      const withRanges = await db.collection(c.name).countDocuments({
        $or: [
          { 'parameters.normalRangeMale': { $exists: true, $ne: '' } },
          { 'parameters.normalRangeFemale': { $exists: true, $ne: '' } },
          { normalRangeMale: { $exists: true, $ne: '' } },
        ]
      });
      if (count > 0) console.log(`${dbName}.${c.name}: ${count} tests, ${withRanges} with ranges`);
    }
  }
  await client.close();
}
main().catch(e => { console.error(e); process.exit(1); });
