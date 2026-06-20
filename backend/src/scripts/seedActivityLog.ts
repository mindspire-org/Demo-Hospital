/**
 * Retroactive Activity Log Seeder
 *
 * Scans existing financial records across all modules and inserts
 * corresponding ActivityLog entries. Run once as a migration.
 *
 * Usage:
 *   npx ts-node-dev --transpile-only backend/src/scripts/seedActivityLog.ts
 *   OR from backend/ directory:
 *   npx ts-node-dev --transpile-only src/scripts/seedActivityLog.ts
 */

import mongoose from 'mongoose'
import { env } from '../config/env'

// Models
import { HospitalIpdPayment } from '../modules/hospital/models/IpdPayment'
import { HospitalCashSession } from '../modules/hospital/models/CashSession'
import { Shift } from '../modules/finance/models/Shift'
import { FinanceJournal } from '../modules/finance/models/FinanceJournal'
import { Dispense } from '../modules/pharmacy/models/Dispense'
import { LabToken } from '../modules/lab/models/Token'
import { HospitalToken } from '../modules/hospital/models/Token'
import { ActivityLog } from '../modules/finance/models/ActivityLog'

async function connect() {
  await mongoose.connect(env.MONGO_URI)
  console.log('Connected to MongoDB')
}

async function alreadyLogged(entityId: string, action: string, portal: string) {
  const existing = await ActivityLog.findOne({ entityId, action, portal }).lean()
  return !!existing
}

async function seedIpdPayments() {
  console.log('\n--- IPD Payments ---')
  const payments = await HospitalIpdPayment.find({}).sort({ createdAt: -1 }).limit(5000).lean()
  let inserted = 0
  for (const p of payments as any[]) {
    const action = p.type === 'refund' ? 'IPD Refund Issued' : 'IPD Payment Collected'
    const entityId = String(p._id)
    if (await alreadyLogged(entityId, action, 'Hospital')) continue

    await ActivityLog.create({
      userId: p.createdByUserId || p.receivedBy || 'unknown',
      userName: p.createdByUsername || p.receivedBy || 'unknown',
      portal: 'Hospital',
      action,
      module: 'IPD',
      entityId,
      entityLabel: `Encounter: ${p.encounterId}`,
      amount: Number(p.amount || 0),
      method: p.method || p.paymentMode || 'Cash',
      meta: { refNo: p.refNo || '', notes: p.notes || '', type: p.type || 'payment' },
      createdAt: p.receivedAt || p.createdAt || new Date(),
    })
    inserted++
  }
  console.log(`Inserted ${inserted} IPD activity logs`)
}

async function seedCashSessions() {
  console.log('\n--- Cash Sessions ---')
  const sessions = await HospitalCashSession.find({}).sort({ createdAt: -1 }).limit(5000).lean()
  let inserted = 0
  for (const s of sessions as any[]) {
    const entityId = String(s._id)
    const action = s.status === 'closed' ? 'Cash Session Closed' : 'Cash Session Opened'
    if (await alreadyLogged(entityId, action, 'Hospital')) continue

    await ActivityLog.create({
      userId: s.userId || 'unknown',
      userName: s.userName || 'unknown',
      portal: 'Hospital',
      action,
      module: 'Cash Session',
      entityId,
      entityLabel: `Session: ${s.dateIso} — ${s.status}`,
      amount: Number(s.totalIn || 0),
      method: 'Cash',
      meta: { status: s.status, dateIso: s.dateIso, note: s.note || '' },
      createdAt: s.createdAt || new Date(),
    })
    inserted++
  }
  console.log(`Inserted ${inserted} Cash Session activity logs`)
}

async function seedShifts() {
  console.log('\n--- Finance Shifts ---')
  const shifts = await Shift.find({}).sort({ createdAt: -1 }).limit(5000).lean()
  let inserted = 0
  for (const s of shifts as any[]) {
    const entityId = String(s._id)
    const action = s.status === 'open' ? 'Shift Opened' : 'Shift Closed'
    if (await alreadyLogged(entityId, action, 'Finance')) continue

    const userId = s.openedBy?.userId || 'unknown'
    const userName = s.openedBy?.username || 'unknown'
    const baseMeta: any = { counter: s.counterName, shiftType: s.shiftType, shiftName: s.shiftName }

    await ActivityLog.create({
      userId,
      userName,
      portal: 'Finance',
      action: 'Shift Opened',
      module: 'Shift',
      entityId,
      entityLabel: `${s.shiftName} @ ${s.counterName}`,
      amount: Number(s.openingFloat || 0),
      method: 'Cash',
      meta: { ...baseMeta, status: 'open' },
      createdAt: s.startTime || s.createdAt || new Date(),
    })
    inserted++

    if (s.status !== 'open' && s.closedBy) {
      if (!(await alreadyLogged(entityId, 'Shift Closed', 'Finance'))) {
        await ActivityLog.create({
          userId: s.closedBy.userId || userId,
          userName: s.closedBy.username || userName,
          portal: 'Finance',
          action: 'Shift Closed',
          module: 'Shift',
          entityId,
          entityLabel: `${s.shiftName} @ ${s.counterName}`,
          amount: Number(s.actualCash || 0),
          method: 'Cash',
          meta: { ...baseMeta, status: s.status, variance: s.variance, varianceReason: s.varianceReason || '' },
          createdAt: s.endTime || s.updatedAt || new Date(),
        })
        inserted++
      }
    }
  }
  console.log(`Inserted ${inserted} Shift activity logs`)
}

