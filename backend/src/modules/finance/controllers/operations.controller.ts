/**
 * Finance "operations" endpoints — centralized cross-module reads/writes
 * for Expenses, Vendors, Bills, Vendor Payments, Payroll.
 *
 * IMPORTANT: these are DELEGATES, not duplicates. They read existing module
 * collections (HospitalExpense, StoreSupplier, HospitalStaff, HospitalStaffEarning)
 * so there is no parallel data store. Writes funnel through `financeHooks` so
 * every fiscal event lands in the unified journal.
 */

import { Request, Response } from 'express'
import { financeHooks } from '../services/financeHooks'
import { FinanceJournal } from '../models/FinanceJournal'
import { FinanceAuditLog } from '../models/FinanceAuditLog'

function actorOf(req: Request) { return (req as any).user?.name || (req as any).user?.username || (req as any).user?.email || 'system' }

async function audit(req: Request, action: string, label: string, detail?: string) {
  try { await FinanceAuditLog.create({ actor: actorOf(req), action, label, method: req.method, path: req.originalUrl, at: new Date().toISOString(), detail }) } catch {}
}

function round2(n: number){ return Math.round((Number(n) + Number.EPSILON) * 100) / 100 }

// ---------------------------------------------------------------------------
// Expenses (centralized — source is hospital_expenses)
// ---------------------------------------------------------------------------

/** GET /finance/expenses?from&to&departmentId&category&q&page&limit */
export async function listExpenses(req: Request, res: Response){
  const { HospitalExpense } = await import('../../hospital/models/Expense')
  const from = String((req.query as any).from || '')
  const to   = String((req.query as any).to   || '')
  const department = String((req.query as any).departmentId || '')
  const category   = String((req.query as any).category     || '')
  const q          = String((req.query as any).q            || '')
  const page  = Math.max(1, parseInt(String((req.query as any).page  || '1')) || 1)
  const limit = Math.min(200, Math.max(1, parseInt(String((req.query as any).limit || '50')) || 50))

  const filter: any = {}
  if (from && to) filter.dateIso = { $gte: from, $lte: to }
  else if (from)  filter.dateIso = { $gte: from }
  else if (to)    filter.dateIso = { $lte: to }
  if (department) filter.$or = [{ departmentId: department }, { expenseDepartmentId: department }]
  if (category)   filter.$or = [...(filter.$or || []), { category }, { categoryName: category }]
  if (q)          filter.$or = [...(filter.$or || []), { note: { $regex: q, $options: 'i' } }, { ref: { $regex: q, $options: 'i' } }]

  const total = await HospitalExpense.countDocuments(filter)
  const rows  = await HospitalExpense.find(filter)
    .sort({ dateIso: -1, createdAt: -1 })
    .skip((page - 1) * limit)
    .limit(limit)
    .lean()
  const sumAgg = await HospitalExpense.aggregate([{ $match: filter }, { $group: { _id: null, total: { $sum: '$amount' } } }])
  const grandTotal = round2((sumAgg?.[0] as any)?.total || 0)
  res.json({ rows, total, grandTotal, page, totalPages: Math.ceil(total / limit) })
}

/** POST /finance/expenses — create a new expense AND post the journal. */
export async function createExpense(req: Request, res: Response){
  const { HospitalExpense } = await import('../../hospital/models/Expense')
  const body = req.body || {}
  if (!body.amount || !body.category){
    return res.status(400).json({ error: 'amount and category are required' })
  }
  const dateIso = body.dateIso || new Date().toISOString().slice(0, 10)
  const createdByUsername = String((req as any).user?.username || body.createdByUsername || '')
  const row: any = await HospitalExpense.create({
    dateIso,
    departmentId: body.departmentId,
    expenseDepartmentId: body.expenseDepartmentId,
    departmentName: body.departmentName,
    category: String(body.category || 'Other'),
    expenseCategoryId: body.expenseCategoryId,
    categoryName: body.categoryName,
    amount: Number(body.amount || 0),
    note: body.note,
    method: body.method,
    ref: body.ref,
    createdByUsername,
  })

  // Post to unified journal (idempotent on expenseId)
  try {
    await financeHooks.postExpensePaid({
      expenseId: String(row._id),
      amount: Number(row.amount || 0),
      category: String(row.category || ''),
      method: body.method,
      dateIso,
      departmentId: body.departmentId,
      departmentName: body.departmentName,
      createdByUsername,
    })
  } catch (e) {
    // eslint-disable-next-line no-console
    console.warn('[finance/expenses] failed to post journal', e)
  }

  await audit(req, 'Add Expense', 'EXPENSE', `${body.category} Rs.${body.amount}`)
  res.status(201).json(row)
}

