const bcrypt = require('bcryptjs');
const { MongoClient } = require('mongodb');

async function main() {
  const client = await MongoClient.connect('mongodb://127.0.0.1:27017/hospital_dev');
  const db = client.db('hospital_dev');
  
  const u = await db.collection('pharmacy_users').findOne({ username: 'admin' });
  console.log('username:', u.username);
  console.log('role:', u.role);
  console.log('active:', u.active);
  console.log('hash prefix:', u.passwordHash ? u.passwordHash.substring(0, 30) : 'NONE');
  console.log('hash length:', u.passwordHash ? u.passwordHash.length : 0);
  
  if (u.passwordHash) {
    const match = await bcrypt.compare('1234', u.passwordHash);
    console.log('bcrypt compare 1234:', match);
  }
  
  await client.close();
}
main().catch(e => { console.error(e); process.exit(1); });
