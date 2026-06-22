const bcrypt = require('bcryptjs');
const { MongoClient } = require('mongodb');

async function main() {
  const client = await MongoClient.connect('mongodb://127.0.0.1:27017/hospital_dev');
  const db = client.db('hospital_dev');
  const hash = await bcrypt.hash('1234', 10);
  console.log('hash:', hash);

  const res = await db.collection('pharmacy_users').updateMany(
    {},
    { $set: { passwordHash: hash, active: true, role: 'admin', updatedAt: new Date() } }
  );
  console.log('matched:', res.matchedCount, 'modified:', res.modifiedCount);

  // Verify
  const users = await db.collection('pharmacy_users').find({}, {username:1, passwordHash:1, _id:0}).toArray();
  for (const u of users) {
    const match = await bcrypt.compare('1234', u.passwordHash);
    console.log(u.username, 'password matches 1234:', match);
  }

  await client.close();
}
main().catch(e => { console.error(e); process.exit(1); });