/** DELETE /finance/expenses/:id — remove expense and reverse its journal. */
export async function removeExpense(req: Request, res: Response){
  const { HospitalExpense } = await import('../../hospital/models/Expense')
  const id = String(req.params.id)
  const row: any = await HospitalExpense.findById(id)
  if (!row) return res.status(404).json({ error: 'Expense not found' })
  await HospitalExpense.deleteOne({ _id: id })
  try { await financeHooks.reverseJournalByRef('expense', id, 'Expense deleted') } catch {}
  await audit(req, 'Delete Expense', 'EXPENSE', `id=${id}`)
  res.json({ deleted: true, id })
}

// ---------------------------------------------------------------------------
// Expenses — cross-department aggregation
// ---------------------------------------------------------------------------

type DeptExpenseRow = {
  _id: string
  date: string
  dateIso?: string
  category: string
  categoryName?: string
  type?: string
  note?: string
  amount: number
  method?: string
  ref?: string
  createdBy?: string
  createdByUsername?: string
  departmentName?: string
  department: string
  createdAt?: string
}

/** GET /finance/expenses/by-department?from&to&department&q&page&limit
 *  Aggregates expenses from every module's collection, tags each row with
 *  its source department, and returns a unified list.
 */
export async function listExpensesByDepartment(req: Request, res: Response){
  const from = String((req.query as any).from || '')
  const to   = String((req.query as any).to   || '')
  const dept = String((req.query as any).department || '')
  const q    = String((req.query as any).q || '')
  const page  = Math.max(1, parseInt(String((req.query as any).page  || '1')) || 1)
  const limit = Math.min(200, Math.max(1, parseInt(String((req.query as any).limit || '50')) || 50))

  const allRows: DeptExpenseRow[] = []

  // Helper: build date filter for each schema style
  function dateFilter(isoField: boolean): any {
    const f: any = {}
    if (from && to) f[isoField ? 'dateIso' : 'date'] = { $gte: from, $lte: to }
    else if (from)  f[isoField ? 'dateIso' : 'date'] = { $gte: from }
    else if (to)    f[isoField ? 'dateIso' : 'date'] = { $lte: to }
    return f
  }

  // 1. Hospital (Hospital_Expense) — uses dateIso
  if (!dept || dept === 'hospital') {
    try {
      const { HospitalExpense } = await import('../../hospital/models/Expense')
      const filter: any = dateFilter(true)
      if (q) filter.$or = [{ note: { $regex: q, $options: 'i' } }, { ref: { $regex: q, $options: 'i' } }, { categoryName: { $regex: q, $options: 'i' } }]
      const rows = await HospitalExpense.find(filter).sort({ dateIso: -1, createdAt: -1 }).limit(500).lean()
      for (const r of rows as any[]) allRows.push({
        _id: String(r._id), date: r.dateIso || '', dateIso: r.dateIso,
        category: r.category || '', categoryName: r.categoryName || r.category,
        note: r.note, amount: Number(r.amount || 0), method: r.method, ref: r.ref,
        createdBy: r.createdBy, createdByUsername: r.createdByUsername,
        departmentName: r.departmentName || 'Hospital', department: 'hospital',
        createdAt: r.createdAt,
      })
    } catch {}
  }

  // 2. Pharmacy (Pharmacy_Expense) — uses date
  if (!dept || dept === 'pharmacy') {
    try {
      const { Expense } = await import('../../pharmacy/models/Expense')
      const filter: any = dateFilter(false)
      if (q) filter.$or = [{ note: { $regex: q, $options: 'i' } }, { type: { $regex: q, $options: 'i' } }]
      const rows = await Expense.find(filter).sort({ date: -1 }).limit(500).lean()
      for (const r of rows as any[]) allRows.push({
        _id: String(r._id), date: r.date || '', category: r.type || 'Other', type: r.type,
        note: r.note, amount: Number(r.amount || 0), createdBy: r.createdBy,
        departmentName: 'Pharmacy', department: 'pharmacy', createdAt: r.createdAt,
      })
    } catch {}
  }

  // 3. Lab (Lab_Expense) — uses date
  if (!dept || dept === 'lab') {
    try {
      const { LabExpense } = await import('../../lab/models/Expense')
      const filter: any = dateFilter(false)
      if (q) filter.$or = [{ note: { $regex: q, $options: 'i' } }, { type: { $regex: q, $options: 'i' } }]
      const rows = await LabExpense.find(filter).sort({ date: -1 }).limit(500).lean()
      for (const r of rows as any[]) allRows.push({
        _id: String(r._id), date: r.date || '', category: r.type || 'Other', type: r.type,
        note: r.note, amount: Number(r.amount || 0), createdBy: r.createdBy,
        departmentName: 'Lab', department: 'lab', createdAt: r.createdAt,
      })
    } catch {}
  }

  // 4. Indoor Pharmacy (IndoorPharmacy_Expense) — uses date
  if (!dept || dept === 'indoor-pharmacy') {
    try {
      const { Expense } = await import('../../indoorpharmacy/models/indoorExpense')
      const filter: any = dateFilter(false)
      if (q) filter.$or = [{ note: { $regex: q, $options: 'i' } }, { type: { $regex: q, $options: 'i' } }]
      const rows = await Expense.find(filter).sort({ date: -1 }).limit(500).lean()
      for (const r of rows as any[]) allRows.push({
        _id: String(r._id), date: r.date || '', category: r.type || 'Other', type: r.type,
        note: r.note, amount: Number(r.amount || 0), createdBy: r.createdBy,
        departmentName: 'Indoor Pharmacy', department: 'indoor-pharmacy', createdAt: r.createdAt,
      })
    } catch {}
  }

  // 5. Aesthetic (Aesthetic_Expense) — uses date
  if (!dept || dept === 'aesthetic') {
    try {
      const { Expense } = await import('../../aesthetic/models/Expense')
      const filter: any = dateFilter(false)
      if (q) filter.$or = [{ note: { $regex: q, $options: 'i' } }, { type: { $regex: q, $options: 'i' } }]
      const rows = await Expense.find(filter).sort({ date: -1 }).limit(500).lean()
      for (const r of rows as any[]) allRows.push({
        _id: String(r._id), date: r.date || '', category: r.type || 'Other', type: r.type,
        note: r.note, amount: Number(r.amount || 0), createdBy: r.createdBy,
        departmentName: 'Aesthetic', department: 'aesthetic', createdAt: r.createdAt,
      })
    } catch {}
  }

  // 6. Ambulance expenses (AmbulanceExpense) — uses date (Date type)
  if (!dept || dept === 'ambulance') {
    try {
      const { AmbulanceExpenseModel } = await import('../../hospital/models/AmbulanceExpense')
      const filter: any = {}
      if (from || to) {
        filter.date = {}
        if (from) filter.date.$gte = new Date(from)
        if (to) { const end = new Date(to); end.setHours(23,59,59,999); filter.date.$lte = end }
      }
      if (q) filter.$or = [{ description: { $regex: q, $options: 'i' } }, { category: { $regex: q, $options: 'i' } }]
      const rows = await AmbulanceExpenseModel.find(filter).sort({ date: -1 }).limit(500).lean()
      for (const r of rows as any[]) {
        const dateStr = r.date ? new Date(r.date).toISOString().slice(0,10) : ''
        allRows.push({
          _id: String(r._id), date: dateStr, dateIso: dateStr,
          category: r.category || 'Other', note: r.description, amount: Number(r.amount || 0),
          ref: r.receiptNo, createdBy: r.createdBy ? String(r.createdBy) : undefined,
          departmentName: 'Ambulance', department: 'ambulance', createdAt: r.createdAt,
        })
      }
    } catch {}
  }

  // 7. Equipment expenses (Hospital_EquipmentExpense) — uses referenceDate (Date type)
  if (!dept || dept === 'equipment') {
    try {
      const { EquipmentExpense } = await import('../../hospital/models/EquipmentExpense')
      const filter: any = {}
      if (from || to) {
        filter.referenceDate = {}
        if (from) filter.referenceDate.$gte = new Date(from)
        if (to) { const end = new Date(to); end.setHours(23,59,59,999); filter.referenceDate.$lte = end }
      }
      if (q) filter.$or = [{ notes: { $regex: q, $options: 'i' } }, { category: { $regex: q, $options: 'i' } }]
      const rows = await EquipmentExpense.find(filter).sort({ referenceDate: -1 }).limit(500).lean()
      for (const r of rows as any[]) {
        const dateStr = r.referenceDate ? new Date(r.referenceDate).toISOString().slice(0,10) : ''
        allRows.push({
          _id: String(r._id), date: dateStr, dateIso: dateStr,
          category: r.category || 'Other', note: r.notes, amount: Number(r.totalAmount || r.amount || 0),
          ref: r.referenceNo,
          departmentName: 'Equipment', department: 'equipment', createdAt: r.createdAt,
        })
      }
    } catch {}
  }

  // Sort all rows by date descending
  allRows.sort((a, b) => {
    const da = a.dateIso || a.date || ''
    const db = b.dateIso || b.date || ''
    return db.localeCompare(da) || String(b.createdAt || '').localeCompare(String(a.createdAt || ''))
  })

  // Compute per-department summaries
  const deptSummary: Record<string, { count: number; total: number }> = {}
  for (const r of allRows) {
    if (!deptSummary[r.department]) deptSummary[r.department] = { count: 0, total: 0 }
    deptSummary[r.department].count++
    deptSummary[r.department].total += r.amount
  }

  const grandTotal = round2(allRows.reduce((s, r) => s + r.amount, 0))

  // Paginate
  const total = allRows.length
  const paged = allRows.slice((page - 1) * limit, page * limit)

  res.json({ rows: paged, total, grandTotal, page, totalPages: Math.ceil(total / limit), deptSummary })
}

