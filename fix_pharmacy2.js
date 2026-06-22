const bcrypt = require('bcryptjs');
const { MongoClient } = require('mongodb');

async function main() {
  const client = await MongoClient.connect('mongodb://127.0.0.1:27017/hospital_dev');
  const db = client.db('hospital_dev');
  const hash = await bcrypt.hash('1234', 10);

  // Update all pharmacy users
  const res = await db.collection('pharmacy_users').updateMany(
    {},
    { $set: { passwordHash: hash, active: true, updatedAt: new Date() } }
  );
  console.log('pharmacy users updated:', res.modifiedCount);

  await client.close();
}
main().catch(e => { console.error(e); process.exit(1); });
