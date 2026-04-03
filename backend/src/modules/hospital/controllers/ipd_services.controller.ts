import { Request, Response } from 'express'
import { HospitalIpdService } from '../models/IpdService'
import { createIpdServiceSchema, updateIpdServiceSchema } from '../validators/ipd_services'

function handleError(res: Response, e: any){
  if (e?.name === 'ZodError') return res.status(400).json({ error: e.errors?.[0]?.message || 'Invalid payload' })
  if (e?.code === 11000) return res.status(409).json({ error: 'Service name already exists' })
  if (e?.status) return res.status(e.status).json({ error: e.error || 'Error' })
  return res.status(500).json({ error: 'Internal Server Error' })
}

export async function list(req: Request, res: Response){
  try{
    const q = req.query as any
    const page = Math.max(1, parseInt(String(q.page || '1')) || 1)
    const limit = Math.max(1, Math.min(200, parseInt(String(q.limit || '50')) || 50))
    const crit: any = {}
    if (q.active != null) crit.active = String(q.active) === 'true'
    if (q.category) crit.category = String(q.category)
    if (q.q) crit.name = { $regex: String(q.q), $options: 'i' }
    const total = await HospitalIpdService.countDocuments(crit)
    const rows = await HospitalIpdService.find(crit).sort({ name: 1 }).skip((page-1)*limit).limit(limit).lean()
    res.json({ services: rows, total, page, limit })
  }catch(e){ return handleError(res, e) }
}

export async function create(req: Request, res: Response){
  try{
    const data = createIpdServiceSchema.parse(req.body)
    const row = await HospitalIpdService.create({
      name: String(data.name || '').trim(),
      category: data.category,
      price: Number(data.price || 0),
      active: data.active != null ? Boolean(data.active) : true,
    })
    res.status(201).json({ service: row })
  }catch(e){ return handleError(res, e) }
}

export async function update(req: Request, res: Response){
  try{
    const { id } = req.params as any
    const data = updateIpdServiceSchema.parse(req.body)
    const set: any = { ...data }
    if (set.name != null) set.name = String(set.name).trim()
    const row = await HospitalIpdService.findByIdAndUpdate(String(id), { $set: set }, { new: true })
    if (!row) return res.status(404).json({ error: 'Service not found' })
    res.json({ service: row })
  }catch(e){ return handleError(res, e) }
}

export async function remove(req: Request, res: Response){
  try{
    const { id } = req.params as any
    const row = await HospitalIpdService.findByIdAndDelete(String(id))
    if (!row) return res.status(404).json({ error: 'Service not found' })
    res.json({ ok: true })
  }catch(e){ return handleError(res, e) }
}
