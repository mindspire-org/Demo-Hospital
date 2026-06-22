const { MongoClient } = require('mongodb');
async function main() {
  const client = await MongoClient.connect('mongodb://127.0.0.1:27017/jinnahmedical');
  const db = client.db('jinnahmedical');
  const token = await db.collection('lab_tokens').findOne(
    { _id: new (require('mongodb').ObjectId)('6a394122fa2dfc582c185d2b') },
    { projection: { status: 1, tokenNo: 1, orderId: 1, convertedAt: 1 } }
  );
  console.log('Token:', JSON.stringify(token, null, 2));
  await client.close();
}
main().catch(e => { console.error(e); process.exit(1); });