async function seedJournals() {
  console.log('\n--- Finance Journals ---')
  const journals = await FinanceJournal.find({
    refType: { $in: ['doctor_payout', 'manual_doctor_earning', 'opd_token_reversal'] },
  }).sort({ createdAt: -1 }).limit(5000).lean()

  let inserted = 0
  for (const j of journals as any[]) {
    const entityId = String(j._id)
    let action = 'Manual Earning Recorded'
    let portal = 'Hospital'
    if (j.refType === 'doctor_payout') {
      action = 'Doctor Payout'
      portal = 'Finance'
    } else if (j.refType === 'opd_token_reversal') {
      action = 'Refund Issued'
      portal = 'Hospital'
    }
    if (await alreadyLogged(entityId, action, portal)) continue

    const amount = (j.lines || []).reduce((s: number, l: any) => s + (l.debit || l.credit || 0), 0)
    const tags = (j.lines || []).find((l: any) => l.tags)?.tags || {}
    const userId = tags.createdByUserId || tags.doctorId || 'system'
    const userName = tags.createdByUsername || tags.doctorName || 'system'

    await ActivityLog.create({
      userId: String(userId),
      userName: String(userName),
      portal,
      action,
      module: j.module || 'General',
      entityId,
      entityLabel: j.memo || `${j.refType} — ${j.refId || ''}`,
      amount: Number(amount || 0),
      method: tags.method || 'Cash',
      meta: { refType: j.refType, refId: j.refId || '', memo: j.memo || '', status: j.status || 'active' },
      createdAt: j.createdAt || new Date(),
    })
    inserted++
  }
  console.log(`Inserted ${inserted} Journal activity logs`)
}

async function seedPharmacySales() {
  console.log('\n--- Pharmacy Sales ---')
  const sales = await Dispense.find({}).sort({ createdAt: -1 }).limit(5000).lean()
  let inserted = 0
  for (const s of sales as any[]) {
    const entityId = String(s._id)
    const action = 'Pharmacy Sale'
    if (await alreadyLogged(entityId, action, 'Pharmacy')) continue

    await ActivityLog.create({
      userId: s.createdBy || 'unknown',
      userName: s.createdBy || 'unknown',
      portal: 'Pharmacy',
      action,
      module: 'Pharmacy',
      entityId,
      entityLabel: `Bill #${s.billNo} — ${s.customerName || 'Walk-in'}`,
      amount: Number(s.total || 0),
      method: s.payment || 'Cash',
      meta: { billNo: s.billNo, customerName: s.customerName || '', subtotal: s.subtotal, discountPct: s.discountPct },
      createdAt: s.createdAt || new Date(),
    })
    inserted++
  }
  console.log(`Inserted ${inserted} Pharmacy Sale activity logs`)
}

async function seedLabTokens() {
  console.log('\n--- Lab Tokens ---')
  const tokens = await LabToken.find({
    status: { $nin: ['cancelled'] },
  }).sort({ createdAt: -1 }).limit(5000).lean()

  let inserted = 0
  for (const t of tokens as any[]) {
    const entityId = String(t._id)
    const action = 'Lab Payment Collected'
    if (await alreadyLogged(entityId, action, 'Lab')) continue

    await ActivityLog.create({
      userId: t.generatedBy || 'unknown',
      userName: t.generatedBy || 'unknown',
      portal: 'Lab',
      action,
      module: 'Lab',
      entityId,
      entityLabel: `Token #${t.tokenNo} — ${t.patient?.fullName || 'Patient'}`,
      amount: Number(t.receivedAmount || t.net || 0),
      method: t.paymentMethod || 'Cash',
      meta: { tokenNo: t.tokenNo, patientName: t.patient?.fullName || '', mrn: t.patient?.mrn || '', tests: (t.tests || []).map((x: any) => x.testName).join(', ') },
      createdAt: t.createdAt || new Date(),
    })
    inserted++
  }
  console.log(`Inserted ${inserted} Lab Token activity logs`)
}

async function seedHospitalTokens() {
  console.log('\n--- Hospital OPD Tokens ---')
  const tokens = await HospitalToken.find({
    status: { $nin: ['cancelled', 'returned'] },
  }).sort({ createdAt: -1 }).limit(5000).lean()

  let inserted = 0
  for (const t of tokens as any[]) {
    const entityId = String(t._id)
    const action = 'OPD Payment Collected'
    if (await alreadyLogged(entityId, action, 'Hospital')) continue

    await ActivityLog.create({
      userId: t.createdByUserId || 'unknown',
      userName: t.createdByUsername || 'unknown',
      portal: 'Hospital',
      action,
      module: 'OPD',
      entityId,
      entityLabel: `Token #${t.tokenNo} — ${t.patientName || 'Patient'}`,
      amount: Number(t.fee || 0),
      method: t.paidMethod || 'Cash',
      meta: { tokenNo: t.tokenNo, patientName: t.patientName || '', mrn: t.mrn || '', department: t.departmentName || '' },
      createdAt: t.createdAt || new Date(),
    })
    inserted++
  }
  console.log(`Inserted ${inserted} OPD Token activity logs`)
}

async function main() {
  await connect()

  await seedIpdPayments()
  await seedCashSessions()
  await seedShifts()
  await seedJournals()
  await seedPharmacySales()
  await seedLabTokens()
  await seedHospitalTokens()

  console.log('\n=== Seeding complete ===')
  await mongoose.disconnect()
}

main().catch((err) => {
  console.error('Seed error:', err)
  process.exit(1)
})
