const { MongoClient } = require('mongodb');
async function main() {
  const client = await MongoClient.connect('mongodb://127.0.0.1:27017/jinnahmedical');
  const db = client.db('jinnahmedical');
  // Aggregate distinct parameter field keys across all tests
  const tests = await db.collection('lab_tests').find({}).toArray();
  const keys = new Set();
  for (const t of tests) {
    for (const p of (t.parameters || [])) {
      Object.keys(p).forEach(k => keys.add(k));
    }
  }
  console.log('All parameter keys:', [...keys].sort());
  // Also list distinct top-level keys
  const topKeys = new Set();
  for (const t of tests) Object.keys(t).forEach(k => topKeys.add(k));
  console.log('Top-level keys:', [...topKeys].sort());
  await client.close();
}
main().catch(e => { console.error(e); process.exit(1); });
