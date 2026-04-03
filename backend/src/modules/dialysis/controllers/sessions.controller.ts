import { Request, Response } from 'express'
import { DialysisSession } from '../models/DialysisSession'
import { DialysisPatient } from '../models/DialysisPatient'

function asNum(v: any): number | undefined {
  if (v === '' || v == null) return undefined
  const n = Number(v)
  return Number.isFinite(n) ? n : undefined
}

export async function list(req: Request, res: Response) {
  const { dialysisPatientId, tokenId, from, to, page = '1', limit = '50' } = req.query as any
  const filter: any = {}
  if (dialysisPatientId) filter.dialysisPatientId = dialysisPatientId
  if (tokenId) filter.tokenId = tokenId
  if (from || to) {
    filter.dateIso = {}
    if (from) filter.dateIso.$gte = String(from)
    if (to) filter.dateIso.$lte = String(to)
  }

  const lmt = Math.min(200, Math.max(1, parseInt(String(limit))))
  const skip = (Math.max(1, parseInt(String(page))) - 1) * lmt

  const [items, total] = await Promise.all([
    DialysisSession.find(filter).sort({ dateIso: -1, createdAt: -1 }).skip(skip).limit(lmt).lean(),
    DialysisSession.countDocuments(filter),
  ])

  res.json({ items, total, page: parseInt(String(page)), limit: lmt })
}

export async function get(req: Request, res: Response) {
  const { id } = req.params
  const session = await DialysisSession.findById(id).lean()
  if (!session) return res.status(404).json({ error: 'Session not found' })
  res.json({ session })
}

export async function create(req: Request, res: Response) {
  const data = (req.body || {}) as any
  if (!data.dialysisPatientId) return res.status(400).json({ message: 'dialysisPatientId is required' })

  const dp: any = await DialysisPatient.findById(data.dialysisPatientId).lean()
  if (!dp) return res.status(404).json({ error: 'Dialysis patient not found' })

  const doc = await DialysisSession.create({
    dialysisPatientId: dp._id,
    labPatientId: dp.labPatientId,
    tokenId: data.tokenId || undefined,
    tokenNo: data.tokenNo,
    dateIso: data.dateIso,

    timeStarted: data.timeStarted,
    timeCompleted: data.timeCompleted,

    dialyzerTypeId: data.dialyzerTypeId || undefined,
    dialyzerTypeName: data.dialyzerTypeName,
    noOfUse: asNum(data.noOfUse),

    bloodFlowRate: asNum(data.bloodFlowRate),
    dialysateFlowRate: asNum(data.dialysateFlowRate),
    venousPressure: asNum(data.venousPressure),

    heparinLoadingDose: asNum(data.heparinLoadingDose),
    heparinInfusion: asNum(data.heparinInfusion),

    bpPreSys: asNum(data.bpPreSys),
    bpPreDia: asNum(data.bpPreDia),
    bpIntraSys: asNum(data.bpIntraSys),
    bpIntraDia: asNum(data.bpIntraDia),
    bpPostSys: asNum(data.bpPostSys),
    bpPostDia: asNum(data.bpPostDia),

    weightDry: asNum(data.weightDry),
    weightPre: asNum(data.weightPre),
    weightPost: asNum(data.weightPost),
    idwg: asNum(data.idwg),

    medEpo: data.medEpo,
    medIron: data.medIron,
    medCalctriol: data.medCalctriol,
    medKtVOrUrr: data.medKtVOrUrr,

    targetUF: asNum(data.targetUF),

    dataEntryName: data.dataEntryName,
    dataEntryDesignation: data.dataEntryDesignation,
    dataEntrySign: data.dataEntrySign,

    patientProblem: data.patientProblem,

    nephrologistName: data.nephrologistName,
    nephrologistSign: data.nephrologistSign,
    nephrologistTime: data.nephrologistTime,
  })

  res.status(201).json({ session: doc })
}

export async function update(req: Request, res: Response) {
  const { id } = req.params
  const data = (req.body || {}) as any

  const patch: any = {}
  const keys: Array<[string, (v: any) => any]> = [
    ['dateIso', (v) => v],
    ['timeStarted', (v) => v],
    ['timeCompleted', (v) => v],
    ['dialyzerTypeId', (v) => v || undefined],
    ['dialyzerTypeName', (v) => v],
    ['noOfUse', asNum],
    ['bloodFlowRate', asNum],
    ['dialysateFlowRate', asNum],
    ['venousPressure', asNum],
    ['heparinLoadingDose', asNum],
    ['heparinInfusion', asNum],
    ['bpPreSys', asNum],
    ['bpPreDia', asNum],
    ['bpIntraSys', asNum],
    ['bpIntraDia', asNum],
    ['bpPostSys', asNum],
    ['bpPostDia', asNum],
    ['weightDry', asNum],
    ['weightPre', asNum],
    ['weightPost', asNum],
    ['idwg', asNum],
    ['medEpo', (v) => v],
    ['medIron', (v) => v],
    ['medCalctriol', (v) => v],
    ['medKtVOrUrr', (v) => v],
    ['targetUF', asNum],
    ['dataEntryName', (v) => v],
    ['dataEntryDesignation', (v) => v],
    ['dataEntrySign', (v) => v],
    ['patientProblem', (v) => v],
    ['nephrologistName', (v) => v],
    ['nephrologistSign', (v) => v],
    ['nephrologistTime', (v) => v],
  ]

  for (const [k, fn] of keys) {
    if (data[k] !== undefined) patch[k] = fn(data[k])
  }

  const session = await DialysisSession.findByIdAndUpdate(id, { $set: patch }, { new: true })
  if (!session) return res.status(404).json({ error: 'Session not found' })
  res.json({ session })
}

export async function remove(req: Request, res: Response) {
  const { id } = req.params
  const session = await DialysisSession.findByIdAndDelete(id)
  if (!session) return res.status(404).json({ error: 'Session not found' })
  res.json({ ok: true })
}