// ---------------------------------------------------------------------------
// Vendors (unified — backed by StoreSupplier for now)
// ---------------------------------------------------------------------------

/** GET /finance/vendors?q */
export async function listVendors(req: Request, res: Response){
  const { StoreSupplierModel } = await import('../../hospital/models/StoreSupplier')
  const q = String((req.query as any).q || '')
  const filter: any = {}
  if (q) filter.$or = [
    { name:    { $regex: q, $options: 'i' } },
    { company: { $regex: q, $options: 'i' } },
    { phone:   { $regex: q, $options: 'i' } },
  ]
  const rows = await StoreSupplierModel.find(filter).sort({ name: 1 }).lean()
  res.json(rows)
}

/** POST /finance/vendors */
export async function createVendor(req: Request, res: Response){
  const { StoreSupplierModel } = await import('../../hospital/models/StoreSupplier')
  const b = req.body || {}
  if (!b.name) return res.status(400).json({ error: 'name is required' })
  const row = await StoreSupplierModel.create({
    name: b.name, company: b.company, phone: b.phone, email: b.email,
    address: b.address, taxId: b.taxId, status: b.status || 'Active', notes: b.notes,
  })
  await audit(req, 'Add Vendor', 'VENDOR', b.name)
  res.status(201).json(row)
}

