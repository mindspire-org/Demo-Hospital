const bcrypt = require('bcryptjs');
const { MongoClient } = require('mongodb');

const MONGO_URI = 'mongodb://127.0.0.1:27017/cheema_hospital';
const DEFAULT_PASSWORD = '123';

async function main() {
  const client = await MongoClient.connect(MONGO_URI);
  const db = client.db('cheema_hospital');

  const hash = await bcrypt.hash(DEFAULT_PASSWORD, 10);

  // Staff list: [name, department/designation, collection, role, fullName]
  const staff = [
    // Admin -> hospital_users
    { name: 'Dr. Muhammad Azam Cheema', dept: 'Admin', coll: 'hospital_users', role: 'admin', fullName: 'Dr. Muhammad Azam Cheema' },
    { name: 'Imtiaz Ahmad', dept: 'Admin', coll: 'hospital_users', role: 'admin', fullName: 'Imtiaz Ahmad' },
    { name: 'Shaban Janjua', dept: 'Admin', coll: 'hospital_users', role: 'admin', fullName: 'Shaban Janjua' },
    // Accounts -> finance_users
    { name: 'Tasleem', dept: 'Accounts', coll: 'finance_users', role: 'admin', fullName: 'Tasleem' },
    { name: 'Sohaib', dept: 'Accounts', coll: 'finance_users', role: 'admin', fullName: 'Sohaib' },
    { name: 'Fajar', dept: 'Accounts', coll: 'finance_users', role: 'admin', fullName: 'Fajar' },
    // Corporate Reception -> reception_users
    { name: 'Hafiz Muhammad Qasim', dept: 'Corporate Reception', coll: 'reception_users', role: 'receptionist', fullName: 'Hafiz Muhammad Qasim' },
    { name: 'Nimra', dept: 'Corporate Reception', coll: 'reception_users', role: 'receptionist', fullName: 'Nimra' },
    { name: 'Ansa Saif', dept: 'Corporate Reception', coll: 'reception_users', role: 'receptionist', fullName: 'Ansa Saif' },
    // Claim Department -> reception_users
    { name: 'Hira', dept: 'Claim Department', coll: 'reception_users', role: 'receptionist', fullName: 'Hira' },
    { name: 'Abdul Rehman', dept: 'Claim Department', coll: 'reception_users', role: 'receptionist', fullName: 'Abdul Rehman' },
    // Reception -> reception_users
    { name: 'Muhammad Faisal', dept: 'Reception', coll: 'reception_users', role: 'receptionist', fullName: 'Muhammad Faisal' },
    { name: 'Haider', dept: 'Reception', coll: 'reception_users', role: 'receptionist', fullName: 'Haider' },
    { name: 'Muhammad Faizan Bhatti', dept: 'Reception', coll: 'reception_users', role: 'receptionist', fullName: 'Muhammad Faizan Bhatti' },
    { name: 'Usman', dept: 'Reception', coll: 'reception_users', role: 'receptionist', fullName: 'Usman' },
    // Matron -> hospital_users
    { name: 'Mohsin', dept: 'Matron', coll: 'hospital_users', role: 'staff', fullName: 'Mohsin' },
    // Lab -> lab_users
    { name: 'Muhammad Rizwan', dept: 'Lab Manager', coll: 'lab_users', role: 'admin', fullName: 'Muhammad Rizwan' },
    { name: 'Saman Shahzadi', dept: 'Lab Technician', coll: 'lab_users', role: 'technician', fullName: 'Saman Shahzadi' },
    { name: 'Abrar Hassan', dept: 'Lab Technician', coll: 'lab_users', role: 'technician', fullName: 'Abrar Hassan' },
    { name: 'Laraib Marwa', dept: 'Lab Technician', coll: 'lab_users', role: 'technician', fullName: 'Laraib Marwa' },
    { name: 'Aiza Afzal', dept: 'Lab Technologist', coll: 'lab_users', role: 'technologist', fullName: 'Aiza Afzal' },
    { name: 'Dr. Maria Qaiser', dept: 'Pathologist', coll: 'lab_users', role: 'admin', fullName: 'Dr. Maria Qaiser' },
    { name: 'Usama Asfand', dept: 'Lab Reception', coll: 'lab_users', role: 'receptionist', fullName: 'Usama Asfand' },
    { name: 'Serosh', dept: 'Lab Reception', coll: 'lab_users', role: 'receptionist', fullName: 'Serosh' },
    { name: 'Aqsa Mushtaq', dept: 'Lab Reception', coll: 'lab_users', role: 'receptionist', fullName: 'Aqsa Mushtaq' },
    { name: 'Laiba Azeem', dept: 'Lab Reception', coll: 'lab_users', role: 'receptionist', fullName: 'Laiba Azeem' },
  ];

  let inserted = 0;
  let skipped = 0;

  for (const s of staff) {
    // Generate username from fullName: lowercase, remove titles, replace spaces with dots
    let username = s.fullName
      .toLowerCase()
      .replace(/dr\.\s*/g, '')
      .replace(/hafiz\s*/g, '')
      .replace(/muhammad\s+/g, 'm ')
      .trim()
      .replace(/\s+/g, '.');
    
    // Simplify: just use first name + last name
    const parts = s.fullName.toLowerCase().replace(/dr\.\s*/g, '').replace(/hafiz\s*/g, '').trim().split(/\s+/);
    if (parts.length >= 2) {
      username = parts[0] + '.' + parts[parts.length - 1];
    } else {
      username = parts[0];
    }

    const coll = db.collection(s.coll);
    const existing = await coll.findOne({ username });
    if (existing) {
      console.log(`SKIP: ${username} already exists in ${s.coll}`);
      skipped++;
      continue;
    }

    const doc = {
      username,
      fullName: s.fullName,
      role: s.role,
      passwordHash: hash,
      active: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    if (s.coll === 'hospital_users') {
      doc.shiftRestricted = false;
    }
    if (s.coll === 'reception_users') {
      doc.shiftRestricted = false;
    }
    if (s.coll === 'lab_users') {
      doc.shiftRestricted = false;
      doc.isMainLab = true;
    }

    await coll.insertOne(doc);
    console.log(`INSERT: ${username} -> ${s.coll} (${s.role}) [${s.dept}]`);
    inserted++;
  }

  console.log(`\nDone! Inserted: ${inserted}, Skipped: ${skipped}`);
  await client.close();
}

main().catch(e => { console.error(e); process.exit(1); });
