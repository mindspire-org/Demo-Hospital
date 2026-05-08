import { Request, Response } from 'express'
import { LabTest } from '../models/Test'
import { testQuerySchema } from '../validators/test'
import { testCreateSchemaV2, testUpdateSchemaV2 } from '../validators/test_extra'
import { logAudit } from '../utils/audit'

export async function list(req: Request, res: Response){
  const q = testQuerySchema.safeParse(req.query)
  const { q: search, page, limit } = q.success ? q.data as any : {}
  const { category, template } = req.query as any
  const { activeOnly } = req.query as any
  const filter: any = {}
  if (search){
    const rx = new RegExp(String(search), 'i')
    filter.$or = [ { name: rx }, { parameter: rx }, { unit: rx } ]
  }
  if (category) filter.category = category
  if (template) filter.template = template
  if (activeOnly === '1' || activeOnly === 'true' || activeOnly === true) {
    filter.$and = filter.$and || []
    filter.$and.push({ $or: [ { isActive: true }, { isActive: { $exists: false } } ] })
  }
  const lim = Math.min(1000, Number(limit || 50))
  const pg = Math.max(1, Number(page || 1))
  const skip = (pg - 1) * lim
  const [items, total] = await Promise.all([
    LabTest.find(filter).sort({ createdAt: -1 }).skip(skip).limit(lim).lean(),
    LabTest.countDocuments(filter),
  ])
  const totalPages = Math.max(1, Math.ceil((total||0)/lim))
  res.json({ items, total, page: pg, totalPages })
}

export async function create(req: Request, res: Response){
  const data = testCreateSchemaV2.parse(req.body)
  const doc = await LabTest.create(data)
  await logAudit(req, { action: 'test.create', entity: 'test', entityId: String(doc._id), label: doc.name, after: doc.toObject() })
  res.status(201).json(doc)
}

export async function update(req: Request, res: Response){
  const { id } = req.params
  const patch = testUpdateSchemaV2.parse(req.body)
  const before = await LabTest.findById(id).lean()
  const doc = await LabTest.findByIdAndUpdate(id, patch, { new: true })
  if (!doc) return res.status(404).json({ message: 'Test not found' })
  await logAudit(req, { action: 'test.update', entity: 'test', entityId: id, label: doc.name, before, after: doc.toObject() })
  res.json(doc)
}

export async function remove(req: Request, res: Response){
  const { id } = req.params
  await LabTest.findByIdAndDelete(id)
  res.json({ ok: true })
}

// Seed lab tests from seed files
export async function seedTests(req: Request, res: Response){
  const { category } = req.body as { category?: string }
  
  try {
    // Import seed functions
    const { seedHematologyTests } = await import('../../../seeds/labTests_hematology')
    const { seedChemistryTests } = await import('../../../seeds/labTests_chemistry')
    const { seedImmunologyTests } = await import('../../../seeds/labTests_immunology')
    const { seedUrineMicrobiologyTests } = await import('../../../seeds/labTests_urine_microbiology')
    const { seedEndocrinologyTests } = await import('../../../seeds/labTests_endocrinology')
    const { seedSpecialTests } = await import('../../../seeds/labTests_special')

    const seedFunctions: Record<string, () => Promise<{ total: number; created: number; updated: number }>> = {
      hematology: seedHematologyTests,
      chemistry: seedChemistryTests,
      immunology: seedImmunologyTests,
      'urine-microbiology': seedUrineMicrobiologyTests,
      endocrinology: seedEndocrinologyTests,
      special: seedSpecialTests,
    }

    const results: Record<string, { total: number; created: number; updated: number }> = {}

    if (category && seedFunctions[category]) {
      results[category] = await seedFunctions[category]()
    } else {
      // Seed all categories
      for (const [name, seedFn] of Object.entries(seedFunctions)) {
        results[name] = await seedFn()
      }
    }

    let totalTests = 0
    let totalCreated = 0
    let totalUpdated = 0

    for (const result of Object.values(results)) {
      totalTests += result.total
      totalCreated += result.created
      totalUpdated += result.updated
    }

    res.json({ 
      success: true, 
      results,
      summary: { totalTests, totalCreated, totalUpdated }
    })
  } catch (error: any) {
    console.error('[SeedTests] Error:', error)
    res.status(500).json({ error: error.message })
  }
}

// Get seed status (count of tests by category)
export async function getSeedStatus(req: Request, res: Response){
  const total = await LabTest.countDocuments()
  res.json({ total })
}