/** GET /finance/vendors/:id — includes live balance from journal. */
export async function getVendor(req: Request, res: Response){
  const { StoreSupplierModel } = await import('../../hospital/models/StoreSupplier')
  const id = String(req.params.id)
  const vendor: any = await StoreSupplierModel.findById(id).lean()
  if (!vendor) return res.status(404).json({ error: 'Vendor not found' })

  const bal = await FinanceJournal.aggregate([
    { $match: { status: { $ne: 'reversed' } } },
    { $unwind: '$lines' },
    { $match: { 'lines.account': 'VENDOR_PAYABLE', 'lines.tags.vendorId': String(id) } },
    { $group: { _id: null, credits: { $sum: { $ifNull: ['$lines.credit', 0] } }, debits: { $sum: { $ifNull: ['$lines.debit', 0] } } } },
  ])
  const outstanding = round2(Number((bal?.[0] as any)?.credits || 0) - Number((bal?.[0] as any)?.debits || 0))
  res.json({ ...vendor, outstanding })
}

// ---------------------------------------------------------------------------
// Bills & Vendor Payments (journal-backed)
// ---------------------------------------------------------------------------

/** GET /finance/bills */
export async function listBills(req: Request, res: Response){
  const { from, to } = { from: String((req.query as any).from || ''), to: String((req.query as any).to || '') }
  const vendorId = String((req.query as any).vendorId || '')
  const match: any = { refType: 'vendor_bill', status: { $ne: 'reversed' } }
  if (from) match.dateIso = { ...(match.dateIso || {}), $gte: from }
  if (to)   match.dateIso = { ...(match.dateIso || {}), $lte: to }
  if (vendorId) match['lines.tags.vendorId'] = vendorId
  const rows = await FinanceJournal.find(match).sort({ dateIso: -1, createdAt: -1 }).limit(200).lean()
  res.json(rows)
}

