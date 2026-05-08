import { Request, Response } from 'express'
import * as XLSX from 'xlsx'
import { LabWardImport } from '../models/WardImport'
import { LabPatient } from '../models/Patient'
import { LabToken } from '../models/Token'
import { logAudit, actorOf } from '../utils/audit'

/**
 * Expected JSON shape:
 * {
 *   "wardId": "MED-1", "departmentId": "MED", "emergencyDayId": "MON",
 *   "patients": [
 *     { "fullName": "...", "age": "30", "gender": "Male", "phone": "...",
 *       "hospitalRegistrationNumber": "RG-123", "tests": ["CBC","LFT"], "notes": "..." }
 *   ]
 * }
 *
 * Or XLSX with first sheet, headers matching patient field names.
 */

function genMrn() {
  return 'WI-' + Date.now().toString(36).toUpperCase() + Math.floor(Math.random() * 1000)
}

function genTokenNo() {
  const d = new Date()
  return `WI${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}-${Date.now().toString(36).slice(-5).toUpperCase()}`
}

export async function list(req: Request, res: Response) {
  const { status, page = '1', limit = '50' } = req.query as any
  const filter: any = {}
  if (status) filter.status = status
  const lim = Math.min(500, Number(limit) || 50)
  const pg = Math.max(1, Number(page) || 1)
  const [items, total] = await Promise.all([
    LabWardImport.find(filter).sort({ createdAt: -1 }).skip((pg - 1) * lim).limit(lim).lean(),
    LabWardImport.countDocuments(filter),
  ])
  res.json({ items, total, page: pg, totalPages: Math.max(1, Math.ceil(total / lim)) })
}

export async function get(req: Request, res: Response) {
  const doc = await LabWardImport.findById(req.params.id).lean()
  if (!doc) return res.status(404).json({ message: 'Not found' })
  res.json(doc)
}

/**
 * POST /lab/ward-imports/upload
 * Body: { fileName, fileType: 'json'|'xlsx', base64, wardId?, departmentId?, emergencyDayId? }
 * Parses the file and stores rows in pending_review state. Does NOT commit.
 */
export async function upload(req: Request, res: Response) {
  const { actor } = actorOf(req)
  const { fileName, fileType, base64, wardId, departmentId, emergencyDayId, notes } = req.body || {}
  if (!fileName || !fileType || !base64) {
    return res.status(400).json({ message: 'fileName, fileType, base64 required' })
  }

  let rows: any[] = []
  let wId = wardId, dId = departmentId, eId = emergencyDayId

  try {
    const buf = Buffer.from(String(base64).replace(/^data:[^;]+;base64,/, ''), 'base64')
    if (fileType === 'json') {
      const parsed = JSON.parse(buf.toString('utf-8'))
      wId = wId || parsed.wardId
      dId = dId || parsed.departmentId
      eId = eId || parsed.emergencyDayId
      rows = Array.isArray(parsed.patients) ? parsed.patients : (Array.isArray(parsed) ? parsed : [])
    } else if (fileType === 'xlsx' || fileType === 'csv') {
      const wb = XLSX.read(buf, { type: 'buffer' })
      const sheetName = wb.SheetNames[0]
      rows = XLSX.utils.sheet_to_json(wb.Sheets[sheetName], { defval: '' }) as any[]
    } else {
      return res.status(400).json({ message: 'Unsupported fileType' })
    }
  } catch (e: any) {
    return res.status(400).json({ message: 'Failed to parse file', error: e?.message })
  }

  const doc = await LabWardImport.create({
    fileName,
    fileType,
    wardId: wId,
    departmentId: dId,
    emergencyDayId: eId,
    uploadedBy: actor,
    uploadedAt: new Date().toISOString(),
    totalRows: rows.length,
    rows: rows.map((r, idx) => ({ rowIndex: idx, raw: r, status: 'pending' })),
    status: 'pending_review',
    notes,
  })

  await logAudit(req, { action: 'ward_import.upload', entity: 'ward_import', entityId: String(doc._id), label: fileName })
  res.status(201).json(doc)
}

