const bcrypt = require('bcryptjs');
const { MongoClient } = require('mongodb');

async function main() {
  const client = await MongoClient.connect('mongodb://127.0.0.1:27017/hospital_dev');
  const db = client.db('hospital_dev');
  const hash = await bcrypt.hash('1234', 10);

  const res = await db.collection('pharmacy_users').updateOne(
    { username: 'admin' },
    { $set: { passwordHash: hash, active: true, role: 'admin', updatedAt: new Date() } }
  );
  console.log('pharmacy admin updated:', res.modifiedCount);

  // Also ensure pharmacy_admin works
  const res2 = await db.collection('pharmacy_users').updateOne(
    { username: 'pharmacy_admin' },
    { $set: { passwordHash: hash, active: true, role: 'admin', updatedAt: new Date() } }
  );
  console.log('pharmacy_admin updated:', res2.modifiedCount);

  await client.close();
}
main().catch(e => { console.error(e); process.exit(1); });