/** POST /finance/bills — create a vendor bill. */
export async function createBill(req: Request, res: Response){
  const { vendorId, vendorName, amount, dateIso, memo } = req.body || {}
  if (!vendorId || !amount) return res.status(400).json({ error: 'vendorId and amount are required' })
  const billId = `${vendorId}:${Date.now()}`
  const j = await financeHooks.postVendorBill({
    billId,
    vendorId,
    vendorName,
    amount: Number(amount),
    dateIso,
  })
  if (j && memo) { (j as any).memo = memo; await (j as any).save?.() }
  await audit(req, 'Create Bill', 'BILL', `vendor=${vendorName} Rs.${amount}`)
  res.status(201).json(j)
}

/** GET /finance/vendor-payments */
export async function listVendorPayments(req: Request, res: Response){
  const { from, to } = { from: String((req.query as any).from || ''), to: String((req.query as any).to || '') }
  const vendorId = String((req.query as any).vendorId || '')
  const match: any = { refType: 'vendor_payment', status: { $ne: 'reversed' } }
  if (from) match.dateIso = { ...(match.dateIso || {}), $gte: from }
  if (to)   match.dateIso = { ...(match.dateIso || {}), $lte: to }
  if (vendorId) match['lines.tags.vendorId'] = vendorId
  const rows = await FinanceJournal.find(match).sort({ dateIso: -1, createdAt: -1 }).limit(200).lean()
  res.json(rows)
}

/** POST /finance/vendor-payments */
export async function createVendorPayment(req: Request, res: Response){
  const { vendorId, vendorName, amount, method, dateIso } = req.body || {}
  if (!vendorId || !amount) return res.status(400).json({ error: 'vendorId and amount are required' })
  const paymentId = `${vendorId}:${Date.now()}`
  const j = await financeHooks.postVendorPayment({
    paymentId, vendorId, vendorName, amount: Number(amount), method, dateIso,
  })
  await audit(req, 'Vendor Payment', 'VENDOR_PAYMENT', `vendor=${vendorName} Rs.${amount} via ${method||'cash'}`)
  res.status(201).json(j)
}

// ---------------------------------------------------------------------------
// Payroll — Staff
// ---------------------------------------------------------------------------

/** GET /finance/payroll/staff?period=YYYY-MM
 *  Returns each active staff member with monthly earnings, deductions, net pay,
 *  and whether they were already paid (has staff_payout journal) this period.
 */
