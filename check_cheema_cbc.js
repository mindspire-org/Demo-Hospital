const { MongoClient } = require('mongodb');
async function main() {
  const client = await MongoClient.connect('mongodb://127.0.0.1:27017/');
  const srcDb = client.db('cheema_hospital');
  const test = await srcDb.collection('lab_tests').findOne({ name: /complete blood count/i });
  if (!test) { console.log('No CBC found in cheema_hospital'); await client.close(); return; }
  console.log('CBC from cheema_hospital:');
  console.log('Top-level:', { M: test.normalRangeMale, F: test.normalRangeFemale });
  for (const p of (test.parameters || [])) {
    console.log('  ', p.name, '| M:', p.normalRangeMale, '| F:', p.normalRangeFemale, '| P:', p.normalRangePediatric);
  }
  await client.close();
}
main().catch(e => { console.error(e); process.exit(1); });
