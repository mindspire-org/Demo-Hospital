const { MongoClient } = require('mongodb');

async function main() {
  const client = await MongoClient.connect('mongodb://127.0.0.1:27017/');
  const srcDb = client.db('cheema_hospital');
  const dstDb = client.db('jinnahmedical');

  // Build a map of test name -> test doc from source (only those with ranges)
  const srcTests = await srcDb.collection('lab_tests').find({
    $or: [
      { 'parameters.normalRangeMale': { $exists: true, $ne: '' } },
      { 'parameters.normalRangeFemale': { $exists: true, $ne: '' } },
      { 'parameters.normalRangePediatric': { $exists: true, $ne: '' } },
      { normalRangeMale: { $exists: true, $ne: '' } },
      { normalRangeFemale: { $exists: true, $ne: '' } },
    ]
  }).toArray();

  console.log(`Source tests with ranges: ${srcTests.length}`);

  // Build lookup by normalized name
  const srcMap = new Map();
  for (const t of srcTests) {
    const key = String(t.name || '').trim().toLowerCase();
    if (key) srcMap.set(key, t);
  }

  // Fetch all destination tests
  const dstTests = await dstDb.collection('lab_tests').find({}).toArray();
  console.log(`Destination tests: ${dstTests.length}`);

  let updated = 0;
  let skipped = 0;
  let matched = 0;

  for (const dst of dstTests) {
    const key = String(dst.name || '').trim().toLowerCase();
    const src = srcMap.get(key);
    if (!src) { skipped++; continue; }
    matched++;

    const updateFields = {};
    let needsUpdate = false;

    // Copy top-level ranges if missing
    if (!dst.normalRangeMale && src.normalRangeMale) {
      updateFields.normalRangeMale = src.normalRangeMale;
      needsUpdate = true;
    }
    if (!dst.normalRangeFemale && src.normalRangeFemale) {
      updateFields.normalRangeFemale = src.normalRangeFemale;
      needsUpdate = true;
    }
    if (!dst.normalRangePediatric && src.normalRangePediatric) {
      updateFields.normalRangePediatric = src.normalRangePediatric;
      needsUpdate = true;
    }

    // Build parameter-level updates
    const dstParams = dst.parameters || [];
    const srcParams = src.parameters || [];
    
    if (dstParams.length > 0 && srcParams.length > 0) {
      // Build src param lookup by normalized name
      const srcParamMap = new Map();
      for (const sp of srcParams) {
        const pk = String(sp.name || '').trim().toLowerCase();
        if (pk) srcParamMap.set(pk, sp);
      }

      let paramChanged = false;
      const newParams = dstParams.map(dp => {
        const pk = String(dp.name || '').trim().toLowerCase();
        const sp = srcParamMap.get(pk);
        if (!sp) return dp;
        
        const updated = { ...dp };
        let changed = false;
        
        if (!dp.normalRangeMale && sp.normalRangeMale) {
          updated.normalRangeMale = sp.normalRangeMale;
          changed = true;
        }
        if (!dp.normalRangeFemale && sp.normalRangeFemale) {
          updated.normalRangeFemale = sp.normalRangeFemale;
          changed = true;
        }
        if (!dp.normalRangePediatric && sp.normalRangePediatric) {
          updated.normalRangePediatric = sp.normalRangePediatric;
          changed = true;
        }
        
        if (changed) paramChanged = true;
        return updated;
      });

      if (paramChanged) {
        updateFields.parameters = newParams;
        needsUpdate = true;
      }
    }

    if (needsUpdate) {
      await dstDb.collection('lab_tests').updateOne(
        { _id: dst._id },
        { $set: updateFields }
      );
      updated++;
      if (updated <= 10) console.log(`  Updated: ${dst.name}`);
    }
  }

  console.log(`\nMatched: ${matched}, Updated: ${updated}, Skipped (no match): ${skipped}`);
  await client.close();
}

main().catch(e => { console.error(e); process.exit(1); });