export async function payrollStaff(req: Request, res: Response){
  const { HospitalStaff } = await import('../../hospital/models/Staff')
  const { HospitalStaffEarning } = await import('../../hospital/models/StaffEarning')
  const period = String((req.query as any).period || new Date().toISOString().slice(0, 7))
  const from = `${period}-01`
  const toDate = new Date(from)
  toDate.setMonth(toDate.getMonth() + 1)
  const to = toDate.toISOString().slice(0, 10)

  const staff = await HospitalStaff.find({ active: true }).sort({ name: 1 }).lean()

  // Aggregate earnings per staff for the period
  const earningsAgg = await HospitalStaffEarning.aggregate([
    { $match: { date: { $gte: from, $lt: to } } },
    { $group: { _id: '$staffId', total: { $sum: { $ifNull: ['$amount', 0] } } } },
  ])
  const earningsMap: Record<string, number> = {}
  for (const e of earningsAgg) earningsMap[String((e as any)._id)] = Number((e as any).total || 0)

  // Payments already made this period
  const paidAgg = await FinanceJournal.aggregate([
    { $match: { refType: 'staff_payout', dateIso: { $gte: from, $lt: to }, status: { $ne: 'reversed' } } },
    { $unwind: '$lines' },
    { $match: { 'lines.account': 'STAFF_PAYABLE' } },
    { $group: { _id: '$lines.tags.staffId', total: { $sum: { $ifNull: ['$lines.debit', 0] } } } },
  ])
  const paidMap: Record<string, number> = {}
  for (const p of paidAgg) paidMap[String((p as any)._id)] = Number((p as any).total || 0)

  const rows = staff.map((s: any) => {
    const id = String(s._id)
    const base = Number(s.salary || 0)
    const earnings = round2(earningsMap[id] || 0)
    const gross = round2(base + earnings)
    const paid = round2(paidMap[id] || 0)
    const net = round2(gross - paid)
    return {
      id,
      name: s.name,
      role: s.role,
      phone: s.phone,
      baseSalary: base,
      earnings,
      gross,
      paid,
      net,
      status: paid >= gross && gross > 0 ? 'Paid' : (paid > 0 ? 'Partial' : 'Due'),
    }
  })

  const totals = rows.reduce((acc, r) => ({
    gross: round2(acc.gross + r.gross),
    paid:  round2(acc.paid  + r.paid),
    net:   round2(acc.net   + r.net),
  }), { gross: 0, paid: 0, net: 0 })

  res.json({ period, rows, totals })
}

/** POST /finance/payroll/staff/:id/pay  { amount, method } — records payout. */
export async function payStaff(req: Request, res: Response){
  const staffId = String(req.params.id)
  const { amount, method, dateIso, memo } = req.body || {}
  if (!amount || Number(amount) <= 0) return res.status(400).json({ error: 'amount > 0 required' })
  const payoutId = `${staffId}:${Date.now()}`
  const j = await financeHooks.postStaffPayout({
    payoutId, staffId, amount: Number(amount), method, dateIso,
    createdByUsername: String((req as any).user?.username || ''),
  })
  if (j && memo) { (j as any).memo = memo; await (j as any).save?.() }
  await audit(req, 'Staff Payout', 'PAYROLL', `staffId=${staffId} Rs.${amount}`)
  res.status(201).json(j)
}

// ---------------------------------------------------------------------------
// Payroll — Doctors (reads from central journal DOCTOR_PAYABLE)
// ---------------------------------------------------------------------------

/** GET /finance/payroll/doctors */
export async function payrollDoctors(_req: Request, res: Response){
  const { HospitalDoctor } = await import('../../hospital/models/Doctor')
  const doctors = await HospitalDoctor.find({}).sort({ name: 1 }).lean()

  // Balances from DOCTOR_PAYABLE
  const balances = await FinanceJournal.aggregate([
    { $match: { status: { $ne: 'reversed' } } },
    { $unwind: '$lines' },
    { $match: { 'lines.account': 'DOCTOR_PAYABLE', 'lines.tags.doctorId': { $exists: true } } },
    { $group: {
      _id: '$lines.tags.doctorId',
      credits: { $sum: { $ifNull: ['$lines.credit', 0] } },
      debits:  { $sum: { $ifNull: ['$lines.debit',  0] } },
    } },
  ])
  const map: Record<string, number> = {}
  for (const b of balances) map[String((b as any)._id)] = round2(Number((b as any).credits || 0) - Number((b as any).debits || 0))

  const rows = doctors.map((d: any) => ({
    id: String(d._id),
    name: d.name,
    department: d.department || d.departmentName || '',
    balance: map[String(d._id)] || 0,
  }))

  res.json({ rows, total: round2(rows.reduce((s, r) => s + r.balance, 0)) })
}

