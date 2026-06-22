const bcrypt = require('bcryptjs');
const { MongoClient } = require('mongodb');

const MONGO_URI = 'mongodb://127.0.0.1:27017/cheema_hospital';

async function main() {
  const client = await MongoClient.connect(MONGO_URI);
  const db = client.db('cheema_hospital');
  const hash = await bcrypt.hash('1234', 10);

  const portals = [
    { coll: 'hospital_users', role: 'admin' },
    { coll: 'reception_users', role: 'admin' },
    { coll: 'lab_users', role: 'admin' },
    { coll: 'finance_users', role: 'admin' },
    { coll: 'pharmacy_users', role: 'admin' },
    { coll: 'diagnostic_users', role: 'admin' },
    { coll: 'aesthetic_users', role: 'admin' },
  ];

  for (const p of portals) {
    const coll = db.collection(p.coll);
    const existing = await coll.findOne({ username: 'admin' });
    if (existing) {
      // Update password to ensure it's 1234
      await coll.updateOne({ username: 'admin' }, { $set: { passwordHash: hash, role: p.role, active: true, updatedAt: new Date() } });
      console.log(`UPDATED: admin in ${p.coll} (password reset to 1234)`);
    } else {
      await coll.insertOne({
        username: 'admin',
        fullName: 'Administrator',
        role: p.role,
        passwordHash: hash,
        active: true,
        shiftRestricted: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      console.log(`INSERTED: admin in ${p.coll}`);
    }
  }

  console.log('\nDone!');
  await client.close();
}

main().catch(e => { console.error(e); process.exit(1); });