/**
 * POST /lab/ward-imports/:id/commit
 * Commits the import: creates Lab_Patient + Lab_Token rows for each row.
 */
export async function commit(req: Request, res: Response) {
  const { actor } = actorOf(req)
  const doc: any = await LabWardImport.findById(req.params.id)
  if (!doc) return res.status(404).json({ message: 'Not found' })
  if (doc.status === 'committed') return res.status(400).json({ message: 'Already committed' })

  let imported = 0, skipped = 0, errors = 0
  for (const row of doc.rows) {
    if (row.status !== 'pending') { skipped++; continue }
    try {
      const r = row.raw || {}
      const fullName = String(r.fullName || r.name || '').trim()
      if (!fullName) {
        row.status = 'skipped'; row.error = 'fullName missing'; skipped++; continue
      }
      // Find or create patient by hospitalRegistrationNumber/phone/cnic, else create new MRN
      const phone = String(r.phone || '').replace(/\D/g, '')
      const cnic = String(r.cnic || '').replace(/\D/g, '')
      let patient: any = null
      if (r.hospitalRegistrationNumber) {
        patient = await LabPatient.findOne({ hospitalRegistrationNumber: r.hospitalRegistrationNumber })
      }
      if (!patient && phone) patient = await LabPatient.findOne({ phoneNormalized: phone })
      if (!patient && cnic) patient = await LabPatient.findOne({ cnicNormalized: cnic })
      if (!patient) {
        patient = await LabPatient.create({
          mrn: genMrn(),
          fullName,
          fatherName: r.fatherName,
          phoneNormalized: phone,
          cnicNormalized: cnic,
          gender: r.gender,
          age: r.age != null ? String(r.age) : '',
          address: r.address,
          createdAtIso: new Date().toISOString(),
          hospitalRegistrationNumber: r.hospitalRegistrationNumber,
          patientType: 'IPD',
          departmentId: doc.departmentId,
          wardId: doc.wardId,
          emergencyDayId: doc.emergencyDayId,
        })
      }

      // Create a basic token (sample not received yet)
      const tokenNo = genTokenNo()
      const tests = Array.isArray(r.tests)
        ? r.tests.map((t: any) => ({ testId: typeof t === 'string' ? t : t.testId, testName: typeof t === 'string' ? t : t.testName, price: 0 }))
        : []
      const token = await LabToken.create({
        tokenNo,
        patientId: String(patient._id),
        patient: {
          mrn: patient.mrn,
          fullName: patient.fullName,
          phone: patient.phoneNormalized,
          age: patient.age,
          gender: patient.gender,
        },
        tests,
        status: 'token_generated',
        generatedAt: new Date().toISOString(),
        generatedBy: actor,
        portal: 'lab',
        source: 'ward_import',
        departmentId: doc.departmentId,
        wardId: doc.wardId,
        emergencyDayId: doc.emergencyDayId,
        sampleType: 'normal',
        hospitalRegistrationNumber: r.hospitalRegistrationNumber,
      })

      row.patientId = String(patient._id)
      row.tokenId = String(token._id)
      row.status = 'imported'
      imported++
    } catch (e: any) {
      row.status = 'error'
      row.error = e?.message || 'unknown'
      errors++
    }
  }

  doc.importedRows = imported
  doc.skippedRows = skipped
  doc.errorRows = errors
  doc.status = 'committed'
  await doc.save()
  await logAudit(req, { action: 'ward_import.commit', entity: 'ward_import', entityId: req.params.id, label: `${imported} imported / ${skipped} skipped / ${errors} errors` })
  res.json(doc)
}

export async function cancel(req: Request, res: Response) {
  const doc = await LabWardImport.findByIdAndUpdate(req.params.id, { status: 'cancelled' }, { new: true })
  if (!doc) return res.status(404).json({ message: 'Not found' })
  await logAudit(req, { action: 'ward_import.cancel', entity: 'ward_import', entityId: req.params.id })
  res.json(doc)
}