/** POST /finance/payroll/doctors/:id/pay  { amount, method, memo } */
export async function payDoctor(req: Request, res: Response){
  const doctorId = String(req.params.id)
  const { amount, method, memo, dateIso } = req.body || {}
  if (!amount || Number(amount) <= 0) return res.status(400).json({ error: 'amount > 0 required' })
  const j = await financeHooks.postDoctorPayout({
    doctorId,
    amount: Number(amount),
    method,
    memo,
    dateIso,
    createdByUsername: String((req as any).user?.username || ''),
  })
  await audit(req, 'Doctor Payout', 'PAYROLL', `doctorId=${doctorId} Rs.${amount}`)
  res.status(201).json(j)
}

// ---------------------------------------------------------------------------
// Payroll — Attendance summary (read-only from hospital module)
// ---------------------------------------------------------------------------

/** GET /finance/payroll/attendance?period=YYYY-MM */
export async function payrollAttendance(req: Request, res: Response){
  try {
    const { HospitalStaff } = await import('../../hospital/models/Staff')
    const period = String((req.query as any).period || new Date().toISOString().slice(0, 7))
    const from = `${period}-01`
    const toDate = new Date(from)
    toDate.setMonth(toDate.getMonth() + 1)
    const to = toDate.toISOString().slice(0, 10)

    const Att = (await import('../../hospital/models/Attendance')) as any
    const AttModel = Att.HospitalAttendance || Att.default
    if (!AttModel) return res.json({ rows: [], period })

    const agg = await AttModel.aggregate([
      { $match: { date: { $gte: from, $lt: to } } },
      { $group: {
        _id: '$staffId',
        present: { $sum: { $cond: [{ $eq: ['$status', 'Present'] }, 1, 0] } },
        absent:  { $sum: { $cond: [{ $eq: ['$status', 'Absent'] }, 1, 0] } },
        leave:   { $sum: { $cond: [{ $eq: ['$status', 'Leave'] }, 1, 0] } },
      } },
    ])
    const staff = await HospitalStaff.find({ active: true }).lean()
    const map = Object.fromEntries(agg.map((r: any) => [String(r._id), r]))
    const rows = staff.map((s: any) => {
      const a = (map as any)[String(s._id)] || { present: 0, absent: 0, leave: 0 }
      const base = Number(s.salary || 0)
      const workingDays = 26
      const perDay = base ? round2(base / workingDays) : 0
      const deductions = round2(perDay * Number(a.absent || 0))
      return {
        id: String(s._id),
        name: s.name,
        role: s.role,
        present: a.present,
        absent: a.absent,
        leave: a.leave,
        perDay,
        deductions,
        netFromAttendance: round2(base - deductions),
      }
    })
    res.json({ period, rows })
  } catch {
    res.json({ period: (req.query as any).period, rows: [] })
  }
}

/** GET /finance/payroll/earnings-deductions?period=YYYY-MM */
export async function payrollEarningsDeductions(req: Request, res: Response){
  const { HospitalStaffEarning } = await import('../../hospital/models/StaffEarning')
  const period = String((req.query as any).period || new Date().toISOString().slice(0, 7))
  const from = `${period}-01`
  const toDate = new Date(from)
  toDate.setMonth(toDate.getMonth() + 1)
  const to = toDate.toISOString().slice(0, 10)
  const rows = await HospitalStaffEarning.find({ date: { $gte: from, $lt: to } }).sort({ date: -1 }).lean()
  res.json({ period, rows })
}
