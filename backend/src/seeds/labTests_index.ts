import { connectDB } from '../config/db'
import { seedHematologyTests } from './labTests_hematology'
import { seedChemistryTests } from './labTests_chemistry'
import { seedImmunologyTests } from './labTests_immunology'
import { seedUrineMicrobiologyTests } from './labTests_urine_microbiology'
import { seedEndocrinologyTests } from './labTests_endocrinology'
import { seedSpecialTests } from './labTests_special'
import { LabTest } from '../modules/lab/models/Test'
import { SEED_CRITICAL_PARAMETERS } from '../modules/lab/seeds/criticalParameters'

/**
 * Merge critical thresholds from the global critical-parameter table
 * into matching Lab Test catalog parameters (criticalMin / criticalMax).
 * Only sets values that are currently undefined — never overwrites.
 */
async function mergeCriticalValuesIntoTests() {
  // Build a lookup: lowercase parameter name → first matching critical entry
  const critMap = new Map<string, { criticalMin?: number; criticalMax?: number }>()
  for (const c of SEED_CRITICAL_PARAMETERS) {
    const key = c.parameter.toLowerCase().trim()
    if (!critMap.has(key)) critMap.set(key, { criticalMin: c.criticalMin, criticalMax: c.criticalMax })
  }

  const tests = await LabTest.find({ parameters: { $exists: true, $ne: [] } }).lean()
  let patched = 0

  for (const test of tests) {
    let dirty = false
    for (let i = 0; i < (test.parameters?.length || 0); i++) {
      const p = test.parameters[i]
      const key = p.name?.toLowerCase().trim()
      if (!key) continue
      const crit = critMap.get(key)
      if (!crit) continue
      // Only patch if both are missing; never overwrite existing values
      if (p.criticalMin == null && p.criticalMax == null) {
        if (crit.criticalMin != null) test.parameters[i].criticalMin = crit.criticalMin
        if (crit.criticalMax != null) test.parameters[i].criticalMax = crit.criticalMax
        dirty = true
      }
    }
    if (dirty) {
      await LabTest.updateOne({ _id: test._id }, { $set: { parameters: test.parameters } })
      patched++
    }
  }
  return patched
}

async function main() {
  const args = new Set(process.argv.slice(2))
  const dryRun = args.has('--dry-run')
  const category = process.argv.find(a => a.startsWith('--category='))?.split('=')[1]

  console.log('Starting Lab Tests Seed Process...')
  console.log('=' .repeat(50))

  if (dryRun) {
    console.log('DRY RUN MODE - No database changes will be made')
    console.log('=' .repeat(50))
  }

  if (!dryRun) {
    await connectDB()
  }

  const results: Record<string, { total: number; created: number; updated: number }> = {}

  const seedFunctions: Record<string, () => Promise<{ total: number; created: number; updated: number }>> = {
    hematology: seedHematologyTests,
    chemistry: seedChemistryTests,
    immunology: seedImmunologyTests,
    'urine-microbiology': seedUrineMicrobiologyTests,
    endocrinology: seedEndocrinologyTests,
    special: seedSpecialTests,
  }

  if (category && seedFunctions[category]) {
    console.log(`\nSeeding category: ${category}`)
    results[category] = await seedFunctions[category]()
  } else if (category) {
    console.error(`Unknown category: ${category}`)
    console.log('Available categories:', Object.keys(seedFunctions).join(', '))
    process.exit(1)
  } else {
    // Seed all categories
    for (const [name, seedFn] of Object.entries(seedFunctions)) {
      console.log(`\nSeeding category: ${name}`)
      results[name] = await seedFn()
    }
  }

  // Merge critical values into test catalog parameters
  if (!dryRun) {
    console.log('\nMerging critical values into test catalog parameters...')
    const patched = await mergeCriticalValuesIntoTests()
    console.log(`  Patched ${patched} test(s) with critical thresholds`)
  }

  console.log('\n' + '=' .repeat(50))
  console.log('SEED SUMMARY')
  console.log('=' .repeat(50))

  let totalTests = 0
  let totalCreated = 0
  let totalUpdated = 0

  for (const [category, result] of Object.entries(results)) {
    console.log(`\n${category.toUpperCase()}:`)
    console.log(`  Total: ${result.total}`)
    console.log(`  Created: ${result.created}`)
    console.log(`  Updated: ${result.updated}`)
    totalTests += result.total
    totalCreated += result.created
    totalUpdated += result.updated
  }

  console.log('\n' + '-' .repeat(50))
  console.log(`GRAND TOTAL:`)
  console.log(`  Total Tests: ${totalTests}`)
  console.log(`  Total Created: ${totalCreated}`)
  console.log(`  Total Updated: ${totalUpdated}`)
  console.log('=' .repeat(50))

  process.exit(0)
}

main().catch(err => {
  console.error('Seed failed:', err)
  process.exit(1)
})
