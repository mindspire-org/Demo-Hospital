import { Request, Response } from 'express'
import { CampSettings } from '../models/CampSettings'
import { campSettingsUpdateSchema } from '../validators'

export async function get(_req: Request, res: Response) {
  let s = await CampSettings.findOne().lean()
  if (!s) s = (await CampSettings.create({})).toObject()
  res.json(s)
}

export async function update(req: Request, res: Response) {
  const parsed = campSettingsUpdateSchema.safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ message: 'Validation failed', issues: parsed.error.issues })
  const s = await CampSettings.findOneAndUpdate({}, { $set: parsed.data }, { new: true, upsert: true })
  res.json(s)
}
