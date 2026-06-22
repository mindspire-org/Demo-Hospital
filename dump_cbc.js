const { MongoClient } = require('mongodb');
async function main() {
  const client = await MongoClient.connect('mongodb://127.0.0.1:27017/jinnahmedical');
  const db = client.db('jinnahmedical');
  const test = await db.collection('lab_tests').findOne({ name: /complete blood count/i });
  console.log(JSON.stringify(test, null, 2));
  await client.close();
}
main().catch(e => { console.error(e); process.exit(1); });
