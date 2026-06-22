const bcrypt = require('bcryptjs');
const { MongoClient } = require('mongodb');

async function main() {
  const client = await MongoClient.connect('mongodb://127.0.0.1:27017/jinnahmedical');
  const db = client.db('jinnahmedical');
  const hash = await bcrypt.hash('1234', 10);

  // Check existing users
  const users = await db.collection('pharmacy_users').find({}, {username:1, _id:0}).toArray();
  console.log('Existing pharmacy users:', JSON.stringify(users));

  const res = await db.collection('pharmacy_users').updateMany(
    {},
    { $set: { passwordHash: hash, active: true, role: 'admin', updatedAt: new Date() } }
  );
  console.log('Updated:', res.matchedCount, 'matched,', res.modifiedCount, 'modified');

  // Verify
  const u = await db.collection('pharmacy_users').findOne({ username: 'admin' });
  if (u) {
    const match = await bcrypt.compare('1234', u.passwordHash);
    console.log('admin password matches 1234:', match);
  } else {
    console.log('No admin user found - creating one');
    await db.collection('pharmacy_users').insertOne({
      username: 'admin',
      fullName: 'Administrator',
      role: 'admin',
      passwordHash: hash,
      active: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    console.log('admin user created');
  }

  await client.close();
}
main().catch(e => { console.error(e); process.exit(1); });
